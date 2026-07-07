// Build-time generator for dist/public/data-catalog.html.
//
// Produces a single, fully static HTML page that lists every asset, every
// monthly energy figure, and every linked source file. The page contains
// NO JavaScript — it's deliberately structured so that an AI (Claude,
// ChatGPT, etc.) fetching the URL with a standard WebFetch tool can read
// the full dataset in one go, without needing to execute the React app.
//
// Reads:
//   - src/data/energyData.ts  (the canonical monthly series + dataType)
//   - src/data/dataSourceMap.ts (asset display name → source URL)
//   - dist/public/snapshot.json (for current asset placement + counts)
//
// Outputs:
//   - dist/public/data-catalog.html

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'public');

const energyDataSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'energyData.ts'), 'utf8');
const dataSourceMapSrc = fs.readFileSync(path.join(ROOT, 'src', 'data', 'dataSourceMap.ts'), 'utf8');
const snapshot = fs.existsSync(path.join(DIST, 'snapshot.json'))
  ? JSON.parse(fs.readFileSync(path.join(DIST, 'snapshot.json'), 'utf8'))
  : {};

// ── 1. Parse energyData.ts into a structured map ─────────────────────────
// Walk line by line tracking which top-level key block we're in. For each
// `consumption:` / `generation:` we pick up the dataType, startIndex
// (optional), and the values array.
const energy = {};
{
  const lines = energyDataSrc.split('\n');
  let currentKey = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyM = line.match(/^\s*'([a-z0-9-]+)':\s*\{/);
    if (keyM && !line.includes('consumption') && !line.includes('generation')) {
      currentKey = keyM[1];
      energy[currentKey] = energy[currentKey] || {};
      continue;
    }
    const serM = line.match(/^\s*(consumption|generation):/);
    if (serM && currentKey) {
      const series = serM[1];
      // Collect a window of lines that might contain dataType / startIndex / values.
      const window = lines.slice(i, Math.min(lines.length, i + 8)).join(' ');
      const dt = window.match(/dataType:\s*'(Actual|Modelled)'/);
      const si = window.match(/startIndex:\s*(-?\d+)/);
      const vals = window.match(/values:\s*\[([^\]]+)\]/);
      if (dt && vals) {
        energy[currentKey][series] = {
          dataType: dt[1],
          startIndex: si ? Number(si[1]) : 0,
          values: vals[1].split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)),
        };
      }
    }
  }
}

// ── 2. Parse dataSourceMap.ts: display-name → URL ────────────────────────
const sourceMap = {};
{
  const re = /'([^']+)':\s*\{\s*url:\s*'([^']+)',\s*label:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(dataSourceMapSrc)) !== null) {
    sourceMap[m[1]] = { url: m[2], label: m[3] };
  }
}

// ── 3. Manual catalogue: order + group + which energy keys to display ────
// The rows mirror what's in the bottom Data Panel of the live map. Kept
// here as an explicit list so an AI reader sees them in a sensible reading
// order, not whatever JSON-object iteration would produce.

const consumptionRows = [
  { group: 'etihad', site: 'Etihad Stadium', energyKey: 'etihad-stadium', source: 'Etihad Stadium' },
  { group: 'etihad', site: 'Etihad Stadium — MPAN 5 component', energyKey: 'etihad-mpan-1', source: 'MPAN 5' },
  { group: 'etihad', site: 'Etihad Stadium — MPAN 16 component', energyKey: 'etihad-mpan-2', source: 'MPAN 16' },
  { group: 'etihad', site: 'Etihad Stadium — MPAN 15 component', energyKey: 'etihad-mpan-3', source: 'MPAN 15' },
  { group: 'etihad', site: 'Co-op Live Arena', energyKey: 'co-op-live', source: 'Co-op Live Arena' },
  { group: 'etihad', site: 'Etihad Walkways', energyKey: 'etihad-walkways', source: 'Etihad Walkways' },
  { group: 'etihad', site: 'City At Home', energyKey: 'city-at-home', source: 'City At Home' },
  // Etihad Substation 1 (Rowsley Street) removed — marker dropped from the map.
  { group: 'etihad', site: 'Etihad North Stand Commercial', energyKey: 'commercial', source: 'Etihad North Stand Commercial' },
  { group: 'etihad', site: 'Etihad North Stand Extension', energyKey: 'etihad-extension', source: 'Etihad North Stand Extension' },
  { group: 'etihad', site: 'Etihad North Stand Hotel', energyKey: 'hotel', source: 'Etihad North Stand Hotel' },
  // Mamma Mia! Theatre — modelled assumption-based HH consumption, 2026.
  { group: 'etihad', site: 'Mamma Mia! Theatre', energyKey: 'mamma-mia', source: 'Mamma Mia Theatre' },
  // Etihad Towers moved to the generation list below — see generationRows.
  { group: 'cfa', site: 'City Football Academy (CFA total)', energyKey: 'cfa', source: 'CFA' },
  // CHP Machines (combined modelled) removed in favour of the per-unit actual
  // meter rows below — CHP Machine 1 and CHP Machine 2.
  { group: 'cfa', site: 'CHP Machine 1', energyKey: 'chp-machine-1', source: 'CHP Machine 1' },
  { group: 'cfa', site: 'CHP Machine 2', energyKey: 'chp-machine-2', source: 'CHP Machine 2' },
  { group: 'cfa', site: 'MCWFC Building (Women’s Facility)', energyKey: 'mcwfc', source: 'MCWFC Building' },
];

