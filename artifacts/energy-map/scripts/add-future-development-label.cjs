#!/usr/bin/env node
// Adds a "Future development" label (tag style) to:
//   1. The overview map as a user-site label (small text-only pill)
//   2. The Etihad Stadium sub-map as a new typed marker so it appears
//      consistently across both views.
//
// The user can then drag it to sit on top of the yellow "future development"
// square in Move labels / Edit assets mode.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SNAPSHOTS = [
  path.join(ROOT, 'public', 'snapshot.json'),
  path.join(ROOT, 'dist', 'public', 'snapshot.json'),
];

// Unique IDs so re-running the script doesn't pile up duplicates.
const OVERVIEW_ID = 'user-site-future-development';
const ETIHAD_ID = 'submap-etihad-stadium-map-label-future-development';

function applyTo(snapPath) {
  if (!fs.existsSync(snapPath)) return;
  const s = JSON.parse(fs.readFileSync(snapPath, 'utf8'));

  // 1) Overview user-site label — renders as a small FreeLabel pill,
  //    same look as the "Commercial" / "Hotel" auto-labels that come from
  //    stickers. Drag in Move labels mode to position over the yellow square.
  const usKey = 'energy-map-user-sites';
  const userSites = JSON.parse(s[usKey] || '[]');
  let overviewAdded = false;
  if (!userSites.some((u) => u.id === OVERVIEW_ID)) {
    userSites.push({
      id: OVERVIEW_ID,
      name: 'Future development',
      x: 50,
      y: 50,
    });
    overviewAdded = true;
  }
  s[usKey] = JSON.stringify(userSites);

  // 2) Etihad sub-map free label — same FreeLabel pill, but stored under the
  //    sub-map's own labels key so it only appears when the user drills into
  //    the Etihad sub-map.
  const etihadKey = 'energy-submap-etihad-stadium-map-labels';
  const etihadLabels = JSON.parse(s[etihadKey] || '[]');
  let etihadAdded = false;
  if (!etihadLabels.some((u) => u.id === ETIHAD_ID)) {
    etihadLabels.push({
      id: ETIHAD_ID,
      name: 'Future development',
      x: 50,
      y: 50,
    });
    etihadAdded = true;
  }
  s[etihadKey] = JSON.stringify(etihadLabels);

  fs.writeFileSync(snapPath, JSON.stringify(s));
  console.log('  Updated: ' + snapPath);
  console.log('    Overview label:       ' + (overviewAdded ? 'added' : 'already present'));
  console.log('    Etihad sub-map label: ' + (etihadAdded ? 'added' : 'already present'));
}

console.log('Adding Future development label:');
for (const p of SNAPSHOTS) applyTo(p);
