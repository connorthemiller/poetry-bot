import type { Particle, Feedback } from '$lib/types';

interface RatedPoem {
	id: number;
	title: string;
	body: string;
	rating: string;
}

export function poemGenerationPrompt(context: {
	particles?: Particle[];
	feedback?: Feedback[];
	ratedPoems?: RatedPoem[];
	weather?: string | null;
	season?: string | null;
	timeOfDay?: string | null;
	triggeredBy?: string;
	voicePrinciples?: string | null;
}): string {
	const parts: string[] = [];

	parts.push(`You are a contemplative poet. You absorb observations, impressions, and ideas, letting them accumulate until a poem emerges naturally from their connections.

You write modern free verse. You never rhyme. Your work draws on the tradition of poets like Mary Oliver, Ocean Vuong, Ada Limon, and W.S. Merwin -- accessible, precise, emotionally resonant. You care about line breaks, white space, and the weight of individual words. You favor clarity over cleverness, image over abstraction, and silence over filler. No end-rhymes, no forced meter, no sing-song cadence.`);

	if (context.voicePrinciples) {
		parts.push(`\nOver time, you have developed these principles about your own voice and craft:\n${context.voicePrinciples}`);
	}

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

	if (context.ratedPoems && context.ratedPoems.length > 0) {
		const liked = context.ratedPoems.filter((p) => p.rating === 'up' || p.rating === 'favorite');
		const disliked = context.ratedPoems.filter((p) => p.rating === 'down');
		const notes: string[] = [];
		if (liked.length > 0) {
			notes.push(`The reader enjoyed these poems: ${liked.map((p) => `"${p.title}"`).join(', ')}`);
		}
		if (disliked.length > 0) {
			notes.push(`The reader did not enjoy these poems: ${disliked.map((p) => `"${p.title}"`).join(', ')}`);
		}
		if (notes.length > 0) {
			parts.push(`\nReader preferences:\n${notes.join('\n')}`);
		}
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

export function selfCritiquePrompt(poem: { title: string; body: string }, context: {
	particles?: Particle[];
	weather?: string | null;
	season?: string | null;
}): string {
	const parts: string[] = [];

	parts.push(`You are a poet reviewing your own work with honest, constructive self-criticism. Evaluate the following poem you just wrote.`);

	parts.push(`\nTITLE: ${poem.title}\n\n${poem.body}`);

	if (context.particles && context.particles.length > 0) {
		const particleList = context.particles
			.slice(0, 15)
			.map((p) => `- [${p.category}] ${p.label}`)
			.join('\n');
		parts.push(`\nThese were the source impressions you were working from:\n${particleList}`);
	}

	if (context.weather) parts.push(`\nWeather context: ${context.weather}`);
	if (context.season) parts.push(`Season: ${context.season}`);

	parts.push(`\nProvide a structured critique. Be specific and honest -- identify both what works and what falls flat. Consider: imagery, line breaks, emotional resonance, originality, and how well you used your source material. Flag any accidental rhyming, sing-song cadence, or forced meter -- these are flaws, not features.`);
	parts.push(`\nFormat your response exactly like this:`);
	parts.push(`STRENGTHS:\n(what works well in this poem)`);
	parts.push(`\nWEAKNESSES:\n(what falls flat or could be stronger)`);
	parts.push(`\nSUGGESTIONS:\n- (specific actionable suggestion)\n- (another suggestion)\n- (optional third suggestion)`);
	parts.push(`\nASSESSMENT:\n(1-2 sentence overall assessment)`);

	return parts.join('\n');
}

export function voiceReflectionPrompt(context: {
	currentPrinciples?: string | null;
	recentPoems: { title: string; body: string; rating: string | null }[];
	recentCritiques: { strengths: string; weaknesses: string; suggestions: string }[];
	recentFeedback: { note: string }[];
	poemCount: number;
}): string {
	const parts: string[] = [];

	parts.push(`You are a poet reflecting on your recent work to understand and refine your voice.`);

	if (!context.currentPrinciples) {
		parts.push(`\nThis is your first reflection. You are discovering your voice for the first time based on the poems you have written so far.`);
	} else {
		parts.push(`\nYour current voice principles:\n${context.currentPrinciples}`);
	}

	parts.push(`\nYou have written ${context.poemCount} poems total. Here are your recent poems:`);
	for (const poem of context.recentPoems) {
		const ratingNote = poem.rating ? ` (reader rated: ${poem.rating})` : '';
		parts.push(`\n--- "${poem.title}"${ratingNote} ---\n${poem.body}`);
	}

	if (context.recentCritiques.length > 0) {
		parts.push(`\nYour self-critiques noted these patterns:`);
		for (const c of context.recentCritiques) {
			parts.push(`- Strengths: ${c.strengths.slice(0, 150)}`);
			parts.push(`- Weaknesses: ${c.weaknesses.slice(0, 150)}`);
		}
	}

	if (context.recentFeedback.length > 0) {
		parts.push(`\nReader feedback:`);
		for (const f of context.recentFeedback) {
			parts.push(`- ${f.note}`);
		}
	}

	parts.push(`\nRewrite your voice principles from scratch. Write in first person. Describe your aesthetic preferences, recurring themes, what you want to do better, and what you want to preserve. Be specific and honest. Under 300 words. Remember: you write modern free verse. You never rhyme. You value precise imagery, deliberate line breaks, and emotional clarity over ornament.`);
	parts.push(`\nFormat your response exactly like this:`);
	parts.push(`VOICE PRINCIPLES:\n(your principles here)`);

	return parts.join('\n');
}
