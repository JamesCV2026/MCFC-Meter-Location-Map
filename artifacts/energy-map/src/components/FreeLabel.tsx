import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Site } from '@/data/sites';

interface FreeLabelProps {
  site: Site;
  mapRef: React.RefObject<HTMLDivElement | null>;
  editMode: boolean;
  onUpdate: (id: string, updates: Partial<Site>) => void;
  onDelete: (id: string) => void;
}

export function FreeLabel({ site, mapRef, editMode, onUpdate, onDelete }: FreeLabelProps) {
  const dragging = useRef(false);
  const startPos = useRef({ mx: 0, my: 0, x: 0, y: 0 });

  useEffect(() => {
    if (!editMode) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const dx = e.clientX - startPos.current.mx;
      const dy = e.clientY - startPos.current.my;
      const x = Math.max(0, Math.min(100, startPos.current.x + (dx / rect.width) * 100));
      const y = Math.max(0, Math.min(100, startPos.current.y + (dy / rect.height) * 100));
      onUpdate(site.id, { x, y });
    };

    const onMouseUp = () => { dragging.current = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [editMode, site.id, onUpdate, mapRef]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    startPos.current = { mx: e.clientX, my: e.clientY, x: site.x, y: site.y };
  };

  return (
    <div
      className="absolute"
      style={{
        left: `${site.x}%`,
        top: `${site.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 18,
        userSelect: 'none',
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-gray-800 bg-white/95 shadow-md border border-gray-200 backdrop-blur-sm whitespace-nowrap ${editMode ? 'cursor-grab ring-2 ring-indigo-400 ring-offset-1' : ''}`}
      >
        <span>{site.name}</span>
        {editMode && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(site.id); }}
            className="ml-1 -mr-0.5 w-3.5 h-3.5 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors shrink-0"
            title="Delete label"
          >
            <X size={8} strokeWidth={3} />
          </button>
        )}
      </div>
    </div>
  );
}
