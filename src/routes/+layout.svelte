<script lang="ts">
	import AgentStatus from '$lib/components/AgentStatus.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="app">
	<nav class="sidebar">
		<h1 class="logo">poetry bot</h1>
		<ul>
			<li><a href="/">Dashboard</a></li>
			<li><a href="/poems">Poems</a></li>
			<li><a href="/references">References</a></li>
		</ul>
		<div class="sidebar-footer">
			<AgentStatus />
		</div>
	</nav>
	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		color: #333;
		background: #fff;
	}
	:global(*) {
		box-sizing: border-box;
	}
	.app {
		display: flex;
		min-height: 100vh;
	}
	.sidebar {
		width: 200px;
		border-right: 1px solid #eee;
		padding: 1.5rem 1rem;
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}
	.logo {
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: lowercase;
		color: #333;
		margin: 0 0 1.5rem;
	}
	ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	li {
		margin-bottom: 0.25rem;
	}
	a {
		color: #555;
		text-decoration: none;
		font-size: 0.9rem;
		padding: 0.3rem 0.5rem;
		border-radius: 4px;
		display: block;
	}
	a:hover {
		background: #f5f5f5;
		color: #333;
	}
	.sidebar-footer {
		margin-top: auto;
	}
	main {
		flex: 1;
		padding: 2rem;
		max-width: 800px;
	}
</style>
