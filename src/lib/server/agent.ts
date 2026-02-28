import { getConfig } from './config';
import { getActiveParticles, decayParticles, getLastEvent, countPoemsSinceLastReflection, logAgentEvent } from './db';
import { createWeatherParticles } from './weather';
import { createSeasonParticles } from './particles';
import { generatePoem } from './poems';
import { generateInterest, doResearch } from './research';
import { doVoiceReflection } from './critique';
import { sendNotification } from './ntfy';
import type { Particle, ReadinessBreakdown } from '$lib/types';

let running = false;
let lastTick: string | null = null;
let readinessScore = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

export function getAgentState() {
	return { running, lastTick, readinessScore };
}

function timeSinceEvent(eventType: string): number {
	const ev = getLastEvent(eventType) as { created_at: string } | undefined;
	if (!ev) return Infinity;
	return Date.now() - new Date(ev.created_at).getTime();
}

function randomBetween(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

export function evaluateReadinessDetailed(): ReadinessBreakdown {
	const config = getConfig();
	const particles = getActiveParticles() as Particle[];
	const weights = config.readiness.weights;

	if (particles.length < config.readiness.min_particles) {
		return {
			score: 0,
			threshold: config.readiness.score_threshold,
			components: { count: 0, diversity: 0, connections: 0, time_pressure: 0 },
			weights: {
				count: weights.count,
				diversity: weights.diversity,
				connections: weights.connections,
				time_pressure: weights.time_pressure
			}
		};
	}

	const countScore = Math.min(particles.length / (config.readiness.min_particles * 4), 1);

	const categories = new Set(particles.map((p) => p.category));
	const diversityScore = Math.min(categories.size / 5, 1);

	const totalConnections = particles.reduce((sum, p) => {
		const conns = JSON.parse(p.connections) as unknown[];
		return sum + conns.length;
	}, 0);
	const connectionScore = Math.min(totalConnections / (particles.length * 2), 1);

	const timeSincePoem = timeSinceEvent('poem_generation_complete');
	const timePressure = Math.min(timeSincePoem / config.agent.max_poem_wait_ms, 1);

	const randomFactor = Math.random();

	const score = Math.min(
		countScore * weights.count +
		diversityScore * weights.diversity +
		connectionScore * weights.connections +
		timePressure * weights.time_pressure +
		randomFactor * weights.randomness,
		1
	);

	return {
		score,
		threshold: config.readiness.score_threshold,
		components: {
			count: countScore,
			diversity: diversityScore,
			connections: connectionScore,
			time_pressure: timePressure
		},
		weights: {
			count: weights.count,
			diversity: weights.diversity,
			connections: weights.connections,
			time_pressure: weights.time_pressure
		}
	};
}

export function evaluateReadiness(): number {
	return evaluateReadinessDetailed().score;
}

async function tick() {
	const config = getConfig();
	lastTick = new Date().toISOString();

	try {
		// Decay particles
		decayParticles(config.particles.decay_half_life_ms, config.particles.min_strength);

		// Weather refresh
		if (timeSinceEvent('weather_fetch') > config.agent.weather_interval_ms) {
			await createWeatherParticles();
		}

		// Season/time-of-day update
		if (timeSinceEvent('season_particles') > config.agent.season_interval_ms) {
			createSeasonParticles(config.location.lat, config.location.timezone);
		}

		// Interest generation
		const interestInterval = randomBetween(config.agent.interest_min_ms, config.agent.interest_max_ms);
		if (timeSinceEvent('interest_generated') > interestInterval) {
			await generateInterest();
		}

		// Research
		const researchInterval = randomBetween(config.agent.research_min_ms, config.agent.research_max_ms);
		if (timeSinceEvent('research_complete') > researchInterval) {
			await doResearch();
		}

		// Readiness check
		readinessScore = evaluateReadiness();

		// Force poem if max wait exceeded
		const timeSincePoem = timeSinceEvent('poem_generation_complete');
		const forcePoem = timeSincePoem > config.agent.max_poem_wait_ms;

		if (readinessScore > config.readiness.score_threshold || forcePoem) {
			const result = await generatePoem('autonomous');
			logAgentEvent('autonomous_poem', { poemId: result.id, readinessScore, forced: forcePoem });

			// Send notification
			try {
				await sendNotification(`New poem: ${result.title}`, result.body.slice(0, 200));
			} catch {
				// Notification not critical
			}
		}

		// Voice reflection check
		const poemsSinceReflection = countPoemsSinceLastReflection();
		const timeSinceReflection = timeSinceEvent('voice_reflection');
		if (
			poemsSinceReflection >= config.voice.reflect_every_n_poems ||
			timeSinceReflection > config.voice.reflect_max_wait_ms
		) {
			// Only reflect if there are poems to reflect on
			if (poemsSinceReflection > 0) {
				try {
					await doVoiceReflection();
				} catch (err) {
					logAgentEvent('voice_reflection_error', { error: String(err) });
				}
			}
		}

		logAgentEvent('tick', { readinessScore, particleCount: getActiveParticles().length });
	} catch (err) {
		logAgentEvent('tick_error', { error: String(err) });
	}
}

let agentStarted = false;

export function startAgent() {
	if (agentStarted) return; // HMR guard
	agentStarted = true;
	running = true;

	const config = getConfig();
	console.log(`[poetry-bot] Agent started, ticking every ${config.agent.tick_interval_ms / 1000}s`);

	// First tick after a short delay
	setTimeout(() => tick(), 5000);
	intervalId = setInterval(() => tick(), config.agent.tick_interval_ms);
}

export function stopAgent() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
	running = false;
	agentStarted = false;
}
