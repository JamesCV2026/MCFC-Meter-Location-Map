#!/usr/bin/env node
// Forensic analysis of the standalone HTML — surfaces every property that
// commonly causes "looks fine locally, corrupted after sharing" symptoms.
//
// Tests:
//   1. File size vs common attachment limits
//   2. Where the heavy inline JSON blocks sit (vulnerable to truncation)
//   3. Non-ASCII / multi-byte character inventory (mangled by some
//      email gateways that re-encode UTF-8 to other charsets)
//   4. Longest single line (some platforms wrap or break at 998 cols)
//   5. Suspicious byte sequences (CRLF, NUL, MIME-like boundaries)
//   6. Whether each inline JSON block actually round-trips through
//      JSON.parse after the same escaping the inliner applies

'use strict';

const fs = require('fs');
const HTML = 'C:/Users/james.evans/OneDrive - Clearvolt/Desktop/mcfc-campus-map.html';

const html = fs.readFileSync(HTML, 'utf8');
const buf = fs.readFileSync(HTML);
const sizeMB = buf.length / 1024 / 1024;

console.log('FILE: ' + HTML);
console.log('Bytes: ' + buf.length.toLocaleString() + '  (' + sizeMB.toFixed(2) + ' MB)');
console.log('');

console.log('═══ SIZE vs ATTACHMENT LIMITS ═══');
const limits = [
  ['Outlook attachment',    25],
  ['Gmail attachment',      25],
  ['Office 365 OWA',        25],
  ['Yahoo Mail attachment', 25],
  ['iMessage attachment',   100],
  ['WhatsApp document',     100],
  ['Slack file upload',     1024],
  ['Teams attachment',      250],
  ['OneDrive share link',   Infinity],
];
limits.forEach(([name, lim]) => {
  const ok = sizeMB <= lim;
  console.log('  ' + (ok ? '✓' : '✗') + '  ' + name.padEnd(28) + ' (limit ' + (lim === Infinity ? 'unlimited' : lim + ' MB') + ')');
});
console.log('');

console.log('═══ INLINE JSON BLOCK POSITIONS ═══');
const blocks = [
  ['mcfc-snapshot-data',         'Snapshot (CRITICAL — boot reads this)'],
  ['mcfc-hh-data-registry',      'HH data registry'],
  ['mcfc-photo-registry',        'Photo registry'],
  ['mcfc-attachments-registry',  'Attachments'],
  ['mcfc-catalog-html',          'Catalogue'],
];
for (const [id, label] of blocks) {
  const re = new RegExp('<script type="application/json" id="' + id + '">');
  const m = re.exec(html);
  if (!m) { console.log('  MISSING  ' + label); continue; }
  const startByte = Buffer.byteLength(html.slice(0, m.index), 'utf8');
  const fromEnd = buf.length - startByte;
  const pctIntoFile = (startByte / buf.length * 100).toFixed(1);
  console.log('  ' + label.padEnd(45) + ' starts at ' + (startByte / 1024 / 1024).toFixed(1) + ' MB (' + pctIntoFile + '% in, ' + (fromEnd / 1024 / 1024).toFixed(1) + ' MB to EOF)');
}
console.log('');

console.log('═══ NON-ASCII CHARACTERS (re-encoded by some email gateways) ═══');
const nonAscii = {};
for (const ch of html) {
  const code = ch.charCodeAt(0);
  if (code > 127) nonAscii[ch] = (nonAscii[ch] || 0) + 1;
}
const top = Object.entries(nonAscii).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log('  ' + Object.keys(nonAscii).length + ' distinct non-ASCII characters in file');
console.log('  Top 10 by frequency:');
for (const [ch, n] of top) {
  const code = ch.charCodeAt(0);
  const hex = code.toString(16).padStart(4, '0').toUpperCase();
  console.log('    U+' + hex + '  "' + ch + '"  ' + n.toLocaleString() + 'x');
}
console.log('');

console.log('═══ LINE LENGTH ANALYSIS ═══');
const lines = html.split('\n');
let maxLine = 0;
let maxLineIdx = 0;
lines.forEach((l, i) => { if (l.length > maxLine) { maxLine = l.length; maxLineIdx = i; } });
console.log('  Lines: ' + lines.length.toLocaleString());
console.log('  Longest line: ' + maxLine.toLocaleString() + ' chars (line ' + (maxLineIdx + 1) + ')');
console.log('  RFC-5322 quoted-printable line limit: 998 chars');
console.log('  ' + (maxLine > 998 ? '✗ SOME LINES EXCEED 998 CHARS — vulnerable if email re-wraps text' : '✓ All lines under 998 chars'));
console.log('');

console.log('═══ SUSPICIOUS BYTE SEQUENCES ═══');
const nulByte = buf.indexOf(0x00);
console.log('  NUL bytes: ' + (nulByte === -1 ? 'none' : 'FOUND at byte ' + nulByte));
const crlf = html.match(/\r\n/g);
const lfOnly = html.match(/(?<!\r)\n/g);
console.log('  CRLF line endings: ' + (crlf ? crlf.length : 0));
console.log('  LF-only line endings: ' + (lfOnly ? lfOnly.length : 0));
const mimeBoundaryPatterns = html.match(/--[A-Za-z0-9_]{20,}/g);
console.log('  MIME-like boundary patterns (--xxx): ' + (mimeBoundaryPatterns ? mimeBoundaryPatterns.length + ' (could confuse email parsers)' : 'none'));
console.log('');

console.log('═══ JSON ROUND-TRIP TEST ═══');
for (const [id, label] of blocks) {
  const re = new RegExp('<script type="application/json" id="' + id + '">([\\s\\S]*?)</script>');
  const m = html.match(re);
  if (!m) continue;
  let raw = m[1]
    .split('<\\/').join('</')
    .split('<\\!--').join('<!--')
    .split('--\\>').join('-->')
    .split('\\u2028').join(' ')
    .split('\\u2029').join(' ');
  try {
    JSON.parse(raw);
    console.log('  ✓  ' + label);
  } catch (e) {
    console.log('  ✗  ' + label + ' — ' + e.message.slice(0, 80));
  }
}
console.log('');

console.log('═══ DIAGNOSIS ═══');
const verdict = [];
if (sizeMB > 25) verdict.push('Over 25 MB email limit — primary cause of corruption when emailed.');
if (maxLine > 998) verdict.push('Some lines exceed 998 chars — risk of breakage by quoted-printable mail.');
const totalNonAscii = Object.values(nonAscii).reduce((a, b) => a + b, 0);
if (totalNonAscii > 0) verdict.push(totalNonAscii.toLocaleString() + ' non-ASCII chars present — risk of mangling on ASCII-only mail gateways.');
if (nulByte !== -1) verdict.push('NUL bytes present — abnormal for HTML.');
if (verdict.length === 0) console.log('  File looks clean — corruption is happening DURING TRANSIT, not in the file.');
else verdict.forEach(v => console.log('  - ' + v));
