// Verify incremental stem pixel bucket performance
import sharp from 'sharp';

const stemPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png';
const growthMapPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-growth-map.png';

async function testBuckets() {
  const [stem, map] = await Promise.all([
    sharp(stemPath).raw().toBuffer({ resolveWithObject: true }),
    sharp(growthMapPath).raw().toBuffer({ resolveWithObject: true })
  ]);

  const { width, height } = stem.info;
  const stemData = stem.data;
  const mapData = map.data;

  // Build 256 buckets
  const buckets = Array.from({ length: 256 }, () => []);
  let totalStemPx = 0;

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const a = stemData[idx + 3];
    if (a > 15) {
      const b = mapData[idx];
      buckets[b].push(idx);
      totalStemPx++;
    }
  }

  console.log(`Total stem pixels: ${totalStemPx}`);
  console.log(`Average pixels per bucket: ${(totalStemPx / 256).toFixed(1)}`);
  console.log(`Bucket 0 count: ${buckets[0].length}, Bucket 50 count: ${buckets[50].length}, Bucket 200 count: ${buckets[200].length}`);
}

testBuckets().catch(console.error);
