import { useEffect, useState } from 'react';

// ── Debug overlay ───────────────────────────────────────────────────────────
// Temporary on-screen diagnostic panel for the "Netlify shows 26 / localhost
// shows 41" investigation. Shows everything we need to compare deploys side
// by side without opening DevTools.
//
// Read at runtime from:
//   - window.__MCFC_BUILD__  (set by the inline seed script in the standalone
//                             HTML — present on both dev and deploy)
//   - localStorage           (whatever the React app is actually rendering
//                             from)
//   - props                  (viewport / camera state passed from EnergyMap)
//
// All values are RUNTIME, not what we hoped the values would be. Mismatches
// between input (snapshot) and what's rendered show up here as red counts.
//
// Toggle visibility with the ⓘ button in the corner; default = visible so
// the investigation is one click away on every page.

export interface DebugOverlayProps {
  /** Live React state — what the user is actually looking at on screen. */
  mapZoom: number;
  mapPan: { x: number; y: number };
  zoomedSiteName: string | null;
  /** Live counts from React state (NOT localStorage — these are what's rendered). */
  rendered: {
    overviewAssets: number;
    projectedAssets: number;
    userSites: number;
    cables: number;
    stickerPlacements: number;
  };
}

interface MCFCBuildInfo {
  iso?: string;
  local?: string;
  gitBranch?: string;
  gitCommit?: string;
  gitDirty?: boolean;
  mode?: "production" | "development";
  snapshotFile?: string;
  markers?: number;
  stickers?: number;
  labels?: number;
  cables?: number;
  photos?: number;
  userSites?: number;
  stickerPlacements?: number;
  source?: string;
  error?: string | null;
  stale?: number;
  written?: number;
  failed?: { key: string; message: string }[];
}

function readBuildInfo(): MCFCBuildInfo {
  if (typeof window === 'undefined') return {};
  const info = (window as unknown as { __MCFC_BUILD__?: MCFCBuildInfo }).__MCFC_BUILD__;
  return info ?? {};
}

function countLocalStorage(prefix: string): Record<string, number> {
  const counts: Record<string, number> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const v = localStorage.getItem(k);
        counts[k] = v ? v.length : 0;
      }
    }
  } catch { /* ignore */ }
  return counts;
}

