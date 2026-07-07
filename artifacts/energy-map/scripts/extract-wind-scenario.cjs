#!/usr/bin/env node
// ── Wind Scenario data extractor ─────────────────────────────────────────────
// Reads MCFC_All_Sites_Energy_Model_Jun25_May26.xlsx and writes a compact JSON
// to public/data/wind-scenario.json containing:
//
//   { meta: { firstDate, lastDate, hours, ... summary metrics ... },
//     hours: [ { t, c, s, w, n }, ... 8760 rows ] }
//
// t = "YYYY-MM-DD HH:mm"
// c = consumption (kWh)
// s = solar generation (kWh)
// w = wind generation (kWh)
// n = net demand including wind (kWh) — negative = export hour
//
// Storing 8,760 rows × 5 numbers as JSON keeps the file ~750 KB raw, ~120 KB
// gzipped. Bundling into the standalone HTML adds <1% to total size.

'use strict';

const fs = require('fs');
const path = require('path');
const xlsx = require(require('os').tmpdir() + '/xlsx-work/node_modules/xlsx');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'public', 'data', 'MCFC_All_Sites_Energy_Model_Jun25_May26.xlsx');
const OUT = path.join(ROOT, 'public', 'data', 'wind-scenario.json');

if (!fs.existsSync(SRC)) {
  console.error('Source xlsx not found at ' + SRC);
  process.exit(1);
}

const wb = xlsx.readFile(SRC);

// ── Parse Summary sheet for headline metrics ────────────────────────────────
const sumRows = xlsx.utils.sheet_to_json(wb.Sheets['Summary'], { header: 1 });
function find(label) {
  for (const r of sumRows) {
    if (Array.isArray(r) && r[0] && String(r[0]).trim().toLowerCase().includes(label.toLowerCase())) {
      return r;
    }
  }
  return null;
}
const summary = {
  totalConsumptionKwh: Number(find('Total Consumption')[1]),
  totalSolarKwh: Number(find('Total Solar')[1]),
  totalWindKwh: Number(find('Total Wind')[1]),
  totalGenerationKwh: Number(find('Total Generation')[1]),
  netDemandAfterSolarKwh: Number(find('Net Demand (after solar)')[1]),
  netDemandAfterSolarAndWindKwh: Number(find('Net Demand (after solar + wind)')[1]),
  exportHours: Number(find('Export Hours')[1]),
};
console.log('Summary metrics:');
for (const [k, v] of Object.entries(summary)) console.log('  ' + k + ': ' + v);

// ── Parse Hourly Data sheet ─────────────────────────────────────────────────
const hourly = xlsx.utils.sheet_to_json(wb.Sheets['Hourly Data'], { header: 1, raw: true });
const headerRow = hourly[0];
console.log('\nHourly columns:', headerRow);

const hours = [];
for (let i = 1; i < hourly.length; i++) {
  const row = hourly[i];
  if (!row || !row[0]) continue;
  // Skip the TOTAL row at the bottom.
  if (String(row[0]).toUpperCase() === 'TOTAL') continue;
  // Excel date handling: numeric value = days since 1900-01-01. Strings get parsed directly.
  let t;
  if (typeof row[0] === 'number') {
    // Excel serial date
    const ms = (row[0] - 25569) * 86400 * 1000;
    t = new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  } else {
    // "DD/MM/YYYY HH:mm"
    const m = String(row[0]).match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
    if (m) {
      t = `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}`;
    } else {
      t = String(row[0]);
    }
  }
  hours.push({
    t,
    c: round(row[1]),
    s: round(row[2]),
    w: round(row[3]),
    n: round(row[5]), // Net Demand incl. Wind (column F)
  });
}

function round(v) {
  if (v == null) return 0;
  const n = Number(v);
  return Math.round(n * 100) / 100;
}

// Sanity check totals from the hourly sum vs the summary sheet.
let cSum = 0, sSum = 0, wSum = 0;
for (const h of hours) { cSum += h.c; sSum += h.s; wSum += h.w; }
console.log('\nSanity check (hourly sum vs summary):');
console.log('  Consumption sum: ' + cSum.toFixed(0) + ' vs summary ' + summary.totalConsumptionKwh.toFixed(0));
console.log('  Solar sum:       ' + sSum.toFixed(0) + ' vs summary ' + summary.totalSolarKwh.toFixed(0));
console.log('  Wind sum:        ' + wSum.toFixed(0) + ' vs summary ' + summary.totalWindKwh.toFixed(0));

const exportHrs = hours.filter(h => h.n < 0).length;
console.log('  Export hours:    ' + exportHrs + ' vs summary ' + summary.exportHours);

// ── Derive month-by-month aggregates so the modal can show them without
//    re-doing the work client-side. ──────────────────────────────────────────
const monthly = {};
for (const h of hours) {
  const month = h.t.slice(0, 7); // "YYYY-MM"
  if (!monthly[month]) monthly[month] = { month, c: 0, s: 0, w: 0, exportHrs: 0, exportKwh: 0 };
  monthly[month].c += h.c;
  monthly[month].s += h.s;
  monthly[month].w += h.w;
  if (h.n < 0) {
    monthly[month].exportHrs += 1;
    monthly[month].exportKwh += -h.n;
  }
}
const monthlyArr = Object.values(monthly).map(m => ({
  month: m.month,
  c: Math.round(m.c),
  s: Math.round(m.s),
  w: Math.round(m.w),
  exportHrs: m.exportHrs,
  exportKwh: Math.round(m.exportKwh),
}));

// Top 10 export days by total exported kWh
const dailyMap = {};
for (const h of hours) {
  const day = h.t.slice(0, 10);
  if (!dailyMap[day]) dailyMap[day] = { day, exportKwh: 0, exportHrs: 0 };
  if (h.n < 0) {
    dailyMap[day].exportKwh += -h.n;
    dailyMap[day].exportHrs += 1;
  }
}
const topExportDays = Object.values(dailyMap)
  .filter(d => d.exportKwh > 0)
  .sort((a, b) => b.exportKwh - a.exportKwh)
  .slice(0, 10)
  .map(d => ({ day: d.day, exportKwh: Math.round(d.exportKwh), exportHrs: d.exportHrs }));

// ── Write the final JSON ────────────────────────────────────────────────────
const out = {
  meta: {
    source: 'MCFC_All_Sites_Energy_Model_Jun25_May26.xlsx',
    sourceUrl: 'data/MCFC_All_Sites_Energy_Model_Jun25_May26.xlsx',
    rangeStart: hours[0]?.t,
    rangeEnd: hours[hours.length - 1]?.t,
    rowCount: hours.length,
    summary,
    monthly: monthlyArr,
    topExportDays,
    builtAt: new Date().toISOString(),
  },
  hours,
};
fs.writeFileSync(OUT, JSON.stringify(out));
console.log('\nWrote ' + OUT);
console.log('Size: ' + (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB');
