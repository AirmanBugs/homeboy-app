<script lang="ts">
	import { onMount } from 'svelte';
	import {
		calculateSolarTimes,
		getTimeOfDay,
		getSunPosition,
		getMoonPhase,
		type TimeOfDay
	} from '$lib/utils/solarCalc';

	interface Props {
		lat: number;
		lon: number;
		weather?: {
			symbolCode: string;
			precipitation: number;
			cloudCover: number;
		};
	}

	let { lat, lon, weather }: Props = $props();

	let currentTime = $state(new Date());
	let timeOfDay = $state<TimeOfDay>('day');
	let sunPosition = $state({ altitude: 50, azimuth: 90 });
	let moonPhase = $state(0);

	// Update time every minute
	onMount(() => {
		updateTimeData();
		const interval = setInterval(updateTimeData, 60000);
		return () => clearInterval(interval);
	});

	function updateTimeData() {
		currentTime = new Date();
		const solarTimes = calculateSolarTimes(currentTime, lat, lon);
		timeOfDay = getTimeOfDay(currentTime, solarTimes);
		sunPosition = getSunPosition(currentTime, solarTimes);
		moonPhase = getMoonPhase(currentTime);
	}

	// Background gradient based on time of day
	const backgroundGradient = $derived.by(() => {
		switch (timeOfDay) {
			case 'night':
				return 'linear-gradient(to bottom, #0f172a 0%, #1e293b 50%, #334155 100%)';
			case 'dawn':
				return 'linear-gradient(to bottom, #312e81 0%, #ec4899 30%, #fb923c 60%, #fbbf24 100%)';
			case 'day':
				if (weather && weather.cloudCover > 70) {
					return 'linear-gradient(to bottom, #64748b 0%, #94a3b8 50%, #cbd5e1 100%)';
				}
				return 'linear-gradient(to bottom, #0ea5e9 0%, #38bdf8 40%, #7dd3fc 100%)';
			case 'dusk':
				return 'linear-gradient(to bottom, #7c3aed 0%, #db2777 30%, #f97316 60%, #fbbf24 100%)';
			default:
				return 'linear-gradient(to bottom, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)';
		}
	});

	// Check if we should show celestial bodies
	const showSun = $derived(timeOfDay === 'dawn' || timeOfDay === 'day' || timeOfDay === 'dusk');
	const showMoon = $derived(timeOfDay === 'night' || timeOfDay === 'dawn' || timeOfDay === 'dusk');
	const showStars = $derived(timeOfDay === 'night');

	// Weather effects
	const isRaining = $derived(
		weather && (weather.symbolCode.includes('rain') || weather.precipitation > 0)
	);
	const isCloudy = $derived(weather && weather.cloudCover > 50);

	// Generate random stars (reduced for performance)
	const stars = Array.from({ length: 30 }, (_, i) => ({
		id: i,
		x: Math.random() * 100,
		y: Math.random() * 60,
		size: Math.random() * 2 + 1,
		delay: Math.random() * 3
	}));

	// Generate raindrops (reduced for performance)
	const raindrops = Array.from({ length: 20 }, (_, i) => ({
		id: i,
		x: Math.random() * 100,
		delay: Math.random() * 2,
		duration: Math.random() * 0.5 + 0.5
	}));
</script>

