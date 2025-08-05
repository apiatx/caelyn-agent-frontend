import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, Zap, TrendingDown, ExternalLink, Star } from "lucide-react";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";

// Glass card component for Solana section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function SolanaSection() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Solana Network Dashboard</h2>
        <p className="text-crypto-silver">Live Solana network analytics with DexScreener, Jupiter, and Moby Screener</p>
      </div>

      {/* DexScreener Solana */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Trending</h3>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            LIVE CHARTS
          </Badge>
        </div>
        <div className="w-full">
          <iframe
            {...getSecureIframeProps('https://dexscreener.com/solana?theme=dark', 'DexScreener Solana Network')}
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>



      {/* Moby Screener */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Moby Screener</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
            ANALYTICS
          </Badge>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.mobyscreener.com/"
            title="Moby Screener Analytics"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
            loading="lazy"
            style={{
              background: 'transparent',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>



      {/* X Alpha */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <Star className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">X Alpha</h3>
          <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border-crypto-silver/30">
            SOLANA ALPHA
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => openSecureLink('https://x.com/Dior100x')}
            className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">𝕏</span>
              </div>
              <h5 className="text-purple-400 font-semibold text-sm">Dior100x</h5>
            </div>
          </button>

          <button
            onClick={() => openSecureLink('https://x.com/_Shadow36')}
            className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg hover:bg-gray-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">𝕏</span>
              </div>
              <h5 className="text-gray-400 font-semibold text-sm">_Shadow36</h5>
            </div>
          </button>

          <button
            onClick={() => openSecureLink('https://x.com/WolverCrypto')}
            className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">𝕏</span>
              </div>
              <h5 className="text-yellow-400 font-semibold text-sm">WolverCrypto</h5>
            </div>
          </button>

          <button
            onClick={() => openSecureLink('https://x.com/watchingmarkets')}
            className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">𝕏</span>
              </div>
              <h5 className="text-blue-400 font-semibold text-sm">watchingmarkets</h5>
            </div>
          </button>
        </div>
      </GlassCard>

      {/* Jupiter */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Jupiter</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            DEX TRADING
          </Badge>
        </div>
        <div className="w-full">
          <iframe
            src="https://jup.ag/?utm_source=phantom&utm_medium=list"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Jupiter DEX Aggregator"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* Trenches - Moved from Trench section and renamed */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Trenches</h3>
          <Badge className="bg-gradient-to-r from-red-500/20 to-orange-500/20 text-red-400 border-red-500/30">
            TRADING LEADERS
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="https://web3.okx.com/leaderboard"
            onClick={(e) => {e.preventDefault(); openSecureLink('https://web3.okx.com/leaderboard');}}
            className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-red-500/30 transition-all duration-200 group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">OKX Leaderboard</h3>
                <p className="text-gray-400 text-xs">Trading rankings</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
          </a>

          <a
            href="https://bonk.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-orange-500/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">BONK.fun</h3>
                <p className="text-gray-400 text-xs">Token platform</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-400 transition-colors" />
          </a>

          <a
            href="https://believe.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-blue-500/30 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Believe.app</h3>
                <p className="text-gray-400 text-xs">Trading app</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
          </a>
        </div>

        {/* Pump.fun Board Iframe */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h4 className="text-lg font-semibold text-green-400">Pump.fun Board</h4>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                LIVE
              </Badge>
            </div>
            <a
              href="https://pump.fun/board?meta=gta&coins_sort=market_cap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 text-xs sm:text-sm flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open Full View
            </a>
          </div>
          <div className="w-full">
            <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-6 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">P</span>
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">Pump.fun Board</h3>
                <p className="text-gray-400 mb-6">Pump.fun doesn't allow iframe embedding. Click below to access the live board.</p>
              </div>
              <a
                href="https://pump.fun/board?meta=gta&coins_sort=market_cap"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
              >
                <span className="text-white font-bold">Launch Pump.fun Board</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}