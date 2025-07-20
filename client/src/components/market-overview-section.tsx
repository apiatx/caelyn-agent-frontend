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

interface AltSeasonData {
  index_value: number;
  timestamp: string;
  is_alt_season: boolean;
  description: string;
}

interface ETFNetflow {
  symbol: string;
  name: string;
  net_flow_24h: number;
  net_flow_7d: number;
  net_flow_30d: number;
  aum: number;
  price: number;
  percent_change_24h: number;
}

interface MarketOverview {
  globalMetrics: GlobalMetrics;
  altSeasonIndex: AltSeasonData;
  etfNetflows: ETFNetflow[];
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

  const formatNetflow = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e9) {
      return `${value >= 0 ? '+' : '-'}$${(absValue / 1e9).toFixed(1)}B`;
    } else if (absValue >= 1e6) {
      return `${value >= 0 ? '+' : '-'}$${(absValue / 1e6).toFixed(1)}M`;
    }
    return `${value >= 0 ? '+' : ''}$${value.toFixed(1)}M`;
  };

  const getPercentageColor = (value: number) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getAltSeasonColor = (value: number) => {
    if (value > 75) return 'text-green-400';
    if (value > 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getAltSeasonBgColor = (value: number) => {
    if (value > 75) return 'from-green-500/10 to-emerald-500/10 border-green-500/20';
    if (value > 25) return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20';
    return 'from-red-500/10 to-rose-500/10 border-red-500/20';
  };

  const openAltSeasonChart = () => {
    window.open('https://coinmarketcap.com/charts/altcoin-season-index/', '_blank');
  };

  const openETFPage = () => {
    window.open('https://coinmarketcap.com/etf/', '_blank');
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

  const { globalMetrics, altSeasonIndex, etfNetflows } = overview;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alt Season Index */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Alt Season Index
            <button
              onClick={openAltSeasonChart}
              className="ml-auto text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View Chart →
            </button>
          </h3>
          
          <div className={`bg-gradient-to-r ${getAltSeasonBgColor(altSeasonIndex.index_value)} rounded-lg p-6 mb-4`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {altSeasonIndex.index_value.toFixed(0)}
                </p>
                <p className={`text-sm font-medium ${getAltSeasonColor(altSeasonIndex.index_value)}`}>
                  {altSeasonIndex.description}
                </p>
              </div>
              <div className="text-right">
                <div className={`w-16 h-16 rounded-full border-4 ${
                  altSeasonIndex.is_alt_season ? 'border-green-400' : altSeasonIndex.index_value > 25 ? 'border-yellow-400' : 'border-red-400'
                } flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${getAltSeasonColor(altSeasonIndex.index_value)}`}>
                    {altSeasonIndex.is_alt_season ? 'ALT' : altSeasonIndex.index_value > 25 ? 'MIX' : 'BTC'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-300">
              <p>• 75+ = Alt Season (altcoins outperforming Bitcoin)</p>
              <p>• 25-75 = Mixed market conditions</p>
              <p>• &lt;25 = Bitcoin Season (Bitcoin dominance)</p>
            </div>
          </div>
        </div>

        {/* ETF Netflows */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            ETF Net Flows
            <button
              onClick={openETFPage}
              className="ml-auto text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              View All ETFs →
            </button>
          </h3>
          
          <div className="space-y-3">
            {etfNetflows.map((etf, index) => (
              <div key={etf.symbol} className="bg-black/20 border border-crypto-silver/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white text-sm sm:text-base">{etf.symbol}</h4>
                    <p className="text-xs text-gray-400 truncate">{etf.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white text-sm">{formatCurrency(etf.aum)}</p>
                    <p className="text-xs text-gray-400">AUM</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs mb-1">24h Flow</p>
                    <p className={`font-medium ${getPercentageColor(etf.net_flow_24h)}`}>
                      {formatNetflow(etf.net_flow_24h)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs mb-1">7d Flow</p>
                    <p className={`font-medium ${getPercentageColor(etf.net_flow_7d)}`}>
                      {formatNetflow(etf.net_flow_7d)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-xs mb-1">30d Flow</p>
                    <p className={`font-medium ${getPercentageColor(etf.net_flow_30d)}`}>
                      {formatNetflow(etf.net_flow_30d)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}