import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSocialSentiment } from "@/hooks/use-real-time-data";


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
  // Use real-time AI data hooks for social sentiment
  const socialSentimentQuery = useSocialSentiment();
  
  const socialSentiment = socialSentimentQuery.data || [];
  
  const loadingSocial = socialSentimentQuery.isLoading;
  
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

      {/* Base Social Sentiment */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <MessageCircle className="w-4 h-4 mr-2" />
            Base Social Sentiment
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              TRENDING
            </Badge>
          </div>
        </div>
        <div className="space-y-3">
          {loadingSocial ? (
            <div className="text-center py-4">
              <MessageCircle className="w-6 h-6 text-crypto-silver mx-auto mb-2 animate-spin" />
              <p className="text-crypto-silver text-sm">Analyzing social sentiment...</p>
            </div>
          ) : (
            Array.isArray(socialSentiment) && socialSentiment
              .filter(pulse => pulse && typeof pulse === 'object' && pulse.platform === 'base-sentiment')
              .slice(0, 6)
              .map((pulse, index) => (
                <a 
                  key={`sentiment-${index}-${pulse.ticker || pulse.token || Math.random()}`} 
                  href={`https://x.com/search?q=$${(pulse.ticker || pulse.token || '').toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold">
                      B
                    </div>
                    <div>
                      <div className="font-medium text-white group-hover:text-blue-400 transition-colors">${pulse.ticker || pulse.token || 'Unknown'}</div>
                      <div className="text-xs text-crypto-silver">Trending Score: {pulse.trendingScore ? Number(pulse.trendingScore).toFixed(0) : 'N/A'}</div>
                    </div>
                    {(pulse.trendingScore || 0) > 70 && (
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {(pulse.mentions || 0).toLocaleString()} mentions
                    </div>
                    <div className={`text-xs font-medium ${
                      pulse.sentiment === 'positive' ? 'text-green-400' : 
                      pulse.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {pulse.sentiment || 'neutral'} sentiment
                    </div>
                  </div>
                </a>
              ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}