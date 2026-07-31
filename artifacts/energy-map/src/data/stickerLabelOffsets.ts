// Per-sticker nudge for its always-on name label ("Ground Mount Array",
// "Women's Facility", "Commercial"…). The label normally sits centred under
// its photo circle; these offsets let it be dragged clear of a neighbour.
//
// Stored as a percentage of the map so the nudge holds at any zoom/size.

const KEY = 'energy-map-sticker-label-offsets';

export interface LabelOffset { dx: number; dy: number }

export function loadLabelOffsets(): Record<string, LabelOffset> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, LabelOffset>) : {};
  } catch {
    return {};
  }
}

export function labelOffsetFor(id: string): LabelOffset {
  return loadLabelOffsets()[id] ?? { dx: 0, dy: 0 };
}

export function saveLabelOffset(id: string, offset: LabelOffset): void {
  try {
    const all = loadLabelOffsets();
    if (!offset.dx && !offset.dy) delete all[id];
    else all[id] = offset;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* best effort — a failed save just means the label snaps back */
  }
}
