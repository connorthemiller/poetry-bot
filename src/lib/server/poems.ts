import { generate, generateStream } from './ollama';
import { poemGenerationPrompt } from './prompts';
import { getActiveParticles, insertPoem, markParticlesUsed, getRecentFeedback, getRatedPoems, getCurrentVoicePrinciples, logAgentEvent } from './db';
import { getCurrentWeatherContext } from './weather';
import { getSeason, getTimeOfDay } from './season';
import { getConfig } from './config';
import { critiquePoem } from './critique';
import type { Particle, Feedback, VoicePrinciples } from '$lib/types';

interface ParsedPoem {
	thinking: string;
	title: string;
	body: string;
}

function cleanTitle(raw: string): string {
	return raw
		.replace(/^[\s*"'#]+/, '')
		.replace(/[\s*"'#]+$/, '')
		.trim();
}

function parseResponse(raw: string): ParsedPoem {
	let thinking = '';
	let title = '';
	let body = raw;

	// Try to parse structured response
	const thinkingMatch = raw.match(/THINKING:\s*([\s\S]*?)(?=\nTITLE:)/i);
	const titleMatch = raw.match(/TITLE:\s*(.+)/i);
	const poemMatch = raw.match(/POEM:\s*([\s\S]*?)$/i);

	if (thinkingMatch) thinking = thinkingMatch[1].trim();
	if (titleMatch) title = cleanTitle(titleMatch[1]);
	if (poemMatch) body = poemMatch[1].trim();

	// If parsing failed, treat the whole thing as the poem
	if (!poemMatch && !titleMatch) {
		body = raw.trim();
		thinking = '';
	}

	// If title is still empty, try extracting from the poem body
	if (!title) {
		const lines = body.split('\n').filter((l) => l.trim());
		if (lines.length > 1) {
			const firstLine = lines[0].trim();
			// Short, title-like first line (under 60 chars, no ending punctuation typical of verse)
			if (firstLine.length < 60 && !/[,;:]$/.test(firstLine)) {
				title = cleanTitle(firstLine);
				// Remove the title line from the body
				body = lines.slice(1).join('\n').trim();
			}
		}
	}

	if (!title) title = 'Untitled';

	return { thinking, title, body };
}

export async function generatePoem(triggeredBy: 'manual' | 'autonomous' = 'manual') {
	const config = getConfig();
	const particles = getActiveParticles() as Particle[];
	const feedback = getRecentFeedback(5) as Feedback[];
	const ratedPoems = getRatedPoems(10) as { id: number; title: string; body: string; rating: string }[];

	let weather: string | null = null;
	try {
		weather = await getCurrentWeatherContext();
	} catch {
		// Weather not critical
	}

	const season = getSeason(config.location.lat);
	const timeOfDay = getTimeOfDay(config.location.timezone);

	const voiceRow = getCurrentVoicePrinciples() as VoicePrinciples | undefined;

	const prompt = poemGenerationPrompt({
		particles,
		feedback,
		ratedPoems,
		weather,
		season,
		timeOfDay,
		triggeredBy,
		voicePrinciples: voiceRow?.principles || null
	});

	logAgentEvent('poem_generation_start', { triggeredBy, particleCount: particles.length });

	const raw = await generate(prompt);
	const parsed = parseResponse(raw);

	const chainOfThought = JSON.stringify([parsed.thinking]);
	const particleSnapshot = JSON.stringify(particles.map((p) => ({ id: p.id, label: p.label, category: p.category })));

	const result = insertPoem({
		title: parsed.title,
		body: parsed.body,
		chain_of_thought: chainOfThought,
		particle_snapshot: particleSnapshot,
		triggered_by: triggeredBy,
		weather_context: weather,
		season,
		time_of_day: timeOfDay
	});

	const poemId = result.lastInsertRowid as number;

	// Mark particles as used
	if (particles.length > 0) {
		markParticlesUsed(
			particles.map((p) => p.id),
			poemId
		);
	}

	logAgentEvent('poem_generation_complete', { poemId, title: parsed.title });

	// Fire self-critique async (non-blocking)
	critiquePoem(poemId, parsed.title, parsed.body, { particles, weather, season }).catch((err) => {
		logAgentEvent('critique_error', { poemId, error: String(err) });
	});

	return { id: poemId, title: parsed.title, body: parsed.body, thinking: parsed.thinking };
}

export async function generatePoemStream(): Promise<ReadableStream<Uint8Array>> {
	const config = getConfig();
	const particles = getActiveParticles() as Particle[];
	const feedback = getRecentFeedback(5) as Feedback[];
	const ratedPoems = getRatedPoems(10) as { id: number; title: string; body: string; rating: string }[];

	let weather: string | null = null;
	try {
		weather = await getCurrentWeatherContext();
	} catch { /* */ }

	const season = getSeason(config.location.lat);
	const timeOfDay = getTimeOfDay(config.location.timezone);

	const voiceRowStream = getCurrentVoicePrinciples() as VoicePrinciples | undefined;

	const prompt = poemGenerationPrompt({
		particles,
		feedback,
		ratedPoems,
		weather,
		season,
		timeOfDay,
		triggeredBy: 'manual',
		voicePrinciples: voiceRowStream?.principles || null
	});

	logAgentEvent('poem_generation_start', { triggeredBy: 'manual', particleCount: particles.length });

	const tokenStream = await generateStream(prompt);
	const reader = tokenStream.getReader();
	const encoder = new TextEncoder();
	let fullText = '';

	return new ReadableStream<Uint8Array>({
		async pull(controller) {
			const { done, value } = await reader.read();
			if (done) {
				// Save the completed poem
				const parsed = parseResponse(fullText);
				const chainOfThought = JSON.stringify([parsed.thinking]);
				const particleSnapshot = JSON.stringify(particles.map((p) => ({ id: p.id, label: p.label, category: p.category })));

				const result = insertPoem({
					title: parsed.title,
					body: parsed.body,
					chain_of_thought: chainOfThought,
					particle_snapshot: particleSnapshot,
					triggered_by: 'manual',
					weather_context: weather,
					season,
					time_of_day: timeOfDay
				});

				const poemId = result.lastInsertRowid as number;
				if (particles.length > 0) {
					markParticlesUsed(particles.map((p) => p.id), poemId);
				}

				logAgentEvent('poem_generation_complete', { poemId, title: parsed.title });

				// Fire self-critique async (non-blocking)
				critiquePoem(poemId, parsed.title, parsed.body, { particles, weather, season }).catch((err) => {
					logAgentEvent('critique_error', { poemId, error: String(err) });
				});

				// Send final event with poem ID
				controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ id: poemId, title: parsed.title })}\n\n`));
				controller.close();
				return;
			}

			fullText += value;
			// Send token as SSE event
			controller.enqueue(encoder.encode(`event: token\ndata: ${JSON.stringify(value)}\n\n`));
		}
	});
}
