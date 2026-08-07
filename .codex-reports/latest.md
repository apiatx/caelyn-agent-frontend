# Watchlist Performance Pass 2: Skip Hidden Render Work

**Commit:** `9fd56e16`  
**Branch:** `main` (ahead 1 of origin)  
**Starting HEAD:** `df6a2c96`  
**Date:** 2026-08-07  
**Status:** ✅ Complete — 60/60 tests pass, build clean, 14 pre-existing TS errors, no new errors

---

## 1. Starting HEAD / git status

```
df6a2c96  Update memory, reports, and frontend data caches
5918150e  perf: make Watchlist rendering incremental      ← pass 1
```

`git status -sb`: two uncommitted data caches (`market-overview-cache.json`, `portfolio-value-history.json`) and one new prompt asset — neither staged.

---

## 2. Baseline Real Browser Profile

Browser profiling via CDP/DevTools is not available from the Replit agent sandbox. The profile below is derived from:
- Vite HMR timestamps in workflow logs
- The structural analysis of what React renders per 20s quote poll
- Known DOM costs of 463-row grids

**Estimated baseline (5918150e) on a 463-ticker watchlist:**

| Metric | Estimated value |
|---|---|
| WlTickerRow renders per quote poll | Up to 463 (memo rarely skips — new spread objects) |
| Options vars computed per render | 40 per row × 463 = 18,520 per poll (all modes) |
| Confluence mount on initial load | Yes — full React tree always mounted, display:none |
| DOM nodes for ticker table | ~463 × ~40 = ~18,520 |
| Sort: row remounts | Up to 463 — index in key forces identity loss |
| Fundamentals csvMap rebuilt | Every render of renderFundamentalScreenerContent |

**Defect in 5918150e identity approach:** The 10-field whitelist (`price`, `last`, `change_percent`, `volume`, `options_score`, `options_signal`, `price_is_stale`, `market_session`, `relative_volume`, `change`) falsely reused the previous row object when ANY non-listed field changed (7D return, IV, expected move, OI, technical stage, taxonomy, staleness_seconds, etc.). This was a correctness bug, not a perf bug.

---

## 3. 5918150e Identity Correctness Defect

The old `rowIdentityRef` stored the **output** row and compared 10 display fields. This approach was unsafe because:

- A newly-fetched canonical Watchlist row with changed `change_7d`, `stage_analysis`, `options_iv`, `options_expected_move`, `options_open_interest`, `canonical_theme_name`, or any of ~40 other fields would be **silently discarded** if those 10 whitelist fields happened to match.
- The frontend would show stale data for technical, fundamental, taxonomy, and options detail fields until the user triggered a re-render by other means.

**Example scenario:** AAPL price stays $150 but stage changes from "S1 Base" → "S2 Breakout" after a canonical refetch. Old code: stage badge stays wrong. New code: stage badge updates immediately.

---

## 4. New Identity Architecture

Replaced the 10-field whitelist with **source-level input identity tracking**:

```ts
type _RowInputCache = { base: any; quote: any; rawOpt: any; beta: any; output: any };
const rowIdentityRef = useRef<Map<string, _RowInputCache>>(new Map());
const stableQuoteRef = useRef<Map<string, any>>(new Map());
```

**Per-symbol merge pipeline:**

1. **Quote stabilization** — Compare incoming `rawQuote` against the previously stored stable quote using 15 fields (`price`, `last`, `change`, `change_percent`, `volume`, `high`, `low`, `source`, `is_realtime`, `is_live_backup`, `is_stale`, `updated_at`, `quote_timestamp`, `staleness_seconds`, `market_session`). If all match, reuse the previous quote object reference so `prev.quote === stableQuote` holds on unchanged polls.

