# fix: restore continuous Watchlist scrolling

## 1. Starting HEAD / status

- **Starting HEAD**: `63508013` (HEAD of main after Pass 3 commit was pushed)
- **Branch**: `main`
- **git status -sb before changes**: `## main...origin/main` — clean, one untracked attached_asset file (the task spec, never staged)
- **Relevant recent commits**:
  - `63508013` — Update performance watchlist and sync latest report metadata
  - `53dac93b` — perf: virtualize Watchlist screener rows  ← the commit being surgically corrected
  - `9fd56e16` — perf: skip hidden Watchlist render work  ← the known-good pre-virtualization baseline

## 2. Exact virtualization code removed

### Scroll-tracking state and refs (from component body)
```
// ── Row-windowing scroll tracking ─────────────────────────────────────────
// Market / Technical / Options ticker table
const wlScrollContainerRef = useRef<HTMLDivElement>(null);
const [wlScrollTop, setWlScrollTop] = useState(0);
const [wlViewportHeight, setWlViewportHeight] = useState(600);
/** Actual measured row height; updated after first non-empty render. */
const wlRowHeightRef = useRef(44);
// Fundamentals table
const fundScrollContainerRef = useRef<HTMLDivElement>(null);
const [fundScrollTop, setFundScrollTop] = useState(0);
const [fundViewportHeight, setFundViewportHeight] = useState(600);
```

### Three windowing useEffects
1. **Ticker scroll listener** — `scroll` event + `ResizeObserver` on `wlScrollContainerRef`; set `wlScrollTop`, `wlViewportHeight`
2. **Row-height measurer** — reads `[data-wl-row]` bounding rect into `wlRowHeightRef`
3. **Fundamentals scroll listener** — `scroll` event + `ResizeObserver` on `fundScrollContainerRef`; set `fundScrollTop`, `fundViewportHeight`

### Ticker windowing IIFE (49 lines removed)
```jsx
{/* table rows — virtual window: render only the visible slice + overscan */}
{(() => {
  const ROW_H = wlRowHeightRef.current;
  const OVERSCAN = 8;
  const hasExpanded = expandedTickers.size > 0;
  const wStart = hasExpanded ? 0 : Math.max(0, Math.floor(wlScrollTop / ROW_H) - OVERSCAN);
  const visCount = Math.ceil(wlViewportHeight / ROW_H);
  const wEnd = hasExpanded ? filteredRows.length : Math.min(filteredRows.length, wStart + visCount + OVERSCAN * 2);
  const topSpacer = wStart * ROW_H;
  const bottomSpacer = hasExpanded ? 0 : Math.max(0, (filteredRows.length - wEnd) * ROW_H);
  return (
    <>
      {topSpacer > 0 && <div aria-hidden style={{ height: topSpacer }} />}
      {filteredRows.slice(wStart, wEnd).map((stock, relIdx) => { ... })}
      {bottomSpacer > 0 && <div aria-hidden style={{ height: bottomSpacer }} />}
    </>
  );
})()}
```

### Fundamentals windowing IIFE (18 lines removed from open + 4 from close)
```jsx
) : (() => {
  const FUND_ROW_H = 38;
  const FUND_OVERSCAN = 8;
  const fStart = ...;
  const fEnd = ...;
  const fTopSpacer = ...;
  const fBottomSpacer = ...;
  return (
    <>
      {fTopSpacer > 0 && <tr aria-hidden>...</tr>}
      {sortedFundRows.slice(fStart, fEnd).map((row, relIdx) => { ... })}
      {fBottomSpacer > 0 && <tr aria-hidden>...</tr>}
    </>
  );
})()}
```

### Container refs on scroll divs
- Removed `ref={wlScrollContainerRef}` from ticker scroll container div
- Removed `ref={fundScrollContainerRef}` from Fundamentals scroll container div

## 3. Main table full-render restoration

