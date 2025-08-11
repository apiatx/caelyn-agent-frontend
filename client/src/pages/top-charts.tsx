import React, { Suspense } from 'react';
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import hippoImage from "@assets/image_1753204691716.png";
import { SectionLoadingState } from "@/components/loading-screen";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import { UniversalNavigation } from "@/components/universal-navigation";

export default function TopChartsPage() {
  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50">
        <div className="max-w-[95vw] mx-auto px-2 sm:px-3">
          <div className="flex justify-between items-center py-3 lg:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden">
                <img 
                  src={hippoImage}
                  alt="CryptoHippo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                CryptoHippo
              </h1>
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
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Major Cryptocurrencies</h2>
            <p className="text-sm sm:text-base text-crypto-silver">Bitcoin and Ethereum price action and market dominance analysis</p>
          </div>

          {/* Bitcoin Charts - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Bitcoin Price Chart */}
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">₿</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">Bitcoin Price Chart</h3>
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                    BITCOIN
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BTCUSD')}
                  className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm sm:ml-auto"
                >
                  Open in New Tab →
                </button>
              </div>
              <div className="w-full">
                <iframe
                  src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_btc&symbol=BINANCE%3ABTCUSDT&interval=1D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0a0a&studies=[]&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22,%22timeframes_toolbar%22,%22show_interval_dialog_on_key_press%22]&disabled_features=[]&locale=en&utm_source=cryptohippo.com&utm_medium=widget&utm_campaign=chart&utm_term=BINANCE%3ABTCUSDT"
                  className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                  title="Bitcoin Chart"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            </div>

            {/* BTC Dominance Chart */}
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6">
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
                  src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_btcd&symbol=CRYPTOCAP%3ABTC.D&interval=1D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0a0a&studies=[]&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22,%22timeframes_toolbar%22,%22show_interval_dialog_on_key_press%22]&disabled_features=[]&locale=en&utm_source=cryptohippo.com&utm_medium=widget&utm_campaign=chart&utm_term=CRYPTOCAP%3ABTC.D"
                  className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                  title="BTC Dominance Chart"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            </div>
          </div>

          {/* Ethereum Charts - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Ethereum Price Chart */}
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">Ξ</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">Ethereum Price Chart</h3>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                    ETHEREUM
                  </Badge>
                </div>
                <button
                  onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=ETHUSD')}
                  className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm sm:ml-auto"
                >
                  Open in New Tab →
                </button>
              </div>
              <div className="w-full">
                <iframe
                  src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_eth&symbol=BINANCE%3AETHUSDT&interval=1D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0a0a&studies=[]&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22,%22timeframes_toolbar%22,%22show_interval_dialog_on_key_press%22]&disabled_features=[]&locale=en&utm_source=cryptohippo.com&utm_medium=widget&utm_campaign=chart&utm_term=BINANCE%3AETHUSDT"
                  className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                  title="Ethereum Chart"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            </div>

            {/* ETH Dominance Chart */}
            <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6">
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
                  src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_ethd&symbol=CRYPTOCAP%3AETH.D&interval=1D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0a0a&studies=[]&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22,%22timeframes_toolbar%22,%22show_interval_dialog_on_key_press%22]&disabled_features=[]&locale=en&utm_source=cryptohippo.com&utm_medium=widget&utm_campaign=chart&utm_term=CRYPTOCAP%3AETH.D"
                  className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                  title="ETH Dominance Chart"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                />
              </div>
            </div>
          </div>

          {/* OTHERS Dominance Chart */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6">
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
                src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_othersd&symbol=CRYPTOCAP%3AOTHERS.D&interval=1D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0a0a&studies=[]&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22,%22timeframes_toolbar%22,%22show_interval_dialog_on_key_press%22]&disabled_features=[]&locale=en&utm_source=cryptohippo.com&utm_medium=widget&utm_campaign=chart&utm_term=CRYPTOCAP%3AOTHERS.D"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="OTHERS Dominance Chart"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>

          {/* Additional Charts Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-500 to-green-600 bg-clip-text text-transparent">
                Additional Markets
              </h2>
              <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                ALTCOINS
              </Badge>
            </div>
            
            {/* XRP Chart */}
            <Suspense fallback={<SectionLoadingState title="XRP Chart" />}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-400">XRP</h3>
                    <Badge variant="outline" className="bg-gray-500/20 text-gray-300 border-gray-500/30">
                      XRP
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/xrp/')}
                      className="text-gray-400 hover:text-gray-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BITSTAMP%3AXRPUSD')}
                      className="text-gray-400 hover:text-gray-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BITSTAMP%3AXRPUSD"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="XRP Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </Suspense>

            {/* Solana Chart */}
            <Suspense fallback={<SectionLoadingState title="Solana Chart" />}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-purple-400">Solana</h3>
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      SOL
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/solana/')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ASOLUSDT')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3ASOLUSDT"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="Solana Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              </div>
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}