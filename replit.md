# CaelynAI / CryptoHippo Platform

## Overview
Full-stack crypto and stock market intelligence platform built with React (Vite) + Express/TypeScript.

## Architecture
- **Frontend**: React + Vite + TailwindCSS, served from `frontend/client/`
- **Backend proxy**: Express server at `frontend/server/` that proxies to FastAPI backend
- **FastAPI backend**: `https://fast-api-server-trading-agent-aidanpilon.replit.app` (API key: `hippo_ak_7f3x9k2m4p8q1w5t`)

## Key Pages
1. **AI Terminal** (`/app/caelyn-ai`) — Agent-driven market Q&A
2. **Macro Dashboard** (`/app/macro-terminal`) — React Query; keys: `['/api/macro/rates']`, `['/api/macro/spy-history']`
3. **Sectors** (`/app/stocks/sectors`) — React Query; keys: `["sector-rotation-dashboard"]`, `["sector-rotation-analysis"]`. Sidebar label: "Sectors". Page title: "Sectors". Includes `WinningSectorsHero` (renders `dash.leaders[]` prominently) and `TopStocksPanel` (renders `analysis.top_stocks_to_watch[]` grouped by role).
4. **NotifAI** (`/app/notifai`) — useQuery; keys: `['notifai-weekly-summary']`, `['notifai-the-brief']`
5. **Watchlist** (`/app/watchlist`) — React Query; key: `['/api/watchlist/list']`
6. **Portfolio** (`/app/portfolio`) — Static page, no backend fetches
7. **Hyperliquid** (`/app/hyperliquid-screener`) — React Query; keys: `['hl-screener', marketType]`, `['hl-advanced-signals']`, `['tsmom-signals']`
8. **Prophetik** (`/app/predict`) — useQuery; keys: `['predict-signals']`, `['predict-scored']`; tab switcher: Gambler / Investor
9. **Bittensor** (`/app/bittensor`) — React Query; keys: `["/api/bittensor/dashboard"]`, `["/api/bittensor/price/history"]`, `["/api/bittensor/blocks/history?scale=hours&points=30"]`

## Global Data Prefetch System
`frontend/client/src/contexts/GlobalDataContext.tsx` exports `GlobalPrefetch` component.

Mounted inside `AuthGuard` in `App.tsx`. On authentication confirmed, fires `queryClient.prefetchQuery()` for **all 9 pages** simultaneously so every page loads with data already in cache — no loading spinners on first visit.

Token stored as `caelyn_token` in localStorage/sessionStorage.

## Prophetik Investor Tab
- `frontend/client/src/pages/predict.tsx` — tab switcher (`"gambler" | "investor"`)
- `frontend/client/src/components/prophetik-investor-tab.tsx` — 5 sections (TopEquitySignals, RegimeScoreboard, SectorRotationSignals, StockWatchlists, ThemeClusters)
- Backend endpoint: `/api/predict/investor/overview` (single comprehensive endpoint)
- Data transforms: `transformRegime()` (obj→array), `transformSectors()` (obj→flat array), `_watchlist` suffix on watchlist keys

## Hyperliquid Charts
- Default interval is `'1d'` (changed from `'1h'` to avoid "no data" errors)
- `CoinChartPanel` has auto-fallback: if requested interval returns ≤1 candle, automatically queries `'1d'` instead
- Fallback interval label shown in parentheses next to coin name

## Route / Auth Notes
- Whale routes: `stats/famous/discover-famous` must be BEFORE `GET /api/whales/:name/holdings`
- Upload proxy: `POST /api/watchlist/upload` must be before `GET /api/watchlist/:wid`
- Investor proxy routes: `/investor/overview`, `/investor/regime`, `/investor/watchlists`, `/investor/themes`
- Category filter for markets: backend proxy `/api/predict/markets?tag=<ExactCasing>` (9 valid tags)

