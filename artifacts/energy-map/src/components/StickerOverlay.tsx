import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCw, Maximize2, Move, Trash2 } from 'lucide-react';
import { panelInfoFor, savePanelInfo } from '@/data/panelInfo';
import { labelOffsetFor, saveLabelOffset, LabelOffset } from '@/data/stickerLabelOffsets';
import { VIEW_ONLY } from '@/viewOnly';

export interface StickerTransform {
  x: number;
  y: number;
  width: number;
  rotation: number;
}

interface StickerOverlayProps {
  id: string;
  label: string;
  src: string;
  transform: StickerTransform;
  mapRef: React.RefObject<HTMLDivElement | null>;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<StickerTransform>) => void;
  onDelete: () => void;
  zoom?: number;
  disabled?: boolean;
  framed?: boolean;
  objectPosition?: string;
  // When false (default) the sticker is not movable — clicking it opens its
  // info panel via onOpenInfo. Handles only appear in edit mode.
  editMode?: boolean;
  // Turns the always-on name label into a draggable chip (Move labels mode).
  labelEditMode?: boolean;
  onOpenInfo?: () => void;
  // Portal target for the always-on name label — rendered on a layer above
  // the markers so labels never get covered by marker icons.
  labelsLayer?: HTMLDivElement | null;
  // Names (lower-cased, trimmed) already covered by a free/site label on this
  // map. The sticker's own auto-name tag hides for any sticker whose display
  // name is in this set, so user-placed labels supersede the default ones.
  supersedingLabelNames?: Set<string>;
}

type DragMode = 'move' | 'resize' | 'rotate' | null;

interface DragState {
  mode: DragMode;
  startMouseX: number;
  startMouseY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startDist: number;
}

