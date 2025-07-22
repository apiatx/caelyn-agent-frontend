import fs from 'fs';
import path from 'path';

interface TrendingTicker {
  symbol: string;
  sentiment: number;
  mentions: number;
  lastUpdated: string;
}

interface SocialPulseCache {
  tickers: TrendingTicker[];
  lastUpdated: string;
  nextUpdate: string;
}

const CACHE_FILE = path.join(process.cwd(), 'social-pulse-cache.json');
const UPDATE_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// X.com trending crypto tickers simulation based on real market data
const getTrendingTickers = async (): Promise<TrendingTicker[]> => {
  // Simulate X.com sentiment analysis with realistic data
  const baseTickers = [
    { symbol: 'BTC', baseSentiment: 15 },
    { symbol: 'ETH', baseSentiment: 12 },
    { symbol: 'SOL', baseSentiment: 24 },
    { symbol: 'XRP', baseSentiment: 31 },
    { symbol: 'PEPE', baseSentiment: 15 },
    { symbol: 'DOGE', baseSentiment: 8 },
    { symbol: 'ADA', baseSentiment: 22 },
    { symbol: 'AVAX', baseSentiment: 17 },
    { symbol: 'PENGU', baseSentiment: 42 },
    { symbol: 'HYPE', baseSentiment: 38 },
    { symbol: 'VIRTUAL', baseSentiment: 28 },
    { symbol: 'AI16Z', baseSentiment: 33 },
    { symbol: 'TRUMP', baseSentiment: 45 },
    { symbol: 'LINK', baseSentiment: 19 },
    { symbol: 'NEAR', baseSentiment: 14 }
  ];

  // Add realistic variance to sentiment
  const tickers = baseTickers.map(ticker => ({
    symbol: ticker.symbol,
    sentiment: ticker.baseSentiment + Math.floor(Math.random() * 20) - 10, // ±10% variance
    mentions: Math.floor(Math.random() * 5000) + 1000, // 1000-6000 mentions
    lastUpdated: new Date().toISOString()
  }));

  // Sort by sentiment (highest first) and take top 9
  return tickers
    .sort((a, b) => b.sentiment - a.sentiment)
    .slice(0, 9);
};

const loadCache = (): SocialPulseCache | null => {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading social pulse cache:', error);
  }
  return null;
};

const saveCache = (cache: SocialPulseCache): void => {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving social pulse cache:', error);
  }
};

export const getSocialPulseData = async (): Promise<TrendingTicker[]> => {
  const cache = loadCache();
  const now = new Date();

  // Check if cache exists and is still valid
  if (cache && new Date(cache.nextUpdate) > now) {
    console.log('📊 [Social Pulse] Using cached trending tickers data');
    return cache.tickers;
  }

  console.log('🔍 [Social Pulse] Fetching fresh trending tickers from X.com simulation...');
  
  try {
    const tickers = await getTrendingTickers();
    
    const newCache: SocialPulseCache = {
      tickers,
      lastUpdated: now.toISOString(),
      nextUpdate: new Date(now.getTime() + UPDATE_INTERVAL).toISOString()
    };

    saveCache(newCache);
    
    console.log(`✅ [Social Pulse] Updated trending tickers - Top: $${tickers[0]?.symbol} (+${tickers[0]?.sentiment}%)`);
    return tickers;
  } catch (error) {
    console.error('❌ [Social Pulse] Error fetching trending tickers:', error);
    
    // Return cached data if available, otherwise fallback
    if (cache) {
      return cache.tickers;
    }
    
    // Fallback data
    return [
      { symbol: 'BTC', sentiment: 18, mentions: 3500, lastUpdated: now.toISOString() },
      { symbol: 'ETH', sentiment: 12, mentions: 2800, lastUpdated: now.toISOString() },
      { symbol: 'SOL', sentiment: 24, mentions: 2100, lastUpdated: now.toISOString() }
    ];
  }
};

// Initialize cache on startup
getSocialPulseData().catch(console.error);