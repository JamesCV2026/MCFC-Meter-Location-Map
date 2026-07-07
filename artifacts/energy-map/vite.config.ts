import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import type { IncomingMessage, ServerResponse } from "http";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Dev-only: lets the running app persist its localStorage to
// public/snapshot.json, so work survives the browser storage being cleared.
function snapshotSaver(): Plugin {
  return {
    name: "snapshot-saver",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(
        "/__save-snapshot",
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end();
            return;
          }
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            try {
              JSON.parse(body); // validate before writing
              fs.writeFileSync(
                path.resolve(import.meta.dirname, "public", "snapshot.json"),
                body,
              );
              res.statusCode = 200;
              res.end("ok");
            } catch {
              res.statusCode = 400;
              res.end("invalid");
            }
          });
        },
      );

      // ── Export Live State to HTML ─────────────────────────────────────
      // POST /__export-html with the user's CURRENT browser localStorage
      // as the JSON body. This bypasses the periodic snapshot-saver entirely
      // and uses the exact state shown in the live preview, then runs the
      // full build pipeline (vite → photo extraction → single-file HTML).
      //
      // Why a separate endpoint:
      //   - /__save-snapshot only persists; it does NOT build.
      //   - The build pipeline reads from disk; this endpoint guarantees
      //     the disk it reads is exactly what the browser just sent.
      //   - All counts and paths are logged so the export can be audited.
      server.middlewares.use(
        "/__export-html",
        (req: IncomingMessage, res: ServerResponse) => {
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end("POST only");
            return;
          }
          let body = "";
          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            const root = import.meta.dirname;
            const publicSnap = path.resolve(root, "public", "snapshot.json");
            const distSnap = path.resolve(root, "dist", "public", "snapshot.json");
            const outHtml = path.resolve(root, "mcfc-campus-map.html");
            const log: string[] = [];
            const startedAt = new Date().toISOString();
            const tee = (line: string) => { log.push(line); console.log("[export-html] " + line); };

            try {
              // 1. Parse & validate the payload
              tee("=== Export started " + startedAt + " ===");
              tee("Body size: " + body.length + " bytes");
              const snapshot = JSON.parse(body) as Record<string, string>;
              const keyCount = Object.keys(snapshot).length;
              tee("Parsed " + keyCount + " localStorage keys from browser");

              // 2. Count what's in the payload BEFORE writing
              const counts = countSnapshot(snapshot);
              tee("Input counts (from browser localStorage):");
              tee("  total assets:       " + counts.totalAssets);
              tee("  overview assets:    " + counts.overviewAssets);
              tee("  sub-map assets:     " + counts.subMapAssetsTotal);
              for (const [submap, n] of Object.entries(counts.subMapBreakdown)) {
                tee("    " + submap + ": " + n);
              }
              tee("  user-sites:         " + counts.userSites);
              tee("  cables:             " + counts.cables);
              tee("  sticker placements: " + counts.stickerPlacements);
              tee("  sticker photos:     " + counts.stickerPhotos);

              // 3. Write to BOTH public/snapshot.json (so vite can copy it)
              //    AND dist/public/snapshot.json (so the build script reads
              //    it even if vite is skipped). Unlock files first in case
              //    they were read-only from prior export-protect runs.
              [publicSnap, distSnap].forEach((p) => {
                try { fs.chmodSync(p, 0o644); } catch { /* ignore */ }
              });
              fs.writeFileSync(publicSnap, body);
              tee("Wrote " + publicSnap + " (" + body.length + " bytes)");

              // 4. Run the full build pipeline so the inline-snapshot in
              //    the HTML reflects the exact state we just wrote.
              tee("Running: npm run build (vite + extract-sticker-photos)...");
              const buildOut = execSync("npm run build", { cwd: root, stdio: "pipe" }).toString();
              tee("  npm run build OK (last line: " + buildOut.trim().split("\n").pop() + ")");

              // 5. Now run build-singlefile to produce mcfc-campus-map.html.
              tee("Running: node scripts/build-singlefile.cjs...");
              const sfOut = execSync("node scripts/build-singlefile.cjs", { cwd: root, stdio: "pipe" }).toString();
              tee("  build-singlefile OK:");
              sfOut.trim().split("\n").forEach((l) => tee("    " + l));

              // 6. Verify the actual HTML on disk matches the input counts.
              const stat = fs.statSync(outHtml);
              tee("Output HTML: " + outHtml);
              tee("  size: " + stat.size + " bytes  mtime: " + stat.mtime.toISOString());
              const html = fs.readFileSync(outHtml, "utf8");
              const m = html.match(/<script type="application\/json" id="mcfc-snapshot-data">([\s\S]*?)<\/script>/);
              if (m) {
                const inlineSnap = JSON.parse(m[1]) as Record<string, string>;
                const inlineCounts = countSnapshot(inlineSnap);
                tee("Inlined HTML counts (verification):");
                tee("  total assets:       " + inlineCounts.totalAssets + (inlineCounts.totalAssets === counts.totalAssets ? " ✓" : " ✗ MISMATCH"));
                tee("  user-sites:         " + inlineCounts.userSites + (inlineCounts.userSites === counts.userSites ? " ✓" : " ✗ MISMATCH"));
                tee("  cables:             " + inlineCounts.cables + (inlineCounts.cables === counts.cables ? " ✓" : " ✗ MISMATCH"));
                tee("  sticker placements: " + inlineCounts.stickerPlacements + (inlineCounts.stickerPlacements === counts.stickerPlacements ? " ✓" : " ✗ MISMATCH"));
              } else {
                tee("WARNING: could not find inline snapshot block in output HTML");
              }

              tee("=== Export complete ===");
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                ok: true,
                outputPath: outHtml,
                sizeBytes: stat.size,
                counts,
                log,
              }, null, 2));
            } catch (e) {
              const err = e instanceof Error ? e : new Error(String(e));
              tee("ERROR: " + err.message);
              if (err.stack) tee(err.stack);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: err.message, log }, null, 2));
            }
          });
        },
      );
    },
  };
}

