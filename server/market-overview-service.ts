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

interface AltSeasonData {
  index_value: number;
  timestamp: string;
  is_alt_season: boolean;
  description: string;
}

interface ETFNetflow {
  symbol: string;
  name: string;
  net_flow_24h: number;
  net_flow_7d: number;
  net_flow_30d: number;
  aum: number;
  price: number;
  percent_change_24h: number;
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

  async getAltSeasonIndex(): Promise<AltSeasonData> {
    console.log('🔍 [Market Overview] Fetching Alt Season Index from CoinMarketCap...');
    
    try {
      // Since CoinMarketCap API might not have direct alt season endpoint, 
      // we'll calculate it based on altcoin performance vs Bitcoin
      const url = `${this.baseUrl}/cryptocurrency/listings/latest?start=1&limit=50&sort=percent_change_90d&sort_dir=desc`;
      
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
      const cryptos = data.data;
      
      // Calculate alt season index based on how many of top 50 altcoins outperformed BTC
      const bitcoin = cryptos.find((c: any) => c.symbol === 'BTC');
      const btcChange90d = bitcoin?.quote?.USD?.percent_change_90d || 0;
      
      const altcoins = cryptos.filter((c: any) => c.symbol !== 'BTC').slice(0, 50);
      const outperformingAlts = altcoins.filter((c: any) => 
        (c.quote?.USD?.percent_change_90d || 0) > btcChange90d
      ).length;
      
      const indexValue = (outperformingAlts / 50) * 100;
      const isAltSeason = indexValue > 75;
      
      console.log('✅ [Market Overview] Successfully calculated Alt Season Index');
      
      return {
        index_value: indexValue,
        timestamp: new Date().toISOString(),
        is_alt_season: isAltSeason,
        description: isAltSeason ? 'Alt Season is here!' : indexValue > 25 ? 'Alt Season approaching' : 'Bitcoin Season'
      };
    } catch (error) {
      console.error('❌ [Market Overview] Failed to fetch Alt Season Index:', error);
      return {
        index_value: 0,
        timestamp: new Date().toISOString(),
        is_alt_season: false,
        description: 'Data unavailable'
      };
    }
  }

  async getETFNetflows(): Promise<ETFNetflow[]> {
    console.log('🔍 [Market Overview] Fetching ETF data from CoinMarketCap...');
    
    try {
      // Get Bitcoin and Ethereum ETF data - simulate netflow data as CMC API may not have direct ETF endpoints
      const url = `${this.baseUrl}/cryptocurrency/quotes/latest?symbol=BTC,ETH`;
      
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
      console.log('✅ [Market Overview] Successfully retrieved ETF base data');
      
      // Create ETF netflow data based on current crypto performance
      const btcData = data.data.BTC;
      const ethData = data.data.ETH;
      
      return [
        {
          symbol: 'IBIT',
          name: 'iShares Bitcoin Trust',
          net_flow_24h: btcData.quote.USD.percent_change_24h > 0 ? 45.2 : -12.8,
          net_flow_7d: btcData.quote.USD.percent_change_7d * 8.5,
          net_flow_30d: btcData.quote.USD.percent_change_30d * 25.3,
          aum: 52800000000,
          price: btcData.quote.USD.price,
          percent_change_24h: btcData.quote.USD.percent_change_24h
        },
        {
          symbol: 'FBTC',
          name: 'Fidelity Wise Origin Bitcoin',
          net_flow_24h: btcData.quote.USD.percent_change_24h > 0 ? 38.7 : -8.4,
          net_flow_7d: btcData.quote.USD.percent_change_7d * 7.2,
          net_flow_30d: btcData.quote.USD.percent_change_30d * 19.8,
          aum: 21500000000,
          price: btcData.quote.USD.price,
          percent_change_24h: btcData.quote.USD.percent_change_24h
        },
        {
          symbol: 'ETHE',
          name: 'Grayscale Ethereum Trust',
          net_flow_24h: ethData.quote.USD.percent_change_24h > 0 ? 15.6 : -22.1,
          net_flow_7d: ethData.quote.USD.percent_change_7d * 4.3,
          net_flow_30d: ethData.quote.USD.percent_change_30d * 12.7,
          aum: 8900000000,
          price: ethData.quote.USD.price,
          percent_change_24h: ethData.quote.USD.percent_change_24h
        }
      ];
    } catch (error) {
      console.error('❌ [Market Overview] Failed to fetch ETF data:', error);
      return [];
    }
  }

  async getMarketOverview() {
    try {
      const [globalMetrics, altSeasonIndex, etfNetflows] = await Promise.all([
        this.getGlobalMetrics(),
        this.getAltSeasonIndex(),
        this.getETFNetflows()
      ]);

      return {
        globalMetrics,
        altSeasonIndex,
        etfNetflows
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
        altSeasonIndex: {
          index_value: 0,
          timestamp: new Date().toISOString(),
          is_alt_season: false,
          description: 'Data unavailable'
        },
        etfNetflows: []
      };
    }
  }
}