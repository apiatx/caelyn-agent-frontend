import assert from 'node:assert/strict';
import test from 'node:test';
import {
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

test('classified MU stock never routes through the crypto resolver', () => {
  const target = chartTargetFromScreenerRow(row({
    coin: 'MU',
    displayName: 'Micron',
    category: 'equity',
    tags: ['stock'],
  }));
  const resolved = resolveMatrixChart(target.asset, target.tab);

  assert.equal(target.tab, 'stocks_etfs');
  assert.deepEqual(resolved, { type: 'tradingview', symbol: 'MU', title: 'Micron' });
});

test('classified crypto preserves hardened TradingView resolution', () => {
  for (const coin of ['BTC', 'HYPE']) {
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
  assert.equal(resolveMatrixChart(crypto.asset, crypto.tab).type, 'crypto-tradingview');
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