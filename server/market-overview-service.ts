import fetch from 'node-fetch';

interface GlobalMetrics {
  active_cryptocurrencies: number;
  total_cryptocurrencies: number;
  active_market_pairs: number;
  active_exchanges: number;
  total_exchanges: number;
  eth_dominance: number;
  btc_dominance: number;
  quote: {
    USD: {
      total_market_cap: number;
      total_volume_24h: number;
      total_volume_24h_reported: number;
      altcoin_volume_24h: number;
      altcoin_market_cap: number;
      defi_volume_24h: number;
      defi_market_cap: number;
      defi_24h_percentage_change: number;
      stablecoin_volume_24h: number;
      stablecoin_market_cap: number;
      derivatives_volume_24h: number;
      total_market_cap_yesterday: number;
      total_volume_24h_yesterday: number;
      total_market_cap_yesterday_percentage_change: number;
      total_volume_24h_yesterday_percentage_change: number;
    };
  };
}

interface TrendingCrypto {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
      volume_24h: number;
    };
  };
}

export class MarketOverviewService {
  private apiKey: string;
  private baseUrl = 'https://pro-api.coinmarketcap.com/v1';

  constructor() {
    this.apiKey = process.env.COINMARKETCAP_API_KEY || '7d9a361e-596d-4914-87e2-f1124da24897';
  }

  async getGlobalMetrics(): Promise<GlobalMetrics> {
    console.log('🔍 [Market Overview] Fetching global metrics from CoinMarketCap...');
    
    const url = `${this.baseUrl}/global-metrics/quotes/latest`;
    console.log('🔍 [Market Overview] API URL:', url);
    console.log('🔍 [Market Overview] API Key:', this.apiKey ? '***KEY_SET***' : '***NOT_SET***');

    try {
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json'
        }
      });

      console.log('🔍 [Market Overview] Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      console.log('✅ [Market Overview] Successfully retrieved global metrics');
      
      return data.data;
    } catch (error) {
      console.error('❌ [Market Overview] Failed to fetch global metrics:', error);
      throw error;
    }
  }

  async getTrendingCryptos(): Promise<TrendingCrypto[]> {
    console.log('🔍 [Market Overview] Fetching trending cryptocurrencies from CoinMarketCap...');
    
    const url = `${this.baseUrl}/cryptocurrency/trending/latest`;
    console.log('🔍 [Market Overview] API URL:', url);

    try {
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json'
        }
      });

      console.log('🔍 [Market Overview] Trending response status:', response.status, response.statusText);

      if (!response.ok) {
        // If trending endpoint fails, fall back to top gainers
        console.log('⚠️ [Market Overview] Trending endpoint failed, falling back to top gainers');
        return this.getTopGainers();
      }

      const data: any = await response.json();
      console.log('✅ [Market Overview] Successfully retrieved trending cryptocurrencies');
      
      return data.data;
    } catch (error) {
      console.error('❌ [Market Overview] Failed to fetch trending cryptos:', error);
      // Fall back to top gainers
      return this.getTopGainers();
    }
  }

  private async getTopGainers(): Promise<TrendingCrypto[]> {
    console.log('🔍 [Market Overview] Fetching top gainers as fallback...');
    
    const url = `${this.baseUrl}/cryptocurrency/listings/latest?start=1&limit=20&sort=percent_change_24h&sort_dir=desc`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`CoinMarketCap API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      console.log('✅ [Market Overview] Successfully retrieved top gainers');
      
      return data.data;
    } catch (error) {
      console.error('❌ [Market Overview] Failed to fetch top gainers:', error);
      throw error;
    }
  }

  async getMarketOverview() {
    try {
      const [globalMetrics, trending] = await Promise.all([
        this.getGlobalMetrics(),
        this.getTrendingCryptos()
      ]);

      return {
        globalMetrics,
        trending: trending.slice(0, 10) // Limit to top 10
      };
    } catch (error) {
      console.error('❌ [Market Overview] Failed to fetch market overview:', error);
      // Return fallback data structure to prevent client errors
      return {
        globalMetrics: {
          active_cryptocurrencies: 0,
          total_cryptocurrencies: 0,
          active_market_pairs: 0,
          active_exchanges: 0,
          total_exchanges: 0,
          eth_dominance: 0,
          btc_dominance: 0,
          quote: {
            USD: {
              total_market_cap: 0,
              total_volume_24h: 0,
              total_volume_24h_reported: 0,
              altcoin_volume_24h: 0,
              altcoin_market_cap: 0,
              defi_volume_24h: 0,
              defi_market_cap: 0,
              defi_24h_percentage_change: 0,
              stablecoin_volume_24h: 0,
              stablecoin_market_cap: 0,
              derivatives_volume_24h: 0,
              total_market_cap_yesterday: 0,
              total_volume_24h_yesterday: 0,
              total_market_cap_yesterday_percentage_change: 0,
              total_volume_24h_yesterday_percentage_change: 0,
            }
          }
        },
        trending: []
      };
    }
  }
}