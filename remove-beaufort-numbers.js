import { readFileSync, writeFileSync } from 'fs';

const beaufortIcons = [
  'wind-beaufort-0',
  'wind-beaufort-1',
  'wind-beaufort-2',
  'wind-beaufort-3',
  'wind-beaufort-4',
  'wind-beaufort-5',
  'wind-beaufort-6',
  'wind-beaufort-7',
  'wind-beaufort-8',
  'wind-beaufort-9',
  'wind-beaufort-10',
  'wind-beaufort-11',
  'wind-beaufort-12',
];

console.log('Removing numbers from Beaufort SVG icons...');

for (const icon of beaufortIcons) {
  const filePath = `./static/icons/${icon}.svg`;

  try {
    let svg = readFileSync(filePath, 'utf8');

    // Remove the path element that contains the number (has fill="#374251")
    // Handle both self-closing and regular path tags
    svg = svg.replace(/<path fill="#374251"[^>]*\/>/g, '');
    svg = svg.replace(/<path fill="#374251"[^>]*><\/path>/g, '');

    writeFileSync(filePath, svg);
    console.log(`✓ Removed number from ${icon}.svg`);
  } catch (err) {
    console.error(`✗ Error processing ${icon}.svg:`, err.message);
  }
}

console.log('Done!');
