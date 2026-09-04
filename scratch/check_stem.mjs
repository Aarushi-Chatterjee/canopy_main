import sharp from 'sharp';

async function checkStem() {
  const { data, info } = await sharp('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log(`Stem info: ${info.width}x${info.height}`);
  let totalVisible = 0;
  let avgR = 0, avgG = 0, avgB = 0, avgA = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const idx = i * 4;
    const a = data[idx + 3];
    if (a > 20) {
      totalVisible++;
      avgR += data[idx];
      avgG += data[idx + 1];
      avgB += data[idx + 2];
      avgA += a;
    }
  }
  
  console.log(`Visible stem pixels: ${totalVisible}`);
  console.log(`Average Color: rgb(${Math.round(avgR/totalVisible)}, ${Math.round(avgG/totalVisible)}, ${Math.round(avgB/totalVisible)}), alpha: ${Math.round(avgA/totalVisible)}`);
}

checkStem().catch(console.error);
