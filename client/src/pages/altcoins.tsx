import React, { Suspense } from 'react';
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import { SectionLoadingState } from "@/components/loading-screen";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import { UniversalNavigation } from "@/components/universal-navigation";
import { useScrollFade } from "@/hooks/useScrollFade";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
import TopDailyGainers from "@/components/top-daily-gainers";

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
      <UniversalNavigation activePage="altcoins" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-6 lg:space-y-8">
          <div className="text-center px-3 sm:px-0">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center border-2 border-yellow-400">
                <span className="text-yellow-400 font-bold text-lg">🪙</span>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Altcoins</h2>
            </div>
            <p className="text-sm sm:text-base text-crypto-silver">Alternative cryptocurrencies and emerging market opportunities</p>
          </div>

          {/* Daily Gainers */}
          <div className="space-y-4">
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-4 lg:p-6 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold text-white">📈 Top Daily Gainers</h3>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  LIVE
                </Badge>
              </div>
              <Suspense fallback={<SectionLoadingState />}>
                <TopDailyGainers />
              </Suspense>
            </div>
          </div>

          {/* CoinGecko Global Cryptocurrency Charts */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-4 lg:p-6 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">📊 Alternative Crypto Markets</h3>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  COINGECKO
                </Badge>
              </div>
              <button 
                onClick={() => openSecureLink('https://www.coingecko.com/en/coins/categories')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                data-testid="button-open-categories"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg overflow-hidden bg-black/20 border border-crypto-silver/10">
              <iframe
                {...getSecureIframeProps(
                  "https://www.coingecko.com/en/coins/categories?embed_pnl_coins=true",
                  "CoinGecko Alternative Crypto Categories"
                )}
                className="w-full h-[600px] rounded-lg"
                data-testid="iframe-coingecko-categories"
              />
            </div>
          </div>

          {/* CoinMarketCap Altcoin Season Index */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-4 lg:p-6 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">🌊 Altcoin Season Index</h3>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  MARKET SENTIMENT
                </Badge>
              </div>
              <button 
                onClick={() => openSecureLink('https://coinmarketcap.com/charts/')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                data-testid="button-open-altcoin-season"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg overflow-hidden bg-black/20 border border-crypto-silver/10">
              <iframe
                {...getSecureIframeProps(
                  "https://coinmarketcap.com/charts/?embed=true",
                  "CoinMarketCap Altcoin Season Charts"
                )}
                className="w-full h-[500px] rounded-lg"
                data-testid="iframe-altcoin-season"
              />
            </div>
          </div>

          {/* DeFiPulse Alternative Crypto Categories */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-4 lg:p-6 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">🏛️ DeFi Protocols</h3>
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                  DEFI PULSE
                </Badge>
              </div>
              <button 
                onClick={() => openSecureLink('https://defipulse.com/')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                data-testid="button-open-defipulse"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg overflow-hidden bg-black/20 border border-crypto-silver/10">
              <iframe
                {...getSecureIframeProps(
                  "https://defipulse.com/",
                  "DeFiPulse Protocol Rankings"
                )}
                className="w-full h-[600px] rounded-lg"
                data-testid="iframe-defipulse"
              />
            </div>
          </div>

          {/* Alternative Crypto Market Analysis */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-4 lg:p-6 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">📈 Alternative Crypto Market Cap</h3>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  TRADINGVIEW
                </Badge>
              </div>
              <button 
                onClick={() => openSecureLink('https://www.tradingview.com/markets/cryptocurrencies/prices-all/')}
                className="text-blue-400 hover:text-blue-300 transition-colors"
                data-testid="button-open-altcoin-marketcap"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg overflow-hidden bg-black/20 border border-crypto-silver/10">
              <iframe
                {...getSecureIframeProps(
                  "https://www.tradingview.com/widget-docs/widgets/screener/",
                  "TradingView Altcoin Screener"
                )}
                className="w-full h-[600px] rounded-lg"
                data-testid="iframe-altcoin-screener"
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}