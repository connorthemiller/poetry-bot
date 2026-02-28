<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import PoemCard from '$lib/components/PoemCard.svelte';
	import FeedbackForm from '$lib/components/FeedbackForm.svelte';

	let poem: any = $state(null);
	let feedback: any[] = $state([]);
	let loading = $state(true);
	let error = $state('');

	async function loadPoem() {
		loading = true;
		try {
			const res = await fetch(`/api/poems/${page.params.id}`);
			if (res.ok) {
				const data = await res.json();
				poem = data;
				feedback = data.feedback || [];
			} else {
				error = 'Poem not found';
			}
		} catch {
			error = 'Failed to load poem';
		}
		loading = false;
	}

	function onFeedbackSubmit() {
		loadPoem();
	}

	onMount(() => loadPoem());
</script>

<div>
	{#if loading}
		<p>Loading...</p>
	{:else if error}
		<p class="error">{error}</p>
		<a href="/poems">Back to poems</a>
	{:else if poem}
		<a href="/poems" class="back">Back to poems</a>

		<PoemCard {...poem} />

		{#if feedback.length > 0}
			<section class="feedback-list">
				<h3>Feedback</h3>
				{#each feedback as fb}
					<div class="feedback-item">
						<p>{fb.note}</p>
						<time>{new Date(fb.created_at).toLocaleDateString()}</time>
					</div>
				{/each}
			</section>
		{/if}

		<FeedbackForm poemId={poem.id} onsubmit={onFeedbackSubmit} />
	{/if}
</div>

<style>
	.back {
		display: inline-block;
		margin-bottom: 1rem;
		color: #666;
		font-size: 0.85rem;
	}
	.error {
		color: #dc2626;
	}
	.feedback-list {
		margin-top: 1.5rem;
	}
	.feedback-list h3 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
	}
	.feedback-item {
		padding: 0.75rem;
		background: #f9f9f9;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}
	.feedback-item p {
		margin: 0 0 0.25rem;
		font-size: 0.9rem;
	}
	.feedback-item time {
		font-size: 0.75rem;
		color: #aaa;
	}
</style>
