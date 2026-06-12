/**
 * Canonical TradingView symbol resolver — used by all pages.
 *
 * Priority:
 *  1. Explicit `tradingview_symbol` on the data object (backend-qualified, e.g. "TSE:7203")
 *  2. Ticker already contains `:` — normalize known exchange aliases and return
 *  3. Known crypto base assets → BINANCE:<BASE>USDT
 *  4. `exchange` / `exchangeShortName` field on the data object → mapped TV prefix
 *  5. Bare ticker — TradingView global search auto-resolves (better than a wrong prefix)
 */

const CRYPTO_BASES = new Set([
  'BTC','ETH','SOL','BNB','ADA','XRP','DOT','AVAX','MATIC','LINK',
  'UNI','DOGE','SHIB','LTC','ATOM','TAO','RENDER','FET','ARB','OP',
  'TRX','NEAR','APT','SUI','SEI','INJ','TIA','PYTH','JUP','WIF','HYPE',
]);

// Maps raw exchange names (from FMP / backend) → TradingView exchange prefix
function tvExchangePrefix(raw: string): string {
  const r = (raw || '').toUpperCase().trim();
  if (!r) return '';
  if (r === 'NASDAQ' || r === 'NMS' || r === 'NGS' || r === 'NCM') return 'NASDAQ';
  if (r === 'NYSE'   || r === 'NYQ') return 'NYSE';
  if (r === 'AMEX'   || r === 'NYSEARCA' || r === 'NYSE ARCA' || r === 'BATS') return 'AMEX';
  if (r === 'OTC'    || r === 'OTCBB' || r === 'PINK' || r === 'OTCMKTS') return 'OTC';
  if (r === 'TSX'    || r === 'TSXV') return 'TSX';
  if (r === 'LSE'    || r === 'AIM') return 'LSE';
  if (r === 'ASX') return 'ASX';
  if (r === 'EURONEXT' || r === 'AMS' || r === 'EPA' || r === 'EBR' || r === 'BIT') return 'EURONEXT';
  if (r === 'HKEX'   || r === 'HKG') return 'HKEX';
  if (r === 'KRX'    || r === 'KSE') return 'KRX';
  if (r === 'TSE'    || r === 'JPX' || r === 'TYO') return 'TSE';
  if (r === 'NSE') return 'NSE';
  if (r === 'BSE') return 'BSE';
  if (r === 'SGX') return 'SGX';
  if (r === 'NZX') return 'NZX';
  if (r === 'XETR'   || r === 'XETRA' || r === 'FRA') return 'XETRA';
  if (r === 'SIX'    || r === 'VTX') return 'SIX';
  if (r === 'JSE') return 'JSE';
  if (r === 'CBOE') return 'CBOE';
  return '';
}

// Alias map for exchange prefixes embedded in tickers (e.g. "AIM:IQE" → "LSE:IQE")
const PREFIX_ALIAS: Record<string, string> = {
  AIM: 'LSE', AMS: 'EURONEXT', EPA: 'EURONEXT', EBR: 'EURONEXT', BIT: 'EURONEXT',
  TYO: 'TSE', KSE: 'KRX', HKG: 'HKEX', TSXV: 'TSX',
  XETR: 'XETRA', FRA: 'XETRA',
};

export function resolveTVSymbol(
  ticker: string,
  dataObj?: {
    tradingview_symbol?: string;
    exchange?: string;
    exchangeShortName?: string;
    [key: string]: any;
  } | null,
): string {
  const t = (ticker || '').toUpperCase().trim();
  if (!t) return '';

  // 1. Backend already resolved the exchange-qualified symbol
  if (dataObj?.tradingview_symbol) return dataObj.tradingview_symbol;

  // 2. Already has exchange prefix — normalize aliases
  if (t.includes(':')) {
    const colonIdx = t.indexOf(':');
    const pfx = t.slice(0, colonIdx);
    const sym = t.slice(colonIdx + 1);
    return `${PREFIX_ALIAS[pfx] ?? pfx}:${sym}`;
  }

  // 3. Known crypto base assets
  if (CRYPTO_BASES.has(t)) return `BINANCE:${t}USDT`;
  if (t.endsWith('USDT') && CRYPTO_BASES.has(t.slice(0, -4))) return `BINANCE:${t}`;
  if (t.endsWith('USD')  && CRYPTO_BASES.has(t.slice(0, -3))) return `BINANCE:${t.slice(0, -3)}USDT`;

  // 4. Exchange field on the data object
  const rawEx = String(dataObj?.exchangeShortName || dataObj?.exchange || '');
  const pfx = tvExchangePrefix(rawEx);
  if (pfx) return `${pfx}:${t}`;

  // 5. Bare ticker — TradingView global search handles this reasonably for US stocks
  return t;
}
