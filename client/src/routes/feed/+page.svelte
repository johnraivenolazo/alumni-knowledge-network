<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { api } from '$lib/api';
	import { isAuthenticated, user, loading as authLoading } from '$lib/authService';
	import { goto } from '$app/navigation';
	import type { Post, Comment } from '$lib/types';

	let posts = $state<Post[]>([]);
	let loading = $state(true);
	let newPost = $state({ title: '', content: '', category: 'General' });
	let error = $state('');
	let activeCategory = $state('All');
	let commentText = $state<Record<string, string>>({});

	const categories = ['All', 'General', 'Tech', 'Career', 'Mentorship', 'Events'];

	async function loadPosts() {
		if (!$isAuthenticated) return;
		try {
			posts = await api.get('/posts');
		} catch (e: unknown) {
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
			newPost = { title: '', content: '', category: 'General' };
		} catch (e: unknown) {
			error = (e as Error).message;
		}
	}

	async function handleAddComment(postId: string) {
		const content = commentText[postId];
		if (!content) return;
		try {
			const comment = await api.post(`/posts/${postId}/comments`, { content });
			posts = posts.map((p) => {
				if (p.id === postId) {
					return { ...p, comments: [...(p.comments || []), comment] };
				}
				return p;
			});
			commentText[postId] = '';
		} catch (e: unknown) {
			alert((e as Error).message);
		}
	}

	async function handleDelete(postId: string) {
		if (!confirm('Are you sure you want to delete this post?')) return;
		try {
			await api.delete(`/posts/${postId}`);
			posts = posts.filter((p) => p.id !== postId);
		} catch (e: unknown) {
			alert((e as Error).message);
		}
	}

	onMount(() => {
		if (!$authLoading && !$isAuthenticated) {
			goto('/login');
		} else if (!$authLoading && $isAuthenticated) {
			loadPosts();
		}
	});

	let filteredPosts = $derived(
		activeCategory === 'All' ? posts : posts.filter((p) => p.category === activeCategory)
	);
</script>

