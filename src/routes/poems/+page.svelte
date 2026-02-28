<script lang="ts">
	import { onMount } from 'svelte';
	import PoemCard from '$lib/components/PoemCard.svelte';

	let poems: any[] = $state([]);
	let loading = $state(true);
	let offset = $state(0);
	let hasMore = $state(true);
	const limit = 10;

	async function loadPoems() {
		loading = true;
		try {
			const res = await fetch(`/api/poems?limit=${limit}&offset=${offset}`);
			if (res.ok) {
				const data = await res.json();
				poems = [...poems, ...data];
				hasMore = data.length === limit;
			}
		} catch { /* silent */ }
		loading = false;
	}

	function loadMore() {
		offset += limit;
		loadPoems();
	}

	onMount(() => loadPoems());
</script>

<div>
	<h1>Poems</h1>

	{#if poems.length === 0 && !loading}
		<p class="empty">No poems yet. Go to the dashboard and write one.</p>
	{/if}

	{#each poems as poem}
		<PoemCard {...poem} compact />
	{/each}

	{#if loading}
		<p class="loading">Loading...</p>
	{/if}

	{#if hasMore && !loading && poems.length > 0}
		<button class="load-more" onclick={loadMore}>Load more</button>
	{/if}
</div>

<style>
	h1 {
		font-size: 1.5rem;
		margin: 0 0 1rem;
	}
	.empty {
		color: #999;
	}
	.loading {
		color: #999;
		font-size: 0.9rem;
	}
	.load-more {
		margin-top: 1rem;
		padding: 0.4rem 1rem;
		background: none;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	.load-more:hover {
		background: #f5f5f5;
	}
</style>
