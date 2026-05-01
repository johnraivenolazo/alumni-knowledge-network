<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { io, Socket } from 'socket.io-client';
	import { fly } from 'svelte/transition';
	import { user, getToken } from '$lib/authService';
	import { type Message } from '$lib/types';

	let { requestId, receiverId, partnerName, initialMessages = [], onRemove } = $props();

	let socket: Socket;
	let messages = $state<Message[]>(initialMessages);
	let newMessage = $state('');
	let chatContainer = $state<HTMLElement | null>(null);
	let isConnected = $state(false);

	async function initSocket() {
		const token = await getToken();
		const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

		socket = io(socketUrl, {
			auth: {
				token: `Bearer ${token}`
			}
		});

		socket.on('connect', () => {
			isConnected = true;
			socket.emit('joinRoom', { requestId });
		});

		socket.on('newMessage', (msg: Message) => {
			// Prevent duplicates by removing optimistic version if it exists
			messages = messages.filter((m) => !m.id.startsWith('temp-') || m.content !== msg.content);
			messages = [...messages, msg];
			scrollToBottom();
		});

		socket.on('disconnect', () => {
			isConnected = false;
		});
	}

	function scrollToBottom() {
		if (chatContainer) {
			setTimeout(() => {
				chatContainer!.scrollTop = chatContainer!.scrollHeight;
			}, 50);
		}
	}

	function sendMessage() {
		if (!newMessage.trim() || !socket) return;

		const msgPayload = {
			requestId,
			senderId: $user?.id,
			receiverId,
			content: newMessage
		};

		socket.emit('sendMessage', msgPayload);

		// Optimistic UI Update
		const optimisticMsg: Message = {
			id: 'temp-' + Date.now(),
			content: newMessage,
			senderId: $user?.id || '',
			receiverId,
			requestId,
			createdAt: new Date().toISOString(),
			sender: {
				name: $user?.name || 'Me',
				profilePic: $user?.profilePic
			}
		};
		messages = [...messages, optimisticMsg];
		scrollToBottom();

		newMessage = '';
	}

	onMount(async () => {
		await initSocket();
		scrollToBottom();
	});

	onDestroy(() => {
		if (socket) socket.disconnect();
	});
</script>

<div
	class="flex h-[500px] flex-col rounded-2xl border border-neutral-800 bg-neutral-950/80 shadow-2xl backdrop-blur-xl"
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-white/5 px-6 py-4">
		<div class="flex items-center gap-3">
			<div class="relative">
				<div
					class="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-400"
				>
					{partnerName?.[0] || '?'}
				</div>
				{#if isConnected}
					<div
						class="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-neutral-900 bg-emerald-500"
					></div>
				{/if}
			</div>
			<div>
				<h3 class="text-sm font-bold text-white/90">{partnerName}</h3>
				<p class="text-[9px] font-medium tracking-widest text-neutral-500 uppercase">
					{isConnected ? 'Active Session' : 'Connecting...'}
				</p>
			</div>
		</div>

		<button
			onclick={onRemove}
			class="group flex h-8 w-8 items-center justify-center rounded-full transition-all hover:bg-white/5"
			title="Close Chat"
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
				class="text-neutral-500 transition-colors group-hover:text-white"
				><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
			>
		</button>
	</div>

	<!-- Messages -->
	<div bind:this={chatContainer} class="flex-grow space-y-4 overflow-y-auto scroll-smooth p-6">
		{#if messages.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center opacity-20">
				<div class="mb-4 rounded-full border border-white/10 p-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" /></svg
					>
				</div>
				<p class="text-xs font-medium tracking-tight">Begin your conversation</p>
			</div>
		{/if}

		{#each messages as msg (msg.id)}
			<div
				in:fly={{ y: 10, duration: 200 }}
				class="flex {msg.senderId === $user?.id ? 'justify-end' : 'justify-start'}"
			>
				<div
					class="max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed
					{msg.senderId === $user?.id
						? 'rounded-tr-none bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/10'
						: 'rounded-tl-none border border-white/5 bg-white/5 text-neutral-300'}"
				>
					{msg.content}
					<p class="mt-1.5 text-[9px] font-medium opacity-40">
						{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Input -->
	<div class="rounded-b-2xl border-t border-white/5 bg-neutral-950/40 p-4">
		<form
			onsubmit={(e) => {
				e.preventDefault();
				sendMessage();
			}}
			class="relative flex items-center gap-2"
		>
			<input
				bind:value={newMessage}
				placeholder="Message {partnerName.split(',')[0]}..."
				class="w-full rounded-xl border border-white/5 bg-white/[0.03] px-5 py-3 text-sm text-white transition-all placeholder:text-neutral-600 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
			/>
			<button
				type="submit"
				disabled={!newMessage.trim()}
				class="absolute right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white transition-all hover:bg-indigo-500 active:scale-95 disabled:opacity-30 disabled:grayscale"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg
				>
			</button>
		</form>
	</div>
</div>
