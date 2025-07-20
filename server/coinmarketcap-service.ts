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
    this.apiKey = '7d9a361e-596d-4914-87e2-f1124da24897';
  }

  async getTop100Cryptocurrencies(): Promise<CoinMarketCapCrypto[]> {
    try {
      console.log('🔍 [CMC] Fetching top 100 cryptocurrencies from CoinMarketCap...');
      
      const response = await fetch(`${this.baseUrl}/cryptocurrency/listings/latest?start=1&limit=100&convert=USD&aux=percent_change_1h,percent_change_24h,percent_change_7d,percent_change_30d,percent_change_60d,percent_change_90d`, {
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
}

export const coinMarketCapService = new CoinMarketCapService();