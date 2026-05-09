<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { user } from '$lib/authService';
	import { type User, type UserType, displayUserType, userTypeBadgeClass } from '$lib/types';
	import Skeleton from '$lib/components/Skeleton.svelte';
	import IndustrySelect from '$lib/components/IndustrySelect.svelte';

	let profileUser = $state<User | null>(null);
	let loading = $state(true);
	let isEditing = $state(false);
	let editData = $state({ bio: '', industry: '', batch: '', userType: 'STUDENT' as UserType });
	let isMyProfile = $derived(page.params.id === 'me' || profileUser?.id === $user?.id);
	let canEditIdentity = $derived($user?.role === 'SUPERADMIN');
	// Superadmins are platform operators, not network members. Their profile only
	// surfaces their bio — userType, industry, and batch are intentionally hidden
	// because those fields don't apply to staff identity.
	let isSuperadminProfile = $derived(profileUser?.role === 'SUPERADMIN');
	let avatarFileInput = $state<HTMLInputElement | null>(null);
	let avatarUploading = $state(false);
	let avatarError = $state('');

	const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg'];
	const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg'];

	async function loadProfile() {
		try {
			const id = page.params.id === 'me' ? 'me' : page.params.id;
			profileUser = await api.get(`/users/${id}`);
			editData = {
				bio: profileUser.bio || '',
				industry: profileUser.industry || '',
				batch: profileUser.batch || '',
				userType: profileUser.userType || 'STUDENT'
			};
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function handleUpdate() {
		try {
			const payload: Record<string, unknown> = { bio: editData.bio };
			if (canEditIdentity) {
				payload.userType = editData.userType;
				payload.industry = editData.industry;
				payload.batch = editData.batch;
			}
			const updated = await api.patch('/users/me', payload);
			profileUser = { ...profileUser, ...updated };
			isEditing = false;
		} catch (e) {
			console.error(e);
		}
	}

	function pickAvatar() {
		avatarError = '';
		avatarFileInput?.click();
	}

	async function handleAvatarChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		// Always reset the input so picking the same file again still triggers change.
		input.value = '';
		if (!file) return;

		const ext = (file.name.split('.').pop() || '').toLowerCase();
		// Strict allowlist: reject anything that isn't PNG/JPG by BOTH extension and MIME.
		// We check both because a renamed .exe still reports its real MIME, and a
		// hand-crafted MIME header can lie about a benign-looking extension.
		if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext) || !ALLOWED_IMAGE_TYPES.includes(file.type)) {
			avatarError = 'Only PNG or JPG images are allowed.';
			return;
		}

		avatarUploading = true;
		avatarError = '';
		try {
			const dataBase64 = await fileToBase64(file);
			const { publicUrl } = await api.post('/users/profile-pic-upload', {
				fileName: file.name,
				contentType: file.type,
				dataBase64
			});

			const absoluteUrl = toAbsoluteUploadUrl(publicUrl);
			const updated = await api.patch('/users/me', { profilePic: absoluteUrl });
			profileUser = { ...profileUser, ...updated };
			if (isMyProfile) {
				user.update((u) => (u ? { ...u, profilePic: absoluteUrl } : u));
			}
		} catch (e) {
			avatarError = (e as Error).message || 'Failed to upload photo.';
		} finally {
			avatarUploading = false;
		}
	}

	function fileToBase64(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				const result = reader.result as string;
				// Strip "data:image/png;base64," — server expects raw base64.
				const idx = result.indexOf(',');
				resolve(idx >= 0 ? result.slice(idx + 1) : result);
			};
			reader.onerror = () => reject(reader.error || new Error('Read failed'));
			reader.readAsDataURL(file);
		});
	}

	// Local-storage fallback returns a relative `/uploads/...` URL because the
	// server doesn't know its own public origin. Resolve it against the API
	// base so the resulting URL is portable across pages.
	function toAbsoluteUploadUrl(url: string): string {
		if (!url || /^https?:\/\//i.test(url)) return url;
		const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api';
		const origin = apiBase.replace(/\/api\/?$/, '');
		return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
	}

	onMount(loadProfile);
</script>

<div class="mx-auto max-w-4xl px-4 py-20">
	{#if loading}
		<div class="rounded-[3rem] border border-neutral-800 bg-neutral-900/50 p-10">
			<div class="flex flex-col items-start gap-10 md:flex-row">
				<Skeleton class="h-32 w-32 rounded-full" />
				<div class="flex-grow space-y-4">
					<Skeleton class="h-10 w-64" />
					<div class="grid grid-cols-2 gap-4">
						<Skeleton class="h-20 w-full" />
						<Skeleton class="h-20 w-full" />
					</div>
					<Skeleton class="h-32 w-full" />
				</div>
			</div>
		</div>
	{:else if profileUser}
		<div
			class="group relative rounded-[3rem] border border-white/5 bg-neutral-900/30 p-10 backdrop-blur-xl transition-all hover:border-white/10"
		>
			<!-- Background Glow -->
			<div
				class="pointer-events-none absolute -inset-px -z-10 rounded-[3rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
				style="background: radial-gradient(600px circle at 50% 50%, rgba(99, 102, 241, 0.05), transparent 80%);"
			></div>

			<div class="flex flex-col items-start gap-10 md:flex-row">
				<!-- Avatar Section -->
				<div class="relative flex-shrink-0">
					<div
						class="h-32 w-32 overflow-hidden rounded-[2rem] border-4 border-neutral-800 bg-neutral-800 shadow-2xl"
					>
						{#if profileUser.profilePic}
							<img src={profileUser.profilePic} alt="Profile" class="h-full w-full object-cover" />
						{:else}
							<div class="flex h-full w-full items-center justify-center text-4xl">👤</div>
						{/if}
					</div>
					{#if isMyProfile}
						<input
							bind:this={avatarFileInput}
							type="file"
							accept="image/png,image/jpeg"
							onchange={handleAvatarChange}
							class="hidden"
						/>
						<button
							type="button"
							onclick={pickAvatar}
							disabled={avatarUploading}
							class="absolute -top-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-neutral-900 text-white shadow-lg transition-all hover:bg-neutral-800 active:scale-95 disabled:opacity-60"
							title="Change profile photo (PNG or JPG)"
							aria-label="Change profile photo"
						>
							{#if avatarUploading}
								<svg
									class="h-4 w-4 animate-spin"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="3"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4zm2 5.3A8 8 0 014 12H0c0 3 1.1 5.8 3 7.9l3-2.6z"
									></path>
								</svg>
							{:else}
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
								>
									<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
									/><circle cx="12" cy="13" r="4" />
								</svg>
							{/if}
						</button>
					{/if}
					<!-- Verification Badge -->
					{#if profileUser.status === 'APPROVED'}
						<div
							class="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg
							>
						</div>
					{/if}
				</div>

				<div class="flex-grow space-y-6">
					<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div class="space-y-3">
							<h1 class="text-4xl font-black tracking-tighter text-white">
								{profileUser.name || 'Anonymous User'}
							</h1>
							<div class="flex flex-wrap items-center gap-2">
								<span
									class="rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.2em] uppercase {userTypeBadgeClass(
										profileUser
									)}"
								>
									{displayUserType(profileUser) || 'STUDENT'}
								</span>
								<span
									class="rounded-full border px-3 py-1 text-[10px] font-black tracking-[0.2em] uppercase
									{profileUser.role === 'SUPERADMIN'
										? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
										: profileUser.role === 'ADMIN'
											? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
											: 'border-white/5 bg-white/5 text-neutral-500'}"
								>
									{profileUser.role}
								</span>
							</div>
							<p class="text-sm font-medium text-neutral-500">{profileUser.email}</p>
							{#if avatarError && isMyProfile}
								<p class="text-[11px] font-bold tracking-widest text-red-400 uppercase">
									{avatarError}
								</p>
							{/if}
						</div>

						{#if isMyProfile && !isEditing}
							<button
								onclick={() => (isEditing = true)}
								class="rounded-2xl bg-white px-8 py-3 text-sm font-black text-black shadow-xl shadow-white/5 transition-all hover:scale-105 active:scale-95"
							>
								Edit Profile
							</button>
						{/if}
					</div>

					{#if isEditing}
						<div in:fly={{ y: 20, duration: 400 }} class="space-y-6 pt-4">
							{#if isSuperadminProfile}
								<!-- Superadmins only manage their bio; identity fields are not part of their profile. -->
							{:else if canEditIdentity}
								<!-- User Type Toggle (Superadmin editing another member) -->
								<div class="space-y-2">
									<label class="text-[10px] font-black tracking-widest text-neutral-500 uppercase"
										>Network Member Type</label
									>
									<div class="flex w-fit rounded-2xl border border-white/5 bg-neutral-950 p-1">
										<button
											onclick={() => (editData.userType = 'STUDENT')}
											class="rounded-xl px-6 py-2 text-xs font-bold transition-all {editData.userType ===
											'STUDENT'
												? 'bg-indigo-500 text-white shadow-lg'
												: 'text-neutral-500 hover:text-white'}">Student</button
										>
										<button
											onclick={() => (editData.userType = 'ALUMNI')}
											class="rounded-xl px-6 py-2 text-xs font-bold transition-all {editData.userType ===
											'ALUMNI'
												? 'bg-indigo-500 text-white shadow-lg'
												: 'text-neutral-500 hover:text-white'}">Alumnus</button
										>
									</div>
								</div>

								<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div class="space-y-2">
										<label
											for="industry"
											class="text-[10px] font-black tracking-widest text-neutral-500 uppercase"
											>Primary Industry</label
										>
										<IndustrySelect
											id="industry"
											bind:value={editData.industry}
											placeholder="Search GICS sectors (e.g. Information Technology)"
										/>
									</div>
									<div class="space-y-2">
										<label
											for="batch"
											class="text-[10px] font-black tracking-widest text-neutral-500 uppercase"
											>Graduation Batch</label
										>
										<input
											id="batch"
											bind:value={editData.batch}
											placeholder="e.g. 2020"
											class="w-full rounded-2xl border border-white/10 bg-neutral-950 px-6 py-3 text-white shadow-inner shadow-black/40 transition-all outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20"
										/>
									</div>
								</div>
							{:else}
								<!-- Read-only identity fields for non-superadmins -->
								<div class="space-y-2">
									<p class="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
										Network Member Type
									</p>
									<p class="text-lg font-bold text-neutral-200">
										{displayUserType(profileUser) || 'STUDENT'}
									</p>
								</div>

								<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div class="space-y-2">
										<p class="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
											Primary Industry
										</p>
										<p class="text-lg font-bold text-neutral-200">
											{profileUser.industry || 'Not specified'}
										</p>
									</div>
									<div class="space-y-2">
										<p class="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
											Graduation Batch
										</p>
										<p class="text-lg font-bold text-neutral-200">
											{profileUser.batch || 'Not specified'}
										</p>
									</div>
								</div>
							{/if}

							<div class="space-y-2">
								<label
									for="bio"
									class="text-[10px] font-black tracking-widest text-neutral-500 uppercase"
									>Your Bio</label
								>
								<textarea
									id="bio"
									bind:value={editData.bio}
									placeholder="Share your story, expertise, or what you're looking for..."
									rows="4"
									class="w-full rounded-2xl border border-white/10 bg-neutral-950 px-6 py-4 text-white shadow-inner shadow-black/40 transition-all outline-none focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20"
								></textarea>
							</div>

							<div class="flex gap-4 pt-4">
								<button
									onclick={handleUpdate}
									class="rounded-2xl bg-indigo-500 px-10 py-3 text-sm font-black text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-600 active:scale-95"
									>Save Changes</button
								>
								<button
									onclick={() => (isEditing = false)}
									class="rounded-2xl px-6 py-3 text-sm font-bold text-neutral-500 transition-all hover:text-white"
									>Discard</button
								>
							</div>
						</div>
					{:else}
						<div in:fade={{ duration: 200 }} class="space-y-8">
							{#if !isSuperadminProfile}
								<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
									<div class="rounded-2xl border border-white/5 bg-white/5 p-6">
										<h3
											class="mb-2 text-[10px] font-black tracking-widest text-neutral-600 uppercase"
										>
											Expertise
										</h3>
										<p class="text-xl font-bold text-neutral-200">
											{profileUser.industry || 'Not specified'}
										</p>
									</div>
									<div class="rounded-2xl border border-white/5 bg-white/5 p-6">
										<h3
											class="mb-2 text-[10px] font-black tracking-widest text-neutral-600 uppercase"
										>
											Timeline
										</h3>
										<p class="text-xl font-bold text-neutral-200">
											{profileUser.batch ? `Batch ${profileUser.batch}` : 'Not specified'}
										</p>
									</div>
								</div>
							{/if}
							<div class="space-y-3">
								<h3 class="text-[10px] font-black tracking-widest text-neutral-600 uppercase">
									About
								</h3>
								<p class="text-lg leading-relaxed text-neutral-400">
									{profileUser.bio || "This network member hasn't shared their story yet."}
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="flex flex-col items-center justify-center py-40 text-center">
			<div
				class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line
						x1="17"
						y1="8"
						x2="22"
						y2="13"
					/><line x1="22" y1="8" x2="17" y2="13" /></svg
				>
			</div>
			<h1 class="text-3xl font-black tracking-tighter text-white">Member Not Found</h1>
			<p class="mt-2 mb-10 text-neutral-500">
				This profile might be private or doesn't exist in our network.
			</p>
			<button
				onclick={() => goto('/feed')}
				class="rounded-full bg-white px-10 py-3 text-sm font-black text-black transition-all hover:scale-105"
				>Return to Feed</button
			>
		</div>
	{/if}
</div>
