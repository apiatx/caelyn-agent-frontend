import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface CoinData {
  id: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      percent_change_24h: number;
      market_cap: number;
    };
  };
}

const TopDailyGainers = () => {
  const [gainers, setGainers] = useState<CoinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGainers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/coinmarketcap/daily-gainers');
        
        if (!response.ok) {
          throw new Error('Failed to fetch daily gainers');
        }
        
        const data = await response.json();
        setGainers(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching daily gainers:', err);
        setError('Failed to load daily gainers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGainers();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchGainers, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1) {
      return `$${price.toFixed(4)}`;
    } else if (price < 100) {
      return `$${price.toFixed(2)}`;
    } else {
      return `$${price.toFixed(0)}`;
    }
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(0)}M`;
    } else {
      return `$${(marketCap / 1e3).toFixed(0)}K`;
    }
  };

  const openCoinPage = (symbol: string) => {
    window.open(`https://coinmarketcap.com/currencies/${symbol.toLowerCase()}/`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="mt-6 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
          <span className="ml-3 text-crypto-silver">Loading gainers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
        </div>
        <div className="text-center py-8">
          <TrendingDown className="w-12 h-12 text-red-400 mx-auto mb-2" />
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-6" data-testid="top-daily-gainers">
      <div className="flex items-center justify-center space-x-2 mb-6">
        <TrendingUp className="w-5 h-5 text-green-400" />
        <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
          24H
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {gainers.slice(0, 10).map((coin, index) => (
          <div
            key={coin.id}
            className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-lg p-4 hover:border-green-400/40 transition-all duration-200 cursor-pointer group"
            onClick={() => openCoinPage(coin.symbol)}
            data-testid={`gainer-card-${coin.symbol}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-green-400">#{index + 1}</span>
                <span className="text-xs text-gray-400">#{coin.cmc_rank}</span>
              </div>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-green-400 transition-colors" />
            </div>
            
            <div className="mb-2">
              <h4 className="font-semibold text-white text-sm truncate">{coin.name}</h4>
              <p className="text-xs text-crypto-silver">{coin.symbol}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-crypto-silver">Price:</span>
                <span className="text-xs font-medium text-white">{formatPrice(coin.quote.USD.price)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-crypto-silver">24h:</span>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs font-bold text-green-400">
                    +{coin.quote.USD.percent_change_24h.toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-crypto-silver">MCap:</span>
                <span className="text-xs text-white">{formatMarketCap(coin.quote.USD.market_cap)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-crypto-silver">
          Data updates every 5 minutes • Click any coin to view on CoinMarketCap
        </p>
      </div>
    </div>
  );
};

export default TopDailyGainers;