import { useState, useMemo, useCallback, useEffect } from 'react';

// A sticker available in the picker. `src` is either an imported image URL
// (baked-in stickers) or a data URL (user uploads).
export interface LibrarySticker {
  id: string;
  label: string;
  src: string;
  framed?: boolean;
  objectPosition?: string;
  // Optional asset info for the click-through info panel. Each asset can carry
  // one or more images (e.g. CGI renders) plus consumption/generation figures.
  images?: string[];
  consumption?: string;
  generation?: string;
  viewDataUrl?: string;
}

// Shape consumed by the Google-Maps-style asset info panel.
export interface AssetPanelItem {
  id: string;
  name: string;
  fallbackImage?: string; // sticker graphic for the banner; absent for markers/labels
  photos: string[];      // uploaded panel photos (may be empty)
  consumption?: string;
  generation?: string;
  viewDataUrl?: string;
}

const STICKER_PHOTOS_KEY = 'energy-map-sticker-photos';

// Per-sticker panel photos, keyed by sticker id. Managed in-app via the panel's
// photo controls; survives reloads and is captured in the deploy snapshot.
//
// On the standalone HTML build, an inline photo registry
// (window.__MCFC_PHOTOS__, keyed by URL like "photos/<id>-N.jpg") is shipped
// alongside the snapshot. If localStorage didn't seed for this key (e.g.
// quota issue with the large energy-map-sticker-uploads value competing for
// space), we synthesise the photo map from that registry as a fallback, so
// panel imagery + the CFA chooser still resolve.
export function loadStickerPhotos(): Record<string, string[]> {
  let fromStorage: Record<string, string[]> = {};
  try {
    const raw = localStorage.getItem(STICKER_PHOTOS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === 'object') fromStorage = parsed;
  } catch { /* fall through to registry */ }

  try {
    const registry = (window as unknown as { __MCFC_PHOTOS__?: Record<string, string> }).__MCFC_PHOTOS__;
    if (registry) {
      const bySticker: Record<string, string[]> = {};
      for (const url of Object.keys(registry)) {
        // URLs look like "photos/<sticker-id>-<index>.<ext>". Strip the
        // "photos/" prefix and the trailing "-N.ext" to recover the id.
        const m = url.match(/^photos\/(.+)-(\d+)\.[a-z]+$/i);
        if (!m) continue;
        const id = m[1];
        const idx = Number(m[2]);
        if (!bySticker[id]) bySticker[id] = [];
        bySticker[id][idx] = url;
      }
      // Per-sticker fallback: only fill in IDs that have no localStorage entry.
      for (const id of Object.keys(bySticker)) {
        if (!fromStorage[id] || fromStorage[id].length === 0) {
          fromStorage[id] = bySticker[id].filter(Boolean);
        }
      }
    }
  } catch { /* registry optional */ }

  return fromStorage;
}

export function saveStickerPhotos(id: string, photos: string[]): void {
  const all = loadStickerPhotos();
  if (photos.length) all[id] = photos;
  else delete all[id];
  try { localStorage.setItem(STICKER_PHOTOS_KEY, JSON.stringify(all)); } catch { /* quota */ }
}

