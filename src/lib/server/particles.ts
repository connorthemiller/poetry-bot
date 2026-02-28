import { insertParticle, getActiveParticles, logAgentEvent } from './db';
import { generate } from './ollama';
import { particleExtractionPrompt, feedbackDigestPrompt } from './prompts';
import { getSeason, getTimeOfDay } from './season';

// Stop words to ignore when finding keyword overlap
const STOP_WORDS = new Set([
	'the', 'a', 'an', 'is', 'it', 'of', 'in', 'to', 'and', 'or', 'for',
	'on', 'at', 'by', 'with', 'from', 'this', 'that', 'was', 'are', 'be',
	'has', 'had', 'have', 'not', 'but', 'its', 'as', 'into', 'about'
]);

function extractKeywords(text: string): Set<string> {
	return new Set(
		text.toLowerCase()
			.replace(/[^a-z0-9\s]/g, '')
			.split(/\s+/)
			.filter((w) => w.length > 2 && !STOP_WORDS.has(w))
	);
}

function findConnections(label: string, content: string): number[] {
	const keywords = extractKeywords(`${label} ${content}`);
	if (keywords.size === 0) return [];

	const active = getActiveParticles() as { id: number; label: string; content: string }[];
	const connections: number[] = [];

	for (const p of active) {
		const otherKeywords = extractKeywords(`${p.label} ${p.content}`);
		let overlap = 0;
		for (const kw of keywords) {
			if (otherKeywords.has(kw)) overlap++;
		}
		if (overlap >= 1) {
			connections.push(p.id);
		}
	}

	return connections;
}

function insertParticleWithConnections(data: {
	label: string;
	category: string;
	content: string;
	strength?: number;
	source: string;
}) {
	const connections = findConnections(data.label, data.content);
	insertParticle({
		...data,
		connections: JSON.stringify(connections)
	});
}

export function createSeasonParticles(lat: number, timezone: string) {
	const season = getSeason(lat);
	const tod = getTimeOfDay(timezone);

	insertParticleWithConnections({
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
			insertParticleWithConnections({
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
			insertParticleWithConnections({
				label: match[1].trim(),
				category: 'feedback',
				content: match[2].trim(),
				source: 'user-feedback',
				strength: 1.0
			});
		}
	}
}
