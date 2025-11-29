<script lang="ts">
	import type { CalendarData, CalendarEvent } from '$lib/types/calendar';
	import { language } from '$lib/stores/language';
	import { settings } from '$lib/stores/settings';
	import { onMount } from 'svelte';

	let calendarData = $state<CalendarData | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let lastFetch = $state<Date | null>(null);
	let currentTime = $state(new Date());

	const currentLang = $derived($language);
	const currentSettings = $derived($settings);

	// Refresh every 10 minutes
	const REFRESH_INTERVAL = 10 * 60 * 1000;

	// Helper to check if event is a birthday
	const isBirthdayEvent = (event: CalendarEvent): boolean => {
		return event.summary.includes('birthday') ||
		       event.summary.includes('bursdag') ||
		       event.calendarName.toLowerCase().includes('birthday') ||
		       event.calendarName.toLowerCase().includes('bursdag');
	};

	// Helper to format list of names with "and"
	const formatNameList = (names: string[]): string => {
		if (names.length === 0) return '';
		if (names.length === 1) return names[0];
		if (names.length === 2) {
			return currentLang === 'en'
				? `${names[0]} and ${names[1]}`
				: `${names[0]} og ${names[1]}`;
		}
		const last = names[names.length - 1];
		const rest = names.slice(0, -1).join(', ');
		return currentLang === 'en'
			? `${rest}, and ${last}`
			: `${rest} og ${last}`;
	};

	// Helper to determine section for event
	const getEventSection = (event: CalendarEvent): string => {
		const start = new Date(event.start);
		const end = new Date(event.end);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const startDate = new Date(start);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(end);
		endDate.setHours(0, 0, 0, 0);

		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);

		// Calculate days until end of this week (Sunday)
		// Treat Monday as day 0 and Sunday as day 6
		const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0, Sunday = 6
		const daysUntilSunday = 6 - dayOfWeek;
		const endOfWeek = new Date(today);
		endOfWeek.setDate(today.getDate() + daysUntilSunday);

		// Next week starts on Monday after this Sunday
		const startOfNextWeek = new Date(endOfWeek);
		startOfNextWeek.setDate(endOfWeek.getDate() + 1);

		const endOfNextWeek = new Date(startOfNextWeek);
		endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // Sunday of next week

		// For multi-day events, check if today falls within the event
		const isOngoing = startDate <= today && endDate > today;
		const endsToday = startDate < today && endDate.getTime() === today.getTime();

		// Use the most relevant date (if event is ongoing, use today; otherwise use start)
		const relevantDate = isOngoing || endsToday ? today : startDate;

		if (relevantDate.getTime() === today.getTime()) {
			return currentLang === 'en' ? 'Today' : 'I dag';
		} else if (relevantDate.getTime() === tomorrow.getTime()) {
			return currentLang === 'en' ? 'Tomorrow' : 'I morgen';
		} else if (relevantDate > tomorrow && relevantDate <= endOfWeek) {
			return currentLang === 'en' ? 'Later this week' : 'Senere denne uken';
		} else if (relevantDate >= startOfNextWeek && relevantDate <= endOfNextWeek) {
			return currentLang === 'en' ? 'Next week' : 'Neste uke';
		}
		return currentLang === 'en' ? 'Later' : 'Senere';
	};

	// Filter and group events based on enabled calendars
	const groupedEvents = $derived.by(() => {
		if (!calendarData) return new Map<string, CalendarEvent[]>();

		let events = calendarData.events;

		// If enabledCalendars is not empty, filter by enabled calendars (using calendar ID)
		// Skip filtering for mock calendars to always show mock data
		if (currentSettings.enabledCalendars.length > 0) {
			events = events.filter(event =>
				event.calendarId === 'mock-calendar' || currentSettings.enabledCalendars.includes(event.calendarId)
			);
		}

		// Group birthday events by date
		const processed: CalendarEvent[] = [];
		const birthdayGroups = new Map<string, CalendarEvent[]>();

		for (const event of events) {
			if (isBirthdayEvent(event) && event.isAllDay) {
				const dateKey = new Date(event.start).toISOString().split('T')[0];
				if (!birthdayGroups.has(dateKey)) {
					birthdayGroups.set(dateKey, []);
				}
				birthdayGroups.get(dateKey)!.push(event);
			} else {
				processed.push(event);
			}
		}

		// Combine birthday events into single entries
		for (const [dateKey, birthdays] of birthdayGroups) {
			const names = birthdays.map(e => {
				// Extract name from "Name's birthday" format
				const match = e.summary.match(/(.+?)'s? (birthday|bursdag)/i);
				return match ? match[1] : e.summary;
			});

			processed.push({
				...birthdays[0],
				summary: formatNameList(names),
				id: `combined-birthday-${dateKey}`,
				// Mark as birthday for icon handling
				description: 'BIRTHDAY_EVENT',
				// Force birthday color to pink
				calendarColor: '#d85675'
			});
		}

		// Sort all events by start time first
		processed.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

		// Group by section
		const sections = new Map<string, CalendarEvent[]>();
		const sectionOrder = [
			currentLang === 'en' ? 'Today' : 'I dag',
			currentLang === 'en' ? 'Tomorrow' : 'I morgen',
			currentLang === 'en' ? 'Later this week' : 'Senere denne uken',
			currentLang === 'en' ? 'Next week' : 'Neste uke',
			currentLang === 'en' ? 'Later' : 'Senere'
		];

		for (const event of processed) {
			const section = getEventSection(event);
			if (!sections.has(section)) {
				sections.set(section, []);
			}
			sections.get(section)!.push(event);
		}

		// Return in order (events within each section are already sorted)
		const ordered = new Map<string, CalendarEvent[]>();
		for (const section of sectionOrder) {
			if (sections.has(section) && sections.get(section)!.length > 0) {
				ordered.set(section, sections.get(section)!);
			}
		}

		return ordered;
	});

	const fetchCalendar = async (silent: boolean = false) => {
		try {
			if (!silent) loading = true;
			error = null;

			const response = await fetch('/api/calendar');
			console.log('[Calendar Component] Response status:', response.status);

			if (!response.ok) {
				throw new Error('Failed to fetch calendar');
			}

			calendarData = await response.json();
			console.log('[Calendar Component] Received data:', calendarData);
			console.log('[Calendar Component] Number of events:', calendarData?.events?.length);
			lastFetch = new Date();
		} catch (err) {
			if (!silent) {
				error = currentLang === 'en' ? 'Failed to load calendar' : 'Kunne ikke laste kalender';
			}
			console.error('Calendar fetch error:', err);
		} finally {
			if (!silent) loading = false;
		}
	};

	const formatEventTime = (event: CalendarEvent): string => {
		const start = new Date(event.start);
		const end = new Date(event.end);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const startDate = new Date(start);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(end);
		endDate.setHours(0, 0, 0, 0);

		const locale = currentLang === 'en' ? 'en-US' : 'nb-NO';

		if (event.isAllDay) {
			// Multi-day all-day event
			if (startDate.getTime() !== endDate.getTime() - 86400000) {
				const endDateAdjusted = new Date(endDate);
				endDateAdjusted.setDate(endDateAdjusted.getDate() - 1);

				const startStr = start.toLocaleDateString(locale, {
					month: 'short',
					day: 'numeric'
				});
				const endStr = endDateAdjusted.toLocaleDateString(locale, {
					month: 'short',
					day: 'numeric'
				});
				return `${startStr} - ${endStr}`;
			}

			// Single day all-day event
			if (startDate.getTime() === today.getTime()) {
				return currentLang === 'en' ? 'Today' : 'I dag';
			} else if (startDate.getTime() === tomorrow.getTime()) {
				return currentLang === 'en' ? 'Tomorrow' : 'I morgen';
			} else {
				return start.toLocaleDateString(locale, {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				});
			}
		}

		// Timed events
		const startTimeStr = start.toLocaleTimeString(locale, {
			hour: '2-digit',
			minute: '2-digit'
		});

		const endTimeStr = end.toLocaleTimeString(locale, {
			hour: '2-digit',
			minute: '2-digit'
		});

		const timeRange = `${startTimeStr} - ${endTimeStr}`;

		if (startDate.getTime() === today.getTime()) {
			return `${currentLang === 'en' ? 'Today' : 'I dag'} ${timeRange}`;
		} else if (startDate.getTime() === tomorrow.getTime()) {
			return `${currentLang === 'en' ? 'Tomorrow' : 'I morgen'} ${timeRange}`;
		} else {
			const dateStr = start.toLocaleDateString(locale, {
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			});
			return `${dateStr} ${timeRange}`;
		}
	};

	const getTimeSinceUpdate = $derived.by(() => {
		if (!lastFetch) return '';
		// Force reactivity
		currentTime;
		const now = new Date();
		const diffMs = now.getTime() - lastFetch.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) {
			return currentLang === 'en' ? 'Just now' : 'Akkurat nå';
		} else if (diffMins === 1) {
			return currentLang === 'en' ? '1 min ago' : '1 min siden';
		} else {
			return currentLang === 'en' ? `${diffMins} mins ago` : `${diffMins} min siden`;
		}
	});

	const getEventIcon = (event: CalendarEvent): string => {
		// Check if birthday event
		if (event.description === 'BIRTHDAY_EVENT' || isBirthdayEvent(event)) {
			return '🎂';
		}
		if (event.location) return '📍';
		if (event.isAllDay) return '📅';
		return '🕐';
	};

	const getColorStyle = (color: string): string => {
		// Return inline style for border color
		return `border-left-color: ${color}`;
	};

	onMount(() => {
		fetchCalendar();

		// Update current time every minute
		const timeInterval = setInterval(() => {
			currentTime = new Date();
		}, 60000);

		// Auto-refresh calendar
		const refreshInterval = setInterval(() => {
			fetchCalendar(true);
		}, REFRESH_INTERVAL);

		return () => {
			clearInterval(timeInterval);
			clearInterval(refreshInterval);
		};
	});
