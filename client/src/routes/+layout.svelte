<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { initAuth, loading } from '$lib/authService';
	import Navbar from '$lib/components/Navbar.svelte';
	import './layout.css';

	let { children } = $props();

	let coords = spring(
		{ x: 0, y: 0 },
		{
			stiffness: 0.05,
			damping: 0.25
		}
	);

	function handleMouseMove(e: MouseEvent) {
		coords.set({ x: e.clientX, y: e.clientY });
	}

	onMount(async () => {
		await initAuth();
	});
</script>

<svelte:head>
	<link rel="icon" href="/logo.png?v=4" />
</svelte:head>

<svelte:window onmousemove={handleMouseMove} />

{#if $loading}
	<div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-neutral-950">
		<img src="/logo.png?v=4" alt="AKN Logo" class="h-16 w-auto animate-pulse opacity-50 invert" />
		<div
			class="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500"
		></div>
	</div>
{:else}
	<div class="relative flex min-h-screen flex-col bg-neutral-950">
		<!-- Premium Background Effects (Global) -->
		<div class="pointer-events-none fixed inset-0 z-0">
			<!-- Mouse Glow (Landing Page Only) -->
			{#if page.url.pathname === '/'}
				<div
					class="absolute inset-0"
					style="background: radial-gradient(500px circle at {$coords.x}px {$coords.y}px, rgba(99, 102, 241, 0.08), transparent 80%);"
				></div>
			{/if}

			<!-- Noise Texture Overlay (Global) -->
			<div
				class="absolute inset-0 opacity-[0.03] mix-blend-overlay brightness-100 contrast-150"
				style="background-image: url('/noise.svg');"
			></div>
		</div>

		<div class="relative z-10 flex min-h-screen flex-col">
			<Navbar />
			<main class="grid flex-grow">
				{#key page.url.pathname}
					<div
						in:fly={{ y: 20, duration: 400, delay: 200 }}
						out:fly={{ y: -10, duration: 150 }}
						class="col-start-1 row-start-1 h-full w-full"
					>
						{@render children()}
					</div>
				{/key}
			</main>
		</div>
	</div>
{/if}
