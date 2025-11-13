import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Settings {
	nowcastMinutes: number;
}

const defaultSettings: Settings = {
	nowcastMinutes: 90
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
