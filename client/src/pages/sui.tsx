import { Suspense } from "react";
import { UniversalNavigation } from "@/components/universal-navigation";
import { Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { openSecureLink } from "@/utils/security";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
import { useScrollFade } from "@/hooks/useScrollFade";

// Glass card component
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function SUIPage() {
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
      <UniversalNavigation activePage="sui" />

      {/* Content */}
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 mt-4 pb-8">
        {/* SUI Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">SUI</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Sui Network</h1>
          </div>
          <p className="text-crypto-silver">Live Sui network analytics with DexScreener and ecosystem discovery</p>
        </div>

        {/* SUI Chart */}
        <div className="mb-6">
          <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /><span className="ml-2 text-white">Loading SUI Chart...</span></div>}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-blue-400">SUI</h3>
                  <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    SUI
                  </Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openSecureLink('https://coinmarketcap.com/currencies/sui/')}
                    className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    CoinMarketCap
                  </button>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ASUIUSDT')}
                    className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                  >
                    Open Full View →
                  </button>
                </div>
              </div>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <iframe
                  src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3ASUIUSDT"
                  className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                  title="SUI Advanced Chart"
                  frameBorder="0"
                  scrolling="no"
                />
              </div>
            </div>
          </Suspense>
        </div>

        {/* SUI Ecosystem Tools */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">SUI Explorer</h3>
            <p className="text-crypto-silver text-sm mb-3">Explore transactions and addresses on Sui Network</p>
            <button
              onClick={() => openSecureLink('https://suivision.xyz/')}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              SuiVision
            </button>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">Cetus Protocol</h3>
            <p className="text-crypto-silver text-sm mb-3">Leading DEX on Sui Network</p>
            <button
              onClick={() => openSecureLink('https://www.cetus.zone/')}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Cetus
            </button>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">DexScreener SUI</h3>
            <p className="text-crypto-silver text-sm mb-3">Real-time SUI token analytics</p>
            <button
              onClick={() => openSecureLink('https://dexscreener.com/sui')}
              className="w-full bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              DexScreener
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}