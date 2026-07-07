# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- App: `artifacts/energy-map/` (Vite + React campus energy map)
- **Layout source of truth** — the permanent positions of everything on the canvas:
  - `src/data/assets.ts` — asset markers (x/y % of canvas) + the `AssetType` union
  - `src/data/assetTypes.ts` — registry of every marker type (label, icon, colour);
    add a new type here and it flows to markers, legend, filters and the dialog
  - `src/data/sites.ts` — site labels (x/y %)
  - `src/data/stickers.ts` — image stickers (x/y/width/rotation)
  - `src/data/submaps.ts` — sub-map images
- Map images: `attached_assets/` (referenced via the `@assets` alias)

## Gotchas

- The in-app edit modes ("Edit positions", "Move labels", drag stickers) only
  save to the browser (`localStorage`, keys prefixed `energy-map-`). To make a
  layout permanent, bake the coordinates into the `src/data/*.ts` files above.
- Map images must keep a 16:9 ratio — the canvas hard-codes `aspectRatio: 16/9`
  so markers don't collapse while the (large) image loads.

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
