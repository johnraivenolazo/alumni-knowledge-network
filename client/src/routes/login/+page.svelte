<script lang="ts">
	import { login } from '$lib/authService';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	let error = $state('');

	async function handleLogin() {
		try {
			await login();
		} catch (e) {
			console.error('Login Error:', e);
			error = 'Failed to redirect to login. Please try again.';
		}
	}

	onMount(() => {
		handleLogin();
	});
</script>

<svelte:head>
	<title>Redirecting | AKN</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center px-4 font-sans">
	<div in:fly={{ y: 20, duration: 800 }} class="text-center">
		<div class="mb-8 flex justify-center">
			<img src="/logo.png?v=4" alt="AKN Logo" class="h-16 w-auto opacity-50 invert" />
		</div>

		{#if error}
			<h2 class="text-2xl font-light tracking-tight text-red-400">{error}</h2>
			<button
				onclick={handleLogin}
				class="mt-8 text-sm font-medium text-white underline underline-offset-4 hover:text-neutral-300"
			>
				Try Again
			</button>
		{:else}
			<h2 class="text-3xl font-light tracking-tight text-white italic">Redirecting to login...</h2>
			<p class="mt-4 text-sm font-light text-neutral-500">
				Please wait while we connect you to the secure portal.
			</p>
			<div class="mt-12 flex justify-center">
				<div
					class="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-white"
				></div>
			</div>
		{/if}
	</div>
</div>
