import sharp from 'sharp';
import fs from 'fs';

const imgPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\d3600e15-a3e4-4b56-b721-709819dde03e\\.user_uploaded\\media_1788417796086.png';

async function traceStem() {
  const { data, info } = await sharp(imgPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Plant mask
  const isPlant = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < 235 && (r < 240 || g < 240 || b < 235)) {
      isPlant[i] = 1;
    }
  }

  // Erode to find leaf cores
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
      }
    }
  }

  // Expand leaves by 3px to encompass petiole base
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

  // Create isolated stem buffer and leaf buffer with transparent backgrounds
  const stemBuf = Buffer.alloc(width * height * 4);
  const leavesBuf = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * 4;
    const r = data[srcIdx], g = data[srcIdx+1], b = data[srcIdx+2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    let alpha = 255;
    if (lum > 220) {
      alpha = Math.max(0, Math.min(255, Math.round((255 - lum) / 35 * 255)));
    }

    if (isPlant[i]) {
      if (leafMap[i] === 0) {
        // Stem
        stemBuf[srcIdx] = r;
        stemBuf[srcIdx+1] = g;
        stemBuf[srcIdx+2] = b;
        stemBuf[srcIdx+3] = alpha;
      } else {
        // Leaf
        leavesBuf[srcIdx] = r;
        leavesBuf[srcIdx+1] = g;
        leavesBuf[srcIdx+2] = b;
        leavesBuf[srcIdx+3] = alpha;
      }
    }
  }

  await sharp(stemBuf, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png');

  await sharp(leavesBuf, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-leaves-isolated.png');

  console.log('Saved vine-stems-isolated.png and vine-leaves-isolated.png!');
}

traceStem().catch(console.error);
