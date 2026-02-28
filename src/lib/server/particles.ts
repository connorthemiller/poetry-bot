import { insertParticle, logAgentEvent } from './db';
import { generate } from './ollama';
import { particleExtractionPrompt, feedbackDigestPrompt } from './prompts';
import { getSeason, getTimeOfDay } from './season';

export function createSeasonParticles(lat: number, timezone: string) {
	const season = getSeason(lat);
	const tod = getTimeOfDay(timezone);

	insertParticle({
		label: `${season} ${tod}`,
		category: 'season',
		content: `It is ${tod} in ${season}. The world carries the quality of this moment.`,
		source: 'system',
		strength: 0.6
	});

	logAgentEvent('season_particles', { season, timeOfDay: tod });
}

export async function extractParticlesFromText(
	text: string,
	source: string,
	category: 'reference' | 'feedback' | 'research'
): Promise<void> {
	const prompt = particleExtractionPrompt(text, source);
	const raw = await generate(prompt);

	const lines = raw.split('\n').filter((l) => l.trim().startsWith('-'));
	for (const line of lines) {
		const match = line.match(/^-\s*(.+?):\s*(.+)/);
		if (match) {
			insertParticle({
				label: match[1].trim(),
				category,
				content: match[2].trim(),
				source,
				strength: 0.9
			});
		}
	}

	logAgentEvent('particle_extraction', { source, category, count: lines.length });
}

export async function extractFeedbackParticles(poemBody: string, feedbackNote: string): Promise<void> {
	const prompt = feedbackDigestPrompt(poemBody, feedbackNote);
	const raw = await generate(prompt);

	const lines = raw.split('\n').filter((l) => l.trim().startsWith('-'));
	for (const line of lines) {
		const match = line.match(/^-\s*(.+?):\s*(.+)/);
		if (match) {
			insertParticle({
				label: match[1].trim(),
				category: 'feedback',
				content: match[2].trim(),
				source: 'user-feedback',
				strength: 1.0
			});
		}
	}
}
