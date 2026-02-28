<script lang="ts">
	import { onMount } from 'svelte';

	interface AgentState {
		running: boolean;
		last_tick: string | null;
		last_poem: string | null;
		particle_count: number;
		readiness_score: number;
	}

	let status: AgentState | null = $state(null);

	async function fetchStatus() {
		try {
			const res = await fetch('/api/agent/status');
			if (res.ok) {
				status = await res.json();
			}
		} catch {
			// Silent fail
		}
	}

	onMount(() => {
		fetchStatus();
		const interval = setInterval(fetchStatus, 30_000);
		return () => clearInterval(interval);
	});
</script>

{#if status}
	<div class="agent-status">
		<span class="dot" class:active={status.running}></span>
		<span class="label">
			{status.running ? 'Agent active' : 'Agent idle'}
		</span>
		<span class="stats">
			{status.particle_count} particles
			-- readiness {(status.readiness_score * 100).toFixed(0)}%
		</span>
	</div>
{/if}

<style>
	.agent-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: #888;
		padding: 0.5rem 0;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #ccc;
	}
	.dot.active {
		background: #22c55e;
		box-shadow: 0 0 4px #22c55e;
	}
	.label {
		font-weight: 600;
	}
	.stats {
		color: #aaa;
	}

	@media (max-width: 640px) {
		.agent-status {
			gap: 0.3rem;
			font-size: 0.7rem;
		}
		.stats {
			display: none;
		}
	}
</style>
