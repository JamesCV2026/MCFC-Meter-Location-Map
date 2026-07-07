import { Cable, CablePoint, CableType, cableTypeConfig } from '@/data/cables';
import { EnergyAsset } from '@/data/assets';

const VB_W = 1600;
const VB_H = 900;

export interface DraftCable {
  type: CableType;
  points: CablePoint[];
  cursor: { x: number; y: number } | null;
}

interface CableLayerProps {
  cables: Cable[];
  assets: EnergyAsset[];
  draft: DraftCable | null;
  selectedCableId: string | null;
  interactive: boolean;
  onSelectCable: (id: string) => void;
  onDeleteCable: (id: string) => void;
  onPointDragStart: (cableId: string, index: number, e: React.MouseEvent) => void;
  onCableMoveStart: (cableId: string, e: React.MouseEvent) => void;
  onAddPoint: (cableId: string, segmentIndex: number) => void;
  onSegmentClick: (cableId: string, segmentIndex: number) => void;
  // Direct delete handlers — wired up to the inline X buttons next to each
  // segment and each point, so the user can delete in one click without
  // having to chase down a toolbar.
  onDeleteSegment?: (cableId: string, segmentIndex: number) => void;
  onDeletePoint?: (cableId: string, pointIndex: number) => void;
  activeCablePoint: { cableId: string; index: number } | null;
  activeCableSegment: { cableId: string; index: number } | null;
}

// Resolve a cable point to a live position — asset-anchored points follow
// their marker so cables stay "plugged in" when an asset is moved.
function resolve(p: CablePoint, assets: EnergyAsset[]): { x: number; y: number } {
  if (p.assetId) {
    const a = assets.find((x) => x.id === p.assetId);
    if (a) return { x: a.x, y: a.y };
  }
  return { x: p.x, y: p.y };
}

function toSvg(p: { x: number; y: number }) {
  return { x: (p.x / 100) * VB_W, y: (p.y / 100) * VB_H };
}

// Straight polyline — each point is joined to the next by a straight segment.
function linePath(rawPts: { x: number; y: number }[]): string {
  const P = rawPts.map(toSvg);
  if (P.length < 2) return '';
  return `M ${P[0].x} ${P[0].y}` + P.slice(1).map((p) => ` L ${p.x} ${p.y}`).join('');
}

