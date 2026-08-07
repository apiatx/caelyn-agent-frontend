---
name: Watchlist Perf Incremental
description: Key decisions and pitfalls from the incremental rendering optimization of watchlist.tsx
---

## Row identity preservation pattern

The mergedTickers useMemo now preserves per-symbol object references when key display fields haven't changed. This requires a `rowIdentityRef = useRef<Map<string,any>>()` INSIDE WatchlistPage (not module-level) so it resets on component unmount.

**Why:** React.memo on WlTickerRow is useless without this — every quote poll produces new spread objects for all 463 rows even if the data is identical.

**How to apply:** Any future change that adds a new reactive field (e.g., a new alert badge computed from realtime data) must be added to `IDENTITY_FIELDS` if it should trigger a re-render. If it's omitted, rows showing that badge will not update.

## WlRowCtx must be useMemo'd at WatchlistPage level

The `rowCtx` object and all its computed deps (`_wlTickerGrid`, `_wlTickerTableMinWidth`, `_wlVisibleSecColsLen`) must be memoized at WatchlistPage component level, NOT inside `renderNewFormatTickerTable`. The render function cannot use React hooks.

**Why:** If ctx is a new object on every call to renderNewFormatTickerTable, React.memo can never skip rows — referential equality always fails.

## `analysis` vs `watchlist?.analysis` ordering

In WatchlistPage, `const analysis = watchlist?.analysis` is declared around line 3729 (after many queries). The `wlIdentityCsv` useMemo is at line ~2648. Therefore wlIdentityCsv must use `watchlist?.analysis?.sections` (inline access) rather than the `analysis` binding to avoid "used before declaration" TS error.

## toggleExpandedTicker must be useCallback

Without useCallback, every WatchlistPage render creates a new function reference, which causes rowCtx to get a new identity on every render, defeating React.memo for ALL rows. Wrap in useCallback with `[]` deps.

## company-identity query is lazy for healthy watchlists

`wlIdentityCsv` now filters to only symbols missing beta from analysis rows. For a fully-analyzed watchlist, this returns empty string and the query never fires (`enabled: false`). Only fire when wlIdentityCsv.length > 0.

## alignment query enable predicate

`enabled: !!activeId && (screenerMode === 'confluence' || !!selectedTicker)` — alignment data is only needed for the Confluence tab and the ticker popup. Firing it on every watchlist load (the old `enabled: !!activeId`) was wasteful.