// Count visible items in a snapshot payload — used for input/output diffing.
function countSnapshot(s: Record<string, string>): {
  totalAssets: number;
  overviewAssets: number;
  subMapAssetsTotal: number;
  subMapBreakdown: Record<string, number>;
  userSites: number;
  cables: number;
  stickerPlacements: number;
  stickerPhotos: number;
} {
  const parse = <T>(k: string, fallback: T): T => {
    const raw = s[k];
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };
  const overview = parse<{ id: string }[]>("energy-map-assets", []);
  const subMapBreakdown: Record<string, number> = {};
  let subMapTotal = 0;
  for (const k of Object.keys(s)) {
    if (k.startsWith("energy-submap-") && k.endsWith("-assets")) {
      const arr = parse<{ id: string }[]>(k, []);
      const name = k.replace("energy-submap-", "").replace("-assets", "");
      subMapBreakdown[name] = arr.length;
      subMapTotal += arr.length;
    }
  }
  const userSites = parse<{ id: string }[]>("energy-map-user-sites", []);
  const cables = parse<{ id: string }[]>("energy-map-cables", []);
  const placements = parse<Record<string, unknown>>("energy-map-sticker-placements", {});
  const photos = parse<Record<string, string[]>>("energy-map-sticker-photos", {});
  return {
    totalAssets: overview.length + subMapTotal,
    overviewAssets: overview.length,
    subMapAssetsTotal: subMapTotal,
    subMapBreakdown,
    userSites: userSites.length,
    cables: cables.length,
    stickerPlacements: Object.keys(placements).length,
    stickerPhotos: Object.keys(photos).length,
  };
}

// Replit provides PORT and BASE_PATH; fall back to local-dev defaults otherwise.
const rawPort = process.env.PORT ?? "5173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    snapshotSaver(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    watch: {
      // Auto-saved snapshots must not trigger a dev-server reload.
      ignored: ["**/public/snapshot.json"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
