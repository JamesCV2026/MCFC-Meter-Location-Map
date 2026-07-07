// Extracts the data-URL panel photos held under `energy-map-sticker-photos`
// in the snapshot into proper JPG/PNG files under dist/public/photos/. The
// snapshot is then rewritten with that key REMOVED — the embedded HTML never
// has to carry 5+ MB of base64 photos that localStorage can't hold anyway.
//
// Run after `vite build`, before `build-singlefile.cjs`. Mutates
// `dist/public/snapshot.json` and writes new files in `dist/public/photos/`.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'public');
const SNAPSHOT_PATH = path.join(DIST, 'snapshot.json');
const PHOTOS_DIR = path.join(DIST, 'photos');

if (!fs.existsSync(SNAPSHOT_PATH)) {
  console.log('No snapshot.json in dist/public — nothing to extract.');
  process.exit(0);
}

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
const photosRaw = snapshot['energy-map-sticker-photos'];
if (!photosRaw) {
  console.log('No energy-map-sticker-photos key — nothing to extract.');
  process.exit(0);
}

let photoMap;
try {
  photoMap = JSON.parse(photosRaw);
} catch (e) {
  console.error('energy-map-sticker-photos failed to parse — leaving snapshot untouched.', e);
  process.exit(1);
}

fs.mkdirSync(PHOTOS_DIR, { recursive: true });

// Walk each sticker id → array of photo data URLs. Each data URL is decoded
// and written to disk. The new value of energy-map-sticker-photos becomes a
// pointer map: { stickerId: ['photos/<id>-0.jpg', ...] } — small, fits in
// localStorage easily.
let total = 0;
let totalBytes = 0;
const pointerMap = {};
for (const [stickerId, photos] of Object.entries(photoMap)) {
  if (!Array.isArray(photos) || photos.length === 0) continue;
  const safeId = stickerId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const refs = [];
  photos.forEach((dataUrl, i) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      refs.push(dataUrl);
      return;
    }
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!m) {
      refs.push(dataUrl);
      return;
    }
    const mime = m[1];
    const ext = mime === 'image/jpeg' ? 'jpg'
              : mime === 'image/png' ? 'png'
              : mime === 'image/webp' ? 'webp'
              : 'bin';
    const filename = `${safeId}-${i}.${ext}`;
    const buf = Buffer.from(m[2], 'base64');
    fs.writeFileSync(path.join(PHOTOS_DIR, filename), buf);
    refs.push(`photos/${filename}`);
    total++;
    totalBytes += buf.length;
  });
  pointerMap[stickerId] = refs;
}

snapshot['energy-map-sticker-photos'] = JSON.stringify(pointerMap);
fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot));

console.log(`Extracted ${total} photos to dist/public/photos/ (${(totalBytes/1024/1024).toFixed(2)} MB).`);
console.log(`Rewrote snapshot.json — energy-map-sticker-photos now holds URL references only.`);
