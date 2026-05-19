import { useState, useCallback, useRef, useEffect } from 'react';
import { Move, Lock, Unlock, Copy, Check } from 'lucide-react';
import { assets as configAssets, EnergyAsset, AssetType } from '@/data/assets';
import { MarkerTooltip } from './MarkerTooltip';
import { SidePanel } from './SidePanel';
import { Legend } from './Legend';
import { FilterPanel } from './FilterPanel';
import mapImage from '@assets/Overview_1779198593346.png';

const ALL_TYPES: AssetType[] = ['mpan', 'generation'];
const STORAGE_KEY = 'energy-map-positions';

function loadPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePositions(positions: Record<string, { x: number; y: number }>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

function mergePositions(base: EnergyAsset[]): EnergyAsset[] {
  const saved = loadPositions();
  return base.map((a) => saved[a.id] ? { ...a, ...saved[a.id] } : a);
}

export function EnergyMap() {
  const [assets, setAssets] = useState<EnergyAsset[]>(() => mergePositions(configAssets));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<EnergyAsset | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<AssetType>>(new Set(ALL_TYPES));
  const [editMode, setEditMode] = useState(false);
  const [locked, setLocked] = useState(false);
  const [copied, setCopied] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; startX: number; startY: number } | null>(null);

  const handleFilterChange = useCallback((type: AssetType, checked: boolean) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(type);
      else next.delete(type);
      return next;
    });
  }, []);

  const handleOpen = useCallback((asset: EnergyAsset) => {
    if (editMode) return;
    setSelectedAsset(asset);
    setHoveredId(null);
  }, [editMode]);

  const handleMarkerMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = { id, startX: e.clientX, startY: e.clientY };
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const id = draggingRef.current.id;
      setAssets((prev) => prev.map((a) => a.id === id ? { ...a, x, y } : a));
    };

    const onMouseUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [editMode]);

  const handleLock = () => {
    const positions: Record<string, { x: number; y: number }> = {};
    assets.forEach((a) => { positions[a.id] = { x: a.x, y: a.y }; });
    savePositions(positions);
    setLocked(true);
    setEditMode(false);
  };

  const handleEnterEdit = () => {
    setEditMode(true);
    setLocked(false);
    setSelectedAsset(null);
    setHoveredId(null);
  };

  const exportText = assets
    .map((a) => `  { id: '${a.id}', x: ${a.x.toFixed(2)}, y: ${a.y.toFixed(2)} },`)
    .join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const visibleAssets = assets.filter((a) => visibleTypes.has(a.type));

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#6CABDD' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Etihad Campus</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Energy Asset Map</p>
          </div>
        </div>
        <div className="h-5 w-px bg-gray-200 mx-1" />
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span data-testid="asset-count">
            <span className="font-semibold text-gray-800">{assets.length}</span> assets registered
          </span>
          <span>
            <span className="font-semibold text-gray-800">{visibleAssets.length}</span> visible
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!editMode && !locked && (
            <button
              data-testid="btn-edit-positions"
              onClick={handleEnterEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Move size={13} />
              Edit positions
            </button>
          )}
          {editMode && (
            <>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Drag markers to reposition
              </span>
              <button
                data-testid="btn-lock-positions"
                onClick={handleLock}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <Lock size={13} />
                Lock positions
              </button>
            </>
          )}
          {locked && (
            <>
              <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center gap-1">
                <Lock size={11} /> Positions locked
              </span>
              <button
                data-testid="btn-edit-again"
                onClick={handleEnterEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Unlock size={13} />
                Edit again
              </button>
            </>
          )}
        </div>
      </header>

      {locked && (
        <div className="bg-gray-900 text-gray-100 px-6 py-3 flex items-start gap-4 border-b border-gray-700">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Saved coordinates — share these with the developer to make permanent
            </p>
            <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap leading-relaxed overflow-auto max-h-32">
              {exportText}
            </pre>
          </div>
          <button
            data-testid="btn-copy-coords"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors shrink-0 mt-4"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      <main className="flex-1 flex items-start justify-center p-6">
        <div
          data-testid="map-container"
          ref={mapRef}
          className={`relative w-full rounded-xl overflow-hidden shadow-xl border border-gray-200 bg-white ${editMode ? 'cursor-crosshair' : ''}`}
          style={{ maxWidth: 1600 }}
        >
          <img
            src={mapImage}
            alt="Etihad Campus map"
            data-testid="map-image"
            className="w-full h-auto block"
            draggable={false}
          />

          {!editMode && <Legend />}
          {!editMode && <FilterPanel visible={visibleTypes} onChange={handleFilterChange} />}

          {visibleAssets.map((asset) => {
            const isHovered = hoveredId === asset.id;
            const isDragging = draggingRef.current?.id === asset.id;
            return (
              <div
                key={asset.id}
                data-testid={`marker-${asset.id}`}
                className="absolute"
                style={{
                  left: `${asset.x}%`,
                  top: `${asset.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isHovered || isDragging ? 25 : 20,
                  cursor: editMode ? 'grab' : 'pointer',
                  userSelect: 'none',
                }}
                onMouseEnter={() => { if (!editMode) setHoveredId(asset.id); }}
                onMouseLeave={() => setHoveredId(null)}
                onMouseDown={(e) => handleMarkerMouseDown(e, asset.id)}
                onClick={() => { if (!editMode) handleOpen(asset); }}
              >
                <button
                  className="relative flex items-center justify-center focus:outline-none"
                  style={{ width: 18, height: 18 }}
                  aria-label={`${editMode ? 'Drag' : 'Open'} ${asset.name}`}
                  tabIndex={editMode ? -1 : 0}
                >
                  <span
                    className={`absolute rounded-full ${editMode ? '' : 'marker-pulse'}`}
                    style={{
                      width: 18,
                      height: 18,
                      background: editMode ? '#dc2626' : '#dc2626',
                      border: `2px solid ${editMode ? '#fbbf24' : 'white'}`,
                      boxShadow: editMode
                        ? '0 0 0 3px rgba(251,191,36,0.4), 0 2px 8px rgba(220,38,38,0.5)'
                        : '0 2px 8px rgba(220,38,38,0.5)',
                    }}
                  />
                </button>

                {editMode && (
                  <div
                    className="absolute left-5 top-1/2 -translate-y-1/2 bg-gray-900/90 text-white text-[9px] font-mono rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none"
                    style={{ zIndex: 30 }}
                  >
                    {asset.x.toFixed(1)}, {asset.y.toFixed(1)}
                  </div>
                )}

                {!editMode && isHovered && (
                  <MarkerTooltip asset={asset} onViewData={() => handleOpen(asset)} flipDown={asset.y < 25} />
                )}
              </div>
            );
          })}
        </div>
      </main>

      {!editMode && (
        <SidePanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}
    </div>
  );
}
