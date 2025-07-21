import { useState } from "react";
import { ChartLine, Settings, Activity, Eye, TrendingUp, BarChart3, Brain, Wallet, Zap, DollarSign, Layers } from "lucide-react";
import CryptoDashboardSection from "@/components/crypto-dashboard-section";
import PortfolioSection from "@/components/portfolio-section";
import AlphaSection from "@/components/alpha-section";
import WhaleWatchingSection from "@/components/whale-watching-section";
import MarketResearchSection from "@/components/market-research-section";
import BittensorDashboardSection from "@/components/bittensor-dashboard-section";
import BaseSection from "@/components/base-section";
import SolanaSection from "@/components/solana-section";
import AbstractSection from "@/components/abstract-section";
import DeFiSection from "@/components/defi-section";
import cryptoHippoImage from "@assets/image_1752975467353.png";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

type TabType = "dashboard" | "portfolio" | "alpha" | "whale" | "research" | "bittensor" | "base" | "abstract" | "solana" | "defi";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Reset scroll to top when switching tabs to prevent auto-scrolling issues
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-white to-crypto-silver bg-clip-text text-transparent">
                CryptoHippo
              </h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <GlassCard className="px-2 py-1 sm:px-3 sm:py-2 hidden sm:block">
                <span className="text-xs sm:text-sm text-crypto-silver">Portfolio Value</span>
                <div className="text-sm sm:text-lg font-semibold text-crypto-success">$127,845.32</div>
              </GlassCard>
              <GlassCard className="px-2 py-2 sm:hidden">
                <div className="text-sm font-semibold text-crypto-success">$127.8K</div>
              </GlassCard>
              <Button variant="ghost" size="sm" className="p-1 sm:p-2">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 mt-4 lg:mt-6">
        <GlassCard className="p-1 sm:p-2">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex space-x-2">
            <button
              onClick={() => handleTabChange("dashboard")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Activity className="w-4 h-4 mr-2 inline" />Dashboard
            </button>
            <button
              onClick={() => handleTabChange("alpha")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "alpha"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-2 inline" />Alpha
            </button>
            <button
              onClick={() => handleTabChange("base")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "base"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <ChartLine className="w-4 h-4 mr-2 inline" />Base
            </button>
            <button
              onClick={() => handleTabChange("bittensor")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "bittensor"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Brain className="w-4 h-4 mr-2 inline" />Bittensor
            </button>
            <button
              onClick={() => handleTabChange("abstract")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "abstract"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Layers className="w-4 h-4 mr-2 inline" />Abstract
            </button>
            <button
              onClick={() => handleTabChange("solana")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "solana"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Zap className="w-4 h-4 mr-2 inline" />Solana
            </button>
            <button
              onClick={() => handleTabChange("defi")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "defi"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <DollarSign className="w-4 h-4 mr-2 inline" />DeFi
            </button>
            <button
              onClick={() => handleTabChange("portfolio")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "portfolio"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Wallet className="w-4 h-4 mr-2 inline" />Portfolio
            </button>
            <button
              onClick={() => handleTabChange("whale")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "whale"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Eye className="w-4 h-4 mr-2 inline" />Whale Watch
            </button>
            <button
              onClick={() => handleTabChange("research")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "research"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />Research
            </button>
          </div>

          {/* Mobile Navigation - Horizontal Scroll */}
          <div className="lg:hidden overflow-x-auto">
            <div className="flex space-x-1 min-w-max pb-2">
              <button
                onClick={() => handleTabChange("dashboard")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "dashboard"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Activity className="w-4 h-4 mr-1 inline" />Dashboard
              </button>
              <button
                onClick={() => handleTabChange("alpha")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "alpha"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-1 inline" />Alpha
              </button>
              <button
                onClick={() => handleTabChange("base")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "base"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <ChartLine className="w-4 h-4 mr-1 inline" />Base
              </button>
              <button
                onClick={() => handleTabChange("bittensor")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "bittensor"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Brain className="w-4 h-4 mr-1 inline" />Bittensor
              </button>
              <button
                onClick={() => handleTabChange("abstract")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "abstract"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Layers className="w-4 h-4 mr-1 inline" />Abstract
              </button>
              <button
                onClick={() => handleTabChange("solana")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "solana"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Zap className="w-4 h-4 mr-1 inline" />Solana
              </button>
              <button
                onClick={() => handleTabChange("defi")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "defi"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <DollarSign className="w-4 h-4 mr-1 inline" />DeFi
              </button>
              <button
                onClick={() => handleTabChange("portfolio")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "portfolio"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Wallet className="w-4 h-4 mr-1 inline" />Portfolio
              </button>
              <button
                onClick={() => handleTabChange("whale")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "whale"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Eye className="w-4 h-4 mr-1 inline" />Whale Watch
              </button>
              <button
                onClick={() => handleTabChange("research")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === "research"
                    ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-1 inline" />Research
              </button>
            </div>
          </div>
        </GlassCard>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 mt-4 lg:mt-8 pb-8">
        {activeTab === "dashboard" && <CryptoDashboardSection />}
        {activeTab === "portfolio" && <PortfolioSection />}
        {activeTab === "alpha" && <AlphaSection />}
        {activeTab === "base" && <BaseSection />}
        {activeTab === "bittensor" && <BittensorDashboardSection />}
        {activeTab === "abstract" && <AbstractSection />}
        {activeTab === "solana" && <SolanaSection />}
        {activeTab === "defi" && <DeFiSection />}
        {activeTab === "whale" && <WhaleWatchingSection />}
        {activeTab === "research" && <MarketResearchSection />}
      </div>
    </div>
  );
}
