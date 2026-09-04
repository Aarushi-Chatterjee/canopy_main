// Test script to verify botanical SVG vine generator
import fs from 'fs';

function generateBotanicalVineSVG(height, isRight = false, density = 'medium') {
  const width = 160;
  const leafCount = density === 'dense' ? Math.floor(height / 65) : Math.floor(height / 85);
  
  // Main stem path
  const pts = [];
  const segments = Math.max(4, Math.floor(height / 200));
  const segHeight = height / segments;
  
  let curX = isRight ? width - 40 : 40;
  let curY = 0;
  pts.push(`M ${curX.toFixed(1)} 0`);
  
  for (let i = 1; i <= segments; i++) {
    const nextY = i * segHeight;
    const wave = (i % 2 === 1 ? 1 : -1) * (isRight ? -1 : 1);
    const cp1X = curX + wave * 35;
    const cp1Y = curY + segHeight * 0.35;
    const cp2X = curX - wave * 20;
    const cp2Y = curY + segHeight * 0.75;
    const endX = (isRight ? width - 45 : 45) + (Math.sin(i * 1.5) * 15);
    
    pts.push(`C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${endX.toFixed(1)} ${nextY.toFixed(1)}`);
    curX = endX;
    curY = nextY;
  }
  
  const stemPathD = pts.join(' ');
  
  // Leaf palette from storybook tree illustration
  const leafColors = [
    { fill: '#5f9a4c', vein: '#26241a' }, // vibrant brand leaf
    { fill: '#82b969', vein: '#26241a' }, // sunlit light leaf
    { fill: '#3d795b', vein: '#26241a' }, // deep forest leaf
    { fill: '#9dbd8c', vein: '#26241a' }, // soft sage leaf
    { fill: '#73a85b', vein: '#26241a' }  // fresh olive leaf
  ];

  let leavesSVG = '';
  let twigsSVG = '';

  for (let i = 0; i < leafCount; i++) {
    const frac = (i + 0.5) / leafCount;
    const y = frac * height;
    // Position on stem roughly
    const stemX = (isRight ? width - 45 : 45) + Math.sin(frac * segments * Math.PI) * 22;
    
    // Twig extends outward toward or away from content
    const side = (i % 2 === 0 ? 1 : -1) * (isRight ? -1 : 1);
    const twigLen = 18 + (i % 3) * 6;
    const twigAngle = (i % 2 === 0 ? 35 : -35) + (Math.sin(i * 2) * 15);
    const rad = (twigAngle * Math.PI) / 180;
    const endTwigX = stemX + side * Math.cos(rad) * twigLen;
    const endTwigY = y + Math.sin(rad) * twigLen;
    
    // Twig path
    twigsSVG += `<path class="ivy-twig" d="M ${stemX.toFixed(1)} ${y.toFixed(1)} Q ${(stemX + endTwigX)/2 + side * 4} ${(y + endTwigY)/2} ${endTwigX.toFixed(1)} ${endTwigY.toFixed(1)}" stroke="#2c523b" stroke-width="1.8" stroke-linecap="round" fill="none" />\n`;
    
    // Leaf at end of twig
    const color = leafColors[i % leafColors.length];
    const leafRot = twigAngle + (side > 0 ? 90 : -90) + (i % 4 - 2) * 8;
    const leafScale = 0.85 + (i % 5) * 0.08;
    
    // Storybook almond leaf shape with center vein
    leavesSVG += `
      <g class="ivy-leaf-group" data-frac="${frac.toFixed(3)}" transform="translate(${endTwigX.toFixed(1)}, ${endTwigY.toFixed(1)}) rotate(${leafRot.toFixed(1)}) scale(0)">
        <!-- Almond botanical leaf matching Canopy storybook tree theme -->
        <path class="leaf-blade" d="M 0 0 C -7 -9 -11 -21 0 -30 C 11 -21 7 -9 0 0 Z" fill="${color.fill}" stroke="#26241a" stroke-width="1.4" stroke-linejoin="round" />
        <!-- Center vein -->
        <path class="leaf-vein" d="M 0 0 C 0 -8 0 -18 0 -26" stroke="#26241a" stroke-width="1.1" stroke-linecap="round" fill="none" />
      </g>
    `;
  }

  return `
<svg class="botanical-ivy-svg ${isRight ? 'ivy-right' : 'ivy-left'}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <g class="ivy-twigs">${twigsSVG}</g>
  <path class="ivy-main-stem" d="${stemPathD}" stroke="#264734" stroke-width="2.6" stroke-linecap="round" fill="none" />
  <g class="ivy-leaves">${leavesSVG}</g>
</svg>
  `;
}

const testOutput = generateBotanicalVineSVG(800, false, 'medium');
console.log('Sample SVG generated, length:', testOutput.length);
