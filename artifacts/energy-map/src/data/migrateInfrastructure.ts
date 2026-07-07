// ── One-time infrastructure migration ───────────────────────────────────────
// Moves the campus onto the standardised infrastructure model
// (data/infrastructure.ts):
//
//   1. Each sub-map is seeded with its clean, renumbered infrastructure assets
//      (battery markers already on a sub-map are kept).
//   2. The overview's old duplicate infrastructure layer is stripped back to
//      just its battery markers.
//   3. Overview cables are un-plugged from any asset that no longer lives on
//      the overview — they keep their shape, they just lose the anchor.
//
// Runs once on app boot, guarded by a flag. The pre-migration state is backed
// up to a single localStorage key so the change is reversible if needed.

import { infrastructureForSubMap, type SubMapId } from './infrastructure';
import type { EnergyAsset } from './assets';
import type { Cable, CablePoint } from './cables';

const MIGRATION_FLAG = 'energy-map-infra-migrated-v1';
const BACKUP_KEY = 'energy-map-infra-premigration-backup';

const SUB_MAP_IDS: SubMapId[] = ['etihad-stadium-map', 'cfa-map', 'co-op-live-map'];

function parse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function migrateInfrastructure(): void {
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === 'true') return;

    // Defence in depth — if ANY sub-map already has assets in localStorage,
    // bail out. The migration is a one-time bootstrap for fresh installs; it
    // must never wipe live data just because the migration flag went missing
    // (snapshot seed bug, quota error, manual localStorage edit, etc.). This
    // is the second line of defence: the flag is the first, this is the
    // safety net that prevents the "26 assets" regression we've been chasing.
    const anySubMapHasData = SUB_MAP_IDS.some((id) => {
      const raw = localStorage.getItem(`energy-submap-${id}-assets`);
      if (!raw) return false;
      try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) && arr.length > 0;
      } catch {
        return false;
      }
    });
    if (anySubMapHasData) {
      // Set the flag so subsequent boots short-circuit at the first check.
      localStorage.setItem(MIGRATION_FLAG, 'true');
      // eslint-disable-next-line no-console
      console.info('[migrateInfrastructure] skipped — sub-map data already present; flag refreshed.');
      return;
    }

    // Back up every key this migration rewrites, so it can be undone.
    const touched = [
      'energy-map-user-assets',
      'energy-map-cables',
      ...SUB_MAP_IDS.map((id) => `energy-submap-${id}-assets`),
    ];
    const backup: Record<string, string | null> = {};
    touched.forEach((k) => { backup[k] = localStorage.getItem(k); });
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));

    // 1. Seed each sub-map with its standardised infrastructure assets.
    //    Battery markers already placed on a sub-map are preserved.
    for (const id of SUB_MAP_IDS) {
      const key = `energy-submap-${id}-assets`;
      const existing = parse<EnergyAsset[]>(localStorage.getItem(key), []);
      const batteries = existing.filter((a) => a && a.type === 'battery');
      const model: EnergyAsset[] = infrastructureForSubMap(id).map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        x: a.x,
        y: a.y,
        ...(a.mpan ? { mpan: a.mpan } : {}),
        ...(a.notes ? { notes: a.notes } : {}),
      }));
      localStorage.setItem(key, JSON.stringify([...model, ...batteries]));
    }

    // 2. Strip the overview's asset layer back to battery markers only.
    const overview = parse<EnergyAsset[]>(localStorage.getItem('energy-map-user-assets'), []);
    const batteriesOnly = overview.filter((a) => a && a.type === 'battery');
    localStorage.setItem('energy-map-user-assets', JSON.stringify(batteriesOnly));

    // 3. Un-plug overview cables from assets that no longer live on the
    //    overview. The point keeps its position, it just loses the anchor.
    const keepIds = new Set(batteriesOnly.map((a) => a.id));
    const cables = parse<Cable[]>(localStorage.getItem('energy-map-cables'), []);
    const unplugged: Cable[] = cables.map((c) => ({
      ...c,
      points: (c.points ?? []).map((p): CablePoint =>
        p.assetId && !keepIds.has(p.assetId) ? { x: p.x, y: p.y } : p,
      ),
    }));
    localStorage.setItem('energy-map-cables', JSON.stringify(unplugged));

    localStorage.setItem(MIGRATION_FLAG, 'true');
  } catch {
    /* migration is best-effort — never block app boot */
  }
}
