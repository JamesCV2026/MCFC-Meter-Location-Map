#!/usr/bin/env node
// Idempotent fix for the Etihad + CFA sub-map asset lists.
//
// What it does:
//   1. Etihad: renames diesel-generator-03 -> 05 and 04 -> 06 (the user's
//      numbering reserves 1/2 for legacy units, 3/4 for CFA, 5/6 for Etihad).
//      Also migrates any panel-info entries keyed by the old IDs.
//   2. CFA: adds diesel-generator-03 + diesel-generator-04 (FG Wilson units)
//      if not already present.
//   3. CFA: adds the 6 solar-array markers if not already present
//      (Joie, Indoor Pitch, TV Studio, FM, Ground Mount 2A, MCWFC).
//
// Writes both public/snapshot.json AND dist/public/snapshot.json so the
// dev server and the built HTML pick up the same state.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS = [
  path.join(ROOT, 'public', 'snapshot.json'),
  path.join(ROOT, 'dist', 'public', 'snapshot.json'),
];

// --- 1. Etihad renames (rename + migrate panel info) ---------------------
const ETIHAD_RENAMES = {
  'diesel-generator-03': { id: 'diesel-generator-05', name: 'Diesel Generator 5' },
  'diesel-generator-04': { id: 'diesel-generator-06', name: 'Diesel Generator 6' },
};

// --- 2. CFA additions -----------------------------------------------------
const CFA_ADDITIONS = [
  // FG Wilson diesel generators, numbers 3 and 4.
  { id: 'diesel-generator-03', type: 'diesel-generator', name: 'Diesel Generator 3', x: 22, y: 50 },
  { id: 'diesel-generator-04', type: 'diesel-generator', name: 'Diesel Generator 4', x: 26, y: 50 },
  // CFA-side solar arrays. Drag to exact rooftops in edit mode if needed.
  { id: 'cfa-solar-joie-stadium',    type: 'solar-panel', name: 'Joie Stadium Solar Array', x: 30, y: 28 },
  { id: 'cfa-solar-indoor-pitch',    type: 'solar-panel', name: 'Indoor Pitch Solar Array', x: 55, y: 30 },
  { id: 'cfa-solar-tv-studio',       type: 'solar-panel', name: 'TV Studio Solar Array',    x: 56, y: 68 },
  { id: 'cfa-solar-fm-building',     type: 'solar-panel', name: 'FM Building Solar Array',  x: 75, y: 72 },
  { id: 'cfa-solar-ground-mount-2a', type: 'solar-panel', name: 'Ground Mount 2A',          x: 78, y: 16 },
  { id: 'cfa-solar-mcwfc',           type: 'solar-panel', name: 'MCWFC Solar',              x: 36, y: 80 },
];

function update(snapPath) {
  if (!fs.existsSync(snapPath)) {
    console.log('  SKIP (file not found): ' + snapPath);
    return;
  }
  const s = JSON.parse(fs.readFileSync(snapPath, 'utf8'));

  // --- Etihad -----------------------------------------------------------
  const etihadKey = 'energy-submap-etihad-stadium-map-assets';
  const etihadAssets = JSON.parse(s[etihadKey] || '[]');
  let etihadRenames = 0;
  for (const a of etihadAssets) {
    if (a.type === 'diesel-generator' && ETIHAD_RENAMES[a.id]) {
      const next = ETIHAD_RENAMES[a.id];
      a.id = next.id;
      a.name = next.name;
      etihadRenames++;
    }
  }
  s[etihadKey] = JSON.stringify(etihadAssets);

  // --- CFA --------------------------------------------------------------
  const cfaKey = 'energy-submap-cfa-map-assets';
  const cfaAssets = JSON.parse(s[cfaKey] || '[]');
  const cfaIds = new Set(cfaAssets.map((a) => a.id));
  let cfaAdded = 0;
  for (const newAsset of CFA_ADDITIONS) {
    if (cfaIds.has(newAsset.id)) continue;
    cfaAssets.push(newAsset);
    cfaAdded++;
  }
  s[cfaKey] = JSON.stringify(cfaAssets);

  // --- Panel-info migration --------------------------------------------
  // Old Etihad diesel info (03/04) should follow to the new IDs (05/06).
  // The freshly added CFA 03/04 should NOT inherit Etihad's panel info,
  // which is why we migrate Etihad's entries off the old keys FIRST,
  // before the CFA newcomers take ownership of those keys.
  const infoKey = 'energy-map-asset-panel-info';
  const info = JSON.parse(s[infoKey] || '{}');
  let infoMigrated = 0;
  for (const [oldId, target] of Object.entries(ETIHAD_RENAMES)) {
    if (info[oldId]) {
      info[target.id] = info[oldId];
      delete info[oldId];
      infoMigrated++;
    }
  }
  if (infoMigrated > 0) s[infoKey] = JSON.stringify(info);

  fs.writeFileSync(snapPath, JSON.stringify(s));
  console.log('  Updated: ' + snapPath);
  console.log('    Etihad diesel markers renumbered: ' + etihadRenames);
  console.log('    CFA assets added (diesel + solar): ' + cfaAdded);
  console.log('    Panel-info entries migrated: ' + infoMigrated);
}

console.log('Fixing Etihad + CFA sub-map assets:');
for (const p of SNAPSHOTS) update(p);
