import { ExternalLink, TrendingUp } from "lucide-react";
import { getSecureIframeProps, getSecureLinkProps } from "@/utils/security";
import hyperliquidLogo from "@assets/hyperliquid-logo_1755977414943.png";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${className}`}>
    {children}
  </Card>
);

export function HypeSection() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <img src={hyperliquidLogo} alt="HyperLiquid" className="w-8 h-8 rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white">HyperLiquid Trading</h1>
        </div>
        <p className="text-crypto-silver">Live HYPE trading, analytics, and HyperEVM ecosystem</p>
      </div>
      {/* Hyperliquid Trading */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          HyperLiquid Dashboard
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
            LIVE TRADING
          </span>
          <a
            {...getSecureLinkProps('https://app.hyperliquid.xyz/trade/HYPE')}
            className="ml-auto text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </a>
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
          <iframe
            {...getSecureIframeProps('https://app.hyperliquid.xyz/trade/HYPE', 'Hyperliquid HYPE Trading')}
            className="w-full h-[600px] border-0"
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Live HYPE trading on Hyperliquid • Real-time orderbook and charts
          </p>
        </div>
      </div>

      {/* HyperDash */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">H</span>
          </div>
          HyperDash
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
            ANALYTICS
          </span>
          <a
            href="https://hyperdash.info/analytics"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            Open Full View <ExternalLink className="w-3 h-3" />
          </a>
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
          <iframe
            src="https://hyperdash.info/analytics"
            className="w-full h-[600px] border-0"
            title="Hyperdash Analytics"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
          />
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Hyperliquid ecosystem analytics • Volume, TVL, and performance metrics
          </p>
        </div>
      </div>

      {/* Copy Trade / Top Wallets Section */}
      <div className="space-y-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">CT</span>
            </div>
            <h3 className="text-xl font-semibold text-white">Copy Trade / Top Wallets</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              VAULT STRATEGY
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => window.open('https://app.hyperliquid.xyz/vaults/0xe11b12a81ad743ae805078b0da61e9166475a829', '_blank')}
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-purple-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <div className="text-left">
                  <h4 className="text-white font-medium text-sm">DegenAI Vault</h4>
                  <p className="text-gray-400 text-xs">Copy trading vault strategy - 0xe11b12a81ad743ae805078b0da61e9166475a829</p>
                </div>
              </div>
              <div className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors">→</div>
            </button>

            <button
              onClick={() => window.open('https://degenai.dev/', '_blank')}
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-pink-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <div className="text-left">
                  <h4 className="text-white font-medium text-sm">DegenAI Perps Bot</h4>
                  <p className="text-gray-400 text-xs">AI-powered perpetual trading bot - Advanced trading automation</p>
                </div>
              </div>
              <div className="w-4 h-4 text-gray-400 group-hover:text-pink-400 transition-colors">→</div>
            </button>
          </div>
        </GlassCard>
      </div>

      {/* CoinMarketMan HyperTracker */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          HyperTracker
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/30">
            TRACKER
          </span>
        </h3>
        
        <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-6">
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => window.open('https://app.coinmarketman.com/hypertracker', '_blank', 'noopener,noreferrer')}
              className="bg-gradient-to-br from-orange-500/10 to-red-600/10 hover:from-orange-500/20 hover:to-red-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Perp Trader Sentiment</div>
                  <div className="text-xs text-crypto-silver">Real-time trader sentiment analysis</div>
                </div>
                <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
              </div>
            </button>
            

          </div>
          
          {/* Portfolio Subsection */}
          <div className="mt-6">
            <h4 className="text-md font-semibold text-orange-400 mb-3 flex items-center gap-2">
              <div className="w-4 h-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs">P</span>
              </div>
              Portfolio
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => window.open('https://app.coinmarketman.com/hypertracker', '_blank', 'noopener,noreferrer')}
                className="bg-gradient-to-br from-orange-500/10 to-red-600/10 hover:from-orange-500/20 hover:to-red-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Portfolio Analytics</div>
                    <div className="text-xs text-crypto-silver">Comprehensive portfolio tracking and metrics</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                </div>
              </button>
              
              <button
                onClick={() => window.open('https://app.coinmarketman.com/dashboard/intelligence?tab=open_positions', '_blank', 'noopener,noreferrer')}
                className="bg-gradient-to-br from-orange-500/10 to-red-600/10 hover:from-orange-500/20 hover:to-red-600/20 border border-orange-500/20 hover:border-orange-400/40 rounded-lg p-4 transition-all duration-300 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-orange-300 mb-1">Wallet Intelligence</div>
                    <div className="text-xs text-crypto-silver">Open positions and perpetual futures intelligence</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-orange-400 group-hover:text-orange-300" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>







      {/* HyperEVM DeFi Ecosystem */}
      <div className="mt-12">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xs">H</span>
            </div>
            HyperEVM
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
              DEFI
            </span>
          </h3>
        </div>
        
        {/* DexScreener HyperEVM */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-green-400">DexScreener</h4>
            <a
              href="https://dexscreener.com/hyperevm?theme=dark"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://dexscreener.com/hyperevm?theme=dark"
              className="w-full h-[600px] border-0"
              title="HyperEVM DexScreener"
              allow="clipboard-read; clipboard-write"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
            />
          </div>
        </div>

        {/* HyperSwap */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-green-400">HyperSwap</h4>
            <a
              href="https://app.hyperswap.exchange/#/swap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://app.hyperswap.exchange/#/swap"
              className="w-full h-[600px] border-0"
              title="HyperSwap Exchange"
              allow="clipboard-read; clipboard-write"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
            />
          </div>
        </div>

        {/* Trenches */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-green-400">Trenches</h4>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <a
              href="https://liquidlaunch.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-green-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">L</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">LiquidLaunch Trenches</h3>
                  <p className="text-gray-400 text-xs">HyperEVM Launchpad</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" />
            </a>
            
            <a
              href="https://www.hyperliquid.magpiexyz.io/meme"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-green-500/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">H</span>
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">Hyperpie</h3>
                  <p className="text-gray-400 text-xs">HyperLiquid Core Launchpad</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-400 transition-colors" />
            </a>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">
            Complete HyperEVM DeFi ecosystem • Trading, swapping, and liquidity management
          </p>
        </div>
      </div>
    </div>
  );
}