// -- Database row types --

export interface Poem {
	id: number;
	title: string;
	body: string;
	chain_of_thought: string; // JSON string
	particle_snapshot: string; // JSON string
	status: 'draft' | 'complete';
	triggered_by: 'autonomous' | 'manual';
	weather_context: string | null;
	season: string | null;
	time_of_day: string | null;
	rating: 'up' | 'down' | 'favorite' | null;
	created_at: string;
	updated_at: string;
}

export interface Feedback {
	id: number;
	poem_id: number;
	note: string;
	created_at: string;
}

export interface Reference {
	id: number;
	title: string;
	body: string;
	source_type: 'poem' | 'article' | 'other';
	created_at: string;
}

export interface Particle {
	id: number;
	label: string;
	category: 'weather' | 'season' | 'interest' | 'reference' | 'feedback' | 'research';
	content: string;
	strength: number;
	source: string;
	connections: string; // JSON array of particle IDs
	used_in_poem_id: number | null;
	created_at: string;
	updated_at: string;
}

export interface Interest {
	id: number;
	topic: string;
	origin: string;
	research_notes: string | null;
	strength: number;
	created_at: string;
	updated_at: string;
}

export interface AgentLog {
	id: number;
	event_type: string;
	detail: string; // JSON string
	created_at: string;
}

export interface Critique {
	id: number;
	poem_id: number;
	strengths: string;
	weaknesses: string;
	suggestions: string;
	overall_assessment: string;
	created_at: string;
}

export interface VoicePrinciples {
	id: number;
	principles: string;
	poem_count: number;
	source_poem_ids: string; // JSON array of poem IDs
	supersedes_id: number | null;
	created_at: string;
}

// -- API/UI types --

export interface AgentState {
	running: boolean;
	last_tick: string | null;
	last_poem: string | null;
	particle_count: number;
	readiness_score: number;
}

export interface WeightedConnection {
	id: number;
	weight: number;
}

export interface ParticleViz {
	id: number;
	label: string;
	category: Particle['category'];
	strength: number;
	connections: WeightedConnection[];
	x?: number;
	y?: number;
	vx?: number;
	vy?: number;
}

export interface ReadinessBreakdown {
	score: number;
	threshold: number;
	components: {
		count: number;
		diversity: number;
		connections: number;
		time_pressure: number;
	};
	weights: {
		count: number;
		diversity: number;
		connections: number;
		time_pressure: number;
	};
}

export interface ParticleApiResponse {
	particles: ParticleViz[];
	readiness: ReadinessBreakdown;
}

export interface Config {
	location: {
		lat: number;
		lon: number;
		timezone: string;
	};
	ollama: {
		url: string;
		model: string;
		temperature: number;
	};
	agent: {
		tick_interval_ms: number;
		weather_interval_ms: number;
		season_interval_ms: number;
		interest_min_ms: number;
		interest_max_ms: number;
		research_min_ms: number;
		research_max_ms: number;
		max_poem_wait_ms: number;
	};
	readiness: {
		score_threshold: number;
		min_particles: number;
		weights: {
			count: number;
			diversity: number;
			connections: number;
			time_pressure: number;
			randomness: number;
		};
	};
	particles: {
		decay_half_life_ms: number;
		min_strength: number;
		max_count: number;
	};
	ntfy: {
		server: string;
		topic: string;
	};
	database: {
		path: string;
	};
	search: {
		max_results: number;
	};
	voice: {
		reflect_every_n_poems: number;
		reflect_max_wait_ms: number;
		critique_temperature: number;
	};
}
