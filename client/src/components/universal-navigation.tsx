import { Activity, BarChart3, TrendingUp, ChartLine, Brain, Zap, DollarSign, Building2, Layers, Coins } from "lucide-react";
import { Card } from "@/components/ui/card";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

interface UniversalNavigationProps {
  activePage?: string;
}

export function UniversalNavigation({ activePage }: UniversalNavigationProps) {
  const navigateTo = (url: string) => {
    window.location.href = url;
  };

  const isActive = (page: string) => activePage === page;

  return (
    <nav className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
      <GlassCard className="p-4 overflow-hidden">
        {/* Desktop Navigation */}
        <div className="hidden lg:grid lg:grid-cols-6 xl:grid-cols-12 gap-1 xl:gap-2">
          <button
            onClick={() => navigateTo("/app")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("dashboard")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Activity className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Market Overview
          </button>
          <button
            onClick={() => navigateTo("/app/majors")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("majors")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <BarChart3 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Majors
          </button>
          <button
            onClick={() => navigateTo("/app#alpha")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("alpha")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <BarChart3 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Onchain
          </button>
          <button
            onClick={() => navigateTo("/app/ethereum")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("ethereum")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Coins className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Ethereum
          </button>
          <button
            onClick={() => navigateTo("/app#base")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("base")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <ChartLine className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Base
          </button>
          <button
            onClick={() => navigateTo("/app/solana")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("solana")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Zap className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Solana
          </button>
          <button
            onClick={() => navigateTo("/app/hype")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("hype")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Brain className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Hype
          </button>
          <button
            onClick={() => navigateTo("/app#bittensor")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("bittensor")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Brain className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Bittensor
          </button>
          <button
            onClick={() => navigateTo("/app/abstract")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("abstract")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Layers className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Abstract
          </button>
          <button
            onClick={() => navigateTo("/app/defi")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("defi")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <DollarSign className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />DeFi
          </button>
          <button
            onClick={() => navigateTo("/app#portfolio")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("portfolio")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Activity className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Portfolio
          </button>
          <button
            onClick={() => navigateTo("/app/crypto-stocks")}
            className={`w-full py-3 px-2 xl:px-4 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("crypto-stocks")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Building2 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Stocks
          </button>
        </div>

        {/* Mobile Navigation - Horizontal Scroll */}
        <div className="lg:hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex space-x-1 min-w-max pb-2 px-1">
              <button
                onClick={() => navigateTo("/app")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("dashboard")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Activity className="w-4 h-4 mr-1 inline" />Market Overview
              </button>
              <button
                onClick={() => navigateTo("/app/majors")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("majors")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-1 inline" />Majors
              </button>
              <button
                onClick={() => navigateTo("/app#alpha")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("alpha")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <BarChart3 className="w-4 h-4 mr-1 inline" />Onchain
              </button>
              <button
                onClick={() => navigateTo("/app/ethereum")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("ethereum")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Coins className="w-4 h-4 mr-1 inline" />Ethereum
              </button>
              <button
                onClick={() => navigateTo("/app#base")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("base")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <ChartLine className="w-4 h-4 mr-1 inline" />Base
              </button>
              <button
                onClick={() => navigateTo("/app/solana")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("solana")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Zap className="w-4 h-4 mr-1 inline" />Solana
              </button>
              <button
                onClick={() => navigateTo("/app/hype")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("hype")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Brain className="w-4 h-4 mr-1 inline" />Hype
              </button>
              <button
                onClick={() => navigateTo("/app#bittensor")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("bittensor")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Brain className="w-4 h-4 mr-1 inline" />Bittensor
              </button>
              <button
                onClick={() => navigateTo("/app/abstract")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("abstract")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Layers className="w-4 h-4 mr-1 inline" />Abstract
              </button>
              <button
                onClick={() => navigateTo("/app/defi")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("defi")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <DollarSign className="w-4 h-4 mr-1 inline" />DeFi
              </button>
              <button
                onClick={() => navigateTo("/app#portfolio")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("portfolio")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Activity className="w-4 h-4 mr-1 inline" />Portfolio
              </button>
              <button
                onClick={() => navigateTo("/app/crypto-stocks")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("crypto-stocks")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Building2 className="w-4 h-4 mr-1 inline" />Stocks
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </nav>
  );
}