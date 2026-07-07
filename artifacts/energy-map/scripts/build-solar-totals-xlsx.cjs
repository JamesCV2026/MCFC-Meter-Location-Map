#!/usr/bin/env node
// Generate MCFC_Solar_Totals.xlsx onto the Desktop.
//
// Two sheets:
//   1. Solar by Phase - per-array breakdown with phase subtotals (SUM formulas)
//      and a grand total (sum of subtotals).
//   2. Annualised comparison - apples-to-apples 12-month view; Phase 1 actuals
//      scaled by 0.75 (16-month to 12-month), Phase 2 and 3 as stored.
//
// No em or en dashes anywhere. Arial throughout.

'use strict';

const path = require('path');
const ExcelJS = require(require('os').tmpdir() + '/xlsx-work/node_modules/exceljs');

const OUT = 'C:\\Users\\james.evans\\OneDrive - Clearvolt\\Desktop\\MCFC_Solar_Totals.xlsx';

const PHASE1 = [
  ['Joie Stadium',        995296],
  ['Performance Centre',  612426],
  ['FM Building',          93780],
  ['TV Studio',            17564],
];
const PHASE2 = [
  ['MCWFC Solar',          49733],
  ['Ground Mount 2A',     284628],
  ['Ground Mount 2B',     696635],
];
const PHASE3 = [
  ['North Stand Hotel Solar',       84278],
  ['North Stand Commercial Solar',  64595],
  ['Towers Solar',                 119890],
  ['Co-op Live Solar',            1250000],
];

const FONT      = { name: 'Arial', size: 11 };
const HEADER    = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
const SUBTOTAL  = { name: 'Arial', size: 11, bold: true };
const GRAND     = { name: 'Arial', size: 11, bold: true };

const HEADER_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3A5F' } };
const BAND_FILL     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } };
const SUBTOTAL_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
const GRAND_FILL    = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6DEF0' } };

const BORDER = {
  top:    { style: 'thin', color: { argb: 'FFC9CED6' } },
  left:   { style: 'thin', color: { argb: 'FFC9CED6' } },
  right:  { style: 'thin', color: { argb: 'FFC9CED6' } },
  bottom: { style: 'thin', color: { argb: 'FFC9CED6' } },
};

const KWH_FORMAT = '#,##0';

