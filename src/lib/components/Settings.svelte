<script lang="ts">
	import { language, type Language } from '$lib/stores/language';
	import { settings } from '$lib/stores/settings';
	import { t } from '$lib/i18n/translations';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();

	const currentLang = $derived($language);
	const currentSettings = $derived($settings);

	const handleLanguageChange = (lang: Language) => {
		language.set(lang);
	};

	const handleNowcastChange = (minutes: number) => {
		settings.update(s => ({ ...s, nowcastMinutes: minutes }));
	};

	const handleBackdropClick = (e: MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const nowcastOptions = [60, 90, 120];
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		role="button"
		tabindex="-1"
	>
		<div class="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-600 shadow-2xl">
			<div class="flex justify-between items-center mb-8">
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

			<div class="space-y-6">
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
			</div>
		</div>
	</div>
{/if}
