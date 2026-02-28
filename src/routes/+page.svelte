<script lang="ts">
	import PoemCard from '$lib/components/PoemCard.svelte';
	import ReferenceSubmit from '$lib/components/ReferenceSubmit.svelte';
	import ParticleVisualizer from '$lib/components/ParticleVisualizer.svelte';
	import { onMount } from 'svelte';

	let visualizer: ParticleVisualizer;

	let generating = $state(false);
	let latestPoem: any = $state(null);
	let error = $state('');

	async function loadLatest() {
		try {
			const res = await fetch('/api/poems?limit=1');
			if (res.ok) {
				const poems = await res.json();
				if (poems.length > 0) latestPoem = poems[0];
			}
		} catch { /* silent */ }
	}

	async function requestPoem() {
		generating = true;
		error = '';

		try {
			const res = await fetch('/api/poems', { method: 'POST' });
			const data = await res.json();

			if (res.ok) {
				visualizer?.triggerAlignment();
				latestPoem = null;
				await loadLatest();
			} else {
				error = data.error || 'Failed to generate poem';
			}
		} catch (err) {
			error = 'Failed to connect to server. Is Ollama running?';
		} finally {
			generating = false;
		}
	}

	onMount(() => {
		loadLatest();
	});
</script>

<div class="dashboard">
	<section class="hero">
		<h1>Poetry Bot</h1>
		<p class="subtitle">A contemplative agent, accumulating impressions until poems emerge.</p>

		<div class="actions">
			<button onclick={requestPoem} disabled={generating} class="primary">
				{generating ? 'Writing...' : 'Write a Poem'}
			</button>
		</div>

		{#if error}
			<p class="error">{error}</p>
		{/if}
	</section>

	<section class="visualizer-section">
		<h2>Particle Field</h2>
		<ParticleVisualizer bind:this={visualizer} />
	</section>

	{#if latestPoem}
		<section>
			<h2>Latest Poem</h2>
			<PoemCard {...latestPoem} />
		</section>
	{/if}

	<section class="reference-section">
		<ReferenceSubmit />
	</section>
</div>

<style>
	.dashboard {
		max-width: 700px;
	}
	.hero {
		margin-bottom: 2rem;
	}
	h1 {
		font-size: 1.75rem;
		margin: 0 0 0.25rem;
	}
	.subtitle {
		color: #888;
		margin: 0 0 1.5rem;
		font-size: 0.95rem;
	}
	h2 {
		font-size: 1.1rem;
		margin: 1.5rem 0 0.75rem;
	}
	.actions {
		display: flex;
		gap: 0.75rem;
	}
	button.primary {
		padding: 0.5rem 1.25rem;
		background: #333;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		cursor: pointer;
	}
	button.primary:hover:not(:disabled) {
		background: #555;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.error {
		color: #dc2626;
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}
	.visualizer-section {
		margin-bottom: 1.5rem;
	}
	.reference-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #eee;
	}
</style>
