import { json, error } from '@sveltejs/kit';
import { getPoemById, getFeedbackForPoem, updatePoemRating, insertParticle } from '$lib/server/db';
import type { RequestHandler } from './$types';
import type { Poem } from '$lib/types';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	const poem = getPoemById(id);
	if (!poem) throw error(404, 'Poem not found');

	const feedback = getFeedbackForPoem(id);
	return json({ ...poem, feedback });
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id, 10);
	const poem = getPoemById(id) as Poem | undefined;
	if (!poem) throw error(404, 'Poem not found');

	const { rating } = await request.json();
	const valid = ['up', 'down', 'favorite', null];
	if (!valid.includes(rating)) throw error(400, 'Invalid rating');

	// Toggle: if same rating already set, clear it
	const newRating = poem.rating === rating ? null : rating;
	updatePoemRating(id, newRating);

	// Create a feedback particle when rating is set
	if (newRating) {
		const sentiment = newRating === 'down' ? 'disliked' : 'liked';
		const titleSnippet = poem.title || 'a poem';
		insertParticle({
			label: `${sentiment}: ${titleSnippet}`.slice(0, 50),
			category: 'feedback',
			content: `User ${sentiment} a poem about "${titleSnippet}"`,
			source: 'rating',
			strength: newRating === 'favorite' ? 1.0 : 0.8
		});
	}

	return json({ rating: newRating });
};
