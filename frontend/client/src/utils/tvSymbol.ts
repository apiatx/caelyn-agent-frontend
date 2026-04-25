/**
 * Resolves the best TradingView chart symbol for a given ticker.
 *
 * Priority order:
 *  1. Explicit tradingview_symbol field on the data object (backend-provided, exchange-qualified)
 *  2. Bare ticker — TradingView global search resolves the correct exchange automatically
 *
 * Do NOT assume a US exchange (NASDAQ/NYSE) by default. Many tickers that appear
 * in Social / X-intelligence data are foreign (XETR:LPKF, LSE:IQE, etc.).
 */
export function resolveTVSymbol(
  ticker: string,
  dataObj?: { tradingview_symbol?: string } | null
): string {
  const tk = (ticker || '').toUpperCase().trim();
  if (!tk) return '';
  // Priority 1: backend has already resolved the correct exchange prefix
  if (dataObj?.tradingview_symbol) return dataObj.tradingview_symbol;
  // Priority 2: bare ticker — TradingView's global search finds the right exchange
  // This is safer than hardcoding NASDAQ: for all names
  return tk;
}
