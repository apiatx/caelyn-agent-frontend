import React, { Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Zap, DollarSign, Wallet, TrendingDown, Brain, Loader2 } from "lucide-react";
import { useSocialPulse } from "@/hooks/useSocialPulse";

// Glass card component for alpha section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function AlphaSection() {
  const { data: socialPulseData, isLoading } = useSocialPulse();
  
  const openInNewTab = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getTickerColor = (index: number) => {
    const colors = [
      { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', hover: 'hover:bg-yellow-500/20', icon: 'bg-yellow-500', text: 'text-yellow-400' },
      { bg: 'bg-blue-500/10', border: 'border-blue-500/20', hover: 'hover:bg-blue-500/20', icon: 'bg-blue-500', text: 'text-blue-400' },
      { bg: 'bg-purple-500/10', border: 'border-purple-500/20', hover: 'hover:bg-purple-500/20', icon: 'bg-purple-500', text: 'text-purple-400' },
      { bg: 'bg-green-500/10', border: 'border-green-500/20', hover: 'hover:bg-green-500/20', icon: 'bg-green-500', text: 'text-green-400' },
      { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hover: 'hover:bg-emerald-500/20', icon: 'bg-emerald-500', text: 'text-emerald-400' },
      { bg: 'bg-orange-500/10', border: 'border-orange-500/20', hover: 'hover:bg-orange-500/20', icon: 'bg-orange-500', text: 'text-orange-400' },
      { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', hover: 'hover:bg-indigo-500/20', icon: 'bg-indigo-500', text: 'text-indigo-400' },
      { bg: 'bg-red-500/10', border: 'border-red-500/20', hover: 'hover:bg-red-500/20', icon: 'bg-red-500', text: 'text-red-400' },
      { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', hover: 'hover:bg-cyan-500/20', icon: 'bg-cyan-500', text: 'text-cyan-400' }
    ];
    return colors[index % colors.length];
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

          <button
            onClick={() => openInNewTab('https://opensea.io/stats/tokens')}
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-blue-400 font-semibold">OpenSea</h4>
            </div>
            <p className="text-gray-400 text-sm">Trending Altcoin Timeframes</p>
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

      {/* AI Insights */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">AI Insights</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
            AI POWERED
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => openInNewTab('https://chatgpt.com/g/g-ma6mK7m5t-crypto-trading-investing')}
            className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-cyan-400 font-semibold">ChatGPT Crypto AI</h4>
            </div>
            <p className="text-gray-400 text-sm">Crypto Trading & Investing GPT</p>
          </button>

          <button
            onClick={() => openInNewTab('https://x.com/cryptohippo_ai')}
            className="p-4 bg-black/20 border border-gray-500/20 rounded-lg hover:bg-gray-500/10 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <h4 className="text-gray-300 font-semibold">X (Twitter)</h4>
            </div>
            <p className="text-gray-400 text-sm">Follow CryptoHippo Updates</p>
          </button>
        </div>
      </GlassCard>

      {/* Tools */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Tools</h3>
          <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border-blue-500/30 text-xs">
            ANALYTICS TOOLS
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => window.open('https://app.bubblemaps.io/', '_blank', 'noopener,noreferrer')}
            className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-blue-400 font-semibold">Bubblemaps</h4>
            </div>
            <p className="text-gray-400 text-sm">Token Analytics & Visualization</p>
          </button>
        </div>
      </GlassCard>

      {/* Social - Moved to bottom with KOLs and Social Pulse subsections */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Social</h3>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
            INTELLIGENCE
          </Badge>
        </div>

        {/* Social Analytics - Moved to top */}
        <div className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => openInNewTab('https://yaps.kaito.ai/')}
              className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-orange-400 font-semibold">Kaito</h4>
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
                <h4 className="text-red-400 font-semibold">Kolytics</h4>
              </div>
              <p className="text-gray-400 text-sm">Social Signal Analytics</p>
            </button>
          </div>
        </div>

        {/* KOLs Subsection */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Star className="w-3 h-3 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-white">KOLs</h4>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              KEY OPINION LEADERS
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => openInNewTab('https://x.com/cobie')}
              className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">𝕏</span>
                </div>
                <h5 className="text-blue-400 font-semibold">@cobie</h5>
              </div>
              <p className="text-gray-400 text-sm">Crypto Trading Insights</p>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/hsaka')}
              className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">𝕏</span>
                </div>
                <h5 className="text-green-400 font-semibold">@hsaka</h5>
              </div>
              <p className="text-gray-400 text-sm">DeFi & Yield Farming</p>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/blknoiz06')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">𝕏</span>
                </div>
                <h5 className="text-purple-400 font-semibold">@blknoiz06</h5>
              </div>
              <p className="text-gray-400 text-sm">On-Chain Analysis</p>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/DefiIgnas')}
              className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">𝕏</span>
                </div>
                <h5 className="text-orange-400 font-semibold">@DefiIgnas</h5>
              </div>
              <p className="text-gray-400 text-sm">DeFi Research & Alpha</p>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/thedefiedge')}
              className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">𝕏</span>
                </div>
                <h5 className="text-cyan-400 font-semibold">@thedefiedge</h5>
              </div>
              <p className="text-gray-400 text-sm">DeFi Education & Strategy</p>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/VitalikButerin')}
              className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">𝕏</span>
                </div>
                <h5 className="text-indigo-400 font-semibold">@VitalikButerin</h5>
              </div>
              <p className="text-gray-400 text-sm">Ethereum Founder</p>
            </button>
          </div>
        </div>

        {/* Social Pulse Subsection */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-white">Social Pulse</h4>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
              24H TRENDING
            </Badge>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-400">Loading trending tickers...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {socialPulseData?.map((ticker, index) => {
                const colors = getTickerColor(index);
                return (
                  <button
                    key={ticker.symbol}
                    onClick={() => openInNewTab(`https://x.com/search?q=%24${ticker.symbol}&src=typed_query&f=live`)}
                    className={`p-4 ${colors.bg} border ${colors.border} rounded-lg ${colors.hover} transition-colors`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 ${colors.icon} rounded-full flex items-center justify-center`}>
                        <span className="text-white text-sm font-bold">$</span>
                      </div>
                      <h5 className={`${colors.text} font-semibold`}>${ticker.symbol}</h5>
                    </div>
                    <p className="text-gray-400 text-sm">
                      24hr Sentiment {ticker.sentiment > 0 ? '+' : ''}{ticker.sentiment}%
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}