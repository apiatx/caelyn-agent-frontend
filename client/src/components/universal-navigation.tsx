import { Activity, BarChart3, TrendingUp, ChartLine, Brain, Zap, DollarSign, Building2 } from "lucide-react";
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
      <GlassCard className="p-4">
        {/* Desktop Navigation */}
        <div className="hidden lg:flex space-x-2">
          <button
            onClick={() => navigateTo("/")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("dashboard")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Activity className="w-4 h-4 mr-2 inline" />Market Overview
          </button>
          <button
            onClick={() => navigateTo("/top-charts")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("top-charts")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />Top Charts
          </button>
          <button
            onClick={() => navigateTo("/#alpha")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("alpha")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <TrendingUp className="w-4 h-4 mr-2 inline" />Alpha
          </button>
          <button
            onClick={() => navigateTo("/#base")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("base")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <ChartLine className="w-4 h-4 mr-2 inline" />Base
          </button>
          <button
            onClick={() => navigateTo("/#bittensor")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("bittensor")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Brain className="w-4 h-4 mr-2 inline" />Bittensor
          </button>
          <button
            onClick={() => navigateTo("/solana")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("solana")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Zap className="w-4 h-4 mr-2 inline" />Solana
          </button>
          <button
            onClick={() => navigateTo("/hype")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("hype")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Brain className="w-4 h-4 mr-2 inline" />Hype
          </button>
          <button
            onClick={() => navigateTo("/defi")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("defi")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <DollarSign className="w-4 h-4 mr-2 inline" />DeFi
          </button>
          <button
            onClick={() => navigateTo("/#portfolio")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("portfolio")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Activity className="w-4 h-4 mr-2 inline" />Portfolio
          </button>
          <button
            onClick={() => navigateTo("/crypto-stocks")}
            className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-300 ${
              isActive("crypto-stocks")
                ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Building2 className="w-4 h-4 mr-2 inline" />Crypto Stocks
          </button>
        </div>

        {/* Mobile Navigation - Horizontal Scroll */}
        <div className="lg:hidden overflow-x-auto">
          <div className="flex space-x-1 min-w-max pb-2">
            <button
              onClick={() => navigateTo("/")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("dashboard")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Activity className="w-4 h-4 mr-1 inline" />Market Overview
            </button>
            <button
              onClick={() => navigateTo("/top-charts")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("top-charts")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-1 inline" />Top Charts
            </button>
            <button
              onClick={() => navigateTo("/#alpha")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("alpha")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <TrendingUp className="w-4 h-4 mr-1 inline" />Alpha
            </button>
            <button
              onClick={() => navigateTo("/#base")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("base")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <ChartLine className="w-4 h-4 mr-1 inline" />Base
            </button>
            <button
              onClick={() => navigateTo("/#bittensor")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("bittensor")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Brain className="w-4 h-4 mr-1 inline" />Bittensor
            </button>
            <button
              onClick={() => navigateTo("/solana")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("solana")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Zap className="w-4 h-4 mr-1 inline" />Solana
            </button>
            <button
              onClick={() => navigateTo("/hype")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("hype")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Brain className="w-4 h-4 mr-1 inline" />Hype
            </button>
            <button
              onClick={() => navigateTo("/defi")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("defi")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <DollarSign className="w-4 h-4 mr-1 inline" />DeFi
            </button>
            <button
              onClick={() => navigateTo("/#portfolio")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("portfolio")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Activity className="w-4 h-4 mr-1 inline" />Portfolio
            </button>
            <button
              onClick={() => navigateTo("/crypto-stocks")}
              className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                isActive("crypto-stocks")
                  ? "bg-gradient-to-r from-crypto-silver/20 to-white/10 border border-crypto-silver/30 text-white"
                  : "hover:bg-white/5 text-crypto-silver"
              }`}
            >
              <Building2 className="w-4 h-4 mr-1 inline" />Crypto Stocks
            </button>
          </div>
        </div>
      </GlassCard>
    </nav>
  );
}