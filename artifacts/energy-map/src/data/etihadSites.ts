// The Etihad Stadium complex is several distinct sites. Clicking the Etihad
// Stadium sticker opens a chooser of these; picking one opens its standard
// info panel. Each site's id keys its panel photos, narrative and title edits.

export interface EtihadSite {
  id: string;
  name: string; // default display name (editable via the panel)
}

export const ETIHAD_SITES: EtihadSite[] = [
  { id: 'etihad-site-stadium', name: 'Etihad Stadium' },
  { id: 'etihad-site-towers', name: 'Etihad Towers' },
  { id: 'etihad-site-north-stand', name: 'North Stand' },
  { id: 'etihad-site-hotel', name: 'Hotel' },
  { id: 'etihad-site-commercial', name: 'Commercial' },
  { id: 'etihad-site-mamma-mia', name: 'Mamma Mia Building' },
  { id: 'etihad-site-walkways', name: 'Etihad Walkways' },
  { id: 'etihad-site-city-at-home', name: 'City At Home' },
];

export const ETIHAD_SITE_IDS = new Set(ETIHAD_SITES.map((s) => s.id));
