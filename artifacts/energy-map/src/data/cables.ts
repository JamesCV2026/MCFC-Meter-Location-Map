import { Zap, Cable as CableIcon, MoreHorizontal, type LucideIcon } from 'lucide-react';

// 'dotted' is for marking lines that aren't physical HV runs — e.g. proposed
// routes, intent boundaries, walking paths, study reference lines. It draws
// in yellow with a dashed/dotted stroke so it's visually distinct from real
// HV cables.
export type CableType = 'hv' | 'connection' | 'dotted';

export interface CablePoint {
  x: number; // % of map width
  y: number; // % of map height
  assetId?: string; // when set, this point follows the asset marker (plugs in)
}

export interface Cable {
  id: string;
  type: CableType;
  points: CablePoint[]; // 2 or more
  color?: string; // optional per-cable colour; falls back to the type's default
  flowReversed?: boolean; // when true the power-flow animation runs end -> start
}

// Preset palette shown in the cable edit toolbar for recolouring a single
// cable. First entry matches the HV default so "reset to default" is easy.
export const CABLE_COLORS = [
  '#f59e0b', // amber (HV default)
  '#22c55e', // bright green
  '#2563eb', // blue
  '#dc2626', // red
  '#7c3aed', // purple
  '#0891b2', // cyan
  '#475569', // slate
];

export interface CableTypeMeta {
  label: string;
  color: string;
  width: number; // stroke width in the 1600x900 SVG viewBox
  Icon: LucideIcon;
  // Optional dash pattern for the main stroke (CableLayer reads this).
  // Example: '6 4' draws a 6-unit dash followed by a 4-unit gap. Omit for
  // a solid stroke.
  dash?: string;
  // When true, the "power flow" pulse animation is suppressed — appropriate
  // for non-electrical reference lines like proposed routes / boundaries.
  noFlow?: boolean;
}

// Single source of truth for cable types — label, colour, thickness, icon.
export const cableTypeConfig: Record<CableType, CableTypeMeta> = {
  hv: { label: 'HV Cable', color: '#f59e0b', width: 3, Icon: Zap },
  connection: { label: 'Cable Connection', color: '#475569', width: 1.9, Icon: CableIcon },
  dotted: { label: 'Dotted Line', color: '#faff00', width: 4, Icon: MoreHorizontal, dash: '3 6', noFlow: true },
};

export const ALL_CABLE_TYPES = Object.keys(cableTypeConfig) as CableType[];

// Baked cables — the permanent layout. The in-app cable tool saves to
// localStorage; bake finalised cables into this array to make them permanent.
export const cables: Cable[] = [];
