const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'images-logos');
const destDir = path.join(__dirname, '..', 'public');

// Copy directly from images-logos as requested by user
const filesToCopy = [
  { from: 'canopy logo.png', to: 'canopy-logo.png' },
  { from: 'favicon.png', to: 'favicon.png' },
  { from: 'favicon.png', to: 'favicon-32.png' },
  { from: 'favicon.png', to: 'favicon-16.png' },
  { from: 'monochrome white.png', to: 'apple-touch-icon.png' },
  { from: 'monochrome dark.png', to: 'canopy-monochrome-dark.png' },
  { from: 'monochrome white.png', to: 'canopy-monochrome-white.png' },
  { from: 'wordmark lockup.png', to: 'canopy-wordmark.png' }
];

for (const f of filesToCopy) {
  const src = path.join(srcDir, f.from);
  const dest = path.join(destDir, f.to);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${f.from} -> ${f.to}`);
  } else {
    console.warn(`Source not found: ${src}`);
  }
}
console.log('All logo and favicon assets synced from images-logos successfully!');
