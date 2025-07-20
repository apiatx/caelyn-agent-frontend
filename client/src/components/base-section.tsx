import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Eye, Users, MessageCircle, Brain, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTopMovers, useMarketAnalysis, useSocialSentiment, useWhaleActivity } from "@/hooks/use-real-time-data";
import { formatCurrency, formatPercentage } from "@/lib/utils";

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
  // Use real-time AI data hooks with 5-minute refresh for current top movers
  const { data: topMovers, isLoading: loadingMovers } = useTopMovers();
  const { data: marketAnalysis, isLoading: loadingAnalysis } = useMarketAnalysis();
  const { data: socialSentiment, isLoading: loadingSocial } = useSocialSentiment();
  const { data: whaleActivity, isLoading: loadingWhales } = useWhaleActivity();
  
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 300000 // Refresh every 5 minutes to match top movers
  });

  const isLoading = loadingDashboard || loadingMovers || loadingAnalysis;

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

      {/* DexScreener Base Network Link */}
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
        <div className="bg-white/5 rounded-lg p-8 border border-crypto-silver/20 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h4 className="text-xl font-semibold text-white mb-2">Live Base Network Analytics</h4>
            <p className="text-crypto-silver mb-6">
              Access real-time trading data, price charts, and liquidity information for all Base network tokens
            </p>
          </div>
          <a
            href="https://dexscreener.com/base"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            <Activity className="w-4 h-4" />
            Open DexScreener Base
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </GlassCard>

      {/* Live Base Movers */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">B</span>
          </div>
          <h3 className="text-xl font-semibold text-white">Live Base Movers</h3>
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
            5min refresh
          </span>
        </div>
        {loadingMovers ? (
          <div className="text-crypto-silver">Loading top movers...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topMovers?.slice(0, 12).map((token, index) => (
              <div key={`${token?.symbol || 'token'}-${index}`} className="bg-white/5 rounded-lg p-4 border border-crypto-silver/20">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-white font-medium">{token?.symbol || 'Unknown'}</div>
                    <div className="text-crypto-silver text-sm">{token?.token || 'N/A'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-crypto-success font-bold">+{token?.priceChange || 0}%</div>
                    <div className="text-crypto-silver text-sm">${token?.price ? parseFloat(token.price.toString()).toFixed(6) : '0.00'}</div>
                  </div>
                </div>
                <div className="text-crypto-silver text-xs">
                  Vol: ${token?.volume24h ? parseFloat(token.volume24h.toString()).toLocaleString() : 'N/A'}
                </div>
                {token?.contractAddress && (
                  <a 
                    href={`https://dexscreener.com/base/${token.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs mt-1 inline-block"
                  >
                    View on DexScreener →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Recent Base Whale Activity */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Recent Base Whale Activity
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              LIVE
            </Badge>
          </div>
        </div>
        <div className="space-y-3">
          {loadingWhales ? (
            <div className="text-center py-4">
              <Eye className="w-6 h-6 text-crypto-silver mx-auto mb-2 animate-spin" />
              <p className="text-crypto-silver text-sm">Monitoring whale activity...</p>
            </div>
          ) : (
            whaleActivity?.slice(0, 8).map((activity, index) => (
              <a 
                key={`${activity?.id || 'activity'}-${index}`} 
                href={`https://basescan.org/tx/${activity?.id || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold">
                    {activity?.action === 'BUY' ? '💰' : '📉'}
                  </div>
                  <div>
                    <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {activity?.action || 'TRADE'} {activity?.token || 'TOKEN'}
                    </div>
                    <div className="text-xs text-crypto-silver">
                      {activity?.timestamp ? new Date(activity.timestamp).toLocaleTimeString() : 'Recent'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-400">
                    ${activity?.amountUsd ? parseFloat(activity.amountUsd.toString()).toLocaleString() : '0'}
                  </div>
                  <div className="text-xs text-crypto-silver">
                    {activity?.amount ? parseFloat(activity.amount.toString()).toLocaleString() : '0'} {activity?.token || 'TOKEN'}
                  </div>
                </div>
              </a>
            ))
          )}
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
            socialSentiment?.filter(pulse => pulse?.platform === 'base-sentiment').slice(0, 6).map((pulse, index) => (
              <a 
                key={`${pulse?.ticker || pulse?.token || 'sentiment'}-${index}`} 
                href={`https://x.com/search?q=$${(pulse?.ticker || pulse?.token || '').toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold">
                    B
                  </div>
                  <div>
                    <div className="font-medium text-white group-hover:text-blue-400 transition-colors">${pulse?.ticker || pulse?.token || 'Unknown'}</div>
                    <div className="text-xs text-crypto-silver">Trending Score: {pulse?.trendingScore?.toFixed(0) || 'N/A'}</div>
                  </div>
                  {(pulse?.trendingScore || 0) > 70 && (
                    <TrendingUp className="w-4 h-4 text-orange-400" />
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {(pulse?.mentions || 0).toLocaleString()} mentions
                  </div>
                  <div className={`text-xs font-medium ${
                    pulse?.sentiment === 'positive' ? 'text-green-400' : 
                    pulse?.sentiment === 'negative' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {pulse?.sentiment || 'neutral'} sentiment
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