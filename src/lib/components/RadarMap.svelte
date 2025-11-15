<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { language } from '$lib/stores/language';

	interface RadarFrame {
		time: string;
		imageUrl: string;
	}

	let frames = $state<RadarFrame[]>([]);
	let currentFrameIndex = $state(0);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentLang = $derived($language);
	let refreshInterval: number | null = null;
	let animationInterval: number | null = null;

	const translations = {
		en: {
			loading: 'Loading radar...',
			error: 'Failed to load radar data'
		},
		no: {
			loading: 'Laster radar...',
			error: 'Kunne ikke laste radardata'
		}
	};

	const t = (lang: 'en' | 'no', key: keyof typeof translations.en): string => {
		return translations[lang][key];
	};

	const formatTimestamp = (isoString: string): string => {
		const date = new Date(isoString);
		return date.toLocaleTimeString(currentLang === 'no' ? 'nb-NO' : 'en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	};

	const loadRadarFrames = async () => {
		try {
			loading = true;
			error = null;

			const response = await fetch('/api/radar/frames?area=southeastern_norway&type=5level_reflectivity');
			if (!response.ok) {
				throw new Error('Failed to fetch radar frames');
			}

			const data = await response.json();
			frames = data.frames || [];

			if (frames.length > 0) {
				currentFrameIndex = 0;
			}

			loading = false;
		} catch (err) {
			error = currentLang === 'en'
				? 'Failed to load radar data'
				: 'Kunne ikke laste radardata';
			console.error('Radar fetch error:', err);
			loading = false;
		}
	};

	const startAnimation = () => {
		if (animationInterval) return;

		animationInterval = window.setInterval(() => {
			currentFrameIndex = (currentFrameIndex + 1) % frames.length;
		}, 500);
	};

	onMount(async () => {
		await loadRadarFrames();

		if (frames.length > 0) {
			startAnimation();
		}

		refreshInterval = window.setInterval(() => {
			loadRadarFrames();
		}, 5 * 60 * 1000);
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
		if (animationInterval) {
			clearInterval(animationInterval);
		}
	});
</script>

<div class="relative w-full rounded-xl overflow-hidden">
	{#if loading}
		<div class="absolute inset-0 bg-slate-900/70 flex items-center justify-center z-10">
			<div class="text-slate-300">{t(currentLang, 'loading')}</div>
		</div>
	{/if}
	{#if error}
		<div class="absolute inset-0 bg-slate-900/70 flex items-center justify-center z-10">
			<div class="text-red-400">{error}</div>
		</div>
	{/if}
	{#if frames.length > 0 && !loading}
		<img
			src={frames[currentFrameIndex].imageUrl}
			alt="Weather radar"
			class="w-full h-auto"
		/>

		<!-- Timeline and timestamp overlay -->
		<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/90 via-slate-900/70 to-transparent pt-8 pb-3 px-3">
			<!-- Timestamp (right aligned, above timeline) -->
			<div class="flex justify-end mb-2">
				<div class="bg-slate-900/80 px-2 py-1 rounded text-xs text-slate-200 font-mono">
					{formatTimestamp(frames[currentFrameIndex].time)}
				</div>
			</div>

			<!-- Timeline -->
			<div class="flex items-center gap-0.5">
				{#each frames as frame, index}
					<div
						class="flex-1 h-1 rounded-full transition-all cursor-pointer"
						class:bg-blue-400={index === currentFrameIndex}
						class:bg-slate-500={index !== currentFrameIndex}
						onclick={() => currentFrameIndex = index}
						title={formatTimestamp(frame.time)}
					></div>
				{/each}
			</div>
		</div>
	{/if}
</div>
