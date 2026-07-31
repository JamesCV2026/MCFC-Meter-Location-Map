import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Move, Lock, Unlock, Check, Plus, Minus, MapPin, Tag, X, Sticker, Eye, EyeOff, List, Filter, Cable as CableIcon, Undo2, Trash2, Unlink, Scissors, ArrowLeftRight } from 'lucide-react';
import { EnergyAsset, AssetType } from '@/data/assets';
import { assetTypeConfig, ENABLED_TYPES } from '@/data/assetTypes';
import { Site } from '@/data/sites';
import { Cable, CableType, CablePoint, cableTypeConfig, ALL_CABLE_TYPES, CABLE_COLORS } from '@/data/cables';
import { CableLayer } from './CableLayer';
import { getSubMap } from '@/data/submaps';
import { MarkerTooltip } from './MarkerTooltip';
import { SidePanel } from './SidePanel';
import { AddMpanDialog } from './AddMpanDialog';
import { FreeLabel } from './FreeLabel';
import { AddLabelDialog } from './AddLabelDialog';
import { StickerOverlay } from './StickerOverlay';
import { StickerPicker } from './StickerPicker';
import { AssetInfoPanel } from './AssetInfoPanel';
import { useStickerLibrary, stickerToPanelItem, assetToPanelItem } from '@/data/stickerLibrary';
import { FilterPanel, HighlightTarget } from './FilterPanel';
import { groupsForSubmap } from '@/data/siteAssetGroups';
import { Legend } from './Legend';
import { ServicesDuctOverlay } from './ServicesDuctOverlay';
import { VIEW_ONLY } from '@/viewOnly';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

