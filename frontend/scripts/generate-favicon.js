import sharp from 'sharp';

async function generateFavicon() {
  try {
    const meta = await sharp('./public/logo.png').metadata();
    const size = meta.height; // Using height to get a square on the left
    
    await sharp('./public/logo.png')
      .extract({ left: 0, top: 0, width: size, height: size })
      .toFile('./public/favicon.png');
      
    console.log('favicon.png created successfully!');
  } catch (err) {
    console.error('Error generating favicon:', err);
  }
}

generateFavicon();
