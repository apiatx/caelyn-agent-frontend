import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ExternalLink, Bitcoin, FileText } from "lucide-react";
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
      {/* Trending */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Trending</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              TRENDING
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
        </div>
      </GlassCard>

      {/* Bitcoin Treasuries */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <Bitcoin className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Bitcoin Treasuries</h3>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              CORPORATE
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://bitcointreasuries.net/')}
            className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm sm:ml-auto"
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
      </GlassCard>

      {/* ETH Treasuries */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">Ξ</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">ETH Treasuries</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              ETHEREUM
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.strategicethreserve.xyz/')}
            className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm sm:ml-auto"
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
      </GlassCard>

      {/* TAO Treasuries */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">τ</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">TAO Treasuries</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              BITTENSOR
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://taotreasuries.app/')}
            className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm sm:ml-auto"
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
      </GlassCard>
    </div>
  );
}