import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { VIEW_ONLY } from "./viewOnly";
import { migrateInfrastructure } from "./data/migrateInfrastructure";
import { initSnapshotSync } from "./snapshotSync";

// ── Boot-time snapshot loading — two STRICTLY SEPARATE modes ───────────────
//
// PRODUCTION (deploy, import.meta.env.PROD === true):
//   1. ALWAYS wipe every `energy-*` localStorage key on boot. No exceptions.
//   2. Fetch the bundled `snapshot.json` and seed localStorage from it.
//   3. Skip `migrateInfrastructure` — the bundled snapshot is canonical.
//   4. Skip `snapshotSync` — the deploy is read-only.
//   5. Populate `window.__MCFC_BUILD__` with metadata so the debug overlay
//      shows real counts on the deploy, not "unknown".
//
//   The deploy is now deterministic: every visitor sees exactly the bundled
//   state, never a half-merged blend of someone else's old localStorage and
//   a hard-coded `infrastructure.ts` fallback.
//
// DEVELOPMENT (vite dev / localhost):
//   1. If localStorage is empty → seed from snapshot.json (first visit).
//   2. Otherwise leave it alone so in-flight edits survive a refresh.
//   3. Run migrations + snapshot-sync as before.
//
// The mode is decided by Vite's compile-time constant `import.meta.env.PROD`,
// so DEAD-CODE elimination physically REMOVES the dev branch from production
// bundles. There is no way for the deploy to accidentally enter dev mode.

const SNAPSHOT_VERSION_KEY = "energy-map-snapshot-version";

interface McfcBuildInfo {
  iso: string;
  local: string;
  mode: "production" | "development";
  source: string;
  snapshotFile: string;
  markers: number;
  stickers: number;
  labels: number;
  cables: number;
  photos: number;
  userSites: number;
  stickerPlacements: number;
  error?: string | null;
}

function setBuildInfo(patch: Partial<McfcBuildInfo>): McfcBuildInfo {
  const w = window as unknown as { __MCFC_BUILD__?: McfcBuildInfo };
  const existing = w.__MCFC_BUILD__ ?? ({} as McfcBuildInfo);
  w.__MCFC_BUILD__ = { ...existing, ...patch } as McfcBuildInfo;
  return w.__MCFC_BUILD__;
}

function countSnapshot(data: Record<string, string>) {
  const parse = <T,>(k: string, fb: T): T => {
    const raw = data[k];
    if (!raw) return fb;
    try { return JSON.parse(raw) as T; } catch { return fb; }
  };
  let subMapTotal = 0;
  for (const k of Object.keys(data)) {
    if (k.startsWith("energy-submap-") && k.endsWith("-assets")) {
      subMapTotal += parse<unknown[]>(k, []).length;
    }
  }
  const overview = parse<unknown[]>("energy-map-assets", []);
  const userAssets = parse<unknown[]>("energy-map-user-assets", []);
  const userSites = parse<unknown[]>("energy-map-user-sites", []);
  const cables = parse<unknown[]>("energy-map-cables", []);
  const placements = parse<Record<string, unknown>>("energy-map-sticker-placements", {});
  const photos = parse<Record<string, unknown>>("energy-map-sticker-photos", {});
  let labels = userSites.length;
  for (const k of Object.keys(data)) {
    if (k.startsWith("energy-submap-") && k.endsWith("-labels")) {
      labels += parse<unknown[]>(k, []).length;
    }
  }
  return {
    markers: overview.length + userAssets.length + subMapTotal,
    userSites: userSites.length,
    cables: cables.length,
    stickers: Object.keys(placements).length,
    stickerPlacements: Object.keys(placements).length,
    labels,
    photos: Object.keys(photos).length,
  };
}

function wipeEnergyKeys(): number {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("energy-")) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  return keys.length;
}

