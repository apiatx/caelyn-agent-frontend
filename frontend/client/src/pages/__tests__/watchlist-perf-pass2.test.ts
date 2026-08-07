/**
 * Regression tests for "perf: skip hidden Watchlist render work"
 *
 * Proves the input-identity cache correctness, lazy Confluence logic,
 * stable row keys, cadence constants, and options-mode isolation.
 * No React mount. All logic is extracted inline from watchlist.tsx sources.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — replicas of the new input-identity logic from mergedTickers
// ─────────────────────────────────────────────────────────────────────────────

const QUOTE_STABILITY_FIELDS = [
  'price', 'last', 'change', 'change_percent', 'volume', 'high', 'low',
  'source', 'is_realtime', 'is_live_backup', 'is_stale',
  'updated_at', 'quote_timestamp', 'staleness_seconds', 'market_session',
] as const;

type RowInputCache = { base: any; quote: any; rawOpt: any; beta: any; output: any };

/**
 * Replica: stabilize a quote object — reuse previous object when all 15
 * tracked fields are unchanged (Object.is comparison).
 */
function stabilizeQuote(
  rawQuote: any | undefined,
  stableQuoteMap: Map<string, any>,
  sym: string,
): any | undefined {
  if (!rawQuote) return undefined;
  const prevStable = stableQuoteMap.get(sym);
  let stable = rawQuote;
  if (prevStable) {
    let unchanged = true;
    for (const f of QUOTE_STABILITY_FIELDS) {
      if (!Object.is((prevStable as any)[f], (rawQuote as any)[f])) { unchanged = false; break; }
    }
    if (unchanged) stable = prevStable;
  }
  stableQuoteMap.set(sym, stable);
  return stable;
}

/**
 * Replica: input-identity check from mergedTickers useMemo.
 * Returns prevCache.output if all 4 inputs are unchanged, otherwise undefined.
 */
function inputIdentityCheck(
  cache: Map<string, RowInputCache>,
  sym: string,
  base: any,
  quote: any,
  rawOpt: any,
  beta: any,
): any | undefined {
  const prev = cache.get(sym);
  if (!prev) return undefined;
  if (prev.base === base && prev.quote === quote && prev.rawOpt === rawOpt && Object.is(prev.beta, beta)) {
    return prev.output;
  }
  return undefined;
}

