<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { ParticleViz, ReadinessBreakdown, ParticleApiResponse, WeightedConnection } from '$lib/types';

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let width = $state(700);
	let height = $state(400);
	let particles: ParticleViz[] = $state([]);
	let readiness: ReadinessBreakdown | null = $state(null);
	let hoveredParticle: ParticleViz | null = $state(null);
	let animationId: number;
	let fetchInterval: ReturnType<typeof setInterval>;
	let aligning = $state(false);
	let alignPhase: 'gathering' | 'converging' | null = $state(null);
	let alignStart = 0;
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

	function particleHue(category: string, label: string): number {
		const range = categoryHueRange[category] || [0, 360];
		const hash = hashString(label);
		return range[0] + (hash % (range[1] - range[0]));
	}

	function particleColor(category: string, label: string, strength: number): string {
		const hue = particleHue(category, label);
		const sat = 55 + strength * 30;
		const lit = 60 + (1 - strength) * 15;
		return `hsl(${hue}, ${sat}%, ${lit}%)`;
	}

	function particleColorAlpha(category: string, label: string, strength: number): string {
		const hue = particleHue(category, label);
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
			const data: ParticleApiResponse = await res.json();

			readiness = data.readiness;

			// Merge new data with existing positions
			const existing = new Map(particles.map((p) => [p.id, p]));
			for (const p of data.particles) {
				const ex = existing.get(p.id);
				if (ex) {
					p.x = ex.x;
					p.y = ex.y;
					p.vx = ex.vx;
					p.vy = ex.vy;
				}
			}
			initPositions(data.particles);
			particles = data.particles;
		} catch { /* silent */ }
	}

	function update() {
		const r = readiness ? readiness.score : 0;

		// Readiness-modulated parameters
		const brownianBase = 0.008;
		const brownian = brownianBase * (1 - r * 0.7); // 100% -> 30%
		const friction = 0.97;
		const attractionBase = 0.0001;
		const attraction = attractionBase * (1 + r * 4); // 1x -> 5x
		const repulsionBase = 50;
		const repulsionStr = repulsionBase * (1 - r * 0.3); // 100% -> 70%
		const categoryPullBase = 0.00002;
		const categoryPull = categoryPullBase * (1 + r * 3); // 1x -> 4x

		// Override during alignment phases
		let alignAttraction = attraction;
		let alignBrownian = brownian;
		let centerPull = 0;

		if (aligning && alignPhase) {
			const elapsed = (performance.now() - alignStart) / 1000;
			if (alignPhase === 'gathering') {
				// Phase 1 (0-2s): ramp attraction to 10x, kill brownian
				alignAttraction = attractionBase * 10;
				alignBrownian = 0;
			} else if (alignPhase === 'converging') {
				// Phase 2 (2-5s): keep clusters tight, add center pull
				alignAttraction = attractionBase * 10;
				alignBrownian = 0;
				const convergeElapsed = elapsed; // time since phase 2 started
				centerPull = 0.002 * Math.min(convergeElapsed / 3, 1); // ramp over 3s
			}
		}

		const effectiveAttraction = aligning ? alignAttraction : attraction;
		const effectiveBrownian = aligning ? alignBrownian : brownian;

		// Build particle lookup
		const pMap = new Map(particles.map((p) => [p.id, p]));

		// 1. Connection attraction (O(E)) -- spring force, capped distance
		for (const p of particles) {
			if (p.x === undefined || p.y === undefined || p.vx === undefined || p.vy === undefined) continue;
			if (!p.connections) continue;
			for (const conn of p.connections) {
				const other = pMap.get(conn.id);
				if (!other || other.x === undefined || other.y === undefined || other.vx === undefined || other.vy === undefined) continue;

				const dx = other.x - p.x;
				const dy = other.y - p.y;
				const dist = Math.sqrt(dx * dx + dy * dy);
				if (dist < 1) continue;

				// Cap spring distance so far-away particles don't yank too hard
				const cappedDist = Math.min(dist, 250);
				const force = cappedDist * conn.weight * effectiveAttraction;
				const fx = (dx / dist) * force;
				const fy = (dy / dist) * force;
				p.vx += fx;
				p.vy += fy;
				other.vx -= fx;
				other.vy -= fy;
			}
		}

		// 2. Close-range repulsion (O(N^2) with 120px cutoff)
		//    Strong inverse-square keeps labels readable
		const repulsionCutoff = 120;
		for (let i = 0; i < particles.length; i++) {
			const a = particles[i];
			if (a.x === undefined || a.y === undefined || a.vx === undefined || a.vy === undefined) continue;
			for (let j = i + 1; j < particles.length; j++) {
				const b = particles[j];
				if (b.x === undefined || b.y === undefined || b.vx === undefined || b.vy === undefined) continue;

				const dx = b.x - a.x;
				const dy = b.y - a.y;
				const distSq = dx * dx + dy * dy;
				if (distSq > repulsionCutoff * repulsionCutoff || distSq < 1) continue;

				const dist = Math.sqrt(distSq);
				const force = repulsionStr / distSq;
				const fx = (dx / dist) * force;
				const fy = (dy / dist) * force;
				a.vx -= fx;
				a.vy -= fy;
				b.vx += fx;
				b.vy += fy;
			}
		}

		// 3. Category clustering (O(N))
		const catCentroids = new Map<string, { x: number; y: number; count: number }>();
		for (const p of particles) {
			if (p.x === undefined || p.y === undefined) continue;
			const c = catCentroids.get(p.category);
			if (c) {
				c.x += p.x;
				c.y += p.y;
				c.count++;
			} else {
				catCentroids.set(p.category, { x: p.x, y: p.y, count: 1 });
			}
		}
		for (const c of catCentroids.values()) {
			c.x /= c.count;
			c.y /= c.count;
		}
		for (const p of particles) {
			if (p.x === undefined || p.y === undefined || p.vx === undefined || p.vy === undefined) continue;
			const c = catCentroids.get(p.category);
			if (!c || c.count < 2) continue;
			p.vx += (c.x - p.x) * categoryPull;
			p.vy += (c.y - p.y) * categoryPull;
		}

		// 4. Center pull (alignment phase 2 only)
		if (centerPull > 0) {
			const cx = width / 2;
			const cy = height / 2;
			for (const p of particles) {
				if (p.x === undefined || p.y === undefined || p.vx === undefined || p.vy === undefined) continue;
				p.vx += (cx - p.x) * centerPull;
				p.vy += (cy - p.y) * centerPull;
			}
		}

		// Apply brownian, friction, movement, boundaries
		const margin = 50;
		const boundaryPush = 0.02;
		for (const p of particles) {
			if (p.x === undefined || p.y === undefined || p.vx === undefined || p.vy === undefined) continue;

			// Brownian motion
			p.vx += (Math.random() - 0.5) * effectiveBrownian;
			p.vy += (Math.random() - 0.5) * effectiveBrownian;

			// Friction
			p.vx *= friction;
			p.vy *= friction;

			// Move
			p.x += p.vx;
			p.y += p.vy;

			// Soft boundaries (stronger push, wider margin)
			if (p.x < margin) p.vx += boundaryPush;
			if (p.x > width - margin) p.vx -= boundaryPush;
			if (p.y < margin) p.vy += boundaryPush;
			if (p.y > height - margin) p.vy -= boundaryPush;

			// Hard clamp so nothing escapes
			p.x = Math.max(10, Math.min(width - 10, p.x));
			p.y = Math.max(10, Math.min(height - 10, p.y));
		}
	}

	function draw() {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const r = readiness ? readiness.score : 0;

		ctx.clearRect(0, 0, width, height);

		// Build particle lookup for connection drawing
		const pMap = new Map(particles.map((p) => [p.id, p]));

		// Draw connections (each only once: skip when p.id > conn.id)
		for (const p of particles) {
			if (!p.connections || p.x === undefined || p.y === undefined) continue;
			for (const conn of p.connections) {
				if (p.id > conn.id) continue; // draw each edge once
				const other = pMap.get(conn.id);
				if (!other || other.x === undefined || other.y === undefined) continue;

				// Blend hues of connected particles
				const hue1 = particleHue(p.category, p.label);
				const hue2 = particleHue(other.category, other.label);
				const avgHue = (hue1 + hue2) / 2;

				// Width: 0.5 (weight=0) to 3 (weight=1), boosted by readiness
				const lineW = (0.5 + conn.weight * 2.5) * (1 + r * 0.5);
				// Opacity: barely visible at low weight/readiness, prominent at high
				const alpha = (0.05 + conn.weight * 0.3) * (0.3 + r * 0.7);

				ctx.beginPath();
				ctx.moveTo(p.x, p.y);
				ctx.lineTo(other.x, other.y);
				ctx.strokeStyle = `hsla(${avgHue}, 50%, 55%, ${alpha})`;
				ctx.lineWidth = lineW;
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

		// Readiness meter (top-right)
		if (readiness) {
			drawReadinessMeter(ctx);
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

	function drawReadinessMeter(ctx: CanvasRenderingContext2D) {
		if (!readiness) return;

		// Responsive scaling based on canvas width
		const s = Math.max(0.75, Math.min(1.3, width / 550));

		const pad = Math.round(14 * s);
		const barW = Math.round(160 * s);
		const barH = Math.round(10 * s);
		const cardW = barW + pad * 2;
		const subBarH = Math.round(6 * s);
		const subGap = Math.round(20 * s);
		const headerH = Math.round(24 * s);
		const gapAfterMain = Math.round(14 * s);
		const cardH = headerH + barH + gapAfterMain + subGap * 4 + pad;
		const cx = width - cardW - Math.round(12 * s);
		const cy = Math.round(12 * s);

		const fontLabel = `${Math.round(13 * s)}px -apple-system, sans-serif`;
		const fontPct = `bold ${Math.round(15 * s)}px -apple-system, sans-serif`;
		const fontSub = `${Math.round(10 * s)}px -apple-system, sans-serif`;

		// Semi-transparent background card
		ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
		ctx.strokeStyle = 'rgba(190, 190, 190, 0.6)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.roundRect(cx, cy, cardW, cardH, Math.round(8 * s));
		ctx.fill();
		ctx.stroke();

		// "readiness" label + percentage
		const pct = Math.round(readiness.score * 100);
		ctx.font = fontLabel;
		ctx.fillStyle = '#555';
		ctx.textAlign = 'left';
		ctx.fillText('readiness', cx + pad, cy + headerH - 4);
		ctx.textAlign = 'right';
		ctx.fillStyle = '#222';
		ctx.font = fontPct;
		ctx.fillText(`${pct}%`, cx + cardW - pad, cy + headerH - 3);

		// Main bar background
		const barX = cx + pad;
		const barY = cy + headerH + 2;
		ctx.fillStyle = 'rgba(215, 215, 215, 0.9)';
		ctx.beginPath();
		ctx.roundRect(barX, barY, barW, barH, Math.round(4 * s));
		ctx.fill();

		// Main bar fill
		const aboveThreshold = readiness.score >= readiness.threshold;
		ctx.fillStyle = aboveThreshold ? 'rgba(70, 175, 70, 0.9)' : 'rgba(90, 135, 200, 0.85)';
		if (readiness.score > 0) {
			ctx.beginPath();
			ctx.roundRect(barX, barY, barW * readiness.score, barH, Math.round(4 * s));
			ctx.fill();
		}

		// Threshold marker (vertical tick)
		const threshX = barX + barW * readiness.threshold;
		ctx.strokeStyle = 'rgba(80, 80, 80, 0.7)';
		ctx.lineWidth = Math.round(2 * s);
		ctx.beginPath();
		ctx.moveTo(threshX, barY - 3);
		ctx.lineTo(threshX, barY + barH + 3);
		ctx.stroke();

		// Component sub-bars
		const components = [
			{ key: 'count', label: 'count' },
			{ key: 'diversity', label: 'diversity' },
			{ key: 'connections', label: 'connections' },
			{ key: 'time_pressure', label: 'time pressure' }
		] as const;

		let subY = barY + barH + gapAfterMain;
		for (const comp of components) {
			const val = readiness.components[comp.key];

			// Label above bar
			ctx.font = fontSub;
			ctx.fillStyle = 'rgba(90, 90, 90, 0.8)';
			ctx.textAlign = 'left';
			ctx.fillText(comp.label, barX, subY - 2);

			// Sub-bar background
			ctx.fillStyle = 'rgba(225, 225, 225, 0.8)';
			ctx.beginPath();
			ctx.roundRect(barX, subY + 2, barW, subBarH, Math.round(3 * s));
			ctx.fill();

			// Sub-bar fill
			ctx.fillStyle = 'rgba(110, 155, 200, 0.75)';
			if (val > 0) {
				ctx.beginPath();
				ctx.roundRect(barX, subY + 2, barW * val, subBarH, Math.round(3 * s));
				ctx.fill();
			}

			subY += subGap;
		}
	}

	function animate() {
		update();
		draw();
		animationId = requestAnimationFrame(animate);
	}

	function pointerToCanvas(clientX: number, clientY: number): { mx: number; my: number } {
		const rect = canvas.getBoundingClientRect();
		// Scale from CSS display size to canvas logical coordinates
		const scaleX = width / rect.width;
		const scaleY = height / rect.height;
		return {
			mx: (clientX - rect.left) * scaleX,
			my: (clientY - rect.top) * scaleY
		};
	}

	function findParticleAt(mx: number, my: number): ParticleViz | null {
		for (const p of particles) {
			if (p.x === undefined || p.y === undefined) continue;
			const dx = p.x - mx;
			const dy = p.y - my;
			if (dx * dx + dy * dy < 25 * 25) return p;
		}
		return null;
	}

	function handleMouseMove(e: MouseEvent) {
		const { mx, my } = pointerToCanvas(e.clientX, e.clientY);
		hoveredParticle = findParticleAt(mx, my);
	}

	function handleMouseLeave() {
		hoveredParticle = null;
	}

	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		const t = e.touches[0];
		const { mx, my } = pointerToCanvas(t.clientX, t.clientY);
		hoveredParticle = findParticleAt(mx, my);
	}

	function handleTouchMove(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		const t = e.touches[0];
		const { mx, my } = pointerToCanvas(t.clientX, t.clientY);
		hoveredParticle = findParticleAt(mx, my);
	}

	function handleTouchEnd() {
		hoveredParticle = null;
	}

	export function triggerAlignment() {
		if (aligning || particles.length === 0) return;
		aligning = true;
		alignPhase = 'gathering';
		alignStart = performance.now();

		// Phase 1 -> Phase 2 transition at 2s
		setTimeout(() => {
			alignPhase = 'converging';
			alignStart = performance.now();
		}, 2000);

		// End alignment at 5s total
		setTimeout(() => {
			aligning = false;
			alignPhase = null;
		}, 5000);
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
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
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