2. **Input identity check** — Four inputs tracked:
   - `base === baseRow` — any canonical data change (technical, fundamentals, taxonomy, 7D, IV, OI, etc.) produces a new `baseMergedTickers` spread → reference changes → new output
   - `quote === stableQuote` — stabilized; only changes when a realtime field actually changed
   - `rawOpt === rawOpt` — reference-stable between options refetches (every 2 min via `optionsSignalsByTicker`)
   - `Object.is(beta, beta)` — scalar comparison for FMP beta injection

3. **Cache miss path** — Builds new merged row: `mergeRealtimeQuote → normalizeOptionsSignal → beta inject → LKG merge → store in cache`

4. **Cache hit path** — Returns `prevCache.output` immediately with zero allocation

**Critical invariant preserved:** A new canonical Watchlist response from `/api/watchlist/{id}` causes `analysis` to change → `analyzedMap` changes → `baseMergedTickers` creates new spread objects → ALL rows get `base !== prevCache.base` → ALL rows rebuild. No stale canonical data can survive.

---

## 5. Proof: Canonical Non-Price Changes Propagate

Tests 1–7 in `watchlist-perf-pass2.test.ts` directly prove this:

- Test 1: `change_7d` + `stage_label` change while `price` stays same → cache miss ✓  
- Test 2: `options_iv` change via new base → cache miss ✓  
- Test 3: `options_expected_move` change → cache miss ✓  
- Test 4: `options_open_interest` change via rawOpt → cache miss ✓  
- Test 5: `change_7d` change → cache miss ✓  
- Test 6: `stage_analysis.label` change → cache miss ✓  
- Test 7: `canonical_theme_name` change → cache miss ✓

---

## 6. Hidden Confluence Initial Cost — Before/After

**Before (5918150e):** `CaelynConfluenceSection` was mounted inside `display:none` on every initial Watchlist load. It received its full props (`rows`, `onTickerClick`, `totalTickers`, `usingAlignmentEndpoint`) and performed its internal render — building confluence rows, rendering its own section cards — entirely hidden.

**After:** Lazy-first-mount pattern:

```tsx
const [confluenceEverMounted, setConfluenceEverMounted] = useState(false);
useEffect(() => {
  if (screenerMode === 'confluence') setConfluenceEverMounted(true);
}, [screenerMode]);

// In render:
{confluenceEverMounted && <CaelynConfluenceSection ... />}
```

- **Before first activation:** zero mount cost, zero render work, zero props passed to Confluence
- **After first activation:** mounts once; div stays `display:flex` or `display:none` to preserve internal state
- **Confluence internal state** (filters, etc.) is preserved across tab switches once mounted

Alignment query remains lazy per `5918150e` (`enabled: screenerMode === 'confluence' || !!selectedTicker`).

---

## 7. content-visibility Result

Applied `contentVisibility: 'auto', containIntrinsicSize: '0 44px'` to the inner grid div of `WlTickerRow` (the `display: 'grid'` div, NOT the outer `display: 'contents'` wrapper — per spec requirement).

**Placement:** The outer `<div style={{ display: 'contents' }}>` is unchanged. Only the inner grid div receives the content-visibility hint.

**Expected behavior:** Browser skips paint + layout of offscreen rows, using the 44px hint for reserved space during scroll. The 463-row ticker table (total height ~20,000px in market mode) should have most rows offscreen at any time.

**Sticky column:** The sticky horizontal scroll (`position: sticky; left: 0` on the ticker cell) is within the grid div's own layout. `content-visibility: auto` applies `contain: layout style paint` to the grid div — sticky children within it still position relative to the nearest scroll container ancestor (the `.wl-scrollbar` overflow:auto div), not relative to the content-visibility element. This preserves sticky behavior.

**Needs browser validation:** Per spec instructions: verify sticky ticker column, hover state, expanded CaelynRowBreakdown, and sorting in a live browser session.

---

## 8. Stable-Key Sorting Result

**Before:** `key={\`row-frag-${sym}-${i}\`}` — key contains sort index `i`. On every sort, all 463 rows had a new key → React unmounted and remounted all 463 row trees.

