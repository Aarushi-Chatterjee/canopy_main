import sharp from 'sharp';

async function analyzeLeaves() {
  const vinePath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-climbing.png';
  const meta = await sharp(vinePath).metadata();
  console.log('Vine size:', meta.width, meta.height);
}

analyzeLeaves().catch(console.error);
