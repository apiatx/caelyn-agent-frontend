import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, Globe, Activity } from "lucide-react";
import hippoImage from "@assets/image_1752975467353.png";

// Glass card component for crypto dashboard
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function AltsPage() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      {/* Header */}
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-8">
          <img 
            src={hippoImage}
            alt="CryptoHippo" 
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">CryptoHippo</h1>
            <p className="text-crypto-silver">Altcoin Analysis & Charts</p>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-8">
          <div className="text-center px-3 sm:px-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Altcoin Analytics</h2>
            <p className="text-sm sm:text-base text-crypto-silver">Major altcoins and market dominance analysis</p>
          </div>

          {/* Ethereum Chart */}
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

          {/* Solana Chart */}
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

          {/* XRP Chart */}
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

          {/* PENGU Chart */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">PENGU Chart</h3>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  PENGU
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTO%3APENGUPUDUSD')}
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm sm:ml-auto"
              >
                Open in New Tab →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_pengu&symbol=CRYPTO%3APENGUPUDUSD&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=CRYPTO%3APENGUPUDUSD"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="TradingView PENGU Chart"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </GlassCard>

          {/* ETH Dominance Chart */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">ETH Dominance Chart</h3>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  ETH.D
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.tradingview.com/symbols/ETH.D/?timeframe=ALL')}
                className="text-blue-400 hover:text-blue-300 text-xs sm:text-sm sm:ml-auto"
              >
                Open in New Tab →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_ethd&symbol=CRYPTOCAP%3AETH.D&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=CRYPTOCAP%3AETH.D"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="TradingView ETH Dominance Chart"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </GlassCard>

          {/* OTHERS Dominance Chart */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">OTHERS Dominance Chart</h3>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                  OTHERS.D
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTOCAP%3AOTHERS.D')}
                className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm sm:ml-auto"
              >
                Open in New Tab →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_others&symbol=CRYPTOCAP%3AOTHERS.D&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=CRYPTOCAP%3AOTHERS.D"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="TradingView OTHERS Dominance Chart"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}