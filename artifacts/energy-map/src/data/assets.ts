export type AssetType =
  | 'mpan'
  | 'substation'
  | 'transformer'
  | 'wind-turbine'
  | 'chp'
  | 'board'
  | 'diesel-generator'
  | 'battery'
  | 'solar-panel'
  | 'building'
  // Meter-map types (added 2026-07): meter points + inverters.
  | 'meter-behind'
  | 'meter-front'
  | 'inverter'
  // Etihad residential towers — every 'tower' marker links to the shared
  // "Etihad Towers" dataset panel.
  | 'tower'
  // IDNO-owned infrastructure (Independent Distribution Network Operator) —
  // e.g. the IDNO substation + grid meter by the Women's Facility.
  | 'idno';

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
  // How many physical units sit at this location (e.g. number of inverters).
  // Shown on the hover tooltip; editable there via +/- for inverter markers.
  quantity?: number;
  // IDNO-owned marker. Keeps its real type's ICON (meter, substation, …) but
  // renders in the IDNO colour and is filtered under the "IDNO" legend entry
  // instead of its base type.
  idno?: boolean;
}

// Positions (x, y) are percentages of the map canvas and are the permanent,
// source-of-truth layout. Edit these values to move a marker for good — the
// in-app "Edit positions" mode only saves to the browser (localStorage).
export const assets: EnergyAsset[] = [
  {
    id: 'mpan-02',
    name: 'MPAN 02: North Campus (East)',
    type: 'mpan',
    x: 43.18,
    y: 15.05,
    mpan: '1013000000002',
  },
  {
    id: 'mpan-06',
    name: 'MPAN 06: Stadium North',
    type: 'mpan',
    x: 38.01,
    y: 32.96,
    mpan: '1013000000006',
  },
  {
    id: 'mpan-07',
    name: 'MPAN 07: Stadium North-East',
    type: 'mpan',
    x: 39.55,
    y: 32.67,
    mpan: '1013000000007',
  },
  {
    id: 'mpan-08',
    name: 'MPAN 08: Rowsley Street',
    type: 'mpan',
    x: 36.00,
    y: 44.57,
    mpan: '1013000000008',
  },
  {
    id: 'mpan-10',
    name: 'MPAN 10: Clayton Lane',
    type: 'mpan',
    x: 67.07,
    y: 51.45,
    mpan: '1013000000010',
  },
  {
    id: 'mpan-11',
    name: 'MPAN 11: Wilson Street / South',
    type: 'mpan',
    x: 71.19,
    y: 87.85,
    mpan: '1013000000011',
  },
];
