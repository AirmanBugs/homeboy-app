import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const USER_AGENT = 'HomeBoy/1.0 mariusmbang@gmail.com';
const NOWCAST_API_URL = 'https://api.met.no/weatherapi/nowcast/2.0/complete';

interface NowcastData {
	time: string;
	precipitation: number;
}

export const GET: RequestHandler = async ({ url }) => {
	const lat = url.searchParams.get('lat');
	const lon = url.searchParams.get('lon');

	if (!lat || !lon) {
		return json({ error: 'Missing lat or lon parameters' }, { status: 400 });
	}

	try {
		const response = await fetch(`${NOWCAST_API_URL}?lat=${lat}&lon=${lon}`, {
			headers: {
				'User-Agent': USER_AGENT
			}
		});

		if (!response.ok) {
			throw new Error(`MET Nowcast API returned ${response.status}`);
		}

		const data = await response.json();
		const nowcastData: NowcastData[] = transformNowcastData(data);

		return json(nowcastData);
	} catch (error) {
		console.error('Nowcast API error:', error);
		return json({ error: 'Failed to fetch nowcast data' }, { status: 500 });
	}
};

function transformNowcastData(metData: any): NowcastData[] {
	const timeseries = metData.properties?.timeseries || [];

	return timeseries.map((entry: any) => ({
		time: entry.time,
		precipitation: entry.data?.instant?.details?.precipitation_rate || 0
	}));
}
