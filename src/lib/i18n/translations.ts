import type { Language } from '$lib/stores/language';

type Translations = {
	title: string;
	weather: string;
	upcomingEvents: string;
	commuteInfo: string;
	weatherComingSoon: string;
	calendarComingSoon: string;
	transitComingSoon: string;
	settings: string;
	language: string;
	english: string;
	norwegian: string;
	close: string;
	precipitationGraph: string;
	precipitationWindow: string;
	minutes: string;
	usingDefaultLocation: string;
	weatherRadar: string;
	dayLength: string;
	ago: string;
	hour: string;
	minute: string;
	// Compass directions
	N: string;
	NE: string;
	E: string;
	SE: string;
	S: string;
	SW: string;
	W: string;
	NW: string;
};

export const translations: Record<Language, Translations> = {
	en: {
		title: 'HomeBoy - Your Personal Dashboard',
		weather: 'Weather',
		upcomingEvents: 'Upcoming Events',
		commuteInfo: 'Commute Info',
		weatherComingSoon: 'Weather data coming soon...',
		calendarComingSoon: 'Calendar integration coming soon...',
		transitComingSoon: 'Transit information coming soon...',
		settings: 'Settings',
		language: 'Language',
		english: 'English',
		norwegian: 'Norwegian',
		close: 'Close',
		precipitationGraph: 'Precipitation Graph',
		precipitationWindow: 'Precipitation forecast window',
		minutes: 'minutes',
		usingDefaultLocation: 'Using default location (Oslo)',
		weatherRadar: 'Weather Radar',
		dayLength: 'Day length',
		ago: 'ago',
		hour: 'h',
		minute: 'm',
		// Compass directions
		N: 'N',
		NE: 'NE',
		E: 'E',
		SE: 'SE',
		S: 'S',
		SW: 'SW',
		W: 'W',
		NW: 'NW'
	},
	no: {
		title: 'HomeBoy - Din personlige dashboard',
		weather: 'Vær',
		upcomingEvents: 'Kommende hendelser',
		commuteInfo: 'Reiseinformasjon',
		weatherComingSoon: 'Værdata kommer snart...',
		calendarComingSoon: 'Kalenderintegrering kommer snart...',
		transitComingSoon: 'Reiseinformasjon kommer snart...',
		settings: 'Innstillinger',
		language: 'Språk',
		english: 'Engelsk',
		norwegian: 'Norsk',
		close: 'Lukk',
		precipitationGraph: 'Nedbørsgraf',
		precipitationWindow: 'Nedbørsvarsling',
		minutes: 'minutter',
		usingDefaultLocation: 'Bruker standardplassering (Oslo)',
		weatherRadar: 'Værradar',
		dayLength: 'Daglengde',
		ago: 'siden',
		hour: 't',
		minute: 'm',
		// Compass directions
		N: 'N',
		NE: 'NØ',
		E: 'Ø',
		SE: 'SØ',
		S: 'S',
		SW: 'SV',
		W: 'V',
		NW: 'NV'
	}
};

export const t = (lang: Language, key: keyof Translations): string => {
	return translations[lang][key];
};
