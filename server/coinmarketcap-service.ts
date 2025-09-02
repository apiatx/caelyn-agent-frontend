import fetch from 'node-fetch';

interface CoinMarketCapCrypto {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
      percent_change_60d: number;
      percent_change_90d: number;
      market_cap: number;
    };
  };
}

interface CoinMarketCapResponse {
  data: CoinMarketCapCrypto[];
  status: {
    timestamp: string;
    error_code: number;
    error_message: string | null;
  };
}

class CoinMarketCapService {
  private apiKey: string;
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';

  constructor() {
    this.apiKey = process.env.CMC_API_KEY || '7d9a361e-596d-4914-87e2-f1124da24897';
  }

  async getTop100Cryptocurrencies(): Promise<CoinMarketCapCrypto[]> {
    try {
      console.log('🔍 [CMC] Fetching top 100 cryptocurrencies from CoinMarketCap...');
      const url = `${this.baseUrl}/cryptocurrency/listings/latest?start=1&limit=100&convert=USD`;
      console.log('🔍 [CMC] API URL:', url);
      console.log('🔍 [CMC] API Key:', this.apiKey ? '***KEY_SET***' : 'NO_KEY');
      
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      console.log('🔍 [CMC] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 [CMC] Error response body:', errorText);
        throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as CoinMarketCapResponse;
      
      if (data.status.error_code !== 0) {
        throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
      }

      console.log(`✅ [CMC] Successfully retrieved ${data.data.length} cryptocurrencies`);
      return data.data;
    } catch (error) {
      console.error('❌ [CMC] Failed to fetch top 100 cryptocurrencies:', error);
      throw error;
    }
  }

