#!/usr/bin/env node
// One-shot script: apply the HV / transformer / cable narratives the user
// confirmed via AskUserQuestion. Writes to BOTH public/snapshot.json AND
// dist/public/snapshot.json so the localhost auto-save can't overwrite our
// edits before the inliner picks them up.
//
// No em/en dashes anywhere in the narrative strings (user style rule).
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public', 'snapshot.json');
const DIST = path.join(ROOT, 'dist', 'public', 'snapshot.json');

// Asset IDs resolved from the live snapshot (titled entries in
// energy-map-asset-panel-info + the two user-sites for the cables + the
// Transformer 1 marker on the Etihad sub-map + the three wind turbines on
// the CFA sub-map).
const IDS = {
  CABLE_A:        'user-site-1779367672695',
  CABLE_B:        'user-site-1779367679911',
  ETIHAD_STADIUM: 'upload-1779361535807-u54yk',
  FM_BUILDING:    'upload-1779793113458-7e8c3',
  TRANSFORMER_1:  'transformer-01',  // Etihad sub-map — V Tower / E Tower entry
  WIND_TURBINE_1: 'wind-turbine-01', // CFA sub-map — site option 1
  WIND_TURBINE_2: 'wind-turbine-02', // CFA sub-map — site option 2
  WIND_TURBINE_3: 'wind-turbine-03', // CFA sub-map — site option 3
  // SUBSTATION_1 (Rowsley Street) intentionally removed — marker dropped from the map.
};

// ── Narratives ──────────────────────────────────────────────────────────────
// Multi-line strings. No em/en dashes. Hyphens, colons, parens, periods only.

const CABLE_NARRATIVE = [
  'Status: PROPOSED route, not currently installed.',
  '',
  'The existing HV ring at the Etihad is owned and operated by ISS, so',
  'full as-built details for the live HV network are not in the public',
  'domain and are not shown on this map.',
  '',
  'Design intent for the new run (Clearvolt scope):',
  '  Voltage: 6.6 kV HV',
  '  Configuration: 3 cables per phase, 6 total, in a ring / loop for N-1 resilience',
  '  Route: Joie Stadium to raceway, tying into existing HV at each site',
].join('\n');

const ETIHAD_STADIUM_NARRATIVE = [
  'HV supply (high level)',
  '',
  '  Incoming HV switch currently set at 6 MVA. Switchgear itself is rated',
  '  to around 9 MVA, giving headroom for future expansion.',
  '',
  '  No single incoming transformer: the Etihad is fed via an HV ring with',
  '  6 transformers distributed around the site.',
  '',
  '  Ring cable: 300 mm copper SWA (per ISS).',
  '',
  '  Single-line diagram: an SLD was issued to MCFC on completion of past',
  '  works. It is likely superseded by the new stand. Updated SLD to be',
  '  requested from MCFC (Amion may hold the latest).',
  '',
  'V Tower (level 1 transformer room)',
  '  TX1: 2 MVA',
  '  TX2: 1 MVA (planned upgrade to 2 MVA)',
  '  TX3: 1.5 MVA (feeds the essential supply board)',
  '',
  'V Tower LV boards',
  '  T1: 2500 A',
  '  T2: 1333 A',
  '  T3: 2155 A (blue GR panel rated 1000 A, currently the limiting factor)',
  '',
  'E Tower (level 1 transformer room)',
  '  TX1: 2 MVA. LV panel currently limited to 1600 A; ACB on the',
  '       transformer downrates the supply, pending a future board upgrade',
  '       alongside the wider HV upgrade.',
  '  TX2: 1 MVA',
  '  TX3: 1.5 MVA (feeds the essential supply)',
  '',
  'E Tower LV boards',
  '  T1: 1600 A',
  '  T2: 1333 A',
  '  T3: 2155 A (GR panel 1000 A)',
].join('\n');

