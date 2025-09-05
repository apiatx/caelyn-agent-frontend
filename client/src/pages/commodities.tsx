import { UniversalNavigation } from "@/components/universal-navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, Coins, Diamond, Droplets, Flame, Zap, Gem, Mountain, Hammer, Wheat, Box } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
import goldBarsImage from "@assets/istockphoto-1455233823-612x612_1757104224615.jpg";
import { useScrollFade } from "@/hooks/useScrollFade";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function CommoditiesPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header 
        className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50 transition-opacity duration-300 relative overflow-hidden" 
        style={{ opacity: headerOpacity }}
      >
        {/* Background Image */}
        <div 
          className="absolute inset-0 opacity-75"
          style={{
            backgroundImage: `url(${paintColorsBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        {/* Content Layer */}
        <div className="relative z-10 max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-yellow-400 shadow-lg">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white drop-shadow-lg">
                CryptoHippo
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="commodities" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-yellow-500 shadow-lg">
                <img 
                  src={goldBarsImage} 
                  alt="Gold Bars" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-3xl font-bold text-white">Commodities</h1>
            </div>
            <p className="text-crypto-silver">Track precious metals and commodity market movements</p>
          </div>

          {/* Gold */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Coins className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Gold</h3>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                  XAUUSD
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=OANDA%3AXAUUSD', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/20 hover:border-yellow-400/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-yellow-400 group-hover:text-yellow-300">XAUUSD</h4>
                      <p className="text-crypto-silver">View real-time gold prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-yellow-400 group-hover:text-yellow-300 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Silver */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-400 rounded-full flex items-center justify-center">
                  <Diamond className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Silver</h3>
                <Badge className="bg-gray-400/20 text-gray-300 border-gray-400/30 text-xs">
                  SILVER
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=TVC%3ASILVER', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-gray-400/10 to-gray-500/10 hover:from-gray-400/20 hover:to-gray-500/20 border border-gray-400/20 hover:border-gray-300/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                      <Diamond className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-gray-300 group-hover:text-gray-200">XAGUSD</h4>
                      <p className="text-crypto-silver">View real-time silver prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-gray-300 group-hover:text-gray-200 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Copper */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Copper</h3>
                <Badge className="bg-orange-600/20 text-orange-400 border-orange-600/30 text-xs">
                  COPPER
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CAPITALCOM%3ACOPPER', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-orange-600/10 to-orange-700/10 hover:from-orange-600/20 hover:to-orange-700/20 border border-orange-600/20 hover:border-orange-500/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-orange-400 group-hover:text-orange-300">HGUSD</h4>
                      <p className="text-crypto-silver">View real-time copper prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-orange-400 group-hover:text-orange-300 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Oil */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-800 rounded-full flex items-center justify-center">
                  <Droplets className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Oil</h3>
                <Badge className="bg-slate-800/20 text-slate-300 border-slate-800/30 text-xs">
                  USOIL
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=TVC%3AUSOIL', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-slate-800/10 to-slate-900/10 hover:from-slate-800/20 hover:to-slate-900/20 border border-slate-800/20 hover:border-slate-700/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                      <Droplets className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-slate-300 group-hover:text-slate-200">USOIL</h4>
                      <p className="text-crypto-silver">View real-time oil prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-slate-300 group-hover:text-slate-200 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Natural Gas */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Natural Gas</h3>
                <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30 text-xs">
                  XNGUSD
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=FXOPEN%3AXNGUSD', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-blue-600/10 to-blue-700/10 hover:from-blue-600/20 hover:to-blue-700/20 border border-blue-600/20 hover:border-blue-500/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-blue-400 group-hover:text-blue-300">XNGUSD</h4>
                      <p className="text-crypto-silver">View real-time natural gas prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-blue-400 group-hover:text-blue-300 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Uranium */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-600 rounded-full flex items-center justify-center">
                  <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Uranium</h3>
                <Badge className="bg-green-600/20 text-green-300 border-green-600/30 text-xs">
                  UX1!
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=COMEX%3AUX1%21', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-green-600/10 to-green-700/10 hover:from-green-600/20 hover:to-green-700/20 border border-green-600/20 hover:border-green-500/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-green-400 group-hover:text-green-300">UX1!</h4>
                      <p className="text-crypto-silver">View real-time uranium prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-green-400 group-hover:text-green-300 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Platinum */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-slate-400 rounded-full flex items-center justify-center">
                  <Gem className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Platinum</h3>
                <Badge className="bg-slate-400/20 text-slate-300 border-slate-400/30 text-xs">
                  PLATINUM
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CAPITALCOM%3APLATINUM', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-slate-400/10 to-slate-500/10 hover:from-slate-400/20 hover:to-slate-500/20 border border-slate-400/20 hover:border-slate-300/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-400 rounded-full flex items-center justify-center">
                      <Gem className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-slate-300 group-hover:text-slate-200">XPTUSD</h4>
                      <p className="text-crypto-silver">View real-time platinum prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-slate-300 group-hover:text-slate-200 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Coal */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-800 rounded-full flex items-center justify-center">
                  <Mountain className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Coal</h3>
                <Badge className="bg-gray-800/20 text-gray-300 border-gray-800/30 text-xs">
                  NCF1!
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=ICEEUR%3ANCF1%21', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-gray-800/10 to-gray-900/10 hover:from-gray-800/20 hover:to-gray-900/20 border border-gray-800/20 hover:border-gray-700/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                      <Mountain className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-gray-300 group-hover:text-gray-200">NCF1!</h4>
                      <p className="text-crypto-silver">View real-time coal prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-gray-300 group-hover:text-gray-200 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Iron */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-800 rounded-full flex items-center justify-center">
                  <Hammer className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Iron</h3>
                <Badge className="bg-red-800/20 text-red-300 border-red-800/30 text-xs">
                  TIO1!
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=COMEX%3ATIO1%21', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-red-800/10 to-red-900/10 hover:from-red-800/20 hover:to-red-900/20 border border-red-800/20 hover:border-red-700/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-800 rounded-full flex items-center justify-center">
                      <Hammer className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-red-400 group-hover:text-red-300">TIO1!</h4>
                      <p className="text-crypto-silver">View real-time iron prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-red-400 group-hover:text-red-300 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Soybeans */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-amber-600 rounded-full flex items-center justify-center">
                  <Wheat className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Soybeans</h3>
                <Badge className="bg-amber-600/20 text-amber-300 border-amber-600/30 text-xs">
                  SOYBNUSD
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=OANDA%3ASOYBNUSD', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-amber-600/10 to-amber-700/10 hover:from-amber-600/20 hover:to-amber-700/20 border border-amber-600/20 hover:border-amber-500/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                      <Wheat className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-amber-400 group-hover:text-amber-300">SOYBNUSD</h4>
                      <p className="text-crypto-silver">View real-time soybean prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-amber-400 group-hover:text-amber-300 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Aluminum */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-600 rounded-full flex items-center justify-center">
                  <Box className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Aluminum</h3>
                <Badge className="bg-cyan-600/20 text-cyan-300 border-cyan-600/30 text-xs">
                  ALUMINIUM
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=PEPPERSTONE%3AALUMINIUM', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-cyan-600/10 to-cyan-700/10 hover:from-cyan-600/20 hover:to-cyan-700/20 border border-cyan-600/20 hover:border-cyan-500/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center">
                      <Box className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-cyan-400 group-hover:text-cyan-300">ALUMINIUM</h4>
                      <p className="text-crypto-silver">View real-time aluminum prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-cyan-400 group-hover:text-cyan-300 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>

          {/* Wheat */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-700 rounded-full flex items-center justify-center">
                  <Wheat className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Wheat</h3>
                <Badge className="bg-yellow-700/20 text-yellow-300 border-yellow-700/30 text-xs">
                  WHEATUSD
                </Badge>
              </div>
            </div>
            
            <div className="w-full">
              <button
                onClick={() => window.open('https://www.tradingview.com/chart/e5l95XgZ/?symbol=OANDA%3AWHEATUSD', '_blank', 'noopener,noreferrer')}
                className="w-full bg-gradient-to-r from-yellow-700/10 to-yellow-800/10 hover:from-yellow-700/20 hover:to-yellow-800/20 border border-yellow-700/20 hover:border-yellow-600/30 rounded-lg p-6 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-700 rounded-full flex items-center justify-center">
                      <Wheat className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xl font-semibold text-yellow-500 group-hover:text-yellow-400">WHEATUSD</h4>
                      <p className="text-crypto-silver">View real-time wheat prices on TradingView</p>
                    </div>
                  </div>
                  <div className="text-yellow-500 group-hover:text-yellow-400 text-sm">
                    Click to Open →
                  </div>
                </div>
              </button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}