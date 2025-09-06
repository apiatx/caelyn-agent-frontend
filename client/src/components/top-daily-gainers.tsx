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

  const openCoinPage = (coin: CoinData) => {
    // Convert coin name to CMC URL slug format
    const slug = coin.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    window.open(`https://coinmarketcap.com/currencies/${slug}/`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <div className="mt-6 bg-black/40 backdrop-blur-lg border border-crypto-silver/20 rounded-xl p-6">
        <div className="flex flex-col items-center justify-center space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
          </div>
          <button
            onClick={() => window.open('https://coinmarketcap.com/', '_blank', 'noopener,noreferrer')}
            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors duration-200 flex items-center gap-1"
          >
            CMC Top 100
            <ExternalLink className="w-3 h-3" />
          </button>
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
        <div className="flex flex-col items-center justify-center space-y-2 mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
          </div>
          <button
            onClick={() => window.open('https://coinmarketcap.com/', '_blank', 'noopener,noreferrer')}
            className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors duration-200 flex items-center gap-1"
          >
            CMC Top 100
            <ExternalLink className="w-3 h-3" />
          </button>
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
      <div className="flex flex-col items-center justify-center space-y-2 mb-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Top 10 Daily Gainers</h3>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
            24H
          </Badge>
        </div>
        <button
          onClick={() => window.open('https://coinmarketcap.com/', '_blank', 'noopener,noreferrer')}
          className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors duration-200 flex items-center gap-1"
        >
          CMC Top 100
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      
      <div className="space-y-2">
        {gainers.slice(0, 10).map((coin, index) => (
          <div
            key={coin.id}
            className="bg-gradient-to-r from-green-500/5 to-emerald-600/5 border border-green-500/10 rounded-lg p-3 hover:border-green-400/30 hover:bg-green-500/10 transition-all duration-200 cursor-pointer group"
            onClick={() => openCoinPage(coin)}
            data-testid={`gainer-card-${coin.symbol}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <span className="text-xs font-bold text-green-400 w-6">#{index + 1}</span>
                
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-white text-sm truncate">{coin.name}</h4>
                    <span className="text-xs text-crypto-silver">{coin.symbol}</span>
                    <span className="text-xs text-gray-500">#{coin.cmc_rank}</span>
                  </div>
                </div>
                
                <div className="text-right min-w-[80px]">
                  <div className="text-sm font-medium text-white">{formatPrice(coin.quote.USD.price)}</div>
                </div>
                
                <div className="flex items-center space-x-4 text-xs">
                  <div className="text-center min-w-[60px]">
                    <div className={`font-medium ${getChangeColor(coin.quote.USD.percent_change_1h)}`}>
                      {formatPercentChange(coin.quote.USD.percent_change_1h)}
                    </div>
                    <div className="text-crypto-silver text-[10px]">1h</div>
                  </div>
                  
                  <div className="text-center min-w-[70px]">
                    <div className="flex items-center justify-center space-x-1">
                      <TrendingUp className="w-3 h-3 text-green-400" />
                      <span className="font-medium text-green-400">
                        {formatPercentChange(coin.quote.USD.percent_change_24h)}
                      </span>
                    </div>
                    <div className="text-crypto-silver text-[10px]">24h</div>
                  </div>
                  
                  <div className="text-center min-w-[60px]">
                    <div className={`font-medium ${getChangeColor(coin.quote.USD.percent_change_7d)}`}>
                      {formatPercentChange(coin.quote.USD.percent_change_7d)}
                    </div>
                    <div className="text-crypto-silver text-[10px]">7d</div>
                  </div>
                  
                  <div className="text-center min-w-[60px]">
                    <div className={`font-medium ${getChangeColor(coin.quote.USD.percent_change_30d)}`}>
                      {formatPercentChange(coin.quote.USD.percent_change_30d)}
                    </div>
                    <div className="text-crypto-silver text-[10px]">30d</div>
                  </div>
                  
                  <div className="text-center min-w-[70px]">
                    <div className="font-medium text-white">{formatMarketCap(coin.quote.USD.market_cap)}</div>
                    <div className="text-crypto-silver text-[10px]">MCap</div>
                  </div>
                  
                  <div className="text-center min-w-[70px]">
                    <div className="font-medium text-white">{formatVolume(coin.quote.USD.volume_24h)}</div>
                    <div className="text-crypto-silver text-[10px]">Vol</div>
                  </div>
                </div>
                
                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-green-400 transition-colors ml-2" />
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