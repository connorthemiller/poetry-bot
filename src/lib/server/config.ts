import { readFileSync } from 'fs';
import { resolve } from 'path';
import yaml from 'js-yaml';
import type { Config } from '$lib/types';

const defaults: Config = {
	location: { lat: 40.7128, lon: -74.006, timezone: 'America/New_York' },
	ollama: { url: 'http://localhost:11434', model: 'gemma3:4b', temperature: 0.8 },
	agent: {
		tick_interval_ms: 300_000,
		weather_interval_ms: 1_800_000,
		season_interval_ms: 3_600_000,
		interest_min_ms: 7_200_000,
		interest_max_ms: 21_600_000,
		research_min_ms: 3_600_000,
		research_max_ms: 14_400_000,
		max_poem_wait_ms: 86_400_000
	},
	readiness: {
		score_threshold: 0.7,
		min_particles: 5,
		weights: { count: 0.25, diversity: 0.25, connections: 0.25, time_pressure: 0.15, randomness: 0.1 }
	},
	particles: { decay_half_life_ms: 43_200_000, min_strength: 0.05, max_count: 200 },
	ntfy: { server: 'https://ntfy.sh', topic: 'poetry-bot' },
	database: { path: 'data/poetry-bot.db' },
	search: { max_results: 5 }
};

function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
	const result = { ...target };
	for (const key of Object.keys(source)) {
		if (
			source[key] &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key]) &&
			target[key] &&
			typeof target[key] === 'object'
		) {
			result[key] = deepMerge(target[key], source[key]);
		} else {
			result[key] = source[key];
		}
	}
	return result;
}

let _config: Config | null = null;

export function loadConfig(): Config {
	if (_config) return _config;

	let userConfig: Record<string, any> = {};
	try {
		const raw = readFileSync(resolve('config.yaml'), 'utf-8');
		userConfig = (yaml.load(raw) as Record<string, any>) || {};
	} catch {
		// No config file -- use defaults
	}

	_config = deepMerge(defaults, userConfig) as Config;
	return _config;
}

export function getConfig(): Config {
	if (!_config) return loadConfig();
	return _config;
}
