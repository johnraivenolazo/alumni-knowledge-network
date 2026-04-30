<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { user } from '$lib/authService';
	import { type User } from '$lib/types';

	let profileUser = $state<User | null>(null);
	let loading = $state(true);
	let isEditing = $state(false);
	let editData = $state({ bio: '', industry: '', batch: '' });
	let isMyProfile = $derived(page.params.id === 'me' || profileUser?.id === $user?.id);

	async function loadProfile() {
		try {
			const id = page.params.id === 'me' ? 'me' : page.params.id;
			profileUser = await api.get(`/users/${id}`);
			editData = {
				bio: profileUser.bio || '',
				industry: profileUser.industry || '',
				batch: profileUser.batch || ''
			};
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function handleUpdate() {
		try {
			const updated = await api.patch('/users/me', editData);
			profileUser = { ...profileUser, ...updated };
			isEditing = false;
		} catch (e) {
			console.error(e);
		}
	}

	onMount(loadProfile);
</script>

<div class="mx-auto max-w-4xl px-4 py-20">
	{#if loading}
		<div class="flex justify-center py-20">
			<div
				class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
			></div>
		</div>
	{:else if profileUser}
		<div class="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-10">
			<div class="flex flex-col items-start gap-10 md:flex-row">
				<div class="h-32 w-32 flex-shrink-0 overflow-hidden rounded-full bg-neutral-800">
					{#if profileUser.profilePic}
						<img src={profileUser.profilePic} alt="Profile" class="h-full w-full object-cover" />
					{:else}
						<div class="flex h-full w-full items-center justify-center text-4xl">👤</div>
					{/if}
				</div>

				<div class="flex-grow space-y-4">
					<div class="flex items-start justify-between">
						<div>
							<h1 class="text-4xl font-bold">{profileUser.name}</h1>
							<p class="text-neutral-500">{profileUser.email}</p>
						</div>
						{#if isMyProfile && !isEditing}
							<button
								onclick={() => (isEditing = true)}
								class="rounded-full bg-neutral-800 px-6 py-2 text-white transition-all hover:bg-neutral-700"
							>
								Edit Profile
							</button>
						{/if}
					</div>

					{#if isEditing}
						<div in:fade={{ duration: 200 }} class="space-y-4 pt-4">
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label class="mb-1 block text-xs font-semibold text-neutral-500 uppercase"
										>Industry</label
									>
									<input
										bind:value={editData.industry}
										placeholder="e.g. Software Engineering"
										class="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-white focus:border-indigo-500"
									/>
								</div>
								<div>
									<label class="mb-1 block text-xs font-semibold text-neutral-500 uppercase"
										>Batch</label
									>
									<input
										bind:value={editData.batch}
										placeholder="e.g. 2020"
										class="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-white focus:border-indigo-500"
									/>
								</div>
							</div>
							<div>
								<label class="mb-1 block text-xs font-semibold text-neutral-500 uppercase"
									>Bio</label
								>
								<textarea
									bind:value={editData.bio}
									placeholder="Tell us about yourself..."
									rows="4"
									class="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-white focus:border-indigo-500"
								></textarea>
							</div>
							<div class="flex gap-4 pt-2">
								<button
									onclick={handleUpdate}
									class="rounded-lg bg-indigo-600 px-8 py-2 font-semibold text-white transition-all hover:bg-indigo-700"
								>
									Save Changes
								</button>
								<button
									onclick={() => (isEditing = false)}
									class="px-4 py-2 text-neutral-400 transition-colors hover:text-white"
								>
									Cancel
								</button>
							</div>
						</div>
					{:else}
						<div in:fade={{ duration: 200 }}>
							<div class="grid grid-cols-2 gap-8 py-4">
								<div>
									<h3 class="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
										Industry
									</h3>
									<p class="text-lg text-neutral-200">{profileUser.industry || 'Not specified'}</p>
								</div>
								<div>
									<h3 class="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
										Batch
									</h3>
									<p class="text-lg text-neutral-200">{profileUser.batch || 'Not specified'}</p>
								</div>
							</div>
							<div>
								<h3 class="mb-1 text-xs font-semibold tracking-wider text-neutral-500 uppercase">
									Bio
								</h3>
								<p class="leading-relaxed text-neutral-400">
									{profileUser.bio || "This user hasn't shared a bio yet."}
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="py-20 text-center">
			<h1 class="mb-4 text-2xl font-bold">User not found</h1>
			<button
				onclick={() => (window.location.href = '/feed')}
				class="cursor-pointer border-none bg-transparent text-indigo-500 hover:underline"
			>
				Back to feed
			</button>
		</div>
	{/if}
</div>
