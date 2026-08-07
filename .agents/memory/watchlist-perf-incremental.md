---
name: Watchlist Perf Incremental + Pass 2
description: Key decisions from two incremental rendering optimization passes on watchlist.tsx. Covers identity cache design, lazy Confluence, stable keys, mode-specific calc isolation, and known pitfalls.
---

## Row identity architecture (Pass 2 — input-identity cache)

Do NOT use a display-field whitelist to decide whether to reuse a merged row. Use source-level input identity: track `{ base, quote, rawOpt, beta, output }` per symbol. Reuse output only when ALL 4 inputs are unchanged (reference equality for objects, `Object.is` for scalars).

**Why:** A 10-field whitelist silently drops canonical changes (7D, IV, OI, taxonomy, stage, etc.) when the 10 whitelist fields happen to match. This is a correctness bug that shows stale data in the UI.

**How to apply:**
- `base === baseMergedTickers[i]` — `baseMergedTickers` creates new spreads on every useMemo run, so any canonical refetch → all rows miss
- `quote === stableQuote` — stabilize quote by field comparison first (see QUOTE_STABILITY_FIELDS); only differs if a realtime field actually changed
- `rawOpt === rawOpt` — reference-stable between options refetches (every 2 min)
- `Object.is(beta, beta)` — scalar; null vs undefined are distinct

## Quote stabilization (15 fields)

Before checking input identity, stabilize the incoming realtime quote against the previous stable quote using: `price, last, change, change_percent, volume, high, low, source, is_realtime, is_live_backup, is_stale, updated_at, quote_timestamp, staleness_seconds, market_session`. If all match via Object.is, reuse the previous quote object reference. This prevents unchanged polls from producing new references and defeating the input identity check.

## LKG map and identity cache reset on watchlist switch

When `lkgActiveIdRef.current !== activeId`, clear: lkgSignalMapRef, rowIdentityRef, and stableQuoteRef. Previously only lkgSignalMapRef was cleared, which would incorrectly match cross-watchlist entries in the identity cache.

## Lazy Confluence mount

Use `confluenceEverMounted` state + `useEffect(() => { if (mode==='confluence') setMounted(true) }, [mode])`. Gate `<CaelynConfluenceSection>` on `confluenceEverMounted`. The div stays mounted after first use (keeps internal filter state). Zero initial render cost before first selection.

## Options calculations: mode-specific IIFE

All ~40 options-specific `_o*` variable declarations must be inside the `screenerMode === 'options' && (() => { ... return (<>...</>); })()` IIFE. Never put them at the top of WlTickerRow body where they execute in all modes. ~18,520 operations saved per non-options quote poll across 463 rows.

## Stable row keys

Use `key={\`${activeId}:${sym}\`}` not `key={\`row-frag-${sym}-${i}\`}`. The index in the key causes React to unmount/remount all 463 rows on every sort. Stable keys allow React to move DOM nodes instead.

## analysis vs watchlist?.analysis in wlIdentityCsv

`const analysis = watchlist?.analysis` is declared after wlIdentityCsv in the component body. The wlIdentityCsv useMemo must use `watchlist?.analysis?.sections` (inline) not the `analysis` binding to avoid "used before declaration" TS error.

## rowCtx must be useMemo at WatchlistPage level

The `rowCtx` shared context object and its computed deps (`_wlTickerGrid`, `_wlTickerTableMinWidth`) must be memoized at component level, NOT inside renderNewFormatTickerTable. React hooks cannot be called inside non-component functions.

## content-visibility placement

Apply `contentVisibility: 'auto', containIntrinsicSize: '0 44px'` to the inner grid div (`display: 'grid'`), NOT the outer `display: 'contents'` wrapper. `content-visibility` has no effect on `display: contents` since it has no box.

## wlCsvMap should be useMemo at component level

Don't rebuild the CSV symbol→row map inside `renderFundamentalScreenerContent`. Compute it as `const wlCsvMap = useMemo(() => {...}, [watchlist?.csv_data])` at component level. Fundamentals renders are frequent (every sort click).

## Options query consumer audit

`optionsResp` feeds `optionsSignalsByTicker` which is merged into ALL rows in `mergedTickers` regardless of mode. This is intentional — Confluence and ticker popup need options data without a separate fetch. Do not add mode-gating to the options query without auditing all consumers (Confluence alignment, popup, market-mode signal badges).
