import { useState } from "react";
import { ChartLine, Settings, Activity, Eye, TrendingUp, BarChart3, Brain, Wallet } from "lucide-react";
import DashboardSection from "@/components/dashboard-section";
import PortfolioSection from "@/components/portfolio-section";
import AlphaSection from "@/components/alpha-section";
import WhaleWatchingSection from "@/components/whale-watching-section";
import MarketResearchSection from "@/components/market-research-section";
import { DeBankPortfolioSection } from "@/components/debank-portfolio-section";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

type TabType = "dashboard" | "portfolio" | "debank" | "alpha" | "whale" | "research";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-crypto-silver to-white rounded-lg flex items-center justify-center">
                <ChartLine className="text-crypto-black text-lg" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-crypto-silver bg-clip-text text-transparent">
                CryptoVault Pro
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <GlassCard className="px-3 py-2">
                <span className="text-sm text-crypto-silver">Portfolio Value</span>
                <div className="text-lg font-semibold text-crypto-success">$127,845.32</div>
              </GlassCard>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <GlassCard className="p-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Activity className="w-4 h-4 mr-2 inline" />Dashboard
            </button>
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "portfolio"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <i className="fas fa-wallet mr-2"></i>Portfolio Tracker
            </button>
            <button
              onClick={() => setActiveTab("debank")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "debank"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Wallet className="w-4 h-4 mr-2 inline" />DeBank Portfolio
            </button>
            <button
              onClick={() => setActiveTab("alpha")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "alpha"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2 inline" />Alpha
            </button>
            <button
              onClick={() => setActiveTab("whale")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "whale"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Eye className="w-4 h-4 mr-2 inline" />Whale Watch
            </button>
            <button
              onClick={() => setActiveTab("research")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "research"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />Research
            </button>

          </div>
        </GlassCard>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {activeTab === "dashboard" && <DashboardSection />}
        {activeTab === "portfolio" && <PortfolioSection />}
        {activeTab === "debank" && <DeBankPortfolioSection initialWalletAddress="0x1677B97859620CcbF4eEcF33f6feB1b7bEA8D97E" />}
        {activeTab === "alpha" && <AlphaSection />}
        {activeTab === "whale" && <WhaleWatchingSection />}
        {activeTab === "research" && <MarketResearchSection />}

      </div>
    </div>
  );
}
