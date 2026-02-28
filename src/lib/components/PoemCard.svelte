<script lang="ts">
	interface Props {
		id: number;
		title: string;
		body: string;
		chain_of_thought?: string;
		season?: string | null;
		time_of_day?: string | null;
		weather_context?: string | null;
		triggered_by?: string;
		rating?: string | null;
		created_at: string;
		compact?: boolean;
	}

	let {
		id,
		title,
		body,
		chain_of_thought,
		season,
		time_of_day,
		weather_context,
		triggered_by,
		rating: initialRating = null,
		created_at,
		compact = false
	}: Props = $props();

	let showThinking = $state(false);
	let currentRating = $state(initialRating);
	let ratingLoading = $state(false);

	async function setRating(value: string) {
		ratingLoading = true;
		try {
			const res = await fetch(`/api/poems/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ rating: value })
			});
			if (res.ok) {
				const data = await res.json();
				currentRating = data.rating;
			}
		} catch { /* silent */ }
		ratingLoading = false;
	}

	let thinking = $derived(() => {
		if (!chain_of_thought) return [];
		try {
			return JSON.parse(chain_of_thought);
		} catch {
			return [];
		}
	});

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<article class="poem-card" class:compact>
	<header>
		<h2>
			{#if compact}
				<a href="/poems/{id}">{title || 'Untitled'}</a>
			{:else}
				{title || 'Untitled'}
			{/if}
		</h2>
		<div class="meta">
			<time>{formatDate(created_at)}</time>
			{#if season}<span class="tag">{season}</span>{/if}
			{#if time_of_day}<span class="tag">{time_of_day}</span>{/if}
			{#if triggered_by === 'autonomous'}<span class="tag auto">autonomous</span>{/if}
		</div>
	</header>

	<div class="poem-body">
		{#each body.split('\n') as line}
			{#if line.trim() === ''}
				<br />
			{:else}
				<p>{line}</p>
			{/if}
		{/each}
	</div>

	{#if weather_context && !compact}
		<div class="weather-note">Weather: {weather_context}</div>
	{/if}

	<div class="rating-buttons">
		<button
			class="rate-btn"
			class:active={currentRating === 'up'}
			disabled={ratingLoading}
			onclick={() => setRating('up')}
			title="Thumbs up"
		>+1</button>
		<button
			class="rate-btn"
			class:active={currentRating === 'down'}
			disabled={ratingLoading}
			onclick={() => setRating('down')}
			title="Thumbs down"
		>-1</button>
		<button
			class="rate-btn favorite"
			class:active={currentRating === 'favorite'}
			disabled={ratingLoading}
			onclick={() => setRating('favorite')}
			title="Favorite"
		>*</button>
	</div>

	{#if thinking().length > 0 && thinking()[0] && !compact}
		<button class="thinking-toggle" onclick={() => (showThinking = !showThinking)}>
			{showThinking ? 'Hide' : 'Show'} thought process
		</button>
		{#if showThinking}
			<div class="thinking">
				{#each thinking() as thought}
					<p>{thought}</p>
				{/each}
			</div>
		{/if}
	{/if}
</article>

<style>
	.poem-card {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 1rem;
		background: #fafafa;
	}
	.poem-card.compact {
		padding: 1rem;
	}
	header {
		margin-bottom: 1rem;
	}
	h2 {
		margin: 0 0 0.25rem;
		font-size: 1.25rem;
	}
	h2 a {
		color: inherit;
		text-decoration: none;
	}
	h2 a:hover {
		text-decoration: underline;
	}
	.meta {
		font-size: 0.8rem;
		color: #888;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.tag {
		background: #e8e8e8;
		padding: 0.1rem 0.4rem;
		border-radius: 4px;
		font-size: 0.75rem;
	}
	.tag.auto {
		background: #e0e7ff;
		color: #4338ca;
	}
	.poem-body {
		font-family: Georgia, 'Times New Roman', serif;
		line-height: 1.7;
		margin-bottom: 1rem;
	}
	.poem-body p {
		margin: 0;
	}
	.weather-note {
		font-size: 0.8rem;
		color: #999;
		font-style: italic;
		margin-bottom: 0.5rem;
	}
	.rating-buttons {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}
	.rate-btn {
		background: none;
		border: 1px solid #ddd;
		border-radius: 4px;
		padding: 0.2rem 0.6rem;
		font-size: 0.8rem;
		cursor: pointer;
		color: #888;
	}
	.rate-btn:hover:not(:disabled) {
		background: #f0f0f0;
	}
	.rate-btn.active {
		background: #e8e8e8;
		border-color: #999;
		color: #333;
	}
	.rate-btn.favorite.active {
		background: #fef3c7;
		border-color: #f59e0b;
		color: #b45309;
	}
	.thinking-toggle {
		background: none;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 0.25rem 0.75rem;
		font-size: 0.8rem;
		cursor: pointer;
		color: #666;
	}
	.thinking-toggle:hover {
		background: #f0f0f0;
	}
	.thinking {
		margin-top: 0.75rem;
		padding: 1rem;
		background: #f5f5f0;
		border-radius: 4px;
		font-size: 0.9rem;
		color: #555;
		line-height: 1.6;
		white-space: pre-wrap;
	}

	@media (max-width: 640px) {
		.poem-card {
			padding: 1rem;
		}
		h2 {
			font-size: 1.1rem;
		}
		.poem-body {
			font-size: 0.95rem;
			line-height: 1.6;
		}
		.rate-btn {
			padding: 0.35rem 0.8rem;
			font-size: 0.85rem;
			min-height: 36px;
		}
		.thinking-toggle {
			padding: 0.35rem 0.8rem;
			min-height: 36px;
		}
	}
</style>
