import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Globe } from 'lucide-react';
import { GlassCard } from './glass-card';
import { Badge } from '@/components/ui/badge';

interface CoinMarketCapCrypto {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      volume_24h: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
    };
  };
}

export function CoinMarketCapTop100() {
  const { data: cryptos, isLoading, error, refetch } = useQuery<CoinMarketCapCrypto[]>({
    queryKey: ['/api/coinmarketcap/top100'],
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 240000 // 4 minutes
  });

  const formatPrice = (price: number) => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price < 100) return `$${price.toFixed(2)}`;
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(2)}K`;
    return `$${volume.toLocaleString()}`;
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getPercentageColor = (percentage: number) => {
    return percentage >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const openCoinMarketCap = (slug: string) => {
    window.open(`https://coinmarketcap.com/currencies/${slug}/`, '_blank');
  };

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-2xl font-semibold text-white">Top 100 Cryptocurrencies</h3>
        <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border-yellow-500/30">
          COINMARKETCAP
        </Badge>
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          5MIN REFRESH
        </Badge>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          <span className="ml-3 text-gray-300">Loading market data from CoinMarketCap...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-red-400">Failed to fetch cryptocurrency data. Please try again.</p>
        </div>
      )}

      {cryptos && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">Total Market Cap</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatMarketCap(cryptos.reduce((sum, crypto) => sum + crypto.quote.USD.market_cap, 0))}
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 font-semibold">24h Volume</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatVolume(cryptos.reduce((sum, crypto) => sum + crypto.quote.USD.volume_24h, 0))}
              </p>
            </div>

            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-400 font-semibold">Cryptocurrencies</span>
              </div>
              <p className="text-xl font-bold text-white">{cryptos.length}</p>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="bg-black/20 border border-crypto-silver/20 rounded-lg overflow-hidden">
              <div className="grid grid-cols-8 gap-4 p-4 bg-black/30 border-b border-crypto-silver/20">
                <div className="text-gray-400 font-semibold">#</div>
                <div className="text-gray-400 font-semibold col-span-2">Name</div>
                <div className="text-gray-400 font-semibold text-right">Price</div>
                <div className="text-gray-400 font-semibold text-right">1h %</div>
                <div className="text-gray-400 font-semibold text-right">24h %</div>
                <div className="text-gray-400 font-semibold text-right">7d %</div>
                <div className="text-gray-400 font-semibold text-right">Market Cap</div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {cryptos.slice(0, 50).map((crypto) => (
                  <div
                    key={crypto.id}
                    onClick={() => openCoinMarketCap(crypto.slug)}
                    className="grid grid-cols-8 gap-4 p-4 border-b border-crypto-silver/10 hover:bg-black/20 cursor-pointer transition-colors"
                  >
                    <div className="text-gray-300 font-medium">{crypto.cmc_rank}</div>
                    <div className="col-span-2">
                      <div className="flex items-center gap-2">
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
                      {formatPrice(crypto.quote.USD.price)}
                    </div>
                    <div className={`text-right font-semibold ${getPercentageColor(crypto.quote.USD.percent_change_1h)}`}>
                      {formatPercentage(crypto.quote.USD.percent_change_1h)}
                    </div>
                    <div className={`text-right font-semibold ${getPercentageColor(crypto.quote.USD.percent_change_24h)}`}>
                      {formatPercentage(crypto.quote.USD.percent_change_24h)}
                    </div>
                    <div className={`text-right font-semibold ${getPercentageColor(crypto.quote.USD.percent_change_7d)}`}>
                      {formatPercentage(crypto.quote.USD.percent_change_7d)}
                    </div>
                    <div className="text-right font-semibold text-white">
                      {formatMarketCap(crypto.quote.USD.market_cap)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden grid gap-3 max-h-96 overflow-y-auto">
            {cryptos.slice(0, 30).map((crypto) => (
              <div
                key={crypto.id}
                onClick={() => openCoinMarketCap(crypto.slug)}
                className="bg-black/20 border border-crypto-silver/20 rounded-lg p-4 cursor-pointer hover:bg-black/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
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
                    <p className="font-semibold text-white">{formatPrice(crypto.quote.USD.price)}</p>
                    <p className={`text-sm font-semibold ${getPercentageColor(crypto.quote.USD.percent_change_24h)}`}>
                      {formatPercentage(crypto.quote.USD.percent_change_24h)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Market Cap:</span>
                    <p className="text-white font-semibold">{formatMarketCap(crypto.quote.USD.market_cap)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Volume:</span>
                    <p className="text-white font-semibold">{formatVolume(crypto.quote.USD.volume_24h)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-400 border-t border-crypto-silver/20 pt-4">
            Data updates every 5 minutes • Powered by CoinMarketCap API
          </div>
        </div>
      )}
    </GlassCard>
  );
}