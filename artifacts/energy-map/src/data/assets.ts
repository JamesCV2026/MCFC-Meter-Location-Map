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
    id: 'mpan-01',
    name: 'MPAN 01 — North Campus (West)',
    type: 'mpan',
    x: 34.5,
    y: 13,
    mpan: '1013000000001',
  },
  {
    id: 'mpan-02',
    name: 'MPAN 02 — North Campus (East)',
    type: 'mpan',
    x: 43,
    y: 14,
    mpan: '1013000000002',
  },
  {
    id: 'mpan-03',
    name: 'MPAN 03 — A6010 Junction',
    type: 'mpan',
    x: 47,
    y: 24,
    mpan: '1013000000003',
  },
  {
    id: 'mpan-05',
    name: 'MPAN 05 — Stadium West',
    type: 'mpan',
    x: 33.5,
    y: 36.5,
    mpan: '1013000000005',
  },
  {
    id: 'mpan-06',
    name: 'MPAN 06 — Stadium North',
    type: 'mpan',
    x: 36,
    y: 35.5,
    mpan: '1013000000006',
  },
  {
    id: 'mpan-07',
    name: 'MPAN 07 — Stadium North-East',
    type: 'mpan',
    x: 38.5,
    y: 36.5,
    mpan: '1013000000007',
  },
  {
    id: 'mpan-08',
    name: 'MPAN 08 — Rowsley Street',
    type: 'mpan',
    x: 34.5,
    y: 43,
    mpan: '1013000000008',
  },
  {
    id: 'mpan-09',
    name: 'MPAN 09 — Stadium East / A6010',
    type: 'mpan',
    x: 47,
    y: 41,
    mpan: '1013000000009',
  },
  {
    id: 'mpan-10',
    name: 'MPAN 10 — Clayton Lane',
    type: 'mpan',
    x: 63,
    y: 41,
    mpan: '1013000000010',
  },
  {
    id: 'mpan-11',
    name: 'MPAN 11 — Wilson Street / South',
    type: 'mpan',
    x: 57,
    y: 74,
    mpan: '1013000000011',
  },
];
