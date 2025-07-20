import fetch from 'node-fetch';

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

interface CoinbasePortfolioResponse {
  totalValue: number;
  chains: ChainBalance[];
  summary: { chain: string; value: number; tokenCount: number }[];
}

export class CoinbasePortfolioService {
  private etherscanApiKey = process.env.ETHERSCAN_API_KEY!;
  private basescanApiKey = process.env.BASESCAN_API_KEY!;

  // Get current ETH price from Coinbase Advanced API (public endpoint)
  async getETHPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.exchange.coinbase.com/products/ETH-USD/ticker');
      
      if (!response.ok) {
        console.log(`⚠️ [Coinbase Portfolio] ETH price API error: ${response.status}`);
        return 3800; // Fallback price
      }

      const data = await response.json() as any;
      const ethPrice = parseFloat(data.price);
      console.log(`💎 [Coinbase Portfolio] ETH price from Coinbase: $${ethPrice.toFixed(2)}`);
      return ethPrice;
    } catch (error) {
      console.error(`❌ [Coinbase Portfolio] Error fetching ETH price:`, error);
      return 3800; // Fallback price
    }
  }

  // Get token prices from Coinbase Advanced API
  async getCoinbaseTokenPrices(symbols: string[]): Promise<Map<string, { price: number; change24h: number }>> {
    try {
      if (symbols.length === 0) {
        return new Map();
      }

      console.log(`🔍 [Coinbase Portfolio] Fetching prices for symbols: ${symbols.join(', ')}`);
      const priceMap = new Map<string, { price: number; change24h: number }>();
      
      // Coinbase Advanced API supports major trading pairs
      const supportedPairs = ['ETH-USD', 'BTC-USD', 'USDC-USD', 'USDT-USD', 'UNI-USD', 'LINK-USD', 'AAVE-USD', 'MKR-USD', 'COMP-USD', 'CRV-USD'];
      
      for (const symbol of symbols) {
        const pair = `${symbol.toUpperCase()}-USD`;
        if (supportedPairs.includes(pair)) {
          try {
            const response = await fetch(`https://api.exchange.coinbase.com/products/${pair}/ticker`);
            
            if (response.ok) {
              const data = await response.json() as any;
              const price = parseFloat(data.price);
              const change24h = parseFloat(data.volume) > 0 ? 0 : 0; // Coinbase doesn't provide 24h change in ticker
              
              priceMap.set(symbol.toLowerCase(), { price, change24h });
              console.log(`💰 [Coinbase Portfolio] ${symbol}: $${price.toFixed(4)}`);
            }
          } catch (error) {
            console.log(`⚠️ [Coinbase Portfolio] Error fetching ${symbol} price:`, error);
          }
        }
      }

      console.log(`✅ [Coinbase Portfolio] Successfully fetched prices for ${priceMap.size} symbols`);
      return priceMap;
    } catch (error) {
      console.error(`❌ [Coinbase Portfolio] Error fetching symbol prices:`, error);
      return new Map();
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
        
        if (balanceInEth > 0.0001) { // Show balances > 0.0001 ETH
          return {
            token: 'Ethereum',
            symbol: 'ETH',
            balance: balanceInEth.toFixed(6),
            decimals: 18,
            value: 0, // Will be updated with real price
            contractAddress: 'native',
            chain: chainName,
            price: 0,
            change24h: 0
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`❌ [Coinbase Portfolio] Error fetching ${chainName} native balance:`, error);
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
          if (!seenTokens.has(tx.contractAddress) && tx.tokenSymbol && tx.tokenName) {
            seenTokens.add(tx.contractAddress);
            
            // Get current balance for this token
            try {
              const balanceResponse = await fetch(
                `${apiUrl}?module=account&action=tokenbalance&contractaddress=${tx.contractAddress}&address=${walletAddress}&tag=latest&apikey=${apiKey}`
              );
              
              const balanceData = await balanceResponse.json() as any;
              
              if (balanceData.status === '1' && balanceData.result !== '0') {
                const decimals = parseInt(tx.tokenDecimal) || 18;
                const balance = parseFloat(balanceData.result) / Math.pow(10, decimals);
                
                if (balance > 0) {
                  tokens.push({
                    token: tx.tokenName,
                    symbol: tx.tokenSymbol,
                    balance: balance.toFixed(6),
                    decimals: decimals,
                    value: 0, // Will be updated with Coinbase price
                    contractAddress: tx.contractAddress,
                    chain: chainName,
                    price: 0,
                    change24h: 0
                  });
                  
                  console.log(`🪙 [Coinbase Portfolio] Found ${tx.tokenSymbol}: ${balance.toFixed(6)} tokens`);
                }
              }
            } catch (error) {
              console.error(`❌ [Coinbase Portfolio] Error fetching balance for ${tx.contractAddress}:`, error);
            }
          }
        }
      }
      
      console.log(`✅ [Coinbase Portfolio] Found ${tokens.length} tokens on ${chainName}`);
      return tokens;
    } catch (error) {
      console.error(`❌ [Coinbase Portfolio] Error fetching ${chainName} token balances:`, error);
      return [];
    }
  }

  // Main method to get complete portfolio
  async getPortfolio(walletAddress: string): Promise<CoinbasePortfolioResponse> {
    try {
      console.log(`🔍 [Coinbase Portfolio] Fetching portfolio for wallet: ${walletAddress}`);
      
      const chains: ChainBalance[] = [];
      
      // Get ETH price from Coinbase
      const ethPrice = await this.getETHPrice();
      
      // Ethereum
      console.log(`🔗 [Coinbase Portfolio] Scanning Ethereum network...`);
      const ethNative = await this.getNativeBalance(walletAddress, 'Ethereum', 'https://api.etherscan.io/api', this.etherscanApiKey);
      const ethTokens = await this.getTokenBalances(walletAddress, 'Ethereum', 'https://api.etherscan.io/api', this.etherscanApiKey);
      
      const ethAllTokens = [...(ethNative ? [ethNative] : []), ...ethTokens];
      
      // Base
      console.log(`🔗 [Coinbase Portfolio] Scanning Base network...`);
      const baseNative = await this.getNativeBalance(walletAddress, 'Base', 'https://api.basescan.org/api', this.basescanApiKey);
      const baseTokens = await this.getTokenBalances(walletAddress, 'Base', 'https://api.basescan.org/api', this.basescanApiKey);
      
      const baseAllTokens = [...(baseNative ? [baseNative] : []), ...baseTokens];
      
      // Get symbols for major tokens supported by Coinbase
      const allTokens = [...ethAllTokens, ...baseAllTokens];
      const coinbaseSymbols = allTokens
        .map(t => t.symbol)
        .filter(symbol => ['ETH', 'BTC', 'USDC', 'USDT', 'UNI', 'LINK', 'AAVE', 'MKR', 'COMP', 'CRV'].includes(symbol))
        .filter((symbol, index, arr) => arr.indexOf(symbol) === index); // Remove duplicates
      
      // Fetch Coinbase price data
      const coinbasePriceData = await this.getCoinbaseTokenPrices(coinbaseSymbols);
      
      // Update token values with Coinbase data
      const updateTokensWithCoinbaseData = (tokens: TokenBalance[], chainName: string) => {
        return tokens.map(token => {
          if (token.contractAddress === 'native') {
            token.price = ethPrice;
            token.value = parseFloat(token.balance) * token.price;
            token.change24h = 0; // Could fetch from stats endpoint
          } else {
            const coinbaseData = coinbasePriceData.get(token.symbol.toLowerCase());
            
            if (coinbaseData) {
              token.price = coinbaseData.price;
              token.change24h = coinbaseData.change24h;
              token.value = parseFloat(token.balance) * token.price;
              console.log(`💰 [Coinbase Portfolio] ${token.symbol} on ${chainName}: ${token.balance} × $${token.price.toFixed(4)} = $${token.value.toFixed(2)}`);
            } else {
              // For tokens not supported by Coinbase, keep minimal data
              token.price = 0;
              token.value = 0;
              token.change24h = 0;
              console.log(`⚠️ [Coinbase Portfolio] ${token.symbol} not supported by Coinbase API`);
            }
          }
          
          return token;
        }).filter(token => token.value >= 0.01); // Only show tokens with value >= $0.01
      };
      
      // Process chains
      if (ethAllTokens.length > 0) {
        const updatedEthTokens = updateTokensWithCoinbaseData(ethAllTokens, 'Ethereum');
        if (updatedEthTokens.length > 0) {
          chains.push({
            chain: 'Ethereum',
            totalValue: updatedEthTokens.reduce((sum, token) => sum + token.value, 0),
            tokens: updatedEthTokens
          });
        }
      }
      
      if (baseAllTokens.length > 0) {
        const updatedBaseTokens = updateTokensWithCoinbaseData(baseAllTokens, 'Base');
        if (updatedBaseTokens.length > 0) {
          chains.push({
            chain: 'Base',
            totalValue: updatedBaseTokens.reduce((sum, token) => sum + token.value, 0),
            tokens: updatedBaseTokens
          });
        }
      }
      
      const totalValue = chains.reduce((sum, chain) => sum + chain.totalValue, 0);
      const totalTokens = chains.reduce((sum, chain) => sum + chain.tokens.length, 0);
      
      console.log(`📊 [Coinbase Portfolio] Portfolio total: $${totalValue.toFixed(2)} across ${chains.length} chains (${totalTokens} tokens)`);
      
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
      console.error(`❌ [Coinbase Portfolio] Error fetching portfolio:`, error);
      return {
        totalValue: 0,
        chains: [],
        summary: []
      };
    }
  }
}

export const coinbasePortfolioService = new CoinbasePortfolioService();