#!/usr/bin/env node
// One-shot population of the CFA sub-map with the assets the user has
// created at the campus-overview level but which weren't projected onto
// the sub-map yet:
//
//   - 6 CFA-side solar panel markers (Joie, Indoor Pitch, FM, TV Studio,
//     Ground Mount, MCWFC).
//   - 2 FG Wilson diesel generators (numbers 3 and 4).
//
// Also imports the Wilson Street substation photo onto substation-05.
//
// Coordinates are reasonable defaults estimated from the CFA sub-map
// screenshot. The user can drag any marker in edit mode if it lands
// somewhere off.

'use strict';

const fs = require('fs');
const path = require('path');
const { Jimp } = require(require('os').tmpdir() + '/xlsx-work/node_modules/jimp');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS = [
  path.join(ROOT, 'public', 'snapshot.json'),
  path.join(ROOT, 'dist', 'public', 'snapshot.json'),
];

// CFA sub-map additions. IDs are namespaced with "cfa-" so they don't clash
// with the campus-overview user-mpan markers the user has already created.
const CFA_ADDITIONS = [
  // Solar panel markers — one per CFA-side array. Estimated positions on
  // the CFA sub-map; the user can drag them to the exact roof / field.
  { id: 'cfa-solar-joie-stadium',    type: 'solar-panel', name: 'Joie Stadium Solar Array', x: 30, y: 28 },
  { id: 'cfa-solar-indoor-pitch',    type: 'solar-panel', name: 'Indoor Pitch Solar Array', x: 55, y: 30 },
  { id: 'cfa-solar-tv-studio',       type: 'solar-panel', name: 'TV Studio Solar Array',    x: 56, y: 68 },
  { id: 'cfa-solar-fm-building',     type: 'solar-panel', name: 'FM Building Solar Array',  x: 75, y: 72 },
  { id: 'cfa-solar-ground-mount-2a', type: 'solar-panel', name: 'Ground Mount 2A',          x: 78, y: 16 },
  { id: 'cfa-solar-mcwfc',           type: 'solar-panel', name: 'MCWFC Solar',              x: 36, y: 80 },
  // FG Wilson diesel generators on the CFA side, numbers 3 and 4.
  { id: 'diesel-generator-03', type: 'diesel-generator', name: 'Diesel Generator 3', x: 22, y: 50 },
  { id: 'diesel-generator-04', type: 'diesel-generator', name: 'Diesel Generator 4', x: 26, y: 50 },
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
  console.log('Importing Wilson Street substation photo for substation-05:');
  const wilsonStreetDataUrl = await loadAsDataUrl(
    'C:/Users/james.evans/OneDrive - Clearvolt/Pictures/Wilson treet Substation.png'
  );

  for (const snapPath of SNAPSHOTS) {
    if (!fs.existsSync(snapPath)) {
      console.log('  SKIP (file not found): ' + snapPath);
      continue;
    }
    const s = JSON.parse(fs.readFileSync(snapPath, 'utf8'));

    // 1. CFA sub-map additions.
    const cfaKey = 'energy-submap-cfa-map-assets';
    const cfaAssets = JSON.parse(s[cfaKey] || '[]');
    const cfaIds = new Set(cfaAssets.map((a) => a.id));
    let added = 0;
    for (const add of CFA_ADDITIONS) {
      if (cfaIds.has(add.id)) continue;
      cfaAssets.push(add);
      added++;
    }
    s[cfaKey] = JSON.stringify(cfaAssets);

    // 2. Wilson Street substation photo on substation-05.
    const photosKey = 'energy-map-sticker-photos';
    const photos = JSON.parse(s[photosKey] || '{}');
    photos['substation-05'] = [wilsonStreetDataUrl];
    s[photosKey] = JSON.stringify(photos);

    fs.writeFileSync(snapPath, JSON.stringify(s));
    console.log('  Updated: ' + snapPath);
    console.log('    CFA sub-map markers added: ' + added);
    console.log('    substation-05 photos set: 1');
  }
})().catch((e) => { console.error(e); process.exit(1); });
