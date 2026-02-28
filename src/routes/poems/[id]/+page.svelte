<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import PoemCard from '$lib/components/PoemCard.svelte';
	import FeedbackForm from '$lib/components/FeedbackForm.svelte';

	let poem: any = $state(null);
	let feedback: any[] = $state([]);
	let critique: any = $state(null);
	let critiqueOpen = $state(false);
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
				critique = data.critique || null;
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

		{#if critique}
			<section class="critique-section">
				<button class="critique-toggle" onclick={() => critiqueOpen = !critiqueOpen}>
					{critiqueOpen ? '- ' : '+ '}Self-Critique
				</button>
				{#if critiqueOpen}
					<div class="critique-body">
						{#if critique.strengths}
							<div class="critique-block">
								<h4>Strengths</h4>
								<p>{critique.strengths}</p>
							</div>
						{/if}
						{#if critique.weaknesses}
							<div class="critique-block">
								<h4>Weaknesses</h4>
								<p>{critique.weaknesses}</p>
							</div>
						{/if}
						{#if critique.suggestions}
							<div class="critique-block">
								<h4>Suggestions</h4>
								<p>{critique.suggestions}</p>
							</div>
						{/if}
						{#if critique.overall_assessment}
							<div class="critique-block">
								<h4>Assessment</h4>
								<p>{critique.overall_assessment}</p>
							</div>
						{/if}
					</div>
				{/if}
			</section>
		{/if}

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
	.critique-section {
		margin-top: 1.5rem;
		border: 1px solid #eee;
		border-radius: 4px;
	}
	.critique-toggle {
		width: 100%;
		text-align: left;
		padding: 0.75rem;
		background: #fafafa;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 600;
		color: #555;
	}
	.critique-toggle:hover {
		background: #f0f0f0;
	}
	.critique-body {
		padding: 0 0.75rem 0.75rem;
	}
	.critique-block {
		margin-top: 0.75rem;
	}
	.critique-block h4 {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #888;
		margin: 0 0 0.25rem;
	}
	.critique-block p {
		margin: 0;
		font-size: 0.9rem;
		white-space: pre-wrap;
		line-height: 1.5;
	}
</style>
