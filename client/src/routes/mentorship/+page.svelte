<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import { api } from '$lib/api';
	import { user, isAuthenticated } from '$lib/authService';
	import { type User, type MentorshipRequest } from '$lib/types';

	let requests = $state<MentorshipRequest[]>([]);
	let alumniList = $state<User[]>([]);
	let search = $state({ industry: '', batch: '' });
	let requestMessage = $state('');
	let selectedAlumni = $state<User | null>(null);

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
		try {
			await api.patch(`/mentorship/${id}/respond`, { status });
			await loadData();
		} catch (e) {
			console.error(e);
		}
	}

	onMount(loadData);
</script>

<div class="mx-auto max-w-6xl space-y-16 px-4 py-12">
	<section>
		<h1 class="mb-8 text-3xl font-bold text-white">Mentorship Center</h1>

		{#if $isAuthenticated}
			<div class="grid grid-cols-1 gap-12 lg:grid-cols-2">
				<!-- My Requests -->
				<div class="space-y-6">
					<h2 class="text-xl font-semibold text-white">My Requests</h2>
					{#if requests.length === 0}
						<p class="text-neutral-500 italic">No active requests.</p>
					{:else}
						<div class="space-y-4">
							{#each requests as req, i (req.id)}
								<div
									in:fly={{ y: 20, duration: 300, delay: i * 50 }}
									class="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
								>
									<div class="mb-4 flex items-start justify-between">
										<div>
											<p class="text-sm text-neutral-500">
												{req.studentId === $user?.id ? 'To:' : 'From:'}
												<span class="font-medium text-neutral-200">
													{req.studentId === $user?.id ? req.alumni.name : req.student.name}
												</span>
											</p>
											<p class="text-xs text-neutral-600">
												{new Date(req.createdAt).toLocaleDateString()}
											</p>
										</div>
										<span
											class="rounded-full px-3 py-1 text-xs font-bold tracking-wider uppercase
                      {req.status === 'PENDING'
												? 'bg-amber-500/10 text-amber-500'
												: req.status === 'ACCEPTED'
													? 'bg-emerald-500/10 text-emerald-500'
													: 'bg-red-500/10 text-red-500'}"
										>
											{req.status}
										</span>
									</div>
									<p class="mb-4 text-sm text-neutral-400 italic">"{req.message}"</p>

									{#if req.alumniId === $user?.id && req.status === 'PENDING'}
										<div class="flex gap-2">
											<button
												onclick={() => handleResponse(req.id, 'ACCEPTED')}
												class="flex-grow rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
												>Accept</button
											>
											<button
												onclick={() => handleResponse(req.id, 'DECLINED')}
												class="flex-grow rounded-lg bg-neutral-800 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
												>Decline</button
											>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Find Alumni -->
				<div class="space-y-6">
					<h2 class="text-xl font-semibold text-white">Find an Alumni</h2>
					<div class="flex gap-2">
						<input
							bind:value={search.industry}
							oninput={loadData}
							placeholder="Filter by Industry"
							class="flex-grow rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-2 text-sm transition-colors focus:border-indigo-500"
						/>
					</div>

					<div
						class="scrollbar-thin scrollbar-thumb-neutral-800 grid max-h-[500px] grid-cols-1 gap-4 overflow-y-auto pr-2"
					>
						{#each alumniList.filter((a) => a.id !== $user?.id) as alum, i (alum.id)}
							<div
								in:fly={{ y: 20, duration: 300, delay: i * 50 }}
								class="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/30 p-4 transition-colors hover:border-neutral-700"
							>
								<div>
									<h3 class="font-bold text-white">{alum.name}</h3>
									<p class="text-xs text-neutral-500">
										{alum.industry || 'General'} • Batch {alum.batch || 'N/A'}
									</p>
								</div>
								<button
									onclick={() => (selectedAlumni = alum)}
									class="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
								>
									Request
								</button>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<div class="rounded-3xl border border-neutral-800 bg-neutral-900/30 py-20 text-center">
				<p class="mb-6 text-neutral-400">Please sign in to access the mentorship system.</p>
				<button
					onclick={() => (window.location.href = '/')}
					class="rounded-full bg-white px-8 py-2 font-bold text-black">Sign In</button
				>
			</div>
		{/if}
	</section>
</div>

{#if selectedAlumni}
	<div
		transition:fade={{ duration: 200 }}
		class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
	>
		<div
			in:fly={{ y: 50, duration: 400, delay: 100 }}
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
				placeholder="Introduce yourself and explain why you're seeking mentorship..."
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
