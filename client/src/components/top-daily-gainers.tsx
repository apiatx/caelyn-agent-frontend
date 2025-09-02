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
      volume_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      percent_change_30d: number;
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
        // Sort by 24h percent change in descending order
        const sortedGainers = data.sort((a: CoinData, b: CoinData) => 
          b.quote.USD.percent_change_24h - a.quote.USD.percent_change_24h
        );
        setGainers(sortedGainers);
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

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) {
      return `$${(volume / 1e9).toFixed(1)}B`;
    } else if (volume >= 1e6) {
      return `$${(volume / 1e6).toFixed(0)}M`;
    } else {
      return `$${(volume / 1e3).toFixed(0)}K`;
    }
  };

  const formatPercentChange = (change: number) => {
    const isPositive = change > 0;
    const prefix = isPositive ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change > 0 ? 'text-green-400' : 'text-red-400';
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
      
      <div className="space-y-4">
        {gainers.slice(0, 10).map((coin, index) => (
          <div
            key={coin.id}
            className="bg-gradient-to-br from-green-500/10 to-emerald-600/10 border border-green-500/20 rounded-lg p-4 hover:border-green-400/40 transition-all duration-200 cursor-pointer group"
            onClick={() => openCoinPage(coin.symbol)}
            data-testid={`gainer-card-${coin.symbol}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-green-400">#{index + 1}</span>
                <div>
                  <h4 className="font-semibold text-white text-sm">{coin.name}</h4>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-crypto-silver">{coin.symbol}</p>
                    <span className="text-xs text-gray-400">Rank #{coin.cmc_rank}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">{formatPrice(coin.quote.USD.price)}</div>
                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-green-400 transition-colors ml-auto mt-1" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="text-center">
                <div className="text-crypto-silver mb-1">1h Change</div>
                <div className={`font-medium ${getChangeColor(coin.quote.USD.percent_change_1h)}`}>
                  {formatPercentChange(coin.quote.USD.percent_change_1h)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-crypto-silver mb-1">24h Change</div>
                <div className="flex items-center justify-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="font-medium text-green-400">
                    {formatPercentChange(coin.quote.USD.percent_change_24h)}
                  </span>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-crypto-silver mb-1">7d Change</div>
                <div className={`font-medium ${getChangeColor(coin.quote.USD.percent_change_7d)}`}>
                  {formatPercentChange(coin.quote.USD.percent_change_7d)}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-crypto-silver mb-1">30d Change</div>
                <div className={`font-medium ${getChangeColor(coin.quote.USD.percent_change_30d)}`}>
                  {formatPercentChange(coin.quote.USD.percent_change_30d)}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-600/30 text-xs">
              <div className="text-center">
                <div className="text-crypto-silver mb-1">Market Cap</div>
                <div className="font-medium text-white">{formatMarketCap(coin.quote.USD.market_cap)}</div>
              </div>
              
              <div className="text-center">
                <div className="text-crypto-silver mb-1">24h Volume</div>
                <div className="font-medium text-white">{formatVolume(coin.quote.USD.volume_24h)}</div>
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