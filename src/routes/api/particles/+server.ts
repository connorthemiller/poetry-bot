import { json } from '@sveltejs/kit';
import { getActiveParticles } from '$lib/server/db';
import { evaluateReadinessDetailed } from '$lib/server/agent';
import type { RequestHandler } from './$types';
import type { Particle } from '$lib/types';

function normalizeConnections(raw: unknown): { id: number; weight: number }[] {
	if (!Array.isArray(raw)) return [];
	if (raw.length === 0) return [];
	// New format: [{id, weight}, ...]
	if (typeof raw[0] === 'object' && raw[0] !== null && 'id' in raw[0]) {
		return raw as { id: number; weight: number }[];
	}
	// Legacy format: [1, 5, 12] -- bare IDs, assign weight 1.0
	return raw.map((id: number) => ({ id, weight: 1.0 }));
}

export const GET: RequestHandler = async () => {
	const rows = getActiveParticles() as Particle[];
	const particles = rows.map((p) => ({
		id: p.id,
		label: p.label,
		category: p.category,
		strength: p.strength,
		connections: normalizeConnections(JSON.parse(p.connections))
	}));

	const readiness = evaluateReadinessDetailed();

	return json({ particles, readiness });
};
