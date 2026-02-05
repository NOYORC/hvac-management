// Simple icon generator using SVG to create placeholder icons
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
    const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#grad)"/>
  
  <!-- Wind icon (3 curved lines) -->
  <g stroke="white" stroke-width="${size * 0.06}" stroke-linecap="round" fill="none">
    <!-- Top curve -->
    <path d="M ${size * 0.3} ${size * 0.35} Q ${size * 0.6} ${size * 0.25} ${size * 0.7} ${size * 0.35}"/>
    <!-- Middle curve (longer) -->
    <path d="M ${size * 0.25} ${size * 0.5} Q ${size * 0.55} ${size * 0.4} ${size * 0.75} ${size * 0.5}"/>
    <!-- Bottom curve -->
    <path d="M ${size * 0.3} ${size * 0.65} Q ${size * 0.6} ${size * 0.75} ${size * 0.7} ${size * 0.65}"/>
  </g>
</svg>`.trim();
    
    fs.writeFileSync(path.join(__dirname, 'icons', `icon-${size}x${size}.svg`), svg);
    console.log(`✅ Generated icon-${size}x${size}.svg`);
});

console.log('✅ All SVG icons generated!');
console.log('Note: SVG icons will work for PWA. For better compatibility, convert to PNG using an online tool.');
