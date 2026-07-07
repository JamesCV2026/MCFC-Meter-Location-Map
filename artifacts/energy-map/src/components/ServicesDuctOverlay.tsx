import { useEffect, useState } from 'react';
import { getServicesOverlay, SplitOverlay } from '@/data/servicesOverlay';

interface ServicesDuctOverlayProps {
  showHv: boolean;
  showLv: boolean;
}

// Fixed HV / LV services-duct overlay for the CFA sub-map. Pinned to the map
// bounds and non-interactive (pointer-events: none) — it cannot be moved, only
// toggled. Sits inside the zoom layer so it pans/zooms with the base map.
export function ServicesDuctOverlay({ showHv, showLv }: ServicesDuctOverlayProps) {
  const [layers, setLayers] = useState<SplitOverlay | null>(null);

  useEffect(() => {
    let alive = true;
    getServicesOverlay()
      .then((l) => { if (alive) setLayers(l); })
      .catch(() => { /* overlay simply won't show */ });
    return () => { alive = false; };
  }, []);

  if (!layers) return null;

  return (
    <>
      <img
        src={layers.hv}
        alt="HV services ducts"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ display: showHv ? 'block' : 'none' }}
        draggable={false}
      />
      <img
        src={layers.lv}
        alt="LV services ducts"
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        style={{ display: showLv ? 'block' : 'none' }}
        draggable={false}
      />
    </>
  );
}
