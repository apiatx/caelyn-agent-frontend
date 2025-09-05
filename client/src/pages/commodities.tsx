import { UniversalNavigation } from "@/components/universal-navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TrendingUp, Coins, Diamond } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
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
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Coins className="w-8 h-8 text-white" />
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
              <iframe
                src="https://www.tradingview.com/chart/e5l95XgZ/?symbol=OANDA%3AXAUUSD"
                className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                title="Gold"
                frameBorder="0"
                loading="eager"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation"
                referrerPolicy="no-referrer-when-downgrade"
                allow="fullscreen; web-share; clipboard-read; clipboard-write"
                style={{ border: 'none' }}
              />
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
                      <h4 className="text-xl font-semibold text-gray-300 group-hover:text-gray-200">Silver Chart</h4>
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
                      <h4 className="text-xl font-semibold text-orange-400 group-hover:text-orange-300">Copper Chart</h4>
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
        </div>
      </main>
    </div>
  );
}