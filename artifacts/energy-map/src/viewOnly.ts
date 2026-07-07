// Read-only ("deploy") mode. Build with VITE_VIEW_ONLY=true to produce a
// published version of the app with every editing control removed — viewers
// can explore the map, open info panels, filter and view data, but cannot
// add, move, delete or change anything. Normal local dev (no env var) keeps
// the full editor.
//
// `import.meta.env.VITE_VIEW_ONLY` is accessed directly so Vite statically
// replaces it at build time.
export const VIEW_ONLY: boolean =
  (import.meta.env as unknown as Record<string, string | undefined>).VITE_VIEW_ONLY === 'true';
