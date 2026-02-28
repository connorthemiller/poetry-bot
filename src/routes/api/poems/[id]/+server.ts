import { json, error } from '@sveltejs/kit';
import { getPoemById, getFeedbackForPoem } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const id = parseInt(params.id, 10);
	const poem = getPoemById(id);
	if (!poem) throw error(404, 'Poem not found');

	const feedback = getFeedbackForPoem(id);
	return json({ ...poem, feedback });
};
