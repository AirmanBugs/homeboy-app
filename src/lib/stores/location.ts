import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface Location {
	latitude: number;
	longitude: number;
	timestamp: number;
}

interface LocationState {
	location: Location | null;
	loading: boolean;
	error: string | null;
}

const createLocationStore = () => {
	const { subscribe, set, update } = writable<LocationState>({
		location: null,
		loading: false,
		error: null
	});

	let locationRequest: Promise<Location> | null = null;

	const requestLocation = async (): Promise<Location> => {
		// If there's already a request in progress, return it
		if (locationRequest) {
			return locationRequest;
		}

		// If we have a cached location less than 5 minutes old, return it
		const state = await new Promise<LocationState>((resolve) => {
			let unsubscribe: (() => void) | null = null;
			unsubscribe = subscribe((value) => {
				if (unsubscribe) unsubscribe();
				resolve(value);
			});
		});

		if (state.location && Date.now() - state.location.timestamp < 5 * 60 * 1000) {
			return state.location;
		}

		// Start new location request
		update((s) => ({ ...s, loading: true, error: null }));

		locationRequest = new Promise<Location>((resolve, reject) => {
			if (!browser || !navigator.geolocation) {
				const error = 'Geolocation not supported';
				update((s) => ({ ...s, loading: false, error }));
				locationRequest = null;
				reject(new Error(error));
				return;
			}

			navigator.geolocation.getCurrentPosition(
				(position) => {
					const location: Location = {
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						timestamp: Date.now()
					};
					update((s) => ({ location, loading: false, error: null }));
					locationRequest = null;
					resolve(location);
				},
				(err) => {
					const error = err.message || 'Failed to get location';
					update((s) => ({ ...s, loading: false, error }));
					locationRequest = null;
					reject(err);
				},
				{
					enableHighAccuracy: false,
					timeout: 10000,
					maximumAge: 300000 // Cache for 5 minutes
				}
			);
		});

		return locationRequest;
	};

	return {
		subscribe,
		requestLocation
	};
};

export const location = createLocationStore();
