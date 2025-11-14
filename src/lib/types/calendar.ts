export interface CalendarEvent {
	id: string;
	summary: string;
	description?: string;
	start: string; // ISO 8601 datetime
	end: string; // ISO 8601 datetime
	location?: string;
	isAllDay: boolean;
	calendarId: string;
	calendarName: string;
	calendarColor: string;
}

export interface CalendarSource {
	id: string;
	name: string;
	color: string;
	enabled: boolean;
	backgroundColor?: string;
	foregroundColor?: string;
}

export interface CalendarData {
	events: CalendarEvent[];
	updatedAt: string;
}

export interface CalendarListResponse {
	calendars: CalendarSource[];
}
