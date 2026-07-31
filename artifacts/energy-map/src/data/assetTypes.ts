import { Zap, Building, Flame, CircuitBoard, Battery, Sun, Gauge, Plug, Network, type LucideIcon } from 'lucide-react';
import { WindTurbineIcon } from '@/components/WindTurbineIcon';
import { TransformerIcon } from '@/components/TransformerIcon';
import { SubstationIcon } from '@/components/SubstationIcon';
import { DieselGeneratorIcon } from '@/components/DieselGeneratorIcon';
import type { AssetType } from './assets';

export interface AssetTypeMeta {
  label: string;
  Icon: LucideIcon;
  color: string;
}

// Single source of truth for every marker type — label, icon and colour.
// The map markers, legend, filters, side panel and add-asset dialog all read
// from here, so adding a new asset type only needs an entry in this object.
//
// Colour rules: every two adjacent asset types must contrast clearly. MPAN
// red and Transformer pink were too close at small sizes, so Transformer
// moved to a deep teal and got its own bespoke icon (a tank with bushings)
// rather than the generic Activity trace.
export const assetTypeConfig: Record<AssetType, AssetTypeMeta> = {
  'mpan': { label: 'MPAN', Icon: Zap, color: '#dc2626' },               // red
  'substation': { label: 'Substation', Icon: SubstationIcon, color: '#2563eb' }, // cobalt blue, bespoke switchyard icon
  'transformer': { label: 'Transformer', Icon: TransformerIcon, color: '#0d9488' }, // deep teal
  'wind-turbine': { label: 'Wind Turbine', Icon: WindTurbineIcon, color: '#0891b2' }, // cyan
  'chp': { label: 'CHP Machine', Icon: Flame, color: '#ea580c' },       // orange
  'board': { label: 'Distribution Board', Icon: CircuitBoard, color: '#7c3aed' }, // purple
  'diesel-generator': { label: 'Diesel Generator', Icon: DieselGeneratorIcon, color: '#4b5563' }, // slate — bespoke containerised genset icon
  'battery': { label: 'Battery', Icon: Battery, color: '#16a34a' },     // green
  'solar-panel': { label: 'Solar Array', Icon: Sun, color: '#f59e0b' }, // amber
  'building': { label: 'Building', Icon: Building, color: '#ca8a04' },  // mustard
  // Meter-map types (added 2026-07).
  'meter-behind': { label: 'Behind the Meter', Icon: Gauge, color: '#16a34a' },   // green
  'meter-front': { label: 'Grid Meter', Icon: Gauge, color: '#2563eb' }, // blue
  'inverter': { label: 'Inverters', Icon: Plug, color: '#9333ea' },    // purple
  'tower': { label: 'Tower', Icon: Building, color: '#0ea5e9' },        // sky blue
  'idno': { label: 'IDNO', Icon: Network, color: '#db2777' },          // pink — IDNO-owned (Independent Distribution Network Operator)
};

export const ALL_ASSET_TYPES = Object.keys(assetTypeConfig) as AssetType[];

// ---------------------------------------------------------------------------
// ENABLED_TYPES — the single switch that controls which asset types appear in
// the legend/filter and are shown on the map by default. This is how you make
// a focused map (e.g. the Meter map) WITHOUT deleting anything.
//
//   • To HIDE a type from the map + legend: remove its key from this list.
//   • To RE-ADD it later (wind turbines, MPAN, substations, etc.): just put its
//     key back in this list. Its markers reappear instantly — no data is ever
//     deleted; the map simply filters by type. Nothing else to change.
//
// Every key here must exist in assetTypeConfig above. 'building' is intentionally
// omitted (buildings render as stickers, not filter markers).
//
// Full set, for easy reinstatement — uncomment/copy any you want back:
//   'mpan', 'substation', 'transformer', 'wind-turbine', 'chp', 'board',
//   'diesel-generator', 'battery',
// ---------------------------------------------------------------------------
export const ENABLED_TYPES: AssetType[] = [
  'meter-behind',
  'meter-front',
  'inverter',
  'solar-panel',
  'substation',
  'idno',
];
