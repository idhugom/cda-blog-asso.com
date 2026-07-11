// Render the default Open Graph image (1200x630) — on-brand, crisp, no AI.
import sharp from 'sharp';
import { join } from 'node:path';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#16161a" opacity="0.10"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#faf9f6"/>
  <rect width="1200" height="630" fill="url(#dots)"/>
  <g transform="translate(90,96)">
    <rect x="0" y="0" width="60" height="60" rx="15" fill="none" stroke="#16161a" stroke-width="3.5"/>
    <circle cx="30" cy="30" r="12" fill="#2b2af0"/>
    <text x="82" y="34" font-family="Georgia, 'Times New Roman', serif" font-size="30" fill="#16161a" letter-spacing="1">CDA</text>
    <text x="82" y="55" font-family="Inter, system-ui, sans-serif" font-size="13" letter-spacing="4" fill="#86868f">LE MAGAZINE</text>
  </g>
  <text x="90" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#16161a" letter-spacing="-2">Les idées claires sur</text>
  <text x="90" y="418" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#16161a" letter-spacing="-2">tout ce qui <tspan fill="#2b2af0" font-style="italic">compte</tspan>.</text>
  <line x1="90" y1="500" x2="1110" y2="500" stroke="#16161a" stroke-opacity="0.12" stroke-width="1.5"/>
  <text x="90" y="548" font-family="Inter, system-ui, sans-serif" font-size="24" fill="#4c4c54">Conseils, comparatifs et décryptages · média associatif indépendant</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ quality: 92 }).toFile(join(process.cwd(), 'public', 'og-default.png'));
// Apple touch icon (180x180)
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="#16161a"/>
  <rect x="45" y="45" width="90" height="90" rx="24" fill="none" stroke="#faf9f6" stroke-width="7"/>
  <circle cx="90" cy="90" r="20" fill="#9d9bff"/>
</svg>`;
await sharp(Buffer.from(icon)).png().toFile(join(process.cwd(), 'public', 'apple-touch-icon.png'));
console.log('✓ og-default.png + apple-touch-icon.png générés');
