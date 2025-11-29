import type { WeatherData, Forecast } from '$lib/types/weather';
import type { WeatherScenario } from './scenarios';

/**
 * Mock weather data builder
 * Creates realistic weather data based on scenario conditions
 */

const symbolCodes = {
	clear: 'clearsky_day',
	cloudy: 'cloudy',
	rain: 'rain',
	snow: 'snow',
	storm: 'heavyrain'
};

const createForecast = (
	baseTemp: number,
	condition: keyof typeof symbolCodes,
	precipitation: number,
	windSpeed: number,
	hoursOffset: number
): Forecast => {
	const time = new Date();
	time.setHours(time.getHours() + hoursOffset);

	// Add some variation to temperature throughout the day
	const tempVariation = Math.sin(hoursOffset * 0.3) * 3;

	return {
		time: time.toISOString(),
		temperature: baseTemp + tempVariation,
		symbolCode: symbolCodes[condition],
		precipitation,
		windSpeed: windSpeed + Math.random() * 2,
		windDirection: 180 + Math.random() * 180
	};
};

export const createMockWeather = (scenario: WeatherScenario, lat: number, lon: number): WeatherData => {

	// Create 6-hour forecast
	const forecast: Forecast[] = [];
	for (let i = 0; i < 6; i++) {
		forecast.push(
			createForecast(
				scenario.temperature,
				scenario.condition,
				scenario.precipitation,
				scenario.windSpeed,
				i
			)
		);
	}

	// Create 6-day daily forecast (midday values)
	const dailyForecast: Forecast[] = [];
	for (let i = 0; i < 6; i++) {
		dailyForecast.push(
			createForecast(
				scenario.temperature + (i % 2 === 0 ? 2 : -1), // Slight variation per day
				scenario.condition,
				scenario.precipitation,
				scenario.windSpeed,
				i * 24 + 12 // Noon each day
			)
		);
	}

	return {
		current: {
			temperature: scenario.temperature,
			symbolCode: symbolCodes[scenario.condition],
			windSpeed: scenario.windSpeed,
			windDirection: 225,
			cloudCover: scenario.condition === 'clear' ? 10 : scenario.condition === 'cloudy' ? 75 : 90,
			humidity: scenario.condition === 'rain' ? 85 : 65,
			precipitation: scenario.precipitation,
			fog: scenario.condition === 'rain' ? 20 : 0,
			uvIndex: scenario.condition === 'clear' ? 5 : scenario.condition === 'cloudy' ? 3 : 1
		},
		forecast,
		dailyForecast,
		location: {
			lat,
			lon
		},
		updatedAt: new Date().toISOString(),
		moonPhase: 0.25 // Quarter moon
	};
};
