import { Activity, BarChart3, TrendingUp, ChartLine, Brain, Zap, DollarSign, Building2, Layers, Coins, ChevronDown, Wallet, Users, MessageSquare } from "lucide-react";
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex-1 min-w-[120px] lg:min-w-[140px] xl:min-w-[160px] py-3 px-2 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
                  isActive("majors") || isActive("altcoins")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <BarChart3 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Charts
                <ChevronDown className="w-3 h-3 xl:w-4 xl:h-4 ml-1 inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/80 backdrop-blur-lg border-crypto-silver/20">
              <DropdownMenuItem
                onClick={() => navigateTo("/app/charts/majors")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Majors
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/charts/altcoins")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Coins className="w-4 h-4 mr-2" />
                Altcoins
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex-1 min-w-[120px] lg:min-w-[140px] xl:min-w-[160px] py-3 px-2 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
                  isActive("onchain-analytics") || isActive("onchain-smart-wallets")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <BarChart3 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Onchain
                <ChevronDown className="w-3 h-3 xl:w-4 xl:h-4 ml-1 inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/80 backdrop-blur-lg border-crypto-silver/20">
              <DropdownMenuItem
                onClick={() => navigateTo("/app/onchain/analytics")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/onchain/smart-wallets")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Smart Wallets
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex-1 min-w-[120px] lg:min-w-[140px] xl:min-w-[160px] py-3 px-2 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
                  isActive("ethereum") || isActive("base") || isActive("solana") || isActive("hype") || isActive("bittensor") || isActive("abstract") || isActive("bnb") || isActive("sui")
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`flex-1 min-w-[120px] lg:min-w-[140px] xl:min-w-[160px] py-3 px-2 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
                  isActive("crypto-stocks") || isActive("crypto-stonks") || isActive("commodities")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <Building2 className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />TradFi
                <ChevronDown className="w-3 h-3 xl:w-4 xl:h-4 ml-1 inline" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black/80 backdrop-blur-lg border-crypto-silver/20">
              <DropdownMenuItem
                onClick={() => navigateTo("/app/crypto-stocks")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Stonks
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/crypto-stonks")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Crypto Stonks
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigateTo("/app/commodities")}
                className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
              >
                <Coins className="w-4 h-4 mr-2" />
                Commodities
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            onClick={() => navigateTo("/app/onchain/social")}
            className={`flex-1 min-w-0 py-3 px-1 xl:px-3 rounded-xl text-xs xl:text-sm font-medium transition-all duration-300 text-center ${
              isActive("onchain-social")
                ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                : "hover:bg-white/5 text-crypto-silver"
            }`}
          >
            <MessageSquare className="w-3 h-3 xl:w-4 xl:h-4 mr-1 inline" />Social
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive("majors") || isActive("altcoins")
                        ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                        : "hover:bg-white/5 text-crypto-silver"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 mr-1 inline" />Charts
                    <ChevronDown className="w-4 h-4 ml-1 inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-black/80 backdrop-blur-lg border-crypto-silver/20">
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/charts/majors")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Majors
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/charts/altcoins")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Altcoins
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive("onchain-alpha") || isActive("onchain-smart-wallets")
                        ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                        : "hover:bg-white/5 text-crypto-silver"
                    }`}
                  >
                    <BarChart3 className="w-4 h-4 mr-1 inline" />Onchain
                    <ChevronDown className="w-4 h-4 ml-1 inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-black/80 backdrop-blur-lg border-crypto-silver/20">
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/onchain/alpha")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Alpha
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/onchain/smart-wallets")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Smart Wallets
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive("ethereum") || isActive("base") || isActive("solana") || isActive("hype") || isActive("bittensor") || isActive("abstract") || isActive("bnb") || isActive("sui")
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                      isActive("crypto-stocks") || isActive("crypto-stonks") || isActive("commodities")
                        ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                        : "hover:bg-white/5 text-crypto-silver"
                    }`}
                  >
                    <Building2 className="w-4 h-4 mr-1 inline" />TradFi
                    <ChevronDown className="w-4 h-4 ml-1 inline" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-black/80 backdrop-blur-lg border-crypto-silver/20">
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/crypto-stocks")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Stonks
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/crypto-stonks")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Crypto Stonks
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigateTo("/app/commodities")}
                    className="text-white hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Commodities
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                onClick={() => navigateTo("/app/onchain/social")}
                className={`whitespace-nowrap py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive("onchain-social")
                    ? "bg-gradient-to-r from-crypto-warning/30 to-yellow-400/20 border border-crypto-warning/50 text-white shadow-lg"
                    : "hover:bg-white/5 text-crypto-silver"
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-1 inline" />Social
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