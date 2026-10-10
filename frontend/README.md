# YIELD frontend

Dashboard for YIELD, the vegetable price-spike early-warning system (Null Pointerz, AICON'26). React 19 + TypeScript + Vite.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Views

| Route | View |
| --- | --- |
| `/snapshot` | Live Snapshot: stamped risk verdict, today's price, volatility and panic readings |
| `/forecast` | 7-day forecast with likely range and spike alert banner |
| `/time-machine` | Replay a past date: prediction vs what happened, plus a historical analogue (`?travel=YYYY-MM-DD`) |
| `/alerts` | Sortable, filterable alert log |
| `/performance` | MAPE/RMSE/MAE, alert precision/recall/false alarms/lead time, business impact |

Global filters (`market`, `crop`, `date`) live in the URL, so every view is shareable.

## Data: mock now, backend later

All data goes through the `YieldApi` interface in `src/services/api.ts`.

- **Mock (default):** `src/services/mock/` reads real AMIS price history from `public/mock-data/` (built from `../yield_features_final.csv` with `npm run mock-data`). Forecasts, alerts, accuracy and attributions come from a heuristic placeholder model in `model.ts`. The header shows a "Demo data" chip while this is active.
- **Backend:** set `VITE_USE_MOCK=false` and `VITE_API_URL` (see `.env.example`). `src/services/httpApi.ts` calls placeholder endpoints (`/snapshot`, `/forecast`, `/time-machine`, `/alerts`, `/analytics`, `/performance`) that must return the shapes in `src/types.ts`. Adjust paths there once the backend contract is final.

## Scripts

- `npm run build`: type-check and production build
- `npm run lint`: ESLint
- `npm test`: Vitest (placeholder model against the real data)
- `npm run capture`: screenshots of every view at desktop and mobile widths into `.impeccable/review/` (needs the dev server and a local Chrome)

Design system: see `DESIGN.md`. Product context: see `PRODUCT.md`.
