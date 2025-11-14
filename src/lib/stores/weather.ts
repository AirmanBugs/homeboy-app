import { writable } from 'svelte/store';
import type { WeatherData } from '$lib/types/weather';

export interface WeatherStore {
	data: WeatherData | null;
	location: { lat: number; lon: number } | null;
}

const initialState: WeatherStore = {
	data: null,
	location: null
};

export const weatherStore = writable<WeatherStore>(initialState);

export function setWeatherData(data: WeatherData) {
	weatherStore.update(state => ({
		...state,
		data,
		location: data.location
	}));
}

export function setWeatherLocation(lat: number, lon: number) {
	weatherStore.update(state => ({
		...state,
		location: { lat, lon }
	}));
}
