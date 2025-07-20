import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Zap, DollarSign, Wallet } from "lucide-react";

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
          <h3 className="text-xl font-semibold text-white">Chain-Agnostic Analytics Platforms</h3>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
            MULTI-CHAIN
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => openInNewTab('https://app.elfa.ai/leaderboard/token')}
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
        
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-green-400" />
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Smart Wallet Integration</h4>
          <p className="text-crypto-silver text-sm max-w-md mx-auto">
            Advanced wallet management and DeFi automation tools will be available here soon.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}