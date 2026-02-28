import { json } from '@sveltejs/kit';
import { getActiveParticles } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const particles = getActiveParticles();
	return json(particles);
};
