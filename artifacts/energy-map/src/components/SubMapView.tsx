import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, Move, Lock, Unlock, Copy, Check, Plus, MapPin } from 'lucide-react';
import { EnergyAsset, AssetType } from '@/data/assets';
import { getSubMap } from '@/data/submaps';
import { MarkerTooltip } from './MarkerTooltip';
import { SidePanel } from './SidePanel';
import { AddMpanDialog } from './AddMpanDialog';

interface SubMapViewProps {
  subMapId: string;
  onBack: () => void;
}

const ALL_TYPES: AssetType[] = ['mpan', 'generation'];

function storageKey(subMapId: string, suffix: string) {
  return `energy-submap-${subMapId}-${suffix}`;
}

function loadAssets(subMapId: string): EnergyAsset[] {
  try {
    const raw = localStorage.getItem(storageKey(subMapId, 'assets'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAssets(subMapId: string, assets: EnergyAsset[]) {
  localStorage.setItem(storageKey(subMapId, 'assets'), JSON.stringify(assets));
}

export function SubMapView({ subMapId, onBack }: SubMapViewProps) {
  const subMap = getSubMap(subMapId);
  const [assets, setAssets] = useState<EnergyAsset[]>(() => loadAssets(subMapId));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<EnergyAsset | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [locked, setLocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [addMpanMode, setAddMpanMode] = useState(false);
  const [pendingMpan, setPendingMpan] = useState<{ x: number; y: number } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; startX: number; startY: number } | null>(null);

  const persist = useCallback((next: EnergyAsset[]) => {
    saveAssets(subMapId, next);
  }, [subMapId]);

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
      setAssets((prev) => {
        const next = prev.map((a) => a.id === id ? { ...a, x, y } : a);
        return next;
      });
    };
    const onMouseUp = () => { draggingRef.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [editMode]);

  const handleLock = () => {
    persist(assets);
    setLocked(true);
    setEditMode(false);
  };

  const handleEnterEdit = () => {
    setEditMode(true);
    setLocked(false);
    setSelectedAsset(null);
    setHoveredId(null);
    setAddMpanMode(false);
    setPendingMpan(null);
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

  const handleAddMpanConfirm = useCallback((name: string, mpan: string, notes: string) => {
    if (!pendingMpan) return;
    const newAsset: EnergyAsset = {
      id: `submap-${subMapId}-mpan-${Date.now()}`,
      name,
      type: 'mpan',
      x: pendingMpan.x,
      y: pendingMpan.y,
      ...(mpan ? { mpan } : {}),
      ...(notes ? { notes } : {}),
    };
    setAssets((prev) => {
      const next = [...prev, newAsset];
      persist(next);
      return next;
    });
    setPendingMpan(null);
    setAddMpanMode(false);
  }, [pendingMpan, subMapId, persist]);

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (addMpanMode && mapRef.current) {
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingMpan({ x, y });
    }
  }, [addMpanMode]);

  if (!subMap) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Sub-map not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={15} />
          <span className="text-xs">Overview</span>
        </button>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-blue-500" />
          <h1 className="text-sm font-bold text-gray-900">{subMap.name}</h1>
        </div>

        <div className="text-xs text-gray-400">
          <span className="font-semibold text-gray-700">{assets.length}</span> markers
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!editMode && !addMpanMode && (
            <button
              onClick={() => { setAddMpanMode(true); setEditMode(false); setLocked(false); setSelectedAsset(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <Plus size={13} />
              Add MPAN
            </button>
          )}
          {addMpanMode && (
            <button
              onClick={() => { setAddMpanMode(false); setPendingMpan(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {!editMode && !locked && !addMpanMode && (
            <button
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

      {/* Add MPAN mode banner */}
      {addMpanMode && (
        <div className="bg-red-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          Click anywhere on the map to place a new MPAN marker
          <button
            onClick={() => { setAddMpanMode(false); setPendingMpan(null); }}
            className="ml-auto text-red-200 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Locked export bar */}
      {locked && (
        <div className="bg-gray-900 text-gray-100 px-6 py-3 flex items-start gap-4 border-b border-gray-700">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
              Saved coordinates
            </p>
            <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap leading-relaxed overflow-auto max-h-32">
              {exportText}
            </pre>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors shrink-0 mt-4"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}

      {/* Map area */}
      <main className="flex-1 flex items-start justify-center p-6">
        <div
          ref={mapRef}
          className={`relative w-full rounded-xl overflow-hidden shadow-xl border border-gray-200 bg-white ${editMode || addMpanMode ? 'cursor-crosshair' : ''}`}
          style={{ maxWidth: 1600 }}
          onClick={handleMapClick}
        >
          <img
            src={subMap.image}
            alt={subMap.name}
            className="w-full h-auto block"
            draggable={false}
          />

          {/* MPAN markers */}
          {assets.map((asset) => {
            const isHovered = hoveredId === asset.id;
            const isDragging = draggingRef.current?.id === asset.id;
            return (
              <div
                key={asset.id}
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
                  aria-label={asset.name}
                  tabIndex={editMode ? -1 : 0}
                >
                  <span
                    className={`absolute rounded-full ${editMode ? '' : 'marker-pulse'}`}
                    style={{
                      width: 18,
                      height: 18,
                      background: '#dc2626',
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

      {pendingMpan && (
        <AddMpanDialog
          x={pendingMpan.x}
          y={pendingMpan.y}
          onConfirm={handleAddMpanConfirm}
          onCancel={() => setPendingMpan(null)}
        />
      )}
    </div>
  );
}
