import { Suspense } from "react";
import { Building2, Activity, BarChart3, TrendingUp, ChartLine, Brain, Layers, Zap, DollarSign, Wallet } from "lucide-react";
import CryptoStocksSection from "@/components/crypto-stocks-section";
import cryptoHippoImage from "@assets/image_1753204691716.png";
import { LoadingScreen, SectionLoadingState } from "@/components/loading-screen";
import { Card } from "@/components/ui/card";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function CryptoStocks() {
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
      <nav className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
        <GlassCard className="p-4">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex space-x-2">
            <button
              onClick={() => window.location.href = "/"}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
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
              onClick={() => window.location.href = "/solana"}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
            >
              <Zap className="w-4 h-4 mr-2 inline" />Solana
            </button>
            <button
              onClick={() => window.location.href = "/defi"}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
            >
              <DollarSign className="w-4 h-4 mr-2 inline" />DeFi
            </button>
            <button
              onClick={() => window.location.href = "/hype"}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
            >
              <Brain className="w-4 h-4 mr-2 inline" />Hype
            </button>
            <button
              onClick={() => window.location.href = "/crypto-stocks"}
              className="flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
            >
              <Building2 className="w-4 h-4 mr-2 inline" />Crypto Stocks
            </button>
          </div>

          {/* Mobile Navigation - Horizontal Scroll */}
          <div className="lg:hidden overflow-x-auto">
            <div className="flex space-x-1 min-w-max pb-2">
              <button
                onClick={() => window.location.href = "/"}
                className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
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
                onClick={() => window.location.href = "/solana"}
                className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
              >
                <Zap className="w-4 h-4 mr-1 inline" />Solana
              </button>
              <button
                onClick={() => window.location.href = "/defi"}
                className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
              >
                <DollarSign className="w-4 h-4 mr-1 inline" />DeFi
              </button>
              <button
                onClick={() => window.location.href = "/hype"}
                className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-white/5 text-crypto-silver"
              >
                <Brain className="w-4 h-4 mr-1 inline" />Hype
              </button>
              <button
                onClick={() => window.location.href = "/crypto-stocks"}
                className="whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
              >
                <Building2 className="w-4 h-4 mr-1 inline" />Crypto Stocks
              </button>
            </div>
          </div>
        </GlassCard>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 lg:py-8">
        <div className="space-y-4 lg:space-y-8">
          {/* Page Title */}
          <div className="text-center px-3 sm:px-0">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Crypto Stocks</h2>
            </div>
            <p className="text-sm sm:text-base text-crypto-silver">Corporate treasury holdings and institutional crypto adoption</p>
          </div>

          {/* Crypto Stocks Content */}
          <Suspense fallback={<SectionLoadingState />}>
            <CryptoStocksSection />
          </Suspense>
        </div>
      </main>
    </div>
  );
}