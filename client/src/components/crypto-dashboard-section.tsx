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
        <p className="text-crypto-silver">Comprehensive crypto market data from leading analytics platforms</p>
      </div>

      {/* CryptoCompare Market Data */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">CryptoCompare Market Data</h3>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            MARKET DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://www.cryptocompare.com/')}
            className="ml-auto text-blue-400 hover:text-blue-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.cryptocompare.com/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="CryptoCompare Market Data"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* DexScreener Base Network */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">DexScreener Base Network</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            BASE DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://dexscreener.com/base')}
            className="ml-auto text-green-400 hover:text-green-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://dexscreener.com/base"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="DexScreener Base Network"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView Bitcoin Chart */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">TradingView Bitcoin Chart</h3>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            TRADINGVIEW
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

      {/* Artemis Analytics Flows */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Artemis Analytics - Flows</h3>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            FLOWS DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://app.artemisanalytics.com/flows')}
            className="ml-auto text-purple-400 hover:text-purple-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://app.artemisanalytics.com/flows"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Artemis Analytics Flows"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* DefiLlama - DeFi Analytics */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">DefiLlama - DeFi Analytics</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            DEFI DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://defillama.com/')}
            className="ml-auto text-cyan-400 hover:text-cyan-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://defillama.com/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="DefiLlama DeFi Analytics"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* Dune Analytics - On-chain Data */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Dune Analytics - On-chain Data</h3>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            ON-CHAIN DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://dune.com/')}
            className="ml-auto text-red-400 hover:text-red-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://dune.com/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Dune Analytics On-chain Data"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>
    </div>
  );
}