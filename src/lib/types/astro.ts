export interface AstroEventData {
	time: string;
	azimuth: number;
}

export interface AstroData {
	sunrise: AstroEventData | null;
	sunset: AstroEventData | null;
	moonrise: AstroEventData | null;
	moonset: AstroEventData | null;
}

export interface AstroEvent {
	type: 'sunrise' | 'sunset' | 'moonrise' | 'moonset';
	time: Date;
	azimuth: number;
	isPast: boolean;
}
