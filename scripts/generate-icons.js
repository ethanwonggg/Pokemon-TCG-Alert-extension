/**
 * Icon Generator for PokéDrop AU
 * Run: node scripts/generate-icons.js
 * Requires: npm install canvas
 */

const fs = require('fs');
const path = require('path');

// Try to use canvas, fallback to creating placeholder icons
async function generateIcons() {
  const iconsDir = path.join(__dirname, '..', 'icons');
  
  // Ensure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  try {
    // Try to use node-canvas
    const { createCanvas } = require('canvas');
    
    const sizes = [16, 32, 48, 128];
    
    for (const size of sizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      const center = size / 2;
      const radius = size * 0.45;
      const strokeWidth = Math.max(1, size / 16);

      // Background circle
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.strokeStyle = '#ffd93d';
      ctx.lineWidth = strokeWidth;
      ctx.stroke();

      // Top half (red tint)
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius - strokeWidth/2, Math.PI, 0);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 71, 87, 0.3)';
      ctx.fillRect(0, 0, size, center);
      ctx.restore();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(center - radius, center);
      ctx.lineTo(center + radius, center);
      ctx.strokeStyle = '#ffd93d';
      ctx.lineWidth = strokeWidth;
      ctx.stroke();

      // Center button (outer)
      const btnRadius = size * 0.14;
      ctx.beginPath();
      ctx.arc(center, center, btnRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.strokeStyle = '#ffd93d';
      ctx.lineWidth = strokeWidth;
      ctx.stroke();

      // Center button (inner)
      const innerRadius = size * 0.08;
      ctx.beginPath();
      ctx.arc(center, center, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd93d';
      ctx.fill();

      // Shine effect for larger icons
      if (size >= 48) {
        ctx.save();
        ctx.translate(center - radius * 0.4, center - radius * 0.5);
        ctx.rotate(-30 * Math.PI / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.2, radius * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fill();
        ctx.restore();
      }

      // Save to file
      const buffer = canvas.toBuffer('image/png');
      const filename = path.join(iconsDir, `icon${size}.png`);
      fs.writeFileSync(filename, buffer);
      console.log(`✓ Generated ${filename}`);
    }
    
    console.log('\n✅ All icons generated successfully!');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('canvas module not found. Creating placeholder icons...');
      console.log('For best results, run: npm install canvas');
      console.log('Then run this script again.\n');
      
      // Create simple 1x1 transparent PNG placeholders
      // This is a valid 1x1 transparent PNG in base64
      const placeholder = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      
      [16, 32, 48, 128].forEach(size => {
        const filename = path.join(iconsDir, `icon${size}.png`);
        fs.writeFileSync(filename, placeholder);
        console.log(`Created placeholder: ${filename}`);
      });
      
      console.log('\n⚠️  Placeholder icons created.');
      console.log('For proper icons, open generate-icons.html in a browser');
      console.log('and download the generated PNG files.');
    } else {
      throw error;
    }
  }
}

generateIcons().catch(console.error);

