import { Suspense } from "react";
import { UniversalNavigation } from "@/components/universal-navigation";
import AbstractSection from "@/components/abstract-section";
import { Loader2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { openSecureLink } from "@/utils/security";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
import abstractLogo from "@assets/abstract chain_1755977414942.jpg";
import { useScrollFade } from "@/hooks/useScrollFade";

export default function AbstractPage() {
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
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
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
      <UniversalNavigation activePage="abstract" />

      {/* Content */}
      <div className="max-w-[95vw] mx-auto px-2 sm:px-3 mt-4 pb-8">
        {/* Abstract Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
              <img src={abstractLogo} alt="Abstract" className="w-8 h-8 rounded-lg" />
            </div>
            <h1 className="text-3xl font-bold text-white">Abstract Chain</h1>
          </div>
          <p className="text-crypto-silver">Live Abstract network analytics with DexScreener and ecosystem discovery</p>
        </div>

        {/* PENGU Chart */}
        <div className="mb-6">
          <Suspense fallback={<div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cyan-500" /><span className="ml-2 text-white">Loading PENGU Chart...</span></div>}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-cyan-400">PENGU</h3>
                  <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                    PENGU
                  </Badge>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => openSecureLink('https://coinmarketcap.com/currencies/pudgy-penguins/')}
                    className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    CoinMarketCap
                  </button>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3APENGUUSDT')}
                    className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm"
                  >
                    Open Full View →
                  </button>
                </div>
              </div>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                <iframe
                  src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3APENGUUSDT"
                  className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                  title="PENGU Advanced Chart"
                  frameBorder="0"
                  scrolling="no"
                />
              </div>
            </div>
          </Suspense>
        </div>

        <Suspense 
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="ml-3 text-lg text-white">Loading Abstract Network...</span>
            </div>
          }
        >
          <AbstractSection />
        </Suspense>
      </div>
    </div>
  );
}