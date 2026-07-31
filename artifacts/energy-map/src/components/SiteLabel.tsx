import { useRef, useState, useEffect } from 'react';
import { MapPin, ArrowRight, ZoomIn, ZoomOut, GripHorizontal, Pencil, Check, MousePointerClick } from 'lucide-react';
import { Site } from '@/data/sites';
import { labelOffsetFor, saveLabelOffset, LabelOffset } from '@/data/stickerLabelOffsets';

interface SiteLabelProps {
  site: Site;
  mapRef: React.RefObject<HTMLDivElement | null>;
  onClick: (site: Site) => void;
  onUpdate: (id: string, updates: Partial<{ name: string; x: number; y: number }>) => void;
  active?: boolean;
  labelEditMode?: boolean;
  zoom?: number;
  disabled?: boolean;
}

export function SiteLabel({ site, mapRef, onClick, onUpdate, active = false, labelEditMode = false, zoom = 1, disabled = false }: SiteLabelProps) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(site.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragState = useRef<{ startMouseX: number; startMouseY: number; startX: number; startY: number; moved: boolean } | null>(null);

  // The "Click to explore" hint is positioned independently of the pill, so it
  // can be dragged clear of roads/markers. Stored under a `hint:` key.
  const hintKey = `hint:${site.id}`;
  const [hintOffset, setHintOffset] = useState<LabelOffset>(() => labelOffsetFor(hintKey));
  useEffect(() => { setHintOffset(labelOffsetFor(hintKey)); }, [hintKey]);
  const hintDrag = useRef<{ startX: number; startY: number; base: LabelOffset; moved: boolean } | null>(null);

  const handleHintMouseDown = (e: React.MouseEvent) => {
    if (!labelEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    hintDrag.current = { startX: e.clientX, startY: e.clientY, base: hintOffset, moved: false };
  };

  useEffect(() => {
    if (!labelEditMode) return;
    const onMove = (e: MouseEvent) => {
      const d = hintDrag.current;
      if (!d || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      if (!rect.width) return;
      d.moved = true;
      setHintOffset({
        dx: d.base.dx + ((e.clientX - d.startX) / rect.width) * 100 / zoom,
        dy: d.base.dy + ((e.clientY - d.startY) / rect.height) * 100 / zoom,
      });
    };
    const onUp = () => {
      const d = hintDrag.current;
      hintDrag.current = null;
      if (d?.moved) setHintOffset((o) => { saveLabelOffset(hintKey, o); return o; });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [labelEditMode, hintKey, zoom, mapRef]);

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
      const x = Math.max(0, Math.min(100, state.startX + (dx / zoom / rect.width) * 100));
      const y = Math.max(0, Math.min(100, state.startY + (dy / zoom / rect.height) * 100));
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
  }, [labelEditMode, site.id, site.x, site.y, mapRef, onUpdate, zoom]);

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
        pointerEvents: disabled ? 'none' : undefined,
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
      ) : site.style === 'tag' ? (
        /* ── Tag style — compact text-only pill, no icons, no zoom action.
              Used for naming buildings or features that don't navigate.
              Clicking still fires onClick (parent decides what to do — if
              the site has no subMapId nothing happens, which is the point). */
        <button
          data-style="tag"
          onClick={() => onClick(site)}
          className={`backdrop-blur-sm border rounded-full px-3 py-1 shadow-sm transition-all duration-150 whitespace-nowrap text-[13px] font-bold leading-tight ${
            active
              ? 'bg-blue-600 border-blue-700 text-white shadow-md shadow-blue-200'
              : 'bg-white/90 border-gray-200 text-gray-800 hover:bg-white hover:border-blue-300 cursor-default'
          }`}
        >
          {site.name}
        </button>
      ) : (
        /* ── Pin style (default) — full pill with map-pin icon + zoom chevron */
        <button
          onClick={() => onClick(site)}
          className={`group flex items-center gap-1.5 border rounded-lg px-3 py-1.5 shadow-md transition-all duration-150 cursor-pointer whitespace-nowrap ${
            active
              ? 'bg-white border-emerald-500 text-gray-900 shadow-md'
              : 'bg-white/95 border-gray-200 text-gray-800 hover:border-emerald-400'
          }`}
          aria-label={active ? `Zoom out from ${site.name}` : `Zoom to ${site.name}`}
        >
          <MapPin size={13} className="text-emerald-600 shrink-0" />
          <span className="text-[13px] font-bold leading-none text-gray-900">
            {site.name}
          </span>
          {site.subMapId
            ? <ArrowRight size={12} className="text-emerald-600 group-hover:text-emerald-700 transition-colors shrink-0 ml-0.5" />
            : active
              ? <ZoomOut size={12} className="text-emerald-600 shrink-0 ml-0.5" />
              : <ZoomIn size={12} className="text-emerald-600 group-hover:text-emerald-700 transition-colors shrink-0 ml-0.5" />
          }
        </button>
      )}

      {/* "Click to explore" hint — draws attention to the drill-in pills so
          users know the campus blobs are interactive. Only on non-edit,
          navigable (sub-map) pills that aren't already zoomed in. */}
      {site.style !== 'tag' && site.subMapId && !active && (
        <div
          data-testid={`site-hint-${site.id}`}
          onMouseDown={handleHintMouseDown}
          className={`absolute ${labelEditMode ? '' : 'explore-float'}`}
          style={{
            left: `calc(50% + ${hintOffset.dx}%)`,
            top: `calc(100% + ${hintOffset.dy}%)`,
            transform: 'translateX(-50%)',
            marginTop: 8,
            pointerEvents: 'auto',
            cursor: labelEditMode ? 'grab' : 'pointer',
          }}
        >
          {/* Inner button carries the visuals + hover/press animation, so the
              outer div is free to own the positioning + nudge transform. */}
          <button
            type="button"
            onClick={(e) => { if (!labelEditMode) { e.stopPropagation(); onClick(site); } }}
            className={`explore-pill relative overflow-hidden flex items-center gap-2 whitespace-nowrap rounded-full bg-emerald-500 border-2 border-white px-4 py-2 shadow-xl text-[16px] font-extrabold text-white ${labelEditMode ? 'ring-2 ring-offset-1 ring-indigo-400 cursor-grab' : 'ring-2 ring-offset-1 ring-indigo-400/80 cursor-pointer'}`}
            aria-label={`Explore ${site.name}`}
          >
            <span className="relative flex items-center justify-center shrink-0" style={{ width: 19, height: 19 }}>
              <span className="click-ripple absolute inset-0 rounded-full border-2 border-white" aria-hidden />
              <MousePointerClick size={19} className="text-white shrink-0 click-tap relative" />
            </span>
            Click to explore
            <span className="explore-sheen" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
