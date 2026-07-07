#!/usr/bin/env node
// Read the Mamma Mia! HH consumption model xlsx, write a CSV in the same
// shape as the other modelled files (datetime,value_kWh,data_type), and
// print the monthly totals so we can drop them into energyData.ts.
//
// Source: ~/Downloads/Mamma_Mia_Etihad_HH_Consumption_Model_1.xlsx
//   Sheet 1 — Assumptions & Summary
//   Sheet 2 — Monthly Summary
//   Sheet 3 — HH Data  (Date, Period Start, HH Period, Month, kWh)
//
// Output: public/data/Consumption_Mamma_Mia_Theatre.csv  (HH granularity)
//
// Note: dates in the source are 2026 (model year). We translate to that year
// directly; energyData.ts will use startIndex=12 so the values land in 2026.

'use strict';

const fs = require('fs');
const path = require('path');
// xlsx was installed in a scratch folder. cygwin /tmp maps to %LOCALAPPDATA%\Temp on Windows.
const xlsx = require(require('os').tmpdir() + '/xlsx-work/node_modules/xlsx');

const SRC = 'C:/Users/james.evans/Downloads/Mamma_Mia_Etihad_HH_Consumption_Model_1.xlsx';
const OUT_CSV = path.resolve(__dirname, '..', 'public', 'data', 'Consumption_Mamma_Mia_Theatre.csv');

const wb = xlsx.readFile(SRC);
const hh = xlsx.utils.sheet_to_json(wb.Sheets['HH Data'], { header: 1, defval: '' });
const monthly = xlsx.utils.sheet_to_json(wb.Sheets['Monthly Summary'], { header: 1, defval: '' });

// First row of HH Data is the header. Validate.
if (!Array.isArray(hh[0]) || hh[0][0] !== 'Date' || hh[0][4] !== 'kWh') {
  throw new Error('Unexpected HH Data header: ' + JSON.stringify(hh[0]));
}

// Write CSV with datetime,value_kWh,data_type shape.
const out = ['datetime,value_kWh,data_type'];
const monthTotals = new Array(12).fill(0);
let total = 0;
for (let i = 1; i < hh.length; i++) {
  const row = hh[i];
  if (!row || row.length < 5) continue;
  const date = String(row[0]).trim();            // "01/01/2026"
  const time = String(row[1]).trim();            // "00:00"
  const month = Number(row[3]);                  // 1..12
  const kWh = Number(row[4]);
  if (!date || !time || !Number.isFinite(kWh)) continue;
  out.push(date + ' ' + time + ',' + kWh.toFixed(3) + ',Modelled');
  if (month >= 1 && month <= 12) monthTotals[month - 1] += kWh;
  total += kWh;
}
fs.writeFileSync(OUT_CSV, out.join('\n') + '\n');

console.log('Wrote ' + OUT_CSV);
console.log('  ' + (out.length - 1) + ' HH rows · ' + (total / 1000).toFixed(1) + ' MWh total');
console.log('');
console.log('Monthly totals (kWh, rounded) for energyData.ts:');
const rounded = monthTotals.map((v) => Math.round(v));
console.log('  [' + rounded.join(', ') + ']');
console.log('');
console.log('  (Annual: ' + rounded.reduce((a, b) => a + b, 0).toLocaleString() + ' kWh = ' +
            (rounded.reduce((a, b) => a + b, 0) / 1000).toFixed(2) + ' MWh)');
console.log('');
console.log('Cross-check vs Monthly Summary sheet:');
for (let i = 3; i < 15; i++) {
  const r = monthly[i];
  if (!r) continue;
  const m = String(r[0]);
  const v = Number(r[1]);
  if (m && Number.isFinite(v)) {
    console.log('  ' + m.padEnd(12) + ' sheet=' + v.toFixed(1).padStart(12) + '   computed=' + monthTotals[i - 3].toFixed(1).padStart(12));
  }
}
