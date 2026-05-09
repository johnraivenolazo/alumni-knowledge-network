<script lang="ts">
	import { fly } from 'svelte/transition';
	import { GICS_SECTORS, GICS_OPTIONS, type GicsOption } from '../gics';

	interface Props {
		value: string;
		placeholder?: string;
		id?: string;
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(''),
		placeholder = 'Search industries (e.g. Information Technology)',
		id,
		onchange
	}: Props = $props();

	let query = $state(value || '');
	let isOpen = $state(false);
	let inputEl = $state<HTMLInputElement | null>(null);
	let rootEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		// Sync external value changes back into the visible query string.
		if (!isOpen && value !== query) query = value || '';
	});

	function pick(opt: GicsOption) {
		value = opt.value;
		query = opt.value;
		isOpen = false;
		onchange?.(opt.value);
	}

	function clear() {
		value = '';
		query = '';
		onchange?.('');
		inputEl?.focus();
		isOpen = true;
	}

	// Group filtered hits by sector so users can see "if I type IT, here are
	// the IT sub-industries" without losing the sector grouping. Matching is
	// case-insensitive and tries the sector name, the sub-industry name, and
	// the combined `Sector — Sub` value so common abbreviations (e.g. "IT")
	// work even though they aren't in the canonical labels.
	const ABBREVIATIONS: Record<string, string[]> = {
		it: ['Information Technology'],
		tech: ['Information Technology', 'Communication Services'],
		software: ['Information Technology'],
		health: ['Health Care'],
		finance: ['Financials'],
		bank: ['Financials'],
		oil: ['Energy'],
		power: ['Utilities', 'Energy'],
		realty: ['Real Estate'],
		property: ['Real Estate'],
		mining: ['Materials'],
		retail: ['Consumer Discretionary', 'Consumer Staples'],
		media: ['Communication Services', 'Consumer Discretionary']
	};

	function matches(opt: GicsOption, q: string): boolean {
		if (!q) return true;
		const ql = q.toLowerCase().trim();
		if (
			opt.sector.toLowerCase().includes(ql) ||
			opt.subIndustry.toLowerCase().includes(ql) ||
			opt.value.toLowerCase().includes(ql)
		) {
			return true;
		}
		const sectorsForAbbrev = ABBREVIATIONS[ql];
		if (sectorsForAbbrev?.includes(opt.sector)) return true;
		return false;
	}

	const grouped = $derived.by(() => {
		const hits = GICS_OPTIONS.filter((o) => matches(o, query));
		const map = new Map<string, GicsOption[]>();
		for (const sector of GICS_SECTORS) map.set(sector.sector, []);
		for (const h of hits) {
			const arr = map.get(h.sector);
			if (arr) arr.push(h);
		}
		return Array.from(map.entries())
			.filter(([, arr]) => arr.length > 0)
			.map(([sector, opts]) => ({ sector, opts }));
	});

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (rootEl && !rootEl.contains(target)) isOpen = false;
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div bind:this={rootEl} class="relative">
	<div class="relative">
		<input
			bind:this={inputEl}
			{id}
			type="text"
			value={query}
			oninput={(e) => {
				query = (e.target as HTMLInputElement).value;
				isOpen = true;
			}}
			onfocus={() => (isOpen = true)}
			{placeholder}
			autocomplete="off"
			class="w-full appearance-none rounded-xl border border-white/10 bg-neutral-950 px-4 py-3 pr-10 text-sm font-medium text-white shadow-inner shadow-black/40 transition-all placeholder:text-neutral-600 hover:border-red-500/40 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
		/>
		<div
			class="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-2 text-red-400/70"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="transition-transform {isOpen ? 'rotate-180' : ''}"
				><path d="m6 9 6 6 6-6" /></svg
			>
		</div>
		{#if value}
			<button
				type="button"
				onclick={clear}
				class="absolute top-1/2 right-9 -translate-y-1/2 text-[10px] font-bold tracking-widest text-neutral-500 uppercase transition-colors hover:text-red-400"
				aria-label="Clear industry"
			>
				Clear
			</button>
		{/if}
	</div>

	{#if isOpen}
		<div
			in:fly={{ y: 4, duration: 120 }}
			class="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950 p-2 shadow-2xl shadow-black/60 ring-1 ring-red-500/10"
		>
			{#if grouped.length === 0}
				<p class="px-3 py-4 text-center text-xs text-neutral-500 italic">
					No industries match "{query}".
				</p>
			{:else}
				{#each grouped as g (g.sector)}
					<div class="mb-1 last:mb-0">
						<p class="px-3 pt-2 pb-1 text-[9px] font-black tracking-[0.2em] text-red-400/80 uppercase">
							{g.sector}
						</p>
						<div class="flex flex-col">
							{#each g.opts as opt (opt.value)}
								<button
									type="button"
									onclick={() => pick(opt)}
									class="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-neutral-300 transition-colors hover:bg-red-500/10 hover:text-white {value ===
									opt.value
										? 'bg-red-500/15 text-white'
										: ''}"
								>
									<span>{opt.subIndustry}</span>
									{#if value === opt.value}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="3"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="text-red-400"
											><path d="M20 6L9 17l-5-5" /></svg
										>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}
</div>
