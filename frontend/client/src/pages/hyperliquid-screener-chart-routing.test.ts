import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMatrixChartTargetLookup,
  chartTargetFromScreenerRow,
  dedupeChartTargets,
  makeExplicitChartTarget,
  resolveMatrixChart,
  type ScreenerRow,
} from './hyperliquid-screener';

function row(overrides: Partial<ScreenerRow>): ScreenerRow {
  return {
    coin: '',
    displayName: '',
    category: '',
    tags: [],
    marketType: 'perp',
    ...overrides,
  } as ScreenerRow;
}

test('classified stocks and ETFs never route through the crypto resolver', () => {
  for (const coin of ['MU', 'NVDA', 'TSLA', 'SPY', 'QQQ']) {
    const target = chartTargetFromScreenerRow(row({
      coin,
      displayName: coin === 'MU' ? 'Micron' : coin,
      category: coin === 'SPY' || coin === 'QQQ' ? 'etf' : 'equity',
      tags: [coin === 'SPY' || coin === 'QQQ' ? 'etf' : 'stock'],
    }));
    const resolved = resolveMatrixChart(target.asset, target.tab);

    assert.equal(target.tab, 'stocks_etfs');
    assert.equal(resolved.type, 'tradingview');
    if (resolved.type === 'tradingview') {
      assert.equal(resolved.symbol.includes('USDT'), false);
      if (coin === 'MU') assert.equal(resolved.symbol, 'MU');
    }
  }
});

test('row-derived targets retain namespaced canonical identity in the asset context', () => {
  const target = chartTargetFromScreenerRow(row({
    coin: 'xyz:MU',
    displayName: 'MU',
    category: 'equity',
    tags: ['stock'],
  }));

  assert.equal(target.canonicalId, 'xyz:MU');
  assert.equal(target.asset.canonical_coin_id, 'xyz:MU');
  assert.equal(resolveMatrixChart(target.asset, target.tab).type, 'tradingview');
});

test('classified crypto preserves hardened TradingView resolution', () => {
  for (const coin of ['BTC', 'ETH', 'SOL', 'HYPE']) {
    const target = chartTargetFromScreenerRow(row({
      coin,
      displayName: coin,
      category: 'crypto',
      tags: ['crypto'],
    }));
    const resolved = resolveMatrixChart(target.asset, target.tab);

    assert.equal(target.tab, 'crypto');
    assert.equal(resolved.type, 'crypto-tradingview');
    if (resolved.type === 'crypto-tradingview') {
      assert.equal(resolved.resolution.status, 'resolved');
      assert.notEqual(resolved.resolution.status === 'resolved' ? resolved.resolution.symbol : null, coin);
    }
  }
});

test('unclassified ticker fails closed instead of guessing crypto', () => {
  const target = chartTargetFromScreenerRow(row({
    coin: 'UNKNOWN',
    displayName: 'Unknown',
    category: 'macro',
  }));
  assert.equal(target.tab, 'unavailable');
  assert.equal(resolveMatrixChart(target.asset, target.tab).type, 'unavailable');
});

test('conflicting row classification fails closed', () => {
  for (const evidence of [
    { category: 'equity', tags: ['crypto'] },
    { category: 'theme', tags: ['pre-ipo'] },
    { category: 'pre-ipo', tags: ['theme'] },
  ]) {
    const target = chartTargetFromScreenerRow(row({
      coin: 'CONFLICT',
      displayName: 'Conflict',
      ...evidence,
    }));
    assert.equal(target.tab, 'unavailable');
    assert.equal(resolveMatrixChart(target.asset, target.tab).type, 'unavailable');
  }
});

test('authoritative TSMOM market selects stock or crypto before resolution', () => {
  const stock = makeExplicitChartTarget('xyz:MU', 'MU', 'stocks_etfs');
  const crypto = makeExplicitChartTarget('BTC', 'BTC', 'crypto');

  assert.deepEqual(resolveMatrixChart(stock.asset, stock.tab), {
    type: 'tradingview',
    symbol: 'MU',
    title: 'MU',
  });
  assert.equal(stock.asset.canonical_coin_id, 'xyz:MU');
  assert.equal(resolveMatrixChart(crypto.asset, crypto.tab).type, 'crypto-tradingview');
});

test('Matrix lookup preserves canonical markets and fails closed on a shared alias', () => {
  const lookup = buildMatrixChartTargetLookup({
    stocks_etfs: { assets: [{ coin: 'ABC', display_name: 'ABC', canonical_coin_id: 'xyz:ABC' }] },
    crypto: { assets: [{ coin: 'ABC', display_name: 'ABC', canonical_coin_id: 'ABC' }] },
  });

  assert.equal(lookup.get('XYZ:ABC')?.canonicalId, 'xyz:ABC');
  assert.equal(lookup.get('ABC'), null);
});

test('chart lists preserve same display ticker from distinct canonical markets', () => {
  const targets = [
    makeExplicitChartTarget('nasdaq:ABC', 'ABC', 'stocks_etfs'),
    makeExplicitChartTarget('nyse:ABC', 'ABC', 'stocks_etfs'),
    makeExplicitChartTarget('nasdaq:ABC', 'ABC', 'stocks_etfs'),
  ];

  assert.deepEqual(
    dedupeChartTargets(targets).map(target => target.canonicalId),
    ['nasdaq:ABC', 'nyse:ABC'],
  );
});