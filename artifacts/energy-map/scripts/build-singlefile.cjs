// ── Single-file HTML bundler ────────────────────────────────────────────────
// Reads dist/public/ and produces a single self-contained mcfc-campus-map.html.
// The output file is deliberately self-describing: it carries a build timestamp,
// the marker / sticker counts at build time, and a corner debug badge so it's
// obvious at a glance whether what's loading is the bundled state or stale
// localStorage.
//
// Source of truth: dist/public/snapshot.json. That file is whatever the dev
// server last wrote — either from your localhost tab's auto-save, or from
// clicking "Export deployment snapshot" in the editor. The HTML never reads
// from snapshot.json at runtime (which would fail anyway over file://);
// every key is inlined as a JS literal that seeds localStorage before React
// boots.
//
// What runs at open-time, in order:
//   1. Inline seed script — wipes every energy-* key from this file:// origin's
//      localStorage (a previous open of an OLDER export could have left
//      stale keys behind), then writes the bundled snapshot fresh.
//   2. Inline build-info script — updates the corner badge with the actual
//      runtime counts read back from localStorage, so you can verify the
//      seed worked (mismatch with the build-time counts would surface here).
//   3. React module bundle — boots, sees a populated localStorage, doesn't
//      try to fetch /snapshot.json (which would 404 on file://).
//
// Usage: node scripts/build-singlefile.cjs

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'public');
const ASSETS = path.join(DIST, 'assets');

function mimeFor(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function fileToDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return `data:${mimeFor(filePath)};base64,${buf.toString('base64')}`;
}

// 1. Find the JS and CSS bundle files in the assets folder.
const all = fs.readdirSync(ASSETS);
const jsFile = all.find((f) => /^index-.*\.js$/.test(f));
const cssFile = all.find((f) => /^index-.*\.css$/.test(f));
if (!jsFile || !cssFile) {
  throw new Error('Could not find bundled JS/CSS — run `vite build` first.');
}

// 2. Build a filename → data URL map for every image in /assets/.
const imageMap = new Map();
for (const f of all) {
  if (f === jsFile || f === cssFile) continue;
  const full = path.join(ASSETS, f);
  if (!fs.statSync(full).isFile()) continue;
  imageMap.set(f, fileToDataUrl(full));
}
console.log(`Inlining ${imageMap.size} asset images.`);

// 3. Read the bundled JS and replace every "/assets/<filename>" reference with
//    its data URL. Vite's URL emit produces single-quoted, double-quoted, and
//    backtick strings — handle them all by matching the bare path.
let js = fs.readFileSync(path.join(ASSETS, jsFile), 'utf8');
let replaced = 0;
for (const [name, dataUrl] of imageMap) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`/assets/${safe}`, 'g');
  const before = js.length;
  js = js.replace(pattern, dataUrl);
  if (js.length !== before) replaced++;
}
console.log(`Patched ${replaced} asset URLs in JS bundle.`);

// 4. Read CSS — generally has no asset refs since we have no @import url() in
//    the project, but apply the same patching just in case.
let css = fs.readFileSync(path.join(ASSETS, cssFile), 'utf8');
for (const [name, dataUrl] of imageMap) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  css = css.replace(new RegExp(`/assets/${safe}`, 'g'), dataUrl);
}

// 5. Load snapshot.json. It will be seeded into localStorage BEFORE the main
//    bundle runs so the app's own seedSnapshot() finds the data already there.
const snapshotPath = path.join(DIST, 'snapshot.json');
let snapshotRaw = fs.existsSync(snapshotPath)
  ? fs.readFileSync(snapshotPath, 'utf8')
  : '{}';
console.log(`Snapshot source: ${snapshotPath}`);
console.log(`Snapshot size:   ${(snapshotRaw.length / 1024 / 1024).toFixed(2)} MB`);

// Pre-flight counts so a CLI build prints exactly what's about to be baked in.
// (The same info appears in the HTML's runtime badge — see "Build-time counts".)
try {
  const _s = JSON.parse(snapshotRaw);
  const _parse = (k, fb) => { try { return JSON.parse(_s[k] || JSON.stringify(fb)); } catch { return fb; } };
  const _overview = _parse('energy-map-assets', []);
  let _subTotal = 0;
  const _subBreakdown = {};
  for (const k of Object.keys(_s)) {
    if (k.startsWith('energy-submap-') && k.endsWith('-assets')) {
      const arr = _parse(k, []);
      _subBreakdown[k.replace('energy-submap-', '').replace('-assets', '')] = arr.length;
      _subTotal += arr.length;
    }
  }
  const _userSites = _parse('energy-map-user-sites', []);
  const _cables = _parse('energy-map-cables', []);
  const _placements = _parse('energy-map-sticker-placements', {});
  const _photos = _parse('energy-map-sticker-photos', {});
  console.log('Input snapshot counts:');
  console.log(`  total assets:       ${_overview.length + _subTotal}`);
  console.log(`  overview assets:    ${_overview.length}`);
  console.log(`  sub-map assets:     ${_subTotal}`);
  for (const [n, c] of Object.entries(_subBreakdown)) {
    console.log(`    ${n}: ${c}`);
  }
  console.log(`  user-sites:         ${_userSites.length}`);
  console.log(`  cables:             ${_cables.length}`);
  console.log(`  sticker placements: ${Object.keys(_placements).length}`);
  console.log(`  sticker photos:     ${Object.keys(_photos).length}`);
} catch (_e) {
  console.warn(`Input snapshot counts: SKIPPED (snapshot not parseable yet)`);
}

