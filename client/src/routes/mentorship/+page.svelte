<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade, slide } from 'svelte/transition';
	import { api } from '$lib/api';
	import { user, isAuthenticated } from '$lib/authService';
	import type { User, MentorshipRequest } from '$lib/types';
	import ChatWindow from '$lib/components/chat/ChatWindow.svelte';
	import Skeleton from '$lib/components/Skeleton.svelte';

	let requests = $state<MentorshipRequest[]>([]);
	let alumniList = $state<User[]>([]);

	let filterQuery = $state('');
	let filterIndustry = $state('');
	let filterBatch = $state('');

	let requestMessage = $state('');
	let selectedAlumni = $state<User | null>(null);
	let activeChatRequest = $state<MentorshipRequest | null>(null);
	let loading = $state(true);

	let searchTimeout: ReturnType<typeof setTimeout>;

	async function loadData() {
		loading = true;
		try {
			const [reqs, alums] = await Promise.all([
				api.get('/mentorship/my-requests'),
				api.get(
					`/users?userType=ALUMNI&status=APPROVED&search=${encodeURIComponent(filterQuery)}&industry=${encodeURIComponent(filterIndustry)}&batch=${encodeURIComponent(filterBatch)}`
				)
			]);
			requests = reqs;
			alumniList = alums;
		} catch (e) {
			console.error(e);
		} finally {
			loading = false;
		}
	}

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			loadData();
		}, 400);
	}

	async function sendRequest() {
		if (!selectedAlumni) return;
		try {
			await api.post('/mentorship/request', {
				alumniId: selectedAlumni.id,
				message: requestMessage || 'I would like to connect with you for mentorship.'
			});
			requestMessage = '';
			selectedAlumni = null;
			await loadData();
		} catch (e) {
			console.error(e);
		}
	}

	async function handleResponse(id: string, status: string) {
		try {
			requests = requests.map((r) => (r.id === id ? { ...r, status } : r));
			await api.patch(`/mentorship/${id}/respond`, { status });
			await loadData();
		} catch (e: any) {
			console.error(e);
			await loadData();
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

<div class="mx-auto max-w-6xl px-6 py-20 font-sans">
	{#if $isAuthenticated}
		<!-- Header Section -->
		<header class="mb-20 border-b border-white/10 pb-10">
			<h1 class="text-4xl font-light tracking-tight text-white sm:text-5xl">Mentorship</h1>
			<p class="mt-6 max-w-2xl text-lg leading-relaxed font-light text-neutral-400">
				{isAlumni
					? 'Manage your connections and incoming requests from the student network.'
					: 'Connect with industry experts and accelerate your professional growth.'}
			</p>
		</header>

		<!-- ACTIVE CONNECTIONS -->
		{#if activeMentorships.length > 0}
			<section class="mb-24">
				<h2 class="mb-8 text-xs font-bold tracking-widest text-neutral-500 uppercase">
					Active Connections
				</h2>

				<div class="flex flex-col border-t border-white/10">
					{#each activeMentorships as req (req.id)}
						{@const partner = req.studentId === $user?.id ? req.alumni : req.student}
						<div
							in:fly={{ y: 20, duration: 300 }}
							out:slide={{ duration: 300 }}
							class="group -mx-4 flex flex-col justify-between gap-6 border-b border-white/5 px-4 py-8 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center"
						>
							<div class="flex items-center gap-6">
								<div
									class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-light text-neutral-300"
								>
									{#if partner.profilePic}
										<img
											src={partner.profilePic}
											alt={partner.name}
											class="h-full w-full rounded-full object-cover"
										/>
									{:else}
										{partner.name[0]}
									{/if}
								</div>
								<div>
									<h3 class="text-xl font-medium text-white">{partner.name}</h3>
									<p class="mt-1 text-sm text-neutral-500">
										{partner.industry || 'General'} • {partner.userType}
									</p>
								</div>
							</div>

							<div
								class="flex items-center gap-6 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
							>
								<button
									onclick={() => (activeChatRequest = req)}
									class="text-sm font-medium text-white underline-offset-4 hover:underline"
								>
									Message
								</button>
								<button
									onclick={() => {
										if (confirm('Are you sure you want to end this connection?')) {
											handleResponse(req.id, 'CANCELLED');
										}
									}}
									class="text-sm font-medium text-neutral-600 transition-colors hover:text-red-400"
								>
									End Connection
								</button>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<div class="grid grid-cols-1 gap-20 lg:grid-cols-12">
			<!-- REQUESTS INBOX -->
			<div class="lg:col-span-5">
				<h2 class="mb-8 text-xs font-bold tracking-widest text-neutral-500 uppercase">
					Requests Inbox
				</h2>

				{#if loading && pendingRequests.length === 0}
					<div class="space-y-8 border-t border-white/10 pt-8">
						{#each Array(2) as _, i (i)}
							<div class="space-y-4 border-b border-white/5 pb-8">
								<Skeleton class="h-5 w-32" />
								<Skeleton class="h-16 w-full" />
								<Skeleton class="h-4 w-24" />
							</div>
						{/each}
					</div>
				{:else if pendingRequests.length === 0}
					<div class="border-t border-white/10 pt-12">
						<p class="text-sm font-light text-neutral-600 italic">Inbox is empty.</p>
					</div>
				{:else}
					<div class="flex flex-col border-t border-white/10">
						{#each pendingRequests as req (req.id)}
							{@const isSender = req.studentId === $user?.id}
							{@const partner = isSender ? req.alumni : req.student}
							<div class="border-b border-white/5 py-8">
								<div class="mb-4 flex items-start justify-between">
									<h3 class="text-lg font-medium text-white">{partner.name}</h3>
									<span class="text-[10px] font-bold tracking-widest text-neutral-600 uppercase">
										{isSender ? 'Sent' : 'Received'}
									</span>
								</div>
								<p class="mb-8 text-sm leading-relaxed text-neutral-400">
									"{req.message}"
								</p>

								<div class="flex gap-6">
									{#if !isSender}
										<button
											onclick={() => handleResponse(req.id, 'ACCEPTED')}
											class="text-sm font-medium text-white underline-offset-4 hover:underline"
										>
											Accept
										</button>
										<button
											onclick={() => handleResponse(req.id, 'DECLINED')}
											class="text-sm font-medium text-neutral-600 transition-colors hover:text-white"
										>
											Decline
										</button>
									{:else}
										<span class="text-xs font-bold tracking-widest text-neutral-600 uppercase"
											>Awaiting Response</span
										>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- DISCOVER ALUMNI -->
			<div class="lg:col-span-7">
				<h2 class="mb-8 text-xs font-bold tracking-widest text-neutral-500 uppercase">
					{isAlumni ? 'Network Directory' : 'Discover Mentors'}
				</h2>

				{#if isAlumni}
					<p in:fade class="mb-6 text-[11px] font-light text-neutral-500 italic">
						Your profile is currently live and visible to students in this directory.
					</p>
				{/if}

				<!-- Filters -->
				<div class="mb-12 flex flex-col gap-6 sm:flex-row">
					<div class="relative w-full">
						<input
							bind:value={filterQuery}
							oninput={handleSearch}
							placeholder="Search names or bios..."
							class="w-full border-b border-white/10 bg-transparent pt-4 pb-3 text-sm text-white placeholder-neutral-600 transition-colors focus:border-white focus:outline-none"
						/>
					</div>
					<div class="relative w-full sm:w-1/3">
						<input
							bind:value={filterIndustry}
							oninput={handleSearch}
							placeholder="Industry..."
							class="w-full border-b border-white/10 bg-transparent pt-4 pb-3 text-sm text-white placeholder-neutral-600 transition-colors focus:border-white focus:outline-none"
						/>
					</div>
					<div class="relative w-full sm:w-1/4">
						<input
							bind:value={filterBatch}
							oninput={handleSearch}
							placeholder="Batch..."
							class="w-full border-b border-white/10 bg-transparent pt-4 pb-3 text-sm text-white placeholder-neutral-600 transition-colors focus:border-white focus:outline-none"
						/>
					</div>
				</div>

				<div class="flex flex-col border-t border-white/10">
					{#if loading && alumniList.length === 0}
						{#each Array(4) as _, i (i)}
							<div class="flex items-center gap-6 border-b border-white/5 py-6">
								<Skeleton class="h-12 w-12 rounded-full" />
								<div class="flex-grow space-y-3">
									<Skeleton class="h-4 w-32" />
									<Skeleton class="h-3 w-48" />
								</div>
							</div>
						{/each}
					{:else}
						{#each alumniList.filter((a) => a.id !== $user?.id) as alum (alum.id)}
							{@const status = getAlumniStatus(alum.id)}
							<div
								class="group -mx-4 flex flex-col justify-between gap-4 border-b border-white/5 px-4 py-6 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center"
							>
								<div class="flex items-center gap-6">
									<div
										class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-light text-neutral-400"
									>
										{#if alum.profilePic}
											<img
												src={alum.profilePic}
												alt={alum.name}
												class="h-full w-full rounded-full object-cover"
											/>
										{:else}
											{alum.name[0]}
										{/if}
									</div>
									<div>
										<div class="flex items-center gap-3">
											<h3 class="text-base font-medium text-white">{alum.name}</h3>
											{#if alum.isExpert}
												<span
													class="bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-black uppercase"
													>Expert</span
												>
											{/if}
										</div>
										<p class="mt-1 text-sm text-neutral-500">
											{alum.industry || 'General'} • {alum.batch
												? `Batch ${alum.batch}`
												: 'Alumnus'}
										</p>
									</div>
								</div>

								<div class="mt-2 flex shrink-0 sm:mt-0">
									{#if status === 'ACCEPTED'}
										<span class="text-xs font-bold tracking-widest text-neutral-600 uppercase"
											>Active</span
										>
									{:else if status === 'PENDING'}
										<span class="text-xs font-bold tracking-widest text-neutral-600 uppercase"
											>Requested</span
										>
									{:else if isAlumni}
										<span class="text-xs font-bold tracking-widest text-neutral-600 uppercase"
											>Alumnus</span
										>
									{:else}
										<button
											onclick={() => (selectedAlumni = alum)}
											class="text-sm font-medium text-white underline-offset-4 hover:underline"
										>
											Connect
										</button>
									{/if}
								</div>
							</div>
						{/each}
						{#if alumniList.length === 0}
							<div class="py-12">
								<p class="text-sm font-light text-neutral-600 italic">
									No members found matching your filters.
								</p>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{:else}
		<div class="flex min-h-[60vh] flex-col items-center justify-center text-center">
			<h2 class="mb-6 text-5xl font-light tracking-tight text-white">Connect</h2>
			<p class="mb-12 max-w-md text-lg leading-relaxed font-light text-neutral-500">
				Join the network to find mentors, share insights, and accelerate your career.
			</p>
			<button
				onclick={() => (window.location.href = '/login')}
				class="bg-white px-10 py-4 text-sm font-medium text-black transition-transform hover:scale-105"
			>
				Sign In
			</button>
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
		class="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl"
	>
		<div
			in:fly={{ y: 50, duration: 500, easing: (t) => 1 - Math.pow(1 - t, 4) }}
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
			in:fly={{ y: 20, duration: 400 }}
			class="w-full max-w-lg border border-white/10 bg-neutral-950 p-12 shadow-2xl"
		>
			<h2 class="mb-3 text-2xl font-light text-white">Connect with {selectedAlumni.name}</h2>
			<p class="mb-10 text-sm text-neutral-500">
				Introduce yourself and share what you hope to learn.
			</p>

			<textarea
				bind:value={requestMessage}
				placeholder="Your message..."
				rows="4"
				class="w-full resize-none border-b border-white/20 bg-transparent py-4 text-white placeholder-neutral-600 transition-colors focus:border-white focus:outline-none"
			></textarea>

			<div class="mt-12 flex justify-end gap-8">
				<button
					onclick={() => (selectedAlumni = null)}
					class="text-sm font-medium text-neutral-500 transition-colors hover:text-white"
				>
					Cancel
				</button>
				<button
					onclick={sendRequest}
					class="text-sm font-medium text-white underline-offset-4 hover:underline"
				>
					Send Request
				</button>
			</div>
		</div>
	</div>
{/if}
