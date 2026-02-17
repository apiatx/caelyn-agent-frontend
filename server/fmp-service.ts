const FMP_API_KEY = process.env.FMP_API_KEY || '';
const FMP_BASE = 'https://financialmodelingprep.com/stable';

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sector: string;
  industry: string;
  companyName: string;
}

interface PriceTarget {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetConsensus: number;
  targetMedian: number;
}

interface EarningsEvent {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
}

interface DividendEvent {
  date: string;
  label: string;
  symbol: string;
  dividend: number;
  adjDividend: number;
  recordDate: string;
  paymentDate: string;
  declarationDate: string;
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60_000;

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data as T;
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchYahooQuotes(symbols: string[]): Promise<StockQuote[]> {
  const cacheKey = `yahoo:${symbols.join(',')}`;
  const cached = getCached<StockQuote[]>(cacheKey);
  if (cached) return cached;

  try {
    const symbolStr = symbols.join(',');
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolStr)}&fields=symbol,shortName,longName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketDayHigh,regularMarketDayLow,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,regularMarketVolume,averageDailyVolume3Month,regularMarketOpen,regularMarketPreviousClose,epsTrailingTwelveMonths,trailingPE,earningsTimestamp,sector,industry`;
    
    console.log(`[Yahoo] Fetching quotes for: ${symbolStr}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    
    if (!res.ok) {
      console.error(`[Yahoo] Quote API returned ${res.status}`);
      return fetchYahooChartFallback(symbols);
    }
    
    const data = await res.json();
    const results = data?.quoteResponse?.result || [];
    
    const quotes: StockQuote[] = results.map((q: any) => ({
      symbol: q.symbol || '',
      name: q.shortName || q.longName || q.symbol || '',
      companyName: q.longName || q.shortName || q.symbol || '',
      price: q.regularMarketPrice || 0,
      change: q.regularMarketChange || 0,
      changesPercentage: q.regularMarketChangePercent || 0,
      dayHigh: q.regularMarketDayHigh || 0,
      dayLow: q.regularMarketDayLow || 0,
      yearHigh: q.fiftyTwoWeekHigh || 0,
      yearLow: q.fiftyTwoWeekLow || 0,
      marketCap: q.marketCap || 0,
      volume: q.regularMarketVolume || 0,
      avgVolume: q.averageDailyVolume3Month || 0,
      open: q.regularMarketOpen || 0,
      previousClose: q.regularMarketPreviousClose || 0,
      eps: q.epsTrailingTwelveMonths || 0,
      pe: q.trailingPE || 0,
      earningsAnnouncement: q.earningsTimestamp ? new Date(q.earningsTimestamp * 1000).toISOString() : '',
      sector: q.sector || 'Unknown',
      industry: q.industry || 'Unknown',
    }));
    
    if (quotes.length > 0) {
      setCache(cacheKey, quotes);
    }
    return quotes;
  } catch (err) {
    console.error('[Yahoo] Quote fetch failed:', err);
    return fetchYahooChartFallback(symbols);
  }
}

async function fetchYahooChartFallback(symbols: string[]): Promise<StockQuote[]> {
  const results: StockQuote[] = [];
  
  for (const symbol of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      if (!res.ok) continue;
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) continue;
      
      const indicators = data?.chart?.result?.[0]?.indicators?.quote?.[0];
      const closes = indicators?.close || [];
      const prevClose = closes.length >= 2 ? closes[closes.length - 2] : meta.chartPreviousClose || meta.previousClose || 0;
      const currentPrice = meta.regularMarketPrice || 0;
      const change = currentPrice - prevClose;
      const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
      
      results.push({
        symbol: meta.symbol || symbol,
        name: meta.shortName || meta.longName || symbol,
        companyName: meta.longName || meta.shortName || symbol,
        price: currentPrice,
        change: change,
        changesPercentage: changePct,
        dayHigh: meta.regularMarketDayHigh || 0,
        dayLow: meta.regularMarketDayLow || 0,
        yearHigh: meta.fiftyTwoWeekHigh || 0,
        yearLow: meta.fiftyTwoWeekLow || 0,
        marketCap: 0,
        volume: meta.regularMarketVolume || 0,
        avgVolume: 0,
        open: meta.regularMarketOpen || 0,
        previousClose: prevClose,
        eps: 0,
        pe: 0,
        earningsAnnouncement: '',
        sector: 'Unknown',
        industry: 'Unknown',
      });
    } catch (err) {
      console.error(`[Yahoo] Chart fallback failed for ${symbol}:`, err);
    }
  }
  
  if (results.length > 0) {
    setCache(`yahoo:${symbols.join(',')}`, results);
  }
  return results;
}

