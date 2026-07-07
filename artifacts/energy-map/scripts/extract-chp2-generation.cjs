#!/usr/bin/env node
// Read two CHP 2 generation export .xls files (covering 2025-06-30 through
// 2026-06-02), concatenate them in date order, and write a single hourly
// CSV in the canonical shape the map uses:
//
//   datetime,value_kWh,data_type
//   30/06/2025 14:00,310.000,Actual
//   ...
//
// The Delta column under "Electricity Generated kWh" is the hour's energy
// (Start/End are meter readings; Delta = End - Start). The user asked for
// the "Electricity Generated kW column" — at 60-minute granularity, kWh per
// hour = average kW, so this is the same thing.
//
// Source: ~/AppData/Local/Temp/3002412_*.xls (Manchester City Football
// Academy 2 = CFA CHP Machine 2).
//
// Also prints monthly kWh totals so we can drop them into energyData.ts.

'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require(require('os').tmpdir() + '/xlsx-work/node_modules/xlsx');

const SOURCES = [
  'C:/Users/james.evans/AppData/Local/Temp/3002412_20250630_20251231.xls',
  'C:/Users/james.evans/AppData/Local/Temp/3002412_20260101_20260602.xls',
];
const OUT_CSV = path.resolve(__dirname, '..', 'public', 'data', 'Generation_CHP_Machine_2.csv');

// Excel serial date → JS Date. Excel epoch is 1899-12-30 (with the 1900-leap-year quirk).
function excelSerialToDate(serial) {
  const epoch = Date.UTC(1899, 11, 30); // 1899-12-30
  return new Date(epoch + Math.round(serial * 86400 * 1000));
}

function pad(n) { return String(n).padStart(2, '0'); }
function fmtDate(d) {
  return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear() +
         ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

const records = [];
for (const file of SOURCES) {
  const wb = xlsx.readFile(file);
  const sheet = wb.Sheets['Sheet2'];
  if (!sheet) throw new Error('No Sheet2 in ' + file);
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  // Row 0: title.  Row 1: blank.  Row 2: top headers.  Row 3: sub-headers
  // (Start/End/Delta).  Row 4+: data.
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const ts = r[1];      // UTC TimeStamp (Excel serial)
    const delta = r[4];   // Electricity Generated kWh — Delta
    if (typeof ts !== 'number' || ts <= 0) continue;
    if (typeof delta !== 'number') continue;
    const dt = excelSerialToDate(ts);
    records.push({ dt, kWh: delta });
  }
  console.log('  ' + path.basename(file) + ' → ' + rows.length + ' rows, kept ' +
              records.length + ' so far');
}

// Sort by datetime (in case the files overlap or files are presented out of order).
records.sort((a, b) => a.dt - b.dt);

// Deduplicate by timestamp — pick the LAST reading if a timestamp recurs across
// files (the second file's reading wins, which is the standard convention).
const seen = new Map();
for (const r of records) {
  seen.set(r.dt.toISOString(), r);
}
const unique = Array.from(seen.values()).sort((a, b) => a.dt - b.dt);

const dropped = records.length - unique.length;
if (dropped > 0) console.log('  Deduplicated ' + dropped + ' overlapping timestamps.');

// Write CSV.
const lines = ['datetime,value_kWh,data_type'];
for (const r of unique) {
  lines.push(fmtDate(r.dt) + ',' + r.kWh.toFixed(3) + ',Actual');
}
fs.writeFileSync(OUT_CSV, lines.join('\n') + '\n');

console.log('');
console.log('Wrote ' + OUT_CSV);
console.log('  ' + unique.length + ' hourly rows · ' +
            (unique.reduce((s, r) => s + r.kWh, 0) / 1000).toFixed(1) + ' MWh total');
console.log('  Range: ' + fmtDate(unique[0].dt) + '  →  ' + fmtDate(unique[unique.length - 1].dt));

// Monthly totals for energyData.ts. energyData uses ENERGY_START_YEAR = 2025,
// so values[0] = January 2025. The earliest reading here is June 2025, so
// startIndex = 5 (June 2025 = index 5).
const monthsByKey = new Map();
for (const r of unique) {
  const key = r.dt.getUTCFullYear() + '-' + pad(r.dt.getUTCMonth() + 1);
  monthsByKey.set(key, (monthsByKey.get(key) || 0) + r.kWh);
}
const sortedMonthsRaw = Array.from(monthsByKey.entries()).sort(([a], [b]) => a.localeCompare(b));

// FILL GAPS: if a month between the first and last has no rows at all, treat
// it as zero. Without this, an array like [Sep, Oct, May] with a Nov/Dec/.../Apr
// gap would compress into 3 consecutive values, shifting every later month
// the energy table tries to render.
function monthKey(yr, mo) { return yr + '-' + pad(mo); }
const sortedMonths = [];
if (sortedMonthsRaw.length > 0) {
  const [firstY, firstM] = sortedMonthsRaw[0][0].split('-').map(Number);
  const [lastY, lastM] = sortedMonthsRaw[sortedMonthsRaw.length - 1][0].split('-').map(Number);
  let y = firstY, m = firstM;
  while (y < lastY || (y === lastY && m <= lastM)) {
    const k = monthKey(y, m);
    const found = monthsByKey.has(k) ? monthsByKey.get(k) : 0;
    sortedMonths.push([k, found]);
    m++;
    if (m > 12) { m = 1; y++; }
  }
}

console.log('');
console.log('Monthly totals (kWh, rounded; missing months filled with 0):');
sortedMonths.forEach(([k, v]) => {
  const note = monthsByKey.has(k) ? '' : '   ← gap, no data rows';
  console.log('  ' + k + '  ' + Math.round(v).toString().padStart(10) + note);
});

// Compute startIndex relative to Jan 2025 = 0.
const first = sortedMonths[0][0]; // 'YYYY-MM'
const [yr, mo] = first.split('-').map(Number);
const startIndex = (yr - 2025) * 12 + (mo - 1);

console.log('');
console.log('For energyData.ts (startIndex = ' + startIndex + ', i.e. first value is ' + first + '):');
const values = sortedMonths.map(([, v]) => Math.round(v));
console.log('  values: [' + values.join(', ') + ']');
console.log('');
console.log('Annual: ' + values.reduce((a, b) => a + b, 0).toLocaleString() + ' kWh = ' +
            (values.reduce((a, b) => a + b, 0) / 1000).toFixed(2) + ' MWh');
