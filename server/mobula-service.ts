import fetch from 'node-fetch';

const MOBULA_API_KEY = '3371ca28-c28d-4b0f-908e-9529c27dfa4d';
const MOBULA_BASE_URL = 'https://api.mobula.io/api/1';

interface MobulaAsset {
  id: number;
  name: string;
  symbol: string;
  logo?: string;
  price?: number;
  price_change_24h?: number;
  market_cap?: number;
  volume_24h?: number;
  rank?: number;
}

interface MobulaPortfolioBalance {
  asset: string;
  balance: number;
  balance_usd: number;
  price: number;
}

interface MobulaWalletResponse {
  balances: MobulaPortfolioBalance[];
  total_balance_usd: number;
}

class MobulaService {
  private async makeRequest(endpoint: string, params: Record<string, any> = {}) {
    const url = new URL(`${MOBULA_BASE_URL}${endpoint}`);
    
    // Add API key to params
    params.apikey = MOBULA_API_KEY;
    
    // Add all params to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    console.log(`🔍 [MOBULA] Requesting: ${endpoint} with params:`, params);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CryptoHippo/1.0'
        }
      });

      if (!response.ok) {
        console.error(`❌ [MOBULA] API error: ${response.status} ${response.statusText}`);
        throw new Error(`Mobula API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ [MOBULA] Success: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`💥 [MOBULA] Request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get top 100 cryptocurrencies by market cap
  async getTop100Cryptos(): Promise<MobulaAsset[]> {
    try {
      const response = await this.makeRequest('/market/data', {
        limit: 100,
        order: 'market_cap_desc'
      });

      if (response?.data) {
        console.log(`📊 [MOBULA] Retrieved ${response.data.length} top cryptos`);
        return response.data.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol?.toUpperCase(),
          logo: asset.logo,
          price: asset.price,
          price_change_24h: asset.price_change_24h,
          market_cap: asset.market_cap,
          volume_24h: asset.volume_24h,
          rank: asset.rank
        }));
      }

      return [];
    } catch (error) {
      console.error('❌ [MOBULA] Failed to fetch top 100 cryptos:', error);
      return [];
    }
  }

  // Get wallet portfolio data
  async getWalletPortfolio(walletAddress: string): Promise<MobulaWalletResponse | null> {
    try {
      const response = await this.makeRequest('/wallet/portfolio', {
        wallet: walletAddress
      });

      if (response?.data) {
        console.log(`💰 [MOBULA] Portfolio data retrieved for wallet: ${walletAddress.slice(0, 8)}...`);
        return {
          balances: response.data.balances || [],
          total_balance_usd: response.data.total_balance_usd || 0
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ [MOBULA] Failed to fetch wallet portfolio for ${walletAddress}:`, error);
      return null;
    }
  }

  // Get asset price data
  async getAssetPrice(asset: string): Promise<number | null> {
    try {
      const response = await this.makeRequest('/market/data', {
        asset: asset
      });

      if (response?.data?.[0]?.price) {
        console.log(`💎 [MOBULA] Price for ${asset}: $${response.data[0].price}`);
        return response.data[0].price;
      }

      return null;
    } catch (error) {
      console.error(`❌ [MOBULA] Failed to fetch price for ${asset}:`, error);
      return null;
    }
  }

  // Get multiple asset prices
  async getMultipleAssetPrices(assets: string[]): Promise<Record<string, number>> {
    try {
      const response = await this.makeRequest('/market/multi-data', {
        assets: assets.join(',')
      });

      const prices: Record<string, number> = {};
      
      if (response?.data) {
        response.data.forEach((asset: any) => {
          if (asset.symbol && asset.price) {
            prices[asset.symbol.toUpperCase()] = asset.price;
          }
        });
        
        console.log(`💰 [MOBULA] Retrieved ${Object.keys(prices).length} asset prices`);
      }

      return prices;
    } catch (error) {
      console.error('❌ [MOBULA] Failed to fetch multiple asset prices:', error);
      return {};
    }
  }

  // Search for assets
  async searchAssets(query: string): Promise<MobulaAsset[]> {
    try {
      const response = await this.makeRequest('/search', {
        q: query
      });

      if (response?.data?.assets) {
        console.log(`🔍 [MOBULA] Search results for "${query}": ${response.data.assets.length} assets`);
        return response.data.assets.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          symbol: asset.symbol?.toUpperCase(),
          logo: asset.logo,
          price: asset.price,
          market_cap: asset.market_cap
        }));
      }

      return [];
    } catch (error) {
      console.error(`❌ [MOBULA] Failed to search assets for "${query}":`, error);
      return [];
    }
  }
}

export const mobulaService = new MobulaService();
export type { MobulaAsset, MobulaPortfolioBalance, MobulaWalletResponse };