// 5a. Build a photo registry — keyed by relative URL (e.g. "photos/foo.jpg"),
// values are base64 data URLs. The registry is embedded in the HTML as its
// own JSON block (NOT in the snapshot, to avoid localStorage quota issues).
// A small runtime hook intercepts img-src loads and rewrites matching URLs.
const photosDir = path.join(DIST, 'photos');
const photoRegistry = {};
let photoBytes = 0;
if (fs.existsSync(photosDir)) {
  for (const f of fs.readdirSync(photosDir)) {
    const full = path.join(photosDir, f);
    if (!fs.statSync(full).isFile()) continue;
    const ext = path.extname(f).slice(1).toLowerCase();
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
               : ext === 'png' ? 'image/png'
               : ext === 'webp' ? 'image/webp'
               : 'application/octet-stream';
    const buf = fs.readFileSync(full);
    photoRegistry['photos/' + f] = 'data:' + mime + ';base64,' + buf.toString('base64');
    photoBytes += buf.length;
  }
}
console.log(`Inlining ${Object.keys(photoRegistry).length} panel photos as a registry (${(photoBytes / 1024 / 1024).toFixed(2)} MB raw).`);

const photoRegistryJsonSafe = JSON.stringify(photoRegistry)
  .split("</").join("<" + "\\" + "/")
  .split("<!--").join("<" + "\\" + "!--")
  .split("-->").join("--" + "\\" + ">")
  .split(String.fromCharCode(0x2028)).join("\\u2028")
  .split(String.fromCharCode(0x2029)).join("\\u2029");

// Validate the snapshot parses at build time — bail loudly rather than ship a
// broken HTML that silently fails on open.
try {
  JSON.parse(snapshotRaw);
} catch (e) {
  throw new Error(`public/snapshot.json is not valid JSON: ${e.message}`);
}

// HTML-safe embedding for the JSON data block. JSON.parse is lenient with
// most characters, but a literal "</" sequence anywhere in the JSON would
// terminate the surrounding <script type="application/json"> tag. We
// neutralise that by inserting a backslash: "<\/" — which JSON.parse
// reads as a plain "/", same as "</".
const snapshotJsonSafe = snapshotRaw
  .split("</").join("<" + "\\" + "/")
  .split("<!--").join("<" + "\\" + "!--")
  .split("-->").join("--" + "\\" + ">")
  .split(String.fromCharCode(0x2028)).join("\\u2028")
  .split(String.fromCharCode(0x2029)).join("\\u2029");

// 5z. Wind Scenario data — produced by scripts/extract-wind-scenario.cjs from
// the Clearvolt-supplied "MCFC All Sites Energy Model" xlsx. Shipped as a
// separate JSON file under public/data so it can be re-fetched in dev, and
// inlined into the standalone HTML below for file:// builds.
const windScenarioPath = path.join(DIST, 'data', 'wind-scenario.json');
let windScenarioRaw = '';
if (fs.existsSync(windScenarioPath)) {
  windScenarioRaw = fs.readFileSync(windScenarioPath, 'utf8');
  console.log(`Wind scenario data: ${(windScenarioRaw.length / 1024).toFixed(1)} KB`);
} else {
  console.warn('No wind-scenario.json — run `node scripts/extract-wind-scenario.cjs` first if you want the wind modal to work on file://.');
}
const windScenarioJsonSafe = (windScenarioRaw || '{}')
  .split("</").join("<" + "\\" + "/")
  .split("<!--").join("<" + "\\" + "!--")
  .split("-->").join("--" + "\\" + ">")
  .split(String.fromCharCode(0x2028)).join("\\u2028")
  .split(String.fromCharCode(0x2029)).join("\\u2029");

// 5b. Read every CSV under dist/public/data/ and bundle them into an inline
//     JSON registry keyed by their URL ("data/<filename>"). The HHDataModal
//     checks window.__MCFC_HH_DATA__ before falling back to fetch(), which
//     means the modal works when the HTML is opened from file:// (where
//     fetch on relative URLs is blocked by the browser for security).
//
//     We skip .xlsx — the modal can't render Excel inline anyway, the
//     "Download" button still works for those since it uses href download
//     which works on file:// too.
const DATA_DIR = path.join(DIST, 'data');
// SLIM=1 mode produces a much smaller HTML by omitting the HH data registry
// (the single biggest payload, ~8 MB). The standalone HTML still renders the
// full map, panels, photos and narratives — only the inline HH data viewer
// modal stops working. Used for email-sharing builds where total file size
// has to stay under ~22 MB to survive email attachment limits.
const SLIM_MODE = process.env.SLIM === '1';
const hhRegistry = {};
let hhBytes = 0;
let hhFiles = 0;
if (fs.existsSync(DATA_DIR) && !SLIM_MODE) {
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (!/\.csv$/i.test(f)) continue;
    const full = path.join(DATA_DIR, f);
    if (!fs.statSync(full).isFile()) continue;
    const text = fs.readFileSync(full, 'utf8');
    hhRegistry['data/' + f] = text;
    hhBytes += text.length;
    hhFiles++;
  }
}
if (SLIM_MODE) {
  console.log('SLIM_MODE on — skipping HH data registry (saves ~8 MB).');
} else {
  console.log(`Inlining ${hhFiles} HH CSV files (${(hhBytes / 1024 / 1024).toFixed(2)} MB raw).`);
}

