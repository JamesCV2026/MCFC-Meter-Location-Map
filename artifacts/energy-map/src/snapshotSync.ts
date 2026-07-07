// ── Snapshot auto-save ──────────────────────────────────────────────────────
// Dev-only safety net. Every few seconds the app's localStorage is posted to
// the dev server, which writes it to public/snapshot.json (see the
// snapshot-saver plugin in vite.config.ts). So if browser storage is ever
// cleared, the work is preserved on disk — and auto-restored on the next load
// (see main.tsx). Inactive in the production view-only build.

const SAVE_URL = '/__save-snapshot';
const INTERVAL_MS = 10000;

// Collect every app key from localStorage into a snapshot string. The app's
// keys all start with "energy-"; values are already strings.
function collectSnapshot(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('energy-')) {
      const value = localStorage.getItem(key);
      if (value !== null) data[key] = value;
    }
  }
  return JSON.stringify(data);
}

export function initSnapshotSync(): void {
  let lastSaved = '';
  let saving = false;

  const save = async () => {
    if (saving) return;
    let payload: string;
    try {
      payload = collectSnapshot();
    } catch {
      return;
    }
    // Skip if unchanged, and never overwrite the backup with empty data.
    if (payload === lastSaved || payload === '{}') return;
    saving = true;
    try {
      const res = await fetch(SAVE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (res.ok) lastSaved = payload;
    } catch {
      /* dev server unreachable — try again on the next tick */
    } finally {
      saving = false;
    }
  };

  setInterval(save, INTERVAL_MS);
  // Save promptly when the tab is hidden (covers most tab closes / switches).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void save();
  });
  // Capture the current state shortly after load.
  setTimeout(() => void save(), 2500);
}
