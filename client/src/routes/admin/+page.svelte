<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { user } from '$lib/authService';

	let users = $state([]);
	let loading = $state(true);
	let error = $state('');

	async function loadUsers() {
		try {
			users = await api.get('/users');
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function changeRole(userId: string, role: string) {
		try {
			await api.patch(`/users/${userId}/role`, { role });
			await loadUsers();
		} catch (e: any) {
			alert(e.message);
		}
	}

	onMount(loadUsers);
</script>

<div class="mx-auto max-w-7xl px-4 py-12">
	<div class="mb-12 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Admin Dashboard</h1>
			<p class="text-neutral-500">Manage users and system roles</p>
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
		<div class="overflow-x-auto rounded-3xl border border-neutral-800 bg-neutral-900/50">
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
					{#each users as u}
						<tr class="border-b border-neutral-800/50 transition-colors hover:bg-neutral-800/20">
							<td class="px-8 py-4 font-medium">{u.name || 'N/A'}</td>
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
								{#if u.id !== $user?.id && $user?.role === 'SUPERADMIN'}
									<select
										onchange={(e) => changeRole(u.id, e.target.value)}
										class="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs outline-none focus:border-indigo-500"
										value={u.role}
									>
										<option value="USER">Make User</option>
										<option value="ADMIN">Make Admin</option>
										<option value="SUPERADMIN">Make Superadmin</option>
									</select>
								{:else}
									<span class="text-xs text-neutral-600">No actions</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
