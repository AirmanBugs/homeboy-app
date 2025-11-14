<script lang="ts">
	import { language, type Language } from '$lib/stores/language';
	import { settings } from '$lib/stores/settings';
	import { t } from '$lib/i18n/translations';
	import type { CalendarSource } from '$lib/types/calendar';
	import { onMount } from 'svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	const currentLang = $derived($language);
	const currentSettings = $derived($settings);

	let calendarSources = $state<CalendarSource[]>([]);
	let loadingCalendars = $state(false);
	let isAuthenticated = $state(false);
	let checkingAuth = $state(true);

	const handleLanguageChange = (lang: Language) => {
		language.set(lang);
	};

	const handleNowcastChange = (minutes: number) => {
		settings.update(s => ({ ...s, nowcastMinutes: minutes }));
	};

	const handleCalendarToggle = (calendarId: string) => {
		settings.update(s => {
			const enabled = s.enabledCalendars;

			// If empty, it means all calendars are enabled by default
			// When toggling for the first time, we need to explicitly enable all except the one being toggled
			if (enabled.length === 0) {
				const allIds = calendarSources.map(c => c.id);
				return {
					...s,
					enabledCalendars: allIds.filter(id => id !== calendarId)
				};
			}

			// If calendar is currently enabled, remove it
			if (enabled.includes(calendarId)) {
				return {
					...s,
					enabledCalendars: enabled.filter(id => id !== calendarId)
				};
			}

			// Otherwise, add it
			return {
				...s,
				enabledCalendars: [...enabled, calendarId]
			};
		});
	};

	const isCalendarEnabled = (calendarId: string): boolean => {
		// If enabledCalendars is empty, all calendars are enabled by default
		if (currentSettings.enabledCalendars.length === 0) {
			return true;
		}
		return currentSettings.enabledCalendars.includes(calendarId);
	};

	const handleGoogleLogin = () => {
		window.location.href = '/api/auth/login';
	};

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			isAuthenticated = false;
			calendarSources = [];
		} catch (error) {
			console.error('Logout error:', error);
		}
	};

	const checkAuthStatus = async () => {
		checkingAuth = true;
		try {
			const response = await fetch('/api/auth/status');
			const data = await response.json();
			isAuthenticated = data.authenticated;
		} catch (error) {
			console.error('Auth status check error:', error);
			isAuthenticated = false;
		} finally {
			checkingAuth = false;
		}
	};

	const fetchCalendarSources = async () => {
		if (!isAuthenticated) return;

		loadingCalendars = true;
		try {
			const response = await fetch('/api/calendar/sources');
			if (response.ok) {
				calendarSources = await response.json();
			} else if (response.status === 401) {
				isAuthenticated = false;
			}
		} catch (error) {
			console.error('Failed to fetch calendar sources:', error);
		} finally {
			loadingCalendars = false;
		}
	};

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const nowcastOptions = [60, 90, 120];

	onMount(async () => {
		await checkAuthStatus();
		if (isAuthenticated) {
			await fetchCalendarSources();
		}
	});
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		role="button"
		tabindex="-1"
	>
		<div class="bg-slate-800 rounded-2xl max-w-md w-full border border-slate-600 shadow-2xl max-h-[90vh] flex flex-col">
			<div class="flex justify-between items-center p-8 pb-4 flex-shrink-0">
				<h2 class="text-3xl font-bold text-white">{t(currentLang, 'settings')}</h2>
				<button
					onclick={onClose}
					class="text-slate-300 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg"
					aria-label={t(currentLang, 'close')}
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
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div class="space-y-6 px-8 pb-8 overflow-y-auto flex-1">
				<div>
					<h3 class="text-xl font-semibold mb-4 text-white">{t(currentLang, 'language')}</h3>
					<div class="space-y-3">
						<button
							onclick={() => handleLanguageChange('en')}
							class="w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all {currentLang ===
							'en'
								? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20'
								: 'bg-slate-700/30 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'}"
						>
							<span class="text-4xl">🇬🇧</span>
							<div class="flex-1 text-left">
								<div class="text-lg font-semibold text-white">{t(currentLang, 'english')}</div>
								<div class="text-sm text-slate-300">English</div>
							</div>
							{#if currentLang === 'en'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 text-blue-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="3"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{/if}
						</button>

						<button
							onclick={() => handleLanguageChange('no')}
							class="w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all {currentLang ===
							'no'
								? 'bg-blue-500/20 border-blue-500 shadow-lg shadow-blue-500/20'
								: 'bg-slate-700/30 border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'}"
						>
							<span class="text-4xl">🇳🇴</span>
							<div class="flex-1 text-left">
								<div class="text-lg font-semibold text-white">{t(currentLang, 'norwegian')}</div>
								<div class="text-sm text-slate-300">Norsk</div>
							</div>
							{#if currentLang === 'no'}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-6 w-6 text-blue-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="3"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- Precipitation Graph Window -->
				<div>
					<h3 class="text-xl font-semibold mb-4 text-white">{t(currentLang, 'precipitationWindow')}</h3>
					<div class="flex gap-2">
						{#each nowcastOptions as minutes}
							<button
								onclick={() => handleNowcastChange(minutes)}
								class="flex-1 px-4 py-3 rounded-lg border-2 transition-all {currentSettings.nowcastMinutes ===
								minutes
									? 'bg-blue-500/20 border-blue-500 text-white'
									: 'bg-slate-700/30 border-slate-600 text-slate-300 hover:border-slate-500'}"
							>
								{minutes} {t(currentLang, 'minutes')}
							</button>
						{/each}
					</div>
				</div>

				<!-- Google Calendar Authentication & Settings -->
				<div>
					<h3 class="text-xl font-semibold mb-4 text-white">
						{currentLang === 'en' ? 'Google Calendar' : 'Google Kalender'}
					</h3>

					{#if checkingAuth}
						<div class="text-slate-400 text-center py-4">
							{currentLang === 'en' ? 'Checking authentication...' : 'Sjekker autentisering...'}
						</div>
					{:else if !isAuthenticated}
						<div class="space-y-3">
							<p class="text-sm text-slate-400">
								{currentLang === 'en'
									? 'Connect your Google Calendar to see events including birthdays.'
									: 'Koble til Google Kalender for å se hendelser inkludert bursdager.'}
							</p>
							<button
								onclick={handleGoogleLogin}
								class="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-white text-gray-800 hover:bg-gray-100 transition-colors font-semibold"
							>
								<svg class="w-5 h-5" viewBox="0 0 24 24">
									<path
										fill="#4285F4"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="#34A853"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="#FBBC05"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									/>
									<path
										fill="#EA4335"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									/>
								</svg>
								{currentLang === 'en' ? 'Sign in with Google' : 'Logg inn med Google'}
							</button>
						</div>
					{:else}
						<div class="space-y-3">
							<div class="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/30">
								<span class="text-green-400 text-sm">
									{currentLang === 'en' ? 'Connected to Google Calendar' : 'Koblet til Google Kalender'}
								</span>
								<button
									onclick={handleLogout}
									class="text-xs text-red-400 hover:text-red-300 transition-colors"
								>
									{currentLang === 'en' ? 'Disconnect' : 'Koble fra'}
								</button>
							</div>

							{#if loadingCalendars}
								<div class="text-slate-400 text-center py-4">
									{currentLang === 'en' ? 'Loading calendars...' : 'Laster kalendere...'}
								</div>
							{:else if calendarSources.length > 0}
								<div class="space-y-2">
									{#each calendarSources as source}
										<label class="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50 cursor-pointer transition-colors">
											<input
												type="checkbox"
												checked={isCalendarEnabled(source.id)}
												onchange={() => handleCalendarToggle(source.id)}
												class="w-5 h-5 rounded border-slate-500"
												style="accent-color: {source.backgroundColor || '#4285f4'}"
											/>
											<div class="flex items-center gap-2 flex-1">
												<div class="w-3 h-3 rounded-full" style="background-color: {source.backgroundColor || '#4285f4'}"></div>
												<span class="text-white text-sm">{source.name}</span>
											</div>
										</label>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
