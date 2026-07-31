// Per-asset overrides for which side the hover arrow flies in from.
//
// By default an arrow approaches from the OUTSIDE of the hovered cluster
// (so arrows fan around a group instead of piling up), and solar arrays
// always come from the right. Anything listed here wins over both rules —
// use it to untangle a specific marker whose arrow lands awkwardly.
//
// Key = the asset's display name (its panel title if renamed, else its name).

export type ArrowDir = 'left' | 'right' | 'top' | 'bottom';

export const ARROW_DIR_OVERRIDES: Record<string, ArrowDir> = {
  // Joie Stadium ring — Inverter 4 sits on the right of the cluster, so its
  // arrow reads far better coming in from the right than across the pitch.
  'Inverter 4': 'right',
  // Indoor Pitch — its inverter comes from the right; the meter and the array
  // come from the left so the three don't stack on one side.
  'Inverter 5': 'right',
  'Behind the Meter 9': 'left',
  'Indoor Pitch Solar Array': 'left',
  // Women's Facility — comes up from below so it clears the Ground Mount
  // Array label and the neighbouring meter's arrow.
  'Behind the Meter 12': 'bottom',
  // Etihad — the Commercial array's arrow crossed the Hotel circle when it
  // came from the right, so bring it in from the left instead.
  'Commercial Building Solar Array': 'left',
  // Hotel array — comes up from underneath rather than across from the right,
  // which ran it straight through the Commercial circle.
  'Hotel Solar Array': 'bottom',
  // IDNO pair by the Women's Facility — the grid meter comes up from below so
  // it doesn't sit shoulder-to-shoulder with the substation's arrow above.
  'IDNO Grid Meter': 'bottom',
  // Wilson Street pair — the substation swings out to the right so it doesn't
  // run parallel with Grid Meter 2's arrow coming up from below.
  'Wilson Street Substation': 'right',
};

export function arrowDirOverride(name: string | undefined): ArrowDir | undefined {
  return name ? ARROW_DIR_OVERRIDES[name] : undefined;
}