(async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Clearvolt';
  wb.lastModifiedBy = 'Clearvolt';

  // ── Sheet 1 ────────────────────────────────────────────────────────────
  const s1 = wb.addWorksheet('Solar by Phase', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });

  const headers1 = ['Phase', 'Array', 'Annual generation (kWh)', 'Data type', 'Period'];
  s1.addRow(headers1);
  s1.getRow(1).eachCell((cell) => {
    cell.font = HEADER;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = BORDER;
  });

  function writePhase(label, items, dataType, period) {
    const firstRow = s1.rowCount + 1;
    items.forEach(([name, kwh], i) => {
      const r = s1.addRow([label, name, kwh, dataType, period]);
      r.eachCell((cell, colNum) => {
        cell.font = FONT;
        cell.border = BORDER;
        if (colNum === 3) cell.numFmt = KWH_FORMAT;
        if (i % 2 === 1) cell.fill = BAND_FILL;
      });
    });
    const lastRow = s1.rowCount;
    // Subtotal row. We provide an explicit result so the value shows even
    // before Excel recalculates (some viewers / scripted readers don't trigger
    // a recalc). The formula stays live for users who edit the inputs.
    const expectedSubtotal = items.reduce((s, [, k]) => s + k, 0);
    const subRowNum = lastRow + 1;
    const sub = s1.addRow([label, `${label} subtotal`,
      { formula: `SUM(C${firstRow}:C${lastRow})`, result: expectedSubtotal }, '', '']);
    sub.eachCell((cell, colNum) => {
      cell.font = SUBTOTAL;
      cell.fill = SUBTOTAL_FILL;
      cell.border = BORDER;
      if (colNum === 3) cell.numFmt = KWH_FORMAT;
    });
    return { subRow: subRowNum, subtotal: expectedSubtotal };
  }

  const p1 = writePhase('Phase 1', PHASE1, 'Actual',   '16-month (Jan 2025 to Apr 2026)');
  const p2 = writePhase('Phase 2', PHASE2, 'Modelled', '12-month');
  const p3 = writePhase('Phase 3', PHASE3, 'Modelled', '12-month');

  // Grand total.
  const grandTotal = p1.subtotal + p2.subtotal + p3.subtotal;
  const grandRow = s1.addRow(['', 'Grand total (all phases, as stored)',
    { formula: `C${p1.subRow}+C${p2.subRow}+C${p3.subRow}`, result: grandTotal }, '', '']);
  grandRow.eachCell((cell, colNum) => {
    cell.font = GRAND;
    cell.fill = GRAND_FILL;
    cell.border = BORDER;
    if (colNum === 3) cell.numFmt = KWH_FORMAT;
  });

  // Column widths.
  s1.getColumn(1).width = 10;
  s1.getColumn(2).width = 36;
  s1.getColumn(3).width = 26;
  s1.getColumn(4).width = 12;
  s1.getColumn(5).width = 36;

  // ── Sheet 2 ────────────────────────────────────────────────────────────
  const s2 = wb.addWorksheet('Annualised comparison', { views: [{ state: 'frozen', ySplit: 1, showGridLines: false }] });

  const headers2 = ['Phase', 'Description', 'Annual generation (kWh)', 'Note'];
  s2.addRow(headers2);
  s2.getRow(1).eachCell((cell) => {
    cell.font = HEADER;
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = BORDER;
  });

  const p1Annual = p1.subtotal * 0.75;
  const rows2 = [
    ['Phase 1', 'Existing CFA rooftop (actuals annualised x 0.75)',
      { formula: `'Solar by Phase'!C${p1.subRow}*0.75`, result: p1Annual },
      '16-month actuals scaled by 12/16 = 0.75'],
    ['Phase 2', 'CFA new arrays',
      { formula: `'Solar by Phase'!C${p2.subRow}`, result: p2.subtotal },
      'as stored (modelled 12-month)'],
    ['Phase 3', 'Etihad campus arrays',
      { formula: `'Solar by Phase'!C${p3.subRow}`, result: p3.subtotal },
      'as stored (modelled 12-month)'],
  ];
  rows2.forEach((row, i) => {
    const r = s2.addRow(row);
    r.eachCell((cell, colNum) => {
      cell.font = FONT;
      cell.border = BORDER;
      if (colNum === 3) cell.numFmt = KWH_FORMAT;
      if (i % 2 === 1) cell.fill = BAND_FILL;
    });
  });

  // Grand total row.
  const grandStart = 2;
  const grandEnd = s2.rowCount;
  const annualGrand = p1Annual + p2.subtotal + p3.subtotal;
  const grand2 = s2.addRow(['', 'Grand total annualised (apples-to-apples)',
    { formula: `SUM(C${grandStart}:C${grandEnd})`, result: annualGrand }, '']);
  grand2.eachCell((cell, colNum) => {
    cell.font = GRAND;
    cell.fill = GRAND_FILL;
    cell.border = BORDER;
    if (colNum === 3) cell.numFmt = KWH_FORMAT;
  });

  s2.getColumn(1).width = 10;
  s2.getColumn(2).width = 48;
  s2.getColumn(3).width = 26;
  s2.getColumn(4).width = 40;

  // Write to disk.
  const fs = require('fs');
  const dir = path.dirname(OUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  await wb.xlsx.writeFile(OUT);

  const stat = fs.statSync(OUT);
  console.log('Wrote ' + OUT);
  console.log('Size: ' + stat.size.toLocaleString() + ' bytes');
  console.log('Sheets: ' + wb.worksheets.map(s => s.name).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
