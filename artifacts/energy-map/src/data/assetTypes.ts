import { Zap, Building, Flame, CircuitBoard, Battery, Sun, type LucideIcon } from 'lucide-react';
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
  'solar-panel': { label: 'Solar Panel', Icon: Sun, color: '#f59e0b' }, // amber
  'building': { label: 'Building', Icon: Building, color: '#ca8a04' },  // mustard
};

export const ALL_ASSET_TYPES = Object.keys(assetTypeConfig) as AssetType[];
