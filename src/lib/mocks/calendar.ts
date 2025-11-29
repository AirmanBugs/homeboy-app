import type { CalendarEvent } from '$lib/types/calendar';
import type { CalendarScenario } from './scenarios';

/**
 * Mock calendar data builder
 * Creates calendar events based on scenario
 */

const parseEventTime = (timeStr: string): Date => {
	const now = new Date();

	if (timeStr.startsWith('today-')) {
		const [hours, minutes] = timeStr.replace('today-', '').split(':').map(Number);
		now.setHours(hours, minutes, 0, 0);
		return now;
	}

	if (timeStr.startsWith('today+')) {
		const hoursToAdd = parseInt(timeStr.replace('today+', '').replace('h', ''));
		now.setHours(now.getHours() + hoursToAdd);
		return now;
	}

	if (timeStr.startsWith('tomorrow-')) {
		const [hours, minutes] = timeStr.replace('tomorrow-', '').split(':').map(Number);
		now.setDate(now.getDate() + 1);
		now.setHours(hours, minutes, 0, 0);
		return now;
	}

	// Fallback: parse as ISO string
	return new Date(timeStr);
};

export const createMockCalendarEvents = (scenario: CalendarScenario): CalendarEvent[] => {
	if (!scenario.hasUpcomingEvent || !scenario.eventTime || !scenario.eventLocation) {
		return [];
	}

	const startTime = parseEventTime(scenario.eventTime);
	const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

	return [
		{
			id: 'mock-event-1',
			summary: 'Team Meeting',
			description: 'Mock event for testing',
			start: startTime.toISOString(),
			end: endTime.toISOString(),
			location: scenario.eventLocation,
			isAllDay: false,
			calendarId: 'mock-calendar',
			calendarName: 'Work',
			calendarColor: '#4285f4'
		}
	];
};
