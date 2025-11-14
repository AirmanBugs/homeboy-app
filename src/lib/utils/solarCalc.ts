// Calculate sunrise and sunset times based on location
// Using simplified algorithm (accurate to ~5 minutes)

export interface SolarTimes {
	sunrise: Date;
	sunset: Date;
	solarNoon: Date;
	dawn: Date;
	dusk: Date;
}

export type TimeOfDay = 'night' | 'dawn' | 'day' | 'dusk';

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

export function calculateSolarTimes(date: Date, lat: number, lon: number): SolarTimes {
	// Julian day calculation
	const dayOfYear = Math.floor(
		(date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
	);

	// Solar declination (simplified)
	const declination = 23.45 * Math.sin(toRadians((360 / 365) * (dayOfYear - 81)));

	// Hour angle at sunrise/sunset
	const latRad = toRadians(lat);
	const decRad = toRadians(declination);

	const cosHourAngle =
		-Math.tan(latRad) * Math.tan(decRad);

	// Check for polar day/night
	if (cosHourAngle > 1) {
		// Polar night - sun never rises
		const noon = new Date(date);
		noon.setHours(12, 0, 0, 0);
		return {
			sunrise: noon,
			sunset: noon,
			solarNoon: noon,
			dawn: noon,
			dusk: noon
		};
	}
	if (cosHourAngle < -1) {
		// Polar day - sun never sets
		const noon = new Date(date);
		noon.setHours(12, 0, 0, 0);
		const earlyMorning = new Date(date);
		earlyMorning.setHours(0, 0, 0, 0);
		const lateEvening = new Date(date);
		lateEvening.setHours(23, 59, 59, 0);
		return {
			sunrise: earlyMorning,
			sunset: lateEvening,
			solarNoon: noon,
			dawn: earlyMorning,
			dusk: lateEvening
		};
	}

	const hourAngle = toDegrees(Math.acos(cosHourAngle));

	// Calculate solar noon (in UTC)
	const solarNoonUTC = 12 - lon / 15;

	// Calculate sunrise and sunset (in UTC)
	const sunriseUTC = solarNoonUTC - hourAngle / 15;
	const sunsetUTC = solarNoonUTC + hourAngle / 15;

	// Convert to local time
	const createTime = (utcHours: number): Date => {
		const d = new Date(date);
		d.setUTCHours(Math.floor(utcHours));
		d.setUTCMinutes((utcHours % 1) * 60);
		d.setUTCSeconds(0);
		d.setUTCMilliseconds(0);
		return d;
	};

	const sunrise = createTime(sunriseUTC);
	const sunset = createTime(sunsetUTC);
	const solarNoon = createTime(solarNoonUTC);

	// Dawn is ~30 minutes before sunrise
	const dawn = new Date(sunrise.getTime() - 30 * 60 * 1000);

	// Dusk is ~30 minutes after sunset
	const dusk = new Date(sunset.getTime() + 30 * 60 * 1000);

	return { sunrise, sunset, solarNoon, dawn, dusk };
}

export function getTimeOfDay(currentTime: Date, solarTimes: SolarTimes): TimeOfDay {
	const time = currentTime.getTime();

	if (time < solarTimes.dawn.getTime() || time > solarTimes.dusk.getTime()) {
		return 'night';
	} else if (time < solarTimes.sunrise.getTime()) {
		return 'dawn';
	} else if (time < solarTimes.sunset.getTime()) {
		return 'day';
	} else {
		return 'dusk';
	}
}

export function getSunPosition(
	currentTime: Date,
	solarTimes: SolarTimes
): { altitude: number; azimuth: number } {
	const { sunrise, sunset, solarNoon } = solarTimes;

	// Simplified sun position (0-100% of sky arc)
	const time = currentTime.getTime();
	const sunriseTime = sunrise.getTime();
	const sunsetTime = sunset.getTime();
	const noonTime = solarNoon.getTime();

	if (time < sunriseTime || time > sunsetTime) {
		return { altitude: -20, azimuth: 0 }; // Below horizon
	}

	// Calculate position as percentage of daylight arc
	let progress: number;
	if (time < noonTime) {
		// Morning: sunrise to noon
		progress = (time - sunriseTime) / (noonTime - sunriseTime) * 0.5;
	} else {
		// Afternoon: noon to sunset
		progress = 0.5 + ((time - noonTime) / (sunsetTime - noonTime) * 0.5);
	}

	// Altitude: 0 at horizon, 100 at zenith (simplified arc)
	const altitude = Math.sin(progress * Math.PI) * 100;

	// Azimuth: 0 (east) to 180 (west)
	const azimuth = progress * 180;

	return { altitude, azimuth };
}

export function getMoonPhase(date: Date): number {
	// Simplified moon phase calculation
	// Returns 0-1 where 0/1 is new moon, 0.5 is full moon
	const year = date.getFullYear();
	const month = date.getMonth() + 1;
	const day = date.getDate();

	// Days since known new moon (Jan 6, 2000)
	const knownNewMoon = new Date(2000, 0, 6).getTime();
	const daysSinceNew = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);

	// Lunar cycle is ~29.53 days
	const lunarCycle = 29.53058867;
	const phase = (daysSinceNew % lunarCycle) / lunarCycle;

	return phase;
}
