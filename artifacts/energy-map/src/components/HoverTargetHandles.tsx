import { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { targetsForView, saveHoverTarget } from '@/data/siteHoverTargets';

interface Props {
  view: string; // 'main' or a sub-map id
  mapRef: React.RefObject<HTMLDivElement | null>;
  zoom?: number;
}

// Shown only in "Move labels" mode: one draggable crosshair per hover-arrow
// target (North Stand, Etihad Walkways…). Drag it to wherever the black arrow
// should point; the position saves instantly and rides into the deployment
// snapshot. Sites whose arrow follows a live sticker don't need these.
export function HoverTargetHandles({ view, mapRef, zoom = 1 }: Props) {
  const [targets, setTargets] = useState(() => targetsForView(view));
  useEffect(() => { setTargets(targetsForView(view)); }, [view]);
  const drag = useRef<{ name: string; startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = drag.current;
      if (!d || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      if (!rect.width) return;
      const x = Math.max(0, Math.min(100, d.baseX + ((e.clientX - d.startX) / rect.width) * 100 / zoom));
      const y = Math.max(0, Math.min(100, d.baseY + ((e.clientY - d.startY) / rect.height) * 100 / zoom));
      setTargets((ts) => ts.map((t) => t.name === d.name ? { ...t, x, y } : t));
    };
    const onUp = () => {
      const d = drag.current;
      drag.current = null;
      if (d) setTargets((ts) => {
        const t = ts.find((v) => v.name === d.name);
        if (t) saveHoverTarget(d.name, view, { x: t.x, y: t.y });
        return ts;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [view, zoom, mapRef]);

  return (
    <>
      {targets.map((t) => (
        <div
          key={t.name}
          data-testid={`hover-target-${t.name.replace(/\s+/g, '-').toLowerCase()}`}
          className="absolute z-40 flex flex-col items-center cursor-grab active:cursor-grabbing"
          style={{ left: `${t.x}%`, top: `${t.y}%`, transform: 'translate(-50%, -50%)' }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            drag.current = { name: t.name, startX: e.clientX, startY: e.clientY, baseX: t.x, baseY: t.y };
          }}
        >
          <span className="w-7 h-7 rounded-full bg-gray-900/85 border-2 border-white shadow-lg flex items-center justify-center">
            <Crosshair size={15} className="text-white" />
          </span>
          <span className="mt-1 whitespace-nowrap rounded-full bg-gray-900/85 text-white text-[10px] font-bold px-2 py-0.5 shadow">
            {t.name} arrow
          </span>
        </div>
      ))}
    </>
  );
}