**After:** `key={\`${activeId}:${sym}\`}` — position-independent. On sort, React reconciles by key, moves DOM nodes, and only re-renders rows whose props changed (zebra `i` prop). Full unmount/remount eliminated.

**Zebra striping:** The `i` prop still updates when a row's sorted position changes, causing a cheap style re-render (no DOM creation). This is correct — background color must reflect actual visible position.

**Fundamentals table:** `key={\`${row.ticker}-${ri}\`}` → `key={row.ticker || String(ri)}`. Removes the position index from the fragment key.

---

## 9. Fundamentals Optimization

Added `wlCsvMap` as a component-level `useMemo` (deps: `watchlist?.csv_data`):

```ts
const wlCsvMap = useMemo<Record<string, any>>(() => {
  const m: Record<string, any> = {};
  for (const row of (watchlist?.csv_data || [])) {
    const t = (row.ticker || row.Ticker || ...).toString().toUpperCase();
    if (t) m[t] = row;
  }
  return m;
}, [watchlist?.csv_data]);
```

Previously `renderFundamentalScreenerContent` rebuilt the CSV map on every call (every render of the Fundamentals tab). Now it's rebuilt only when CSV data changes (rare — upload only). The render function now uses `const csvMap = wlCsvMap`.

---

## 10. Mode-Specific Calculation Changes

**Before:** `WlTickerRow` computed ~40 options-only expressions at the top of its function body on every render, regardless of active screener mode:
- `_oHasMetrics`, `_oUn`, `_oSt`, `_oHas`, `_oLd`, `_oDim`
- `_scVal`, `_scStr`, `_scClr`, `_oSig`, `_oSigClr`, `_oSigStr`, `_oSigT`
- `_oCP`, `_oCPStr`, `_oCPClr`, `_oIV`, `_oIVStr`, `_oEM`, `_oEMStr`
- `_oVol`, `_oOI`, `_oVPC`, `_oVPCStr`, `_oVPCClr`
- `_oNP`, `_oNPClr`, `_oNP1d`, `_oNP7d`, `_oNP30d`
- `_oCallP`, `_oPutP`, `_oAskP`, `_oBidP`, `_oMidP`
- `_oCallV`, `_oPutV`, `_oCallO`, `_oPutO`

**After:** The `screenerMode === 'options'` block converted to an IIFE that declares all options vars inside the branch and returns JSX:

```tsx
{screenerMode === 'options' && (() => {
  const _oHasMetrics = ...;
  // ... all 40 options expressions ...
  return (<> ... </>);
})()}
```

**Savings per render in Market/Technical/Fundamentals modes:** ~40 `Number()` conversions + string formatting operations × 463 rows = ~18,520 operations per render, per non-options quote poll. These now run ONLY when Options mode is active.

---

## 11. Options Query Consumer Audit

**Consumer analysis of `optionsResp`:**

| Consumer | Mode dependency |
|---|---|
| `optionsSignalsByTicker = optionsResp?.signals ?? {}` | Used in `mergedTickers` — merged into ALL row objects regardless of mode |
| `optionsMeta = optionsResp?.options_meta` | Used in options meta display and tooltip |
| `_oHas = !optionsLoading || !!optionsResp` | Now inside `screenerMode === 'options'` IIFE only |
| `_oLd = optionsLoading && !optionsResp ? '…' : DASH` | Now inside `screenerMode === 'options'` IIFE only |

**Conclusion:** The options query is already enabled lazily (`enabled: !!activeId && (innerView === 'tickers' || innerView === 'close-watch')`). The merged options signals (score, signal, IV, OI, premium) are present in stock rows regardless of screener mode — this enables Confluence and ticker popup to access options data without a separate query.

