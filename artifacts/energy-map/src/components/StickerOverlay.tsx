import { useRef, useEffect } from 'react';
import { RotateCw, Maximize2 } from 'lucide-react';

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
  startRotation: number;
  startDist: number;
}

export function StickerOverlay({
  id, label, src, transform, mapRef, selected, onSelect, onUpdate,
}: StickerOverlayProps) {
  const { x, y, width, rotation } = transform;
  const dragState = useRef<DragState | null>(null);

  function getMapRect() {
    return mapRef.current?.getBoundingClientRect() ?? null;
  }

  function getStickerCenterPx() {
    const rect = getMapRect();
    if (!rect) return { cx: 0, cy: 0 };
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

    const { cx, cy } = getStickerCenterPx();
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    dragState.current = {
      mode,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: x,
      startY: y,
      startWidth: width,
      startRotation: rotation,
      startDist: dist || 1,
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
        onUpdate({
          x: Math.max(0, Math.min(100, state.startX + dxPct)),
          y: Math.max(0, Math.min(100, state.startY + dyPct)),
        });
      } else if (state.mode === 'resize') {
        const { cx, cy } = getStickerCenterPx();
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newWidth = Math.max(3, Math.min(50, state.startWidth * (dist / state.startDist)));
        onUpdate({ width: newWidth });
      } else if (state.mode === 'rotate') {
        const { cx, cy } = getStickerCenterPx();
        const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
        onUpdate({ rotation: angle });
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
  }, [x, y, width, rotation]);

  return (
    <div
      data-testid={`sticker-${id}`}
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: `${width}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        zIndex: 5,
        userSelect: 'none',
        cursor: selected ? 'move' : 'pointer',
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'IMG') {
          startDrag(e, 'move');
        }
      }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <img
        src={src}
        alt={label}
        className="w-full h-auto block pointer-events-none"
        draggable={false}
        onMouseDown={(e) => startDrag(e, 'move')}
      />

      {selected && (
        <>
          {/* Dashed selection border */}
          <div
            className="absolute inset-0 rounded-sm pointer-events-none"
            style={{
              border: '2px dashed rgba(99,102,241,0.7)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.2)',
            }}
          />

          {/* Rotate handle — above top-center */}
          <div
            className="absolute flex flex-col items-center"
            style={{ top: -36, left: '50%', transform: 'translateX(-50%)' }}
          >
            <div
              className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => startDrag(e, 'rotate')}
              title="Rotate"
            >
              <RotateCw size={11} className="text-white" />
            </div>
            {/* Connector line */}
            <div className="w-px h-2 bg-indigo-400 opacity-60" />
          </div>

          {/* Resize handle — bottom-right corner */}
          <div
            className="absolute w-5 h-5 rounded-sm bg-indigo-500 border-2 border-white shadow-md flex items-center justify-center cursor-nwse-resize"
            style={{ bottom: -10, right: -10 }}
            onMouseDown={(e) => startDrag(e, 'resize')}
            title="Resize"
          >
            <Maximize2 size={9} className="text-white" />
          </div>

          {/* Label */}
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ bottom: -22 }}
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
