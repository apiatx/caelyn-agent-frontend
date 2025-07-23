import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, Zap, TrendingDown, ExternalLink } from "lucide-react";
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
            {...getSecureIframeProps('https://www.mobyscreener.com/', 'Moby Screener Analytics')}
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            style={{
              background: '#1a1a1a',
              colorScheme: 'dark'
            }}
            allow="fullscreen; web-share; clipboard-read; clipboard-write"
          />
        </div>
      </GlassCard>

      {/* Trench Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
            <TrendingDown className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Trench</h2>
            <p className="text-crypto-silver">Advanced Trading Leaderboard & Analytics</p>
          </div>
        </div>

        {/* OKX Leaderboard */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">OKX Leaderboard</h3>
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
              href="https://pump.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-green-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Pump.fun</h3>
                  <p className="text-gray-400 text-xs">Launch platform</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" />
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
        </GlassCard>
      </div>

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
    </div>
  );
}