<script lang="ts">
	let title = $state('');
	let body = $state('');
	let url = $state('');
	let sourceType = $state('poem');
	let submitting = $state(false);
	let message = $state('');

	async function handleSubmit() {
		if (!body.trim() && !url.trim()) return;
		submitting = true;
		message = '';

		try {
			const payload: Record<string, string> = {
				title: title.trim(),
				source_type: sourceType
			};
			if (url.trim()) {
				payload.url = url.trim();
			} else {
				payload.body = body.trim();
			}

			const res = await fetch('/api/references', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (res.ok) {
				message = 'Reference submitted -- particles are being extracted.';
				title = '';
				body = '';
				url = '';
			} else {
				const data = await res.json();
				message = `Error: ${data.error || 'Unknown error'}`;
			}
		} catch (err) {
			message = 'Failed to submit reference.';
		} finally {
			submitting = false;
		}
	}
</script>

<form class="reference-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
	<h3>Submit Reference Text</h3>

	<label for="ref-title">Title (optional)</label>
	<input id="ref-title" type="text" bind:value={title} placeholder="Title or author" disabled={submitting} />

	<label for="ref-type">Type</label>
	<select id="ref-type" bind:value={sourceType} disabled={submitting}>
		<option value="poem">Poem</option>
		<option value="article">Article</option>
		<option value="other">Other</option>
	</select>

	<label for="ref-url">URL (optional -- fetches text from a web page)</label>
	<input id="ref-url" type="url" bind:value={url} placeholder="https://..." disabled={submitting || !!body.trim()} />

	<label for="ref-body">Text {url.trim() ? '(ignored when URL is provided)' : ''}</label>
	<textarea
		id="ref-body"
		bind:value={body}
		placeholder="Paste a poem, article excerpt, or any text that might inspire future writing..."
		rows="8"
		disabled={submitting || !!url.trim()}
	></textarea>

	<button type="submit" disabled={submitting || (!body.trim() && !url.trim())}>
		{submitting ? 'Submitting...' : 'Submit Reference'}
	</button>
	{#if message}
		<p class="message">{message}</p>
	{/if}
</form>

<style>
	.reference-form {
		margin-top: 1rem;
	}
	h3 {
		margin: 0 0 0.75rem;
		font-size: 1.1rem;
	}
	label {
		display: block;
		font-weight: 600;
		margin: 0.5rem 0 0.25rem;
		font-size: 0.9rem;
	}
	input, select, textarea {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-family: inherit;
		font-size: 0.9rem;
		box-sizing: border-box;
	}
	textarea {
		resize: vertical;
	}
	button {
		margin-top: 0.75rem;
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
</style>
