import sharp from 'sharp';

async function createVariants() {
  const vinePath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-climbing.png';
  const flipPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-climbing-flip.png';
  
  // Flip horizontally
  await sharp(vinePath)
    .flop() // horizontal mirror
    .toFile(flipPath);

  console.log('Created flipped vine variant at:', flipPath);
}

createVariants().catch(console.error);
