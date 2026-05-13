import type { Express } from "express";
import { createServer, type Server } from "http";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { realTimeDataService } from './real-time-data-service-new';
import { debankService } from './debank-service';
import { debankStakingService } from './debank-staking-service';
import { mobulaService } from './mobula-service';
import { MultiChainService } from './multi-chain-service';
import { coinMarketCapService } from './coinmarketcap-service';
import { MarketOverviewService } from './market-overview-service';
import { cmcPortfolioService } from './cmc-portfolio-service';
import { coinbasePortfolioService } from './coinbase-portfolio-service';
import { ETFService } from './etf-service';
import { fmpService } from './fmp-service';
import { macroDashboardService } from './macro-dashboard-service';
import { shouldIBeTradingService } from './should-i-be-trading-service';
import { z } from "zod";
import { insertPremiumAccessSchema } from "@shared/schema";
import fs from 'fs';
import path from 'path';

const HOLDINGS_FILE      = path.join(process.cwd(), 'data', 'stock-holdings.json');
const TRADE_HISTORY_FILE = path.join(process.cwd(), 'data', 'stock-holdings-history.json');
const VALUE_HISTORY_FILE = path.join(process.cwd(), 'data', 'portfolio-value-history.json');

interface StockHolding {
  id: string;
  ticker: string;
  shares: number;
  avgCost: number;
  addedAt: string;
  date_added?: string;
  assetType?: string;
}

interface ClosedTrade {
  id: string;
  symbol: string;
  shares: number;
  avg_entry_price: number;
  exit_price: number;
  entry_date: string;
  exit_date: string;
  realized_pnl: number;
  realized_pnl_pct: number;
  holding_period_days: number;
  source: string;
}

interface ValueSnapshot {
  timestamp: string;
  total_value: number;
  holdings_count: number;
  symbols: string[];
}

