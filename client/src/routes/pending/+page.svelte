<script lang="ts">
	import { user, logout, initAuth } from '$lib/authService';
	import { fly, fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { api } from '$lib/api';

	let userType = $state($user?.userType || 'STUDENT');
	let industry = $state($user?.industry || '');
	let batch = $state($user?.batch || '');
	let updating = $state(false);
	let success = $state(false);
	let error = $state('');

	async function handleUpdateProfile() {
		updating = true;
		error = '';
		try {
			await api.patch('/users/me', { userType, industry, batch });
			await initAuth(); // Refresh user state
			success = true;
			setTimeout(() => (success = false), 3000);
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

<div class="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
	<div
		in:fly={{ y: 20, duration: 800 }}
		class="relative w-full max-w-2xl overflow-hidden rounded-[3rem] border border-white/5 bg-neutral-900/40 p-12 text-center backdrop-blur-3xl"
	>
		<!-- Background Glow -->
		<div
			class="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-500/10 blur-[120px]"
		></div>
		<div
			class="absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-amber-500/10 blur-[120px]"
		></div>

		<div class="relative z-10 flex flex-col items-center gap-10">
			<!-- Animated Icon -->
			<div class="relative">
				<div
					class="absolute inset-0 animate-ping rounded-full bg-amber-500/10 duration-[3000ms]"
				></div>
				<div
					class="relative flex h-20 w-20 rotate-12 items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="32"
						height="32"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="-rotate-12 text-amber-500"
					>
						<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
							x1="12"
							y1="16"
							x2="12.01"
							y2="16"
						/>
					</svg>
				</div>
			</div>

			<div class="space-y-4">
				<h1 class="text-5xl font-black tracking-tighter text-white">Pending Approval</h1>
				<p class="mx-auto max-w-md text-lg leading-relaxed text-neutral-500">
					Welcome, <span class="font-bold text-white">{$user?.name || 'Network Member'}</span>. To
					finalize your registration, please confirm your role below.
				</p>
			</div>

			<!-- Profile Completion Form -->
			<div
				class="w-full space-y-6 rounded-[2rem] border border-white/5 bg-white/5 p-8 text-left backdrop-blur-md"
			>
				<div class="grid grid-cols-2 gap-4">
					<button
						onclick={() => (userType = 'STUDENT')}
						class="flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all {userType ===
						'STUDENT'
							? 'border-indigo-400 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
							: 'border-white/5 bg-neutral-900/50 text-neutral-500 hover:border-white/10'}"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg
						>
						<span class="text-sm font-bold">Student</span>
					</button>
					<button
						onclick={() => (userType = 'ALUMNI')}
						class="flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all {userType ===
						'ALUMNI'
							? 'border-emerald-500 bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
							: 'border-white/5 bg-neutral-900/50 text-neutral-500 hover:border-white/10'}"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle
								cx="9"
								cy="7"
								r="4"
							/><polyline points="16 11 18 13 22 9" /></svg
						>
						<span class="text-sm font-bold">Alumni</span>
					</button>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<label
							for="industry"
							class="ml-1 text-[10px] font-black tracking-widest text-neutral-500 uppercase"
							>Industry / Course</label
						>
						<input
							bind:value={industry}
							placeholder="e.g. Computer Science"
							class="w-full rounded-xl border border-white/5 bg-neutral-950 px-4 py-3 text-sm transition-all focus:border-indigo-500 focus:outline-none"
						/>
					</div>
					<div class="space-y-2">
						<label
							for="batch"
							class="ml-1 text-[10px] font-black tracking-widest text-neutral-500 uppercase"
							>Batch / Year</label
						>
						<input
							bind:value={batch}
							placeholder="e.g. 2024"
							class="w-full rounded-xl border border-white/5 bg-neutral-950 px-4 py-3 text-sm transition-all focus:border-indigo-500 focus:outline-none"
						/>
					</div>
				</div>

				<button
					onclick={handleUpdateProfile}
					disabled={updating || !industry || !batch}
					class="w-full rounded-2xl bg-white py-4 font-black text-black shadow-xl shadow-white/5 transition-all hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{updating ? 'Saving Changes...' : success ? 'Profile Updated!' : 'Complete Profile Setup'}
				</button>
				{#if error}
					<p class="mt-2 text-center text-xs text-red-500">{error}</p>
				{/if}
			</div>

			<div class="flex flex-col items-center gap-6">
				<div class="flex items-center gap-3 text-xs text-neutral-500">
					<span class="flex h-2 w-2 rounded-full bg-indigo-500"></span>
					Verification takes 24-48 hours after profile completion.
				</div>
				<button
					onclick={logout}
					class="group flex items-center gap-2 rounded-full border border-white/10 px-8 py-3 text-sm font-bold transition-all hover:bg-white/5 hover:text-white"
				>
					Sign Out
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
						class="transition-transform group-hover:translate-x-1"
					>
						<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
							points="16 17 21 12 16 7"
						/><line x1="21" y1="12" x2="9" y2="12" />
					</svg>
				</button>
			</div>
		</div>
	</div>
</div>
