<script lang="ts">
	import type { WeatherData } from '$lib/types/weather';
	import { language } from '$lib/stores/language';
	import { t } from '$lib/i18n/translations';
	import { onMount } from 'svelte';
	import PrecipitationGraph from './PrecipitationGraph.svelte';

	let weatherData = $state<WeatherData | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let lastFetch = $state<Date | null>(null);
	let currentCoords = $state<{ lat: number; lon: number } | null>(null);
	let usingDefaultLocation = $state(true);

	const currentLang = $derived($language);

	// Default to Oslo
	const DEFAULT_LAT = 59.9139;
	const DEFAULT_LON = 10.7522;

	// Refresh every 10 minutes (MET Norway recommends not more frequent than this)
	const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

	// Map MET weather symbols to emojis
	const getWeatherEmoji = (symbolCode: string): string => {
		if (symbolCode.includes('clearsky')) return '☀️';
		if (symbolCode.includes('fair')) return '🌤️';
		if (symbolCode.includes('partlycloudy')) return '⛅';
		if (symbolCode.includes('cloudy')) return '☁️';
		if (symbolCode.includes('rain')) return '🌧️';
		if (symbolCode.includes('snow')) return '❄️';
		if (symbolCode.includes('sleet')) return '🌨️';
		if (symbolCode.includes('thunder')) return '⛈️';
		if (symbolCode.includes('fog')) return '🌫️';
		return '🌤️';
	};

	// Get wind arrow rotation - arrow points in direction wind is blowing TO
	const getWindArrowRotation = (degrees: number): number => {
		return degrees + 180; // Add 180 because wind direction is where it comes FROM
	};

	// Update time display every minute
	let currentTime = $state(new Date());

	const getTimeSinceUpdate = $derived.by(() => {
		if (!lastFetch) return '';
		// Force reactivity by referencing currentTime
		currentTime;
		const now = new Date();
		const diffMs = now.getTime() - lastFetch.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) {
			return currentLang === 'en' ? 'Just now' : 'Akkurat nå';
		} else if (diffMins === 1) {
			return currentLang === 'en' ? '1 min ago' : '1 min siden';
		} else {
			return currentLang === 'en' ? `${diffMins} mins ago` : `${diffMins} min siden`;
		}
	});

	// Get precipitation summary for next 6 hours
	const getPrecipitationSummary = $derived.by(() => {
		if (!weatherData) return null;
		const totalPrecip = weatherData.forecast.slice(0, 6).reduce((sum, h) => sum + h.precipitation, 0);
		if (totalPrecip === 0) return null;

		const rainHours = weatherData.forecast.slice(0, 6).filter(h => h.precipitation > 0);
		if (rainHours.length === 0) return null;

		const firstRain = rainHours[0];
		const firstHour = new Date(firstRain.time).getHours();

		return {
			total: totalPrecip,
			firstHour,
			count: rainHours.length
		};
	});

	const fetchWeather = async (lat: number, lon: number, silent: boolean = false) => {
		try {
			if (!silent) loading = true;
			error = null;
			const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);

			if (!response.ok) {
				throw new Error('Failed to fetch weather');
			}

			weatherData = await response.json();
			currentCoords = { lat, lon };
			lastFetch = new Date();
		} catch (err) {
			if (!silent) {
				error = currentLang === 'en' ? 'Failed to load weather' : 'Kunne ikke laste værdata';
			}
			console.error('Weather fetch error:', err);
		} finally {
			if (!silent) loading = false;
		}
	};

	const refreshWeather = () => {
		if (currentCoords) {
			// Silent refresh - don't show loading spinner
			fetchWeather(currentCoords.lat, currentCoords.lon, true);
		}
	};

	const requestLocation = () => {
		if (!navigator.geolocation) {
			return;
		}

		// Try to get actual location in the background
		navigator.geolocation.getCurrentPosition(
			(position) => {
				usingDefaultLocation = false;
				fetchWeather(position.coords.latitude, position.coords.longitude, true);
			},
			(err) => {
				console.log('Geolocation unavailable, using default location:', err.message);
				// Keep using default location, don't show error
			},
			{
				enableHighAccuracy: false,
				timeout: 10000,
				maximumAge: 300000 // Cache for 5 minutes
			}
		);
	};

	onMount(() => {
		// Start with Oslo immediately
		fetchWeather(DEFAULT_LAT, DEFAULT_LON);

		// Try to get actual location in background
		requestLocation();

		// Update current time every minute for "time since update" display
		const timeInterval = setInterval(() => {
			currentTime = new Date();
		}, 60000);

		// Set up auto-refresh every 10 minutes
		const refreshInterval = setInterval(() => {
			refreshWeather();
		}, REFRESH_INTERVAL);

		// Cleanup intervals on component unmount
		return () => {
			clearInterval(timeInterval);
			clearInterval(refreshInterval);
		};
	});
</script>

