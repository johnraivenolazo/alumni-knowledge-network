<script lang="ts">
	let { class: className = '', variant = 'rect' } = $props<{
		class?: string;
		variant?: 'rect' | 'circle' | 'text';
	}>();

	const baseClass = 'animate-pulse bg-neutral-800/50';
	const variantClass = {
		rect: 'rounded-xl',
		circle: 'rounded-full',
		text: 'rounded h-4 w-full'
	}[variant];
</script>

<div class="{baseClass} {variantClass} {className}"></div>
