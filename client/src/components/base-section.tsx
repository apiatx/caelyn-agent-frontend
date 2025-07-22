import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Globe, ArrowLeftRight, TrendingUp } from "lucide-react";
import { openSecureLink, getSecureIframeProps, getSecureLinkProps } from "@/utils/security";


interface DashboardData {
  portfolioValue: number;
  portfolioPnL: number;
  portfolioPnLPercent: number;
  baseTopMovers: Array<{
    token: string;
    name: string;
    price: number;
    change24h: number;
    volume24h: number;
  }>;
  taoSubnetMovers: Array<{
    subnet: string;
    name: string;
    emissions: number;
    change24h: number;
    stakeWeight: number;
  }>;
  largeWalletActivity: Array<{
    type: 'BASE' | 'TAO';
    fromToken: string;
    toToken: string;
    amount: number;
    amountUsd: number;
    wallet: string;
    timestamp: string;
  }>;
  socialPulse: Array<{
    type: 'BASE' | 'TAO';
    token: string;
    name: string;
    mentions: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    trending: boolean;
  }>;
}

const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <Card className={`backdrop-blur-sm bg-gradient-to-br from-white/10 to-white/5 border border-white/20 ${className}`}>
    {children}
  </Card>
);

export default function BaseSection() {
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const isLoading = loadingDashboard;

  if (isLoading || !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Base Network</h2>
          <p className="text-crypto-silver">Loading BASE network overview...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <GlassCard key={i} className="p-6 animate-pulse">
              <div className="h-24 bg-white/10 rounded"></div>
            </GlassCard>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Base Network Dashboard</h2>
        <p className="text-crypto-silver">Live BASE network analytics and DexScreener integration</p>
      </div>

      {/* DexScreener Base Network iframe */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">D</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Trending</h3>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
            Live Data
          </span>
        </div>
        <div className="w-full">
          <iframe
            {...getSecureIframeProps('https://dexscreener.com/base?theme=dark', 'DexScreener Base Network')}
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* Terminal.co Integration */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Terminal.co Base Analytics</h3>
          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full font-medium">
            ANALYTICS
          </span>
          <button
            onClick={() => openSecureLink('https://www.terminal.co/?tab=base')}
            className="ml-auto text-cyan-400 hover:text-cyan-300 text-xs"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            {...getSecureIframeProps('https://www.terminal.co/?tab=base', 'Terminal.co Base Analytics')}
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* Checkr.social */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">CS</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Checkr.social</h3>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
            SOCIAL ANALYTICS
          </span>
          <button
            onClick={() => openSecureLink('https://checkr.social/')}
            className="ml-auto text-blue-400 hover:text-blue-300 text-xs"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            {...getSecureIframeProps('https://checkr.social/', 'Checkr.social')}
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* BlockCreeper Explorer */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">BC</span>
          </div>
          <h3 className="text-xl font-semibold text-white">BlockCreeper Explorer</h3>
          <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full font-medium">
            BLOCKCHAIN EXPLORER
          </span>
          <button
            onClick={() => openSecureLink('https://www.blockcreeper.com/')}
            className="ml-auto text-orange-400 hover:text-orange-300 text-xs"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            {...getSecureIframeProps('https://www.blockcreeper.com/', 'BlockCreeper Explorer')}
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* Ecosystems Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
            <Globe className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Ecosystems</h2>
            <p className="text-crypto-silver">AI Agent Platforms & Trading Tools</p>
          </div>
        </div>

        {/* Virtuals.io Platform */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">V</span>
            </div>
            <h3 className="text-xl font-semibold text-white">Virtuals.io Platform</h3>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
              AI AGENTS
            </span>
          </div>
          <div className="space-y-4">
            <div className="w-full">
              <iframe
                {...getSecureIframeProps('https://app.virtuals.io/', 'Virtuals.io Platform')}
                className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
                style={{
                  background: '#000000',
                  colorScheme: 'dark'
                }}
              />
            </div>
            
            {/* Related Platforms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-crypto-silver/10">
              <a
                {...getSecureLinkProps('https://bankr.bot/terminal')}
                className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-purple-500/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">B</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">Bankr.bot</h4>
                    <p className="text-gray-400 text-xs">Trading terminal</p>
                  </div>
                </div>
                <div className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors">→</div>
              </a>

              <a
                {...getSecureLinkProps('https://creator.bid/agents')}
                className="flex items-center justify-between p-4 bg-black/20 border border-crypto-silver/20 rounded-lg hover:bg-black/30 hover:border-emerald-500/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">C</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">Creator.bid</h4>
                    <p className="text-gray-400 text-xs">Agent marketplace</p>
                  </div>
                </div>
                <div className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors">→</div>
              </a>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* X Signal Section */}
      <div className="space-y-6">
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">X Signal</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
              BASE SIGNAL
            </Badge>
          </div>
          
          <div className="text-center py-8">
            <p className="text-crypto-silver">Coming soon - BASE network social signal intelligence</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}