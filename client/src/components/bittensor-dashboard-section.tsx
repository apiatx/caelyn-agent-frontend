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

        {/* Tao.app Explorer */}
        <div>
          <div className="flex justify-end mb-3">
            <a
              href="https://www.tao.app/explorer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://www.tao.app/explorer"
              className="w-full h-[600px] border-0"
              title="Tao.app Explorer"
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

        {/* TaoBridge */}
        <div>
          <div className="flex justify-end mb-3">
            <a
              href="https://taobridge.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            >
              Open Full View <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <iframe
              src="https://taobridge.xyz/"
              className="w-full h-[600px] border-0"
              title="TaoBridge"
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
