<script lang="ts">
	// Auth state and actions are provided by the auth service store.
	// `user` holds the current user object, `isAuthenticated` and `loading` are reactive booleans,
	// and `login`/`logout` trigger the respective auth flows.
	import { user, isAuthenticated, loading, login, logout } from '$lib/authService';
	import { base } from '$app/paths';
	import { fade, fly } from 'svelte/transition';

	// Tracks whether the user dropdown menu is currently open.
	let isMenuOpen = $state(false);

	// Toggles the user dropdown menu between open and closed states.
	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
	// Explicitly closes the user dropdown menu. Called when the user clicks a menu item
	// or clicks outside the menu container.
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
										<p class="text-[10px] font-bold tracking-widest text-neutral-600 uppercase">
											Authenticated
										</p>
										<span
											class="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-neutral-400 uppercase"
										>
											{$user?.role || 'User'}
										</span>
									</div>
									<p class="truncate text-sm font-medium text-white">{$user?.email}</p>
								</div>

								<div class="space-y-1">
									<a
										href="{base}/profile/me"
										onclick={closeMenu}
										class="flex items-center rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest text-neutral-500 uppercase transition-all hover:bg-neutral-800 hover:text-white"
									>
										My Profile
									</a>

									{#if $user?.role === 'ADMIN' || $user?.role === 'SUPERADMIN'}
										<a
											href="{base}/admin"
											onclick={closeMenu}
											class="flex items-center rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest text-neutral-500 uppercase transition-all hover:bg-white/5 hover:text-white"
										>
											Admin Dashboard
										</a>
									{/if}

									<button
										onclick={() => {
											logout();
											closeMenu();
										}}
										class="flex w-full items-center rounded-xl px-4 py-2.5 text-xs font-bold tracking-widest text-neutral-600 uppercase transition-all hover:bg-red-500/10 hover:text-red-400"
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
