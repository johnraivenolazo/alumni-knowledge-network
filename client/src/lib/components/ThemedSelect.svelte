<script lang="ts">
	// A bound, themed wrapper around <select>. The chevron and ring color tie
	// the control to the same red accent the role badges use, so dropdowns
	// no longer look like raw browser chrome on the dark surface.

	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		value: string;
		options: Option[];
		placeholder?: string;
		variant?: 'panel' | 'underline';
		size?: 'sm' | 'md';
		id?: string;
		ariaLabel?: string;
		onchange?: (value: string) => void;
	}

	let {
		value = $bindable(),
		options,
		placeholder,
		variant = 'panel',
		size = 'md',
		id,
		ariaLabel,
		onchange
	}: Props = $props();

	function handleChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		value = target.value;
		onchange?.(target.value);
	}

	const panelSize =
		size === 'sm'
			? 'px-3 py-2 text-xs pr-9'
			: 'px-4 py-3 text-sm pr-10';
</script>

<div class="relative">
	<select
		{id}
		aria-label={ariaLabel}
		{value}
		onchange={handleChange}
		class={variant === 'panel'
			? `w-full appearance-none rounded-xl border border-white/10 bg-neutral-950 ${panelSize} font-medium text-white shadow-inner shadow-black/40 transition-all hover:border-red-500/40 focus:border-red-500/60 focus:ring-2 focus:ring-red-500/20 focus:outline-none`
			: 'w-full appearance-none border-b border-white/15 bg-transparent pt-4 pr-7 pb-3 text-sm text-white transition-colors hover:border-red-500/40 focus:border-red-500 focus:outline-none'}
	>
		{#if placeholder}
			<option value="" class="bg-neutral-950 text-neutral-500">{placeholder}</option>
		{/if}
		{#each options as opt (opt.value)}
			<option value={opt.value} class="bg-neutral-950 text-white">{opt.label}</option>
		{/each}
	</select>
	<div
		class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-red-400/70"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width={size === 'sm' ? '12' : '14'}
			height={size === 'sm' ? '12' : '14'}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
		>
	</div>
</div>
