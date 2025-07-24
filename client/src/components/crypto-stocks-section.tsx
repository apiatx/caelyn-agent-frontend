import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ExternalLink, Bitcoin, FileText, TrendingUp, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";

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
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Screening</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              SCREENING
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <button
            onClick={() => openInNewTab('https://www.ainvest.com/screener/')}
            className="bg-gradient-to-br from-green-500/10 to-green-600/10 hover:from-green-500/20 hover:to-green-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">AInvest.com screener</div>
            <div className="text-xs text-crypto-silver">AI-powered stock screening and analysis</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://stockanalysis.com/trending/')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">StockAnalysis.com trending</div>
            <div className="text-xs text-crypto-silver">Trending stocks and market analysis</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://www.screener.in/explore/')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">Screener.in explore</div>
            <div className="text-xs text-crypto-silver">Indian stock screening and exploration</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://unusualwhales.com/stock-screener')}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 hover:from-purple-500/20 hover:to-purple-600/20 border border-purple-500/20 hover:border-purple-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-purple-300 mb-1">Unusual Whales</div>
            <div className="text-xs text-crypto-silver">Whale activity and stock screening</div>
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



      {/* X Alpha */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">𝕏</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">X Alpha</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              TRADING
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <button
            onClick={() => openInNewTab('https://x.com/StocksToTrade')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">StocksToTrade</div>
            <div className="text-xs text-crypto-silver">@StocksToTrade</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/timothysykes')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Timothy Sykes</div>
            <div className="text-xs text-crypto-silver">@timothysykes</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/Parangiras')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Parangiras</div>
            <div className="text-xs text-crypto-silver">@Parangiras</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/realsheepwolf')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Real Sheep Wolf</div>
            <div className="text-xs text-crypto-silver">@realsheepwolf</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/ericjackson')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Eric Jackson</div>
            <div className="text-xs text-crypto-silver">@ericjackson</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/TheLongInvest')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">The Long Invest</div>
            <div className="text-xs text-crypto-silver">@TheLongInvest</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/davyy888')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Davy</div>
            <div className="text-xs text-crypto-silver">@davyy888</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/JoelGoesDigital')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Joel Goes Digital</div>
            <div className="text-xs text-crypto-silver">@JoelGoesDigital</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/MACDMaster328')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">MACD Master</div>
            <div className="text-xs text-crypto-silver">@MACDMaster328</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/Maximus_Holla')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Maximus Holla</div>
            <div className="text-xs text-crypto-silver">@Maximus_Holla</div>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/cantonmeow')}
            className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-3 transition-all duration-300 text-left group"
          >
            <div className="text-sm font-medium text-white group-hover:text-blue-300">Canton Meow</div>
            <div className="text-xs text-crypto-silver">@cantonmeow</div>
          </button>
        </div>
      </GlassCard>

      {/* Crypto Treasuries */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-orange-500 via-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Bitcoin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Crypto Treasuries</h3>
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

          {/* ETH Treasuries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">Ξ</span>
                </div>
                <h4 className="text-lg font-semibold text-blue-400">ETH Treasuries</h4>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  ETH
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.strategicethreserve.xyz/')}
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm"
              >
                Open Full View →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://www.strategicethreserve.xyz/"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="ETH Treasuries"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>

          {/* TAO Treasuries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xs">τ</span>
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
            src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="TradingView Advanced Chart"
            frameBorder="0"
            allowTransparency={true}
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
    </div>
  );
}