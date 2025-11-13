import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Language = 'en' | 'no';

const defaultLanguage: Language = 'no';

// Get initial value from localStorage or use default
const getInitialLanguage = (): Language => {
	if (!browser) return defaultLanguage;
	const stored = localStorage.getItem('language');
	return (stored === 'en' || stored === 'no') ? stored : defaultLanguage;
};

// Create the store
export const language = writable<Language>(getInitialLanguage());

// Subscribe to changes and persist to localStorage
if (browser) {
	language.subscribe(value => {
		localStorage.setItem('language', value);
	});
}