function parseAssetCount(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

export function DebugOverlay({
  mapZoom,
  mapPan,
  zoomedSiteName,
  rendered,
}: DebugOverlayProps) {
  const [open, setOpen] = useState(true);
  const [, force] = useState(0);

  // Re-read localStorage every 2s so quota errors / migrations show up live.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const build = readBuildInfo();
  const sizes = countLocalStorage('energy-');
  const totalLocalStorageBytes = Object.values(sizes).reduce((a, b) => a + b, 0);
  const migrationFlag = (() => {
    try { return localStorage.getItem('energy-map-infra-migrated-v1'); } catch { return null; }
  })();

  // Live localStorage asset counts (NOT what react state shows — what's on disk in browser).
  const lsCounts = {
    cfa: parseAssetCount('energy-submap-cfa-map-assets'),
    etihad: parseAssetCount('energy-submap-etihad-stadium-map-assets'),
    coop: parseAssetCount('energy-submap-co-op-live-map-assets'),
    overview: parseAssetCount('energy-map-user-assets'),
    userSites: parseAssetCount('energy-map-user-sites'),
    cables: parseAssetCount('energy-map-cables'),
  };
  const lsTotalAssets = lsCounts.cfa + lsCounts.etihad + lsCounts.coop + lsCounts.overview;
  const renderedTotalAssets = rendered.overviewAssets + rendered.projectedAssets;

  const bundledTotalAssets = build.markers ?? 0;
  const bundledMatchesRendered = bundledTotalAssets === renderedTotalAssets;
  const lsMatchesRendered = lsTotalAssets === renderedTotalAssets;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 9999,
          background: 'rgba(15,23,42,0.85)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6,
          padding: '4px 8px',
          fontSize: 11,
          fontFamily: 'ui-monospace, monospace',
          cursor: 'pointer',
        }}
        title="Open debug overlay"
      >
        🛠 debug
      </button>
    );
  }

  const ok = '#86efac';
  const mismatch = '#fca5a5';
  const muted = 'rgba(255,255,255,0.55)';

  return (
    <div
      data-testid="mcfc-debug-overlay"
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 9999,
        background: 'rgba(15,23,42,0.9)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        padding: '8px 10px',
        fontSize: 11,
        lineHeight: 1.4,
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        minWidth: 320,
        maxWidth: 480,
        maxHeight: '90vh',
        overflowY: 'auto',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <strong style={{ flex: 1 }}>🛠 MCFC debug</strong>
        <button
          onClick={() => setOpen(false)}
          style={{ background: 'transparent', color: muted, border: 'none', cursor: 'pointer', fontSize: 13 }}
          title="Hide"
        >
          ×
        </button>
      </div>

      <Row label="Build" value={build.local ?? 'unknown'} />
      <Row label="Git" value={`${build.gitBranch ?? '?'} @ ${build.gitCommit ?? '?'}${build.gitDirty ? ' (dirty)' : ''}`} valueColor={build.gitDirty ? mismatch : undefined} />
      <Row label="App mode" value={build.mode ?? 'unknown'} valueColor={build.mode === 'production' || build.mode === 'development' ? ok : mismatch} />
      <Row label="Snapshot file" value={build.snapshotFile ?? 'unknown'} />
      <Row label="Data source" value={build.source ?? 'unknown'} valueColor={(build.source === 'bundled snapshot' || build.source === 'inlined snapshot') ? ok : mismatch} />
      <Row label="Migration flag" value={migrationFlag ?? '(not set)'} valueColor={build.mode === 'production' ? muted : (migrationFlag === 'true' ? ok : mismatch)} />
      {build.mode === 'production' && (
        <Row label="localStorage" value="ignored — deploy uses bundled snapshot only" valueColor={ok} />
      )}

      <Divider />

      <Row label="Bundled (snapshot)" value={`${bundledTotalAssets} markers · ${build.cables ?? '?'} cables · ${build.labels ?? '?'} labels · ${build.stickers ?? '?'} stickers`} />
      <Row label="localStorage" value={`${lsTotalAssets} markers · ${lsCounts.cables} cables · ${lsCounts.userSites} user-sites`} valueColor={lsMatchesRendered ? ok : mismatch} />
      <Row label="Rendered" value={`${renderedTotalAssets} markers · ${rendered.cables} cables · ${rendered.userSites} user-sites · ${rendered.stickerPlacements} stickers`} valueColor={bundledMatchesRendered ? ok : mismatch} />

      <Divider />

      <Row label="Overview assets" value={`${rendered.overviewAssets} (state) · ${lsCounts.overview} (LS)`} />
      <Row label="Projected" value={`CFA ${lsCounts.cfa} · Etihad ${lsCounts.etihad} · Co-op ${lsCounts.coop} = ${rendered.projectedAssets}`} />

      <Divider />

      <Row label="Initial camera" value={`zoom ${mapZoom.toFixed(2)} · pan (${mapPan.x.toFixed(0)}, ${mapPan.y.toFixed(0)})`} valueColor={mapZoom === 1 && mapPan.x === 0 && mapPan.y === 0 ? ok : mismatch} />
      <Row label="Zoomed site" value={zoomedSiteName ?? '(none)'} />

      <Divider />

      <Row label="LS keys" value={`${Object.keys(sizes).length} · ${(totalLocalStorageBytes / 1024).toFixed(1)} KB total`} />
      {build.failed && build.failed.length > 0 && (
        <Row label="Seed errors" value={`${build.failed.length} key(s) failed to write`} valueColor={mismatch} />
      )}
      {build.error && (
        <Row label="Error" value={build.error} valueColor={mismatch} />
      )}

      <div style={{ marginTop: 6, fontSize: 10, color: muted }}>
        ⓘ Green = matches expected. Red = drift. Re-reads every 2s.
        Console: <code>__mcfcDiag()</code>
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
      <span style={{ color: 'rgba(255,255,255,0.55)', flexShrink: 0, minWidth: 100 }}>{label}:</span>
      <span style={{ color: valueColor ?? '#fff', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />;
}
