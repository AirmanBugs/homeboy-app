/**
 * Modular test scenarios for development and testing
 * Weather and calendar scenarios can be combined independently
 */

export interface WeatherScenario {
	id: string;
	name: string;
	description: string;
	condition: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';
	temperature: number;
	windSpeed: number;
	precipitation: number;
}

export interface CalendarScenario {
	id: string;
	name: string;
	description: string;
	hasUpcomingEvent: boolean;
	eventTime?: string; // ISO string, relative to now
	eventLocation?: string;
}

// Weather scenarios
export const weatherScenarios: Record<string, WeatherScenario> = {
	sunny: {
		id: 'sunny',
		name: 'Sunny',
		description: 'Clear skies, warm temperature',
		condition: 'clear',
		temperature: 18,
		windSpeed: 3,
		precipitation: 0
	},
	cloudy: {
		id: 'cloudy',
		name: 'Cloudy',
		description: 'Overcast with moderate temperature',
		condition: 'cloudy',
		temperature: 15,
		windSpeed: 5,
		precipitation: 0
	},
	rainy: {
		id: 'rainy',
		name: 'Rainy',
		description: 'Heavy rain with cooler temperature',
		condition: 'rain',
		temperature: 12,
		windSpeed: 8,
		precipitation: 5
	},
	snowy: {
		id: 'snowy',
		name: 'Snowy',
		description: 'Snowfall with cold temperature',
		condition: 'snow',
		temperature: -2,
		windSpeed: 4,
		precipitation: 3
	},
	stormy: {
		id: 'stormy',
		name: 'Storm',
		description: 'Heavy storm with high winds',
		condition: 'storm',
		temperature: 10,
		windSpeed: 15,
		precipitation: 10
	}
};

// Calendar scenarios
export const calendarScenarios: Record<string, CalendarScenario> = {
	morningCommute: {
		id: 'morningCommute',
		name: 'Morning Event',
		description: 'Event tomorrow at 15:00 requiring transit',
		hasUpcomingEvent: true,
		eventTime: 'tomorrow-15:00',
		eventLocation: 'Asker stasjon, Asker, Norway'
	},
	eveningEvent: {
		id: 'eveningEvent',
		name: 'Evening Event',
		description: 'Event today at 18:00 in central Oslo',
		hasUpcomingEvent: true,
		eventTime: 'today-18:00',
		eventLocation: 'Oslo S, Oslo, Norway'
	},
	nearbyEvent: {
		id: 'nearbyEvent',
		name: 'Nearby Event',
		description: 'Event in 2 hours at nearby location',
		hasUpcomingEvent: true,
		eventTime: 'today+2h',
		eventLocation: 'Kongens gate 7, 0153 Oslo, Norway'
	},
	noEvents: {
		id: 'noEvents',
		name: 'No Events',
		description: 'Free day with no upcoming events',
		hasUpcomingEvent: false
	}
};

export const getWeatherScenario = (id: string): WeatherScenario => {
	return weatherScenarios[id] || weatherScenarios.sunny;
};

export const getCalendarScenario = (id: string): CalendarScenario => {
	return calendarScenarios[id] || calendarScenarios.noEvents;
};
