const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. Create crisp vector SVG favicon with light and dark mode responsiveness
const svgFaviconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 48" fill="none">
  <style>
    .stem { stroke: #1f5c40; }
    .leaf-left { fill: #5f9a4c; }
    .leaf-right { fill: #e3b23f; }
    @media (prefers-color-scheme: dark) {
      .stem { stroke: #7fd9a4; }
      .leaf-left { fill: #8fe39b; }
      .leaf-right { fill: #e9c364; }
    }
  </style>
  <g transform="translate(2, 2)">
    <path class="stem" d="M20 44V24" stroke-width="2.8" stroke-linecap="round"/>
    <path class="leaf-left" d="M20 26C20 26 4 24 5 6C20 6 20 26 20 26Z"/>
    <path class="leaf-right" d="M20 19C20 19 36 16 35 2C20 3 20 19 20 19Z"/>
  </g>
</svg>
`;

// 2. High-res raster SVG for rendering PNGs at all sizes
const svgForPng = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="512" height="512" fill="none">
  <g transform="translate(4, 2)">
    <path d="M20 44V24" stroke="#1f5c40" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M20 26C20 26 4 24 5 6C20 6 20 26 20 26Z" fill="#5f9a4c"/>
    <path d="M20 19C20 19 36 16 35 2C20 3 20 19 20 19Z" fill="#e3b23f"/>
  </g>
</svg>`;

// Apple Touch Icon with soft warm-sand circular/rounded card background
const svgAppleTouch = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" rx="38" fill="#fcf8ea"/>
  <rect width="180" height="180" rx="38" fill="none" stroke="#e4dabb" stroke-width="2"/>
  <g transform="translate(45, 34) scale(2.05)">
    <path d="M20 44V24" stroke="#1f5c40" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M20 26C20 26 4 24 5 6C20 6 20 26 20 26Z" fill="#5f9a4c"/>
    <path d="M20 19C20 19 36 16 35 2C20 3 20 19 20 19Z" fill="#e3b23f"/>
  </g>
</svg>`;

async function generate() {
  const publicDir = path.join(__dirname, '..', 'public');
  
  // Write favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFaviconContent);
  console.log('✓ Wrote public/favicon.svg');

  const pngBuffer = Buffer.from(svgForPng);
  const touchBuffer = Buffer.from(svgAppleTouch);

  // Generate PNG sizes
  await sharp(pngBuffer).resize(16, 16).png().toFile(path.join(publicDir, 'favicon-16.png'));
  console.log('✓ Wrote public/favicon-16.png');

  await sharp(pngBuffer).resize(32, 32).png().toFile(path.join(publicDir, 'favicon-32.png'));
  console.log('✓ Wrote public/favicon-32.png');

  await sharp(pngBuffer).resize(48, 48).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Wrote public/favicon.png');

  await sharp(pngBuffer).resize(512, 512).png().toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ Wrote public/icon-512.png');

  await sharp(touchBuffer).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Wrote public/apple-touch-icon.png');

  // Also create a crisp 128x128 brand logo PNG replacing the old clipart tree
  await sharp(pngBuffer).resize(128, 128).png().toFile(path.join(publicDir, 'canopy-logo.png'));
  console.log('✓ Wrote public/canopy-logo.png (consistent brand mark)');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
