import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeRealtimeQuote } from '../mergeRealtimeQuote';

test('mergeRealtimeQuote overlays price/change/volume but preserves fundamentals', () => {
  const existing = {
    ticker: 'AAPL',
    price: 100,
    change_pct: -1.5,
    volume: 500,
    market_cap: 3_000_000_000_000,
    revenue: 400_000_000_000,
    pe_ratio: 28.5,
  };
  const rt = {
    symbol: 'AAPL',
    price: 195.42,
    change: 1.2,
    change_percent: 0.62,
    volume: 12345,
    source: 'tradier',
    is_realtime: true,
    quote_timestamp: '2026-05-01T15:00:00Z',
  };
  const merged = mergeRealtimeQuote(existing as any, rt);
  assert.equal(merged.price, 195.42);
  assert.equal(merged.last, 195.42);
  assert.equal(merged.change_pct, 0.62);
  assert.equal(merged.change_percent, 0.62);
  assert.equal(merged.volume, 12345);
  // fundamentals preserved
  assert.equal(merged.market_cap, 3_000_000_000_000);
  assert.equal(merged.revenue, 400_000_000_000);
  assert.equal(merged.pe_ratio, 28.5);
  // freshness metadata attached
  assert.equal(merged.price_source, 'tradier');
  assert.equal(merged.price_is_realtime, true);
  assert.equal(merged.price_is_stale, false);
});

test('mergeRealtimeQuote does not overwrite when realtime price is missing', () => {
  const existing = { ticker: 'NVDA', price: 800, change_pct: 1.0 };
  const rt = {
    symbol: 'NVDA',
    price: null,
    last: null,
    change: null,
    change_percent: null,
    source: 'lkg',
    is_stale: true,
  };
  const merged = mergeRealtimeQuote(existing as any, rt as any);
  assert.equal(merged.price, 800);
  assert.equal(merged.change_pct, 1.0);
  assert.equal(merged.price_source, 'lkg');
  assert.equal(merged.price_is_stale, true);
});

test('mergeRealtimeQuote handles null/undefined existing data', () => {
  const rt = {
    symbol: 'TSLA',
    price: 250.5,
    change_percent: -2.3,
    source: 'public_fallback',
    is_realtime: true,
    is_live_backup: true,
  };
  const merged = mergeRealtimeQuote(null, rt);
  assert.equal(merged.price, 250.5);
  assert.equal(merged.change_percent, -2.3);
  assert.equal(merged.price_source, 'public_fallback');
  assert.equal(merged.price_is_live_backup, true);
});

test('mergeRealtimeQuote returns existing unchanged when realtime quote is null', () => {
  const existing = { ticker: 'GOOG', price: 145, market_cap: 1_900_000_000_000 };
  const merged = mergeRealtimeQuote(existing as any, null);
  assert.equal(merged.price, 145);
  assert.equal(merged.market_cap, 1_900_000_000_000);
  // No metadata added when no realtime
  assert.equal((merged as any).price_source, undefined);
});

test('mergeRealtimeQuote falls back to last when price is missing', () => {
  const merged = mergeRealtimeQuote(
    { ticker: 'MSFT', price: 400 } as any,
    { symbol: 'MSFT', price: null, last: 410.25, source: 'tradier', is_realtime: true } as any
  );
  assert.equal(merged.price, 410.25);
  assert.equal(merged.last, 410.25);
});
