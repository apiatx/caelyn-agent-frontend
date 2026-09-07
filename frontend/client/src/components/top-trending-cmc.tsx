import { useState, useEffect } from 'react';
import { ChartCandlestick } from 'lucide-react';
import CryptoDetailModal, { createCryptoDetailRow, type CryptoDetailRow } from './CryptoDetailModal';

interface CoinData {
  id: number;
  name: string;
  symbol: string;
  slug?: string;
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

const TopTrendingCMC = () => {
  const [trendingCoins, setTrendingCoins] = useState<CoinData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<{ row: CryptoDetailRow; slug: string } | null>(null);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/coinmarketcap/trending');
        
        if (!response.ok) {
          throw new Error('Failed to fetch trending coins');
        }
        
        const data = await response.json();
        setTrendingCoins(data.slice(0, 20));
        setError(null);
      } catch (err) {
        console.error('Error fetching trending coins:', err);
        setError('Failed to load trending coins');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchTrending, 5 * 60 * 1000);
    
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

  const formatPercentChange = (change: number) => {
    const isPositive = change > 0;
    const prefix = isPositive ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change > 0 ? 'text-green-400' : 'text-red-400';
  };

  const coinSlug = (coin: CoinData) => {
    return coin.slug || coin.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const openCoin = (coin: CoinData) => {
    const usd = coin.quote.USD;
    setSelectedCoin({
      slug: coinSlug(coin),
      row: createCryptoDetailRow({
        name: coin.name,
        symbol: coin.symbol,
        rank: coin.cmc_rank,
        price: usd.price,
        change_1h_pct: usd.percent_change_1h,
        change_24h_pct: usd.percent_change_24h,
        change_7d_pct: usd.percent_change_7d,
        change_30d_pct: usd.percent_change_30d,
        market_cap: usd.market_cap,
        volume_24h: usd.volume_24h,
      }),
    });
  };

  if (isLoading) {
    return (
      <section className="flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/45">
        <div className="border-b border-l-2 border-white/10 border-l-amber-400/70 px-3 py-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-100">Top 20 by Volume</h3>
        </div>
        <div className="flex flex-1 items-center justify-center font-mono text-[10px] text-gray-600">
          Loading top coins by volume…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/45">
        <div className="border-b border-l-2 border-white/10 border-l-amber-400/70 px-3 py-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-100">Top 20 by Volume</h3>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 text-center font-mono text-[10px] text-red-300">
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/45" data-testid="top-trending-cmc">
      <div className="flex items-center justify-between gap-3 border-b border-l-2 border-white/10 border-l-amber-400/70 px-3 py-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-100">Top 20 by Volume</h3>
        <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">5m · CMC</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[470px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#090b0e]">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Asset</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Price</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">24h</th>
              <th className="px-3 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {trendingCoins.map((coin, index) => (
              <tr key={coin.id} className="group border-b border-white/[0.06] hover:bg-white/[0.025]" data-testid={`trending-coin-card-${coin.symbol}`}>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => openCoin(coin)} className="flex min-w-[150px] items-center gap-2 text-left hover:text-amber-200">
                    <span className="w-5 shrink-0 font-mono text-[9px] text-amber-400/80">#{index + 1}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate text-[11px] font-semibold text-gray-100">
                        {coin.name}<ChartCandlestick className="h-2.5 w-2.5 shrink-0 text-white/25 group-hover:text-amber-300" />
                      </span>
                      <span className="block font-mono text-[9px] uppercase tracking-wide text-gray-500">{coin.symbol} · CMC #{coin.cmc_rank}</span>
                    </span>
                  </button>
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums text-gray-300">{formatPrice(coin.quote.USD.price)}</td>
                <td className={`whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] font-semibold tabular-nums ${getChangeColor(coin.quote.USD.percent_change_24h)}`}>{formatPercentChange(coin.quote.USD.percent_change_24h)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-[10px] tabular-nums text-gray-400">{formatMarketCap(coin.quote.USD.market_cap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedCoin && (
        <CryptoDetailModal row={selectedCoin.row} cmcSlug={selectedCoin.slug} onClose={() => setSelectedCoin(null)} />
      )}
    </section>
  );
};

export default TopTrendingCMC;
