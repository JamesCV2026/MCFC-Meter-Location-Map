export type AssetType = 'mpan' | 'transformer' | 'substation' | 'generation';

export interface EnergyAsset {
  id: string;
  name: string;
  type: AssetType;
  x: number;
  y: number;
  mpan?: string;
  generation_kwh?: number;
  consumption_kwh?: number;
  notes?: string;
}

export const assets: EnergyAsset[] = [
  {
    id: 'mpan-etihad-main',
    name: 'Etihad Stadium Main Supply',
    type: 'mpan',
    x: 38,
    y: 42,
    mpan: '1013012345678',
    generation_kwh: 0,
    consumption_kwh: 4850000,
    notes: 'Primary MPAN for Etihad Stadium. 11kV connection. Metered at main incomer.',
  },
  {
    id: 'mpan-cfa-academy',
    name: 'City Football Academy Supply',
    type: 'mpan',
    x: 27,
    y: 32,
    mpan: '1013098765432',
    generation_kwh: 125000,
    consumption_kwh: 1920000,
    notes: 'MPAN serving the CFA training complex including pitches, gym, and offices.',
  },
];
