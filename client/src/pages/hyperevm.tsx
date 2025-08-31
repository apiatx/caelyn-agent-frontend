import { useState, Suspense } from "react";
import { useLocation } from "wouter";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
import { ExternalLink } from "lucide-react";
import { UniversalNavigation } from "@/components/universal-navigation";
import { SectionLoadingState } from "@/components/loading-screen";
import { useScrollFade } from "@/hooks/useScrollFade";

export default function HyperEVMPage() {
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
      <UniversalNavigation activePage="hyperevm" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <h1 className="text-3xl font-bold text-white">HyperEVM</h1>
            </div>
            <p className="text-crypto-silver">Complete HyperEVM DeFi ecosystem • Trading, swapping, and liquidity management</p>
          </div>

          {/* HyperEVM DeFi Ecosystem */}
          <div className="space-y-6">
            {/* DexScreener HyperEVM */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-medium text-green-400">DexScreener</h4>
                <a
                  href="https://dexscreener.com/hyperevm?theme=dark"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
                >
                  Open Full View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
                <iframe
                  src="https://dexscreener.com/hyperevm?theme=dark"
                  className="w-full h-[600px] border-0"
                  title="HyperEVM DexScreener"
                  allow="clipboard-read; clipboard-write"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
                />
              </div>
            </div>

            {/* HyperSwap */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-medium text-green-400">HyperSwap</h4>
                <a
                  href="https://app.hyperswap.exchange/#/swap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
                >
                  Open Full View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
                <iframe
                  src="https://app.hyperswap.exchange/#/swap"
                  className="w-full h-[600px] border-0"
                  title="HyperSwap Exchange"
                  allow="clipboard-read; clipboard-write"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
                />
              </div>
            </div>

            {/* Trenches */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-medium text-green-400">Trenches</h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <a
                  href="https://liquidlaunch.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-green-500/30 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">L</span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">LiquidLaunch Trenches</h3>
                      <p className="text-gray-400 text-xs">HyperEVM Launchpad</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" />
                </a>
                
                <a
                  href="https://www.hyperliquid.magpiexyz.io/meme"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-green-500/30 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">H</span>
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm">Hyperpie</h3>
                      <p className="text-gray-400 text-xs">HyperLiquid Core Launchpad</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}