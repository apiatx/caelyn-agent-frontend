import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Globe, 
  Activity,
  Bitcoin,
  LineChart,
  PieChart
} from 'lucide-react';

interface GlobalMetrics {
  active_cryptocurrencies: number;
  total_cryptocurrencies: number;
  active_market_pairs: number;
  active_exchanges: number;
  total_exchanges: number;
  eth_dominance: number;
  btc_dominance: number;
  quote: {
    USD: {
      total_market_cap: number;
      total_volume_24h: number;
      total_volume_24h_reported: number;
      altcoin_volume_24h: number;
      altcoin_market_cap: number;
      defi_volume_24h: number;
      defi_market_cap: number;
      defi_24h_percentage_change: number;
      stablecoin_volume_24h: number;
      stablecoin_market_cap: number;
      derivatives_volume_24h: number;
      total_market_cap_yesterday: number;
      total_volume_24h_yesterday: number;
      total_market_cap_yesterday_percentage_change: number;
      total_volume_24h_yesterday_percentage_change: number;
    };
  };
}

interface TrendingCrypto {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
      volume_24h: number;
    };
  };
}

interface MarketOverview {
  globalMetrics: GlobalMetrics;
  trending: TrendingCrypto[];
}

export function MarketOverviewSection() {
  const { data: overview, isLoading, error } = useQuery<MarketOverview>({
    queryKey: ['/api/coinmarketcap/market-overview'],
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 240000 // 4 minutes
  });

  const formatCurrency = (value: number) => {
    if (value >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number) => {
    const formatted = value.toFixed(2);
    return value >= 0 ? `+${formatted}%` : `${formatted}%`;
  };

  const getPercentageColor = (value: number) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const openCoinMarketCap = (slug: string) => {
    window.open(`https://coinmarketcap.com/currencies/${slug}/`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Market Overview</h2>
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-black/30 border border-crypto-silver/20 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-600 rounded mb-2"></div>
              <div className="h-6 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-red-400" />
          <h2 className="text-xl font-bold text-white">Market Overview</h2>
        </div>
        <div className="text-center text-gray-400">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Unable to load market data</p>
          <p className="text-sm">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  const { globalMetrics, trending } = overview;
  const usd = globalMetrics.quote.USD;

  return (
    <div className="bg-black/20 border border-crypto-silver/20 rounded-lg p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-6">
        <Globe className="w-5 h-5 text-blue-400" />
        <h2 className="text-xl font-bold text-white">Global Crypto Market Overview</h2>
        <div className="ml-auto text-xs text-gray-400">Live Data</div>
      </div>

      {/* Global Market Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 font-semibold text-xs sm:text-sm">Total Market Cap</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white">{formatCurrency(usd.total_market_cap)}</p>
          <p className={`text-xs ${getPercentageColor(usd.total_market_cap_yesterday_percentage_change)}`}>
            {formatPercentage(usd.total_market_cap_yesterday_percentage_change)} 24h
          </p>
        </div>

        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-semibold text-xs sm:text-sm">24h Volume</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white">{formatCurrency(usd.total_volume_24h)}</p>
          <p className={`text-xs ${getPercentageColor(usd.total_volume_24h_yesterday_percentage_change)}`}>
            {formatPercentage(usd.total_volume_24h_yesterday_percentage_change)} 24h
          </p>
        </div>

        <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bitcoin className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-semibold text-xs sm:text-sm">BTC Dominance</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white">{globalMetrics.btc_dominance.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 font-semibold text-xs sm:text-sm">ETH Dominance</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white">{globalMetrics.eth_dominance.toFixed(1)}%</p>
        </div>

        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <LineChart className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-semibold text-xs sm:text-sm">DeFi Market Cap</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white">{formatCurrency(usd.defi_market_cap)}</p>
          <p className={`text-xs ${getPercentageColor(usd.defi_24h_percentage_change)}`}>
            {formatPercentage(usd.defi_24h_percentage_change)} 24h
          </p>
        </div>

        <div className="bg-gradient-to-r from-gray-500/10 to-slate-500/10 border border-gray-500/20 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 font-semibold text-xs sm:text-sm">Active Cryptos</span>
          </div>
          <p className="text-lg sm:text-xl font-bold text-white">{globalMetrics.active_cryptocurrencies.toLocaleString()}</p>
        </div>
      </div>

      {/* Trending Cryptocurrencies */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Top Performing Cryptocurrencies
        </h3>

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
            <div className="grid grid-cols-7 gap-4 p-4 bg-black/30 border-b border-crypto-silver/20">
              <div className="text-gray-400 font-semibold">#</div>
              <div className="text-gray-400 font-semibold col-span-2">Name</div>
              <div className="text-gray-400 font-semibold text-right">Price</div>
              <div className="text-gray-400 font-semibold text-right">24h %</div>
              <div className="text-gray-400 font-semibold text-right">7d %</div>
              <div className="text-gray-400 font-semibold text-right">Market Cap</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {trending.map((crypto) => (
                <div
                  key={crypto.id}
                  className="grid grid-cols-7 gap-4 p-4 border-b border-crypto-silver/10 hover:bg-black/20 transition-colors"
                >
                  <div className="text-gray-300 font-medium">{crypto.cmc_rank}</div>
                  <div className="col-span-2">
                    <div 
                      onClick={() => openCoinMarketCap(crypto.slug)}
                      className="flex items-center gap-2 cursor-pointer hover:text-blue-400 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{crypto.symbol.substring(0, 2)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{crypto.name}</p>
                        <p className="text-sm text-gray-400">{crypto.symbol}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-semibold text-white">
                    {formatCurrency(crypto.quote.USD.price)}
                  </div>
                  <div className={`text-right font-semibold ${getPercentageColor(crypto.quote.USD.percent_change_24h)}`}>
                    {formatPercentage(crypto.quote.USD.percent_change_24h)}
                  </div>
                  <div className={`text-right font-semibold ${getPercentageColor(crypto.quote.USD.percent_change_7d || 0)}`}>
                    {formatPercentage(crypto.quote.USD.percent_change_7d || 0)}
                  </div>
                  <div className="text-right font-semibold text-white">
                    {formatCurrency(crypto.quote.USD.market_cap)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden grid gap-3 max-h-80 overflow-y-auto">
          {trending.map((crypto) => (
            <div
              key={crypto.id}
              className="bg-black/20 border border-crypto-silver/20 rounded-lg p-4 hover:bg-black/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div 
                  onClick={() => openCoinMarketCap(crypto.slug)}
                  className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition-colors"
                >
                  <span className="text-gray-400 font-medium">#{crypto.cmc_rank}</span>
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">{crypto.symbol.substring(0, 2)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{crypto.name}</p>
                    <p className="text-sm text-gray-400">{crypto.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white">{formatCurrency(crypto.quote.USD.price)}</p>
                  <p className={`text-sm font-medium ${getPercentageColor(crypto.quote.USD.percent_change_24h)}`}>
                    {formatPercentage(crypto.quote.USD.percent_change_24h)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">7d Change:</span>
                  <span className={`ml-2 font-medium ${getPercentageColor(crypto.quote.USD.percent_change_7d || 0)}`}>
                    {formatPercentage(crypto.quote.USD.percent_change_7d || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Market Cap:</span>
                  <span className="ml-2 font-medium text-white">{formatCurrency(crypto.quote.USD.market_cap)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}