<div class="h-full flex flex-col">
	{#if loading}
		<div class="flex items-center justify-center h-full">
			<div class="text-slate-400">
				{currentLang === 'en' ? 'Loading weather...' : 'Laster værdata...'}
			</div>
		</div>
	{:else if weatherData}
		<!-- Location indicator -->
		{#if usingDefaultLocation}
			<div class="mb-3 text-xs text-slate-500 flex items-center gap-1">
				<span>📍</span>
				{t(currentLang, 'usingDefaultLocation')}
			</div>
		{/if}
		<!-- Current Weather -->
		<div class="flex items-center justify-between mb-4">
			<div>
				<div class="text-5xl font-bold">{Math.round(weatherData.current.temperature)}°</div>
				<div class="text-sm text-slate-400 mt-1">
					{currentLang === 'en' ? 'Feels like' : 'Føles som'} {Math.round(weatherData.current.temperature)}°
				</div>
			</div>
			<div
				class="text-6xl cursor-help"
				title={weatherData.current.symbolCode.replace(/_/g, ' ').replace(/day|night/g, '').trim()}
			>
				{getWeatherEmoji(weatherData.current.symbolCode)}
			</div>
		</div>

		<!-- Precipitation Alert -->
		{#if getPrecipitationSummary}
			<div class="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
				<div class="flex items-center gap-2 text-sm">
					<span class="text-lg">💧</span>
					<span class="text-blue-200">
						{#if currentLang === 'en'}
							{getPrecipitationSummary.total.toFixed(1)}mm rain expected (starting around {getPrecipitationSummary.firstHour}:00)
						{:else}
							{getPrecipitationSummary.total.toFixed(1)}mm regn ventet (starter rundt {getPrecipitationSummary.firstHour}:00)
						{/if}
					</span>
				</div>
			</div>
		{/if}

		<!-- Precipitation Graph -->
		<div class="mb-4 p-4 bg-slate-700/30 border border-slate-600 rounded-xl">
			<h3 class="text-sm font-semibold mb-3 text-slate-300">{t(currentLang, 'precipitationGraph')}</h3>
			<PrecipitationGraph lat={weatherData.location.lat} lon={weatherData.location.lon} />
		</div>

		<!-- Current Details -->
		<div class="grid grid-cols-2 gap-3 mb-4 text-sm">
			<div
				class="flex items-center gap-2 cursor-help"
				title={currentLang === 'en' ? 'Wind speed and direction' : 'Vindhastighet og retning'}
			>
				<span>💨</span>
				<span class="text-slate-300 flex items-center gap-1">
					{weatherData.current.windSpeed} m/s
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4 text-slate-400"
						fill="currentColor"
						viewBox="0 0 24 24"
						style="transform: rotate({getWindArrowRotation(weatherData.current.windDirection)}deg)"
					>
						<path d="M12 2l-8 8h5v10h6V10h5z" />
					</svg>
				</span>
			</div>
			<div
				class="flex items-center gap-2 cursor-help"
				title={currentLang === 'en' ? 'Cloud coverage' : 'Skydekke'}
			>
				<span>☁️</span>
				<span class="text-slate-300">{Math.round(weatherData.current.cloudCover)}%</span>
			</div>
			<div
				class="flex items-center gap-2 cursor-help"
				title={currentLang === 'en' ? 'Precipitation next hour' : 'Nedbør neste time'}
			>
				<span>💧</span>
				<span class="text-slate-300">{weatherData.current.precipitation} mm</span>
			</div>
			<div
				class="flex items-center gap-2 cursor-help"
				title={currentLang === 'en' ? 'Relative humidity' : 'Relativ luftfuktighet'}
			>
				<span>💦</span>
				<span class="text-slate-300">{Math.round(weatherData.current.humidity)}%</span>
			</div>
			{#if weatherData.current.fog > 0}
				<div
					class="flex items-center gap-2 col-span-2 cursor-help"
					title={currentLang === 'en' ? 'Fog coverage' : 'Tåkedekke'}
				>
					<span>🌫️</span>
					<span class="text-slate-300">
						{currentLang === 'en' ? 'Fog' : 'Tåke'} {Math.round(weatherData.current.fog)}%
					</span>
				</div>
			{/if}
		</div>

		<!-- Forecast -->
		<div class="mt-auto pt-4 border-t border-slate-700">
			<div class="flex justify-between items-center mb-2">
				<div class="text-xs font-semibold text-slate-400">
					{currentLang === 'en' ? 'Next 6 hours' : 'Neste 6 timer'}
				</div>
				{#if lastFetch}
					<div class="text-xs text-slate-500">
						{getTimeSinceUpdate}
					</div>
				{/if}
			</div>
			<div class="flex gap-2 overflow-x-auto pb-1">
				{#each weatherData.forecast.slice(0, 6) as hour}
					<div
						class="flex flex-col items-center min-w-[56px] cursor-help"
						title={currentLang === 'en'
							? `${new Date(hour.time).getHours()}:00 - ${Math.round(hour.temperature)}°C, Wind: ${hour.windSpeed}m/s${hour.precipitation > 0 ? `, Rain: ${hour.precipitation}mm` : ''}`
							: `${new Date(hour.time).getHours()}:00 - ${Math.round(hour.temperature)}°C, Vind: ${hour.windSpeed}m/s${hour.precipitation > 0 ? `, Regn: ${hour.precipitation}mm` : ''}`}
					>
						<div class="text-xs text-slate-400">
							{new Date(hour.time).getHours()}:00
						</div>
						<div class="text-2xl my-1">{getWeatherEmoji(hour.symbolCode)}</div>
						<div class="text-sm font-semibold">{Math.round(hour.temperature)}°</div>
						<div class="flex items-center gap-0.5 text-xs text-slate-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3 w-3"
								fill="currentColor"
								viewBox="0 0 24 24"
								style="transform: rotate({getWindArrowRotation(hour.windDirection)}deg)"
							>
								<path d="M12 2l-8 8h5v10h6V10h5z" />
							</svg>
							<span>{hour.windSpeed.toFixed(1)}</span>
						</div>
						{#if hour.precipitation > 0}
							<div class="text-xs text-blue-300 flex items-center gap-0.5">
								<span>💧</span>{hour.precipitation}mm
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
