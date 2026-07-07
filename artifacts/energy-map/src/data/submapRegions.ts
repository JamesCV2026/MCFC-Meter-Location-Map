// ── Sub-map regions on the overview ─────────────────────────────────────────
// Each sub-map covers a rectangle of the overview map. These rectangles let the
// overview project every sub-map's assets to the right spot — so an asset is
// placed once (on its sub-map) and shown in both views. Rectangles are stored
// in overview percentages; the editor "Calibrate regions" tool adjusts them.

export interface SubMapRegion {
  x: number;      // overview %, top-left corner
  y: number;
  width: number;  // overview %
  height: number;
}

const REGIONS_KEY = 'energy-map-submap-regions';

// Starting estimates — spread out and visible so they're easy to grab and drag
// into place. The calibration tool overrides and persists these.
const DEFAULT_REGIONS: Record<string, SubMapRegion> = {
  'cfa-map': { x: 6, y: 10, width: 28, height: 30 },
  'etihad-stadium-map': { x: 38, y: 30, width: 26, height: 30 },
  'co-op-live-map': { x: 68, y: 58, width: 24, height: 26 },
};

export function loadSubMapRegions(): Record<string, SubMapRegion> {
  let saved: Record<string, SubMapRegion> = {};
  try {
    const raw = localStorage.getItem(REGIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') saved = parsed;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_REGIONS, ...saved };
}

export function saveSubMapRegions(regions: Record<string, SubMapRegion>): void {
  try {
    localStorage.setItem(REGIONS_KEY, JSON.stringify(regions));
  } catch { /* quota — non-fatal */ }
}
