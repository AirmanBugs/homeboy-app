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
		close: 'Close'
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
		close: 'Lukk'
	}
};

export const t = (lang: Language, key: keyof Translations): string => {
	return translations[lang][key];
};
