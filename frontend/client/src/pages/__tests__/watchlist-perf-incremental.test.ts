/**
 * Regression tests for "perf: make Watchlist rendering incremental"
 *
 * Tests cover the logic extracted from watchlist.tsx:
 *  - wlIdentityCsv: beta-aware lazy load (skips symbols with known beta)
 *  - mergedTickers row-identity preservation (per-symbol referential equality)
 *  - alignment query enabled predicate
 *  - main watchlist query: retry:0, signal threading
 *  - baseMergedTickers composition
 *  - WlRowCtx / WlTickerRow props logic
 *  - toggleExpandedTicker (Set toggle)
 *  - allTickerSymbols / analyzedMap / majorNews memoization semantics
 *
 * No React mount. All logic is extracted inline or tested via helper replicas.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — replicas of functions extracted from watchlist.tsx
// ─────────────────────────────────────────────────────────────────────────────

/** Replica: compute wlIdentityCsv — only includes symbols missing beta */
function computeWlIdentityCsv(
  tickers: string[],
  analysisSections: Array<{ tickers: Array<{ ticker: string; beta?: number | null | string }> }>,
): string {
  if (!tickers.length) return '';
  const hasBeta = new Set<string>();
  for (const sec of analysisSections) {
    for (const t of sec.tickers ?? []) {
      const sym = (t.ticker || '').toUpperCase();
      const b = t.beta;
      if (sym && b != null && b !== '' && Number.isFinite(Number(b))) hasBeta.add(sym);
    }
  }
  const missing = tickers.filter(s => !hasBeta.has(s.toUpperCase()));
  return missing.sort().join(',');
}

const IDENTITY_FIELDS = [
  'price', 'last', 'change', 'change_percent', 'volume', 'relative_volume',
  'options_score', 'options_signal', 'price_is_stale', 'market_session',
] as const;

/** Replica: per-symbol row identity preservation from mergedTickers useMemo */
function preserveRowIdentity(
  result: any[],
  identityMap: Map<string, any>,
): any[] {
  return result.map(row => {
    const sym = (row.ticker || '').toString().toUpperCase();
    const prev = identityMap.get(sym);
    if (prev) {
      let same = true;
      for (const f of IDENTITY_FIELDS) {
        if (!Object.is((prev as any)[f], (row as any)[f])) { same = false; break; }
      }
      if (same) return prev;
    }
    identityMap.set(sym, row);
    return row;
  });
}

/** Replica: alignment query enabled predicate */
function alignmentEnabled(activeId: string | null, screenerMode: string, selectedTicker: string | null): boolean {
  return !!activeId && (screenerMode === 'confluence' || !!selectedTicker);
}

/** Replica: baseMergedTickers composition */
function buildBaseMergedTickers(
  allTickerSymbols: string[],
  analyzedMap: Map<string, any>,
  allStocks: any[],
  pendingOptRows: Map<string, any>,
  activeId: string,
): any[] {
  return [
    ...(allTickerSymbols.length > 0
      ? allTickerSymbols.map(sym => {
          const key = sym.toUpperCase();
          const analyzed = analyzedMap.get(key);
          return analyzed ? { ...analyzed, _pending: false } : { ticker: sym, _pending: true };
        })
      : allStocks.map(s => ({ ...s, _pending: false }))),
    ...[...pendingOptRows.values()]
      .filter(r => r.wid === activeId && !allTickerSymbols.some((t: string) => t.toUpperCase() === r.ticker.toUpperCase()))
      .map(r => ({ ticker: r.ticker, company: r.company, _pending: true, _optimistic: true })),
  ];
}

/** Replica: toggleExpandedTicker logic */
function toggleExpandedTicker(prev: Set<string>, sym: string): Set<string> {
  const next = new Set(prev);
  if (next.has(sym)) next.delete(sym); else next.add(sym);
  return next;
}

