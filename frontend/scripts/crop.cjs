const Jimp = require('jimp');

async function cropLogo() {
  const image = await Jimp.read('./public/logo.png');
  const w = image.bitmap.width;
  const h = image.bitmap.height;
  
  // Assuming the icon is a square on the left side,
  // we crop a square of size `h` starting from x=0.
  // We'll give it a slight offset if needed, but x=0 is safe.
  console.log(`Original size: ${w}x${h}`);
  
  const iconSize = h; 
  image.crop(0, 0, iconSize, h);
  
  await image.writeAsync('./public/assets/paw.png');
  console.log('Paw extracted and saved as paw.png');
}

cropLogo().catch(console.error);
