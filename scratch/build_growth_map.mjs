import sharp from 'sharp';
import fs from 'fs';

const stemPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png';

async function buildGrowthMap() {
  const { data, info } = await sharp(stemPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  console.log(`Loaded stem image: ${width}x${height}`);

  // Stem pixel map
  const isStem = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] > 30) {
      isStem[i] = 1;
    }
  }

  // Calculate distance / progress along the vine graph
  // Top starts around (110, 0).
  // Let's do a Dijkstra or BFS starting from the top stem pixels (y=0..5, x near 110)
  // Distance along the stem graph:
  const dist = new Float32Array(width * height);
  dist.fill(-1);

  const queue = [];
  // Find seed pixels at top
  for (let y = 0; y < 3; y++) {
    for (let x = 60; x < 120; x++) {
      const idx = y * width + x;
      if (isStem[idx]) {
        dist[idx] = 0;
        queue.push(idx);
      }
    }
  }

  // BFS along stem pixels, bridging small 1-3px petiole gaps
  let head = 0;
  let maxDist = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const cd = dist[cur];
    if (cd > maxDist) maxDist = cd;

    const cx = cur % width;
    const cy = Math.floor(cur / width);

    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          if (isStem[nIdx] && dist[nIdx] === -1) {
            const step = Math.sqrt(dx * dx + dy * dy);
            dist[nIdx] = cd + step;
            queue.push(nIdx);
          }
        }
      }
    }
  }

  console.log(`Max graph distance reached: ${maxDist}`);
  
  // For any disconnected stem pixels (if any small nubs), connect to nearest visited stem pixel
  let unreached = 0;
  for (let i = 0; i < width * height; i++) {
    if (isStem[i] && dist[i] === -1) {
      unreached++;
      // Find nearest reached pixel
      const cx = i % width;
      const cy = Math.floor(i / width);
      let bestD = 999999;
      let bestDistVal = 0;
      for (let dy = -10; dy <= 10; dy++) {
        for (let dx = -10; dx <= 10; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (dist[nIdx] >= 0) {
              const d2 = dx * dx + dy * dy;
              if (d2 < bestD) {
                bestD = d2;
                bestDistVal = dist[nIdx] + Math.sqrt(d2);
              }
            }
          }
        }
      }
      dist[i] = bestDistVal;
    }
  }
  console.log(`Unreached resolved: ${unreached}`);

  // Normalize progress 0..1 for every stem pixel
  // Pack into an 8-bit grayscale image where pixel value = round(progress * 255)
  // This growth map image will be used by the canvas shader / renderer to reveal the stem in exact order!
  const mapBuf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * 4;
    if (isStem[i]) {
      const p = Math.max(0, Math.min(1, dist[i] / maxDist));
      const val = Math.round(p * 255);
      mapBuf[srcIdx] = val;       // R = progress (0..255)
      mapBuf[srcIdx + 1] = val;   // G
      mapBuf[srcIdx + 2] = val;   // B
      mapBuf[srcIdx + 3] = data[srcIdx + 3]; // Alpha from stem
    } else {
      mapBuf[srcIdx] = 0;
      mapBuf[srcIdx + 1] = 0;
      mapBuf[srcIdx + 2] = 0;
      mapBuf[srcIdx + 3] = 0;
    }
  }

  await sharp(mapBuf, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-growth-map.png');

  console.log('Successfully created public/vine-growth-map.png!');

  // Also update public/ivy-leaves.json so leaf progress matches the exact graph dist at its attachment point!
  const leavesRaw = fs.readFileSync('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\ivy-leaves.json');
  const leaves = JSON.parse(leavesRaw);

  leaves.forEach(leaf => {
    const [ax, ay] = leaf.attach;
    const aIdx = ay * width + ax;
    let leafDist = dist[aIdx];
    if (leafDist < 0) {
      // search nearby
      for (let dy = -5; dy <= 5; dy++) {
        for (let dx = -5; dx <= 5; dx++) {
          const nx = ax + dx, ny = ay + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && dist[ny * width + nx] >= 0) {
            leafDist = dist[ny * width + nx];
            break;
          }
        }
        if (leafDist >= 0) break;
      }
    }
    leaf.progress = Math.max(0.01, Math.min(0.99, Math.round((leafDist / maxDist) * 1000) / 1000));
  });

  leaves.sort((a, b) => a.progress - b.progress);
  fs.writeFileSync('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\ivy-leaves.json', JSON.stringify(leaves, null, 2));
  console.log('Updated public/ivy-leaves.json with exact graph distances!');
}

buildGrowthMap().catch(console.error);
