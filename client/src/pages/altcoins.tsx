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
import CryptoMarketDataBare from "@/components/crypto-market-data-bare";

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

          {/* DeFi Protocol Link */}
          <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-4 lg:p-6 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-lg font-bold">
                🏛️
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">DeFi Protocols</h3>
                <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                  DEFI ANALYTICS
                </Badge>
              </div>
              <p className="text-crypto-silver max-w-md">
                Explore DeFi protocol rankings, TVL analytics, and yield farming opportunities.
              </p>
              <button
                onClick={() => openSecureLink('https://defillama.com/protocols')}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
                data-testid="button-open-defillama"
              >
                <ExternalLink className="w-4 h-4" />
                View DeFi Protocols
              </button>
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

          {/* Individual Altcoin Charts */}
          <div className="space-y-6 lg:space-y-8">
            {/* XRP Chart */}
            <Suspense fallback={<SectionLoadingState title="XRP Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-blue-400">XRP</h3>
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      XRP
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/xrp/')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BITSTAMP%3AXRPUSD')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
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
                <CryptoMarketDataBare symbol="XRP" />
              </div>
            </Suspense>

            {/* BNB Chart */}
            <Suspense fallback={<SectionLoadingState title="BNB Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-yellow-400">BNB</h3>
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                      BNB
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/bnb/')}
                      className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ABNBUSDT')}
                      className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
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
                <CryptoMarketDataBare symbol="BNB" />
              </div>
            </Suspense>

            {/* Solana Chart */}
            <Suspense fallback={<SectionLoadingState title="Solana Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
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
                <CryptoMarketDataBare symbol="SOL" />
              </div>
            </Suspense>

            {/* DOGE Chart */}
            <Suspense fallback={<SectionLoadingState title="DOGE Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-orange-400">DOGE</h3>
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                      DOGE
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/dogecoin/')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ADOGEUSDT')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
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
                <CryptoMarketDataBare symbol="DOGE" />
              </div>
            </Suspense>

            {/* Chainlink Chart */}
            <Suspense fallback={<SectionLoadingState title="Chainlink Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-blue-400">Chainlink</h3>
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      LINK
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/chainlink/')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ALINKUSDT')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
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
                <CryptoMarketDataBare symbol="LINK" />
              </div>
            </Suspense>

            {/* Hyperliquid Chart */}
            <Suspense fallback={<SectionLoadingState title="Hyperliquid Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-cyan-400">Hyperliquid</h3>
                    <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                      HYPE
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/hyperliquid/')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=PYTH%3AHYPEUSD')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
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
                <CryptoMarketDataBare symbol="HYPE" />
              </div>
            </Suspense>

            {/* SUI Chart */}
            <Suspense fallback={<SectionLoadingState title="SUI Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-green-400">SUI</h3>
                    <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                      SUI
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/sui/')}
                      className="text-green-400 hover:text-green-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ASUIUSDT')}
                      className="text-green-400 hover:text-green-300 text-xs sm:text-sm"
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
                <CryptoMarketDataBare symbol="SUI" />
              </div>
            </Suspense>

            {/* Monero Chart */}
            <Suspense fallback={<SectionLoadingState title="Monero Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-orange-400">Monero</h3>
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                      XMR
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/monero/')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=KRAKEN%3AXMRUSD')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=KRAKEN%3AXMRUSD"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="XMR Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
                <CryptoMarketDataBare symbol="XMR" />
              </div>
            </Suspense>

            {/* ENA Chart */}
            <Suspense fallback={<SectionLoadingState title="ENA Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-purple-400">Ethena</h3>
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      ENA
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/ethena/')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=BINANCE%3AENAUSDT')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3AENAUSDT"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="ENA Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
                <CryptoMarketDataBare symbol="ENA" />
              </div>
            </Suspense>

            {/* Bittensor Chart */}
            <Suspense fallback={<SectionLoadingState title="Bittensor Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-orange-400">Bittensor</h3>
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                      TAO
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/bittensor/')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BITGET%3ATAOUSDT')}
                      className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BITGET%3ATAOUSDT"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="Bittensor Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
                <CryptoMarketDataBare symbol="TAO" />
              </div>
            </Suspense>

            {/* Ondo Finance Chart */}
            <Suspense fallback={<SectionLoadingState title="Ondo Finance Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-purple-400">Ondo Finance</h3>
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      ONDO
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/ondo-finance/')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=BYBIT%3AONDOUSDT')}
                      className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BYBIT%3AONDOUSDT"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="Ondo Finance Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
                <CryptoMarketDataBare symbol="ONDO" />
              </div>
            </Suspense>

            {/* PENGU Chart */}
            <Suspense fallback={<SectionLoadingState title="PENGU Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
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
                <CryptoMarketDataBare symbol="PENGU" />
              </div>
            </Suspense>

            {/* SEI Chart */}
            <Suspense fallback={<SectionLoadingState title="SEI Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-red-400">Sei</h3>
                    <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-500/30">
                      SEI
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/sei/')}
                      className="text-red-400 hover:text-red-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=BINANCE%3ASEIUSDT')}
                      className="text-red-400 hover:text-red-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3ASEIUSDT"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="SEI Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
                <CryptoMarketDataBare symbol="SEI" />
              </div>
            </Suspense>

            {/* BONK Chart */}
            <Suspense fallback={<SectionLoadingState title="BONK Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-yellow-400">BONK</h3>
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                      BONK
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/bonk/')}
                      className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=MEXC%3ABONKUSDT')}
                      className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
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
                <CryptoMarketDataBare symbol="BONK" />
              </div>
            </Suspense>

            {/* AERO Chart */}
            <Suspense fallback={<SectionLoadingState title="AERO Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-blue-400">Aerodrome Finance</h3>
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      AERO
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/aerodrome-finance/')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=COINBASE%3AAEROUSD')}
                      className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=COINBASE%3AAEROUSD"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="AERO Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
                <CryptoMarketDataBare symbol="AERO" />
              </div>
            </Suspense>

            {/* VIRTUAL Chart */}
            <Suspense fallback={<SectionLoadingState title="VIRTUAL Chart" />}>
              <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-3 sm:p-4 lg:p-6 space-y-4 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-cyan-400">VIRTUAL</h3>
                    <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                      VIRTUAL
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => openSecureLink('https://coinmarketcap.com/currencies/virtuals-protocol/')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      CoinMarketCap
                    </button>
                    <button
                      onClick={() => openSecureLink('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTO%3AVIRTUALUSD')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm"
                    >
                      Open Full View →
                    </button>
                  </div>
                </div>
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
                  <iframe
                    src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CRYPTO%3AVIRTUALUSD"
                    className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
                    title="VIRTUAL Advanced Chart"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
                <CryptoMarketDataBare symbol="VIRTUAL" />
              </div>
            </Suspense>

            {/* Velo Chart */}
            <Suspense fallback={<SectionLoadingState title="Velo Chart" />}>
              <div className="space-y-3">
                <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-8 transform transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-crypto-warning/20">
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-lg font-bold">
                      V
                    </div>
                    <h4 className="text-xl font-semibold text-white">Velo Charts</h4>
                    <p className="text-crypto-silver max-w-md">
                      Access comprehensive altcoin trading charts and analytics.
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