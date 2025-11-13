<script lang="ts">
	import { language } from '$lib/stores/language';
	import { settings } from '$lib/stores/settings';

	interface Props {
		lat: number;
		lon: number;
	}

	let { lat, lon }: Props = $props();

	interface NowcastData {
		time: string;
		precipitation: number;
	}

	let nowcastData = $state<NowcastData[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const currentLang = $derived($language);
	const nowcastMinutes = $derived($settings.nowcastMinutes);

	const filteredData = $derived.by(() => {
		if (!nowcastData.length) return [];
		const now = new Date();
		const endTime = new Date(now.getTime() + nowcastMinutes * 60 * 1000);

		return nowcastData.filter((entry) => {
			const entryTime = new Date(entry.time);
			return entryTime >= now && entryTime <= endTime;
		});
	});

	const maxPrecipitation = $derived(
		filteredData.length > 0 ? Math.max(...filteredData.map((d) => d.precipitation), 0.5) : 1
	);

	const fetchNowcast = async () => {
		try {
			loading = true;
			error = null;
			const response = await fetch(`/api/nowcast?lat=${lat}&lon=${lon}`);

			if (!response.ok) {
				throw new Error('Failed to fetch nowcast');
			}

			nowcastData = await response.json();
		} catch (err) {
			error = currentLang === 'en' ? 'Failed to load precipitation forecast' : 'Kunne ikke laste nedbørsvarsel';
			console.error('Nowcast fetch error:', err);
		} finally {
			loading = false;
		}
	};

	$effect(() => {
		// Re-fetch when coordinates change
		fetchNowcast();
	});

	// Get time label for x-axis
	const getTimeLabel = (time: string): string | null => {
		const date = new Date(time);
		const minutes = date.getMinutes();

		// Show label every 15 minutes
		if (minutes % 15 === 0) {
			return `${date.getHours()}:${minutes.toString().padStart(2, '0')}`;
		}
		return null;
	};

	const hasPrecipitation = $derived(filteredData.some((d) => d.precipitation > 0));
</script>

<div class="precipitation-graph">
	{#if loading}
		<div class="flex items-center justify-center py-8 text-slate-400 text-sm">
			{currentLang === 'en' ? 'Loading precipitation data...' : 'Laster nedbørsdata...'}
		</div>
	{:else if error}
		<div class="py-4 text-center text-slate-400 text-sm">{error}</div>
	{:else if !hasPrecipitation}
		<div class="py-6 text-center text-slate-300 flex items-center justify-center gap-2">
			<span class="text-2xl">☀️</span>
			<span>{currentLang === 'en' ? 'No rain expected' : 'Ingen regn ventet'}</span>
		</div>
	{:else}
		<div class="relative h-32">
			<!-- Y-axis labels -->
			<div class="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-slate-400">
				<div>{maxPrecipitation.toFixed(1)}mm</div>
				<div>0mm</div>
			</div>

			<!-- Graph area -->
			<div class="absolute left-12 right-0 top-0 bottom-6 flex items-end gap-[2px]">
				{#each filteredData as entry}
					{@const height = (entry.precipitation / maxPrecipitation) * 100}
					<div class="flex-1 flex flex-col items-center">
						<div
							class="w-full bg-blue-400 rounded-t transition-all cursor-help"
							style="height: {height}%"
							title="{new Date(entry.time).toLocaleTimeString(currentLang === 'en' ? 'en-US' : 'nb-NO', {
								hour: '2-digit',
								minute: '2-digit'
							})}: {entry.precipitation.toFixed(1)}mm"
						></div>
					</div>
				{/each}
			</div>

			<!-- X-axis time labels -->
			<div class="absolute left-12 right-0 bottom-0 h-6 flex items-end">
				{#each filteredData as entry}
					{@const label = getTimeLabel(entry.time)}
					<div class="flex-1 flex justify-center">
						{#if label}
							<span class="text-xs text-slate-400">{label}</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.precipitation-graph {
		width: 100%;
	}
</style>
