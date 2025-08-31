import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ExternalLink } from "lucide-react";
import { getSecureIframeProps, getSecureLinkProps } from "@/utils/security";
import bittensorLogo from "@assets/bittensor_1755977414942.png";

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
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center">
            <img src={bittensorLogo} alt="Bittensor" className="w-8 h-8 rounded-lg" />
          </div>
          <h1 className="text-3xl font-bold text-white">Bittensor Network</h1>
        </div>
        <p className="text-crypto-silver">Comprehensive Bittensor subnet analytics and live data</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* TaoStats Integration */}
        <div>
          <div className="flex justify-end mb-3">
            <a
              {...getSecureLinkProps('https://taostats.io/')}
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              {...getSecureIframeProps('https://taostats.io/', 'TaoStats')}
              className="w-full h-[600px] border-0"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
          </div>
        </div>

        {/* Backprop Finance */}
        <div>
          <div className="flex justify-end mb-3">
            <a
              href="https://backprop.finance/screener/bubbles"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://backprop.finance/screener/bubbles"
              className="w-full h-[600px] border-0"
              title="Backprop Finance Screener"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
          </div>
        </div>

        {/* Swordscan TensorPulse Integration */}
        <div>
          <div className="flex justify-end mb-3">
            <a
              href="https://swordscan.com/tensorpulse-mindshare"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://swordscan.com/tensorpulse-mindshare"
              className="w-full h-[600px] border-0"
              title="Swordscan TensorPulse Mindshare"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
          </div>
        </div>

        {/* TaoBot */}
        <div>
          <div className="flex justify-end mb-3">
            <a
              href="https://www.tao.bot/explore"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://www.tao.bot/explore"
              className="w-full h-[600px] border-0"
              title="TaoBot"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
          </div>
        </div>

        {/* Top dTAO Wallets */}
        <div>
          <div className="flex justify-end mb-3">
            <a
              href="https://taomarketcap.com/blockchain/accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://taomarketcap.com/blockchain/accounts"
              className="w-full h-[600px] border-0"
              title="Top dTAO Wallets"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
          </div>
        </div>



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



        {/* TaoFi Swap Integration */}
        <div>
          <div className="flex justify-end mb-3">
            <a
              href="https://www.taofi.com/swap"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://www.taofi.com/swap"
              className="w-full h-[600px] border-0"
              title="TaoFi Swap"
              frameBorder="0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}