---
name: Watchlist perf passes 1-3
description: All three perf passes on watchlist.tsx — what was done, key pitfalls, and durable rules.
---

# Watchlist Performance Passes 1–3

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

## Pass 3 (commit `53dac93b`)
- **Removed `i: number` prop** from `WlTickerRow` — the main cause of 463-row
  re-renders on every sort. Zebra striping via CSS vars on outer `display:contents`
  wrapper instead.
- **Stripped mutable Maps from WlRowCtx** (`hydrationStatus`, `localThemeOverrides`,
  `themeAssignPendingTicker`, `themeAssignFeedback`, `optionsResp`). Per-ticker values
  resolved at `.map()` call site and passed as direct props.
- **`optionsAvailable: boolean`** replaces `optionsResp: any` in rowCtx — context
  rebuilds only once per session (false→true), not on every 20 s poll.
- **Ticker row windowing**: `wStart/wEnd` from scroll position; OVERSCAN=8; top/bottom
  spacer `<div>`; full-render fallback when `expandedTickers.size > 0`.
- **Fundamentals windowing**: same math, `FUND_ROW_H=38`; spacers as `<tr aria-hidden>`.
- **`fundRowModels` useMemo**: CSV-merge done once; `renderFundamentalScreenerContent`
  does O(1) lookup per ticker — no rebuild on tab switch.
- Removed `content-visibility: auto` — redundant with real windowing, measured to
  worsen sort latency.

## Key pitfalls / rules

**Why sort index is lethal:**
Any numeric prop that changes for every row on sort causes React.memo to see "changed"
for all 463 rows simultaneously — equivalent to unmemoized rendering.

**Why:**
The sort index `i` changes value for every row whenever the sort column or direction
changes. Even if the row's data didn't change, the changed `i` prop defeats memo.

**How to apply:**
Never pass positional index as a prop to a memoized component. Use CSS vars on the
wrapper or derive zebra class from DOM index instead.

---

**Mutable Maps in context defeat memo:**
If rowCtx holds a Map reference, any `.set()` on that Map does NOT change the Map
reference (Maps are mutated in place). But if the component re-renders (e.g., any
state change), a new `useMemo` result for rowCtx is produced because the Map itself
is in the dep array — and the reference IS a new object if the state setter created a
new Map (`new Map(prev)` pattern). This causes all memoized rows to see a new context.

**Why:**
`hydrationStatus` is stored as `useState<Map<string, any>>` and updated via
`setHydrationStatus(prev => { const m = new Map(prev); m.set(key, val); return m; })`.
Every update creates a new Map reference → rowCtx dep array changes → rowCtx rebuilds
→ all consumers potentially re-render.

**How to apply:**
Resolve per-ticker values at the `.map()` call site using `.get(symUp)`. Pass the
resolved primitive/undefined as a direct prop. Context only holds values that are truly
shared and change infrequently (e.g., boolean flags, stable callbacks).

---

**`display: contents` preserves CSS inheritance:**
A `display: contents` wrapper does NOT create a layout box but DOES remain in the
element's inheritance tree. CSS custom properties (vars) set on it ARE inherited by
children — can safely use it for passing CSS vars without affecting layout.

---

**analysis binding ordering in watchlist.tsx:**
The `analysis` binding is declared around line 3729. Anything above that line must use
`watchlist?.analysis` not the bare `analysis` variable. Pass 1 caught this pitfall.

---

**Test count baseline:**
- Pass 1: 25 tests (watchlist-perf-incremental.test.ts)
- Pass 2: 20 tests (watchlist-perf-pass2.test.ts)
- Pass 3: 21 tests (watchlist-perf-pass3.test.ts)
- Security/search: 15 tests
- Total: 81 tests, all passing as of commit `53dac93b`
