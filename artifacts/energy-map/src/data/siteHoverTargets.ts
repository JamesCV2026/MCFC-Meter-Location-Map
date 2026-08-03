// Where the hover arrow points for Assets-list rows that have no marker of
// their own (photo-sticker sites like Mamma Mia, City At Home, or areas like
// the North Stand). Coordinates are % of the map image, per view.
//
// `view` is 'main' for the overview, or a sub-map id ('etihad-stadium-map',
// 'cfa-map'). A site can have an entry for both, so the arrow works wherever
// the row is hovered. To nudge an arrow, just change its x/y here.

export interface HoverTarget { view: string; x: number; y: number }

export const SITE_HOVER_TARGETS: Record<string, HoverTarget[]> = {
  // Photo-sticker sites — coordinates taken from their placed sticker.
  'Mamma Mia studio': [
    { view: 'main', x: 45, y: 29 },
    { view: 'etihad-stadium-map', x: 68, y: 14 },
  ],
  'City At Home': [
    { view: 'main', x: 38, y: 62 },
    { view: 'etihad-stadium-map', x: 33, y: 83 },
  ],
  // Areas without their own sticker — pointing at the relevant part of the
  // stadium. Nudge these if the arrow doesn't land where you want.
  'North Stand': [
    { view: 'main', x: 41, y: 42 },
    { view: 'etihad-stadium-map', x: 52, y: 34 },
  ],
};

// ── User-adjustable positions ───────────────────────────────────────────────
// Dragging an arrow handle (in Move labels mode) saves an override here, so
// the static coordinates above are just the starting point.
const OVERRIDE_KEY = 'energy-map-hover-target-overrides';

function loadOverrides(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveHoverTarget(name: string, view: string, pos: { x: number; y: number }): void {
  try {
    const all = loadOverrides();
    all[`${name}|${view}`] = pos;
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(all));
  } catch { /* best effort */ }
}

export function hoverTargetFor(name: string | undefined, view: string): HoverTarget | undefined {
  if (!name) return undefined;
  const ov = loadOverrides()[`${name}|${view}`];
  if (ov) return { view, x: ov.x, y: ov.y };
  return SITE_HOVER_TARGETS[name]?.find((t) => t.view === view);
}

// Every arrow target on a view (override-adjusted) — used by the drag handles.
export function targetsForView(view: string): Array<{ name: string; x: number; y: number }> {
  const ov = loadOverrides();
  const out: Array<{ name: string; x: number; y: number }> = [];
  for (const [name, list] of Object.entries(SITE_HOVER_TARGETS)) {
    const t = list.find((e) => e.view === view);
    if (!t) continue;
    const o = ov[`${name}|${view}`];
    out.push({ name, x: o?.x ?? t.x, y: o?.y ?? t.y });
  }
  return out;
}
