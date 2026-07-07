import { useEffect, useRef } from 'react';
import { SubMapRegion } from '@/data/submapRegions';

interface RegionBoxProps {
  name: string;
  color: string;
  region: SubMapRegion;
  mapRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  pan: { x: number; y: number };
  onChange: (region: SubMapRegion) => void;
}

// Screen point -> overview percentage, accounting for the zoom layer's
// translate(pan) scale(zoom) transform (transform-origin = centre).
function toMapPct(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  zoom: number,
  pan: { x: number; y: number },
): { x: number; y: number } {
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const lx = cx + (clientX - rect.left - cx - pan.x) / zoom;
  const ly = cy + (clientY - rect.top - cy - pan.y) / zoom;
  return { x: (lx / rect.width) * 100, y: (ly / rect.height) * 100 };
}

// A draggable / resizable labelled rectangle marking the area of the overview
// that a sub-map covers. Used only by the editor "Calibrate regions" tool.
export function RegionBox({ name, color, region, mapRef, zoom, pan, onChange }: RegionBoxProps) {
  const drag = useRef<
    { mode: 'move' | 'resize'; startX: number; startY: number; start: SubMapRegion } | null
  >(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const now = toMapPct(e.clientX, e.clientY, rect, zoom, pan);
      const from = toMapPct(drag.current.startX, drag.current.startY, rect, zoom, pan);
      const dx = now.x - from.x;
      const dy = now.y - from.y;
      const s = drag.current.start;
      if (drag.current.mode === 'move') {
        const x = Math.max(0, Math.min(100 - s.width, s.x + dx));
        const y = Math.max(0, Math.min(100 - s.height, s.y + dy));
        onChange({ ...s, x, y });
      } else {
        const width = Math.max(5, Math.min(100 - s.x, s.width + dx));
        const height = Math.max(5, Math.min(100 - s.y, s.height + dy));
        onChange({ ...s, width, height });
      }
    };
    const onUp = () => { drag.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [zoom, pan, onChange, mapRef]);

  const begin = (mode: 'move' | 'resize') => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, startX: e.clientX, startY: e.clientY, start: region };
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${region.x}%`,
        top: `${region.y}%`,
        width: `${region.width}%`,
        height: `${region.height}%`,
        zIndex: 28,
      }}
    >
      <div
        onMouseDown={begin('move')}
        className="absolute inset-0 cursor-move"
        style={{ border: `2px dashed ${color}`, background: `${color}1f` }}
      >
        <span
          className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap"
          style={{ background: color }}
        >
          {name}
        </span>
      </div>
      <div
        onMouseDown={begin('resize')}
        title="Drag to resize"
        className="absolute"
        style={{
          right: -7,
          bottom: -7,
          width: 15,
          height: 15,
          background: color,
          border: '2px solid white',
          borderRadius: 3,
          cursor: 'nwse-resize',
        }}
      />
    </div>
  );
}
