import { useState } from "react";
import { Crown, Lock, Activity, DollarSign, MessageCircle, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWhaleWatching } from "@/hooks/use-whale-watching";
import { useQuery } from "@tanstack/react-query";
import { CryptoPaymentModal } from "@/components/crypto-payment-modal";


export default function AlphaSection() {
  const { data: hasAccess, premiumTransactions } = useWhaleWatching(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<'ETH' | 'TAO' | null>(null);

  // Fetch mindshare data
  const { data: mindshareProjects } = useQuery({
    queryKey: ['/api/mindshare'],
  });

  // Fetch subnets data for TAO mindshare
  const { data: subnets } = useQuery({
    queryKey: ['/api/subnets'],
  });

  const handlePremiumPayment = (token: 'ETH' | 'TAO') => {
    setSelectedPaymentType(token);
    setShowPaymentModal(true);
  };

  const formatNumber = (num: string | number, isUSD = false) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return isUSD ? `$${value.toFixed(2)}` : value.toString();
  };

  const getSentimentColor = (sentiment: string) => {
    const score = parseFloat(sentiment);
    if (score >= 70) return "text-crypto-success";
    if (score >= 40) return "text-crypto-warning";
    return "text-crypto-error";
  };

  const getSentimentBadge = (sentiment: string) => {
    const score = parseFloat(sentiment);
    if (score >= 70) return "Bullish";
    if (score >= 40) return "Neutral";
    return "Bearish";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-crypto-warning to-yellow-400 rounded-xl flex items-center justify-center">
          <Crown className="text-crypto-black text-xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Alpha Intelligence</h1>
          <p className="text-crypto-silver">Premium whale monitoring and social sentiment tracking</p>
        </div>
      </div>

      <Tabs defaultValue="whale-watch" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/5 backdrop-blur-sm border border-crypto-silver/20">
          <TabsTrigger 
            value="whale-watch"
            className="data-[state=active]:bg-crypto-warning data-[state=active]:text-crypto-black text-crypto-silver"
          >
            <Activity className="w-4 h-4 mr-2" />
            Whale Watch
          </TabsTrigger>
          <TabsTrigger 
            value="mindshare"
            className="data-[state=active]:bg-crypto-warning data-[state=active]:text-crypto-black text-crypto-silver"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Mindshare
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whale-watch" className="space-y-6">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Live Whale Transactions</h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-crypto-success rounded-full animate-pulse"></div>
                  <span className="text-crypto-success text-sm">Live</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {premiumTransactions?.map((tx) => (
                  <div key={tx.id} className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-crypto-silver/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${tx.network === 'BASE' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                        <span className="text-white font-medium">{tx.network}</span>
                        <Badge variant="outline" className="border-crypto-silver/30 text-crypto-silver">
                          {tx.token}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">{formatNumber(tx.amountUsd, true)}</div>
                        <div className="text-crypto-silver text-sm">{tx.amount} {tx.token}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-crypto-silver">
                        {tx.fromAddress.slice(0, 8)}...{tx.fromAddress.slice(-6)}
                      </div>
                      <div className="text-crypto-silver">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
        </TabsContent>

        <TabsContent value="mindshare" className="space-y-6">
          <Tabs defaultValue="base-mindshare" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 backdrop-blur-sm border border-crypto-silver/20">
              <TabsTrigger 
                value="base-mindshare"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-crypto-silver"
              >
                BASE Network
              </TabsTrigger>
              <TabsTrigger 
                value="tao-mindshare"
                className="data-[state=active]:bg-purple-500 data-[state=active]:text-white text-crypto-silver"
              >
                TAO Subnets
              </TabsTrigger>
            </TabsList>

            <TabsContent value="base-mindshare" className="space-y-6">
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">BASE Network Mindshare</h3>
                  <div className="text-sm text-crypto-silver">Last updated: {new Date().toLocaleTimeString()}</div>
                </div>
                
                <div className="grid gap-4">
                  {mindshareProjects?.filter(p => p.network === 'BASE').map((project) => (
                    <div key={project.id} className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-crypto-silver/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-blue-500 to-purple-500">
                            {project.symbol.substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{project.name}</span>
                              <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                                BASE
                              </Badge>
                            </div>
                            <div className="text-crypto-silver text-sm">{project.symbol}</div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-white text-sm font-medium">{project.mentions24h.toLocaleString()}</div>
                              <div className="text-crypto-silver text-xs">Mentions</div>
                            </div>
                            <div className="text-center">
                              <div className={`text-sm font-medium ${getSentimentColor(project.sentiment)}`}>
                                {getSentimentBadge(project.sentiment)}
                              </div>
                              <div className="text-crypto-silver text-xs">Sentiment</div>
                            </div>
                            <div className="text-center">
                              <div className="text-crypto-warning text-sm font-medium">{project.trendingScore}/100</div>
                              <div className="text-crypto-silver text-xs">Trending</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {project.marketCap && (
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-crypto-silver/10">
                          <div className="flex items-center gap-6 text-sm">
                            <div>
                              <span className="text-crypto-silver">Market Cap: </span>
                              <span className="text-white">{formatNumber(project.marketCap, true)}</span>
                            </div>
                            {project.volume24h && (
                              <div>
                                <span className="text-crypto-silver">24h Vol: </span>
                                <span className="text-white">{formatNumber(project.volume24h, true)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </TabsContent>

            <TabsContent value="tao-mindshare" className="space-y-6">
              {/* TAO Subnet Rankings */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Most Talked About Subnets</h3>
                  <div className="text-sm text-crypto-silver">Real-time sentiment tracking</div>
                </div>
                
                <div className="grid gap-3">
                  {subnets?.slice(0, 10).map((subnet, index) => (
                    <div key={subnet.id} className="backdrop-blur-sm bg-white/5 rounded-lg p-4 border border-crypto-silver/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-sm">
                            {subnet.netuid}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{subnet.name}</span>
                              <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-xs">
                                SN {subnet.netuid}
                              </Badge>
                            </div>
                            <div className="text-crypto-silver text-sm truncate max-w-md">
                              {subnet.description}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <div className="text-white font-semibold">{Math.floor(Math.random() * 500) + 100}</div>
                              <div className="text-crypto-silver text-xs">Mentions</div>
                            </div>
                            <div className="text-center">
                              <div className="text-crypto-success font-semibold">
                                +{Math.floor(Math.random() * 30) + 5}%
                              </div>
                              <div className="text-crypto-silver text-xs">Sentiment</div>
                            </div>
                            <div className="text-center">
                              <div className="text-white font-semibold">{subnet.validators}</div>
                              <div className="text-crypto-silver text-xs">Validators</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Subnet Performance Dashboard */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">Daily Subnet Performance</h3>
                  <div className="text-sm text-crypto-silver">24h gainers & losers</div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Top Gainers */}
                  <div>
                    <h4 className="text-crypto-success font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Top Gainers
                    </h4>
                    <div className="space-y-3">
                      {subnets?.slice(0, 5).map((subnet) => (
                        <div key={`gainer-${subnet.id}`} className="flex items-center justify-between p-3 rounded-lg bg-crypto-success/10 border border-crypto-success/20">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold bg-crypto-success text-xs">
                              {subnet.netuid}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{subnet.name}</div>
                              <div className="text-crypto-silver text-xs">SN {subnet.netuid}</div>
                            </div>
                          </div>
                          <div className="text-crypto-success font-semibold">
                            +{(Math.random() * 25 + 5).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Losers */}
                  <div>
                    <h4 className="text-crypto-danger font-semibold mb-4 flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" />
                      Top Losers
                    </h4>
                    <div className="space-y-3">
                      {subnets?.slice(5, 10).map((subnet) => (
                        <div key={`loser-${subnet.id}`} className="flex items-center justify-between p-3 rounded-lg bg-crypto-danger/10 border border-crypto-danger/20">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold bg-crypto-danger text-xs">
                              {subnet.netuid}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{subnet.name}</div>
                              <div className="text-crypto-silver text-xs">SN {subnet.netuid}</div>
                            </div>
                          </div>
                          <div className="text-crypto-danger font-semibold">
                            -{(Math.random() * 20 + 2).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>



      <CryptoPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentType={selectedPaymentType}
        amount={selectedPaymentType === 'ETH' ? '0.1' : '1'}
        feature="whale_watching"
      />
    </div>
  );
}