<script lang="ts">
	import { onMount } from 'svelte';
	import ReferenceSubmit from '$lib/components/ReferenceSubmit.svelte';

	let references: any[] = $state([]);
	let loading = $state(true);
	let expanded: Record<number, boolean> = $state({});

	async function loadRefs() {
		try {
			const res = await fetch('/api/references');
			if (res.ok) references = await res.json();
		} catch { /* silent */ }
		loading = false;
	}

	onMount(() => loadRefs());
</script>

<div>
	<h1>References</h1>
	<p class="subtitle">Poems, articles, and texts that guide the agent's writing.</p>

	<ReferenceSubmit />

	{#if loading}
		<p class="loading">Loading...</p>
	{:else if references.length === 0}
		<p class="empty">No references submitted yet.</p>
	{:else}
		<section class="ref-list">
			<h2>Submitted References</h2>
			{#each references as ref}
				<div class="ref-item">
					<h3>{ref.title || 'Untitled'} <span class="type">{ref.source_type}</span></h3>
					<p class="ref-body">
						{#if expanded[ref.id] || ref.body.length <= 300}
							{ref.body}
						{:else}
							{ref.body.slice(0, 300)}...
						{/if}
					</p>
					{#if ref.body.length > 300}
						<button class="expand-toggle" onclick={() => expanded[ref.id] = !expanded[ref.id]}>
							{expanded[ref.id] ? 'Show less' : 'Show more'}
						</button>
					{/if}
					<time>{new Date(ref.created_at).toLocaleDateString()}</time>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	h1 {
		font-size: 1.5rem;
		margin: 0 0 0.25rem;
	}
	.subtitle {
		color: #888;
		font-size: 0.9rem;
		margin: 0 0 1.5rem;
	}
	h2 {
		font-size: 1.1rem;
		margin: 2rem 0 0.75rem;
	}
	.loading, .empty {
		color: #999;
		font-size: 0.9rem;
	}
	.ref-item {
		padding: 1rem;
		border: 1px solid #eee;
		border-radius: 6px;
		margin-bottom: 0.75rem;
	}
	.ref-item h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
	}
	.type {
		font-size: 0.75rem;
		background: #ede9fe;
		color: #5b21b6;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-weight: normal;
	}
	.ref-body {
		font-size: 0.9rem;
		color: #555;
		line-height: 1.5;
		margin: 0 0 0.25rem;
		white-space: pre-wrap;
	}
	.expand-toggle {
		background: none;
		border: none;
		color: #6366f1;
		font-size: 0.8rem;
		cursor: pointer;
		padding: 0;
		margin-bottom: 0.25rem;
	}
	.expand-toggle:hover {
		text-decoration: underline;
	}
	time {
		font-size: 0.75rem;
		color: #aaa;
	}
</style>
