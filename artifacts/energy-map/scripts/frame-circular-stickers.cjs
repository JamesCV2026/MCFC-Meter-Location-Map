#!/usr/bin/env node
// Mark every overview-map sticker as `framed: true` so they all render with
// the blue ring like the MIHP / Media Studio examples.
//
// The framed flag only adds the round blue ring + circular crop in
// StickerOverlay; it has no effect on rectangular sub-map base graphics
// (we deliberately skip those — they're whole-building photos that should
// stay full-bleed).

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS = [
  path.join(ROOT, 'public', 'snapshot.json'),
  path.join(ROOT, 'dist', 'public', 'snapshot.json'),
];

function update(snapPath) {
  if (!fs.existsSync(snapPath)) {
    console.log('  SKIP (file not found): ' + snapPath);
    return;
  }
  const s = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
  const uploads = JSON.parse(s['energy-map-sticker-uploads'] || '[]');
  const placements = JSON.parse(s['energy-map-sticker-placements'] || '{}');

  let framed = 0;
  for (const u of uploads) {
    const p = placements[u.id];
    if (!p) continue;
    // Only frame stickers placed on the overview map. Sub-map placements
    // are typically full-bleed base graphics — never frame those.
    if (p.view !== 'main') continue;
    if (u.framed) continue;
    u.framed = true;
    framed++;
  }

  s['energy-map-sticker-uploads'] = JSON.stringify(uploads);
  fs.writeFileSync(snapPath, JSON.stringify(s));
  console.log('  Updated: ' + snapPath);
  console.log('    Overview stickers framed: ' + framed);
}

console.log('Adding blue ring to overview circular stickers:');
for (const p of SNAPSHOTS) update(p);
