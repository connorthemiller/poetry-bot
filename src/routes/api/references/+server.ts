import { json, error } from '@sveltejs/kit';
import { getReferences, insertReference } from '$lib/server/db';
import { extractParticlesFromText } from '$lib/server/particles';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	return json(getReferences(limit, offset));
};

export const POST: RequestHandler = async ({ request }) => {
	const { title, body, source_type } = await request.json();
	if (!body || typeof body !== 'string') {
		throw error(400, 'Body text is required');
	}

	insertReference({
		title: title || '',
		body,
		source_type: source_type || 'other'
	});

	// Extract particles from reference text in background
	extractParticlesFromText(body, `reference: ${title || 'untitled'}`, 'reference').catch(() => {});

	return json({ success: true }, { status: 201 });
};
