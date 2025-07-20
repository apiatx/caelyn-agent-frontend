import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";


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
          <h3 className="text-xl font-semibold text-white">DexScreener Base Network</h3>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
            Live Data
          </span>
        </div>
        <div className="w-full">
          <iframe
            src="https://dexscreener.com/base?theme=dark"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="DexScreener Base Network"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
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
            onClick={() => window.open('https://www.terminal.co/?tab=base', '_blank')}
            className="ml-auto text-cyan-400 hover:text-cyan-300 text-xs"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.terminal.co/?tab=base"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Terminal.co Base Analytics"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
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
            onClick={() => window.open('https://www.blockcreeper.com/explore', '_blank')}
            className="ml-auto text-orange-400 hover:text-orange-300 text-xs"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://www.blockcreeper.com/explore"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="BlockCreeper Explorer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* Aerodrome Finance Swap */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Aerodrome Finance Swap</h3>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
            BASE DEX
          </span>
          <button
            onClick={() => window.open('https://aerodrome.finance/swap?from=eth&to=0x940181a94a35a4569e4529a3cdfb74e38fd98631&chain0=8453&chain1=8453', '_blank')}
            className="ml-auto text-green-400 hover:text-green-300 text-xs"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://aerodrome.finance/swap?from=eth&to=0x940181a94a35a4569e4529a3cdfb74e38fd98631&chain0=8453&chain1=8453"
            className="w-full h-[600px] sm:h-[700px] lg:h-[800px] rounded-lg border border-crypto-silver/20"
            title="Aerodrome Finance Swap"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            style={{
              background: 'transparent',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* Uniswap DEX */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">U</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Uniswap DEX</h3>
          <span className="px-2 py-1 bg-pink-500/20 text-pink-400 text-xs rounded-full font-medium">
            MULTI-CHAIN
          </span>
          <button
            onClick={() => window.open('https://app.uniswap.org/', '_blank')}
            className="ml-auto text-pink-400 hover:text-pink-300 text-xs"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://app.uniswap.org/"
            className="w-full h-[600px] sm:h-[700px] lg:h-[800px] rounded-lg border border-crypto-silver/20"
            title="Uniswap DEX"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            style={{
              background: 'transparent',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* Bankr.bot Integration */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Bankr.bot Terminal</h3>
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
            Live Data
          </span>
        </div>
        <div className="w-full">
          <iframe
            src="https://bankr.bot/terminal"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Bankr.bot Terminal"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* Virtuals.io Platform */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">V</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Virtuals.io Platform</h3>
          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full font-medium">
            AI AGENTS
          </span>
          <button
            onClick={() => window.open('https://app.virtuals.io/', '_blank')}
            className="ml-auto text-purple-400 hover:text-purple-300 text-xs"
          >
            Open in New Tab →
          </button>
        </div>
        <div className="w-full">
          <iframe
            src="https://app.virtuals.io/"
            className="w-full h-[600px] rounded-lg border border-crypto-silver/20"
            title="Virtuals.io Platform"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            style={{
              background: '#000000',
              colorScheme: 'dark'
            }}
          />
        </div>
      </GlassCard>

      {/* Creator.bid Agents */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">CB</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Creator.bid Agents</h3>
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-medium">
            CREATOR AGENTS
          </span>
        </div>
        
        {/* Call-to-action for Creator.bid */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-600/10 border border-emerald-500/20 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">CB</span>
          </div>
          <h4 className="text-2xl font-bold text-white mb-3">Creator.bid Agent Platform</h4>
          <p className="text-gray-300 mb-6 max-w-md mx-auto">
            Access the full Creator.bid agent marketplace with AI-powered creator tools, bidding systems, and agent management.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div className="text-emerald-400">• AI Creator Agents</div>
            <div className="text-emerald-400">• Bidding System</div>
            <div className="text-emerald-400">• Agent Marketplace</div>
            <div className="text-emerald-400">• Creator Tools</div>
          </div>
          <button
            onClick={() => window.open('https://creator.bid/agents', '_blank')}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Open Creator.bid Platform →
          </button>
        </div>
      </GlassCard>
    </div>
  );
}