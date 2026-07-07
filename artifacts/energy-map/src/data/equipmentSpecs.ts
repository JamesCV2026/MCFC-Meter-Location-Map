// Per-marker equipment specs (make / engine / alternator / rating). Keyed by
// the marker's display name so renames flow through. Used by the marker hover
// tooltip and side panel to surface equipment detail alongside energy data,
// and shared with the bottom Data Panel's infrastructure register.

export interface EquipmentSpecs {
  make?: string;
  engine?: string;
  alternator?: string;
  rating?: string;
}

const SPECS_BY_NAME: Record<string, EquipmentSpecs> = {
  // CFA diesel generators — numbered 3 and 4. (Numbers 1 and 2 are reserved
  // for the older set the site team don't want surfaced on the map.)
  'Diesel Generator 3': {
    make: 'FG Wilson',
    engine: 'Perkins 1106C-E66TAG4',
    alternator: 'Leroy Somer LL5014D',
    rating: '200 kVA',
  },
  'Diesel Generator 4': {
    make: 'FG Wilson',
    engine: 'Perkins 1106C-E66TAG4',
    alternator: 'Leroy Somer LL5014D',
    rating: '200 kVA',
  },
  // Etihad Stadium diesel generators — numbered 5 and 6.
  'Diesel Generator 5': {
    make: 'Cummins',
    rating: '750 kVA',
  },
  'Diesel Generator 6': {
    make: 'Cummins',
    engine: 'Cummins VTA-28-GS',
    alternator: 'Stamford HC1534F1',
    rating: '706 kVA',
  },
  // CHP machines (City Football Academy)
  'CHP Machine 1': {
    rating: '310 kWe / 2,500 kWth',
  },
  'CHP Machine 2': {
    rating: '310 kWe / 2,500 kWth',
  },
};

export function equipmentSpecsFor(name: string): EquipmentSpecs | undefined {
  return SPECS_BY_NAME[name];
}

// True if the spec object has at least one populated field.
export function hasAnySpec(spec: EquipmentSpecs | undefined): boolean {
  if (!spec) return false;
  return !!(spec.make || spec.engine || spec.alternator || spec.rating);
}
