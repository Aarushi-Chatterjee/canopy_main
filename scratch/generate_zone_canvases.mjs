import sharp from 'sharp';
import fs from 'fs';

const stemPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-stems-isolated.png';
const mapPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-growth-map.png';
const leavesPath = 'c:\\Users\\HP\\Desktop\\canopy_animated\\public\\vine-leaves-isolated.png';

const zones = [
  { id: 1, name: 'problem', y0: 0, y1: 230 },
  { id: 2, name: 'solution', y0: 210, y1: 470 },
  { id: 3, name: 'for', y0: 450, y1: 760 },
  { id: 4, name: 'connect', y0: 740, y1: 1024 }
];

async function sliceZones() {
  const leavesAll = JSON.parse(fs.readFileSync('c:\\Users\\HP\\Desktop\\canopy_animated\\public\\ivy-leaves.json', 'utf8'));

  for (const z of zones) {
    const h = z.y1 - z.y0;

    // Slice stems
    await sharp(stemPath)
      .extract({ left: 0, top: z.y0, width: 564, height: h })
      .toFile(`c:\\Users\\HP\\Desktop\\canopy_animated\\public\\zone-${z.id}-stem.png`);

    // Slice growth map
    await sharp(mapPath)
      .extract({ left: 0, top: z.y0, width: 564, height: h })
      .toFile(`c:\\Users\\HP\\Desktop\\canopy_animated\\public\\zone-${z.id}-map.png`);

    // Extract leaves metadata for this zone with normalized local y offsets
    const zLeaves = leavesAll
      .filter(l => l.cy >= z.y0 && l.cy < z.y1)
      .map(l => ({
        id: l.id,
        box: [l.box[0], l.box[1] - z.y0, l.box[2], l.box[3] - z.y0],
        attach: [l.attach[0], l.attach[1] - z.y0],
        absBox: l.box,
        cy: l.cy - z.y0,
        origCy: l.cy
      }));

    // Normalize relative progress within the zone (0..1)
    const minCy = Math.min(...zLeaves.map(l => l.cy));
    const maxCy = Math.max(...zLeaves.map(l => l.cy));
    zLeaves.forEach(l => {
      l.relProgress = (l.cy - minCy) / Math.max(1, maxCy - minCy);
    });
    zLeaves.sort((a, b) => a.relProgress - b.relProgress);

    fs.writeFileSync(`c:\\Users\\HP\\Desktop\\canopy_animated\\public\\zone-${z.id}-leaves.json`, JSON.stringify(zLeaves, null, 2));

    console.log(`Saved Zone ${z.id} (${z.name}): height=${h}, leaves=${zLeaves.length}`);
  }
}

sliceZones().catch(console.error);
