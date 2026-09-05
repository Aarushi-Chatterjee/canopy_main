const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const htmlFiles = [
  'index.html',
  'match.html',
  'sprint.html',
  'notebook.html',
  'login.html',
  'post-call.html',
  'apply.html',
  'privacy.html',
  'terms.html',
  'builders.html',
  'problem-holders.html',
  'enablers.html',
  '404.html'
];

const svgTargetRegex = /<svg viewBox="0 0 40 44" fill="none" width="40" height="44" aria-hidden="true">\s*<path d="M20 44V24" stroke="var\(--sun\)" stroke-width="2\.5" stroke-linecap="round"\/>\s*<path d="M20 26C20 26 4 24 5 6C20 6 20 26 20 26Z" fill="var\(--leaf\)"\/>\s*<path d="M20 19C20 19 36 16 35 2C20 3 20 19 20 19Z" fill="var\(--sun\)"\/>\s*<\/svg>/g;

const imgReplacement = '<img src="/canopy-logo.png" alt="Canopy Logo" height="40" style="height:40px;width:auto;display:block;">';

const drawerTarget = '<img src="/avatars/avatar-builders.png" alt="" style="width:24px;height:24px;object-fit:contain;">';
const drawerReplacement = '<img src="/canopy-logo.png" alt="Canopy Logo" style="width:24px;height:24px;object-fit:contain;">';

for (const file of htmlFiles) {
  const filePath = path.join(rootDir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let updated = content;

  if (svgTargetRegex.test(updated)) {
    updated = updated.replace(svgTargetRegex, imgReplacement);
  }

  if (updated.includes(drawerTarget)) {
    updated = updated.replace(drawerTarget, drawerReplacement);
  }

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log(`✓ Updated logo references in ${file}`);
  } else {
    console.log(`- No changes needed in ${file}`);
  }
}
console.log('Finished updating logo references in all HTML files.');
