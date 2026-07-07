#!/usr/bin/env node
// One-shot import for the freshly-supplied combined Etihad Stadium HH xlsx.
// Reads the wide HH sheet (Date + 48 HH periods + Total), writes it as a CSV
// in public/data/ so the map's modal can render it inline, and prints the
// monthly kWh totals so we can drop them into energyData.ts.
//
// Source: ~/Downloads/Etihad_Stadium_Combined_HH.xlsx
//   Sheet "Etihad Stadium HH" — 23 May 2024 to 21 May 2026
//   Header row: Date, 00:30, 01:00, ..., 24:00, Total kWh
//   Last row labelled "GRAND TOTAL" — skipped on import.

'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require(require('os').tmpdir() + '/xlsx-work/node_modules/xlsx');

const SRC = 'C:/Users/james.evans/Downloads/Etihad_Stadium_Combined_HH.xlsx';
const OUT_CSV = path.resolve(__dirname, '..', 'public', 'data', 'Etihad Stadium Combined HH.csv');

const wb = xlsx.readFile(SRC);
const sheet = wb.Sheets['Etihad Stadium HH'];
if (!sheet) throw new Error('Sheet "Etihad Stadium HH" not found');
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// First row = header. Following rows = daily date + 48 HH values + total.
// The last row is "GRAND TOTAL"; skip any row whose first cell isn't a DD/MM/YYYY date.
const header = rows[0];
const dataRows = rows.slice(1).filter((r) => typeof r[0] === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(r[0]));

// Write CSV — preserve the wide HH shape exactly (date + 48 HH columns + total).
// The HHDataModal handles this layout natively.
const csvLines = [];
csvLines.push('# Etihad Stadium combined HH (MPAN 5 + 16 + 15), supplied by James 03/06/2026.');
csvLines.push('# Date range: ' + dataRows[0][0] + ' to ' + dataRows[dataRows.length - 1][0] + '. ' + dataRows.length + ' day rows.');
csvLines.push(header.map(csvCell).join(','));
for (const r of dataRows) {
  csvLines.push(r.map(csvCell).join(','));
}
function csvCell(v) {
  if (v === '' || v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
fs.writeFileSync(OUT_CSV, csvLines.join('\n') + '\n');

// Compute totals.
let grandTotal = 0;
const monthly = new Map();
for (const r of dataRows) {
  const [d, m, y] = r[0].split('/').map(Number);
  const sumDay = r.slice(1, 49).reduce((a, b) => a + (Number(b) || 0), 0);
  grandTotal += sumDay;
  const key = y + '-' + String(m).padStart(2, '0');
  monthly.set(key, (monthly.get(key) || 0) + sumDay);
}

console.log('Wrote ' + OUT_CSV);
console.log('  ' + dataRows.length + ' day rows · ' + (grandTotal / 1000).toFixed(1) + ' MWh total');
console.log('  Range: ' + dataRows[0][0] + ' to ' + dataRows[dataRows.length - 1][0]);
console.log('');

// Build the energyData-style monthly values array starting Jan 2025.
// startIndex = -8 because first data point May 2024 is 8 months before Jan 2025.
const sortedMonths = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b));
console.log('Monthly totals (kWh, rounded):');
for (const [k, v] of sortedMonths) {
  console.log('  ' + k + '  ' + Math.round(v).toString().padStart(12));
}

// Find Jan 2025 -> startIndex 0. Earlier months are negative.
const monthArr = [];
for (const [k, v] of sortedMonths) {
  monthArr.push({ key: k, total: Math.round(v) });
}
const firstKey = monthArr[0].key;
const [firstY, firstM] = firstKey.split('-').map(Number);
const startIndex = (firstY - 2025) * 12 + (firstM - 1);

console.log('');
console.log('For energyData.ts (startIndex = ' + startIndex + ', i.e. values[0] = ' + firstKey + '):');
console.log('  values: [' + monthArr.map(m => m.total).join(', ') + ']');

const annualTotal = monthArr.reduce((a, b) => a + b.total, 0);
console.log('');
console.log('Annual total (entire ' + monthArr.length + '-month dataset): ' + annualTotal.toLocaleString() + ' kWh = ' +
            (annualTotal / 1000).toFixed(2) + ' MWh');

// Most-recent-12-months total.
const last12 = monthArr.slice(-12);
const last12Sum = last12.reduce((a, b) => a + b.total, 0);
console.log('Most recent 12 months: ' + last12[0].key + ' to ' + last12[last12.length - 1].key +
            ' = ' + last12Sum.toLocaleString() + ' kWh = ' + (last12Sum / 1000).toFixed(2) + ' MWh');