<div class="dynamic-background" style="background: {backgroundGradient}">
	<!-- Stars (night time) -->
	{#if showStars}
		<div class="stars">
			{#each stars as star (star.id)}
				<div
					class="star"
					style="left: {star.x}%; top: {star.y}%; width: {star.size}px; height: {star.size}px; animation-delay: {star.delay}s"
				></div>
			{/each}
		</div>
	{/if}

	<!-- Sun -->
	{#if showSun && sunPosition.altitude > 0}
		<div
			class="sun"
			style="left: {sunPosition.azimuth / 180 * 100}%; bottom: {sunPosition.altitude}%"
		>
			<div class="sun-glow"></div>
			<div class="sun-core"></div>
		</div>
	{/if}

	<!-- Moon -->
	{#if showMoon}
		<div class="moon" style="right: 15%; top: 20%">
			<div class="moon-sphere" style="--phase: {moonPhase}"></div>
		</div>
	{/if}

	<!-- Clouds (when cloudy) -->
	{#if isCloudy}
		<div class="clouds">
			<div class="cloud cloud-1"></div>
			<div class="cloud cloud-2"></div>
			<div class="cloud cloud-3"></div>
		</div>
	{/if}

	<!-- Rain (when raining) -->
	{#if isRaining}
		<div class="rain">
			{#each raindrops as drop (drop.id)}
				<div
					class="raindrop"
					style="left: {drop.x}%; animation-delay: {drop.delay}s; animation-duration: {drop.duration}s"
				></div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dynamic-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: -1;
		transition: background 2s ease-in-out;
		overflow: hidden;
	}

	/* Stars */
	.stars {
		position: absolute;
		width: 100%;
		height: 100%;
	}

	.star {
		position: absolute;
		background: white;
		border-radius: 50%;
		animation: twinkle 3s infinite ease-in-out;
		will-change: opacity;
	}

	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}

	/* Sun */
	.sun {
		position: absolute;
		width: 100px;
		height: 100px;
		transform: translate(-50%, 50%);
		transition: left 1s ease-in-out, bottom 1s ease-in-out;
	}

	.sun-core {
		position: absolute;
		width: 100%;
		height: 100%;
		background: radial-gradient(circle, #fbbf24 0%, #f59e0b 100%);
		border-radius: 50%;
		box-shadow: 0 0 40px #fbbf24;
	}

	.sun-glow {
		position: absolute;
		width: 150%;
		height: 150%;
		top: -25%;
		left: -25%;
		background: radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, transparent 70%);
		border-radius: 50%;
		animation: pulse 4s infinite ease-in-out;
		will-change: transform, opacity;
	}

	@keyframes pulse {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.5;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.8;
		}
	}

	/* Moon */
	.moon {
		position: absolute;
		width: 80px;
		height: 80px;
	}

	.moon-sphere {
		width: 100%;
		height: 100%;
		background: radial-gradient(circle at 30% 30%, #f8fafc 0%, #cbd5e1 100%);
		border-radius: 50%;
		box-shadow: 0 0 30px rgba(248, 250, 252, 0.3);
		position: relative;
	}

	.moon-sphere::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		width: 100%;
		height: 100%;
		background: radial-gradient(circle, #0f172a 0%, transparent 100%);
		border-radius: 50%;
		opacity: calc(1 - abs(0.5 - var(--phase)) * 2);
	}

	/* Clouds */
	.clouds {
		position: absolute;
		width: 100%;
		height: 100%;
		opacity: 0.6;
	}

	.cloud {
		position: absolute;
		background: white;
		border-radius: 100px;
		opacity: 0.8;
		animation: float-cloud 60s infinite linear;
		will-change: transform;
	}

	.cloud::before,
	.cloud::after {
		content: '';
		position: absolute;
		background: white;
		border-radius: 100px;
	}

	.cloud-1 {
		width: 200px;
		height: 60px;
		top: 15%;
		left: -200px;
	}

	.cloud-1::before {
		width: 100px;
		height: 100px;
		top: -50px;
		left: 50px;
	}

	.cloud-1::after {
		width: 120px;
		height: 80px;
		top: -40px;
		right: 50px;
	}

	.cloud-2 {
		width: 150px;
		height: 50px;
		top: 35%;
		left: -150px;
		animation-delay: -20s;
		animation-duration: 80s;
	}

	.cloud-2::before {
		width: 80px;
		height: 80px;
		top: -40px;
		left: 40px;
	}

	.cloud-2::after {
		width: 100px;
		height: 60px;
		top: -30px;
		right: 40px;
	}

	.cloud-3 {
		width: 180px;
		height: 55px;
		top: 60%;
		left: -180px;
		animation-delay: -40s;
		animation-duration: 70s;
	}

	.cloud-3::before {
		width: 90px;
		height: 90px;
		top: -45px;
		left: 45px;
	}

	.cloud-3::after {
		width: 110px;
		height: 70px;
		top: -35px;
		right: 45px;
	}

	@keyframes float-cloud {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(calc(100vw + 200px));
		}
	}

	/* Rain */
	.rain {
		position: absolute;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.raindrop {
		position: absolute;
		width: 2px;
		height: 20px;
		background: linear-gradient(to bottom, transparent, rgba(147, 197, 253, 0.6));
		animation: fall 1s linear infinite;
		top: -20px;
		will-change: transform, opacity;
	}

	@keyframes fall {
		0% {
			transform: translateY(0);
			opacity: 1;
		}
		100% {
			transform: translateY(100vh);
			opacity: 0.3;
		}
	}
</style>
