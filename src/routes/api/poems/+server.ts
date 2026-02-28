import { json } from '@sveltejs/kit';
import { getPoems } from '$lib/server/db';
import { generatePoem, generatePoemStream } from '$lib/server/poems';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	const poems = getPoems(limit, offset);
	return json(poems);
};

export const POST: RequestHandler = async ({ url }) => {
	const stream = url.searchParams.get('stream') === '1';

	if (stream) {
		try {
			const sseStream = await generatePoemStream();
			return new Response(sseStream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					'Connection': 'keep-alive'
				}
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return json({ error: message }, { status: 500 });
		}
	}

	try {
		const result = await generatePoem('manual');
		return json(result, { status: 201 });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ error: message }, { status: 500 });
	}
};
