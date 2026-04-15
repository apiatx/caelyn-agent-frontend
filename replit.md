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
3. **Sector Rotation** (`/app/stocks/sectors`) — React Query; keys: `["sector-rotation-dashboard"]`, `["sector-rotation-analysis"]`
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

## Dev Notes
- Vite config requires `server.allowedHosts: 'all'` for Replit preview
- Backend API key in `AGENT_API_KEY` constant across various pages
- JWT auth via `CAELYN_USERNAME` / `CAELYN_PASSWORD` env secrets
