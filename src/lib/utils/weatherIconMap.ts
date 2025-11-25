/**
 * Maps MET Norway weather symbol codes to Meteocons icon names
 *
 * MET symbol codes: https://api.met.no/weatherapi/weathericon/2.0/documentation
 * Meteocons icons: https://github.com/basmilius/weather-icons
 */

export function getWeatherIconName(symbolCode: string): string {
  // Remove any suffixes like _day, _night, _polartwilight
  const baseCode = symbolCode.replace(/_day|_night|_polartwilight/g, '');

  // Determine if it's day or night from the original symbol code
  const isNight = symbolCode.includes('_night') || symbolCode.includes('_polartwilight');

  // Map MET codes to Meteocons icon names
  const iconMap: Record<string, string> = {
    'clearsky': isNight ? 'clear-night' : 'clear-day',
    'fair': isNight ? 'partly-cloudy-night' : 'partly-cloudy-day',
    'partlycloudy': isNight ? 'partly-cloudy-night' : 'partly-cloudy-day',
    'cloudy': 'cloudy',
    'fog': 'fog',
    'heavyrain': 'rain',
    'heavyrainandthunder': 'thunderstorms-rain',
    'heavyrainshowers': isNight ? 'rain-night' : 'rain-day',
    'heavyrainshowersandthunder': isNight ? 'thunderstorms-night-rain' : 'thunderstorms-day-rain',
    'heavysleet': 'sleet',
    'heavysleetandthunder': 'thunderstorms-rain',
    'heavysleetshowers': isNight ? 'sleet-night' : 'sleet-day',
    'heavysleetshowersandthunder': isNight ? 'thunderstorms-night-rain' : 'thunderstorms-day-rain',
    'heavysnow': 'snow',
    'heavysnowandthunder': 'thunderstorms-snow',
    'heavysnowshowers': isNight ? 'snow-night' : 'snow-day',
    'heavysnowshowersandthunder': isNight ? 'thunderstorms-night-snow' : 'thunderstorms-day-snow',
    'lightrain': 'rain',
    'lightrainandthunder': 'thunderstorms-rain',
    'lightrainshowers': isNight ? 'rain-night' : 'rain-day',
    'lightrainshowersandthunder': isNight ? 'thunderstorms-night-rain' : 'thunderstorms-day-rain',
    'lightsleet': 'sleet',
    'lightsleetandthunder': 'thunderstorms-rain',
    'lightsleetshowers': isNight ? 'sleet-night' : 'sleet-day',
    'lightsnow': 'snow',
    'lightsnowandthunder': 'thunderstorms-snow',
    'lightsnowshowers': isNight ? 'snow-night' : 'snow-day',
    'lightssleetshowersandthunder': isNight ? 'thunderstorms-night-rain' : 'thunderstorms-day-rain',
    'lightssnowshowersandthunder': isNight ? 'thunderstorms-night-snow' : 'thunderstorms-day-snow',
    'rain': 'rain',
    'rainandthunder': 'thunderstorms-rain',
    'rainshowers': isNight ? 'rain-night' : 'rain-day',
    'rainshowersandthunder': isNight ? 'thunderstorms-night-rain' : 'thunderstorms-day-rain',
    'sleet': 'sleet',
    'sleetandthunder': 'thunderstorms-rain',
    'sleetshowers': isNight ? 'sleet-night' : 'sleet-day',
    'sleetshowersandthunder': isNight ? 'thunderstorms-night-rain' : 'thunderstorms-day-rain',
    'snow': 'snow',
    'snowandthunder': 'thunderstorms-snow',
    'snowshowers': isNight ? 'snow-night' : 'snow-day',
    'snowshowersandthunder': isNight ? 'thunderstorms-night-snow' : 'thunderstorms-day-snow'
  };

  return iconMap[baseCode] || 'cloudy'; // Default to cloudy if unknown
}

/**
 * Gets the UV index icon name based on UV value
 * Meteocons has UV index icons from 1-11, we added 0 for no UV exposure
 */
export function getUVIndexIconName(uvIndex: number): string {
  const roundedUV = Math.round(Math.max(0, Math.min(11, uvIndex)));
  return `uv-index-${roundedUV}`;
}

/**
 * Gets the moon phase icon name based on moon phase value (0-1)
 * 0 = new moon, 0.25 = first quarter, 0.5 = full moon, 0.75 = last quarter
 */
export function getMoonPhaseIconName(moonPhase: number): string {
  // Meteocons has 8 moon phase icons
  const phases = [
    'moon-new',           // 0.000 - 0.062
    'moon-waxing-crescent', // 0.063 - 0.187
    'moon-first-quarter',   // 0.188 - 0.312
    'moon-waxing-gibbous',  // 0.313 - 0.437
    'moon-full',            // 0.438 - 0.562
    'moon-waning-gibbous',  // 0.563 - 0.687
    'moon-last-quarter',    // 0.688 - 0.812
    'moon-waning-crescent'  // 0.813 - 0.937
  ];

  // Normalize to 0-1 range
  const normalized = ((moonPhase % 1) + 1) % 1;

  // Determine which phase (8 phases)
  const phaseIndex = Math.floor(normalized * 8);

  return phases[Math.min(phaseIndex, 7)];
}
