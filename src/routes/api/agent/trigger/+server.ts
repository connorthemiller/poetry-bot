import { json } from '@sveltejs/kit';
import { generatePoem } from '$lib/server/poems';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
	try {
		const result = await generatePoem('manual');
		return json(result, { status: 201 });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ error: message }, { status: 500 });
	}
};
