# Watchlist Performance: Incremental Rendering

**Commit:** `5918150e`  
**Branch:** `main`  
**Date:** 2026-08-07  
**Status:** ✅ Complete — build passes, 25/25 regression tests pass, no new TS errors

---

## Summary

Seven targeted changes to `frontend/client/src/pages/watchlist.tsx` that make the 463-ticker Watchlist page fast without reducing realtime price/options freshness or changing any backend contract.

---

## Changes Made

### 1. Main Watchlist Query — `retry:0`, AbortSignal, no focus/reconnect refetch

**Before:**
```ts
queryFn: async () => { ... await fetch(url) ... },
retry: 2,
// no refetchOnWindowFocus, no refetchOnReconnect, no signal
```
**After:**
```ts
queryFn: async ({ signal }) => { ... await fetch(url, { signal }) ... },
retry: 0,
refetchOnWindowFocus: false,
refetchOnReconnect: false,
```
**Why:** The 6.3 MB watchlist payload has 2.3s warm latency. `retry: 2` could fan out to 3 requests on transient errors. Window-focus refetches were triggering full re-downloads on tab switches.

---

### 2. Alignment Query — Lazy Enable

**Before:** `enabled: !!activeId`  
**After:** `enabled: !!activeId && (screenerMode === 'confluence' || !!selectedTicker)`

**Why:** Alignment data is only consumed by the Confluence screener mode and the ticker popup. On every other tab (market, technical, options) the query was firing on page load for no reason.

---

### 3. Company Identity Query — Beta-Aware Lazy Load

**Before:** `wlIdentityCsv` = ALL 463 tickers → company-identity API fires for every ticker on load.  
**After:** `wlIdentityCsv` = only tickers whose beta is absent from analysis rows.

Since the `/api/watchlist/{id}` response already includes beta for analyzed stocks (confirmed in 3/3 spot checks: 3.687, 1.145, 1.873), the company-identity request **does not fire at all** for healthy watchlists.

---

### 4. Memoize Derived Data

`allStocks`, `allTickerSymbols`, `analyzedMap`, `baseMergedTickers`, `allNews`, `majorNews` were all plain `const` — rebuilt on every parent render. They now use `useMemo` with stable deps (`analysis`, `watchlist`, `newsData`, etc.), which only change when a new fetch completes.

**Impact:** State changes like opening a ticker popup, toggling screener mode, or sort changes no longer rebuild these 463-element arrays from scratch.

---

### 5. Per-Symbol Row Identity Preservation in `mergedTickers`

Added `rowIdentityRef: Map<string, any>` and a 10-field equality check on key display fields:
```
price, last, change, change_percent, volume, relative_volume,
options_score, options_signal, price_is_stale, market_session
```
After the LKG merge, any row whose display fields haven't changed gets back its **previous object reference** instead of a new spread.

**Impact (the key optimization):** On the 20s realtime quote poll, if 5 prices changed out of 463, only 5 rows receive new object references. The other 458 rows carry forward the same reference they had before.

---

### 6. `WlTickerRow` React.memo Component

The 355-line inline `filteredRows.map(...)` body was extracted into `WlTickerRow`, a `memo()`-wrapped component defined at module level (stable across renders).

**Interface design:**
- `stock: any` — per-row data object (stable reference from identity step above)
- `isExpanded: boolean` — scalar computed from `expandedTickers.has(sym)` per row
- `isFavorite: boolean` — scalar computed from `favoritesSet.has(sym)` per row
- `ctx: WlRowCtx` — shared context object (memoized, changes only on tab/settings changes, NOT on quote polls)

**`rowCtx` stability:** Computed via `useMemo` with deps: `screenerMode, optionsLoading, optionsResp, optSecColsState, activeId, isAdmin, themeUniverse, ...`. None of these change on quote polls. The grid layout values (`tickerGrid`, `tickerTableMinWidth`) are computed in stable `useMemo` blocks at component level.

**Combined effect:** On a 20s quote poll where 5 prices changed:
- `mergedTickers` runs the identity check → 458 rows return same reference
- `filteredRows.map(...)` renders 463 WlTickerRow elements
- React.memo compares: `stock` same ref ✓, `ctx` same ref ✓, `isExpanded`/`isFavorite` same ✓ → **skips** 458 rows
- Only 5 rows re-render their ~50 local computations + ~100 JSX elements

### 7. `toggleExpandedTicker` Wrapped in `useCallback`

Converted to `useCallback` so it produces a stable function reference across renders, preventing `rowCtx` from churning whenever the parent renders.

---

## What Did NOT Change

- Realtime quote cadence: `REFRESH_REGULAR_MS=20_000`, `REFRESH_PREPOST_MS=45_000`, `REFRESH_CLOSED_MS=3*60_000` — unchanged
- All backend endpoints and contracts — unchanged  
- All data displayed in the UI — unchanged  
- All features: ticker popup, expand/collapse, favorites, delete, confluence, theme assignment — unchanged
- `EarningsLiveContext` circuit breaker — not regressed
- `GlobalDataContext` null return — not regressed

---

## Tests

**File:** `frontend/client/src/pages/__tests__/watchlist-perf-incremental.test.ts`  
**Count:** 25 tests, 25 pass

Coverage:
- Tests 1–5: `wlIdentityCsv` beta-aware filtering
- Tests 6–11: per-symbol row identity preservation
- Tests 12–15: alignment query enabled predicate
- Tests 16–18: `baseMergedTickers` composition
- Tests 19–20: `toggleExpandedTicker` Set toggle
- Tests 21–25: grid layout value computation

**Run with:**
```
cd frontend && node_modules/.bin/tsx --test client/src/pages/__tests__/watchlist-perf-incremental.test.ts
```

---

## TypeScript / Build

- Pre-existing errors in watchlist.tsx: **14** (baseline), now **14** (no new errors)
- Vite production build: ✅ `built in ~17s`
- `git diff --check`: ✅ clean

---

## Files Changed

| File | Change |
|---|---|
| `frontend/client/src/pages/watchlist.tsx` | All 7 optimizations above |
| `frontend/client/src/pages/__tests__/watchlist-perf-incremental.test.ts` | NEW — 25 regression tests |
