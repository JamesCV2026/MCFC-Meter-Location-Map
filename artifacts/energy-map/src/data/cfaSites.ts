// The City Football Academy is several distinct sites. Clicking the Indoor
// Pitch sticker in the CFA sub-map opens a chooser of these; picking one opens
// its standard info panel. Each site's id keys its panel photos, narrative and
// title edits.

export interface CfaSite {
  id: string;
  name: string; // default display name (editable via the panel)
}

export const CFA_SITES: CfaSite[] = [
  { id: 'cfa-site-academy', name: 'City Football Academy' },
  { id: 'cfa-site-joie-stadium', name: 'Joie Stadium' },
  { id: 'cfa-site-indoor-pitch', name: 'Indoor Pitch' },
  { id: 'cfa-site-womens-facility', name: "Women's Facility" },
  { id: 'cfa-site-fm-building', name: 'FM Building' },
  { id: 'cfa-site-tv-studio', name: 'TV Studio' },
];

export const CFA_SITE_IDS = new Set(CFA_SITES.map((s) => s.id));
