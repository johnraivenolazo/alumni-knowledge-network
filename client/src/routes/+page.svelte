<script lang="ts">
	import { base } from '$app/paths';
	import { isAuthenticated, login } from '$lib/authService';
	const title = 'Alumni Knowledge Network';
</script>

<svelte:head>
	<title>{title}</title>
	<meta
		name="description"
		content="Connect students with alumni for mentorship and career advice."
	/>
</svelte:head>

<main class="relative min-h-screen overflow-hidden text-white selection:bg-indigo-500/30">
	<!-- Hero Section -->
	<div class="relative pt-20 pb-20 sm:pt-32 sm:pb-32">
		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
				<div class="mb-8 flex justify-center">
					<img src="/logo.png?v=4" alt="AKN Logo" class="h-20 w-auto opacity-80 invert" />
				</div>
				<h1
					class="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl"
				>
					Connect. Mentor. Grow.
				</h1>
				<p class="mt-8 text-lg leading-8 text-neutral-400">
					Bridging the gap between students and alumni. Secure mentorship, career advice, and
					professional networks through the SECI model.
				</p>
				<div class="mt-10 flex items-center justify-center gap-x-6">
					{#if $isAuthenticated}
						<a
							href={`${base}/feed`}
							class="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-sm transition-all hover:bg-neutral-200 active:scale-95"
						>
							Enter Network
						</a>
					{:else}
						<button
							onclick={login}
							class="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-sm transition-all hover:bg-neutral-200 active:scale-95"
						>
							Get Started
						</button>
					{/if}
					<a
						href="#about"
						class="text-sm leading-6 font-semibold text-white transition-colors hover:text-neutral-300"
					>
						Learn more <span aria-hidden="true">→</span>
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Features / Stats -->
	<div class="mx-auto max-w-7xl px-6 pb-32 lg:px-8">
		<dl class="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-3">
			<div class="mx-auto flex max-w-xs flex-col gap-y-4">
				<dt class="text-base leading-7 text-neutral-400">Verified Alumni</dt>
				<dd class="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">
					500+
				</dd>
			</div>
			<div class="mx-auto flex max-w-xs flex-col gap-y-4">
				<dt class="text-base leading-7 text-neutral-400">Mentorship Pairs</dt>
				<dd class="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">
					1.2k
				</dd>
			</div>
			<div class="mx-auto flex max-w-xs flex-col gap-y-4">
				<dt class="text-base leading-7 text-neutral-400">Success Rate</dt>
				<dd class="order-first text-3xl font-semibold tracking-tight text-white sm:text-5xl">
					98%
				</dd>
			</div>
		</dl>
	</div>

	<!-- About / SECI Model Section -->
	<div id="about" class="mx-auto max-w-7xl scroll-mt-24 px-6 pb-32 lg:px-8">
		<div class="mx-auto max-w-2xl text-center">
			<h2 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">The SECI Model</h2>
			<p class="mt-6 text-lg leading-8 text-neutral-400">
				Our platform is built on the SECI model of knowledge dimensions: Socialization,
				Externalization, Combination, and Internalization.
			</p>
		</div>
		<div
			class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-sm leading-6 text-neutral-300 sm:grid-cols-2 lg:max-w-none lg:grid-cols-4"
		>
			<div
				class="group rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 transition-all duration-300 hover:border-indigo-500/50 hover:bg-neutral-900/50"
			>
				<div
					class="mb-3 text-base font-bold text-white transition-colors group-hover:text-indigo-400"
				>
					Socialization
				</div>
				Sharing tacit knowledge through face-to-face mentorship and shared experiences.
			</div>
			<div
				class="group rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 transition-all duration-300 hover:border-indigo-500/50 hover:bg-neutral-900/50"
			>
				<div
					class="mb-3 text-base font-bold text-white transition-colors group-hover:text-indigo-400"
				>
					Externalization
				</div>
				Converting tacit knowledge into explicit concepts through dialogue and reflection.
			</div>
			<div
				class="group rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 transition-all duration-300 hover:border-indigo-500/50 hover:bg-neutral-900/50"
			>
				<div
					class="mb-3 text-base font-bold text-white transition-colors group-hover:text-indigo-400"
				>
					Combination
				</div>
				Organizing and integrating different bodies of explicit knowledge via our feed.
			</div>
			<div
				class="group rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 transition-all duration-300 hover:border-indigo-500/50 hover:bg-neutral-900/50"
			>
				<div
					class="mb-3 text-base font-bold text-white transition-colors group-hover:text-indigo-400"
				>
					Internalization
				</div>
				Learning by doing and embodying explicit knowledge into personal mental models.
			</div>
		</div>
	</div>
</main>