// Rewrites entries in the energy-map-user-sites list whose `name` matches a
// given `from`, replacing it with `to`. Each rewrite is recorded under its
// own flag in localStorage so it only ever runs once per browser, even if
// the user later renames the label themselves.
function applyUserSiteRenames(rewrites: { from: string; to: string; flag: string }[]): void {
  const FLAG_PREFIX = "energy-map-rename-applied:";
  try {
    const raw = localStorage.getItem("energy-map-user-sites");
    if (!raw) return;
    const list = JSON.parse(raw) as { id: string; name: string }[];
    if (!Array.isArray(list)) return;
    let changed = 0;
    for (const r of rewrites) {
      const flagKey = FLAG_PREFIX + r.flag;
      if (localStorage.getItem(flagKey)) continue;
      let touched = 0;
      for (const item of list) {
        if (item && item.name === r.from) {
          item.name = r.to;
          touched++;
        }
      }
      localStorage.setItem(flagKey, "1");
      if (touched > 0) {
        changed += touched;
        console.info(`[mcfc-map] Renamed ${touched}× '${r.from}' → '${r.to}'.`);
      }
    }
    if (changed > 0) {
      localStorage.setItem("energy-map-user-sites", JSON.stringify(list));
    }
  } catch {
    /* localStorage may be unavailable / parse-broken — best-effort migration */
  }
}

