<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { isAuthenticated } from '$lib/authService';

	let posts = $state([]);
	let loading = $state(true);
	let newPost = $state({ title: '', content: '' });
	let error = $state('');

	async function loadPosts() {
		try {
			posts = await api.get('/posts');
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!newPost.title || !newPost.content) return;
		try {
			const created = await api.post('/posts', newPost);
			posts = [created, ...posts];
			newPost = { title: '', content: '' };
		} catch (e: any) {
			error = e.message;
		}
	}

	onMount(loadPosts);
</script>

<div class="mx-auto max-w-4xl px-4 py-12">
	<div class="mb-12 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Knowledge Feed</h1>
		{#if $isAuthenticated}
			<button
				class="rounded-lg bg-indigo-600 px-4 py-2 text-white transition-colors hover:bg-indigo-700"
			>
				Create Post
			</button>
		{/if}
	</div>

	{#if $isAuthenticated}
		<form
			onsubmit={handleSubmit}
			class="mb-12 space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
		>
			<h2 class="mb-2 text-xl font-semibold">Share your knowledge</h2>
			<input
				bind:value={newPost.title}
				placeholder="Title"
				class="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-white transition-colors focus:border-indigo-500 focus:outline-none"
			/>
			<textarea
				bind:value={newPost.content}
				placeholder="What's on your mind?"
				rows="4"
				class="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-white transition-colors focus:border-indigo-500 focus:outline-none"
			></textarea>
			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}
			<button
				type="submit"
				class="rounded-lg bg-white px-6 py-2 font-semibold text-black transition-all hover:bg-neutral-200 active:scale-95"
			>
				Post
			</button>
		</form>
	{/if}

	{#if loading}
		<div class="flex justify-center py-12">
			<div
				class="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
			></div>
		</div>
	{:else if posts.length === 0}
		<div
			class="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/30 py-20 text-center"
		>
			<p class="text-neutral-500">No posts yet. Be the first to share something!</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each posts as post}
				<div
					class="group rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 transition-all hover:border-neutral-700"
				>
					<div class="mb-4 flex items-start justify-between">
						<div>
							<h3 class="mb-1 text-2xl font-bold transition-colors group-hover:text-indigo-400">
								{post.title}
							</h3>
							<div class="flex items-center gap-2 text-sm text-neutral-500">
								<span class="font-medium text-neutral-300">{post.author?.name || 'Anonymous'}</span>
								<span>•</span>
								<span>{post.author?.industry || 'General'}</span>
								<span>•</span>
								<span>{new Date(post.createdAt).toLocaleDateString()}</span>
							</div>
						</div>
					</div>
					<p class="line-clamp-3 leading-relaxed text-neutral-400">
						{post.content}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
