// ── Asset auto-naming ────────────────────────────────────────────────────────
// Works out the next sequential name for a new asset — global per type, so the
// numbering runs as one unbroken sequence across the whole campus (overview +
// every sub-map). Adding a transformer when 14 already exist suggests
// "Transformer 15". The suggestion is only a default — the user can still
// change the number in the Add Asset dialog.

import { assetTypeConfig } from './assetTypes';
import type { AssetType, EnergyAsset } from './assets';

const SUB_MAP_IDS = ['etihad-stadium-map', 'cfa-map', 'co-op-live-map'];

// Every asset currently on the campus — overview plus every sub-map.
function allAssets(): EnergyAsset[] {
  const out: EnergyAsset[] = [];
  const read = (key: string) => {
    try {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(arr)) out.push(...arr);
    } catch { /* ignore */ }
  };
  read('energy-map-user-assets');
  SUB_MAP_IDS.forEach((id) => read(`energy-submap-${id}-assets`));
  return out;
}

// The next sequential name for a new asset of this type — e.g. "Transformer 15".
export function nextAssetName(type: AssetType): string {
  const label = assetTypeConfig[type].label;
  let max = 0;
  for (const a of allAssets()) {
    if (!a || a.type !== type) continue;
    const match = /(\d+)\s*$/.exec(a.name || '');
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${label} ${max + 1}`;
}
