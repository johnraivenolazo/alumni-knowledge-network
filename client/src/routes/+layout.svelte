<script lang="ts">
	import { onMount } from 'svelte';
	import { spring } from 'svelte/motion';
	import { page } from '$app/state';
	import { fly, fade as svelteFade } from 'svelte/transition';
	import { initAuth, loading, user } from '$lib/authService';
	import { goto } from '$app/navigation';
	import Navbar from '$lib/components/Navbar.svelte';
	import './layout.css';

	let { children } = $props();

	// Alias fade to ensure it's captured in the scope correctly for Svelte 5 transitions
	const fade = svelteFade;

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

	// Status Guard Logic
	$effect(() => {
		if (!$loading) {
			const path = page.url.pathname;
			const publicRoutes = ['/', '/login', '/pending', '/banned'];

			if ($user) {
				if ($user.isBanned && path !== '/banned') {
					goto('/banned');
				} else if ($user.status === 'PENDING' && !publicRoutes.includes(path)) {
					goto('/pending');
				} else if ($user.status === 'APPROVED' && path === '/pending') {
					goto('/feed');
				}
			}
		}
	});

	onMount(async () => {
		await initAuth();
	});
</script>

<svelte:head>
	<link rel="icon" href="/logo.png?v=4" />
</svelte:head>

<svelte:window onmousemove={handleMouseMove} />

{#if $loading}
	<div
		transition:fade={{ duration: 400 }}
		class="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-neutral-950"
	>
		<div class="relative flex items-center justify-center">
			<!-- Outer Glow -->
			<div class="absolute h-32 w-32 animate-pulse rounded-full bg-indigo-500/10 blur-3xl"></div>
			<!-- Logo -->
			<img
				src="/logo.png?v=4"
				alt="AKN Logo"
				class="relative h-20 w-auto animate-pulse invert brightness-200"
			/>
		</div>
		<div class="mt-8 flex flex-col items-center gap-2">
			<div class="flex gap-1">
				{#each Array(3) as _, i}
					<div
						class="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500"
						style="animation-delay: {i * 0.1}s"
					></div>
				{/each}
			</div>
			<p class="text-[10px] font-black tracking-[0.2em] text-neutral-500 uppercase">
				Initializing Network
			</p>
		</div>
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
			{#if page.url.pathname !== '/banned' && page.url.pathname !== '/pending' && page.url.pathname !== '/login'}
				<Navbar />
			{/if}
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
