import { generate } from './ollama';
import { getConfig } from './config';
import { selfCritiquePrompt, voiceReflectionPrompt } from './prompts';
import {
	insertCritique,
	getRecentCritiques,
	getCurrentVoicePrinciples,
	getVoicePrinciplesHistory,
	insertVoicePrinciples,
	getTotalPoemCount,
	getRecentPoemsForReflection,
	getRecentFeedback,
	logAgentEvent
} from './db';
import { insertParticleWithConnections } from './particles';
import type { Particle, Critique, VoicePrinciples } from '$lib/types';

interface CritiqueContext {
	particles?: Particle[];
	weather?: string | null;
	season?: string | null;
}

function parseCritique(raw: string): {
	strengths: string;
	weaknesses: string;
	suggestions: string;
	overall_assessment: string;
} {
	const strengthsMatch = raw.match(/STRENGTHS:\s*([\s\S]*?)(?=\nWEAKNESSES:)/i);
	const weaknessesMatch = raw.match(/WEAKNESSES:\s*([\s\S]*?)(?=\nSUGGESTIONS:)/i);
	const suggestionsMatch = raw.match(/SUGGESTIONS:\s*([\s\S]*?)(?=\nASSESSMENT:)/i);
	const assessmentMatch = raw.match(/ASSESSMENT:\s*([\s\S]*?)$/i);

	return {
		strengths: strengthsMatch ? strengthsMatch[1].trim() : '',
		weaknesses: weaknessesMatch ? weaknessesMatch[1].trim() : '',
		suggestions: suggestionsMatch ? suggestionsMatch[1].trim() : '',
		overall_assessment: assessmentMatch ? assessmentMatch[1].trim() : raw.trim()
	};
}

export async function critiquePoem(
	poemId: number,
	title: string,
	body: string,
	context: CritiqueContext
): Promise<void> {
	const config = getConfig();
	const prompt = selfCritiquePrompt({ title, body }, context);

	const raw = await generate(prompt, { temperature: config.voice.critique_temperature });
	const parsed = parseCritique(raw);

	insertCritique({
		poem_id: poemId,
		strengths: parsed.strengths,
		weaknesses: parsed.weaknesses,
		suggestions: parsed.suggestions,
		overall_assessment: parsed.overall_assessment
	});

	// Create feedback particles from suggestion bullets
	const suggestionLines = parsed.suggestions.split('\n').filter((l) => l.trim().startsWith('-'));
	for (const line of suggestionLines.slice(0, 3)) {
		const text = line.replace(/^-\s*/, '').trim();
		if (text) {
			insertParticleWithConnections({
				label: text.slice(0, 40),
				category: 'feedback',
				content: text,
				source: 'self-critique',
				strength: 0.7
			});
		}
	}

	logAgentEvent('self_critique', { poemId, title });
}

export async function doVoiceReflection(): Promise<void> {
	const config = getConfig();

	const current = getCurrentVoicePrinciples() as VoicePrinciples | undefined;
	const recentPoems = getRecentPoemsForReflection(10) as {
		id: number; title: string; body: string; rating: string | null; created_at: string;
	}[];
	const recentCritiques = getRecentCritiques(10) as Critique[];
	const recentFeedback = getRecentFeedback(10) as { note: string }[];
	const poemCount = getTotalPoemCount();

	const prompt = voiceReflectionPrompt({
		currentPrinciples: current?.principles || null,
		recentPoems: recentPoems.map((p) => ({ title: p.title, body: p.body, rating: p.rating })),
		recentCritiques: recentCritiques.map((c) => ({
			strengths: c.strengths,
			weaknesses: c.weaknesses,
			suggestions: c.suggestions
		})),
		recentFeedback,
		poemCount
	});

	const raw = await generate(prompt, { temperature: config.voice.critique_temperature });

	// Parse out the VOICE PRINCIPLES section
	const match = raw.match(/VOICE PRINCIPLES:\s*([\s\S]*?)$/i);
	const principles = match ? match[1].trim() : raw.trim();

	insertVoicePrinciples({
		principles,
		poem_count: poemCount,
		source_poem_ids: JSON.stringify(recentPoems.map((p) => p.id)),
		supersedes_id: current?.id || null
	});

	logAgentEvent('voice_reflection', { poemCount, principlesLength: principles.length });
}
