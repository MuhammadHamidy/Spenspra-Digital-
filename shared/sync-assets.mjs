import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const sharedAssetsDir = path.join(rootDir, 'shared', 'assets');
const sharedImageDir = path.join(sharedAssetsDir, 'image');
const sharedIconDir = path.join(sharedAssetsDir, 'icon');

console.log('==========================================================');
console.log('  SPENSPRA MONOREPO - ASSET OPTIMIZER & SYNC');
console.log('==========================================================');

fs.mkdirSync(sharedImageDir, { recursive: true });
fs.mkdirSync(sharedIconDir, { recursive: true });

// 1. Logo Resmi SMPN 1 Prambon
let officialLogo = path.join(rootDir, 'rapor', 'frontend_fr', 'public', 'image', 'new_logo_prambon.png');
if (!fs.existsSync(officialLogo)) {
  officialLogo = path.join(sharedImageDir, 'new_logo_prambon.png');
}

if (fs.existsSync(officialLogo)) {
  fs.copyFileSync(officialLogo, path.join(sharedImageDir, 'new_logo_prambon.png'));
  fs.copyFileSync(officialLogo, path.join(sharedImageDir, 'logo-prambon.png'));
  fs.copyFileSync(officialLogo, path.join(sharedImageDir, 'logo_prambon.png'));
  console.log('[+] Master logo resmi SMPN 1 Prambon tersimpan di shared/assets/image');
}

// 2. Kop & Watermark
const kopSource = path.join(rootDir, 'rapor', 'frontend_fr', 'public', 'image', 'kop-prambon.png');
if (fs.existsSync(kopSource)) {
  fs.copyFileSync(kopSource, path.join(sharedImageDir, 'kop-prambon.png'));
  console.log('[+] Master kop surat tersimpan di shared/assets/image');
}

const watermarkSource = path.join(rootDir, 'rapor', 'frontend_fr', 'public', 'image', 'watermark-prambon.png');
if (fs.existsSync(watermarkSource)) {
  fs.copyFileSync(watermarkSource, path.join(sharedImageDir, 'watermark-prambon.png'));
  console.log('[+] Master watermark tersimpan di shared/assets/image');
}

// 3. Distribusikan ke semua frontend
const frontends = [
  path.join(rootDir, 'sso', 'frontend_fr'),
  path.join(rootDir, 'rapor', 'frontend_fr'),
  path.join(rootDir, 'perpus', 'frontend_fr'),
];

for (const fe of frontends) {
  if (!fs.existsSync(fe)) continue;
  const feName = path.basename(fe);
  const targetImageDir = path.join(fe, 'public', 'image');
  fs.mkdirSync(targetImageDir, { recursive: true });

  for (const file of fs.readdirSync(sharedImageDir)) {
    const srcFile = path.join(sharedImageDir, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, path.join(targetImageDir, file));
    }
  }
  console.log(`[+] Sinkronisasi aset sukses untuk frontend: ${feName}`);
}

console.log('\nSinkronisasi seluruh aset selesai!');
