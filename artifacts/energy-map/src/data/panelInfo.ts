// ── Asset panel info ────────────────────────────────────────────────────────
// Editable text for an asset's info panel — its title and subtitle — kept as a
// per-asset override keyed by the asset/sticker id. The data summary (energy
// figures, monthly table) is NOT stored here; it stays driven by the dataset.

export interface PanelInfo {
  title?: string;
  subtitle?: string;
  // Free-text narrative shown in place of the data cards when an asset has no
  // energy figures. Editable in the panel.
  narrative?: string;
  // Optional panel image, stored as a data URL (uploaded in-app). Used by the
  // battery panel, which shows just a title and a photo.
  image?: string;
  // Sticker display tweaks: hide its always-on name label, and/or drop it onto
  // a back layer (so a big background sticker sits beneath the others).
  hideLabel?: boolean;
  backLayer?: boolean;
  // Build status — lifecycle of this asset (solar array, meter, inverter, etc.):
  //   'design'   — proposed / in design, NOT yet approved
  //   'proposed' — approved & under construction ("In build")
  //   'built'    — existing/complete
  // Shown on the hover tooltip and the click panel. Undefined is treated as 'built'.
  status?: 'built' | 'proposed' | 'design';
}

const PANEL_INFO_KEY = 'energy-map-asset-panel-info';

export function loadAllPanelInfo(): Record<string, PanelInfo> {
  try {
    const raw = localStorage.getItem(PANEL_INFO_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function panelInfoFor(id: string): PanelInfo {
  return loadAllPanelInfo()[id] ?? {};
}

export function savePanelInfo(id: string, info: PanelInfo): void {
  const all = loadAllPanelInfo();
  if (info.title || info.subtitle || info.narrative || info.image || info.hideLabel || info.backLayer || info.status) all[id] = info;
  else delete all[id];
  try {
    localStorage.setItem(PANEL_INFO_KEY, JSON.stringify(all));
  } catch {
    /* quota — non-fatal */
  }
}
