import { readFileSync, writeFileSync } from 'fs';

const iconsToCrop = ['sunrise', 'sunset', 'moonrise', 'moonset', 'horizon'];

// New viewBox that crops to just the meaningful content
// Original: viewBox="0 0 512 512"
// New: viewBox="32 80 448 280" - crops top, bottom, left, right padding
const newViewBox = '32 80 448 280';

for (const icon of iconsToCrop) {
  const filePath = `./static/icons/${icon}.svg`;

  try {
    let svg = readFileSync(filePath, 'utf8');

    // Replace the viewBox
    svg = svg.replace(/viewBox="0 0 512 512"/, `viewBox="${newViewBox}"`);

    writeFileSync(filePath, svg);
    console.log(`✓ Cropped ${icon}.svg`);
  } catch (err) {
    console.error(`✗ Error cropping ${icon}.svg:`, err.message);
  }
}

console.log('Done!');
