import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Eye, Users, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/dashboard'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

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
        {/* BASE Top Movers */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">BASE Top Movers (24h)</h3>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              BASE Network
            </Badge>
          </div>
          <div className="space-y-3">
            {dashboardData.baseTopMovers.map((token, index) => (
              <div key={token.token} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-crypto-silver">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">${token.token}</div>
                    <div className="text-xs text-crypto-silver">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {formatCurrency(token.price)}
                  </div>
                  <div className={`text-xs font-medium ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {token.change24h >= 0 ? '+' : ''}{formatPercentage(token.change24h)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* TAO Subnet Movers */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">TAO Subnet Movers (24h)</h3>
            <Badge className="bg-gradient-to-r from-orange-500/20 to-purple-500/20 text-orange-400 border-orange-500/30">
              Bittensor
            </Badge>
          </div>
          <div className="space-y-3">
            {dashboardData.taoSubnetMovers.map((subnet, index) => (
              <div key={subnet.subnet} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-crypto-silver">
                    #{index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-orange-400">{subnet.subnet}</div>
                    <div className="text-xs text-crypto-silver">{subnet.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {subnet.emissions.toFixed(1)} τ
                  </div>
                  <div className={`text-xs font-medium ${subnet.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {subnet.change24h >= 0 ? '+' : ''}{formatPercentage(subnet.change24h)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row - Activity & Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Large Wallet Activity */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Large Wallet Activity</h3>
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            {dashboardData.largeWalletActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-xs ${activity.type === 'BASE' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                      {activity.type}
                    </Badge>
                    <span className="text-xs text-crypto-silver">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-white">
                    {activity.fromToken} → {activity.toToken}
                  </div>
                  <div className="text-xs text-crypto-silver">
                    {activity.wallet.slice(0, 8)}...{activity.wallet.slice(-6)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {formatCurrency(activity.amountUsd)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Social Pulse */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Social Pulse (24h)</h3>
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="space-y-3">
            {dashboardData.socialPulse.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${item.type === 'BASE' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                      {item.type}
                    </Badge>
                    {item.trending && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        🔥 Trending
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex-1 mx-3">
                  <div className="font-medium text-white text-sm">{item.token}</div>
                  <div className="text-xs text-crypto-silver">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {item.mentions.toLocaleString()}
                  </div>
                  <div className={`text-xs ${
                    item.sentiment === 'positive' ? 'text-green-400' : 
                    item.sentiment === 'negative' ? 'text-red-400' : 'text-crypto-silver'
                  }`}>
                    {item.sentiment}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}