<script lang="ts">
	import { onMount } from 'svelte';
	import Settings from '$lib/components/Settings.svelte';
	import { language } from '$lib/stores/language';
	import { t } from '$lib/i18n/translations';

	let currentTime = $state(new Date());
	let isSettingsOpen = $state(false);

	const currentLang = $derived($language);

	onMount(() => {
		const interval = setInterval(() => {
			currentTime = new Date();
		}, 1000);

		return () => clearInterval(interval);
	});

	const formattedDate = $derived(
		currentTime.toLocaleDateString('nb-NO', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	);

	const formattedTime = $derived(
		currentTime.toLocaleTimeString('nb-NO', {
			hour: '2-digit',
			minute: '2-digit'
		})
	);
</script>

<svelte:head>
	<title>{t(currentLang, 'title')}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
	<div class="max-w-6xl mx-auto">
		<!-- Settings button -->
		<div class="flex justify-end mb-4">
			<button
				onclick={() => (isSettingsOpen = true)}
				class="p-3 rounded-full bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 transition-colors"
				aria-label={t(currentLang, 'settings')}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			</button>
		</div>

		<!-- Header with date and time -->
		<header class="mb-12 text-center">
			<h1 class="text-6xl font-bold mb-4">{formattedTime}</h1>
			<p class="text-2xl text-slate-300">{formattedDate}</p>
		</header>

		<!-- Main dashboard grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			<!-- Weather widget placeholder -->
			<div class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
				<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
					<span>🌤️</span>
					{t(currentLang, 'weather')}
				</h2>
				<p class="text-slate-400">{t(currentLang, 'weatherComingSoon')}</p>
			</div>

			<!-- Calendar widget placeholder -->
			<div class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
				<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
					<span>📅</span>
					{t(currentLang, 'upcomingEvents')}
				</h2>
				<p class="text-slate-400">{t(currentLang, 'calendarComingSoon')}</p>
			</div>

			<!-- Commute widget placeholder -->
			<div class="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
				<h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
					<span>🚇</span>
					{t(currentLang, 'commuteInfo')}
				</h2>
				<p class="text-slate-400">{t(currentLang, 'transitComingSoon')}</p>
			</div>
		</div>
	</div>
</div>

<Settings isOpen={isSettingsOpen} onClose={() => (isSettingsOpen = false)} />
