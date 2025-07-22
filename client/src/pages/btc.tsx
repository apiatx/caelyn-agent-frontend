import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import hippoImage from "@assets/image_1752975467353.png";

// Glass card component for crypto dashboard
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function BTCPage() {
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
            <p className="text-crypto-silver">Bitcoin Analysis & Charts</p>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-8">
          <div className="text-center px-3 sm:px-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">Bitcoin Analytics</h2>
            <p className="text-sm sm:text-base text-crypto-silver">Bitcoin price action and dominance analysis</p>
          </div>

          {/* Bitcoin Chart */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">Bitcoin Chart</h3>
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
                title="Bitcoin Chart"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </GlassCard>

          {/* BTC Dominance Chart */}
          <GlassCard className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-white">BTC Dominance Chart</h3>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                  BTC.D
                </Badge>
              </div>
              <button
                onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTOCAP%3ABTC.D')}
                className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm sm:ml-auto"
              >
                Open in New Tab →
              </button>
            </div>
            <div className="w-full">
              <iframe
                src="https://www.tradingview.com/widgetembed/?frameElementId=tradingview_btcd&symbol=CRYPTOCAP%3ABTC.D&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=[]&hideideas=1&theme=Dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=CRYPTOCAP%3ABTC.D"
                className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
                title="BTC Dominance Chart"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}