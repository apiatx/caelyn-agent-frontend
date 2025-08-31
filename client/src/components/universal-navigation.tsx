import { Activity, BarChart3, TrendingUp, ChartLine, Brain, Zap, DollarSign, Building2, Layers, Coins, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [location, setLocation] = useLocation();
  
  const navigateTo = (url: string) => {
    setLocation(url);
  };

  const isActive = (page: string) => {
    // Use both props and current location for active state, but prioritize activePage for dashboard tabs
    if (activePage) {
      return activePage === page;
    }
    
    // Fallback to URL-based detection for other pages
    const currentPath = location.replace(/^\/+/, '').replace(/\/+$/, '');
    return currentPath === `app/${page}` || (page === 'dashboard' && (currentPath === '' || currentPath === 'app'));
  };

  return (
    <nav className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4">
      <GlassCard className="p-4 overflow-hidden">
        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:flex-wrap xl:flex-nowrap gap-2 xl:gap-3">
          <button
            onClick={() => navigateTo("/app")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("dashboard")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Activity className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Market Overview
          </button>
          <button
            onClick={() => navigateTo("/app/majors")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("majors")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <BarChart3 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Majors
          </button>
          <button
            onClick={() => navigateTo("/app/onchain")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("onchain")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <BarChart3 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Onchain
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex-1 min-w-[120px] lg:min-w-[140px] xl:min-w-[160px] py-3 px-2 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
                  isActive("ethereum") || isActive("base") || isActive("solana") || isActive("hype") || isActive("bittensor") || isActive("abstract") || isActive("bnb") || isActive("sui") || isActive("hyperevm")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Layers className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Ecosystems
                <ChevronDown className="w-3 h-3 xl:w-4 xl:h-4 ml-1 inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/80 backdrop-blur-lg border-crypto-silver/20">
              <DropdownMenuItem
                onClick={() => navigateTo("/app/ethereum")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Coins className="w-4 h-4 mr-2" />
                ETH
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/base")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <ChartLine className="w-4 h-4 mr-2" />
                Base
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/solana")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Zap className="w-4 h-4 mr-2" />
                Solana
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/hype")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Brain className="w-4 h-4 mr-2" />
                HL Core
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/bittensor")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Brain className="w-4 h-4 mr-2" />
                Bittensor
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/abstract")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Layers className="w-4 h-4 mr-2" />
                Abstract
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/bnb")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Coins className="w-4 h-4 mr-2" />
                BNB
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/sui")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Zap className="w-4 h-4 mr-2" />
                SUI
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/hyperevm")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Brain className="w-4 h-4 mr-2" />
                HyperEVM
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => navigateTo("/app/trade")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("trade")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <TrendingUp className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Trade
          </button>
          <button
            onClick={() => navigateTo("/app/defi")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("defi")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <DollarSign className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />DeFi
          </button>
          <button
            onClick={() => navigateTo("/app/portfolio")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("portfolio")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Activity className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Portfolio
          </button>
          <button
            onClick={() => navigateTo("/app/crypto-stocks")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("crypto-stocks")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Building2 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Stonks
          </button>
          <button
            onClick={() => navigateTo("/app/predict")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("predict")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <TrendingUp className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Predict
          </button>
          <button
            onClick={() => navigateTo("/app/about")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("about")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <Activity className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />About
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
                onClick={() => navigateTo("/app/onchain")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("onchain")
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
                <Coins className="w-4 h-4 mr-1 inline" />ETH
              </button>
              <button
                onClick={() => navigateTo("/app/base")}
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
                <Brain className="w-4 h-4 mr-1 inline" />HL Core
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive("ethereum") || isActive("base") || isActive("solana") || isActive("hype") || isActive("bittensor") || isActive("abstract") || isActive("bnb") || isActive("sui") || isActive("hyperevm")
                        ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                        : "hover:bg-white/5 text-crypto-silver"
                    }`}
                  >
                    <Layers className="w-4 h-4 mr-1 inline" />Ecosystems
                    <ChevronDown className="w-4 h-4 ml-1 inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-black/80 backdrop-blur-lg border-crypto-silver/20">
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/ethereum")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    ETH
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/base")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <ChartLine className="w-4 h-4 mr-2" />
                    Base
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/solana")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Solana
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/hype")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    HL Core
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/bittensor")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Bittensor
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/abstract")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Abstract
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/bnb")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    BNB
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/sui")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    SUI
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/hyperevm")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    HyperEVM
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                onClick={() => navigateTo("/app/portfolio")}
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
                <Building2 className="w-4 h-4 mr-1 inline" />Stonks
              </button>
              <button
                onClick={() => navigateTo("/app/predict")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("predict")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <TrendingUp className="w-4 h-4 mr-1 inline" />Predict
              </button>
              <button
                onClick={() => navigateTo("/app/about")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("about")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Activity className="w-4 h-4 mr-1 inline" />About
              </button>
            </div>
          </div>
        </div>
      </GlassCard>
    </nav>
  );
}