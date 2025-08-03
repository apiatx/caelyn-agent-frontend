import React, { Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Zap, DollarSign, Wallet, TrendingDown, Brain, Loader2 } from "lucide-react";
import { useSocialPulse } from "@/hooks/useSocialPulse";
import { openSecureLink, getSecureLinkProps } from "@/utils/security";

// Glass card component for alpha section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

export default function AlphaSection() {
  const { data: socialPulseData, isLoading } = useSocialPulse();
  
  // Use secure link opening
  const openInNewTab = (url: string) => {
    openSecureLink(url);
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

          <button
            onClick={() => openInNewTab('https://indexy.xyz/home')}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-green-400 font-semibold">Indexy</h4>
            </div>
            <p className="text-gray-400 text-sm">Crypto market indexing platform</p>
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

      {/* Resources */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Resources</h3>
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
            onClick={() => openInNewTab('https://app.bubblemaps.io/')}
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



        {/* X Accounts */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Star className="w-3 h-3 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-white">X Accounts</h4>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              PERSONAL PICKS
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              onClick={() => openInNewTab('https://x.com/altcoinvector')}
              className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-indigo-400 font-semibold text-sm">altcoinvector</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/WolverCrypto')}
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
              onClick={() => openInNewTab('https://x.com/AltcoinMarksman')}
              className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-green-400 font-semibold text-sm">AltcoinMarksman</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/ofvoice25355')}
              className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-blue-400 font-semibold text-sm">Voice of the Gods</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/CoinGurruu')}
              className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-purple-400 font-semibold text-sm">CoinGurruu</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/CryptoZer0_')}
              className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-green-400 font-semibold text-sm">CryptoZer0_</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/aicryptopattern')}
              className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-orange-400 font-semibold text-sm">aicryptopattern</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/bittybitbit86')}
              className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-cyan-400 font-semibold text-sm">bittybitbit86</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/Whale_AI_net')}
              className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-orange-400 font-semibold text-sm">Whale_AI_net</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/Defi0xJeff')}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-red-400 font-semibold text-sm">Defi0xJeff</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/EricCryptoman')}
              className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-pink-400 font-semibold text-sm">EricCryptoman</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/cryptorinweb3')}
              className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-indigo-400 font-semibold text-sm">cryptorinweb3</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/OverkillTrading')}
              className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-teal-400 font-semibold text-sm">OverkillTrading</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/jkrdoc')}
              className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-yellow-400 font-semibold text-sm">jkrdoc</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/chironchain')}
              className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-emerald-400 font-semibold text-sm">chironchain</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/goodvimonly')}
              className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-violet-400 font-semibold text-sm">goodvimonly</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/Agent_rsch')}
              className="p-3 bg-lime-500/10 border border-lime-500/20 rounded-lg hover:bg-lime-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-lime-400 font-semibold text-sm">Agent_rsch</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/dontbuytops')}
              className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg hover:bg-sky-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-sky-400 font-semibold text-sm">dontbuytops</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/bruhbearr')}
              className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-rose-400 font-semibold text-sm">bruhbearr</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/MetaverseRanger')}
              className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-amber-400 font-semibold text-sm">MetaverseRanger</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/Shake51_')}
              className="p-3 bg-slate-500/10 border border-slate-500/20 rounded-lg hover:bg-slate-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-slate-400 font-semibold text-sm">Shake51_</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/0x_tesseract')}
              className="p-3 bg-stone-500/10 border border-stone-500/20 rounded-lg hover:bg-stone-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-stone-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-stone-400 font-semibold text-sm">0x_tesseract</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/TheEuroSniper')}
              className="p-3 bg-neutral-500/10 border border-neutral-500/20 rounded-lg hover:bg-neutral-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-neutral-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-neutral-400 font-semibold text-sm">TheEuroSniper</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/CryptoThannos')}
              className="p-3 bg-zinc-500/10 border border-zinc-500/20 rounded-lg hover:bg-zinc-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-zinc-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-zinc-400 font-semibold text-sm">CryptoThannos</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/stacy_muur')}
              className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg hover:bg-gray-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-gray-400 font-semibold text-sm">stacy_muur</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/martypartymusic')}
              className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg hover:bg-fuchsia-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-fuchsia-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-fuchsia-400 font-semibold text-sm">martypartymusic</h5>
              </div>
            </button>

            <button
              onClick={() => openInNewTab('https://x.com/watchingmarkets')}
              className="p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg hover:bg-blue-600/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-blue-600 font-semibold text-sm">watchingmarkets</h5>
              </div>
            </button>
          </div>
        </div>

        {/* X Sentiment - Top Coins Subsection */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-white">X Sentiment - Top Coins</h4>
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

        {/* Social Analytics - Moved to bottom */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <TrendingDown className="w-3 h-3 text-white" />
            </div>
            <h4 className="text-lg font-semibold text-white">Social Analytics</h4>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              AI POWERED
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
      </GlassCard>
    </div>
  );
}