#!/usr/bin/env node
// Import the two Rowsley Street substation photos for Substation 1.
// Reads the iPhone shots from /tmp/, downsizes them with Jimp (720 px max,
// JPEG quality 72) to keep localStorage and the bundled snapshot small,
// then writes them into energy-map-sticker-photos[substation-01] in both
// snapshot files.
//
// Why a one-shot import: the standard photo upload runs in the browser
// (canvas.toDataURL). The user pasted the images into chat, so I'm loading
// them from disk here and shoving them in directly.

'use strict';

const fs = require('fs');
const path = require('path');
const { Jimp } = require(require('os').tmpdir() + '/xlsx-work/node_modules/jimp');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS = [
  path.join(ROOT, 'public', 'snapshot.json'),
  path.join(ROOT, 'dist', 'public', 'snapshot.json'),
];
const STICKER_ID = 'substation-01';
// Cygwin /tmp maps to %LOCALAPPDATA%\Temp on Windows. Use the OS tmpdir so
// the script works from any cwd.
const TMP = require('os').tmpdir();
const SOURCES = [
  path.join(TMP, 'IMG_3274.jpeg'),
  path.join(TMP, 'IMG_3275.jpeg'),
];
const MAX_DIMENSION = 720;
const JPEG_QUALITY = 72;

async function loadAsDataUrl(srcPath) {
  const img = await Jimp.read(srcPath);
  const { width, height } = img.bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) img.resize({ w: MAX_DIMENSION });
    else img.resize({ h: MAX_DIMENSION });
  }
  const buf = await img.getBuffer('image/jpeg', { quality: JPEG_QUALITY });
  console.log('  ' + path.basename(srcPath) + ' compressed to ' + (buf.length / 1024).toFixed(0) + ' KB');
  return 'data:image/jpeg;base64,' + buf.toString('base64');
}

(async () => {
  console.log('Importing 2 Rowsley Street substation photos for ' + STICKER_ID + ':');
  const dataUrls = [];
  for (const src of SOURCES) {
    if (!fs.existsSync(src)) {
      console.error('Source missing: ' + src);
      process.exit(2);
    }
    dataUrls.push(await loadAsDataUrl(src));
  }

  for (const snapPath of SNAPSHOTS) {
    if (!fs.existsSync(snapPath)) {
      console.log('  SKIP (file not found): ' + snapPath);
      continue;
    }
    const s = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
    const photosKey = 'energy-map-sticker-photos';
    const photos = JSON.parse(s[photosKey] || '{}');
    photos[STICKER_ID] = dataUrls;
    s[photosKey] = JSON.stringify(photos);
    fs.writeFileSync(snapPath, JSON.stringify(s));
    console.log('  Updated: ' + snapPath);
  }
})().catch((e) => { console.error(e); process.exit(1); });