async function fetchFMP<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({ ...params, apikey: FMP_API_KEY });
  const url = `${FMP_BASE}${endpoint}?${queryParams}`;
  const cacheKey = `fmp:${endpoint}:${JSON.stringify(params)}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FMP API error ${res.status}: ${text.substring(0, 200)}`);
  }
  const data = await res.json();
  setCache(cacheKey, data);
  return data as T;
}

export const fmpService = {
  async getQuotes(symbols: string[]): Promise<StockQuote[]> {
    if (symbols.length === 0) return [];
    return fetchYahooQuotes(symbols);
  },

  async getStockDetails(symbols: string[]): Promise<StockQuote[]> {
    if (symbols.length === 0) return [];
    return fetchYahooQuotes(symbols);
  },

  async getPriceTarget(symbol: string): Promise<PriceTarget[]> {
    try {
      return await fetchFMP<PriceTarget[]>('/price-target-consensus', { symbol });
    } catch {
      return [];
    }
  },

  async getEarningsCalendar(from?: string, to?: string): Promise<EarningsEvent[]> {
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return await fetchFMP<EarningsEvent[]>('/earning_calendar', params);
    } catch {
      return [];
    }
  },

  async getDividendCalendar(from?: string, to?: string): Promise<DividendEvent[]> {
    try {
      const params: Record<string, string> = {};
      if (from) params.from = from;
      if (to) params.to = to;
      return await fetchFMP<DividendEvent[]>('/stock_dividend_calendar', params);
    } catch {
      return [];
    }
  },

  async getHoldingsEvents(symbols: string[]) {
    if (symbols.length === 0) return { earnings: [], dividends: [] };

    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const from = today.toISOString().split('T')[0];
    const to = threeMonthsLater.toISOString().split('T')[0];

    const [allEarnings, allDividends] = await Promise.all([
      this.getEarningsCalendar(from, to),
      this.getDividendCalendar(from, to),
    ]);

    const symbolSet = new Set(symbols.map(s => s.toUpperCase()));

    return {
      earnings: (Array.isArray(allEarnings) ? allEarnings : []).filter(e => symbolSet.has(e.symbol?.toUpperCase())),
      dividends: (Array.isArray(allDividends) ? allDividends : []).filter(d => symbolSet.has(d.symbol?.toUpperCase())),
    };
  },

  async getPriceTargets(symbols: string[]) {
    const results = await Promise.all(
      symbols.map(s => this.getPriceTarget(s).then(r => Array.isArray(r) && r.length > 0 ? r[0] : null).catch(() => null))
    );
    return results.filter(Boolean);
  },

  async searchTickers(query: string): Promise<Array<{symbol: string; name: string; type: string; exchange: string}>> {
    if (!query || query.length < 1) return [];
    try {
      const results = await fetchFMP<Array<{symbol: string; name: string; type: string; exchangeShortName: string}>>('/search', { query, limit: '10' });
      return (Array.isArray(results) ? results : []).map(r => ({
        symbol: r.symbol || '',
        name: r.name || '',
        type: r.type || 'stock',
        exchange: r.exchangeShortName || '',
      }));
    } catch { return []; }
  },
};
