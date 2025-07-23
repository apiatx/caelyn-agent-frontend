import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, DollarSign, Activity, Eye, Globe, Wallet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";


import { MarketOverviewSection } from './market-overview-section';

// Glass card component for crypto dashboard
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function CryptoDashboardSection() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 lg:space-y-8">
      {/* Crypto Market Overview */}
      <div className="space-y-4">
        <div className="text-center px-3 sm:px-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Crypto Market Overview</h2>
          <p className="text-sm sm:text-base text-crypto-silver">Global market metrics and key indicators</p>
        </div>
        <MarketOverviewSection />
      </div>

      {/* Quick Analytics Links - moved between Alt Season and Onchain */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => openInNewTab('https://coinmarketcap.com/')}
            className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <h5 className="text-blue-400 font-semibold mb-1 text-sm sm:text-base">CMC Leaderboard</h5>
            <p className="text-gray-400 text-xs sm:text-sm">Market Rankings</p>
          </button>

          <button
            onClick={() => openInNewTab('https://charts.bitbo.io/index/')}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <h5 className="text-purple-400 font-semibold mb-1">BitBo Charts</h5>
            <p className="text-gray-400 text-sm">Crypto Indices</p>
          </button>
          <button
            onClick={() => openInNewTab('https://coinalyze.net/futures-data/global-charts/')}
            className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
          >
            <h5 className="text-orange-400 font-semibold mb-1">Open Interest</h5>
            <p className="text-gray-400 text-sm">Futures Data</p>
          </button>
          <button
            onClick={() => openInNewTab('https://sosovalue.com/assets/cryptoindex')}
            className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
          >
            <h5 className="text-cyan-400 font-semibold mb-1">SoSo Value</h5>
            <p className="text-gray-400 text-sm">Crypto Index</p>
          </button>
        </div>
      </GlassCard>

      {/* Onchain */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500 rounded-full flex items-center justify-center">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Onchain</h3>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
              COMPREHENSIVE
            </Badge>
          </div>
        </div>

        {/* Artemis Analytics Iframe - removed title */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
            <button
              onClick={() => openInNewTab('https://app.artemis.xyz/')}
              className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="w-full">
            <iframe
              src="https://app.artemis.xyz/"
              className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
              title="Artemis Analytics"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
              referrerPolicy="no-referrer-when-downgrade"
              loading="lazy"
              allow="fullscreen; web-share; clipboard-read; clipboard-write"
            />
          </div>
        </div>
      </GlassCard>

      {/* Bitcoin Monthly Returns */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Historical Bitcoin Monthly Returns</h3>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              HEATMAP
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => openInNewTab('https://newhedge.io/bitcoin/monthly-returns-heatmap')}
            className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 hover:from-orange-500/20 hover:to-orange-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">NewHedge Bitcoin Heatmap</div>
                <div className="text-xs text-crypto-silver">Bitcoin monthly returns visualization and analysis</div>
              </div>
              <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
            </div>
          </button>
        </div>
      </GlassCard>

      {/* News Section */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-white">News</h2>
            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-lg font-medium">
              COINTELEGRAPH
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openInNewTab('https://cointelegraph.com/category/latest-news')}
            className="text-crypto-silver hover:text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Full View
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://cointelegraph.com/category/latest-news')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-blue-500/20 hover:border-blue-500/30 text-white justify-start p-4 h-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Cointelegraph</div>
                <div className="text-sm text-crypto-silver">Latest crypto news & analysis</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.coindesk.com/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-orange-500/20 hover:border-orange-500/30 text-white justify-start p-4 h-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">CoinDesk</div>
                <div className="text-sm text-crypto-silver">Digital asset news & insights</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://www.bankless.com/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-purple-500/20 hover:border-purple-500/30 text-white justify-start p-4 h-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">Bankless</div>
                <div className="text-sm text-crypto-silver">DeFi & Web3 content</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://coingape.com/category/news/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-green-500/20 hover:border-green-500/30 text-white justify-start p-4 h-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">CoinGape</div>
                <div className="text-sm text-crypto-silver">Crypto news & market updates</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://u.today/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-red-500/20 hover:border-red-500/30 text-white justify-start p-4 h-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">U.Today</div>
                <div className="text-sm text-crypto-silver">Cryptocurrency & blockchain news</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => openInNewTab('https://thedefiant.io/')}
              className="bg-black/20 border-crypto-silver/20 hover:bg-indigo-500/20 hover:border-indigo-500/30 text-white justify-start p-4 h-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              <div className="text-left">
                <div className="font-semibold">The Defiant</div>
                <div className="text-sm text-crypto-silver">DeFi & open finance news</div>
              </div>
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}