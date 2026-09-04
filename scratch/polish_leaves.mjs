import sharp from 'sharp';
import fs from 'fs';

const inputLeaves = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-leaves-isolated.png';
const outputLeaves = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-leaves-isolated.png';

async function polishLeaves() {
  const { data, info } = await sharp(inputLeaves).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  console.log(`Processing leaves: ${width}x${height}`);

  const outData = Buffer.alloc(width * height * 4);

  // We want to polish the leaves to be:
  // - Clean, smooth contours without noisy/jagged fringe
  // - Harmonious minimalistic sage-green fill:
  //   Canopy brand leaf: tone approx rgb(168, 185, 158) -> #a8b99e
  //   Outline: delicate soft dark sage/ink outline rgb(48, 68, 54)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a < 10) {
        outData[idx] = 0;
        outData[idx + 1] = 0;
        outData[idx + 2] = 0;
        outData[idx + 3] = 0;
        continue;
      }

      // Check if it's outline (darker) vs body (lighter sage green)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Polish colors:
      // Dark outline: smooth dark forest/ink
      // Body: smooth, elegant, velvety pastel sage green
      if (lum < 160) {
        // Outline pixel
        const t = Math.max(0, Math.min(1, (lum - 80) / 80));
        // Soft ink forest: rgb(42, 60, 48) to rgb(85, 110, 88)
        outData[idx] = Math.round(42 + t * 45);
        outData[idx + 1] = Math.round(62 + t * 48);
        outData[idx + 2] = Math.round(48 + t * 40);
        outData[idx + 3] = a;
      } else {
        // Leaf body pixel
        // Clean velvety muted sage: rgb(172, 188, 162)
        const t = Math.max(0, Math.min(1, (lum - 160) / 60));
        outData[idx] = Math.round(162 + t * 18);
        outData[idx + 1] = Math.round(180 + t * 16);
        outData[idx + 2] = Math.round(155 + t * 18);
        outData[idx + 3] = a;
      }
    }
  }

  // Smooth anti-aliased edges for minimalistic, high-end feel
  await sharp(outData, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-leaves-polished.png');

  console.log('Saved vine-leaves-polished.png!');
}

polishLeaves().catch(console.error);
