import sharp from 'sharp';

async function generateBranches() {
  const vinePath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-climbing.png';
  const flipPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-climbing-flip.png';
  
  // 1. Horizontal arching branch (rotated -65 deg)
  await sharp(vinePath)
    .rotate(-65, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-arch.png');

  // 2. Flipped arching branch
  await sharp(flipPath)
    .rotate(65, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-arch-flip.png');

  console.log('Successfully generated arch branches!');
}

generateBranches().catch(console.error);
