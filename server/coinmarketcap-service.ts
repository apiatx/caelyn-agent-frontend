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
      const url = `${this.baseUrl}/cryptocurrency/listings/latest?start=1&limit=100&convert=USD&sort=percent_change_24h&sort_dir=desc`;
      
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
      
      // First, let's see the distribution of changes
      const changes = data.data.map(c => c.quote.USD.percent_change_24h).filter(c => c !== null && c !== undefined);
      console.log('🔍 [CMC] 24h change distribution:', {
        positive: changes.filter(c => c > 0).length,
        negative: changes.filter(c => c < 0).length,
        total: changes.length
      });

      // Get top 10 gainers with more lenient filtering
      let validCryptos = data.data.filter(crypto => 
        crypto.quote.USD.percent_change_24h !== null && 
        crypto.quote.USD.percent_change_24h !== undefined &&
        crypto.quote.USD.percent_change_24h > 5 && // At least 5% gain to be considered significant
        crypto.cmc_rank <= 2000 // Include more coins to get better selection
      );
      
      // If we don't have enough significant gainers, include smaller gains
      if (validCryptos.length < 10) {
        console.log('🔍 [CMC] Not enough significant gainers, expanding criteria...');
        validCryptos = data.data.filter(crypto => 
          crypto.quote.USD.percent_change_24h !== null && 
          crypto.quote.USD.percent_change_24h !== undefined &&
          crypto.quote.USD.percent_change_24h > 0 && // Any positive gain
          crypto.cmc_rank <= 1500 // Expand to top 1500 coins
        );
        console.log(`🔍 [CMC] Found ${validCryptos.length} positive gainers in top 1500`);
      }
      
      // If still not enough, further expand
      if (validCryptos.length < 10) {
        console.log('🔍 [CMC] Still not enough, using all 100 results...');
        validCryptos = data.data.filter(crypto => 
          crypto.quote.USD.percent_change_24h !== null && 
          crypto.quote.USD.percent_change_24h !== undefined
        );
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
        rank: g.cmc_rank
      })));
      return gainers;
    } catch (error) {
      console.error('❌ [CMC] Fallback method also failed:', error);
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