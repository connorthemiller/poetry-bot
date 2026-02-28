import { json } from '@sveltejs/kit';
import { getCurrentVoicePrinciples, getVoicePrinciplesHistory } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const current = getCurrentVoicePrinciples() || null;
	const history = getVoicePrinciplesHistory();
	return json({ current, history });
};
