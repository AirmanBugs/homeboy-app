import type { RequestHandler } from './$types';
import sharp from 'sharp';

interface RadarFrame {
	time: string;
	imageUrl: string;
}

export const GET: RequestHandler = async ({ url }) => {
	const area = url.searchParams.get('area') || 'southeastern_norway';
	const type = url.searchParams.get('type') || '5level_reflectivity';

	try {
		// Fetch available times from MET Norway (XML format)
		const availableUrl = 'https://api.met.no/weatherapi/radar/2.0/available';
		const availableResponse = await fetch(availableUrl, {
			headers: {
				'User-Agent': 'HomeBoy/1.0 mariusmbang@gmail.com'
			}
		});

		if (!availableResponse.ok) {
			throw new Error('Failed to fetch available times');
		}

		const xmlText = await availableResponse.text();

		// Parse XML to extract times for our area and type
		// XML structure: <query> elements with <parameter> children
		const availableTimes: string[] = [];

		// Find all <query> blocks
		const queryMatches = xmlText.matchAll(/<query>([\s\S]*?)<\/query>/g);

		for (const queryMatch of queryMatches) {
			const queryContent = queryMatch[1];

			// Extract parameters from this query
			let queryArea = '';
			let queryType = '';
			let queryTime = '';

			const paramMatches = queryContent.matchAll(/<parameter>\s*<name>([^<]+)<\/name>\s*<value>([^<]+)<\/value>\s*<\/parameter>/g);

			for (const paramMatch of paramMatches) {
				const name = paramMatch[1];
				const value = paramMatch[2];

				if (name === 'area') queryArea = value;
				if (name === 'type') queryType = value;
				if (name === 'time') queryTime = value;
			}

			// If this query matches our area and type, add the time
			if (queryArea === area && queryType === type && queryTime) {
				availableTimes.push(queryTime);
			}
		}

		if (availableTimes.length === 0) {
			return new Response(JSON.stringify({ frames: [] }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Take last 3 hours of data, sample every other frame to reduce size
		const recentTimes = availableTimes.slice(-36).filter((_, i) => i % 2 === 0);

		// Fetch and process each frame
		const frames: RadarFrame[] = [];

		for (const time of recentTimes) {
			try {
				const metUrl = new URL('https://api.met.no/weatherapi/radar/2.0/');
				metUrl.searchParams.set('area', area);
				metUrl.searchParams.set('type', type);
				metUrl.searchParams.set('time', time);

				const response = await fetch(metUrl.toString(), {
					headers: {
						'User-Agent': 'HomeBoy/1.0 mariusmbang@gmail.com'
					}
				});

				if (!response.ok) {
					continue;
				}

				const arrayBuffer = await response.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				// Crop the image
				const image = sharp(buffer);
				const metadata = await image.metadata();

				if (metadata.width && metadata.height) {
					const cropTop = 60;
					const cropBottom = 30;
					const cropRight = 120;

					const croppedWidth = metadata.width - cropRight;
					const croppedHeight = metadata.height - cropTop - cropBottom;

					const croppedImage = await image
						.extract({
							left: 0,
							top: cropTop,
							width: croppedWidth,
							height: croppedHeight
						})
						.png()
						.toBuffer();

					// Convert to base64 for embedding
					const base64Image = croppedImage.toString('base64');
					const dataUrl = `data:image/png;base64,${base64Image}`;

					frames.push({
						time: time,
						imageUrl: dataUrl
					});
				}
			} catch (err) {
				console.error(`Failed to process frame at ${time}:`, err);
			}
		}

		return new Response(JSON.stringify({ frames }), {
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
			}
		});
	} catch (error) {
		console.error('Radar frames API error:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
