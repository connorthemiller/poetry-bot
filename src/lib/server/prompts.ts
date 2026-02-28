import type { Particle, Feedback } from '$lib/types';

export function poemGenerationPrompt(context: {
	particles?: Particle[];
	feedback?: Feedback[];
	weather?: string | null;
	season?: string | null;
	timeOfDay?: string | null;
	triggeredBy?: string;
}): string {
	const parts: string[] = [];

	parts.push(`You are a contemplative poet. You absorb observations, impressions, and ideas, letting them accumulate until a poem emerges naturally from their connections.`);

	if (context.weather) {
		parts.push(`\nCurrent weather: ${context.weather}`);
	}
	if (context.season) {
		parts.push(`Season: ${context.season}`);
	}
	if (context.timeOfDay) {
		parts.push(`Time of day: ${context.timeOfDay}`);
	}

	if (context.particles && context.particles.length > 0) {
		const particleList = context.particles
			.map((p) => `- [${p.category}] ${p.label}: ${p.content}`)
			.join('\n');
		parts.push(`\nHere are the impressions and observations you've been accumulating:\n${particleList}`);
	}

	if (context.feedback && context.feedback.length > 0) {
		const feedbackList = context.feedback.map((f) => `- ${f.note}`).join('\n');
		parts.push(`\nFeedback from previous poems to keep in mind:\n${feedbackList}`);
	}

	parts.push(`\nWrite a poem. First, share your thought process -- what connections you see between these inputs, what draws your attention, what you want to explore. Then write the poem itself.`);
	parts.push(`\nFormat your response exactly like this:`);
	parts.push(`THINKING:`);
	parts.push(`(your creative thought process here)`);
	parts.push(`\nTITLE:`);
	parts.push(`(poem title)`);
	parts.push(`\nPOEM:`);
	parts.push(`(the poem)`);

	return parts.join('\n');
}

export function particleExtractionPrompt(text: string, source: string): string {
	return `You are analyzing a text to extract its key themes, images, and ideas as individual "particles" -- atomic units of meaning that could later combine into poetry.

Source type: ${source}
Text:
${text}

Extract 3-5 particles. For each, provide a short label (2-4 words) and a brief description (1-2 sentences).

Format your response as a list:
- LABEL: description
- LABEL: description
(and so on)`;
}

export function interestGenerationPrompt(particles: Particle[]): string {
	const particleList = particles
		.slice(0, 20)
		.map((p) => `- [${p.category}] ${p.label}: ${p.content}`)
		.join('\n');

	return `You are a contemplative poet reviewing the impressions and observations you've been accumulating:

${particleList}

Based on these floating ideas, what new topic or question would you like to explore? Choose something that connects to or extends the themes you see emerging.

Respond with just the topic -- a short phrase (3-8 words) describing what you want to research or think about next.`;
}

export function researchDigestPrompt(topic: string, searchResults: string): string {
	return `You are a poet who has been researching the topic: "${topic}"

Here are some things you found:
${searchResults}

Distill this research into 2-4 poetic "particles" -- atomic observations, images, or ideas that could later combine with other impressions to form a poem. Focus on what is evocative, surprising, or emotionally resonant.

Format your response as a list:
- LABEL: description
- LABEL: description`;
}

export function feedbackDigestPrompt(poemBody: string, feedbackNote: string): string {
	return `A reader gave the following feedback on this poem:

POEM:
${poemBody}

FEEDBACK:
${feedbackNote}

Extract 1-2 key takeaways from this feedback as "particles" -- concise lessons or preferences that should inform future poems.

Format:
- LABEL: description`;
}
