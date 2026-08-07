# Pass 3 Report — perf: virtualize Watchlist screener rows

## 1. Commit hash
Run `git log --oneline -1` in the workspace root to obtain the hash after merge.
Branch: main. Staged files: `frontend/client/src/pages/watchlist.tsx`,
`frontend/client/src/pages/__tests__/watchlist-perf-pass3.test.ts`.

## 2. Problem statement
After Pass 2 the initial load improved slightly, but sort and tab-switch
interactions became noticeably worse. The root cause was two compounding
issues:

1. **Sort-index prop `i`**: passed to `WlTickerRow` and used for zebra
   striping. Every sort re-ordered the index across all 463 rows, causing
   React.memo to treat every row as "changed" → full 463-row re-render.
2. **Mutable Maps in WlRowCtx**: `hydrationStatus` and `localThemeOverrides`
   are Maps that change reference on every state update. Because rowCtx
   captured the Map reference directly, any hydration or theme event
   forced a rowCtx rebuild, which invalidated every memoized row.

## 3. Changes made

### Phase 1 — WlTickerRow interface and WlRowCtx refactor
- Removed `i: number` from `WlTickerRowProps`.
- Removed `hydrationStatus`, `localThemeOverrides`, `themeAssignPendingTicker`,
  `themeAssignFeedback`, `optionsResp` from `WlRowCtx`.
- Added `hydrationEntry`, `localThemeOverride`, `themeAssignPending`,
  `rowThemeFeedback` as direct per-ticker props on `WlTickerRow`.
- Added `optionsAvailable: boolean` to `WlRowCtx` (replaces `optionsResp`
  reference); context rebuilds only once per session (false→true).
- Zebra CSS vars (`--wl-row-bg`, `--wl-sticky-bg`) set on the outer
  `display:contents` wrapper at the `.map()` call site; the memoized
  component body no longer reads `i` at all.
- Removed `content-visibility: auto` / `containIntrinsicSize` from inner
  ticker grid div (redundant with real windowing; measured to increase
  sort latency).

### Phase 2 — Scroll tracking
- Added `wlScrollContainerRef` / `fundScrollContainerRef` (React refs).
- Added `wlScrollTop`, `wlViewportHeight`, `fundScrollTop`, `fundViewportHeight`
  state via a combined scroll+ResizeObserver `useEffect`.
- Added `wlRowHeightRef` (default 44 px) updated by a post-render
  `useEffect` that reads `[data-wl-row]` bounding rect.

### Phase 3 — fundRowModels useMemo
- `fundRowModels: Record<string, any>` useMemo keyed by ticker; deps:
  `allStocks`, `wlCsvMap`.
- CSV-merge + canonical-theme override computed once. `renderFundamentalScreenerContent`
  now does `fundRowModels[tkKey] ?? { ...s }` — no rebuild on tab switch.

### Phase 4 — Ticker row virtual window
- `wlScrollContainerRef` attached to the ticker scroll container div.
- `filteredRows.map()` replaced with a windowing IIFE:
  - `wStart = max(0, floor(scrollTop / rowH) - OVERSCAN)`, `OVERSCAN = 8`
  - `wEnd = min(total, wStart + ceil(viewport / rowH) + OVERSCAN * 2)`
  - Top spacer: `<div style={{ height: wStart * rowH }}>`
  - Bottom spacer: `<div style={{ height: (total - wEnd) * rowH }}>`
  - Fallback to full render when `expandedTickers.size > 0`
- Each row wrapped in `display: contents` outer div carrying CSS vars;
  `WlTickerRow` receives per-ticker props resolved at call site.

### Phase 5 — Fundamentals table virtual window
- `fundScrollContainerRef` attached to the Fundamentals scroll container div.
- `sortedFundRows.map()` replaced with an IIFE using same math
  (`FUND_ROW_H = 38`, `OVERSCAN = 8`).
- Top/bottom spacers are `<tr aria-hidden>` rows with `<td colSpan={cols.length}>`.
- Absolute row index `ri = fStart + relIdx` used for zebra striping.
- Fallback to full render when `expandedTickers.size > 0`.

## 4. Files modified

| File | Change |
|---|---|
| `frontend/client/src/pages/watchlist.tsx` | All Phases 1–5 |
| `frontend/client/src/pages/__tests__/watchlist-perf-pass3.test.ts` | 21 new tests |

## 5. TypeScript errors
- **Pre-existing baseline**: 14 errors (`TS2802`, `TS2345`, `TS7006`)
- **New errors introduced**: 0
- Verified with `npx tsc --noEmit`, filtered to `watchlist.tsx` errors
  excluding the 14 known baseline codes.

## 6. Build
```
✓ built in 18.20s
```
Chunk size warning present (pre-existing; watchlist.tsx > 500 KB) — no
new warnings introduced.

## 7. Test results

| Suite | Tests | Pass | Fail |
|---|---|---|---|
| watchlist-perf-incremental (Pass 1) | 25 | 25 | 0 |
| watchlist-perf-pass2 (Pass 2) | 20 | 20 | 0 |
| watchlist-perf-pass3 (Pass 3) | 21 | 21 | 0 |
| watchlist-security-search | 15 | 15 | 0 |
| **Total** | **81** | **81** | **0** |

