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

      {/* CoinMarketCap Main */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">CoinMarketCap</h3>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            MARKET DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://coinmarketcap.com/')}
            className="ml-auto text-blue-400 hover:text-blue-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://coinmarketcap.com/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="CoinMarketCap Market Data"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* CoinMarketCap Volume */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Monthly Volume Rankings</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            VOLUME DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://coinmarketcap.com/currencies/volume/monthly/')}
            className="ml-auto text-green-400 hover:text-green-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://coinmarketcap.com/currencies/volume/monthly/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="CoinMarketCap Monthly Volume"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* TradingView Crypto Total Market Cap */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Crypto Total Market Cap</h3>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            TRADINGVIEW
          </Badge>
          <button
            onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTOCAP%3AOTHERS.D')}
            className="ml-auto text-orange-400 hover:text-orange-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTOCAP%3AOTHERS.D"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="TradingView Crypto Market Cap"
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

      {/* Coinalyze Futures Data */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Coinalyze - Futures Data</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            FUTURES
          </Badge>
          <button
            onClick={() => openInNewTab('https://coinalyze.net/futures-data/global-charts/')}
            className="ml-auto text-cyan-400 hover:text-cyan-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://coinalyze.net/futures-data/global-charts/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Coinalyze Futures Data"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* SoSoValue Crypto Index */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">SoSoValue - Crypto Index</h3>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            INDEX DATA
          </Badge>
          <button
            onClick={() => openInNewTab('https://sosovalue.com/assets/cryptoindex')}
            className="ml-auto text-red-400 hover:text-red-300 text-sm"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://sosovalue.com/assets/cryptoindex"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="SoSoValue Crypto Index"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>
    </div>
  );
}