{#snippet commentSnippet(comment: Comment)}
	<div class="flex gap-4 border-t border-white/5 pt-4">
		<div
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-light text-neutral-400"
		>
			{#if comment.author?.profilePic}
				<img
					src={comment.author.profilePic}
					alt={comment.author.name}
					class="h-full w-full rounded-full object-cover"
				/>
			{:else}
				{comment.author?.name?.charAt(0) || 'U'}
			{/if}
		</div>
		<div class="flex-grow pb-4">
			<div class="mb-1 flex items-center gap-3">
				<span class="text-sm font-medium text-white">{comment.author?.name}</span>
				<span class="text-[10px] font-bold tracking-widest text-neutral-600 uppercase"
					>{new Date(comment.createdAt).toLocaleDateString()}</span
				>
			</div>
			<p class="text-sm leading-relaxed text-neutral-400">{comment.content}</p>
		</div>
	</div>
{/snippet}

<div class="mx-auto max-w-4xl px-6 py-20 font-sans">
	{#if $isAuthenticated}
		<header class="mb-16 border-b border-white/10 pb-10">
			<h1 class="text-4xl font-light tracking-tight text-white sm:text-5xl">Knowledge Feed</h1>
			<p class="mt-6 max-w-2xl text-lg leading-relaxed font-light text-neutral-400">
				Industry insights, mentorship advice, and campus updates from the alumni network.
			</p>

			<div class="scrollbar-hide mt-12 flex gap-8 overflow-x-auto pb-2">
				{#each categories as cat (cat)}
					<button
						onclick={() => (activeCategory = cat)}
						class="text-xs font-bold tracking-widest whitespace-nowrap uppercase transition-colors {activeCategory ===
						cat
							? 'text-white'
							: 'text-neutral-600 hover:text-neutral-400'}"
					>
						{cat}
					</button>
				{/each}
			</div>
		</header>

		<form onsubmit={handleSubmit} class="mb-20 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xs font-bold tracking-widest text-neutral-500 uppercase">
					Share Expertise
				</h2>
				<select
					bind:value={newPost.category}
					class="bg-transparent text-xs font-bold tracking-widest text-neutral-500 uppercase outline-none focus:text-white"
				>
					{#each categories.filter((c) => c !== 'All') as cat (cat)}
						<option value={cat} class="bg-neutral-900">{cat}</option>
					{/each}
				</select>
			</div>

			<input
				bind:value={newPost.title}
				placeholder="Topic Title"
				class="w-full border-b border-white/10 bg-transparent py-4 text-xl font-light text-white placeholder-neutral-600 transition-colors focus:border-white focus:outline-none"
			/>

			<textarea
				bind:value={newPost.content}
				placeholder="What insights do you want to share with the community?"
				rows="3"
				class="w-full resize-none border-b border-white/10 bg-transparent py-4 text-sm leading-relaxed font-light text-white placeholder-neutral-600 transition-colors focus:border-white focus:outline-none"
			></textarea>

			{#if error}
				<p class="text-xs text-red-400">{error}</p>
			{/if}

			<div class="flex justify-end pt-4">
				<button
					type="submit"
					class="text-sm font-medium text-white underline-offset-4 hover:underline"
				>
					Publish Post
				</button>
			</div>
		</form>

		{#if loading}
			<div class="flex flex-col border-t border-white/10 pt-16">
				{#each Array(3) as _, i (i)}
					<div class="mb-16 space-y-4">
						<div class="h-4 w-32 animate-pulse bg-white/5"></div>
						<div class="h-6 w-3/4 animate-pulse bg-white/5"></div>
						<div class="h-20 w-full animate-pulse bg-white/5"></div>
					</div>
				{/each}
			</div>
		{:else if filteredPosts.length === 0}
			<div class="border-t border-white/10 pt-16 text-center">
				<p class="text-sm font-light text-neutral-600 italic">
					No posts found in {activeCategory}.
				</p>
			</div>
		{:else}
			<div class="flex flex-col border-t border-white/10 pt-12">
				{#each filteredPosts as post, i (post.id)}
					<article
						in:fly={{ y: 20, duration: 400, delay: i * 50 }}
						class="group mb-16 border-b border-white/5 pb-16 last:mb-0 last:border-0 last:pb-0"
					>
						<div class="mb-8 flex items-start justify-between">
							<div class="flex items-center gap-6">
								<div
									class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-light text-neutral-400"
								>
									{#if post.author?.profilePic}
										<img
											src={post.author.profilePic}
											alt={post.author.name}
											class="h-full w-full rounded-full object-cover"
										/>
									{:else}
										{post.author?.name?.charAt(0) || 'U'}
									{/if}
								</div>
								<div>
									<div class="flex items-center gap-3">
										<span class="text-base font-medium text-white"
											>{post.author?.name || 'Anonymous'}</span
										>
										{#if post.author?.isExpert}
											<span
												class="bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-black uppercase"
												>Expert</span
											>
										{/if}
									</div>
									<p class="mt-1 text-sm text-neutral-500">
										{post.author?.industry || 'General'} •
										<span class="text-[10px] font-bold tracking-widest uppercase"
											>{new Date(post.createdAt).toLocaleDateString()}</span
										>
									</p>
								</div>
							</div>

							{#if $user?.id === post.authorId || $user?.id === post.author?.id || $user?.role === 'ADMIN' || $user?.role === 'SUPERADMIN'}
								<button
									onclick={() => handleDelete(post.id)}
									class="text-xs font-bold tracking-widest text-neutral-600 uppercase transition-colors hover:text-red-400"
								>
									Delete
								</button>
							{/if}
						</div>

						<div class="mb-8 sm:ml-[4.5rem]">
							<span
								class="mb-4 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
								>{post.category}</span
							>
							<h3
								class="mb-4 text-2xl font-medium text-white transition-colors group-hover:text-indigo-400"
							>
								{post.title}
							</h3>
							<p class="text-base leading-relaxed font-light whitespace-pre-line text-neutral-400">
								{post.content}
							</p>
						</div>

						<div class="sm:ml-[4.5rem]">
							<div
								class="mb-8 flex items-center gap-2 text-xs font-bold tracking-widest text-neutral-600 uppercase"
							>
								{post.comments?.length || 0} Comments
							</div>

							{#if post.comments && post.comments.length > 0}
								<div class="mb-8 space-y-2">
									{#each post.comments as comment (comment.id)}
										{@render commentSnippet(comment)}
									{/each}
								</div>
							{/if}

							<div class="flex items-start gap-4">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-light text-neutral-400"
								>
									{#if $user?.profilePic}
										<img
											src={$user.profilePic}
											alt={$user.name}
											class="h-full w-full rounded-full object-cover"
										/>
									{:else}
										{$user?.name?.charAt(0) || 'U'}
									{/if}
								</div>
								<div class="flex flex-grow flex-col gap-3 sm:flex-row sm:items-center">
									<input
										type="text"
										bind:value={commentText[post.id]}
										placeholder="Write a comment..."
										class="w-full border-b border-white/10 bg-transparent py-2 text-sm font-light text-white transition-colors focus:border-white focus:outline-none"
										onkeydown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
									/>
									<button
										onclick={() => handleAddComment(post.id)}
										class="text-sm font-medium text-white underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
										disabled={!commentText[post.id]}
									>
										Post
									</button>
								</div>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	{:else}
		<div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
			<h2 class="mb-6 text-5xl font-light tracking-tight text-white">Knowledge Feed</h2>
			<p class="mb-12 max-w-md text-lg leading-relaxed font-light text-neutral-500">
				Sign in to access industry insights, mentorship advice, and campus updates.
			</p>
			<button
				onclick={() => (window.location.href = '/login')}
				class="bg-white px-10 py-4 text-sm font-medium text-black transition-transform hover:scale-105"
			>
				Sign In
			</button>
		</div>
	{/if}
</div>
