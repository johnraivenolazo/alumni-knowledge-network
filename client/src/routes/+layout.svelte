<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
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
	<link rel="icon" href="/logo.png?v=4" />
</svelte:head>

{#if $loading}
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 gap-6">
		<img src="/logo.png?v=4" alt="AKN Logo" class="h-16 w-auto invert animate-pulse opacity-50" />
		<div
			class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500"
		></div>
	</div>
{:else}
	<div class="min-h-screen flex flex-col">
		<Navbar />
		<main class="flex-grow grid">
			{#key page.url.pathname}
				<div
					in:fly={{ y: 20, duration: 400, delay: 200 }}
					out:fly={{ y: -10, duration: 150 }}
					class="col-start-1 row-start-1 w-full h-full"
				>
					{@render children()}
				</div>
			{/key}
		</main>
	</div>
{/if}


