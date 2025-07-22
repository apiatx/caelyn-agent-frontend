import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, ExternalLink } from "lucide-react";

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${className}`}>
    {children}
  </Card>
);

export default function BittensorDashboardSection() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center">
          <Brain className="w-6 h-6 mr-3 text-orange-400" />
          Bittensor Dashboard
        </h2>
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
                href="https://taostats.io/"
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
              src="https://taostats.io/"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="TaoStats"
              frameBorder="0"
              loading="lazy"
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

        {/* Backprop Finance Leaderboard */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              Backprop Finance
            </h3>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Leaderboard
              </Badge>
              <a 
                href="https://backprop.finance/leaderboard"
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
              src="https://backprop.finance/leaderboard"
              className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
              title="Backprop Finance Leaderboard"
              frameBorder="0"
              loading="lazy"
              style={{
                background: 'transparent',
                colorScheme: 'dark'
              }}
            />
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              τ Leaderboard
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

        {/* TaoHub Portfolio Integration */}
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
      </div>
    </div>
  );
}