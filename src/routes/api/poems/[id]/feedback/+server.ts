import { json, error } from '@sveltejs/kit';
import { getPoemById, insertFeedback } from '$lib/server/db';
import { extractFeedbackParticles } from '$lib/server/particles';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	const id = parseInt(params.id, 10);
	const poem = getPoemById(id) as { body: string } | undefined;
	if (!poem) throw error(404, 'Poem not found');

	const { note } = await request.json();
	if (!note || typeof note !== 'string') {
		throw error(400, 'Feedback note is required');
	}

	insertFeedback(id, note);

	// Extract feedback particles in background (don't block response)
	extractFeedbackParticles(poem.body, note).catch(() => {});

	return json({ success: true }, { status: 201 });
};
