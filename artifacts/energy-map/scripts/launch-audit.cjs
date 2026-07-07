#!/usr/bin/env node
// Launch readiness audit. Walks the standalone HTML on the Desktop and
// reports a full inventory of what's bundled: markers per sub-map, photos,
// narratives, panel info, data sources, cables, labels. Output is a
// human-readable summary intended to spot anything missing before sharing.

'use strict';

const fs = require('fs');
const path = require('path');

const HTML_PATH = 'C:/Users/james.evans/OneDrive - Clearvolt/Desktop/mcfc-campus-map.html';

function readSnapshotFromHtml(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(/<script type="application\/json" id="mcfc-snapshot-data">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No snapshot block in HTML');
  const raw = m[1]
    .split('<\\/').join('</')
    .split('<\\!--').join('<!--')
    .split('--\\>').join('-->');
  return JSON.parse(raw);
}

function block(title) {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  ' + title);
  console.log('═══════════════════════════════════════');
}

const stat = fs.statSync(HTML_PATH);
console.log('Standalone HTML:', HTML_PATH);
console.log('Size:           ', (stat.size / 1024 / 1024).toFixed(2), 'MB');
console.log('Modified:       ', stat.mtime.toLocaleString('en-GB'));

const s = readSnapshotFromHtml(HTML_PATH);

block('SUB-MAP ASSETS — Etihad Stadium');
const eti = JSON.parse(s['energy-submap-etihad-stadium-map-assets'] || '[]');
const etiByType = {};
eti.forEach(a => (etiByType[a.type] = (etiByType[a.type] || 0) + 1));
console.log('Total:', eti.length, '— by type:', Object.entries(etiByType).map(([t, c]) => t + '=' + c).join(', '));
eti.forEach(a => console.log('  ' + a.id.padEnd(40) + ' ' + (a.type || '').padEnd(20) + ' ' + a.name));

block('SUB-MAP ASSETS — City Football Academy');
const cfa = JSON.parse(s['energy-submap-cfa-map-assets'] || '[]');
const cfaByType = {};
cfa.forEach(a => (cfaByType[a.type] = (cfaByType[a.type] || 0) + 1));
console.log('Total:', cfa.length, '— by type:', Object.entries(cfaByType).map(([t, c]) => t + '=' + c).join(', '));
cfa.forEach(a => console.log('  ' + a.id.padEnd(40) + ' ' + (a.type || '').padEnd(20) + ' ' + a.name));

block('SUB-MAP ASSETS — Co-op Live');
const cop = JSON.parse(s['energy-submap-co-op-live-map-assets'] || '[]');
console.log('Total:', cop.length);
cop.forEach(a => console.log('  ' + a.id.padEnd(40) + ' ' + (a.type || '').padEnd(20) + ' ' + a.name));

block('CAMPUS-LEVEL USER ASSETS (Overview map only, not on any sub-map)');
const ua = JSON.parse(s['energy-map-user-assets'] || '[]');
console.log('Total:', ua.length);
ua.forEach(a => console.log('  ' + a.id.padEnd(35) + ' ' + (a.type || '').padEnd(20) + ' ' + a.name));

block('CABLES');
const cables = JSON.parse(s['energy-map-cables'] || '[]');
console.log('Total:', cables.length);
cables.forEach(c => console.log('  ' + (c.id || '?').padEnd(40) + ' points=' + (c.points || []).length + ' type=' + (c.type || '?')));

block('USER SITES (labels on overview, e.g. Cable A/B)');
const us = JSON.parse(s['energy-map-user-sites'] || '[]');
console.log('Total:', us.length);
us.forEach(s2 => console.log('  ' + s2.id.padEnd(35) + ' ' + s2.name));

block('STICKERS (building photos on overview / sub-maps)');
const sp = JSON.parse(s['energy-map-sticker-placements'] || '{}');
console.log('Total:', Object.keys(sp).length, 'placements');
const byView = {};
for (const [id, v] of Object.entries(sp)) {
  const k = v.view || '?';
  byView[k] = (byView[k] || 0) + 1;
}
console.log('  by view:', Object.entries(byView).map(([v, c]) => v + '=' + c).join(', '));

block('PANEL PHOTOS (carousel content)');
const photos = JSON.parse(s['energy-map-sticker-photos'] || '{}');
const photoIds = Object.keys(photos);
console.log('Total:', photoIds.length, 'IDs with photos');
let totalPhotoFiles = 0;
photoIds.forEach(id => {
  const arr = photos[id];
  if (Array.isArray(arr)) totalPhotoFiles += arr.length;
});
console.log('Photo files referenced:', totalPhotoFiles);
photoIds.sort().forEach(id => {
  const arr = photos[id];
  const n = Array.isArray(arr) ? arr.length : 0;
  console.log('  ' + id.padEnd(40) + ' ' + n + ' photo' + (n === 1 ? '' : 's'));
});

block('PANEL INFO (titles + narratives)');
const info = JSON.parse(s['energy-map-asset-panel-info'] || '{}');
console.log('Total entries:', Object.keys(info).length);
let withTitle = 0, withNarrative = 0;
Object.entries(info).forEach(([id, v]) => {
  if (v.title) withTitle++;
  if (v.narrative) withNarrative++;
  const flags = [v.title ? 'T' : '-', v.narrative ? 'N(' + v.narrative.length + ')' : '-', v.image ? 'I' : '-'].join(' ');
  const label = (v.title || '(no title)').slice(0, 50);
  console.log('  ' + id.padEnd(40) + ' [' + flags.padEnd(12) + '] ' + label);
});
console.log('Summary:', withTitle, 'with title,', withNarrative, 'with narrative');

block('HH DATA REGISTRY (inline CSVs)');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const hm = html.match(/<script type="application\/json" id="mcfc-hh-data-registry">([\s\S]*?)<\/script>/);
if (!hm) {
  console.log('NO HH DATA REGISTRY — this is the SLIM build (HH data omitted)');
} else {
  try {
    const reg = JSON.parse(hm[1].split('<\\/').join('</'));
    const keys = Object.keys(reg);
    console.log('Total inlined CSVs:', keys.length);
    keys.sort().forEach(k => console.log('  ' + k.padEnd(50) + (reg[k].length / 1024).toFixed(0).padStart(6) + ' KB'));
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

block('PHOTO REGISTRY (inline image files)');
const pm = html.match(/<script type="application\/json" id="mcfc-photo-registry">([\s\S]*?)<\/script>/);
if (pm) {
  const reg = JSON.parse(pm[1].split('<\\/').join('</'));
  const keys = Object.keys(reg);
  console.log('Total inlined photos:', keys.length);
  let totalBytes = 0;
  keys.forEach(k => { totalBytes += reg[k].length; });
  console.log('Total payload:', (totalBytes / 1024 / 1024).toFixed(2), 'MB');
}

block('ATTACHMENTS REGISTRY (downloadable spreadsheets)');
const am = html.match(/<script type="application\/json" id="mcfc-attachments-registry">([\s\S]*?)<\/script>/);
if (am) {
  const reg = JSON.parse(am[1].split('<\\/').join('</'));
  Object.keys(reg).forEach(k => console.log('  ' + k));
}

block('DATA CATALOGUE');
const cm = html.match(/<script type="application\/json" id="mcfc-catalog-html">([\s\S]*?)<\/script>/);
if (cm) {
  const sz = m => (m / 1024).toFixed(1) + ' KB';
  console.log('Inlined size:', sz(cm[1].length));
}

block('STRUCTURAL HEALTH CHECK');
const checks = [
  ['Snapshot block present',          /id="mcfc-snapshot-data"/.test(html)],
  ['HH data registry present',        /id="mcfc-hh-data-registry"/.test(html)],
  ['Photo registry present',          /id="mcfc-photo-registry"/.test(html)],
  ['Attachments registry present',    /id="mcfc-attachments-registry"/.test(html)],
  ['Data catalogue present',          /id="mcfc-catalog-html"/.test(html)],
  ['Closes with </html>',             html.trimEnd().endsWith('</html>')],
  ['Build badge HTML present',        /id="mcfc-build-badge"/.test(html)],
  ['Build label text present',        /id="bi-date"/.test(html)],
  ['Seed script present',             /Local-export localStorage seed/.test(html)],
  ['No bare substation-01 refs',      !html.includes('"substation-01"')],
  ['No Rowsley refs',                 !html.includes('Rowsley')],
];
let pass = 0, fail = 0;
checks.forEach(([label, ok]) => {
  console.log('  ' + (ok ? '✓' : '✗') + '  ' + label);
  if (ok) pass++; else fail++;
});
console.log('');
console.log(pass + ' passing / ' + fail + ' failing');
