import sharp from 'sharp';
import fs from 'fs';

const imgPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\d3600e15-a3e4-4b56-b721-709819dde03e\\.user_uploaded\\media_1788417796086.png';

async function extractLeavesData() {
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

  // Erode to isolate leaf cores
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

  // Segment leaf cores
  const leafMap = new Int32Array(width * height);
  const visited = new Uint8Array(width * height);
  let leafCount = 0;
  const leafCores = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!eroded[idx] || visited[idx]) continue;
      leafCount++;
      const queue = [idx];
      visited[idx] = 1;
      const core = [idx];
      while (queue.length > 0) {
        const cur = queue.pop();
        const nbs = [cur - 1, cur + 1, cur - width, cur + width];
        for (const nb of nbs) {
          if (nb >= 0 && nb < width * height && eroded[nb] && !visited[nb]) {
            visited[nb] = 1;
            queue.push(nb);
            core.push(nb);
          }
        }
      }
      if (core.length >= 20) {
        for (const p of core) leafMap[p] = leafCount;
        leafCores.push({ id: leafCount, core });
      }
    }
  }

  // Expand leaf IDs out to capture full leaf edges
  for (let s = 0; s < 3; s++) {
    const upd = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!isPlant[idx] || leafMap[idx] !== 0) continue;
        const nbs = [idx - 1, idx + 1, idx - width, idx + width];
        for (const nb of nbs) {
          if (leafMap[nb] > 0) {
            upd.push([idx, leafMap[nb]]);
            break;
          }
        }
      }
    }
    for (const [p, id] of upd) leafMap[p] = id;
  }

  // Identify stem pixels
  const isStem = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (isPlant[i] && leafMap[i] === 0) {
      isStem[i] = 1;
    }
  }

  // Build leaf objects with accurate bounding boxes and attachment points
  const leaves = [];
  for (const { id } of leafCores) {
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let sumX = 0, sumY = 0, count = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (leafMap[idx] === id) {
          count++;
          sumX += x; sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (count < 20) continue;

    // Find attachment point on stem
    let bestD2 = 999999;
    let attachX = minX, attachY = minY;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (leafMap[y * width + x] !== id) continue;
        for (let dy = -6; dy <= 6; dy++) {
          for (let dx = -6; dx <= 6; dx++) {
            const sx = x + dx, sy = y + dy;
            if (sx >= 0 && sx < width && sy >= 0 && sy < height && isStem[sy * width + sx]) {
              const d2 = dx * dx + dy * dy;
              if (d2 < bestD2) {
                bestD2 = d2;
                attachX = sx;
                attachY = sy;
              }
            }
          }
        }
      }
    }

    leaves.push({
      id,
      cx: Math.round(sumX / count),
      cy: Math.round(sumY / count),
      box: [minX, minY, maxX, maxY],
      attach: [attachX, attachY],
      distToStem: Math.round(Math.sqrt(bestD2) * 10) / 10
    });
  }

  // Calculate chronological vine order:
  // From y=0 to y=160: single vine sweeping right (progress 0.00 to 0.18)
  // From y=160 to y=350: vine sweeping left and splitting (progress 0.18 to 0.40)
  // From y=350 to y=1024: 5 cascading vines growing down simultaneously (progress 0.40 to 1.00)
  leaves.forEach(leaf => {
    const [ax, ay] = leaf.attach;
    let p = 0;
    if (ay <= 160) {
      // Sweeping from x=110 to x=490
      p = (ay / 160) * 0.18;
    } else if (ay <= 350) {
      // Loop down-left and split
      p = 0.18 + ((ay - 160) / (350 - 160)) * 0.22;
    } else {
      // 5 columns cascading down to 1024
      // Add slight organic staggered offsets based on column (x position)
      const colOffset = Math.sin(ax * 0.05) * 0.03;
      p = 0.40 + ((ay - 350) / (1024 - 350)) * 0.58 + colOffset;
    }
    leaf.progress = Math.max(0.01, Math.min(0.98, Math.round(p * 1000) / 1000));
  });

  // Sort by growth progress
  leaves.sort((a, b) => a.progress - b.progress);

  console.log(`Generated data for ${leaves.length} leaves.`);
  fs.writeFileSync('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\ivy-leaves.json', JSON.stringify(leaves, null, 2));
  console.log('Saved public/ivy-leaves.json!');
}

extractLeavesData().catch(console.error);
