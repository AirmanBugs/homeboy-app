import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Settings {
	nowcastMinutes: number;
	enabledCalendars: string[]; // Array of calendar IDs that are enabled
}

const defaultSettings: Settings = {
	nowcastMinutes: 90,
	enabledCalendars: [] // Empty means all calendars are enabled by default
};

const getInitialSettings = (): Settings => {
	if (!browser) return defaultSettings;
	const stored = localStorage.getItem('settings');
	if (!stored) return defaultSettings;

	try {
		return { ...defaultSettings, ...JSON.parse(stored) };
	} catch {
		return defaultSettings;
	}
};

export const settings = writable<Settings>(getInitialSettings());

if (browser) {
	settings.subscribe(value => {
		localStorage.setItem('settings', JSON.stringify(value));
	});
}
