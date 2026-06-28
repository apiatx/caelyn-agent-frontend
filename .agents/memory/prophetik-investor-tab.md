---
name: Prophetik Investor Tab
description: Data source, fallback logic, and TS pitfalls for prophetik-investor-tab.tsx
---

## Data fetch order
1. Try `/api/predict/investor/intelligence` — if `equity_signals` or `tracked_odds` present, use it.
2. Fall back to `/api/predict/investor/overview` — if both fail, show error state.
3. The intelligence endpoint also returns all overview-compatible fields (top_equity_signals, regime_scoreboard, sector_rotation, theme_clusters, watchlists).

**Why:** Backend may not always have intelligence data ready; overview is the stable fallback.

## TS pitfalls in this file
- `Map.entries()` spread (`[...map.entries()]`) fails at tsconfig targets below ES2015. Use `Array.from(map.entries())` instead.
- Lucide icons don't accept a `title` prop — wrap in `<span title="..."><Icon /></span>`.
- Concatenating `TickerImpact[]` onto `string[]` with `.concat()` breaks type inference — use spread array literal instead: `[...(a ?? []).map(t => t.ticker), ...(b ?? []).map(t => t.ticker)]`.

## Endpoint proxy location
`frontend/server/routes.ts` line ~5050 — all five investor routes in one block under the comment "Prophetik Investor tab endpoints".

**How to apply:** When adding new investor sub-endpoints, follow the same one-liner `proxyPredict()` pattern used for the existing five routes.