export function CableLayer({
  cables,
  assets,
  draft,
  selectedCableId,
  interactive,
  onSelectCable,
  onDeleteCable,
  onPointDragStart,
  onCableMoveStart,
  onAddPoint,
  onSegmentClick,
  onDeleteSegment,
  onDeletePoint,
  activeCablePoint,
  activeCableSegment,
}: CableLayerProps) {
  return (
    <svg
      data-testid="cable-layer"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      // In edit-cables mode, lift the whole layer above the markers (z-20)
      // so cables and their handles are clickable even on plugged points.
      style={{ zIndex: interactive ? 35 : 10, pointerEvents: 'none', overflow: 'visible' }}
    >
      {/* keyframes for the subtle "power flow" dash animation */}
      <style>{`
        @keyframes cable-flow { to { stroke-dashoffset: -24; } }
        .cable-flow-dash { animation: cable-flow 1.5s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .cable-flow-dash { animation: none; } }
      `}</style>
      {cables.map((cable) => {
        const meta = cableTypeConfig[cable.type];
        // Per-cable colour override, falling back to the cable type's default.
        const color = cable.color ?? meta.color;
        const pts = cable.points.map((p) => resolve(p, assets));
        const d = linePath(pts);
        if (!d) return null;
        const selected = selectedCableId === cable.id;
        const start = toSvg(pts[0]);
        const end = toSvg(pts[pts.length - 1]);
        const editing = selected && interactive;
        return (
          <g key={cable.id} data-testid={`cable-${cable.id}`}>
            {/* Casing keeps the cable readable over the busy map.
                For "no-flow" reference lines (dotted / neon yellow) we use a
                dark casing instead of white so the bright fill really pops. */}
            {meta.noFlow ? (
              <>
                {/* dark drop-shadow halo so neon colour stands out on the map */}
                <path d={d} fill="none" stroke="#1f2937" strokeWidth={meta.width + 4} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
                {/* bright outer glow in the cable colour */}
                <path d={d} fill="none" stroke={color} strokeWidth={meta.width + 6} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
              </>
            ) : (
              <path d={d} fill="none" stroke="#ffffff" strokeWidth={meta.width + 3} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {selected && (
              <path d={d} fill="none" stroke={color} strokeWidth={meta.width + 10} strokeLinecap="round" strokeLinejoin="round" opacity={0.22} />
            )}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={meta.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={meta.dash}
            />
            {/* subtle "power flow" — small light pulses drift along the cable
                from start to end; purely decorative, never catches clicks.
                Suppressed for cable types that explicitly don't represent
                electrical flow (e.g. dotted reference lines). */}
            {!meta.noFlow && (
              <path
                d={d}
                fill="none"
                stroke="#ffffff"
                strokeWidth={Math.max(1, meta.width * 0.5)}
                strokeLinecap="round"
                strokeDasharray="1 23"
                opacity={0.7}
                className="cable-flow-dash"
                style={{ pointerEvents: 'none', animationDirection: cable.flowReversed ? 'reverse' : 'normal' }}
              />
            )}
            {/* highlight the segment whose toolbar is open — shows exactly
                what "Delete segment" will remove */}
            {editing && activeCableSegment?.cableId === cable.id
              && pts[activeCableSegment.index] && pts[activeCableSegment.index + 1] && (() => {
              const a = toSvg(pts[activeCableSegment.index]);
              const b = toSvg(pts[activeCableSegment.index + 1]);
              return (
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#dc2626"
                  strokeWidth={meta.width + 4}
                  strokeLinecap="round"
                  strokeDasharray="10 7"
                  opacity={0.95}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })()}
            {/* endpoint connectors */}
            {[start, end].map((e, i) => (
              <circle key={i} cx={e.x} cy={e.y} r={meta.width * 0.9} fill={color} stroke="#ffffff" strokeWidth={1.5} />
            ))}
            {/* invisible wide hit area for selecting the cable */}
            {interactive && !selected && (
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={meta.width + 24}
                strokeLinecap="round"
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={(ev) => { ev.stopPropagation(); onSelectCable(cable.id); }}
              />
            )}
            {/* invisible per-segment hit areas — click a segment to open its
                delete toolbar (drawn under the point/＋ handles so those win) */}
            {editing && pts.slice(0, -1).map((_, i) => {
              const a = toSvg(pts[i]);
              const b = toSvg(pts[i + 1]);
              return (
                <line
                  key={`seg-${i}`}
                  data-testid={`cable-segment-${cable.id}-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="transparent"
                  strokeWidth={meta.width + 22}
                  strokeLinecap="butt"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onClick={(ev) => { ev.stopPropagation(); onSegmentClick(cable.id, i); }}
                />
              );
            })}
            {/* + (add point) and × (delete segment) handles flanking each
                segment midpoint. Both offset perpendicular to the segment so
                they never obstruct the line itself. Single click each does
                the action — no toolbar required. */}
            {editing && pts.slice(0, -1).map((_, i) => {
              const a = toSvg(pts[i]);
              const b = toSvg(pts[i + 1]);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              // Perpendicular unit vector (rotate +90 deg) scaled by 18 SVG
              // units. + handle goes one side, × handle the other.
              const offset = 18;
              const px = -dy / len * offset;
              const py = dx / len * offset;
              const addX = mx + px;
              const addY = my + py;
              const delX = mx - px;
              const delY = my - py;
              return (
                <g key={`segctrl-${i}`} style={{ pointerEvents: 'none' }}>
                  {/* Tether lines from the segment midpoint to each handle. */}
                  <line x1={mx} y1={my} x2={addX} y2={addY} stroke={color} strokeWidth={1.2} opacity={0.55} strokeLinecap="round" />
                  <line x1={mx} y1={my} x2={delX} y2={delY} stroke="#dc2626" strokeWidth={1.2} opacity={0.6} strokeLinecap="round" />

                  {/* + (add point) handle */}
                  <g
                    data-testid={`cable-addpoint-${cable.id}-${i}`}
                    transform={`translate(${addX}, ${addY})`}
                    style={{ pointerEvents: 'auto', cursor: 'copy' }}
                    onClick={(ev) => { ev.stopPropagation(); onAddPoint(cable.id, i); }}
                  >
                    <circle r={7} fill="#ffffff" stroke={color} strokeWidth={2} opacity={0.95} />
                    <path d="M 0 -3.5 L 0 3.5 M -3.5 0 L 3.5 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
                    <title>Add point</title>
                  </g>

                  {/* × (delete segment) handle — bright red so it's
                      unmistakable. One click removes that segment. */}
                  {onDeleteSegment && (
                    <g
                      data-testid={`cable-delete-segment-${cable.id}-${i}`}
                      transform={`translate(${delX}, ${delY})`}
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                      onClick={(ev) => { ev.stopPropagation(); onDeleteSegment(cable.id, i); }}
                    >
                      <circle r={7} fill="#dc2626" stroke="#ffffff" strokeWidth={2} />
                      <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" />
                      <title>Delete this segment</title>
                    </g>
                  )}
                </g>
              );
            })}
            {/* draggable handles — drag to move, click to open the
                point's delete / detach toolbar */}
            {editing && pts.map((p, i) => {
              const s = toSvg(p);
              const active = activeCablePoint?.cableId === cable.id && activeCablePoint?.index === i;
              return (
                <g key={`h-${i}`}>
                  {/* Larger transparent hit zone for dragging. */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={18}
                    fill="transparent"
                    style={{ pointerEvents: 'auto', cursor: 'grab' }}
                    onMouseDown={(ev) => onPointDragStart(cable.id, i, ev)}
                  />
                  {/* Visible drag handle */}
                  <circle
                    data-testid={`cable-handle-${cable.id}-${i}`}
                    cx={s.x}
                    cy={s.y}
                    r={active ? 13 : 11}
                    fill={active ? color : '#ffffff'}
                    stroke={active ? '#ffffff' : color}
                    strokeWidth={2.8}
                    style={{ pointerEvents: 'none' }}
                  />
                  {/* Small red × right next to the point for one-click
                      delete. Offset diagonally so it doesn't overlap the
                      drag handle's click target. */}
                  {onDeletePoint && (
                    <g
                      data-testid={`cable-delete-point-${cable.id}-${i}`}
                      transform={`translate(${s.x + 16}, ${s.y - 14})`}
                      style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                      onClick={(ev) => { ev.stopPropagation(); onDeletePoint(cable.id, i); }}
                    >
                      <circle r={6.5} fill="#dc2626" stroke="#ffffff" strokeWidth={2} />
                      <path d="M -2.5 -2.5 L 2.5 2.5 M 2.5 -2.5 L -2.5 2.5" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
                      <title>Delete this point</title>
                    </g>
                  )}
                </g>
              );
            })}
            {/* filled centre marks a point linked (plugged) into an asset */}
            {editing && pts.map((p, i) => {
              if (!cable.points[i].assetId) return null;
              const active = activeCablePoint?.cableId === cable.id && activeCablePoint?.index === i;
              return (
                <circle
                  key={`pin-${i}`}
                  cx={toSvg(p).x}
                  cy={toSvg(p).y}
                  r={3.6}
                  fill={active ? '#ffffff' : color}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })}
            {/* delete-whole-cable control */}
            {editing && (
              <g
                transform={`translate(${start.x + 32}, ${start.y - 32})`}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onClick={(ev) => { ev.stopPropagation(); onDeleteCable(cable.id); }}
              >
                <circle r={14} fill="#dc2626" stroke="#ffffff" strokeWidth={2.5} />
                <path d="M -5 -5 L 5 5 M 5 -5 L -5 5" stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
              </g>
            )}
            {/* move-whole-cable handle — drag to reposition the entire cable */}
            {editing && (() => {
              const m = toSvg(pts[Math.floor(pts.length / 2)]);
              return (
                <g style={{ pointerEvents: 'auto' }}>
                  <line x1={m.x} y1={m.y} x2={m.x} y2={m.y - 30} stroke={color} strokeWidth={2} opacity={0.55} />
                  <g
                    data-testid={`cable-move-${cable.id}`}
                    transform={`translate(${m.x}, ${m.y - 30})`}
                    style={{ cursor: 'move' }}
                    onMouseDown={(ev) => onCableMoveStart(cable.id, ev)}
                  >
                    <circle r={13} fill="#4f46e5" stroke="#ffffff" strokeWidth={2.5} />
                    <path d="M 0 -6.5 L 0 6.5 M -6.5 0 L 6.5 0" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" />
                    <path
                      d="M 0 -6.5 L -2.6 -3.9 M 0 -6.5 L 2.6 -3.9 M 0 6.5 L -2.6 3.9 M 0 6.5 L 2.6 3.9 M -6.5 0 L -3.9 -2.6 M -6.5 0 L -3.9 2.6 M 6.5 0 L 3.9 -2.6 M 6.5 0 L 3.9 2.6"
                      stroke="#ffffff"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                    />
                  </g>
                </g>
              );
            })()}
          </g>
        );
      })}

      {/* In-progress cable being drawn */}
      {draft && draft.points.length > 0 && (() => {
        const meta = cableTypeConfig[draft.type];
        const drawn = draft.points.map((p) => resolve(p, assets));
        const preview = draft.cursor ? [...drawn, draft.cursor] : drawn;
        const d = linePath(preview);
        return (
          <g data-testid="cable-draft">
            {d && (
              <path
                d={d}
                fill="none"
                stroke={meta.color}
                strokeWidth={meta.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="14 10"
                opacity={0.9}
              />
            )}
            {drawn.map((p, i) => {
              const s = toSvg(p);
              return <circle key={i} cx={s.x} cy={s.y} r={meta.width * 1.2} fill="#ffffff" stroke={meta.color} strokeWidth={2} />;
            })}
          </g>
        );
      })()}
    </svg>
  );
}
