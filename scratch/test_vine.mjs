import sharp from 'sharp';

async function testOverlay() {
  const vinePath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-climbing.png';
  const metadata = await sharp(vinePath).metadata();
  console.log('Vine PNG dimensions:', metadata.width, 'x', metadata.height, 'hasAlpha:', metadata.hasAlpha);
}

testOverlay().catch(console.error);
