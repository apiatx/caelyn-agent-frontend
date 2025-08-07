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
      {/* Screening */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Screening</h3>
            <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-white border-crypto-silver/30 text-xs">
              STOCK SCREENERS
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => openInNewTab('https://stocktwits.com/rankings/most-active')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">StockTwits</div>
            <div className="text-xs text-crypto-silver">Most active stocks</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://kavout.com/stock-screener')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">Kavout</div>
            <div className="text-xs text-crypto-silver">AI-powered stock screening</div>
          </button>

          <button
            onClick={() => openInNewTab('https://www.ainvest.com/stock-screener/')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">AInvest.com</div>
            <div className="text-xs text-crypto-silver">AI investment screening</div>
          </button>

          <button
            onClick={() => openInNewTab('https://www.marketwatch.com/tools/screener')}
            className="bg-gradient-to-br from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 border border-orange-500/20 hover:border-red-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">MarketWatch</div>
            <div className="text-xs text-crypto-silver">Market screening tools</div>
          </button>

          <button
            onClick={() => openInNewTab('https://www.cnn.com/markets/premarkets')}
            className="bg-gradient-to-br from-red-500/10 to-pink-500/10 hover:from-red-500/20 hover:to-pink-500/20 border border-red-500/20 hover:border-pink-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-red-300 mb-1">CNN Pre-Market</div>
            <div className="text-xs text-crypto-silver">Pre-market movers</div>
          </button>
        </div>
      </GlassCard>

      {/* X Alpha */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-black rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">𝕏</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">X Alpha</h3>
            <Badge className="bg-black/20 text-white border-gray-500/30 text-xs">
              SOCIAL INTELLIGENCE
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://x.com/unusual_whales')}
            className="text-crypto-silver hover:text-white text-xs sm:text-sm flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Open Full View
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => openInNewTab('https://x.com/unusual_whales')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">@unusual_whales</div>
            <div className="text-xs text-crypto-silver">Options flow and unusual activity</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/DeItaone')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">@DeItaone</div>
            <div className="text-xs text-crypto-silver">Breaking financial news</div>
          </button>

          <button
            onClick={() => openInNewTab('https://x.com/FirstSquawk')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">@FirstSquawk</div>
            <div className="text-xs text-crypto-silver">Real-time market alerts</div>
          </button>

          <button
            onClick={() => openInNewTab('https://x.com/zerohedge')}
            className="bg-gradient-to-br from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/20 hover:border-red-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-red-300 mb-1">@zerohedge</div>
            <div className="text-xs text-crypto-silver">Financial and political news</div>
          </button>
        </div>
      </GlassCard>

      {/* Stock Market Data */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Stock Market Data</h3>
            <Badge className="bg-gradient-to-r from-green-500/20 to-blue-500/20 text-white border-crypto-silver/30 text-xs">
              SLICKCHARTS
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

      {/* TradingView */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">TradingView</h3>
            <Badge className="bg-gradient-to-r from-blue-500/20 to-green-500/20 text-white border-crypto-silver/30 text-xs">
              TRADING PLATFORM
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/')}
            className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
          >
            Open Full View →
          </button>
        </div>

        <div className="w-full">
          <iframe
            src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="TradingView Advanced Chart"
            frameBorder="0"
            scrolling="no"
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <h4 className="text-lg font-semibold text-purple-400">Solana Reserve</h4>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  SOL
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://thenew.money/')}
                className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://thenew.money/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="Solana Reserve"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>

          {/* TAO Treasuries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-2.5 h-2.5 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-purple-400">TAO Treasuries</h4>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  TAO
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://taotreasuries.app/')}
                className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
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

      {/* Tokenized Stocks */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
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