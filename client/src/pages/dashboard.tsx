import { useState, Suspense, useEffect } from "react";
import { ChartLine, Settings, Activity, Eye, TrendingUp, BarChart3, Brain, Wallet, Zap, DollarSign, Layers, Building2 } from "lucide-react";
import CryptoDashboardSection from "@/components/crypto-dashboard-section";
import PortfolioSection from "@/components/portfolio-section";
import AlphaSection from "@/components/alpha-section";

import BittensorDashboardSection from "@/components/bittensor-dashboard-section";
import BaseSectionSafe from "@/components/base-section-safe";
import SolanaSection from "@/components/solana-section";
import AbstractSection from "@/components/abstract-section";
import DeFiSection from "@/components/defi-section";
import cryptoHippoImage from "@assets/image_1753204691716.png";

import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { LoadingScreen, SectionLoadingState } from "@/components/loading-screen";

type TabType = "dashboard" | "btc" | "alts" | "portfolio" | "alpha" | "base" | "bittensor" | "abstract" | "solana" | "defi" | "hype";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  // Handle URL fragments on page load and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove the #
      if (hash && ["alpha", "base", "bittensor", "abstract", "solana", "defi", "portfolio"].includes(hash)) {
        setActiveTab(hash as TabType);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    // Update URL hash for deep linking
    if (tab !== "dashboard") {
      window.location.hash = tab;
    } else {
      window.location.hash = "";
    }
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
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                CryptoHippo
              </h1>
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
              <Activity className="w-4 h-4 mr-2 inline" />Market Overview
            </button>
            <button
              onClick={() => window.location.href = "/top-charts"}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />Top Charts
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
              onClick={() => window.location.href = "/hype"}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
            >
              <TrendingUp className="w-4 h-4 mr-2 inline" />Hype
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
              onClick={() => window.location.href = "/crypto-stocks"}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
            >
              <Building2 className="w-4 h-4 mr-2 inline" />Crypto Stocks
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
                <Activity className="w-4 h-4 mr-1 inline" />Market Overview
              </button>
              <button
                onClick={() => window.location.href = "/top-charts"}
                className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
              >
                <BarChart3 className="w-4 h-4 mr-1 inline" />Top Charts
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
                onClick={() => window.location.href = "/hype"}
                className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
              >
                <TrendingUp className="w-4 h-4 mr-1 inline" />Hype
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
                onClick={() => window.location.href = "/crypto-stocks"}
                className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
              >
                <Building2 className="w-4 h-4 mr-1 inline" />Crypto Stocks
              </button>

            </div>
          </div>
        </GlassCard>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 mt-4 lg:mt-8 pb-8">
        <Suspense fallback={<SectionLoadingState title="Market Overview" />}>
          {activeTab === "dashboard" && <CryptoDashboardSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Portfolio" />}>
          {activeTab === "portfolio" && <PortfolioSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Alpha Analytics" />}>
          {activeTab === "alpha" && <AlphaSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Base Network" />}>
          {activeTab === "base" && <BaseSectionSafe />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Bittensor" />}>
          {activeTab === "bittensor" && <BittensorDashboardSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Abstract Network" />}>
          {activeTab === "abstract" && <AbstractSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="Solana Network" />}>
          {activeTab === "solana" && <SolanaSection />}
        </Suspense>
        <Suspense fallback={<SectionLoadingState title="DeFi Platforms" />}>
          {activeTab === "defi" && <DeFiSection />}
        </Suspense>
      </div>
    </div>
  );
}
