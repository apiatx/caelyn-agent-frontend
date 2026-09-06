import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type NullableNumber = number | null;

interface CryptoScreenerRow {
  rank: number | null;
  cmc_id: number | null;
  coingecko_id: string | null;
  symbol: string;
  name: string;
  slug: string | null;
  price: NullableNumber;
  volume_24h: NullableNumber;
  sma_50: NullableNumber;
  sma_150: NullableNumber;
  sma_200: NullableNumber;
  pct_vs_sma_50: NullableNumber;
  pct_vs_sma_150: NullableNumber;
  pct_vs_sma_200: NullableNumber;
  above_sma_50: boolean | null;
  above_sma_150: boolean | null;
  above_sma_200: boolean | null;
  above_all_3: boolean | null;
  bullish_ma_stack: boolean | null;
  fresh_breakout_50: boolean | null;
  fresh_breakout_150: boolean | null;
  fresh_breakout_200: boolean | null;
  holding_above_50: boolean | null;
  holding_above_150: boolean | null;
  holding_above_200: boolean | null;
  sma_50_rising: boolean | null;
  sma_150_rising: boolean | null;
  sma_200_rising: boolean | null;
  setup_label: string | null;
  volume_change_24h_pct: NullableNumber;
  volume_delta_7d_pct: NullableNumber;
  vol_x_7d: NullableNumber;
  volume_to_market_cap_pct: NullableNumber;
}

interface CryptoScreenerResponse {
  as_of?: string | null;
  history_as_of?: string | null;
  source?: string | null;
  refreshing?: boolean;
  rows?: CryptoScreenerRow[];
}

type TrendFilter = 'all' | 'breakouts' | 'above-all' | 'holding' | 'bullish-stack' | 'rising-volume';
type TrendSort = 'priority' | 'pct_vs_sma_50' | 'pct_vs_sma_150' | 'pct_vs_sma_200' | 'vol_x_7d';
type SortDirection = 'asc' | 'desc';
type VolumeSort = 'volume_24h' | 'volume_change_24h_pct' | 'volume_delta_7d_pct' | 'vol_x_7d' | 'volume_to_market_cap_pct';

const TREND_FILTERS: Array<{ value: TrendFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'breakouts', label: 'Breakouts' },
  { value: 'above-all', label: 'Above All' },
  { value: 'holding', label: 'Holding' },
  { value: 'bullish-stack', label: 'Bullish Stack' },
  { value: 'rising-volume', label: 'Rising Volume' },
];

const VOLUME_SORTS: Array<{ value: VolumeSort; label: string }> = [
  { value: 'volume_24h', label: '24h Volume' },
  { value: 'volume_change_24h_pct', label: 'Δ24h' },
  { value: 'volume_delta_7d_pct', label: 'Δ7d' },
  { value: 'vol_x_7d', label: 'VolX' },
  { value: 'volume_to_market_cap_pct', label: 'Vol/MC' },
];

