import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";

// Glass card component for abstract section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function AbstractSection() {
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
          <Layers className="text-white text-xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Abstract Network</h1>
          <p className="text-crypto-silver">Ethereum's consumer crypto ecosystem</p>
        </div>
      </div>

      {/* DexScreener Abstract */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <Layers className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Trending</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              TRADING
            </Badge>
          </div>
          <button
            onClick={() => openInNewTab('https://dexscreener.com/abstract')}
            className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm sm:ml-auto"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://dexscreener.com/abstract?theme=dark"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] rounded-lg border border-crypto-silver/20"
            title="DexScreener Abstract"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>

      {/* PudgyInvest */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">P</span>
          </div>
          <h3 className="text-xl font-semibold text-white">PudgyInvest</h3>
          <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30 text-xs">
            INVESTMENT
          </Badge>
        </div>
        
        <div className="grid grid-cols-1">
          <button
            onClick={() => openInNewTab('https://pudgyinvest.com/')}
            className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">P</span>
              </div>
              <h4 className="text-purple-400 font-semibold">PudgyInvest Platform</h4>
            </div>
            <p className="text-gray-400 text-sm">Investment platform for Abstract ecosystem</p>
          </button>
        </div>
      </GlassCard>

      {/* Abstract Portal Link */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Abstract Portal</h3>
          <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">
            DISCOVER
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => openInNewTab('https://portal.abs.xyz/discover')}
            className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-indigo-400 font-semibold">Abstract Portal</h4>
            </div>
            <p className="text-gray-400 text-sm">Discover the Abstract ecosystem</p>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/Abstract_Eco')}
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <h4 className="text-blue-400 font-semibold">Abstract_Eco</h4>
            </div>
            <p className="text-gray-400 text-sm">Follow Abstract ecosystem updates</p>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}