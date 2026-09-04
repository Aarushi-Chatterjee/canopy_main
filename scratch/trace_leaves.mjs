import sharp from 'sharp';
import fs from 'fs';

const imgPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\d3600e15-a3e4-4b56-b721-709819dde03e\\.user_uploaded\\media_1788417796086.png';

async function testTrace() {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  console.log(`Loaded image ${width}x${height}`);

  // Create binary plant mask
  // Vine & leaves are sage/olive (lum < 235)
  const isPlant = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 235 && (r < 240 || g < 240 || b < 235)) {
      isPlant[i] = 1;
    }
  }

  // Erode by 2px to isolate leaves from thin 2-3px stems
  const eroded = new Uint8Array(width * height);
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let keep = true;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (!isPlant[(y + dy) * width + (x + dx)]) {
            keep = false;
            break;
          }
        }
        if (!keep) break;
      }
      if (keep) eroded[y * width + x] = 1;
    }
  }

  // Find connected components in eroded mask
  const visited = new Uint8Array(width * height);
  const leaves = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!eroded[idx] || visited[idx]) continue;

      const queue = [idx];
      visited[idx] = 1;
      let minX = x, maxX = x, minY = y, maxY = y;
      let sumX = 0, sumY = 0, count = 0;
      let head = 0;

      while (head < queue.length) {
        const cur = queue[head++];
        count++;
        const cx = cur % width;
        const cy = Math.floor(cur / width);
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const nbs = [cur - 1, cur + 1, cur - width, cur + width];
        for (const nb of nbs) {
          if (nb >= 0 && nb < width * height && eroded[nb] && !visited[nb]) {
            visited[nb] = 1;
            queue.push(nb);
          }
        }
      }

      if (count >= 20) {
        leaves.push({
          id: leaves.length,
          count,
          cx: Math.round(sumX / count),
          cy: Math.round(sumY / count),
          box: [minX, minY, maxX, maxY]
        });
      }
    }
  }

  console.log(`Found ${leaves.length} individual leaves.`);
  // Sort leaves by y coordinate (from top to bottom growth order!)
  leaves.sort((a, b) => a.cy - b.cy);
  console.log('First 5 leaves (top):', leaves.slice(0, 5));
  console.log('Last 5 leaves (bottom):', leaves.slice(-5));
}

testTrace().catch(console.error);