async function seedSnapshot(): Promise<{ ok: boolean; keys: number }> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}snapshot.json`, { cache: "no-store" });
    if (!res.ok) {
      console.info("[mcfc-map] snapshot.json not available (HTTP " + res.status + ") — using baked-in defaults.");
      return { ok: false, keys: 0 };
    }
    const data = await res.json();
    let count = 0;
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        localStorage.setItem(key, value);
        count++;
      }
    }
    return { ok: true, keys: count };
  } catch (e) {
    console.info("[mcfc-map] snapshot.json fetch failed — using baked-in defaults.", e);
    return { ok: false, keys: 0 };
  }
}

// True when no app data exists in localStorage — a fresh start, or storage
// was wiped. Used to decide whether to seed from the bundled snapshot.
function hasNoStoredData(): boolean {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("energy-")) return false;
  }
  return true;
}

async function boot() {
  // Seed the build-info object as early as possible so the debug overlay
  // can render something even if every subsequent step fails.
  const buildIso = new Date().toISOString();
  const buildLocal = new Date().toLocaleString("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  setBuildInfo({
    iso: buildIso,
    local: buildLocal,
    mode: import.meta.env.PROD ? "production" : "development",
    source: "pending",
    snapshotFile: "snapshot.json",
    markers: 0,
    stickers: 0,
    labels: 0,
    cables: 0,
    photos: 0,
    userSites: 0,
    stickerPlacements: 0,
    error: null,
  });

  if (import.meta.env.PROD) {
    // ── PRODUCTION (deploy) — always seed from bundled snapshot ─────────
    const wiped = wipeEnergyKeys();
    console.info(`[mcfc-map] PROD boot: wiped ${wiped} stale energy-* localStorage keys.`);
    const res = await seedSnapshot();
    if (res.ok) {
      // Re-fetch the snapshot to count it (the seed loop discarded the parsed object).
      try {
        const snapRes = await fetch(`${import.meta.env.BASE_URL}snapshot.json`, { cache: "no-store" });
        const data = await snapRes.json();
        const counts = countSnapshot(data);
        setBuildInfo({
          source: "bundled snapshot",
          ...counts,
        });
        console.info(
          `[mcfc-map] PROD boot: seeded ${res.keys} keys from bundled snapshot.json — ${counts.markers} markers · ${counts.cables} cables · ${counts.labels} labels · ${counts.stickers} stickers.`,
        );
      } catch (e) {
        setBuildInfo({ source: "bundled snapshot", error: e instanceof Error ? e.message : String(e) });
      }
      localStorage.setItem(SNAPSHOT_VERSION_KEY, buildIso);
    } else {
      setBuildInfo({ source: "no snapshot found (404)", error: "snapshot.json fetch failed in production" });
      console.error("[mcfc-map] PROD boot: snapshot.json NOT FOUND — deploy is misconfigured. Map will be empty.");
    }

    // Apply the persistent user-site renames so old-named entries in the
    // bundled snapshot get their final names. Runs once per browser session.
    applyUserSiteRenames([
      { from: "Cable B", to: "Cable B for future development opportunities", flag: "rename-cable-b-2026-06" },
    ]);

    // Migration is DISABLED in production. The bundled snapshot is canonical;
    // re-running infrastructure migration would only re-introduce the 26-asset
    // reset the user has been hitting.

    createRoot(document.getElementById("root")!).render(<App />);
    // No snapshotSync in production — the deploy is read-only.
  } else {
    // ── DEVELOPMENT (localhost) — preserve in-flight edits ──────────────
    const cold = hasNoStoredData();
    if (cold) {
      const res = await seedSnapshot();
      if (res.ok) {
        console.info(
          `[mcfc-map] DEV boot: seeded ${res.keys} keys from snapshot.json — first visit / cleared storage.`,
        );
        localStorage.setItem(SNAPSHOT_VERSION_KEY, buildIso);
        setBuildInfo({ source: "bundled snapshot (cold start)" });
      } else {
        setBuildInfo({ source: "baked defaults" });
        console.info("[mcfc-map] DEV boot: cold start with no snapshot — running on baked defaults.");
      }
    } else {
      setBuildInfo({ source: "existing localStorage" });
      console.info(
        "[mcfc-map] DEV boot: using existing localStorage. To force a reset run __resetSnapshot() in the console.",
      );
    }

    // Migrations and renames only run in dev.
    migrateInfrastructure();
    applyUserSiteRenames([
      { from: "Cable B", to: "Cable B for future development opportunities", flag: "rename-cable-b-2026-06" },
    ]);

    // Update __MCFC_BUILD__ with whatever ended up in localStorage so the
    // debug overlay shows live counts on the editor too.
    const liveSnapshot: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("energy-")) {
        const v = localStorage.getItem(k);
        if (v !== null) liveSnapshot[k] = v;
      }
    }
    setBuildInfo(countSnapshot(liveSnapshot));

    createRoot(document.getElementById("root")!).render(<App />);
    initSnapshotSync();
  }

  // Expose a manual reset in BOTH modes — `__resetSnapshot()` wipes
  // localStorage and reloads, forcing a clean re-seed.
  if (typeof window !== "undefined") {
    (window as unknown as { __resetSnapshot: () => void }).__resetSnapshot = () => {
      const cleared = wipeEnergyKeys();
      console.info(`[mcfc-map] Cleared ${cleared} keys. Reloading…`);
      location.reload();
    };
  }

  // __exportToHTML is DEV-only — it talks to the dev server.
  if (import.meta.env.DEV && typeof window !== "undefined") {
    // Live export — collects the CURRENT browser localStorage and POSTs it
    // to the dev server's /__export-html endpoint, which runs the full
    // build pipeline using exactly the state shown in this preview.
    // Run in the console:  await __exportToHTML()
    (window as unknown as { __exportToHTML: () => Promise<unknown> }).__exportToHTML = async () => {
      const payload: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("energy-")) {
          const v = localStorage.getItem(k);
          if (v !== null) payload[k] = v;
        }
      }
      const keyCount = Object.keys(payload).length;
      console.info(`[mcfc-map] Exporting ${keyCount} localStorage keys to HTML…`);

      // Pre-flight count (so we see what's leaving the browser)
      const overviewN = JSON.parse(payload["energy-map-assets"] || "[]").length;
      let subMapN = 0;
      const subMapBreakdown: Record<string, number> = {};
      for (const k of Object.keys(payload)) {
        if (k.startsWith("energy-submap-") && k.endsWith("-assets")) {
          const arr = JSON.parse(payload[k] || "[]");
          const name = k.replace("energy-submap-", "").replace("-assets", "");
          subMapBreakdown[name] = arr.length;
          subMapN += arr.length;
        }
      }
      const userSites = JSON.parse(payload["energy-map-user-sites"] || "[]").length;
      const cables = JSON.parse(payload["energy-map-cables"] || "[]").length;
      console.info(`[mcfc-map]   browser totals — assets: ${overviewN + subMapN} (overview ${overviewN} + sub-maps ${subMapN}), user-sites: ${userSites}, cables: ${cables}`);
      console.info(`[mcfc-map]   sub-map breakdown:`, subMapBreakdown);

      const res = await fetch("/__export-html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        console.error("[mcfc-map] Export FAILED:", result);
        return result;
      }
      console.info(`[mcfc-map] ✅ Export OK → ${result.outputPath}`);
      console.info(`[mcfc-map]   size: ${result.sizeBytes} bytes`);
      console.info(`[mcfc-map]   server-side counts:`, result.counts);
      console.info(`[mcfc-map] Full server log:\n${result.log.join("\n")}`);
      return result;
    };
  }
}

// Silence the unused-import warning when VIEW_ONLY isn't referenced below
// in conditional branches — the value is consumed at build time too.
void VIEW_ONLY;

boot();
