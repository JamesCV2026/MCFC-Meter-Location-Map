// Hand-curated grouping of infrastructure under each site / functional group,
// shown as the expandable "Assets" index in the dashboard. This is the manual
// override James set up (it replaces the automatic proximity guess).
//
// To re-home an asset: move its name between `assetNames` arrays. Names MUST
// match the marker names on the map (the display shows the panel title where
// one is set, e.g. "Substation 6" shows as "IDNO Substation").
//
// `id` reuses the site id where a matching site exists (so the entry merges
// with that site in the list); new functional groups (Ground Mount, Substation)
// get their own id. Group whose name is "Substation" is pinned to the bottom
// of its campus in the list.

export interface SiteAssetGroup {
  id: string;
  name: string;
  submap: 'cfa-map' | 'etihad-stadium-map';
  assetNames: string[];
}

export const SITE_ASSET_GROUPS: SiteAssetGroup[] = [
  // ── City Football Academy ────────────────────────────────────────────────
  { id: 'cfa-site-joie-stadium', name: 'Joie Stadium', submap: 'cfa-map',
    assetNames: ['Joie Stadium Solar Array', 'Inverter 1', 'Inverter 2', 'Inverter 3', 'Inverter 4', 'Behind the Meter 5', 'Behind the Meter 6', 'Behind the Meter 7', 'Behind the Meter 8'] },
  { id: 'cfa-site-indoor-pitch', name: 'Indoor Pitch', submap: 'cfa-map',
    assetNames: ['Indoor Pitch Solar Array', 'Inverter 5', 'Behind the Meter 9'] },
  { id: 'cfa-site-tv-studio', name: 'TV Studio', submap: 'cfa-map',
    assetNames: ['TV Studio Solar Array', 'Inverter 6', 'Behind the Meter 10'] },
  { id: 'cfa-site-fm-building', name: 'FM Building', submap: 'cfa-map',
    assetNames: ['FM Building Solar Array', 'Inverter 7', 'Behind the Meter 11'] },
  { id: 'cfa-site-womens-facility', name: "Women's Facility", submap: 'cfa-map',
    assetNames: ['Inverter 8', 'Behind the Meter 12'] },
  { id: 'cfa-group-ground-mount', name: 'Ground Mount Array', submap: 'cfa-map',
    assetNames: ['Ground Mount Array', 'Inverter 9', 'Behind the Meter 13'] },
  { id: 'cfa-group-substation', name: 'Substation', submap: 'cfa-map',
    assetNames: ['Substation 5', 'Grid Meter 2', 'IDNO Grid Meter', 'Substation 6', 'DNO Grid Meter'] },

  // ── Etihad Stadium Campus ────────────────────────────────────────────────
  { id: 'etihad-site-stadium', name: 'Etihad Stadium', submap: 'etihad-stadium-map',
    assetNames: ['MPAN 1650000425182', 'MPAN 1620000879750'] },
  { id: 'etihad-site-hotel', name: 'Hotel', submap: 'etihad-stadium-map',
    assetNames: ['Hotel Solar Array', 'Behind the Meter 3'] },
  { id: 'etihad-site-commercial', name: 'Commercial', submap: 'etihad-stadium-map',
    assetNames: ['Commercial Building Solar Array', 'Behind the Meter 4'] },
  { id: 'etihad-group-substation', name: 'Substation', submap: 'etihad-stadium-map',
    assetNames: ['Grid Meter 1', 'Rowsley Street Substation'] },
];

export function groupsForSubmap(submap: string): SiteAssetGroup[] {
  return SITE_ASSET_GROUPS.filter((g) => g.submap === submap);
}
