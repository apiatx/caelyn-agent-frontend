import { useState } from "react";
import { Wallet, ExternalLink, TrendingUp } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Skeleton } from "@/components/ui/skeleton";
import { HoldingDetailModal } from "@/components/holding-detail-modal";
import { useQuery } from "@tanstack/react-query";
import type { Holding, Subnet } from "@shared/schema";

export default function PortfolioSection() {
  const { data: portfolio, isLoading } = usePortfolio(1);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  
  const { data: subnets } = useQuery<Subnet[]>({
    queryKey: ["/api/subnets"],
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="text-center py-12">
        <p className="text-crypto-silver">No portfolio data available</p>
      </div>
    );
  }

  const baseHoldings = portfolio.holdings?.filter(h => h.network === "BASE") || [];
  const taoHoldings = portfolio.holdings?.filter(h => h.network === "TAO") || [];

  return (
    <div className="space-y-8">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">Total Balance</h3>
            <Wallet className="text-crypto-silver h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-white mb-2">${portfolio.totalBalance}</div>
          <div className="flex items-center text-sm">
            <span className="text-crypto-success">+$5,234.21</span>
            <span className="text-crypto-silver ml-2">(+4.27%)</span>
          </div>
        </GlassCard>

        <GlassCard className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">24h PnL</h3>
            <TrendingUp className="text-crypto-success h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-crypto-success mb-2">+${portfolio.pnl24h}</div>
          <div className="flex items-center text-sm">
            <span className="text-crypto-success">+1.47%</span>
            <span className="text-crypto-silver ml-2">vs yesterday</span>
          </div>
        </GlassCard>

        <GlassCard 
          className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => {
            const baseHolding = baseHoldings[0];
            if (baseHolding) setSelectedHolding(baseHolding);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">BASE Holdings</h3>
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs font-bold">B</div>
          </div>
          <div className="text-2xl font-bold text-white mb-2">${portfolio.baseHoldings}</div>
          <div className="flex items-center text-sm">
            <span className="text-crypto-success">+$2,156.34</span>
            <span className="text-crypto-silver ml-2">(+4.78%)</span>
          </div>
        </GlassCard>

        <GlassCard 
          className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer hover:scale-105"
          onClick={() => {
            const taoHolding = taoHoldings[0];
            if (taoHolding) setSelectedHolding(taoHolding);
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-crypto-silver text-sm font-medium">TAO Holdings</h3>
            <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold">Τ</div>
          </div>
          <div className="text-2xl font-bold text-white mb-2">${portfolio.taoHoldings}</div>
          <div className="flex items-center text-sm">
            <span className="text-crypto-success">+$3,077.87</span>
            <span className="text-crypto-silver ml-2">(+3.97%)</span>
          </div>
        </GlassCard>
      </div>

      {/* Holdings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BASE Network Holdings */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">B</div>
              BASE Network Holdings
            </h2>
            <button className="text-crypto-silver hover:text-white transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {baseHoldings.map((holding) => (
              <div 
                key={holding.id} 
                className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-105"
                onClick={() => setSelectedHolding(holding)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-600 rounded-full mr-3 flex items-center justify-center text-sm font-bold">
                      {holding.symbol}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{holding.symbol}</h3>
                      <p className="text-sm text-crypto-silver">{holding.amount} {holding.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${(parseFloat(holding.amount) * parseFloat(holding.currentPrice)).toFixed(2)}
                    </div>
                    <div className={`text-sm ${parseFloat(holding.pnl) >= 0 ? 'text-crypto-success' : 'text-crypto-danger'}`}>
                      {parseFloat(holding.pnl) >= 0 ? '+' : ''}${holding.pnl}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-crypto-silver">
                  <span>Entry: ${holding.entryPrice}</span>
                  <span>Current: ${holding.currentPrice}</span>
                  <span className={parseFloat(holding.pnlPercentage) >= 0 ? 'text-crypto-success' : 'text-crypto-danger'}>
                    {parseFloat(holding.pnlPercentage) >= 0 ? '+' : ''}{holding.pnlPercentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* TAO Network Holdings */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">Τ</div>
              Bittensor Holdings
            </h2>
            <button className="text-crypto-silver hover:text-white transition-colors">
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {taoHoldings.map((holding) => (
              <div 
                key={holding.id} 
                className="backdrop-blur-sm bg-white/5 rounded-xl border border-crypto-silver/10 p-4 hover:bg-white/10 transition-all duration-200 cursor-pointer hover:scale-105"
                onClick={() => setSelectedHolding(holding)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mr-3 flex items-center justify-center text-sm font-bold">
                      {holding.symbol}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{holding.symbol}</h3>
                      <p className="text-sm text-crypto-silver">{holding.amount} {holding.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${(parseFloat(holding.amount) * parseFloat(holding.currentPrice)).toFixed(2)}
                    </div>
                    <div className={`text-sm ${parseFloat(holding.pnl) >= 0 ? 'text-crypto-success' : 'text-crypto-danger'}`}>
                      {parseFloat(holding.pnl) >= 0 ? '+' : ''}${holding.pnl}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-crypto-silver mb-3">
                  <span>Entry: ${holding.entryPrice}</span>
                  <span>Current: ${holding.currentPrice}</span>
                  <span className={parseFloat(holding.pnlPercentage) >= 0 ? 'text-crypto-success' : 'text-crypto-danger'}>
                    {parseFloat(holding.pnlPercentage) >= 0 ? '+' : ''}{holding.pnlPercentage}%
                  </span>
                </div>
                
                {/* Subnet Breakdown for TAO */}
                <div className="border-t border-crypto-silver/10 pt-3 mt-3">
                  <h4 className="text-sm font-medium text-crypto-silver mb-2">Subnet Positions</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-crypto-silver">Subnet 1 (Prompting)</span>
                      <div className="text-right">
                        <div className="text-white">34.2 TAO</div>
                        <div className="text-crypto-success">+2.34%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-crypto-silver">Subnet 18 (Cortex.t)</span>
                      <div className="text-right">
                        <div className="text-white">28.9 TAO</div>
                        <div className="text-crypto-success">+5.67%</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-crypto-silver">Subnet 27 (Compute)</span>
                      <div className="text-right">
                        <div className="text-white">82.6 TAO</div>
                        <div className="text-crypto-success">+3.12%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Subnet Analytics Table */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Subnet Analytics</h2>
          <div className="text-sm text-crypto-silver">Data from taostats.io</div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 text-crypto-silver text-sm font-medium">Subnet</th>
                <th className="text-left py-3 text-crypto-silver text-sm font-medium">NetUID</th>
                <th className="text-left py-3 text-crypto-silver text-sm font-medium">Validators</th>
                <th className="text-left py-3 text-crypto-silver text-sm font-medium">Stake Weight</th>
                <th className="text-left py-3 text-crypto-silver text-sm font-medium">Emissions</th>
                <th className="text-left py-3 text-crypto-silver text-sm font-medium">24h PnL</th>
                <th className="text-left py-3 text-crypto-silver text-sm font-medium">Market Cap</th>
              </tr>
            </thead>
            <tbody>
              {subnets?.map((subnet) => (
                <tr key={subnet.id} className="border-b border-crypto-silver/10 hover:bg-white/5 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full mr-3 flex items-center justify-center text-xs font-bold ${
                        subnet.netuid === 1 ? 'bg-gradient-to-r from-blue-500 to-purple-500' :
                        subnet.netuid === 18 ? 'bg-gradient-to-r from-green-500 to-blue-500' :
                        'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}>
                        {subnet.netuid}
                      </div>
                      <div>
                        <div className="text-white font-medium">{subnet.name}</div>
                        <div className="text-crypto-silver text-sm">{subnet.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-white">{subnet.netuid}</td>
                  <td className="py-4 text-white">
                    {subnet.netuid === 1 ? '64' : subnet.netuid === 18 ? '42' : '58'}
                  </td>
                  <td className="py-4 text-white">{subnet.stakeWeight}</td>
                  <td className="py-4 text-crypto-success">+{subnet.emissions} TAO</td>
                  <td className="py-4 text-crypto-success">+{subnet.pnl24h}%</td>
                  <td className="py-4 text-crypto-silver">
                    {subnet.netuid === 1 ? '12.4M' : subnet.netuid === 18 ? '8.7M' : '15.2M'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Holding Detail Modal */}
      <HoldingDetailModal 
        holding={selectedHolding}
        subnets={subnets}
        onClose={() => setSelectedHolding(null)}
      />
    </div>
  );
}