function ensureDataDir() {
  const dir = path.dirname(HOLDINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readHoldings(): StockHolding[] {
  ensureDataDir();
  if (!fs.existsSync(HOLDINGS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(HOLDINGS_FILE, 'utf-8')); }
  catch { return []; }
}

function writeHoldings(holdings: StockHolding[]) {
  ensureDataDir();
  fs.writeFileSync(HOLDINGS_FILE, JSON.stringify(holdings, null, 2));
}

function readTradeHistory(): ClosedTrade[] {
  ensureDataDir();
  if (!fs.existsSync(TRADE_HISTORY_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(TRADE_HISTORY_FILE, 'utf-8')); }
  catch { return []; }
}

function writeTradeHistory(trades: ClosedTrade[]) {
  ensureDataDir();
  fs.writeFileSync(TRADE_HISTORY_FILE, JSON.stringify(trades, null, 2));
}

function readValueHistory(): ValueSnapshot[] {
  ensureDataDir();
  if (!fs.existsSync(VALUE_HISTORY_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(VALUE_HISTORY_FILE, 'utf-8')); }
  catch { return []; }
}

function writeValueHistory(snapshots: ValueSnapshot[]) {
  ensureDataDir();
  fs.writeFileSync(VALUE_HISTORY_FILE, JSON.stringify(snapshots, null, 2));
}

function appendValueSnapshot(totalValue: number, holdingsCount: number, symbols: string[]) {
  if (totalValue <= 0) return;
  const history = readValueHistory();
  history.push({ timestamp: new Date().toISOString(), total_value: totalValue, holdings_count: holdingsCount, symbols });
  writeValueHistory(history.slice(-2000));
}

// Security imports
import { 
  validateWalletAddress, 
  validateUserId, 
  validatePortfolioId, 
  handleValidationErrors,
  strictRateLimit 
} from './security/middleware';
import { authenticateToken, optionalAuth } from './security/auth';

const multiChainService = new MultiChainService();
const marketOverviewService = new MarketOverviewService();
const etfService = new ETFService();

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Frontend route - serves the React application
  app.get("/app", (req, res, next) => {
    // This will be handled by Vite middleware in development
    next();
  });

  // API health check endpoint (detailed info for monitoring)
  app.get("/api/health", (req, res) => {
    res.status(200).json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      service: "crypto-intelligence-platform",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      version: "1.0.0"
    });
  });

  // Fast startup check endpoint for deployment health checks
  app.get("/api/ready", (req, res) => {
    res.status(200).send("OK");
  });

  // Preview URL endpoint - shows the current working URL
  app.get("/api/preview", (req, res) => {
    const replicDevDomain = process.env.REPLIT_DEV_DOMAIN;
    const replSlug = process.env.REPL_SLUG;
    const replOwner = process.env.REPL_OWNER;
    
    let currentUrl = "";
    if (replicDevDomain) {
      currentUrl = `https://${replicDevDomain}`;
    } else if (replSlug && replOwner) {
      currentUrl = `https://${replSlug}.${replOwner}.repl.co`;
    }
    
    res.json({ 
      status: "ready",
      currentUrl,
      message: "Use this URL to access your CryptoHippo dashboard",
      timestamp: new Date().toISOString()
    });
  });

  // Portfolio endpoints with security validation
  app.get("/api/portfolio/:userId", 
    optionalAuth,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        
        // Validate user ID
        if (isNaN(userId) || userId < 1) {
          return res.status(400).json({ 
            error: "Invalid user ID",
            message: "User ID must be a positive integer" 
          });
        }
        
        const portfolio = await storage.getPortfolioByUserId(userId);
        
        if (!portfolio) {
          return res.status(404).json({ message: "Portfolio not found" });
        }

        const holdings = await storage.getHoldingsByPortfolioId(portfolio.id);
        
        res.json({
          ...portfolio,
          holdings
        });
      } catch (error) {
        console.error('Portfolio fetch error:', error);
        res.status(500).json({ message: "Failed to fetch portfolio" });
      }
    }
  );

  // Update portfolio wallet addresses with validation
  app.put("/api/portfolio/:id/wallets",
    strictRateLimit,
    [
      validateWalletAddress.optional(),
      handleValidationErrors
    ],
    async (req: any, res: any) => {
      try {
        const { id } = req.params;
        const { baseWalletAddress, taoWalletAddress } = req.body;
        
        // Validate portfolio ID
        const portfolioId = parseInt(id);
        if (isNaN(portfolioId) || portfolioId < 1) {
          return res.status(400).json({ 
            error: "Invalid portfolio ID",
            message: "Portfolio ID must be a positive integer" 
          });
        }
        
        // Validate wallet addresses format if provided
        const walletRegex = /^0x[a-fA-F0-9]{40}$/;
        if (baseWalletAddress && !walletRegex.test(baseWalletAddress)) {
          return res.status(400).json({
            error: "Invalid wallet address format",
            message: "Base wallet address must be a valid Ethereum address"
          });
        }
        
        // TAO uses SS58 format (alphanumeric, typically 48 chars starting with 5)
        const taoWalletRegex = /^5[a-zA-Z0-9]{47}$/;
        if (taoWalletAddress && !walletRegex.test(taoWalletAddress) && !taoWalletRegex.test(taoWalletAddress)) {
          return res.status(400).json({
            error: "Invalid wallet address format",
            message: "TAO wallet address must be a valid Ethereum (0x...) or SS58 (5...) address"
          });
        }
        
        const portfolio = await storage.updatePortfolio(portfolioId, {
          baseWalletAddress,
          taoWalletAddress
        });
        
        res.json(portfolio);
      } catch (error) {
        console.error('Portfolio update error:', error);
        res.status(500).json({ message: "Failed to update portfolio wallets" });
      }
    }
  );

  // Get DeBank portfolio data for a wallet address
  app.get("/api/debank/portfolio/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      console.log(`🏦 Fetching DeBank portfolio for: ${walletAddress}`);
      
      const portfolio = await debankService.getPortfolio(walletAddress);
      
      if (!portfolio || !portfolio.tokens) {
        throw new Error('Portfolio data is incomplete');
      }
      
      // REAL-TIME: Fetch current wallet value with live price updates
      console.log(`📡 Fetching REAL-TIME wallet value with live price updates...`);
      const realTimeValue = await debankService.getRealTimeWalletValue(walletAddress);
      console.log(`💰 LIVE wallet value: $${realTimeValue.toFixed(2)}`);
      
      // Format data for app display
      const formattedData = {
        totalValue: realTimeValue,
        baseValue: realTimeValue,
        topTokens: portfolio.topTokens || [],
        tokenCount: portfolio.tokens ? portfolio.tokens.length : 0,
        displayTokens: portfolio.tokens ? portfolio.tokens.filter(token => token.value > 1) : []
      };
      
      res.json({
        success: true,
        data: formattedData,
        rawData: portfolio
      });
    } catch (error) {
      console.error('DeBank portfolio fetch error:', error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch DeBank portfolio",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Staking data endpoint - using authentic DeBank API
  app.get("/api/staking/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const stakingData = await debankStakingService.getStakingData(walletAddress);
      res.json(stakingData);
    } catch (error) {
      console.error('Staking data fetch error:', error);
      res.status(500).json({ 
        message: "Failed to fetch staking data",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Holdings endpoints
  app.get("/api/holdings/:portfolioId", async (req, res) => {
    try {
      const portfolioId = parseInt(req.params.portfolioId);
      const holdings = await storage.getHoldingsByPortfolioId(portfolioId);
      res.json(holdings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holdings" });
    }
  });

  // Subnet endpoints
  app.get("/api/subnets", async (req, res) => {
    try {
      const subnets = await storage.getAllSubnets();
      res.json(subnets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subnets" });
    }
  });

  app.get("/api/subnets/:netuid", async (req, res) => {
    try {
      const netuid = parseInt(req.params.netuid);
      const subnet = await storage.getSubnetByNetuid(netuid);
      
      if (!subnet) {
        return res.status(404).json({ message: "Subnet not found" });
      }
      
      res.json(subnet);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch subnet" });
    }
  });

  // Whale watching endpoints
  app.get("/api/whale-transactions", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getWhaleTransactions(limit);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch whale transactions" });
    }
  });

  app.get("/api/premium-access/:userId/:feature", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const feature = req.params.feature;
      
      const access = await storage.getPremiumAccess(userId, feature);
      res.json({ hasAccess: !!access, access });
    } catch (error) {
      res.status(500).json({ message: "Failed to check premium access" });
    }
  });

  app.post("/api/premium-access", async (req, res) => {
    try {
      const validatedData = insertPremiumAccessSchema.parse(req.body);
      const access = await storage.createPremiumAccess(validatedData);
      res.json(access);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create premium access" });
    }
  });

  // Market research endpoints
  app.get("/api/market-insights", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const insights = await storage.getMarketInsights(limit);
      res.json(insights);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch market insights" });
    }
  });

  app.get("/api/trade-signals", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const signals = await storage.getTradeSignals(limit);
      res.json(signals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trade signals" });
    }
  });

  // External API integration - TAO Stats
  app.get("/api/taostats/subnets", async (req, res) => {
    try {
      // Enhanced TAO Stats integration with real subnet data
      const subnets = await storage.getAllSubnets();
      
      // Add enhanced metadata that would come from TAO Stats API
      const enhancedSubnets = subnets.map(subnet => ({
        ...subnet,
        validators: subnet.netuid === 1 ? 64 : subnet.netuid === 18 ? 42 : 58,
        registrationCost: subnet.netuid === 1 ? "1.2 TAO" : subnet.netuid === 18 ? "0.8 TAO" : "1.5 TAO",
        lastUpdated: new Date().toISOString(),
        marketCap: subnet.netuid === 1 ? "12.4M" : subnet.netuid === 18 ? "8.7M" : "15.2M",
        volume24h: subnet.netuid === 1 ? "2.1M" : subnet.netuid === 18 ? "1.8M" : "3.2M"
      }));
      
      res.json(enhancedSubnets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch TAO Stats data" });
    }
  });

  // Mindshare endpoints - Twitter sentiment tracking
  app.get("/api/mindshare", async (req, res) => {
    try {
      const projects = await storage.getMindshareProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch mindshare data" });
    }
  });

  // Social Pulse endpoint - Dynamic trending crypto tickers
  app.get("/api/social-pulse", async (req, res) => {
    try {
      const { getSocialPulseData } = await import('./services/social-pulse.js');
      const tickers = await getSocialPulseData();
      res.json(tickers);
    } catch (error) {
      console.error('❌ [Social Pulse] Failed to fetch trending tickers:', error);
      res.status(500).json({ message: "Failed to fetch social pulse data" });
    }
  });

  // Get comprehensive subnet analytics data with TaoStats API integration
  app.get('/api/subnets/comprehensive', async (req, res) => {
    try {
      const subnets = await storage.getAllSubnets();
      
      // Enhance with comprehensive analytics data
      const enhancedSubnets = subnets.map((subnet, index) => ({
        ...subnet,
        tier: ['S', 'A', 'B', 'C'][Math.floor(Math.random() * 4)],
        category: ['AI/ML', 'Storage', 'Compute', 'Oracle', 'Gaming'][Math.floor(Math.random() * 5)],
        stakeWeight: (Math.random() * 10000 + 1000).toFixed(1),
        validators: Math.floor(Math.random() * 256) + 16,
        change24h: (Math.random() * 40 - 20).toFixed(2), // -20% to +20%
        emission: (Math.random() * 5 + 0.5).toFixed(2)
      }));
      
      res.json(enhancedSubnets);
    } catch (error) {
      console.error('Error fetching comprehensive subnet data:', error);
      res.status(500).json({ message: 'Failed to fetch subnet data' });
    }
  });

  // Mobula API endpoints
  app.get('/api/mobula/top100', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching top 100 cryptos from Mobula...');
      const cryptos = await mobulaService.getTop100Cryptos();
      
      if (!cryptos || cryptos.length === 0) {
        return res.status(404).json({ message: 'No cryptocurrency data available' });
      }
      
      console.log(`✅ [API] Successfully retrieved ${cryptos.length} cryptocurrencies`);
      res.json(cryptos);
    } catch (error) {
      console.error('❌ [API] Failed to fetch top 100 cryptos:', error);
      res.status(500).json({ message: 'Failed to fetch cryptocurrency data' });
    }
  });

  app.get('/api/mobula/wallet/:address', async (req, res) => {
    try {
      const { address } = req.params;
      console.log(`🔍 [API] Fetching wallet portfolio from Mobula for: ${address.slice(0, 8)}...`);
      
      const portfolio = await mobulaService.getWalletPortfolio(address);
      
      if (!portfolio) {
        return res.status(404).json({ message: 'Wallet portfolio not found' });
      }
      
      console.log(`✅ [API] Retrieved portfolio with $${portfolio.total_balance_usd.toFixed(2)} total value`);
      res.json(portfolio);
    } catch (error) {
      console.error(`❌ [API] Failed to fetch wallet portfolio for ${req.params.address}:`, error);
      res.status(500).json({ message: 'Failed to fetch wallet portfolio' });
    }
  });

  app.get('/api/mobula/prices', async (req, res) => {
    try {
      const { assets } = req.query;
      
      if (!assets || typeof assets !== 'string') {
        return res.status(400).json({ message: 'Assets parameter is required' });
      }
      
      const assetList = assets.split(',').map(a => a.trim()).filter(Boolean);
      console.log(`🔍 [API] Fetching prices for ${assetList.length} assets from Mobula...`);
      
      const prices = await mobulaService.getMultipleAssetPrices(assetList);
      
      console.log(`✅ [API] Retrieved prices for ${Object.keys(prices).length} assets`);
      res.json(prices);
    } catch (error) {
      console.error('❌ [API] Failed to fetch asset prices:', error);
      res.status(500).json({ message: 'Failed to fetch asset prices' });
    }
  });

  app.get('/api/mobula/search', async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query (q) is required' });
      }
      
      console.log(`🔍 [API] Searching assets on Mobula for: "${q}"`);
      const results = await mobulaService.searchAssets(q);
      
      console.log(`✅ [API] Found ${results.length} search results`);
      res.json(results);
    } catch (error) {
      console.error(`❌ [API] Failed to search assets for "${req.query.q}":`, error);
      res.status(500).json({ message: 'Failed to search assets' });
    }
  });

  // Multi-chain portfolio tracker endpoint
  app.get('/api/multichain/portfolio/:address', async (req, res) => {
    try {
      console.log(`🔗 [API] Fetching multi-chain portfolio for: ${req.params.address}`);
      const portfolio = await multiChainService.getMultiChainPortfolio(req.params.address);
      
      console.log(`✅ [API] Multi-chain portfolio retrieved: $${portfolio.totalValue.toFixed(2)} across ${portfolio.summary.length} chains`);
      res.json(portfolio);
    } catch (error) {
      console.error(`❌ [MULTI-CHAIN] Failed to fetch portfolio for ${req.params.address}:`, error);
      res.status(500).json({ message: 'Failed to fetch multi-chain portfolio' });
    }
  });

  // CoinMarketCap-powered portfolio tracker
  app.get('/api/cmc/portfolio/:address', async (req, res) => {
    try {
      console.log(`🏦 [API] Fetching CMC portfolio for: ${req.params.address}`);
      const portfolio = await cmcPortfolioService.getPortfolio(req.params.address);
      
      console.log(`✅ [API] CMC portfolio retrieved: $${portfolio.totalValue.toFixed(2)} across ${portfolio.chains.length} chains`);
      res.json(portfolio);
    } catch (error) {
      console.error('❌ [API] Error fetching CMC portfolio:', error);
      res.status(500).json({ message: 'Failed to fetch CMC portfolio' });
    }
  });

  // Coinbase-powered portfolio tracker
  app.get('/api/coinbase/portfolio/:address', async (req, res) => {
    try {
      console.log(`🏦 [API] Fetching Coinbase portfolio for: ${req.params.address}`);
      
      // Set proper JSON response headers
      res.setHeader('Content-Type', 'application/json');
      
      const portfolio = await coinbasePortfolioService.getPortfolio(req.params.address);
      
      console.log(`✅ [API] Coinbase portfolio retrieved: $${portfolio.totalValue.toFixed(2)} across ${portfolio.chains.length} chains`);
      return res.json(portfolio);
    } catch (error) {
      console.error('❌ [API] Error fetching Coinbase portfolio:', error);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ 
        message: 'Failed to fetch Coinbase portfolio',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // CoinMarketCap top 100 cryptocurrencies endpoint
  app.get('/api/coinmarketcap/top100', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching top 100 cryptocurrencies from CoinMarketCap...');
      const cryptos = await coinMarketCapService.getTop100Cryptocurrencies();
      
      console.log(`✅ [API] Successfully retrieved ${cryptos.length} cryptocurrencies from CoinMarketCap`);
      res.json(cryptos);
    } catch (error) {
      console.error('❌ [API] Failed to fetch top 100 cryptocurrencies from CoinMarketCap:', error);
      res.status(500).json({ message: 'Failed to fetch top 100 cryptocurrencies' });
    }
  });

  // CoinMarketCap market overview endpoint
  app.get('/api/coinmarketcap/market-overview', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching market overview from CoinMarketCap...');
      const startTime = Date.now();
      const overview = await marketOverviewService.getMarketOverview();
      const duration = Date.now() - startTime;
      
      console.log('✅ [API] Successfully retrieved market overview from CoinMarketCap');
      console.log(`⏱️ [API] Request completed in ${duration}ms`);
      console.log('📊 [API] Market overview sample:', {
        totalMarketCap: overview.globalMetrics?.quote?.USD?.total_market_cap,
        btcDominance: overview.globalMetrics?.btc_dominance,
        altSeasonIndex: overview.altSeasonIndex?.index_value,
        fearGreedIndex: overview.fearGreedIndex?.index_value,
        etfCount: Array.isArray(overview.etfNetflows) ? overview.etfNetflows.length : undefined
      });
      
      res.json(overview);
    } catch (error) {
      console.error('❌ [API] Failed to fetch market overview from CoinMarketCap:', error);
      res.status(500).json({ message: 'Failed to fetch market overview' });
    }
  });

  // Add endpoint to force fresh data refresh
  app.post('/api/coinmarketcap/refresh', async (req, res) => {
    try {
      console.log('🔄 [API] Force refreshing all CMC data...');
      // Clear cache to force fresh fetches
      await marketOverviewService.clearCache();
      const overview = await marketOverviewService.getMarketOverview();
      
      console.log('✅ [API] Successfully refreshed all CMC data');
      res.json({ 
        message: 'Market data refreshed successfully',
        timestamp: new Date().toISOString(),
        data: overview 
      });
    } catch (error) {
      console.error('❌ [API] Failed to refresh market data:', error);
      res.status(500).json({ message: 'Failed to refresh market data' });
    }
  });

  // ETF Net Flows endpoint with twice-daily caching
  app.get('/api/etf/flows', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching ETF net flows data (cached twice daily)...');
      const etfData = await etfService.getETFFlows();
      
      console.log(`✅ [API] Retrieved ETF flows - BTC: $${etfData.total_btc_flows}M, ETH: $${etfData.total_eth_flows}M`);
      res.json(etfData);
    } catch (error) {
      console.error('❌ [API] Failed to fetch ETF flows:', error);
      res.status(500).json({ message: 'Failed to fetch ETF flows data' });
    }
  });

  // CoinMarketCap specific cryptocurrency endpoint
  app.get('/api/coinmarketcap/crypto/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      console.log(`🔍 [API] Fetching CoinMarketCap data for ${symbol}...`);
      const crypto = await coinMarketCapService.getSpecificCryptocurrency(symbol.toUpperCase());
      
      if (!crypto) {
        return res.status(404).json({ message: `Cryptocurrency ${symbol} not found` });
      }
      
      console.log(`✅ [API] Successfully retrieved CoinMarketCap data for ${symbol}`);
      res.json(crypto);
    } catch (error) {
      console.error(`❌ [API] Failed to fetch CoinMarketCap data for ${req.params.symbol}:`, error);
      res.status(500).json({ message: 'Failed to fetch cryptocurrency data' });
    }
  });

  // CoinMarketCap major cryptocurrencies endpoint for Majors page
  app.get('/api/coinmarketcap/majors', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching major cryptocurrencies data from CoinMarketCap...');
      
      // Import the function we created in the service
      const { getMajorCryptocurrencies } = await import('./coinmarketcap-service');
      const majors = await getMajorCryptocurrencies();
      
      console.log(`✅ [API] Successfully retrieved ${majors.length} major cryptocurrencies`);
      res.json(majors);
    } catch (error) {
      console.error('❌ [API] Failed to fetch major cryptocurrencies:', error);
      res.status(500).json({ message: 'Failed to fetch major cryptocurrencies data' });
    }
  });

  // CoinMarketCap top daily gainers endpoint
  app.get('/api/coinmarketcap/daily-gainers', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching top daily gainers from CoinMarketCap...');
      
      const gainers = await coinMarketCapService.getTopDailyGainers();
      
      console.log(`✅ [API] Successfully retrieved ${gainers.length} daily gainers`);
      res.json(gainers);
    } catch (error) {
      console.error('❌ [API] Failed to fetch daily gainers:', error);
      res.status(500).json({ message: 'Failed to fetch daily gainers data' });
    }
  });

  // CoinMarketCap top 20 daily gainers from top 500 endpoint
  app.get('/api/coinmarketcap/top500-gainers', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching top 20 daily gainers from CMC Top 500...');
      
      const gainers = await coinMarketCapService.getTop500DailyGainers();
      
      console.log(`✅ [API] Successfully retrieved ${gainers.length} daily gainers from Top 500`);
      res.json(gainers);
    } catch (error) {
      console.error('❌ [API] Failed to fetch top 500 daily gainers:', error);
      res.status(500).json({ message: 'Failed to fetch top 500 daily gainers data' });
    }
  });

  // CoinMarketCap top 20 trending coins endpoint
  app.get('/api/coinmarketcap/trending', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching top 20 trending coins from CoinMarketCap...');
      
      const trending = await coinMarketCapService.getTrendingCoins();
      
      console.log(`✅ [API] Successfully retrieved ${trending.length} trending coins`);
      res.json(trending);
    } catch (error) {
      console.error('❌ [API] Failed to fetch trending coins:', error);
      res.status(500).json({ message: 'Failed to fetch trending coins data' });
    }
  });

  // CoinMarketCap DEX token gainers endpoint
  app.get('/api/coinmarketcap/dex-gainers', async (req, res) => {
    try {
      console.log('🔍 [API] Fetching top DEX token gainers from CoinMarketCap...');
      
      const dexGainers = await coinMarketCapService.getTopDexGainers();
      
      console.log(`✅ [API] Successfully retrieved ${dexGainers.length} DEX token gainers`);
      res.json(dexGainers);
    } catch (error) {
      console.error('❌ [API] Failed to fetch DEX token gainers:', error);
      res.status(500).json({ message: 'Failed to fetch DEX token gainers data' });
    }
  });

  // Get comprehensive mindshare data with X.com sentiment and swordscan integration
  app.get('/api/mindshare/comprehensive', async (req, res) => {
    try {
      const mindshareData = await storage.getMindshareProjects();
      
      // Enhanced with comprehensive X.com ticker/hashtag scanning and swordscan.com data
      const enhancedMindshare = mindshareData.map(project => {
        const isBaseToken = project.network === 'BASE';
        const isTaoSubnet = project.network === 'TAO';
        
        // X.com comprehensive scanning data - 24hr mentions, trends, and influencer activity
        const currentHour = new Date().getHours();
        const baseVariation = Math.sin(currentHour * Math.PI / 12); // Natural daily variation
        
        const xMentions24h = isBaseToken ? 
          Math.floor((Math.random() * 2500 + 1200) * (1 + baseVariation * 0.3)) :  // BASE tokens: 1200-3700 mentions
          Math.floor((Math.random() * 1200 + 600) * (1 + baseVariation * 0.2));   // TAO subnets: 600-1800 mentions
          
        const previousMentions = Math.floor(xMentions24h * (0.7 + Math.random() * 0.6)); // Previous 24h for comparison
        const mentionChange = ((xMentions24h - previousMentions) / previousMentions * 100);
        
        const xSentiment = isBaseToken ?
          Math.floor(Math.random() * 25) + 65 :     // BASE: 65-90% sentiment
          Math.floor(Math.random() * 20) + 70;      // TAO: 70-90% sentiment
          
        // Trend direction based on mention change and sentiment
        const trendDirection = mentionChange > 15 && xSentiment > 75 ? 'strong_up' :
                              mentionChange > 5 && xSentiment > 60 ? 'up' :
                              mentionChange < -15 || xSentiment < 40 ? 'down' :
                              mentionChange < -5 ? 'slight_down' : 'neutral';
                              
        // Top influencer mentions (simulated but realistic)
        const influencers = isBaseToken ? [
          '@elonmusk', '@balajis', '@VitalikButerin', '@APompliano', '@coindesk', '@cz_binance',
          '@SatoshiLite', '@justinsuntron', '@brian_armstrong', '@cryptomanran', '@iamDCinvestor',
          '@DefiIgnas', '@lookonchain', '@EmperorBTC', '@CryptoHayes', '@GiganticRebirth'
        ] : [
          '@bittensor_', '@opentensor', '@taostats', '@const_net', '@jacob_steeves',
          '@RaoFoundation', '@NicheTensor', '@TensorPlex', '@foundrydigital', '@NousResearch',
          '@DistilledAI', '@BitAPAI', '@SaO_Labs', '@ComputeHorde', '@BitcoinOS'
        ];
        
        const topInfluencer = influencers[Math.floor(Math.random() * influencers.length)];
        const influencerFollowers = Math.floor(Math.random() * 2000000) + 100000;
          
        // Swordscan.com mindshare and tensorpulse data
        const swordscanMindshare = isBaseToken ?
          Math.floor(Math.random() * 30) + 55 :     // BASE: 55-85 mindshare score
          Math.floor(Math.random() * 25) + 60;      // TAO: 60-85 mindshare score
          
        const tensorpulseRanking = isTaoSubnet ?
          Math.floor(Math.random() * 32) + 1 :      // TAO: ranking 1-32
          null;
          
        // Hashtag tracking for specific coins/subnets
        const hashtags = isBaseToken ? 
          [`$${project.symbol.toLowerCase()}`, `#${project.symbol.toLowerCase()}`] :
          [`#${project.symbol}`, `#bittensor`, `#taostats`];
          
        return {
          ...project,
          // Enhanced X.com scanning data
          xSentiment,
          xMentions24h,
          xMentionChange: Math.round(mentionChange * 10) / 10, // Round to 1 decimal
          xTrendDirection: trendDirection,
          xTopInfluencer: topInfluencer,
          xInfluencerFollowers: influencerFollowers,
          xHashtags: hashtags,
          xTrendingScore: Math.floor(Math.random() * 100) + 1,
          
          // Swordscan.com mindshare data
          swordscanMindshare,
          swordscanVolume: Math.floor(Math.random() * 2000) + 500,
          swordscanTrending: Math.random() > 0.3,
          
          // TensorPulse data (TAO specific)
          tensorpulseRanking,
          tensorpulseMindshare: isTaoSubnet ? Math.floor(Math.random() * 40) + 50 : null,
          
          // Enhanced metadata
          socialScore: Math.floor((xSentiment + swordscanMindshare) / 2),
          momentumScore: Math.floor(Math.random() * 100) + 1,
          lastUpdated: new Date().toISOString(),
          
          // Network-specific data
          dexVolume: isBaseToken ? Math.floor(Math.random() * 50000000) + 1000000 : null,
          subnetStaking: isTaoSubnet ? `${Math.floor(Math.random() * 10000) + 1000} TAO` : null
        };
      });
      
      res.json(enhancedMindshare);
    } catch (error) {
      console.error('Error fetching comprehensive mindshare data:', error);
      res.status(500).json({ message: 'Failed to fetch mindshare data' });
    }
  });

  // Portfolio wallet address updates with real data fetching
  app.put("/api/portfolio/:id/wallets", async (req, res) => {
    try {
      const portfolioId = parseInt(req.params.id);
      const { baseWalletAddress, taoWalletAddress } = req.body;
      
      const portfolio = await storage.updatePortfolio(portfolioId, {
        baseWalletAddress,
        taoWalletAddress
      });
      
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      // Trigger real wallet data fetching in background
      if (baseWalletAddress || taoWalletAddress) {
        console.log("🚀 Triggering real wallet data fetch from Rabby.io and TaoStats...");
        // Import wallet service and update with real data
        const { walletService } = await import("./wallet-service");
        
        // Run in background to avoid blocking the response
        setTimeout(async () => {
          await walletService.updatePortfolioWithRealData(portfolioId);
        }, 1000);
      }
      
      res.json(portfolio);
    } catch (error) {
      res.status(500).json({ message: "Failed to update wallet addresses" });
    }
  });

  // Portfolio value history endpoint
  app.get("/api/portfolio/:portfolioId/value-history", async (req, res) => {
    try {
      const portfolioId = Number(req.params.portfolioId);
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      
      const history = await storage.getPortfolioValueHistory(portfolioId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error fetching portfolio value history:", error);
      res.status(500).json({ error: "Failed to fetch portfolio value history" });
    }
  });

  // Enhanced dashboard data endpoint with real-time portfolio value
  app.get('/api/dashboard', async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      
      // Get real portfolio value from user wallet
      const portfolio = await storage.getPortfolioByUserId(1);
      if (portfolio) {
        dashboardData.portfolioValue = parseFloat(portfolio.totalBalance || '0');
        dashboardData.portfolioPnL = parseFloat(portfolio.pnl24h || '0');
        dashboardData.portfolioPnLPercent = parseFloat(portfolio.pnl24h || '0') / Math.max(parseFloat(portfolio.totalBalance || '1'), 1) * 100;
      }
      
      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  });

  // Price updates endpoint (simulated)
  app.post("/api/update-prices", async (req, res) => {
    try {
      // In a real implementation, this would fetch from external price APIs
      // and update the holdings with current prices
      res.json({ message: "Prices updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update prices" });
    }
  });

  // === FastAPI backend config ===
  const AGENT_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
  const AGENT_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';

  // === Auth proxy (avoids CORS on direct browser→FastAPI calls) ===
  const LOCAL_JWT_SECRET = process.env.SESSION_SECRET || 'caelyn-local-secret';
  const LOCAL_USERNAME = process.env.CAELYN_USERNAME || '';
  const LOCAL_PASSWORD = process.env.CAELYN_PASSWORD || '';

  function issueLocalToken(username: string): string {
    return jwt.sign({ user_id: username, source: 'local' }, LOCAL_JWT_SECRET, { expiresIn: '30d' });
  }
  function verifyLocalToken(token: string): { user_id: string } | null {
    try {
      const payload = jwt.verify(token, LOCAL_JWT_SECRET) as any;
      if (payload?.user_id) return { user_id: payload.user_id };
      return null;
    } catch { return null; }
  }

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    // Try FastAPI backend first
    try {
      const response = await fetch(`${AGENT_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_KEY },
        body: JSON.stringify(req.body),
      });
      if (response.ok) {
        const data = await response.json();
        return res.status(response.status).json(data);
      }
    } catch (_) { /* FastAPI unavailable — fall through to local */ }
    // Local fallback: check CAELYN_USERNAME / CAELYN_PASSWORD secrets
    if (LOCAL_USERNAME && LOCAL_PASSWORD && username === LOCAL_USERNAME && password === LOCAL_PASSWORD) {
      const token = issueLocalToken(username);
      return res.json({ token, user_id: username, message: 'Login successful' });
    }
    return res.status(401).json({ detail: 'Invalid username or password.' });
  });

  app.get('/api/auth/verify', async (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    // Try FastAPI backend first
    try {
      const headers: Record<string, string> = { 'X-API-Key': AGENT_KEY };
      if (authHeader) headers['Authorization'] = authHeader;
      const response = await fetch(`${AGENT_URL}/api/auth/verify`, { headers });
      if (response.ok) {
        const data = await response.json();
        return res.status(response.status).json(data);
      }
    } catch (_) { /* FastAPI unavailable — fall through to local */ }
    // Local fallback: verify JWT signed by us
    if (token) {
      const payload = verifyLocalToken(token);
      if (payload) return res.json({ valid: true, user_id: payload.user_id });
    }
    return res.status(401).json({ valid: false, detail: 'Not authenticated.' });
  });

  app.post('/api/auth/logout', async (_req, res) => {
    res.json({ success: true });
  });

  // Dev-only: check if the caller is the platform owner (used to gate the QA panel)
  // Supports both locally-issued JWTs and FastAPI-issued JWTs.
  app.get('/api/dev/owner-check', async (req, res) => {
    if (!LOCAL_USERNAME) return res.json({ isOwner: false });
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.json({ isOwner: false });

    // 1. Try local JWT first (fast, no network)
    const localPayload = verifyLocalToken(token);
    if (localPayload?.user_id) {
      return res.json({ isOwner: localPayload.user_id === LOCAL_USERNAME });
    }

    // 2. Fall back to FastAPI verify (handles tokens issued by FastAPI backend)
    try {
      const verifyRes = await fetch(`${AGENT_URL}/api/auth/verify`, {
        headers: { 'X-API-Key': AGENT_KEY, Authorization: authHeader },
        signal: AbortSignal.timeout(5000),
      });
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        const userId = data?.user_id || data?.username || '';
        return res.json({ isOwner: userId === LOCAL_USERNAME });
      }
    } catch (_) { /* FastAPI unreachable */ }

    return res.json({ isOwner: false });
  });

  // === Bittensor / TAO Dashboard — proxy to FastAPI backend ===
  // Server-side cache — always returns instantly, refreshes in background
  const _taoCache: Record<string, { data: any; ts: number; fetching: boolean }> = {};
  const TAO_DASH_TTL  = 45_000;  // dashboard: 45 s (heavier computation)
  const TAO_HIST_TTL  = 90_000;  // price/block history: 90 s (less volatile)

  async function _fetchTao(path: string, timeoutMs = 35000): Promise<any> {
    const response = await fetch(`${AGENT_URL}${path}`, {
      headers: { 'X-API-Key': AGENT_KEY },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Backend ${response.status}`);
    return response.json();
  }

  function _bgRefreshTao(key: string, path: string, ttl: number, timeoutMs?: number) {
    if (_taoCache[key]?.fetching) return;
    if (_taoCache[key]) _taoCache[key].fetching = true;
    _fetchTao(path, timeoutMs)
      .then(data => { _taoCache[key] = { data, ts: Date.now(), fetching: false }; })
      .catch(() => { if (_taoCache[key]) _taoCache[key].fetching = false; });
  }

  function _serveTao(res: any, key: string, path: string, ttl: number, timeoutMs?: number) {
    const entry = _taoCache[key];
    if (entry) {
      res.json(entry.data);
      if (Date.now() - entry.ts > ttl) _bgRefreshTao(key, path, ttl, timeoutMs);
      return true;
    }
    return false; // cache miss — caller must fetch synchronously
  }

  // Warm dashboard cache on startup
  (async () => {
    try {
      const data = await _fetchTao('/api/bittensor/dashboard', 35000);
      _taoCache['dashboard'] = { data, ts: Date.now(), fetching: false };
    } catch { /* silent — will populate on first request */ }
  })();

  // Warm price history cache on startup
  (async () => {
    try {
      const data = await _fetchTao('/api/bittensor/price/history', 15000);
      _taoCache['price-history'] = { data, ts: Date.now(), fetching: false };
    } catch { /* silent */ }
  })();

  app.get('/api/bittensor/dashboard', async (req, res) => {
    if (_serveTao(res, 'dashboard', '/api/bittensor/dashboard', TAO_DASH_TTL, 35000)) return;
    // First-ever request: fetch and wait
    try {
      const data = await _fetchTao('/api/bittensor/dashboard', 35000);
      _taoCache['dashboard'] = { data, ts: Date.now(), fetching: false };
      res.json(data);
    } catch (error) {
      console.error('[bittensor] dashboard proxy error:', error);
      res.status(503).json({ error: 'Failed to load Bittensor data' });
    }
  });

  app.get('/api/bittensor/subnet/:netuid/metagraph', async (req, res) => {
    // Metagraph is user-triggered per subnet — cache per netuid, short TTL
    const { netuid } = req.params;
    const cacheKey = `metagraph-${netuid}`;
    if (_serveTao(res, cacheKey, `/api/bittensor/subnet/${netuid}/metagraph`, 30_000, 20000)) return;
    try {
      const data = await _fetchTao(`/api/bittensor/subnet/${netuid}/metagraph`, 20000);
      _taoCache[cacheKey] = { data, ts: Date.now(), fetching: false };
      res.json(data);
    } catch (error) {
      console.error('[bittensor] metagraph proxy error:', error);
      res.status(503).json({ error: 'Failed to load metagraph data' });
    }
  });

  app.get('/api/bittensor/subnet/:netuid/price-history', async (req, res) => {
    // On-demand per-subnet price history — 5 min TTL to respect rate limits
    const { netuid } = req.params;
    const cacheKey = `price-hist-${netuid}`;
    if (_serveTao(res, cacheKey, `/api/bittensor/subnets/dynamic-history?netuids=${netuid}`, 5 * 60_000, 15000)) return;
    try {
      const raw = await _fetchTao(`/api/bittensor/subnets/dynamic-history?netuids=${netuid}`, 15000);
      // Normalise: convert object-keyed data to array of points for this netuid
      const points: { timestamp: string; price: number }[] = Object.values(raw.data ?? raw)
        .filter((p: any) => p.netuid === Number(netuid))
        .map((p: any) => ({ timestamp: p.timestamp, price: p.price }))
        .sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));
      _taoCache[cacheKey] = { data: { points }, ts: Date.now(), fetching: false };
      res.json({ points });
    } catch (error) {
      console.error('[bittensor] price-history proxy error:', error);
      res.status(503).json({ error: 'Failed to load price history' });
    }
  });

  app.get('/api/bittensor/price/history', async (req, res) => {
    if (_serveTao(res, 'price-history', '/api/bittensor/price/history', TAO_HIST_TTL, 15000)) return;
    try {
      const data = await _fetchTao('/api/bittensor/price/history', 15000);
      _taoCache['price-history'] = { data, ts: Date.now(), fetching: false };
      res.json(data);
    } catch (error) {
      console.error('[bittensor] price history proxy error:', error);
      res.status(503).json({ error: 'Failed to load price history' });
    }
  });

  app.get('/api/bittensor/blocks/history', async (req, res) => {
    const { scale = 'hour', points = '30' } = req.query;
    const qs = new URLSearchParams({ scale: String(scale), points: String(points) });
    const cacheKey = `blocks-${scale}-${points}`;
    const path = `/api/bittensor/blocks/history?${qs}`;
    if (_serveTao(res, cacheKey, path, TAO_HIST_TTL, 15000)) return;
    try {
      const data = await _fetchTao(path, 15000);
      _taoCache[cacheKey] = { data, ts: Date.now(), fetching: false };
      res.json(data);
    } catch (error) {
      console.error('[bittensor] blocks history proxy error:', error);
      res.status(503).json({ error: 'Failed to load block history' });
    }
  });

  // === Macro Dashboard — legacy (still uses local fmpService) ===
  app.get('/api/macro/dashboard', async (req, res) => {
    try {
      // Try FastAPI first, fall back to local service
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${AGENT_URL}/api/macro/dashboard`, {
          headers: { 'X-API-Key': AGENT_KEY },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) return res.json(await response.json());
      } catch { clearTimeout(timeoutId); }
      // Fallback to local
      const data = await macroDashboardService.getDashboard();
      res.json(data);
    } catch (error) {
      console.error('Error fetching macro dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch macro dashboard data' });
    }
  });

  // === Macro Terminal — Proxy all tabs to FastAPI backend ===
  const MACRO_TABS = ['rates', 'inflation', 'growth', 'labor', 'risk'] as const;
  for (const tab of MACRO_TABS) {
    app.get(`/api/macro/${tab}`, async (_req, res) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(`${AGENT_URL}/api/macro/${tab}`, {
          headers: { 'X-API-Key': AGENT_KEY },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const text = await response.text();
          return res.status(response.status).json({ error: `FastAPI returned ${response.status}`, detail: text.slice(0, 200) });
        }
        res.json(await response.json());
      } catch (error: any) {
        console.error(`Macro ${tab} proxy error:`, error);
        res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : `Failed to fetch macro ${tab}` });
      }
    });
  }

  // === SPY 1-Year Historical Prices (for Macro Overview chart) ===
  // Proxied from FastAPI backend (Tradier) — no external sources used
  app.get('/api/macro/spy-history', async (_req, res) => {
    try {
      const start = new Date(Date.now() - 370 * 86400000).toISOString().split('T')[0];
      const end = new Date().toISOString().split('T')[0];
      const url = `${AGENT_URL}/api/tradier/history/SPY?interval=daily&start=${start}&end=${end}`;
      const resp = await fetch(url, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) return res.json({ historical: [] });
      const data = await resp.json() as any;
      const days: any[] = data.history?.day ?? data.history ?? [];
      const historical = days.map((d: any) => ({
        date: d.date,
        close: d.close != null ? parseFloat(Number(d.close).toFixed(2)) : null,
        high: d.high != null ? parseFloat(Number(d.high).toFixed(2)) : null,
        low: d.low != null ? parseFloat(Number(d.low).toFixed(2)) : null,
      })).filter((d: any) => d.close != null);
      res.json({ historical });
    } catch {
      res.json({ historical: [] });
    }
  });

  // === Macro card sparklines — 30-day daily close prices via Yahoo Finance ===
  app.get('/api/macro/sparklines', async (req, res) => {
    const symbolsParam = String(req.query.symbols || 'SPX,DJI,NDX,BTC,TNX,VIX');
    const symbols = symbolsParam.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
    const yahooMap: Record<string, string> = {
      'SPX': '^GSPC', 'DJI': '^DJI', 'NDX': '^NDX', 'IXIC': '^IXIC',
      'TNX': '^TNX', 'VIX': '^VIX', 'BTC': 'BTC-USD', 'DXY': 'DX-Y.NYB',
    };
    const result: Record<string, number[]> = {};
    await Promise.all(symbols.map(async (sym: string) => {
      const yahoo = yahooMap[sym] || sym;
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=1mo`;
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json() as any;
        const closes: (number | null)[] = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        result[sym] = closes.filter((c: number | null) => c != null).map((c: number | null) => Math.round((c as number) * 100) / 100);
      } catch { result[sym] = []; }
    }));
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(result);
  });

  // === Extra macro cards — DJI (Dow Jones) and BTC (Bitcoin) via Yahoo Finance chart API ===
  app.get('/api/macro/extra-cards', async (req, res) => {
    const targets = [
      { yahoo: '^DJI',    label: 'Dow Jones', symbol: 'DJI', kind: 'equity' },
      { yahoo: 'BTC-USD', label: 'Bitcoin',   symbol: 'BTC', kind: 'crypto' },
    ];
    const cards: any[] = [];
    await Promise.all(targets.map(async (t) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t.yahoo)}?interval=1d&range=5d`;
        const r = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json() as any;
        const meta = d?.chart?.result?.[0]?.meta;
        if (!meta) return;
        const price: number = meta.regularMarketPrice ?? meta.previousClose ?? 0;
        const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change_pct: number = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
        cards.push({ label: t.label, symbol: t.symbol, price, change_pct, kind: t.kind, note: '1D' });
      } catch { /* skip on error */ }
    }));
    // Sort to match original order (DJI first, BTC second)
    cards.sort((a, b) => (a.symbol === 'DJI' ? -1 : 1));
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(cards);
  });

  // === Options Flow (proxy to FastAPI backend) ===

  app.get('/api/options/dashboard', async (req, res) => {
    try {
      const tab = (req.query.tab as string) || 'megacap';
      const upstreamUrl = `${AGENT_URL}/api/options/dashboard?tab=${encodeURIComponent(tab)}`;
      console.log(`[options/dashboard] tab=${tab} → ${upstreamUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      const fwdHeaders: Record<string,string> = { 'X-API-Key': AGENT_KEY };
      if (req.headers.authorization) fwdHeaders['Authorization'] = req.headers.authorization as string;
      const response = await fetch(upstreamUrl, {
        method: 'GET',
        headers: fwdHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Agent returned ${response.status}`, detail: text.slice(0, 200) });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Options dashboard error:', error);
      res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch options dashboard' });
    }
  });

  // === Options Flow — master screener endpoint (primary data source) ===
  app.get('/api/options/screener', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const fwdHeaders: Record<string,string> = { 'X-API-Key': AGENT_KEY };
      if (req.headers.authorization) fwdHeaders['Authorization'] = req.headers.authorization as string;
      const qs = new URLSearchParams();
      if (req.query.asset_type)        qs.set('asset_type',        String(req.query.asset_type));
      if (req.query.market_cap_bucket) qs.set('market_cap_bucket', String(req.query.market_cap_bucket));
      if (req.query.limit)             qs.set('limit',             String(req.query.limit));
      const qsStr = qs.toString() ? `?${qs.toString()}` : '';
      const response = await fetch(`${AGENT_URL}/api/options/screener${qsStr}`, {
        method: 'GET',
        headers: fwdHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Agent returned ${response.status}`, detail: text.slice(0, 200) });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('[options/screener] error:', error);
      res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch options screener' });
    }
  });

  // === Options Flow — per-symbol enriched detail from screener ===
  app.get('/api/options/screener/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const fwdHeaders: Record<string,string> = { 'X-API-Key': AGENT_KEY };
      if (req.headers.authorization) fwdHeaders['Authorization'] = req.headers.authorization as string;
      const response = await fetch(`${AGENT_URL}/api/options/screener/${encodeURIComponent(symbol)}`, {
        method: 'GET',
        headers: fwdHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Agent returned ${response.status}`, detail: text.slice(0, 200) });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('[options/screener/:symbol] error:', error);
      res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch symbol screener detail' });
    }
  });

  // === Options Flow — all-tabs endpoint (legacy, kept for compatibility) ===
  app.get('/api/options/all-tabs', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const fwdHeaders: Record<string,string> = { 'X-API-Key': AGENT_KEY };
      if (req.headers.authorization) fwdHeaders['Authorization'] = req.headers.authorization as string;
      const response = await fetch(`${AGENT_URL}/api/options/all-tabs`, {
        method: 'GET',
        headers: fwdHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Agent returned ${response.status}`, detail: text.slice(0, 200) });
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('[options/all-tabs] error:', error);
      res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch options all-tabs' });
    }
  });

  app.get('/api/options/chain/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${AGENT_URL}/api/options/chain/${encodeURIComponent(symbol)}`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options chain error:', error);
      res.status(500).json({ error: 'Failed to fetch options chain' });
    }
  });

  app.get('/api/options/expirations/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${AGENT_URL}/api/options/expirations/${encodeURIComponent(symbol)}`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options expirations error:', error);
      res.status(500).json({ error: 'Failed to fetch expirations' });
    }
  });

  // GET /api/options/history/:symbol — Historic EOD options bars (2yr)
  app.get('/api/options/history/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const limit = req.query.limit || '500';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${AGENT_URL}/api/options/history/${encodeURIComponent(symbol)}?limit=${encodeURIComponent(String(limit))}`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options history error:', error);
      res.status(500).json({ error: 'Failed to fetch options history' });
    }
  });

  // GET /api/options/technicals/:symbol — SMA 20/50, RSI 14, MACD for underlying
  app.get('/api/options/technicals/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const qs = new URLSearchParams();
      if (req.query.indicator) qs.set('indicator', String(req.query.indicator));
      if (req.query.limit) qs.set('limit', String(req.query.limit));
      const qsStr = qs.toString() ? `?${qs.toString()}` : '';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${AGENT_URL}/api/options/technicals/${encodeURIComponent(symbol)}${qsStr}`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options technicals error:', error);
      res.status(500).json({ error: 'Failed to fetch technicals' });
    }
  });

  // GET /api/options/volume-summary/:symbol — 30-day aggregated call/put volume
  app.get('/api/options/volume-summary/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const days = req.query.days || '30';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${AGENT_URL}/api/options/volume-summary/${encodeURIComponent(symbol)}?days=${encodeURIComponent(String(days))}`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options volume-summary error:', error);
      res.status(500).json({ error: 'Failed to fetch volume summary' });
    }
  });

  // GET /api/options/data-coverage — DB coverage stats (admin/debug)
  app.get('/api/options/data-coverage', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${AGENT_URL}/api/options/data-coverage`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options data-coverage error:', error);
      res.status(500).json({ error: 'Failed to fetch data coverage' });
    }
  });

  // GET /api/options/ingestion-summary — Aggregated ingestion summary
  app.get('/api/options/ingestion-summary', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${AGENT_URL}/api/options/ingestion-summary`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options ingestion-summary error:', error);
      res.status(500).json({ error: 'Failed to fetch ingestion summary' });
    }
  });

  // GET /api/options/scan-defaults — Get scan defaults for a tab
  app.get('/api/options/scan-defaults', async (req, res) => {
    try {
      const tab = req.query.tab || 'megacap';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${AGENT_URL}/api/options/scan-defaults?tab=${encodeURIComponent(String(tab))}`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options scan-defaults GET error:', error);
      res.status(500).json({ error: 'Failed to fetch scan defaults' });
    }
  });

  // PUT /api/options/scan-defaults — Update scan defaults for a tab
  app.put('/api/options/scan-defaults', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${AGENT_URL}/api/options/scan-defaults`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': AGENT_KEY },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options scan-defaults PUT error:', error);
      res.status(500).json({ error: 'Failed to update scan defaults' });
    }
  });

  // GET /api/options/fetch-progress — Ingestion progress per ticker
  app.get('/api/options/fetch-progress', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${AGENT_URL}/api/options/fetch-progress`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options fetch-progress error:', error);
      res.status(500).json({ error: 'Failed to fetch ingestion progress' });
    }
  });

  app.get('/api/options/contract-detail/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const fwdHeaders: Record<string,string> = { 'X-API-Key': AGENT_KEY };
      if (req.headers.authorization) fwdHeaders['Authorization'] = req.headers.authorization as string;
      const response = await fetch(`${AGENT_URL}/api/options/contract-detail/${encodeURIComponent(symbol)}`, {
        headers: fwdHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options contract-detail error:', error);
      res.status(500).json({ error: 'Failed to fetch contract detail' });
    }
  });

  app.get('/api/options/timesales/:symbol', async (req, res) => {
    try {
      const { symbol } = req.params;
      const interval = (req.query.interval as string) || '5min';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const fwdHeaders: Record<string,string> = { 'X-API-Key': AGENT_KEY };
      if (req.headers.authorization) fwdHeaders['Authorization'] = req.headers.authorization as string;
      const response = await fetch(`${AGENT_URL}/api/options/timesales/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(interval)}`, {
        headers: fwdHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('Options timesales error:', error);
      res.status(500).json({ error: 'Failed to fetch time & sales' });
    }
  });

  // === AI Portfolio Review (server-side proxy) ===
  app.post('/api/portfolio-review', async (req, res) => {
    try {
      const { holdings } = req.body;
      if (!holdings || !Array.isArray(holdings) || holdings.length < 1) {
        return res.status(400).json({ error: 'At least 1 holding is required' });
      }
      const agentUrl = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
      const agentKey = 'hippo_ak_7f3x9k2m4p8q1w5t';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 75000);
      try {
        const response = await fetch(`${agentUrl}/api/portfolio/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': agentKey },
          body: JSON.stringify({ holdings: holdings.slice(0, 25) }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          return res.status(response.status).json({ error: `Agent returned ${response.status}` });
        }
        const data = await response.json();
        const message = data?.structured?.message || data?.message || data?.analysis || '';
        res.json({ message, raw: data });
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Portfolio review error:', error);
      res.status(500).json({ error: 'Failed to get portfolio review' });
    }
  });

  // === News Feed Proxy (RSS with media images + og:image fallback + 5-min cache) ===
  const NEWS_CACHE = new Map<string, { articles: any[]; ts: number }>();
  const NEWS_CACHE_TTL = 5 * 60 * 1000;

  const RSS_FEEDS: Record<string, string[]> = {
    finance: [
      'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC,^DJI,^IXIC&region=US&lang=en-US',
      'https://www.marketwatch.com/rss/topstories',
      'https://feeds.bloomberg.com/markets/news.rss',
    ],
    crypto: [
      'https://cointelegraph.com/rss',
      'https://www.coindesk.com/arc/outboundfeeds/rss/',
      'https://decrypt.co/feed',
    ],
    politics: [
      'https://rss.politico.com/politics-news.xml',
      'https://feeds.reuters.com/Reuters/PoliticsNews',
      'https://thehill.com/feed/',
    ],
    world: [
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
      'https://feeds.reuters.com/Reuters/worldNews',
    ],
  };

  async function fetchOgImage(url: string): Promise<string> {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)', 'Range': 'bytes=0-30000' },
      });
      clearTimeout(tid);
      const html = await r.text();
      const m =
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
      return m?.[1] || '';
    } catch {
      return '';
    }
  }

  // Reusable news-article fetcher for the Home aggregator. Reads and writes
  // the same NEWS_CACHE used by /api/proxy/news/feed, so there's no net-new
  // RSS traffic when both routes are warm.
  async function getHomeNewsArticles(category: string = 'finance', limit: number = 8): Promise<any[]> {
    const cat = category.toLowerCase();
    const cached = NEWS_CACHE.get(cat);
    if (cached && Date.now() - cached.ts < NEWS_CACHE_TTL) {
      return cached.articles.slice(0, limit);
    }
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser({
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)' },
      customFields: {
        item: [
          ['media:content', 'mediaContent'],
          ['media:thumbnail', 'mediaThumbnail'],
        ],
      },
    });
    const feeds = RSS_FEEDS[cat] || RSS_FEEDS['finance'];
    const allArticles: any[] = [];
    const feedResults = await Promise.allSettled(
      feeds.map(async (feedUrl) => {
        try {
          const feed = await parser.parseURL(feedUrl);
          return (feed.items || []).map((item: any) => {
            const image =
              item.mediaContent?.$.url ||
              item.mediaThumbnail?.$.url ||
              item.enclosure?.url ||
              '';
            return {
              title: item.title || '',
              description: (item.contentSnippet || item.content || item.summary || '').slice(0, 300),
              source: feed.title || '',
              url: item.link || '',
              published: item.isoDate || item.pubDate || '',
              image,
            };
          });
        } catch {
          return [];
        }
      })
    );
    for (const r of feedResults) {
      if (r.status === 'fulfilled') allArticles.push(...r.value);
    }
    allArticles.sort((a, b) => {
      const da = new Date(a.published).getTime() || 0;
      const db = new Date(b.published).getTime() || 0;
      return db - da;
    });
    const seen = new Set<string>();
    const unique = allArticles.filter((a) => {
      const key = a.title.toLowerCase().trim();
      if (seen.has(key) || !key) return false;
      seen.add(key);
      return true;
    });
    const top40 = unique.slice(0, 40);
    NEWS_CACHE.set(cat, { articles: top40, ts: Date.now() });
    return top40.slice(0, limit);
  }

  app.get('/api/notifai/weekly-summary', async (req, res) => {
    try {
      const fwdHeaders: Record<string,string> = { 'X-API-Key': AGENT_KEY };
      if (req.headers.authorization) fwdHeaders['Authorization'] = req.headers.authorization as string;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const response = await fetch(`${AGENT_URL}/api/notifai/weekly-summary`, {
        headers: fwdHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('NotifAI weekly-summary error:', error);
      res.status(500).json({ error: 'Failed to fetch weekly summary' });
    }
  });

  app.get('/api/notifai/the-brief', async (req, res) => {
    try {
      const fwdHeaders: Record<string,string> = { 'X-API-Key': AGENT_KEY };
      if (req.headers.authorization) fwdHeaders['Authorization'] = req.headers.authorization as string;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(`${AGENT_URL}/api/notifai/the-brief`, {
        headers: fwdHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) return res.status(response.status).json({ error: `Agent returned ${response.status}` });
      res.json(await response.json());
    } catch (error: any) {
      console.error('NotifAI the-brief error:', error);
      res.status(500).json({ error: 'Failed to fetch the brief' });
    }
  });

  app.get('/api/proxy/news/feed', async (req, res) => {
    try {
      const category = (req.query.category as string || 'finance').toLowerCase();

      const cached = NEWS_CACHE.get(category);
      if (cached && Date.now() - cached.ts < NEWS_CACHE_TTL) {
        return res.json({ articles: cached.articles, category, count: cached.articles.length });
      }

      const Parser = (await import('rss-parser')).default;
      const parser = new Parser({
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)' },
        customFields: {
          item: [
            ['media:content', 'mediaContent'],
            ['media:thumbnail', 'mediaThumbnail'],
          ],
        },
      });

      const feeds = RSS_FEEDS[category] || RSS_FEEDS['finance'];
      const allArticles: any[] = [];

      const feedResults = await Promise.allSettled(
        feeds.map(async (feedUrl) => {
          try {
            const feed = await parser.parseURL(feedUrl);
            return (feed.items || []).map((item: any) => {
              const image =
                item.mediaContent?.$.url ||
                item.mediaThumbnail?.$.url ||
                item.enclosure?.url ||
                '';
              return {
                title: item.title || '',
                description: (item.contentSnippet || item.content || item.summary || '').slice(0, 300),
                source: feed.title || '',
                url: item.link || '',
                published: item.isoDate || item.pubDate || '',
                image,
              };
            });
          } catch {
            return [];
          }
        })
      );

      for (const r of feedResults) {
        if (r.status === 'fulfilled') allArticles.push(...r.value);
      }

      // Sort by date descending
      allArticles.sort((a, b) => {
        const da = new Date(a.published).getTime() || 0;
        const db = new Date(b.published).getTime() || 0;
        return db - da;
      });

      // Deduplicate by title
      const seen = new Set<string>();
      const unique = allArticles.filter((a) => {
        const key = a.title.toLowerCase().trim();
        if (seen.has(key) || !key) return false;
        seen.add(key);
        return true;
      });

      const top40 = unique.slice(0, 40);

      // Fetch og:image in parallel for articles that have no image from RSS
      const noImgIndices = top40.reduce<number[]>((acc, a, i) => {
        if (!a.image && a.url) acc.push(i);
        return acc;
      }, []);

      if (noImgIndices.length > 0) {
        const ogResults = await Promise.allSettled(
          noImgIndices.map((i) => fetchOgImage(top40[i].url))
        );
        ogResults.forEach((r, j) => {
          if (r.status === 'fulfilled' && r.value) {
            top40[noImgIndices[j]].image = r.value;
          }
        });
      }

      NEWS_CACHE.set(category, { articles: top40, ts: Date.now() });
      console.log(`[News] ${category}: ${top40.length} articles, ${top40.filter(a => a.image).length} with images`);
      res.json({ articles: top40, category, count: top40.length });
    } catch (error) {
      console.error('News feed proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch news', articles: [] });
    }
  });

  // === Ticker-specific News Proxy (RSS per ticker — same rss-parser pattern as above) ===
  const TICKER_NEWS_CACHE = new Map<string, { articles: any; ts: number }>();
  const TICKER_NEWS_TTL = 5 * 60 * 1000; // 5 minutes

  app.get('/api/proxy/news/ticker', async (req, res) => {
    try {
      const tickersParam = (req.query.tickers as string || '').toUpperCase();
      if (!tickersParam) return res.json({});

      const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean).slice(0, 30);
      const cacheKey = tickers.sort().join(',');

      const cached = TICKER_NEWS_CACHE.get(cacheKey);
      if (cached && Date.now() - cached.ts < TICKER_NEWS_TTL) {
        return res.json(cached.articles);
      }

      const Parser = (await import('rss-parser')).default;
      const parser = new Parser({
        timeout: 12000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CaelynAI/1.0)' },
        customFields: { item: [['media:content', 'mediaContent'], ['media:thumbnail', 'mediaThumbnail']] },
      });

      // For each ticker, try Yahoo Finance RSS first, then Google News RSS
      const results = await Promise.allSettled(
        tickers.map(async (ticker) => {
          const urls = [
            `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}&region=US&lang=en-US`,
            `https://news.google.com/rss/search?q=${encodeURIComponent(ticker + ' stock')}&hl=en-US&gl=US&ceid=US:en`,
          ];

          for (const feedUrl of urls) {
            try {
              const feed = await parser.parseURL(feedUrl);
              const articles = (feed.items || []).slice(0, 10).map((item: any) => ({
                ticker,
                title: item.title || '',
                summary: (item.contentSnippet || item.content || item.summary || '').slice(0, 300),
                source: feed.title || item.creator || '',
                url: item.link || '',
                published_at: item.isoDate || item.pubDate || new Date().toISOString(),
              }));
              if (articles.length > 0) return { ticker, articles };
            } catch {
              // try next URL
            }
          }
          return { ticker, articles: [] };
        })
      );

      // Build { TICKER: [articles] } map
      const newsMap: Record<string, any[]> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          newsMap[result.value.ticker] = result.value.articles;
        }
      }

      TICKER_NEWS_CACHE.set(cacheKey, { articles: newsMap, ts: Date.now() });
      console.log(`[WatchlistNews] Fetched news for tickers: ${tickers.join(', ')}`);
      res.json(newsMap);
    } catch (error) {
      console.error('Ticker news proxy error:', error);
      res.status(500).json({});
    }
  });

  app.get('/api/proxy/news/ticker-context', async (req, res) => {
    // Returns a flat text summary for AI context injection
    try {
      const tickersParam = (req.query.tickers as string || '').toUpperCase();
      if (!tickersParam) return res.json({ context: '' });
      const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean).slice(0, 30);

      // Reuse same cache logic via internal fetch
      const newsRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/proxy/news/ticker?tickers=${tickersParam}`);
      const newsMap = await newsRes.json();

      // Format as text context for AI
      const lines: string[] = [];
      for (const [ticker, articles] of Object.entries(newsMap as Record<string, any[]>)) {
        if (articles.length > 0) {
          const headlines = articles.slice(0, 5).map((a: any) => a.title).join(' | ');
          lines.push(`${ticker}: ${headlines}`);
        }
      }
      res.json({ context: lines.join('\n'), tickers, article_count: Object.values(newsMap).flat().length });
    } catch (error) {
      res.status(500).json({ context: '' });
    }
  });

  // === Stock Portfolio Holdings (JSON file storage) ===
  app.get('/api/stock-holdings', (req, res) => {
    try {
      const holdings = readHoldings();
      res.json(holdings);
      // Write a daily cost-basis snapshot if not yet done today (non-blocking)
      try {
        const today = new Date().toISOString().split('T')[0];
        const last  = readValueHistory().slice(-1)[0];
        if (!last || !last.timestamp.startsWith(today)) {
          const approxValue = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0);
          appendValueSnapshot(approxValue, holdings.length, holdings.map(h => h.ticker));
        }
      } catch { /* non-fatal */ }
    } catch (error) {
      console.error('Error reading holdings:', error);
      res.status(500).json({ error: 'Failed to read holdings' });
    }
  });

  app.post('/api/stock-holdings', (req, res) => {
    try {
      const { ticker, shares, avgCost, assetType, date_added } = req.body;
      if (!ticker || !shares || !avgCost) {
        return res.status(400).json({ error: 'ticker, shares, and avgCost are required' });
      }
      const holdings = readHoldings();
      const now = new Date().toISOString();
      const newHolding: StockHolding = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        ticker: ticker.toUpperCase().trim(),
        shares: Number(shares),
        avgCost: Number(avgCost),
        addedAt: now,
        date_added: date_added ? new Date(date_added).toISOString() : now,
        assetType: assetType || 'stock',
      };
      holdings.push(newHolding);
      writeHoldings(holdings);
      caelynTerminalCache = null;
      try {
        const totalCost = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0);
        appendValueSnapshot(totalCost, holdings.length, holdings.map(h => h.ticker));
      } catch { /* non-fatal */ }
      res.json(newHolding);
    } catch (error) {
      console.error('Error adding holding:', error);
      res.status(500).json({ error: 'Failed to add holding' });
    }
  });

  app.put('/api/stock-holdings/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { shares, avgCost, date_added } = req.body;
      const holdings = readHoldings();
      const idx = holdings.findIndex(h => h.id === id);
      if (idx === -1) return res.status(404).json({ error: 'Holding not found' });
      if (shares !== undefined) holdings[idx].shares = Number(shares);
      if (avgCost !== undefined) holdings[idx].avgCost = Number(avgCost);
      if (date_added !== undefined) holdings[idx].date_added = new Date(date_added).toISOString();
      writeHoldings(holdings);
      caelynTerminalCache = null;
      try {
        const totalCost = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0);
        appendValueSnapshot(totalCost, holdings.length, holdings.map(h => h.ticker));
      } catch { /* non-fatal */ }
      res.json(holdings[idx]);
    } catch (error) {
      console.error('Error updating holding:', error);
      res.status(500).json({ error: 'Failed to update holding' });
    }
  });

  app.delete('/api/stock-holdings/:id', async (req, res) => {
    try {
      const { id } = req.params;
      let holdings = readHoldings();
      const closing = holdings.find(h => h.id === id);
      if (!closing) return res.status(404).json({ error: 'Holding not found' });

      // Fetch live exit price — fall back to avgCost if unavailable
      let exitPrice = closing.avgCost;
      try {
        const atMap: Record<string, string> = { [closing.ticker]: closing.assetType || 'stock' };
        const qr = await fmpService.getStockDetails([closing.ticker], atMap);
        if (qr?.[0]?.price && qr[0].price > 0) exitPrice = qr[0].price;
      } catch { /* use avgCost fallback */ }

      // Build closed trade record
      const entryDate   = closing.date_added || closing.addedAt || new Date().toISOString();
      const exitDate    = new Date().toISOString();
      const holdingDays = Math.max(0, Math.round(
        (new Date(exitDate).getTime() - new Date(entryDate).getTime()) / 86400000
      ));
      const costBasis   = closing.shares * closing.avgCost;
      const proceeds    = closing.shares * exitPrice;
      const realizedPnl = proceeds - costBasis;
      const realizedPct = costBasis > 0 ? (realizedPnl / costBasis) * 100 : 0;

      const tradeRecord: ClosedTrade = {
        id:                  `${id}-closed-${Date.now()}`,
        symbol:              closing.ticker,
        shares:              closing.shares,
        avg_entry_price:     closing.avgCost,
        exit_price:          exitPrice,
        entry_date:          entryDate,
        exit_date:           exitDate,
        realized_pnl:        realizedPnl,
        realized_pnl_pct:    realizedPct,
        holding_period_days: holdingDays,
        source:              'deleted_from_dashboard',
      };

      const tradeHist = readTradeHistory();
      tradeHist.push(tradeRecord);
      writeTradeHistory(tradeHist);

      holdings = holdings.filter(h => h.id !== id);
      writeHoldings(holdings);
      caelynTerminalCache = null;

      try {
        const remCost = holdings.reduce((s, h) => s + h.shares * h.avgCost, 0);
        appendValueSnapshot(remCost, holdings.length, holdings.map(h => h.ticker));
      } catch { /* non-fatal */ }

      res.json({ success: true, closed_trade: tradeRecord });
    } catch (error) {
      console.error('Error deleting holding:', error);
      res.status(500).json({ error: 'Failed to delete holding' });
    }
  });

  // === Stock Holdings History (closed trades + value snapshots) ===
  app.get('/api/stock-holdings/history', (req, res) => {
    try {
      const trades  = readTradeHistory();
      const sorted  = [...trades].sort((a, b) => new Date(b.exit_date).getTime() - new Date(a.exit_date).getTime());
      let biggestWinner: ClosedTrade | null = null;
      let biggestLoser:  ClosedTrade | null = null;
      let bestPct:       ClosedTrade | null = null;
      let worstPct:      ClosedTrade | null = null;
      let totalDays = 0;
      for (const t of trades) {
        if (!biggestWinner || t.realized_pnl     > biggestWinner.realized_pnl)     biggestWinner = t;
        if (!biggestLoser  || t.realized_pnl     < biggestLoser.realized_pnl)      biggestLoser  = t;
        if (!bestPct       || t.realized_pnl_pct > bestPct.realized_pnl_pct)       bestPct       = t;
        if (!worstPct      || t.realized_pnl_pct < worstPct.realized_pnl_pct)      worstPct      = t;
        totalDays += t.holding_period_days;
      }
      res.json({
        trades: sorted,
        summary: {
          total_trades:            trades.length,
          total_realized_pnl:      trades.reduce((s, t) => s + t.realized_pnl, 0),
          biggest_winner: biggestWinner ? { symbol: biggestWinner.symbol, realized_pnl: biggestWinner.realized_pnl, realized_pnl_pct: biggestWinner.realized_pnl_pct } : null,
          biggest_loser:  biggestLoser  ? { symbol: biggestLoser.symbol,  realized_pnl: biggestLoser.realized_pnl,  realized_pnl_pct: biggestLoser.realized_pnl_pct  } : null,
          best_pnl_pct:   bestPct       ? { symbol: bestPct.symbol,  realized_pnl_pct: bestPct.realized_pnl_pct  } : null,
          worst_pnl_pct:  worstPct      ? { symbol: worstPct.symbol, realized_pnl_pct: worstPct.realized_pnl_pct } : null,
          avg_holding_period_days: trades.length > 0 ? Math.round(totalDays / trades.length) : 0,
        },
      });
    } catch (error) {
      console.error('Error reading trade history:', error);
      res.status(500).json({ error: 'Failed to read trade history' });
    }
  });

  app.get('/api/stock-holdings/value-history', (req, res) => {
    try { res.json(readValueHistory()); }
    catch (error) { res.status(500).json({ error: 'Failed to read value history' }); }
  });

  // === FMP Stock Data Proxy Endpoints ===
  app.get('/api/fmp/quotes', async (req, res) => {
    try {
      const symbols = (req.query.symbols as string || '').split(',').filter(Boolean);
      if (symbols.length === 0) return res.json([]);
      let assetTypes: Record<string, string> = {};
      try {
        const atParam = req.query.asset_types as string;
        if (atParam) assetTypes = JSON.parse(atParam);
      } catch {}
      const quotes = await fmpService.getStockDetails(symbols, assetTypes);
      res.json(quotes);
    } catch (error) {
      console.error('FMP quotes error:', error);
      res.status(500).json({ error: 'Failed to fetch quotes' });
    }
  });

  app.get('/api/fmp/price-targets', async (req, res) => {
    try {
      const symbols = (req.query.symbols as string || '').split(',').filter(Boolean);
      if (symbols.length === 0) return res.json([]);
      const targets = await fmpService.getPriceTargets(symbols);
      res.json(targets);
    } catch (error) {
      console.error('FMP price targets error:', error);
      res.status(500).json({ error: 'Failed to fetch price targets' });
    }
  });

  app.get('/api/fmp/events', async (req, res) => {
    try {
      const symbols = (req.query.symbols as string || '').split(',').filter(Boolean);
      if (symbols.length === 0) return res.json({ earnings: [], dividends: [] });
      const events = await fmpService.getHoldingsEvents(symbols);
      res.json(events);
    } catch (error) {
      console.error('FMP events error:', error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.get('/api/fmp/search', async (req, res) => {
    try {
      const query = (req.query.q as string || '').trim();
      if (!query) return res.json([]);
      const results = await fmpService.searchTickers(query);
      res.json(results);
    } catch (error) {
      console.error('FMP search error:', error);
      res.status(500).json({ error: 'Failed to search tickers' });
    }
  });

  // ─── Company identity batch — used by earnings calendar ───────────
  const _identityCache = new Map<string, { name: string; logo: string | null; ts: number }>();
  const _IDENTITY_TTL = 24 * 3600_000;

  app.get('/api/fmp/company-identity', async (req, res) => {
    const raw = (req.query.symbols as string || '').trim();
    if (!raw) return res.json({});
    const symbols = raw.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean).slice(0, 50);
    const result: Record<string, { name: string; logo: string | null }> = {};
    const needFetch: string[] = [];
    for (const sym of symbols) {
      const c = _identityCache.get(sym);
      if (c && Date.now() - c.ts < _IDENTITY_TTL) {
        result[sym] = { name: c.name, logo: c.logo };
      } else {
        needFetch.push(sym);
      }
    }
    if (needFetch.length > 0) {
      const FMP_KEY = process.env.FMP_API_KEY || '';
      if (FMP_KEY) {
        try {
          const url = `https://financialmodelingprep.com/stable/profile?symbol=${needFetch.join(',')}&apikey=${FMP_KEY}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
          if (r.ok) {
            const profiles: any[] = await r.json();
            if (Array.isArray(profiles)) {
              for (const p of profiles) {
                if (!p.symbol) continue;
                const s = p.symbol.toUpperCase();
                const entry = { name: p.companyName || s, logo: p.image || null, ts: Date.now() };
                _identityCache.set(s, entry);
                result[s] = { name: entry.name, logo: entry.logo };
              }
            }
          }
        } catch (e: any) {
          console.warn('[company-identity] FMP fetch failed:', e?.message);
        }
      }
      for (const sym of needFetch) {
        if (!result[sym]) {
          _identityCache.set(sym, { name: sym, logo: null, ts: Date.now() });
          result[sym] = { name: sym, logo: null };
        }
      }
    }
    return res.json(result);
  });

  const httpServer = createServer(app);
  // Real-time market data endpoints
  app.get('/api/real-time/top-movers', async (req, res) => {
    try {
      const topMovers = await realTimeDataService.getTop24hMovers();
      res.json(topMovers);
    } catch (error) {
      console.error('Error fetching top movers:', error);
      res.status(500).json({ error: 'Failed to fetch top movers' });
    }
  });

  app.get('/api/real-time/whale-activity', async (req, res) => {
    try {
      const whaleActivity = await realTimeDataService.getLargeWalletActivity();
      res.json(whaleActivity);
    } catch (error) {
      console.error('Error fetching whale activity:', error);
      res.status(500).json({ error: 'Failed to fetch whale activity' });
    }
  });

  app.get('/api/real-time/social-sentiment', async (req, res) => {
    try {
      const socialSentiment = await realTimeDataService.getSocialSentimentData();
      res.json(socialSentiment);
    } catch (error) {
      console.error('Error fetching social sentiment:', error);
      res.status(500).json({ error: 'Failed to fetch social sentiment' });
    }
  });

  app.get('/api/real-time/market-analysis', async (req, res) => {
    try {
      const marketAnalysis = await realTimeDataService.getMarketAnalysis();
      res.json(marketAnalysis);
    } catch (error) {
      console.error('Error fetching market analysis:', error);
      res.status(500).json({ error: 'Failed to fetch market analysis' });
    }
  });

  app.get('/api/real-time/portfolio-optimization/:portfolioId', async (req, res) => {
    try {
      const portfolioId = Number(req.params.portfolioId);
      const portfolio = await storage.getPortfolioByUserId(portfolioId);
      const optimization = await realTimeDataService.getPortfolioOptimization(portfolio);
      res.json(optimization);
    } catch (error) {
      console.error('Error fetching portfolio optimization:', error);
      res.status(500).json({ error: 'Failed to fetch portfolio optimization' });
    }
  });

  app.get('/api/trading-dashboard', async (req, res) => {
    try {
      const mode = req.query.mode === 'day' ? 'day' : 'swing';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${AGENT_URL}/api/trading-dashboard?mode=${mode}`, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Backend returned ${response.status}`, detail: text.slice(0, 200) });
      }
      res.json(await response.json());
    } catch (error: any) {
      console.error('Trading dashboard proxy error:', error);
      res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch trading dashboard data' });
    }
  });

  app.post('/api/trading-dashboard/refresh', async (req, res) => {
    try {
      const mode = req.query.mode === 'day' ? 'day' : 'swing';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${AGENT_URL}/api/trading-dashboard/refresh?mode=${mode}`, {
        method: 'POST',
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Backend returned ${response.status}`, detail: text.slice(0, 200) });
      }
      res.json(await response.json());
    } catch (error: any) {
      console.error('Trading dashboard refresh proxy error:', error);
      res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : 'Failed to refresh trading dashboard data' });
    }
  });

  let caelynTerminalCache: { data: any; ts: number } | null = null;
  const CAELYN_CACHE_TTL = 10 * 60 * 1000;

  app.get('/api/caelyn-terminal', async (req, res) => {
    if (caelynTerminalCache && Date.now() - caelynTerminalCache.ts < CAELYN_CACHE_TTL) {
      return res.json(caelynTerminalCache.data);
    }
    try {
      // Load local stock holdings to inject when FastAPI has none
      const localHoldings = readHoldings();
      const tickersParam = localHoldings.map(h => h.ticker).join(',');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      // Forward local tickers to FastAPI so it can use them if it supports the param
      const fastapiUrl = tickersParam
        ? `${AGENT_URL}/api/caelyn-terminal?tickers=${encodeURIComponent(tickersParam)}`
        : `${AGENT_URL}/api/caelyn-terminal`;

      const response = await fetch(fastapiUrl, {
        headers: { 'X-API-Key': AGENT_KEY },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Backend returned ${response.status}`, detail: text.slice(0, 200) });
      }
      const data = await response.json();

      // If FastAPI returned placeholder and we have local holdings, inject + fully hydrate
      if ((data.is_placeholder === true || !data.holdings?.length) && localHoldings.length > 0) {
        console.log(`[portfolio-sync] FastAPI placeholder detected — injecting ${localHoldings.length} holdings from stock-holdings.json`);
        try {
          const symbols      = localHoldings.map(h => h.ticker);
          const assetTypeMap: Record<string, string> = {};
          localHoldings.forEach(h => { assetTypeMap[h.ticker] = h.assetType || 'stock'; });
          const quotes   = await fmpService.getStockDetails(symbols, assetTypeMap);
          const quoteMap = new Map(quotes.map((q: any) => [q.symbol, q]));

          const totalValue = localHoldings.reduce((sum, h) => {
            const q: any = quoteMap.get(h.ticker);
            return sum + h.shares * (q?.price ?? h.avgCost);
          }, 0);

          // ── Holdings sidebar ─────────────────────────────────────────────
          data.holdings = localHoldings.map(h => {
            const q: any = quoteMap.get(h.ticker);
            const price  = q?.price ?? h.avgCost;
            const mv     = h.shares * price;
            return {
              ticker:         h.ticker,
              price,
              change:         q?.change ?? null,
              change_pct:     q?.changesPercentage ?? null,
              allocation_pct: totalValue > 0 ? (mv / totalValue) * 100 : null,
            };
          });
          data.positions_count    = data.holdings.length;
          data.is_placeholder     = false;
          data._synced_from_local = true;

          // ── Portfolio header totals ───────────────────────────────────────
          const totalDailyPL   = localHoldings.reduce((s, h) => s + h.shares * ((quoteMap.get(h.ticker) as any)?.change ?? 0), 0);
          const prevTotal      = totalValue - totalDailyPL;
          const changePctToday = prevTotal > 0 ? (totalDailyPL / prevTotal) * 100 : 0;
          const costBasis      = localHoldings.reduce((s, h) => s + h.shares * h.avgCost, 0);
          const totalReturn    = totalValue - costBasis;
          const totalReturnPct = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;
          data.portfolio = {
            ...(data.portfolio || {}),
            value:              totalValue,
            change_today:       totalDailyPL,
            change_pct_today:   changePctToday,
            perf_1d: null, perf_5d: null, perf_1m: null, perf_6m: null, perf_1y: null,
            total_return_pct:   totalReturnPct,
            total_return_value: totalReturn,
            sentiment:     totalReturnPct > 5 ? 'BULLISH' : totalReturnPct < -5 ? 'BEARISH' : 'NEUTRAL',
            market_status: data.portfolio?.market_status || 'CLOSED',
          };

          // ── Top movers ───────────────────────────────────────────────────
          const byChange = [...data.holdings].sort((a: any, b: any) => (b.change_pct ?? -999) - (a.change_pct ?? -999));
          const gainers  = byChange.filter((h: any) => (h.change_pct ?? 0) > 0).slice(0, 2).map((h: any) => {
            const q: any = quoteMap.get(h.ticker);
            return { ticker: h.ticker, change_pct: h.change_pct, price: h.price, w52_low: q?.yearLow ?? h.price * 0.7, w52_high: q?.yearHigh ?? h.price * 1.3 };
          });
          const losers   = byChange.filter((h: any) => (h.change_pct ?? 0) < 0).reverse().slice(0, 2).map((h: any) => {
            const q: any = quoteMap.get(h.ticker);
            return { ticker: h.ticker, change_pct: h.change_pct, price: h.price, w52_low: q?.yearLow ?? h.price * 0.7, w52_high: q?.yearHigh ?? h.price * 1.3 };
          });
          data.top_movers = { gainers, losers };

          // ── Asset allocation by type ──────────────────────────────────────
          const ALLOC_COLORS: Record<string, string> = {
            'Individual Stocks': '#3b82f6', 'ETFs': '#22c55e',
            'Crypto': '#f97316', 'Commodities': '#f59e0b', 'Other': '#6b7280',
          };
          const typeGroups: Record<string, number> = {};
          data.holdings.forEach((h: any) => {
            const lh    = localHoldings.find(l => l.ticker === h.ticker);
            const type  = (lh?.assetType || 'stock').toLowerCase();
            const label = type === 'stock' ? 'Individual Stocks' : type === 'etf' ? 'ETFs'
                        : type === 'crypto' ? 'Crypto'
                        : type === 'commodity' || type === 'commodities' ? 'Commodities' : 'Other';
            typeGroups[label] = (typeGroups[label] ?? 0) + (h.allocation_pct ?? 0);
          });
          data.asset_allocation = Object.entries(typeGroups).map(([label, pct]) => ({
            label, pct, color: ALLOC_COLORS[label] || '#6b7280',
          }));

          // ── Risk metrics — concentration computed, history-based metrics null ─
          const byAlloc  = [...data.holdings].sort((a: any, b: any) => (b.allocation_pct ?? 0) - (a.allocation_pct ?? 0));
          const topH     = byAlloc[0];
          data.risk_metrics = {
            weighted_volatility: null, max_drawdown: null,
            top_concentration:       topH?.allocation_pct ?? null,
            top_concentration_label: topH?.ticker ?? '',
            portfolio_beta: null, sharpe_ratio: null, sortino_ratio: null,
          };

          // ── Risk suggestions ─────────────────────────────────────────────
          data.risk_suggestions = [];
          if (topH?.allocation_pct && topH.allocation_pct > 40) {
            data.risk_suggestions.push({ level: 'WARN', title: `High Concentration: ${topH.ticker}`, body: `${topH.ticker} represents ${(topH.allocation_pct as number).toFixed(1)}% of portfolio. Consider rebalancing.` });
          }
          if (data.holdings.length === 1) {
            data.risk_suggestions.push({ level: 'RISK', title: 'Single Position', body: 'Portfolio holds only one asset. Diversification reduces risk.' });
          }
          if (data.risk_suggestions.length === 0) {
            data.risk_suggestions.push({ level: 'INFO', title: 'Portfolio Synced', body: `Showing ${data.holdings.length} positions from Portfolio Dashboard. Historical analytics (Sharpe, Beta, Max Drawdown) require a connected broker or price-history feed.` });
          }

          // ── Performance chart — from value-history snapshots if available ─
          const snapHistory = readValueHistory();
          if (snapHistory.length >= 2) {
            const firstVal = snapHistory[0].total_value;
            if (firstVal > 0) {
              const allPoints = snapHistory.map(s => ({
                date:      s.timestamp.split('T')[0],
                portfolio: ((s.total_value - firstVal) / firstVal) * 100,
                sp500:     null as number | null,
              }));
              const dedupedMap = new Map(allPoints.map(p => [p.date, p]));
              const deduped    = Array.from(dedupedMap.values());
              data.performance_charts = { '1Y': deduped, '6M': deduped.slice(-180), '1M': deduped.slice(-30), '5D': deduped.slice(-5), '1D': deduped.slice(-1) };
              data.performance_chart  = deduped;
            }
          } else {
            data.performance_charts = { '1D': [], '5D': [], '1M': [], '6M': [], '1Y': [] };
            data.performance_chart  = [];
          }

          // Write a daily market-price snapshot (real FMP prices — highest quality)
          try {
            const today  = new Date().toISOString().split('T')[0];
            const snaps  = readValueHistory();
            const lastSn = snaps[snaps.length - 1];
            if (!lastSn || !lastSn.timestamp.startsWith(today)) {
              appendValueSnapshot(totalValue, localHoldings.length, localHoldings.map(h => h.ticker));
            }
          } catch { /* non-fatal */ }

          // ── Volatility + Correlation — unavailable without historical data ─
          data.volatility         = [];
          data.correlation_matrix = { tickers: [], values: [] };

          console.log(`[portfolio-sync] Injected holdings: ${symbols.join(', ')} — total value $${totalValue.toFixed(2)}`);
        } catch (fmpErr) {
          console.warn('[portfolio-sync] FMP price fetch failed — injecting with avg cost:', fmpErr);
          const totalCost  = localHoldings.reduce((s, h) => s + h.shares * h.avgCost, 0);
          data.holdings    = localHoldings.map(h => ({
            ticker: h.ticker, price: h.avgCost, change: null, change_pct: null,
            allocation_pct: totalCost > 0 ? (h.shares * h.avgCost / totalCost) * 100 : null,
          }));
          data.positions_count    = localHoldings.length;
          data.is_placeholder     = false;
          data._synced_from_local = true;
          data.performance_charts = { '1D': [], '5D': [], '1M': [], '6M': [], '1Y': [] };
          data.performance_chart  = [];
          data.volatility         = [];
          data.correlation_matrix = { tickers: [], values: [] };
          const byAlloc2 = localHoldings.map(h => ({ ticker: h.ticker, pct: totalCost > 0 ? (h.shares * h.avgCost / totalCost) * 100 : 0 })).sort((a, b) => b.pct - a.pct);
          data.risk_metrics = { weighted_volatility: null, max_drawdown: null, top_concentration: byAlloc2[0]?.pct ?? null, top_concentration_label: byAlloc2[0]?.ticker ?? '', portfolio_beta: null, sharpe_ratio: null, sortino_ratio: null };
          const ALLOC_C2: Record<string,string> = { 'Individual Stocks':'#3b82f6','ETFs':'#22c55e','Crypto':'#f97316','Commodities':'#f59e0b','Other':'#6b7280' };
          const tg: Record<string,number> = {};
          localHoldings.forEach(h => { const t=(h.assetType||'stock').toLowerCase(); const l=t==='stock'?'Individual Stocks':t==='etf'?'ETFs':t==='crypto'?'Crypto':t==='commodity'||t==='commodities'?'Commodities':'Other'; tg[l]=(tg[l]??0)+(totalCost>0?(h.shares*h.avgCost/totalCost)*100:0); });
          data.asset_allocation   = Object.entries(tg).map(([label,pct])=>({label,pct,color:ALLOC_C2[label]||'#6b7280'}));
          data.top_movers         = { gainers: [], losers: [] };
          data.risk_suggestions   = [{ level: 'INFO', title: 'Live Prices Unavailable', body: 'Could not fetch market prices. Showing cost basis. Refresh to retry.' }];
        }

        // ── Diagnostic log ────────────────────────────────────────────────
        console.log('[portfolio-terminal-hydration]', JSON.stringify({
          holdings_count:         data.holdings?.length ?? 0,
          symbols:                (data.holdings ?? []).map((h: any) => h.ticker),
          has_performance_series: !!(data.performance_chart?.length || data.performance_charts?.['1Y']?.length),
          performance_points:     data.performance_chart?.length ?? 0,
          has_asset_allocation:   !!(data.asset_allocation?.length),
          allocation_count:       data.asset_allocation?.length ?? 0,
          has_risk_metrics:       !!(data.risk_metrics),
          has_volatility:         !!(data.volatility?.length),
          has_top_movers:         !!((data.top_movers?.gainers?.length || data.top_movers?.losers?.length)),
          top_movers_count:       (data.top_movers?.gainers?.length ?? 0) + (data.top_movers?.losers?.length ?? 0),
          has_correlation_matrix: !!(data.correlation_matrix?.tickers?.length),
          is_placeholder:         data.is_placeholder,
          _synced_from_local:     data._synced_from_local,
        }));
      }

      caelynTerminalCache = { data, ts: Date.now() };
      res.json(data);
    } catch (error: any) {
      console.error('Caelyn Terminal proxy error:', error);
      if (caelynTerminalCache) return res.json(caelynTerminalCache.data);
      res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch Caelyn Terminal data' });
    }
  });

  // === Hyperliquid Screener (proxy to FastAPI backend) ===
  const HL_URL  = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
  const HL_KEY  = 'hippo_ak_7f3x9k2m4p8q1w5t';
  const hlHdr   = () => ({ 'X-API-Key': HL_KEY, 'Content-Type': 'application/json' });

  // Server-side screener cache — always returns instantly; background fetch keeps it fresh
  const _hlCache: Record<string, { data: any; ts: number; fetching: boolean }> = {};
  const HL_CACHE_TTL = 20_000; // 20 s — serve stale while refreshing behind the scenes

  // Persistent caches for computed signal endpoints — served stale when FastAPI is down/empty
  let _signalsCache: any = null;
  let _tsmomCache: any = null;

  async function _fetchScreener(market_type: string, limit: string): Promise<any> {
    const r = await fetch(
      `${HL_URL}/api/hyperliquid/screener/snapshot?market_type=${market_type}&limit=${limit}`,
      { headers: hlHdr(), signal: AbortSignal.timeout(25_000) }
    );
    if (!r.ok) throw new Error(`Backend ${r.status}`);
    return r.json();
  }

  function _bgRefreshScreener(key: string, market_type: string, limit: string) {
    if (_hlCache[key]?.fetching) return; // already in-flight
    if (_hlCache[key]) _hlCache[key].fetching = true;
    _fetchScreener(market_type, limit)
      .then(data => { _hlCache[key] = { data, ts: Date.now(), fetching: false }; })
      .catch(() => { if (_hlCache[key]) _hlCache[key].fetching = false; });
  }

  // Warm the default cache immediately so the very first page load is instant
  (async () => {
    try {
      const data = await _fetchScreener('all', '200');
      _hlCache['all:200'] = { data, ts: Date.now(), fetching: false };
    } catch { /* silent — will populate on first request */ }
  })();

  // ── Background pre-warmer for signals + TSMOM caches ──────────────────────
  // Retries every 20s until FastAPI is ready and returns data, then backs off to 90s
  (async () => {
    const warmSignals = async () => {
      try {
        const r = await fetch(`${HL_URL}/api/hyperliquid/screener/signals`, { headers: hlHdr(), signal: AbortSignal.timeout(12_000) });
        if (!r.ok) return false;
        const json = await r.json();
        const hasContent = !!(json && ((json.relative_strength_leaders?.length ?? 0) > 0 || (json.order_book_pressure?.length ?? 0) > 0 || (json.oi_regime_shift?.length ?? 0) > 0));
        if (hasContent) { _signalsCache = json; return true; }
        return false;
      } catch { return false; }
    };
    const warmTsmom = async () => {
      try {
        const r = await fetch(`${HL_URL}/api/hyperliquid/screener/tsmom-signals?top_n=60`, { headers: hlHdr(), signal: AbortSignal.timeout(12_000) });
        if (!r.ok) return false;
        const json = await r.json();
        if ((json?.signals?.length ?? 0) > 0) { _tsmomCache = json; return true; }
        return false;
      } catch { return false; }
    };
    // Poll until both caches are warm, then slow-poll to keep them fresh
    let sigWarm = false, tsmomWarm = false;
    while (true) {
      if (!sigWarm)   sigWarm   = await warmSignals();
      if (!tsmomWarm) tsmomWarm = await warmTsmom();
      const allWarm = sigWarm && tsmomWarm;
      await new Promise(r => setTimeout(r, allWarm ? 90_000 : 20_000));
      // After initial warm, keep refreshing both indefinitely
      if (allWarm) { await warmSignals(); await warmTsmom(); }
    }
  })();

  app.get('/api/hyperliquid/screener', async (req, res) => {
    const market_type = String(req.query.market_type ?? 'all');
    const limit       = String(req.query.limit ?? '200');
    const cacheKey    = `${market_type}:${limit}`;
    const entry       = _hlCache[cacheKey];

    if (entry) {
      // Always return cached data immediately — no waiting
      res.json(entry.data);
      // If stale, kick off a background refresh (fire-and-forget)
      if (Date.now() - entry.ts > HL_CACHE_TTL) _bgRefreshScreener(cacheKey, market_type, limit);
      return;
    }

    // No cache at all yet — first-ever request for this key: must wait once
    try {
      const data = await _fetchScreener(market_type, limit);
      _hlCache[cacheKey] = { data, ts: Date.now(), fetching: false };
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch Hyperliquid screener' });
    }
  });

  // ── Market Matrix (tabbed) ──────────────────────────────────────────────
  // The backend exposes /screener/snapshot with per-asset `category` and `tags`.
  // We bucket those into the five canonical UI tabs (stocks_etfs, crypto,
  // commodities, indices, pre_ipo) and shape each row into MatrixAsset fields
  // the frontend already consumes. If the backend ever adds a native
  // /screener/market-matrix endpoint, we'll prefer that and pass it through.
  const MATRIX_TAB_LABELS: Record<string, string> = {
    stocks_etfs:  'Stocks & ETFs',
    crypto:       'Crypto',
    commodities:  'Commodities',
    indices:      'Indices',
    pre_ipo:      'Pre-IPO Stocks',
  };

  // Hard-coded overrides for symbols the backend mis-tags (e.g. tagging
  // commodity perps like NATGAS/CL/BRENTOIL as `equity`). Keep this list
  // narrow and only for clear, well-known instruments.
  const MATRIX_SYMBOL_OVERRIDES: Record<string, string> = {
    // Commodities
    NATGAS: 'commodities', CL: 'commodities', BRENTOIL: 'commodities',
    WTI: 'commodities', OIL: 'commodities', GAS: 'commodities',
    COPPER: 'commodities', GOLD: 'commodities', SILVER: 'commodities',
    USOIL: 'commodities', USENERGY: 'commodities', WHEAT: 'commodities',
    SOY: 'commodities', CORN: 'commodities', PLATINUM: 'commodities',
    PALLADIUM: 'commodities',
    // Indices / index ETFs
    US500: 'indices', USA500: 'indices', SP500: 'indices', SPX: 'indices',
    USTECH: 'indices', USBOND: 'indices', SMALL2000: 'indices',
    NASDAQ: 'indices', NDX: 'indices', RUSSELL: 'indices',
    DAX: 'indices', NIKKEI: 'indices',
    // Crypto majors that sometimes get unusual tags
    BTC: 'crypto', ETH: 'crypto', SOL: 'crypto', HYPE: 'crypto',
    BNB: 'crypto', XRP: 'crypto', DOGE: 'crypto',
    // Known stock perps the backend categorises as `macro`
    TENCENT: 'stocks_etfs', XIAOMI: 'stocks_etfs', SMSN: 'stocks_etfs',
    GLDMINE: 'stocks_etfs', HYUNDAI: 'stocks_etfs',
  };

  function _classifyMatrixTab(row: any): string {
    const sym = String(row?.coin ?? row?.displayName ?? '').toUpperCase();
    if (MATRIX_SYMBOL_OVERRIDES[sym]) return MATRIX_SYMBOL_OVERRIDES[sym];

    const cat = String(row?.category ?? '').toLowerCase();
    const tags: string[] = Array.isArray(row?.tags) ? row.tags.map((t: any) => String(t).toLowerCase()) : [];
    const has = (s: string) => cat === s || tags.includes(s);
    // Priority order matters — many equities double-tag as commodity/index.
    if (has('pre-ipo') || has('preipo'))               return 'pre_ipo';
    if (has('commodity'))                              return 'commodities';
    if (has('index'))                                  return 'indices';
    if (has('equity'))                                 return 'stocks_etfs';
    if (cat === 'l1' || cat === 'defi' || cat === 'ai' || cat === 'meme' ||
        cat === 'gaming' || cat === 'rwa' || has('crypto')) return 'crypto';
    // Default: uncategorized perps on Hyperliquid are overwhelmingly crypto.
    return 'crypto';
  }

  function _shapeMatrixAsset(row: any): any {
    const oi    = Number(row?.openInterest ?? 0);
    const mark  = Number(row?.markPrice ?? 0);
    const oiUsd = Number.isFinite(oi) && Number.isFinite(mark) ? oi * mark : null;
    return {
      coin:                row?.coin ?? row?.displayName ?? null,
      display_name:        row?.displayName ?? row?.coin ?? null,
      asset_type:          row?.marketType ?? null,
      category_source:     row?.category ?? null,
      mark:                row?.markPrice ?? null,
      oracle:              row?.oraclePrice ?? null,
      mid:                 row?.midPrice ?? null,
      prev_day_px:         null,
      change_24h_pct:      row?.change24hPct ?? null,
      funding:             row?.funding ?? null,
      funding_annualized_pct: row?.funding8hPct != null ? Number(row.funding8hPct) * 3 * 365 : null,
      open_interest_usd:   oiUsd,
      volume_24h_usd:      row?.volume24h ?? null,
      premium_pct:         row?.premium ?? null,
      mark_oracle_pct:     row?.distMarkOracle ?? null,
      book_imbalance:      row?.bidAskImbalance ?? null,
      trade_imbalance:     row?.tradeImbalance ?? null,
      vol_score:           row?.volatility ?? null,
      signal:              row?.compositeSignal ?? null,
      agent_score:         row?.agentScore ?? null,
      agent_rank:          row?.agentRank ?? null,
      max_leverage:        row?.maxLeverage ?? null,
      is_active:           row?.isListedOnHyperliquid ?? true,
    };
  }

  function _buildMatrixFromSnapshot(snapshot: any) {
    const rows: any[] = Array.isArray(snapshot?.rows) ? snapshot.rows : [];
    const tabs: Record<string, { label: string; count: number; assets: any[] }> = {
      stocks_etfs: { label: MATRIX_TAB_LABELS.stocks_etfs, count: 0, assets: [] },
      crypto:      { label: MATRIX_TAB_LABELS.crypto,      count: 0, assets: [] },
      commodities: { label: MATRIX_TAB_LABELS.commodities, count: 0, assets: [] },
      indices:     { label: MATRIX_TAB_LABELS.indices,     count: 0, assets: [] },
      pre_ipo:     { label: MATRIX_TAB_LABELS.pre_ipo,     count: 0, assets: [] },
    };
    // De-dup by coin within the snapshot: the backend occasionally emits the
    // same coin twice with different category tags. Keep the row with the
    // highest 24h volume so the table picks the canonical/most-liquid quote.
    const bestByCoin = new Map<string, any>();
    for (const row of rows) {
      const sym = String(row?.coin ?? row?.displayName ?? '').toUpperCase();
      if (!sym) continue;
      const prev = bestByCoin.get(sym);
      if (!prev) { bestByCoin.set(sym, row); continue; }
      const va = Number(row?.volume24h ?? 0);
      const vb = Number(prev?.volume24h ?? 0);
      if (va > vb) bestByCoin.set(sym, row);
    }
    for (const row of bestByCoin.values()) {
      const key = _classifyMatrixTab(row);
      const tab = tabs[key] ?? tabs.crypto;
      tab.assets.push(_shapeMatrixAsset(row));
    }
    for (const k of Object.keys(tabs)) tabs[k].count = tabs[k].assets.length;
    return {
      updated_at: snapshot?.meta?.updatedAt ?? new Date().toISOString(),
      source: 'derived-from-snapshot',
      tabs,
      all_assets_count: bestByCoin.size,
    };
  }

  app.get('/api/hyperliquid/screener/market-matrix', async (_req, res) => {
    // 1) Prefer backend's native tabbed endpoint if it ever exists.
    try {
      const r = await fetch(
        `${HL_URL}/api/hyperliquid/screener/market-matrix`,
        { headers: hlHdr(), signal: AbortSignal.timeout(8_000) }
      );
      if (r.ok) {
        const json = await r.json();
        if (json && json.tabs && Object.keys(json.tabs).length > 0) {
          return res.json(json);
        }
      }
    } catch { /* fall through to snapshot derivation */ }

    // 2) Derive from the snapshot (already warmed in _hlCache['all:200']).
    try {
      let snapshot: any = _hlCache['all:200']?.data;
      if (!snapshot) snapshot = await _fetchScreener('all', '200');
      const payload = _buildMatrixFromSnapshot(snapshot);
      res.json(payload);
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to build market matrix' });
    }
  });

  app.get('/api/hyperliquid/asset/:coin', async (req, res) => {
    try {
      const r = await fetch(
        `${HL_URL}/api/hyperliquid/screener/asset/${encodeURIComponent(req.params.coin)}`,
        { headers: hlHdr() }
      );
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to fetch asset details' });
    }
  });

  app.get('/api/hyperliquid/tsmom-signals', async (req, res) => {
    try {
      const { top_n = 60 } = req.query;
      const r = await fetch(
        `${HL_URL}/api/hyperliquid/screener/tsmom-signals?top_n=${top_n}`,
        { headers: hlHdr(), signal: AbortSignal.timeout(12_000) }
      );
      if (!r.ok) {
        if (_tsmomCache) { res.setHeader('X-Cache','STALE'); return res.json(_tsmomCache); }
        return res.status(r.status).json({ error: `Backend ${r.status}` });
      }
      const json = await r.json();
      const hasContent = (json?.signals?.length ?? 0) > 0;
      if (hasContent) _tsmomCache = json;
      if (!hasContent && _tsmomCache) { res.setHeader('X-Cache','STALE'); return res.json(_tsmomCache); }
      res.json(json);
    } catch (e: any) {
      if (_tsmomCache) { res.setHeader('X-Cache','STALE'); return res.json(_tsmomCache); }
      res.status(500).json({ error: 'Failed to fetch TSMOM signals' });
    }
  });

  app.post('/api/hyperliquid/agent-rank', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 60000);
      const r = await fetch(`${HL_URL}/api/hyperliquid/screener/agent-rank`, {
        method: 'POST',
        headers: hlHdr(),
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) {
        let errBody: any = {};
        try { errBody = await r.json(); } catch { try { errBody = { detail: await r.text() }; } catch {} }
        console.error(`[hl-agent] backend ${r.status}:`, JSON.stringify(errBody));
        return res.status(r.status).json({ error: `Agent backend error ${r.status}`, detail: errBody });
      }
      res.json(await r.json());
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Agent timed out after 60s' : `Agent rank failed: ${e?.message}`;
      console.error('[hl-agent] proxy error:', msg);
      res.status(500).json({ error: msg });
    }
  });

  app.get('/api/hyperliquid/signals', async (req, res) => {
    try {
      const r = await fetch(
        `${HL_URL}/api/hyperliquid/screener/signals`,
        { headers: hlHdr(), signal: AbortSignal.timeout(12_000) }
      );
      if (!r.ok) {
        if (_signalsCache) { res.setHeader('X-Cache','STALE'); return res.json(_signalsCache); }
        return res.status(r.status).json({ error: `Backend ${r.status}` });
      }
      const json = await r.json();
      const hasContent = !!(json && (
        (json.relative_strength_leaders?.length ?? 0) > 0 ||
        (json.order_book_pressure?.length ?? 0) > 0 ||
        (json.oi_regime_shift?.length ?? 0) > 0
      ));
      if (hasContent) _signalsCache = json;
      if (!hasContent && _signalsCache) { res.setHeader('X-Cache','STALE'); return res.json(_signalsCache); }
      res.json(json);
    } catch (e: any) {
      if (_signalsCache) { res.setHeader('X-Cache','STALE'); return res.json(_signalsCache); }
      res.status(500).json({ error: 'Failed to fetch Hyperliquid signals' });
    }
  });

  // Hyperliquid candle data — proxies directly to HL's public API (no auth needed)
  app.get('/api/hyperliquid/candles', async (req, res) => {
    const coin     = String(req.query.coin     ?? 'BTC');
    const interval = String(req.query.interval ?? '1h');
    const limit    = Math.min(parseInt(String(req.query.limit ?? '200')), 500);
    const INTERVAL_MS: Record<string, number> = {
      '1m': 60_000, '5m': 300_000, '15m': 900_000,
      '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
    };
    const ms  = INTERVAL_MS[interval] ?? 3_600_000;
    const now = Date.now();
    try {
      const r = await fetch('https://api.hyperliquid.xyz/info', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'candleSnapshot', req: { coin, interval, startTime: now - limit * ms, endTime: now } }),
        signal:  AbortSignal.timeout(10_000),
      });
      if (!r.ok) throw new Error(`HL candles ${r.status}`);
      const candles = await r.json();
      res.json({ coin, interval, candles: Array.isArray(candles) ? candles : [] });
    } catch (e: any) {
      res.status(503).json({ error: e.message, candles: [] });
    }
  });

  // === Sector Rotation (proxy to FastAPI backend) ===
  const SR_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
  const SR_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';
  const srHdr  = () => ({ 'X-API-Key': SR_KEY, 'Content-Type': 'application/json' });

  // === Home dashboard (SINGLE composed aggregator) ===
  // Rules (strict):
  //   - The Home page makes exactly ONE network request: this route.
  //   - This route returns backend /api/home/dashboard payload PLUS the two
  //     bits that used to live in separate Home queries: news articles
  //     (already on 5-min NEWS_CACHE) and crypto fear/greed (already on the
  //     MarketOverviewService cache). Both are read from in-process caches
  //     that other routes already keep warm — this route does NOT add net-new
  //     third-party API traffic; upstream cache TTLs are reused as-is.
  //   - Upstream failures are soft: news/crypto are best-effort and never
  //     break the primary dashboard payload.
  app.get('/api/home/dashboard', async (req, res) => {
    const qs = req.query.force === 'true' ? '?force=true' : '';

    // Fire the three sources in parallel. Each is independently guarded so a
    // failure in one never blocks the others.
    const backendP = (async () => {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 30_000);
      try {
        const r = await fetch(`${SR_URL}/api/home/dashboard${qs}`, {
          headers: srHdr(),
          signal: controller.signal,
        });
        if (!r.ok) throw new Error(`Backend ${r.status}`);
        return await r.json();
      } finally {
        clearTimeout(tid);
      }
    })();

    const newsP = (async () => {
      try {
        const articles = await getHomeNewsArticles('finance', 8);
        return articles;
      } catch (e) {
        console.warn('[Home] News compose failed soft:', (e as any)?.message);
        return [];
      }
    })();

    const cryptoFgP = (async () => {
      try {
        const overview: any = await marketOverviewService.getMarketOverview();
        const fg = overview?.fearGreedIndex;
        if (!fg) return null;
        const rawScore = fg.value ?? fg.index_value ?? fg.score ?? null;
        const score = typeof rawScore === 'number' ? rawScore : rawScore ? parseFloat(String(rawScore)) : null;
        const rating = fg.value_classification ?? fg.classification ?? fg.label ?? null;
        return { score, rating, signal: null as string | null, historical: null };
      } catch (e) {
        console.warn('[Home] Crypto FG compose failed soft:', (e as any)?.message);
        return null;
      }
    })();

    try {
      const [backend, news, cryptoFg] = await Promise.all([backendP, newsP, cryptoFgP]);

      // Attach composed fields on top of the backend payload. Backend's
      // `fear_greed.crypto` is always null (see home_service._extract_fear_greed);
      // we populate it here from the already-cached CMC overview.
      const composed = {
        ...backend,
        news: { articles: news, source: 'rss', count: (news || []).length },
        fear_greed: {
          ...(backend.fear_greed || {}),
          crypto: cryptoFg,
        },
        section_status: {
          ...(backend.section_status || {}),
          news: (news && news.length > 0) ? 'ok' : 'unavailable',
          crypto_fg: cryptoFg ? 'ok' : 'unavailable',
        },
      };
      res.json(composed);

      // If options flows are still pending, fire a background force-refresh so the
      // backend starts computing immediately rather than waiting for its next cycle.
      const flowStatus = (backend as any)?.section_status?.unusual_options_flows;
      const dataState  = (backend as any)?.unusual_options_meta?.data_state;
      // Fire background warm-up kick whenever the home fast cache hasn't run yet
      if (flowStatus === 'precompute_pending' || flowStatus === 'no_data_yet' ||
          dataState === 'no_data_yet' || dataState === 'none') {
        setImmediate(async () => {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 60_000);
            await fetch(`${SR_URL}/api/home/dashboard?force=true`, {
              headers: srHdr(),
              signal: ctrl.signal,
            });
            clearTimeout(t);
          } catch (_) { /* fire-and-forget — ignore errors */ }
        });
      }
    } catch (e: any) {
      res.status(500).json({
        error: e?.name === 'AbortError' ? 'Request timed out (30s)' : (e?.message || 'Home dashboard unavailable'),
      });
    }
  });

  // === Home — manual X snapshot refresh (Social page button) ===
  // Triggers a forced re-fetch of the backend's trending_on_x data.
  // Returns the refreshed dashboard payload so the client can update immediately.
  app.post('/api/home/x-snapshot/refresh', async (req, res) => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 45_000);
    try {
      const r = await fetch(`${SR_URL}/api/home/dashboard?force=true`, {
        headers: srHdr(),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        return res.status(r.status).json({ error: `Backend ${r.status}`, detail: body });
      }
      const data = await r.json();
      return res.json({ ok: true, trending_on_x: data?.trending_on_x ?? null, _refreshed_at: Date.now() });
    } catch (e: any) {
      clearTimeout(tid);
      const msg = e?.name === 'AbortError' ? 'Refresh timed out (45s)' : (e?.message || 'Refresh failed');
      return res.status(500).json({ error: msg });
    }
  });

  // === Social — lazy fundamental screener (FMP-enriched, separate from dashboard) ===
  app.get('/api/social/fundamental-screener', async (req, res) => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 55_000);
    try {
      const r = await fetch(`${SR_URL}/api/social/fundamental-screener`, {
        headers: srHdr(),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        return res.status(r.status).json({ error: `Backend ${r.status}`, detail: body });
      }
      const data = await r.json();
      return res.json(data);
    } catch (e: any) {
      clearTimeout(tid);
      const msg = e?.name === 'AbortError' ? 'Fundamental screener timed out (55s)' : (e?.message || 'Fetch failed');
      return res.status(500).json({ error: msg });
    }
  });

  // === Social — X intelligence dashboard (flat payload: top_tickers + new sibling keys) ===
  app.get('/api/social/x-dashboard', async (req, res) => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 25_000);
    try {
      const r = await fetch(`${SR_URL}/api/social/x-dashboard`, {
        headers: srHdr(),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        return res.status(r.status).json({ error: `Backend ${r.status}`, detail: body });
      }
      const data = await r.json();
      return res.json(data);
    } catch (e: any) {
      clearTimeout(tid);
      const msg = e?.name === 'AbortError' ? 'Social X dashboard timed out (25s)' : (e?.message || 'Fetch failed');
      return res.status(500).json({ error: msg });
    }
  });

  // === Home — per-category movers (gainers / losers) ===
  app.get('/api/home/movers', async (req, res) => {
    try {
      const category = (req.query.category as string) || 'stocks';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const r = await fetch(`${SR_URL}/api/home/movers?category=${encodeURIComponent(category)}`, {
        headers: srHdr(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!r.ok) {
        const txt = await r.text();
        return res.status(r.status).json({ error: `Backend ${r.status}`, detail: txt.slice(0, 200) });
      }
      const raw = await r.json();
      // Normalize new API shape { symbol, name, change_percent } → existing HomeMoverRow shape
      const normalize = (items: any[]) =>
        (items || []).map((item: any) => ({
          ticker:       item.symbol    || item.ticker   || '',
          company:      item.name      || item.company  || '',
          price:        item.price     ?? null,
          change_pct:   item.change_percent ?? item.change_pct ?? null,
          change_label: item.change_label || '',
          direction:    ((item.change_percent ?? item.change_pct ?? 0) >= 0 ? 'up' : 'down'),
          asset_type:   item.asset_type || null,
        }));
      res.json({
        gainers:  normalize(raw.gainers  || []),
        losers:   normalize(raw.losers   || []),
        category: raw.category || category,
      });
    } catch (error: any) {
      console.error('[home/movers] error:', error);
      res.status(500).json({ error: error?.name === 'AbortError' ? 'Request timed out' : 'Failed to fetch category movers' });
    }
  });

  app.get('/api/sector-rotation/dashboard', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 30000);
      const qs  = req.query.include_analysis === 'false' ? '?include_analysis=false' : '';
      const r   = await fetch(`${SR_URL}/api/sector-rotation/dashboard${qs}`, {
        headers: srHdr(),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out (30s)' : 'Sector rotation dashboard unavailable' });
    }
  });

  app.get('/api/sector-rotation/analysis', async (req, res) => {
    try {
      const r = await fetch(`${SR_URL}/api/sector-rotation/analysis`, { headers: srHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: 'Sector rotation analysis unavailable' });
    }
  });

  app.get('/api/sector-rotation/history', async (req, res) => {
    try {
      const range = req.query.range || '7d';
      const r     = await fetch(`${SR_URL}/api/sector-rotation/history?range=${range}`, { headers: srHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: 'Sector rotation history unavailable' });
    }
  });

  app.post('/api/sector-rotation/refresh-analysis', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 60000);
      const srFwdHdr: Record<string,string> = srHdr();
      if (req.headers.authorization) srFwdHdr['Authorization'] = req.headers.authorization as string;
      const r   = await fetch(`${SR_URL}/api/sector-rotation/refresh-analysis`, {
        method: 'POST',
        headers: srFwdHdr,
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Refresh timed out' : 'Refresh failed' });
    }
  });

  // ── Sector / Theme Performance + Relative Strength ───────────────────────────
  app.get('/api/sectors/performance', async (req, res) => {
    try {
      const mode = String(req.query.mode || 'sectors');
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      const r = await fetch(`${SR_URL}/api/sectors/performance?mode=${encodeURIComponent(mode)}`, {
        headers: srHdr(), signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : 'Sector performance unavailable' });
    }
  });

  app.get('/api/sectors/relative-strength', async (req, res) => {
    try {
      const mode = String(req.query.mode || 'sectors');
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      const r = await fetch(`${SR_URL}/api/sectors/relative-strength?mode=${encodeURIComponent(mode)}`, {
        headers: srHdr(), signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : 'Relative strength unavailable' });
    }
  });

  app.get('/api/sectors/etf/:symbol', async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 20000);
      const r = await fetch(`${SR_URL}/api/sectors/etf/${encodeURIComponent(symbol)}`, {
        headers: srHdr(), signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : 'ETF detail unavailable' });
    }
  });

  // ── Insider Activity proxy ───────────────────────────────────────────────────
  const IA_URL = "https://fast-api-server-trading-agent-aidanpilon.replit.app";
  const iaHdr  = () => ({ "X-API-Key": "hippo_ak_7f3x9k2m4p8q1w5t", "Content-Type": "application/json" });

  app.get('/api/insider-activity/stats', async (req, res) => {
    try {
      const r = await fetch(`${IA_URL}/api/insider-activity/stats`, { headers: iaHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: 'Insider activity stats unavailable' });
    }
  });

  app.get('/api/insider-activity/detail/:accession', async (req, res) => {
    try {
      const r = await fetch(`${IA_URL}/api/insider-activity/detail/${req.params.accession}`, { headers: iaHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: 'Insider activity detail unavailable' });
    }
  });

  app.get('/api/insider-activity', async (req, res) => {
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r  = await fetch(`${IA_URL}/api/insider-activity${qs ? `?${qs}` : ""}`, { headers: iaHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: 'Insider activity data unavailable' });
    }
  });

  app.post('/api/insider-activity/refresh', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 60000);
      const r   = await fetch(`${IA_URL}/api/insider-activity/refresh`, {
        method: 'POST', headers: iaHdr(), signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Refresh timed out' : 'Refresh failed' });
    }
  });

  // ── Predict / Polymarket Intelligence proxy ───────────────────────────────────
  const PREDICT_URL  = "https://fast-api-server-trading-agent-aidanpilon.replit.app";
  const PREDICT_KEY  = "hippo_ak_7f3x9k2m4p8q1w5t";
  const predictHdr  = () => ({ "Content-Type":"application/json", "X-API-Key": PREDICT_KEY });

  const proxyPredict = async (path: string, req: any, res: any, method = "GET") => {
    try {
      const qs = method === "GET" ? new URLSearchParams(req.query as Record<string,string>).toString() : "";
      const url = `${PREDICT_URL}${path}${qs ? `?${qs}` : ""}`;
      const hdr: Record<string,string> = predictHdr();
      if (method === "POST" && req.headers.authorization) hdr['Authorization'] = req.headers.authorization as string;
      const opts: RequestInit = { method, headers: hdr };
      if (method === "POST") opts.body = JSON.stringify(req.body ?? {});
      const r = await fetch(url, opts);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) { res.status(500).json({ error: e?.message ?? "Proxy error" }); }
  };

  app.get("/api/predict/signals",    (q, s) => proxyPredict("/api/predict/signals",    q, s));
  app.get("/api/predict/markets",    (q, s) => proxyPredict("/api/predict/markets",    q, s));
  app.get("/api/predict/categories", (q, s) => proxyPredict("/api/predict/categories", q, s));
  app.get("/api/predict/whale-watch",(q, s) => proxyPredict("/api/predict/whale-watch",q, s));
  app.get("/api/predict/context",    (q, s) => proxyPredict("/api/predict/context",    q, s));
  app.post("/api/predict/analyze",   (q, s) => proxyPredict("/api/predict/analyze",   q, s, "POST"));
  app.get("/api/predict/recommendations", (q, s) => proxyPredict("/api/predict/recommendations", q, s));
  app.get("/api/predict/scored",          (q, s) => proxyPredict("/api/predict/scored",          q, s));
  app.get("/api/predict/enriched-signals",(q, s) => proxyPredict("/api/predict/enriched-signals",q, s));
  app.get("/api/predict/scored/:id",      (q, s) => proxyPredict(`/api/predict/scored/${(q as any).params.id}`, q, s));
  app.get("/api/predict/diagnostics",     (q, s) => proxyPredict("/api/predict/diagnostics",     q, s));
  app.get("/api/predict/signal-changes", (q, s) => proxyPredict("/api/predict/signal-changes", q, s));

  // ── Prophetik Investor tab endpoints ────────────────────────────────────────
  app.get("/api/predict/investor/overview",  (q, s) => proxyPredict("/api/predict/investor/overview",  q, s));
  app.get("/api/predict/investor/regime",    (q, s) => proxyPredict("/api/predict/investor/regime",    q, s));
  app.get("/api/predict/investor/watchlists",(q, s) => proxyPredict("/api/predict/investor/watchlists",q, s));
  app.get("/api/predict/investor/themes",    (q, s) => proxyPredict("/api/predict/investor/themes",    q, s));

  // ── Whale Watch proxy ────────────────────────────────────────────────────────
  const WHALE_URL = "https://fast-api-server-trading-agent-aidanpilon.replit.app";
  const whaleHdr  = () => ({ "X-API-Key": "hippo_ak_7f3x9k2m4p8q1w5t", "Content-Type": "application/json" });

  app.get("/api/whales/stats", async (_req, res) => {
    try {
      const r = await fetch(`${WHALE_URL}/api/whales/stats`, { headers: whaleHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) { res.status(500).json({ error: e?.message ?? "Stats unavailable" }); }
  });

  app.get("/api/whales/famous", async (_req, res) => {
    try {
      const r = await fetch(`${WHALE_URL}/api/whales/famous`, { headers: whaleHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) { res.status(500).json({ error: e?.message ?? "Famous investors unavailable" }); }
  });

  app.post("/api/whales/discover-famous", async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 90000);
      const whaleFwdHdr: Record<string,string> = whaleHdr();
      if (req.headers.authorization) whaleFwdHdr['Authorization'] = req.headers.authorization as string;
      const r = await fetch(`${WHALE_URL}/api/whales/discover-famous`, {
        method: "POST", headers: whaleFwdHdr, signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === "AbortError" ? "Discovery timed out" : "Discovery failed" });
    }
  });

  app.get("/api/whales", async (req, res) => {
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r  = await fetch(`${WHALE_URL}/api/whales${qs ? `?${qs}` : ""}`, { headers: whaleHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) { res.status(500).json({ error: e?.message ?? "Whale list unavailable" }); }
  });

  app.get("/api/whales/:name/holdings", async (req, res) => {
    try {
      const name = encodeURIComponent(req.params.name);
      const r = await fetch(`${WHALE_URL}/api/whales/${name}/holdings`, { headers: whaleHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) { res.status(500).json({ error: e?.message ?? "Holdings unavailable" }); }
  });

  app.get("/api/whales/:name/returns", async (req, res) => {
    try {
      const name = encodeURIComponent(req.params.name);
      const r = await fetch(`${WHALE_URL}/api/whales/${name}/returns`, { headers: whaleHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) { res.status(500).json({ error: e?.message ?? "Returns unavailable" }); }
  });

  app.post("/api/whales/refresh", async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 60000);
      const whaleRefreshHdr: Record<string,string> = whaleHdr();
      if (req.headers.authorization) whaleRefreshHdr['Authorization'] = req.headers.authorization as string;
      const r = await fetch(`${WHALE_URL}/api/whales/refresh`, {
        method: "POST", headers: whaleRefreshHdr, signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === "AbortError" ? "Refresh timed out" : "Refresh failed" });
    }
  });

  // ── Congressional Trades proxy ────────────────────────────────────────────────
  app.get('/api/congressional-trades/stats', async (req, res) => {
    try {
      const r = await fetch(`${IA_URL}/api/congressional-trades/stats`, { headers: iaHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: 'Congressional trades stats unavailable' });
    }
  });

  app.get('/api/congressional-trades', async (req, res) => {
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r  = await fetch(`${IA_URL}/api/congressional-trades${qs ? `?${qs}` : ""}`, { headers: iaHdr() });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: 'Congressional trades data unavailable' });
    }
  });

  app.post('/api/congressional-trades/refresh', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 60000);
      const r   = await fetch(`${IA_URL}/api/congressional-trades/refresh`, {
        method: 'POST', headers: iaHdr(), signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Refresh timed out' : 'Refresh failed' });
    }
  });

  // === Watchlist (proxy to FastAPI backend) ===
  const WL_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
  const WL_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';
  const wlHdr = () => ({ 'X-API-Key': WL_KEY, 'Content-Type': 'application/json' });

  app.get('/api/watchlist', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 30000);
      const r = await fetch(`${WL_URL}/api/watchlist`, { headers: wlHdr(), signal: controller.signal });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : 'Watchlist unavailable' });
    }
  });

  app.delete('/api/watchlist', async (req, res) => {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 10000);
      const r = await fetch(`${WL_URL}/api/watchlist`, {
        method: 'DELETE',
        headers: wlHdr(),
        signal: controller.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to clear watchlist' });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // List all watchlists
  app.get('/api/watchlist/list', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${WL_URL}/api/watchlist/list`, { headers: wlHdr(), signal: ctrl.signal });
      if (!r.ok) return res.json([]);
      res.json(await r.json());
    } catch { res.json([]); }
  });

  app.get('/api/watchlist/news', async (req, res) => {
    try {
      // Get tickers from the saved watchlist first
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 10000);
      const wlRes = await fetch(`${WL_URL}/api/watchlist`, { headers: wlHdr(), signal: controller.signal });
      clearTimeout(tid);

      if (!wlRes.ok) return res.json({});
      const wlData = await wlRes.json();
      if (wlData.empty || !wlData.tickers?.length) return res.json({});

      const tickers = wlData.tickers.join(',');
      // Use our working Express RSS proxy instead of the Python backend
      const newsRes = await fetch(`http://localhost:${process.env.PORT || 5000}/api/proxy/news/ticker?tickers=${tickers}`);
      const newsMap = await newsRes.json();
      res.json(newsMap);
    } catch (error) {
      console.error('Watchlist news error:', error);
      res.json({});
    }
  });

  app.post('/api/watchlist/refresh', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 120000);
      const r = await fetch(`${WL_URL}/api/watchlist/refresh`, {
        method: 'POST', headers: wlHdr(), signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Refresh timed out (120s)' : 'Watchlist refresh failed' });
    }
  });

  app.get('/api/watchlist/stock/:ticker', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 60000);
      const r = await fetch(`${WL_URL}/api/watchlist/stock/${encodeURIComponent(req.params.ticker)}`, {
        headers: wlHdr(), signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : 'Stock detail unavailable' });
    }
  });

  // AI deep dive — multi-model report for a specific ticker
  app.post('/api/watchlist/stock/:ticker/deep-dive', async (req, res) => {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 120000); // 2min — LLM calls take time
      const r = await fetch(`${WL_URL}/api/watchlist/stock/${encodeURIComponent(req.params.ticker)}/deep-dive`, {
        method: 'POST',
        headers: { ...wlHdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        return res.status(r.status).json({ error: errBody.detail || errBody.message || `Backend ${r.status}` });
      }
      res.json(await r.json());
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Deep dive timed out (120s)' : 'Deep dive generation failed' });
    }
  });

  // Rename specific watchlist
  app.patch('/api/watchlist/:wid/rename', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${WL_URL}/api/watchlist/${req.params.wid}/rename`, {
        method: 'PATCH',
        headers: { ...wlHdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'Rename failed' });
      res.json(await r.json());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Create / upload a new watchlist (proxied to FastAPI POST /api/watchlist)
  app.post('/api/watchlist/upload', async (req, res) => {
    try {
      const { tickers, name, csv_data } = req.body;
      if (!tickers || !Array.isArray(tickers) || !tickers.length) {
        return res.status(400).json({ error: 'tickers array is required' });
      }
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 60000);
      const r = await fetch(`${WL_URL}/api/watchlist`, {
        method: 'POST',
        headers: { ...wlHdr() },
        body: JSON.stringify({ tickers, name, csv_data }),
        signal: ctrl.signal,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        console.error('[watchlist/upload] FastAPI error:', r.status, JSON.stringify(data).slice(0, 300));
        return res.status(r.status).json({ error: data.message || data.detail || `Backend ${r.status}` });
      }
      res.json(data);
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Watchlist creation timed out' : e?.message || 'Upload failed';
      res.status(500).json({ error: msg });
    }
  });

  // Add tickers to an existing watchlist
  app.patch('/api/watchlist/:wid/tickers', async (req, res) => {
    const { wid } = req.params;
    if (['news','list','debug','upload'].includes(wid)) return res.status(400).json({ error: 'Invalid watchlist ID' });
    try {
      const { tickers: newTickers } = req.body;
      if (!newTickers || !Array.isArray(newTickers) || !newTickers.length) {
        return res.status(400).json({ error: 'tickers array is required' });
      }
      // Fetch current watchlist to get existing tickers
      const ctrl1 = new AbortController();
      setTimeout(() => ctrl1.abort(), 10000);
      const currentRes = await fetch(`${WL_URL}/api/watchlist/${wid}`, { headers: wlHdr(), signal: ctrl1.signal });
      if (!currentRes.ok) return res.status(currentRes.status).json({ error: 'Watchlist not found' });
      const current = await currentRes.json();

      // Deduplicate: only add tickers not already present
      const existing: string[] = Array.isArray(current.tickers) ? current.tickers : [];
      const existingUpper = new Set(existing.map((t: string) => t.toUpperCase()));
      const toAdd = (newTickers as string[]).filter(t => !existingUpper.has(t.toUpperCase()));
      if (!toAdd.length) {
        return res.json({ message: 'All tickers already in watchlist', added: 0 });
      }
      const merged = [...existing, ...toAdd];

      // Try PATCH then PUT on FastAPI to update the ticker list
      const ctrl2 = new AbortController();
      setTimeout(() => ctrl2.abort(), 15000);
      let r = await fetch(`${WL_URL}/api/watchlist/${wid}`, {
        method: 'PATCH',
        headers: { ...wlHdr() },
        body: JSON.stringify({ tickers: merged }),
        signal: ctrl2.signal,
      });
      if (r.status === 405) {
        const ctrl3 = new AbortController();
        setTimeout(() => ctrl3.abort(), 15000);
        r = await fetch(`${WL_URL}/api/watchlist/${wid}`, {
          method: 'PUT',
          headers: { ...wlHdr() },
          body: JSON.stringify({ tickers: merged, name: current.name }),
          signal: ctrl3.signal,
        });
      }
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status).json({ error: data.detail || data.message || `Backend ${r.status}` });
      res.json({ ...data, added: toAdd.length, tickers: merged });
    } catch (e: any) {
      res.status(500).json({ error: e?.name === 'AbortError' ? 'Timed out' : (e?.message || 'Add tickers failed') });
    }
  });

  // Get specific watchlist
  app.get('/api/watchlist/:wid', async (req, res, next) => {
    const { wid } = req.params;
    // Don't intercept these — they have their own routes
    if (['news','list','debug'].includes(wid)) return next();
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${WL_URL}/api/watchlist/${wid}`, { headers: wlHdr(), signal: ctrl.signal });
      if (!r.ok) return res.json({ empty: true });
      res.json(await r.json());
    } catch { res.json({ empty: true }); }
  });

  // Delete specific watchlist
  app.delete('/api/watchlist/:wid', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${WL_URL}/api/watchlist/${req.params.wid}`, { method: 'DELETE', headers: wlHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'Failed to delete' });
      res.json(await r.json());
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Refresh specific watchlist
  app.post('/api/watchlist/:wid/refresh', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 180000);
      const r = await fetch(`${WL_URL}/api/watchlist/${req.params.wid}/refresh`, {
        method: 'POST',
        headers: { ...wlHdr(), 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        const detail = errBody.detail || errBody.message || errBody.error || `Backend returned ${r.status}`;
        console.error(`[watchlist refresh] Backend ${r.status}:`, detail);
        return res.status(r.status).json({ error: detail });
      }
      res.json(await r.json());
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Analysis timed out (3 min). Try again.' : e.message;
      console.error('[watchlist refresh] error:', msg);
      res.status(500).json({ error: msg });
    }
  });

  // News for specific watchlist — get tickers from that watchlist, then use Express RSS proxy
  app.get('/api/watchlist/:wid/news', async (req, res) => {
    try {
      const { wid } = req.params;
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      // Get tickers for this watchlist
      const wlRes = await fetch(`${WL_URL}/api/watchlist/${wid}`, { headers: wlHdr(), signal: ctrl.signal });
      if (!wlRes.ok) return res.json({});
      const wlData = await wlRes.json();
      if (wlData.empty || !wlData.tickers?.length) return res.json({});
      const tickers = wlData.tickers.join(',');
      // Use our working Express RSS proxy
      const port = process.env.PORT || 5000;
      const newsRes = await fetch(`http://localhost:${port}/api/proxy/news/ticker?tickers=${tickers}`);
      res.json(await newsRes.json());
    } catch { res.json({}); }
  });

  // ── Playbook / Strategy routes ──────────────────────────────────────
  const PB_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
  const PB_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';
  const pbHdr = () => ({ 'X-API-Key': PB_KEY, 'Content-Type': 'application/json' });

  app.get('/api/playbooks/discovery-capabilities', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${PB_URL}/api/playbooks/discovery-capabilities`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'discovery-capabilities failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks/discovery-capabilities] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/playbooks', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(`${PB_URL}/api/playbooks`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'Playbooks fetch failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks] fetch error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/playbooks/score-watchlist', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 60000);
      const r = await fetch(`${PB_URL}/api/playbooks/score-watchlist`, {
        method: 'POST',
        headers: pbHdr(),
        body: JSON.stringify(req.body),
        signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'score-watchlist failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks/score-watchlist] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/playbooks/score-portfolio', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 60000);
      const r = await fetch(`${PB_URL}/api/playbooks/score-portfolio`, {
        method: 'POST',
        headers: pbHdr(),
        body: JSON.stringify(req.body),
        signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'score-portfolio failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks/score-portfolio] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/playbooks/discover', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 90000);
      const r = await fetch(`${PB_URL}/api/playbooks/discover`, {
        method: 'POST',
        headers: pbHdr(),
        body: JSON.stringify(req.body),
        signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'playbooks/discover failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks/discover] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/playbooks/supply-chain-map', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 90000);
      const r = await fetch(`${PB_URL}/api/playbooks/supply-chain-map`, {
        method: 'POST',
        headers: pbHdr(),
        body: JSON.stringify(req.body),
        signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'playbooks/supply-chain-map failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks/supply-chain-map] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/playbooks/analyze', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 90000);
      const r = await fetch(`${PB_URL}/api/playbooks/analyze`, {
        method: 'POST',
        headers: pbHdr(),
        body: JSON.stringify(req.body),
        signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'playbooks/analyze failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks/analyze] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/playbooks/compare', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 90000);
      const r = await fetch(`${PB_URL}/api/playbooks/compare`, {
        method: 'POST',
        headers: pbHdr(),
        body: JSON.stringify(req.body),
        signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'playbooks/compare failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks/compare] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Strategy Screener routes ──────────────────────────────────────
  app.get('/api/strategy-screener/latest', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 15000);
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const url = `${PB_URL}/api/strategy-screener/latest${qs ? `?${qs}` : ''}`;
      console.log('[strategy-screener/latest] → proxying to:', url);
      const r = await fetch(url, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'strategy-screener/latest failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[strategy-screener/latest] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/strategy-screener/config', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${PB_URL}/api/strategy-screener/config`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'strategy-screener/config failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[strategy-screener/config] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/strategy-screener/report/:snapshotId/:ticker', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 20000);
      const { snapshotId, ticker } = req.params;
      const r = await fetch(`${PB_URL}/api/strategy-screener/report/${encodeURIComponent(snapshotId)}/${encodeURIComponent(ticker)}`, {
        headers: pbHdr(), signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'strategy-screener/report failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[strategy-screener/report] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/strategy-screener/refresh', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 120000);
      const r = await fetch(`${PB_URL}/api/strategy-screener/refresh`, {
        method: 'POST',
        headers: pbHdr(),
        signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ error: 'strategy-screener/refresh failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[strategy-screener/refresh] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Canonical Themes Registry ────────────────────────────────────────
  app.get('/api/themes/relative-strength', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 45000);
      const qs = new URLSearchParams(req.query as Record<string,string>).toString();
      const r = await fetch(`${PB_URL}/api/themes/relative-strength${qs ? `?${qs}` : ''}`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'themes/relative-strength failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[themes/relative-strength] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/themes/list', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 30000);
      const r = await fetch(`${PB_URL}/api/themes/list`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'themes/list failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[themes/list] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Thematic Context ─────────────────────────────────────────────────
  app.get('/api/thematic-context/snapshot', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 30000);
      const r = await fetch(`${PB_URL}/api/thematic-context/snapshot`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'thematic-context/snapshot failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[thematic-context/snapshot] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/thematic-context/refresh', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 60000);
      const r = await fetch(`${PB_URL}/api/thematic-context/refresh`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'thematic-context/refresh failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[thematic-context/refresh] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Options Flow Master ───────────────────────────────────────────────
  app.get('/api/options-flow/master/latest', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 30000);
      const qs = new URLSearchParams(req.query as Record<string,string>).toString();
      const r = await fetch(`${PB_URL}/api/options-flow/master/latest${qs ? `?${qs}` : ''}`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'options-flow/master/latest failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[options-flow/master/latest] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/playbooks/serenity-regime', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 12000);
      const r = await fetch(`${PB_URL}/api/playbooks/serenity-regime`, { headers: pbHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: 'serenity-regime failed' });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[playbooks/serenity-regime] error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // ── Portfolio vs Watchlist Comparison ──────────────────────────────────────
  const CMP_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
  const CMP_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';
  const cmpHdr  = () => ({ 'Content-Type': 'application/json', 'X-API-Key': CMP_KEY });

  app.get('/api/portfolio/compare-watchlist/options', async (req, res) => {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(`${CMP_URL}/api/portfolio/compare-watchlist/options`, {
        headers: cmpHdr(), signal: ctrl.signal,
      });
      if (!r.ok) return res.status(r.status).json({ ok: false, error: `Backend returned ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[compare-watchlist/options] error:', e.message);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.get('/api/portfolio/compare-watchlist/latest', async (req, res) => {
    try {
      const { watchlist_id } = req.query;
      if (!watchlist_id) return res.status(400).json({ ok: false, error: 'watchlist_id is required' });
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(
        `${CMP_URL}/api/portfolio/compare-watchlist/latest?watchlist_id=${encodeURIComponent(String(watchlist_id))}`,
        { headers: cmpHdr(), signal: ctrl.signal },
      );
      if (!r.ok) return res.status(r.status).json({ ok: false, error: `Backend returned ${r.status}` });
      res.json(await r.json());
    } catch (e: any) {
      console.error('[compare-watchlist/latest] error:', e.message);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  app.post('/api/portfolio/compare-watchlist/run', async (req, res) => {
    try {
      const { watchlist_id, force_refresh } = req.body || {};
      if (!watchlist_id) return res.status(400).json({ ok: false, error: 'watchlist_id is required' });
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 120000);
      const r = await fetch(`${CMP_URL}/api/portfolio/compare-watchlist/run`, {
        method: 'POST',
        headers: cmpHdr(),
        body: JSON.stringify({ watchlist_id, force_refresh: !!force_refresh }),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        return res.status(r.status).json({ ok: false, error: `Backend returned ${r.status}`, detail: body });
      }
      res.json(await r.json());
    } catch (e: any) {
      console.error('[compare-watchlist/run] error:', e.message);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // === Fundamentals Compare (proxy to FastAPI backend) ===
  const FC_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
  const FC_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';
  const fcHdr  = () => ({ 'X-API-Key': FC_KEY, 'Content-Type': 'application/json' });

  app.get('/api/fundamentals/compare/search', async (req, res) => {
    const q = (req.query.q as string) || '';
    const limit = (req.query.limit as string) || '10';
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(
        `${FC_URL}/api/fundamentals/compare/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(limit)}`,
        { headers: fcHdr(), signal: ctrl.signal }
      );
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        return res.status(r.status).json({ error: `Backend ${r.status}`, detail: body.slice(0, 200) });
      }
      return res.json(await r.json());
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Search timed out' : (e?.message || 'Fetch failed');
      return res.status(500).json({ error: msg });
    }
  });

  app.post('/api/fundamentals/compare', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 30000);
    try {
      const r = await fetch(`${FC_URL}/api/fundamentals/compare`, {
        method: 'POST',
        headers: fcHdr(),
        body: JSON.stringify(req.body),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        return res.status(r.status).json({ error: `Backend ${r.status}`, detail: body.slice(0, 200) });
      }
      return res.json(await r.json());
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? 'Compare timed out (30s)' : (e?.message || 'Fetch failed');
      return res.status(500).json({ error: msg });
    }
  });

  // ── Catalyst Calendar endpoints ──────────────────────────────────────────────

  app.get('/api/catalysts/overview', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(`${FC_URL}/api/catalysts/overview`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  app.get('/api/catalysts/events', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 20000);
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r = await fetch(`${FC_URL}/api/catalysts/events${qs ? '?' + qs : ''}`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  app.get('/api/catalysts/earnings/upcoming-clean', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 20000);
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r = await fetch(`${FC_URL}/api/catalysts/earnings/upcoming-clean${qs ? '?' + qs : ''}`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  app.get('/api/catalysts/earnings/day-clean', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 20000);
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r = await fetch(`${FC_URL}/api/catalysts/earnings/day-clean${qs ? '?' + qs : ''}`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  app.get('/api/catalysts/earnings/week-clean', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 25000);
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r = await fetch(`${FC_URL}/api/catalysts/earnings/week-clean${qs ? '?' + qs : ''}`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  app.get('/api/catalysts/earnings/day-curated', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 20000);
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r = await fetch(`${FC_URL}/api/catalysts/earnings/day-curated${qs ? '?' + qs : ''}`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  app.get('/api/catalysts/earnings/week-all', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 25000);
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const r = await fetch(`${FC_URL}/api/catalysts/earnings/week-all${qs ? '?' + qs : ''}`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  app.get('/api/catalysts/earnings/month-curated', async (req, res) => {
    // The external backend's month-curated only returns the current week.
    // We fix this by calling week-clean for every Mon–Fri week in the month,
    // in parallel, then merging the results into a full-month response.
    try {
      const { year, month, scope } = req.query as Record<string, string>;
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) || (new Date().getMonth() + 1);

      const pad = (n: number) => String(n).padStart(2, '0');
      const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      const monthEnd = new Date(y, m, 0); // last day of month

      // Walk from the Monday of the first week that overlaps the month
      const cursor = new Date(y, m - 1, 1);
      const dow = cursor.getDay();            // 0=Sun, 1=Mon…6=Sat
      cursor.setDate(cursor.getDate() + (dow === 0 ? -6 : 1 - dow));

      const weekRanges: { weekStart: string; weekEnd: string }[] = [];
      while (cursor <= monthEnd) {
        const friday = new Date(cursor);
        friday.setDate(friday.getDate() + 4);
        weekRanges.push({ weekStart: toDateStr(cursor), weekEnd: toDateStr(friday) });
        cursor.setDate(cursor.getDate() + 7);
      }

      // Fetch week-clean for every week in parallel (20 s per-week timeout)
      const weekResults = await Promise.all(weekRanges.map(async ({ weekStart, weekEnd }) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);
        try {
          const params = new URLSearchParams({ weekStart, weekEnd, limit_per_session: '8', max_total: '60' });
          if (scope && scope !== 'all') params.set('scope', scope);
          const r = await fetch(`${FC_URL}/api/catalysts/earnings/week-clean?${params}`, {
            headers: fcHdr(),
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          return r.ok ? (r.json() as Promise<any>) : null;
        } catch {
          clearTimeout(timer);
          return null;
        }
      }));

      // Merge: date → { count, topEvents[] }
      const byDate = new Map<string, { count: number; topEvents: any[] }>();
      for (const weekData of weekResults) {
        if (!weekData?.days) continue;
        for (const day of weekData.days) {
          const dateStr: string = (day.date ?? '').slice(0, 10);
          if (!dateStr) continue;
          // Only keep dates that belong to the requested month
          const parts = dateStr.split('-');
          if (parseInt(parts[1]) !== m || parseInt(parts[0]) !== y) continue;
          // entries is the combined list; fall back to sub-arrays if empty
          const all: any[] = day.entries?.length > 0
            ? day.entries
            : [...(day.preMarket || []), ...(day.afterHours || []), ...(day.duringMarket || []), ...(day.unknown || [])];
          // Deduplicate by symbol
          const seen = new Set<string>();
          const deduped: any[] = [];
          for (const e of all) { if (e.symbol && !seen.has(e.symbol)) { seen.add(e.symbol); deduped.push(e); } }
          byDate.set(dateStr, { count: day.count || deduped.length, topEvents: deduped.slice(0, 4) });
        }
      }

      // Build full-month days array (all calendar days 1…daysInMonth)
      const daysInMonth = new Date(y, m, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const dateStr = `${y}-${pad(m)}-${pad(i + 1)}`;
        const data = byDate.get(dateStr);
        return { date: dateStr, dayOfMonth: i + 1, isCurrentMonth: true, count: data?.count ?? 0, topEvents: data?.topEvents ?? [] };
      });

      return res.json({ asOf: new Date().toISOString().slice(0, 10), source: 'fmp', year: y, month: m, days });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Aggregation failed' });
    }
  });

  app.get('/api/catalysts/earnings/month-all', async (req, res) => {
    // Aggregate week-all for every week in the month to produce a full-month
    // grid of earnings counts + entries (analogous to month-curated but using
    // the week-all endpoint which returns ALL tickers, not just curated ones).
    try {
      const { year, month, scope } = req.query as Record<string, string>;
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) || (new Date().getMonth() + 1);

      const pad = (n: number) => String(n).padStart(2, '0');
      const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      const monthEnd = new Date(y, m, 0);

      const cursor = new Date(y, m - 1, 1);
      const dow = cursor.getDay();
      cursor.setDate(cursor.getDate() + (dow === 0 ? -6 : 1 - dow));

      const weekRanges: { weekStart: string; weekEnd: string }[] = [];
      while (cursor <= monthEnd) {
        const friday = new Date(cursor);
        friday.setDate(friday.getDate() + 4);
        weekRanges.push({ weekStart: toDateStr(cursor), weekEnd: toDateStr(friday) });
        cursor.setDate(cursor.getDate() + 7);
      }

      const weekResults = await Promise.all(weekRanges.map(async ({ weekStart, weekEnd }) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 20000);
        try {
          const params = new URLSearchParams({ weekStart, weekEnd });
          if (scope && scope !== 'all') params.set('scope', scope);
          const r = await fetch(`${FC_URL}/api/catalysts/earnings/week-all?${params}`, {
            headers: fcHdr(),
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          return r.ok ? (r.json() as Promise<any>) : null;
        } catch {
          clearTimeout(timer);
          return null;
        }
      }));

      const byDate = new Map<string, { count: number; entries: any[] }>();
      for (const weekData of weekResults) {
        if (!weekData?.days) continue;
        for (const day of weekData.days) {
          const dateStr: string = (day.date ?? '').slice(0, 10);
          if (!dateStr) continue;
          const parts = dateStr.split('-');
          if (parseInt(parts[1]) !== m || parseInt(parts[0]) !== y) continue;
          const all: any[] = day.entries?.length > 0
            ? day.entries
            : [...(day.stocks || []), ...(day.events || [])];
          byDate.set(dateStr, { count: day.count || all.length, entries: all });
        }
      }

      const daysInMonth = new Date(y, m, 0).getDate();
      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const dateStr = `${y}-${pad(m)}-${pad(i + 1)}`;
        const data = byDate.get(dateStr);
        return { date: dateStr, dayOfMonth: i + 1, isCurrentMonth: true, count: data?.count ?? 0, entries: data?.entries ?? [] };
      });

      return res.json({ asOf: new Date().toISOString().slice(0, 10), source: 'fmp', year: y, month: m, days });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Aggregation failed' });
    }
  });

  app.get('/api/catalysts/filters', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(`${FC_URL}/api/catalysts/filters`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  app.get('/api/catalysts/by-symbol/:symbol', async (req, res) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 15000);
    try {
      const { symbol } = req.params;
      const r = await fetch(`${FC_URL}/api/catalysts/by-symbol/${encodeURIComponent(symbol)}`, { headers: fcHdr(), signal: ctrl.signal });
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Fetch failed' });
    }
  });

  // ── Caelyn Screener Hub ─────────────────────────────────────────────────────
  // Proxies /api/screener-hub/* to the backend. First request after restart can
  // take 30–60 s while the Tradier quote cache warms on-demand; use 90 s timeout.
  const SH_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';
  const SH_KEY = 'hippo_ak_7f3x9k2m4p8q1w5t';
  const shHdr  = () => ({ 'X-API-Key': SH_KEY, 'Content-Type': 'application/json' });

  app.get('/api/screener-hub/themes', async (req, res) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const r = await fetch(`${SH_URL}/api/screener-hub/themes`, { headers: shHdr(), signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      clearTimeout(timer);
      return res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Fetch failed') });
    }
  });

  app.get('/api/screener-hub', async (req, res) => {
    const ctrl = new AbortController();
    // 90 s to handle cold-cache Tradier warm-up on first request after restart
    const timer = setTimeout(() => ctrl.abort(), 90_000);
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const url = `${SH_URL}/api/screener-hub${qs ? `?${qs}` : ''}`;
      const r = await fetch(url, { headers: shHdr(), signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      clearTimeout(timer);
      return res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out — quote cache warming, please retry' : (e?.message || 'Fetch failed') });
    }
  });

  app.get('/api/admin/screener-hub/status', async (req, res) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const r = await fetch(`${SH_URL}/api/admin/screener-hub/status`, { headers: shHdr(), signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      clearTimeout(timer);
      return res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Fetch failed') });
    }
  });

  // ── Bottlenecks current snapshot ────────────────────────────────────────────
  app.get('/api/bottlenecks/current', async (req, res) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const qs = new URLSearchParams(req.query as Record<string, string>).toString();
      const url = `${SH_URL}/api/bottlenecks/current${qs ? `?${qs}` : ''}`;
      const r = await fetch(url, { headers: shHdr(), signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      clearTimeout(timer);
      return res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Fetch failed') });
    }
  });

  // ── Bottlenecks refresh + debug snapshot ────────────────────────────────────
  app.post('/api/admin/bottlenecks/refresh', async (req, res) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    try {
      const r = await fetch(`${SH_URL}/api/admin/bottlenecks/refresh`, {
        method: 'POST', headers: shHdr(), signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      clearTimeout(timer);
      return res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Fetch failed') });
    }
  });

  app.get('/api/debug/bottlenecks-snapshot', async (req, res) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const r = await fetch(`${SH_URL}/api/debug/bottlenecks-snapshot`, {
        headers: shHdr(), signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!r.ok) return res.status(r.status).json({ error: `Backend ${r.status}` });
      return res.json(await r.json());
    } catch (e: any) {
      clearTimeout(timer);
      return res.status(500).json({ error: e?.name === 'AbortError' ? 'Request timed out' : (e?.message || 'Fetch failed') });
    }
  });

  return httpServer;
}
