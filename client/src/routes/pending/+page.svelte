<script lang="ts">
	import { user, logout, initAuth } from '$lib/authService';
	import { fly } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';

	let userType = $state($user?.userType || 'STUDENT');
	let industry = $state($user?.industry || '');
	let batch = $state($user?.batch || '');
	let updating = $state(false);
	let error = $state('');

	let isProfileComplete = $derived(!!($user?.industry && $user?.batch));
	let isEditing = $state(false);
	let showForm = $derived(!isProfileComplete || isEditing);

	async function handleUpdateProfile() {
		updating = true;
		error = '';
		try {
			await api.patch('/users/me', { userType, industry, batch });
			await initAuth(); // Refresh user state
			isEditing = false;
		} catch (e: any) {
			error = e.message;
		} finally {
			updating = false;
		}
	}

	onMount(() => {
		if ($user && $user.status === 'APPROVED') {
			goto('/feed');
		}
	});

	$effect(() => {
		if ($user && $user.status === 'APPROVED') {
			goto('/feed');
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center p-6 font-sans">
	<div in:fly={{ y: 20, duration: 800 }} class="w-full max-w-lg">
		<header class="mb-12">
			<h1 class="text-4xl font-light tracking-tight text-white sm:text-5xl">Pending Approval</h1>
			<p class="mt-6 text-lg leading-relaxed font-light text-neutral-400">
				Welcome, <span class="font-medium text-white">{$user?.name || 'Member'}</span>.
				{#if showForm}
					To finalize your registration, please confirm your role below.
				{:else}
					Your profile has been submitted and is currently under review by an administrator.
				{/if}
			</p>
		</header>

		<div class="space-y-12">
			{#if showForm}
				<div in:fly={{ y: 10, duration: 300 }} class="space-y-12">
					<!-- Role Selection -->
					<div>
						<h2 class="mb-6 text-xs font-bold tracking-widest text-neutral-500 uppercase">
							Select Role
						</h2>
						<div class="flex gap-4">
							<button
								onclick={() => (userType = 'STUDENT')}
								class="flex-1 border-b pb-4 text-left transition-colors {userType === 'STUDENT'
									? 'border-white text-white'
									: 'border-white/20 text-neutral-500 hover:border-white/50 hover:text-neutral-300'}"
							>
								<span class="text-lg font-medium">Student</span>
							</button>
							<button
								onclick={() => (userType = 'ALUMNI')}
								class="flex-1 border-b pb-4 text-left transition-colors {userType === 'ALUMNI'
									? 'border-white text-white'
									: 'border-white/20 text-neutral-500 hover:border-white/50 hover:text-neutral-300'}"
							>
								<span class="text-lg font-medium">Alumni</span>
							</button>
						</div>
					</div>

					<!-- Inputs -->
					<div class="space-y-6">
						<div>
							<label
								for="industry"
								class="mb-2 block text-xs font-bold tracking-widest text-neutral-500 uppercase"
								>Industry / Course</label
							>
							<input
								bind:value={industry}
								placeholder="e.g. Computer Science"
								class="w-full border-b border-white/20 bg-transparent py-4 text-white placeholder-neutral-600 transition-colors focus:border-white focus:outline-none"
							/>
						</div>
						<div>
							<label
								for="batch"
								class="mb-2 block text-xs font-bold tracking-widest text-neutral-500 uppercase"
								>Batch / Year</label
							>
							<input
								bind:value={batch}
								placeholder="e.g. 2024"
								class="w-full border-b border-white/20 bg-transparent py-4 text-white placeholder-neutral-600 transition-colors focus:border-white focus:outline-none"
							/>
						</div>
					</div>

					{#if error}
						<p class="text-sm text-red-400">{error}</p>
					{/if}

					<div class="flex items-center justify-between pt-4">
						{#if isEditing && isProfileComplete}
							<button
								onclick={() => (isEditing = false)}
								class="text-sm font-medium text-neutral-500 transition-colors hover:text-white"
							>
								Cancel
							</button>
						{:else}
							<span></span>
						{/if}
						<button
							onclick={handleUpdateProfile}
							disabled={updating || !industry || !batch}
							class="text-sm font-medium text-white underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
						>
							{updating ? 'Saving Changes...' : 'Complete Profile Setup'}
						</button>
					</div>
				</div>
			{:else}
				<div
					in:fly={{ y: 20, duration: 400 }}
					class="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-neutral-900/20 py-16 text-center"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="mb-6 text-indigo-400"
						><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg
					>
					<h2 class="mb-2 text-xl font-medium text-white">Application in Review</h2>
					<p class="mb-8 max-w-sm text-sm leading-relaxed font-light text-neutral-500">
						You'll receive an email notification once your account is verified by an administrator.
					</p>
					<button
						onclick={() => (isEditing = true)}
						class="text-xs font-bold tracking-widest text-neutral-500 uppercase transition-colors hover:text-white"
					>
						Edit Profile Details
					</button>
				</div>
			{/if}
		</div>

		<footer
			class="mt-20 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="text-xs font-light text-neutral-500">
				Verification takes 24-48 hours after profile completion.
			</p>
			<button
				onclick={logout}
				class="text-sm font-medium text-neutral-500 transition-colors hover:text-white"
			>
				Sign Out
			</button>
		</footer>
	</div>
</div>