// Downscale an uploaded photo to a JPEG data URL — good for panel imagery
// (small file size; transparency not needed for photos).
// Panel photos render at ~400 to 600 px wide on screen. Capping at 720 px
// max dimension at JPEG quality 0.72 keeps each file around 50-80 KB, which
// avoids localStorage quota issues on the live (Netlify) build where every
// fresh visitor seeds from snapshot.json. Was 1100 / 0.82 — too heavy.
export function fileToPhotoDataUrl(file: File, maxDim = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Build a panel item from any sticker-like object. Panel photos come from the
// in-app photo store first, then any baked-in images, else the sticker graphic.
export function stickerToPanelItem(s: {
  id: string;
  label: string;
  src: string;
  images?: string[];
  consumption?: string;
  generation?: string;
  viewDataUrl?: string;
}): AssetPanelItem {
  const override = loadStickerPhotos()[s.id];
  return {
    id: s.id,
    name: s.label,
    fallbackImage: s.src,
    photos: override && override.length ? override : (s.images ?? []),
    consumption: s.consumption,
    generation: s.generation,
    viewDataUrl: s.viewDataUrl,
  };
}

// Build a panel item for a map marker or label (which have no sticker graphic).
// Panel photos still come from the in-app photo store, keyed by the item's id.
export function assetToPanelItem(a: { id: string; name: string }): AssetPanelItem {
  const override = loadStickerPhotos()[a.id];
  return {
    id: a.id,
    name: a.name,
    photos: override ?? [],
  };
}

// Where a library sticker currently sits. `view` is 'main' for the overview
// map, or a sub-map id (e.g. 'cfa-map'). Each sticker has at most one
// placement — "one placement each".
export interface StickerPlacement {
  view: string;
  x: number;
  y: number;
  width: number;
  rotation: number;
}

// Baked-in library stickers — extras shipped in code. To permanently add a
// sticker, import its image and push an entry here; it then shows in the
// picker on every device with no upload needed.
export const BAKED_LIBRARY_STICKERS: LibrarySticker[] = [];

const UPLOADS_KEY = 'energy-map-sticker-uploads';
const PLACEMENTS_KEY = 'energy-map-sticker-placements';

function loadUploads(): LibrarySticker[] {
  try {
    const raw = localStorage.getItem(UPLOADS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function loadPlacements(): Record<string, StickerPlacement> {
  try {
    const raw = localStorage.getItem(PLACEMENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

// Downscale an uploaded image and return a PNG data URL. Keeps localStorage
// small and preserves transparency, which sticker-style images usually need.
export function fileToStickerDataUrl(file: File, maxDim = 520): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(reader.result as string); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export interface UploadResult { ok: boolean; error?: string }

// Sticker library + picker state for one view ('main' or a sub-map id).
// The library and uploads are global; placements are filtered per view.
export function useStickerLibrary(view: string) {
  const [uploads, setUploads] = useState<LibrarySticker[]>(() => loadUploads());
  const [placements, setPlacements] = useState<Record<string, StickerPlacement>>(() => loadPlacements());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Edit Sticker Mode — stickers only move/resize/rotate while this is on.
  const [stickerEditMode, setStickerEditMode] = useState(false);
  // The asset whose info panel is currently open (null = closed).
  const [infoItem, setInfoItem] = useState<AssetPanelItem | null>(null);

  // Leaving edit mode clears the selection; entering it closes the info panel.
  useEffect(() => {
    if (stickerEditMode) setInfoItem(null);
    else setSelectedId(null);
  }, [stickerEditMode]);

  const library = useMemo<LibrarySticker[]>(
    () => [...BAKED_LIBRARY_STICKERS, ...uploads],
    [uploads],
  );

  // Stickers placed on THIS view, paired with their placement.
  const placed = useMemo(
    () => library
      .filter((s) => placements[s.id]?.view === view)
      .map((s) => ({ sticker: s, placement: placements[s.id] })),
    [library, placements, view],
  );

  // Library stickers not placed on any view — available to add from the picker.
  const available = useMemo(
    () => library.filter((s) => !placements[s.id]),
    [library, placements],
  );

  // Every placed sticker grouped by the view (sub-map) it sits on — drives the
  // campus asset legend.
  const stickersByView = useMemo(() => {
    const out: Record<string, { id: string; label: string }[]> = {};
    for (const s of library) {
      const p = placements[s.id];
      if (!p) continue;
      if (!out[p.view]) out[p.view] = [];
      out[p.view].push({ id: s.id, label: s.label });
    }
    return out;
  }, [library, placements]);

  // Re-read storage — used when returning to a view after another view (a
  // sub-map) may have changed the shared placement/upload storage.
  const reload = useCallback(() => {
    setUploads(loadUploads());
    setPlacements(loadPlacements());
  }, []);

  const persistPlacements = useCallback((next: Record<string, StickerPlacement>) => {
    setPlacements(next);
    try { localStorage.setItem(PLACEMENTS_KEY, JSON.stringify(next)); } catch { /* quota */ }
  }, []);

  // Place a library sticker onto this view, centred.
  const placeSticker = useCallback((id: string) => {
    const next = { ...loadPlacements(), [id]: { view, x: 50, y: 50, width: 14, rotation: 0 } };
    persistPlacements(next);
    setPickerOpen(false);
    setSelectedId(id);
  }, [view, persistPlacements]);

  const updateSticker = useCallback((id: string, updates: Partial<StickerPlacement>) => {
    const cur = loadPlacements();
    if (!cur[id]) return;
    persistPlacements({ ...cur, [id]: { ...cur[id], ...updates } });
  }, [persistPlacements]);

  // Remove a sticker from the map — it returns to the picker library.
  const removeSticker = useCallback((id: string) => {
    const cur = loadPlacements();
    if (!cur[id]) return;
    const next = { ...cur };
    delete next[id];
    persistPlacements(next);
    setSelectedId((s) => (s === id ? null : s));
  }, [persistPlacements]);

  // Add an uploaded image to the library (compressed, stored in the browser).
  const addUpload = useCallback(async (file: File): Promise<UploadResult> => {
    try {
      const src = await fileToStickerDataUrl(file);
      const sticker: LibrarySticker = {
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label: file.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'Sticker',
        src,
      };
      const next = [...loadUploads(), sticker];
      try {
        localStorage.setItem(UPLOADS_KEY, JSON.stringify(next));
      } catch {
        return { ok: false, error: 'Browser storage is full. Remove some uploaded stickers and try again.' };
      }
      setUploads(next);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
    }
  }, []);

  // Delete an uploaded sticker from the library entirely (and any placement).
  const deleteUpload = useCallback((id: string) => {
    const next = loadUploads().filter((s) => s.id !== id);
    try { localStorage.setItem(UPLOADS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setUploads(next);
    const cur = loadPlacements();
    if (cur[id]) {
      const p = { ...cur };
      delete p[id];
      persistPlacements(p);
    }
  }, [persistPlacements]);

  return {
    placed,
    available,
    stickersByView,
    library,
    selectedId,
    setSelectedId,
    pickerOpen,
    setPickerOpen,
    stickerEditMode,
    setStickerEditMode,
    infoItem,
    setInfoItem,
    placeSticker,
    updateSticker,
    removeSticker,
    addUpload,
    deleteUpload,
    reload,
  };
}
