#!/usr/bin/env node
// One-shot removal of Substation 1 (Rowsley Street) from the snapshot.
// Wipes the marker from the Etihad sub-map, deletes its panel-info entry
// (title + narrative), deletes its photos, and removes the photo files.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS = [
  path.join(ROOT, 'public', 'snapshot.json'),
  path.join(ROOT, 'dist', 'public', 'snapshot.json'),
];
const DIST_PHOTOS = path.join(ROOT, 'dist', 'public', 'photos');
const TARGET = 'substation-01';

function clean(snapPath) {
  if (!fs.existsSync(snapPath)) return;
  const s = JSON.parse(fs.readFileSync(snapPath, 'utf8'));

  // Remove from Etihad sub-map asset list.
  const etihadKey = 'energy-submap-etihad-stadium-map-assets';
  const etihadAssets = JSON.parse(s[etihadKey] || '[]');
  const before = etihadAssets.length;
  const filtered = etihadAssets.filter((a) => a.id !== TARGET);
  s[etihadKey] = JSON.stringify(filtered);
  const removedMarkers = before - filtered.length;

  // Remove from panel-info.
  const infoKey = 'energy-map-asset-panel-info';
  const info = JSON.parse(s[infoKey] || '{}');
  const hadInfo = TARGET in info;
  delete info[TARGET];
  s[infoKey] = JSON.stringify(info);

  // Remove from sticker-photos.
  const photosKey = 'energy-map-sticker-photos';
  const photos = JSON.parse(s[photosKey] || '{}');
  const hadPhotos = TARGET in photos;
  delete photos[TARGET];
  s[photosKey] = JSON.stringify(photos);

  // Remove from overview positions if any.
  const ovKey = 'energy-map-overview-positions';
  const ov = JSON.parse(s[ovKey] || '{}');
  const hadOv = TARGET in ov;
  delete ov[TARGET];
  s[ovKey] = JSON.stringify(ov);

  fs.writeFileSync(snapPath, JSON.stringify(s));
  console.log('  Updated: ' + snapPath);
  console.log('    Markers removed:        ' + removedMarkers);
  console.log('    panel-info removed:     ' + (hadInfo ? 'yes' : 'no'));
  console.log('    sticker-photos removed: ' + (hadPhotos ? 'yes' : 'no'));
  console.log('    overview-pos removed:   ' + (hadOv ? 'yes' : 'no'));
}

console.log('Removing ' + TARGET + ' from snapshots:');
for (const p of SNAPSHOTS) clean(p);

// Delete photo files on disk.
if (fs.existsSync(DIST_PHOTOS)) {
  for (const f of fs.readdirSync(DIST_PHOTOS)) {
    if (f.startsWith(TARGET + '-')) {
      const full = path.join(DIST_PHOTOS, f);
      fs.unlinkSync(full);
      console.log('  Deleted: ' + full);
    }
  }
}
