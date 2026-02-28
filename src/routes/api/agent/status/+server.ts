import { json } from '@sveltejs/kit';
import { getActiveParticles, getLastEvent } from '$lib/server/db';
import { getAgentState } from '$lib/server/agent';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const state = getAgentState();
	const particles = getActiveParticles();
	const lastPoem = getLastEvent('poem_generation_complete') as { created_at: string } | undefined;

	return json({
		running: state.running,
		last_tick: state.lastTick,
		last_poem: lastPoem?.created_at || null,
		particle_count: particles.length,
		readiness_score: state.readinessScore
	});
};
