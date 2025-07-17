import { storage } from "./storage";
import type { InsertWhaleTransaction } from "@shared/schema";

// Simulated real-time whale transaction monitoring
class WhaleMonitoringService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log("🐋 Whale monitoring service started");
    
    // Check for new whale transactions every 10 seconds
    this.intervalId = setInterval(() => {
      this.checkForWhaleTransactions();
    }, 10000);

    // Update prices every 30 seconds
    setInterval(() => {
      this.updatePrices();
    }, 30000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("🐋 Whale monitoring service stopped");
  }

  private async checkForWhaleTransactions() {
    console.log("Checking for whale transactions...");
    
    // Simulate random whale transaction detection (20% chance)
    if (Math.random() < 0.2) {
      const networks = ['BASE', 'TAO'];
      const tokens = ['ETH', 'TAO', 'USDC'];
      const network = networks[Math.floor(Math.random() * networks.length)];
      const token = network === 'BASE' ? (Math.random() > 0.5 ? 'ETH' : 'USDC') : 'TAO';
      
      // Generate realistic whale transaction amounts (>$2,500)
      const baseAmount = 2500 + Math.random() * 97500; // $2,500 - $100,000
      let amount: string;
      let amountUsd: string;

      if (token === 'ETH') {
        amount = (baseAmount / 2324.12).toFixed(3); // ETH price ~$2,324
        amountUsd = baseAmount.toFixed(2);
      } else if (token === 'TAO') {
        amount = (baseAmount / 553.24).toFixed(1); // TAO price ~$553
        amountUsd = baseAmount.toFixed(2);
      } else { // USDC
        amount = baseAmount.toFixed(2);
        amountUsd = baseAmount.toFixed(2);
      }

      const transaction: InsertWhaleTransaction = {
        network,
        transactionHash: this.generateTxHash(),
        fromAddress: this.generateAddress(network),
        toAddress: Math.random() > 0.3 ? this.generateAddress(network) : null,
        amount,
        amountUsd,
        token
      };

      try {
        await storage.createWhaleTransaction(transaction);
        console.log(`🚨 New whale transaction detected: ${amount} ${token} worth $${amountUsd}`);
      } catch (error) {
        console.error("Failed to store whale transaction:", error);
      }
    }
  }

  private async updatePrices() {
    console.log("Updating prices...");
    
    // Simulate price updates for holdings
    // In a real implementation, this would fetch from external price APIs
    try {
      // Update portfolio values with simulated price changes
      const portfolio = await storage.getPortfolioByUserId(1);
      if (portfolio) {
        const holdings = await storage.getHoldingsByPortfolioId(portfolio.id);
        
        for (const holding of holdings) {
          // Simulate small price movements (-2% to +2%)
          const priceChange = (Math.random() - 0.5) * 0.04; // -2% to +2%
          const currentPrice = parseFloat(holding.currentPrice);
          const newPrice = currentPrice * (1 + priceChange);
          
          const entryPrice = parseFloat(holding.entryPrice);
          const amount = parseFloat(holding.amount);
          const pnl = (newPrice - entryPrice) * amount;
          const pnlPercentage = ((newPrice - entryPrice) / entryPrice) * 100;

          await storage.updateHolding(holding.id, {
            currentPrice: newPrice.toFixed(2),
            pnl: pnl.toFixed(2),
            pnlPercentage: pnlPercentage.toFixed(2)
          });
        }

        // Update portfolio totals
        const updatedHoldings = await storage.getHoldingsByPortfolioId(portfolio.id);
        const totalBalance = updatedHoldings.reduce((sum, h) => {
          return sum + (parseFloat(h.amount) * parseFloat(h.currentPrice));
        }, 0);

        const totalPnl = updatedHoldings.reduce((sum, h) => {
          return sum + parseFloat(h.pnl);
        }, 0);

        const baseHoldings = updatedHoldings
          .filter(h => h.network === 'BASE')
          .reduce((sum, h) => sum + (parseFloat(h.amount) * parseFloat(h.currentPrice)), 0);

        const taoHoldings = updatedHoldings
          .filter(h => h.network === 'TAO')
          .reduce((sum, h) => sum + (parseFloat(h.amount) * parseFloat(h.currentPrice)), 0);

        await storage.updatePortfolio(portfolio.id, {
          totalBalance: totalBalance.toFixed(2),
          baseHoldings: baseHoldings.toFixed(2),
          taoHoldings: taoHoldings.toFixed(2),
          pnl24h: totalPnl.toFixed(2)
        });
      }
    } catch (error) {
      console.error("Failed to update prices:", error);
    }
  }

  private generateTxHash(): string {
    const chars = '0123456789abcdef';
    let result = '0x';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateAddress(network: string): string {
    if (network === 'BASE') {
      const chars = '0123456789abcdef';
      let result = '0x';
      for (let i = 0; i < 40; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    } else {
      // TAO address format
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
      let result = '5';
      for (let i = 0; i < 47; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
  }
}

// Market data update service
class MarketDataService {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    console.log("📊 Market data service started");
    
    // Update market insights every 5 minutes
    this.intervalId = setInterval(() => {
      this.updateMarketData();
    }, 300000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("📊 Market data service stopped");
  }

  private async updateMarketData() {
    // Simulate new market insights and trade signals
    const insights = [
      "BASE network transaction volume up 34% in last hour",
      "TAO subnet 27 emission rate increased by 12%",
      "Large institutional accumulation detected on BASE",
      "Bittensor validator participation reaches new ATH",
      "BASE bridge activity suggests increased adoption"
    ];

    const signals = [
      { type: 'buy' as const, asset: 'ETH/BASE', description: 'Strong momentum breakout detected' },
      { type: 'hold' as const, asset: 'TAO', description: 'Subnet emissions stabilizing' },
      { type: 'buy' as const, asset: 'TAO/Subnet1', description: 'Validator rewards increasing' }
    ];

    try {
      // Randomly add new insights (30% chance)
      if (Math.random() < 0.3) {
        const insight = insights[Math.floor(Math.random() * insights.length)];
        await storage.createMarketInsight({
          title: "Market Update",
          content: insight,
          sentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
          confidence: Math.floor(70 + Math.random() * 30),
          source: "CryptoVault Intelligence",
          impact: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low'
        });
      }

      // Randomly add new signals (40% chance)
      if (Math.random() < 0.4) {
        const signal = signals[Math.floor(Math.random() * signals.length)];
        await storage.createTradeSignal({
          ...signal,
          confidence: Math.floor(65 + Math.random() * 35)
        });
      }
    } catch (error) {
      console.error("Failed to update market data:", error);
    }
  }
}

// Export services
export const whaleMonitoringService = new WhaleMonitoringService();
export const marketDataService = new MarketDataService();

// Auto-start services
export function startBackgroundServices() {
  whaleMonitoringService.start();
  marketDataService.start();
}

export function stopBackgroundServices() {
  whaleMonitoringService.stop();
  marketDataService.stop();
}