import { useState, useCallback, useRef, useEffect } from 'react';
import { Move, Lock, Unlock, Copy, Check, ZoomOut, Plus, Tag, Zap } from 'lucide-react';
import { assets as configAssets, EnergyAsset, AssetType } from '@/data/assets';
import { sites as configSites, Site } from '@/data/sites';
import { stickers as configStickers } from '@/data/stickers';
import { MarkerTooltip } from './MarkerTooltip';
import { SidePanel } from './SidePanel';
import { Legend } from './Legend';
import { FilterPanel } from './FilterPanel';
import { SiteLabel } from './SiteLabel';
import { StickerOverlay, StickerTransform } from './StickerOverlay';
import { AddMpanDialog } from './AddMpanDialog';
import { SubMapView } from './SubMapView';
import { DataPanel } from './DataPanel';
import { AddLabelDialog } from './AddLabelDialog';
import { FreeLabel } from './FreeLabel';
import { submaps } from '@/data/submaps';
import mapImage from '@assets/Overview_1779198593346.png';

const ALL_TYPES: AssetType[] = ['mpan', 'generation'];
const STORAGE_KEY = 'energy-map-positions';
const STICKER_STORAGE_KEY = 'energy-map-sticker-transforms';
const USER_ASSETS_KEY = 'energy-map-user-assets';

