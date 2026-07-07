// Build-time generator: combines the 3 Etihad Stadium MPAN CSVs (MPAN 5,
// MPAN 16, MPAN 15) into a single half-hourly file representing the total
// stadium consumption. The modal can then render the whole thing inline
// instead of falling back to "download the xlsx".
//
// For each date that appears in any of the 3 sources, the 48 HH values are
// summed across the meters present. Dates that only one or two meters
// reported are still included; the missing meters contribute 0 to that row.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'public', 'data');
const OUT_NAME = 'Etihad Stadium Combined HH.csv';
const OUT_PATH = path.join(DATA, OUT_NAME);

// 03/06/2026 — a fresh user-supplied combined HH was added (May 2024 to May
// 2026, 25 months, supplied by James). It carries a comment line marker. If
// that file is in place, skip the row-sum regeneration so the wider dataset
// isn't overwritten by the narrower MPAN-summed window.
if (fs.existsSync(OUT_PATH)) {
  const head = fs.readFileSync(OUT_PATH, 'utf8').slice(0, 400);
  if (/supplied by James/i.test(head)) {
    console.log('Etihad Stadium Combined HH: user-supplied file detected, skipping regeneration.');
    process.exit(0);
  }
}

const SOURCES = [
  { name: 'MPAN 5',  file: 'Etihad 1 Consumption Actual.csv' },
  { name: 'MPAN 16', file: 'Etihad 2 Consumption Acutal.csv' },
  { name: 'MPAN 15', file: 'Etihad 3 Consumption Acutal.csv' },
];

// Tiny CSV row splitter — these particular files have no quoted fields.
const splitRow = (s) => s.split(',');

function readSource(file) {
  const text = fs.readFileSync(path.join(DATA, file), 'utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.length);
  const header = splitRow(lines[0]);
  const rows = lines.slice(1).map(splitRow);
  // 48 HH columns sit at indices 2..49 in this format
  // (Meter Id, Date, 00:30, 01:00, ..., 24:00).
  return { header, rows };
}

const sources = SOURCES.map((s) => ({ ...s, parsed: readSource(s.file) }));

// Build a date → 48-value sum across all three sources.
const HH_COL_COUNT = 48;
const totals = new Map(); // date string → number[48]
function ensure(date) {
  if (!totals.has(date)) totals.set(date, new Array(HH_COL_COUNT).fill(0));
  return totals.get(date);
}

for (const src of sources) {
  for (const row of src.parsed.rows) {
    const date = row[1];
    if (!date) continue;
    const arr = ensure(date);
    for (let i = 0; i < HH_COL_COUNT; i++) {
      const v = Number(row[2 + i]);
      if (Number.isFinite(v)) arr[i] += v;
    }
  }
}

// Sort dates chronologically (input format is DD/MM/YYYY).
const dates = Array.from(totals.keys()).sort((a, b) => {
  const [da, ma, ya] = a.split('/').map(Number);
  const [db, mb, yb] = b.split('/').map(Number);
  return (ya - yb) || (ma - mb) || (da - db);
});

// Header — Date + 48 HH labels + daily Total kWh.
const HH_LABELS = [];
for (let i = 1; i <= HH_COL_COUNT; i++) {
  const minutes = i * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  HH_LABELS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

const outLines = [
  '# Combined consumption for Etihad Stadium — row-wise sum of MPAN 5 (Etihad 1) + MPAN 16 (Etihad 2) + MPAN 15 (Etihad 3).',
  '# Generated at build time from public/data/Etihad 1 Consumption Actual.csv, Etihad 2 Consumption Acutal.csv, Etihad 3 Consumption Acutal.csv.',
  ['Date', ...HH_LABELS, 'Total kWh'].join(','),
];
for (const date of dates) {
  const vals = totals.get(date);
  const dayTotal = vals.reduce((a, b) => a + b, 0);
  outLines.push([date, ...vals.map((v) => v.toFixed(2)), dayTotal.toFixed(2)].join(','));
}

fs.writeFileSync(OUT_PATH, outLines.join('\n'));
const annual = dates.reduce((sum, d) => sum + totals.get(d).reduce((a, b) => a + b, 0), 0);
console.log(`Wrote ${OUT_PATH}`);
console.log(`  ${dates.length} day rows · ${(annual / 1000000).toFixed(2)} GWh combined total`);
