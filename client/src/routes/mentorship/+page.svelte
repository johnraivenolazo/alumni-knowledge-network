<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade, slide } from 'svelte/transition';
	import { api } from '$lib/api';
	import { user, isAuthenticated } from '$lib/authService';
	import type { User, MentorshipRequest, UserType } from '$lib/types';
	import ChatWindow from '$lib/components/chat/ChatWindow.svelte';

	let requests = $state<MentorshipRequest[]>([]);
	let alumniList = $state<User[]>([]);
	let search = $state({ industry: '', batch: '' });
	let requestMessage = $state('');
	let selectedAlumni = $state<User | null>(null);
	let activeChatRequest = $state<MentorshipRequest | null>(null);
	let loading = $state(true);

	async function loadData() {
		loading = true;
		try {
			const [reqs, alums] = await Promise.all([
				api.get('/mentorship/my-requests'),
				api.get(`/users?userType=ALUMNI&industry=${search.industry}&batch=${search.batch}`)
			]);
			requests = reqs;
			alumniList = alums;
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	async function sendRequest() {
		if (!selectedAlumni || !requestMessage) return;
		try {
			await api.post('/mentorship/request', {
				alumniId: selectedAlumni.id,
				message: requestMessage
			});
			requestMessage = '';
			selectedAlumni = null;
			await loadData();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleResponse(id: string, status: string) {
		console.log('[MentorshipDebug] Handling Response:', {
			requestId: id,
			requestedStatus: status,
			currentUser: $user?.id,
			currentRole: $user?.role,
			currentEmail: $user?.email
		});
		try {
            // Optimistic Update: Update the local state immediately
            requests = requests.map((r) => (r.id === id ? { ...r, status } : r));
            
			await api.patch(`/mentorship/${id}/respond`, { status });
			console.log('[MentorshipDebug] Success!');
			await loadData();
		} catch (e: any) {
			console.error('[MentorshipDebug] Error Object:', e);
			if (e.responseBody) {
				console.error('[MentorshipDebug] Server Response Reason:', e.responseBody);
			}
			await loadData(); // Revert if failed
		}
	}

	function getAlumniStatus(alumId: string) {
		const req = requests.find((r) => r.studentId === $user?.id && r.alumniId === alumId);
		if (!req || req.status === 'CANCELLED' || req.status === 'DECLINED') return null;
		return req.status;
	}

	onMount(loadData);

	const activeMentorships = $derived(requests.filter((r) => r.status === 'ACCEPTED'));
	const pendingRequests = $derived(requests.filter((r) => r.status === 'PENDING'));
	const isAlumni = $derived($user?.userType === 'ALUMNI');
</script>

<div class="mx-auto max-w-7xl space-y-12 px-4 py-12">
	{#if $isAuthenticated}
		<!-- Header Section -->
		<div class="flex flex-col justify-between gap-6 md:flex-row md:items-end">
			<div>
				<h1 class="text-5xl font-black tracking-tighter text-white">Mentorship Hub</h1>
				<p class="mt-2 text-neutral-500">
					{isAlumni
						? 'Manage your mentorship connections and incoming student requests.'
						: 'Connect with industry experts and accelerate your career growth.'}
				</p>
			</div>

            <div class="flex items-center gap-4 bg-neutral-900/50 p-2 rounded-2xl border border-white/5">
                <div class="px-4 py-2 text-xs font-bold uppercase tracking-widest text-neutral-400">Your Role</div>
                <div class="px-6 py-2 rounded-xl text-[10px] font-black text-white shadow-lg uppercase tracking-widest transition-all
                    {$user?.userType === 'ALUMNI' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-indigo-500 shadow-indigo-500/20'}">
                    {$user?.userType || 'STUDENT'}
                </div>
            </div>
		</div>

		<!-- 1. ACTIVE CONNECTIONS -->
		<section class="space-y-6">
			<div class="flex items-center gap-3">
				<div class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
				<h2 class="text-xl font-bold tracking-tight text-white">Active Connections</h2>
			</div>

			{#if activeMentorships.length === 0}
				<div
					class="rounded-3xl border border-dashed border-white/5 bg-neutral-900/20 py-20 text-center"
				>
					<p class="text-neutral-500 italic">No active connections yet.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each activeMentorships as req (req.id)}
						{@const partner = req.studentId === $user?.id ? req.alumni : req.student}
						<div
							in:fly={{ y: 20, duration: 300 }}
                            out:slide={{ duration: 300 }}
							class="group relative overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50 p-8 transition-all hover:border-indigo-500/30 hover:bg-neutral-800/50"
						>
							<div class="mb-8 flex items-center gap-4">
								<div
									class="flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/10 bg-indigo-500/20 text-2xl font-bold text-indigo-400"
								>
									{partner.name[0]}
								</div>
								<div>
									<h3 class="text-lg font-bold text-white">{partner.name}</h3>
									<p class="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
										{partner.industry || 'General'} • {partner.userType}
									</p>
								</div>
							</div>
							<div class="flex gap-3">
								<button
									onclick={() => (activeChatRequest = req)}
									class="flex-grow rounded-2xl bg-white py-3 text-sm font-black text-black transition-all hover:bg-neutral-200"
								>
									Open Chat
								</button>
								<button
									onclick={() => {
										if (confirm('Are you sure you want to end this connection?')) {
											handleResponse(req.id, 'CANCELLED');
										}
									}}
									class="rounded-2xl bg-neutral-800 p-3 text-neutral-500 transition-all hover:bg-red-500/10 hover:text-red-400"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2.5"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
									>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<div class="grid grid-cols-1 gap-12 pt-8 lg:grid-cols-12">
			<!-- 2. REQUESTS INBOX -->
			<div class="space-y-6 lg:col-span-5">
				<h2 class="text-xl font-bold tracking-tight text-white">Requests Inbox</h2>
				{#if pendingRequests.length === 0}
					<div class="rounded-3xl border border-dashed border-white/5 bg-white/5 py-12 text-center">
						<p class="text-sm text-neutral-600 italic">No pending requests.</p>
					</div>
				{:else}
					<div class="space-y-4">
						{#each pendingRequests as req (req.id)}
							{@const isSender = req.studentId === $user?.id}
							{@const partner = isSender ? req.alumni : req.student}
							<div class="rounded-3xl border border-white/5 bg-neutral-900/30 p-8 backdrop-blur-md">
								<div class="mb-6 flex items-start justify-between">
									<div>
										<p
											class="mb-1 text-[10px] font-black tracking-widest text-indigo-400 uppercase"
										>
											{isSender ? 'Outgoing Request' : 'Incoming Request'}
										</p>
										<h3 class="text-xl font-bold text-white">{partner.name}</h3>
									</div>
									<span
										class="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold text-neutral-600"
									>
										{new Date(req.createdAt).toLocaleDateString()}
									</span>
								</div>
								<p
									class="mb-8 border-l-2 border-white/10 pl-4 text-sm leading-relaxed text-neutral-400 italic"
								>
									"{req.message}"
								</p>

								{#if !isSender}
									<div class="flex gap-3">
										<button
											onclick={() => handleResponse(req.id, 'ACCEPTED')}
											class="flex-grow rounded-2xl bg-indigo-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-600"
											>Accept</button
										>
										<button
											onclick={() => handleResponse(req.id, 'DECLINED')}
											class="rounded-2xl bg-neutral-800 px-6 py-3 text-sm font-bold text-neutral-400 transition-all hover:text-white"
											>Decline</button
										>
									</div>
								{:else}
									<div
										class="w-full rounded-2xl border border-white/5 bg-white/5 py-3 text-center text-xs font-black tracking-widest text-neutral-500 uppercase"
									>
										Awaiting Response
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- 3. DISCOVER ALUMNI (Only for Students or General Discovery) -->
			<div class="space-y-6 lg:col-span-7">
				<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
					<h2 class="text-xl font-bold tracking-tight text-white">
						{isAlumni ? 'Other Alumni' : 'Find your Mentor'}
					</h2>
					<div class="flex gap-2">
						<input
							bind:value={search.industry}
							oninput={loadData}
							placeholder="Filter by Industry..."
							class="w-full rounded-full border border-white/5 bg-neutral-950 px-6 py-2 text-xs transition-all outline-none focus:border-indigo-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{#each alumniList.filter((a) => a.id !== $user?.id) as alum (alum.id)}
						{@const status = getAlumniStatus(alum.id)}
						<div
							class="flex flex-col justify-between rounded-3xl border border-white/5 bg-neutral-900/20 p-6 transition-all hover:border-white/10 hover:bg-neutral-900/40"
						>
							<div class="mb-6 flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-neutral-800 font-bold text-neutral-500"
								>
									{#if alum.profilePic}
										<img src={alum.profilePic} alt={alum.name} class="h-full w-full object-cover" />
									{:else}
										{alum.name[0]}
									{/if}
								</div>
								<div>
									<h3 class="text-base font-bold text-white">{alum.name}</h3>
									<p class="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
										{alum.industry || 'General'} • {alum.batch ? `Batch ${alum.batch}` : 'Alumnus'}
									</p>
								</div>
							</div>

							{#if status === 'ACCEPTED'}
								<div
									class="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 py-2.5 text-xs font-black tracking-widest text-emerald-500 uppercase"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="3"
										stroke-linecap="round"
										stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
									>
									Active
								</div>
							{:else}
								<button
									onclick={() => (status === 'PENDING' ? null : (selectedAlumni = alum))}
									disabled={status === 'PENDING' || isAlumni}
									class="w-full rounded-2xl py-2.5 text-xs font-black tracking-widest uppercase transition-all
                                    {status === 'PENDING'
										? 'border border-white/5 bg-white/5 text-neutral-600'
										: isAlumni
											? 'cursor-not-allowed bg-neutral-800/50 text-neutral-600'
											: 'border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-lg hover:shadow-indigo-500/20'}"
								>
									{status === 'PENDING' ? 'Requested' : isAlumni ? 'Alumnus' : 'Connect'}
								</button>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<div
			class="flex flex-col items-center justify-center rounded-[4rem] border border-white/5 bg-neutral-900/50 py-32 text-center backdrop-blur-sm"
		>
			<h2 class="mb-4 text-5xl font-black tracking-tighter text-white">Connect with Mentors</h2>
			<p class="mb-10 max-w-md text-lg leading-relaxed text-neutral-500">
				Join the network to find mentors, share insights, and accelerate your career growth.
			</p>
			<button
				onclick={() => (window.location.href = '/login')}
				class="rounded-full bg-white px-16 py-4 font-black text-black shadow-2xl shadow-white/10 transition-all hover:scale-105"
				>Sign In to Network</button
			>
		</div>
	{/if}
</div>

<!-- CHAT OVERLAY -->
{#if activeChatRequest}
	{@const partner =
		activeChatRequest.studentId === $user?.id
			? activeChatRequest.alumni
			: activeChatRequest.student}
	<div
		transition:fade={{ duration: 300 }}
		class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-2xl"
	>
		<div
			in:fly={{ y: 100, duration: 600, easing: (t) => 1 - Math.pow(1 - t, 4) }}
			class="relative w-full max-w-2xl"
		>
			<ChatWindow
				requestId={activeChatRequest.id}
				receiverId={partner.id}
				partnerName={partner.name}
				initialMessages={activeChatRequest.messages || []}
				onRemove={() => (activeChatRequest = null)}
			/>
		</div>
	</div>
{/if}

<!-- REQUEST MODAL -->
{#if selectedAlumni}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
	>
		<div
			in:fly={{ y: 50, duration: 400 }}
			class="w-full max-w-md space-y-8 rounded-[3rem] border border-white/10 bg-neutral-900 p-12 shadow-[0_0_100px_rgba(79,70,229,0.1)]"
		>
			<div class="text-center">
				<div
					class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500"
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
						><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle
							cx="9"
							cy="7"
							r="4"
						/><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
				</div>
				<h2 class="text-3xl font-black tracking-tighter text-white">Mentorship Request</h2>
				<p class="mt-2 text-neutral-500">
					Sending to <span class="font-bold text-indigo-400">{selectedAlumni.name}</span>
				</p>
			</div>

			<textarea
				bind:value={requestMessage}
				placeholder="Introduce yourself and explain what you hope to learn..."
				rows="5"
				class="w-full rounded-[2rem] border border-white/5 bg-neutral-950 px-6 py-5 text-white transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 focus:outline-none"
			></textarea>

			<div class="flex flex-col gap-3">
				<button
					onclick={sendRequest}
					class="w-full rounded-[2rem] bg-indigo-500 py-4 font-black text-white shadow-xl shadow-indigo-500/20 transition-all hover:bg-indigo-600 active:scale-95"
					>Send Request</button
				>
				<button
					onclick={() => (selectedAlumni = null)}
					class="w-full py-4 font-bold text-neutral-500 transition-all hover:text-white"
					>Dismiss</button
				>
			</div>
		</div>
	</div>
{/if}
