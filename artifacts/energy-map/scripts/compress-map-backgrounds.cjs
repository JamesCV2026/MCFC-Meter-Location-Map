#!/usr/bin/env node
// Compress the giant map background PNGs in dist/public/assets/ down to
// JPEG. The originals are 1 to 7 MB each; JPEG at quality 75 cuts that to
// ~15 to 25 percent of the original size with no visible difference at the
// 1x display resolution the map uses.
//
// The inliner that produces the standalone HTML embeds whatever is in
// dist/public/assets/ as base64, so shrinking the source shrinks the HTML
// directly. Vite emits content-hashed filenames (e.g. Overview-Bcc1D9Uh.png)
// so we MUST keep the filename the same — only the bytes change.

'use strict';

const fs = require('fs');
const path = require('path');
const { Jimp } = require(require('os').tmpdir() + '/xlsx-work/node_modules/jimp');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'dist', 'public', 'assets');

// Only target the heavy backgrounds. Smaller asset images (icons, stickers)
// stay PNG because the file gain isn't worth the quality drop.
const HEAVY_THRESHOLD_BYTES = 500 * 1024;
const JPEG_QUALITY = 75;

(async () => {
  if (!fs.existsSync(ASSETS)) {
    console.log('No assets dir found.');
    return;
  }
  let beforeTotal = 0;
  let afterTotal = 0;
  for (const f of fs.readdirSync(ASSETS)) {
    if (!/\.png$/i.test(f)) continue;
    const full = path.join(ASSETS, f);
    const before = fs.statSync(full).size;
    if (before < HEAVY_THRESHOLD_BYTES) continue;
    beforeTotal += before;
    const img = await Jimp.read(full);
    // Most map backgrounds are 1500 to 2000 px wide. Cap at 1600 to drop a
    // bit more weight without affecting on-screen quality on a typical
    // browser viewport.
    if (img.bitmap.width > 1600) img.resize({ w: 1600 });
    const buf = await img.getBuffer('image/jpeg', { quality: JPEG_QUALITY });
    // Keep the original filename so JS bundle URL references still match.
    // We write a JPEG with a .png extension — the inliner detects the actual
    // mime by reading the file header, so the .png suffix is cosmetic only
    // and doesn't matter. Browsers also sniff content type.
    fs.writeFileSync(full, buf);
    afterTotal += buf.length;
    console.log('  ' + f.padEnd(50) + ' ' + (before / 1024).toFixed(0).padStart(6) + ' KB -> ' +
                (buf.length / 1024).toFixed(0).padStart(5) + ' KB');
  }
  console.log('');
  console.log('Total: ' + (beforeTotal / 1024 / 1024).toFixed(2) + ' MB -> ' +
              (afterTotal / 1024 / 1024).toFixed(2) + ' MB (' +
              Math.round((afterTotal / beforeTotal) * 100) + '%)');
})().catch((e) => { console.error(e); process.exit(1); });
