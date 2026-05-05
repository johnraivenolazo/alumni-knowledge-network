<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { api } from '$lib/api';
	import { isAuthenticated, user, loading as authLoading } from '$lib/authService';
	import { goto } from '$app/navigation';
	import type { User, Role, SystemStats, UserStatus } from '$lib/types';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let activeTab = $state<'overview' | 'pending' | 'users'>('overview');
	let users = $state<User[]>([]);
	let pendingUsers = $state<User[]>([]);
	let stats = $state<SystemStats | null>(null);
	let loading = $state(true);
	let error = $state('');

	async function loadData() {
		if (!$isAuthenticated) return;
		loading = true;
		error = '';
		try {
			users = await api.get('/users');
			pendingUsers = users.filter((u) => u.status === 'PENDING');

			try {
				stats = await api.get('/users/stats');
			} catch (e) {
				console.warn('Stats not available on this server:', e);
				stats = null;
			}
		} catch (e: any) {
			error = e.message || 'Failed to fetch system data';
		} finally {
			loading = false;
		}
	}

	async function handleStatusChange(userId: string, status: UserStatus) {
		try {
			await api.patch(`/users/${userId}/status`, { status });
			await loadData();
		} catch (e: unknown) {
			alert((e as Error).message);
		}
	}

	async function handleRoleChange(userId: string, role: Role) {
		try {
			await api.patch(`/users/${userId}/role`, { role });
			await loadData();
		} catch (e: unknown) {
			alert((e as Error).message);
		}
	}

	async function handleToggleBan(userId: string, isBanned: boolean) {
		if (!confirm(`Are you sure you want to ${isBanned ? 'ban' : 'unban'} this user?`)) return;
		try {
			await api.patch(`/users/${userId}/ban`, { isBanned });
			await loadData();
		} catch (e: unknown) {
			alert((e as Error).message);
		}
	}

	onMount(() => {
		if (!$authLoading && !$isAuthenticated) {
			goto('/login');
		} else if (!$authLoading && $isAuthenticated) {
			loadData();
		}
	});

	$effect(() => {
		if (!$authLoading && !$isAuthenticated) {
			goto('/login');
		} else if (
			!$authLoading &&
			$isAuthenticated &&
			$user?.role !== 'ADMIN' &&
			$user?.role !== 'SUPERADMIN'
		) {
			goto('/feed');
		}
	});
</script>

