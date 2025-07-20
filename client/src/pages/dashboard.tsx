import { useState } from "react";
import { ChartLine, Settings, Activity, Eye, TrendingUp, BarChart3, Brain, Wallet } from "lucide-react";
import DashboardSection from "@/components/dashboard-section";
import PortfolioSection from "@/components/portfolio-section";
import AlphaSection from "@/components/alpha-section";
import WhaleWatchingSection from "@/components/whale-watching-section";
import MarketResearchSection from "@/components/market-research-section";
import BittensorDashboardSection from "@/components/bittensor-dashboard-section";


import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

type TabType = "dashboard" | "portfolio" | "alpha" | "whale" | "research" | "bittensor";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-pink-600 rounded-lg flex items-center justify-center">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 100 100" 
                  className="text-white"
                >
                  {/* Moo Deng's body */}
                  <ellipse cx="50" cy="65" rx="25" ry="18" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="2"/>
                  
                  {/* Moo Deng's head */}
                  <circle cx="50" cy="40" r="20" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="2"/>
                  
                  {/* Eyes */}
                  <circle cx="43" cy="35" r="3" fill="#000"/>
                  <circle cx="57" cy="35" r="3" fill="#000"/>
                  <circle cx="44" cy="34" r="1" fill="#FFF"/>
                  <circle cx="58" cy="34" r="1" fill="#FFF"/>
                  
                  {/* Snout */}
                  <ellipse cx="50" cy="45" rx="6" ry="4" fill="#FF91A4"/>
                  
                  {/* Nostrils */}
                  <ellipse cx="48" cy="44" rx="1" ry="1.5" fill="#000"/>
                  <ellipse cx="52" cy="44" rx="1" ry="1.5" fill="#000"/>
                  
                  {/* Ears */}
                  <ellipse cx="35" cy="30" rx="4" ry="8" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="1"/>
                  <ellipse cx="65" cy="30" rx="4" ry="8" fill="#FFB6C1" stroke="#FF69B4" strokeWidth="1"/>
                  
                  {/* Legs */}
                  <ellipse cx="35" cy="80" rx="4" ry="8" fill="#FFB6C1"/>
                  <ellipse cx="45" cy="80" rx="4" ry="8" fill="#FFB6C1"/>
                  <ellipse cx="55" cy="80" rx="4" ry="8" fill="#FFB6C1"/>
                  <ellipse cx="65" cy="80" rx="4" ry="8" fill="#FFB6C1"/>
                  
                  {/* Tail */}
                  <ellipse cx="25" cy="65" rx="3" ry="6" fill="#FFB6C1" transform="rotate(-30 25 65)"/>
                </svg>
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
              onClick={() => setActiveTab("bittensor")}
              className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
                activeTab === "bittensor"
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Brain className="w-4 h-4 mr-2 inline" />Bittensor
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
        {activeTab === "alpha" && <AlphaSection />}
        {activeTab === "bittensor" && <BittensorDashboardSection />}
        {activeTab === "whale" && <WhaleWatchingSection />}
        {activeTab === "research" && <MarketResearchSection />}
      </div>
    </div>
  );
}
