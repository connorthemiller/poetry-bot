import { search, SafeSearchType } from 'duck-duck-scrape';
import { generate } from './ollama';
import { interestGenerationPrompt, researchDigestPrompt } from './prompts';
import { getActiveParticles, insertInterest, getActiveInterests, updateInterestResearch, logAgentEvent } from './db';
import { extractParticlesFromText } from './particles';
import { getConfig } from './config';
import type { Particle, Interest } from '$lib/types';

export async function generateInterest(): Promise<void> {
	const particles = getActiveParticles() as Particle[];
	if (particles.length < 3) return;

	const prompt = interestGenerationPrompt(particles);
	const topic = await generate(prompt);

	if (topic && topic.length < 200) {
		insertInterest({ topic: topic.trim(), origin: 'agent' });
		logAgentEvent('interest_generated', { topic: topic.trim() });
	}
}

export async function doResearch(): Promise<void> {
	const config = getConfig();
	const interests = getActiveInterests() as Interest[];
	if (interests.length === 0) return;

	// Pick the most recent unresearched interest
	const target = interests.find((i) => !i.research_notes) || interests[0];

	try {
		const results = await search(target.topic, {
			safeSearch: SafeSearchType.MODERATE
		});

		const snippets = results.results
			.slice(0, config.search.max_results)
			.map((r) => `${r.title}: ${r.description}`)
			.join('\n\n');

		if (!snippets) {
			logAgentEvent('research_empty', { topic: target.topic });
			return;
		}

		// Digest research into particles
		const prompt = researchDigestPrompt(target.topic, snippets);
		const digest = await generate(prompt);

		updateInterestResearch(target.id, digest);

		// Parse digest into particles
		const lines = digest.split('\n').filter((l) => l.trim().startsWith('-'));
		for (const line of lines) {
			const match = line.match(/^-\s*(.+?):\s*(.+)/);
			if (match) {
				const { insertParticle } = await import('./db');
				insertParticle({
					label: match[1].trim(),
					category: 'research',
					content: match[2].trim(),
					source: `research: ${target.topic}`,
					strength: 0.85
				});
			}
		}

		logAgentEvent('research_complete', { topic: target.topic, particleCount: lines.length });
	} catch (err) {
		logAgentEvent('research_error', { topic: target.topic, error: String(err) });
	}
}
