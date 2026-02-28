import { json, error } from '@sveltejs/kit';
import { getReferences, insertReference } from '$lib/server/db';
import { extractParticlesFromText } from '$lib/server/particles';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const limit = parseInt(url.searchParams.get('limit') || '20', 10);
	const offset = parseInt(url.searchParams.get('offset') || '0', 10);
	return json(getReferences(limit, offset));
};

function stripHtml(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}

async function fetchUrlText(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'PoetryBot/1.0 (reference fetcher)' }
	});
	if (!res.ok) throw new Error(`Failed to fetch URL: ${res.status}`);
	const html = await res.text();
	const text = stripHtml(html);
	return text.slice(0, 5000);
}

export const POST: RequestHandler = async ({ request }) => {
	const data = await request.json();
	const { title, source_type } = data;
	let { body } = data;
	const url = data.url as string | undefined;

	if (url && typeof url === 'string' && url.trim()) {
		try {
			body = await fetchUrlText(url.trim());
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to fetch URL';
			throw error(400, msg);
		}
	}

	if (!body || typeof body !== 'string') {
		throw error(400, 'Body text is required (or provide a URL)');
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
