import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, ExternalLink } from "lucide-react";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import { openDexScreenerLink } from "@/utils/mobile-links";
import abstractLogo from "@assets/abstract chain_1755977414942.jpg";

// Glass card component for abstract section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function AbstractSection() {
  const openInNewTab = (url: string) => {
    openSecureLink(url);
  };

  return (
    <div className="space-y-8">

      {/* DexScreener Abstract */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Trending</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              LIVE CHARTS
            </Badge>
          </div>
          <button
            onClick={() => openDexScreenerLink('abstract?theme=dark')}
            className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </button>
        </div>
        <div className="w-full space-y-6">
          <iframe
            {...getSecureIframeProps('https://dexscreener.com/abstract?theme=dark', 'DexScreener Abstract')}
            className="w-full h-[800px] rounded-lg border border-crypto-silver/20"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
          
          {/* 30 Day Trending on OpenSea */}
          <div className="border-t border-crypto-silver/20 pt-4">
            <button
              onClick={() => openInNewTab('https://opensea.io/stats/tokens?sortBy=thirtyDayPriceChange&chains=abstract')}
              className="w-full p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-cyan-400 font-semibold">30 Day Trending on OpenSea</h4>
              </div>
              <p className="text-gray-400 text-sm">View trending Abstract tokens by 30-day price changes</p>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Resources */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Resources</h3>
          <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
            DISCOVER
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
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
            onClick={() => openInNewTab('https://pudgyinvest.com/')}
            className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">P</span>
              </div>
              <h4 className="text-purple-400 font-semibold">PudgyInvest</h4>
            </div>
            <p className="text-gray-400 text-sm">Investment platform for Abstract ecosystem</p>
          </button>
        </div>
      </GlassCard>

      {/* X Alpha */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">𝕏</span>
          </div>
          <h3 className="text-xl font-semibold text-white">X Alpha</h3>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            SOCIAL
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => openInNewTab('https://x.com/AbstractChain')}
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <h4 className="text-blue-400 font-semibold">@AbstractChain</h4>
            </div>
            <p className="text-gray-400 text-sm">Official Abstract Chain updates</p>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/MemesAbstract')}
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <h4 className="text-purple-400 font-semibold">@MemesAbstract</h4>
            </div>
            <p className="text-gray-400 text-sm">Abstract ecosystem memes</p>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/ProofOfEly')}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <h4 className="text-green-400 font-semibold">@ProofOfEly</h4>
            </div>
            <p className="text-gray-400 text-sm">Abstract trading insights</p>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/AbstractHubHB')}
            className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <h4 className="text-orange-400 font-semibold">@AbstractHubHB</h4>
            </div>
            <p className="text-gray-400 text-sm">Abstract Hub community</p>
          </button>
          
          <button
            onClick={() => openInNewTab('https://x.com/Abstract_Eco')}
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <h4 className="text-blue-400 font-semibold">@Abstract_Eco</h4>
            </div>
            <p className="text-gray-400 text-sm">Follow Abstract ecosystem updates</p>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}