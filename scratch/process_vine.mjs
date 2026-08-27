import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\081b48cf-1d55-4b8b-90e1-b312caae9131\\.user_uploaded\\media_1787849978499.png';
const outputPngPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-climbing.png';

async function processVine() {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  console.log('Image dimensions:', metadata.width, metadata.height);

  // Read raw pixels
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  
  // Channels is either 3 (RGB) or 4 (RGBA)
  const channels = info.channels;
  const numPixels = info.width * info.height;
  const rgbaBuffer = Buffer.alloc(info.width * info.height * 4);

  for (let i = 0; i < numPixels; i++) {
    const srcIdx = i * channels;
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];
    
    // Check if background (white / near-white)
    // The vine is sage green (approx r=150, g=180, b=150). White is r>240, g>240, b>240.
    const isWhite = (r > 240 && g > 240 && b > 240);
    const destIdx = i * 4;

    if (isWhite) {
      rgbaBuffer[destIdx] = 0;
      rgbaBuffer[destIdx + 1] = 0;
      rgbaBuffer[destIdx + 2] = 0;
      rgbaBuffer[destIdx + 3] = 0; // completely transparent
    } else {
      // Calculate opacity based on darkness relative to white
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      // Smooth anti-aliased edge
      let alpha = 255;
      if (luminance > 220) {
        alpha = Math.max(0, Math.min(255, Math.round((255 - luminance) / 35 * 255)));
      }
      
      // Preserve the exact green color from the vine image or map to the brand leaf tone
      rgbaBuffer[destIdx] = r;
      rgbaBuffer[destIdx + 1] = g;
      rgbaBuffer[destIdx + 2] = b;
      rgbaBuffer[destIdx + 3] = alpha;
    }
  }

  await sharp(rgbaBuffer, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png()
  .toFile(outputPngPath);

  console.log('Saved transparent vine to:', outputPngPath);
}

processVine().catch(console.error);
