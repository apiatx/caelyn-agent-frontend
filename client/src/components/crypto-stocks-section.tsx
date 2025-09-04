import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ExternalLink, Bitcoin, FileText, TrendingUp, Briefcase, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

// SafeLink component for secure external links
const SafeLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={className}
  >
    {children}
  </a>
);

// Glass card component for crypto stocks
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function CryptoStocksSection() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Page Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">📈</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Stonks</h1>
        </div>
        <p className="text-crypto-silver">AI-powered financial analysis and market intelligence</p>
      </div>

      {/* TradingView - SPX */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">S&P 500</h3>
            <Badge className="bg-gradient-to-r from-blue-500/20 to-green-500/20 text-white border-crypto-silver/30 text-xs">
              SPX
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => openInNewTab('https://www.tradingview.com/symbols/SPX/?exchange=SP&timeframe=ALL')}
              className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
            >
              Open Symbol →
            </button>
            <button
              onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/?symbol=SP%3ASPX')}
              className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
            >
              Open Chart →
            </button>
          </div>
        </div>

        <div className="w-full">
          <iframe
            src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=CAPITALCOM%3AUS500"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="S&P 500 (CAPITALCOM:US500) Chart"
            frameBorder="0"
            scrolling="no"
            allow="fullscreen"
          />
        </div>
      </GlassCard>


      {/* Portfolio */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Portfolio</h3>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              PORTFOLIO
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://finance.yahoo.com/portfolios')}
            className="text-green-400 hover:text-green-300 text-xs sm:text-sm flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Open Full View
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => openInNewTab('https://finance.yahoo.com/portfolios')}
            className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/20 hover:border-yellow-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-yellow-300 mb-1">Yahoo Finance Portfolios</div>
            <div className="text-xs text-crypto-silver">Portfolio tracking and analysis</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://simplywall.st/portfolio/65b1f9ab-7fa4-4d25-95c6-b8fa93d94d77/holdings')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Simply Wall St - Portfolio Analytics</div>
            <div className="text-xs text-crypto-silver">Portfolio analysis and stock insights</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://client.schwab.com/clientapps/accounts/summary/')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Charles Schwab</div>
            <div className="text-xs text-crypto-silver">Investment account dashboard</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://home.personalcapital.com/page/login/app#/dashboard')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Empower Net Worth</div>
            <div className="text-xs text-crypto-silver">Net worth tracking and financial planning</div>
          </button>
        </div>
      </GlassCard>

      {/* Screening */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Screening</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              STOCK SCREENERS
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <button
            onClick={() => openInNewTab('https://finviz.com/')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Finviz</div>
            <div className="text-xs text-crypto-silver">Stock screener and market visualization</div>
          </button>

          <button
            onClick={() => openInNewTab('https://stocktwits.com/')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">StockTwits</div>
            <div className="text-xs text-crypto-silver">Social trading platform</div>
          </button>

          <button
            onClick={() => openInNewTab('https://www.kavout.com/')}
            className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 hover:from-teal-500/20 hover:to-teal-600/20 border border-teal-500/20 hover:border-teal-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-teal-300 mb-1">Kavout</div>
            <div className="text-xs text-crypto-silver">AI-powered investment research platform</div>
          </button>

          <button
            onClick={() => openInNewTab('https://www.ainvest.com/screener/')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">AInvest</div>
            <div className="text-xs text-crypto-silver">AI-powered stock screening and analysis</div>
          </button>

          <button
            onClick={() => openInNewTab('https://www.thenew.money/')}
            className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 hover:from-emerald-500/20 hover:to-emerald-600/20 border border-emerald-500/20 hover:border-emerald-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-emerald-300 mb-1">TheNew.Money</div>
            <div className="text-xs text-crypto-silver">Financial market intelligence and analysis</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://stockanalysis.com/trending/')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">StockAnalysis.com</div>
            <div className="text-xs text-crypto-silver">Trending stocks and market analysis</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://www.tipranks.com/dashboard')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">TipRanks</div>
            <div className="text-xs text-crypto-silver">Analyst ratings and stock insights</div>
          </button>

          <button
            onClick={() => openInNewTab('https://tradytics.com/charts')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Tradytics</div>
            <div className="text-xs text-crypto-silver">Advanced options flow and analytics</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://app.intellectia.ai/stock-market')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Intellectia AI</div>
            <div className="text-xs text-crypto-silver">AI-powered stock market analytics</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://www.screener.in/explore/')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Screener.in</div>
            <div className="text-xs text-crypto-silver">Indian stock screening and exploration</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://finance.yahoo.com/markets/stocks/most-active/')}
            className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/20 hover:border-yellow-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-yellow-300 mb-1">Yahoo Finance Most Active</div>
            <div className="text-xs text-crypto-silver">Most actively traded stocks</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://app.koyfin.com/home')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Koyfin</div>
            <div className="text-xs text-crypto-silver">Professional market data and analytics</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://unusualwhales.com/stock-screener')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Unusual Whales</div>
            <div className="text-xs text-crypto-silver">Whale activity and stock screening</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://www.barchart.com/news/chart-of-the-day')}
            className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Chart of the day</div>
            <div className="text-xs text-crypto-silver">Daily featured charts and market insights</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://atypica.ai/study')}
            className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 hover:from-indigo-500/20 hover:to-indigo-600/20 border border-indigo-500/20 hover:border-indigo-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-indigo-300 mb-1">Atypica AI Study</div>
            <div className="text-xs text-crypto-silver">AI-driven market research and analysis</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://www.marketwatch.com/')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">MarketWatch</div>
            <div className="text-xs text-crypto-silver">Financial news and market data</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://www.cnn.com/markets/premarkets')}
            className="bg-gradient-to-br from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/20 hover:border-red-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-red-300 mb-1">CNN Pre-Market</div>
            <div className="text-xs text-crypto-silver">Live premarket trading data and futures</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://www.cnn.com/markets/after-hours')}
            className="bg-gradient-to-br from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/20 hover:border-red-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-red-300 mb-1">CNN After-Hours</div>
            <div className="text-xs text-crypto-silver">After-hours trading data and analysis</div>
          </button>
        </div>
      </GlassCard>

      {/* Indices */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Indices</h3>
            <Badge className="bg-gradient-to-r from-green-500/20 to-blue-500/20 text-white border-crypto-silver/30 text-xs">
              STOCK MARKET DATA
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.slickcharts.com/')}
            className="text-crypto-silver hover:text-white text-xs sm:text-sm flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Open Full View
          </button>
        </div>

        <div className="w-full">
          <iframe
            src="https://www.slickcharts.com/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Slickcharts Stock Market Data"
            loading="eager"
            referrerPolicy="unsafe-url"
            allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
            frameBorder="0"
          />
        </div>
      </GlassCard>

      {/* M2 Global Liquidity Index Chart */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">M2</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">M2 Global Liquidity Index</h3>
            <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
              LIQUIDITY
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openInNewTab('https://www.tradingview.com/script/34U4rcdC/')}
              className="text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm flex items-center gap-1"
            >
              M2 / BTC <ExternalLink className="w-3 h-3" />
            </button>
            <span className="text-crypto-silver text-xs">|</span>
            <button
              onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/')}
              className="text-indigo-400 hover:text-indigo-300 text-xs sm:text-sm"
            >
              Open in New Tab →
            </button>
          </div>
        </div>

        <div className="w-full">
          <iframe
            src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_m2global&symbol=FRED%3AM2SL&interval=1M&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0a0a&studies=[]&hideideas=1&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22,%22timeframes_toolbar%22,%22show_interval_dialog_on_key_press%22]&disabled_features=[]&locale=en&utm_source=cryptohippo.com&utm_medium=widget&utm_campaign=chart&utm_term=FRED%3AM2SL"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="M2 Global Liquidity Index Chart"
            frameBorder="0"
            scrolling="no"
          />
        </div>
      </GlassCard>

      {/* X Alpha */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">𝕏</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">X Alpha</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              SIGNAL
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <SafeLink
            href='https://x.com/RebellioMarket'
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300">RebellioMarket</div>
            <div className="text-xs text-crypto-silver">@RebellioMarket</div>
          </SafeLink>

          <SafeLink
            href='https://x.com/StocksToTrade'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">StocksToTrade</div>
            <div className="text-xs text-crypto-silver">@StocksToTrade</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/timothysykes'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Timothy Sykes</div>
            <div className="text-xs text-crypto-silver">@timothysykes</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/Parangiras'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Parangiras</div>
            <div className="text-xs text-crypto-silver">@Parangiras</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/realsheepwolf'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Real Sheep Wolf</div>
            <div className="text-xs text-crypto-silver">@realsheepwolf</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/ericjackson'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Eric Jackson</div>
            <div className="text-xs text-crypto-silver">@ericjackson</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/TheLongInvest'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">The Long Invest</div>
            <div className="text-xs text-crypto-silver">@TheLongInvest</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/davyy888'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Davy</div>
            <div className="text-xs text-crypto-silver">@davyy888</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/PMDiChristina'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">PMDiChristina</div>
            <div className="text-xs text-crypto-silver">@PMDiChristina</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/JoelGoesDigital'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Joel Goes Digital</div>
            <div className="text-xs text-crypto-silver">@JoelGoesDigital</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/Scot1andT'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Scot1andT</div>
            <div className="text-xs text-crypto-silver">@Scot1andT</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/MACDMaster328'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">MACD Master</div>
            <div className="text-xs text-crypto-silver">@MACDMaster328</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/SpartanTrading'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Spartan Trading</div>
            <div className="text-xs text-crypto-silver">@SpartanTrading</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/planert41'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Planert41</div>
            <div className="text-xs text-crypto-silver">@planert41</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/Maximus_Holla'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Maximus Holla</div>
            <div className="text-xs text-crypto-silver">@Maximus_Holla</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/cantonmeow'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Canton Meow</div>
            <div className="text-xs text-crypto-silver">@cantonmeow</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/donaldjdean'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Donald J Dean</div>
            <div className="text-xs text-crypto-silver">@donaldjdean</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/ACInvestorBlog'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">AC Investor Blog</div>
            <div className="text-xs text-crypto-silver">@ACInvestorBlog</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/CestrianInc'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Cestrian Inc</div>
            <div className="text-xs text-crypto-silver">@CestrianInc</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/InvestInAssets'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Invest In Assets</div>
            <div className="text-xs text-crypto-silver">@InvestInAssets</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/PMDiChristina'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">PM Di Christina</div>
            <div className="text-xs text-crypto-silver">@PMDiChristina</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/investinsights4'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Invest Insights</div>
            <div className="text-xs text-crypto-silver">@investinsights4</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/bitsandbips'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Bits and Bips</div>
            <div className="text-xs text-crypto-silver">@bitsandbips</div>
          </SafeLink>
          
          <SafeLink
            href='https://x.com/BKnight221'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">BKnight221</div>
            <div className="text-xs text-crypto-silver">@BKnight221</div>
          </SafeLink>

          <SafeLink
            href='https://x.com/NFTLunatic'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">NFT Lunatic</div>
            <div className="text-xs text-crypto-silver">@NFTLunatic</div>
          </SafeLink>

          <SafeLink
            href='https://x.com/alliseeis_W'
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group block"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">AllISeeIs_W</div>
            <div className="text-xs text-crypto-silver">@alliseeis_W</div>
          </SafeLink>
        </div>
      </GlassCard>



      {/* Crypto Stocks */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-orange-500 via-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Bitcoin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Crypto Stocks</h3>
            <Badge className="bg-gradient-to-r from-orange-500/20 via-blue-500/20 to-purple-500/20 text-white border-crypto-silver/30 text-xs">
              CORPORATE
            </Badge>
          </div>
        </div>

        <div className="space-y-6">
          {/* Bitcoin Treasuries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <Bitcoin className="w-2.5 h-2.5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-orange-400">Bitcoin Treasuries</h4>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                  BTC
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://bitcointreasuries.net/')}
                className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://bitcointreasuries.net/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="Bitcoin Treasuries"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>

          {/* Ethereum Reserve */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-2.5 h-2.5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-blue-400">Strategic Ethereum Reserve</h4>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  ETH
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://strategicethreserve.xyz/')}
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://strategicethreserve.xyz/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="Strategic Ethereum Reserve"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>

          {/* SOL Reserve */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">SOL</span>
                </div>
                <h4 className="text-lg font-semibold text-purple-400">SOL Treasuries</h4>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  SOL
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.coingecko.com/en/treasuries/solana/companies')}
                className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="w-full">
              <button
                onClick={() => openInNewTab('https://www.coingecko.com/en/treasuries/solana/companies')}
                className="w-full bg-gradient-to-r from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/30 rounded-lg p-4 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">SOL</span>
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-purple-400 group-hover:text-purple-300">SOL Treasuries</h4>
                      <p className="text-crypto-silver text-sm">Track Solana institutional adoption</p>
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
                </div>
              </button>
            </div>
          </div>

          {/* TAO Treasuries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                  <Brain className="w-2.5 h-2.5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-gray-300 bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">TAO Treasuries</h4>
                <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs">
                  TAO
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://taotreasuries.app/')}
                className="text-gray-300 hover:text-gray-200 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://taotreasuries.app/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="TAO Treasuries"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* The Case for Bitcoin */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <Bitcoin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">The Case for Bitcoin</h3>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              VANECK RESEARCH
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.vaneck.com/us/en/blogs/digital-assets/the-investment-case-for-bitcoin/')}
            className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Open Full View
          </button>
        </div>

        <div className="w-full">
          <iframe
            src="https://www.vaneck.com/us/en/blogs/digital-assets/the-investment-case-for-bitcoin/"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="The Case for Bitcoin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
            loading="lazy"
            allow="fullscreen; web-share; clipboard-read; clipboard-write; camera; microphone"
            style={{ border: 'none' }}
          />
        </div>
      </GlassCard>

      {/* Tokenized Stocks */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Tokenized Stocks</h3>
            <Badge className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border-crypto-silver/30 text-xs">
              BLOCKCHAIN STOCKS
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => openInNewTab('https://xstocks.com/us')}
            className="bg-gradient-to-br from-purple-500/10 to-blue-600/10 hover:from-purple-500/20 hover:to-blue-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">xStocks - Tokenized US Stocks</div>
            <div className="text-xs text-crypto-silver">Trade tokenized versions of US stocks on blockchain</div>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}