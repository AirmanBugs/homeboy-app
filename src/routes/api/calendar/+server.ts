import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CalendarData, CalendarEvent } from '$lib/types/calendar';
import { google } from 'googleapis';
import { createOAuth2Client, setCredentials } from '$lib/server/google-auth';
import { env } from '$env/dynamic/private';

// Parse default calendar colors from environment variable
function parseCalendarColors(): Record<string, string> {
	const calendarColors = env.CALENDAR_COLORS;
	if (!calendarColors) {
		return {};
	}

	const colors: Record<string, string> = {};
	calendarColors.split(',').forEach((entry: string) => {
		const [id, color] = entry.split(':').map((s: string) => s.trim());
		if (id && color) {
			colors[id] = color;
		}
	});
	return colors;
}

// Convert hex to HSL to determine color category
function hexToHSL(hex: string): { h: number; s: number; l: number } {
	// Remove # if present
	hex = hex.replace('#', '');

	// Convert to RGB
	const r = parseInt(hex.substring(0, 2), 16) / 255;
	const g = parseInt(hex.substring(2, 4), 16) / 255;
	const b = parseInt(hex.substring(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			case b:
				h = ((r - g) / d + 4) / 6;
				break;
		}
	}

	return { h: h * 360, s, l };
}

// Map Google Calendar colors to our color scheme
function mapGoogleColorToLocal(backgroundColor?: string, defaultColor?: string): string {
	if (defaultColor) return defaultColor;
	if (!backgroundColor) return 'blue';

	const normalizedColor = backgroundColor.toLowerCase();

	// Try exact match first
	const colorMap: Record<string, string> = {
		'#a4bdfc': 'blue',
		'#5484ed': 'blue',
		'#46d6db': 'blue',
		'#039be5': 'blue',
		'#4285f4': 'blue',
		'#7ae7bf': 'green',
		'#51b749': 'green',
		'#0b8043': 'green',
		'#009688': 'green',
		'#33b679': 'green',
		'#fbd75b': 'yellow',
		'#f6c026': 'yellow',
		'#f6bf26': 'yellow',
		'#e4c441': 'yellow',
		'#ffb878': 'orange',
		'#f4511e': 'orange',
		'#ef6c00': 'orange',
		'#e67c73': 'orange',
		'#f09300': 'orange',
		'#ff887c': 'red',
		'#dc2127': 'red',
		'#d50000': 'red',
		'#d81b60': 'pink',
		'#d85675': 'pink', // Birthdays calendar
		'#e91e63': 'pink',
		'#ad1457': 'pink',
		'#dbadff': 'purple',
		'#8e24aa': 'purple',
		'#9e69af': 'purple',
		'#7986cb': 'purple',
		'#3f51b5': 'purple',
		'#e1e1e1': 'gray',
		'#616161': 'gray',
		'#9e9e9e': 'gray',
		'#795548': 'gray'
	};

	if (colorMap[normalizedColor]) {
		return colorMap[normalizedColor];
	}

	// Fallback: analyze the color using HSL
	const { h, s, l } = hexToHSL(normalizedColor);

	// If very desaturated or very dark/light, it's gray
	if (s < 0.15 || l < 0.15 || l > 0.85) {
		return 'gray';
	}

	// Map hue to color categories
	// Red: 0-15, 345-360
	if (h < 15 || h >= 345) return 'red';
	// Orange: 15-45
	if (h >= 15 && h < 45) return 'orange';
	// Yellow: 45-75
	if (h >= 45 && h < 75) return 'yellow';
	// Green: 75-165
	if (h >= 75 && h < 165) return 'green';
	// Blue: 165-260
	if (h >= 165 && h < 260) return 'blue';
	// Purple: 260-290
	if (h >= 260 && h < 290) return 'purple';
	// Pink/Magenta: 290-345
	if (h >= 290 && h < 345) return 'pink';

	return 'blue';
}

export const GET: RequestHandler = async ({ cookies }) => {
	try {
		const tokensStr = cookies.get('google_tokens');

		if (!tokensStr) {
			return json({ error: 'Not authenticated', needsAuth: true }, { status: 401 });
		}

		const tokens = JSON.parse(tokensStr);
		const oauth2Client = createOAuth2Client();
		setCredentials(oauth2Client, tokens);

		const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

		// Get list of calendars (including hidden ones like Birthdays)
		const calendarList = await calendar.calendarList.list({
			showHidden: true
		});
		const calendars = calendarList.data.items || [];

		const defaultColors = parseCalendarColors();
		const now = new Date().toISOString();
		const allEvents: CalendarEvent[] = [];

		// Fetch events from each calendar in parallel
		await Promise.all(
			calendars.map(async (cal) => {
				if (!cal.id) return;

				// Log calendar info to debug
				console.log(`Fetching calendar: ${cal.summary} (${cal.id}) - Color: ${cal.backgroundColor}`);

				try {
					const eventsResponse = await calendar.events.list({
						calendarId: cal.id,
						timeMin: now,
						maxResults: 20,
						singleEvents: true,
						orderBy: 'startTime'
					});

					const events = eventsResponse.data.items || [];

					for (const event of events) {
						if (!event.start || !event.end) continue;

						const startDate = event.start.dateTime || event.start.date;
						const endDate = event.end.dateTime || event.end.date;
						if (!startDate || !endDate) continue;

						const isAllDay = !event.start.dateTime;

						allEvents.push({
							id: event.id || '',
							summary: event.summary || 'Untitled Event',
							description: event.description || undefined,
							start: startDate,
							end: endDate,
							location: event.location || undefined,
							isAllDay,
							calendarId: cal.id,
							calendarName: cal.summary || 'Unnamed Calendar',
							calendarColor: cal.backgroundColor || '#4285f4' // Use actual hex color
						});
					}
				} catch (error) {
					console.error(`Error fetching events from calendar ${cal.summary}:`, error);
				}
			})
		);

		// Sort events by start time
		allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

		// Return only the next 20 events
		const calendarData: CalendarData = {
			events: allEvents.slice(0, 20),
			updatedAt: new Date().toISOString()
		};

		return json(calendarData);
	} catch (error) {
		console.error('Calendar API error:', error);
		return json({ error: 'Failed to fetch calendar data' }, { status: 500 });
	}
};
