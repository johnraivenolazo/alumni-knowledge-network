<script lang="ts">
	import { onMount } from 'svelte';
	import { initAuth, loading } from '$lib/authService';
	import Navbar from '$lib/components/Navbar.svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(async () => {
		await initAuth();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if $loading}
	<div class="fixed inset-0 flex items-center justify-center bg-neutral-950">
		<div
			class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
		></div>
	</div>
{:else}
	<Navbar />
	<main>
		{@render children()}
	</main>
{/if}

<style>
	:global(body) {
		background-color: #0a0a0a;
		margin: 0;
	}
</style>
