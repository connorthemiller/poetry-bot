<script lang="ts">
	import PoemCard from '$lib/components/PoemCard.svelte';
	import ReferenceSubmit from '$lib/components/ReferenceSubmit.svelte';
	import ParticleVisualizer from '$lib/components/ParticleVisualizer.svelte';
	import { onMount } from 'svelte';

	let visualizer: ParticleVisualizer;

	let generating = $state(false);
	let latestPoem: any = $state(null);
	let error = $state('');
	let streamText = $state('');

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
		streamText = '';

		try {
			const res = await fetch('/api/poems?stream=1', { method: 'POST' });
			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Failed to generate poem';
				generating = false;
				return;
			}

			visualizer?.triggerAlignment();

			const reader = res.body!.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });

				// Parse SSE events from buffer
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				let eventType = '';
				for (const line of lines) {
					if (line.startsWith('event: ')) {
						eventType = line.slice(7);
					} else if (line.startsWith('data: ')) {
						const data = line.slice(6);
						if (eventType === 'token') {
							try { streamText += JSON.parse(data); } catch { /* */ }
						} else if (eventType === 'done') {
							// Poem saved, reload latest
							await loadLatest();
						}
						eventType = '';
					}
				}
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

		{#if generating && streamText}
			<div class="stream-output">
				<pre>{streamText}</pre>
			</div>
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
	.stream-output {
		margin-top: 1rem;
		padding: 1rem;
		background: #f5f5f0;
		border: 1px solid #e0e0d8;
		border-radius: 6px;
		max-height: 400px;
		overflow-y: auto;
	}
	.stream-output pre {
		margin: 0;
		white-space: pre-wrap;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.9rem;
		line-height: 1.6;
		color: #444;
	}
	.visualizer-section {
		margin-bottom: 1.5rem;
	}
	.reference-section {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #eee;
	}

	@media (max-width: 640px) {
		h1 {
			font-size: 1.4rem;
		}
		.subtitle {
			font-size: 0.85rem;
		}
		button.primary {
			width: 100%;
			padding: 0.6rem 1rem;
			font-size: 1rem;
			min-height: 44px;
		}
		.stream-output {
			max-height: 300px;
		}
	}
</style>
