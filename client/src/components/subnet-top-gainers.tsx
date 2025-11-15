import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface SubnetGainer {
  netuid: number;
  name: string;
  price_change_24h?: number;
  emission?: number;
  price?: number;
}

export default function SubnetTopGainers() {
  const { data: gainers, isLoading } = useQuery<SubnetGainer[]>({
    queryKey: ["/api/taostats/top-gainers"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {[...Array(10)].map((_, i) => (
          <Card key={i} className="p-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/20 animate-pulse">
            <div className="h-20 bg-white/10 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!gainers || gainers.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          Top 10 Gainer Subnets (24h)
        </h2>
        <p className="text-sm text-gray-400 mt-2">Highest performing subnets in the last 24 hours</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gainers.slice(0, 10).map((subnet, index) => {
          const isPositive = (subnet.price_change_24h || 0) > 0;
          const changePercent = subnet.price_change_24h?.toFixed(2) || '0.00';
          
          return (
            <Card
              key={subnet.netuid}
              className="group relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 border border-white/20 hover:border-emerald-500/50 transition-all duration-300 hover:scale-[1.02] p-4"
              data-testid={`subnet-gainer-${subnet.netuid}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                    <span className="text-lg font-bold text-emerald-400">#{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{subnet.name || `Subnet ${subnet.netuid}`}</h3>
                    <p className="text-xs text-gray-400">NetUID: {subnet.netuid}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`flex items-center gap-1 text-lg font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {changePercent}%
                  </div>
                  {subnet.emission !== undefined && (
                    <p className="text-xs text-gray-400 mt-1">
                      Emission: {subnet.emission.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>

              {subnet.price !== undefined && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-gray-300">
                    Price: <span className="text-white font-semibold">${subnet.price.toFixed(4)}</span>
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
