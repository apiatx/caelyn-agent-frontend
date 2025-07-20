import fetch from 'node-fetch';

interface CMCTokenInfo {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  logo: string;
  description: string;
  platform?: {
    id: number;
    name: string;
    symbol: string;
    slug: string;
    token_address: string;
  };
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
      last_updated: string;
    };
  };
}

interface TokenBalance {
  token: string;
  symbol: string;
  balance: string;
  decimals: number;
  value: number;
  logo?: string;
  contractAddress?: string;
  chain: string;
  price: number;
  change24h: number;
}

interface ChainBalance {
  chain: string;
  totalValue: number;
  tokens: TokenBalance[];
}

interface CMCPortfolioResponse {
  totalValue: number;
  chains: ChainBalance[];
  summary: { chain: string; value: number; tokenCount: number }[];
}

export class CMCPortfolioService {
  private cmcApiKey = process.env.COINMARKETCAP_API_KEY || '7d9a361e-596d-4914-87e2-f1124da24897';
  private etherscanApiKey = process.env.ETHERSCAN_API_KEY!;
  private basescanApiKey = process.env.BASESCAN_API_KEY!;

  // Get token metadata and prices from CoinMarketCap
  async getCMCTokenData(contractAddresses: string[]): Promise<Map<string, CMCTokenInfo>> {
    try {
      console.log(`🔍 [CMC Portfolio] Fetching token data for ${contractAddresses.length} addresses`);
      
      // Filter out native ETH and format addresses
      const validAddresses = contractAddresses
        .filter(addr => addr !== 'native' && addr !== '0x0000000000000000000000000000000000000000')
        .map(addr => addr.toLowerCase());

      if (validAddresses.length === 0) {
        console.log(`⚠️ [CMC Portfolio] No valid contract addresses to fetch`);
        return new Map();
      }

      const addressString = validAddresses.join(',');
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?address=${addressString}`;
      
      console.log(`🔍 [CMC Portfolio] CMC API URL: ${url}`);
      console.log(`🔍 [CMC Portfolio] API Key: ***${this.cmcApiKey.substring(0, 8)}***`);

      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.cmcApiKey,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip'
        }
      });

      if (!response.ok) {
        console.error(`❌ [CMC Portfolio] API Error: ${response.status} ${response.statusText}`);
        return new Map();
      }

      const data = await response.json() as any;
      console.log(`✅ [CMC Portfolio] Successfully fetched token metadata for ${Object.keys(data.data).length} tokens`);

      const tokenMap = new Map<string, CMCTokenInfo>();
      
      // CMC returns data keyed by contract address
      for (const [address, tokenData] of Object.entries(data.data)) {
        tokenMap.set(address.toLowerCase(), tokenData as CMCTokenInfo);
      }

      return tokenMap;
    } catch (error) {
      console.error(`❌ [CMC Portfolio] Error fetching CMC token data:`, error);
      return new Map();
    }
  }

  // Get token prices from CoinMarketCap
  async getCMCTokenPrices(contractAddresses: string[]): Promise<Map<string, number>> {
    try {
      const validAddresses = contractAddresses
        .filter(addr => addr !== 'native' && addr !== '0x0000000000000000000000000000000000000000')
        .map(addr => addr.toLowerCase());

      if (validAddresses.length === 0) {
        return new Map([['native', 3800]]); // ETH price fallback
      }

      const addressString = validAddresses.join(',');
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?address=${addressString}`;
      
      const response = await fetch(url, {
        headers: {
          'X-CMC_PRO_API_KEY': this.cmcApiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`❌ [CMC Portfolio] Price API Error: ${response.status}`);
        return new Map([['native', 3800]]);
      }

      const data = await response.json() as any;
      const priceMap = new Map<string, number>();
      
      // Add ETH price
      priceMap.set('native', 3800);
      
      for (const [address, tokenData] of Object.entries(data.data)) {
        const price = (tokenData as any).quote.USD.price;
        priceMap.set(address.toLowerCase(), price);
      }

      return priceMap;
    } catch (error) {
      console.error(`❌ [CMC Portfolio] Error fetching prices:`, error);
      return new Map([['native', 3800]]);
    }
  }

  // Get native ETH balance
  async getNativeBalance(walletAddress: string, chainName: string, apiUrl: string, apiKey: string): Promise<TokenBalance | null> {
    try {
      const response = await fetch(
        `${apiUrl}?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${apiKey}`
      );
      
      const data = await response.json() as any;
      
      if (data.status === '1') {
        const balanceInEth = parseFloat(data.result) / Math.pow(10, 18);
        
        if (balanceInEth > 0.001) {
          return {
            token: 'Ethereum',
            symbol: 'ETH',
            balance: balanceInEth.toFixed(6),
            decimals: 18,
            value: balanceInEth * 3800, // Will be updated with real price
            contractAddress: 'native',
            chain: chainName,
            price: 3800,
            change24h: 0
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`❌ [CMC Portfolio] Error fetching ${chainName} native balance:`, error);
      return null;
    }
  }

  // Get ERC-20 token balances
  async getTokenBalances(walletAddress: string, chainName: string, apiUrl: string, apiKey: string): Promise<TokenBalance[]> {
    try {
      const response = await fetch(
        `${apiUrl}?module=account&action=tokentx&address=${walletAddress}&page=1&offset=100&sort=desc&apikey=${apiKey}`
      );
      
      const data = await response.json() as any;
      const tokens: TokenBalance[] = [];
      const seenTokens = new Set<string>();
      
      if (data.status === '1' && Array.isArray(data.result)) {
        // Get unique tokens from transaction history
        for (const tx of data.result) {
          if (!seenTokens.has(tx.contractAddress)) {
            seenTokens.add(tx.contractAddress);
            
            // Get current balance for this token
            try {
              const balanceResponse = await fetch(
                `${apiUrl}?module=account&action=tokenbalance&contractaddress=${tx.contractAddress}&address=${walletAddress}&tag=latest&apikey=${apiKey}`
              );
              
              const balanceData = await balanceResponse.json() as any;
              
              if (balanceData.status === '1') {
                const balance = parseFloat(balanceData.result) / Math.pow(10, parseInt(tx.tokenDecimal) || 18);
                
                if (balance > 0) {
                  tokens.push({
                    token: tx.tokenName || 'Unknown Token',
                    symbol: tx.tokenSymbol || 'UNKNOWN',
                    balance: balance.toFixed(6),
                    decimals: parseInt(tx.tokenDecimal) || 18,
                    value: 0, // Will be updated with CMC price
                    contractAddress: tx.contractAddress,
                    chain: chainName,
                    price: 0,
                    change24h: 0
                  });
                }
              }
            } catch (error) {
              console.error(`❌ [CMC Portfolio] Error fetching balance for ${tx.contractAddress}:`, error);
            }
          }
        }
      }
      
      return tokens;
    } catch (error) {
      console.error(`❌ [CMC Portfolio] Error fetching ${chainName} token balances:`, error);
      return [];
    }
  }

  // Main method to get complete portfolio
  async getPortfolio(walletAddress: string): Promise<CMCPortfolioResponse> {
    try {
      console.log(`🔍 [CMC Portfolio] Fetching portfolio for wallet: ${walletAddress}`);
      
      const chains: ChainBalance[] = [];
      
      // Ethereum
      console.log(`🔗 [CMC Portfolio] Scanning Ethereum network...`);
      const ethNative = await this.getNativeBalance(walletAddress, 'Ethereum', 'https://api.etherscan.io/api', this.etherscanApiKey);
      const ethTokens = await this.getTokenBalances(walletAddress, 'Ethereum', 'https://api.etherscan.io/api', this.etherscanApiKey);
      
      const ethAllTokens = [...(ethNative ? [ethNative] : []), ...ethTokens];
      
      // Base
      console.log(`🔗 [CMC Portfolio] Scanning Base network...`);
      const baseNative = await this.getNativeBalance(walletAddress, 'Base', 'https://api.basescan.org/api', this.basescanApiKey);
      const baseTokens = await this.getTokenBalances(walletAddress, 'Base', 'https://api.basescan.org/api', this.basescanApiKey);
      
      const baseAllTokens = [...(baseNative ? [baseNative] : []), ...baseTokens];
      
      // Get all contract addresses for CMC lookup
      const allContractAddresses = [
        ...ethAllTokens.map(t => t.contractAddress!),
        ...baseAllTokens.map(t => t.contractAddress!)
      ].filter(addr => addr !== 'native');
      
      // Fetch CMC data
      const cmcTokenData = await this.getCMCTokenData(allContractAddresses);
      const cmcPrices = await this.getCMCTokenPrices(allContractAddresses);
      
      // Update token values with CMC data
      const updateTokensWithCMCData = (tokens: TokenBalance[]) => {
        return tokens.map(token => {
          if (token.contractAddress === 'native') {
            token.price = cmcPrices.get('native') || 3800;
            token.value = parseFloat(token.balance) * token.price;
            token.logo = 'https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png'; // ETH logo
          } else {
            const cmcData = cmcTokenData.get(token.contractAddress!.toLowerCase());
            const price = cmcPrices.get(token.contractAddress!.toLowerCase()) || 0;
            
            if (cmcData) {
              token.token = cmcData.name;
              token.symbol = cmcData.symbol;
              token.logo = cmcData.logo;
              token.change24h = cmcData.quote.USD.percent_change_24h;
            }
            
            token.price = price;
            token.value = parseFloat(token.balance) * price;
          }
          
          return token;
        }).filter(token => token.value > 0.01); // Only show tokens worth > $0.01
      };
      
      // Process chains
      if (ethAllTokens.length > 0) {
        const updatedEthTokens = updateTokensWithCMCData(ethAllTokens);
        chains.push({
          chain: 'Ethereum',
          totalValue: updatedEthTokens.reduce((sum, token) => sum + token.value, 0),
          tokens: updatedEthTokens
        });
      }
      
      if (baseAllTokens.length > 0) {
        const updatedBaseTokens = updateTokensWithCMCData(baseAllTokens);
        chains.push({
          chain: 'Base',
          totalValue: updatedBaseTokens.reduce((sum, token) => sum + token.value, 0),
          tokens: updatedBaseTokens
        });
      }
      
      const totalValue = chains.reduce((sum, chain) => sum + chain.totalValue, 0);
      const totalTokens = chains.reduce((sum, chain) => sum + chain.tokens.length, 0);
      
      console.log(`📊 [CMC Portfolio] Portfolio total: $${totalValue.toFixed(2)} across ${chains.length} chains (${totalTokens} tokens)`);
      
      return {
        totalValue,
        chains,
        summary: chains.map(chain => ({
          chain: chain.chain,
          value: chain.totalValue,
          tokenCount: chain.tokens.length
        }))
      };
      
    } catch (error) {
      console.error(`❌ [CMC Portfolio] Error fetching portfolio:`, error);
      return {
        totalValue: 0,
        chains: [],
        summary: []
      };
    }
  }
}

export const cmcPortfolioService = new CMCPortfolioService();