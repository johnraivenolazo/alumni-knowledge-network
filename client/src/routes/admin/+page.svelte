<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { api } from '$lib/api';
	import { isAuthenticated, user, loading as authLoading } from '$lib/authService';
	import { goto } from '$app/navigation';
	import { type User, type SystemStats, type UserStatus, displayUserType } from '$lib/types';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let activeTab = $state<'overview' | 'pending' | 'users'>('overview');
	let users = $state<User[]>([]);
	let pendingUsers = $state<User[]>([]);
	let stats = $state<SystemStats | null>(null);
	let loading = $state(true);
	let error = $state('');
	let editingUser = $state<User | null>(null);
	let creatingUser = $state(false);
	let newUser = $state({
		email: '',
		name: '',
		role: 'USER' as 'USER' | 'ADMIN' | 'SUPERADMIN',
		userType: 'STUDENT' as 'STUDENT' | 'ALUMNI',
		industry: '',
		batch: ''
	});
	let createError = $state('');
	let createSubmitting = $state(false);

	function resetNewUser() {
		newUser = {
			email: '',
			name: '',
			role: 'USER',
			userType: 'STUDENT',
			industry: '',
			batch: ''
		};
		createError = '';
	}

	async function handleCreateUser() {
		if (!newUser.email) {
			createError = 'Email is required';
			return;
		}
		createSubmitting = true;
		createError = '';
		try {
			await api.post('/users', newUser);
			creatingUser = false;
			resetNewUser();
			await loadData();
		} catch (e: any) {
			createError = e.message || 'Failed to create user';
		} finally {
			createSubmitting = false;
		}
	}

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
		<div>
			<h1 class="text-3xl font-bold tracking-tight text-white italic">Network Administration</h1>
			<p class="mt-2 font-light text-neutral-500">
				Monitor platform growth, verify members, and manage community standards.
			</p>
		</div>

		<!-- Tab Navigation -->
		<div class="flex rounded-xl border border-white/5 bg-neutral-900/50 p-1">
			{#each ['overview', 'pending', 'users'] as tab (tab)}
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
			<div
				class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line
						x1="12"
						y1="16"
						x2="12.01"
						y2="16"
					/></svg
				>
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
					{#each Array(4) as _, i (i)}
						<div class="rounded-2xl border border-white/5 bg-neutral-900/50 p-6">
							<Skeleton class="mb-4 h-3 w-24" />
							<Skeleton class="mb-4 h-10 w-16" />
							<Skeleton class="h-1 w-full" />
						</div>
					{/each}
				{:else}
					<div
						class="group rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:border-white/20"
					>
						<p class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
							Total Members
						</p>
						<p class="mt-2 text-4xl font-bold tracking-tighter text-white">
							{stats?.totalUsers || 0}
						</p>
						<div class="mt-4 h-1 w-full rounded-full bg-neutral-800">
							<div class="h-full rounded-full bg-white/20" style="width: 100%"></div>
						</div>
					</div>
					<div
						class="group rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:border-white/20"
					>
						<p class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">Students</p>
						<p class="mt-2 text-4xl font-bold tracking-tighter text-white">
							{stats?.students || 0}
						</p>
						<p class="mt-2 text-xs font-light text-neutral-500">
							{(((stats?.students || 0) / (stats?.totalUsers || 1)) * 100).toFixed(1)}% of network
						</p>
					</div>
					<div
						class="group rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:border-white/20"
					>
						<p class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">Alumni</p>
						<p class="mt-2 text-4xl font-bold tracking-tighter text-white">{stats?.alumni || 0}</p>
						<p class="mt-2 text-xs font-light text-neutral-500">
							{(((stats?.alumni || 0) / (stats?.totalUsers || 1)) * 100).toFixed(1)}% of network
						</p>
					</div>
					<div
						class="group rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:border-white/20"
					>
						<p class="text-xs font-semibold tracking-widest text-neutral-500 uppercase">
							Pending Approval
						</p>
						<p class="mt-2 text-4xl font-bold tracking-tighter text-white">{stats?.pending || 0}</p>
						<p class="mt-2 text-xs font-light text-neutral-500 italic">Requires action</p>
					</div>
				{/if}
			</div>

			<!-- Engagement Analytics -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
				<!-- Post Lividity -->
				<div
					class="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-fuchsia-500/20 p-6"
				>
					<div class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-rose-500/30 blur-2xl"></div>
					<p class="text-[10px] font-bold tracking-widest text-rose-200 uppercase">
						Post Lividity
					</p>
					{#if loading}
						<Skeleton class="mt-3 h-10 w-20" />
					{:else}
						<p class="mt-2 text-4xl font-black tracking-tighter text-white">
							{stats?.postLividity ?? 0}<span class="text-2xl text-rose-200/70">%</span>
						</p>
						<p class="mt-2 text-xs text-rose-100/70">
							{stats?.postsLast7Days ?? 0} posts in last 7 days
						</p>
						<div class="mt-4 flex h-10 items-end gap-1">
							{#each stats?.postsByDay || [] as d (d.day)}
								{@const max = Math.max(1, ...(stats?.postsByDay || []).map((x) => x.count))}
								<div
									class="flex-1 rounded-t bg-gradient-to-t from-rose-500 to-pink-300"
									style="height: {(d.count / max) * 100}%; min-height: 2px;"
									title="{d.day}: {d.count}"
								></div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Alumni Consistency -->
				<div
					class="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/20 p-6"
				>
					<div
						class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-amber-500/30 blur-2xl"
					></div>
					<p class="text-[10px] font-bold tracking-widest text-amber-200 uppercase">
						Alumni's Consistency
					</p>
					{#if loading}
						<Skeleton class="mt-3 h-10 w-20" />
					{:else}
						<p class="mt-2 text-4xl font-black tracking-tighter text-white">
							{stats?.alumniConsistency ?? 0}<span class="text-2xl text-amber-200/70">%</span>
						</p>
						<p class="mt-2 text-xs text-amber-100/70">posted in the last week</p>
						<div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-amber-900/40">
							<div
								class="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300"
								style="width: {stats?.alumniConsistency ?? 0}%"
							></div>
						</div>
					{/if}
				</div>

				<!-- Student Consistency -->
				<div
					class="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-cyan-500/20 p-6"
				>
					<div
						class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-emerald-500/30 blur-2xl"
					></div>
					<p class="text-[10px] font-bold tracking-widest text-emerald-200 uppercase">
						Student's Consistency
					</p>
					{#if loading}
						<Skeleton class="mt-3 h-10 w-20" />
					{:else}
						<p class="mt-2 text-4xl font-black tracking-tighter text-white">
							{stats?.studentConsistency ?? 0}<span class="text-2xl text-emerald-200/70">%</span>
						</p>
						<p class="mt-2 text-xs text-emerald-100/70">posted in the last week</p>
						<div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-emerald-900/40">
							<div
								class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300"
								style="width: {stats?.studentConsistency ?? 0}%"
							></div>
						</div>
					{/if}
				</div>

				<!-- Most Used Interaction -->
				<div
					class="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 via-violet-500/10 to-purple-500/20 p-6"
				>
					<div
						class="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-indigo-500/30 blur-2xl"
					></div>
					<p class="text-[10px] font-bold tracking-widest text-indigo-200 uppercase">
						Most Used Interaction
					</p>
					{#if loading}
						<Skeleton class="mt-3 h-10 w-32" />
					{:else if stats?.mostUsedInteraction}
						{@const top = stats.mostUsedInteraction}
						{@const emoji =
							top.type === 'WOW' ? '😮' : top.type === 'HELPFUL' ? '🤝' : '💡'}
						<div class="mt-2 flex items-center gap-3">
							<span class="text-4xl">{emoji}</span>
							<div>
								<p class="text-2xl font-black tracking-tight text-white">
									{top.type.charAt(0) + top.type.slice(1).toLowerCase()}
								</p>
								<p class="text-xs text-indigo-100/70">{top.count} reactions</p>
							</div>
						</div>
						<div class="mt-4 space-y-2">
							{#each stats.reactionBreakdown || [] as r (r.type)}
								{@const e = r.type === 'WOW' ? '😮' : r.type === 'HELPFUL' ? '🤝' : '💡'}
								{@const max = Math.max(
									1,
									...(stats.reactionBreakdown || []).map((x) => x.count)
								)}
								<div class="flex items-center gap-2 text-xs">
									<span class="w-5">{e}</span>
									<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-indigo-900/40">
										<div
											class="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-300"
											style="width: {(r.count / max) * 100}%"
										></div>
									</div>
									<span class="w-8 text-right text-indigo-100/80">{r.count}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="mt-3 text-sm text-indigo-100/70 italic">No reactions yet</p>
					{/if}
				</div>
			</div>

			<!-- Industry Report Section -->
			<div class="overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50">
				<div class="border-b border-white/5 bg-white/5 px-8 py-6">
					<h2 class="text-lg font-bold text-white">Industry Distribution Report</h2>
					<p class="text-sm text-neutral-500">
						Real-time breakdown of expertise across the community.
					</p>
				</div>
				<div class="p-8">
					{#if loading}
						<div class="grid grid-cols-1 gap-8 md:grid-cols-2">
							<div class="space-y-6">
								{#each Array(4) as _, i (i)}
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
								{#each stats.industryStats as item (item.industry)}
									<div class="space-y-2">
										<div class="flex justify-between text-sm">
											<span class="font-medium text-neutral-300">{item.industry}</span>
											<span class="font-bold text-white">{item._count._all}</span>
										</div>
										<div class="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
											<div
												class="h-full bg-white/20"
												style="width: {(item._count._all / (stats.totalUsers || 1)) * 100}%"
											></div>
										</div>
									</div>
								{/each}
							</div>
							<div
								class="flex flex-col items-center justify-center border-l border-white/5 p-8 text-center"
							>
								<div
									class="relative flex h-48 w-48 items-center justify-center rounded-full border border-white/5"
								>
									<div class="text-center">
										<p class="text-4xl font-black tracking-tighter text-white">
											{stats.totalUsers}
										</p>
										<p class="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
											Network Size
										</p>
									</div>
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
				{#each Array(3) as _, i (i)}
					<div
						class="flex items-center justify-between rounded-2xl border border-white/5 bg-neutral-900/50 p-6"
					>
						<div class="flex items-center gap-4">
							<Skeleton class="h-12 w-12" variant="circle" />
							<div>
								<Skeleton class="mb-2 h-4 w-32" />
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
				<div
					class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/5 py-20 text-center"
				>
					<div
						class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline
								points="22 4 12 14.01 9 11.01"
							/></svg
						>
					</div>
					<h3 class="text-xl font-bold text-white">All caught up!</h3>
					<p class="mt-1 text-neutral-500">There are no pending approval requests at the moment.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-4">
					{#each pendingUsers as u (u.id)}
						<div
							class="flex items-center justify-between rounded-2xl border border-white/5 bg-neutral-900/50 p-6 transition-all hover:bg-neutral-800/50"
						>
							<div class="flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-800 font-bold text-white"
								>
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
										<span class="font-medium tracking-wider text-indigo-400 uppercase"
											>{displayUserType(u)}</span
										>
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<button
									onclick={() => handleStatusChange(u.id, 'REJECTED')}
									class="rounded-xl px-4 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
									>Reject</button
								>
								<button
									onclick={() => handleStatusChange(u.id, 'APPROVED')}
									class="rounded-xl bg-indigo-500 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600"
									>Approve Access</button
								>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<div in:fade={{ duration: 200 }}>
			{#if $user?.role === 'SUPERADMIN'}
				<div class="mb-4 flex justify-end">
					<button
						onclick={() => {
							resetNewUser();
							creatingUser = true;
						}}
						class="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-teal-400 active:scale-95"
					>
						+ New User
					</button>
				</div>
			{/if}
		<div
			class="overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50 shadow-2xl"
		>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left">
					<thead>
						<tr class="border-b border-white/5 bg-white/5">
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase"
								>User</th
							>
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase"
								>Status</th
							>
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase"
								>Role</th
							>
							<th
								class="px-8 py-6 text-right text-xs font-semibold tracking-wider text-neutral-500 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody>
						{#if loading}
							{#each Array(5) as _, i (i)}
								<tr class="border-b border-white/5">
									<td class="px-8 py-4"><Skeleton class="h-8 w-48" /></td>
									<td class="px-8 py-4"><Skeleton class="h-6 w-20" /></td>
									<td class="px-8 py-4"><Skeleton class="h-6 w-20" /></td>
									<td class="px-8 py-4 text-right"><Skeleton class="ml-auto h-8 w-32" /></td>
								</tr>
							{/each}
						{:else}
							{#each users as u (u.id)}
								<tr class="border-b border-white/5 transition-colors hover:bg-white/5">
									<td class="px-8 py-4">
										<div class="flex items-center gap-3">
											<div
												class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/5 bg-neutral-800 text-xs font-bold text-white"
											>
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
										<span
											class="rounded border px-2 py-0.5 text-[9px] font-bold tracking-widest uppercase {u.status ===
											'APPROVED'
												? 'border-white/10 bg-white/5 text-neutral-400'
												: 'border-white/10 bg-white/5 text-neutral-500 italic'}"
										>
											{u.status}
										</span>
									</td>
									<td class="px-8 py-4">
										<span
											class="rounded border border-white/5 bg-white/5 px-2 py-0.5 text-[9px] font-bold tracking-widest text-neutral-500 uppercase"
										>
											{u.role}
										</span>
									</td>
									<td class="px-8 py-4 text-right">
										<div class="flex items-center justify-end gap-3">
											{#if u.id !== $user?.id && u.role !== 'SUPERADMIN'}
												<button
													onclick={() => (editingUser = { ...u })}
													class="rounded-lg p-2 text-indigo-400 transition-all hover:bg-indigo-500/10"
													title="Edit User"
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
														><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg
													>
												</button>
												<button
													onclick={() => handleToggleBan(u.id, !u.isBanned)}
													class="rounded-lg p-2 transition-all {u.isBanned
														? 'text-white'
														: 'text-neutral-600 hover:text-white'}"
													title={u.isBanned ? 'Unban' : 'Ban'}
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
													>
														{#if u.isBanned}<path
																d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"
															/><path d="m9 12 2 2 4-4" />{:else}<rect
																width="18"
																height="11"
																x="3"
																y="11"
																rx="2"
																ry="2"
															/><path d="M7 11V7a5 5 0 0 1 10 0v4" />{/if}
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
		</div>
	{/if}
</div>

{#if editingUser}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl"
			in:fly={{ y: 20, duration: 200 }}
			out:fly={{ y: 20, duration: 200 }}
		>
			<div class="flex items-center justify-between border-b border-white/5 bg-white/5 px-6 py-4">
				<h3 class="text-lg font-bold text-white">Edit User</h3>
				<button
					onclick={() => (editingUser = null)}
					class="text-neutral-500 transition-colors hover:text-white"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"
						></line></svg
					>
				</button>
			</div>
			<div class="space-y-6 p-6">
				<!-- Read-only info -->
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-800 font-bold text-white"
					>
						{#if editingUser.profilePic}
							<img
								src={editingUser.profilePic}
								alt={editingUser.name}
								class="h-full w-full object-cover"
							/>
						{:else}
							{editingUser.name?.charAt(0) || 'U'}
						{/if}
					</div>
					<div>
						<p class="font-bold text-white">{editingUser.name || 'Anonymous'}</p>
						<p class="text-xs text-neutral-500">{editingUser.email}</p>
					</div>
				</div>

				<!-- Form Controls -->
				<div class="space-y-6">
					<div>
						<label
							class="mb-2 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
							>User Type</label
						>
						<div class="relative">
							<select
								bind:value={editingUser.userType}
								class="w-full appearance-none rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-white transition-all focus:border-white/20 focus:outline-none"
							>
								<option value="STUDENT">Student</option>
								<option value="ALUMNI">Alumni</option>
							</select>
							<div
								class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-neutral-600"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
								>
							</div>
						</div>
					</div>

					<div>
						<label
							class="mb-2 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
							>System Role</label
						>
						<div class="relative">
							<select
								bind:value={editingUser.role}
								class="w-full appearance-none rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-white transition-all focus:border-white/20 focus:outline-none"
							>
								<option value="USER">User</option>
								<option value="ADMIN">Admin</option>
								<option value="SUPERADMIN">Superadmin</option>
							</select>
							<div
								class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-neutral-600"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
								>
							</div>
						</div>
					</div>

					{#if editingUser.userType === 'ALUMNI'}
						<div
							class="flex items-center justify-between rounded-xl border border-white/5 bg-neutral-900 px-4 py-4"
						>
							<div>
								<p class="text-[10px] font-bold tracking-widest text-white uppercase">
									Expert Status
								</p>
								<p class="text-[10px] font-light text-neutral-500">Highlight as platform expert</p>
							</div>
							<button
								onclick={() => {
									if (editingUser) editingUser.isExpert = !editingUser.isExpert;
								}}
								class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {editingUser.isExpert
									? 'bg-white'
									: 'bg-neutral-800'}"
							>
								<span
									class="inline-block h-3 w-3 transform rounded-full transition-transform {editingUser.isExpert
										? 'translate-x-5 bg-black'
										: 'translate-x-1 bg-neutral-500'}"
								></span>
							</button>
						</div>
					{/if}
				</div>
			</div>
			<div class="flex justify-end gap-6 border-t border-white/5 bg-neutral-950/50 px-8 py-6">
				<button
					onclick={() => (editingUser = null)}
					class="text-[10px] font-bold tracking-widest text-neutral-500 uppercase transition-colors hover:text-white"
				>
					Cancel
				</button>
				<button
					onclick={async () => {
						try {
							// Save role first if changed
							const originalUser = users.find((u) => u.id === editingUser?.id);
							if (editingUser && originalUser && editingUser.role !== originalUser.role) {
								await api.patch(`/users/${editingUser.id}/role`, { role: editingUser.role });
							}

							// Save userType and isExpert
							if (editingUser) {
								await api.patch(`/users/${editingUser.id}`, {
									userType: editingUser.userType,
									isExpert: editingUser.isExpert
								});
							}

							await loadData();
							editingUser = null;
						} catch (e: any) {
							alert(e.message);
						}
					}}
					class="rounded-lg bg-white px-8 py-3 text-[10px] font-bold tracking-widest text-black uppercase transition-all hover:bg-neutral-200 active:scale-95"
				>
					Save Changes
				</button>
			</div>
		</div>
	</div>
{/if}

{#if creatingUser}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/20 bg-neutral-900 shadow-2xl"
			in:fly={{ y: 20, duration: 200 }}
			out:fly={{ y: 20, duration: 200 }}
		>
			<div
				class="flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-6 py-4"
			>
				<h3 class="text-lg font-bold text-white">Create New User</h3>
				<button
					onclick={() => (creatingUser = false)}
					class="text-neutral-500 transition-colors hover:text-white"
					aria-label="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"
						></line></svg
					>
				</button>
			</div>
			<div class="space-y-4 p-6">
				<div>
					<label
						for="new-user-email"
						class="mb-2 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
						>Email *</label
					>
					<input
						id="new-user-email"
						type="email"
						bind:value={newUser.email}
						placeholder="user@neu.edu.ph"
						class="w-full rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-700 transition-all focus:border-emerald-500/40 focus:outline-none"
					/>
				</div>
				<div>
					<label
						for="new-user-name"
						class="mb-2 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
						>Name</label
					>
					<input
						id="new-user-name"
						type="text"
						bind:value={newUser.name}
						placeholder="Full Name"
						class="w-full rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-700 transition-all focus:border-emerald-500/40 focus:outline-none"
					/>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label
							for="new-user-role"
							class="mb-2 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
							>Role</label
						>
						<select
							id="new-user-role"
							bind:value={newUser.role}
							class="w-full appearance-none rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-white transition-all focus:border-emerald-500/40 focus:outline-none"
						>
							<option value="USER">User</option>
							<option value="ADMIN">Admin</option>
							<option value="SUPERADMIN">Superadmin</option>
						</select>
					</div>
					<div>
						<label
							for="new-user-type"
							class="mb-2 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
							>User Type</label
						>
						<select
							id="new-user-type"
							bind:value={newUser.userType}
							class="w-full appearance-none rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-white transition-all focus:border-emerald-500/40 focus:outline-none"
						>
							<option value="STUDENT">Student</option>
							<option value="ALUMNI">Alumni</option>
						</select>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label
							for="new-user-industry"
							class="mb-2 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
							>Industry</label
						>
						<input
							id="new-user-industry"
							type="text"
							bind:value={newUser.industry}
							placeholder="e.g. Tech"
							class="w-full rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-700 transition-all focus:border-emerald-500/40 focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="new-user-batch"
							class="mb-2 block text-[10px] font-bold tracking-widest text-neutral-500 uppercase"
							>Batch</label
						>
						<input
							id="new-user-batch"
							type="text"
							bind:value={newUser.batch}
							placeholder="e.g. 2024"
							class="w-full rounded-xl border border-white/5 bg-neutral-900 px-4 py-3 text-sm text-white placeholder-neutral-700 transition-all focus:border-emerald-500/40 focus:outline-none"
						/>
					</div>
				</div>
				{#if createError}
					<p class="text-xs font-medium text-red-400">{createError}</p>
				{/if}
				<p class="text-[10px] text-neutral-500 italic">
					New users created here are automatically marked as APPROVED.
				</p>
			</div>
			<div class="flex justify-end gap-6 border-t border-white/5 bg-neutral-950/50 px-8 py-6">
				<button
					onclick={() => (creatingUser = false)}
					class="text-[10px] font-bold tracking-widest text-neutral-500 uppercase transition-colors hover:text-white"
				>
					Cancel
				</button>
				<button
					onclick={handleCreateUser}
					disabled={createSubmitting}
					class="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-3 text-[10px] font-bold tracking-widest text-white uppercase shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50"
				>
					{createSubmitting ? 'Creating...' : 'Create User'}
				</button>
			</div>
		</div>
	</div>
{/if}
