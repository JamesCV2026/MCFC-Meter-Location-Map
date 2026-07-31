// Which solar array powers what. Drives the "supply connections" overlay: a
// campus-wide array draws a flow line to the campus supply hub (it exports into
// the shared campus grid and offsets the whole site's demand); a building-local
// array powers only the building it sits on (behind that building's meter), so
// it shows an "on-site only" ring instead of a line.
//
// `array` matches the array marker's name OR its panel title (either works).
// To re-home an array, change its `scope` (and `label`) here — one line.

export type SupplyScope = 'campus' | 'building';

export interface SupplyLink {
  array: string;
  scope: SupplyScope;
  submap: string;
  // Plain-English description of what it powers (shown in the panel + legend).
  powers: string;
}

export interface CampusHub {
  x: number; // % across the map
  y: number; // % down the map
  label: string;
}

export const SUPPLY_LINKS: SupplyLink[] = [
  // ── City Football Academy — these five export into the campus supply and
  //    offset the WHOLE academy's demand. ───────────────────────────────────
  { array: 'Joie Stadium Solar Array', scope: 'campus', submap: 'cfa-map', powers: 'City Football Academy — whole campus' },
  { array: 'Indoor Pitch Solar Array', scope: 'campus', submap: 'cfa-map', powers: 'City Football Academy — whole campus' },
  { array: 'TV Studio Solar Array', scope: 'campus', submap: 'cfa-map', powers: 'City Football Academy — whole campus' },
  { array: 'FM Building Solar Array', scope: 'campus', submap: 'cfa-map', powers: 'City Football Academy — whole campus' },
  { array: 'Ground Mount Array', scope: 'campus', submap: 'cfa-map', powers: 'City Football Academy — whole campus' },
  // ── Building-local — powers only its own building (behind that meter). ─────
  { array: 'MCWFC Solar', scope: 'building', submap: 'cfa-map', powers: "Women's Facility only — on-site" },
];

// Where each sub-map's campus supply converges (the main grid intake). Campus
// flow lines run to this point. Coordinates are % of the map.
export const CAMPUS_HUBS: Record<string, CampusHub> = {
  'cfa-map': { x: 53, y: 85, label: 'CFA campus supply' },
};

export function supplyLinkFor(name: string | undefined): SupplyLink | undefined {
  if (!name) return undefined;
  return SUPPLY_LINKS.find((l) => l.array === name);
}

export function linksForSubmap(submap: string): SupplyLink[] {
  return SUPPLY_LINKS.filter((l) => l.submap === submap);
}
