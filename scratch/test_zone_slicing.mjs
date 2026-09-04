import fs from 'fs';

const leaves = JSON.parse(fs.readFileSync('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\ivy-leaves.json', 'utf8'));

const zones = [
  { name: 'Zone 1 (problem)', y0: 0, y1: 230 },
  { name: 'Zone 2 (solution)', y0: 210, y1: 470 },
  { name: 'Zone 3 (for)', y0: 450, y1: 760 },
  { name: 'Zone 4 (connect)', y0: 740, y1: 1024 }
];

zones.forEach((z, zi) => {
  const zLeaves = leaves.filter(l => l.cy >= z.y0 && l.cy < z.y1);
  console.log(`${z.name}: range y=[${z.y0}, ${z.y1}], height=${z.y1 - z.y0}, leaves=${zLeaves.length}`);
  // Check min & max cy
  const cys = zLeaves.map(l => l.cy);
  console.log(`   cy min: ${Math.min(...cys)}, cy max: ${Math.max(...cys)}`);
});
