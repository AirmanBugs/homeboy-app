import type { CommuteData, CommuteRoute, CommuteStep } from '$lib/types/commute';
import type { CalendarEvent } from '$lib/types/calendar';

/**
 * Mock commute data builder
 * Creates realistic transit routes based on destination
 */

const createTransitRoute = (
	eventTime: string,
	duration: number,
	transitLine: string,
	transitName: string
): CommuteRoute => {
	const arrival = new Date(eventTime);
	const depart = new Date(arrival.getTime() - duration * 60 * 1000);

	const steps: CommuteStep[] = [
		{
			mode: 'foot',
			instruction: 'Walk to bus stop',
			duration: 5
		},
		{
			mode: 'bus',
			instruction: `${transitLine} ${transitName}`,
			duration: duration - 15
		},
		{
			mode: 'foot',
			instruction: 'Walk to destination',
			duration: 10
		}
	];

	return {
		mode: 'transit',
		duration,
		departBy: depart.toISOString(),
		arrival: arrival.toISOString(),
		steps
	};
};

const createRailRoute = (
	eventTime: string,
	duration: number,
	trainLine: string,
	trainName: string
): CommuteRoute => {
	const arrival = new Date(eventTime);
	const depart = new Date(arrival.getTime() - duration * 60 * 1000);

	const steps: CommuteStep[] = [
		{
			mode: 'foot',
			instruction: 'Walk to station',
			duration: 8
		},
		{
			mode: 'rail',
			instruction: `${trainLine} ${trainName}`,
			duration: duration - 20
		},
		{
			mode: 'foot',
			instruction: 'Walk to destination',
			duration: 12
		}
	];

	return {
		mode: 'transit',
		duration,
		departBy: depart.toISOString(),
		arrival: arrival.toISOString(),
		steps
	};
};

export const createMockCommuteData = (event: CalendarEvent): CommuteData => {
	const routes: CommuteRoute[] = [
		createTransitRoute(event.start, 42, '31', 'Snarøya - Fornebu - Tonsenhagen'),
		createRailRoute(event.start, 38, 'RE10', 'Drammen - Oslo S - Lillehammer'),
		createTransitRoute(event.start, 48, '270', 'Asker - Sandvika - Fornebu')
	];

	return {
		destination: event.location || 'Unknown',
		departureTime: event.start,
		routes,
		eventSummary: event.summary
	};
};
