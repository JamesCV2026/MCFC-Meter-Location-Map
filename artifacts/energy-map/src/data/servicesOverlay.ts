import hvSrc from '@assets/CFA_HV_Overlay.png';
import lvSrc from '@assets/CFA_LV_Overlay.png';

// ── CFA services-duct overlays ──────────────────────────────────────────────
// Two separate, pre-coloured drawings supplied by the client: HV ducts
// (turquoise) and LV ducts (magenta). Both are 1920×1080, matching the CFA
// base map, so each sits 1:1 over it. HV and LV toggle independently.

export interface SplitOverlay {
  hv: string; // turquoise HV duct drawing
  lv: string; // magenta LV duct drawing
}

export function getServicesOverlay(): Promise<SplitOverlay> {
  return Promise.resolve({ hv: hvSrc, lv: lvSrc });
}