// Transformer 1 sits at one of the V Tower / E Tower transformer rooms on
// the Etihad sub-map. There is currently only ONE marker for both rooms,
// so we put the full V Tower + E Tower breakdown here. If we later add
// separate V Tower / E Tower markers, this content can be split.
const TRANSFORMER_1_NARRATIVE = [
  'Tower transformer rooms (Etihad)',
  '',
  'Two transformer rooms sit at level 1 of V Tower and E Tower. Each room',
  'holds 3 transformers. Capacities and LV board ratings below.',
  '',
  'V Tower (level 1 transformer room)',
  '  TX1: 2 MVA',
  '  TX2: 1 MVA (planned upgrade to 2 MVA)',
  '  TX3: 1.5 MVA (feeds the essential supply board)',
  '',
  'V Tower LV boards',
  '  T1: 2500 A',
  '  T2: 1333 A',
  '  T3: 2155 A (blue GR panel rated 1000 A, currently the limiting factor)',
  '',
  'E Tower (level 1 transformer room)',
  '  TX1: 2 MVA. LV panel currently limited to 1600 A; ACB on the',
  '       transformer downrates the supply, pending a future board upgrade',
  '       alongside the wider HV upgrade.',
  '  TX2: 1 MVA',
  '  TX3: 1.5 MVA (feeds the essential supply)',
  '',
  'E Tower LV boards',
  '  T1: 1600 A',
  '  T2: 1333 A',
  '  T3: 2155 A (GR panel 1000 A)',
  '',
  'See the Etihad Stadium panel for the wider HV ring summary (6 MVA',
  'incoming, 9 MVA switchgear headroom, 300 mm copper SWA ring cable).',
].join('\n');

// Rowsley Street substation narrative removed — marker dropped from the map.

// Wind turbine narratives. Each option keeps the same intro paragraph (so the
// context that these are three candidate sites is repeated everywhere) and
// then appends the specific Google Earth survey coordinates for that option.
// No em or en dashes anywhere; only ASCII characters and Unicode degree /
// minute / second symbols inside the lat-long strings.
function windTurbineNarrative(option, coords, dec, cameraAlt, eyeAlt, scaleBar) {
  return [
    'These are the most feasible wind turbine placement options identified to',
    'date. Final siting will depend on detailed wind resource modelling,',
    'planning consent, and integration with the wider campus electrical',
    'infrastructure.',
    '',
    'Site option ' + option,
    '  Coordinates: ' + coords,
    '  Decimal:     ' + dec,
    '  Camera altitude: ' + cameraAlt,
    '  Eye altitude:    ' + eyeAlt,
    '  Scale bar:       ' + scaleBar,
  ].join('\n');
}

const WIND_TURBINE_1_NARRATIVE = windTurbineNarrative(
  1,
  '53°28\'45.23"N 2°11\'15.29"W',
  '53.479231°N, -2.187581°W',
  '89 m',
  '63 m',
  '3 m',
);
const WIND_TURBINE_2_NARRATIVE = windTurbineNarrative(
  2,
  '53°28\'49.81"N 2°11\'26.25"W',
  '53.480503°N, -2.190625°W',
  '244 m',
  '63 m',
  '20 m',
);
const WIND_TURBINE_3_NARRATIVE = windTurbineNarrative(
  3,
  '53°28\'54.26"N 2°11\'13.17"W',
  '53.481739°N, -2.186992°W',
  '244 m',
  '70 m',
  '20 m',
);

const FM_BUILDING_NARRATIVE = [
  'Incoming transformer: believed to be around 650 kVA (to be confirmed with ISS).',
  '',
  'Open question: if the CFA is connected back to the Etihad, can this',
  'transformer be re-used as the tie point? A capacity check would be',
  'needed; this is a question for ISS.',
  '',
  'Wider CFA context',
  '',
  'HV infrastructure detail on the CFA side of the campus is not held by',
  'Clearvolt; works in this area pre-date our involvement.',
  '',
  'Best-current-knowledge:',
  '  HV cable believed to be triplex 300 mm (to be confirmed with ISS).',
  '  For full transformer, board, and SLD detail, Mr Goodwin is the right',
  '  point of contact.',
].join('\n');

// ── Apply ──────────────────────────────────────────────────────────────────

