export type CryptoTradingViewResolution =
  | {
      status: 'resolved';
      symbol: string;
      strategy: 'known-market' | 'crypto-search';
    }
  | {
      status: 'unresolved';
      symbol: null;
      strategy: 'unresolved';
      reason: string;
    };

/**
 * Curated markets that are already established in the app's crypto chart usage.
 * Unknown assets deliberately do not receive an invented exchange prefix.
 */
const KNOWN_CRYPTO_MARKETS: Readonly<Record<string, string>> = {
  AAVE: 'BINANCE:AAVEUSDT',
  ADA: 'BINANCE:ADAUSDT',
  APT: 'BINANCE:APTUSDT',
  ARB: 'BINANCE:ARBUSDT',
  ATOM: 'BINANCE:ATOMUSDT',
  AVAX: 'BINANCE:AVAXUSDT',
  BNB: 'BINANCE:BNBUSDT',
  BTC: 'BINANCE:BTCUSDT',
  DOGE: 'BINANCE:DOGEUSDT',
  DOT: 'BINANCE:DOTUSDT',
  ETH: 'BINANCE:ETHUSDT',
  FET: 'BINANCE:FETUSDT',
  FIL: 'BINANCE:FILUSDT',
  HBAR: 'BINANCE:HBARUSDT',
  ICP: 'BINANCE:ICPUSDT',
  INJ: 'BINANCE:INJUSDT',
  LINK: 'BINANCE:LINKUSDT',
  LTC: 'BINANCE:LTCUSDT',
  NEAR: 'BINANCE:NEARUSDT',
  ONDO: 'BINANCE:ONDOUSDT',
  OP: 'BINANCE:OPUSDT',
  PEPE: 'BINANCE:PEPEUSDT',
  RENDER: 'BINANCE:RENDERUSDT',
  RUNE: 'BINANCE:RUNEUSDT',
  SHIB: 'BINANCE:SHIBUSDT',
  SOL: 'BINANCE:SOLUSDT',
  SUI: 'BINANCE:SUIUSDT',
  TAO: 'BINANCE:TAOUSDT',
  TIA: 'BINANCE:TIAUSDT',
  TON: 'BINANCE:TONUSDT',
  TRX: 'BINANCE:TRXUSDT',
  UNI: 'BINANCE:UNIUSDT',
  XLM: 'BINANCE:XLMUSDT',
  XRP: 'BINANCE:XRPUSDT',
};

const SAFE_BASE = /^[A-Z0-9]{1,20}$/;
export function resolveCryptoTradingViewSymbol(
  rawSymbol: string,
): CryptoTradingViewResolution {
  const normalized = rawSymbol.trim().toUpperCase();
  if (!normalized) {
    return {
      status: 'unresolved',
      symbol: null,
      strategy: 'unresolved',
      reason: 'No crypto symbol was provided.',
    };
  }

  const knownMarket = KNOWN_CRYPTO_MARKETS[normalized];
  if (knownMarket) {
    return {
      status: 'resolved',
      symbol: knownMarket,
      strategy: 'known-market',
    };
  }

  // Only recognize a supplied quote suffix when its base has a known market.
  // This avoids misclassifying base tickers such as PYUSD, RLUSD, and TUSD.
  for (const quote of ['USDT', 'USD'] as const) {
    if (!normalized.endsWith(quote)) continue;
    const base = normalized.slice(0, -quote.length);
    const knownPairMarket = KNOWN_CRYPTO_MARKETS[base];
    if (knownPairMarket) {
      return {
        status: 'resolved',
        symbol: knownPairMarket,
        strategy: 'known-market',
      };
    }
  }

  if (!SAFE_BASE.test(normalized)) {
    return {
      status: 'unresolved',
      symbol: null,
      strategy: 'unresolved',
      reason: 'No safe TradingView crypto pair could be derived from this symbol.',
    };
  }

  return {
    status: 'resolved',
    symbol: `${normalized}USDT`,
    strategy: 'crypto-search',
  };
}