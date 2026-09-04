import sharp from 'sharp';
import fs from 'fs';

const imgPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\d3600e15-a3e4-4b56-b721-709819dde03e\\.user_uploaded\\media_1788417796086.png';

async function testAttachment() {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  const isPlant = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 235 && (r < 240 || g < 240 || b < 235)) {
      isPlant[i] = 1;
    }
  }

  // Erode to get leaf cores
  const eroded = new Uint8Array(width * height);
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let keep = true;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (!isPlant[(y + dy) * width + (x + dx)]) {
            keep = false; break;
          }
        }
        if (!keep) break;
      }
      if (keep) eroded[y * width + x] = 1;
    }
  }

  // Grow leaf cores back to full leaf boundaries without entering the thin stem
  // Each leaf core gets an ID
  const leafMap = new Int32Array(width * height);
  const visited = new Uint8Array(width * height);
  let leafCount = 0;
  const leaves = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!eroded[idx] || visited[idx]) continue;
      leafCount++;
      const queue = [idx];
      visited[idx] = 1;
      const corePixels = [idx];

      while (queue.length > 0) {
        const cur = queue.pop();
        const cx = cur % width;
        const cy = Math.floor(cur / width);
        const nbs = [cur - 1, cur + 1, cur - width, cur + width];
        for (const nb of nbs) {
          if (nb >= 0 && nb < width * height && eroded[nb] && !visited[nb]) {
            visited[nb] = 1;
            queue.push(nb);
            corePixels.push(nb);
          }
        }
      }

      if (corePixels.length >= 20) {
        for (const p of corePixels) leafMap[p] = leafCount;
        leaves.push({ id: leafCount, corePixels });
      }
    }
  }

  console.log(`Initial ${leaves.length} valid leaf cores.`);

  // Expand leaf IDs out to plant boundaries by up to 3px to capture the full leaf edge
  for (let step = 0; step < 3; step++) {
    const toUpdate = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!isPlant[idx] || leafMap[idx] !== 0) continue;
        const nbs = [idx - 1, idx + 1, idx - width, idx + width];
        for (const nb of nbs) {
          if (leafMap[nb] > 0) {
            toUpdate.push([idx, leafMap[nb]]);
            break;
          }
        }
      }
    }
    for (const [idx, id] of toUpdate) {
      leafMap[idx] = id;
    }
  }

  // Whatever isPlant[idx] is true but leafMap[idx] === 0 is the STEM!
  const isStem = new Uint8Array(width * height);
  let stemPixels = 0;
  for (let i = 0; i < width * height; i++) {
    if (isPlant[i] && leafMap[i] === 0) {
      isStem[i] = 1;
      stemPixels++;
    }
  }
  console.log(`Identified ${stemPixels} stem pixels.`);

  // For each leaf, find attachment point: leaf pixel closest to or touching isStem
  for (const leaf of leaves.slice(0, 5)) {
    let bestDist = 999999;
    let attachX = 0, attachY = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (leafMap[idx] !== leaf.id) continue;
        // Check distance to stem
        for (let dy = -5; dy <= 5; dy++) {
          for (let dx = -5; dx <= 5; dx++) {
            const sx = x + dx, sy = y + dy;
            if (sx >= 0 && sx < width && sy >= 0 && sy < height && isStem[sy * width + sx]) {
              const d2 = dx * dx + dy * dy;
              if (d2 < bestDist) {
                bestDist = d2;
                attachX = sx;
                attachY = sy;
              }
            }
          }
        }
      }
    }
    console.log(`Leaf ${leaf.id} attachment: (${attachX}, ${attachY}) at distance ${Math.sqrt(bestDist).toFixed(1)}px`);
  }
}

testAttachment().catch(console.error);
