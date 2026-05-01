<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { io, Socket } from 'socket.io-client';
	import { fly, fade } from 'svelte/transition';
	import { user, getToken } from '$lib/authService';
	import { type Message } from '$lib/types';

	let { requestId, receiverId, partnerName, initialMessages = [] } = $props();

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
		if (!newMessage.trim() || !socket) {
			console.log('Cannot send: ', { msg: newMessage, socket: !!socket });
			return;
		}
		
		const msgPayload = {
			requestId,
			senderId: $user?.id,
			receiverId,
			content: newMessage
		};

		console.log('Sending message: ', msgPayload);
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

<div class="flex h-[500px] flex-col rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-xl">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
		<div class="flex items-center gap-3">
			<div class="relative">
				<div class="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
					{partnerName?.[0] || '?'}
				</div>
				{#if isConnected}
					<div class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-neutral-900 bg-emerald-500"></div>
				{/if}
			</div>
			<div>
				<h3 class="text-sm font-bold text-white">{partnerName}</h3>
				<p class="text-[10px] text-neutral-500 uppercase tracking-widest">
					{isConnected ? 'Live Session' : 'Connecting...'}
				</p>
			</div>
		</div>
	</div>

	<!-- Messages -->
	<div 
		bind:this={chatContainer}
		class="flex-grow overflow-y-auto p-6 space-y-4 scroll-smooth"
	>
		{#if messages.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center opacity-40">
				<div class="mb-4 rounded-full bg-neutral-800 p-4">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
				</div>
				<p class="text-sm">No messages yet.<br>Start the conversation!</p>
			</div>
		{/if}

		{#each messages as msg (msg.id)}
			<div 
				in:fly={{ y: 10, duration: 300 }}
				class="flex {msg.senderId === $user?.id ? 'justify-end' : 'justify-start'}"
			>
				<div class="max-w-[80%] rounded-2xl px-4 py-2 text-sm
					{msg.senderId === $user?.id 
						? 'bg-indigo-600 text-white rounded-tr-none' 
						: 'bg-neutral-800 text-neutral-200 rounded-tl-none'}"
				>
					{msg.content}
					<p class="mt-1 text-[9px] opacity-50">
						{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					</p>
				</div>
			</div>
		{/each}
	</div>

	<!-- Input -->
	<div class="border-t border-neutral-800 p-4">
		<form 
			onsubmit={(e) => { e.preventDefault(); sendMessage(); }}
			class="relative flex items-center gap-2"
		>
			<input 
				bind:value={newMessage}
				placeholder="Type a message..."
				class="w-full rounded-full border border-neutral-800 bg-neutral-950 px-5 py-3 text-sm text-white transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
			/>
			<button 
				type="submit"
				disabled={!newMessage.trim()}
				class="absolute right-2 rounded-full bg-indigo-600 p-2 text-white transition-all hover:bg-indigo-500 active:scale-90 disabled:opacity-50 disabled:grayscale"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
			</button>
		</form>
	</div>
</div>
