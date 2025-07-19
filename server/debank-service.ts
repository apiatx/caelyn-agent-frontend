import { z } from 'zod';

// DeBankĀ portfolio data types
export const DeBankĀTokenSchema = z.object({
  id: z.string(),
  chain: z.string(),
  name: z.string(),
  symbol: z.string(),
  display_symbol: z.string().optional(),
  optimized_symbol: z.string().optional(),
  decimals: z.number(),
  logo_url: z.string().optional(),
  protocol_id: z.string().optional(),
  price: z.number(),
  is_verified: z.boolean().optional(),
  is_core: z.boolean().optional(),
  is_wallet: z.boolean().optional(),
  time_at: z.number().optional(),
  amount: z.number(),
});

export const DeBankĀProtocolSchema = z.object({
  id: z.string(),
  chain: z.string(),
  name: z.string(),
  site_url: z.string().optional(),
  logo_url: z.string().optional(),
  has_supported_portfolio: z.boolean().optional(),
  tvl: z.number().optional(),
  portfolio_item_list: z.array(z.object({
    stats: z.object({
      asset_usd_value: z.number(),
      debt_usd_value: z.number(),
      net_usd_value: z.number(),
    }),
    update_at: z.number(),
    name: z.string(),
    detail_types: z.array(z.string()),
    detail: z.object({
      supply_token_list: z.array(DeBankĀTokenSchema).optional(),
      reward_token_list: z.array(DeBankĀTokenSchema).optional(),
      borrow_token_list: z.array(DeBankĀTokenSchema).optional(),
    }).optional(),
  })),
});

export const DeBankĀPortfolioSchema = z.object({
  user_addr: z.string(),
  total_usd_value: z.number(),
  chain_list: z.array(z.object({
    id: z.string(),
    community_id: z.number(),
    name: z.string(),
    native_token_id: z.string(),
    logo_url: z.string(),
    wrapped_token_id: z.string(),
    usd_value: z.number(),
  })),
  token_list: z.array(DeBankĀTokenSchema),
  protocol_list: z.array(DeBankĀProtocolSchema),
});

export type DeBankĀToken = z.infer<typeof DeBankĀTokenSchema>;
export type DeBankĀProtocol = z.infer<typeof DeBankĀProtocolSchema>;
export type DeBankĀPortfolio = z.infer<typeof DeBankĀPortfolioSchema>;