function loadUserAssets(): EnergyAsset[] {
  try {
    const raw = localStorage.getItem(USER_ASSETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUserAssets(userAssets: EnergyAsset[]) {
  localStorage.setItem(USER_ASSETS_KEY, JSON.stringify(userAssets));
}

function loadStickerTransforms(): Record<string, StickerTransform> {
  try {
    const raw = localStorage.getItem(STICKER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveStickerTransforms(transforms: Record<string, StickerTransform>) {
  localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(transforms));
}

function initStickerTransforms(): Record<string, StickerTransform> {
  const saved = loadStickerTransforms();
  const result: Record<string, StickerTransform> = {};
  configStickers.forEach((s) => {
    result[s.id] = saved[s.id] ?? { x: s.x, y: s.y, width: s.width, rotation: s.rotation };
  });
  return result;
}

const DELETED_STICKERS_KEY = 'energy-map-deleted-stickers';

function loadDeletedStickers(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_STICKERS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveDeletedStickers(ids: Set<string>) {
  localStorage.setItem(DELETED_STICKERS_KEY, JSON.stringify([...ids]));
}

const SITE_OVERRIDES_KEY = 'energy-map-site-overrides';

function loadSiteOverrides(): Record<string, Partial<Site>> {
  try {
    const raw = localStorage.getItem(SITE_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSiteOverrides(overrides: Record<string, Partial<Site>>) {
  localStorage.setItem(SITE_OVERRIDES_KEY, JSON.stringify(overrides));
}

const USER_SITES_KEY = 'energy-map-user-sites';

function loadUserSites(): Site[] {
  try {
    const raw = localStorage.getItem(USER_SITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveUserSites(sites: Site[]) {
  localStorage.setItem(USER_SITES_KEY, JSON.stringify(sites));
}

function initSites(): Site[] {
  const overrides = loadSiteOverrides();
  return configSites.map((s) => ({ ...s, ...overrides[s.id] }));
}

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
  const [assets, setAssets] = useState<EnergyAsset[]>(() => [...mergePositions(configAssets), ...loadUserAssets()]);
  const [siteState, setSiteState] = useState<Site[]>(() => initSites());
  const [labelEditMode, setLabelEditMode] = useState(false);
  const [addMpanMode, setAddMpanMode] = useState(false);
  const [pendingMpan, setPendingMpan] = useState<{ x: number; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<EnergyAsset | null>(null);
  const [visibleTypes, setVisibleTypes] = useState<Set<AssetType>>(new Set(ALL_TYPES));
  const [editMode, setEditMode] = useState(false);
  const [locked, setLocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomedSite, setZoomedSite] = useState<Site | null>(null);
  const [userSites, setUserSites] = useState<Site[]>(() => loadUserSites());
  const [addLabelMode, setAddLabelMode] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<{ x: number; y: number } | null>(null);
  const [dataPanelOpen, setDataPanelOpen] = useState(true);
  const [activeSubMapId, setActiveSubMapId] = useState<string | null>(null);
  const [subMapOrigin, setSubMapOrigin] = useState({ x: 50, y: 50 });
  const [stickerTransforms, setStickerTransforms] = useState<Record<string, StickerTransform>>(() => initStickerTransforms());
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [deletedStickerIds, setDeletedStickerIds] = useState<Set<string>>(() => loadDeletedStickers());

  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    submaps.forEach((sm) => {
      const img = new Image();
      img.src = sm.image;
    });
  }, []);
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

  const handleStickerUpdate = useCallback((id: string, updates: Partial<StickerTransform>) => {
    setStickerTransforms((prev) => {
      const next = { ...prev, [id]: { ...prev[id], ...updates } };
      saveStickerTransforms(next);
      return next;
    });
  }, []);

  const handleStickerSelect = useCallback((id: string) => {
    setSelectedStickerId(id);
    setHoveredId(null);
    setSelectedAsset(null);
  }, []);

  const handleStickerDelete = useCallback((id: string) => {
    setDeletedStickerIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDeletedStickers(next);
      return next;
    });
    setSelectedStickerId(null);
  }, []);

  const handleDeselectSticker = useCallback(() => {
    setSelectedStickerId(null);
  }, []);

  const handleSiteLabelUpdate = useCallback((id: string, updates: Partial<Site>) => {
    setSiteState((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, ...updates } : s);
      // persist overrides as a map
      const overrides: Record<string, Partial<Site>> = {};
      next.forEach((s, i) => {
        const orig = configSites[i];
        const diff: Partial<Site> = {};
        if (s.name !== orig.name) diff.name = s.name;
        if (Math.abs(s.x - orig.x) > 0.01) diff.x = s.x;
        if (Math.abs(s.y - orig.y) > 0.01) diff.y = s.y;
        if (Object.keys(diff).length) overrides[s.id] = diff;
      });
      saveSiteOverrides(overrides);
      return next;
    });
  }, []);

  const handleAddMpanConfirm = useCallback((name: string, mpan: string, notes: string) => {
    if (!pendingMpan) return;
    const newAsset: EnergyAsset = {
      id: `user-mpan-${Date.now()}`,
      name,
      type: 'mpan',
      x: pendingMpan.x,
      y: pendingMpan.y,
      ...(mpan ? { mpan } : {}),
      ...(notes ? { notes } : {}),
    };
    setAssets((prev) => {
      const next = [...prev, newAsset];
      // persist only the user-added assets
      const userAssets = next.filter((a) => a.id.startsWith('user-mpan-'));
      saveUserAssets(userAssets);
      return next;
    });
    setPendingMpan(null);
    setAddMpanMode(false);
  }, [pendingMpan]);

  const handleAddLabelConfirm = useCallback((name: string) => {
    if (!pendingLabel) return;
    const newSite: Site = {
      id: `user-site-${Date.now()}`,
      name,
      x: pendingLabel.x,
      y: pendingLabel.y,
    };
    setUserSites((prev) => {
      const next = [...prev, newSite];
      saveUserSites(next);
      return next;
    });
    setPendingLabel(null);
    setAddLabelMode(false);
  }, [pendingLabel]);

  const handleUserSiteLabelUpdate = useCallback((id: string, updates: Partial<Site>) => {
    setUserSites((prev) => {
      const next = prev.map((s) => s.id === id ? { ...s, ...updates } : s);
      saveUserSites(next);
      return next;
    });
  }, []);

  const handleUserSiteDelete = useCallback((id: string) => {
    setUserSites((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveUserSites(next);
      return next;
    });
  }, []);

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (addMpanMode && mapRef.current) {
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingMpan({ x, y });
      return;
    }
    if (addLabelMode && mapRef.current) {
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingLabel({ x, y });
      return;
    }
    handleDeselectSticker();
  }, [addMpanMode, addLabelMode, handleDeselectSticker]);

  const handleSiteClick = useCallback((site: Site) => {
    if (editMode || labelEditMode) return;
    if (site.subMapId) {
      setSubMapOrigin({ x: site.x, y: site.y });
      setActiveSubMapId(site.subMapId);
      return;
    }
    setZoomedSite((prev) => prev?.id === site.id ? null : site);
    setHoveredId(null);
    setSelectedAsset(null);
  }, [editMode, labelEditMode]);

  const handleZoomOut = useCallback(() => {
    setZoomedSite(null);
  }, []);

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
    const onMouseUp = () => { draggingRef.current = null; };
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
    setZoomedSite(null);
    setAddMpanMode(false);
    setPendingMpan(null);
    setLabelEditMode(false);
  };

  const handleEnterAddMpan = () => {
    setAddMpanMode(true);
    setEditMode(false);
    setLocked(false);
    setSelectedAsset(null);
    setHoveredId(null);
    setZoomedSite(null);
    setSelectedStickerId(null);
    setLabelEditMode(false);
  };

  const handleEnterLabelEdit = () => {
    setLabelEditMode(true);
    setEditMode(false);
    setLocked(false);
    setAddMpanMode(false);
    setPendingMpan(null);
    setSelectedAsset(null);
    setHoveredId(null);
    setZoomedSite(null);
    setSelectedStickerId(null);
  };

  const handleCancelAddMpan = () => {
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

  if (activeSubMapId) {
    return (
      <SubMapView
        subMapId={activeSubMapId}
        originX={subMapOrigin.x}
        originY={subMapOrigin.y}
        onBack={() => setActiveSubMapId(null)}
      />
    );
  }

  const visibleAssets = assets.filter((a) => visibleTypes.has(a.type));

  const zoomScale = zoomedSite?.zoom ?? 1;
  const zoomOriginX = zoomedSite?.x ?? 50;
  const zoomOriginY = zoomedSite?.y ?? 50;

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#6CABDD' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">MCFC Campus</h1>
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
          {zoomedSite && (
            <span className="text-blue-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              {zoomedSite.name}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && (
            <button
              data-testid="btn-add-mpan"
              onClick={handleEnterAddMpan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <Plus size={13} />
              Add MPAN
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && (
            <button
              onClick={() => { setAddLabelMode(true); setPendingLabel(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Tag size={13} />
              Add label
            </button>
          )}
          {addLabelMode && (
            <button
              onClick={() => { setAddLabelMode(false); setPendingLabel(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && userSites.length > 0 && (
            <button
              data-testid="btn-edit-labels"
              onClick={handleEnterLabelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Move size={13} />
              Edit labels
            </button>
          )}
          {labelEditMode && (
            <button
              onClick={() => { setLabelEditMode(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Check size={13} />
              Done editing labels
            </button>
          )}
          {addMpanMode && (
            <button
              onClick={handleCancelAddMpan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {zoomedSite && !editMode && !addMpanMode && (
            <button
              data-testid="btn-zoom-out"
              onClick={handleZoomOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <ZoomOut size={13} />
              Zoom out
            </button>
          )}
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

      {addMpanMode && (
        <div className="bg-red-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          Click anywhere on the map to place a new MPAN marker
          <button
            onClick={handleCancelAddMpan}
            className="ml-auto text-red-200 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      <main className="flex-1 flex items-start justify-center p-6">
        <div
          data-testid="map-container"
          ref={mapRef}
          className={`relative w-full rounded-xl overflow-hidden shadow-xl border border-gray-200 bg-white ${editMode || addMpanMode ? 'cursor-crosshair' : ''}`}
          style={{ maxWidth: 1600 }}
          onClick={handleMapClick}
        >
          {/* Zoomable inner layer */}
          <div
            data-testid="map-zoom-layer"
            style={{
              transformOrigin: `${zoomOriginX}% ${zoomOriginY}%`,
              transform: `scale(${zoomScale})`,
              transition: 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <img
              src={mapImage}
              alt="Etihad Campus map"
              data-testid="map-image"
              className="w-full h-auto block"
              draggable={false}
            />

            {/* Image stickers — z-index 5, always below markers (z-index 20) */}
            {!editMode && configStickers.filter((s) => !deletedStickerIds.has(s.id)).map((sticker) => {
              const transform = stickerTransforms[sticker.id];
              if (!transform) return null;
              return (
                <StickerOverlay
                  key={sticker.id}
                  id={sticker.id}
                  label={sticker.label}
                  src={sticker.src}
                  transform={transform}
                  mapRef={mapRef}
                  selected={selectedStickerId === sticker.id}
                  onSelect={() => handleStickerSelect(sticker.id)}
                  onUpdate={(updates) => handleStickerUpdate(sticker.id, updates)}
                  onDelete={() => handleStickerDelete(sticker.id)}
                />
              );
            })}

            {/* Site labels — hidden in marker-edit mode */}
            {!editMode && siteState.map((site) => (
              <SiteLabel
                key={site.id}
                site={site}
                mapRef={mapRef}
                onClick={handleSiteClick}
                onUpdate={handleSiteLabelUpdate}
                active={zoomedSite?.id === site.id}
                labelEditMode={labelEditMode}
              />
            ))}

            {/* User-added free labels */}
            {userSites.map((site) => (
              <FreeLabel
                key={site.id}
                site={site}
                mapRef={mapRef}
                editMode={labelEditMode}
                onUpdate={handleUserSiteLabelUpdate}
                onDelete={handleUserSiteDelete}
              />
            ))}

            {/* Asset markers */}
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
                        background: '#dc2626',
                        border: `2px solid ${editMode ? '#fbbf24' : 'white'}`,
                        boxShadow: editMode
                          ? '0 0 0 3px rgba(251,191,36,0.4), 0 2px 8px rgba(220,38,38,0.5)'
                          : '0 2px 8px rgba(220,38,38,0.5)',
                      }}
                    />
                    <Zap size={8} fill="white" color="white" className="relative z-10" strokeWidth={0} />
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

          {/* Controls sit outside the zoom layer so they don't scale */}
          {!editMode && <Legend />}
          {!editMode && <FilterPanel visible={visibleTypes} onChange={handleFilterChange} />}

          {/* Zoom-out overlay hint when zoomed */}
          {zoomedSite && !editMode && (
            <button
              onClick={handleZoomOut}
              data-testid="btn-zoom-out-overlay"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-gray-900/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full shadow-lg hover:bg-gray-900 transition-colors z-30"
            >
              <ZoomOut size={12} />
              Click to zoom out
            </button>
          )}
        </div>
      </main>

      {!editMode && (
        <SidePanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
      )}

      <DataPanel open={dataPanelOpen} onToggle={() => setDataPanelOpen((v) => !v)} />

      {pendingMpan && (
        <AddMpanDialog
          x={pendingMpan.x}
          y={pendingMpan.y}
          onConfirm={handleAddMpanConfirm}
          onCancel={() => setPendingMpan(null)}
        />
      )}

      {pendingLabel && (
        <AddLabelDialog
          x={pendingLabel.x}
          y={pendingLabel.y}
          onConfirm={handleAddLabelConfirm}
          onCancel={() => setPendingLabel(null)}
        />
      )}
    </div>
  );
}
