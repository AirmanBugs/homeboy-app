import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { MetWeatherResponse, WeatherData, ForecastHour } from '$lib/types/weather';

const USER_AGENT = 'HomeBoy/1.0 mariusmbang@gmail.com';
const MET_API_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';

export const GET: RequestHandler = async ({ url }) => {
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');

	if (!lat || !lon) {
		return json({ error: 'Missing lat or lon parameters' }, { status: 400 });
	}

	try {
		const response = await fetch(`${MET_API_URL}?lat=${lat}&lon=${lon}`, {
			headers: {
				'User-Agent': USER_AGENT
			}
		});

		if (!response.ok) {
			throw new Error(`MET API returned ${response.status}`);
		}

		const data: MetWeatherResponse = await response.json();
		const weatherData = transformWeatherData(data, parseFloat(lat), parseFloat(lon));

		return json(weatherData);
	} catch (error) {
		console.error('Weather API error:', error);
		return json(
			{ error: 'Failed to fetch weather data' },
			{ status: 500 }
		);
	}
};

function transformWeatherData(
	metData: MetWeatherResponse,
	lat: number,
	lon: number
): WeatherData {
	const timeseries = metData.properties.timeseries;
	const current = timeseries[0];

	// Get the next 12 hours of forecasts
	const forecast: ForecastHour[] = timeseries
		.slice(1, 13)
		.map((entry) => ({
			time: entry.time,
			temperature: entry.data.instant.details.air_temperature,
			symbolCode: entry.data.next_1_hours?.summary.symbol_code ||
			            entry.data.next_6_hours?.summary.symbol_code ||
			            'cloudy',
			precipitation: entry.data.next_1_hours?.details.precipitation_amount || 0,
			windSpeed: entry.data.instant.details.wind_speed,
			windDirection: entry.data.instant.details.wind_from_direction
		}));

	return {
		current: {
			temperature: current.data.instant.details.air_temperature,
			symbolCode: current.data.next_1_hours?.summary.symbol_code ||
			            current.data.next_6_hours?.summary.symbol_code ||
			            'cloudy',
			windSpeed: current.data.instant.details.wind_speed,
			windDirection: current.data.instant.details.wind_from_direction,
			cloudCover: current.data.instant.details.cloud_area_fraction,
			humidity: current.data.instant.details.relative_humidity,
			precipitation: current.data.next_1_hours?.details.precipitation_amount || 0,
			fog: current.data.instant.details.fog_area_fraction || 0
		},
		forecast,
		location: { lat, lon },
		updatedAt: metData.properties.meta.updated_at
	};
}