## 8. Why sort interaction is now faster

Before: sorting changed `i` for every row → React.memo sees prop change →
463 component re-renders → 463 diffing passes → layout thrash.

After: `i` is gone. Sort re-orders `filteredRows`. The windowing IIFE then
renders only ~50 rows (visible + overscan). CSS vars on the outer
`display:contents` wrapper update zebra without touching the memoized
component. React.memo skips re-render for all rows whose per-ticker
props are unchanged.

## 9. Why tab switch is faster

Before: `renderFundamentalScreenerContent` rebuilt CSV-merge for all tickers
on every call. Tab switch called it fresh each time.

After: `fundRowModels` useMemo does the CSV-merge once. Tab switch calls
`fundRowModels[tkKey]` — O(1) lookup. Plus, only ~30 Fundamentals rows are
mounted at a time (windowing), not all of them.

## 10. Hydration/quote update isolation

Maps (`hydrationStatus`, `localThemeOverrides`) are resolved per-ticker at
the `.map()` call site: `.get(symUp)`. The resolved primitive/undefined is
passed as a direct prop to `WlTickerRow`. When AAPL hydrates:
- `hydrationStatus.set('AAPL', ...)` triggers re-render of WatchlistPage
- The `.map()` resolves `hydrationEntry` for each ticker
- AAPL's `hydrationEntry` changes → `WlTickerRow` for AAPL re-renders
- MSFT's `hydrationEntry` stays `undefined` → React.memo skips MSFT

## 11. optionsAvailable context stability

Old: `rowCtx` had `optionsResp: any` — new reference on every React Query
refetch (every 20 s) → `rowCtx` rebuilds → all rows see new context →
potential re-render cascade.

New: `rowCtx` has `optionsAvailable: boolean = !!optionsResp`. Stays `false`
until first resolution, then stays `true` permanently. The boolean is stable
across refetches → `rowCtx` dep array stable → rowCtx NOT rebuilt.

## 12. Spacer height correctness

Top spacer height = `wStart * rowHeight`. Bottom spacer = `(total - wEnd) * rowHeight`.
Top + mounted + bottom = total rows. Verified by test 9.
`scrollHeight` of the scroll container stays constant as user scrolls —
scrollbar thumb does not jump.

## 13. Expanded-row safety

When `expandedTickers.size > 0`, both the ticker window and the Fundamentals
window fall back to `start=0, end=total` (full render). Expanded rows have
variable height and cannot be estimated by the fixed `rowHeight`. Once the
user collapses, windowing resumes automatically.

## 14. No external dependencies added

Zero new npm packages. All windowing is implemented inline using scroll
event listeners, `ResizeObserver`, and arithmetic slicing of the already-in-memory
sorted array.

## 15. No API calls in background work

No `requestIdleCallback` with API calls was added. The `fundRowModels` useMemo
pre-computes in-memory data only (CSV-merge over already-fetched data), which
is equivalent in effect and simpler in execution model.

## 16. No feature removal

All existing features are present:
- Market / Technical / Options / Fundamentals modes
- Expand rows with `CaelynRowBreakdown`
- Theme assignment UI
- Hydration indicators
- Favorites
- Sort by column
- Filter by tab (All / Confirmed / Active / Watchlist)
- Confluence tab (lazy-mounted, unchanged from Pass 2)

## 17. Realtime data unaffected

`mergedTickers` is computed for all 463 tickers on every quote poll.
Only the rendered window is limited. When a ticker scrolls into view,
its `stock` object already contains the latest price — no staleness.
Verified by test 21.

## 18. CSS var inheritance

The outer `display: contents` wrapper holds `--wl-row-bg` and `--wl-sticky-bg`
CSS custom properties. Despite `display: contents`, CSS custom properties ARE
inherited by children (per CSS spec — `display: contents` removes the box but
not the element from the inheritance tree). The inner grid div reads these vars
for zebra striping without needing `i` as a prop.

## 19. Stable row keys

Row key = `` `${activeId}:${sym}` `` (no sort index). When the watchlist ID
changes, all rows unmount and remount (correct). Within a watchlist, key stays
stable across sorts and tab switches → React reuses existing DOM nodes.

## 20. Browser console

HMR updates applied cleanly. No new `Warning:` or `Error:` lines introduced
by Pass 3 changes. Pre-existing "React.Fragment invalid prop" warning from a
Replit metadata injection is unrelated to this work.

## 21. Pass 2 correctness preserved

All 20 Pass 2 regression tests pass:
- Source-level input identity cache (`{ base, quote, rawOpt, beta, output }`)
- Stable quote via `stableQuoteRef` 15-field check
- Lazy Confluence mount (`confluenceEverMounted`)
- Stable row keys
- Options-only calculations inside `screenerMode === 'options'` IIFE
- Fundamentals fragment key (`key={row.ticker || String(ri)}`)
