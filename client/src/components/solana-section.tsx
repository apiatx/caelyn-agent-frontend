import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Activity, Zap, TrendingDown, TrendingUp, ExternalLink, Star } from "lucide-react";
import { openSecureLink, getSecureIframeProps } from "@/utils/security";
import solanaLogo from "@assets/solana_1755977414939.png";

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
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <img src={solanaLogo} alt="Solana" className="w-8 h-8 rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white">Solana Network</h1>
        </div>
        <p className="text-crypto-silver">Live Solana network analytics with DexScreener, Jupiter, and Moby Screener</p>
      </div>

      {/* Solana Price Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-purple-400">Solana Price Chart</h3>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              SOL
            </Badge>
            <button
              onClick={() => openSecureLink('https://coinmarketcap.com/currencies/solana/')}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs transition-colors"
            >
              <span>CoinMarketCap</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={() => openSecureLink('https://www.tradingview.com/chart/?symbol=BINANCE%3ASOLUSDT')}
            className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
          >
            Open Full View →
          </button>
        </div>
        <div className="bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl overflow-hidden">
          <iframe
            src="https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=610&interval=1D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=true&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=Etc%2FUTC&hide_top_toolbar=false&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]&symbol=BINANCE%3ASOLUSDT"
            className="w-full h-[500px] sm:h-[600px] lg:h-[700px] rounded-lg border border-crypto-silver/20"
            title="Solana Advanced Chart"
            frameBorder="0"
            scrolling="no"
          />
        </div>
      </div>

      {/* DexScreener Solana */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Trending</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              LIVE CHARTS
            </Badge>
          </div>
          <button
            onClick={() => openSecureLink('https://dexscreener.com/solana')}
            className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm"
          >
            Open Full View →
          </button>
        </div>
        <div className="w-full space-y-4">
          <iframe
            {...getSecureIframeProps('https://dexscreener.com/solana?theme=dark', 'DexScreener Solana Network')}
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
          
          {/* 30 Day Trending on OpenSea */}
          <div className="border-t border-crypto-silver/20 pt-4">
            <button
              onClick={() => openSecureLink('https://opensea.io/stats/tokens?sortBy=thirtyDayPriceChange&chains=solana')}
              className="w-full p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-colors text-left"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-cyan-400 font-semibold">30 Day Trending on OpenSea</h4>
              </div>
              <p className="text-gray-400 text-sm">View trending Solana tokens by 30-day price changes</p>
            </button>
          </div>
        </div>
      </GlassCard>



      {/* Moby Screener */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Moby Screener</h3>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              ANALYTICS
            </Badge>
          </div>
          <button
            onClick={() => openSecureLink('https://www.mobyscreener.com/')}
            className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm"
          >
            Open Full View →
          </button>
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

          <button
            onClick={() => openSecureLink('https://x.com/Crypto_Alch')}
            className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">𝕏</span>
              </div>
              <h5 className="text-green-400 font-semibold text-sm">Crypto_Alch</h5>
            </div>
          </button>
        </div>
      </GlassCard>

      {/* Trade Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
            <Zap className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Trade</h2>
            <p className="text-crypto-silver">DEX Aggregators & Trading Platforms</p>
          </div>
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

        {/* Raydium */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">Raydium</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              AMM & DEX
            </Badge>
          </div>
          <div className="w-full">
            <iframe
              src="https://raydium.io/swap/?inputMint=sol&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="Raydium"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </GlassCard>
      </div>

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

      {/* Trading Platforms */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">The World Onchain</h3>
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
            ASSETS
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">AU</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Oro Gold</h3>
                <p className="text-gray-400 text-xs">Trade gold</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/orogoldapp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://orogold.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded text-yellow-400 hover:bg-yellow-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">📈</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">xStocks</h3>
                <p className="text-gray-400 text-xs">Trade stocks</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/xStocksFi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://xstocks.com/us"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🏢</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">PreStocks</h3>
                <p className="text-gray-400 text-xs">Trade pre-IPO stocks</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/PreStocksFi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://prestocks.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 hover:bg-purple-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">₿</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Apollo BTC</h3>
                <p className="text-gray-400 text-xs">Trade native Bitcoin</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/ApolloBTCportal"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://apolloportal.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-500/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🏠</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Parcl</h3>
                <p className="text-gray-400 text-xs">Trade real estate</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/Parcl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://www.parcl.co/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500/20 border border-green-500/30 rounded text-green-400 hover:bg-green-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">✨</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Magic Eden</h3>
                <p className="text-gray-400 text-xs">Trade digital slop</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/MagicEden"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://magiceden.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-pink-500/20 border border-pink-500/30 rounded text-pink-400 hover:bg-pink-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🏦</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">RECC Finance</h3>
                <p className="text-gray-400 text-xs">Trade RWA</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/RECCFinance"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://recc.finance/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">📊</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Etherfuse</h3>
                <p className="text-gray-400 text-xs">Trade bonds</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/etherfuse"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://www.etherfuse.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-400 hover:bg-indigo-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">💱</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Circle</h3>
                <p className="text-gray-400 text-xs">Trade forex</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/circle"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://www.circle.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-400 hover:bg-emerald-500/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-black/20 border border-crypto-silver/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-lime-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">🌾</span>
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">AgriDex</h3>
                <p className="text-gray-400 text-xs">Trade agriculture</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="https://x.com/AgriDexPlatform"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 text-xs transition-colors"
              >
                <span className="font-bold">𝕏</span>
                <span>Twitter</span>
              </a>
              <a
                href="https://agridex.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600/20 border border-green-600/30 rounded text-green-400 hover:bg-green-600/30 text-xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Website</span>
              </a>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}