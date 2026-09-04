import sharp from 'sharp';
import fs from 'fs';

const stemImg = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png';
const leavesImg = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-leaves-isolated.png';

async function checkZones() {
  const meta = await sharp(stemImg).metadata();
  console.log('Stem dimensions:', meta.width, meta.height);

  // Read leaves JSON
  const leaves = JSON.parse(fs.readFileSync('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\ivy-leaves.json', 'utf8'));
  console.log('Total leaves:', leaves.length);

  // Analyze leaves distribution by Y coordinate:
  const z1 = leaves.filter(l => l.cy <= 220);
  const z2 = leaves.filter(l => l.cy > 220 && l.cy <= 450);
  const z3 = leaves.filter(l => l.cy > 450 && l.cy <= 750);
  const z4 = leaves.filter(l => l.cy > 750);

  console.log('Zone 1 (Top Arc, y <= 220):', z1.length, 'leaves');
  console.log('Zone 2 (Branching S-loop, 220 < y <= 450):', z2.length, 'leaves');
  console.log('Zone 3 (Parallel Cascades, 450 < y <= 750):', z3.length, 'leaves');
  console.log('Zone 4 (Dense Canopy Wall, y > 750):', z4.length, 'leaves');
}

checkZones().catch(console.error);