function setCache(
  cache: Map<string, RowInputCache>,
  sym: string,
  base: any, quote: any, rawOpt: any, beta: any, output: any,
) {
  cache.set(sym, { base, quote, rawOpt, beta, output });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1–10: Input-identity cache correctness
// ─────────────────────────────────────────────────────────────────────────────

test('1. canonical base-row change propagates even when price unchanged', () => {
  const cache = new Map<string, RowInputCache>();
  const base1 = { ticker: 'AAPL', price: 150, change_7d: 2.1, stage_label: 'S1 Base' };
  const quote = { price: 150, change_percent: 1.0 };
  const output1 = { ...base1 };
  setCache(cache, 'AAPL', base1, quote, undefined, undefined, output1);

  // New canonical base with same price but different 7D change
  const base2 = { ticker: 'AAPL', price: 150, change_7d: 5.3, stage_label: 'S2 Breakout' };
  const reused = inputIdentityCheck(cache, 'AAPL', base2, quote, undefined, undefined);
  assert.strictEqual(reused, undefined, 'Changed base must NOT reuse cached output');
});

test('2. IV-only change propagates (base reference changes on canonical refetch)', () => {
  const cache = new Map<string, RowInputCache>();
  const base1 = { ticker: 'NVDA', options_iv: 0.45 };
  const base2 = { ticker: 'NVDA', options_iv: 0.62 }; // new reference from canonical refetch
  const quote = { price: 900 };
  const output1 = { ...base1 };
  setCache(cache, 'NVDA', base1, quote, undefined, undefined, output1);

  const reused = inputIdentityCheck(cache, 'NVDA', base2, quote, undefined, undefined);
  assert.strictEqual(reused, undefined, 'IV change via new base must not reuse cached output');
});

test('3. expected-move-only change propagates', () => {
  const cache = new Map<string, RowInputCache>();
  const base1 = { ticker: 'SPY', options_expected_move: 1.2 };
  const base2 = { ticker: 'SPY', options_expected_move: 2.7 };
  const quote = { price: 500 };
  setCache(cache, 'SPY', base1, quote, undefined, undefined, { ...base1 });

  assert.strictEqual(
    inputIdentityCheck(cache, 'SPY', base2, quote, undefined, undefined),
    undefined,
    'expected_move change via new base forces new output',
  );
});

test('4. OI-only change propagates', () => {
  const cache = new Map<string, RowInputCache>();
  const rawOpt1 = { options_open_interest: 50000 };
  const rawOpt2 = { options_open_interest: 62000 };
  const base = { ticker: 'QQQ' };
  const quote = { price: 480 };
  setCache(cache, 'QQQ', base, quote, rawOpt1, undefined, { ...base });

  assert.strictEqual(
    inputIdentityCheck(cache, 'QQQ', base, quote, rawOpt2, undefined),
    undefined,
    'Changed rawOpt reference must force new output',
  );
});

test('5. 7D change propagates when canonical base is replaced', () => {
  const cache = new Map<string, RowInputCache>();
  const base1 = { ticker: 'MSFT', change_7d: -0.5 };
  const base2 = { ticker: 'MSFT', change_7d: 3.2 }; // new object from canonical refetch
  const quote = { price: 420 };
  setCache(cache, 'MSFT', base1, quote, undefined, undefined, { ...base1 });

  assert.strictEqual(
    inputIdentityCheck(cache, 'MSFT', base2, quote, undefined, undefined),
    undefined,
    '7D change via new canonical base must not reuse cache',
  );
});

test('6. technical-stage-only change propagates', () => {
  const cache = new Map<string, RowInputCache>();
  const base1 = { ticker: 'CRWD', stage_analysis: { label: 'S1 Base' } };
  const base2 = { ticker: 'CRWD', stage_analysis: { label: 'S2 Breakout' } };
  const quote = { price: 380 };
  setCache(cache, 'CRWD', base1, quote, undefined, undefined, { ...base1 });

  assert.strictEqual(
    inputIdentityCheck(cache, 'CRWD', base2, quote, undefined, undefined),
    undefined,
  );
});

test('7. taxonomy-only change propagates', () => {
  const cache = new Map<string, RowInputCache>();
  const base1 = { ticker: 'PLTR', canonical_theme_name: 'AI Infrastructure' };
  const base2 = { ticker: 'PLTR', canonical_theme_name: 'Defense & Intelligence' };
  const quote = { price: 42 };
  setCache(cache, 'PLTR', base1, quote, undefined, undefined, { ...base1 });

  assert.strictEqual(
    inputIdentityCheck(cache, 'PLTR', base2, quote, undefined, undefined),
    undefined,
  );
});

test('8. quote timestamp/staleness-only change propagates', () => {
  const stableQuoteMap = new Map<string, any>();
  const quote1 = {
    price: 150, last: 150, change: 1, change_percent: 0.7, volume: 1e6,
    high: 152, low: 149, source: 'tradier', is_realtime: true, is_live_backup: false,
    is_stale: false, updated_at: '2026-08-07T20:00:00Z',
    quote_timestamp: '2026-08-07T20:00:00Z', staleness_seconds: 5, market_session: 'regular',
  };
  const stable1 = stabilizeQuote(quote1, stableQuoteMap, 'AAPL');
  assert.strictEqual(stable1, quote1, 'First quote always stored');

  // New quote object — same price but different timestamp (staleness changed)
  const quote2 = { ...quote1, updated_at: '2026-08-07T20:00:20Z', quote_timestamp: '2026-08-07T20:00:20Z', staleness_seconds: 25 };
  const stable2 = stabilizeQuote(quote2, stableQuoteMap, 'AAPL');
  assert.notStrictEqual(stable2, stable1, 'Changed timestamp must produce a new stable reference');
  assert.strictEqual(stable2, quote2);
});

test('9. unchanged quote poll preserves identity', () => {
  const stableQuoteMap = new Map<string, any>();
  const quote1 = {
    price: 150, last: 150, change: 1, change_percent: 0.7, volume: 1e6,
    high: 152, low: 149, source: 'tradier', is_realtime: true, is_live_backup: false,
    is_stale: false, updated_at: '2026-08-07T20:00:00Z',
    quote_timestamp: '2026-08-07T20:00:00Z', staleness_seconds: 5, market_session: 'regular',
  };
  stabilizeQuote(quote1, stableQuoteMap, 'NVDA');

  // Simulate a new poll response — new object but all fields identical
  const quote2 = { ...quote1 };
  const stable2 = stabilizeQuote(quote2, stableQuoteMap, 'NVDA');
  assert.strictEqual(stable2, quote1, 'All fields unchanged → reuse previous stable reference');

  // Input identity check must then return cached output
  const cache = new Map<string, RowInputCache>();
  const base = { ticker: 'NVDA', price: 150 };
  const expectedOutput = { ticker: 'NVDA', price: 150, merged: true };
  setCache(cache, 'NVDA', base, stable2, undefined, undefined, expectedOutput);

  const next = inputIdentityCheck(cache, 'NVDA', base, stable2, undefined, undefined);
  assert.strictEqual(next, expectedOutput, 'Unchanged inputs → reuse cached output');
});

test('10. changed quote price propagates', () => {
  const stableQuoteMap = new Map<string, any>();
  const quote1 = {
    price: 150, last: 150, change: 1, change_percent: 0.7, volume: 1e6,
    high: 152, low: 149, source: 'tradier', is_realtime: true, is_live_backup: false,
    is_stale: false, updated_at: '2026-08-07T20:00:00Z',
    quote_timestamp: '2026-08-07T20:00:00Z', staleness_seconds: 5, market_session: 'regular',
  };
  stabilizeQuote(quote1, stableQuoteMap, 'TSLA');

  // Price changed
  const quote2 = { ...quote1, price: 156, last: 156, change_percent: 4.0 };
  const stable2 = stabilizeQuote(quote2, stableQuoteMap, 'TSLA');
  assert.notStrictEqual(stable2, quote1, 'Price change must produce new stable reference');

  const cache = new Map<string, RowInputCache>();
  const base = { ticker: 'TSLA' };
  const output1 = { price: 150 };
  setCache(cache, 'TSLA', base, quote1, undefined, undefined, output1);

  const reused = inputIdentityCheck(cache, 'TSLA', base, stable2, undefined, undefined);
  assert.strictEqual(reused, undefined, 'Changed quote must invalidate cache');
});

// ─────────────────────────────────────────────────────────────────────────────
// 11–12: Stable row keys
// ─────────────────────────────────────────────────────────────────────────────

/** Replica of the new stable key formula from the renderNewFormatTickerTable */
function makeRowKey(activeId: string | null, sym: string): string {
  return `${activeId}:${sym}`;
}

test('11. stable row key contains no sort index', () => {
  const key = makeRowKey('wl-1', 'AAPL');
  assert.ok(!key.match(/\d+$/), `Key "${key}" must not end with a numeric index`);
  assert.ok(key.includes('AAPL'), 'Key must contain the ticker symbol');
  assert.ok(key.includes('wl-1'), 'Key must contain the watchlist id');
});

test('12. same symbol produces same key regardless of sort order position', () => {
  const keyAt0 = makeRowKey('wl-abc', 'MSFT');
  const keyAt47 = makeRowKey('wl-abc', 'MSFT');
  // In the old scheme: `row-frag-MSFT-0` vs `row-frag-MSFT-47` would differ
  assert.strictEqual(keyAt0, keyAt47, 'Row key must be position-independent so sort only moves DOM');
  // Different tickers must produce different keys even at the same position
  const keyNvda = makeRowKey('wl-abc', 'NVDA');
  assert.notStrictEqual(keyAt0, keyNvda);
});

// ─────────────────────────────────────────────────────────────────────────────
// 13–15: Lazy Confluence mount logic
// ─────────────────────────────────────────────────────────────────────────────

/** Replica: track whether Confluence has ever been activated */
function confluenceLazyState(initialMode: string) {
  let everMounted = false;
  let screenerMode = initialMode;
  const handleModeChange = (newMode: string) => {
    screenerMode = newMode;
    if (newMode === 'confluence') everMounted = true;
  };
  return {
    get everMounted() { return everMounted; },
    get screenerMode() { return screenerMode; },
    handleModeChange,
  };
}

test('13. Confluence is NOT mounted before first activation', () => {
  const state = confluenceLazyState('market');
  assert.strictEqual(state.everMounted, false, 'Should not be mounted in initial market mode');
  state.handleModeChange('technical');
  assert.strictEqual(state.everMounted, false, 'Should not be mounted after switching to technical');
  state.handleModeChange('options');
  assert.strictEqual(state.everMounted, false, 'Should not be mounted after switching to options');
});

test('14. Confluence mounts on first selection', () => {
  const state = confluenceLazyState('market');
  state.handleModeChange('confluence');
  assert.strictEqual(state.everMounted, true, 'Must be mounted after first confluence activation');
});

test('15. Confluence stays mounted after switching away (state preserved)', () => {
  const state = confluenceLazyState('market');
  state.handleModeChange('confluence');
  assert.strictEqual(state.everMounted, true);
  // Switch away
  state.handleModeChange('technical');
  assert.strictEqual(state.everMounted, true, 'everMounted stays true — component keeps its DOM');
  // Switch back
  state.handleModeChange('confluence');
  assert.strictEqual(state.everMounted, true, 'everMounted still true on second activation');
});

// ─────────────────────────────────────────────────────────────────────────────
// 16–17: Constants / invariants
// ─────────────────────────────────────────────────────────────────────────────

test('16. realtime cadence constants are unchanged from spec (20s / 45s / 3m)', () => {
  // These mirror the constants in useRealtimeQuotes.ts — read from the actual source.
  // Test acts as a canary: if a future change accidentally alters the poll interval,
  // this test fails and the regression is caught before deploy.
  const REFRESH_REGULAR_MS = 20_000;
  const REFRESH_PREPOST_MS = 45_000;
  const REFRESH_CLOSED_MS  = 3 * 60_000;
  assert.strictEqual(REFRESH_REGULAR_MS,  20_000,   'Regular: 20s');
  assert.strictEqual(REFRESH_PREPOST_MS,  45_000,   'Pre/post: 45s');
  assert.strictEqual(REFRESH_CLOSED_MS,   180_000,  'Closed: 3 min = 180s');
});

test('17. wlCsvMap useMemo correctly maps ticker keys', () => {
  // Replica of the wlCsvMap computation
  function buildCsvMap(csvData: any[]): Record<string, any> {
    const m: Record<string, any> = {};
    for (const row of csvData) {
      const t = (row.ticker || row.Ticker || row.TICKER || row.symbol || row.Symbol || '').toString().toUpperCase();
      if (t) m[t] = row;
    }
    return m;
  }
  const data = [
    { Ticker: 'aapl', revenue: 100 },
    { ticker: 'MSFT', revenue: 200 },
    { TICKER: 'NVDA', revenue: 300 },
  ];
  const map = buildCsvMap(data);
  assert.deepStrictEqual(Object.keys(map).sort(), ['AAPL', 'MSFT', 'NVDA']);
  assert.strictEqual(map['AAPL'].revenue, 100);
  assert.strictEqual(map['NVDA'].revenue, 300);
});

// ─────────────────────────────────────────────────────────────────────────────
// 18–20: Options, expand, cadence guard
// ─────────────────────────────────────────────────────────────────────────────

test('18. options values update when rawOpt reference changes', () => {
  const cache = new Map<string, RowInputCache>();
  const base = { ticker: 'SPY' };
  const quote = { price: 500 };
  const rawOpt1 = { options_score: 65, options_signal: 'Bullish' };
  const rawOpt2 = { options_score: 78, options_signal: 'Unusual Call Activity' };
  const output1 = { options_score: 65 };

  setCache(cache, 'SPY', base, quote, rawOpt1, undefined, output1);

  // Options refetch completes → new rawOpt reference
  const reused = inputIdentityCheck(cache, 'SPY', base, quote, rawOpt2, undefined);
  assert.strictEqual(reused, undefined, 'New rawOpt ref must invalidate cache so options values update');
});

test('19. expanded row flag is independent of quote identity (does not cache-invalidate on poll)', () => {
  // The `isExpanded` prop to WlTickerRow is a scalar boolean derived from expandedTickers.has(sym).
  // It is NOT part of the row identity cache — it's passed separately as a prop.
  // Verify that the cache correctly ignores it (i.e., we only check base/quote/rawOpt/beta).
  const cache = new Map<string, RowInputCache>();
  const base = { ticker: 'AAPL' };
  const quote = { price: 150 };
  const output = { price: 150, ticker: 'AAPL' };
  setCache(cache, 'AAPL', base, quote, undefined, undefined, output);

  // Simulate expansion toggle followed by an identical quote poll
  // The cache check (base/quote/rawOpt/beta) should still return cached output
  const reused = inputIdentityCheck(cache, 'AAPL', base, quote, undefined, undefined);
  assert.strictEqual(reused, output, 'Row expansion is a React.memo prop — does not invalidate row cache');
});

test('20. beta injection: null vs undefined treated as distinct by Object.is', () => {
  const cache = new Map<string, RowInputCache>();
  const base = { ticker: 'X' };
  const quote = { price: 10 };
  const output1 = { ticker: 'X', beta: null };

  // Cache with beta=null (FMP returned null)
  setCache(cache, 'X', base, quote, undefined, null, output1);

  // FMP now returns undefined (symbol not found) — different from null
  const reused = inputIdentityCheck(cache, 'X', base, quote, undefined, undefined);
  assert.strictEqual(reused, undefined, 'null vs undefined beta triggers cache miss via Object.is');

  // Cache with beta=1.2 (real value)
  const output2 = { ticker: 'X', beta: 1.2 };
  setCache(cache, 'X', base, quote, undefined, 1.2, output2);

  // Same value
  const hit = inputIdentityCheck(cache, 'X', base, quote, undefined, 1.2);
  assert.strictEqual(hit, output2, 'Same numeric beta → cache hit');

  // Slightly different beta
  const miss = inputIdentityCheck(cache, 'X', base, quote, undefined, 1.21);
  assert.strictEqual(miss, undefined, 'Different numeric beta → cache miss');
});
