import { RefreshCw, ExternalLink, TrendingUp, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { useMarketResearch } from "@/hooks/use-market-research";
import { Skeleton } from "@/components/ui/skeleton";

export default function MarketResearchSection() {
  const { insights, signals, isLoading } = useMarketResearch();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Market Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">Market Sentiment Analysis</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10">
                <div>
                  <h3 className="font-medium text-white">
                    <a 
                      href="https://dexscreener.com/base"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition-colors"
                    >
                      BASE Network
                    </a>
                  </h3>
                  <p className="text-sm text-crypto-silver">
                    <a 
                      href="https://x.com/search?q=%23base%20%23basechain"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition-colors"
                    >
                      Strong institutional adoption signals
                    </a>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-crypto-success text-lg font-semibold">Bullish</div>
                  <div className="text-crypto-silver text-sm">87% confidence</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10">
                <div>
                  <h3 className="font-medium text-white">
                    <a 
                      href="https://x.com/search?q=%23bittensor%20%23tao"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-400 transition-colors"
                    >
                      Bittensor TAO
                    </a>
                  </h3>
                  <p className="text-sm text-crypto-silver">
                    <a 
                      href="https://x.com/search?q=%23AI%20%23bittensor"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-orange-400 transition-colors"
                    >
                      AI narrative gaining momentum
                    </a>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-crypto-success text-lg font-semibold">Very Bullish</div>
                  <div className="text-crypto-silver text-sm">94% confidence</div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
        
        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Trade Signals</h2>
          
          <div className="space-y-3">
            {signals?.map((signal) => (
              <div 
                key={signal.id}
                className={`p-3 backdrop-blur-sm rounded-xl border ${
                  signal.type === 'buy' 
                    ? 'bg-crypto-success/10 border-crypto-success/20' 
                    : signal.type === 'sell'
                    ? 'bg-crypto-danger/10 border-crypto-danger/20'
                    : 'bg-crypto-warning/10 border-crypto-warning/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${
                    signal.type === 'buy' 
                      ? 'text-crypto-success' 
                      : signal.type === 'sell'
                      ? 'text-crypto-danger'
                      : 'text-crypto-warning'
                  }`}>
                    {signal.type.toUpperCase()} Signal
                  </span>
                  <span className="text-xs text-crypto-silver">
                    {new Date(signal.createdAt || '').toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-white">{signal.description}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Research Insights */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Research Insights</h2>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights?.map((insight) => (
            <article 
              key={insight.id}
              className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-white text-sm">{insight.title}</h3>
                <span className="text-xs text-crypto-silver whitespace-nowrap ml-2">
                  {new Date(insight.publishedAt || '').toLocaleTimeString()}
                </span>
              </div>
              <p className="text-crypto-silver text-xs mb-3">{insight.content}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${
                  insight.sentiment === 'bullish' 
                    ? 'text-crypto-success' 
                    : insight.sentiment === 'bearish'
                    ? 'text-crypto-danger'
                    : 'text-crypto-warning'
                }`}>
                  {insight.sentiment === 'bullish' ? 'Bullish Impact' : 
                   insight.sentiment === 'bearish' ? 'Bearish Impact' : 'Neutral Impact'}
                </span>
                <Button variant="ghost" size="sm">
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      </GlassCard>

      {/* Portfolio Optimization Suggestions */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Portfolio Optimization</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="backdrop-blur-sm bg-crypto-success/5 rounded-xl border border-crypto-success/20 p-4">
            <div className="flex items-center mb-3">
              <TrendingUp className="text-crypto-success mr-2 h-4 w-4" />
              <h3 className="font-medium text-white">Rebalancing Suggestion</h3>
            </div>
            <p className="text-crypto-silver text-sm mb-3">
              Consider increasing TAO allocation by 15% based on current subnet performance metrics
            </p>
            <Button variant="ghost" size="sm" className="text-crypto-success hover:text-white">
              View Details →
            </Button>
          </div>
          
          <div className="backdrop-blur-sm bg-crypto-warning/5 rounded-xl border border-crypto-warning/20 p-4">
            <div className="flex items-center mb-3">
              <AlertTriangle className="text-crypto-warning mr-2 h-4 w-4" />
              <h3 className="font-medium text-white">Risk Alert</h3>
            </div>
            <p className="text-crypto-silver text-sm mb-3">
              BASE network exposure at 37% - consider diversification to reduce concentration risk
            </p>
            <Button variant="ghost" size="sm" className="text-crypto-warning hover:text-white">
              View Recommendations →
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
