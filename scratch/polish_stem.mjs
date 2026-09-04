import sharp from 'sharp';

const inputStem = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png';
const outputStem = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png';

async function polishStem() {
  const { data, info } = await sharp(inputStem).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  console.log(`Processing stem: ${width}x${height}`);

  // Create an expanded buffer to dilate by 1 pixel so the stem is sturdy and visible
  const dilated = Buffer.alloc(width * height * 4);

  // First pass: detect presence of stem
  const isStem = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] > 20) {
      isStem[i] = 1;
    }
  }

  // Botanical stem colors:
  // Core: deep botanical forest #284433 (rgb 40, 68, 51)
  // Edge: softer forest #3a5c46 (rgb 58, 92, 70)
  const coreR = 42, coreG = 70, coreB = 53;
  const edgeR = 60, edgeG = 92, edgeB = 72;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const outIdx = idx * 4;

      if (isStem[idx]) {
        // Core stem pixel: full rich opacity
        dilated[outIdx] = coreR;
        dilated[outIdx + 1] = coreG;
        dilated[outIdx + 2] = coreB;
        dilated[outIdx + 3] = 255;
      } else {
        // Check 1-pixel neighborhood for dilation
        let neighborCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (isStem[ny * width + nx]) neighborCount++;
            }
          }
        }

        if (neighborCount > 0) {
          // Smooth anti-aliased edge pixel
          const alpha = Math.min(255, Math.round((neighborCount / 5) * 230));
          dilated[outIdx] = edgeR;
          dilated[outIdx + 1] = edgeG;
          dilated[outIdx + 2] = edgeB;
          dilated[outIdx + 3] = alpha;
        } else {
          dilated[outIdx + 3] = 0;
        }
      }
    }
  }

  await sharp(dilated, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputStem);

  console.log('Polished stem saved successfully to vine-stems-isolated.png!');
}

polishStem().catch(console.error);