## Strategy / Playbook System
- **Types**: `frontend/client/src/types/playbook.ts` — `PlaybookSummary`, `PlaybookScoreResult`, `WatchlistPlaybookResponse`, `PortfolioPlaybookResponse`, `STRATEGY_FIT_LABEL(score)`
- **API client**: `frontend/client/src/lib/playbooks.ts` — `fetchPlaybooks()`, `scoreWatchlist(playbookId, tickers)`, `scorePortfolio(playbookId, holdings)`
- **Proxy routes** (in `routes.ts` at end): `GET /api/playbooks`, `GET /api/playbooks/discovery-capabilities`, `GET /api/playbooks/serenity-regime`, `POST /api/playbooks/score-watchlist`, `POST /api/playbooks/score-portfolio`, `POST /api/playbooks/analyze`, `POST /api/playbooks/discover`, `POST /api/playbooks/supply-chain-map`, `POST /api/playbooks/compare` → FastAPI
- **Strategy Screener** (`/app/strategy-screener`): Curated Serenity publication page. Types: `src/types/screener.ts`. API lib: `src/lib/screener.ts`. Proxy routes: `GET /api/strategy-screener/latest`, `GET /api/strategy-screener/config`, `GET /api/strategy-screener/report/:snapshotId/:ticker`, `POST /api/strategy-screener/refresh`. Page: `src/pages/strategy-screener.tsx`. Nav: under Stocks submenu. No connection to AI Terminal.
- **Shared UI**: `frontend/client/src/components/strategy-selector.tsx` — dropdown component; `frontend/client/src/components/playbook-score-panel.tsx` — `WatchlistScorePanel`, `PortfolioScorePanel`
- **AI Terminal** (`TradingAgent.tsx`): `selectedStrategy` state (default='default'); strategy selector inline in command bar after model buttons. **Default = zero change to `/api/query` payload or behavior.** Non-default + freeform query → `runPlaybookAnalysis()` calls `POST /api/playbooks/analyze` instead of `/api/query`. Preset buttons and CSV always use Default `/api/query` path. Response rendered via `renderPlaybookAnalysis()` with `display_type: 'playbook_analysis'`.
- **Watchlist** (`watchlist.tsx`): `StrategySelector` in header bar; `WatchlistScorePanel` shown below signal strip when strategy selected
- **Portfolio** (`portfolio-section.tsx`): `StrategySelector` below header; `PortfolioScorePanel` uses DeBankPortfolio `topTokens` as holdings
- **FastAPI playbooks**: `serenity` and `sjcapital`; backend returns `id`, `name`, `short_label`, `ui_color`, `description`, `enabled`

## Thematic Context System (Additive)
- **Shared component**: `frontend/client/src/components/ui/ticker-thematic.tsx`
  - `TickerThematicBadge` — compact inline badge cluster (theme_name, theme_state pill, regime alignment pill, dead_zone warning, theme fit score). Renders nothing if no thematic fields present.
  - `ThematicSection` — full detail block for use inside existing detail panels. Renders nothing if no thematic fields.
  - `RegimeContextStrip` — collapsible strip above the Screener table showing macro_regime, active/emerging themes, dead zones.
  - `TickerInsightDrawer` — standalone slide-out modal for full thematic context (not currently wired but exported for future use).
- **Options Flow** (`options.tsx`): `TickerThematicBadge` added to first column of `TickerRows`; `ThematicSection` added at end of `TickerDetailPanel`.
- **Strategy Screener** (`strategy-screener.tsx`): `RegimeContextStrip` added above table (uses `snapshot.regime_context`); `TickerThematicBadge` in ticker cell; `ThematicSection` at end of `ReportPanel`.
- **Guardrails**: All thematic fields optional — if backend doesn't return them the UI is identical to before. No new columns. Earnings page untouched.

## Portfolio Holdings Logos
- `caelyn-terminal-page.tsx` Holdings table renders company logo to the left of each ticker.
- Source: `useQuery(['company-identity', sortedTickerCsv])` → `/api/fmp/company-identity?symbols=…` (server-cached 24h in `routes.ts` `_identityCache`). Same endpoint the earnings page calls via `onFetchIdentity` on Portfolio toggle — shared backend cache, no duplicate FMP fetches.

## Dev Notes
- Vite config requires `server.allowedHosts: 'all'` for Replit preview
- Backend API key in `AGENT_API_KEY` constant across various pages
- JWT auth via `CAELYN_USERNAME` / `CAELYN_PASSWORD` env secrets
