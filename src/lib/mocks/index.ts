/**
 * Mock data coordinator
 * Central place to enable/disable mocks and select scenarios
 */

import { browser } from '$app/environment';
import {
	weatherScenarios,
	calendarScenarios,
	getWeatherScenario,
	getCalendarScenario,
	type WeatherScenario,
	type CalendarScenario
} from './scenarios';
import { createMockWeather } from './weather';
import { createMockCalendarEvents } from './calendar';
import { createMockCommuteData } from './commute';
import type { WeatherData } from '$lib/types/weather';
import type { CalendarEvent } from '$lib/types/calendar';
import type { CommuteData } from '$lib/types/commute';

/**
 * Check if mocks are enabled
 * Controlled by VITE_USE_MOCKS environment variable or cookies
 */
export const isMockEnabled = (cookieValue?: string): boolean => {
	// Check environment variable first
	if (import.meta.env.VITE_USE_MOCKS === 'true') {
		return true;
	}

	// Server-side: check cookie value passed from request
	if (cookieValue !== undefined) {
		return cookieValue === 'true';
	}

	// Client-side: check localStorage
	if (browser) {
		return localStorage.getItem('useMocks') === 'true';
	}

	return false;
};

/**
 * Get current weather scenario
 */
export const getCurrentWeatherScenario = (cookieValue?: string): WeatherScenario => {
	// Server-side: check cookie value passed from request
	if (cookieValue !== undefined) {
		return getWeatherScenario(cookieValue || 'sunny');
	}

	// Client-side: check localStorage
	if (browser) {
		const scenarioId = localStorage.getItem('mockWeatherScenario') || 'sunny';
		return getWeatherScenario(scenarioId);
	}
	return weatherScenarios.sunny;
};

/**
 * Get current calendar scenario
 */
export const getCurrentCalendarScenario = (cookieValue?: string): CalendarScenario => {
	// Server-side: check cookie value passed from request
	if (cookieValue !== undefined) {
		return getCalendarScenario(cookieValue || 'noEvents');
	}

	// Client-side: check localStorage
	if (browser) {
		const scenarioId = localStorage.getItem('mockCalendarScenario') || 'noEvents';
		return getCalendarScenario(scenarioId);
	}
	return calendarScenarios.noEvents;
};

/**
 * Set weather scenario
 * Sets both localStorage and cookie
 */
export const setWeatherScenario = (scenarioId: string): void => {
	if (browser) {
		localStorage.setItem('mockWeatherScenario', scenarioId);
		// Set cookie with 1 year expiration
		const expires = new Date();
		expires.setFullYear(expires.getFullYear() + 1);
		document.cookie = `mockWeatherScenario=${scenarioId}; path=/; expires=${expires.toUTCString()}`;
	}
};

/**
 * Set calendar scenario
 * Sets both localStorage and cookie
 */
export const setCalendarScenario = (scenarioId: string): void => {
	if (browser) {
		localStorage.setItem('mockCalendarScenario', scenarioId);
		// Set cookie with 1 year expiration
		const expires = new Date();
		expires.setFullYear(expires.getFullYear() + 1);
		document.cookie = `mockCalendarScenario=${scenarioId}; path=/; expires=${expires.toUTCString()}`;
	}
};

/**
 * Toggle mocks on/off
 * Sets both localStorage and cookie
 */
export const toggleMocks = (enabled: boolean): void => {
	if (browser) {
		localStorage.setItem('useMocks', enabled ? 'true' : 'false');
		// Set cookie with 1 year expiration
		const expires = new Date();
		expires.setFullYear(expires.getFullYear() + 1);
		document.cookie = `useMocks=${enabled}; path=/; expires=${expires.toUTCString()}`;

		// Sync cookies from localStorage on toggle
		if (enabled) {
			const weatherScenario = localStorage.getItem('mockWeatherScenario') || 'sunny';
			const calendarScenario = localStorage.getItem('mockCalendarScenario') || 'noEvents';
			document.cookie = `mockWeatherScenario=${weatherScenario}; path=/; expires=${expires.toUTCString()}`;
			document.cookie = `mockCalendarScenario=${calendarScenario}; path=/; expires=${expires.toUTCString()}`;
		}
	}
};

/**
 * Get all available scenarios
 */
export const getWeatherScenarios = () => weatherScenarios;
export const getCalendarScenarios = () => calendarScenarios;

/**
 * Mock data generators
 */
export const mocks = {
	weather: (lat: number, lon: number, weatherScenarioCookie?: string): WeatherData => {
		const scenario = getCurrentWeatherScenario(weatherScenarioCookie);
		return createMockWeather(scenario, lat, lon);
	},

	calendar: (calendarScenarioCookie?: string): CalendarEvent[] => {
		const scenario = getCurrentCalendarScenario(calendarScenarioCookie);
		return createMockCalendarEvents(scenario);
	},

	commute: (event: CalendarEvent): CommuteData => {
		return createMockCommuteData(event);
	}
};
