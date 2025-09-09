import React, { Suspense } from 'react';
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import { SectionLoadingState } from "@/components/loading-screen";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import { UniversalNavigation } from "@/components/universal-navigation";
import { useScrollFade } from "@/hooks/useScrollFade";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import TopDailyGainers from "@/components/top-daily-gainers";
import CryptoMarketDataBare from "@/components/crypto-market-data-bare";
import solanaLogo from "@assets/solana_1755977414939.png";
import hyperliquidLogo from "@assets/hyperliquid-logo_1755977414943.png";
import bittensorLogo from "@assets/bittensor_1755977414942.png";
import bnbLogo from "@assets/eb2349c3-b2f8-4a93-a286-8f86a62ea9d8_1757138768380.png";
import suiLogo from "@assets/images (2)_1757139042170.jpeg";
import dogecoinLogo from "@assets/dogecoin-doge-cryptocurrency-golden-currency-600nw-2293972845_1757205415591.webp";

export default function AltcoinsPage() {
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
            backgroundImage: `url(${newHeaderBackground})`,
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
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight">
                  CryptoHippo
                </h1>
                <p className="text-xs sm:text-sm text-crypto-silver leading-tight">
                  Portfolio Management Platform
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <img src={criptomonedas} alt="Crypto" className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
        <UniversalNavigation />
      </header>

      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-6 lg:py-8 space-y-6">
        <div className="space-y-6">
          {/* Page Title */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-between w-full">
              {/* Left side - 3 images */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-yellow-400/50 shadow-lg">
                  <img src={solanaLogo} alt="Solana" className="w-full h-full object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-400/50 shadow-lg">
                  <img src={hyperliquidLogo} alt="Hyperliquid" className="w-full h-full object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-green-400/50 shadow-lg">
                  <img src={dogecoinLogo} alt="Dogecoin" className="w-full h-full object-cover" />
                </div>
              </div>
              
              {/* Center text */}
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mx-4">Altcoins</h2>
              
              {/* Right side - 3 images */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-red-400/50 shadow-lg">
                  <img src={bittensorLogo} alt="Bittensor" className="w-full h-full object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-yellow-400/50 shadow-lg">
                  <img src={bnbLogo} alt="BNB" className="w-full h-full object-cover" />
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-400/50 shadow-lg">
                  <img src={suiLogo} alt="SUI" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            <p className="text-sm sm:text-base text-crypto-silver">Alternative cryptocurrencies and emerging market opportunities</p>
          </div>

          {/* Daily Gainers */}
          <div className="space-y-4">
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-4 lg:p-6 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
              <div className="flex items-center justify-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-white text-center">📈 24h Gainers (CMC Top 100)</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  LIVE
                </Badge>
              </div>
              <Suspense fallback={<SectionLoadingState />}>
                <TopDailyGainers />
              </Suspense>
            </div>
          </div>

          {/* More Charts */}
          <Suspense fallback={<SectionLoadingState title="More Charts" />}>
            <div className="space-y-3">
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-orange-400">More Charts</h3>
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                      ANALYTICS
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://www.coinglass.com/tv/Binance_BTCUSDT')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open CoinGlass →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://www.coinglass.com/tv/Binance_BTCUSDT"
                    className="w-full h-[500px] sm:h-[700px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="CoinGlass SuperCharts"
                    frameBorder="0"
                    scrolling="no"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                  />
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => window.open('https://velo.xyz/chart', '_blank', 'noopener,noreferrer')}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View Velo Charts
                  </button>
                </div>
              </div>
            </div>
          </Suspense>

        </div>
      </main>
    </div>
  );
}