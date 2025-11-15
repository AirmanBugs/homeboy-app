import type { RequestHandler } from './$types';
import sharp from 'sharp';

export const GET: RequestHandler = async ({ url }) => {
	const area = url.searchParams.get('area') || 'southeastern_norway';
	const type = url.searchParams.get('type') || '5level_reflectivity';
	const content = url.searchParams.get('content') || 'image';
	const time = url.searchParams.get('time');
	const crop = url.searchParams.get('crop') !== 'false'; // Default to true
	const frames = url.searchParams.get('frames'); // Get multiple frames for animation

	try {
		// Build MET Norway Radar API URL
		const metUrl = new URL('https://api.met.no/weatherapi/radar/2.0/');
		metUrl.searchParams.set('area', area);
		metUrl.searchParams.set('type', type);
		metUrl.searchParams.set('content', content);

		if (time) {
			metUrl.searchParams.set('time', time);
		}

		// Fetch from MET Norway API with required User-Agent
		const response = await fetch(metUrl.toString(), {
			headers: {
				'User-Agent': 'HomeBoy/1.0 mariusmbang@gmail.com'
			}
		});

		if (!response.ok) {
			console.error('MET Norway Radar API error:', response.status, response.statusText);
			return new Response('Failed to fetch radar data', { status: response.status });
		}

		// Get the image buffer
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Determine content type
		const contentType = content === 'animation' ? 'image/gif' : 'image/png';

		// For animations (GIF), skip cropping as it's more complex
		// For static images (PNG), crop if requested
		if (crop && content !== 'animation') {
			try {
				const image = sharp(buffer);
				const metadata = await image.metadata();

				if (metadata.width && metadata.height) {
					// Crop dimensions (adjust these as needed)
					// Remove top border (~40px), bottom border (~30px)
					// Remove right legend (~120px from the right)
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

					return new Response(croppedImage, {
						headers: {
							'Content-Type': 'image/png',
							'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
						}
					});
				}
			} catch (cropError) {
				console.error('Image cropping error:', cropError);
				// Fall through to return original image
			}
		}

		// Return original image if no cropping or if cropping failed
		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
			}
		});
	} catch (error) {
		console.error('Radar API error:', error);
		return new Response('Internal server error', { status: 500 });
	}
};
