import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveCryptoTradingViewSymbol,
  type CryptoTradingViewResolution,
} from './cryptoTradingViewSymbol';

const STOCK_EXCHANGE_PREFIX =
  /^(?:NASDAQ|NYSE|AMEX|OTC|LSE|TSX|ASX|EURONEXT|HKEX|KRX|TSE|NSE|BSE|SGX|NZX|XETRA|SIX|JSE|CBOE):/;

function expectResolved(
  source: string,
  expectedSymbol: string,
  expectedStrategy: 'known-market' | 'crypto-search',
) {
  const result = resolveCryptoTradingViewSymbol(source);
  assert.equal(result.status, 'resolved');
  if (result.status !== 'resolved') return;
  assert.equal(result.symbol, expectedSymbol);
  assert.equal(result.strategy, expectedStrategy);
}

function expectUnresolved(source: string) {
  const result = resolveCryptoTradingViewSymbol(source);
  assert.equal(result.status, 'unresolved');
  if (result.status !== 'unresolved') return;
  assert.equal(result.symbol, null);
  assert.match(result.reason, /no (?:crypto symbol|safe TradingView crypto pair)/i);
}

test('curated crypto assets use explicit exchange-qualified USDT markets', () => {
  expectResolved('BTC', 'BINANCE:BTCUSDT', 'known-market');
  expectResolved('eth', 'BINANCE:ETHUSDT', 'known-market');
  expectResolved(' sol ', 'BINANCE:SOLUSDT', 'known-market');
});

test('known pair-shaped inputs normalize to their curated market', () => {
  expectResolved('BTCUSDT', 'BINANCE:BTCUSDT', 'known-market');
  expectResolved('ETHUSD', 'BINANCE:ETHUSDT', 'known-market');
  expectResolved('SOLUSDT', 'BINANCE:SOLUSDT', 'known-market');
});

test('unknown crypto bases use crypto-shaped USDT search candidates', () => {
  expectResolved('MON', 'MONUSDT', 'crypto-search');
  expectResolved('HYPE', 'HYPEUSDT', 'crypto-search');
  expectResolved('1INCH', '1INCHUSDT', 'crypto-search');
});

test('stablecoin-looking base tickers are not mistaken for existing USD pairs', () => {
  expectResolved('PYUSD', 'PYUSDUSDT', 'crypto-search');
  expectResolved('RLUSD', 'RLUSDUSDT', 'crypto-search');
  expectResolved('TUSD', 'TUSDUSDT', 'crypto-search');
});

test('malformed and exchange-qualified inputs fail closed', () => {
  [
    '',
    '   ',
    'MON:NYSE',
    'NYSE:MON',
    'NASDAQ:BTC',
    '$BAD',
    'MON/USD',
    'MON-USDT',
    '币安人生',
    '哈基米',
  ].forEach(expectUnresolved);
});

test('successful resolutions can never be bare bases or stock instruments', () => {
  const sources = [
    'BTC',
    'ETH',
    'SOL',
    'MON',
    'HYPE',
    '1INCH',
    'PYUSD',
    'RLUSD',
    'TUSD',
    'DOGE',
    'TAO',
    'WBTC',
  ];

  const results: Array<[string, CryptoTradingViewResolution]> = sources.map(source => [
    source,
    resolveCryptoTradingViewSymbol(source),
  ]);

  results.forEach(([source, result]) => {
    assert.equal(result.status, 'resolved');
    if (result.status !== 'resolved') return;

    const pair = result.symbol.includes(':')
      ? result.symbol.slice(result.symbol.indexOf(':') + 1)
      : result.symbol;

    assert.notEqual(result.symbol, source, `${source} resolved to a bare ticker`);
    assert.doesNotMatch(result.symbol, STOCK_EXCHANGE_PREFIX);
    assert.match(pair, /(?:USD|USDT)$/);
  });
});

test('resolution is pure and performs no runtime fetches', () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => {
    throw new Error('resolver attempted a network request');
  }) as typeof fetch;

  try {
    expectResolved('BTC', 'BINANCE:BTCUSDT', 'known-market');
    expectResolved('MON', 'MONUSDT', 'crypto-search');
    expectUnresolved('NYSE:MON');
  } finally {
    globalThis.fetch = originalFetch;
  }
});