**Decision: not changing the options query `enabled` predicate.** The payload is needed for Confluence alignment scoring, ticker popup options data, and the options columns. A separate consumer-triggered fetch on entering Options mode would add a 2s latency on tab switch. The current always-present fetch at 2-minute stale interval is intentional.

---

## 12. Lower-Page Lazy Hydration

**Audit findings:**
- `renderEarningsSection()` is a render function using pre-fetched earnings data (`earningsBySymbolsResp`) — no independent queries. It renders unconditionally below the ticker table.
- `WatchlistScorePanel` renders only when `selectedStrategy !== 'default' && (strategyScoreData || strategyScoreLoading)` — already conditional.
- Bottom performance groupings (ThemePerformanceGroupings, etc.) render inside a `bottomView` switch — only the active view renders.

**Decision: IntersectionObserver deferred.** The earnings section uses pre-fetched data (no expensive query starts). The strategy score section is already conditional on user interaction. Adding IntersectionObserver would complicate the architecture without material gain; the sections are not the primary bottleneck.

---

## 13-16. Before/After Performance Summary

| Metric | Pass 1 (5918150e) | Pass 2 (9fd56e16) |
|---|---|---|
| Correctness: non-price canonical changes | ❌ Silently dropped by 10-field whitelist | ✅ Always propagate via input identity |
| Quote poll: rows rebuilt (typical) | Up to 463 (new spreads defeat memo) | Only rows with changed price/quote fields |
| Options calcs per non-options poll | ~18,520 (40 × 463) | 0 (inside IIFE, skipped) |
| Confluence initial mount | Always (display:none) | Never (until first selection) |
| Sort: row remounts | Up to 463 (index in key) | 0 (DOM moved, not remounted) |
| Fundamentals csvMap | Rebuilt every tab render | Rebuilt only on CSV data change |
| content-visibility | Not applied | Applied (44px hint, browser validates) |

---

## 17. Confirmation: Live Quote Cadence Unchanged

`useRealtimeQuotes.ts` constants are unchanged:
- `REFRESH_REGULAR_MS = 20_000` (20s)
- `REFRESH_PREPOST_MS = 45_000` (45s)
- `REFRESH_CLOSED_MS = 3 * 60_000` (180s / 3 min)

Test 16 in `watchlist-perf-pass2.test.ts` asserts these values as a canary.

---

## 18. Confirmation: Options Freshness Unchanged

- Options query polling: `staleTime: 120_000` (2 min) — unchanged
- `normalizeOptionsSignal` called on cache miss in `mergedTickers` — unchanged
- All options fields (`options_iv`, `options_expected_move`, `options_open_interest`, etc.) propagate through new identity architecture
- Test 18 proves OI/options update when `rawOpt` reference changes

---

## 19-20. Tests / Build / Check

| Step | Result |
|---|---|
| `npx tsc --noEmit` | 14 errors (all pre-existing: `TS2802`, `TS2345`, `TS7006`) |
| `npx vite build` | ✅ built in ~17s |
| `git diff --check` | ✅ clean |
| Pass 1 tests (25) | ✅ 25/25 pass |
| Pass 2 tests (20) | ✅ 20/20 pass |
| Security search tests (15) | ✅ 15/15 pass |
| **Total** | **60/60** |

---

## 21. Files Changed

| File | Change |
|---|---|
| `frontend/client/src/pages/watchlist.tsx` | All 8 optimizations (see commits) |
| `frontend/client/src/pages/__tests__/watchlist-perf-pass2.test.ts` | NEW — 20 regression tests |

---

## 22. git diff --check

```
(clean — exit code 0)
```

---

## 23. Final Commit SHA

`9fd56e16 — perf: skip hidden Watchlist render work`

**Staged files only:** `watchlist.tsx` + `watchlist-perf-pass2.test.ts`  
**Not staged:** `market-overview-cache.json`, `portfolio-value-history.json`, prompt asset file  
**Not pushed:** user reviews first per spec requirement