function applyToSnapshot(snapshotPath) {
  if (!fs.existsSync(snapshotPath)) {
    console.log('  SKIP (file not found): ' + snapshotPath);
    return;
  }
  const raw = fs.readFileSync(snapshotPath, 'utf8');
  const s = JSON.parse(raw);
  const info = JSON.parse(s['energy-map-asset-panel-info'] || '{}');

  const ensure = (id) => {
    if (!info[id]) info[id] = {};
    return info[id];
  };

  ensure(IDS.CABLE_A).title = 'Cable A (proposed)';
  ensure(IDS.CABLE_A).narrative = CABLE_NARRATIVE;

  ensure(IDS.CABLE_B).title = 'Cable B (proposed)';
  ensure(IDS.CABLE_B).narrative = CABLE_NARRATIVE;

  ensure(IDS.ETIHAD_STADIUM).narrative = ETIHAD_STADIUM_NARRATIVE;
  ensure(IDS.FM_BUILDING).narrative = FM_BUILDING_NARRATIVE;

  // Transformer 1 marker on the Etihad sub-map — V Tower / E Tower detail.
  ensure(IDS.TRANSFORMER_1).title = 'Transformer 1 (V / E Tower rooms)';
  ensure(IDS.TRANSFORMER_1).narrative = TRANSFORMER_1_NARRATIVE;

  // Rowsley Street substation narrative removed — marker dropped from the map.

  // Wind turbine site options on the CFA sub-map. Coordinates from a Google
  // Earth survey, one option per turbine marker.
  ensure(IDS.WIND_TURBINE_1).title = 'Wind Turbine 1 (site option 1)';
  ensure(IDS.WIND_TURBINE_1).narrative = WIND_TURBINE_1_NARRATIVE;
  ensure(IDS.WIND_TURBINE_2).title = 'Wind Turbine 2 (site option 2)';
  ensure(IDS.WIND_TURBINE_2).narrative = WIND_TURBINE_2_NARRATIVE;
  ensure(IDS.WIND_TURBINE_3).title = 'Wind Turbine 3 (site option 3)';
  ensure(IDS.WIND_TURBINE_3).narrative = WIND_TURBINE_3_NARRATIVE;

  s['energy-map-asset-panel-info'] = JSON.stringify(info);
  fs.writeFileSync(snapshotPath, JSON.stringify(s));
  console.log('  Updated: ' + snapshotPath);
  console.log('    Cable A         (' + IDS.CABLE_A + ')  ' + CABLE_NARRATIVE.length + ' ch');
  console.log('    Cable B         (' + IDS.CABLE_B + ')  ' + CABLE_NARRATIVE.length + ' ch');
  console.log('    Etihad Stadium  (' + IDS.ETIHAD_STADIUM + ')  ' + ETIHAD_STADIUM_NARRATIVE.length + ' ch');
  console.log('    FM Building     (' + IDS.FM_BUILDING + ')  ' + FM_BUILDING_NARRATIVE.length + ' ch');
  console.log('    Transformer 1   (' + IDS.TRANSFORMER_1 + ')  ' + TRANSFORMER_1_NARRATIVE.length + ' ch');
  console.log('    Wind Turbine 1  (' + IDS.WIND_TURBINE_1 + ')  ' + WIND_TURBINE_1_NARRATIVE.length + ' ch');
  console.log('    Wind Turbine 2  (' + IDS.WIND_TURBINE_2 + ')  ' + WIND_TURBINE_2_NARRATIVE.length + ' ch');
  console.log('    Wind Turbine 3  (' + IDS.WIND_TURBINE_3 + ')  ' + WIND_TURBINE_3_NARRATIVE.length + ' ch');
}

console.log('Applying spec narratives:');
applyToSnapshot(PUBLIC);
applyToSnapshot(DIST);

// Sanity check: no em/en dashes leaked into any narrative.
const all = CABLE_NARRATIVE + ETIHAD_STADIUM_NARRATIVE + FM_BUILDING_NARRATIVE + TRANSFORMER_1_NARRATIVE +
            WIND_TURBINE_1_NARRATIVE + WIND_TURBINE_2_NARRATIVE + WIND_TURBINE_3_NARRATIVE;
const bad = all.match(/[–—]/g);
if (bad) {
  console.error('FAIL: em/en dashes found in narrative content:', bad);
  process.exit(2);
}
console.log('OK: no em/en dashes in narrative content.');
