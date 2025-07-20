import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, Zap } from "lucide-react";

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
          <h3 className="text-xl font-semibold text-white">DexScreener Solana</h3>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            LIVE CHARTS
          </Badge>
        </div>
        <div className="w-full">
          <iframe
            src="https://dexscreener.com/solana"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="DexScreener Solana Network"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* Jupiter Aggregator */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Jupiter Aggregator</h3>
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
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Moby Screener Analytics"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>
    </div>
  );
}