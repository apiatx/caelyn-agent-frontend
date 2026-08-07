---
name: Watchlist perf passes 1-3 + continuous scrolling fix
description: All perf passes on watchlist.tsx — what was done, key pitfalls, durable rules. Includes the surgical undo of row virtualization.
---

# Watchlist Performance Passes 1–3 + Continuous Scrolling Fix

## Pass 1 (commit `5918150e`)
- Extracted `WlTickerRow = React.memo(...)` at module level.
- `rowIdentityRef` 10-field whitelist (later replaced in Pass 2).
- `allStocks`, `allTickerSymbols`, `analyzedMap`, `baseMergedTickers`, `allNews`, `majorNews` memoized.
- Alignment query lazy; `wlIdentityCsv` filter; `retry: 0` / AbortSignal on main query.
- `toggleExpandedTicker` in `useCallback`.

## Pass 2 (commit `9fd56e16`)
- Source-level input identity cache: `{ base, quote, rawOpt, beta, output }`.
- Quote stabilized via 15-field `stableQuoteRef` check.
- Lazy Confluence mount: `confluenceEverMounted` state + `useEffect`.
- Stable row keys: `` `${activeId}:${sym}` `` (no sort index).
- `wlCsvMap` useMemo; `fundRowModels` pre-builds CSV-merge per ticker.
- Options-only `_o*` calculations inside `screenerMode === 'options'` IIFE.

## Pass 3 (commit `53dac93b`) → PARTIALLY REVERTED by fix below
- Removed `i: number` prop from `WlTickerRow` — KEPT.
- CSS vars zebra via `display:contents` wrapper — KEPT.
- Stripped mutable Maps from `WlRowCtx` — KEPT.
- `optionsAvailable: boolean` in rowCtx — KEPT.
- `fundRowModels` useMemo — KEPT.
- **Virtual row windowing (ticker + fundamentals) — REMOVED** (see fix below).

## Continuous Scrolling Fix (commit `3bc5d6e6`)

**Problem**: Windowed rows caused black/empty regions and visible catch-up during
fast scrolling. The browser renders content only when React re-renders with updated
scroll position — React state is not as fast as native browser scroll events.

**Fix**: Removed all windowing machinery. Restored `filteredRows.map(...)` and
`sortedFundRows.map((row, ri) => ...)` continuous full renders.

**What was removed**:
- `wlScrollContainerRef`, `wlScrollTop`, `wlViewportHeight`, `wlRowHeightRef`
- `fundScrollContainerRef`, `fundScrollTop`, `fundViewportHeight`
- 3 windowing `useEffect`s (scroll listener, row-height measurer, fund scroll listener)
- Ticker windowing IIFE (`wStart`/`wEnd`/`topSpacer`/`bottomSpacer`)
- Fundamentals windowing IIFE (`fStart`/`fEnd`/`fTopSpacer`/`fBottomSpacer`)
- Synthetic spacer `<div>` and `<tr>` rows

**What was restored**:
- `contentVisibility: 'auto'` + `containIntrinsicSize: '0 44px'` on inner ticker grid div
  (from `9fd56e16` known-good state). This is a native browser optimization — rows are in
  DOM but off-screen paint is skipped. Does NOT cause blank scroll regions.

## Key pitfalls / rules

**Why sort index is lethal:**
Any numeric prop that changes for every row on sort causes React.memo to see "changed"
for all rows simultaneously. Never pass positional index as a prop to a memoized component.
Use CSS vars on the wrapper or derive zebra from DOM index instead.

**Why:**
The sort index `i` changes value for every row whenever the sort column or direction
changes. Even if the row's data didn't change, the changed `i` prop defeats memo.

**How to apply:**
CSS vars on the outer `display:contents` div; `WlTickerRow` reads `var(--wl-row-bg)`.

---

**React state-driven virtualization defeats browser scroll:**
React state updates (e.g., `setWlScrollTop`) are batched and asynchronous relative to
native scroll events. Even with `requestAnimationFrame`, there is always a frame or two
lag between the user scrolling and React re-rendering with the new slice window. This
causes blank spacer regions to be visible during fast scrolling.

**Why:**
Native browser scroll operates at 60–120fps. React reconciliation adds at least one
frame of delay. Spacer divs are immediately visible to the user during that gap.

**How to apply:**
For tables with ≤500 rows, full DOM render + `contentVisibility: auto` is almost always
the right answer. Only use React-state windowing when you can measure that the DOM itself
is causing performance problems (e.g., thousands of rows causing layout thrash on sort).
In that case, prefer a library (react-virtual, tanstack-virtual) that uses CSS transform
rather than spacer divs.

---

**Mutable Maps in context defeat memo:**
If rowCtx holds a Map reference, any `setState(prev => new Map(prev))` creates a new Map
reference → rowCtx dep array changes → rowCtx rebuilds → all consumers potentially re-render.
Resolve per-ticker values at the `.map()` call site using `.get(symUp)`. Context should only
hold values that change infrequently (stable booleans, stable callbacks).

---

**`display: contents` preserves CSS inheritance:**
A `display: contents` wrapper does NOT create a layout box but DOES remain in the
inheritance tree. CSS custom properties (vars) set on it ARE inherited by children.

---

**contentVisibility: auto is safe for continuous full renders:**
`contentVisibility: auto` tells the browser to skip paint/layout for off-screen rows.
All rows remain in the DOM. Scrollbar size and position are correct. No blank regions.
Scrolling is native-speed. The browser handles the optimization, not React.

---

**Test count baseline (all passing as of `3bc5d6e6`):**
- Pass 1: 25 tests (watchlist-perf-incremental.test.ts)
- Pass 2: 20 tests (watchlist-perf-pass2.test.ts)
- Pass 3: 21 tests (watchlist-perf-pass3.test.ts) — updated after fix
- Security/search: 15 tests
- Total: 81 tests