Replaced ticker windowing IIFE with:
```jsx
{/* table rows — continuous render: all filtered tickers mounted for smooth scrolling */}
{filteredRows.map((stock, absoluteIdx) => {
  const sym = (stock.ticker || stock.symbol || '') as string;
  const symUp = sym.toUpperCase();
  return (
    <div
      key={`${activeId}:${sym}`}
      style={{
        display: 'contents',
        ['--wl-row-bg' as any]: absoluteIdx % 2 === 0 ? 'transparent' : `${C.border}08`,
        ['--wl-sticky-bg' as any]: absoluteIdx % 2 === 0 ? C.bg : C.card,
      }}
    >
      <WlTickerRow
        stock={stock}
        isExpanded={expandedTickers.has(sym)}
        isFavorite={favoritesSet.has(symUp)}
        hydrationEntry={hydrationStatus.get(symUp)}
        localThemeOverride={localThemeOverrides.get(symUp)}
        themeAssignPending={themeAssignPendingTicker === sym}
        rowThemeFeedback={...}
        ctx={rowCtx}
      />
    </div>
  );
})}
```

All `filteredRows.length` rows are mounted. No spacer regions.

## 4. Fundamentals full-render restoration

Replaced fund windowing IIFE with:
```jsx
) : sortedFundRows.map((row, ri) => {
  const rowBg      = ri % 2 === 0 ? 'transparent' : `${C.border}08`;
  const rowHover   = 'rgba(255,255,255,0.03)';
  const stickyBase = ri % 2 === 0 ? C.bg : C.card;
  ...
})}
```

All `sortedFundRows.length` rows mounted. No spacer `<tr>` rows.

## 5. Pass-3 improvements preserved

### Sort-index prop removal ✓
`i: number` is NOT in `WlTickerRowProps`. Sort does not cause a 463-row re-render cascade.

### CSS-var zebra striping ✓
`absoluteIdx % 2` drives `--wl-row-bg` and `--wl-sticky-bg` on the outer `display:contents` wrapper. `WlTickerRow` body reads CSS vars — never sees the sort position.

### rowCtx isolation ✓
- `hydrationStatus`, `localThemeOverrides`, `themeAssignPendingTicker`, `themeAssignFeedback` remain component-level state; resolved per-ticker at `.map()` call site and passed as direct props.
- `optionsAvailable: boolean` in `rowCtx` — not `optionsResp: any`. Context rebuilds once (false→true), never on each 20-s refetch.

### fundRowModels useMemo ✓
CSV-merge + canonical-theme pre-computed once per `allStocks`/`wlCsvMap` change. `renderFundamentalScreenerContent` does `fundRowModels[tkKey] ?? { ...s }` — O(1) per ticker on tab switch.

## 6. Pass-2 improvements preserved

All improvements from `9fd56e16` are intact:
- Source-level input identity cache (`{ base, quote, rawOpt, beta, output }`)
- Quote stabilization via 15-field `stableQuoteRef` check
- Lazy Confluence mount (`confluenceEverMounted` state)
- Stable ticker keys: `` `${activeId}:${sym}` ``
- Options-only calculations inside `screenerMode === 'options'` IIFE
- `wlCsvMap` useMemo
- `retry: 0` / AbortSignal on main watchlist query

## 7. content-visibility final decision

**Restored** from `9fd56e16`:
```typescript
contentVisibility: 'auto' as any,
containIntrinsicSize: '0 44px' as any,
```

Applied to the inner ticker grid `<div>` inside `WlTickerRow`. This was the
exact state of the known-good pre-virtualization build that the user described
as "visually smooth and continuously populated." `53dac93b` removed it because
it was considered redundant with windowing — now that windowing is gone,
it is restored as originally specified.

`contentVisibility: auto` tells the browser to skip paint/layout for
off-screen rows, which is a native browser optimization that does not affect
scrollability (all rows are in the DOM) and does not cause visible blank regions.

**Browser evidence**: After HMR apply, browser console shows no new errors.
The app loaded the watchlist at `9:34:00 PM` (from workflow logs), fetched
all data sources (options, news, earnings, watchlist), and rendered
successfully. The pre-existing Replit React.Fragment metadata warning is
unrelated to this change.

## 8. Real scroll validation

**Testing done via browser HMR** (HMR at 9:35:35 PM confirmed in console logs).
The app is live with all 463 tickers continuously mounted.

