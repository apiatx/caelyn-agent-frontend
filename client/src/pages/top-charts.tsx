import React, { Suspense } from 'react';
import { Badge } from "@/components/ui/badge";
import hippoImage from "@assets/image_1753204691716.png";
import { SectionLoadingState } from "@/components/loading-screen";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import { UniversalNavigation } from "@/components/universal-navigation";

export default function TopChartsPage() {
  return (
    <div className="min-h-screen text-white" style={{background: 'linear-gradient(135deg, hsl(0, 0%, 0%) 0%, hsl(0, 0%, 10%) 50%, hsl(0, 0%, 0%) 100%)'}}>
      {/* Header */}
      <header className="glass-card-dark border-b border-crypto-silver/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
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
      <UniversalNavigation activePage="top-charts" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="space-y-8">
          {/* Top Charts Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
                Top Charts
              </h2>
              <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                LIVE CHARTS
              </Badge>
            </div>
            
            {/* Charts Grid */}
            <div className="grid gap-6">
              {/* Bitcoin Chart */}
              <Suspense fallback={<SectionLoadingState title="Bitcoin Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-orange-400">Bitcoin</h3>
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                        BTC
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ABTCUSDT')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=BINANCE%3ABTCUSDT&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>

              {/* Ethereum Chart */}
              <Suspense fallback={<SectionLoadingState title="Ethereum Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-blue-400">Ethereum</h3>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        ETH
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3AETHUSDT')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=BINANCE%3AETHUSDT&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>

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
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3AXRPUSDT')}
                      className="text-gray-400 hover:text-gray-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=BINANCE%3AXRPUSDT&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
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
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ASOLUSDT')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=BINANCE%3ASOLUSDT&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>

              {/* BNB Chart */}
              <Suspense fallback={<SectionLoadingState title="BNB Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-yellow-400">BNB</h3>
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        BNB
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ABNBUSDT')}
                      className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=BINANCE%3ABNBUSDT&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>

              {/* DOGE Chart */}
              <Suspense fallback={<SectionLoadingState title="DOGE Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-orange-400">DOGE</h3>
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                        DOGE
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ADOGEUSDT')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=BINANCE%3ADOGEUSDT&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>

              {/* PENGU Chart */}
              <Suspense fallback={<SectionLoadingState title="PENGU Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-cyan-400">PENGU</h3>
                      <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                        PENGU
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3APENGUUSDT')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=BINANCE%3APENGUUSDT&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>

              {/* BTC Dominance Chart */}
              <Suspense fallback={<SectionLoadingState title="BTC Dominance Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-orange-400">BTC Dominance</h3>
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                        BTC.D
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=CRYPTOCAP%3ABTC.D')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=CRYPTOCAP%3ABTC.D&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>

              {/* ETH Dominance Chart */}
              <Suspense fallback={<SectionLoadingState title="ETH Dominance Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-blue-400">ETH Dominance</h3>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        ETH.D
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=CRYPTOCAP%3AETH.D')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=CRYPTOCAP%3AETH.D&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>

              {/* OTHERS Dominance Chart */}
              <Suspense fallback={<SectionLoadingState title="OTHERS Dominance Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-purple-400">OTHERS Dominance</h3>
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        OTHERS.D
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=CRYPTOCAP%3AOTHERS.D')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&symbol=CRYPTOCAP%3AOTHERS.D&hide_top_toolbar=false&disabled_features=[]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22]"
                      width="100%"
                      height="500"
                      frameBorder="0"
                      allowTransparency={true}
                      scrolling="no"
                      style={{ border: 'none' }}
                    />
                  </div>
                </div>
              </Suspense>
            </div>
          </div>

          {/* Other Altcoin Charts Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Other Altcoin Charts
              </h2>
              <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                ALTCOINS
              </Badge>
            </div>
            
            {/* Velo Chart */}
            <Suspense fallback={<SectionLoadingState title="Velo Chart" />}>
              <div className="space-y-3">
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-8">
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-lg font-bold">
                      V
                    </div>
                    <h4 className="text-xl font-semibold text-white">Velo Charts</h4>
                    <p className="text-crypto-silver max-w-md">
                      Access comprehensive Velo trading charts and analytics on the official Velo platform.
                    </p>
                    <button
                      onClick={() => window.open('https://velo.xyz/chart', '_blank', 'noopener,noreferrer')}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Velo Charts
                    </button>
                  </div>
                </div>
              </div>
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}