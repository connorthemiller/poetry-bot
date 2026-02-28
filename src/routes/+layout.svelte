<script lang="ts">
	import AgentStatus from '$lib/components/AgentStatus.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="app">
	<nav class="sidebar">
		<div class="nav-top">
			<h1 class="logo">poetry bot</h1>
			<ul>
				<li><a href="/">Dashboard</a></li>
				<li><a href="/poems">Poems</a></li>
				<li><a href="/voice">Voice</a></li>
				<li><a href="/references">References</a></li>
			</ul>
		</div>
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
		min-width: 0;
	}

	@media (max-width: 640px) {
		.app {
			flex-direction: column;
		}
		.sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid #eee;
			padding: 0.75rem 1rem;
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			gap: 0.5rem;
		}
		.nav-top {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			overflow-x: auto;
			min-width: 0;
		}
		.logo {
			margin: 0;
			white-space: nowrap;
			font-size: 0.9rem;
		}
		ul {
			display: flex;
			gap: 0.25rem;
		}
		li {
			margin-bottom: 0;
		}
		a {
			white-space: nowrap;
			font-size: 0.8rem;
			padding: 0.25rem 0.4rem;
		}
		.sidebar-footer {
			margin-top: 0;
			flex-shrink: 0;
		}
		main {
			padding: 1rem;
		}
	}
</style>