</script>

<div class="h-full flex flex-col">
	{#if loading}
		<div class="flex items-center justify-center h-full">
			<div class="text-slate-400">
				{currentLang === 'en' ? 'Loading calendar...' : 'Laster kalender...'}
			</div>
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center h-full">
			<div class="text-slate-400 text-center">
				<div class="mb-2">{error}</div>
			</div>
		</div>
	{:else if groupedEvents.size > 0}
		<div class="flex flex-col h-full">
			<!-- Events list -->
			<div class="flex-1 overflow-y-auto pr-1">
				{#each [...groupedEvents.entries()] as [section, events]}
					<div class="mb-3">
						<!-- Section header -->
						<div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
							{section}
						</div>

						<!-- Events in this section -->
						<div class="space-y-1.5">
							{#each events as event}
								<div class="p-2 bg-slate-700/30 border border-slate-600 border-l-4 rounded hover:bg-slate-700/50 transition-colors" style={getColorStyle(event.calendarColor)}>
									<div class="flex items-start gap-2">
										<span class="text-base mt-0.5">{getEventIcon(event)}</span>
										<div class="flex-1 min-w-0">
											<div class="font-semibold text-sm truncate" title={event.summary}>
												{event.summary}
											</div>
											<div class="text-xs text-slate-400 mt-0.5">
												{formatEventTime(event)}
											</div>
											{#if event.location}
												<div class="text-xs text-slate-500 mt-0.5 truncate" title={event.location}>
													📍 {event.location}
												</div>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<!-- Footer with last update time -->
			{#if lastFetch}
				<div class="mt-2 pt-2 border-t border-slate-700">
					<div class="text-xs text-slate-500 text-center">
						{getTimeSinceUpdate}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="flex items-center justify-center h-full">
			<div class="text-slate-400 text-center">
				{currentLang === 'en' ? 'No upcoming events' : 'Ingen kommende hendelser'}
			</div>
		</div>
	{/if}
</div>
