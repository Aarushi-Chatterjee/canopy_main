import sharp from 'sharp';
import fs from 'fs';

const stemPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png';

async function generateGrowthData() {
  const { data, info } = await sharp(stemPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Stem pixel map
  const isStem = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] > 20) {
      isStem[i] = 1;
    }
  }

  function getPixelProgress(x, y) {
    if (y <= 160) {
      // Top diagonal arc: sweeps from x=65, y=0 to x=480, y=160
      return (y / 160) * 0.20;
    } else if (y <= 350) {
      // Middle curve & branching: y from 160 to 350
      // Slight x-dependent offset so right branch trails slightly after left branch
      const xFactor = ((x - 200) / 300) * 0.04;
      return 0.20 + ((y - 160) / (350 - 160)) * 0.25 + xFactor;
    } else {
      // 5 cascading vertical vines down to y=1024
      // Natural organic wave across the 5 columns
      const colPhase = Math.sin((x / 564) * Math.PI * 4) * 0.035;
      return 0.45 + ((y - 350) / (1024 - 350)) * 0.52 + colPhase;
    }
  }

  // Create vine-growth-map.png
  // Each stem pixel's R channel = Math.round(progress * 255)
  // Alpha = original alpha
  const mapBuf = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const srcIdx = idx * 4;
      if (isStem[idx]) {
        const p = Math.max(0, Math.min(1, getPixelProgress(x, y)));
        const val = Math.round(p * 255);
        mapBuf[srcIdx] = val;
        mapBuf[srcIdx + 1] = val;
        mapBuf[srcIdx + 2] = val;
        mapBuf[srcIdx + 3] = data[srcIdx + 3];
      } else {
        mapBuf[srcIdx] = 0;
        mapBuf[srcIdx + 1] = 0;
        mapBuf[srcIdx + 2] = 0;
        mapBuf[srcIdx + 3] = 0;
      }
    }
  }

  await sharp(mapBuf, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-growth-map.png');

  console.log('Saved vine-growth-map.png!');

  // Update public/ivy-leaves.json
  const leavesRaw = fs.readFileSync('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\ivy-leaves.json');
  const leaves = JSON.parse(leavesRaw);

  leaves.forEach(leaf => {
    const [ax, ay] = leaf.attach;
    const p = Math.max(0.01, Math.min(0.98, getPixelProgress(ax, ay)));
    leaf.progress = Math.round(p * 1000) / 1000;
  });

  leaves.sort((a, b) => a.progress - b.progress);
  fs.writeFileSync('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\ivy-leaves.json', JSON.stringify(leaves, null, 2));
  console.log(`Updated ${leaves.length} leaves in public/ivy-leaves.json!`);
}

generateGrowthData().catch(console.error);
