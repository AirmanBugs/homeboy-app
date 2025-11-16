import { writeFileSync } from 'fs';
import { mkdir } from 'fs/promises';

const baseUrl = 'https://cdn.jsdelivr.net/gh/basmilius/weather-icons@dev/production/fill/svg';

const icons = [
  // Weather conditions
  'clear-day', 'clear-night', 'partly-cloudy-day', 'partly-cloudy-night',
  'cloudy', 'overcast', 'rain', 'drizzle', 'snow', 'sleet', 'fog',
  'thunderstorms', 'thunderstorms-rain', 'thunderstorms-snow',
  'rain-day', 'rain-night', 'snow-day', 'snow-night',
  'sleet-day', 'sleet-night', 'thunderstorms-day-rain', 'thunderstorms-night-rain',
  'thunderstorms-day-snow', 'thunderstorms-night-snow',

  // Small indicators
  'raindrop', 'humidity',

  // UV index
  'uv-index-1', 'uv-index-2', 'uv-index-3', 'uv-index-4', 'uv-index-5',
  'uv-index-6', 'uv-index-7', 'uv-index-8', 'uv-index-9', 'uv-index-10', 'uv-index-11',

  // Moon phases
  'moon-new', 'moon-waxing-crescent', 'moon-first-quarter', 'moon-waxing-gibbous',
  'moon-full', 'moon-waning-gibbous', 'moon-last-quarter', 'moon-waning-crescent'
];

await mkdir('./static/icons', { recursive: true });

console.log('Downloading icons...');

for (const icon of icons) {
  const url = `${baseUrl}/${icon}.svg`;
  console.log(`Downloading ${icon}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download ${icon}: ${response.status}`);
      continue;
    }

    const svg = await response.text();
    writeFileSync(`./static/icons/${icon}.svg`, svg);
    console.log(`✓ ${icon}`);
  } catch (err) {
    console.error(`Error downloading ${icon}:`, err.message);
  }
}

console.log('Done!');
