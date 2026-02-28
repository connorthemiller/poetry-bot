<script lang="ts">
	import { onMount } from 'svelte';

	let current: any = $state(null);
	let history: any[] = $state([]);
	let loading = $state(true);

	onMount(async () => {
		try {
			const res = await fetch('/api/voice');
			if (res.ok) {
				const data = await res.json();
				current = data.current;
				history = data.history || [];
			}
		} catch {
			// silent
		}
		loading = false;
	});
</script>

<div>
	<h2>Voice</h2>

	{#if loading}
		<p>Loading...</p>
	{:else if !current}
		<p class="empty">No voice principles yet. The agent will reflect on its voice after writing a few poems.</p>
	{:else}
		<section class="current">
			<h3>Current Principles</h3>
			<p class="meta">After {current.poem_count} poems -- {new Date(current.created_at).toLocaleDateString()}</p>
			<div class="principles">{current.principles}</div>
		</section>

		{#if history.length > 1}
			<section class="history">
				<h3>Evolution</h3>
				{#each history as entry, i}
					{#if i > 0}
						<div class="history-entry">
							<p class="meta">After {entry.poem_count} poems -- {new Date(entry.created_at).toLocaleDateString()}</p>
							<div class="principles past">{entry.principles}</div>
						</div>
					{/if}
				{/each}
			</section>
		{/if}
	{/if}
</div>

<style>
	h2 {
		font-size: 1.25rem;
		margin: 0 0 1.5rem;
	}
	h3 {
		font-size: 1rem;
		margin: 0 0 0.5rem;
	}
	.empty {
		color: #888;
		font-size: 0.9rem;
	}
	.current {
		margin-bottom: 2rem;
	}
	.meta {
		font-size: 0.8rem;
		color: #999;
		margin: 0 0 0.5rem;
	}
	.principles {
		white-space: pre-wrap;
		font-size: 0.9rem;
		line-height: 1.6;
		padding: 1rem;
		background: #fafafa;
		border-radius: 4px;
		border: 1px solid #eee;
	}
	.principles.past {
		opacity: 0.7;
		background: #fdfdfd;
	}
	.history {
		margin-top: 1.5rem;
	}
	.history-entry {
		margin-bottom: 1.5rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #eee;
	}
	.history-entry:last-child {
		border-bottom: none;
	}
</style>
