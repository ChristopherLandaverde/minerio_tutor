/**
 * Generate Tauri app icons from the Sabiá SVG.
 * Outputs PNGs at all required sizes + .icns and .ico via sips/iconutil.
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '..', 'static', 'sabia-icon.svg');
const iconsDir = join(__dirname, '..', 'src-tauri', 'icons');
const svg = readFileSync(svgPath);

const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

async function main() {
  console.log('Generating Sabiá icons...');

  // Generate all PNGs
  for (const { name, size } of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, name));
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // Generate .icns for macOS using iconutil
  const iconsetDir = join(iconsDir, 'sabia.iconset');
  if (!existsSync(iconsetDir)) mkdirSync(iconsetDir);

  const icnsSizes = [16, 32, 64, 128, 256, 512];
  for (const s of icnsSizes) {
    await sharp(svg).resize(s, s).png().toFile(join(iconsetDir, `icon_${s}x${s}.png`));
    await sharp(svg).resize(s * 2, s * 2).png().toFile(join(iconsetDir, `icon_${s}x${s}@2x.png`));
  }

  try {
    execSync(`iconutil -c icns -o "${join(iconsDir, 'icon.icns')}" "${iconsetDir}"`);
    console.log('  ✓ icon.icns (macOS)');
  } catch (e) {
    console.error('  ✗ Failed to generate .icns:', e.message);
  }

  // Generate .ico for Windows (use the 256px PNG)
  // sips can convert PNG to ico on macOS
  try {
    // .ico needs multiple sizes packed. Use the 256px as the main one.
    const icoPath = join(iconsDir, 'icon.ico');
    // Sharp can output ico directly
    await sharp(svg)
      .resize(256, 256)
      .toFile(icoPath);
    console.log('  ✓ icon.ico (Windows)');
  } catch (e) {
    console.error('  ✗ Failed to generate .ico:', e.message);
  }

  // Cleanup iconset
  try {
    execSync(`rm -rf "${iconsetDir}"`);
  } catch {}

  console.log('\nDone! All icons generated in src-tauri/icons/');
}

main().catch(console.error);