  async getSpecificCryptocurrency(symbol: string): Promise<CoinMarketCapCrypto | null> {
    try {
      console.log(`🔍 [CMC] Fetching data for ${symbol}...`);
      
      const response = await fetch(`${this.baseUrl}/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.status.error_code !== 0) {
        throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
      }

      const cryptoData = data.data[symbol];
      if (!cryptoData) {
        return null;
      }

      console.log(`✅ [CMC] Successfully retrieved data for ${symbol}`);
      return cryptoData;
    } catch (error) {
      console.error(`❌ [CMC] Failed to fetch data for ${symbol}:`, error);
      throw error;
    }
  }

  async getTopDailyGainers(): Promise<CoinMarketCapCrypto[]> {
    try {
      console.log('🔍 [CMC] Fetching top daily gainers from CoinMarketCap...');
      const url = `${this.baseUrl}/cryptocurrency/trending/gainers-losers?time_period=24h&convert=USD&limit=10`;
      
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // If gainers-losers endpoint fails, fall back to listings sorted by 24h change
        console.log('🔍 [CMC] Trending endpoint failed, using fallback method...');
        return this.getTopGainersFallback();
      }

      const data = await response.json() as any;
      
      if (data.status && data.status.error_code !== 0) {
        console.log('🔍 [CMC] Trending endpoint error, using fallback method...');
        return this.getTopGainersFallback();
      }

      console.log(`✅ [CMC] Successfully retrieved ${data.data?.gainers?.length || 0} daily gainers`);
      return data.data?.gainers || [];
    } catch (error) {
      console.error('❌ [CMC] Failed to fetch daily gainers, using fallback:', error);
      return this.getTopGainersFallback();
    }
  }

  private async getTopGainersFallback(): Promise<CoinMarketCapCrypto[]> {
    try {
      console.log('🔍 [CMC] Using fallback method for top gainers...');
      // Use regular top 100 by market cap, then find best gainers among large caps
      const url = `${this.baseUrl}/cryptocurrency/listings/latest?start=1&limit=100&convert=USD`;
      
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as CoinMarketCapResponse;
      
      if (data.status.error_code !== 0) {
        throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
      }

      console.log(`🔍 [CMC] Received ${data.data.length} cryptocurrencies from API`);
      
      // First, let's see the distribution of changes and market caps
      const changes = data.data.map(c => c.quote.USD.percent_change_24h).filter(c => c !== null && c !== undefined);
      const marketCaps = data.data.map(c => c.quote.USD.market_cap).filter(mc => mc !== null && mc !== undefined && mc > 0);
      const largeCapValues = marketCaps.filter(mc => mc > 100000000); // > $100M
      
      console.log('🔍 [CMC] 24h change distribution:', {
        positive: changes.filter(c => c > 0).length,
        negative: changes.filter(c => c < 0).length,
        total: changes.length
      });
      
      console.log('🔍 [CMC] Market cap distribution:', {
        totalWithMarketCap: marketCaps.length,
        over100M: largeCapValues.length,
        sampleMarketCaps: marketCaps.slice(0, 5).map(mc => `$${(mc/1e6).toFixed(1)}M`)
      });

      // First, filter by market cap > $100M, then sort by gains
      const MIN_MARKET_CAP = 100000000; // $100 million
      
      // Start with all cryptos that have market cap > $100M
      const largeCaps = data.data.filter(crypto => 
        crypto.quote.USD.percent_change_24h !== null && 
        crypto.quote.USD.percent_change_24h !== undefined &&
        crypto.quote.USD.market_cap !== null &&
        crypto.quote.USD.market_cap !== undefined &&
        crypto.quote.USD.market_cap > MIN_MARKET_CAP
      );
      
      console.log(`🔍 [CMC] Found ${largeCaps.length} cryptocurrencies with market cap > $100M`);
      
      // Filter for positive gains among large caps
      let validCryptos = largeCaps.filter(crypto => 
        crypto.quote.USD.percent_change_24h > 0 // Any positive gain
      );
      
      console.log(`🔍 [CMC] Found ${validCryptos.length} large-cap positive gainers`);
      
      // If we don't have enough results, use the best performing large caps (even if negative)
      if (validCryptos.length < 10) {
        console.log('🔍 [CMC] Not enough positive large-cap gainers, including all large caps...');
        validCryptos = largeCaps;
      }
      
      // Sort by 24h change descending and take top 10
      const gainers = validCryptos
        .sort((a, b) => b.quote.USD.percent_change_24h - a.quote.USD.percent_change_24h)
        .slice(0, 10);

      console.log(`✅ [CMC] Successfully retrieved ${gainers.length} daily gainers using fallback`);
      console.log('🔍 [CMC] Top gainers:', gainers.map(g => ({ 
        name: g.name, 
        symbol: g.symbol, 
        change: g.quote.USD.percent_change_24h,
        rank: g.cmc_rank,
        marketCap: `$${(g.quote.USD.market_cap/1e6).toFixed(1)}M`
      })));
      return gainers;
    } catch (error) {
      console.error('❌ [CMC] Fallback method also failed:', error);
      throw error;
    }
  }

  async getTopDexGainers(): Promise<CoinMarketCapCrypto[]> {
    try {
      console.log('🔍 [CMC DEX] Fetching top DEX token gainers from CoinMarketCap...');
      
      // First try the DEX listings endpoint if available
      let url = `${this.baseUrl.replace('/v1', '/v4')}/dex/listings/quotes?start=1&limit=200&convert=USD`;
      
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // If DEX endpoint fails, fall back to regular trending gainers with higher limit
        console.log('🔍 [CMC DEX] DEX endpoint failed, using trending gainers fallback...');
        return this.getDexGainersFallback();
      }

      const data = await response.json() as any;
      
      if (data.status && data.status.error_code !== 0) {
        console.log('🔍 [CMC DEX] DEX endpoint error, using fallback method...');
        return this.getDexGainersFallback();
      }

      // Process DEX data similar to regular crypto data
      const dexTokens = data.data || [];
      console.log(`🔍 [CMC DEX] Received ${dexTokens.length} DEX tokens from API`);
      
      // Filter for positive gainers and sort by 24h change
      const gainers = dexTokens
        .filter((token: any) => 
          token.quote?.USD?.percent_change_24h > 0 &&
          token.quote?.USD?.market_cap > 1000000 // Minimum $1M market cap
        )
        .sort((a: any, b: any) => b.quote.USD.percent_change_24h - a.quote.USD.percent_change_24h)
        .slice(0, 20);

      console.log(`✅ [CMC DEX] Successfully retrieved ${gainers.length} DEX gainers`);
      return gainers;
    } catch (error) {
      console.error('❌ [CMC DEX] Failed to fetch DEX gainers, using fallback:', error);
      return this.getDexGainersFallback();
    }
  }

  private async getDexGainersFallback(): Promise<CoinMarketCapCrypto[]> {
    try {
      console.log('🔍 [CMC DEX] Using fallback method for DEX gainers...');
      
      // Use a larger limit to get more diverse tokens and focus on smaller market caps
      const url = `${this.baseUrl}/cryptocurrency/listings/latest?start=1&limit=500&convert=USD`;
      
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as CoinMarketCapResponse;
      
      if (data.status.error_code !== 0) {
        throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
      }

      console.log(`🔍 [CMC DEX] Received ${data.data.length} tokens from fallback API`);
      
      // For DEX-like tokens, we want smaller caps that might be more like DEX tokens
      const MIN_MARKET_CAP = 1000000; // $1 million
      const MAX_MARKET_CAP = 500000000; // $500 million (to focus on smaller tokens)
      
      const dexLikeTokens = data.data.filter(crypto => 
        crypto.quote.USD.percent_change_24h !== null && 
        crypto.quote.USD.percent_change_24h !== undefined &&
        crypto.quote.USD.percent_change_24h > 0 && // Only positive gainers
        crypto.quote.USD.market_cap !== null &&
        crypto.quote.USD.market_cap !== undefined &&
        crypto.quote.USD.market_cap >= MIN_MARKET_CAP &&
        crypto.quote.USD.market_cap <= MAX_MARKET_CAP &&
        crypto.cmc_rank > 100 // Focus on tokens outside top 100
      );
      
      console.log(`🔍 [CMC DEX] Found ${dexLikeTokens.length} DEX-like token gainers`);
      
      // If we don't have enough, expand the criteria
      if (dexLikeTokens.length < 20) {
        console.log('🔍 [CMC DEX] Expanding criteria to get more tokens...');
        const expandedTokens = data.data.filter(crypto => 
          crypto.quote.USD.percent_change_24h !== null && 
          crypto.quote.USD.percent_change_24h !== undefined &&
          crypto.quote.USD.percent_change_24h > 0 &&
          crypto.quote.USD.market_cap !== null &&
          crypto.quote.USD.market_cap !== undefined &&
          crypto.quote.USD.market_cap >= MIN_MARKET_CAP &&
          crypto.cmc_rank > 50 // Expand to tokens outside top 50
        );
        
        const gainers = expandedTokens
          .sort((a, b) => b.quote.USD.percent_change_24h - a.quote.USD.percent_change_24h)
          .slice(0, 20);

        console.log(`✅ [CMC DEX] Retrieved ${gainers.length} DEX-style gainers (expanded criteria)`);
        console.log('🔍 [CMC DEX] Top DEX gainers:', gainers.slice(0, 5).map(g => ({ 
          name: g.name, 
          symbol: g.symbol, 
          change: g.quote.USD.percent_change_24h,
          rank: g.cmc_rank,
          marketCap: `$${(g.quote.USD.market_cap/1e6).toFixed(1)}M`
        })));
        return gainers;
      }
      
      // Sort by 24h change and take top 20
      const gainers = dexLikeTokens
        .sort((a, b) => b.quote.USD.percent_change_24h - a.quote.USD.percent_change_24h)
        .slice(0, 20);

      console.log(`✅ [CMC DEX] Successfully retrieved ${gainers.length} DEX-style gainers`);
      console.log('🔍 [CMC DEX] Top DEX gainers:', gainers.slice(0, 5).map(g => ({ 
        name: g.name, 
        symbol: g.symbol, 
        change: g.quote.USD.percent_change_24h,
        rank: g.cmc_rank,
        marketCap: `$${(g.quote.USD.market_cap/1e6).toFixed(1)}M`
      })));
      return gainers;
    } catch (error) {
      console.error('❌ [CMC DEX] Fallback method also failed:', error);
      throw error;
    }
  }
}

export const coinMarketCapService = new CoinMarketCapService();

// Additional method for fetching multiple specific cryptocurrencies
export async function getMajorCryptocurrencies(): Promise<CoinMarketCapCrypto[]> {
  try {
    console.log('🔍 [CMC] Fetching major cryptocurrencies for Majors page...');
    
    const majorSymbols = ['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'ADA', 'DOGE', 'AVAX', 'TRX', 'DOT', 'SUI', 'LINK', 'HYPE', 'TAO', 'HBAR', 'LTC', 'XMR', 'AERO', 'ENA', 'SEI', 'VIRTUAL', 'BONK', 'PENGU', 'XLM'];
    const symbolsParam = majorSymbols.join(',');
    
    const response = await fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbolsParam}&convert=USD`, {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY || '7d9a361e-596d-4914-87e2-f1124da24897',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('🔍 [CMC] Error response body:', errorText);
      throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    
    if (data.status.error_code !== 0) {
      throw new Error(`CoinMarketCap API error: ${data.status.error_message}`);
    }

    // Convert the response data object to an array
    const cryptoArray: CoinMarketCapCrypto[] = [];
    for (const symbol of majorSymbols) {
      if (data.data[symbol]) {
        cryptoArray.push(data.data[symbol]);
      }
    }

    console.log(`✅ [CMC] Successfully retrieved ${cryptoArray.length} major cryptocurrencies`);
    return cryptoArray;
  } catch (error) {
    console.error('❌ [CMC] Failed to fetch major cryptocurrencies:', error);
    throw error;
  }
}