export function StickerOverlay({
  id, label, src, transform, mapRef, selected, onSelect, onUpdate, onDelete, zoom = 1, disabled = false, framed = false, objectPosition,
  editMode = false, labelEditMode = false, onOpenInfo, labelsLayer = null, supersedingLabelNames,
}: StickerOverlayProps) {
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // ── Draggable name label ────────────────────────────────────────────────
  // The label normally sits centred above/below its photo circle; this nudge
  // (stored as % of the map) lets it be dragged clear of a neighbouring label.
  const [labelOffset, setLabelOffset] = useState<LabelOffset>(() => labelOffsetFor(id));
  useEffect(() => { setLabelOffset(labelOffsetFor(id)); }, [id]);
  const labelDrag = useRef<{ startX: number; startY: number; base: LabelOffset; moved: boolean } | null>(null);

  const handleLabelMouseDown = (e: React.MouseEvent) => {
    if (!labelEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    labelDrag.current = { startX: e.clientX, startY: e.clientY, base: labelOffset, moved: false };
  };

  useEffect(() => {
    if (!labelEditMode) return;
    const onMove = (e: MouseEvent) => {
      const d = labelDrag.current;
      if (!d || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      if (!rect.width) return;
      d.moved = true;
      setLabelOffset({
        dx: d.base.dx + ((e.clientX - d.startX) / rect.width) * 100 / zoom,
        dy: d.base.dy + ((e.clientY - d.startY) / rect.height) * 100 / zoom,
      });
    };
    const onUp = () => {
      const d = labelDrag.current;
      labelDrag.current = null;
      if (d?.moved) setLabelOffset((o) => { saveLabelOffset(id, o); return o; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [labelEditMode, id, zoom, mapRef]);

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const dragState = useRef<DragState | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  function getMapRect() {
    return mapRef.current?.getBoundingClientRect() ?? null;
  }

  // The sticker's real on-screen centre, read straight from the rendered
  // element — so resize/rotate stay correct at any zoom or pan.
  function getStickerCenter() {
    const el = rootRef.current;
    if (!el) return { cx: 0, cy: 0 };
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }

  function startDrag(e: React.MouseEvent, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    const rect = getMapRect();
    if (!rect) return;
    const { x, y, width } = transformRef.current;
    const { cx, cy } = getStickerCenter();
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    dragState.current = {
      mode,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: x,
      startY: y,
      startWidth: width,
      startDist: dist,
    };
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragState.current) return;
      const rect = getMapRect();
      if (!rect) return;
      const state = dragState.current;

      if (state.mode === 'move') {
        const z = zoomRef.current;
        const dxPct = ((e.clientX - state.startMouseX) / z / rect.width) * 100;
        const dyPct = ((e.clientY - state.startMouseY) / z / rect.height) * 100;
        onUpdateRef.current({
          x: Math.max(0, Math.min(100, state.startX + dxPct)),
          y: Math.max(0, Math.min(100, state.startY + dyPct)),
        });
      } else if (state.mode === 'resize') {
        const { cx, cy } = getStickerCenter();
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const newWidth = Math.max(3, Math.min(50, state.startWidth * (dist / state.startDist)));
        onUpdateRef.current({ width: newWidth });
      } else if (state.mode === 'rotate') {
        const { cx, cy } = getStickerCenter();
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
        onUpdateRef.current({ rotation: angle });
      }
    }

    function onMouseUp() {
      dragState.current = null;
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const { x, y, width, rotation } = transform;
  // Per-sticker panel overrides — its renamed label, plus the hide-label and
  // back-layer display flags.
  const panelInfo = panelInfoFor(id);
  // Name shown on the always-on label — respects any panel-title rename.
  const displayName = panelInfo.title ?? label;
  // The always-on name label normally sits ABOVE the sticker. For stickers near
  // the top edge that would clip it off the map, so flip it BELOW instead. The
  // sticker's half-height in map-% units is ~width*0.889 (a square sticker on a
  // 16:9 map), which is also the vertical offset the label uses.
  const labelHalfH = width * 0.889;
  const labelFlipBelow = (y - labelHalfH) < 5;
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const commitLabel = () => {
    savePanelInfo(id, { ...panelInfoFor(id), title: labelDraft.trim() || undefined });
    setEditingLabel(false);
  };

  return (
    <>
    <div
      ref={rootRef}
      data-testid={`sticker-${id}`}
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        // Stickers sit above cables (z-10) but below markers (z-20). A
        // back-layer sticker (a big base graphic) drops just beneath the rest.
        zIndex: selected ? 14 : panelInfo.backLayer ? 11 : 12,
        userSelect: 'none',
        pointerEvents: disabled ? 'none' : undefined,
      }}
      onClick={(e) => { e.stopPropagation(); if (editMode) onSelect(); else onOpenInfo?.(); }}
    >
      {framed ? (
        /* Plain photo — cropped to a circle with a blue ring (padding %
           scales the ring with the sticker). */
        <div
          className="block"
          style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: '50%',
            background: '#29abe2',
            padding: '3%',
            boxSizing: 'border-box',
            cursor: selected ? 'default' : 'pointer',
          }}
        >
          <img
            src={src}
            alt={label}
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: objectPosition ?? '50% 50%', borderRadius: '50%', display: 'block' }}
          />
        </div>
      ) : (
        <img
          src={src}
          alt={label}
          className="w-full h-auto block"
          draggable={false}
          style={{ cursor: selected ? 'default' : 'pointer' }}
        />
      )}

      {editMode && selected && (
        <>
          {/* Dashed selection border */}
          <div
            className="absolute inset-0 rounded pointer-events-none"
            style={{ border: '2px dashed rgba(99,102,241,0.75)' }}
          />

          {/* Move handle — centre top */}
          <div
            className="absolute flex flex-col items-center"
            style={{ top: -38, left: '50%', transform: 'translateX(-50%)' }}
          >
            <div
              className="w-7 h-7 rounded-full bg-white border-2 border-indigo-400 shadow-lg flex items-center justify-center cursor-move"
              style={{ touchAction: 'none' }}
              onMouseDown={(e) => startDrag(e, 'move')}
              title="Move"
            >
              <Move size={13} className="text-indigo-600" />
            </div>
            <div className="w-px h-2 bg-indigo-300 opacity-60" />
          </div>

          {/* Delete handle — top right */}
          <div
            className="absolute w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-md flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
            style={{ top: -12, right: -12 }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete sticker"
          >
            <Trash2 size={10} className="text-white" />
          </div>

          {/* Rotate handle — bottom-left */}
          <div
            className="absolute w-6 h-6 rounded-full bg-indigo-500 border-2 border-white shadow-md flex items-center justify-center cursor-grab"
            style={{ bottom: -12, left: -12, touchAction: 'none' }}
            onMouseDown={(e) => startDrag(e, 'rotate')}
            title="Rotate"
          >
            <RotateCw size={10} className="text-white" />
          </div>

          {/* Resize handle — bottom-right */}
          <div
            className="absolute w-6 h-6 rounded-sm bg-indigo-500 border-2 border-white shadow-md flex items-center justify-center cursor-nwse-resize"
            style={{ bottom: -12, right: -12, touchAction: 'none' }}
            onMouseDown={(e) => startDrag(e, 'resize')}
            title="Resize"
          >
            <Maximize2 size={10} className="text-white" />
          </div>

          {/* Label */}
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ bottom: -26 }}
          >
            <span className="text-[10px] font-semibold text-indigo-700 bg-white/90 rounded px-1.5 py-0.5 shadow whitespace-nowrap">
              {label}
            </span>
          </div>
        </>
      )}
    </div>

    {/* Always-on name label, rendered via Portal onto a layer above the
        markers so labels are never covered by marker icons. Position is
        approximated from the sticker's centre and width (assumes a near-square
        photo on a 16:9 map — close enough for the small photo stickers).
        Skipped when a free/site label on the same map already shows this
        name (labels supersede sticker auto-name tags). */}
    {!editMode && !panelInfo.hideLabel
      && !supersedingLabelNames?.has(displayName.trim().toLowerCase())
      && labelsLayer && createPortal(
      <div
        className="absolute"
        style={{
          left: `${x + labelOffset.dx}%`,
          top: (labelFlipBelow ? `${y + labelHalfH + labelOffset.dy}%` : `${y - labelHalfH + labelOffset.dy}%`),
          transform: labelFlipBelow ? 'translate(-50%, 3px)' : 'translate(-50%, calc(-100% - 3px))',
          pointerEvents: 'auto',
          cursor: labelEditMode ? 'grab' : undefined,
        }}
        onMouseDown={handleLabelMouseDown}
      >
        {editingLabel ? (
          <input
            data-testid={`sticker-label-input-${id}`}
            value={labelDraft}
            autoFocus
            onChange={(e) => setLabelDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') commitLabel();
              else if (e.key === 'Escape') setEditingLabel(false);
            }}
            className="w-24 text-[9px] font-semibold text-gray-800 bg-white border border-indigo-300 rounded px-1 py-px shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        ) : (
          <span
            onClick={VIEW_ONLY ? undefined : (e) => { e.stopPropagation(); setLabelDraft(displayName); setEditingLabel(true); }}
            title={VIEW_ONLY ? undefined : 'Click to rename'}
            className={`block text-[13px] font-bold text-gray-800 bg-white/95 backdrop-blur-sm rounded-md px-2 py-0.5 shadow-md whitespace-nowrap${VIEW_ONLY ? ' pointer-events-none' : ' cursor-pointer hover:text-indigo-600'}`}
          >
            {displayName}
          </span>
        )}
      </div>,
      labelsLayer,
    )}
    </>
  );
}
