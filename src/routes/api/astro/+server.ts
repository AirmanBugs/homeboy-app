import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const USER_AGENT = 'HomeBoy/1.0 mariusmbang@gmail.com';
const MET_SUNRISE_BASE_URL = 'https://api.met.no/weatherapi/sunrise/3.0';

interface AstroEvent {
	time: string;
	azimuth: number;
}

interface SunResponse {
	properties: {
		body: 'Sun';
		sunrise?: AstroEvent;
		sunset?: AstroEvent;
		solarnoon: {
			time: string;
			disc_centre_elevation: number;
			visible: boolean;
		};
		solarmidnight: {
			time: string;
			disc_centre_elevation: number;
			visible: boolean;
		};
	};
}

interface MoonResponse {
	properties: {
		body: 'Moon';
		moonrise?: AstroEvent;
		moonset?: AstroEvent;
		moonphase: number;
	};
}

export const GET: RequestHandler = async ({ url }) => {
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');
	const dateParam = url.searchParams.get('date');

	if (!lat || !lon) {
		return json({ error: 'Missing lat or lon parameters' }, { status: 400 });
	}

	try {
		// Use provided date or default to today
		const targetDate = dateParam || new Date().toISOString().split('T')[0];

		// Fetch both sun and moon data in parallel
		const [sunResponse, moonResponse] = await Promise.all([
			fetch(
				`${MET_SUNRISE_BASE_URL}/sun?lat=${lat}&lon=${lon}&date=${targetDate}&offset=+01:00`,
				{
					headers: {
						'User-Agent': USER_AGENT
					}
				}
			),
			fetch(
				`${MET_SUNRISE_BASE_URL}/moon?lat=${lat}&lon=${lon}&date=${targetDate}&offset=+01:00`,
				{
					headers: {
						'User-Agent': USER_AGENT
					}
				}
			)
		]);

		if (!sunResponse.ok || !moonResponse.ok) {
			throw new Error(`MET Sunrise API returned error`);
		}

		const sunData: SunResponse = await sunResponse.json();
		const moonData: MoonResponse = await moonResponse.json();

		return json({
			sunrise: sunData.properties.sunrise || null,
			sunset: sunData.properties.sunset || null,
			moonrise: moonData.properties.moonrise || null,
			moonset: moonData.properties.moonset || null
		});
	} catch (error) {
		console.error('Astro API error:', error);
		return json(
			{ error: 'Failed to fetch astronomical data' },
			{ status: 500 }
		);
	}
};
