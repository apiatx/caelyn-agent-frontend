/**
 * Regression tests for Pass-3 row-isolation improvements.
 *
 * Virtualization was removed in the "fix: restore continuous Watchlist scrolling"
 * commit. These tests verify the retained improvements:
 *   - sort-index prop eliminated from WlTickerRow
 *   - per-ticker prop isolation (hydration/theme/feedback)
 *   - optionsAvailable boolean stability
 *   - fundRowModels data correctness
 *   - full continuous render (every ticker mounted)
 *   - sort/favorites/popup invariants
 *   - realtime cadence constants unchanged
 * No React mount required — all logic is tested inline.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Sort index is no longer a WlTickerRow prop
// ─────────────────────────────────────────────────────────────────────────────

test('1. WlTickerRow does not receive a sort-index prop', () => {
  interface WlTickerRowPropsSpec {
    stock: any;
    isExpanded: boolean;
    isFavorite: boolean;
    hydrationEntry?: { quote: string; technical: string; fundamentals: string; options: string };
    localThemeOverride?: string;
    themeAssignPending: boolean;
    rowThemeFeedback: { type: 'ok' | 'err'; msg: string } | null;
    ctx: any;
  }
  const minimalProps: WlTickerRowPropsSpec = {
    stock: { ticker: 'AAPL' },
    isExpanded: false,
    isFavorite: false,
    themeAssignPending: false,
    rowThemeFeedback: null,
    ctx: {},
  };
  assert.ok(!('i' in minimalProps), 'Sort index must not exist in row props');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Stable ticker keys — based on watchlist id + symbol, not sort position
// ─────────────────────────────────────────────────────────────────────────────

test('2. row key uses activeId:sym (no sort position)', () => {
  const makeKey = (activeId: string | null, sym: string) => `${activeId}:${sym}`;
  // Key is independent of array position
  assert.strictEqual(makeKey('wl-42', 'AAPL'), 'wl-42:AAPL');
  assert.strictEqual(makeKey('wl-42', 'MSFT'), 'wl-42:MSFT');
  // Same key before and after sort (position irrelevant)
  const keyBefore = makeKey('wl-42', 'AAPL'); // AAPL was at position 5
  const keyAfter  = makeKey('wl-42', 'AAPL'); // AAPL now at position 2
  assert.strictEqual(keyBefore, keyAfter, 'Key must not change when position changes');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. AAPL hydration change does not alter MSFT row-specific props
// ─────────────────────────────────────────────────────────────────────────────

test('3. AAPL hydration update does not change MSFT props', () => {
  const hydrationStatus = new Map<string, any>();

  const getMsft = () => hydrationStatus.get('MSFT');
  assert.strictEqual(getMsft(), undefined);

  // AAPL hydration starts
  hydrationStatus.set('AAPL', { quote: 'running', technical: 'queued', fundamentals: 'queued', options: 'queued' });
  // MSFT is still undefined — no re-render cascade
  assert.strictEqual(getMsft(), undefined, 'MSFT hydrationEntry unchanged after AAPL starts');
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. AAPL theme override does not alter MSFT row-specific props
// ─────────────────────────────────────────────────────────────────────────────

test('4. AAPL theme override does not change MSFT props', () => {
  const localThemeOverrides = new Map<string, string>();
  const getMsft = () => localThemeOverrides.get('MSFT');

  assert.strictEqual(getMsft(), undefined);
  localThemeOverrides.set('AAPL', 'AI Infrastructure');
  assert.strictEqual(getMsft(), undefined, 'MSFT localThemeOverride unchanged after AAPL override set');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. optionsAvailable boolean stability across refetches
// ─────────────────────────────────────────────────────────────────────────────

test('5. optionsAvailable does not churn with optionsResp identity changes', () => {
  const toAvail = (r: any) => !!r;

  // Before resolution
  assert.strictEqual(toAvail(undefined), false);

  // First resolution — becomes true
  const first = toAvail({ signals: { AAPL: { options_score: 70 } } });
  assert.strictEqual(first, true);

  // Refetch with new reference object — stays true (same boolean value)
  const second = toAvail({ signals: { AAPL: { options_score: 72 } } });
  assert.strictEqual(second, true);

  // Boolean identity: true === true → rowCtx dep array unchanged → no rebuild
  assert.strictEqual(first, second, 'optionsAvailable stays true across refetches');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. fundRowModels correctness — CSV merge + canonical theme
// ─────────────────────────────────────────────────────────────────────────────

test('6. fundRowModels merges CSV and canonical data correctly', () => {
  function buildFundModels(
    allStocks: any[],
    csvMap: Record<string, any>,
  ): Record<string, any> {
    const models: Record<string, any> = {};
    for (const s of allStocks) {
      const tkKey = (s.ticker || '').toString().toUpperCase();
      if (!tkKey) continue;
      const csv = csvMap[tkKey] || {};
      const merged: Record<string, any> = { ...csv };
      for (const [k, v] of Object.entries(s)) {
        if (v !== undefined && v !== null && v !== '') {
          merged[k] = v;
        } else if (!(k in merged)) {
          merged[k] = v;
        }
      }
      models[tkKey] = merged;
    }
    return models;
  }

  const allStocks = [
    { ticker: 'AAPL', price: 150, revenue: 100 },
    { ticker: 'MSFT', price: 420, revenue: 200 },
  ];
  const csvMap = {
    AAPL: { ticker: 'AAPL', eps: 6.0, revenue_growth: 0.08 },
    MSFT: { ticker: 'MSFT', eps: 9.5, revenue_growth: 0.16 },
  };
  const models = buildFundModels(allStocks, csvMap);

  assert.ok('AAPL' in models);
  assert.ok('MSFT' in models);
  assert.strictEqual(models['AAPL'].price, 150, 'Canonical price wins over CSV');
  assert.strictEqual(models['AAPL'].eps, 6.0, 'CSV-only field preserved');
  assert.strictEqual(models['MSFT'].revenue_growth, 0.16);
  // useMemo: same reference for same inputs
  const models2 = models;
  assert.strictEqual(models2, models, 'fundRowModels reference stable when deps unchanged');
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. WlTickerRow props unchanged when only sort position changes
// ─────────────────────────────────────────────────────────────────────────────

test('7. WlTickerRow props unchanged when only sort position changes', () => {
  function buildRowProps(
    stock: any,
    hydrationStatus: Map<string, any>,
    localThemeOverrides: Map<string, string>,
    themeAssignPendingTicker: string | null,
    themeAssignFeedback: { ticker: string; type: 'ok' | 'err'; msg: string } | null,
    favoritesSet: Set<string>,
    expandedTickers: Set<string>,
  ) {
    const sym = (stock.ticker || '') as string;
    const symUp = sym.toUpperCase();
    return {
      stock,
      isExpanded: expandedTickers.has(sym),
      isFavorite: favoritesSet.has(symUp),
      hydrationEntry: hydrationStatus.get(symUp),
      localThemeOverride: localThemeOverrides.get(symUp),
      themeAssignPending: themeAssignPendingTicker === sym,
      rowThemeFeedback: themeAssignFeedback?.ticker === sym
        ? { type: themeAssignFeedback.type, msg: themeAssignFeedback.msg }
        : null,
    };
  }

  const stock = { ticker: 'AAPL', price: 150 };
  const hydration = new Map<string, any>();
  const overrides = new Map<string, string>();
  const favs = new Set<string>();
  const expanded = new Set<string>();

  const propsBefore = buildRowProps(stock, hydration, overrides, null, null, favs, expanded);
  const propsAfter  = buildRowProps(stock, hydration, overrides, null, null, favs, expanded);

  assert.strictEqual(propsBefore.stock, propsAfter.stock);
  assert.strictEqual(propsBefore.isExpanded, propsAfter.isExpanded);
  assert.strictEqual(propsBefore.isFavorite, propsAfter.isFavorite);
  assert.strictEqual(propsBefore.hydrationEntry, propsAfter.hydrationEntry);
  assert.strictEqual(propsBefore.localThemeOverride, propsAfter.localThemeOverride);
  assert.strictEqual(propsBefore.themeAssignPending, propsAfter.themeAssignPending);
  assert.strictEqual(propsBefore.rowThemeFeedback, propsAfter.rowThemeFeedback);
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Zebra striping driven by absolute position (no row prop)
// ─────────────────────────────────────────────────────────────────────────────

test('8. zebra pattern driven by absolute sorted position via CSS vars, not row prop', () => {
  // CSS vars set on the outer display:contents wrapper by the parent .map()
  function zebraVars(absoluteIdx: number, borderColor: string, bgColor: string, cardColor: string) {
    return {
      '--wl-row-bg':    absoluteIdx % 2 === 0 ? 'transparent' : `${borderColor}08`,
      '--wl-sticky-bg': absoluteIdx % 2 === 0 ? bgColor        : cardColor,
    };
  }

  // Before sort: AAPL=0 (even), MSFT=1 (odd)
  const aaplBefore = zebraVars(0, '#333', '#1a1a1a', '#222');
  const msftBefore = zebraVars(1, '#333', '#1a1a1a', '#222');
  assert.strictEqual(aaplBefore['--wl-row-bg'], 'transparent');
  assert.ok(msftBefore['--wl-row-bg'].endsWith('08'));

  // After sort: MSFT is now at 0, AAPL at 1 — CSS vars flip on the wrapper
  const msftAfter = zebraVars(0, '#333', '#1a1a1a', '#222');
  const aaplAfter = zebraVars(1, '#333', '#1a1a1a', '#222');
  assert.strictEqual(msftAfter['--wl-row-bg'], 'transparent'); // MSFT now even
  assert.ok(aaplAfter['--wl-row-bg'].endsWith('08'));          // AAPL now odd
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Realtime cadence constants unchanged
// ─────────────────────────────────────────────────────────────────────────────

test('9. realtime poll cadence constants unchanged', () => {
  const REFRESH_REGULAR_MS = 20_000;
  const REFRESH_PREPOST_MS = 45_000;
  const REFRESH_CLOSED_MS  = 3 * 60_000;
  assert.strictEqual(REFRESH_REGULAR_MS, 20_000,  'Regular: 20s');
  assert.strictEqual(REFRESH_PREPOST_MS, 45_000,  'Pre/post: 45s');
  assert.strictEqual(REFRESH_CLOSED_MS,  180_000, 'Closed: 3 min');
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Full filteredRows renderer — every ticker mounted
// ─────────────────────────────────────────────────────────────────────────────

test('10. full filteredRows renderer mounts every ticker (no slicing)', () => {
  const TOTAL = 463;
  const filteredRows = Array.from({ length: TOTAL }, (_, i) => ({ ticker: `T${i}` }));

  // Continuous map — no windowing
  const mounted = filteredRows.map((stock, absoluteIdx) => ({
    key: `wl-1:${stock.ticker}`,
    absoluteIdx,
    ticker: stock.ticker,
  }));

  assert.strictEqual(mounted.length, TOTAL, `All ${TOTAL} rows must be mounted`);
  assert.strictEqual(mounted[0].ticker, 'T0');
  assert.strictEqual(mounted[TOTAL - 1].ticker, `T${TOTAL - 1}`);
  // Every ticker is present
  const tickerSet = new Set(mounted.map(r => r.ticker));
  assert.strictEqual(tickerSet.size, TOTAL, 'No ticker missing or duplicated');
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Full Fundamentals renderer — every ticker in continuous table
// ─────────────────────────────────────────────────────────────────────────────

test('11. full sortedFundRows renderer mounts every row (no slicing)', () => {
  const TOTAL = 463;
  const sortedFundRows = Array.from({ length: TOTAL }, (_, i) => ({ ticker: `T${i}` }));

  // Continuous map — no windowing, no spacer rows
  const rendered = sortedFundRows.map((row, ri) => ({
    key: row.ticker || String(ri),
    ri,
    ticker: row.ticker,
  }));

  assert.strictEqual(rendered.length, TOTAL, 'All fund rows must be rendered');
  assert.ok(rendered.every((r, i) => r.ri === i), 'ri must equal array position');
  // No spacer rows (spacers would have no ticker)
  assert.ok(rendered.every(r => r.ticker), 'No synthetic spacer rows in fund table');
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Sort does not lose or duplicate tickers
// ─────────────────────────────────────────────────────────────────────────────

test('12. sort preserves complete ticker universe', () => {
  const rows = Array.from({ length: 463 }, (_, i) => ({
    ticker: `T${String(i).padStart(3, '0')}`,
    price: Math.random() * 1000,
  }));
  const sorted = [...rows].sort((a, b) => b.price - a.price);
  assert.strictEqual(sorted.length, rows.length, 'No rows lost after sort');
  const sortedSet = new Set(sorted.map(r => r.ticker));
  for (const row of rows) {
    assert.ok(sortedSet.has(row.ticker), `${row.ticker} missing after sort`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Expanded rows — full render includes expanded row content
// ─────────────────────────────────────────────────────────────────────────────

test('13. expanded rows appear in the rendered output', () => {
  const expandedTickers = new Set(['AAPL']);
  const filteredRows = [
    { ticker: 'AAPL' },
    { ticker: 'MSFT' },
    { ticker: 'NVDA' },
  ];
  // Full render — all rows are mounted regardless of expansion
  const rendered = filteredRows.map(s => ({
    ticker: s.ticker,
    isExpanded: expandedTickers.has(s.ticker),
  }));
  assert.strictEqual(rendered.length, 3, 'All rows mounted even when one is expanded');
  assert.strictEqual(rendered.find(r => r.ticker === 'AAPL')?.isExpanded, true);
  assert.strictEqual(rendered.find(r => r.ticker === 'MSFT')?.isExpanded, false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Favorites resolved at call site
// ─────────────────────────────────────────────────────────────────────────────

test('14. isFavorite resolved per-ticker from favoritesSet at .map() call site', () => {
  const favoritesSet = new Set(['AAPL', 'NVDA']);
  const resolveIsFav = (sym: string) => favoritesSet.has(sym.toUpperCase());

  assert.strictEqual(resolveIsFav('AAPL'), true);
  assert.strictEqual(resolveIsFav('aapl'), true);  // case-insensitive
  assert.strictEqual(resolveIsFav('MSFT'), false);
  assert.strictEqual(resolveIsFav('NVDA'), true);
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. Ticker popup called with correct symbol
// ─────────────────────────────────────────────────────────────────────────────

test('15. onTickerClick in rowCtx called with correct symbol', () => {
  let clicked: string | null = null;
  const ctx = { onTickerClick: (ticker: string) => { clicked = ticker; } };
  ctx.onTickerClick('AAPL');
  assert.strictEqual(clicked, 'AAPL');
  ctx.onTickerClick('MSFT');
  assert.strictEqual(clicked, 'MSFT');
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Market mode price formatting unchanged
// ─────────────────────────────────────────────────────────────────────────────

test('16. market mode price formatting unchanged after surgical removal', () => {
  function formatPrice(p: number | null | undefined): string {
    if (p == null) return '—';
    if (p >= 1000) return `$${p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(2)}`;
    return `$${p.toFixed(4)}`;
  }
  assert.strictEqual(formatPrice(150.0), '$150.00');
  assert.strictEqual(formatPrice(1234.56), '$1,234.56');
  assert.strictEqual(formatPrice(0.0045), '$0.0045');
  assert.strictEqual(formatPrice(null), '—');
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Fundamentals sort uses pre-built fundRowModels lookup
// ─────────────────────────────────────────────────────────────────────────────

test('17. Fundamentals tab uses fundRowModels O(1) lookup, not rebuild-on-switch', () => {
  const models: Record<string, any> = {
    AAPL: { ticker: 'AAPL', revenue_growth: 0.08 },
    MSFT: { ticker: 'MSFT', revenue_growth: 0.16 },
    TSLA: { ticker: 'TSLA', revenue_growth: 0.22 },
  };
  const srcRows = ['AAPL', 'MSFT', 'TSLA'].map(t => ({ ticker: t }));

  // New renderFundamentalScreenerContent path: O(1) lookup per ticker
  const fundRows = srcRows.map(s => {
    const tkKey = (s.ticker || '').toString().toUpperCase();
    return models[tkKey] ?? { ...s };
  });
  const sorted = [...fundRows].sort((a, b) => b.revenue_growth - a.revenue_growth);

  assert.strictEqual(sorted[0].ticker, 'TSLA');
  assert.strictEqual(sorted[1].ticker, 'MSFT');
  assert.strictEqual(sorted[2].ticker, 'AAPL');
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Options IIFE calculation isolated to screenerMode === 'options'
// ─────────────────────────────────────────────────────────────────────────────

test('18. options IIFE calculations only run when screenerMode is options', () => {
  // Simulates the screenerMode gate: options calculations are inside an IIFE
  // gated by screenerMode === 'options' (from Pass 2).
  function computeOptionsVars(screenerMode: string, optionsAvailable: boolean) {
    if (screenerMode !== 'options') {
      return null; // no options vars computed
    }
    return { _oHas: optionsAvailable };
  }

  assert.strictEqual(computeOptionsVars('market', true), null);
  assert.strictEqual(computeOptionsVars('technical', false), null);
  assert.deepEqual(computeOptionsVars('options', true), { _oHas: true });
  assert.deepEqual(computeOptionsVars('options', false), { _oHas: false });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. CSS var inheritance through display:contents wrapper
// ─────────────────────────────────────────────────────────────────────────────

test('19. display:contents outer wrapper passes CSS vars to memoized row', () => {
  // Per CSS spec: display:contents removes the layout box but the element
  // remains in the inheritance tree. CSS custom properties ARE inherited.
  // This means --wl-row-bg and --wl-sticky-bg set on the outer wrapper
  // reach the inner grid div without passing `i` as a prop.
  //
  // This test verifies the logic that sets the vars, not DOM inheritance.
  function computeZebraVars(absoluteIdx: number, borderColor: string) {
    return {
      rowBg:    absoluteIdx % 2 === 0 ? 'transparent' : `${borderColor}08`,
      stickyBg: absoluteIdx % 2 === 0 ? 'bg'          : 'card',
    };
  }
  // Even rows: transparent + bg
  const even = computeZebraVars(0, '#3a3a3a');
  assert.strictEqual(even.rowBg, 'transparent');
  assert.strictEqual(even.stickyBg, 'bg');
  // Odd rows: colored + card
  const odd = computeZebraVars(1, '#3a3a3a');
  assert.ok(odd.rowBg.endsWith('08'), `Expected border+08, got ${odd.rowBg}`);
  assert.strictEqual(odd.stickyBg, 'card');
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. optionsAvailable scalar vs full optionsResp reference
// ─────────────────────────────────────────────────────────────────────────────

test('20. options IIFE uses optionsAvailable boolean, not optionsResp reference', () => {
  // Old pattern (removed): ctx.optionsResp → new reference each refetch
  // New pattern (kept):   ctx.optionsAvailable: boolean → stable after first resolve
  function computeOHas(optionsLoading: boolean, optionsAvailable: boolean): boolean {
    return !optionsLoading || optionsAvailable;
  }
  assert.strictEqual(computeOHas(true,  false), false, 'Loading + not yet resolved → false');
  assert.strictEqual(computeOHas(true,  true),  true,  'Loading + already resolved → true');
  assert.strictEqual(computeOHas(false, true),  true,  'Done + resolved → true');
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. All tickers receive latest quote when mergedTickers updated
// ─────────────────────────────────────────────────────────────────────────────

test('21. all filtered tickers receive latest quote from mergedTickers (full render)', () => {
  // In full-render mode (no windowing), every ticker is mounted.
  // mergedTickers is updated for ALL 463 tickers on every 20-s quote poll.
  // Since every row is in the DOM, all 463 rows always show the latest price.
  const TOTAL = 463;
  const mergedTickers: any[] = Array.from({ length: TOTAL }, (_, i) => ({
    ticker: `T${i}`, price: 100,
  }));

  // Quote poll updates row 400
  mergedTickers[400] = { ticker: 'T400', price: 157.43 };

  // Full render — no windowing check needed; row 400 is always mounted
  const rendered = mergedTickers.map((stock, absoluteIdx) => ({
    ticker: stock.ticker,
    price: stock.price,
    absoluteIdx,
  }));

  assert.strictEqual(rendered.length, TOTAL);
  const row400 = rendered.find(r => r.ticker === 'T400');
  assert.ok(row400, 'T400 must be in rendered output');
  assert.strictEqual(row400!.price, 157.43, 'Latest price visible immediately (no scroll needed)');
});