// Same HTML-safe escape pass we apply to the snapshot block.
const hhRegistryRaw = JSON.stringify(hhRegistry);
const hhRegistrySafe = hhRegistryRaw
  .split("</").join("<" + "\\" + "/")
  .split("<!--").join("<" + "\\" + "!--")
  .split("-->").join("--" + "\\" + ">")
  .split(String.fromCharCode(0x2028)).join("\\u2028")
  .split(String.fromCharCode(0x2029)).join("\\u2029");

// 5b1. Bundle binary attachments (xlsx etc.) the React app may need to offer
//      as direct downloads. Keyed by relative URL so the same href works on
//      dev (regular link) and standalone (onClick falls back to data URL).
//      Currently: SystemsLink gas billing report. Add more files here as
//      they're wired into the UI.
const ATTACHMENT_FILES = [
  'data/Gas_Billing_SystemsLink_2025.xlsx',
];
const attachmentsRegistry = {};
let attachmentBytes = 0;
for (const rel of ATTACHMENT_FILES) {
  const full = path.join(DIST, rel);
  if (!fs.existsSync(full)) {
    console.warn('Attachment missing: ' + rel);
    continue;
  }
  const buf = fs.readFileSync(full);
  const ext = path.extname(full).slice(1).toLowerCase();
  const mime = ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
             : ext === 'xls'  ? 'application/vnd.ms-excel'
             : ext === 'pdf'  ? 'application/pdf'
             : ext === 'csv'  ? 'text/csv'
             : 'application/octet-stream';
  attachmentsRegistry[rel] = 'data:' + mime + ';base64,' + buf.toString('base64');
  attachmentBytes += buf.length;
}
console.log(`Inlining ${Object.keys(attachmentsRegistry).length} downloadable attachments (${(attachmentBytes / 1024).toFixed(1)} KB raw).`);
const attachmentsRegistryJsonSafe = JSON.stringify(attachmentsRegistry)
  .split("</").join("<" + "\\" + "/")
  .split("<!--").join("<" + "\\" + "!--")
  .split("-->").join("--" + "\\" + ">")
  .split(String.fromCharCode(0x2028)).join("\\u2028")
  .split(String.fromCharCode(0x2029)).join("\\u2029");

// 5c. Read the generated data-catalog.html and inline it as a JSON-encoded
//     string so the "Open data catalogue" link works even when the standalone
//     HTML is opened from file:// (where the sibling file does not exist).
//     We use JSON.stringify to side-step every escaping problem in one go —
//     the resulting string is valid JS and pastes inside a <script type=
//     "application/json"> block without any `</script>` collision.
const catalogPath = path.join(DIST, 'data-catalog.html');
const catalogHtmlRaw = fs.existsSync(catalogPath)
  ? fs.readFileSync(catalogPath, 'utf8')
  : '';
const catalogJsonSafe = JSON.stringify(catalogHtmlRaw)
  .split("</").join("<" + "\\" + "/")
  .split("<!--").join("<" + "\\" + "!--")
  .split("-->").join("--" + "\\" + ">")
  .split(String.fromCharCode(0x2028)).join("\\u2028")
  .split(String.fromCharCode(0x2029)).join("\\u2029");
console.log(`Inlining data catalogue (${(catalogHtmlRaw.length / 1024).toFixed(1)} KB).`);

// 6. Compute build-time counts from the snapshot so we can show them in the
//    corner badge alongside the runtime counts — a mismatch would be a clear
//    sign that the seed didn't take.
const buildCounts = (() => {
  try {
    const s = JSON.parse(snapshotRaw);
    const sub = ['cfa-map', 'etihad-stadium-map', 'co-op-live-map']
      .map((id) => JSON.parse(s[`energy-submap-${id}-assets`] || '[]').length)
      .reduce((a, b) => a + b, 0);
    const user = JSON.parse(s['energy-map-user-assets'] || '[]').length;
    const stickers = Object.keys(JSON.parse(s['energy-map-sticker-placements'] || '{}')).length;
    const labels = JSON.parse(s['energy-map-user-sites'] || '[]').length;
    const cables = JSON.parse(s['energy-map-cables'] || '[]').length;
    // Photos: extracted by scripts/extract-sticker-photos.cjs into
    // dist/public/photos/, and the snapshot now holds URL pointers only.
    let photos = 0;
    try {
      const photoMap = JSON.parse(s['energy-map-sticker-photos'] || '{}');
      for (const arr of Object.values(photoMap)) {
        if (Array.isArray(arr)) photos += arr.length;
      }
    } catch { /* ignore */ }
    return { markers: sub + user, stickers, labels, cables, photos };
  } catch {
    return { markers: 0, stickers: 0, labels: 0, cables: 0, photos: 0 };
  }
})();
console.log(`Build-time counts: markers=${buildCounts.markers}, stickers=${buildCounts.stickers}, labels=${buildCounts.labels}, cables=${buildCounts.cables}`);

