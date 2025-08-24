import React, { Suspense } from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Zap, DollarSign, Wallet, TrendingDown, Brain, Loader2, BarChart3, ExternalLink } from "lucide-react";
import { useSocialPulse } from "@/hooks/useSocialPulse";
import chainIcon from "@assets/images_1755979136215.jpeg";
// Glass card component for alpha section
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`bg-black/40 backdrop-blur-lg border-crypto-silver/20 ${className}`}>
    {children}
  </Card>
);

// Safe link component that doesn't throw unhandled rejections
const SafeLink = ({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) => {
  const openInNewTab = (url: string) => {
    try {
      window.open(url, '_blank');
    } catch (error) {
      console.warn('Failed to open URL:', url, error);
    }
  };

  return (
    <button onClick={() => openInNewTab(href)} className={className}>
      {children}
    </button>
  );
};

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
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <img src={chainIcon} alt="Onchain" className="w-10 h-10 object-contain" style={{filter: 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.3))'}} />
          </div>
          <h1 className="text-3xl font-bold text-white">Onchain Analytics</h1>
        </div>
        <p className="text-crypto-silver">Comprehensive blockchain data and intelligence</p>
      </div>

      {/* Onchain - Artemis Analytics */}
      <GlassCard className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500 rounded-full flex items-center justify-center">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-white">Artemis</h3>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
              COMPREHENSIVE
            </Badge>
          </div>
        </div>

        {/* Artemis Analytics Iframe */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
            <button
              onClick={() => openInNewTab('https://app.artemisanalytics.com/')}
              className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 overflow-hidden">
            <iframe
              src="https://app.artemisanalytics.com/"
              className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
              title="Artemis Analytics Dashboard"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
              referrerPolicy="no-referrer-when-downgrade"
              loading="lazy"
              allow="fullscreen; web-share; clipboard-read; clipboard-write; camera; microphone"
              style={{ border: 'none' }}
            />
          </div>
        </div>

        {/* Nansen.ai */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Nansen.ai</h4>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                ANALYTICS
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://app.nansen.ai/')}
              className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h5 className="text-xl font-semibold text-white mb-2">Nansen.ai Analytics</h5>
                <p className="text-gray-400 text-sm mb-4">
                  Blockchain analytics platform with on-chain insights and wallet tracking
                </p>
                <button
                  onClick={() => openInNewTab('https://app.nansen.ai/')}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  Open Nansen.ai Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messari.io */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Messari.io</h4>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                RESEARCH
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://messari.io/')}
              className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h5 className="text-xl font-semibold text-white mb-2">Messari.io Research</h5>
                <p className="text-gray-400 text-sm mb-4">
                  Crypto intelligence platform with research reports, market data, and institutional-grade analysis
                </p>
                <button
                  onClick={() => openInNewTab('https://messari.io/')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  Open Messari.io Platform
                </button>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

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
          <SafeLink
            href='https://app.elfa.ai/leaderboard/token?sortBy=mindshare:change'
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-purple-400 font-semibold">Mindshare by Elfi</h4>
            </div>
            <p className="text-gray-400 text-sm">AI Token Analytics & Social Intelligence</p>
          </SafeLink>

          <SafeLink
            href='https://www.cookie.fun/'
            className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">🍪</span>
              </div>
              <h4 className="text-pink-400 font-semibold">Cookie.fun</h4>
            </div>
            <p className="text-gray-400 text-sm">Interactive Trading Platform</p>
          </SafeLink>

          <SafeLink
            href='https://dapp.velvet.capital/'
            className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-purple-400 font-semibold">Velvet Capital</h4>
            </div>
            <p className="text-gray-400 text-sm">DeFi Portfolio Management</p>
          </SafeLink>

          <SafeLink
            href='https://ayaoracle.xyz/#agents_data'
            className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-indigo-400 font-semibold">Aya AI</h4>
            </div>
            <p className="text-gray-400 text-sm">Crypto AI Agent Analytics</p>
          </SafeLink>

          <SafeLink
            href='https://opensea.io/stats/tokens'
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-blue-400 font-semibold">OpenSea</h4>
            </div>
            <p className="text-gray-400 text-sm">Trending Altcoin Timeframes</p>
          </SafeLink>

          <SafeLink
            href='https://indexy.xyz/home'
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-green-400 font-semibold">Indexy</h4>
            </div>
            <p className="text-gray-400 text-sm">Crypto market indexing platform</p>
          </SafeLink>
        </div>

        {/* Alphanomics Platform */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Star className="w-3 h-3 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Alphanomics</h4>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                ANALYTICS
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://platform.alphanomics.io/')}
              className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Open Full View →
            </button>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://platform.alphanomics.io/"
              title="Alphanomics Analytics Platform"
              className="w-full h-[600px] border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      </GlassCard>

      {/* Social - Moved underneath Signal section */}
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
            <SafeLink
              href='https://x.com/TechDev_52'
              className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-cyan-400 font-semibold text-sm">TechDev_52</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/watchingmarkets'
              className="p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg hover:bg-blue-600/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-blue-600 font-semibold text-sm">Market Watcher</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/WolverCrypto'
              className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-yellow-400 font-semibold text-sm">WolverCrypto</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/altcoinvector'
              className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-indigo-400 font-semibold text-sm">altcoinvector</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/AltcoinMarksman'
              className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-green-400 font-semibold text-sm">AltcoinMarksman</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/ofvoice25355'
              className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-blue-400 font-semibold text-sm">Voice of the Gods</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/CoinGurruu'
              className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-purple-400 font-semibold text-sm">CoinGurruu</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/CryptoZer0_'
              className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-green-400 font-semibold text-sm">CryptoZer0_</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/DeFi_Paanda'
              className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-pink-400 font-semibold text-sm">DeFi_Paanda</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/aicryptopattern'
              className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-orange-400 font-semibold text-sm">aicryptopattern</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/bittybitbit86'
              className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-cyan-400 font-semibold text-sm">bittybitbit86</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/Whale_AI_net'
              className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-orange-400 font-semibold text-sm">Whale_AI_net</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/Defi0xJeff'
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-red-400 font-semibold text-sm">Defi0xJeff</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/EricCryptoman'
              className="p-3 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-pink-400 font-semibold text-sm">EricCryptoman</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/cryptorinweb3'
              className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-indigo-400 font-semibold text-sm">cryptorinweb3</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/OverkillTrading'
              className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg hover:bg-teal-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-teal-400 font-semibold text-sm">OverkillTrading</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/jkrdoc'
              className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-yellow-400 font-semibold text-sm">jkrdoc</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/chironchain'
              className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-emerald-400 font-semibold text-sm">chironchain</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/goodvimonly'
              className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-violet-400 font-semibold text-sm">goodvimonly</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/Agent_rsch'
              className="p-3 bg-lime-500/10 border border-lime-500/20 rounded-lg hover:bg-lime-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-lime-400 font-semibold text-sm">Agent_rsch</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/dontbuytops'
              className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-lg hover:bg-sky-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-sky-400 font-semibold text-sm">dontbuytops</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/bruhbearr'
              className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-rose-400 font-semibold text-sm">bruhbearr</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/MetaverseRanger'
              className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-amber-400 font-semibold text-sm">MetaverseRanger</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/Shake51_'
              className="p-3 bg-slate-500/10 border border-slate-500/20 rounded-lg hover:bg-slate-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-slate-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-slate-400 font-semibold text-sm">Shake51_</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/0x_tesseract'
              className="p-3 bg-stone-500/10 border border-stone-500/20 rounded-lg hover:bg-stone-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-stone-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-stone-400 font-semibold text-sm">0x_tesseract</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/TheEuroSniper'
              className="p-3 bg-neutral-500/10 border border-neutral-500/20 rounded-lg hover:bg-neutral-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-neutral-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-neutral-400 font-semibold text-sm">TheEuroSniper</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/CryptoThannos'
              className="p-3 bg-zinc-500/10 border border-zinc-500/20 rounded-lg hover:bg-zinc-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-zinc-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-zinc-400 font-semibold text-sm">CryptoThannos</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/stacy_muur'
              className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg hover:bg-gray-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-gray-400 font-semibold text-sm">stacy_muur</h5>
              </div>
            </SafeLink>

            <SafeLink
              href='https://x.com/martypartymusic'
              className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg hover:bg-fuchsia-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-fuchsia-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <h5 className="text-fuchsia-400 font-semibold text-sm">martypartymusic</h5>
              </div>
            </SafeLink>


          </div>
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
            <SafeLink
              href='https://yaps.kaito.ai/'
              className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-orange-400 font-semibold">Kaito</h4>
              </div>
              <p className="text-gray-400 text-sm">AI-Powered Social Intelligence</p>
            </SafeLink>

            <SafeLink
              href='https://app.kolytics.pro/leaderboard'
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-red-400 font-semibold">Kolytics</h4>
              </div>
              <p className="text-gray-400 text-sm">Social Signal Analytics</p>
            </SafeLink>
          </div>
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
          <SafeLink
            href='https://hyperdash.info/trader/0x15b325660a1c4a9582a7d834c31119c0cb9e3a42'
            className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-purple-400 font-semibold">HyperLiquid Whale</h4>
            </div>
            <p className="text-gray-400 text-sm">Hyperdash Trader Analytics</p>
          </SafeLink>

          <SafeLink
            href='https://debank.com/profile/0x3f135ba020d0ed288d8dd85cd3d600451b121013'
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-green-400 font-semibold">WhaleAI - ETH/BASE</h4>
            </div>
            <p className="text-gray-400 text-sm">DeBank Portfolio Analysis</p>
          </SafeLink>

          <SafeLink
            href='https://debank.com/profile/0xb1058c959987e3513600eb5b4fd82aeee2a0e4f9'
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-emerald-400 font-semibold">Debt Relief Bot</h4>
            </div>
            <p className="text-gray-400 text-sm">DeBank wallet tracker</p>
          </SafeLink>

          <SafeLink
            href='https://app.hyperliquid.xyz/vaults/0xe11b12a81ad743ae805078b0da61e9166475a829'
            className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-indigo-400 font-semibold">DegenAI HL Vault</h4>
            </div>
            <p className="text-gray-400 text-sm">Copy trading vault strategy</p>
          </SafeLink>

          <SafeLink
            href='https://degenai.dev/'
            className="p-4 bg-pink-500/10 border border-pink-500/20 rounded-lg hover:bg-pink-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-pink-400 font-semibold">DegenAI Perps Bot</h4>
            </div>
            <p className="text-gray-400 text-sm">AI-powered perpetual trading bot</p>
          </SafeLink>
        </div>


      </GlassCard>



      {/* Resources - Moved to bottom */}
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
          <SafeLink
            href='https://chatgpt.com/g/g-ma6mK7m5t-crypto-trading-investing'
            className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-cyan-400 font-semibold">ChatGPT Crypto AI</h4>
            </div>
            <p className="text-gray-400 text-sm">Crypto Trading & Investing GPT</p>
          </SafeLink>

          <SafeLink
            href='https://app.bubblemaps.io/'
            className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg hover:from-blue-500/20 hover:to-purple-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h4 className="text-blue-400 font-semibold">Bubblemaps</h4>
            </div>
            <p className="text-gray-400 text-sm">Token Analytics & Visualization</p>
          </SafeLink>

          <SafeLink
            href='https://substack.com/home'
            className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">📰</span>
              </div>
              <h4 className="text-orange-400 font-semibold">Substack</h4>
            </div>
            <p className="text-gray-400 text-sm">Newsletter Publishing Platform</p>
          </SafeLink>

          <SafeLink
            href='https://x.com/home'
            className="p-4 bg-gray-800/10 border border-gray-600/20 rounded-lg hover:bg-gray-800/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">𝕏</span>
              </div>
              <h4 className="text-gray-300 font-semibold">X Home</h4>
            </div>
            <p className="text-gray-400 text-sm">Social Media & News Feed</p>
          </SafeLink>
        </div>
      </GlassCard>

      {/* WachXBT Token Sniffer */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">W</span>
          </div>
          <h3 className="text-xl font-semibold text-white">WachXBT Token Sniffer</h3>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
            AI CHAT
          </Badge>
          <SafeLink
            href="https://wach.ai/chat"
            className="ml-auto text-blue-400 hover:text-blue-300 text-xs"
          >
            Open in New Tab →
          </SafeLink>
        </div>
        <div className="w-full">
          <iframe
            src="https://wach.ai/chat"
            title="WachXBT Token Sniffer"
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

      {/* More Analysis */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">More Analysis</h3>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
            TOOLS
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Chainspect */}
          <div className="bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <div>
                <h5 className="text-white font-semibold">Chainspect</h5>
                <p className="text-gray-400 text-xs mb-3">Chain scalability and decentralization analytics</p>
                <button
                  onClick={() => openInNewTab('https://chainspect.app/')}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors text-xs font-medium"
                >
                  Open Dashboard
                </button>
              </div>
            </div>
          </div>
          
          {/* Token Terminal */}
          <div className="bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">T</span>
              </div>
              <div>
                <h5 className="text-white font-semibold">Token Terminal</h5>
                <p className="text-gray-400 text-xs mb-3">Protocol metrics explorer</p>
                <button
                  onClick={() => openInNewTab('https://tokenterminal.com/explorer')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-xs font-medium"
                >
                  Open Explorer
                </button>
              </div>
            </div>
          </div>

          {/* OKLink */}
          <div className="bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">OK</span>
              </div>
              <div>
                <h5 className="text-white font-semibold">OKLink</h5>
                <p className="text-gray-400 text-xs mb-3">Blockchain explorer and analytics</p>
                <button
                  onClick={() => openInNewTab('https://www.oklink.com/')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-xs font-medium"
                >
                  Open OKLink
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chainlyze Smart Wallet Iframe */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                <Wallet className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white">Chainlyze Smart Wallet Tracker</h4>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
                ANALYTICS
              </Badge>
            </div>
            <button
              onClick={() => openInNewTab('https://app.chainlyze.ai/smart-wallet')}
              className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm ml-auto"
            >
              Open Full View →
            </button>
          </div>
          <div className="w-full bg-gray-900/50 rounded-lg border border-crypto-silver/20 overflow-hidden">
            <iframe
              src="https://app.chainlyze.ai/smart-wallet"
              className="w-full h-[400px] sm:h-[500px] lg:h-[600px]"
              title="Chainlyze Smart Wallet"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
              referrerPolicy="no-referrer-when-downgrade"
              loading="lazy"
              allow="fullscreen; web-share; clipboard-read; clipboard-write; camera; microphone"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      </GlassCard>

      {/* Discover Web3 */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">Discover Web3</h3>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-xs">
            ECOSYSTEM
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Gravity Ecosystem */}
          <div className="bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">G</span>
              </div>
              <div>
                <h5 className="text-white font-semibold">Gravity Ecosystem</h5>
                <p className="text-gray-400 text-xs mb-3">Explore the Gravity network</p>
                <button
                  onClick={() => openInNewTab('https://ecosystem.gravity.xyz/')}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-4 py-2 rounded-lg transition-colors text-xs font-medium"
                >
                  Explore Gravity
                </button>
              </div>
            </div>
          </div>
          
          {/* DappRadar */}
          <div className="bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">D</span>
              </div>
              <div>
                <h5 className="text-white font-semibold">DappRadar</h5>
                <p className="text-gray-400 text-xs mb-3">Discover DApps & analytics</p>
                <button
                  onClick={() => openInNewTab('https://dappradar.com/')}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-4 py-2 rounded-lg transition-colors text-xs font-medium"
                >
                  Open DappRadar
                </button>
              </div>
            </div>
          </div>
          
          {/* Zapper */}
          <div className="bg-gray-900/50 rounded-lg border border-crypto-silver/20 p-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">Z</span>
              </div>
              <div>
                <h5 className="text-white font-semibold">Zapper</h5>
                <p className="text-gray-400 text-xs mb-3">DeFi portfolio management</p>
                <button
                  onClick={() => openInNewTab('https://zapper.xyz/')}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-4 py-2 rounded-lg transition-colors text-xs font-medium"
                >
                  Open Zapper
                </button>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Memecoins */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">🚀</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Memecoins</h3>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
            CAPITODAY
          </Badge>
        </div>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
          <iframe
            src="https://capitoday.com/"
            title="Capitoday Memecoin Analytics"
            className="w-full h-[600px] border-0"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </GlassCard>
    </div>
  );
}