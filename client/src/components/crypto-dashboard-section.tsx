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

      {/* Quick Access Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-lg p-6 cursor-pointer hover:bg-white/5 transition-all duration-300"
          onClick={() => openInNewTab('https://coinmarketcap.com/')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">CoinMarketCap</h3>
          </div>
          <p className="text-crypto-silver text-sm mb-4">Real-time market data, rankings, and cryptocurrency prices</p>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            MARKET DATA
          </Badge>
        </div>

        <div 
          className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-lg p-6 cursor-pointer hover:bg-white/5 transition-all duration-300"
          onClick={() => openInNewTab('https://coinmarketcap.com/currencies/volume/monthly/')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Volume Rankings</h3>
          </div>
          <p className="text-crypto-silver text-sm mb-4">Monthly trading volume analysis and rankings</p>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            VOLUME DATA
          </Badge>
        </div>

        <div 
          className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-lg p-6 cursor-pointer hover:bg-white/5 transition-all duration-300"
          onClick={() => openInNewTab('https://www.tradingview.com/chart/e5l95XgZ/?symbol=CRYPTOCAP%3AOTHERS.D')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Market Cap Chart</h3>
          </div>
          <p className="text-crypto-silver text-sm mb-4">TradingView crypto total market cap analysis</p>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            TRADINGVIEW
          </Badge>
        </div>

        <div 
          className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-lg p-6 cursor-pointer hover:bg-white/5 transition-all duration-300"
          onClick={() => openInNewTab('https://coinalyze.net/futures-data/global-charts/')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Futures Data</h3>
          </div>
          <p className="text-crypto-silver text-sm mb-4">Global futures charts and derivatives analysis</p>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            FUTURES
          </Badge>
        </div>

        <div 
          className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-lg p-6 cursor-pointer hover:bg-white/5 transition-all duration-300"
          onClick={() => openInNewTab('https://sosovalue.com/assets/cryptoindex')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Crypto Index</h3>
          </div>
          <p className="text-crypto-silver text-sm mb-4">Institutional-grade crypto index and analytics</p>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            INDEX DATA
          </Badge>
        </div>
      </div>

      {/* Artemis Analytics Flows - Embedded */}
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
    </div>
  );
}