const generationRows = [
  { group: 'etihad', site: 'Co-op Live Arena solar array', energyKey: 'co-op-live', source: 'Co-op Live Solar Array' },
  { group: 'etihad', site: 'Etihad North Stand Commercial solar', energyKey: 'commercial', source: 'Commercial Building Solar Array' },
  { group: 'etihad', site: 'Etihad North Stand Hotel solar', energyKey: 'hotel', source: 'Hotel Solar Array' },
  { group: 'etihad', site: 'Etihad Towers solar', energyKey: 'etihad-towers', source: 'Etihad Towers' },
  { group: 'cfa', site: 'FM Building solar', energyKey: 'fm-building', source: 'FM Building' },
  { group: 'cfa', site: 'TV Studio solar', energyKey: 'tv-studio', source: 'TV Studio' },
  { group: 'cfa', site: 'Joie Stadium solar', energyKey: 'joie-stadium', source: 'Joie Stadium' },
  { group: 'cfa', site: 'Indoor Pitch / Performance Centre solar', energyKey: 'indoor-pitch', source: 'Performance Centre' },
  { group: 'cfa', site: 'MCWFC Building solar', energyKey: 'mcwfc', source: 'MCWFC Building' },
  { group: 'cfa', site: 'Phase 2A Ground Mount', energyKey: 'ground-mount-2a', source: 'Phase 2A Ground Mount' },
  // Phase 2B Ground Mount intentionally not listed — the live map only has
  // the Phase 2A ground-mount marker, so the catalogue mirrors that.
  // CHP Machine 1 and CHP Machine 2 moved to consumptionRows above per the
  // user's preference for treating CHP output as a consumption line item.
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthLabel(absIdx) {
  const m = ((absIdx % 12) + 12) % 12;
  const year = 2025 + Math.floor(absIdx / 12);
  return `${MONTHS[m]} ${year}`;
}
function fmt(n) { return n.toLocaleString('en-GB'); }
function fmt0(n) { return Math.round(n).toLocaleString('en-GB'); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function renderMonthlyTable(series, type) {
  if (!series) return '<p class="muted">No underlying monthly series.</p>';
  const start = series.startIndex || 0;
  const total = series.values.reduce((s, v) => s + v, 0);
  let rows = '';
  for (let i = 0; i < series.values.length; i++) {
    rows += `<tr><td>${monthLabel(start + i)}</td><td class="num">${fmt0(series.values[i])}</td></tr>`;
  }
  return `<table class="monthly"><thead><tr><th>Month</th><th class="num">${esc(type)} (kWh) · ${esc(series.dataType)}</th></tr></thead><tbody>${rows}<tr class="total"><td>Total (${series.values.length} months)</td><td class="num">${fmt0(total)}</td></tr></tbody></table>`;
}

function renderRow(row, type) {
  const series = row.energyKey ? energy[row.energyKey]?.[type] : null;
  const src = sourceMap[row.source];
  const sourceHtml = src
    ? `<p class="source"><a href="${esc(src.url)}" download>↓ ${esc(src.url.split('/').pop())}</a> — ${esc(src.label)}</p>`
    : '<p class="source muted">No source file linked.</p>';
  return `<section class="asset"><h4>${esc(row.site)}</h4>${sourceHtml}${renderMonthlyTable(series, type)}</section>`;
}

const buildDate = new Date();
const buildIso = buildDate.toISOString();
const buildLocal = buildDate.toLocaleString('en-GB');

// Summary stats
const consumptionTotal = consumptionRows.reduce((s, r) => {
  const series = r.energyKey ? energy[r.energyKey]?.consumption : null;
  return series ? s + series.values.reduce((a, b) => a + b, 0) : s;
}, 0);
const generationTotal = generationRows.reduce((s, r) => {
  const series = r.energyKey ? energy[r.energyKey]?.generation : null;
  return series ? s + series.values.reduce((a, b) => a + b, 0) : s;
}, 0);

const consumptionEtihad = consumptionRows.filter((r) => r.group === 'etihad').map((r) => renderRow(r, 'consumption')).join('\n');
const consumptionCfa = consumptionRows.filter((r) => r.group === 'cfa').map((r) => renderRow(r, 'consumption')).join('\n');
const generationEtihad = generationRows.filter((r) => r.group === 'etihad').map((r) => renderRow(r, 'generation')).join('\n');
const generationCfa = generationRows.filter((r) => r.group === 'cfa').map((r) => renderRow(r, 'generation')).join('\n');

// List of every file in dist/public/data/ for a footer index
const dataDir = path.join(DIST, 'data');
const dataFiles = fs.existsSync(dataDir)
  ? fs.readdirSync(dataDir).filter((f) => !f.startsWith('.')).sort()
  : [];
const dataIndex = dataFiles.map((f) => `<li><a href="data/${esc(f)}" download>${esc(f)}</a></li>`).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MCFC Campus Feasibility Study: Data Catalogue</title>
<meta name="description" content="Full half-hourly + monthly energy data for every asset on the Manchester City campus map. Plain HTML index, AI-readable." />
<style>
  body { font: 14px/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif; color: #1f2937; max-width: 980px; margin: 24px auto; padding: 0 16px; background: #f9fafb; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #111827; }
  h2 { font-size: 18px; margin-top: 32px; padding-bottom: 4px; border-bottom: 1px solid #d1d5db; color: #1d4ed8; }
  h3 { font-size: 15px; margin-top: 22px; color: #374151; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
  h4 { font-size: 14px; margin: 16px 0 4px; color: #111827; }
  p { margin: 6px 0; }
  .muted { color: #6b7280; font-size: 12.5px; }
  .source { font-size: 12.5px; }
  .source a { color: #1d4ed8; text-decoration: none; }
  .source a:hover { text-decoration: underline; }
  .asset { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
  th, td { border: 1px solid #e5e7eb; padding: 4px 8px; text-align: left; }
  th { background: #f3f4f6; font-weight: 600; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  tr.total { font-weight: 700; background: #f9fafb; }
  .summary { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; }
  .summary table { font-size: 14px; }
  .summary td.num { font-weight: 600; }
  .header-note { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; padding: 10px 12px; border-radius: 6px; font-size: 13px; }
  ul.data-files { font-size: 12.5px; columns: 2; column-gap: 24px; padding-left: 18px; }
  ul.data-files li { margin: 2px 0; break-inside: avoid; }
  a.back { display: inline-block; margin: 8px 0; color: #1d4ed8; font-size: 13px; text-decoration: none; }
  a.back:hover { text-decoration: underline; }
</style>
</head>
<body>

<h1>MCFC Campus Feasibility Study: Data Catalogue</h1>
<p class="muted">Generated <time datetime="${esc(buildIso)}">${esc(buildLocal)}</time>. <a href="./" class="back">← Back to the interactive map</a></p>

<div class="header-note">
  <strong>About this page.</strong> Every monthly figure shown on the interactive campus map is reproduced here as plain HTML so it can be read by any AI tool that fetches the URL. Each asset section also links the underlying half-hourly source file. To browse the map visually, open the
  <a href="./">main page</a>.
</div>

<h2>Summary</h2>
<div class="summary"><table>
<tr><th>Total Consumption (sum of all linked series)</th><td class="num">${fmt0(consumptionTotal)} kWh</td></tr>
<tr><th>Total Generation (sum of all linked series)</th><td class="num">${fmt0(generationTotal)} kWh</td></tr>
<tr><th>Consumption rows in this catalogue</th><td class="num">${consumptionRows.length}</td></tr>
<tr><th>Generation rows in this catalogue</th><td class="num">${generationRows.length}</td></tr>
<tr><th>Source files bundled at <code>/data/</code></th><td class="num">${dataFiles.length}</td></tr>
</table></div>

<h2>Consumption</h2>
<h3>Etihad Stadium Campus</h3>
${consumptionEtihad}
<h3>City Football Academy (CFA)</h3>
${consumptionCfa}

<h2>Generation</h2>
<h3>Etihad Stadium Campus</h3>
${generationEtihad}
<h3>City Football Academy (CFA)</h3>
${generationCfa}

<h2>All bundled source files</h2>
<p class="muted">Every file at <code>/data/</code>. Click to download — or paste the URL to an AI tool that supports CSV fetching.</p>
<ul class="data-files">
${dataIndex}
</ul>

<p class="muted" style="margin-top:32px;">MCFC Campus Feasibility Study · Clearvolt Limited · For CFG use only.</p>

</body>
</html>
`;

const outPath = path.join(DIST, 'data-catalog.html');
fs.writeFileSync(outPath, html);
console.log(`Wrote ${outPath}`);
console.log(`  ${(html.length / 1024).toFixed(1)} KB · ${consumptionRows.length} consumption rows · ${generationRows.length} generation rows · ${dataFiles.length} bundled files`);
