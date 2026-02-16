const FMP_API_KEY = process.env.FMP_API_KEY || '';
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

interface FMPQuote {
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
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

interface FMPAnalystConsensus {
  symbol: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: string;
}

interface FMPPriceTarget {
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetConsensus: number;
  targetMedian: number;
}

interface FMPEarningsCalendar {
  date: string;
  symbol: string;
  eps: number | null;
  epsEstimated: number | null;
  time: string;
  revenue: number | null;
  revenueEstimated: number | null;
}

interface FMPDividendCalendar {
  date: string;
  label: string;
  symbol: string;
  dividend: number;
  adjDividend: number;
  recordDate: string;
  paymentDate: string;
  declarationDate: string;
}

interface FMPProfile {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  description: string;
  image: string;
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60_000;

async function fetchFMP<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const queryParams = new URLSearchParams({ ...params, apikey: FMP_API_KEY });
  const url = `${BASE_URL}${endpoint}?${queryParams}`;
  
  const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FMP API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data as T;
}

export const fmpService = {
  async getQuotes(symbols: string[]): Promise<FMPQuote[]> {
    if (symbols.length === 0) return [];
    const symbolStr = symbols.join(',');
    return fetchFMP<FMPQuote[]>(`/quote/${symbolStr}`);
  },

  async getProfile(symbol: string): Promise<FMPProfile[]> {
    return fetchFMP<FMPProfile[]>(`/profile/${symbol}`);
  },

  async getAnalystConsensus(symbol: string): Promise<FMPAnalystConsensus[]> {
    return fetchFMP<FMPAnalystConsensus[]>(`/analyst-estimates/${symbol}`);
  },

  async getPriceTarget(symbol: string): Promise<FMPPriceTarget[]> {
    return fetchFMP<FMPPriceTarget[]>(`/price-target-consensus/${symbol}`);
  },

  async getEarningsCalendar(from?: string, to?: string): Promise<FMPEarningsCalendar[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return fetchFMP<FMPEarningsCalendar[]>('/earning_calendar', params);
  },

  async getDividendCalendar(from?: string, to?: string): Promise<FMPDividendCalendar[]> {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    return fetchFMP<FMPDividendCalendar[]>('/stock_dividend_calendar', params);
  },

  async getStockDetails(symbols: string[]) {
    if (symbols.length === 0) return [];
    
    const [quotes, ...profileResults] = await Promise.all([
      this.getQuotes(symbols),
      ...symbols.map(s => this.getProfile(s).catch(() => []))
    ]);

    const profileMap = new Map<string, FMPProfile>();
    profileResults.forEach((profiles: FMPProfile[]) => {
      if (profiles.length > 0) profileMap.set(profiles[0].symbol, profiles[0]);
    });

    return quotes.map(q => ({
      ...q,
      sector: profileMap.get(q.symbol)?.sector || 'Unknown',
      industry: profileMap.get(q.symbol)?.industry || 'Unknown',
      companyName: profileMap.get(q.symbol)?.companyName || q.name,
    }));
  },

  async getHoldingsEvents(symbols: string[]) {
    if (symbols.length === 0) return { earnings: [], dividends: [] };
    
    const today = new Date();
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    const from = today.toISOString().split('T')[0];
    const to = threeMonthsLater.toISOString().split('T')[0];
    
    const [allEarnings, allDividends] = await Promise.all([
      this.getEarningsCalendar(from, to).catch(() => []),
      this.getDividendCalendar(from, to).catch(() => []),
    ]);

    const symbolSet = new Set(symbols.map(s => s.toUpperCase()));
    
    return {
      earnings: allEarnings.filter(e => symbolSet.has(e.symbol?.toUpperCase())),
      dividends: allDividends.filter(d => symbolSet.has(d.symbol?.toUpperCase())),
    };
  },

  async getPriceTargets(symbols: string[]) {
    const results = await Promise.all(
      symbols.map(s => this.getPriceTarget(s).then(r => r[0]).catch(() => null))
    );
    return results.filter(Boolean);
  },
};
