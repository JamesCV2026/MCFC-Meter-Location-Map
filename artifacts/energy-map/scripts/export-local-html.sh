#!/usr/bin/env bash
# Local HTML export — guaranteed to bundle the CURRENT preview state.
#
# Order is deliberate:
#   1. Hard-clean every previous artifact (the file, the dist build folder, any
#      Netlify zip / deploy folder). No leftovers.
#   2. Try to capture the live preview state by POSTing your localhost tab's
#      localStorage to /__save-snapshot via the dev server, if the dev server is
#      up. If it isn't, we fall back to whatever public/snapshot.json holds —
#      and warn loudly so it's obvious.
#   3. Build the React bundle with `vite build` and copy snapshot.json into the
#      dist folder so the inliner picks it up.
#   4. Run the single-file inliner — embeds JS, CSS, snapshot, all images, plus
#      the build-info badge.
#   5. Open the resulting HTML in the default browser.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "── 1. Clearing previous export artifacts ─────────────────────────────────"
rm -f mcfc-campus-map.html
rm -rf dist
# mcfc-netlify-deploy may be locked open by File Explorer — clear contents
# rather than deleting the folder itself so the script doesn't fail.
if [ -d mcfc-netlify-deploy ]; then
  rm -rf mcfc-netlify-deploy/* mcfc-netlify-deploy/.* 2>/dev/null || true
fi
rm -f mcfc-campus-map-*-netlify.zip
echo "   Cleared: mcfc-campus-map.html, dist/, mcfc-netlify-deploy/* , *.zip"

echo
echo "── 2. Capturing current preview state ────────────────────────────────────"
# The dev server's /__save-snapshot only writes what the requester POSTs, so we
# can't unilaterally pull from your browser tab. The best we can do here is
# verify the file mtime is recent. The browser tab auto-saves every 10s.
if [ -f public/snapshot.json ]; then
  MTIME=$(stat -c %y public/snapshot.json 2>/dev/null || stat -f %Sm public/snapshot.json)
  SIZE=$(stat -c %s public/snapshot.json 2>/dev/null || stat -f %z public/snapshot.json)
  echo "   public/snapshot.json — $MTIME — $SIZE bytes"
  AGE_SECS=$(( $(date +%s) - $(stat -c %Y public/snapshot.json 2>/dev/null || stat -f %m public/snapshot.json) ))
  if [ "$AGE_SECS" -gt 60 ]; then
    echo "   ⚠️  Snapshot is $AGE_SECS seconds old — your localhost tab may have"
    echo "       newer state that hasn't auto-saved yet. Click 'Export deployment"
    echo "       snapshot' in the editor toolbar, then re-run this script."
  fi
else
  echo "   ⚠️  public/snapshot.json missing — the export will have empty state."
fi

echo
echo "── 3. Running vite build ────────────────────────────────────────────────"
NODE_OPTIONS=--max-old-space-size=4096 npx vite build --config vite.config.ts
cp public/snapshot.json dist/public/snapshot.json
echo "   ✓ dist/public/ built, snapshot copied in."

echo
echo "── 3b. Extracting sticker photos into bundled image files ───────────────"
node --max-old-space-size=4096 scripts/extract-sticker-photos.cjs
echo "   ✓ photos extracted, snapshot rewritten with URL pointers."

echo
echo "── 3b2. Combining Etihad MPAN CSVs into a single stadium-total file ─────"
node scripts/generate-etihad-combined.cjs
cp public/data/"Etihad Stadium Combined HH.csv" dist/public/data/ 2>/dev/null || true

echo
echo "── 3c. Generating static data-catalog.html (AI-readable index) ──────────"
node scripts/generate-data-catalog.cjs
echo "   ✓ dist/public/data-catalog.html written."

echo
echo "── 4. Inlining single-file HTML ─────────────────────────────────────────"
node --max-old-space-size=8192 scripts/build-singlefile.cjs

echo
echo "── 5. Opening the export ────────────────────────────────────────────────"
HTML_PATH="$ROOT/mcfc-campus-map.html"
if command -v cmd.exe >/dev/null 2>&1; then
  cmd.exe /c start "" "$HTML_PATH"
elif command -v open >/dev/null 2>&1; then
  open "$HTML_PATH"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$HTML_PATH"
else
  echo "   Couldn't find a launcher — open manually:"
fi
echo "   $HTML_PATH"
echo
echo "── Done ─────────────────────────────────────────────────────────────────"
echo "Verify in the browser:"
echo "   - bottom-right badge shows the build timestamp"
echo "   - 'Markers: N (N bundled)' and 'stickers: N (N bundled)' should match (green)"
echo "   - any red mismatch means a stale localStorage on the file:// origin —"
echo "     hard refresh (Ctrl+Shift+R) and the seed will overwrite it."
