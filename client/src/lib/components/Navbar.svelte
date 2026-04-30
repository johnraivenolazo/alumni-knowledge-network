<script lang="ts">
	import { user, isAuthenticated, login, logout } from '$lib/authService';
</script>

<nav class="sticky top-0 z-50 border-b border-neutral-800 bg-black/50 backdrop-blur-md">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<div class="flex items-center">
				<a href="/" class="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 group">
					<img src="/logo.png?v=4" alt="AKN Logo" class="h-9 w-auto invert opacity-90 transition-opacity group-hover:opacity-100" />
					<span class="text-xl font-black tracking-[0.2em] bg-gradient-to-r from-white via-white to-neutral-500 bg-clip-text text-transparent uppercase">
						AKN
					</span>
				</a>
				<div class="hidden sm:ml-10 sm:flex sm:space-x-8">
					<a
						href="/feed"
						class="px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
						>Feed</a
					>
					<a
						href="/mentorship"
						class="px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
						>Mentorship</a
					>
					{#if $user?.role === 'ADMIN' || $user?.role === 'SUPERADMIN'}
						<a
							href="/admin"
							class="px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:text-white"
							>Admin</a
						>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-4">
				{#if $isAuthenticated}
					<a href="/profile/me" class="group flex items-center gap-2">
						<span class="text-sm text-neutral-300 transition-colors group-hover:text-white"
							>{$user?.name || 'Profile'}</span
						>
						<div class="h-8 w-8 overflow-hidden rounded-full bg-neutral-800">
							{#if $user?.profilePic}
								<img src={$user.profilePic} alt="Profile" class="h-full w-full object-cover" />
							{:else}
								<div class="flex h-full w-full items-center justify-center text-xs">?</div>
							{/if}
						</div>
					</a>
					<button
						onclick={logout}
						class="text-sm font-medium text-neutral-400 transition-colors hover:text-white"
					>
						Sign out
					</button>
				{:else}
					<button
						onclick={login}
						class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-neutral-200"
					>
						Sign in
					</button>
				{/if}
			</div>
		</div>
	</div>
</nav>
