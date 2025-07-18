import { useState } from "react";
import { TrendingUp, MessageCircle, BarChart3, Filter } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

export default function AlphaSection() {

  // Fetch comprehensive mindshare data with X.com and swordscan integration
  const { data: mindshareProjects } = useQuery({
    queryKey: ['/api/mindshare/comprehensive'],
    refetchInterval: 30000, // Refresh every 30 seconds for real-time sentiment
  });

  // Fetch subnets data for TAO mindshare
  const { data: subnets } = useQuery({
    queryKey: ['/api/subnets'],
  });

  const formatNumber = (num: string | number | undefined, isUSD = false) => {
    if (num === undefined || num === null) return isUSD ? '$0.00' : '0';
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value)) return isUSD ? '$0.00' : '0';
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return isUSD ? `$${value.toFixed(2)}` : value.toString();
  };

  const getSentimentColor = (sentiment: string | number | undefined) => {
    if (!sentiment) return "text-crypto-silver";
    const score = typeof sentiment === 'string' ? parseFloat(sentiment) : sentiment;
    if (isNaN(score)) return "text-crypto-silver";
    if (score >= 70) return "text-crypto-success";
    if (score >= 40) return "text-crypto-warning";
    return "text-crypto-error";
  };

  const getSentimentBadge = (sentiment: string | number | undefined) => {
    if (!sentiment) return "N/A";
    const score = typeof sentiment === 'string' ? parseFloat(sentiment) : sentiment;
    if (isNaN(score)) return "N/A";
    if (score >= 70) return "Bullish";
    if (score >= 40) return "Neutral";
    return "Bearish";
  };

  // Get all mindshare data
  const allMindshareData = mindshareProjects || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-crypto-warning to-yellow-400 rounded-xl flex items-center justify-center">
            <TrendingUp className="text-crypto-black text-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Alpha Intelligence</h1>
            <p className="text-crypto-silver">Market sentiment and social intelligence analysis</p>
          </div>
        </div>
        

      </div>

      <Tabs defaultValue="top-mentioned" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 backdrop-blur-sm border border-crypto-silver/20">
          <TabsTrigger 
            value="top-mentioned"
            className="data-[state=active]:bg-crypto-warning data-[state=active]:text-crypto-black text-crypto-silver"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Top Mentioned
          </TabsTrigger>
          <TabsTrigger 
            value="base-social"
            className="data-[state=active]:bg-crypto-warning data-[state=active]:text-crypto-black text-crypto-silver"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            BASE Social Intelligence
          </TabsTrigger>
          <TabsTrigger 
            value="tao-social"
            className="data-[state=active]:bg-crypto-warning data-[state=active]:text-crypto-black text-crypto-silver"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            TAO Social Intelligence
          </TabsTrigger>
        </TabsList>

        {/* Top Mentioned Tokens/Subnets Chart */}
        <TabsContent value="top-mentioned" className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Top Mentioned Tokens & Subnets</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-crypto-success rounded-full animate-pulse"></div>
                <span className="text-crypto-success text-sm">Live Social Data</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allMindshareData?.slice(0, 10).map((project: any, index: number) => (
                <div key={project.id} className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-crypto-silver/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold text-crypto-warning">#{index + 1}</div>
                      <div className={`w-3 h-3 rounded-full ${project.network === 'BASE' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                      <div>
                        <div className="text-white font-semibold">{project.name}</div>
                        <div className="text-crypto-silver text-sm">{project.ticker}</div>
                      </div>
                    </div>
                    {project.trending && (
                      <Badge className="bg-crypto-warning/20 text-crypto-warning border-crypto-warning/30">
                        🔥 Trending
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <div className="text-white font-semibold">{formatNumber(project.mentions)}</div>
                      <div className="text-crypto-silver text-xs">Mentions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-white font-semibold">{project.socialScore}%</div>
                      <div className="text-crypto-silver text-xs">Social Score</div>
                    </div>
                    <div className="text-center">
                      <div className={`font-semibold ${getSentimentColor(project.sentiment)}`}>
                        {getSentimentBadge(project.sentiment)}
                      </div>
                      <div className="text-crypto-silver text-xs">Sentiment</div>
                    </div>
                  </div>
                  
                  {project.marketCap && (
                    <div className="flex justify-between text-sm">
                      <span className="text-crypto-silver">Market Cap:</span>
                      <span className="text-white">{formatNumber(project.marketCap, true)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        {/* BASE Network Social Intelligence */}
        <TabsContent value="base-social" className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">BASE Network Social Intelligence</h3>
              <div className="text-sm text-crypto-silver">X.com • Live social feed</div>
            </div>
            
            <div className="grid gap-4">
              {mindshareProjects?.filter(p => p.network === 'BASE').map((project) => (
                <div key={project.id} className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-crypto-silver/10 hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-blue-500 to-purple-500">
                        {project.symbol?.substring(0, 2) || project.ticker?.substring(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://dexscreener.com/base/${project.ticker}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white font-medium hover:text-blue-400 transition-colors"
                          >
                            {project.name}
                          </a>
                          <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                            {project.ticker}
                          </Badge>
                          {project.trending && (
                            <Badge variant="outline" className="border-crypto-warning/30 text-crypto-warning">
                              🔥 Trending
                            </Badge>
                          )}
                        </div>
                        <div className="text-crypto-silver text-sm flex items-center gap-4">
                          <a 
                            href={`https://x.com/search?q=$${project.ticker}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-400 transition-colors"
                          >
                            X: {formatNumber(project.mentions || 0)} mentions
                          </a>
                          <span>•</span>
                          <span>Mindshare: {project.trendingScore || 0}/100</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-sm font-medium ${getSentimentColor(project.sentiment)}`}>
                          {project.sentiment || 0}%
                        </div>
                        <div className="text-crypto-silver text-xs">Sentiment</div>
                      </div>
                      <div className="text-center">
                        <div className="text-crypto-warning text-sm font-medium">{project.socialScore || 0}/100</div>
                        <div className="text-crypto-silver text-xs">Social Score</div>
                      </div>
                    </div>
                  </div>
                  
                  {project.marketCap && (
                    <div className="flex justify-between text-sm pt-2 border-t border-crypto-silver/10">
                      <span className="text-crypto-silver">Market Cap:</span>
                      <span className="text-white">{formatNumber(project.marketCap, true)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>

        {/* TAO Network Social Intelligence */}
        <TabsContent value="tao-social" className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">TAO Subnet Social Intelligence</h3>
              <div className="text-sm text-crypto-silver">X.com + TensorPulse + Swordscan • Live subnet tracking</div>
            </div>
            
            <div className="grid gap-4">
              {subnets?.slice(0, 10).map((subnet) => (
                <div key={subnet.id} className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-crypto-silver/10 hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-purple-500 to-pink-500">
                        τ{subnet.netuid}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <a 
                            href={`https://x.com/search?q=%23SN${subnet.netuid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white font-medium hover:text-orange-400 transition-colors"
                          >
                            {subnet.name}
                          </a>
                          <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                            SN{subnet.netuid}
                          </Badge>
                          {subnet.netuid <= 5 && (
                            <Badge variant="outline" className="border-crypto-warning/30 text-crypto-warning">
                              🔥 Top Tier
                            </Badge>
                          )}
                        </div>
                        <div className="text-crypto-silver text-sm">{subnet.description}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-purple-400 text-sm font-medium">{typeof subnet.stakeWeight === 'number' ? (subnet.stakeWeight * 100).toFixed(1) : subnet.stakeWeight || '0.0'}%</div>
                        <div className="text-crypto-silver text-xs">Stake Weight</div>
                      </div>
                      <div className="text-center">
                        <div className="text-crypto-success text-sm font-medium">{typeof subnet.emissions === 'number' ? subnet.emissions.toFixed(1) : subnet.emissions || '0.0'}</div>
                        <div className="text-crypto-silver text-xs">Daily τ</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}