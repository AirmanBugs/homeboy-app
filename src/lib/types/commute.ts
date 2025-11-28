export interface CommuteData {
	destination: string;
	departureTime: string; // Event start time
	routes: CommuteRoute[];
	eventSummary: string;
}

export interface CommuteRoute {
	mode: 'transit' | 'driving' | 'walking' | 'cycling';
	duration: number; // in minutes
	departBy: string; // Time to leave
	arrival: string; // Expected arrival time
	steps?: CommuteStep[];
}

export interface CommuteStep {
	mode: string;
	instruction: string;
	duration: number;
	distance?: number;
}
