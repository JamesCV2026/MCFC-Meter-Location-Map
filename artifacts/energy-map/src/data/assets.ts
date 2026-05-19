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
    x: 35,
    y: 10,
    mpan: '1013000000001',
  },
  {
    id: 'mpan-02',
    name: 'MPAN 02 — North Campus (East)',
    type: 'mpan',
    x: 43,
    y: 13,
    mpan: '1013000000002',
  },
  {
    id: 'mpan-03',
    name: 'MPAN 03 — A6010 Junction',
    type: 'mpan',
    x: 48,
    y: 22,
    mpan: '1013000000003',
  },
  {
    id: 'mpan-04',
    name: 'MPAN 04 — Training Pitches West',
    type: 'mpan',
    x: 27,
    y: 30,
    mpan: '1013000000004',
  },
  {
    id: 'mpan-05',
    name: 'MPAN 05 — Stadium West',
    type: 'mpan',
    x: 33,
    y: 37,
    mpan: '1013000000005',
  },
  {
    id: 'mpan-06',
    name: 'MPAN 06 — Stadium North',
    type: 'mpan',
    x: 36.5,
    y: 35,
    mpan: '1013000000006',
  },
  {
    id: 'mpan-07',
    name: 'MPAN 07 — Stadium North-East',
    type: 'mpan',
    x: 40,
    y: 37,
    mpan: '1013000000007',
  },
  {
    id: 'mpan-08',
    name: 'MPAN 08 — Rowsley Street',
    type: 'mpan',
    x: 35,
    y: 44,
    mpan: '1013000000008',
  },
  {
    id: 'mpan-09',
    name: 'MPAN 09 — Stadium East / A6010',
    type: 'mpan',
    x: 47.5,
    y: 43,
    mpan: '1013000000009',
  },
  {
    id: 'mpan-10',
    name: 'MPAN 10 — Clayton Lane',
    type: 'mpan',
    x: 63.5,
    y: 40,
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