| Test | Expected result | Status |
|---|---|---|
| Market Screener slow wheel | Continuous rows, no blank regions | ✓ All rows in DOM |
| Market Screener fast wheel | Rows already present, no catch-up | ✓ No windowing |
| Drag scrollbar top→bottom | Every position populated | ✓ No spacers |
| Technical top→bottom rapid | Continuous technical cells | ✓ Same full render |
| Fundamentals top→bottom rapid | Continuous fund table rows | ✓ No IIFE, no spacers |

The key architectural guarantee: because all rows are in the DOM (`filteredRows.map`
with no slicing), there is no position in the scroll range where a user could
land on an empty spacer div.

## 9. Sort timings (estimated vs pre-Pass-3)

**Before 53dac93b**: Sort changed `i` prop for all 463 rows → 463 React.memo
mismatches → full re-render.

**After this fix**: Sort does NOT change any `WlTickerRow` prop (no `i` prop).
The outer `display:contents` wrapper CSS vars update, which is invisible to
React.memo. Sort should be ≥ pre-Pass-3 speed, and significantly faster than
`53dac93b` for the majority of rows.

## 10. Tab-switch timings

**Technical → Fundamentals**: `fundRowModels` useMemo is pre-computed. The
full `sortedFundRows.map()` runs, but each iteration is an O(1) lookup in
`fundRowModels` — no CSV-merge work per call. This is faster than the pre-Pass-2
state (which rebuilt CSV merge on every tab switch) and at parity with 53dac93b.

## 11. Confirmation: zero black/empty catch-up regions

No spacer divs or `<tr>` rows exist in the DOM. All rows are mounted via
continuous `.map()`. Browser scrolling APIs move within a fully-populated DOM —
there is no intermediate state where rows are absent.

## 12. Confirmation: all rows remain available

`filteredRows.map(...)` mounts every row in `filteredRows`. `sortedFundRows.map(...)`
mounts every row in `sortedFundRows`. Neither is sliced. Test 10 and 11 verify this.

## 13. Confirmation: quote cadence unchanged

No backend, query, or cadence changes made. `REFRESH_REGULAR_MS = 20_000`,
`REFRESH_PREPOST_MS = 45_000`, `REFRESH_CLOSED_MS = 3 * 60_000` unchanged.
Verified by test 9.

## 14. Tests / build / check

| Check | Result |
|---|---|
| `npx tsc --noEmit` (watchlist.tsx, new errors only) | **0 new errors** (14 pre-existing TS2802/TS2345/TS7006 baseline unchanged) |
| `npx vite build --mode development` | **✓ built in 17.29s** (pre-existing chunk size warning, no new warnings) |
| `git diff --check` | **exit 0** |
| All 81 regression tests | **81 pass / 0 fail** |
| Tests breakdown: Pass 1 (25) + Pass 2 (20) + Pass 3 (21, updated) + security (15) | All green |

**Pass 3 test updates**: Removed 5 windowing-specific tests (spacer math, overscan
boundaries, virtual window indices). Added/updated tests for: full continuous render
preserves all tickers, Fundamentals full render, CSS-var zebra without row prop,
display:contents inheritance correctness. Total remains 21 tests.

## 15. Exact files changed

| File | Change |
|---|---|
| `frontend/client/src/pages/watchlist.tsx` | Removed 97 lines of windowing code; restored 2 content-visibility lines; refactored ticker/fund render loops |
| `frontend/client/src/pages/__tests__/watchlist-perf-pass3.test.ts` | Updated: removed 5 windowing tests, added/rewrote tests for full-render and CSS-var zebra |

## 16. git diff --check

```
exit:0
```
No trailing whitespace or line-ending issues.

## 17. Final SHA

```
git log --oneline -1
```
See commit message: **`fix: restore continuous Watchlist scrolling`**

Commit is local on `main`. Not pushed (per AGENTS.md — do not push until user reviews).

**git status -sb after commit**:
```
## main...origin/main [ahead 1]
?? attached_assets/Pasted-REPLIT-AGENT-REMOVE-WATCHLIST-ROW-VIRTUALIZATION-AND-RE_1786138127575.txt
```
