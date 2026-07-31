import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Move, Lock, Unlock, Check, ZoomOut, Plus, Minus, Tag, X, Sticker, Cable as CableIcon, Undo2, Trash2, Unlink, Scissors, ArrowLeftRight, Frame, List, Filter, Download } from 'lucide-react';
import { EnergyAsset, AssetType } from '@/data/assets';
import { assetTypeConfig, ENABLED_TYPES } from '@/data/assetTypes';
import { sites as configSites, Site } from '@/data/sites';
import { stickers as configStickers } from '@/data/stickers';
import { cables as configCables, Cable, CableType, CablePoint, cableTypeConfig, ALL_CABLE_TYPES, CABLE_COLORS } from '@/data/cables';
import { CableLayer } from './CableLayer';
import { MarkerTooltip } from './MarkerTooltip';
import { SidePanel } from './SidePanel';
import { Legend } from './Legend';
import { FilterPanel, HighlightTarget } from './FilterPanel';
import { SiteLabel } from './SiteLabel';
import { StickerOverlay, StickerTransform } from './StickerOverlay';
import { StickerPicker } from './StickerPicker';
import { AssetInfoPanel } from './AssetInfoPanel';
import { useStickerLibrary, stickerToPanelItem, assetToPanelItem } from '@/data/stickerLibrary';
import { VIEW_ONLY } from '@/viewOnly';
import { AddMpanDialog } from './AddMpanDialog';
import { SubMapView } from './SubMapView';
import { DataPanel, consumptionData, generationData } from './DataPanel';
import { EnergyBarChartModal } from './EnergyBarChartModal';
import { SavingsSummaryModal } from './SavingsSummaryModal';
import { TableModal } from './TableModal';
import { WindScenarioModal } from './WindScenarioModal';
import { AddLabelDialog } from './AddLabelDialog';
import { FreeLabel } from './FreeLabel';
import { submaps } from '@/data/submaps';
import { SITE_ASSET_GROUPS } from '@/data/siteAssetGroups';
import { RegionBox } from './RegionBox';
import { loadSubMapRegions, saveSubMapRegions, SubMapRegion } from '@/data/submapRegions';
import mapImage from '@assets/Overview_1779198593346.png';
import mcfcLogo from '@assets/images_(1)_1779205796102.png';

const STORAGE_KEY = 'energy-map-positions';
const STICKER_STORAGE_KEY = 'energy-map-sticker-transforms';
const USER_ASSETS_KEY = 'energy-map-user-assets';
const STICKERS_HIDDEN_KEY = 'energy-map-stickers-hidden';
const LABELS_HIDDEN_KEY = 'energy-map-labels-hidden';
const LEGEND_HIDDEN_KEY = 'energy-map-legend-hidden';
const FILTER_HIDDEN_KEY = 'energy-map-filter-hidden';