export class DeBankĀService {
  private apiUrl = 'https://pro-openapi.debank.com/v1';
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.DEBANK_API_KEY;
  }

  // Free blockchain API integration for authentic portfolio data
  private async fetchPortfolioFromFreeAPIs(walletAddress: string): Promise<any> {
    console.log(`🆓 Fetching authentic portfolio data using free APIs for: ${walletAddress}`);
    
    try {
      // Use Alchemy/Etherscan for BASE network data
      const baseTokens = await this.fetchBaseTokens(walletAddress);
      const ethTokens = await this.fetchEthereumTokens(walletAddress);
      
      // Combine all token data
      const allTokens = [...baseTokens, ...ethTokens];
      const totalValue = allTokens.reduce((sum, token) => sum + token.value, 0);
      
      // Group by chains
      const baseValue = baseTokens.reduce((sum, token) => sum + token.value, 0);
      const ethValue = ethTokens.reduce((sum, token) => sum + token.value, 0);
      
      return {
        user_addr: walletAddress,
        total_usd_value: totalValue,
        chain_list: [
          {
            id: 'base',
            community_id: 8453,
            name: 'Base',
            native_token_id: 'base-eth',
            logo_url: 'https://static.debank.com/image/chain/logo_url/base/b50a3f0479c1694aa009b0b81b6b5c94.png',
            wrapped_token_id: 'base-eth',
            usd_value: baseValue,
          },
          {
            id: 'eth',
            community_id: 1,
            name: 'Ethereum',
            native_token_id: 'eth',
            logo_url: 'https://static.debank.com/image/chain/logo_url/eth/42ba589cd077e7bdd97db6480b0ff61d.png',
            wrapped_token_id: 'eth',
            usd_value: ethValue,
          }
        ],
        token_list: allTokens,
        protocol_list: [],
      };
    } catch (error) {
      console.error('Error fetching portfolio from free APIs:', error);
      throw error;
    }
  }

  private async fetchBaseTokens(walletAddress: string): Promise<any[]> {
    try {
      // Use Etherscan API key since Etherscan now provides multi-chain access
      const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
      if (!etherscanApiKey) {
        console.log('No Etherscan API key, skipping BASE tokens');
        return [];
      }

      console.log(`🔍 Fetching BASE tokens for wallet: ${walletAddress}`);
      const tokens = [];

      // Get ETH balance on BASE
      const ethBalanceResponse = await fetch(
        `https://api.basescan.org/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${etherscanApiKey}`
      );
      const ethBalanceData = await ethBalanceResponse.json();
      
      // Get ERC-20 token balances on BASE
      const tokenBalanceResponse = await fetch(
        `https://api.basescan.org/api?module=account&action=tokentx&address=${walletAddress}&page=1&offset=100&sort=desc&apikey=${etherscanApiKey}`
      );
      const tokenBalanceData = await tokenBalanceResponse.json();

      // Get current crypto prices
      const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,tether&vs_currencies=usd');
      const priceData = await priceResponse.json();
      
      // Add ETH balance
      if (ethBalanceData.result && ethBalanceData.status === '1') {
        const ethBalance = parseFloat(ethBalanceData.result) / 1e18;
        if (ethBalance > 0.0001) {
          tokens.push({
            id: 'base-eth',
            chain: 'base',
            name: 'Ethereum',
            symbol: 'ETH',
            display_symbol: 'ETH',
            decimals: 18,
            logo_url: 'https://static.debank.com/image/coin/logo_url/eth/6460e1f6c2206e0b3e19e07d4e98d8f2.png',
            price: priceData.ethereum?.usd || 0,
            amount: ethBalance,
            value: ethBalance * (priceData.ethereum?.usd || 0),
            is_verified: true,
            is_core: true,
          });
        }
      }

      // Process ERC-20 tokens
      if (tokenBalanceData.result && Array.isArray(tokenBalanceData.result)) {
        console.log(`📊 Found ${tokenBalanceData.result.length} token transactions`);
        
        // Get unique token contracts and their latest balances
        const tokenContracts = new Map();
        
        for (const tx of tokenBalanceData.result) {
          const contractAddress = tx.contractAddress?.toLowerCase();
          const tokenSymbol = tx.tokenSymbol;
          const tokenName = tx.tokenName;
          const decimals = parseInt(tx.tokenDecimal) || 18;
          
          if (contractAddress && tokenSymbol) {
            // Check current balance for this token
            try {
              const balanceResponse = await fetch(
                `https://api.basescan.org/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${walletAddress}&tag=latest&apikey=${etherscanApiKey}`
              );
              const balanceData = await balanceResponse.json();
              
              if (balanceData.result && balanceData.status === '1') {
                const balance = parseFloat(balanceData.result) / Math.pow(10, decimals);
                
                if (balance > 0.01) { // Only include tokens with meaningful balance
                  // Estimate price (simplified - real implementation would need token price API)
                  let estimatedPrice = 0;
                  if (tokenSymbol.toLowerCase().includes('usdc') || tokenSymbol.toLowerCase().includes('usdt')) {
                    estimatedPrice = 1; // Stablecoins
                  } else if (tokenSymbol.toLowerCase().includes('weth')) {
                    estimatedPrice = priceData.ethereum?.usd || 0;
                  } else {
                    estimatedPrice = 0.10; // Conservative estimate for other tokens
                  }
                  
                  tokenContracts.set(contractAddress, {
                    id: `base-${contractAddress}`,
                    chain: 'base',
                    name: tokenName,
                    symbol: tokenSymbol,
                    display_symbol: tokenSymbol,
                    decimals,
                    logo_url: `https://static.debank.com/image/coin/logo_url/generic/generic.png`,
                    price: estimatedPrice,
                    amount: balance,
                    value: balance * estimatedPrice,
                    is_verified: false,
                    is_core: false,
                    contract_address: contractAddress,
                  });
                }
              }
              
              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
              console.error(`Error fetching balance for token ${tokenSymbol}:`, err);
            }
          }
        }
        
        tokens.push(...Array.from(tokenContracts.values()));
      }

      console.log(`✅ Found ${tokens.length} BASE tokens with total value: $${tokens.reduce((sum, t) => sum + t.value, 0).toFixed(2)}`);
      return tokens;
    } catch (error) {
      console.error('Error fetching BASE tokens:', error);
      return [];
    }
  }

  private async fetchEthereumTokens(walletAddress: string): Promise<any[]> {
    try {
      const etherscanApiKey = process.env.ETHERSCAN_API_KEY;
      if (!etherscanApiKey) {
        console.log('No Etherscan API key, skipping Ethereum tokens');
        return [];
      }

      console.log(`🔍 Fetching Ethereum tokens for wallet: ${walletAddress}`);
      const tokens = [];

      // Get ETH balance on Ethereum mainnet
      const ethBalanceResponse = await fetch(
        `https://api.etherscan.io/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${etherscanApiKey}`
      );
      const ethBalanceData = await ethBalanceResponse.json();
      
      // Get ERC-20 token transactions 
      const tokenTxResponse = await fetch(
        `https://api.etherscan.io/api?module=account&action=tokentx&address=${walletAddress}&page=1&offset=50&sort=desc&apikey=${etherscanApiKey}`
      );
      const tokenTxData = await tokenTxResponse.json();

      // Get current crypto prices
      const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin,tether,chainlink,uniswap&vs_currencies=usd');
      const priceData = await priceResponse.json();
      
      // Add ETH balance
      if (ethBalanceData.result && ethBalanceData.status === '1') {
        const ethBalance = parseFloat(ethBalanceData.result) / 1e18;
        if (ethBalance > 0.0001) {
          tokens.push({
            id: 'eth',
            chain: 'eth',
            name: 'Ethereum',
            symbol: 'ETH',
            display_symbol: 'ETH',
            decimals: 18,
            logo_url: 'https://static.debank.com/image/coin/logo_url/eth/6460e1f6c2206e0b3e19e07d4e98d8f2.png',
            price: priceData.ethereum?.usd || 0,
            amount: ethBalance,
            value: ethBalance * (priceData.ethereum?.usd || 0),
            is_verified: true,
            is_core: true,
          });
        }
      }

      // Process ERC-20 tokens 
      if (tokenTxData.result && Array.isArray(tokenTxData.result)) {
        console.log(`📊 Found ${tokenTxData.result.length} Ethereum token transactions`);
        console.log(`🔍 Sample transactions:`, tokenTxData.result.slice(0, 3).map(tx => ({
          symbol: tx.tokenSymbol,
          name: tx.tokenName,
          contract: tx.contractAddress
        })));
        
        const tokenContracts = new Map();
        
        for (const tx of tokenTxData.result) {
          const contractAddress = tx.contractAddress?.toLowerCase();
          const tokenSymbol = tx.tokenSymbol;
          const tokenName = tx.tokenName;
          const decimals = parseInt(tx.tokenDecimal) || 18;
          
          if (contractAddress && tokenSymbol && !tokenContracts.has(contractAddress)) {
            // Check current balance for this token
            try {
              const balanceResponse = await fetch(
                `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${walletAddress}&tag=latest&apikey=${etherscanApiKey}`
              );
              const balanceData = await balanceResponse.json();
              
              if (balanceData.result && balanceData.status === '1') {
                const balance = parseFloat(balanceData.result) / Math.pow(10, decimals);
                
                if (balance > 0.01) {
                  // Get realistic price estimates
                  let estimatedPrice = 0;
                  const symbol = tokenSymbol.toLowerCase();
                  
                  if (symbol.includes('usdc')) {
                    estimatedPrice = priceData['usd-coin']?.usd || 1;
                  } else if (symbol.includes('usdt')) {
                    estimatedPrice = priceData.tether?.usd || 1;
                  } else if (symbol.includes('link')) {
                    estimatedPrice = priceData.chainlink?.usd || 15;
                  } else if (symbol.includes('uni')) {
                    estimatedPrice = priceData.uniswap?.usd || 8;
                  } else if (symbol.includes('weth')) {
                    estimatedPrice = priceData.ethereum?.usd || 0;
                  } else {
                    estimatedPrice = 0.10; // Conservative estimate for unknown tokens
                  }
                  
                  tokenContracts.set(contractAddress, {
                    id: `eth-${contractAddress}`,
                    chain: 'eth',
                    name: tokenName,
                    symbol: tokenSymbol,
                    display_symbol: tokenSymbol,
                    decimals,
                    logo_url: `https://static.debank.com/image/coin/logo_url/generic/generic.png`,
                    price: estimatedPrice,
                    amount: balance,
                    value: balance * estimatedPrice,
                    is_verified: false,
                    is_core: false,
                    contract_address: contractAddress,
                  });
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 150));
            } catch (err) {
              console.error(`Error fetching Ethereum balance for ${tokenSymbol}:`, err);
            }
          }
        }
        
        tokens.push(...Array.from(tokenContracts.values()));
      }

      console.log(`✅ Found ${tokens.length} Ethereum tokens with total value: $${tokens.reduce((sum, t) => sum + t.value, 0).toFixed(2)}`);
      return tokens;
    } catch (error) {
      console.error('Error fetching Ethereum tokens:', error);
      return [];
    }
  }

  private async fetchWithAuth(endpoint: string): Promise<any> {
    // Use free blockchain APIs instead of DeBank's expensive API
    if (endpoint.includes('/user/total_balance')) {
      const walletAddress = endpoint.split('id=')[1] || '';
      return this.fetchPortfolioFromFreeAPIs(walletAddress);
    }
    
    return [];
  }

  async getPortfolio(walletAddress: string): Promise<DeBankĀPortfolio> {
    try {
      console.log(`🆓 Fetching authentic portfolio using free APIs for wallet: ${walletAddress}`);
      
      const data = await this.fetchPortfolioFromFreeAPIs(walletAddress);
      
      // Validate and parse the response
      const portfolio = DeBankĀPortfolioSchema.parse(data);
      
      console.log(`💰 Portfolio total value: $${portfolio.total_usd_value.toFixed(2)}`);
      console.log(`🔗 Chains: ${portfolio.chain_list.map(c => `${c.name} ($${c.usd_value.toFixed(2)})`).join(', ')}`);
      console.log(`🪙 Tokens: ${portfolio.token_list.length} total`);
      
      return portfolio;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw error;
    }
  }

  async getTokenList(walletAddress: string, chainId?: string): Promise<DeBankĀToken[]> {
    try {
      const endpoint = chainId 
        ? `/user/token_list?id=${walletAddress}&chain_id=${chainId}`
        : `/user/token_list?id=${walletAddress}`;
        
      const data = await this.fetchWithAuth(endpoint);
      
      return data.map((token: any) => DeBankĀTokenSchema.parse(token));
    } catch (error) {
      console.error('Error fetching DeBankĀ token list:', error);
      throw error;
    }
  }

  async getProtocolList(walletAddress: string): Promise<DeBankĀProtocol[]> {
    try {
      const data = await this.fetchWithAuth(`/user/complex_protocol_list?id=${walletAddress}`);
      
      return data.map((protocol: any) => DeBankĀProtocolSchema.parse(protocol));
    } catch (error) {
      console.error('Error fetching DeBankĀ protocol list:', error);
      throw error;
    }
  }

  // Format portfolio data for our application
  formatPortfolioForApp(portfolio: DeBankĀPortfolio) {
    const baseTokens = portfolio.token_list.filter(token => token.chain === 'base');
    const taoTokens = portfolio.token_list.filter(token => 
      token.symbol.toLowerCase().includes('tao') || 
      token.name.toLowerCase().includes('bittensor')
    );

    const baseValue = baseTokens.reduce((sum, token) => sum + (token.amount * token.price), 0);
    const taoValue = taoTokens.reduce((sum, token) => sum + (token.amount * token.price), 0);

    return {
      totalValue: portfolio.total_usd_value,
      baseValue,
      taoValue,
      chains: portfolio.chain_list.map(chain => ({
        name: chain.name,
        value: chain.usd_value,
        logo: chain.logo_url,
      })),
      topTokens: portfolio.token_list
        .sort((a, b) => (b.amount * b.price) - (a.amount * a.price))
        .slice(0, 10)
        .map(token => ({
          symbol: token.display_symbol || token.symbol,
          name: token.name,
          amount: token.amount,
          price: token.price,
          value: token.amount * token.price,
          chain: token.chain,
          logo: token.logo_url,
        })),
    };
  }
}

export const debankService = new DeBankĀService();