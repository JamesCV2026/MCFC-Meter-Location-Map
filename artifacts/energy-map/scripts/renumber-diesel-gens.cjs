#!/usr/bin/env node
// Diesel generator renumbering — shift every existing diesel-generator marker
// up by 2 (CFA 1 -> 3, 2 -> 4; Etihad 3 -> 5, 4 -> 6) and add the second CFA
// FG Wilson unit if it isn't placed yet. Writes both public/snapshot.json
// and dist/public/snapshot.json so the standalone HTML and dev server pick
// up the same state.
//
// Why: site team's preferred numbering scheme reserves 1 and 2 for an older
// set of units that aren't represented on the map.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS = [
  path.join(ROOT, 'public', 'snapshot.json'),
  path.join(ROOT, 'dist', 'public', 'snapshot.json'),
];

// Etihad existing markers — rename only.
const ETIHAD_RENAMES = {
  'diesel-generator-03': { id: 'diesel-generator-05', name: 'Diesel Generator 5' },
  'diesel-generator-04': { id: 'diesel-generator-06', name: 'Diesel Generator 6' },
};

// CFA markers to ADD if not already present. Coordinates are reasonable
// defaults; the user can drag them in edit mode if needed.
const CFA_ADDITIONS = [
  { id: 'diesel-generator-03', name: 'Diesel Generator 3', type: 'diesel-generator', x: 14, y: 42 },
  { id: 'diesel-generator-04', name: 'Diesel Generator 4', type: 'diesel-generator', x: 18, y: 42 },
];

function update(snapPath) {
  if (!fs.existsSync(snapPath)) {
    console.log('  SKIP (file not found): ' + snapPath);
    return;
  }
  const raw = fs.readFileSync(snapPath, 'utf8');
  const s = JSON.parse(raw);

  // Etihad rename.
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

  // CFA addition (only adds if id isn't already present).
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

  // Migrate any panel-info entries that were keyed by the old IDs.
  const infoKey = 'energy-map-asset-panel-info';
  const info = JSON.parse(s[infoKey] || '{}');
  let infoMigrated = 0;
  // Be careful: the OLD diesel-generator-03/04 belonged to Etihad. Their
  // panel info should follow them to the new ids 05/06.
  // But the NEW diesel-generator-03/04 we just created on the CFA side are
  // fresh — they should NOT inherit the old etihad panel info. We resolve
  // this by renaming any OLD info[diesel-generator-03/04] to 05/06 FIRST,
  // then leaving 03/04 free for the CFA newcomers.
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
  console.log('    Etihad markers renamed: ' + etihadRenames);
  console.log('    CFA markers added: ' + cfaAdded);
  console.log('    Panel-info entries migrated: ' + infoMigrated);
}

console.log('Renumbering diesel generators:');
for (const p of SNAPSHOTS) update(p);
