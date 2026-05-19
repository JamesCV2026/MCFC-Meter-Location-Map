import { useRef, useEffect } from 'react';
import { RotateCw, Maximize2, Move } from 'lucide-react';

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
  id, label, src, transform, mapRef, selected, onSelect, onUpdate,
}: StickerOverlayProps) {
  // Keep a ref to always-current values so closures never go stale
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const dragState = useRef<DragState | null>(null);

  function getMapRect() {
    return mapRef.current?.getBoundingClientRect() ?? null;
  }

  function getStickerCenter() {
    const rect = getMapRect();
    if (!rect) return { cx: 0, cy: 0 };
    const { x, y } = transformRef.current;
    return {
      cx: rect.left + (x / 100) * rect.width,
      cy: rect.top + (y / 100) * rect.height,
    };
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
        const dxPct = ((e.clientX - state.startMouseX) / rect.width) * 100;
        const dyPct = ((e.clientY - state.startMouseY) / rect.height) * 100;
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
  }, []); // empty — closures use refs so always fresh

  const { x, y, width, rotation } = transform;

  return (
    <div
      data-testid={`sticker-${id}`}
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        zIndex: selected ? 8 : 5,
        userSelect: 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <img
        src={src}
        alt={label}
        className="w-full h-auto block"
        draggable={false}
        style={{ cursor: selected ? 'default' : 'pointer' }}
      />

      {selected && (
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
  );
}
