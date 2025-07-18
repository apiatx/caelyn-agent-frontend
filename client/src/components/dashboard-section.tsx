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

export default function DashboardSection() {
  // Use real-time AI data hooks
  const { data: topMovers, isLoading: loadingMovers } = useTopMovers();
  const { data: marketAnalysis, isLoading: loadingAnalysis } = useMarketAnalysis();
  const { data: socialSentiment, isLoading: loadingSocial } = useSocialSentiment();
  const { data: whaleActivity, isLoading: loadingWhales } = useWhaleActivity();
  
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const isLoading = loadingDashboard || loadingMovers || loadingAnalysis;

  if (isLoading || !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
          <p className="text-crypto-silver">Loading comprehensive market overview...</p>
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
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-crypto-silver">Comprehensive BASE & TAO market intelligence</p>
      </div>

      {/* Top Row - Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Portfolio Value */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Total Portfolio Value</h3>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-white">
              {formatCurrency(dashboardData.portfolioValue)}
            </div>
            <div className="text-sm text-crypto-silver">Across BASE & TAO networks</div>
          </div>
        </GlassCard>

        {/* Portfolio PnL */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">24h Portfolio PnL</h3>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              dashboardData.portfolioPnL >= 0 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-red-500 to-red-600'
            }`}>
              {dashboardData.portfolioPnL >= 0 ? 
                <ArrowUpRight className="w-5 h-5 text-white" /> : 
                <ArrowDownRight className="w-5 h-5 text-white" />
              }
            </div>
          </div>
          <div className="space-y-2">
            <div className={`text-3xl font-bold ${dashboardData.portfolioPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {dashboardData.portfolioPnL >= 0 ? '+' : ''}{formatCurrency(dashboardData.portfolioPnL)}
            </div>
            <div className={`text-sm ${dashboardData.portfolioPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {dashboardData.portfolioPnL >= 0 ? '+' : ''}{formatPercentage(dashboardData.portfolioPnLPercent)}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Middle Row - Market Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-Time BASE Top Movers */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Live BASE Movers (24h)
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                LIVE
              </Badge>
            </div>
          </div>
          <div className="space-y-3">
            {loadingMovers ? (
              <div className="text-center py-4">
                <Activity className="w-6 h-6 text-crypto-silver mx-auto mb-2 animate-spin" />
                <p className="text-crypto-silver text-sm">Loading live movers...</p>
              </div>
            ) : (
              topMovers?.filter(m => m.network === 'BASE').slice(0, 5).map((token, index) => (
                <a 
                  key={`${token.symbol}-${index}`} 
                  href={`https://dexscreener.com/base/${token.symbol}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold text-crypto-silver">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-white group-hover:text-blue-400 transition-colors">${token.symbol}</div>
                      <div className="text-xs text-crypto-silver">{token.token}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      ${token.price.toFixed(6)}
                    </div>
                    <div className={`text-xs font-medium ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </GlassCard>

        {/* AI Market Sentiment Analysis */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              AI Market Sentiment
            </h3>
            <Badge className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-400 border-pink-500/30">
              AI POWERED
            </Badge>
          </div>
          <div className="space-y-4">
            {loadingAnalysis ? (
              <div className="text-center py-4">
                <Brain className="w-6 h-6 text-crypto-silver mx-auto mb-2 animate-spin" />
                <p className="text-crypto-silver text-sm">AI analyzing market...</p>
              </div>
            ) : marketAnalysis?.aiAnalysis ? (
              <>
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-crypto-silver">Overall Sentiment</span>
                    <Badge 
                      className={`${
                        marketAnalysis.aiAnalysis.sentiment.overall === 'bullish' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                          : marketAnalysis.aiAnalysis.sentiment.overall === 'bearish' 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }`}
                    >
                      {marketAnalysis.aiAnalysis.sentiment.overall.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-white mb-2">
                    Confidence: {Math.round(marketAnalysis.aiAnalysis.sentiment.confidence * 100)}%
                  </div>
                  <p className="text-xs text-crypto-silver">{marketAnalysis.aiAnalysis.sentiment.analysis}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-sm text-crypto-silver">Key Signals:</span>
                  {marketAnalysis.aiAnalysis.sentiment.signals.map((signal, i) => (
                    <div key={i} className="text-xs text-white bg-black/20 rounded px-2 py-1">
                      • {signal}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-crypto-silver text-sm">AI analysis loading...</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row - Real-Time Activity & Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Whale Activity */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Live Whale Activity
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                LIVE
              </Badge>
            </div>
          </div>
          <div className="space-y-3">
            {loadingWhales ? (
              <div className="text-center py-4">
                <Activity className="w-6 h-6 text-crypto-silver mx-auto mb-2 animate-spin" />
                <p className="text-crypto-silver text-sm">Loading whale activity...</p>
              </div>
            ) : (
              whaleActivity?.slice(0, 4).map((activity, index) => (
                <a 
                  key={activity.id} 
                  href={activity.network === 'BASE' ? `https://basescan.org/tx/${activity.txHash}` : `https://taoscan.org/transaction/${activity.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      activity.network === 'BASE' ? 'bg-blue-500' : 'bg-gradient-to-r from-orange-500 to-purple-600'
                    }`}>
                      {activity.network === 'BASE' ? 'B' : 'Τ'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                        {activity.action} {activity.token}
                      </div>
                      <div className="text-xs text-crypto-silver">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-400">
                      ${parseFloat(activity.amountUsd).toLocaleString()}
                    </div>
                    <div className="text-xs text-crypto-silver">
                      {parseFloat(activity.amount).toLocaleString()} {activity.token}
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </GlassCard>

        {/* Live Social Sentiment */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Live Social Sentiment
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
              socialSentiment?.slice(0, 4).map((pulse, index) => (
                <a 
                  key={`${pulse.ticker || pulse.token || index}`} 
                  href={`https://x.com/search?q=$${(pulse.ticker || pulse.token || '').toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">
                      S
                    </div>
                    <div>
                      <div className="font-medium text-white group-hover:text-blue-400 transition-colors">${pulse.ticker || pulse.token}</div>
                      <div className="text-xs text-crypto-silver">Trending Score: {pulse.trendingScore?.toFixed(0) || 'N/A'}</div>
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
    </div>
  );
}