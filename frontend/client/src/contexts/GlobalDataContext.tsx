/**
 * GlobalDataContext — consumer-driven revision
 *
 * The previous implementation prefetched every page's data the moment
 * authentication became true, producing:
 *   - 22 concurrent HTTP requests at login
 *   - 6.3 MB Primary Watchlist detail on every page, not just /watchlist
 *   - a duplicate raw safeFetch("/api/watchlist/list") outside React Query
 *   - up to 66 requests after retry expansion
 *
 * Each query is now owned by the page or component that visibly consumes it.
 * React Query's shared keys and 30-minute gcTime warm subsequent navigation
 * naturally, without an authenticated-startup burst.
 *
 * Ownership map (abbreviated):
 *   /api/home/dashboard              → home.tsx
 *   /api/themes/relative-strength    → home.tsx, watchlist.tsx, stocks-sectors.tsx
 *   /api/hyperliquid/signals         → home.tsx, hyperliquid-screener.tsx
 *   /api/predict/investor/overview   → home.tsx
 *   /api/predict/odds/live           → home.tsx
 *   /api/macro/rates                 → macro-terminal-live.tsx
 *   /api/macro/spy-history           → macro-terminal-live.tsx
 *   /api/sector-rotation/dashboard   → stocks-sectors.tsx
 *   /api/sector-rotation/analysis    → stocks-sectors.tsx
 *   /api/watchlist/list              → watchlist.tsx
 *   /api/watchlist/{id}              → watchlist.tsx (on demand, not at login)
 *   /api/hyperliquid/screener        → hyperliquid-screener.tsx
 *   /api/hyperliquid/tsmom-signals   → hyperliquid-screener.tsx
 *   /api/bittensor/*                 → bittensor-dashboard-section.tsx
 *   /api/notifai/weekly-summary      → notifai.tsx
 *   /api/notifai/the-brief           → notifai.tsx
 *   /api/predict/signals             → predict.tsx
 *   /api/predict/scored              → predict.tsx
 *
 * Rendered as null — preserved as a mount point in App.tsx in case a
 * genuinely app-shell-global query (account metadata, notification count, etc.)
 * is introduced in the future.
 */

export function GlobalPrefetch() {
  return null;
}