async function fetchCryptoScreener(headers: Record<string, string>): Promise<CryptoScreenerResponse> {
  const response = await fetch('/api/crypto/screener', {
    headers,
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Crypto screener request failed (${response.status})${body ? `: ${body.slice(0, 160)}` : ''}`);
  }
  const payload = await response.json() as CryptoScreenerResponse;
  return {
    ...payload,
    rows: Array.isArray(payload.rows) ? payload.rows : [],
  };
}

function compareNullable(a: NullableNumber | undefined, b: NullableNumber | undefined, direction: SortDirection): number {
  const aMissing = a == null || !Number.isFinite(a);
  const bMissing = b == null || !Number.isFinite(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return direction === 'asc' ? a - b : b - a;
}

function setupPriority(row: CryptoScreenerRow): number {
  if (row.fresh_breakout_200) return 1;
  if (row.fresh_breakout_150) return 2;
  if (row.fresh_breakout_50) return 3;
  if (row.above_all_3 && row.bullish_ma_stack) return 4;
  if (row.above_all_3) return 5;
  if (row.holding_above_200) return 6;
  if (row.holding_above_150) return 7;
  if (row.holding_above_50) return 8;
  return 9;
}

function matchesTrendFilter(row: CryptoScreenerRow, filter: TrendFilter): boolean {
  switch (filter) {
    case 'breakouts':
      return Boolean(row.fresh_breakout_50 || row.fresh_breakout_150 || row.fresh_breakout_200);
    case 'above-all':
      return row.above_all_3 === true;
    case 'holding':
      return Boolean(row.holding_above_50 || row.holding_above_150 || row.holding_above_200);
    case 'bullish-stack':
      return row.bullish_ma_stack === true;
    case 'rising-volume':
      return row.vol_x_7d != null && row.vol_x_7d > 1;
    default:
      return true;
  }
}

function formatPrice(value: NullableNumber | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

function formatCompactUsd(value: NullableNumber | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: NullableNumber | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatMultiple(value: NullableNumber | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}x`;
}

function valueTone(value: NullableNumber | undefined, nearZero = 0.5): string {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < nearZero) return 'text-gray-400';
  return value > 0 ? 'text-emerald-400/90' : 'text-red-400/90';
}

function AssetCell({ row }: { row: CryptoScreenerRow }) {
  const content = (
    <>
      <div className="flex items-center gap-1 truncate text-[11px] font-semibold text-gray-100" title={row.name || row.symbol}>
        {row.name || row.symbol || '—'}
        {row.slug && <ExternalLink className="h-2.5 w-2.5 shrink-0 text-white/25 group-hover:text-cyan-300" />}
      </div>
      <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wide text-gray-500">
        {row.symbol || '—'}{row.rank != null ? ` · #${row.rank}` : ''}
      </div>
    </>
  );
  return (
    row.slug ? (
      <a
        href={`https://coinmarketcap.com/currencies/${row.slug}/`}
        target="_blank"
        rel="noopener noreferrer"
        className="group block min-w-[100px] hover:text-cyan-200"
      >
        {content}
      </a>
    ) : <div className="min-w-[100px]">{content}</div>
  );
}

function MovingAverageCell({
  days,
  distance,
  sma,
  rising,
}: {
  days: number;
  distance: NullableNumber | undefined;
  sma: NullableNumber | undefined;
  rising: boolean | null | undefined;
}) {
  if (distance == null || !Number.isFinite(distance)) return <span className="text-gray-600">—</span>;
  const direction = rising == null ? '—' : rising ? 'Rising' : 'Falling';
  const arrow = rising == null ? '' : rising ? ' ↑' : ' ↓';
  const relation = distance >= 0 ? 'above' : 'below';
  const title = `${days}D SMA: ${formatPrice(sma)}\nPrice: ${Math.abs(distance).toFixed(2)}% ${relation}\nSMA direction: ${direction}`;
  return (
    <span className={`font-mono tabular-nums ${valueTone(distance)}`} title={title}>
      {formatPercent(distance)}{arrow}
    </span>
  );
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
  title,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  title?: string;
}) {
  return (
    <th className="whitespace-nowrap px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">
      <button type="button" className="hover:text-gray-200" onClick={onClick} title={title}>
        {label}{active ? (direction === 'desc' ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  );
}

function PanelFrame({
  title,
  accentClass,
  refreshing,
  controls,
  children,
}: {
  title: string;
  accentClass: string;
  refreshing: boolean;
  controls: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-[320px] min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/45">
      <div className={`border-b border-white/10 border-l-2 ${accentClass} px-3 py-2.5`}>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-100">{title}</h3>
          {refreshing && <span className="font-mono text-[9px] text-gray-500">refreshing…</span>}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">{controls}</div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </section>
  );
}

const controlClass = (active: boolean) =>
  `rounded border px-1.5 py-0.5 font-mono text-[9px] transition-colors ${
    active
      ? 'border-white/25 bg-white/10 text-gray-100'
      : 'border-white/[0.07] bg-transparent text-gray-500 hover:border-white/15 hover:text-gray-300'
  }`;

export default function CryptoScreenerTerminal() {
  const { getAuthHeaders } = useAuth();
  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all');
  const [trendSort, setTrendSort] = useState<TrendSort>('priority');
  const [trendDirection, setTrendDirection] = useState<SortDirection>('desc');
  const [volumeSort, setVolumeSort] = useState<VolumeSort>('volume_change_24h_pct');

  const { data, isLoading, error } = useQuery<CryptoScreenerResponse>({
    queryKey: ['crypto-screener-terminal'],
    queryFn: () => fetchCryptoScreener(getAuthHeaders()),
    staleTime: Infinity,
    retry: false,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const sourceRows = data?.rows ?? [];

  const trendRows = useMemo(() => {
    const rows = sourceRows.filter(row => matchesTrendFilter(row, trendFilter));
    rows.sort((a, b) => {
      if (trendSort === 'priority') {
        const priority = setupPriority(a) - setupPriority(b);
        return priority || compareNullable(a.vol_x_7d, b.vol_x_7d, 'desc');
      }
      return compareNullable(a[trendSort], b[trendSort], trendDirection);
    });
    return rows.slice(0, 20);
  }, [sourceRows, trendFilter, trendSort, trendDirection]);

  const volumeRows = useMemo(() => {
    return [...sourceRows]
      .sort((a, b) => compareNullable(a[volumeSort], b[volumeSort], 'desc'))
      .slice(0, 20);
  }, [sourceRows, volumeSort]);

  const setNumericTrendSort = (sort: Exclude<TrendSort, 'priority'>) => {
    if (trendSort === sort) {
      setTrendDirection(direction => direction === 'desc' ? 'asc' : 'desc');
    } else {
      setTrendSort(sort);
      setTrendDirection('desc');
    }
  };

  const refreshing = data?.source === 'stale_lkg' && data.refreshing === true;

  if (isLoading) {
    return (
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {['Trend / Breakout', 'Volume / Liquidity'].map(title => (
          <div key={title} className="h-[320px] animate-pulse rounded-xl border border-white/10 bg-black/45 p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</div>
            <div className="mt-8 text-center font-mono text-[10px] text-gray-600">Loading canonical screener…</div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-red-400/20 bg-red-950/10 px-4 py-5">
        <div className="text-xs font-semibold text-red-300">Crypto screening data is unavailable.</div>
        <div className="mt-1 font-mono text-[10px] text-gray-500">{error instanceof Error ? error.message : 'Unknown backend error'}</div>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
      <PanelFrame
        title="Trend / Breakout"
        accentClass="border-l-cyan-400/70"
        refreshing={refreshing}
        controls={TREND_FILTERS.map(filter => (
          <button
            key={filter.value}
            type="button"
            className={controlClass(trendFilter === filter.value)}
            onClick={() => setTrendFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      >
        <table className="w-full min-w-[690px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#090b0e]">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Asset</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Price</th>
              <th className="px-2 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Setup</th>
              <SortHeader label="50D" active={trendSort === 'pct_vs_sma_50'} direction={trendDirection} onClick={() => setNumericTrendSort('pct_vs_sma_50')} />
              <SortHeader label="150D" active={trendSort === 'pct_vs_sma_150'} direction={trendDirection} onClick={() => setNumericTrendSort('pct_vs_sma_150')} />
              <SortHeader label="200D" active={trendSort === 'pct_vs_sma_200'} direction={trendDirection} onClick={() => setNumericTrendSort('pct_vs_sma_200')} />
              <th className="px-2 py-2 text-center font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">MA Stack</th>
              <SortHeader label="VolX" active={trendSort === 'vol_x_7d'} direction={trendDirection} onClick={() => setNumericTrendSort('vol_x_7d')} />
            </tr>
          </thead>
          <tbody>
            {trendRows.map(row => {
              const hasStackData = row.sma_50 != null && row.sma_150 != null && row.sma_200 != null;
              const showVolume = row.vol_x_7d != null && row.vol_x_7d > 1 &&
                Boolean(row.fresh_breakout_50 || row.fresh_breakout_150 || row.fresh_breakout_200 ||
                  row.holding_above_50 || row.holding_above_150 || row.holding_above_200);
              return (
                <tr key={row.cmc_id ?? row.coingecko_id ?? row.symbol} className="border-b border-white/[0.06] hover:bg-white/[0.025]">
                  <td className="px-3 py-2"><AssetCell row={row} /></td>
                  <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums text-gray-300">{formatPrice(row.price)}</td>
                  <td className="max-w-[150px] px-2 py-2 text-[9px] font-semibold text-cyan-200/80">
                    <span className="line-clamp-2">{row.setup_label || '—'}{showVolume && <span className="ml-1 text-emerald-400/80">↑ VOL</span>}</span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-[10px]"><MovingAverageCell days={50} distance={row.pct_vs_sma_50} sma={row.sma_50} rising={row.sma_50_rising} /></td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-[10px]"><MovingAverageCell days={150} distance={row.pct_vs_sma_150} sma={row.sma_150} rising={row.sma_150_rising} /></td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-[10px]"><MovingAverageCell days={200} distance={row.pct_vs_sma_200} sma={row.sma_200} rising={row.sma_200_rising} /></td>
                  <td className={`whitespace-nowrap px-2 py-2 text-center font-mono text-[9px] font-semibold ${row.bullish_ma_stack ? 'text-emerald-400/90' : 'text-gray-500'}`}>
                    {hasStackData ? (row.bullish_ma_stack ? 'BULLISH' : 'MIXED') : '—'}
                  </td>
                  <td className={`whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums ${row.vol_x_7d != null && row.vol_x_7d > 1 ? 'text-amber-300/90' : 'text-gray-400'}`} title="Current comparable volume versus the latest 7-day average.">
                    {formatMultiple(row.vol_x_7d)}
                  </td>
                </tr>
              );
            })}
            {trendRows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center font-mono text-[10px] text-gray-600">No assets match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </PanelFrame>

      <PanelFrame
        title="Volume / Liquidity"
        accentClass="border-l-amber-400/70"
        refreshing={refreshing}
        controls={VOLUME_SORTS.map(sort => (
          <button
            key={sort.value}
            type="button"
            className={controlClass(volumeSort === sort.value)}
            onClick={() => setVolumeSort(sort.value)}
          >
            {sort.label}
          </button>
        ))}
      >
        <table className="w-full min-w-[620px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-[#090b0e]">
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Asset</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Price</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">24h Volume</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Δ24h</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Δ7d</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">VolX</th>
              <th className="px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Vol/MC</th>
            </tr>
          </thead>
          <tbody>
            {volumeRows.map(row => (
              <tr key={row.cmc_id ?? row.coingecko_id ?? row.symbol} className="border-b border-white/[0.06] hover:bg-white/[0.025]">
                <td className="px-3 py-2"><AssetCell row={row} /></td>
                <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums text-gray-300">{formatPrice(row.price)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums text-gray-300">{formatCompactUsd(row.volume_24h)}</td>
                <td className={`whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums ${valueTone(row.volume_change_24h_pct)}`}>{formatPercent(row.volume_change_24h_pct)}</td>
                <td className={`whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums ${valueTone(row.volume_delta_7d_pct)}`} title="Average volume over the latest 7 completed days versus the previous 7 days.">{formatPercent(row.volume_delta_7d_pct)}</td>
                <td className={`whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums ${row.vol_x_7d != null && row.vol_x_7d > 1 ? 'text-amber-300/90' : 'text-gray-400'}`}>{formatMultiple(row.vol_x_7d)}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-[10px] tabular-nums text-violet-300/80">{formatPercent(row.volume_to_market_cap_pct)}</td>
              </tr>
            ))}
            {volumeRows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-12 text-center font-mono text-[10px] text-gray-600">No volume data available.</td></tr>
            )}
          </tbody>
        </table>
      </PanelFrame>
    </div>
  );
}