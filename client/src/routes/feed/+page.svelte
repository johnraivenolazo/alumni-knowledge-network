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
	<div class="flex gap-3 border-t border-white/5 py-3 last:pb-0">
		<div
			class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-800 text-[10px] font-bold text-white"
		>
			{#if comment.author?.profilePic}
				<img
					src={comment.author.profilePic}
					alt={comment.author.name}
					class="h-full w-full object-cover"
				/>
			{:else}
				{comment.author?.name?.charAt(0) || 'U'}
			{/if}
		</div>
		<div class="flex-grow">
			<div class="mb-1 flex items-center gap-2">
				<span class="text-xs font-bold text-white">{comment.author?.name}</span>
				<span class="text-[10px] text-neutral-500"
					>{new Date(comment.createdAt).toLocaleDateString()}</span
				>
			</div>
			<p class="text-sm leading-relaxed text-neutral-400">{comment.content}</p>
		</div>
	</div>
{/snippet}

<div class="mx-auto max-w-5xl px-4 py-12">
	<div class="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-center">
		<div>
			<h1 class="text-4xl font-black tracking-tighter text-white">Knowledge Feed</h1>
			<p class="text-neutral-500">Industry insights, mentorship advice, and campus updates.</p>
		</div>

		<!-- Category Filter -->
		<div class="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
			{#each categories as cat (cat)}
				<button
					onclick={() => (activeCategory = cat)}
					class="rounded-full border px-4 py-1.5 text-xs font-bold transition-all
                    {activeCategory === cat
						? 'border-white bg-white text-black'
						: 'border-neutral-800 bg-transparent text-neutral-400 hover:border-neutral-600'}"
				>
					{cat}
				</button>
			{/each}
		</div>
	</div>

	{#if $isAuthenticated}
		<form
			onsubmit={handleSubmit}
			class="mb-12 space-y-4 rounded-3xl border border-white/5 bg-neutral-900/50 p-8 backdrop-blur-xl"
		>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold text-white">Share Expertise</h2>
				<select
					bind:value={newPost.category}
					class="rounded-lg border border-white/10 bg-neutral-950 px-3 py-1 text-xs text-neutral-400 focus:border-indigo-500 focus:outline-none"
				>
					{#each categories.filter((c) => c !== 'All') as cat (cat)}
						<option value={cat}>{cat}</option>
					{/each}
				</select>
			</div>
			<input
				bind:value={newPost.title}
				placeholder="Topic Title"
				class="w-full rounded-xl border border-white/5 bg-neutral-950/50 px-5 py-3 text-white transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:outline-none"
			/>
			<textarea
				bind:value={newPost.content}
				placeholder="What insights do you want to share with the community?"
				rows="4"
				class="w-full rounded-xl border border-white/5 bg-neutral-950/50 px-5 py-3 text-white transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:outline-none"
			></textarea>
			{#if error}
				<p class="text-sm text-red-500">{error}</p>
			{/if}
			<div class="flex justify-end">
				<button
					type="submit"
					class="group flex items-center gap-2 rounded-xl bg-indigo-500 px-8 py-3 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600 active:scale-95"
				>
					Publish Post
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="transition-transform group-hover:translate-x-1"
						><line x1="22" y1="2" x2="11" y2="13" /><polyline
							points="22 2 15 22 11 13 2 9 22 2"
						/></svg
					>
				</button>
			</div>
		</form>
	{/if}

	{#if $isAuthenticated}
		{#if loading}
			<div class="flex flex-col items-center justify-center gap-4 py-24">
				<div
					class="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
				></div>
				<p class="animate-pulse text-sm text-neutral-500">Loading community feed...</p>
			</div>
		{:else if filteredPosts.length === 0}
			<div
				class="rounded-3xl border border-dashed border-white/5 bg-neutral-900/30 py-32 text-center"
			>
				<p class="text-neutral-500">
					No posts in <span class="font-bold text-indigo-400">{activeCategory}</span> yet.
				</p>
			</div>
		{:else}
			<div class="space-y-8">
				{#each filteredPosts as post, i (post.id)}
					<div
						in:fly={{ y: 20, duration: 400, delay: i * 50 }}
						class="group rounded-3xl border border-white/5 bg-neutral-900/50 p-8 transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-indigo-500/5"
					>
						<div class="mb-6 flex items-start justify-between">
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-neutral-800 font-bold text-white"
								>
									{#if post.author?.profilePic}
										<img
											src={post.author.profilePic}
											alt={post.author.name}
											class="h-full w-full object-cover"
										/>
									{:else}
										{post.author?.name?.charAt(0) || 'U'}
									{/if}
								</div>
								<div>
									<div class="flex items-center gap-2">
										<span class="font-bold text-white">{post.author?.name || 'Anonymous'}</span>
										{#if post.author?.isExpert}
											<span
												class="flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-black text-blue-400 uppercase"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="10"
													height="10"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													stroke-width="3"
													stroke-linecap="round"
													stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg
												>
												Verified Expert
											</span>
										{/if}
									</div>
									<p class="text-[11px] text-neutral-500">
										{new Date(post.createdAt).toLocaleDateString()} •
										<span class="font-medium text-indigo-400"
											>{post.author?.industry || 'General'}</span
										>
									</p>
								</div>
							</div>
							{#if $user?.id === post.authorId || $user?.id === post.author?.id || $user?.role === 'ADMIN' || $user?.role === 'SUPERADMIN'}
								<button
									onclick={() => handleDelete(post.id)}
									class="rounded-xl p-2 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-500"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="18"
										height="18"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path
											d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"
										/></svg
									>
								</button>
							{/if}
						</div>

						<div class="mb-6">
							<span
								class="mb-3 inline-block rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-neutral-400 uppercase"
								>{post.category}</span
							>
							<h3
								class="mb-3 text-2xl font-bold text-white transition-colors group-hover:text-indigo-400"
							>
								{post.title}
							</h3>
							<p class="leading-relaxed whitespace-pre-line text-neutral-400">{post.content}</p>
						</div>

						<!-- Interaction Area -->
						<div class="mt-8 border-t border-white/5 pt-6">
							<div class="mb-6 flex items-center gap-6">
								<div class="flex items-center gap-2 text-xs text-neutral-400">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path
											d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
										/></svg
									>
									{post.comments?.length || 0} Comments
								</div>
							</div>

							{#if post.comments && post.comments.length > 0}
								<div class="mb-6 space-y-1">
									{#each post.comments as comment (comment.id)}
										{@render commentSnippet(comment)}
									{/each}
								</div>
							{/if}

							<!-- Add Comment Input -->
							<div class="flex gap-3">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-800 text-[10px] font-bold text-white"
								>
									{#if $user?.profilePic}
										<img
											src={$user.profilePic}
											alt={$user.name}
											class="h-full w-full object-cover"
										/>
									{:else}
										{$user?.name?.charAt(0) || 'U'}
									{/if}
								</div>
								<div class="flex flex-grow gap-2">
									<input
										type="text"
										bind:value={commentText[post.id]}
										placeholder="Write a comment..."
										class="flex-grow rounded-xl border border-white/5 bg-neutral-950 px-4 py-2 text-sm text-white transition-all focus:border-indigo-500 focus:outline-none"
										onkeydown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
									/>
									<button
										onclick={() => handleAddComment(post.id)}
										class="rounded-xl bg-indigo-500 p-2 text-white transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
										disabled={!commentText[post.id]}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											><line x1="22" y1="2" x2="11" y2="13" /><polyline
												points="22 2 15 22 11 13 2 9 22 2"
											/></svg
										>
									</button>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<div
			class="rounded-3xl border border-white/5 bg-neutral-900/30 py-32 text-center backdrop-blur-sm"
		>
			<p class="mb-8 text-neutral-400">Please sign in to join the professional community.</p>
			<button
				onclick={() => (window.location.href = '/login')}
				class="rounded-full bg-white px-12 py-3 font-black text-black shadow-xl shadow-white/10 transition-all hover:bg-neutral-200"
			>
				Sign In
			</button>
		</div>
	{/if}
</div>
