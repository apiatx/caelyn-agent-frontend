import React, { Suspense } from 'react';
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import bitcoinLogo from "@assets/Bitcoin.svg_1755979187828.webp";
import ethereumLogo from "@assets/Ethereum_logo_2014.svg_1755977414942.png";
import cryptoHippoImage from "@assets/Gls1Y3XG_400x400_1755979622876.jpg";
import criptomonedas from "@assets/Criptomonedas-r3pu02e09qriw0f9pyqx2rtyhwsri4es6sdgff2ebk_1757225856373.png";
import { SectionLoadingState } from "@/components/loading-screen";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import { UniversalNavigation } from "@/components/universal-navigation";
import { useScrollFade } from "@/hooks/useScrollFade";
import newHeaderBackground from "@assets/photo-1504333638930-c8787321eee0_1757208194192.avif";
import CryptoMarketData from "@/components/crypto-market-data";
import CryptoMarketDataBare from "@/components/crypto-market-data-bare";
import TopDailyGainers from "@/components/top-daily-gainers";

export default function TopChartsPage() {
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
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white drop-shadow-lg">
                CryptoHippo
              </h1>
            </div>
            {/* Top-right crypto image */}
            <div className="hidden sm:flex items-center">
              <img 
                src={criptomonedas}
                alt="Crypto Coins"
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain drop-shadow-lg"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <UniversalNavigation activePage="majors" />

      {/* Main Content */}
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4">
        <div className="space-y-6 lg:space-y-8">
          <div className="text-center px-3 sm:px-0">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center">
                <img 
                  src={bitcoinLogo}
                  alt="Bitcoin"
                  className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                  style={{filter: 'drop-shadow(0 0 4px rgba(255, 165, 0, 0.3))'}}
                />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Major Cryptocurrencies</h2>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center">
                <img 
                  src={ethereumLogo}
                  alt="Ethereum"
                  className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                  style={{filter: 'drop-shadow(0 0 4px rgba(70, 130, 180, 0.3))'}}
                />
              </div>
            </div>
            <p className="text-sm sm:text-base text-crypto-silver">Bitcoin and Ethereum price action and market dominance analysis</p>
          </div>

          {/* Bitcoin Section */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center">
                  <img 
                    src={bitcoinLogo}
                    alt="Bitcoin"
                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                    style={{filter: 'drop-shadow(0 0 4px rgba(255, 165, 0, 0.3))'}}
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Bitcoin</h2>
              </div>
            </div>
            {/* Bitcoin Charts - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Bitcoin Price Chart */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">₿</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">BTC Price Chart</h3>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/bitcoin/')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      CMC <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-crypto-silver text-xs">|</span>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BTCUSD')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                    >
                      Open in New Tab →
                    </button>
                  </div>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3ABTCUSDT"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Bitcoin Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>

              {/* BTC Dominance Chart */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">%</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">BTC Dominance</h3>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      BTC.D
                    </Badge>
                  </div>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=CRYPTOCAP%3ABTC.D')}
                    className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm sm:ml-auto"
                  >
                    Open in New Tab →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3ABTC.D"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="BTC Dominance Chart"
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
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-xl flex items-center justify-center">
                  <img 
                    src={ethereumLogo}
                    alt="Ethereum"
                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                    style={{filter: 'drop-shadow(0 0 4px rgba(70, 130, 180, 0.3))'}}
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">Ethereum</h2>
              </div>
            </div>
            {/* Ethereum Charts - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Ethereum Price Chart */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">Ξ</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">ETH Price Chart</h3>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      ETHEREUM
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/ethereum/')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      CMC <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-crypto-silver text-xs">|</span>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=ETHUSD')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                    >
                      Open in New Tab →
                    </button>
                  </div>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3AETHUSDT"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Ethereum Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>

              {/* ETH Dominance Chart */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
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


          {/* Crypto Total Market Cap Section */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Crypto Total Market Cap</h2>
            </div>
            {/* Top Row - Market Cap Charts Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6">
              {/* Crypto Total Market Cap Chart */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">$</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">BTC + ALTS</h3>
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      BTC + ALTS
                    </Badge>
                  </div>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTOCAP%3ATOTAL')}
                    className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm sm:ml-auto"
                  >
                    Open in New Tab →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3ATOTAL"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Crypto Total Market Cap"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>

              {/* Total Market Cap Excluding BTC Chart */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-teal-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">$</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">ALTS</h3>
                    <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">
                      ALTS
                    </Badge>
                  </div>
                  <button
                    onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTOCAP%3ATOTAL2')}
                    className="text-teal-400 hover:text-teal-300 text-xs sm:text-sm sm:ml-auto"
                  >
                    Open in New Tab →
                  </button>
                </div>
                <div className="w-full">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3ATOTAL2"
                    className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                    title="Total Market Cap Excluding BTC"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row - OTHERS Dominance Chart Full Width */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">%</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">OTHERS Dominance</h3>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    OTHERS.D
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=CRYPTOCAP%3AOTHERS.D')}
                  className="text-green-400 hover:text-green-300 text-xs sm:text-sm sm:ml-auto"
                >
                  Open in New Tab →
                </button>
              </div>
              <div className="w-full">
                <iframe
                  src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3AOTHERS.D"
                  className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                  title="OTHERS Dominance Chart"
                  frameBorder="0"
                  scrolling="no"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}