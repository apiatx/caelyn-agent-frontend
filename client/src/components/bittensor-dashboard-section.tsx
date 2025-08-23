import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ExternalLink } from "lucide-react";
import { getSecureIframeProps, getSecureLinkProps } from "@/utils/security";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${className}`}>
    {children}
  </Card>
);

export default function BittensorDashboardSection() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <img src="https://assets.coingecko.com/coins/images/28452/standard/ARUsPeNQ_400x400.jpg" alt="Bittensor" className="w-8 h-8 rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white">Bittensor</h1>
        </div>
        <p className="text-crypto-silver">Comprehensive Bittensor subnet analytics and live data</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* TaoStats Integration */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              taostats
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                τ TaoStats
              </Badge>
              <a 
                {...getSecureLinkProps('https://taostats.io/')}
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="relative w-full">
            <iframe
              {...getSecureIframeProps('https://taostats.io/', 'TaoStats')}
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Live Bittensor Data
            </div>
          </div>
        </GlassCard>

        {/* Backprop Finance */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              Backprop Finance
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                SUBNET SCREENER
              </Badge>
              <a 
                href="https://backprop.finance/screener/bubbles"
                target="_blank"
                rel="noopener noreferrer"
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="relative w-full">
            <iframe
              src="https://backprop.finance/screener/bubbles"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="Backprop Finance Screener"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Subnet Screener
            </div>
          </div>
        </GlassCard>

        {/* Swordscan TensorPulse Integration */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              swordscan
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                TensorPulse
              </Badge>
              <a 
                href="https://swordscan.com/tensorpulse-mindshare"
                target="_blank"
                rel="noopener noreferrer"
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="relative w-full">
            <iframe
              src="https://swordscan.com/tensorpulse-mindshare"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="Swordscan TensorPulse Mindshare"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Live Mindshare Analytics
            </div>
          </div>
        </GlassCard>



        {/* Top dTAO Wallets */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              Top dTAO Wallets
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                τ Wallets
              </Badge>
              <a 
                href="https://taomarketcap.com/blockchain/accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="relative w-full">
            <iframe
              src="https://taomarketcap.com/blockchain/accounts"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="Top dTAO Wallets"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              τ Wallet Analytics
            </div>
          </div>
        </GlassCard>



        {/* Signal Section */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">X Signal</h3>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
              TAO SIGNAL
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => window.open('https://x.com/tao_agent', '_blank', 'noopener,noreferrer')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">TAO Agent</h4>
              </div>
              <p className="text-gray-400 text-sm">Bittensor Signal Intelligence</p>
            </button>

            <button
              onClick={() => window.open('https://x.com/Bitcast_network', '_blank', 'noopener,noreferrer')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">Bitcast Network</h4>
              </div>
              <p className="text-gray-400 text-sm">TAO Network Analytics</p>
            </button>

            <button
              onClick={() => window.open('https://x.com/TaoStacker', '_blank', 'noopener,noreferrer')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">TaoStacker</h4>
              </div>
              <p className="text-gray-400 text-sm">TAO Staking Insights</p>
            </button>

            <button
              onClick={() => window.open('https://x.com/TaoIsTheKey', '_blank', 'noopener,noreferrer')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">TaoIsTheKey</h4>
              </div>
              <p className="text-gray-400 text-sm">TAO Market Analysis</p>
            </button>

            <button
              onClick={() => window.open('https://x.com/varimotrades', '_blank', 'noopener,noreferrer')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">VARiMOtrading</h4>
              </div>
              <p className="text-gray-400 text-sm">TAO Trading Signals</p>
            </button>

            <button
              onClick={() => window.open('https://x.com/_g_x_g', '_blank', 'noopener,noreferrer')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">GXG</h4>
              </div>
              <p className="text-gray-400 text-sm">Bittensor Intelligence</p>
            </button>

            <button
              onClick={() => window.open('https://x.com/Shogun__base', '_blank', 'noopener,noreferrer')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">Shogun Base</h4>
              </div>
              <p className="text-gray-400 text-sm">Base Network Trading</p>
            </button>

            <button
              onClick={() => window.open('https://x.com/Victor_crypto_2', '_blank', 'noopener,noreferrer')}
              className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <h4 className="text-purple-400 font-semibold">Victor Crypto</h4>
              </div>
              <p className="text-gray-400 text-sm">Crypto Market Analysis</p>
            </button>
          </div>
        </GlassCard>

        {/* TaoHub Portfolio Integration - Moved to bottom */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              TaoHub Portfolio
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Portfolio Tracker
              </Badge>
              <a 
                href="https://www.taohub.info/portfolio"
                target="_blank"
                rel="noopener noreferrer"
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="relative w-full">
            <iframe
              src="https://www.taohub.info/portfolio"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="TaoHub Portfolio"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              τ Portfolio Analytics
            </div>
          </div>
        </GlassCard>

        {/* TaoFi Swap Integration */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              TaoFi Swap
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                DEX SWAP
              </Badge>
              <a 
                href="https://www.taofi.com/swap"
                target="_blank"
                rel="noopener noreferrer"
                className="text-crypto-silver hover:text-white transition-colors group"
              >
                <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
          
          <div className="relative w-full">
            <iframe
              src="https://www.taofi.com/swap"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="TaoFi Swap"
              frameBorder="0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              τ DEX Trading
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}