function loadUserAssets(): EnergyAsset[] {
  try {
    const raw = localStorage.getItem(USER_ASSETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// Read a sub-map's own assets — used to project them onto the overview.
function loadSubMapAssets(subMapId: string): EnergyAsset[] {
  try {
    const raw = localStorage.getItem(`energy-submap-${subMapId}-assets`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

const OVERVIEW_POSITIONS_KEY = 'energy-map-overview-positions';

// Per-asset overview position overrides for projected sub-map assets. An asset's
// overview position is independent of its sub-map position — moving it on the
// overview is stored here and never changes where it sits on its sub-map.
function loadOverviewPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(OVERVIEW_POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveOverviewPositions(positions: Record<string, { x: number; y: number }>) {
  try {
    localStorage.setItem(OVERVIEW_POSITIONS_KEY, JSON.stringify(positions));
  } catch { /* quota — non-fatal */ }
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

const DELETED_ASSETS_KEY = 'energy-map-deleted-assets';

function loadDeletedAssets(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ASSETS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveDeletedAssets(ids: Set<string>) {
  localStorage.setItem(DELETED_ASSETS_KEY, JSON.stringify([...ids]));
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

// Distinct outline colours for the sub-map region calibration boxes.
const REGION_COLORS = ['#4f46e5', '#0891b2', '#db2777'];

// Markers / labels with these names open the rich asset info panel (image
// banner + photo uploader) instead of the plain marker panel.
const PANEL_NAMES = new Set([
  'Facilities Management Building',
  'FM Building',
  'TV Studio',
  'Mama Mia Building',
  'Cable A',
  'Cable B',
]);
const CABLES_KEY = 'energy-map-cables';
// % distance within which a cable point plugs into an asset. Kept small so a
// point only latches when dropped right on a marker — leaving room to place
// points freely between two nearby assets.
const CABLE_SNAP_DIST = 1.4;

function loadCables(): Cable[] {
  try {
    const raw = localStorage.getItem(CABLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCables(list: Cable[]) {
  try {
    localStorage.setItem(CABLES_KEY, JSON.stringify(list.filter((c) => c.id.startsWith('cable-'))));
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

// Collapse runs of coincident points (zero-length segments) into a single
// point. These pile up when a cable is plugged into the same asset more than
// once, and make the cable impossible to detach — every tap only frees one of
// the hidden stack. Keeps an asset anchor if any point in the run had one.
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

// Convert a screen point to a logical map percentage, accounting for the zoom
// layer's `translate(pan) scale(zoom)` transform (transform-origin = centre).
// At zoom 1 / pan 0 this reduces exactly to the un-zoomed formula.
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

export function EnergyMap() {
  // The overview keeps only its own editable battery markers. All other
  // infrastructure is owned by the sub-maps and projected in (see below).
  const [assets, setAssets] = useState<EnergyAsset[]>(() => mergePositions(loadUserAssets()));
  const [siteState, setSiteState] = useState<Site[]>(() => initSites());
  const [labelEditMode, setLabelEditMode] = useState(false);
  const [addMpanMode, setAddMpanMode] = useState(false);
  const [pendingMpan, setPendingMpan] = useState<{ x: number; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Forgiving hover: keep the tooltip alive for a beat after the cursor leaves,
  // so moving from marker to popup (or a small wobble) doesn't dismiss it.
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
  const [visibleTypes, setVisibleTypes] = useState<Set<AssetType>>(new Set(ENABLED_TYPES));
  const [editMode, setEditMode] = useState(false);
  const [locked, setLocked] = useState(false);
  const [zoomedSite, setZoomedSite] = useState<Site | null>(null);
  const [userSites, setUserSites] = useState<Site[]>(() => loadUserSites());
  const [addLabelMode, setAddLabelMode] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<{ x: number; y: number } | null>(null);
  const [dataPanelOpen, setDataPanelOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [windModalOpen, setWindModalOpen] = useState(false);
  const [savingsModalOpen, setSavingsModalOpen] = useState(false);
  const [activeSubMapId, setActiveSubMapId] = useState<string | null>(null);
  // Infrastructure-index highlight (FilterPanel hover → light up markers).
  const [highlight, setHighlight] = useState<HighlightTarget | null>(null);
  // Sticker library + picker for the main overview map. Reload its placements
  // when returning from a sub-map, since sub-maps write the same storage.
  const stickerLib = useStickerLibrary('main');
  const [subMapOrigin, setSubMapOrigin] = useState({ x: 50, y: 50 });
  const [stickerTransforms, setStickerTransforms] = useState<Record<string, StickerTransform>>(() => initStickerTransforms());
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [deletedStickerIds, setDeletedStickerIds] = useState<Set<string>>(() => loadDeletedStickers());
  const [deletedAssetIds, setDeletedAssetIds] = useState<Set<string>>(() => loadDeletedAssets());
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [stickersHidden, setStickersHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(STICKERS_HIDDEN_KEY) === 'true'; } catch { return false; }
  });
  const [labelsHidden, setLabelsHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(LABELS_HIDDEN_KEY) === 'true'; } catch { return false; }
  });
  const [legendHidden, setLegendHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(LEGEND_HIDDEN_KEY) === 'true'; } catch { return false; }
  });
  const [filterHidden, setFilterHidden] = useState<boolean>(() => {
    try { return localStorage.getItem(FILTER_HIDDEN_KEY) === 'true'; } catch { return false; }
  });
  // Top layer (z > markers) where every sticker portals its name label, so
  // labels are never hidden behind a nearby marker icon.
  const [stickerLabelsLayer, setStickerLabelsLayer] = useState<HTMLDivElement | null>(null);
  // Sub-map region calibration (editor-only) — see Stage 1 of the asset rework.
  const [regionMode, setRegionMode] = useState(false);
  const [subMapRegions, setSubMapRegions] = useState<Record<string, SubMapRegion>>(() => loadSubMapRegions());
  const [cableList, setCableList] = useState<Cable[]>(
    () => [...configCables, ...loadCables()].map((c) => ({ ...c, points: dedupeCablePoints(c.points, assets) })),
  );
  const [cableMode, setCableMode] = useState<CableType | null>(null);
  // Simple "Connect" mode: click marker A then marker B to draw an anchored line
  // between them (reuses the cable machinery; auto-finishes after 2 markers).
  const [connectMode, setConnectMode] = useState(false);
  const [cableEditMode, setCableEditMode] = useState(false);
  const [draftPoints, setDraftPoints] = useState<CablePoint[]>([]);
  const [cableCursor, setCableCursor] = useState<{ x: number; y: number } | null>(null);
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);
  const [activeCablePoint, setActiveCablePoint] = useState<{ cableId: string; index: number } | null>(null);
  const [activeCableSegment, setActiveCableSegment] = useState<{ cableId: string; index: number } | null>(null);
  const [cableHistory, setCableHistory] = useState<Cable[][]>([]);

  const cableListRef = useRef(cableList);
  cableListRef.current = cableList;

  const mapRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const cableDragRef = useRef<{ cableId: string; index: number; startX: number; startY: number; moved: boolean } | null>(null);
  const cableMoveRef = useRef<{ cableId: string; startX: number; startY: number; startPoints: CablePoint[]; moved: boolean } | null>(null);

  // Live drag state for a projected marker being moved on the overview.
  const projectedDragRef = useRef<{ id: string } | null>(null);
  const projectedDragPosRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [projectedDragPos, setProjectedDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  // Per-asset overview position overrides. The overview position is independent
  // of the sub-map position — once an asset is dragged here, it stays put.
  const [overviewPositions, setOverviewPositions] = useState<Record<string, { x: number; y: number }>>(() => loadOverviewPositions());
  // Bumped to force the projection to recompute from fresh sub-map data — e.g.
  // after a projected marker is deleted here.
  const [projectionVersion, setProjectionVersion] = useState(0);

  // Sub-map assets shown on the overview. Each one sits at its overview override
  // if it has been placed here, otherwise at a default spot projected from its
  // sub-map through that sub-map's region box. `projectedSubMapById` records
  // which sub-map each asset belongs to, so it can be deleted from the right one.
  const { projectedAssets, projectedSubMapById } = useMemo(() => {
    // Names already present as the overview's OWN markers. A sub-map asset that
    // shares a name with one of these is a duplicate (e.g. a CFA solar array
    // that's also been placed directly on the overview) — we skip projecting it
    // so it doesn't stack a second copy inside the sub-map's calibration box.
    // The overview's curated marker wins; the asset still shows on its sub-map.
    const overviewNames = new Set(
      assets.map((a) => (a.name ? a.name.trim().toLowerCase() : '')).filter(Boolean),
    );
    const list: EnergyAsset[] = [];
    const subMapById = new Map<string, string>();
    for (const sm of submaps) {
      const region = subMapRegions[sm.id];
      for (const a of loadSubMapAssets(sm.id)) {
        if (a.name && overviewNames.has(a.name.trim().toLowerCase())) continue;
        const ov = overviewPositions[a.id];
        const x = ov ? ov.x : region ? region.x + (a.x / 100) * region.width : a.x;
        const y = ov ? ov.y : region ? region.y + (a.y / 100) * region.height : a.y;
        list.push({ ...a, x, y });
        subMapById.set(a.id, sm.id);
      }
    }
    return { projectedAssets: list, projectedSubMapById: subMapById };
  }, [subMapRegions, activeSubMapId, overviewPositions, projectionVersion, assets]);

  const projectedIds = useMemo(() => new Set(projectedAssets.map((a) => a.id)), [projectedAssets]);

  // Proximity index: which infrastructure assets belong to each site, for the
  // expandable Assets list. Solar arrays are named after their site (e.g.
  // "Joie Stadium Solar Array"), so each array anchors a site; every inverter
  // is grouped under the site of its NEAREST array. First pass = arrays +
  // inverters (James will hand-correct any mis-groupings). Keyed by site id.
  const siteAssetsIndex = useMemo(() => {
    // Resolve each group's asset NAMES to real asset objects. Prefer the
    // overview copy (its id matches the rendered marker, so hover-highlight and
    // click-open work), falling back to the sub-map asset.
    const byName = new Map<string, EnergyAsset>();
    for (const sm of submaps) for (const a of loadSubMapAssets(sm.id)) if (a.name && !deletedAssetIds.has(a.id)) byName.set(a.name, a);
    for (const a of [...projectedAssets, ...assets]) if (a.name && !deletedAssetIds.has(a.id)) byName.set(a.name, a);
    const index: Record<string, EnergyAsset[]> = {};
    for (const g of SITE_ASSET_GROUPS) {
      const list = g.assetNames.map((n) => byName.get(n)).filter(Boolean) as EnergyAsset[];
      if (list.length) index[g.id] = list;
    }
    return index;
  }, [projectionVersion, assets, projectedAssets, deletedAssetIds]);

  // Names visible on the overview as free/site labels. Stickers whose display
  // name matches one of these skip their own auto-name tag — the explicit
  // label supersedes the default one.
  const supersedingLabelNames = useMemo(() => {
    const out = new Set<string>();
    for (const s of siteState) out.add(s.name.trim().toLowerCase());
    for (const s of userSites) out.add(s.name.trim().toLowerCase());
    return out;
  }, [siteState, userSites]);

  useEffect(() => {
    submaps.forEach((sm) => {
      const img = new Image();
      img.src = sm.image;
    });
  }, []);

  // Sub-maps share the sticker placement storage — refresh when we come back.
  useEffect(() => {
    if (!activeSubMapId) stickerLib.reload();
  }, [activeSubMapId, stickerLib.reload]);

  // Leaving Edit Sticker Mode also deselects any selected config sticker.
  useEffect(() => {
    if (!stickerLib.stickerEditMode) setSelectedStickerId(null);
  }, [stickerLib.stickerEditMode]);

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
    // Always close whichever panel might already be open before opening the
    // new one — panels must never stack. The user's rule: clicking any asset
    // while a panel is open closes that panel first, then opens the new one.
    setSelectedStickerId(null);
    setHoveredId(null);
    // A few named markers open the rich asset info panel instead of SidePanel.
    if (PANEL_NAMES.has(asset.name)) {
      setSelectedAsset(null);
      stickerLib.setInfoItem(assetToPanelItem(asset));
      return;
    }
    stickerLib.setInfoItem(null);
    setSelectedAsset(asset);
  }, [editMode, stickerLib]);

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
    stickerLib.setSelectedId(null);
  }, [stickerLib.setSelectedId]);

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
    stickerLib.setSelectedId(null);
  }, [stickerLib.setSelectedId]);

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

  const handleAddMpanConfirm = useCallback((type: AssetType, name: string, mpan: string, notes: string) => {
    if (!pendingMpan) return;
    const newAsset: EnergyAsset = {
      id: `user-mpan-${Date.now()}`,
      name,
      type,
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

  const handleAddLabelConfirm = useCallback((name: string, style: 'pin' | 'tag') => {
    if (!pendingLabel) return;
    const newSite: Site = {
      id: `user-site-${Date.now()}`,
      name,
      x: pendingLabel.x,
      y: pendingLabel.y,
      // Persist the style choice so SiteLabel renders the right variant.
      // 'pin' is the original chunky pill; 'tag' is a compact text-only label.
      style,
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
    if (cableMode && mapRef.current) {
      e.stopPropagation();
      const rect = mapRef.current.getBoundingClientRect();
      const pt = screenToMapPct(e.clientX, e.clientY, rect, mapZoom, mapPan);
      const snap = findSnapAsset(pt.x, pt.y, assets.filter((a) => !deletedAssetIds.has(a.id)));
      // Connect mode only latches onto markers; ignore clicks on empty space.
      if (connectMode) {
        if (!snap) return;
        setDraftPoints((prev) => [...prev, { x: snap.x, y: snap.y, assetId: snap.id }]);
        return;
      }
      const point: CablePoint = snap
        ? { x: snap.x, y: snap.y, assetId: snap.id }
        : { x: pt.x, y: pt.y };
      setDraftPoints((prev) => [...prev, point]);
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
      return;
    }
    handleDeselectSticker();
    setSelectedCableId(null);
  }, [cableMode, connectMode, addMpanMode, addLabelMode, handleDeselectSticker, mapZoom, mapPan, assets, deletedAssetIds]);

  const handleSiteClick = useCallback((site: Site) => {
    if (editMode || labelEditMode) return;
    // Close any open panel before navigating / zooming so panels never stack.
    setSelectedAsset(null);
    setSelectedStickerId(null);
    setHoveredId(null);
    stickerLib.setInfoItem(null);
    if (site.subMapId) {
      setSubMapOrigin({ x: site.x, y: site.y });
      setActiveSubMapId(site.subMapId);
      return;
    }
    setZoomedSite((prev) => prev?.id === site.id ? null : site);
  }, [editMode, labelEditMode, stickerLib]);

  // Map a circle sticker/photo asset (Joie Stadium aerial, MIHP Building
  // photo, Etihad Stadium ring, etc.) to the sub-map it belongs to. Clicking
  // one of these on the OVERVIEW should navigate straight into its sub-map,
  // not open the overview info panel — per the client's request. Small
  // infrastructure marker icons (MPAN / Transformer / etc.) are unaffected.
  const stickerToSubMap = useCallback((label: string, transform?: StickerTransform, position?: { x: number; y: number }): string | null => {
    // 1. If the placement itself carries a non-'main' view, use it directly.
    if (transform && 'view' in transform && typeof (transform as { view?: string }).view === 'string') {
      const v = (transform as { view: string }).view;
      if (v && v !== 'main') return v;
    }
    // 2. Fall back to name matching for baked-in stickers on the overview.
    const l = (label || '').toLowerCase();
    if (l.includes('co-op live') || l.includes('coop live') || l.includes('co op live')) return 'co-op-live-map';
    if (l.includes('etihad stadium') || l.includes('mamma mia')
      || l.includes('hotel') || l.includes('commercial') || l.includes('north stand')
      || l.includes('etihad tower')) return 'etihad-stadium-map';
    if (l.includes('joie') || l.includes('indoor pitch') || l.includes('tv studio')
      || l.includes('fm building') || l.includes('mihp') || l.includes("women's facility")
      || l.includes('womens facility') || l.includes('mcwfc') || l.includes('ground mount')
      || l.includes('performance centre') || l.includes('city football academy')
      || l.includes('cfa')) return 'cfa-map';
    // 3. Position-based fallback: the overview building blobs (Joie Stadium,
    //    Indoor Pitch, etc.) carry generic sticker labels, so also drill in
    //    when the blob sits inside a calibrated sub-map region.
    if (position) {
      for (const sm of submaps) {
        const r = subMapRegions[sm.id];
        if (r && position.x >= r.x && position.x <= r.x + r.width
             && position.y >= r.y && position.y <= r.y + r.height) return sm.id;
      }
    }
    return null;
  }, [subMapRegions]);

  const handleStickerCircleClick = useCallback((label: string, position: { x: number; y: number }, transform?: StickerTransform, fallback?: () => void) => {
    if (editMode || labelEditMode) return;
    // Whatever this click does next (navigate to a sub-map OR open the info
    // panel fallback), close any other panel that might already be open so
    // panels never stack.
    setSelectedAsset(null);
    setSelectedStickerId(null);
    setHoveredId(null);
    stickerLib.setInfoItem(null);
    const subMapId = stickerToSubMap(label, transform, position);
    if (subMapId) {
      setSubMapOrigin(position);
      setActiveSubMapId(subMapId);
      return;
    }
    if (fallback) fallback();
  }, [editMode, labelEditMode, stickerToSubMap, stickerLib]);

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
      const pct = screenToMapPct(e.clientX, e.clientY, rect, mapZoom, mapPan);
      const x = Math.max(0, Math.min(100, pct.x));
      const y = Math.max(0, Math.min(100, pct.y));
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
  }, [editMode, mapZoom, mapPan]);

  // Drag a projected sub-map asset on the overview. The marker follows the
  // cursor and, on drop, its overview position is saved as an independent
  // override — the asset's position on its own sub-map is left untouched.
  const handleProjectedMouseDown = useCallback((e: React.MouseEvent, asset: EnergyAsset) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    projectedDragRef.current = { id: asset.id };
    projectedDragPosRef.current = { id: asset.id, x: asset.x, y: asset.y };
  }, [editMode]);

  useEffect(() => {
    if (!editMode) return;
    const onMove = (e: MouseEvent) => {
      const drag = projectedDragRef.current;
      if (!drag || !mapRef.current) return;
      const rect = mapRef.current.getBoundingClientRect();
      const pct = screenToMapPct(e.clientX, e.clientY, rect, mapZoom, mapPan);
      const pos = {
        id: drag.id,
        x: Math.max(0, Math.min(100, pct.x)),
        y: Math.max(0, Math.min(100, pct.y)),
      };
      projectedDragPosRef.current = pos;
      setProjectedDragPos(pos);
    };
    const onUp = () => {
      const drag = projectedDragRef.current;
      const pos = projectedDragPosRef.current;
      projectedDragRef.current = null;
      projectedDragPosRef.current = null;
      setProjectedDragPos(null);
      if (!drag || !pos || pos.id !== drag.id) return;
      // Save the new overview position as an independent override.
      setOverviewPositions((prev) => {
        const next = { ...prev, [drag.id]: { x: pos.x, y: pos.y } };
        saveOverviewPositions(next);
        return next;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [editMode, mapZoom, mapPan]);

  // ── Map zoom & pan ──────────────────────────────────────────────────────
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

  // ── Sub-map region calibration ──────────────────────────────────────────
  const handleEnterRegionMode = useCallback(() => {
    setRegionMode(true);
    setEditMode(false);
    setLocked(false);
    setAddMpanMode(false);
    setPendingMpan(null);
    setAddLabelMode(false);
    setPendingLabel(null);
    setLabelEditMode(false);
    setCableMode(null);
    setCableEditMode(false);
    setSelectedAsset(null);
    setHoveredId(null);
    setSelectedStickerId(null);
    setSelectedCableId(null);
    setZoomedSite(null);
    setMapZoom(1);
    setMapPan({ x: 0, y: 0 });
  }, []);

  const handleExitRegionMode = useCallback(() => {
    setRegionMode(false);
  }, []);

  const handleRegionChange = useCallback((id: string, region: SubMapRegion) => {
    setSubMapRegions((prev) => {
      const next = { ...prev, [id]: region };
      saveSubMapRegions(next);
      return next;
    });
  }, []);

  const handleToggleStickers = useCallback(() => {
    setStickersHidden((v) => {
      const next = !v;
      try { localStorage.setItem(STICKERS_HIDDEN_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
    setSelectedStickerId(null);
  }, []);

  const handleToggleLabels = useCallback(() => {
    setLabelsHidden((v) => {
      const next = !v;
      try { localStorage.setItem(LABELS_HIDDEN_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleToggleLegend = useCallback(() => {
    setLegendHidden((v) => {
      const next = !v;
      try { localStorage.setItem(LEGEND_HIDDEN_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleToggleFilter = useCallback(() => {
    setFilterHidden((v) => {
      const next = !v;
      try { localStorage.setItem(FILTER_HIDDEN_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

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
      saveCables(prev);
      return h.slice(0, -1);
    });
  }, []);

  const handleEnterCableMode = useCallback(() => {
    setCableMode('hv');
    setDraftPoints([]);
    setCableCursor(null);
    setSelectedCableId(null);
    setSelectedAsset(null);
    setHoveredId(null);
    setSelectedStickerId(null);
  }, []);

  const handleFinishCable = useCallback(() => {
    if (cableMode && draftPoints.length >= 2) {
      snapshotCables();
      const newCable: Cable = { id: `cable-${Date.now()}`, type: cableMode, points: draftPoints };
      setCableList((prev) => {
        const next = [...prev, newCable];
        saveCables(next);
        return next;
      });
    }
    setCableMode(null);
    setDraftPoints([]);
    setCableCursor(null);
  }, [cableMode, draftPoints, snapshotCables]);

  const handleCancelCable = useCallback(() => {
    setCableMode(null);
    setDraftPoints([]);
    setCableCursor(null);
  }, []);

  // Simple Connect mode: click marker A then marker B → draw an anchored line.
  const handleEnterConnectMode = useCallback(() => {
    setConnectMode(true);
    setCableMode('connection');
    setDraftPoints([]);
    setCableCursor(null);
    setEditMode(false);
    setAddMpanMode(false);
    setAddLabelMode(false);
    setLabelEditMode(false);
    setCableEditMode(false);
  }, []);

  const handleExitConnectMode = useCallback(() => {
    setConnectMode(false);
    setCableMode(null);
    setDraftPoints([]);
    setCableCursor(null);
  }, []);

  // In Connect mode, a second latched marker auto-creates the connecting line
  // and resets, ready for the next pair.
  useEffect(() => {
    if (connectMode && draftPoints.length >= 2) {
      snapshotCables();
      const newCable: Cable = { id: `cable-${Date.now()}`, type: 'connection', points: draftPoints.slice(0, 2) };
      setCableList((prev) => {
        const next = [...prev, newCable];
        saveCables(next);
        return next;
      });
      setDraftPoints([]);
      setCableCursor(null);
    }
  }, [connectMode, draftPoints, snapshotCables]);

  // Edit-cables mode — a dedicated mode where only cables respond to clicks,
  // so markers/stickers/labels can't interfere with cable editing.
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
    setSelectedStickerId(null);
  }, []);

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
      saveCables(next);
      return next;
    });
    setSelectedCableId(null);
  }, [snapshotCables]);

  // Delete one point from a cable (double-click a handle). Keeps at least 2.
  const handleDeleteCablePoint = useCallback((cableId: string, index: number) => {
    const target = cableListRef.current.find((c) => c.id === cableId);
    if (!target || target.points.length <= 2) return;
    snapshotCables();
    setCableList((prev) => {
      const next = prev.map((c) =>
        c.id === cableId ? { ...c, points: c.points.filter((_, i) => i !== index) } : c,
      );
      saveCables(next);
      return next;
    });
    setActiveCablePoint(null);
  }, [snapshotCables]);

  // Detach a cable point from its asset — it stays put where it currently sits
  // but is no longer plugged in. Frees every point stacked on the same spot and
  // plugged into the same asset, then collapses the pile, so a single tap fully
  // unsticks the cable even when several hidden anchors sit underneath.
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
      saveCables(next);
      return next;
    });
    setActiveCablePoint(null);
  }, [snapshotCables, assets]);

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
        // Don't insert into a zero-length segment — it would just stack a
        // useless point on top of the existing pair.
        if (sameCablePos(ra, rb)) return c;
        const mid: CablePoint = { x: (ra.x + rb.x) / 2, y: (ra.y + rb.y) / 2 };
        return { ...c, points: [...c.points.slice(0, segIndex + 1), mid, ...c.points.slice(segIndex + 1)] };
      });
      saveCables(next);
      return next;
    });
  }, [assets]);

  // Tap a cable segment (the line between two points) to open its toolbar.
  const handleCableSegmentClick = useCallback((cableId: string, index: number) => {
    setSelectedCableId(cableId);
    setActiveCablePoint(null);
    setActiveCableSegment((prev) =>
      prev && prev.cableId === cableId && prev.index === index ? null : { cableId, index },
    );
  }, []);

  // Delete one segment of a cable. Cutting a middle segment splits the cable
  // into two independent cables; cutting an end segment just trims that end.
  const handleDeleteCableSegment = useCallback((cableId: string, segIndex: number) => {
    snapshotCables();
    setCableList((prev) => {
      const result: Cable[] = [];
      for (const c of prev) {
        if (c.id !== cableId) { result.push(c); continue; }
        const left = c.points.slice(0, segIndex + 1);
        const right = c.points.slice(segIndex + 1);
        // A cable needs at least 2 points — a 1-point remnant is dropped.
        if (left.length >= 2) result.push({ id: c.id, type: c.type, points: left });
        if (right.length >= 2) {
          result.push({ id: `cable-${Date.now()}`, type: c.type, points: right });
        }
      }
      saveCables(result);
      return result;
    });
    setActiveCableSegment(null);
    setSelectedCableId(null);
  }, [snapshotCables]);

  // Recolour a single cable — overrides the cable type's default colour.
  const handleSetCableColor = useCallback((cableId: string, color: string) => {
    snapshotCables();
    setCableList((prev) => {
      const next = prev.map((c) => (c.id === cableId ? { ...c, color } : c));
      saveCables(next);
      return next;
    });
  }, [snapshotCables]);

  // Flip the direction the power-flow animation runs along a cable.
  const handleToggleCableFlow = useCallback((cableId: string) => {
    snapshotCables();
    setCableList((prev) => {
      const next = prev.map((c) => (c.id === cableId ? { ...c, flowReversed: !c.flowReversed } : c));
      saveCables(next);
      return next;
    });
  }, [snapshotCables]);

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
        // Drag threshold: a click that wanders less than this stays a tap
        // and opens the point's delete/detach toolbar in onUp. Was 5 px
        // (too tight — typical mouse clicks have 3-7 px of natural drift,
        // so toolbar never opened). 10 px gives a forgiving tap window
        // while still letting genuine drags reshape the cable.
        if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < 10) return;
        drag.moved = true;
        snapshotCables();
      }
      // While dragging, the point follows the cursor freely (so it always
      // breaks away from its asset). It re-plugs only when released on a
      // marker — see onUp.
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
      // Treat as a tap if either:
      //   a) The cursor never moved past the 10 px threshold (drag.moved=false), OR
      //   b) The cursor moved during the click but returned within 14 px of
      //      the start by the time the button was released. This catches
      //      the common case where a user clicks, the mouse wanders briefly,
      //      and they release roughly where they started.
      const netDist = Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY);
      const isTap = !drag.moved || netDist < 14;
      if (isTap) {
        // a tap — open or toggle this point's action toolbar
        setActiveCableSegment(null);
        setActiveCablePoint((prev) =>
          prev && prev.cableId === drag.cableId && prev.index === drag.index
            ? null
            : { cableId: drag.cableId, index: drag.index },
        );
        return;
      }
      // Released after a real drag — plug into an asset only if dropped onto one.
      let snapped: CablePoint | null = null;
      if (mapRef.current) {
        const rect = mapRef.current.getBoundingClientRect();
        const pt = screenToMapPct(ev.clientX, ev.clientY, rect, mapZoom, mapPan);
        const a = findSnapAsset(pt.x, pt.y, assets.filter((x) => !deletedAssetIds.has(x.id)));
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
        saveCables(next);
        return next;
      });
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [mapZoom, mapPan, assets, deletedAssetIds, snapshotCables]);

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
      if (drag.moved) saveCables(cableListRef.current);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [mapZoom, mapPan, snapshotCables]);

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

  // Keep the pan offset within bounds whenever the zoom level changes
  // (also snaps pan back to 0 once zoom returns to 1).
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
    if (editMode || addMpanMode || addLabelMode || labelEditMode || cableMode) return;
    // Only pan when the press lands on the map itself, not the overlay panels.
    if (!(e.target as HTMLElement).closest('[data-testid="map-zoom-layer"]')) return;
    e.preventDefault();
    panRef.current = { startX: e.clientX, startY: e.clientY, panX: mapPan.x, panY: mapPan.y };
  }, [mapZoom, mapPan, editMode, addMpanMode, addLabelMode, labelEditMode, cableMode]);

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

  // Manual "Export deployment snapshot" — captures every energy-* key in
  // localStorage and POSTs it to the dev server's snapshot-saver, which
  // writes public/snapshot.json. The next production build bundles that
  // file, so deploying immediately picks up the live editor state.
  const [exportingSnapshot, setExportingSnapshot] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const handleExportSnapshot = useCallback(async () => {
    setExportingSnapshot(true);
    setExportStatus(null);
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('energy-')) {
          const v = localStorage.getItem(key);
          if (v !== null) data[key] = v;
        }
      }
      const res = await fetch('/__save-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const summary = `Saved ${Object.keys(data).length} keys to public/snapshot.json`;
        setExportStatus(summary);
        console.info('[mcfc-map] Snapshot exported:', summary);
      } else {
        setExportStatus(`Failed (HTTP ${res.status})`);
      }
    } catch (e) {
      setExportStatus('Failed: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExportingSnapshot(false);
      // Clear the toast after a few seconds.
      setTimeout(() => setExportStatus(null), 4000);
    }
  }, []);

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


  const handleSetAssetQuantity = useCallback((id: string, q: number) => {
    const clamped = Math.max(1, Math.round(q));
    const subMapId = projectedSubMapById.get(id);
    if (subMapId) {
      const key = `energy-submap-${subMapId}-assets`;
      try {
        const arr: EnergyAsset[] = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify(arr.map((a) => a.id === id ? { ...a, quantity: clamped } : a)));
      } catch { /* ignore */ }
      setProjectionVersion((v) => v + 1);
      return;
    }
    setAssets((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, quantity: clamped } : a));
      saveUserAssets(next.filter((a) => a.id.startsWith('user-mpan-')));
      return next;
    });
  }, [projectedSubMapById]);

  const handleDeleteAsset = useCallback((id: string) => {
    // Projected sub-map asset — delete it from its own sub-map's storage, so
    // the deletion applies in both views (and bump the projection to refresh).
    const subMapId = projectedSubMapById.get(id);
    if (subMapId) {
      const key = `energy-submap-${subMapId}-assets`;
      try {
        const arr: EnergyAsset[] = JSON.parse(localStorage.getItem(key) || '[]');
        localStorage.setItem(key, JSON.stringify(arr.filter((a) => a.id !== id)));
      } catch { /* ignore */ }
      setOverviewPositions((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        saveOverviewPositions(next);
        return next;
      });
      setProjectionVersion((v) => v + 1);
      setSelectedAsset((prev) => (prev?.id === id ? null : prev));
      setHoveredId((prev) => (prev === id ? null : prev));
      return;
    }
    setAssets((prev) => {
      const isUserAsset = id.startsWith('user-mpan-');
      if (isUserAsset) {
        const next = prev.filter((a) => a.id !== id);
        saveUserAssets(next.filter((a) => a.id.startsWith('user-mpan-')));
        return next;
      }
      // Config asset — track as deleted
      setDeletedAssetIds((prevDel) => {
        const next = new Set(prevDel);
        next.add(id);
        saveDeletedAssets(next);
        return next;
      });
      return prev;
    });
    setSelectedAsset((prev) => prev?.id === id ? null : prev);
    setHoveredId((prev) => prev === id ? null : prev);
  }, [projectedSubMapById]);

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

  // Overview assets = the overview's own editable battery markers, plus the
  // read-only infrastructure projected in from every sub-map.
  const registeredAssets = [...assets.filter((a) => !deletedAssetIds.has(a.id)), ...projectedAssets];
  const visibleAssets = registeredAssets.filter((a) => visibleTypes.has(a.idno ? 'idno' : a.type));

  const zoomScale = (zoomedSite?.zoom ?? 1) * mapZoom;
  const zoomOriginX = zoomedSite?.x ?? 50;
  const zoomOriginY = zoomedSite?.y ?? 50;

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <img src={mcfcLogo} alt="MCFC Group" className="w-9 h-9 rounded-full object-contain" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">MCFC Campus Map Meter Locations</h1>
            <p className="text-[10px] text-gray-500 leading-tight">Energy Asset Map</p>
            <p className="text-[9px] text-gray-400 leading-tight">Copyright Clearvolt Limited. For CFG use only.</p>
          </div>
        </div>
        {/* Generation & Consumption modal button hidden for now — restore by
            uncommenting. The bottom Data Panel still shows the full summary. */}
        {/*
        <button
          onClick={() => setTableModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M3 15h18M9 9v9" />
          </svg>
          Generation &amp; Consumption
        </button>
        <div className="h-5 w-px bg-gray-200 mx-1" />
        */}
        <div className={`flex items-center gap-2 text-xs text-gray-500 ${VIEW_ONLY ? 'ml-auto' : ''}`}>
          {/* Wind Scenario button removed for the Meter map (2026-07). Uncomment to restore.
          <button
            onClick={() => setWindModalOpen(true)}
            data-testid="btn-wind-scenario"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300 transition-colors"
            title="Open the Option A wind scenario. 8,760-hour modelled output with export hours."
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
              <path d="M17.5 8a2.5 2.5 0 1 1 2 4H2" />
            </svg>
            Wind Scenario
          </button>
          */}
          <span data-testid="asset-count" className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
            <span className="font-bold text-gray-900">{registeredAssets.length}</span> registered
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="font-bold">{visibleAssets.length}</span> visible
          </span>
          {zoomedSite && (
            <span className="text-blue-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
              {zoomedSite.name}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
            <button
              data-testid="btn-add-mpan"
              onClick={handleEnterAddMpan}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <Plus size={13} />
              Add asset
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
            <button
              data-testid="btn-add-cable"
              onClick={handleEnterCableMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
            >
              <CableIcon size={13} />
              Add cable
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
            <button
              data-testid="btn-connect"
              onClick={handleEnterConnectMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <ArrowLeftRight size={13} />
              Connect
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
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
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
            <button
              onClick={() => { setAddLabelMode(true); setPendingLabel(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Tag size={13} />
              Add label
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
            <button
              data-testid="btn-add-sticker"
              onClick={() => stickerLib.setPickerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Sticker size={13} />
              Add sticker
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
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
          {addLabelMode && (
            <button
              onClick={() => { setAddLabelMode(false); setPendingLabel(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
            <button
              data-testid="btn-edit-labels"
              onClick={handleEnterLabelEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Move size={13} />
              Move labels
            </button>
          )}
          {!editMode && !addMpanMode && !addLabelMode && !labelEditMode && !cableMode && !cableEditMode && !stickerLib.stickerEditMode && !regionMode && !VIEW_ONLY && (
            <button
              data-testid="btn-calibrate-regions"
              onClick={handleEnterRegionMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Frame size={13} />
              Calibrate regions
            </button>
          )}
          {regionMode && (
            <button
              data-testid="btn-done-regions"
              onClick={handleExitRegionMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gray-800 text-white hover:bg-gray-900 transition-colors"
            >
              <Check size={13} />
              Done calibrating
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
          {!editMode && !locked && !cableMode && !cableEditMode && !regionMode && !VIEW_ONLY && (
            <button
              data-testid="btn-edit-positions"
              onClick={handleEnterEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
            >
              <Move size={13} />
              Edit positions
            </button>
          )}
          {/* Export deployment snapshot — manual, explicit push of the
              current editor state to public/snapshot.json. Dev only. */}
          {!editMode && !cableMode && !cableEditMode && !regionMode && !VIEW_ONLY && (
            <button
              data-testid="btn-export-snapshot"
              onClick={handleExportSnapshot}
              disabled={exportingSnapshot}
              title="Save the current map state to public/snapshot.json for the next deploy"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition-colors disabled:opacity-60"
            >
              <Download size={13} />
              {exportingSnapshot ? 'Exporting…' : 'Export deployment snapshot'}
            </button>
          )}
          {exportStatus && (
            <span
              data-testid="export-snapshot-status"
              className={`text-xs font-medium rounded px-2 py-1 border ${
                exportStatus.startsWith('Saved')
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : 'text-red-700 bg-red-50 border-red-200'
              }`}
            >
              {exportStatus}
            </span>
          )}
          {editMode && (
            <>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Drag to reposition · click ✕ to delete
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


      {addMpanMode && (
        <div className="bg-red-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          Click anywhere on the map to place a new asset marker
          <button
            onClick={handleCancelAddMpan}
            className="ml-auto text-red-200 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      {addLabelMode && (
        <div className="bg-indigo-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          Click anywhere on the map to place a new label
          <button
            onClick={() => { setAddLabelMode(false); setPendingLabel(null); }}
            className="ml-auto text-indigo-200 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      {labelEditMode && (
        <div className="bg-indigo-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          Drag the grip handle to move a label · use the pencil to rename
          <button
            onClick={() => setLabelEditMode(false)}
            className="ml-auto text-indigo-200 hover:text-white underline"
          >
            Done
          </button>
        </div>
      )}

      {connectMode && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <span>Connect: click one marker, then another, to link them{draftPoints.length === 1 ? ' — now click the second marker' : ''}. Keeps going for the next pair.</span>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button
              data-testid="btn-done-connect"
              onClick={handleExitConnectMode}
              className="px-3 py-1 rounded bg-white text-emerald-700 font-semibold hover:bg-emerald-50 transition-colors"
            >
              Done connecting
            </button>
          </div>
        </div>
      )}
      {cableMode && !connectMode && (
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

      {regionMode && (
        <div className="bg-gray-800 text-white px-6 py-2.5 flex items-center gap-3 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          Drag each labelled box so it sits over that sub-map's area of the campus · drag the corner handle to resize
          <button
            onClick={handleExitRegionMode}
            className="ml-auto text-gray-300 hover:text-white underline"
          >
            Done
          </button>
        </div>
      )}

      {/* The middle strip (below header, above data-panel toolbar) is a
          strict flex container: the map takes ALL available space here and
          the map's 16:9 aspect ratio does the rest. No scroll here. When
          the data panel is opened, its own body scrolls internally. */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <main
        className={dataPanelOpen ? 'hidden' : 'flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-gray-100'}
      >
        {/* Columns wrapped in a block that sizes to the map's own height, so the
            side panels reach exactly the map's bottom edge — no white band under
            the map. The block is centred in the available area. */}
        <div data-testid="overview-row" className="flex items-stretch w-full max-h-full">
        {/* ── LEFT dashboard column (off the map): Assets list + view toggles ── */}
        {!editMode && (
          <aside data-testid="left-dashboard" className="hidden xs:flex flex-col gap-3 flex-1 min-w-[190px] overflow-hidden bg-slate-50 border-r border-gray-200 p-3">
            {!legendHidden && (
              <Legend
                embedded
                stickersByView={stickerLib.stickersByView}
                onOpenChart={() => setChartOpen(true)}
                onOpenData={() => setDataPanelOpen(true)}
                onOpenSavings={() => setSavingsModalOpen(true)}
                siteAssets={siteAssetsIndex}
                onHoverAsset={setHighlight}
                onSelectAsset={(a) => { setHighlight(null); handleOpen(a); }}
                onSelectSite={(site) => { setHighlight(null); stickerLib.setInfoItem(assetToPanelItem(site)); }}
              />
            )}
            <div className="flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden text-xs font-semibold text-gray-700 shrink-0">
              <button data-testid="btn-toggle-stickers" onClick={handleToggleStickers} className="flex items-center gap-1.5 px-3 py-2 hover:bg-gray-50 transition-colors" title={stickersHidden ? 'Show all site stickers' : 'Hide all site stickers'}>
                <Sticker size={13} className={stickersHidden ? 'text-gray-400' : 'text-indigo-500'} />
                {stickersHidden ? 'Show stickers' : 'Hide stickers'}
              </button>
              <button data-testid="btn-toggle-labels" onClick={handleToggleLabels} className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-200 hover:bg-gray-50 transition-colors" title={labelsHidden ? 'Show all labels' : 'Hide all labels'}>
                <Tag size={13} className={labelsHidden ? 'text-gray-400' : 'text-indigo-500'} />
                {labelsHidden ? 'Show labels' : 'Hide labels'}
              </button>
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

        {/* ── CENTER — the map itself. shrink-0 so this column hugs the 16:9
             map exactly; the side dashboards (flex-1) then absorb ALL the
             left-over width, so there's no grey letterbox around the map. ── */}
        <div className="shrink-0 w-full lg:w-[calc(100%_-_560px)] flex items-center justify-center overflow-hidden relative">
        <div
          data-testid="map-container"
          ref={mapRef}
          className={`relative overflow-hidden bg-white mx-auto ${
            editMode || addMpanMode || addLabelMode || cableMode
              ? 'cursor-crosshair'
              : mapZoom > 1
                ? isPanning ? 'cursor-grabbing' : 'cursor-grab'
                : ''
          }`}
          // Fit-in-viewport sizing: the map is a 16:9 box that always sits
          // entirely inside the visible viewport, with letterbox bars on the
          // sides when the viewport is wider than 16:9.
          //   height:   100% of the main wrapper (which has minHeight of
          //             ~100dvh - 160px, so the map gets the full viewport
          //             minus header + data-panel toolbar)
          //   aspect:   locked at 16 / 9 → width derived from height
          //   maxWidth: 100% → shrinks if it would overflow horizontally
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
              transformOrigin: `${zoomOriginX}% ${zoomOriginY}%`,
              transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${zoomScale})`,
              transition: isPanning ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/*
              The aspect-ratio lock now lives on the mapRef container (above)
              so the map fits both width AND height of its parent. The image
              fills that container — object-cover keeps the satellite imagery
              edge-to-edge without distortion. The intrinsic width/height
              attrs still help the browser reserve correct dimensions before
              the bytes arrive.
            */}
            <img
              src={mapImage}
              alt="Etihad Campus map"
              data-testid="map-image"
              width={4400}
              height={2475}
              className="w-full h-full block"
              style={{ objectFit: 'cover' }}
              draggable={false}
            />

            {/* Image stickers — z-index 12, above cables, below markers (z-20) */}
            {!editMode && !stickersHidden && configStickers.filter((s) => !deletedStickerIds.has(s.id)).map((sticker) => {
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
                  zoom={zoomScale}
                  disabled={cableEditMode || regionMode}
                  framed={sticker.framed}
                  objectPosition={sticker.objectPosition}
                  editMode={stickerLib.stickerEditMode}
                  // Click a circle photo asset on the overview → navigate
                  // straight into its sub-map. Falls back to the old info-panel
                  // open only if the sticker isn't tied to a known sub-map.
                  onOpenInfo={() => handleStickerCircleClick(
                    sticker.label,
                    { x: transform.x, y: transform.y },
                    transform,
                    () => stickerLib.setInfoItem(stickerToPanelItem(sticker)),
                  )}
                  selected={selectedStickerId === sticker.id}
                  onSelect={() => handleStickerSelect(sticker.id)}
                  onUpdate={(updates) => handleStickerUpdate(sticker.id, updates)}
                  onDelete={() => handleStickerDelete(sticker.id)}
                  labelsLayer={stickerLabelsLayer}
                  supersedingLabelNames={supersedingLabelNames}
                />
              );
            })}

            {/* User library stickers placed on the overview map */}
            {!editMode && !stickersHidden && stickerLib.placed.map(({ sticker, placement }) => (
              <StickerOverlay
                key={sticker.id}
                id={sticker.id}
                label={sticker.label}
                src={sticker.src}
                transform={placement}
                mapRef={mapRef}
                zoom={zoomScale}
                disabled={cableEditMode || regionMode}
                framed={sticker.framed}
                objectPosition={sticker.objectPosition}
                editMode={stickerLib.stickerEditMode}
                onOpenInfo={() => handleStickerCircleClick(
                  sticker.label,
                  { x: placement.x, y: placement.y },
                  placement,
                  () => stickerLib.setInfoItem(stickerToPanelItem(sticker)),
                )}
                selected={stickerLib.selectedId === sticker.id}
                onSelect={() => {
                  stickerLib.setSelectedId(sticker.id);
                  setSelectedStickerId(null);
                  setSelectedAsset(null);
                  setHoveredId(null);
                }}
                onUpdate={(updates) => stickerLib.updateSticker(sticker.id, updates)}
                onDelete={() => stickerLib.removeSticker(sticker.id)}
                labelsLayer={stickerLabelsLayer}
              />
            ))}

            {/* Cables — z-index 10, below stickers, below markers */}
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
                  style={{ left: `${anchor.x}%`, top: `${anchor.y}%`, transform: 'translate(-50%, calc(-100% - 18px))', zIndex: 36 }}
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

            {/* Site labels — hidden in marker-edit mode, or when labels are toggled off */}
            {!editMode && (!labelsHidden || labelEditMode || addLabelMode) && siteState.map((site) => (
              <SiteLabel
                key={site.id}
                site={site}
                mapRef={mapRef}
                zoom={zoomScale}
                disabled={cableEditMode || regionMode}
                onClick={handleSiteClick}
                onUpdate={handleSiteLabelUpdate}
                active={zoomedSite?.id === site.id}
                labelEditMode={labelEditMode}
              />
            ))}

            {/* User-added free labels — overview view only. Sub-map-scoped
                labels (site.view === 'etihad-stadium-map' etc) are rendered
                inside the SubMapView instead. */}
            {(!labelsHidden || labelEditMode || addLabelMode) && userSites
              .filter((site) => !site.view || site.view === 'main')
              .map((site) => (
              <FreeLabel
                key={site.id}
                site={site}
                mapRef={mapRef}
                zoom={zoomScale}
                disabled={cableEditMode || regionMode}
                editMode={labelEditMode}
                onUpdate={handleUserSiteLabelUpdate}
                onDelete={handleUserSiteDelete}
                onOpenInfo={PANEL_NAMES.has(site.name)
                  ? () => stickerLib.setInfoItem(assetToPanelItem(site))
                  : undefined}
              />
            ))}

            {/* Asset markers */}
            {visibleAssets.map((asset) => {
              const isHovered = hoveredId === asset.id;
              // Projected sub-map assets can be dragged here too — the move is
              // saved back to their sub-map. Only deletion stays sub-map-only.
              const isProjected = projectedIds.has(asset.id);
              const dragPos = isProjected && projectedDragPos?.id === asset.id ? projectedDragPos : null;
              const markerX = dragPos ? dragPos.x : asset.x;
              const markerY = dragPos ? dragPos.y : asset.y;
              const isDragging = draggingRef.current?.id === asset.id || dragPos != null;
              const meta = assetTypeConfig[asset.type];
              const TypeIcon = meta.Icon;
              // IDNO markers keep their real icon but take the IDNO colour.
              const markerColor = asset.idno ? assetTypeConfig['idno'].color : meta.color;
              // Infrastructure-index highlight from the FilterPanel hover.
              const matchesHighlight = highlight
                ? (highlight.ids ? highlight.ids.includes(asset.id)
                    : highlight.id ? highlight.id === asset.id
                    : highlight.type === (asset.idno ? 'idno' : asset.type))
                : false;
              const dimmed = highlight != null && !matchesHighlight;
              // Building markers render a little larger so they stand out. On
              // Wind turbines render as a refined white turbine silhouette
              // with a restrained shadow stack (no circular pill, no neon
              // glow). Substations sit a touch bigger than the ordinary
              // markers because each one represents a significant chunk of
              // the campus electrical infrastructure.
              const markerSize = asset.type === 'wind-turbine' ? 48
                : asset.type === 'building' ? 24
                : asset.type === 'substation' ? 26
                : 18;
              const markerIcon = asset.type === 'wind-turbine' ? 42
                : asset.type === 'building' ? 13
                : asset.type === 'substation' ? 15
                : 10;
              return (
                <div
                  key={asset.id}
                  data-testid={`marker-${asset.id}`}
                  className="absolute"
                  style={{
                    left: `${markerX}%`,
                    top: `${markerY}%`,
                    transform: 'translate(-50%, -50%)',
                    // Hovered/dragging markers lift above the sticker labels
                    // layer (z 25) so their tooltip isn't covered by a nearby
                    // building name.
                    zIndex: (isHovered || isDragging || matchesHighlight) ? 35 : 20,
                    cursor: editMode ? 'grab' : 'pointer',
                    userSelect: 'none',
                    opacity: dimmed ? 0.35 : 1,
                    transition: 'opacity 0.15s ease',
                    pointerEvents: (cableEditMode || regionMode) ? 'none' : undefined,
                  }}
                  onMouseEnter={() => { if (!editMode && !cableMode) openHover(asset.id); }}
                  onMouseLeave={scheduleHoverClose}
                  onMouseDown={(e) => { if (isProjected) handleProjectedMouseDown(e, asset); else handleMarkerMouseDown(e, asset.id); }}
                  onClick={() => {
                    if (editMode || cableMode) return;
                    // Projected sub-map assets on the overview jump into their
                    // owning sub-map instead of opening a panel here — every
                    // "campus asset" click on the overview should drill in.
                    if (isProjected) {
                      const subMapId = projectedSubMapById.get(asset.id);
                      if (subMapId) {
                        setSelectedAsset(null);
                        setSelectedStickerId(null);
                        setHoveredId(null);
                        stickerLib.setInfoItem(null);
                        setSubMapOrigin({ x: markerX, y: markerY });
                        setActiveSubMapId(subMapId);
                        return;
                      }
                    }
                    handleOpen(asset);
                  }}
                >
                  {matchesHighlight && (
                    <span className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20" style={{ bottom: 'calc(100% + 3px)' }} aria-hidden>
                      <svg className="marker-point-bounce block" width="22" height="19" viewBox="0 0 16 14" style={{ filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.45))' }}>
                        <path d="M8 14 L1.5 2.5 L14.5 2.5 Z" fill={markerColor} stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                  <button
                    className="relative flex items-center justify-center focus:outline-none"
                    style={{ width: markerSize, height: markerSize }}
                    aria-label={`${editMode ? 'Drag' : 'Open'} ${asset.name}`}
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
                      {markerX.toFixed(1)}, {markerY.toFixed(1)}
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
                    <MarkerTooltip asset={asset} onViewData={() => handleOpen(asset)} onDelete={() => handleDeleteAsset(asset.id)} onSetQuantity={(q) => handleSetAssetQuantity(asset.id, q)} flipDown={markerY < 25} />
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

            {/* Sub-map region calibration boxes (editor-only) */}
            {regionMode && submaps.map((sm, i) => (
              <RegionBox
                key={sm.id}
                name={sm.name}
                color={REGION_COLORS[i % REGION_COLORS.length]}
                region={subMapRegions[sm.id] ?? { x: 10 + i * 20, y: 10, width: 20, height: 20 }}
                mapRef={mapRef}
                zoom={zoomScale}
                pan={mapPan}
                onChange={(r) => handleRegionChange(sm.id, r)}
              />
            ))}
          </div>

          {/* Assets panel (Legend) and Infrastructure Index (FilterPanel) now
              live in the off-map dashboard columns — see the <aside> elements
              wrapping this map, not overlaid here. */}

          {/* Zoom controls */}
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

          {/* Bottom-left controls: undo + sticker/label visibility toggles.
              The "View as chart" button used to live here; it moved into the
              Legend as its footer so it sits directly under the Assets panel. */}
          {!editMode && (
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
          )}

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
        </div>

        {/* ── RIGHT dashboard column (off the map): Infrastructure Index ── */}
        {!editMode && !filterHidden && (
          <aside data-testid="right-dashboard" className="hidden xs:flex flex-col flex-1 min-w-[190px] overflow-hidden bg-slate-50 border-l border-gray-200 p-3">
            <FilterPanel
              embedded
              visible={visibleTypes}
              onChange={handleFilterChange}
              assets={registeredAssets}
              onHover={setHighlight}
              onSelect={(a) => { setHighlight(null); handleOpen(a); }}
            />
          </aside>
        )}
        </div>
      </main>

      <DataPanel open={dataPanelOpen} onToggle={() => setDataPanelOpen((v) => !v)} />
      <EnergyBarChartModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        consumption={consumptionData}
        generation={generationData}
      />
      </div>

      {!editMode && (
        <SidePanel
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onDelete={handleDeleteAsset}
        />
      )}

      {tableModalOpen && <TableModal onClose={() => setTableModalOpen(false)} />}
      {windModalOpen && <WindScenarioModal onClose={() => setWindModalOpen(false)} />}
      <SavingsSummaryModal
        open={savingsModalOpen}
        onClose={() => setSavingsModalOpen(false)}
        onSelectSite={(panelName, panelId) => {
          setSavingsModalOpen(false);
          setSelectedAsset(null);
          setSelectedStickerId(null);
          stickerLib.setInfoItem(assetToPanelItem({ id: panelId, name: panelName }));
        }}
      />


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
