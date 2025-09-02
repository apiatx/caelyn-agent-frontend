import { useQuery } from '@tanstack/react-query';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { openSecureLink } from '@/utils/security';

interface TopGainerAllCoin {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      percent_change_24h: number;
      market_cap: number;
    };
  };
}

export function TopDailyGainersAll() {
  const { data: gainers = [], isLoading, error } = useQuery<TopGainerAllCoin[]>({
    queryKey: ['/api/coinmarketcap/daily-gainers-all'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  if (error) {
    return (
      <div className="mt-6 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-6" data-testid="top-daily-gainers-all-error">
        <div className="flex flex-col items-center justify-center space-y-2 mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
              24H
            </Badge>
          </div>
          <p className="text-sm text-crypto-silver">All Coins</p>
        </div>
        <div className="text-center text-crypto-silver">
          <p>Unable to load data at this time</p>
          <p className="text-xs mt-1">Please try again in a few moments</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-6 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-6" data-testid="top-daily-gainers-all-loading">
        <div className="flex flex-col items-center justify-center space-y-2 mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
          </div>
          <p className="text-sm text-crypto-silver">All Coins</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
          <span className="ml-3 text-crypto-silver">Loading gainers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-6" data-testid="top-daily-gainers-all">
      <div className="flex flex-col items-center justify-center space-y-2 mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            24H
          </Badge>
        </div>
        <p className="text-sm text-crypto-silver">All Coins</p>
      </div>
      
      <div className="space-y-2">
        {gainers.slice(0, 10).map((coin, index) => (
          <div
            key={coin.id}
            className="flex items-center justify-between p-3 bg-crypto-dark/30 rounded-lg border border-crypto-silver/10 hover:border-green-500/30 transition-all duration-200 cursor-pointer group"
            onClick={() => openSecureLink(`https://coinmarketcap.com/currencies/${coin.slug}/`)}
            data-testid={`gainer-all-coin-${coin.symbol.toLowerCase()}`}
          >
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-6 text-center">
                <span className="text-xs font-medium text-crypto-silver">#{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white text-sm truncate">{coin.name}</span>
                  <span className="text-crypto-silver text-xs">#{coin.cmc_rank}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-crypto-silver text-xs">{coin.symbol}</span>
                  <span className="text-crypto-silver text-xs">
                    ${coin.quote.USD.price.toLocaleString('en-US', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 6 
                    })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-green-400 font-semibold text-sm">
                  +{coin.quote.USD.percent_change_24h.toFixed(2)}%
                </div>
                <div className="text-crypto-silver text-xs">
                  {coin.quote.USD.market_cap ? 
                    `$${(coin.quote.USD.market_cap / 1e6).toFixed(1)}M` : 
                    'N/A'
                  }
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-crypto-silver group-hover:text-green-400 transition-colors" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-crypto-silver/10 text-center">
        <p className="text-xs text-crypto-silver">
          Data updates every 5 minutes • Source: CoinMarketCap
        </p>
      </div>
    </div>
  );
}