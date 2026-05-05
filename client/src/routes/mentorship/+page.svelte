<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { api } from '$lib/api';
	import { user, isAuthenticated } from '$lib/authService';
	import { type User, type MentorshipRequest } from '$lib/types';
	import ChatWindow from '$lib/components/chat/ChatWindow.svelte';

	let requests = $state<MentorshipRequest[]>([]);
	let alumniList = $state<User[]>([]);
	let search = $state({ industry: '', batch: '' });
	let requestMessage = $state('');
	let selectedAlumni = $state<User | null>(null);
	let activeChatRequest = $state<MentorshipRequest | null>(null);

	async function loadData() {
		try {
			const [reqs, alums] = await Promise.all([
				api.get('/mentorship/my-requests'),
				api.get(`/users?industry=${search.industry}&batch=${search.batch}`)
			]);
			requests = reqs;
			alumniList = alums;
		} catch (e) {
			console.error(e);
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

	// Helper to check relationship status in directory
	function getAlumniStatus(alumId: string) {
		const req = requests.find((r) => r.studentId === alumId || r.alumniId === alumId);
		if (!req || req.status === 'CANCELLED' || req.status === 'DECLINED') return null;
		return req.status;
	}

	onMount(loadData);

	// Computed lists for better UI organization
	const activeMentorships = $derived(requests.filter((r) => r.status === 'ACCEPTED'));
	const pendingRequests = $derived(requests.filter((r) => r.status === 'PENDING'));
</script>

<div class="mx-auto max-w-7xl space-y-12 px-4 py-12">
	{#if $isAuthenticated}
		<!-- Header Section -->
		<div class="flex flex-col gap-2">
			<h1 class="text-4xl font-bold tracking-tight text-white">Mentorship Hub</h1>
			<p class="text-neutral-500">Connect, learn, and grow with the alumni network.</p>
		</div>

		<!-- 1. ACTIVE CONNECTIONS (The Command Center) -->
		<section class="space-y-6">
			<div class="flex items-center gap-3">
				<div class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></div>
				<h2 class="text-sm text-xl font-bold tracking-widest text-white uppercase opacity-70">
					Active Connections
				</h2>
			</div>

			{#if activeMentorships.length === 0}
				<div
					class="rounded-3xl border border-dashed border-neutral-800 bg-neutral-900/20 py-12 text-center"
				>
					<p class="text-neutral-500 italic">
						No active connections yet. Start by finding a mentor!
					</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each activeMentorships as req (req.id)}
						{@const partner = req.studentId === $user?.id ? req.alumni : req.student}
						<div
							in:fly={{ y: 20, duration: 300 }}
							class="group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 transition-all hover:border-indigo-500/50"
						>
							<div class="mb-6 flex items-center gap-4">
								<div
									class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-xl font-bold text-indigo-400"
								>
									{partner.name[0]}
								</div>
								<div>
									<h3 class="font-bold text-white">{partner.name}</h3>
									<p class="text-xs tracking-widest text-neutral-500 uppercase">
										{partner.industry || 'General'}
									</p>
								</div>
							</div>
							<div class="flex gap-2">
								<button
									onclick={() => (activeChatRequest = req)}
									class="flex-grow rounded-xl bg-white/5 py-3 text-sm font-bold text-white transition-all hover:bg-indigo-600 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"
								>
									Open Chat
								</button>
								<button
									onclick={() => {
										if (confirm('Are you sure you want to end this mentorship connection?')) {
											handleResponse(req.id, 'CANCELLED');
										}
									}}
									class="rounded-xl bg-neutral-800 p-3 text-neutral-500 transition-all hover:text-red-400"
									title="End Connection"
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
			<!-- 2. PENDING REQUESTS (Inbox) -->
			<div class="space-y-6 lg:col-span-5">
				<h2 class="text-sm text-xl font-bold tracking-widest text-white uppercase opacity-70">
					Requests Inbox
				</h2>
				{#if pendingRequests.length === 0}
					<p class="text-sm text-neutral-500 italic">Your inbox is clear.</p>
				{:else}
					<div class="space-y-4">
						{#each pendingRequests as req (req.id)}
							{@const isSender = req.studentId === $user?.id}
							{@const partner = isSender ? req.alumni : req.student}
							<div class="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
								<div class="mb-4 flex items-start justify-between">
									<div>
										<p class="mb-1 text-xs font-bold text-indigo-400 uppercase">
											{isSender ? 'Sent To' : 'Received From'}
										</p>
										<h3 class="font-bold text-white">{partner.name}</h3>
									</div>
									<span class="font-mono text-[10px] text-neutral-600"
										>{new Date(req.createdAt).toLocaleDateString()}</span
									>
								</div>
								<p class="mb-6 text-sm text-neutral-400 italic">"{req.message}"</p>

								{#if !isSender}
									<div class="flex gap-2">
										<button
											onclick={() => handleResponse(req.id, 'ACCEPTED')}
											class="flex-grow rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-500"
											>Accept</button
										>
										<button
											onclick={() => handleResponse(req.id, 'DECLINED')}
											class="rounded-lg bg-neutral-800 px-4 py-2 text-xs font-bold text-neutral-400 transition-all hover:text-white"
											>Decline</button
										>
									</div>
								{:else}
									<div
										class="w-full rounded-lg bg-neutral-800/50 py-2 text-center text-[10px] font-bold text-neutral-500 uppercase"
									>
										Awaiting Response
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- 3. FIND ALUMNI (Directory) -->
			<div class="space-y-6 lg:col-span-7">
				<div class="flex items-center justify-between">
					<h2 class="text-sm text-xl font-bold tracking-widest text-white uppercase opacity-70">
						Discover Alumni
					</h2>
					<input
						bind:value={search.industry}
						oninput={loadData}
						placeholder="Filter by Industry..."
						class="rounded-full border border-neutral-800 bg-neutral-950 px-6 py-2 text-xs transition-all outline-none focus:border-indigo-500"
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{#each alumniList.filter((a) => a.id !== $user?.id) as alum (alum.id)}
						{@const status = getAlumniStatus(alum.id)}
						<div
							class="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5 transition-all hover:bg-neutral-900/40"
						>
							<div class="flex items-center gap-4">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800 font-bold text-neutral-500"
								>
									{alum.name[0]}
								</div>
								<div>
									<h3 class="text-sm font-bold text-white">{alum.name}</h3>
									<p class="text-[10px] text-neutral-500">
										{alum.industry || 'General'} • Batch {alum.batch || 'N/A'}
									</p>
								</div>
							</div>

							{#if status === 'ACCEPTED'}
								<div
									class="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-500 uppercase"
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
										stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg
									>
									Active
								</div>
							{:else}
								<button
									onclick={() => (status === 'PENDING' ? null : (selectedAlumni = alum))}
									disabled={status === 'PENDING'}
									class="text-[10px] font-bold tracking-widest uppercase {status === 'PENDING'
										? 'text-neutral-600'
										: 'text-indigo-400 transition-colors hover:text-white'}"
								>
									{status === 'PENDING' ? 'Requested' : 'Request'}
								</button>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<!-- Sign In State -->
		<div class="flex flex-col items-center justify-center py-32 text-center">
			<h2 class="mb-4 text-3xl font-bold text-white">Connect with Mentors</h2>
			<p class="mb-8 max-w-md text-neutral-500">
				Join the network to find mentors, share insights, and accelerate your career growth.
			</p>
			<button
				onclick={() => (window.location.href = '/login')}
				class="rounded-full bg-white px-12 py-3 font-bold text-black transition-all hover:scale-105"
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
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
	>
		<div in:fly={{ y: 50, duration: 400 }} class="relative w-full max-w-2xl">
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
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
	>
		<div
			in:fly={{ y: 50, duration: 400 }}
			class="w-full max-w-md space-y-6 rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl"
		>
			<div>
				<h2 class="text-2xl font-bold">Request Mentorship</h2>
				<p class="text-neutral-500">
					To: <span class="font-medium text-white">{selectedAlumni.name}</span>
				</p>
			</div>
			<textarea
				bind:value={requestMessage}
				placeholder="Introduce yourself..."
				rows="5"
				class="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-white transition-colors focus:border-indigo-500"
			></textarea>
			<div class="flex gap-4">
				<button
					onclick={sendRequest}
					class="flex-grow rounded-xl bg-indigo-600 py-3 font-bold text-white transition-all hover:bg-indigo-700 active:scale-95"
					>Send Request</button
				>
				<button
					onclick={() => (selectedAlumni = null)}
					class="px-6 py-3 font-medium text-neutral-400 hover:text-white">Cancel</button
				>
			</div>
		</div>
	</div>
{/if}
