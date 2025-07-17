import { 
  users, portfolios, holdings, subnets, whaleTransactions, premiumAccess, marketInsights, tradeSignals, mindshareProjects,
  type User, type InsertUser, type Portfolio, type InsertPortfolio, type Holding, type InsertHolding,
  type Subnet, type InsertSubnet, type WhaleTransaction, type InsertWhaleTransaction,
  type PremiumAccess, type InsertPremiumAccess, type MarketInsight, type InsertMarketInsight,
  type TradeSignal, type InsertTradeSignal, type MindshareProject, type InsertMindshareProject
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Portfolio methods
  getPortfolioByUserId(userId: number): Promise<Portfolio | undefined>;
  getPortfolioById(portfolioId: number): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: number, portfolio: Partial<InsertPortfolio>): Promise<Portfolio | undefined>;

  // Holdings methods
  getHoldingsByPortfolioId(portfolioId: number): Promise<Holding[]>;
  createHolding(holding: InsertHolding): Promise<Holding>;
  updateHolding(id: number, holding: Partial<InsertHolding>): Promise<Holding | undefined>;

  // Subnet methods
  getAllSubnets(): Promise<Subnet[]>;
  getSubnetByNetuid(netuid: number): Promise<Subnet | undefined>;
  createSubnet(subnet: InsertSubnet): Promise<Subnet>;
  updateSubnet(id: number, subnet: Partial<InsertSubnet>): Promise<Subnet | undefined>;

  // Whale transaction methods
  getWhaleTransactions(limit?: number): Promise<WhaleTransaction[]>;
  createWhaleTransaction(transaction: InsertWhaleTransaction): Promise<WhaleTransaction>;

  // Premium access methods
  getPremiumAccess(userId: number, feature: string): Promise<PremiumAccess | undefined>;
  createPremiumAccess(access: InsertPremiumAccess): Promise<PremiumAccess>;

  // Market research methods
  getMarketInsights(limit?: number): Promise<MarketInsight[]>;
  createMarketInsight(insight: InsertMarketInsight): Promise<MarketInsight>;

  getTradeSignals(limit?: number): Promise<TradeSignal[]>;
  createTradeSignal(signal: InsertTradeSignal): Promise<TradeSignal>;

  // Mindshare methods
  getMindshareProjects(): Promise<MindshareProject[]>;
  createMindshareProject(project: InsertMindshareProject): Promise<MindshareProject>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private portfolios: Map<number, Portfolio>;
  private holdings: Map<number, Holding>;
  private subnets: Map<number, Subnet>;
  private whaleTransactions: Map<number, WhaleTransaction>;
  private premiumAccess: Map<number, PremiumAccess>;
  private marketInsights: Map<number, MarketInsight>;
  private tradeSignals: Map<number, TradeSignal>;
  private mindshareProjects: Map<number, MindshareProject>;
  
  private currentUserId: number;
  private currentPortfolioId: number;
  private currentHoldingId: number;
  private currentSubnetId: number;
  private currentWhaleTransactionId: number;
  private currentPremiumAccessId: number;
  private currentMarketInsightId: number;
  private currentTradeSignalId: number;
  private currentMindshareProjectId: number;

  constructor() {
    this.users = new Map();
    this.portfolios = new Map();
    this.holdings = new Map();
    this.subnets = new Map();
    this.whaleTransactions = new Map();
    this.premiumAccess = new Map();
    this.marketInsights = new Map();
    this.tradeSignals = new Map();
    this.mindshareProjects = new Map();
    
    this.currentUserId = 1;
    this.currentPortfolioId = 1;
    this.currentHoldingId = 1;
    this.currentSubnetId = 1;
    this.currentWhaleTransactionId = 1;
    this.currentPremiumAccessId = 1;
    this.currentMarketInsightId = 1;
    this.currentTradeSignalId = 1;
    this.currentMindshareProjectId = 1;

    this.seedData();
  }

  private seedData() {
    // Create demo user and portfolio
    const user: User = { id: 1, username: "demo", password: "demo" };
    this.users.set(1, user);

    const portfolio: Portfolio = {
      id: 1,
      userId: 1,
      baseWalletAddress: null,
      taoWalletAddress: null,
      totalBalance: "127845.32",
      baseHoldings: "47234.18",
      taoHoldings: "80611.14",
      pnl24h: "1847.52",
      pnl7d: "8923.45",
      pnl30d: "15678.90",
      pnlYtd: "32154.76",
      pnlAll: "89432.10",
      updatedAt: new Date(),
    };
    this.portfolios.set(1, portfolio);

    // Seed holdings
    const baseHoldings: Holding[] = [
      {
        id: 1,
        portfolioId: 1,
        symbol: "ETH",
        network: "BASE",
        amount: "12.457",
        entryPrice: "2089.34",
        currentPrice: "2324.12",
        pnl: "2347.89",
        pnlPercentage: "11.25",
      },
      {
        id: 2,
        portfolioId: 1,
        symbol: "UNI",
        network: "BASE",
        amount: "2847.3",
        entryPrice: "6.49",
        currentPrice: "6.42",
        pnl: "-191.55",
        pnlPercentage: "-1.08",
      }
    ];

    const taoHoldings: Holding[] = [
      {
        id: 3,
        portfolioId: 1,
        symbol: "TAO",
        network: "TAO",
        amount: "145.7",
        entryPrice: "532.45",
        currentPrice: "553.24",
        pnl: "3077.87",
        pnlPercentage: "3.91",
      }
    ];

    baseHoldings.forEach(holding => this.holdings.set(holding.id, holding));
    taoHoldings.forEach(holding => this.holdings.set(holding.id, holding));
    this.currentHoldingId = 4;

    // Seed subnets
    const subnetsData: Subnet[] = [
      {
        id: 1,
        netuid: 1,
        name: "Prompting",
        description: "Text generation & prompting",
        stakeWeight: "2847.3",
        emissions: "127.8",
        pnl24h: "2.34",
        updatedAt: new Date(),
      },
      {
        id: 2,
        netuid: 18,
        name: "Cortex.t",
        description: "Decentralized inference",
        stakeWeight: "1923.7",
        emissions: "89.4",
        pnl24h: "5.67",
        updatedAt: new Date(),
      },
      {
        id: 3,
        netuid: 27,
        name: "Compute",
        description: "Distributed computing",
        stakeWeight: "3421.8",
        emissions: "156.2",
        pnl24h: "3.12",
        updatedAt: new Date(),
      }
    ];

    subnetsData.forEach(subnet => this.subnets.set(subnet.id, subnet));
    this.currentSubnetId = 4;

    // Seed market insights
    const insights: MarketInsight[] = [
      {
        id: 1,
        title: "Coinbase Announces BASE Layer 2 Expansion",
        content: "Major institutional adoption expected as Coinbase scales BASE infrastructure for enterprise clients...",
        sentiment: "bullish",
        confidence: 87,
        source: "Coinbase Blog",
        impact: "high",
        publishedAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        id: 2,
        title: "Bittensor Subnet 27 Reaches New ATH",
        content: "Compute subnet shows unprecedented growth with 245% increase in validator participation...",
        sentiment: "bullish",
        confidence: 94,
        source: "Taostats Analytics",
        impact: "high",
        publishedAt: new Date(Date.now() - 10800000), // 3 hours ago
      }
    ];

    insights.forEach(insight => this.marketInsights.set(insight.id, insight));
    this.currentMarketInsightId = 3;

    // Seed trade signals
    const signals: TradeSignal[] = [
      {
        id: 1,
        type: "buy",
        asset: "ETH/BASE",
        description: "ETH/BASE liquidity spike detected",
        confidence: 85,
        createdAt: new Date(Date.now() - 120000), // 2 minutes ago
      },
      {
        id: 2,
        type: "hold",
        asset: "TAO",
        description: "TAO subnet emissions increasing",
        confidence: 78,
        createdAt: new Date(Date.now() - 900000), // 15 minutes ago
      }
    ];

    signals.forEach(signal => this.tradeSignals.set(signal.id, signal));
    this.currentTradeSignalId = 3;

    // Seed whale transactions
    const whaleTransactions: WhaleTransaction[] = [
      {
        id: 1,
        network: "BASE",
        transactionHash: "0x742d35cc6bf9f2e7c2e4a123456789abcdef0123456789abcdef0123456789ab",
        fromAddress: "0x742d35cc6bf9f2e7c2e4a123456789abcdef012345",
        toAddress: "0x987654321fedcba9876543210fedcba9876543210",
        amount: "20.5",
        amountUsd: "47823.45",
        token: "ETH",
        timestamp: new Date(Date.now() - 120000), // 2 minutes ago
      },
      {
        id: 2,
        network: "TAO",
        transactionHash: "0x89abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
        fromAddress: "5GrwvaEF5zXb26FZ96yf4vEL8uZAQ8kGF2EZhCz1t4MNqp8H",
        toAddress: null,
        amount: "161.2",
        amountUsd: "89156.78",
        token: "TAO",
        timestamp: new Date(Date.now() - 480000), // 8 minutes ago
      },
      {
        id: 3,
        network: "BASE",
        transactionHash: "0x456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef012345",
        fromAddress: "0x123456789abcdef0123456789abcdef0123456789a",
        toAddress: "0xabcdef0123456789abcdef0123456789abcdef0123",
        amount: "8.7",
        amountUsd: "20234.67",
        token: "ETH",
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      }
    ];

    whaleTransactions.forEach(tx => this.whaleTransactions.set(tx.id, tx));
    this.currentWhaleTransactionId = 4;

    // Seed mindshare projects
    const mindshareProjects: MindshareProject[] = [
      {
        id: 1,
        name: "Farcaster",
        symbol: "FARCAST",
        network: "BASE",
        marketCap: "42500000",
        volume24h: "8200000",
        mentions24h: 1247,
        sentiment: "87.4",
        trendingScore: 95,
        lastUpdated: new Date(),
      },
      {
        id: 2,
        name: "Coinbase Wrapped BTC",
        symbol: "cbBTC",
        network: "BASE",
        marketCap: "890000000",
        volume24h: "125000000",
        mentions24h: 892,
        sentiment: "72.1",
        trendingScore: 78,
        lastUpdated: new Date(),
      },
      {
        id: 3,
        name: "Bittensor",
        symbol: "TAO",
        network: "TAO",
        marketCap: "4200000000",
        volume24h: "180000000",
        mentions24h: 1834,
        sentiment: "91.2",
        trendingScore: 89,
        lastUpdated: new Date(),
      },
      {
        id: 4,
        name: "Commune AI",
        symbol: "COMAI",
        network: "TAO",
        marketCap: "45000000",
        volume24h: "3200000",
        mentions24h: 234,
        sentiment: "68.9",
        trendingScore: 65,
        lastUpdated: new Date(),
      }
    ];

    mindshareProjects.forEach(project => this.mindshareProjects.set(project.id, project));
    this.currentMindshareProjectId = 5;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Portfolio methods
  async getPortfolioByUserId(userId: number): Promise<Portfolio | undefined> {
    return Array.from(this.portfolios.values()).find(portfolio => portfolio.userId === userId);
  }

  async getPortfolioById(portfolioId: number): Promise<Portfolio | undefined> {
    return this.portfolios.get(portfolioId);
  }

  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const id = this.currentPortfolioId++;
    const portfolio: Portfolio = { 
      ...insertPortfolio, 
      id, 
      updatedAt: new Date(),
      baseWalletAddress: insertPortfolio.baseWalletAddress ?? null,
      taoWalletAddress: insertPortfolio.taoWalletAddress ?? null,
      pnl7d: insertPortfolio.pnl7d ?? "0.00",
      pnl30d: insertPortfolio.pnl30d ?? "0.00",
      pnlYtd: insertPortfolio.pnlYtd ?? "0.00",
      pnlAll: insertPortfolio.pnlAll ?? "0.00"
    };
    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  async updatePortfolio(id: number, updates: Partial<InsertPortfolio>): Promise<Portfolio | undefined> {
    const portfolio = this.portfolios.get(id);
    if (!portfolio) return undefined;
    
    const updated: Portfolio = { 
      ...portfolio, 
      ...updates, 
      updatedAt: new Date(),
      pnl7d: updates.pnl7d ?? portfolio.pnl7d,
      pnl30d: updates.pnl30d ?? portfolio.pnl30d,
      pnlYtd: updates.pnlYtd ?? portfolio.pnlYtd,
      pnlAll: updates.pnlAll ?? portfolio.pnlAll
    };
    this.portfolios.set(id, updated);
    return updated;
  }

  // Holdings methods
  async getHoldingsByPortfolioId(portfolioId: number): Promise<Holding[]> {
    return Array.from(this.holdings.values()).filter(holding => holding.portfolioId === portfolioId);
  }

  async createHolding(insertHolding: InsertHolding): Promise<Holding> {
    const id = this.currentHoldingId++;
    const holding: Holding = { ...insertHolding, id };
    this.holdings.set(id, holding);
    return holding;
  }

  async updateHolding(id: number, updates: Partial<InsertHolding>): Promise<Holding | undefined> {
    const holding = this.holdings.get(id);
    if (!holding) return undefined;
    
    const updated: Holding = { ...holding, ...updates };
    this.holdings.set(id, updated);
    return updated;
  }

  // Subnet methods
  async getAllSubnets(): Promise<Subnet[]> {
    return Array.from(this.subnets.values());
  }

  async getSubnetByNetuid(netuid: number): Promise<Subnet | undefined> {
    return Array.from(this.subnets.values()).find(subnet => subnet.netuid === netuid);
  }

  async createSubnet(insertSubnet: InsertSubnet): Promise<Subnet> {
    const id = this.currentSubnetId++;
    const subnet: Subnet = { ...insertSubnet, id, updatedAt: new Date(), description: insertSubnet.description || null };
    this.subnets.set(id, subnet);
    return subnet;
  }

  async updateSubnet(id: number, updates: Partial<InsertSubnet>): Promise<Subnet | undefined> {
    const subnet = this.subnets.get(id);
    if (!subnet) return undefined;
    
    const updated: Subnet = { ...subnet, ...updates, updatedAt: new Date() };
    this.subnets.set(id, updated);
    return updated;
  }

  // Whale transaction methods
  async getWhaleTransactions(limit: number = 50): Promise<WhaleTransaction[]> {
    return Array.from(this.whaleTransactions.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit);
  }

  async createWhaleTransaction(insertTransaction: InsertWhaleTransaction): Promise<WhaleTransaction> {
    const id = this.currentWhaleTransactionId++;
    const transaction: WhaleTransaction = { ...insertTransaction, id, timestamp: new Date(), toAddress: insertTransaction.toAddress || null };
    this.whaleTransactions.set(id, transaction);
    return transaction;
  }

  // Premium access methods
  async getPremiumAccess(userId: number, feature: string): Promise<PremiumAccess | undefined> {
    return Array.from(this.premiumAccess.values())
      .find(access => access.userId === userId && access.feature === feature && access.expiresAt > new Date());
  }

  async createPremiumAccess(insertAccess: InsertPremiumAccess): Promise<PremiumAccess> {
    const id = this.currentPremiumAccessId++;
    const access: PremiumAccess = { ...insertAccess, id, createdAt: new Date() };
    this.premiumAccess.set(id, access);
    return access;
  }

  // Market research methods
  async getMarketInsights(limit: number = 20): Promise<MarketInsight[]> {
    return Array.from(this.marketInsights.values())
      .sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0))
      .slice(0, limit);
  }

  async createMarketInsight(insertInsight: InsertMarketInsight): Promise<MarketInsight> {
    const id = this.currentMarketInsightId++;
    const insight: MarketInsight = { ...insertInsight, id, publishedAt: new Date() };
    this.marketInsights.set(id, insight);
    return insight;
  }

  async getTradeSignals(limit: number = 10): Promise<TradeSignal[]> {
    return Array.from(this.tradeSignals.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async createTradeSignal(insertSignal: InsertTradeSignal): Promise<TradeSignal> {
    const id = this.currentTradeSignalId++;
    const signal: TradeSignal = { ...insertSignal, id, createdAt: new Date() };
    this.tradeSignals.set(id, signal);
    return signal;
  }

  // Mindshare methods
  async getMindshareProjects(): Promise<MindshareProject[]> {
    return Array.from(this.mindshareProjects.values())
      .sort((a, b) => b.trendingScore - a.trendingScore);
  }

  async createMindshareProject(insertProject: InsertMindshareProject): Promise<MindshareProject> {
    const id = this.currentMindshareProjectId++;
    const project: MindshareProject = { 
      ...insertProject, 
      id, 
      lastUpdated: new Date(),
      marketCap: insertProject.marketCap ?? null,
      volume24h: insertProject.volume24h ?? null
    };
    this.mindshareProjects.set(id, project);
    return project;
  }
}

export const storage = new MemStorage();
