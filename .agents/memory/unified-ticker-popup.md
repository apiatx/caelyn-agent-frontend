---
name: Unified ticker popup
description: Architecture of the single-modal ticker detail system across Watchlist + Confluence; key decisions for future work.
---

## Rule
`StockDetailModal` is the ONE popup for ticker detail on the Watchlist page. `V42DetailDrawer` code remains in `caelyn-confluence.tsx` but is never triggered (its render was removed and row onClick now calls `onTickerClick?.(ticker)` directly).

## Backend endpoint
`GET /api/watchlist/ticker-detail/:symbol` — Express proxy at `routes.ts` (added after the `/:wid/news` route block). Uses `WL_URL` + `wlHdr()` (same FastAPI base as all watchlist routes). Frontend query key: `['ticker-detail', ticker.toUpperCase()]`, staleTime 5 min.

## Tab structure (as of this session)
`overview | technical | fundamentals | news | deep-dive`

- **Overview**: TradingView chart → Earnings → About (company profile, calm fallback if no description) → Confluence summary with component breakdown + catalyst explanation from `detail.direct_catalyst.catalyst_explanation`.
- **Technical**: All fields from `detail.technical` rendered as a key-value grid.
- **Fundamentals**: Fields from `detail.fundamentals` (backend first); falls back to CSV/analysis data.
- **News**: Uses `detail.news.direct_catalyst_articles` first, then `detail.news.articles`. No more red retry message. Calm empty states only.
- **AI Deep Dive**: Unchanged from original.

## Quote fallback
If `detail.quote.quote_status === 'row_fallback_recommended'`, header uses `confluenceRow` values. `confluenceRows` prop passed from `watchlist.tsx` as `confluenceRows ?? csvMergedScreenerRows`.

**Why:** Backend real-time quote may be stale/unavailable for some tickers; screener row data is a reliable LKG source for price/change.

## How to apply
- Any new Watchlist ticker popup should go through `handleTickerClick` → `setSelectedTicker` → `StockDetailModal`.
- Do NOT re-enable `V42DetailDrawer` or add a second modal.
- The `/:wid` catch-all in routes.ts calls `next()` for specific slugs — no conflict because `ticker-detail/:symbol` is 4 path segments vs 3 for `/:wid`.
