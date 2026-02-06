const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    // Draw wind icon (simplified)
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size * 0.04;
    
    const centerY = size / 2;
    const iconSize = size * 0.6;
    const startX = size * 0.2;
    
    // Three wind lines
    for (let i = 0; i < 3; i++) {
        const y = centerY + (i - 1) * iconSize * 0.25;
        ctx.beginPath();
        ctx.arc(startX + iconSize * 0.7, y, iconSize * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + iconSize * 0.5, y);
        ctx.stroke();
    }

    // Save PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icons/icon-${size}x${size}.png`, buffer);
    console.log(`✓ Generated icon-${size}x${size}.png`);
});

console.log('\n✅ All PNG icons generated successfully!');
