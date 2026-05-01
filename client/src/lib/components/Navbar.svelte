<script lang="ts">
	import { user, isAuthenticated, loading, login, logout } from '$lib/authService';
	import { base } from '$app/paths';
	import { fade, fly } from 'svelte/transition';

	let isMenuOpen = $state(false);

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}

	function closeMenu() {
		isMenuOpen = false;
	}
</script>

<svelte:window
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (!target.closest('.user-menu-container')) closeMenu();
	}}
/>

<nav class="sticky top-0 z-50 border-b border-neutral-800/50 bg-black/60 backdrop-blur-xl">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<div class="flex items-center gap-8">
				<a
					href="{base}/"
					class="group flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95"
				>
					<div class="relative">
						<div
							class="absolute -inset-1 rounded-full bg-indigo-500/20 opacity-0 blur transition-opacity group-hover:opacity-100"
						></div>
						<img
							src="/logo.png?v=4"
							alt="AKN Logo"
							class="relative h-9 w-auto opacity-90 invert transition-all group-hover:opacity-100"
						/>
					</div>
					<span
						class="bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-xl font-black tracking-[0.2em] text-transparent uppercase"
					>
						AKN
					</span>
				</a>
				<div class="hidden md:flex md:items-center md:space-x-1">
					<a
						href="{base}/feed"
						class="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-white/5 hover:text-white"
						>Knowledge Feed</a
					>
					<a
						href="{base}/mentorship"
						class="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 transition-all hover:bg-white/5 hover:text-white"
						>Mentorship</a
					>
				</div>
			</div>

			<div class="flex items-center gap-4">
				{#if $loading}
					<div class="h-8 w-24 animate-pulse rounded-full bg-neutral-800/50"></div>
				{:else if $isAuthenticated}
					<div class="user-menu-container relative">
						<button
							onclick={toggleMenu}
							class="group flex items-center gap-3 rounded-full border border-neutral-800 bg-neutral-900/50 py-1.5 pr-3 pl-1.5 transition-all hover:border-neutral-700 hover:bg-neutral-800/50"
						>
							<div
								class="h-7 w-7 overflow-hidden rounded-full border border-neutral-700 bg-neutral-800"
							>
								{#if $user?.profilePic}
									<img src={$user.profilePic} alt="Profile" class="h-full w-full object-cover" />
								{:else}
									<div
										class="flex h-full w-full items-center justify-center text-[10px] font-bold text-neutral-500"
									>
										{($user?.name || '?').charAt(0).toUpperCase()}
									</div>
								{/if}
							</div>
							<span
								class="max-w-[120px] truncate text-xs font-semibold text-neutral-300 group-hover:text-white"
							>
								{$user?.name || 'My Account'}
							</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="text-neutral-500 transition-transform {isMenuOpen ? 'rotate-180' : ''}"
								><path d="m6 9 6 6 6-6" /></svg
							>
						</button>

						{#if isMenuOpen}
							<div
								in:fly={{ y: 10, duration: 200 }}
								out:fade={{ duration: 150 }}
								class="ring-opacity-5 absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-neutral-800 bg-neutral-900 p-2 shadow-2xl ring-1 ring-black focus:outline-none"
							>
								<div class="mb-2 border-b border-neutral-800 px-4 py-3">
									<div class="mb-1 flex items-center justify-between">
										<p class="text-xs font-medium text-neutral-500">Logged in as</p>
										<span
											class="rounded-full px-2 py-0.5 text-[9px] font-bold tracking-tighter uppercase
											{$user?.role === 'SUPERADMIN'
												? 'border border-purple-500/20 bg-purple-500/10 text-purple-400'
												: $user?.role === 'ADMIN'
													? 'border border-indigo-500/20 bg-indigo-500/10 text-indigo-400'
													: 'border border-neutral-700 bg-neutral-800 text-neutral-400'}"
										>
											{$user?.role === 'SUPERADMIN' ? 'SUPERADMIN' : $user?.role || 'User'}
										</span>
									</div>
									<p class="truncate text-sm font-bold text-white">{$user?.email}</p>
								</div>

								<div class="space-y-1">
									<a
										href="{base}/profile/me"
										onclick={closeMenu}
										class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-400 transition-all hover:bg-neutral-800 hover:text-white"
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
											><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle
												cx="12"
												cy="7"
												r="4"
											/></svg
										>
										My Profile
									</a>

									{#if $user?.role === 'ADMIN' || $user?.role === 'SUPERADMIN'}
										<a
											href="{base}/admin"
											onclick={closeMenu}
											class="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-indigo-400 transition-all hover:bg-indigo-500/10 hover:text-indigo-300"
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
												><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path
													d="m14 8 2 2-2 2"
												/></svg
											>
											Admin Dashboard
										</a>
									{/if}

									<button
										onclick={() => {
											logout();
											closeMenu();
										}}
										class="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-red-400/70 transition-all hover:bg-red-500/10 hover:text-red-400"
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
											><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline
												points="16 17 21 12 16 7"
											/><line x1="21" x2="9" y1="12" y2="12" /></svg
										>
										Sign out
									</button>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<button
						onclick={login}
						class="rounded-full bg-white px-6 py-2 text-sm font-bold text-black shadow-lg shadow-white/10 transition-all hover:bg-neutral-200 active:scale-95"
					>
						Sign in
					</button>
				{/if}
			</div>
		</div>
	</div>
</nav>
