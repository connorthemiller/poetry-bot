import { generate } from './ollama';
import { poemGenerationPrompt } from './prompts';
import { getActiveParticles, insertPoem, markParticlesUsed, getRecentFeedback, logAgentEvent } from './db';
import { getCurrentWeatherContext } from './weather';
import { getSeason, getTimeOfDay } from './season';
import { getConfig } from './config';
import type { Particle, Feedback } from '$lib/types';

interface ParsedPoem {
	thinking: string;
	title: string;
	body: string;
}

function parseResponse(raw: string): ParsedPoem {
	let thinking = '';
	let title = 'Untitled';
	let body = raw;

	// Try to parse structured response
	const thinkingMatch = raw.match(/THINKING:\s*([\s\S]*?)(?=\nTITLE:)/i);
	const titleMatch = raw.match(/TITLE:\s*(.+)/i);
	const poemMatch = raw.match(/POEM:\s*([\s\S]*?)$/i);

	if (thinkingMatch) thinking = thinkingMatch[1].trim();
	if (titleMatch) title = titleMatch[1].trim();
	if (poemMatch) body = poemMatch[1].trim();

	// If parsing failed, treat the whole thing as the poem
	if (!poemMatch && !titleMatch) {
		body = raw.trim();
		thinking = '';
		title = 'Untitled';
	}

	return { thinking, title, body };
}

export async function generatePoem(triggeredBy: 'manual' | 'autonomous' = 'manual') {
	const config = getConfig();
	const particles = getActiveParticles() as Particle[];
	const feedback = getRecentFeedback(5) as Feedback[];

	let weather: string | null = null;
	try {
		weather = await getCurrentWeatherContext();
	} catch {
		// Weather not critical
	}

	const season = getSeason(config.location.lat);
	const timeOfDay = getTimeOfDay(config.location.timezone);

	const prompt = poemGenerationPrompt({
		particles,
		feedback,
		weather,
		season,
		timeOfDay,
		triggeredBy
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

	return { id: poemId, title: parsed.title, body: parsed.body, thinking: parsed.thinking };
}