// 7. Build timestamp string for the visible label.
const buildDate = new Date();
const buildIso = buildDate.toISOString();
const buildLocal = buildDate.toLocaleString('en-GB', {
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

// 7a. Git commit info (best-effort — falls back to "n/a" if not in a git repo).
let gitCommit = 'n/a';
let gitBranch = 'n/a';
let gitDirty = false;
try {
  const { execSync } = require('child_process');
  gitCommit = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  try {
    gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch { /* detached head etc */ }
  try {
    const status = execSync('git status --porcelain', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    gitDirty = status.trim().length > 0;
  } catch { /* ignore */ }
} catch { /* not a git repo */ }
console.log(`Git: ${gitBranch} @ ${gitCommit}${gitDirty ? ' (dirty)' : ''}`);

// 7b. Compute label count from snapshot for the badge (sum of overview
// user-sites + per-submap free labels). Stored at build time so the runtime
// badge can show input vs output cleanly.
let buildTimeLabelCount = 0;
try {
  const _s = JSON.parse(snapshotRaw);
  const _us = JSON.parse(_s['energy-map-user-sites'] || '[]');
  buildTimeLabelCount += Array.isArray(_us) ? _us.length : 0;
  for (const k of Object.keys(_s)) {
    if (k.startsWith('energy-submap-') && k.endsWith('-labels')) {
      const arr = JSON.parse(_s[k] || '[]');
      if (Array.isArray(arr)) buildTimeLabelCount += arr.length;
    }
  }
} catch { /* ignore */ }
buildCounts.labels = buildTimeLabelCount;

// 8. Read the favicon as a data URL so the page works without any external
//    file at all.
const faviconPath = path.join(DIST, 'favicon.svg');
const faviconDataUrl = fs.existsSync(faviconPath)
  ? fileToDataUrl(faviconPath)
  : null;

// 9. Assemble the single-file HTML.
const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>MCFC Campus Feasibility Study</title>
    <meta name="description" content="Manchester City Campus Energy Asset Map — Clearvolt Limited" />
    <meta name="robots" content="index, follow" />
    <meta name="mcfc-map-build" content="${buildIso}" />
    <meta property="og:title" content="MCFC Campus Feasibility Study" />
    <meta property="og:description" content="Manchester City Campus Energy Asset Map — Clearvolt Limited" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="MCFC Campus Feasibility Study" />
    <meta name="twitter:description" content="Manchester City Campus Energy Asset Map — Clearvolt Limited" />
    ${faviconDataUrl ? `<link rel="icon" type="image/svg+xml" href="${faviconDataUrl}" />` : ''}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>${css}</style>
    <style>
      /* Build/debug badge — fixed bottom-right. Click to expand details.
         Stays visible in production builds so anyone reviewing the file can
         verify what state was loaded. Hidden behind a faint pill until hover. */
      #mcfc-build-badge {
        position: fixed; bottom: 8px; right: 8px; z-index: 9999;
        font: 11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        color: #fff;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 6px 10px;
        max-width: 460px;
        opacity: 0.55;
        transition: opacity 0.15s ease;
        pointer-events: auto;
        user-select: text;
      }
      #mcfc-build-badge:hover { opacity: 0.96; }
      #mcfc-build-badge .row { display: block; }
      #mcfc-build-badge .lbl { color: rgba(255,255,255,0.55); margin-right: 4px; }
      #mcfc-build-badge .mismatch { color: #fca5a5; }
      #mcfc-build-badge .ok { color: #86efac; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <div id="mcfc-build-badge" data-testid="mcfc-build-badge">
      <span class="row"><span class="lbl">Build:</span><span id="bi-date">${buildLocal}</span></span>
      <span class="row"><span class="lbl">Git:</span><span id="bi-git">${gitBranch} @ ${gitCommit}${gitDirty ? ' <span class="mismatch">(dirty)</span>' : ''}</span></span>
      <span class="row"><span class="lbl">Snapshot:</span><span id="bi-snapfile">${path.basename(snapshotPath)}</span></span>
      <span class="row"><span class="lbl">Source:</span><span id="bi-source">…</span></span>
      <span class="row"><span class="lbl">Markers:</span><span id="bi-markers">…</span> <span class="lbl">·</span> <span class="lbl">labels:</span> <span id="bi-labels">…</span></span>
      <span class="row"><span class="lbl">Cables:</span><span id="bi-cables">…</span> <span class="lbl">·</span> <span class="lbl">stickers:</span> <span id="bi-stickers">…</span></span>
      <span class="row"><span class="lbl">Photos:</span><span id="bi-photos">…</span></span>
      <span class="row" id="bi-error-row" style="display:none"><span class="lbl">Error:</span><span id="bi-error" class="mismatch"></span></span>
    </div>

    <!--
      Snapshot is embedded as a data block — NOT interpolated into JS. This is
      the only safe way to inline ~10 MB of JSON containing arbitrary base64
      payloads. The browser doesn't try to parse this script (type is JSON),
      and the seed reads it back via .textContent + JSON.parse, which can
      handle any valid JSON regardless of length.

      One tweak: the </ sequence in any embedded string would prematurely close
      this script tag, so we replace it with <\\/ at build time. JSON.parse
      handles \\/ as plain /, so the data parses identically to the source.
    -->
    <script type="application/json" id="mcfc-snapshot-data">${snapshotJsonSafe}</script>

    <!--
      HH data registry: every CSV under /data/ is inlined here as a JSON map
      of "data/<filename>" → "raw csv text". This is the ONLY way to make the
      HH data viewer work on file:// since browsers block fetch() against
      file:// origins on relative URLs. On http(s):// the modal still falls
      back to fetch when a URL isn't in the registry, so dev mode is unchanged.
    -->
    <script type="application/json" id="mcfc-hh-data-registry">${hhRegistrySafe}</script>

    <!--
      Inlined static data catalogue (data-catalog.html), JSON-encoded so the
      "Open data catalogue" link works on file:// origins where the sibling
      file does not exist. The link's onClick reads this and serves it via
      a Blob URL in a new tab.
    -->
    <script type="application/json" id="mcfc-catalog-html">${catalogJsonSafe}</script>

    <!--
      Panel photos registry. Keyed by relative URL ("photos/foo.jpg"), values
      are base64 data: URLs. A runtime MutationObserver below intercepts any
      <img src="photos/..."> and rewrites it to its data URL, so the panel
      images load on the standalone file:// build where there's no sibling
      photos/ folder.
    -->
    <script type="application/json" id="mcfc-photo-registry">${photoRegistryJsonSafe}</script>

    <!--
      Wind Scenario data — parsed model output (8,760 hourly rows + summary
      metrics + monthly aggregates + top export days). The WindScenarioModal
      checks window.__MCFC_WIND_SCENARIO__ first, falling back to fetch() in
      dev. Roughly 600 KB raw, adds ~100 KB gzipped to the standalone HTML.
    -->
    <script type="application/json" id="mcfc-wind-scenario">${windScenarioJsonSafe}</script>

    <!--
      Downloadable attachments (xlsx source spreadsheets, PDFs, etc.) embedded
      as base64 data URLs. The React app's download buttons fall back to
      window.__MCFC_ATTACHMENTS__[url] when running on file:// where the
      sibling files do not exist.
    -->
    <script type="application/json" id="mcfc-attachments-registry">${attachmentsRegistryJsonSafe}</script>

    <script>
      // ── Step 1: Local-export localStorage seed ───────────────────────────
      // Runs BEFORE the React bundle so every loader reads the exact state
      // baked into this file. We wipe any pre-existing energy-* keys first
      // (re-opening this file in a browser that previously had OLDER
      // versions can leave stale keys behind), then write the snapshot
      // fresh. The seed records its own result in window.__MCFC_BUILD__ so
      // the corner badge can show exactly what happened.
      (function () {
        var info = {
          iso: ${JSON.stringify(buildIso)},
          local: ${JSON.stringify(buildLocal)},
          mode: 'production',
          gitBranch: ${JSON.stringify(gitBranch)},
          gitCommit: ${JSON.stringify(gitCommit)},
          gitDirty: ${JSON.stringify(gitDirty)},
          snapshotFile: ${JSON.stringify(path.basename(snapshotPath))},
          markers: ${buildCounts.markers},
          stickers: ${buildCounts.stickers},
          labels: ${buildCounts.labels},
          cables: ${buildCounts.cables},
          photos: ${buildCounts.photos},
          stale: 0,
          written: 0,
          failed: [],
          source: 'pending',
          error: null,
        };
        window.__MCFC_BUILD__ = info;
        // Also expose a one-liner the user can run in the console:
        //   __mcfcDiag()
        // — prints a complete diagnostic dump including localStorage counts,
        // data-source detection, and seed errors. Useful when a deploy looks
        // wrong and we need to know which path it took.
        window.__mcfcDiag = function () {
          try {
            var counts = {};
            for (var i = 0; i < localStorage.length; i++) {
              var k = localStorage.key(i);
              if (k && k.indexOf('energy-') === 0) {
                var v = localStorage.getItem(k) || '';
                counts[k] = v.length;
              }
            }
            var diag = {
              build: window.__MCFC_BUILD__,
              localStorageBytesByKey: counts,
              totalLocalStorageKeys: Object.keys(counts).length,
              migrationFlag: localStorage.getItem('energy-map-infra-migrated-v1'),
              snapshotVersion: localStorage.getItem('energy-map-snapshot-version'),
              userAgent: navigator.userAgent,
              location: location.href,
            };
            console.log('[mcfc-diag]', JSON.stringify(diag, null, 2));
            return diag;
          } catch (e) {
            console.error('[mcfc-diag] failed:', e);
            return { error: e && e.message };
          }
        };

        var dataEl = document.getElementById('mcfc-snapshot-data');
        if (!dataEl) {
          info.source = 'seed failed';
          info.error = 'snapshot data block missing in DOM';
          if (console && console.error) console.error('[mcfc-map] ' + info.error);
          return;
        }
        var raw = dataEl.textContent || '';
        var snapshot;
        try {
          snapshot = JSON.parse(raw);
        } catch (e) {
          info.source = 'seed failed';
          info.error = 'JSON.parse error: ' + (e && e.message ? e.message : String(e));
          if (console && console.error) console.error('[mcfc-map] ' + info.error, e);
          return;
        }

        var stale = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf('energy-') === 0) stale.push(k);
        }
        stale.forEach(function (k) { localStorage.removeItem(k); });
        info.stale = stale.length;

        // Write each key independently — a quota error on one optional key
        // (typically energy-map-sticker-photos, full of base64 panel photos)
        // must NOT kill the rest of the seed. Markers, positions, cables
        // and the main sticker library are tiny and always fit.
        var written = 0;
        var failed = [];
        for (var key in snapshot) {
          if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
            var value = snapshot[key];
            if (typeof value === 'string') {
              try {
                localStorage.setItem(key, value);
                written++;
              } catch (e) {
                failed.push({ key: key, message: (e && e.message ? e.message : String(e)) });
                if (console && console.warn) {
                  console.warn('[mcfc-map] Skipped key (write failed): ' + key + ' — ' + (e && e.message ? e.message : e));
                }
              }
            }
          }
        }
        try {
          localStorage.setItem('energy-map-infra-migrated-v1', 'true');
        } catch (e) {
          failed.push({ key: 'energy-map-infra-migrated-v1', message: 'flag write failed' });
        }

        info.written = written;
        info.failed = failed;
        info.source = failed.length > 0 ? 'inlined snapshot (partial)' : 'inlined snapshot';
        if (failed.length > 0 && !info.error) {
          info.error = failed.length + ' key(s) skipped (quota): ' + failed.map(function (f) { return f.key; }).join(', ');
        }

        if (console && console.info) {
          console.info(
            '[mcfc-map] Local export seed OK: cleared ' + stale.length +
            ' stale energy-* keys, wrote ' + written + ' fresh keys. ' +
            'Build counts: ' + info.markers + ' markers / ' +
            info.stickers + ' stickers / ' +
            info.labels + ' labels / ' +
            info.cables + ' cables. Built ' + info.local
          );
        }
      })();

      // ── Step 1e: Attachments registry ───────────────────────────────────
      // window.__MCFC_ATTACHMENTS__ holds base64 data URLs for arbitrary
      // downloadable files (xlsx, pdf, etc.) keyed by their relative path.
      // The React components' download buttons read from this when running
      // on file:// origins where the sibling file isn't bundled.
      (function () {
        try {
          var el = document.getElementById('mcfc-attachments-registry');
          window.__MCFC_ATTACHMENTS__ = el ? JSON.parse(el.textContent || '{}') : {};
          if (console && console.info) {
            console.info('[mcfc-map] Attachments registry loaded: ' +
              Object.keys(window.__MCFC_ATTACHMENTS__).length + ' files inlined.');
          }
        } catch (e) {
          window.__MCFC_ATTACHMENTS__ = {};
          if (console && console.warn) console.warn('[mcfc-map] Attachments parse failed:', e);
        }
      })();

      // ── Step 1d: Photo registry + URL rewriter ─────────────────────────
      // Panel photos are inlined as data URLs in window.__MCFC_PHOTOS__,
      // NOT in localStorage (to avoid quota issues on the standalone build).
      // A MutationObserver watches the DOM for img elements whose src looks
      // like "photos/foo.jpg" and rewrites the src to the inline data URL.
      // Works on any future React re-render too because the observer is on
      // document.documentElement with subtree=true.
      (function () {
        try {
          var el = document.getElementById('mcfc-photo-registry');
          var registry = el ? JSON.parse(el.textContent || '{}') : {};
          window.__MCFC_PHOTOS__ = registry;
          var hits = 0;
          function rewrite(img) {
            if (!img || !img.getAttribute) return;
            var src = img.getAttribute('src');
            if (!src) return;
            // Normalise: drop leading "./" or "/" so "photos/foo.jpg" matches.
            var key = src.replace(/^\.?\//, '');
            if (key.indexOf('photos/') !== 0) return;
            if (src.indexOf('data:') === 0) return;
            if (registry[key]) {
              img.src = registry[key];
              hits++;
            }
          }
          function scan(root) {
            if (!root) return;
            if (root.tagName === 'IMG') rewrite(root);
            if (root.querySelectorAll) {
              root.querySelectorAll('img').forEach(rewrite);
            }
          }
          // Scan once now (for any pre-rendered images) and then watch for
          // new ones via MutationObserver.
          if (document.body) scan(document.body);
          var obs = new MutationObserver(function (muts) {
            muts.forEach(function (m) {
              m.addedNodes && m.addedNodes.forEach(function (n) {
                if (n.nodeType === 1) scan(n);
              });
              if (m.type === 'attributes' && m.target && m.target.tagName === 'IMG') {
                rewrite(m.target);
              }
            });
          });
          obs.observe(document.documentElement, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ['src'],
          });
          if (console && console.info) {
            console.info('[mcfc-map] Photo registry loaded: ' +
              Object.keys(registry).length + ' photos inlined.');
          }
        } catch (e) {
          if (console && console.warn) console.warn('[mcfc-map] Photo registry init failed:', e);
        }
      })();

      // ── Step 1c: Parse the inline data catalogue into a global ─────────
      // window.__MCFC_CATALOG_HTML__ holds the full text of data-catalog.html.
      // The "Open data catalogue" link uses this to serve the catalogue via
      // Blob URL when the regular sibling-file link would fail on file://.
      (function () {
        try {
          var el = document.getElementById('mcfc-catalog-html');
          if (!el) { window.__MCFC_CATALOG_HTML__ = ''; return; }
          window.__MCFC_CATALOG_HTML__ = JSON.parse(el.textContent || '""');
        } catch (e) {
          window.__MCFC_CATALOG_HTML__ = '';
          if (console && console.warn) console.warn('[mcfc-map] Catalog parse failed:', e);
        }
      })();

      // ── Step 1d: Parse the inline Wind Scenario payload ─────────────────
      // window.__MCFC_WIND_SCENARIO__ holds the parsed 8,760-hour model so
      // the WindScenarioModal renders without any network fetch on file://.
      (function () {
        try {
          var el = document.getElementById('mcfc-wind-scenario');
          if (!el) { window.__MCFC_WIND_SCENARIO__ = null; return; }
          var raw = el.textContent || '{}';
          if (raw === '{}' || raw === '') { window.__MCFC_WIND_SCENARIO__ = null; return; }
          window.__MCFC_WIND_SCENARIO__ = JSON.parse(raw);
          if (console && console.info && window.__MCFC_WIND_SCENARIO__ && window.__MCFC_WIND_SCENARIO__.meta) {
            console.info('[mcfc-map] Wind scenario loaded: ' +
              window.__MCFC_WIND_SCENARIO__.meta.rowCount + ' hours, ' +
              window.__MCFC_WIND_SCENARIO__.meta.summary.exportHours + ' export hrs/yr.');
          }
        } catch (e) {
          window.__MCFC_WIND_SCENARIO__ = null;
          if (console && console.warn) console.warn('[mcfc-map] Wind scenario parse failed:', e);
        }
      })();

      // ── Step 1b: Parse the inline HH data registry into a global ─────────
      // window.__MCFC_HH_DATA__ holds the raw CSV text keyed by URL. The
      // HHDataModal checks this synchronously before any network access,
      // which means data loads instantly on file:// origins where fetch()
      // would otherwise be blocked.
      (function () {
        try {
          var el = document.getElementById('mcfc-hh-data-registry');
          if (!el) { window.__MCFC_HH_DATA__ = {}; return; }
          window.__MCFC_HH_DATA__ = JSON.parse(el.textContent || '{}');
          if (console && console.info) {
            console.info('[mcfc-map] HH data registry loaded: ' +
              Object.keys(window.__MCFC_HH_DATA__).length + ' files inlined.');
          }
        } catch (e) {
          window.__MCFC_HH_DATA__ = {};
          if (console && console.warn) console.warn('[mcfc-map] HH registry parse failed:', e);
        }
      })();

      // ── Step 2: Update the corner badge with the runtime counts ──────────
      // Reads localStorage right after the seed so a mismatch with the
      // build-time counts is immediately visible (badge turns red on diff).
      (function () {
        try {
          var info = window.__MCFC_BUILD__ || {};
          function count(key) {
            try { return JSON.parse(localStorage.getItem(key) || '[]').length; } catch { return 0; }
          }
          function keys(key) {
            try { return Object.keys(JSON.parse(localStorage.getItem(key) || '{}')).length; } catch { return 0; }
          }
          var runtimeMarkers =
            count('energy-submap-cfa-map-assets') +
            count('energy-submap-etihad-stadium-map-assets') +
            count('energy-submap-co-op-live-map-assets') +
            count('energy-map-user-assets');
          var runtimeStickers = keys('energy-map-sticker-placements');
          // Labels = overview user-sites + per-submap free labels.
          var runtimeLabels = count('energy-map-user-sites');
          try {
            for (var i = 0; i < localStorage.length; i++) {
              var k = localStorage.key(i);
              if (k && k.indexOf('energy-submap-') === 0 && k.indexOf('-labels') !== -1) {
                runtimeLabels += count(k);
              }
            }
          } catch (e) { /* ignore */ }
          var runtimeCables = count('energy-map-cables');

          function set(id, txt, klass) {
            var el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = ''; // safe — we always re-set textContent below
            el.textContent = txt;
            el.className = klass || '';
          }

          // Always show runtime alongside bundled. If seed failed we still
          // show what's actually loaded so the gap is obvious.
          var bundledMarkers = (typeof info.markers === 'number') ? info.markers : '?';
          var bundledStickers = (typeof info.stickers === 'number') ? info.stickers : '?';
          var bundledLabels = (typeof info.labels === 'number') ? info.labels : '?';
          var bundledCables = (typeof info.cables === 'number') ? info.cables : '?';

          set('bi-markers', runtimeMarkers + ' (' + bundledMarkers + ' bundled)',
            runtimeMarkers === info.markers ? 'ok' : 'mismatch');
          set('bi-stickers', runtimeStickers + ' (' + bundledStickers + ' bundled)',
            runtimeStickers === info.stickers ? 'ok' : 'mismatch');
          set('bi-labels', runtimeLabels + ' (' + bundledLabels + ' bundled)',
            runtimeLabels === info.labels ? 'ok' : 'mismatch');
          set('bi-cables', runtimeCables + ' (' + bundledCables + ' bundled)',
            runtimeCables === info.cables ? 'ok' : 'mismatch');

          // Photos line — describes how panel photos are delivered. They
          // live as separate files under /photos/ in the export bundle,
          // referenced by URL inside energy-map-sticker-photos. They are
          // NOT base64-inlined in localStorage (which used to blow quota).
          var photosTxt;
          if (typeof info.photos === 'number' && info.photos > 0) {
            photosTxt = info.photos + ' bundled assets, not localStorage';
          } else {
            photosTxt = 'none';
          }
          set('bi-photos', photosTxt, 'ok');

          // Data-source detection:
          //   "inlined snapshot"     = seed wrote N fresh keys from <script id="mcfc-snapshot-data">
          //   "migration reseed"     = migrateInfrastructure() ran and replaced sub-map asset arrays
          //   "carryover localStorage" = neither the seed nor the migration touched data (cold-start path)
          //   "seed failed"          = the inline JSON didn't parse / no DOM element
          var sourceLabel = info.source || 'unknown';
          // If runtimeMarkers doesn't match info.markers AND migrate flag exists,
          // it likely means migrateInfrastructure() rewrote the sub-map arrays
          // after our seed. Flag it explicitly.
          try {
            var migFlag = localStorage.getItem('energy-map-infra-migrated-v1');
            if (sourceLabel === 'inlined snapshot' && runtimeMarkers !== info.markers && migFlag === 'true') {
              sourceLabel = 'inlined snapshot + later mutation (' + runtimeMarkers + ' vs ' + info.markers + ')';
            }
          } catch (e) { /* ignore */ }
          set('bi-source', sourceLabel,
            sourceLabel === 'inlined snapshot' ? 'ok' : 'mismatch');

          if (info.error) {
            var row = document.getElementById('bi-error-row');
            var msg = document.getElementById('bi-error');
            if (row) row.style.display = '';
            if (msg) msg.textContent = info.error;
          }

          if (console && console.info) {
            console.info(
              '[mcfc-map] Runtime check: ' + runtimeMarkers + ' markers, ' +
              runtimeStickers + ' stickers, ' + runtimeLabels + ' labels, ' +
              runtimeCables + ' cables. Source: ' + sourceLabel +
              (info.error ? ' · ERROR: ' + info.error : '')
            );
          }
        } catch (e) {
          if (console && console.error) console.error('[mcfc-map] Badge update failed:', e);
        }
      })();
    </script>
    <script type="module">${js}</script>
  </body>
