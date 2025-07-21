import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Zap, DollarSign, Wallet, TrendingDown, Brain } from "lucide-react";

// Glass card component for alpha section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function AlphaSection() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-crypto-warning to-yellow-400 rounded-xl flex items-center justify-center">
          <TrendingUp className="text-crypto-black text-xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Alpha Intelligence</h1>
          <p className="text-crypto-silver">Advanced market intelligence and analytics</p>
        </div>
      </div>

      {/* Alpha Analytics Platforms */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Star className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Signal</h3>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
            MULTI-CHAIN
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => openInNewTab('https://app.elfa.ai/leaderboard/token?sortBy=mindshare:change')}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-purple-400 font-semibold">Mindshare by Elfi</h4>
            </div>
            <p className="text-gray-400 text-sm">AI Token Analytics & Social Intelligence</p>
          </button>

          <button
            onClick={() => openInNewTab('https://www.cookie.fun/')}
            className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🍪</span>
              </div>
              <h4 className="text-pink-400 font-semibold">Cookie.fun</h4>
            </div>
            <p className="text-gray-400 text-sm">Interactive Trading Platform</p>
          </button>

          <button
            onClick={() => openInNewTab('https://dapp.velvet.capital/')}
            className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-purple-400 font-semibold">Velvet Capital</h4>
            </div>
            <p className="text-gray-400 text-sm">DeFi Portfolio Management</p>
          </button>

          <button
            onClick={() => openInNewTab('https://ayaoracle.xyz/#agents_data')}
            className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-indigo-400 font-semibold">Aya AI</h4>
            </div>
            <p className="text-gray-400 text-sm">Crypto AI Agent Analytics</p>
          </button>
        </div>
      </GlassCard>

      {/* Smart Wallets */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Smart Wallets</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            COMING SOON
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => openInNewTab('https://hyperdash.info/trader/0x15b325660a1c4a9582a7d834c31119c0cb9e3a42')}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-purple-400 font-semibold">HyperLiquid Whale</h4>
            </div>
            <p className="text-gray-400 text-sm">Hyperdash Trader Analytics</p>
          </button>

          <button
            onClick={() => openInNewTab('https://debank.com/profile/0x3f135ba020d0ed288d8dd85cd3d600451b121013')}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-green-400 font-semibold">WhaleAI - ETH/BASE</h4>
            </div>
            <p className="text-gray-400 text-sm">DeBank Portfolio Analysis</p>
          </button>
        </div>
      </GlassCard>

      {/* Social */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Social</h3>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
            ANALYTICS
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => openInNewTab('https://yaps.kaito.ai/')}
            className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-orange-400 font-semibold">Kaito AI Social Analytics</h4>
            </div>
            <p className="text-gray-400 text-sm">AI-Powered Social Intelligence</p>
          </button>

          <button
            onClick={() => openInNewTab('https://app.kolytics.pro/leaderboard')}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-red-400 font-semibold">Kolytics Leaderboard</h4>
            </div>
            <p className="text-gray-400 text-sm">Social Signal Analytics</p>
          </button>
        </div>
      </GlassCard>

      {/* AI Insights */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">AI Insights</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
            AI POWERED
          </Badge>
          <button
            onClick={() => openInNewTab('https://chatgpt.com/g/g-ma6mK7m5t-crypto-trading-investing')}
            className="ml-auto text-cyan-400 hover:text-cyan-300 text-xs"
          >
            Open Full View →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://chatgpt.com/g/g-ma6mK7m5t-crypto-trading-investing"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Crypto Trading & Investing AI"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>
    </div>
  );
}