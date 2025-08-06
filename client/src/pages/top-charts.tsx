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
      <UniversalNavigation activePage="majors" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 lg:py-8">
        <div className="space-y-8">
          {/* Majors Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
                Majors
              </h2>
              <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                MAJOR PAIRS
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
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BITSTAMP%3ABTCUSD"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="Bitcoin Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
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
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=BITSTAMP%3AETHUSD')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BITSTAMP%3AETHUSD"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="Ethereum Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
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
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=BITSTAMP%3AXRPUSD')}
                      className="text-gray-400 hover:text-gray-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
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
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ASOLUSDT')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
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
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3ABNBUSDT"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="BNB Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
                    />
                  </div>
                </div>
              </Suspense>

              {/* SUI Chart */}
              <Suspense fallback={<SectionLoadingState title="SUI Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-green-400">SUI</h3>
                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                        SUI
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ASUIUSDT')}
                      className="text-green-400 hover:text-green-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
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

              {/* CHAINLINK Chart */}
              <Suspense fallback={<SectionLoadingState title="CHAINLINK Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-pink-400">CHAINLINK</h3>
                      <Badge variant="outline" className="bg-pink-500/20 text-pink-300 border-pink-500/30">
                        LINK
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ALINKUSDT')}
                      className="text-pink-400 hover:text-pink-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3ALINKUSDT"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="CHAINLINK Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
                    />
                  </div>
                </div>
              </Suspense>

              {/* Hyperliquid Chart */}
              <Suspense fallback={<SectionLoadingState title="Hyperliquid Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-blue-400">Hyperliquid</h3>
                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        HYPE
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=PYTH%3AHYPEUSD')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=PYTH%3AHYPEUSD"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="Hyperliquid Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
                    />
                  </div>
                </div>
              </Suspense>

              {/* Bittensor Chart */}
              <Suspense fallback={<SectionLoadingState title="Bittensor Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-orange-400">Bittensor</h3>
                      <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                        TAO
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=MEXC%3ATAOUSDT')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <div className="relative w-full h-[500px] sm:h-[600px] lg:h-[700px]">
                      <iframe
                        src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=100%25&interval=1D&range=ALL&style=1&toolbar_bg=0a0a0a&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&symbol=BINANCE%3ATAOUSDT"
                        className="w-full h-full rounded-lg border border-crypto-silver/20"
                        title="Bittensor Chart - Full History"
                        frameBorder="0"
                        scrolling="no"
                        allow="fullscreen"
                        loading="eager"
                      />
                      <div className="absolute top-2 right-2 text-xs text-orange-400/70 bg-black/50 px-2 py-1 rounded">
                        TAO Full History
                      </div>
                    </div>
                  </div>
                </div>
              </Suspense>

              {/* AVAX Chart */}
              <Suspense fallback={<SectionLoadingState title="AVAX Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-purple-400">AVAX</h3>
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        AVAX
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3AAVAXUSDT')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3AAVAXUSDT"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="AVAX Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
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
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3ADOGEUSDT"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="DOGE Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
                    />
                  </div>
                </div>
              </Suspense>

              {/* BONK Chart */}
              <Suspense fallback={<SectionLoadingState title="BONK Chart" />}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-yellow-400">BONK</h3>
                      <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        BONK
                      </Badge>
                    </div>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=MEXC%3ABONKUSDT')}
                      className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                  <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                    <iframe
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=MEXC%3ABONKUSDT"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="BONK Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
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
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3APENGUUSDT"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="PENGU Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
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
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3ABTC.D"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="BTC Dominance Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
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
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3AETH.D"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="ETH Dominance Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
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
                      src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTOCAP%3AOTHERS.D"
                      className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                      title="OTHERS Dominance Advanced Chart"
                      frameBorder="0"
                      scrolling="no"
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