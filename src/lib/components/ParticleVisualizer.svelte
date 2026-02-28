<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ParticleViz } from '$lib/types';

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let width = $state(700);
	let height = $state(400);
	let particles: ParticleViz[] = $state([]);
	let hoveredParticle: ParticleViz | null = $state(null);
	let animationId: number;
	let fetchInterval: ReturnType<typeof setInterval>;
	let aligning = $state(false);
	let resizeObserver: ResizeObserver;

	// Category base hue ranges (degrees)
	const categoryHueRange: Record<string, [number, number]> = {
		weather: [200, 220],
		season: [100, 140],
		interest: [25, 45],
		reference: [260, 290],
		feedback: [320, 345],
		research: [45, 65]
	};

	function hashString(s: string): number {
		let hash = 0;
		for (let i = 0; i < s.length; i++) {
			hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
		}
		return Math.abs(hash);
	}

	function particleColor(category: string, label: string, strength: number): string {
		const range = categoryHueRange[category] || [0, 360];
		const hash = hashString(label);
		const hue = range[0] + (hash % (range[1] - range[0]));
		const sat = 55 + strength * 30;
		const lit = 60 + (1 - strength) * 15;
		return `hsl(${hue}, ${sat}%, ${lit}%)`;
	}

	function particleColorAlpha(category: string, label: string, strength: number): string {
		const range = categoryHueRange[category] || [0, 360];
		const hash = hashString(label);
		const hue = range[0] + (hash % (range[1] - range[0]));
		const sat = 55 + strength * 30;
		const lit = 60 + (1 - strength) * 15;
		return `hsla(${hue}, ${sat}%, ${lit}%, 0.3)`;
	}

	function initPositions(ps: ParticleViz[]) {
		for (const p of ps) {
			if (p.x === undefined) {
				p.x = Math.random() * width;
				p.y = Math.random() * height;
				p.vx = (Math.random() - 0.5) * 0.3;
				p.vy = (Math.random() - 0.5) * 0.3;
			}
		}
	}

	async function fetchParticles() {
		try {
			const res = await fetch('/api/particles');
			if (!res.ok) return;
			const data: ParticleViz[] = await res.json();

			// Merge new data with existing positions
			const existing = new Map(particles.map((p) => [p.id, p]));
			for (const p of data) {
				const ex = existing.get(p.id);
				if (ex) {
					p.x = ex.x;
					p.y = ex.y;
					p.vx = ex.vx;
					p.vy = ex.vy;
				}
				p.connections = Array.isArray(p.connections)
					? p.connections
					: JSON.parse(p.connections as unknown as string);
			}
			initPositions(data);
			particles = data;
		} catch { /* silent */ }
	}

	function update() {
		const friction = 0.995;
		const brownian = 0.02;

		for (const p of particles) {
			if (p.x === undefined || p.y === undefined || p.vx === undefined || p.vy === undefined) continue;

			// Brownian motion
			p.vx += (Math.random() - 0.5) * brownian;
			p.vy += (Math.random() - 0.5) * brownian;

			// Friction
			p.vx *= friction;
			p.vy *= friction;

			// Move
			p.x += p.vx;
			p.y += p.vy;

			// Soft boundaries
			const margin = 30;
			if (p.x < margin) p.vx += 0.01;
			if (p.x > width - margin) p.vx -= 0.01;
			if (p.y < margin) p.vy += 0.01;
			if (p.y > height - margin) p.vy -= 0.01;
		}
	}

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, width, height);

		// Draw connections
		const pMap = new Map(particles.map((p) => [p.id, p]));
		for (const p of particles) {
			if (!p.connections || p.x === undefined || p.y === undefined) continue;
			for (const cid of p.connections) {
				const other = pMap.get(cid);
				if (!other || other.x === undefined || other.y === undefined) continue;

				ctx.beginPath();
				ctx.moveTo(p.x, p.y);
				ctx.lineTo(other.x, other.y);
				ctx.strokeStyle = 'rgba(180, 180, 180, 0.15)';
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}

		// Draw particles
		for (const p of particles) {
			if (p.x === undefined || p.y === undefined) continue;

			const radius = 4 + p.strength * 12;
			const color = particleColor(p.category, p.label, p.strength);
			const alphaColor = particleColorAlpha(p.category, p.label, p.strength);

			// Glow
			ctx.beginPath();
			ctx.arc(p.x, p.y, radius + 6, 0, Math.PI * 2);
			ctx.fillStyle = alphaColor;
			ctx.fill();

			// Core
			ctx.beginPath();
			ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
			ctx.fillStyle = color;
			ctx.globalAlpha = 0.4 + p.strength * 0.6;
			ctx.fill();
			ctx.globalAlpha = 1;

			// Label
			if (p.strength > 0.3) {
				ctx.font = '10px -apple-system, sans-serif';
				ctx.fillStyle = `rgba(80, 80, 80, ${0.3 + p.strength * 0.7})`;
				ctx.textAlign = 'center';
				ctx.fillText(p.label, p.x, p.y + radius + 14);
			}
		}

		// Hover tooltip
		if (hoveredParticle && hoveredParticle.x !== undefined && hoveredParticle.y !== undefined) {
			const p = hoveredParticle;
			const tx = Math.min(p.x! + 15, width - 150);
			const ty = Math.max(p.y! - 10, 20);

			ctx.fillStyle = 'rgba(255,255,255,0.95)';
			ctx.strokeStyle = '#ddd';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.roundRect(tx, ty - 14, 140, 36, 4);
			ctx.fill();
			ctx.stroke();

			ctx.font = 'bold 11px -apple-system, sans-serif';
			ctx.fillStyle = '#333';
			ctx.textAlign = 'left';
			ctx.fillText(p.label, tx + 6, ty);

			ctx.font = '10px -apple-system, sans-serif';
			ctx.fillStyle = '#888';
			ctx.fillText(p.category, tx + 6, ty + 14);
		}
	}

	function animate() {
		update();
		draw();
		animationId = requestAnimationFrame(animate);
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		hoveredParticle = null;
		for (const p of particles) {
			if (p.x === undefined || p.y === undefined) continue;
			const dx = p.x - mx;
			const dy = p.y - my;
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist < 20) {
				hoveredParticle = p;
				break;
			}
		}
	}

	function handleMouseLeave() {
		hoveredParticle = null;
	}

	export function triggerAlignment() {
		if (aligning || particles.length === 0) return;
		aligning = true;

		// Move all particles toward center over 2 seconds
		const cx = width / 2;
		const cy = height / 2;

		for (const p of particles) {
			if (p.x === undefined || p.y === undefined) continue;
			const dx = cx - p.x;
			const dy = cy - p.y;
			p.vx = dx * 0.01 + (Math.random() - 0.5) * 0.5;
			p.vy = dy * 0.01 + (Math.random() - 0.5) * 0.5;
		}

		setTimeout(() => {
			aligning = false;
		}, 3000);
	}

	function measureContainer() {
		if (!container) return;
		const rect = container.getBoundingClientRect();
		width = Math.floor(rect.width);
		height = Math.max(200, Math.floor(width * 0.57));
	}

	onMount(() => {
		measureContainer();
		resizeObserver = new ResizeObserver(() => measureContainer());
		resizeObserver.observe(container);
		fetchParticles();
		animate();
		fetchInterval = setInterval(fetchParticles, 30_000);
	});

	onDestroy(() => {
		if (animationId) cancelAnimationFrame(animationId);
		if (fetchInterval) clearInterval(fetchInterval);
		if (resizeObserver) resizeObserver.disconnect();
	});
</script>

<div class="visualizer" bind:this={container}>
	<canvas
		bind:this={canvas}
		{width}
		{height}
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
	></canvas>
</div>

<style>
	.visualizer {
		border: 1px solid #eee;
		border-radius: 8px;
		overflow: hidden;
		background: #fefefe;
		width: 100%;
	}
	canvas {
		display: block;
		cursor: default;
		width: 100%;
		height: auto;
	}
</style>
