import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface HomeLocation {
	lat: number;
	lon: number;
}

export interface Settings {
	nowcastMinutes: number;
	enabledCalendars: string[];
	locationMode: 'browser' | 'custom';
	customLocation: HomeLocation | null;
}

const defaultSettings: Settings = {
	nowcastMinutes: 90,
	enabledCalendars: [],
	locationMode: 'custom',
	customLocation: { lat: 59.905250359809166, lon: 10.622223431733659 }
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
