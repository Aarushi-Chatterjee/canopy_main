import sharp from 'sharp';

async function checkDesignMockup() {
  const fullMockupPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\081b48cf-1d55-4b8b-90e1-b312caae9131\\.user_uploaded\\media_1787849046914.png';
  const meta = await sharp(fullMockupPath).metadata();
  console.log('Full mockup dimensions:', meta.width, 'x', meta.height);
}

checkDesignMockup().catch(console.error);
