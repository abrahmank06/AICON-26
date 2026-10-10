# AGENTS.md

## Commands (run from `yield-frontend/`)
- Dev server: `npm run dev` (port 5173)
- Verify: `npm run build` (tsc + vite), `npm run lint`, `npm test` (vitest)
- Visual check: `npm run capture` with the dev server running. It writes desktop and mobile screenshots of all views to `.impeccable/review/` and reports console errors and horizontal overflow. Use this (playwright-core + local Chrome), not `chrome --headless --screenshot`: CLI headless with virtual time never finishes JS animations or fetch latency, so it captures blank or half-rendered views.
- Rebuild mock data from the CSV: `npm run mock-data`
- Design detector: `D:/Maahir/impeccable/scripts/impeccable.cmd detect --json src index.html`

## Conventions
- All data access goes through `api` from `src/services/index.ts` (the `YieldApi` interface). Never fetch directly from components. `VITE_USE_MOCK=false` switches to `httpApi`.
- Shared types live in `src/types.ts`; the backend must match them.
- Global filters live in the URL via `useFilters()`; links between views must carry `search`.
- Design rules live in `DESIGN.md` (light jute and tag world, one stamped verdict per view, risk colours reserved). Product truth is in `PRODUCT.md`; the surface brief is in `.impeccable/surfaces/`.
- Chrome's `window.scrollTo` returns a Promise: never return it from a `useEffect` arrow.
- Plotly is only imported inside lazily loaded route chunks (`src/charts/Plot.tsx`), so keep it out of the Snapshot route.
