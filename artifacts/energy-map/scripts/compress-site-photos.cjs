#!/usr/bin/env node
// Compress every site / panel photo so the live (Netlify) build ships smaller
// images. Two stages:
//
//   1. Re-encode each .jpg file under dist/public/photos/ at lower quality
//      and a smaller max dimension. The deployed site reads these as plain
//      <img src="photos/foo.jpg"> URLs.
//   2. Walk dist/public/snapshot.json and shrink any base64 photo data URL
//      still inlined in energy-map-sticker-photos. Public-side snapshot.json
//      gets the same treatment so the source of truth stays small.
//
// Why this matters: on a fresh browser session (no prior localStorage), the
// site seeds from snapshot.json. If the seeded photos are bulky base64 URLs
// they can blow localStorage quota and silently drop, so visitors see "No
// photo yet" everywhere. Shrinking the photos avoids that.

'use strict';

const fs = require('fs');
const path = require('path');
const { Jimp } = require(require('os').tmpdir() + '/xlsx-work/node_modules/jimp');

const ROOT = path.resolve(__dirname, '..');
const DIST_PHOTOS = path.join(ROOT, 'dist', 'public', 'photos');
const SNAPSHOTS = [
  path.join(ROOT, 'public', 'snapshot.json'),
  path.join(ROOT, 'dist', 'public', 'snapshot.json'),
];

// Sizing tuned for panel display. Panel images render at ~400 to 600 px wide
// in the UI, so 720 px max dimension gives crisp 2x-ish rendering with much
// smaller files than the originals.
const MAX_DIMENSION = 720;
const JPEG_QUALITY = 72;

async function compressBuffer(buf, label) {
  const before = buf.length;
  const img = await Jimp.read(buf);
  const { width, height } = img.bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    // Jimp 1.x: resize via an options object; pass whichever dimension is
    // the limiting axis so aspect ratio is preserved.
    if (width >= height) img.resize({ w: MAX_DIMENSION });
    else img.resize({ h: MAX_DIMENSION });
  }
  const out = await img.getBuffer('image/jpeg', { quality: JPEG_QUALITY });
  const after = out.length;
  const pct = Math.round((after / before) * 100);
  console.log('  ' + label.padEnd(45) + ' ' + (before / 1024).toFixed(0).padStart(5) + ' KB -> ' +
              (after / 1024).toFixed(0).padStart(4) + ' KB (' + pct + '%)');
  return out;
}

async function compressPhotoFiles() {
  if (!fs.existsSync(DIST_PHOTOS)) {
    console.log('No dist/public/photos directory yet — skipping file pass.');
    return;
  }
  const files = fs.readdirSync(DIST_PHOTOS).filter((f) => /\.jpe?g$/i.test(f));
  console.log('── Compressing ' + files.length + ' photo files in dist/public/photos/ ──');
  let beforeTotal = 0;
  let afterTotal = 0;
  for (const f of files) {
    const full = path.join(DIST_PHOTOS, f);
    const buf = fs.readFileSync(full);
    beforeTotal += buf.length;
    const out = await compressBuffer(buf, f);
    fs.writeFileSync(full, out);
    afterTotal += out.length;
  }
  console.log('  Total: ' + (beforeTotal / 1024 / 1024).toFixed(2) + ' MB -> ' +
              (afterTotal / 1024 / 1024).toFixed(2) + ' MB (' +
              Math.round((afterTotal / beforeTotal) * 100) + '%)');
}

async function compressInlineSnapshotPhotos() {
  for (const snapPath of SNAPSHOTS) {
    if (!fs.existsSync(snapPath)) continue;
    const raw = fs.readFileSync(snapPath, 'utf8');
    const s = JSON.parse(raw);
    const photosRaw = s['energy-map-sticker-photos'];
    if (!photosRaw) continue;
    const photos = JSON.parse(photosRaw);
    let touched = 0;
    for (const [id, arr] of Object.entries(photos)) {
      if (!Array.isArray(arr)) continue;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (typeof v !== 'string') continue;
        if (!v.startsWith('data:image/')) continue; // only base64 inline photos
        const match = v.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/);
        if (!match) continue;
        const buf = Buffer.from(match[2], 'base64');
        const out = await compressBuffer(buf, id + '-' + i + ' (inline base64)');
        arr[i] = 'data:image/jpeg;base64,' + out.toString('base64');
        touched++;
      }
    }
    if (touched > 0) {
      s['energy-map-sticker-photos'] = JSON.stringify(photos);
      fs.writeFileSync(snapPath, JSON.stringify(s));
      console.log('  Rewrote ' + snapPath + ' (' + touched + ' inline photos compressed)');
    } else {
      console.log('  ' + snapPath + ' — no inline base64 photos (URL refs only, nothing to do)');
    }
  }
}

(async () => {
  console.log('Compress site photos — max ' + MAX_DIMENSION + ' px, quality ' + JPEG_QUALITY + '%.');
  await compressPhotoFiles();
  console.log('');
  console.log('── Scanning snapshot.json files for inline base64 photos ──');
  await compressInlineSnapshotPhotos();
})().catch((e) => { console.error(e); process.exit(1); });
