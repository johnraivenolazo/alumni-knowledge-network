<script lang="ts">
	const title = 'Alumni Knowledge Network';
</script>

<svelte:head>
	<title>{title}</title>
	<meta
		name="description"
		content="Connect students with alumni for mentorship and career advice."
	/>
</svelte:head>

<main class="min-h-screen bg-neutral-950 text-white selection:bg-indigo-500/30">
	<!-- Hero Section -->
	<div class="relative overflow-hidden pt-32 pb-20 sm:pt-48 sm:pb-32">
		<!-- Gradient background -->
		<div class="absolute inset-0 -z-10">
			<div
				class="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#3b82f633,transparent)]"
			></div>
			<div
				class="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,#8b5cf622,transparent)]"
			></div>
		</div>

		<div class="mx-auto max-w-7xl px-6 lg:px-8">
			<div class="mx-auto max-w-2xl text-center">
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
					<a
						href="/login"
						class="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black shadow-sm transition-all hover:bg-neutral-200 active:scale-95"
					>
						Get Started
					</a>
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
				<dd class="order-first text-3xl font-semibold tracking-tight sm:text-5xl">500+</dd>
			</div>
			<div class="mx-auto flex max-w-xs flex-col gap-y-4">
				<dt class="text-base leading-7 text-neutral-400">Mentorship Pairs</dt>
				<dd class="order-first text-3xl font-semibold tracking-tight sm:text-5xl">1.2k</dd>
			</div>
			<div class="mx-auto flex max-w-xs flex-col gap-y-4">
				<dt class="text-base leading-7 text-neutral-400">Success Rate</dt>
				<dd class="order-first text-3xl font-semibold tracking-tight sm:text-5xl">98%</dd>
			</div>
		</dl>
	</div>
</main>

<style>
	:global(body) {
		background-color: #0a0a0a;
		margin: 0;
		font-family:
			'Inter',
			system-ui,
			-apple-system,
			sans-serif;
	}
</style>
