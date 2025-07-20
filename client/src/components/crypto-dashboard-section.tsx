import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, DollarSign, Activity, Eye, Globe } from "lucide-react";

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
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Crypto Market Analytics Dashboard</h2>
        <p className="text-crypto-silver">TradingView widgets and external platform access</p>
      </div>

      {/* TradingView Bitcoin Chart */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">TradingView Bitcoin Chart</h3>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            BITCOIN
          </Badge>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/chart/?symbol=BTCUSD')}
            className="ml-auto text-orange-400 hover:text-orange-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_76d87&symbol=BTCUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=BTCUSD"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Bitcoin Chart"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView Ethereum Chart */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">TradingView Ethereum Chart</h3>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            ETHEREUM
          </Badge>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/chart/?symbol=ETHUSD')}
            className="ml-auto text-blue-400 hover:text-blue-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_eth&symbol=ETHUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=ETHUSD"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Ethereum Chart"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView Solana Chart */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">TradingView Solana Chart</h3>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            SOLANA
          </Badge>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/chart/?symbol=SOLUSD')}
            className="ml-auto text-purple-400 hover:text-purple-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_sol&symbol=SOLUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=SOLUSD"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Solana Chart"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView Crypto Market Overview */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">TradingView Crypto Screener</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            MARKET SCREENER
          </Badge>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/screener/')}
            className="ml-auto text-green-400 hover:text-green-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_screener&locale=en&colorTheme=dark&isTransparent=false&autosize=false&width=100%25&height=600&utm_source=localhost&utm_medium=widget_new&utm_campaign=screener&page-uri=localhost"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Crypto Screener"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView Economic Calendar */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">TradingView Economic Calendar</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            ECONOMIC DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/economic-calendar/')}
            className="ml-auto text-cyan-400 hover:text-cyan-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_calendar&locale=en&colorTheme=dark&isTransparent=false&autosize=false&width=100%25&height=600&utm_source=localhost&utm_medium=widget_new&utm_campaign=economic-calendar&page-uri=localhost"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Economic Calendar"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* External Platform Quick Access */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">External Analytics Platforms</h3>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            QUICK ACCESS
          </Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => openInNewTab('https://dexscreener.com/')}
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <h4 className="text-blue-400 font-semibold mb-1">DexScreener</h4>
            <p className="text-gray-400 text-sm">DEX Analytics</p>
          </button>
          <button
            onClick={() => openInNewTab('https://www.coingecko.com/')}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <h4 className="text-green-400 font-semibold mb-1">CoinGecko</h4>
            <p className="text-gray-400 text-sm">Market Data</p>
          </button>
          <button
            onClick={() => openInNewTab('https://coinmarketcap.com/')}
            className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
          >
            <h4 className="text-yellow-400 font-semibold mb-1">CoinMarketCap</h4>
            <p className="text-gray-400 text-sm">Rankings</p>
          </button>
          <button
            onClick={() => openInNewTab('https://defillama.com/')}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <h4 className="text-purple-400 font-semibold mb-1">DefiLlama</h4>
            <p className="text-gray-400 text-sm">DeFi Analytics</p>
          </button>
          <button
            onClick={() => openInNewTab('https://dune.com/')}
            className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
          >
            <h4 className="text-orange-400 font-semibold mb-1">Dune Analytics</h4>
            <p className="text-gray-400 text-sm">On-chain Data</p>
          </button>
          <button
            onClick={() => openInNewTab('https://app.artemis.xyz/')}
            className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
          >
            <h4 className="text-cyan-400 font-semibold mb-1">Artemis</h4>
            <p className="text-gray-400 text-sm">Blockchain Analytics</p>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}