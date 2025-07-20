import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, DollarSign, Activity, Eye, Globe } from "lucide-react";


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
      <div className="text-center px-3 sm:px-0">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Crypto Market Analytics Dashboard</h2>
        <p className="text-sm sm:text-base text-crypto-silver">TradingView widgets and external platform access</p>
      </div>

      {/* TradingView Bitcoin Chart */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">TradingView Bitcoin Chart</h3>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              BITCOIN
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/chart/?symbol=BTCUSD')}
            className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_76d87&symbol=BTCUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BTCUSD"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Bitcoin Chart"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView Ethereum Chart */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Globe className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">TradingView Ethereum Chart</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              ETHEREUM
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/chart/?symbol=ETHUSD')}
            className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_eth&symbol=ETHUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=ETHUSD"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Ethereum Chart"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView Solana Chart */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">TradingView Solana Chart</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              SOLANA
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/chart/?symbol=SOLUSD')}
            className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_sol&symbol=SOLUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=SOLUSD"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Solana Chart"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView XRP Chart */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">TradingView XRP Chart</h3>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              XRP
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/?symbol=BITSTAMP%3AXRPUSD')}
            className="text-green-400 hover:text-green-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_xrp&symbol=BITSTAMP%3AXRPUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BITSTAMP%3AXRPUSD"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView XRP Chart"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* Artemis Analytics Netflows */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500 rounded-full flex items-center justify-center">
              <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Artemis Analytics - Home</h3>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
              ANALYTICS
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://app.artemisanalytics.com/home')}
            className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://app.artemisanalytics.com/home"
            className="w-full h-[500px] sm:h-[600px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="Artemis Analytics Home"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>



      {/* Cookie.fun Platform */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">🍪</span>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Cookie.fun</h3>
            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-xs">
              FUN PLATFORM
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://www.cookie.fun/')}
            className="text-pink-400 hover:text-pink-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <div className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20 bg-gradient-to-br from-pink-900/20 to-purple-900/20 flex flex-col items-center justify-center text-center p-8">
            <div className="mb-6">
              <span className="text-6xl mb-4 block">🍪</span>
              <h3 className="text-2xl font-bold text-white mb-2">Cookie.fun Platform</h3>
              <p className="text-pink-400 mb-4">This platform doesn't support embedding</p>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => openInNewTab('https://www.cookie.fun/')}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-lg"
              >
                Visit Cookie.fun →
              </button>
              <p className="text-crypto-silver text-sm max-w-md">
                Click above to access Cookie.fun in a new tab for the full interactive experience
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Market Overview from CoinMarketCap */}
      <MarketOverviewSection />

      {/* More Analytics */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">More Analytics</h3>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              QUICK ACCESS
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => openInNewTab('https://coinmarketcap.com/')}
            className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <h4 className="text-blue-400 font-semibold mb-1 text-sm sm:text-base">CMC Leaderboard</h4>
            <p className="text-gray-400 text-xs sm:text-sm">Market Rankings</p>
          </button>

          <button
            onClick={() => openInNewTab('https://charts.bitbo.io/index/')}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <h4 className="text-purple-400 font-semibold mb-1">BitBo Charts</h4>
            <p className="text-gray-400 text-sm">Crypto Indices</p>
          </button>
          <button
            onClick={() => openInNewTab('https://coinalyze.net/futures-data/global-charts/')}
            className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
          >
            <h4 className="text-orange-400 font-semibold mb-1">Open Interest</h4>
            <p className="text-gray-400 text-sm">Futures Data</p>
          </button>
          <button
            onClick={() => openInNewTab('https://sosovalue.com/assets/cryptoindex')}
            className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
          >
            <h4 className="text-cyan-400 font-semibold mb-1">SoSo Value</h4>
            <p className="text-gray-400 text-sm">Crypto Index</p>
          </button>
          <button
            onClick={() => openInNewTab('https://app.elfa.ai/leaderboard/token')}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <h4 className="text-purple-400 font-semibold mb-1">Mindshare by Elfi</h4>
            <p className="text-gray-400 text-sm">AI Token Analytics</p>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}