<div class="mx-auto max-w-7xl px-4 py-12">
	<div class="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
		<div in:fly={{ y: -20, duration: 600 }}>
			<div class="mb-2 flex items-center gap-4">
				<div class="rounded-xl bg-indigo-500/10 p-2 text-indigo-400">
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
						><path d="M12 20h9" /><path
							d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
						/></svg
					>
				</div>
				<h1 class="text-3xl font-bold tracking-tight text-white">Network Administration</h1>
			</div>
			<p class="text-neutral-500">
				Monitor platform growth, verify members, and manage community standards.
			</p>
		</div>

		<!-- Tab Navigation -->
		<div class="flex rounded-xl border border-white/5 bg-neutral-900/50 p-1">
			{#each ['overview', 'pending', 'users'] as tab}
				<button
					onclick={() => (activeTab = tab as any)}
					class="relative rounded-lg px-6 py-2 text-sm font-medium transition-all {activeTab === tab
						? 'bg-indigo-500 text-white shadow-lg'
						: 'text-neutral-400 hover:text-white'}"
				>
					{tab.charAt(0).toUpperCase() + tab.slice(1)}
					{#if tab === 'pending' && pendingUsers.length > 0}
						<span
							class="absolute -top-1 -right-1 flex h-4 w-4 animate-bounce items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white"
						>
							{pendingUsers.length}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	{#if error}
		<div
			in:fly={{ y: 20 }}
			class="flex flex-col items-center justify-center rounded-[2rem] border border-red-500/20 bg-red-500/5 p-12 text-center"
		>
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500">
				<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			</div>
			<h2 class="text-xl font-bold text-white">Sync Failed</h2>
			<p class="mt-2 mb-6 max-w-sm text-neutral-500">{error}</p>
			<button
				onclick={loadData}
				class="rounded-full bg-white px-8 py-3 text-sm font-bold text-black transition-all hover:bg-neutral-200 active:scale-95"
			>
				Try Again
			</button>
		</div>
	{:else if activeTab === 'overview'}
		<div in:fade={{ duration: 200 }} class="space-y-12">
			<!-- Stats Grid with Skeletons -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
				{#if loading}
					{#each Array(4) as _}
						<div class="rounded-2xl border border-white/5 bg-neutral-900/50 p-6">
							<Skeleton class="h-3 w-24 mb-4" />
							<Skeleton class="h-10 w-16 mb-4" />
							<Skeleton class="h-1 w-full" />
						</div>
					{/each}
				{:else}
					<div class="group rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:border-indigo-500/30">
						<p class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">Total Members</p>
						<p class="mt-2 text-4xl font-bold text-white">{stats?.totalUsers || 0}</p>
						<div class="mt-4 h-1 w-full rounded-full bg-neutral-800">
							<div class="h-full rounded-full bg-indigo-500" style="width: 100%"></div>
						</div>
					</div>
					<div class="group rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:border-blue-500/30">
						<p class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">Students</p>
						<p class="mt-2 text-4xl font-bold text-blue-400">{stats?.students || 0}</p>
						<p class="mt-2 text-xs text-neutral-500">{(((stats?.students || 0) / (stats?.totalUsers || 1)) * 100).toFixed(1)}% of network</p>
					</div>
					<div class="group rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:border-emerald-500/30">
						<p class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">Alumni</p>
						<p class="mt-2 text-4xl font-bold text-emerald-400">{stats?.alumni || 0}</p>
						<p class="mt-2 text-xs text-neutral-500">{(((stats?.alumni || 0) / (stats?.totalUsers || 1)) * 100).toFixed(1)}% of network</p>
					</div>
					<div class="group rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:border-amber-500/30">
						<p class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">Pending Approval</p>
						<p class="mt-2 text-4xl font-bold text-amber-500">{stats?.pending || 0}</p>
						<p class="mt-2 text-xs text-neutral-500">Requires action</p>
					</div>
				{/if}
			</div>

			<!-- Industry Report Section -->
			<div class="overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50">
				<div class="border-b border-white/5 bg-white/5 px-8 py-6">
					<h2 class="text-lg font-bold text-white">Industry Distribution Report</h2>
					<p class="text-sm text-neutral-500">Real-time breakdown of expertise across the community.</p>
				</div>
				<div class="p-8">
					{#if loading}
						<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
							<div class="space-y-6">
								{#each Array(4) as _}
									<div class="space-y-2">
										<div class="flex justify-between">
											<Skeleton class="h-4 w-32" />
											<Skeleton class="h-4 w-8" />
										</div>
										<Skeleton class="h-2 w-full" />
									</div>
								{/each}
							</div>
							<div class="flex items-center justify-center border-l border-white/5 p-8">
								<Skeleton class="h-48 w-48" variant="circle" />
							</div>
						</div>
					{:else if stats?.industryStats?.length}
						<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
							<div class="space-y-6">
								{#each stats.industryStats as item}
									<div class="space-y-2">
										<div class="flex justify-between text-sm">
											<span class="font-medium text-neutral-300">{item.industry}</span>
											<span class="font-bold text-white">{item._count._all}</span>
										</div>
										<div class="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
											<div class="h-full bg-gradient-to-r from-indigo-500 to-blue-500" style="width: {(item._count._all / (stats.totalUsers || 1)) * 100}%"></div>
										</div>
									</div>
								{/each}
							</div>
							<div class="flex flex-col items-center justify-center border-l border-white/5 p-8 text-center">
								<div class="relative flex h-48 w-48 items-center justify-center rounded-full border-8 border-indigo-500/10">
									<div class="text-center">
										<p class="text-3xl font-black text-white">{stats.totalUsers}</p>
										<p class="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">Total</p>
									</div>
									<!-- Creative SVG Chart Decoration -->
									<svg class="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] -rotate-90">
										<circle cx="50%" cy="50%" r="48%" fill="none" stroke="currentColor" stroke-width="8" class="text-indigo-500/40" stroke-dasharray="300 100" />
									</svg>
								</div>
								<p class="mt-8 max-w-xs text-xs text-neutral-500">
									Live metrics reflect current verified membership status.
								</p>
							</div>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-20 text-center">
							<p class="text-neutral-500 italic">No industry data available yet.</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{:else if activeTab === 'pending'}
		<div in:fade={{ duration: 200 }} class="space-y-6">
			{#if loading}
				{#each Array(3) as _}
					<div class="flex items-center justify-between rounded-2xl border border-white/5 bg-neutral-900/50 p-6">
						<div class="flex items-center gap-4">
							<Skeleton class="h-12 w-12" variant="circle" />
							<div>
								<Skeleton class="h-4 w-32 mb-2" />
								<Skeleton class="h-3 w-48" />
							</div>
						</div>
						<div class="flex gap-2">
							<Skeleton class="h-10 w-20" />
							<Skeleton class="h-10 w-32" />
						</div>
					</div>
				{/each}
			{:else if pendingUsers.length === 0}
				<div class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 py-20 text-center">
					<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
						<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
					</div>
					<h3 class="text-xl font-bold text-white">All caught up!</h3>
					<p class="text-neutral-500 mt-1">There are no pending approval requests at the moment.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-4">
					{#each pendingUsers as u (u.id)}
						<div class="flex items-center justify-between rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:bg-neutral-800/50">
							<div class="flex items-center gap-4">
								<div class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-800 font-bold text-white">
									{#if u.profilePic}
										<img src={u.profilePic} alt={u.name} class="h-full w-full object-cover" />
									{:else}
										{u.name?.charAt(0) || 'U'}
									{/if}
								</div>
								<div>
									<h3 class="font-bold text-white">{u.name}</h3>
									<p class="text-xs text-neutral-500">
										{u.email} •
										<span class="font-medium tracking-wider text-indigo-400 uppercase">{u.userType}</span>
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<button onclick={() => handleStatusChange(u.id, 'REJECTED')} class="rounded-xl px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10">Reject</button>
								<button onclick={() => handleStatusChange(u.id, 'APPROVED')} class="rounded-xl bg-indigo-500 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600">Approve Access</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div in:fade={{ duration: 200 }} class="overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50 shadow-2xl">
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left">
					<thead>
						<tr class="border-b border-white/5 bg-white/5">
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase">User</th>
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase">Status</th>
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase">Role</th>
							<th class="px-8 py-6 text-right text-xs font-semibold tracking-wider text-neutral-500 uppercase">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#if loading}
							{#each Array(5) as _}
								<tr class="border-b border-white/5">
									<td class="px-8 py-4"><Skeleton class="h-8 w-48" /></td>
									<td class="px-8 py-4"><Skeleton class="h-6 w-20" /></td>
									<td class="px-8 py-4"><Skeleton class="h-6 w-20" /></td>
									<td class="px-8 py-4 text-right"><Skeleton class="h-8 w-32 ml-auto" /></td>
								</tr>
							{/each}
						{:else}
							{#each users as u, i (u.id)}
								<tr class="border-b border-white/5 transition-colors hover:bg-white/5">
									<td class="px-8 py-4">
										<div class="flex items-center gap-3">
											<div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/5 bg-neutral-800 text-xs font-bold text-white">
												{#if u.profilePic}
													<img src={u.profilePic} alt={u.name} class="h-full w-full object-cover" />
												{:else}
													{u.name?.charAt(0) || 'U'}
												{/if}
											</div>
											<div>
												<p class="text-sm font-medium text-white">{u.name || 'Anonymous'}</p>
												<p class="text-[10px] text-neutral-500">{u.email}</p>
											</div>
										</div>
									</td>
									<td class="px-8 py-4">
										<span class="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase {u.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : u.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}">
											{u.status}
										</span>
									</td>
									<td class="px-8 py-4">
										<span class="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase {u.role === 'SUPERADMIN' ? 'bg-purple-500 text-white' : u.role === 'ADMIN' ? 'bg-indigo-500 text-white' : 'bg-neutral-800 text-neutral-400'}">
											{u.role}
										</span>
									</td>
									<td class="px-8 py-4 text-right">
										<div class="flex items-center justify-end gap-3">
											{#if u.id !== $user?.id && u.role !== 'SUPERADMIN'}
												{#if u.userType === 'ALUMNI'}
													<button onclick={async () => { try { await api.patch(`/users/${u.id}`, { isExpert: !u.isExpert }); await loadData(); } catch (e: any) { alert(e.message); } }} class="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black uppercase transition-all {u.isExpert ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-neutral-800 text-neutral-500 hover:bg-neutral-700'}" title={u.isExpert ? 'Remove Expert Badge' : 'Mark as Expert'}>
														<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
														{u.isExpert ? 'Expert' : 'Verify'}
													</button>
												{/if}
												<select value={u.role} onchange={(e) => handleRoleChange(u.id, (e.target as HTMLSelectElement).value as Role)} class="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1 text-[10px] text-neutral-300 transition-all hover:border-neutral-700">
													<option value="USER">User</option>
													<option value="ADMIN">Admin</option>
													<option value="SUPERADMIN">Superadmin</option>
												</select>
												<button onclick={() => handleToggleBan(u.id, !u.isBanned)} class="rounded-lg p-2 transition-all {u.isBanned ? 'text-emerald-400' : 'text-orange-400 hover:bg-orange-500/10'}" title={u.isBanned ? 'Unban' : 'Ban'}>
													<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
														{#if u.isBanned}<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" />{:else}<rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />{/if}
													</svg>
												</button>
											{:else}
												<span class="text-[10px] text-neutral-600 italic">Protected</span>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
