<script lang="ts">
	interface Props {
		poemId: number;
		onsubmit?: () => void;
	}

	let { poemId, onsubmit }: Props = $props();

	let note = $state('');
	let submitting = $state(false);
	let message = $state('');

	async function handleSubmit() {
		if (!note.trim()) return;
		submitting = true;
		message = '';

		try {
			const res = await fetch(`/api/poems/${poemId}/feedback`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ note: note.trim() })
			});

			if (res.ok) {
				message = 'Feedback submitted -- it will inform future poems.';
				note = '';
				onsubmit?.();
			} else {
				const data = await res.json();
				message = `Error: ${data.error || 'Unknown error'}`;
			}
		} catch (err) {
			message = 'Failed to submit feedback.';
		} finally {
			submitting = false;
		}
	}
</script>

<form class="feedback-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
	<label for="feedback-note">Feedback</label>
	<textarea
		id="feedback-note"
		bind:value={note}
		placeholder="Share your thoughts on this poem -- what worked, what didn't, what you'd like to see more of..."
		rows="3"
		disabled={submitting}
	></textarea>
	<button type="submit" disabled={submitting || !note.trim()}>
		{submitting ? 'Submitting...' : 'Submit Feedback'}
	</button>
	{#if message}
		<p class="message">{message}</p>
	{/if}
</form>

<style>
	.feedback-form {
		margin-top: 1rem;
	}
	label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.25rem;
		font-size: 0.9rem;
	}
	textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.9rem;
		resize: vertical;
		box-sizing: border-box;
	}
	button {
		margin-top: 0.5rem;
		padding: 0.4rem 1rem;
		background: #333;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.85rem;
	}
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	button:hover:not(:disabled) {
		background: #555;
	}
	.message {
		font-size: 0.85rem;
		color: #666;
		margin-top: 0.5rem;
	}

	@media (max-width: 640px) {
		textarea {
			font-size: 1rem;
		}
		button {
			width: 100%;
			padding: 0.5rem 1rem;
			font-size: 0.9rem;
			min-height: 44px;
		}
	}
</style>
