import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const publicDir = join(process.cwd(), 'public');
const svgPath = join(publicDir, 'favicon.svg');

// Read the SVG
const svgBuffer = readFileSync(svgPath);

// Define all sizes needed
const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

async function generateFavicons() {
  console.log('Generating favicons from SVG...\n');
  
  for (const { name, size } of sizes) {
    const outputPath = join(publicDir, name);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated ${name} (${size}x${size})`);
  }
  
  console.log('\n✅ All favicons generated successfully!');
}

generateFavicons().catch(console.error);

