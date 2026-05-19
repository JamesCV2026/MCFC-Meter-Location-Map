import { useRef, useState, useEffect } from 'react';
import { MapPin, ZoomIn, ZoomOut, GripHorizontal, Pencil, Check } from 'lucide-react';
import { Site } from '@/data/sites';

interface SiteLabelProps {
  site: Site;
  mapRef: React.RefObject<HTMLDivElement | null>;
  onClick: (site: Site) => void;
  onUpdate: (id: string, updates: Partial<{ name: string; x: number; y: number }>) => void;
  active?: boolean;
  labelEditMode?: boolean;
}

export function SiteLabel({ site, mapRef, onClick, onUpdate, active = false, labelEditMode = false }: SiteLabelProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(site.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragState = useRef<{ startMouseX: number; startMouseY: number; startX: number; startY: number; moved: boolean } | null>(null);

  // keep draft in sync when site.name changes externally
  useEffect(() => { setDraftName(site.name); }, [site.name]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleGripMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: site.x,
      startY: site.y,
      moved: false,
    };
  }

  useEffect(() => {
    if (!labelEditMode) return;

    function onMouseMove(e: MouseEvent) {
      if (!dragState.current || !mapRef.current) return;
      const state = dragState.current;
      const dx = e.clientX - state.startMouseX;
      const dy = e.clientY - state.startMouseY;
      if (!state.moved && Math.sqrt(dx * dx + dy * dy) < 4) return;
      state.moved = true;
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, state.startX + (dx / rect.width) * 100));
      const y = Math.max(0, Math.min(100, state.startY + (dy / rect.height) * 100));
      onUpdate(site.id, { x, y });
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
  }, [labelEditMode, site.id, site.x, site.y, mapRef, onUpdate]);

  function commitName() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== site.name) onUpdate(site.id, { name: trimmed });
    else setDraftName(site.name);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') { setDraftName(site.name); setEditing(false); }
  }

  return (
    <div
      data-testid={`site-label-${site.id}`}
      className="absolute"
      style={{
        left: `${site.x}%`,
        top: `${site.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 15,
        userSelect: 'none',
      }}
    >
      {labelEditMode ? (
        /* ── Edit mode pill ── */
        <div className="flex items-center gap-0.5 bg-white border-2 border-indigo-400 rounded-lg shadow-lg px-1.5 py-1">
          {/* Grip / drag handle */}
          <div
            className="cursor-grab active:cursor-grabbing p-0.5 text-indigo-400 hover:text-indigo-600"
            onMouseDown={handleGripMouseDown}
            title="Drag to move"
          >
            <GripHorizontal size={12} />
          </div>

          <MapPin size={11} className="text-indigo-500 shrink-0" />

          {editing ? (
            <input
              ref={inputRef}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={handleKeyDown}
              className="text-[11px] font-semibold text-gray-900 bg-transparent border-b border-indigo-400 outline-none w-32 leading-none"
            />
          ) : (
            <span className="text-[11px] font-semibold text-gray-800 mx-0.5 leading-none whitespace-nowrap">
              {site.name}
            </span>
          )}

          {/* Pencil / confirm toggle */}
          <button
            className="p-0.5 text-indigo-400 hover:text-indigo-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); editing ? commitName() : setEditing(true); }}
            title={editing ? 'Confirm name' : 'Edit name'}
          >
            {editing ? <Check size={11} /> : <Pencil size={11} />}
          </button>
        </div>
      ) : (
        /* ── Normal mode pill ── */
        <button
          onClick={() => onClick(site)}
          className={`group flex items-center gap-1.5 backdrop-blur-sm border rounded-lg px-2.5 py-1.5 shadow-md transition-all duration-150 cursor-pointer whitespace-nowrap ${
            active
              ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-200'
              : 'bg-white/90 border-gray-200 hover:bg-white hover:border-blue-300 hover:shadow-lg'
          }`}
          aria-label={active ? `Zoom out from ${site.name}` : `Zoom to ${site.name}`}
        >
          <MapPin size={11} className={active ? 'text-blue-200 shrink-0' : 'text-blue-500 shrink-0'} />
          <span className={`text-[11px] font-semibold leading-none ${active ? 'text-white' : 'text-gray-800'}`}>
            {site.name}
          </span>
          {active
            ? <ZoomOut size={10} className="text-blue-200 shrink-0 ml-0.5" />
            : <ZoomIn size={10} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0 ml-0.5" />
          }
        </button>
      )}
    </div>
  );
}