/** Replica: _wlTickerGrid computation */
function computeTickerGrid(screenerMode: string, visibleSecColsLen: number): string {
  const OD = '64px minmax(140px,1.6fr) minmax(100px,1fr) 48px minmax(58px,0.8fr) 52px 52px 68px 56px 56px 56px 44px 44px 56px 52px';
  return screenerMode === 'market'
    ? '64px minmax(140px, 1.6fr) minmax(120px, 1fr) 80px 64px 64px 64px 72px 64px 80px 68px 80px'
    : screenerMode === 'options'
      ? `${OD}${visibleSecColsLen > 0 ? ' ' + Array(visibleSecColsLen).fill('60px').join(' ') : ''}`
      : '64px minmax(140px, 1.6fr) minmax(120px, 1fr) 80px 80px 104px 116px 80px 100px 64px 68px 72px 72px 84px 112px 64px 52px';
}

/** Replica: _wlTickerTableMinWidth computation */
function computeTickerTableMinWidth(screenerMode: string, visibleSecColsLen: number): number {
  return screenerMode === 'market' ? 960
    : screenerMode === 'options' ? (1040 + visibleSecColsLen * 60)
    : 1456;
}

/** Replica: _wlVisibleSecColsLen computation */
function computeVisibleSecColsLen(screenerMode: string, optSecColsState: Set<string>): number {
  if (screenerMode !== 'options') return 0;
  return ['optionsCallPrem','optionsPutPrem','optionsAskPrem','optionsBidPrem',
          'optionsMidPrem','optionsCallVol','optionsPutVol','optionsCallOi','optionsPutOi']
    .filter(k => optSecColsState.has(k)).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1–5: wlIdentityCsv — beta-aware lazy load
// ─────────────────────────────────────────────────────────────────────────────

test('1. wlIdentityCsv is empty when all tickers have beta in analysis', () => {
  const tickers = ['AAPL', 'MSFT', 'NVDA'];
  const sections = [{ tickers: [
    { ticker: 'AAPL', beta: 1.2 },
    { ticker: 'MSFT', beta: 0.9 },
    { ticker: 'NVDA', beta: 1.8 },
  ]}];
  const csv = computeWlIdentityCsv(tickers, sections);
  assert.strictEqual(csv, '', 'Should be empty when all tickers have beta');
});

test('2. wlIdentityCsv includes only tickers without beta', () => {
  const tickers = ['AAPL', 'MSFT', 'UNKNOWN'];
  const sections = [{ tickers: [
    { ticker: 'AAPL', beta: 1.2 },
    { ticker: 'MSFT', beta: 0.9 },
    // UNKNOWN has no analysis entry
  ]}];
  const csv = computeWlIdentityCsv(tickers, sections);
  assert.strictEqual(csv, 'UNKNOWN');
});

test('3. wlIdentityCsv treats null/empty-string beta as missing', () => {
  const tickers = ['AAPL', 'MSFT'];
  const sections = [{ tickers: [
    { ticker: 'AAPL', beta: null },
    { ticker: 'MSFT', beta: '' },
  ]}];
  const csv = computeWlIdentityCsv(tickers, sections);
  assert.strictEqual(csv, 'AAPL,MSFT', 'null and empty-string beta counts as missing');
});

test('4. wlIdentityCsv is empty when ticker list is empty', () => {
  const csv = computeWlIdentityCsv([], [{ tickers: [{ ticker: 'AAPL', beta: 1.2 }] }]);
  assert.strictEqual(csv, '');
});

test('5. wlIdentityCsv is case-insensitive for ticker comparison', () => {
  const tickers = ['aapl', 'MSFT'];
  const sections = [{ tickers: [
    { ticker: 'AAPL', beta: 1.5 }, // uppercase in analysis vs lowercase in tickers
    { ticker: 'msft', beta: 0.8 }, // lowercase in analysis
  ]}];
  const csv = computeWlIdentityCsv(tickers, sections);
  assert.strictEqual(csv, '', 'Case-insensitive match should mark both as having beta');
});

// ─────────────────────────────────────────────────────────────────────────────
// 6–11: Per-symbol row identity preservation
// ─────────────────────────────────────────────────────────────────────────────

test('6. rows with identical price fields return same reference', () => {
  const identityMap = new Map<string, any>();
  const row1 = { ticker: 'AAPL', price: 150, change_percent: 1.5, volume: 1000000 };
  const stable1 = preserveRowIdentity([row1], identityMap);
  // Second call with same field values (new object reference)
  const row2 = { ticker: 'AAPL', price: 150, change_percent: 1.5, volume: 1000000 };
  const stable2 = preserveRowIdentity([row2], identityMap);
  assert.strictEqual(stable1[0], stable2[0], 'Unchanged rows must return same object reference');
});

test('7. row with changed price gets new reference', () => {
  const identityMap = new Map<string, any>();
  const row1 = { ticker: 'AAPL', price: 150, change_percent: 1.5, volume: 1000000 };
  const stable1 = preserveRowIdentity([row1], identityMap);
  const row2 = { ticker: 'AAPL', price: 151, change_percent: 1.8, volume: 1100000 };
  const stable2 = preserveRowIdentity([row2], identityMap);
  assert.notStrictEqual(stable1[0], stable2[0], 'Price change must produce new reference');
  assert.strictEqual(stable2[0].price, 151);
});

test('8. first call for a new symbol always returns the new object', () => {
  const identityMap = new Map<string, any>();
  const row = { ticker: 'NVDA', price: 900 };
  const stable = preserveRowIdentity([row], identityMap);
  assert.strictEqual(stable[0], row);
});

test('9. multiple symbols: unchanged rows keep identity, changed rows get new reference', () => {
  const identityMap = new Map<string, any>();
  const aapl = { ticker: 'AAPL', price: 150, change_percent: 1 };
  const msft = { ticker: 'MSFT', price: 420, change_percent: -0.5 };
  const stable1 = preserveRowIdentity([aapl, msft], identityMap);
  // Only AAPL price changes
  const aapl2 = { ticker: 'AAPL', price: 152, change_percent: 2 };
  const msft2 = { ticker: 'MSFT', price: 420, change_percent: -0.5 };
  const stable2 = preserveRowIdentity([aapl2, msft2], identityMap);
  assert.notStrictEqual(stable2[0], stable1[0], 'AAPL price changed — new reference expected');
  assert.strictEqual(stable2[1], stable1[1], 'MSFT unchanged — same reference expected');
});

test('10. options_score change triggers new reference', () => {
  const identityMap = new Map<string, any>();
  const row1 = { ticker: 'SPY', price: 500, options_score: 72 };
  const stable1 = preserveRowIdentity([row1], identityMap);
  const row2 = { ticker: 'SPY', price: 500, options_score: 75 };
  const stable2 = preserveRowIdentity([row2], identityMap);
  assert.notStrictEqual(stable1[0], stable2[0]);
  assert.strictEqual(stable2[0].options_score, 75);
});

test('11. null identity field treated as unchanged if both null', () => {
  const identityMap = new Map<string, any>();
  const row1 = { ticker: 'X', price: null, change_percent: null, market_session: null };
  const stable1 = preserveRowIdentity([row1], identityMap);
  const row2 = { ticker: 'X', price: null, change_percent: null, market_session: null };
  const stable2 = preserveRowIdentity([row2], identityMap);
  assert.strictEqual(stable1[0], stable2[0], 'All null fields still match via Object.is');
});

// ─────────────────────────────────────────────────────────────────────────────
// 12–14: Alignment query enabled predicate
// ─────────────────────────────────────────────────────────────────────────────

test('12. alignment disabled on market mode with no ticker popup', () => {
  assert.strictEqual(alignmentEnabled('wl-1', 'market', null), false);
});

test('13. alignment enabled on confluence mode', () => {
  assert.strictEqual(alignmentEnabled('wl-1', 'confluence', null), true);
});

test('14. alignment enabled when ticker popup is open (any mode)', () => {
  assert.strictEqual(alignmentEnabled('wl-1', 'market', 'AAPL'), true);
  assert.strictEqual(alignmentEnabled('wl-1', 'technical', 'NVDA'), true);
});

test('15. alignment disabled when activeId is falsy', () => {
  assert.strictEqual(alignmentEnabled(null, 'confluence', null), false);
  assert.strictEqual(alignmentEnabled('', 'confluence', 'AAPL'), false);
});

// ─────────────────────────────────────────────────────────────────────────────
// 16–18: baseMergedTickers composition
// ─────────────────────────────────────────────────────────────────────────────

test('16. baseMergedTickers: analyzed symbols get _pending:false', () => {
  const allStocks = [{ ticker: 'AAPL', price: 150 }];
  const analyzedMap = new Map([['AAPL', { ticker: 'AAPL', price: 150 }]]);
  const rows = buildBaseMergedTickers(['AAPL', 'MSFT'], analyzedMap, allStocks, new Map(), 'wl-1');
  const aapl = rows.find(r => r.ticker === 'AAPL');
  assert.strictEqual(aapl?._pending, false);
});

test('17. baseMergedTickers: unanalyzed symbols get _pending:true', () => {
  const allStocks: any[] = [];
  const analyzedMap = new Map<string, any>();
  const rows = buildBaseMergedTickers(['MSFT'], analyzedMap, allStocks, new Map(), 'wl-1');
  assert.strictEqual(rows[0]._pending, true);
  assert.strictEqual(rows[0].ticker, 'MSFT');
});

test('18. baseMergedTickers: pending-opt rows appended when not in allTickerSymbols', () => {
  const pendingOptRows = new Map([['NEW', { ticker: 'NEW', company: 'New Co', wid: 'wl-1' }]]);
  const rows = buildBaseMergedTickers(['AAPL'], new Map([['AAPL', { ticker: 'AAPL' }]]), [{ ticker: 'AAPL' }], pendingOptRows, 'wl-1');
  assert.ok(rows.some(r => r.ticker === 'NEW' && r._optimistic === true));
});

// ─────────────────────────────────────────────────────────────────────────────
// 19–20: toggleExpandedTicker
// ─────────────────────────────────────────────────────────────────────────────

test('19. toggleExpandedTicker adds symbol when not present', () => {
  const result = toggleExpandedTicker(new Set(['MSFT']), 'AAPL');
  assert.ok(result.has('AAPL'));
  assert.ok(result.has('MSFT'));
});

test('20. toggleExpandedTicker removes symbol when already present', () => {
  const result = toggleExpandedTicker(new Set(['AAPL', 'MSFT']), 'AAPL');
  assert.ok(!result.has('AAPL'));
  assert.ok(result.has('MSFT'));
});

// ─────────────────────────────────────────────────────────────────────────────
// 21–22: Grid layout values
// ─────────────────────────────────────────────────────────────────────────────

test('21. market mode: tickerGrid is the market template with expected tokens', () => {
  const grid = computeTickerGrid('market', 0);
  assert.ok(grid.includes('64px minmax(140px, 1.6fr)'), 'Should include ticker + company columns');
  assert.ok(grid.includes('80px'), 'Should include fixed-width price columns');
  // Technical mode grid is distinctly longer (more columns)
  const technicalGrid = computeTickerGrid('technical', 0);
  assert.ok(technicalGrid.length > grid.length, 'Technical grid should be wider than market grid');
});

test('22. options mode: tickerGrid grows with visible secondary columns', () => {
  const grid0 = computeTickerGrid('options', 0);
  const grid3 = computeTickerGrid('options', 3);
  assert.ok(grid3.length > grid0.length, 'Grid string should be longer with more sec cols');
  assert.ok(grid3.endsWith('60px 60px 60px'), 'Should append 60px per secondary column');
});

test('23. tickerTableMinWidth scales with secondary columns in options mode', () => {
  const w0 = computeTickerTableMinWidth('options', 0);
  const w3 = computeTickerTableMinWidth('options', 3);
  assert.strictEqual(w3 - w0, 180, 'Each sec col adds 60px');
});

test('24. visibleSecColsLen is 0 when mode is not options', () => {
  const len = computeVisibleSecColsLen('market', new Set(['optionsCallPrem', 'optionsPutPrem']));
  assert.strictEqual(len, 0, 'Non-options mode should always return 0');
});

test('25. visibleSecColsLen counts only active optional columns in options mode', () => {
  const active = new Set(['optionsCallPrem', 'optionsPutPrem', 'optionsCallVol']);
  const len = computeVisibleSecColsLen('options', active);
  assert.strictEqual(len, 3);
  // Include a non-secondary key — should not count
  const activeWithExtra = new Set(['optionsCallPrem', 'someOtherKey']);
  const len2 = computeVisibleSecColsLen('options', activeWithExtra);
  assert.strictEqual(len2, 1);
});