// Convert a screen point to a map percentage, accounting for the zoom layer's
// translate(pan) scale(zoom) transform (transform-origin = centre).
function screenToMapPct(
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

interface SubMapViewProps {
  subMapId: string;
  originX?: number;
  originY?: number;
  onBack: () => void;
}

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

function loadLabels(subMapId: string): Site[] {
  try {
    const raw = localStorage.getItem(storageKey(subMapId, 'labels'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLabels(subMapId: string, labels: Site[]) {
  localStorage.setItem(storageKey(subMapId, 'labels'), JSON.stringify(labels));
}

// ── Cables ──────────────────────────────────────────────────────────────
// % distance within which a cable point plugs into an asset. Kept small so a
// point only latches when dropped right on a marker.
const CABLE_SNAP_DIST = 1.4;

// Cables are stored per sub-map. There are NO baked cables for sub-maps — they
// load only from storage.
function loadSubMapCables(subMapId: string): Cable[] {
  try {
    const raw = localStorage.getItem(storageKey(subMapId, 'cables'));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSubMapCables(subMapId: string, list: Cable[]) {
  try {
    localStorage.setItem(
      storageKey(subMapId, 'cables'),
      JSON.stringify(list.filter((c) => c.id.startsWith('cable-'))),
    );
  } catch { /* ignore */ }
}

// Resolve a cable point to a live position (asset-anchored points follow their marker).
function resolveCablePos(p: CablePoint, assets: EnergyAsset[]): { x: number; y: number } {
  if (p.assetId) {
    const a = assets.find((x) => x.id === p.assetId);
    if (a) return { x: a.x, y: a.y };
  }
  return { x: p.x, y: p.y };
}

// True when two points sit on (essentially) the same spot.
function sameCablePos(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.05;
}

// Collapse runs of coincident points (zero-length segments) into a single point.
function dedupeCablePoints(points: CablePoint[], assets: EnergyAsset[]): CablePoint[] {
  if (points.length < 2) return points;
  const out: CablePoint[] = [];
  for (const p of points) {
    const prev = out[out.length - 1];
    if (prev && sameCablePos(resolveCablePos(prev, assets), resolveCablePos(p, assets))) {
      if (!prev.assetId && p.assetId) out[out.length - 1] = p;
      continue;
    }
    out.push(p);
  }
  return out.length >= 2 ? out : points;
}

// Find the nearest asset to a point, for "plugging" a cable end into a marker.
function findSnapAsset(x: number, y: number, assets: EnergyAsset[]): EnergyAsset | null {
  let best: EnergyAsset | null = null;
  let bestDist = CABLE_SNAP_DIST;
  for (const a of assets) {
    const d = Math.hypot(a.x - x, a.y - y);
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best;
}

export function SubMapView({ subMapId, originX = 50, originY = 50, onBack }: SubMapViewProps) {
  const subMap = getSubMap(subMapId);
  const [assets, setAssets] = useState<EnergyAsset[]>(() => loadAssets(subMapId));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Forgiving hover — keep the tooltip alive briefly after the cursor leaves.
  const hoverCloseTimer = useRef<number | null>(null);
  const openHover = useCallback((id: string) => {
    if (hoverCloseTimer.current !== null) { clearTimeout(hoverCloseTimer.current); hoverCloseTimer.current = null; }
    setHoveredId(id);
  }, []);
  const scheduleHoverClose = useCallback(() => {
    if (hoverCloseTimer.current !== null) clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = window.setTimeout(() => { setHoveredId(null); hoverCloseTimer.current = null; }, 180);
  }, []);
  const [selectedAsset, setSelectedAsset] = useState<EnergyAsset | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [locked, setLocked] = useState(false);
  const [addMpanMode, setAddMpanMode] = useState(false);
  const [pendingMpan, setPendingMpan] = useState<{ x: number; y: number } | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [userLabels, setUserLabels] = useState<Site[]>(() => loadLabels(subMapId));
  // Names visible as free labels on this sub-map. Stickers whose display
  // name matches one of these hide their own auto-name tag — the explicit
  // label supersedes the default one.
  const supersedingLabelNames = useMemo(() => {
    const out = new Set<string>();
    for (const l of userLabels) out.add(l.name.trim().toLowerCase());
    return out;
  }, [userLabels]);
  const [addLabelMode, setAddLabelMode] = useState(false);
  const [labelEditMode, setLabelEditMode] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<{ x: number; y: number } | null>(null);

  // Sticker library + picker, scoped to this sub-map view.
  const stickerLib = useStickerLibrary(subMapId);

  // Asset-type filter + sticker/label visibility — mirrors the main overview map.
  const [visibleTypes, setVisibleTypes] = useState<Set<AssetType>>(() => new Set(ENABLED_TYPES));
  // Infrastructure index highlight — hovering a group/item in the FilterPanel
  // lights up the matching markers (and dims the rest).
  const [highlight, setHighlight] = useState<HighlightTarget | null>(null);

  // Which markers the current hover targets (mirrors the overview):
  //  • centroid — arrows fan outward around a CLUSTER so they never pile up
  //  • single   — one specific asset gets a 2.5x arrow + pulsing ring
  const highlightMatches = highlight
    ? assets.filter((a) => highlight.ids ? highlight.ids.includes(a.id)
      : highlight.id ? highlight.id === a.id
      : highlight.type === (a.idno ? 'idno' : a.type))
    : [];
  const isSingleHighlight = highlightMatches.length === 1;
  const highlightCentroid = highlightMatches.length < 2 ? null : {
    x: highlightMatches.reduce((s, a) => s + a.x, 0) / highlightMatches.length,
    y: highlightMatches.reduce((s, a) => s + a.y, 0) / highlightMatches.length,
  };
  // Site → assets index for THIS sub-map's Assets list (resolves the curated
  // group asset names to this sub-map's markers).
  const siteAssetsIndex = useMemo(() => {
    const byName = new Map<string, EnergyAsset>();
    for (const a of assets) if (a.name) byName.set(a.name, a);
    const index: Record<string, EnergyAsset[]> = {};
    for (const g of groupsForSubmap(subMapId)) {
      const list = g.assetNames.map((n) => byName.get(n)).filter(Boolean) as EnergyAsset[];
      if (list.length) index[g.id] = list;
    }
    return index;
  }, [assets, subMapId]);
  const [stickersHidden, setStickersHidden] = useState(false);
  // Top layer (z > markers) where every sticker portals its name label, so
  // labels are never hidden behind a nearby marker icon.
  const [stickerLabelsLayer, setStickerLabelsLayer] = useState<HTMLDivElement | null>(null);
  const [labelsHidden, setLabelsHidden] = useState(false);
  // Assets (Legend) panel visibility — hideable on sub-maps too, mirroring the
  // overview. Preference is shared across all sub-maps via its own key (kept
  // separate from the overview's so the two views toggle independently).
  const [legendHidden, setLegendHidden] = useState<boolean>(() => {
    try { return localStorage.getItem('energy-map-submap-legend-hidden') === 'true'; } catch { return false; }
  });
  const handleToggleLegend = useCallback(() => {
    setLegendHidden((v) => {
      const next = !v;
      try { localStorage.setItem('energy-map-submap-legend-hidden', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  // Hide/show the infrastructure filter panel on sub-maps.
  const [filterHidden, setFilterHidden] = useState<boolean>(() => {
    try { return localStorage.getItem('energy-map-submap-filter-hidden') === 'true'; } catch { return false; }
  });
  const handleToggleFilter = useCallback(() => {
    setFilterHidden((v) => {
      const next = !v;
      try { localStorage.setItem('energy-map-submap-filter-hidden', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // HV / LV services-duct overlay toggles (CFA sub-map only). On by default.
  const [showHvDucts, setShowHvDucts] = useState(true);
  const [showLvDucts, setShowLvDucts] = useState(true);

  // Etihad Stadium site chooser — opens when the stadium sticker is clicked.
  // CFA site chooser — opens when the Indoor Pitch sticker is clicked.

  // Map zoom & pan — mirrors the main overview map.
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Cable state — mirrors the overview map. No baked cables on sub-maps.
  const [cableList, setCableList] = useState<Cable[]>(
    () => loadSubMapCables(subMapId).map((c) => ({ ...c, points: dedupeCablePoints(c.points, loadAssets(subMapId)) })),
  );
  const [cableMode, setCableMode] = useState<CableType | null>(null);
  const [cableEditMode, setCableEditMode] = useState(false);
  const [draftPoints, setDraftPoints] = useState<CablePoint[]>([]);
  const [cableCursor, setCableCursor] = useState<{ x: number; y: number } | null>(null);
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);
  const [activeCablePoint, setActiveCablePoint] = useState<{ cableId: string; index: number } | null>(null);
  const [activeCableSegment, setActiveCableSegment] = useState<{ cableId: string; index: number } | null>(null);
  const [cableHistory, setCableHistory] = useState<Cable[][]>([]);

  const cableListRef = useRef(cableList);
  cableListRef.current = cableList;
  const cableDragRef = useRef<{ cableId: string; index: number; startX: number; startY: number; moved: boolean } | null>(null);
  const cableMoveRef = useRef<{ cableId: string; startX: number; startY: number; startPoints: CablePoint[]; moved: boolean } | null>(null);

  const handleMapZoomIn = useCallback(() => {
    setMapZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  }, []);
  const handleMapZoomOut = useCallback(() => {
    setMapZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
  }, []);
  const handleMapZoomReset = useCallback(() => {
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
  }, []);

  // Keep pan within bounds when zoom changes (snaps back to 0 at zoom 1).
  useEffect(() => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const maxX = ((mapZoom - 1) / 2) * rect.width;
    const maxY = ((mapZoom - 1) / 2) * rect.height;
    setMapPan((p) => {
      const nx = Math.max(-maxX, Math.min(maxX, p.x));
      const ny = Math.max(-maxY, Math.min(maxY, p.y));
      return nx === p.x && ny === p.y ? p : { x: nx, y: ny };
    });
  }, [mapZoom]);

  const handleMapMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (mapZoom <= 1) return;
    if (editMode || addMpanMode || addLabelMode || labelEditMode || cableMode || cableEditMode) return;
    if (!(e.target as HTMLElement).closest('[data-testid="map-zoom-layer"]')) return;
    e.preventDefault();
    panRef.current = { startX: e.clientX, startY: e.clientY, panX: mapPan.x, panY: mapPan.y };
  }, [mapZoom, mapPan, editMode, addMpanMode, addLabelMode, labelEditMode, cableMode, cableEditMode]);

  useEffect(() => {
    if (mapZoom <= 1) return;
    const onMove = (e: MouseEvent) => {
      if (!panRef.current || !mapRef.current) return;
      setIsPanning(true);
      const rect = mapRef.current.getBoundingClientRect();
      const maxX = ((mapZoom - 1) / 2) * rect.width;
      const maxY = ((mapZoom - 1) / 2) * rect.height;
      const nx = panRef.current.panX + (e.clientX - panRef.current.startX);
      const ny = panRef.current.panY + (e.clientY - panRef.current.startY);
      setMapPan({
        x: Math.max(-maxX, Math.min(maxX, nx)),
        y: Math.max(-maxY, Math.min(maxY, ny)),
      });
    };
    const onUp = () => { panRef.current = null; setIsPanning(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [mapZoom]);

  const handleFilterChange = useCallback((type: AssetType, checked: boolean) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(type);
      else next.delete(type);
      return next;
    });
  }, []);

  const handleBack = useCallback(() => {
    setIsExiting(true);
  }, []);

  const mapRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ id: string; startX: number; startY: number } | null>(null);

  const persist = useCallback((next: EnergyAsset[]) => {
    saveAssets(subMapId, next);
  }, [subMapId]);

  const handleOpen = useCallback((asset: EnergyAsset) => {
    if (editMode) return;
    // Close any sticker info panel before opening the marker SidePanel so
    // panels never stack on top of each other.
    stickerLib.setInfoItem(null);
    setSelectedAsset(asset);
    setHoveredId(null);
  }, [editMode, stickerLib]);

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
      const pt = screenToMapPct(e.clientX, e.clientY, rect, mapZoom, mapPan);
      const x = Math.max(0, Math.min(100, pt.x));
      const y = Math.max(0, Math.min(100, pt.y));
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
  }, [editMode, mapZoom, mapPan]);

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
    setAddLabelMode(false);
    setLabelEditMode(false);
    setPendingLabel(null);
  };


  const handleAddMpanConfirm = useCallback((type: AssetType, name: string, mpan: string, notes: string) => {
    if (!pendingMpan) return;
    const newAsset: EnergyAsset = {
      id: `submap-${subMapId}-mpan-${Date.now()}`,
      name,
      type,
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

  const handleAddLabelConfirm = useCallback((name: string) => {
    if (!pendingLabel) return;
    const newLabel: Site = {
      id: `submap-${subMapId}-label-${Date.now()}`,
      name,
      x: pendingLabel.x,
      y: pendingLabel.y,
    };
    setUserLabels((prev) => {
      const next = [...prev, newLabel];
      saveLabels(subMapId, next);
      return next;
    });
    setPendingLabel(null);
    setAddLabelMode(false);
  }, [pendingLabel, subMapId]);

  const handleLabelUpdate = useCallback((id: string, updates: Partial<Site>) => {
    setUserLabels((prev) => {
      const next = prev.map((l) => l.id === id ? { ...l, ...updates } : l);
      saveLabels(subMapId, next);
      return next;
    });
  }, [subMapId]);

  const handleLabelDelete = useCallback((id: string) => {
    setUserLabels((prev) => {
      const next = prev.filter((l) => l.id !== id);
      saveLabels(subMapId, next);
      return next;
    });
  }, [subMapId]);

  const handleDeleteAsset = useCallback((id: string) => {
    setAssets((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAssets(subMapId, next);
      return next;
    });
    setSelectedAsset((prev) => prev?.id === id ? null : prev);
    setHoveredId((prev) => prev === id ? null : prev);
  }, [subMapId]);

  const handleSetAssetQuantity = useCallback((id: string, q: number) => {
    const clamped = Math.max(1, Math.round(q));
    setAssets((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, quantity: clamped } : a));
      saveAssets(subMapId, next);
      return next;
    });
  }, [subMapId]);

  // ── Cables ──────────────────────────────────────────────────────────────
  // Snapshot the cable list onto the undo stack (call before any cable change).
  const snapshotCables = useCallback(() => {
    setCableHistory((h) => [...h.slice(-29), cableListRef.current]);
  }, []);

  const handleUndoCable = useCallback(() => {
    setCableHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCableList(prev);
      saveSubMapCables(subMapId, prev);
      return h.slice(0, -1);
    });
  }, [subMapId]);

  const handleEnterCableMode = useCallback(() => {
    setCableMode('hv');
    setDraftPoints([]);
    setCableCursor(null);
    setSelectedCableId(null);
    setSelectedAsset(null);
    setHoveredId(null);
    stickerLib.setSelectedId(null);
  }, [stickerLib.setSelectedId]);

  const handleFinishCable = useCallback(() => {
    if (cableMode && draftPoints.length >= 2) {
      snapshotCables();
      const newCable: Cable = { id: `cable-${Date.now()}`, type: cableMode, points: draftPoints };
      setCableList((prev) => {
        const next = [...prev, newCable];
        saveSubMapCables(subMapId, next);
        return next;
      });
    }
    setCableMode(null);
    setDraftPoints([]);
    setCableCursor(null);
  }, [cableMode, draftPoints, snapshotCables, subMapId]);

  const handleCancelCable = useCallback(() => {
    setCableMode(null);
    setDraftPoints([]);
    setCableCursor(null);
  }, []);

  // Edit-cables mode — only cables respond to clicks, so markers/stickers/labels
  // can't interfere with cable editing.
  const handleEnterCableEditMode = useCallback(() => {
    setCableEditMode(true);
    setEditMode(false);
    setAddMpanMode(false);
    setPendingMpan(null);
    setAddLabelMode(false);
    setPendingLabel(null);
    setLabelEditMode(false);
    setCableMode(null);
    setDraftPoints([]);
    setCableCursor(null);
    setSelectedAsset(null);
    setHoveredId(null);
    stickerLib.setSelectedId(null);
  }, [stickerLib.setSelectedId]);

  const handleExitCableEditMode = useCallback(() => {
    setCableEditMode(false);
    setSelectedCableId(null);
    setActiveCablePoint(null);
  }, []);

  const handleUndoCablePoint = useCallback(() => {
    setDraftPoints((prev) => prev.slice(0, -1));
  }, []);

  const handleDeleteCable = useCallback((id: string) => {
    snapshotCables();
    setCableList((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveSubMapCables(subMapId, next);
      return next;
    });
    setSelectedCableId(null);
  }, [snapshotCables, subMapId]);

  // Delete one point from a cable. Keeps at least 2.
  const handleDeleteCablePoint = useCallback((cableId: string, index: number) => {
    const target = cableListRef.current.find((c) => c.id === cableId);
    if (!target || target.points.length <= 2) return;
    snapshotCables();
    setCableList((prev) => {
      const next = prev.map((c) =>
        c.id === cableId ? { ...c, points: c.points.filter((_, i) => i !== index) } : c,
      );
      saveSubMapCables(subMapId, next);
      return next;
    });
    setActiveCablePoint(null);
  }, [snapshotCables, subMapId]);

  // Detach a cable point from its asset — it stays put but is no longer plugged in.
  const handleDetachCablePoint = useCallback((cableId: string, index: number) => {
    const target = cableListRef.current.find((c) => c.id === cableId);
    const pt = target?.points[index];
    if (!pt || !pt.assetId) return;
    const assetId = pt.assetId;
    snapshotCables();
    const pos = resolveCablePos(pt, assets);
    setCableList((prev) => {
      const next = prev.map((c) => {
        if (c.id !== cableId) return c;
        const freed = c.points.map((p) =>
          p.assetId === assetId && sameCablePos(resolveCablePos(p, assets), pos)
            ? { x: pos.x, y: pos.y }
            : p,
        );
        return { ...c, points: dedupeCablePoints(freed, assets) };
      });
      saveSubMapCables(subMapId, next);
      return next;
    });
    setActiveCablePoint(null);
  }, [snapshotCables, assets, subMapId]);

  const handleMapMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cableMode || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    setCableCursor(screenToMapPct(e.clientX, e.clientY, rect, mapZoom, mapPan));
  }, [cableMode, mapZoom, mapPan]);

  // Insert a new point at the midpoint of a cable segment.
  const handleAddCablePoint = useCallback((cableId: string, segIndex: number) => {
    snapshotCables();
    setCableList((prev) => {
      const next = prev.map((c) => {
        if (c.id !== cableId) return c;
        const a = c.points[segIndex];
        const b = c.points[segIndex + 1];
        if (!a || !b) return c;
        const ra = resolveCablePos(a, assets);
        const rb = resolveCablePos(b, assets);
        if (sameCablePos(ra, rb)) return c;
        const mid: CablePoint = { x: (ra.x + rb.x) / 2, y: (ra.y + rb.y) / 2 };
        return { ...c, points: [...c.points.slice(0, segIndex + 1), mid, ...c.points.slice(segIndex + 1)] };
      });
      saveSubMapCables(subMapId, next);
      return next;
    });
  }, [assets, snapshotCables, subMapId]);

  // Tap a cable segment to open its toolbar.
  const handleCableSegmentClick = useCallback((cableId: string, index: number) => {
    setSelectedCableId(cableId);
    setActiveCablePoint(null);
    setActiveCableSegment((prev) =>
      prev && prev.cableId === cableId && prev.index === index ? null : { cableId, index },
    );
  }, []);

  // Delete one segment of a cable — cutting a middle segment splits the cable.
  const handleDeleteCableSegment = useCallback((cableId: string, segIndex: number) => {
    snapshotCables();
    setCableList((prev) => {
      const result: Cable[] = [];
      for (const c of prev) {
        if (c.id !== cableId) { result.push(c); continue; }
        const left = c.points.slice(0, segIndex + 1);
        const right = c.points.slice(segIndex + 1);
        if (left.length >= 2) result.push({ id: c.id, type: c.type, points: left });
        if (right.length >= 2) {
          result.push({ id: `cable-${Date.now()}`, type: c.type, points: right });
        }
      }
      saveSubMapCables(subMapId, result);
      return result;
    });
    setActiveCableSegment(null);
    setSelectedCableId(null);
  }, [snapshotCables, subMapId]);

  // Recolour a single cable.
  const handleSetCableColor = useCallback((cableId: string, color: string) => {
    snapshotCables();
    setCableList((prev) => {
      const next = prev.map((c) => (c.id === cableId ? { ...c, color } : c));
      saveSubMapCables(subMapId, next);
      return next;
    });
  }, [snapshotCables, subMapId]);

  // Flip the direction the power-flow animation runs along a cable.
  const handleToggleCableFlow = useCallback((cableId: string) => {
    snapshotCables();
    setCableList((prev) => {
      const next = prev.map((c) => (c.id === cableId ? { ...c, flowReversed: !c.flowReversed } : c));
      saveSubMapCables(subMapId, next);
      return next;
    });
  }, [snapshotCables, subMapId]);

  // Drag a cable point to reshape it, or tap it to open its delete/detach toolbar.
  const handleCablePointDragStart = useCallback((cableId: string, index: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    cableDragRef.current = { cableId, index, startX: e.clientX, startY: e.clientY, moved: false };
    setSelectedCableId(cableId);
  }, []);

  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      const drag = cableDragRef.current;
      if (!drag || !mapRef.current) return;
      if (!drag.moved) {
        if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < 10) return;
        drag.moved = true;
        snapshotCables();
      }
      const rect = mapRef.current.getBoundingClientRect();
      const pt = screenToMapPct(ev.clientX, ev.clientY, rect, mapZoom, mapPan);
      setCableList((prev) => prev.map((c) =>
        c.id === drag.cableId
          ? { ...c, points: c.points.map((p, i) => (i === drag.index ? { x: pt.x, y: pt.y } : p)) }
          : c,
      ));
    };
    const onUp = (ev: MouseEvent) => {
      const drag = cableDragRef.current;
      if (!drag) return;
      cableDragRef.current = null;
      const netDist = Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY);
      const isTap = !drag.moved || netDist < 14;
      if (isTap) {
        setActiveCableSegment(null);
        setActiveCablePoint((prev) =>
          prev && prev.cableId === drag.cableId && prev.index === drag.index
            ? null
            : { cableId: drag.cableId, index: drag.index },
        );
        return;
      }
      let snapped: CablePoint | null = null;
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        const pt = screenToMapPct(ev.clientX, ev.clientY, rect, mapZoom, mapPan);
        const a = findSnapAsset(pt.x, pt.y, assets);
        if (a) snapped = { x: a.x, y: a.y, assetId: a.id };
      }
      setCableList((prev) => {
        let next = prev;
        if (snapped) {
          const s = snapped;
          next = prev.map((c) =>
            c.id === drag.cableId
              ? { ...c, points: c.points.map((p, i) => (i === drag.index ? s : p)) }
              : c,
          );
        }
        saveSubMapCables(subMapId, next);
        return next;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [mapZoom, mapPan, assets, snapshotCables, subMapId]);

  // Drag the whole cable — grab the move handle to translate every point at once.
  const handleCableMoveStart = useCallback((cableId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const cable = cableListRef.current.find((c) => c.id === cableId);
    if (!cable) return;
    cableMoveRef.current = {
      cableId,
      startX: e.clientX,
      startY: e.clientY,
      startPoints: cable.points,
      moved: false,
    };
    setSelectedCableId(cableId);
  }, []);

  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      const drag = cableMoveRef.current;
      if (!drag || !mapRef.current) return;
      if (!drag.moved) {
        if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < 4) return;
        drag.moved = true;
        snapshotCables();
      }
      const rect = mapRef.current.getBoundingClientRect();
      const a = screenToMapPct(drag.startX, drag.startY, rect, mapZoom, mapPan);
      const b = screenToMapPct(ev.clientX, ev.clientY, rect, mapZoom, mapPan);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      setCableList((prev) => prev.map((c) =>
        c.id === drag.cableId
          ? { ...c, points: drag.startPoints.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) }
          : c,
      ));
    };
    const onUp = () => {
      const drag = cableMoveRef.current;
      if (!drag) return;
      cableMoveRef.current = null;
      if (drag.moved) saveSubMapCables(subMapId, cableListRef.current);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [mapZoom, mapPan, snapshotCables, subMapId]);

  // Close the point/segment toolbars whenever the selected cable changes.
  useEffect(() => {
    setActiveCablePoint(null);
    setActiveCableSegment(null);
  }, [selectedCableId]);

  // Ctrl/Cmd+Z undoes the last cable change.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        handleUndoCable();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndoCable]);

  const handleMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (cableMode && mapRef.current) {
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      const pt = screenToMapPct(e.clientX, e.clientY, rect, mapZoom, mapPan);
      const snap = findSnapAsset(pt.x, pt.y, assets);
      const point: CablePoint = snap
        ? { x: snap.x, y: snap.y, assetId: snap.id }
        : { x: pt.x, y: pt.y };
      setDraftPoints((prev) => [...prev, point]);
      return;
    }
    if (!addMpanMode && !addLabelMode) {
      // a plain click on empty map space — deselect any selected sticker / cable
      stickerLib.setSelectedId(null);
      setSelectedCableId(null);
      return;
    }
    if (addMpanMode && mapRef.current) {
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      setPendingMpan(screenToMapPct(e.clientX, e.clientY, rect, mapZoom, mapPan));
      return;
    }
    if (addLabelMode && mapRef.current) {
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      setPendingLabel(screenToMapPct(e.clientX, e.clientY, rect, mapZoom, mapPan));
    }
  }, [cableMode, addMpanMode, addLabelMode, stickerLib.setSelectedId, mapZoom, mapPan, assets]);

  if (!subMap) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Sub-map not found.
      </div>
    );
  }

  return (
    <div
      className={`h-screen overflow-hidden bg-slate-100 flex flex-col ${isExiting ? 'submap-exit' : 'submap-enter'}`}
      style={{ transformOrigin: `${originX}% ${originY}%` }}
      onAnimationEnd={isExiting ? onBack : undefined}
    >
      {/* Header — allows horizontal scroll if the toolbar buttons don't
          fit, so the page below can't overflow horizontally. */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm overflow-x-auto">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-semibold shadow-sm hover:bg-emerald-400 transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
          <span className="text-xs">Overview</span>
        </button>

        <div className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-2">
          <MapPin size={13} className="text-blue-500 shrink-0" />
          <div className="leading-tight">
            <h1 className="text-sm font-bold text-gray-900">{subMap.name}</h1>
            <p className="text-[9px] text-gray-400">Copyright Clearvolt Limited. For CFG use only.</p>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          <span className="font-semibold text-gray-700">{assets.length}</span> markers
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !VIEW_ONLY && (
            <button
              onClick={() => { setAddMpanMode(true); setEditMode(false); setLocked(false); setSelectedAsset(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <Plus size={13} />
              Add MPAN
            </button>
          )}

          {/* Add cable button */}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !VIEW_ONLY && (
            <button
              data-testid="btn-add-cable"
              onClick={handleEnterCableMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <CableIcon size={13} />
              Add cable
            </button>
          )}

          {/* Edit cables button */}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !VIEW_ONLY && (
            <button
              data-testid="btn-edit-cables"
              onClick={handleEnterCableEditMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <Move size={13} />
              Edit cables
            </button>
          )}
          {cableEditMode && (
            <button
              onClick={handleExitCableEditMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              <Check size={13} />
              Done editing cables
            </button>
          )}

          {/* Add label button — always visible unless another mode is active */}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !VIEW_ONLY && (
            <button
              onClick={() => { setAddLabelMode(true); setEditMode(false); setLocked(false); setSelectedAsset(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Tag size={13} />
              Add label
            </button>
          )}

          {/* Add sticker button */}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !VIEW_ONLY && (
            <button
              data-testid="btn-add-sticker"
              onClick={() => stickerLib.setPickerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Sticker size={13} />
              Add sticker
            </button>
          )}

          {/* Edit Sticker Mode toggle */}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !VIEW_ONLY && (
            <button
              data-testid="btn-edit-stickers"
              onClick={() => stickerLib.setStickerEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Move size={13} />
              Edit stickers
            </button>
          )}
          {stickerLib.stickerEditMode && (
            <button
              data-testid="btn-done-stickers"
              onClick={() => stickerLib.setStickerEditMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <Check size={13} />
              Done editing stickers
            </button>
          )}

          {/* Edit labels button — only when labels exist */}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && userLabels.length > 0 && !VIEW_ONLY && (
            <button
              onClick={() => setLabelEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Edit labels
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

          {labelEditMode && (
            <button
              onClick={() => setLabelEditMode(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Done editing
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

          {!editMode && !locked && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !VIEW_ONLY && (
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
                Drag to reposition · click ✕ to delete
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

      {/* Add label mode banner */}
      {addLabelMode && (
        <div className="bg-indigo-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          Click anywhere on the map to place a text label
          <button
            onClick={() => { setAddLabelMode(false); setPendingLabel(null); }}
            className="ml-auto text-indigo-200 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Label edit mode banner */}
      {labelEditMode && (
        <div className="bg-indigo-50 border-b border-indigo-200 text-indigo-700 px-6 py-2 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
          Drag labels to reposition. Click ✕ on a label to delete it.
          <button
            onClick={() => setLabelEditMode(false)}
            className="ml-auto text-indigo-500 hover:text-indigo-800 underline"
          >
            Done
          </button>
        </div>
      )}

      {/* Add cable mode banner */}
      {cableMode && (
        <div className="bg-amber-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <span className="hidden md:inline">Click to lay cable points · click a marker to plug in · 3+ points curve</span>
          <div className="flex items-center gap-1 bg-amber-700/50 rounded-md p-0.5 shrink-0">
            {ALL_CABLE_TYPES.map((t) => {
              const active = cableMode === t;
              return (
                <button
                  key={t}
                  data-testid={`cable-type-${t}`}
                  onClick={() => setCableMode(t)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${active ? 'bg-white text-amber-700' : 'text-amber-100 hover:text-white'}`}
                >
                  {cableTypeConfig[t].label}
                </button>
              );
            })}
          </div>
          <span className="text-amber-200 shrink-0">{draftPoints.length} point{draftPoints.length === 1 ? '' : 's'}</span>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            {draftPoints.length > 0 && (
              <button onClick={handleUndoCablePoint} className="text-amber-200 hover:text-white underline">
                Undo point
              </button>
            )}
            <button
              data-testid="btn-finish-cable"
              onClick={handleFinishCable}
              disabled={draftPoints.length < 2}
              className="px-3 py-1 rounded bg-white text-amber-700 font-semibold hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Finish cable
            </button>
            <button onClick={handleCancelCable} className="text-amber-200 hover:text-white underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit cables mode banner */}
      {cableEditMode && (
        <div className="bg-amber-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <span>Edit cables. Click a cable to select it <span className="font-bold">then pick a colour</span> · drag points to move · <span className="font-bold">click a point</span> to delete / detach it · <span className="font-bold">click a segment</span> to delete it · <span className="font-bold">+</span> adds a point</span>
          <button
            onClick={handleExitCableEditMode}
            className="ml-auto text-amber-100 hover:text-white underline shrink-0"
          >
            Done
          </button>
        </div>
      )}


      {/* Map area — same fit-in-viewport treatment as the overview:
          the 16:9 sub-map always fits inside the visible area with
          letterbox bars on whichever axis has slack. No scrolling required. */}
      <main className="flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-gray-100">
        {/* The three columns are wrapped in a block that sizes to the map's own
            height (the map keeps its size; the block is only as tall as the map),
            so the side panels reach exactly the map's bottom edge — no white band
            under the map, no columns overrunning it. The block is centred in the
            available area. */}
        <div data-testid="submap-row" className="flex items-stretch w-full max-h-full">
        {/* ── LEFT dashboard — this sub-map's Assets list + toggles ── */}
        {!editMode && (
          <aside data-testid="submap-left-dashboard" className="hidden xs:flex flex-col gap-3 flex-1 min-w-[190px] overflow-hidden bg-slate-50 border-r border-gray-200 p-3">
            {!legendHidden && (
              <Legend
                embedded
                onlySubmap={subMapId}
                stickersByView={stickerLib.stickersByView}
                siteAssets={siteAssetsIndex}
                onHoverAsset={setHighlight}
                onSelectAsset={(a) => { setHighlight(null); handleOpen(a); }}
                onSelectSite={(site) => { setHighlight(null); setSelectedAsset(null); stickerLib.setInfoItem(assetToPanelItem(site)); }}
              />
            )}
            <div className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden text-xs font-semibold text-gray-700 shrink-0">
              {stickerLib.placed.length > 0 && (
                <button data-testid="btn-toggle-stickers" onClick={() => setStickersHidden((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-50 transition-colors" title={stickersHidden ? 'Show all stickers' : 'Hide all stickers'}>
                  <Sticker size={13} className={stickersHidden ? 'text-gray-400' : 'text-indigo-500'} />
                  {stickersHidden ? 'Show stickers' : 'Hide stickers'}
                </button>
              )}
              {userLabels.length > 0 && (
                <button data-testid="btn-toggle-labels" onClick={() => setLabelsHidden((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-200 hover:bg-gray-50 transition-colors" title={labelsHidden ? 'Show all labels' : 'Hide all labels'}>
                  <Tag size={13} className={labelsHidden ? 'text-gray-400' : 'text-indigo-500'} />
                  {labelsHidden ? 'Show labels' : 'Hide labels'}
                </button>
              )}
              <button data-testid="btn-toggle-legend" onClick={handleToggleLegend} className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-200 hover:bg-gray-50 transition-colors" title={legendHidden ? 'Show the assets panel' : 'Hide the assets panel'}>
                <List size={13} className={legendHidden ? 'text-gray-400' : 'text-indigo-500'} />
                {legendHidden ? 'Show assets' : 'Hide assets'}
              </button>
              <button data-testid="btn-toggle-filter" onClick={handleToggleFilter} className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-200 hover:bg-gray-50 transition-colors" title={filterHidden ? 'Show the infrastructure index' : 'Hide the infrastructure index'}>
                <Filter size={13} className={filterHidden ? 'text-gray-400' : 'text-indigo-500'} />
                {filterHidden ? 'Show index' : 'Hide index'}
              </button>
            </div>
          </aside>
        )}

        {/* ── CENTER — the map ── */}
        {/* Cap the map width on wide screens so the two dashboard columns get a
            comfortable ~250px each (enough for full index labels), letterboxing
            the map slightly rather than starving the side panels. */}
        <div className="shrink-0 w-full lg:w-[calc(100%_-_560px)] flex items-center justify-center overflow-hidden relative p-3">
        <div
          ref={mapRef}
          data-testid="map-container"
          className={`relative rounded-xl overflow-hidden shadow-xl border border-gray-200 bg-white mx-auto ${
            editMode || addMpanMode || addLabelMode || cableMode
              ? 'cursor-crosshair'
              : mapZoom > 1
                ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
                : ''
          }`}
          style={{
            aspectRatio: '16 / 9',
            width: '100%',
            maxHeight: '100%',
          }}
          onClick={handleMapClick}
          onMouseDown={handleMapMouseDown}
          onMouseMove={handleMapMouseMove}
        >
          {/* Zoomable inner layer */}
          <div
            data-testid="map-zoom-layer"
            style={{
              transformOrigin: '50% 50%',
              transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
              transition: isPanning ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
          {/* The aspect-ratio lock now sits on the mapRef container above,
              so the image just fills it (object-cover preserves the
              satellite imagery without stretching). */}
          <img
            src={subMap.image}
            alt={subMap.name}
            className="w-full h-full block"
            style={{ objectFit: 'cover' }}
            draggable={false}
          />

          {/* Fixed HV / LV services-duct overlay — CFA sub-map only */}
          {subMapId === 'cfa-map' && (
            <ServicesDuctOverlay showHv={showHvDucts} showLv={showLvDucts} />
          )}

          {/* User library stickers placed on this sub-map */}
          {!stickersHidden && stickerLib.placed.map(({ sticker, placement }) => (
            <StickerOverlay
              key={sticker.id}
              id={sticker.id}
              label={sticker.label}
              src={sticker.src}
              transform={placement}
              mapRef={mapRef}
              zoom={mapZoom}
              disabled={cableEditMode}
              framed={sticker.framed}
              objectPosition={sticker.objectPosition}
              editMode={stickerLib.stickerEditMode}
              // Every sticker click in a sub-map opens the same in-context
              // info panel. The previous "chooser" modal (7-card Etihad site
              // picker, 6-card CFA picker) is removed per user request —
              // clicking a big photo sticker should give you the whole-site
              // overview panel, not force you to pick a sub-building first.
              // Close the marker SidePanel first so panels never stack.
              onOpenInfo={() => {
                setSelectedAsset(null);
                stickerLib.setInfoItem(stickerToPanelItem(sticker));
              }}
              selected={stickerLib.selectedId === sticker.id}
              onSelect={() => stickerLib.setSelectedId(sticker.id)}
              onUpdate={(updates) => stickerLib.updateSticker(sticker.id, updates)}
              onDelete={() => stickerLib.removeSticker(sticker.id)}
              labelsLayer={stickerLabelsLayer}
              supersedingLabelNames={supersedingLabelNames}
            />
          ))}

          {/* Free text labels */}
          {(!labelsHidden || labelEditMode) && userLabels.map((label) => (
            <FreeLabel
              key={label.id}
              site={label}
              mapRef={mapRef}
              zoom={mapZoom}
              disabled={cableEditMode}
              editMode={labelEditMode}
              onUpdate={handleLabelUpdate}
              onDelete={handleLabelDelete}
            />
          ))}

          {/* Cables — z-index 10, below markers (lifted above in edit mode) */}
          <CableLayer
            cables={cableList}
            assets={assets}
            draft={cableMode ? { type: cableMode, points: draftPoints, cursor: cableCursor } : null}
            selectedCableId={selectedCableId}
            interactive={cableEditMode}
            onSelectCable={setSelectedCableId}
            onDeleteCable={handleDeleteCable}
            onPointDragStart={handleCablePointDragStart}
            onCableMoveStart={handleCableMoveStart}
            onAddPoint={handleAddCablePoint}
            onSegmentClick={handleCableSegmentClick}
            onDeleteSegment={handleDeleteCableSegment}
            onDeletePoint={handleDeleteCablePoint}
            activeCablePoint={activeCablePoint}
            activeCableSegment={activeCableSegment}
          />

          {/* Action toolbar for the tapped cable point */}
          {cableEditMode && activeCablePoint && selectedCableId === activeCablePoint.cableId && (() => {
            const cable = cableList.find((c) => c.id === activeCablePoint.cableId);
            const point = cable?.points[activeCablePoint.index];
            if (!cable || !point) return null;
            const pos = resolveCablePos(point, assets);
            return (
              <div
                data-testid="cable-point-toolbar"
                className="absolute flex items-center gap-0.5 bg-white rounded-lg border border-gray-200 shadow-xl p-1"
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, calc(-100% - 16px))', zIndex: 36 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {point.assetId && (
                  <button
                    data-testid="btn-detach-point"
                    onClick={() => handleDetachCablePoint(activeCablePoint.cableId, activeCablePoint.index)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-amber-700 hover:bg-amber-50 transition-colors whitespace-nowrap"
                  >
                    <Unlink size={12} />
                    Detach
                  </button>
                )}
                <button
                  data-testid="btn-delete-point"
                  onClick={() => handleDeleteCablePoint(activeCablePoint.cableId, activeCablePoint.index)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  <Trash2 size={12} />
                  Delete point
                </button>
              </div>
            );
          })()}

          {/* Action toolbar for the tapped cable segment */}
          {cableEditMode && activeCableSegment && selectedCableId === activeCableSegment.cableId && (() => {
            const cable = cableList.find((c) => c.id === activeCableSegment.cableId);
            const a = cable?.points[activeCableSegment.index];
            const b = cable?.points[activeCableSegment.index + 1];
            if (!cable || !a || !b) return null;
            const pa = resolveCablePos(a, assets);
            const pb = resolveCablePos(b, assets);
            const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
            return (
              <div
                data-testid="cable-segment-toolbar"
                className="absolute flex items-center gap-0.5 bg-white rounded-lg border border-gray-200 shadow-xl p-1"
                style={{ left: `${mid.x}%`, top: `${mid.y}%`, transform: 'translate(-50%, calc(-100% - 16px))', zIndex: 36 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  data-testid="btn-delete-segment"
                  onClick={() => handleDeleteCableSegment(activeCableSegment.cableId, activeCableSegment.index)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
                >
                  <Scissors size={12} />
                  Delete segment
                </button>
              </div>
            );
          })()}

          {/* Colour palette for the selected cable */}
          {cableEditMode && selectedCableId && !activeCablePoint && !activeCableSegment && (() => {
            const cable = cableList.find((c) => c.id === selectedCableId);
            if (!cable || !cable.points.length) return null;
            const anchor = resolveCablePos(cable.points[0], assets);
            const current = cable.color ?? cableTypeConfig[cable.type].color;
            return (
              <div
                data-testid="cable-color-toolbar"
                className="absolute flex items-center gap-1 bg-white rounded-lg border border-gray-200 shadow-xl px-1.5 py-1"
                style={{ left: `${anchor.x}%`, top: `${anchor.y}%`, transform: 'translate(-50%, calc(-100% - 52px))', zIndex: 36 }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {CABLE_COLORS.map((c) => {
                  const isCurrent = current.toLowerCase() === c.toLowerCase();
                  return (
                    <button
                      key={c}
                      data-testid={`cable-color-${c}`}
                      onClick={() => handleSetCableColor(cable.id, c)}
                      className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: c,
                        outline: isCurrent ? '2px solid #111827' : '1px solid rgba(0,0,0,0.15)',
                        outlineOffset: isCurrent ? 1 : 0,
                      }}
                      title={`Colour: ${c}`}
                    />
                  );
                })}
                <div className="w-px h-5 bg-gray-200 mx-0.5" />
                <button
                  data-testid="btn-toggle-flow"
                  onClick={() => handleToggleCableFlow(cable.id)}
                  className="flex items-center justify-center w-6 h-6 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Swap power-flow direction"
                >
                  <ArrowLeftRight size={13} />
                </button>
              </div>
            );
          })()}

          {/* MPAN markers */}
          {assets.filter((a) => visibleTypes.has(a.idno ? 'idno' : a.type)).map((asset) => {
            const isHovered = hoveredId === asset.id;
            const isDragging = draggingRef.current?.id === asset.id;
            const meta = assetTypeConfig[asset.type];
            const TypeIcon = meta.Icon;
            // IDNO markers keep their real icon but take the IDNO colour.
            const markerColor = asset.idno ? assetTypeConfig['idno'].color : meta.color;
            // Infrastructure-index highlight: does this marker match what the
            // FilterPanel is hovering (a whole type, or one specific asset)?
            const matchesHighlight = highlight
              ? (highlight.ids ? highlight.ids.includes(asset.id)
                  : highlight.id ? highlight.id === asset.id
                  : highlight.type === (asset.idno ? 'idno' : asset.type))
              : false;
            const dimmed = highlight != null && !matchesHighlight;
            // Building markers render a little larger so they stand out;
            // wind turbines larger still, so the spinning-blade animation reads.
            // Wind turbines render as a refined white silhouette with a
            // restrained shadow stack (no circular pill, no neon glow).
            // Substations sit a touch bigger than ordinary markers because
            // each one represents a significant chunk of campus electrical
            // infrastructure.
            const markerSize = asset.type === 'wind-turbine' ? 70
              : asset.type === 'building' ? 30
              : asset.type === 'substation' ? 32
              : 23;
            const markerIcon = asset.type === 'wind-turbine' ? 62
              : asset.type === 'building' ? 16
              : asset.type === 'substation' ? 19
              : 13;
            return (
              <div
                key={asset.id}
                className="absolute"
                style={{
                  left: `${asset.x}%`,
                  top: `${asset.y}%`,
                  transform: 'translate(-50%, -50%)',
                  // Hovered/dragging markers lift above the sticker labels
                  // layer (z 25) so their tooltip isn't covered by a nearby
                  // building name.
                  zIndex: (isHovered || isDragging || matchesHighlight) ? 35 : 20,
                  cursor: editMode ? 'grab' : 'pointer',
                  userSelect: 'none',
                  opacity: dimmed ? 0.35 : 1,
                  transition: 'opacity 0.15s ease',
                  // In cable-edit mode the cable layer sits above markers and
                  // owns every click, so markers must not intercept events.
                  pointerEvents: cableEditMode ? 'none' : undefined,
                }}
                onMouseEnter={() => { if (!editMode && !cableMode) openHover(asset.id); }}
                onMouseLeave={scheduleHoverClose}
                onMouseDown={(e) => handleMarkerMouseDown(e, asset.id)}
                onClick={() => { if (!editMode && !cableMode) handleOpen(asset); }}
              >
                {matchesHighlight && (() => {
                  let dir: 'left' | 'right' | 'top' | 'bottom' = 'left';
                  if (highlightCentroid) {
                    const dx = asset.x - highlightCentroid.x;
                    const dy = asset.y - highlightCentroid.y;
                    dir = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'bottom' : 'top');
                    // Solar arrays always come in from the right so they don't
                    // collide with the meter/inverter arrows above and below them.
                    if (asset.type === 'solar-panel' && !asset.idno) dir = 'right';
                  }
                  // One specific asset hovered → 2.5x arrow + pulsing ring.
                  const big = isSingleHighlight;
                  const w = big ? 132 : 72;
                  const h = big ? 88 : 48;
                  const gap = big ? 11 : 8;
                  const POS = {
                    left:   { right: `calc(100% + ${gap}px)`, top: '50%', transform: 'translateY(-50%)' },
                    right:  { left: `calc(100% + ${gap}px)`, top: '50%', transform: 'translateY(-50%) rotate(180deg)' },
                    top:    { bottom: `calc(100% + ${gap + 2}px)`, left: '50%', transform: 'translateX(-50%) rotate(90deg)' },
                    bottom: { top: `calc(100% + ${gap + 2}px)`, left: '50%', transform: 'translateX(-50%) rotate(-90deg)' },
                  } as const;
                  return (
                  <>
                    {big && (
                      <span
                        className="marker-focus-ring absolute left-1/2 top-1/2 pointer-events-none z-10 rounded-full"
                        style={{ width: markerSize * 2.6, height: markerSize * 2.6, marginLeft: -(markerSize * 1.3), marginTop: -(markerSize * 1.3), border: `3px solid ${markerColor}` }}
                        aria-hidden
                      />
                    )}
                    <span className="absolute pointer-events-none z-20" style={POS[dir]} aria-hidden>
                      <svg className="marker-arrow-in block" width={w} height={h} viewBox="0 0 60 40" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))' }}>
                        <path d="M2 13 H38 V6 L58 20 L38 34 V27 H2 Z" fill="#111827" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </>
                  );
                })()}
                <button
                  className="relative flex items-center justify-center focus:outline-none"
                  style={{ width: markerSize, height: markerSize,
                      // The marker the hover arrow points at grows 50% so the
                      // eye lands on it, not just the arrow.
                      transform: matchesHighlight ? 'scale(1.5)' : undefined,
                      transition: 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)' }}
                  aria-label={asset.name}
                  tabIndex={editMode ? -1 : 0}
                >
                  {asset.type !== 'wind-turbine' && (
                    <span
                      className={`absolute rounded-full ${editMode ? '' : 'marker-pulse'}`}
                      style={{
                        width: markerSize,
                        height: markerSize,
                        color: markerColor,
                        background: markerColor,
                        border: `2px solid ${editMode ? '#fbbf24' : 'white'}`,
                        transition: 'box-shadow 0.15s ease',
                        boxShadow: editMode
                          ? '0 0 0 3px rgba(251,191,36,0.4), 0 2px 8px rgba(0,0,0,0.4)'
                          : matchesHighlight
                            ? `0 0 0 3px white, 0 0 9px 2px ${markerColor}`
                            : undefined,
                      }}
                    />
                  )}
                  <TypeIcon
                    size={markerIcon}
                    className={
                      asset.type === 'wind-turbine'
                        ? 'relative z-10 text-white wind-spin wind-marker-icon'
                        : 'relative z-10 text-white'
                    }
                    strokeWidth={asset.type === 'wind-turbine' ? 2 : 2.5}
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

                {editMode && (
                  <button
                    data-testid={`marker-delete-${asset.id}`}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => { e.stopPropagation(); handleDeleteAsset(asset.id); }}
                    className="absolute flex items-center justify-center rounded-full bg-gray-900 text-white hover:bg-red-600 transition-colors shadow-md"
                    style={{ width: 16, height: 16, top: -9, right: -9, zIndex: 35, cursor: 'pointer' }}
                    title={`Delete ${asset.name}`}
                    aria-label={`Delete ${asset.name}`}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                )}

                {!editMode && isHovered && (
                  <MarkerTooltip asset={asset} onViewData={() => handleOpen(asset)} onDelete={() => handleDeleteAsset(asset.id)} onSetQuantity={(q) => handleSetAssetQuantity(asset.id, q)} flipDown={asset.y < 25} />
                )}
              </div>
            );
          })}

          {/* Portal target for sticker name labels — z above markers so
              labels are never covered by infrastructure icons. */}
          <div
            ref={setStickerLabelsLayer}
            data-testid="sticker-labels-layer"
            className="absolute inset-0"
            style={{ zIndex: 25, pointerEvents: 'none' }}
          />
          </div>
          {/* end zoomable layer */}

          {/* Assets legend moved to the left dashboard column (see the <aside>). */}

          {/* Zoom controls — bottom-right */}
          <div
            className="absolute bottom-3 right-3 z-20 flex flex-col bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              data-testid="btn-map-zoom-in"
              onClick={handleMapZoomIn}
              disabled={mapZoom >= MAX_ZOOM}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom in"
            >
              <Plus size={15} />
            </button>
            <button
              data-testid="btn-map-zoom-reset"
              onClick={handleMapZoomReset}
              className="h-6 flex items-center justify-center text-[10px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 border-y border-gray-200 transition-colors"
              title="Reset zoom"
            >
              {Math.round(mapZoom * 100)}%
            </button>
            <button
              data-testid="btn-map-zoom-out"
              onClick={handleMapZoomOut}
              disabled={mapZoom <= MIN_ZOOM}
              className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom out"
            >
              <Minus size={15} />
            </button>
          </div>

          {/* Services-duct key moved to the right dashboard column. */}

          {/* Sticker / label / assets-panel visibility toggles — bottom-left.
              Always rendered now, because the "Hide assets" toggle is always
              available even when there are no stickers or labels. */}
          <div
            className="absolute bottom-3 left-3 z-20 flex flex-col items-start gap-2"
            onClick={(e) => e.stopPropagation()}
          >
          {cableHistory.length > 0 && (
            <button
              data-testid="btn-undo-cable"
              onClick={handleUndoCable}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              title="Undo last cable change (Ctrl+Z)"
            >
              <Undo2 size={13} className="text-gray-500" />
              Undo cable edit
            </button>
          )}
          {/* Sticker/label/assets/index toggles moved to the left dashboard column. */}
          </div>
        </div>
        </div>

        {/* ── RIGHT dashboard — this sub-map's Infrastructure Index ── */}
        {!editMode && (!filterHidden || subMapId === 'cfa-map') && (
          <aside data-testid="submap-right-dashboard" className="hidden xs:flex flex-col gap-3 flex-1 min-w-[190px] overflow-y-auto bg-slate-50 border-l border-gray-200 p-3">
            {!filterHidden && (
              <FilterPanel
                embedded
                visible={visibleTypes}
                onChange={handleFilterChange}
                assets={assets}
                onHover={setHighlight}
                onSelect={(a) => { setHighlight(null); handleOpen(a); }}
              />
            )}
            {subMapId === 'cfa-map' && (
              <div data-testid="services-duct-legend" className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 shrink-0">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5 leading-none">Services Ducts</p>
                <div className="flex flex-col gap-0.5">
                  <button data-testid="toggle-lv-ducts" onClick={() => setShowLvDucts((v) => !v)} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-gray-100 transition-colors" title={showLvDucts ? 'Hide LV services ducts' : 'Show LV services ducts'}>
                    <span className="shrink-0 rounded-full transition-colors" style={{ width: 22, height: 3, background: showLvDucts ? '#c026d3' : '#d1d5db' }} />
                    <span className={`text-xs font-medium ${showLvDucts ? 'text-gray-700' : 'text-gray-400'}`}>LV Services Duct</span>
                    {showLvDucts ? <Eye size={12} className="ml-auto text-gray-500" /> : <EyeOff size={12} className="ml-auto text-gray-300" />}
                  </button>
                  <button data-testid="toggle-hv-ducts" onClick={() => setShowHvDucts((v) => !v)} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-gray-100 transition-colors" title={showHvDucts ? 'Hide HV services ducts' : 'Show HV services ducts'}>
                    <span className="shrink-0 rounded-full transition-colors" style={{ width: 22, height: 3, background: showHvDucts ? '#06b6d4' : '#d1d5db' }} />
                    <span className={`text-xs font-medium ${showHvDucts ? 'text-gray-700' : 'text-gray-400'}`}>HV Services Duct</span>
                    {showHvDucts ? <Eye size={12} className="ml-auto text-gray-500" /> : <EyeOff size={12} className="ml-auto text-gray-300" />}
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
        </div>
      </main>

      {!editMode && (
        <SidePanel asset={selectedAsset} onClose={() => setSelectedAsset(null)} onDelete={handleDeleteAsset} />
      )}

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
          onCancel={() => { setPendingLabel(null); setAddLabelMode(false); }}
        />
      )}

      {stickerLib.pickerOpen && (
        <StickerPicker
          available={stickerLib.available}
          onPick={stickerLib.placeSticker}
          onUpload={stickerLib.addUpload}
          onDeleteUpload={stickerLib.deleteUpload}
          onClose={() => stickerLib.setPickerOpen(false)}
        />
      )}

      {stickerLib.infoItem && (
        <AssetInfoPanel
          item={stickerLib.infoItem}
          onClose={() => stickerLib.setInfoItem(null)}
        />
      )}
    </div>
  );
}
