---
name: GlobalPrefetch ownership
description: GlobalPrefetch in GlobalDataContext.tsx is now empty (returns null). All queries moved to page/component owners. Never re-add global warmups without checking page ownership first.
---

## Rule
`GlobalPrefetch` in `GlobalDataContext.tsx` must return null. Every query has a confirmed page/component-level `useQuery()` owner.

**Why:** The previous GlobalPrefetch fired 22–66 concurrent HTTP requests at login, including a 6.3 MB watchlist detail on every page. React Query's shared keys + 30-min `gcTime` warm subsequent navigation naturally.

## Ownership Map
| Query | Page/Component Owner |
|---|---|
| `/api/home/dashboard` + 9 more | `home.tsx` |
| `/api/watchlist/list` | `watchlist.tsx` |
| `/api/watchlist/{id}` | `watchlist.tsx` (on demand only) |
| `/api/themes/relative-strength` | `home.tsx`, `watchlist.tsx`, `stocks-sectors.tsx` |
| `/api/hyperliquid/signals` | `home.tsx`, `hyperliquid-screener.tsx` |
| `/api/macro/rates` + spy-history | `macro-terminal-live.tsx` |
| `/api/sector-rotation/*` | `stocks-sectors.tsx` |
| `/api/bittensor/*` | `bittensor-dashboard-section.tsx` |
| `/api/notifai/*` | `notifai.tsx` |
| `/api/predict/*` | `predict.tsx`, `home.tsx` |
| `/api/hyperliquid/screener` + tsmom | `hyperliquid-screener.tsx` |

## How to Apply
Before adding anything to GlobalPrefetch, verify: (1) no page already owns the query via useQuery(), (2) it is compact, (3) begins after first content, (4) does not compete with current route. If all fail, add it to the destination page instead.

## Tests
34 ownership-proof unit tests at `frontend/client/src/contexts/__tests__/global-prefetch-ownership.test.ts`.
