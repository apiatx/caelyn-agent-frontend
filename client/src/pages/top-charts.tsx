import React, { Suspense } from 'react';
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import paintColorsBackground from "@assets/paint-colors-background-header_1756067291555.jpg";
import { SectionLoadingState } from "@/components/loading-screen";
import { openSecureLink } from "@/utils/security";
import { UniversalNavigation } from "@/components/universal-navigation";
import { useScrollFade } from "@/hooks/useScrollFade";
import TopDailyGainers from "@/components/top-daily-gainers";
import CryptoMarketDataBare from "@/components/crypto-market-data-bare";

export default function TopChartsPage() {
  const headerOpacity = useScrollFade(30, 120);

  return (
    <div className="min-h-screen bg-gradient-to-br from-crypto-dark via-black to-crypto-dark">
      <UniversalNavigation />
      
      <main className="pt-20 px-3 sm:px-4 lg:px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="relative bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl mb-6 lg:mb-8 overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{
                backgroundImage: `url(${paintColorsBackground})`,
                filter: 'brightness(0.4) saturate(1.2)'
              }}
            />
            <div className="relative p-4 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src={cryptoHippoImage}
                  alt="CryptoHippo"
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-yellow-400"
                />
                <div>
                  <h1 
                    className="text-xl sm:text-2xl lg:text-3xl font-bold text-white transition-opacity duration-300"
                    style={{ opacity: headerOpacity }}
                  >
                    Major Cryptocurrency Charts
                  </h1>
                  <p className="text-sm sm:text-base text-crypto-silver">
                    Bitcoin and Ethereum market analysis and leadership insights
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bitcoin Section */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-6 mb-6 lg:mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bitcoin Price Chart */}
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">₿</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Bitcoin Price</h3>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                      BTC/USD
                    </Badge>
                  </div>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BITSTAMP%3ABTCUSD')}
                    className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm sm:ml-auto"
                  >
                    Open in New Tab →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BITSTAMP%3ABTCUSD"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Bitcoin Price Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>

              {/* Bitcoin Dominance Chart */}
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">%</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">BTC Dominance</h3>
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                      BTC.D
                    </Badge>
                  </div>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=CRYPTOCAP%3ABTC.D')}
                    className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm sm:ml-auto"
                  >
                    Open in New Tab →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3ABTC.D"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Bitcoin Dominance Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </div>
            
            {/* Bitcoin Real-time Data */}
            <CryptoMarketDataBare symbol="BTC" />
          </div>

          {/* Ethereum Section */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-6 mb-6 lg:mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Ethereum Price Chart */}
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">Ξ</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Ethereum Price</h3>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      ETH/USD
                    </Badge>
                  </div>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BITSTAMP%3AETHUSD')}
                    className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm sm:ml-auto"
                  >
                    Open in New Tab →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BITSTAMP%3AETHUSD"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Ethereum Price Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>

              {/* Ethereum Dominance Chart */}
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">%</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">ETH Dominance</h3>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      ETH.D
                    </Badge>
                  </div>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=CRYPTOCAP%3AETH.D')}
                    className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm sm:ml-auto"
                  >
                    Open in New Tab →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3AETH.D"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="ETH Dominance Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </div>
            
            {/* Ethereum Real-time Data */}
            <CryptoMarketDataBare symbol="ETH" />
          </div>


          {/* Additional Market Data Section */}
          <div className="space-y-6">
            {/* Top 10 Daily Gainers */}
            <TopDailyGainers />
            
            <div className="text-center px-3 sm:px-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Comprehensive Market Data</h2>
              <p className="text-sm sm:text-base text-crypto-silver">Bitcoin and Ethereum market leadership analysis</p>
              
              {/* CoinMarketCap Button */}
              <div className="mt-4">
                <button
                  onClick={() => openSecureLink('https://coinmarketcap.com/')}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  View on CoinMarketCap
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}