</html>
`;

const outPath = path.join(DIST, 'mcfc-campus-map.html');
fs.writeFileSync(outPath, html);
const outSize = fs.statSync(outPath).size;
console.log(`\nWrote ${outPath}`);
console.log(`Size: ${(outSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Build label: ${buildLocal}`);

// Also copy to the project root for easy access.
const rootCopy = path.join(ROOT, 'mcfc-campus-map.html');
fs.copyFileSync(outPath, rootCopy);
console.log(`Copied to ${rootCopy}`);

// Post-write verification — read the inline snapshot back out of the HTML and
// count it. If these don't match the input counts above, the export pipeline
// is dropping data somewhere and that's a hard bug.
try {
  const _html = fs.readFileSync(outPath, 'utf8');
  const _m = _html.match(/<script type="application\/json" id="mcfc-snapshot-data">([\s\S]*?)<\/script>/);
  if (!_m) {
    console.warn('Output verification: NO inline snapshot block found in HTML!');
  } else {
    const _s = JSON.parse(_m[1]);
    const _parse = (k, fb) => { try { return JSON.parse(_s[k] || JSON.stringify(fb)); } catch { return fb; } };
    const _overview = _parse('energy-map-assets', []);
    let _subTotal = 0;
    for (const k of Object.keys(_s)) {
      if (k.startsWith('energy-submap-') && k.endsWith('-assets')) {
        _subTotal += _parse(k, []).length;
      }
    }
    const _us = _parse('energy-map-user-sites', []);
    const _cables = _parse('energy-map-cables', []);
    const _places = _parse('energy-map-sticker-placements', {});
    console.log('Output snapshot counts (inlined in HTML):');
    console.log(`  total assets:       ${_overview.length + _subTotal}`);
    console.log(`  user-sites:         ${_us.length}`);
    console.log(`  cables:             ${_cables.length}`);
    console.log(`  sticker placements: ${Object.keys(_places).length}`);
  }
} catch (_e) {
  console.warn('Output verification failed: ' + _e.message);
}
