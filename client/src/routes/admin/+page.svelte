<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import { api } from '$lib/api';
	import { user } from '$lib/authService';
	import { type User } from '$lib/types';

	let users = $state<User[]>([]);
	let loading = $state(true);
	let error = $state('');

	async function loadUsers() {
		try {
			users = await api.get('/users');
		} catch (e: unknown) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function changeRole(userId: string, role: string) {
		try {
			await api.patch(`/users/${userId}/role`, { role });
			await loadUsers();
		} catch (e: unknown) {
			alert((e as Error).message);
		}
	}

	async function removeUser(userId: string) {
		if (
			!confirm(
				'Are you sure you want to permanently delete this user? This action cannot be undone.'
			)
		)
			return;
		try {
			await api.delete(`/users/${userId}`);
			await loadUsers();
		} catch (e: unknown) {
			alert((e as Error).message);
		}
	}

	onMount(loadUsers);
</script>

<div class="mx-auto max-w-7xl px-4 py-12">
	<div class="mb-12">
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
					><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /><path
						d="m14 8 2 2-2 2"
					/></svg
				>
			</div>
			<h1 class="text-3xl font-bold tracking-tight text-white">Admin Control Center</h1>
		</div>
		<p class="text-neutral-500">
			Manage user roles, monitor network activity, and enforce community standards.
		</p>
	</div>

	<!-- Stats Grid -->
	<div class="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
		<div class="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
			<p class="text-uppercase mb-1 text-sm font-medium tracking-wider text-neutral-500">
				Total Network Members
			</p>
			<p class="text-3xl font-bold text-white">{users.length}</p>
		</div>
		<div class="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
			<p class="text-uppercase mb-1 text-sm font-medium tracking-wider text-neutral-500">
				Admins & Staff
			</p>
			<p class="text-3xl font-bold text-indigo-400">
				{users.filter((u) => u.role !== 'USER').length}
			</p>
		</div>
		<div class="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
			<p class="text-uppercase mb-1 text-sm font-medium tracking-wider text-neutral-500">
				Active Roles
			</p>
			<p class="text-3xl font-bold text-emerald-400">3</p>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center py-20">
			<div
				class="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"
			></div>
		</div>
	{:else if error}
		<div class="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-500">
			<p class="font-bold">Access Denied</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/50 shadow-2xl">
			<div class="border-b border-neutral-800 bg-neutral-800/30 px-8 py-4">
				<h2 class="text-lg font-bold text-white">User Directory</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full border-collapse text-left">
					<thead>
						<tr class="border-b border-neutral-800">
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase"
								>User</th
							>
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase"
								>Email</th
							>
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase"
								>Role</th
							>
							<th class="px-8 py-6 text-xs font-semibold tracking-wider text-neutral-500 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody>
						{#each users as u, i (u.id)}
							<tr
								in:fly={{ y: 10, duration: 200, delay: i * 30 }}
								class="border-b border-neutral-800/50 transition-colors hover:bg-neutral-800/20"
							>
								<td class="px-8 py-4 font-medium text-white">{u.name || 'N/A'}</td>
								<td class="px-8 py-4 text-sm text-neutral-400">{u.email}</td>
								<td class="px-8 py-4">
									<span
										class="rounded-full px-3 py-1 text-[10px] font-bold tracking-tighter uppercase
                  {u.role === 'SUPERADMIN'
											? 'bg-purple-500 text-white'
											: u.role === 'ADMIN'
												? 'bg-indigo-500 text-white'
												: 'bg-neutral-800 text-neutral-400'}"
									>
										{u.role}
									</span>
								</td>
								<td class="px-8 py-4">
									<div class="flex items-center gap-3">
										{#if u.id !== $user?.id && u.role !== 'SUPERADMIN'}
											<select
												value={u.role}
												onchange={(e) =>
													handleRoleChange(u.id, (e.target as HTMLSelectElement).value as Role)}
												class="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 transition-all hover:border-neutral-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
											>
												<option value="USER">Make User</option>
												<option value="ADMIN">Make Admin</option>
												<option value="SUPERADMIN">Make Superadmin</option>
											</select>

											<button
												onclick={() => handleDelete(u.id)}
												class="rounded-lg p-2 text-neutral-500 transition-all hover:bg-red-500/10 hover:text-red-400"
												title="Delete User"
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
										{:else}
											<span class="text-[10px] italic text-neutral-500 opacity-50">
												Protected Account
											</span>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
