import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartCandlestick, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import CryptoDetailModal from './CryptoDetailModal';

type NullableNumber = number | null;
type SortDirection = 'asc' | 'desc';

interface CmcRow {
  id?: number | null;
  name?: string;
  symbol?: string;
  slug?: string | null;
  cmc_rank?: number | null;
  quote?: {
    USD?: {
      price?: NullableNumber;
      volume_24h?: NullableNumber;
      percent_change_1h?: NullableNumber;
      percent_change_24h?: NullableNumber;
      percent_change_7d?: NullableNumber;
      percent_change_30d?: NullableNumber;
      market_cap?: NullableNumber;
    };
  };
}

interface CanonicalRow {
  cmc_id?: number | null;
  coingecko_id?: string | null;
  name?: string;
  symbol?: string;
  slug?: string | null;
  rank?: number | null;
  price?: NullableNumber;
  change_1h_pct?: NullableNumber;
  change_24h_pct?: NullableNumber;
  change_7d_pct?: NullableNumber;
  change_30d_pct?: NullableNumber;
  market_cap?: NullableNumber;
  volume_24h?: NullableNumber;
  setup_label?: string | null;
  pct_vs_sma_50?: NullableNumber;
  pct_vs_sma_150?: NullableNumber;
  pct_vs_sma_200?: NullableNumber;
  sma_50_rising?: boolean | null;
  sma_150_rising?: boolean | null;
  sma_200_rising?: boolean | null;
  bullish_ma_stack?: boolean | null;
  volume_change_24h_pct?: NullableNumber;
  volume_delta_7d_pct?: NullableNumber;
  vol_x_7d?: NullableNumber;
  volume_to_market_cap_pct?: NullableNumber;
}

interface CanonicalResponse {
  rows?: CanonicalRow[];
}

export interface UnifiedRow {
  key: string;
  cmc_id: number | null;
  coingecko_id: string | null;
  name: string;
  symbol: string;
  slug: string | null;
  rank: NullableNumber;
  price: NullableNumber;
  change_1h_pct: NullableNumber;
  change_24h_pct: NullableNumber;
  change_7d_pct: NullableNumber;
  change_30d_pct: NullableNumber;
  market_cap: NullableNumber;
  volume_24h: NullableNumber;
  setup_label: string | null;
  pct_vs_sma_50: NullableNumber;
  pct_vs_sma_150: NullableNumber;
  pct_vs_sma_200: NullableNumber;
  sma_50_rising: boolean | null;
  sma_150_rising: boolean | null;
  sma_200_rising: boolean | null;
  bullish_ma_stack: boolean | null;
  volume_change_24h_pct: NullableNumber;
  volume_delta_7d_pct: NullableNumber;
  vol_x_7d: NullableNumber;
  volume_to_market_cap_pct: NullableNumber;
}

type SortKey = Exclude<{
  [K in keyof UnifiedRow]: UnifiedRow[K] extends NullableNumber ? K : never
}[keyof UnifiedRow], undefined>;

const SORT_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'rank', label: 'Rank' },
  { key: 'price', label: 'Price' },
  { key: 'change_1h_pct', label: '1h' },
  { key: 'change_24h_pct', label: '24h' },
  { key: 'change_7d_pct', label: '7d' },
  { key: 'change_30d_pct', label: '30d' },
  { key: 'market_cap', label: 'Market Cap' },
  { key: 'volume_24h', label: '24h Volume' },
  { key: 'volume_change_24h_pct', label: 'Vol Δ24h' },
  { key: 'volume_delta_7d_pct', label: 'Vol Δ7d' },
  { key: 'vol_x_7d', label: 'VolX' },
  { key: 'volume_to_market_cap_pct', label: 'Vol/MC' },
  { key: 'pct_vs_sma_50', label: '50D' },
  { key: 'pct_vs_sma_150', label: '150D' },
  { key: 'pct_vs_sma_200', label: '200D' },
];

const normalizeSymbol = (symbol?: string) => (symbol || '').trim().toUpperCase();
const present = <T,>(value: T | null | undefined): value is T => value != null;
const pick = <T,>(primary: T | null | undefined, fallback: T | null | undefined): T | null =>
  present(primary) ? primary : present(fallback) ? fallback : null;
const rowId = (row: CanonicalRow | CmcRow) =>
  'cmc_id' in row ? row.cmc_id : 'id' in row ? row.id : null;

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(url, headers ? { headers } : undefined);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

let universeRequest: Promise<[CanonicalResponse, CmcRow[], CmcRow[]]> | null = null;

function fetchUniverse(headers: Record<string, string>) {
  if (!universeRequest) {
    universeRequest = Promise.all([
      fetchJson<CanonicalResponse>('/api/crypto/screener', headers),
      fetchJson<CmcRow[]>('/api/coinmarketcap/top500-gainers'),
      fetchJson<CmcRow[]>('/api/coinmarketcap/trending'),
    ]).catch(error => {
      universeRequest = null;
      throw error;
    });
  }
  return universeRequest;
}

function safeSlug(row: UnifiedRow): string {
  return row.slug || row.name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function emptyRow(key: string): UnifiedRow {
  return {
    key, cmc_id: null, coingecko_id: null, name: '', symbol: '', slug: null, rank: null, price: null,
    change_1h_pct: null, change_24h_pct: null, change_7d_pct: null, change_30d_pct: null,
    market_cap: null, volume_24h: null, setup_label: null, pct_vs_sma_50: null,
    pct_vs_sma_150: null, pct_vs_sma_200: null, sma_50_rising: null,
    sma_150_rising: null, sma_200_rising: null, bullish_ma_stack: null,
    volume_change_24h_pct: null, volume_delta_7d_pct: null, vol_x_7d: null,
    volume_to_market_cap_pct: null,
  };
}

function mergeRows(canonical: CanonicalRow[], gainers: CmcRow[], trending: CmcRow[]): UnifiedRow[] {
  const all = [...canonical, ...gainers, ...trending];
  const idsBySymbol = new Map<string, Set<number>>();
  all.forEach(row => {
    const symbol = normalizeSymbol(row.symbol);
    const id = rowId(row);
    if (symbol && present(id)) {
      const ids = idsBySymbol.get(symbol) ?? new Set<number>();
      ids.add(id);
      idsBySymbol.set(symbol, ids);
    }
  });

  const keyFor = (row: CanonicalRow | CmcRow, source: string, index: number) => {
    const symbol = normalizeSymbol(row.symbol);
    const ownId = rowId(row);
    if (present(ownId)) return `id:${ownId}`;
    const symbolIds = idsBySymbol.get(symbol);
    if (symbol && symbolIds?.size === 1) return `id:${Array.from(symbolIds)[0]}`;
    if (symbol && (!symbolIds || symbolIds.size === 0)) return `symbol:${symbol}`;
    return `${source}:${symbol || index}`;
  };

  const merged = new Map<string, UnifiedRow>();
  const addCmc = (rows: CmcRow[], source: string) => rows.slice(0, 20).forEach((row, index) => {
    const key = keyFor(row, source, index);
    const current = merged.get(key) ?? emptyRow(key);
    const usd = row.quote?.USD;
    merged.set(key, {
      ...current,
      cmc_id: pick(current.cmc_id, row.id),
      name: current.name || row.name || row.symbol || 'Unknown',
      symbol: current.symbol || normalizeSymbol(row.symbol),
      slug: pick(current.slug, row.slug),
      rank: pick(current.rank, row.cmc_rank),
      price: pick(current.price, usd?.price),
      change_1h_pct: pick(current.change_1h_pct, usd?.percent_change_1h),
      change_24h_pct: pick(current.change_24h_pct, usd?.percent_change_24h),
      change_7d_pct: pick(current.change_7d_pct, usd?.percent_change_7d),
      change_30d_pct: pick(current.change_30d_pct, usd?.percent_change_30d),
      market_cap: pick(current.market_cap, usd?.market_cap),
      volume_24h: pick(current.volume_24h, usd?.volume_24h),
    });
  });

  addCmc(gainers, 'gainer');
  addCmc(trending, 'volume');
  canonical.forEach((row, index) => {
    const key = keyFor(row, 'canonical', index);
    const current = merged.get(key) ?? emptyRow(key);
    merged.set(key, {
      ...current,
      cmc_id: pick(row.cmc_id, current.cmc_id),
      coingecko_id: pick(row.coingecko_id, current.coingecko_id),
      name: row.name || current.name || row.symbol || 'Unknown',
      symbol: normalizeSymbol(row.symbol) || current.symbol,
      slug: pick(row.slug, current.slug),
      rank: pick(row.rank, current.rank),
      price: pick(row.price, current.price),
      change_1h_pct: pick(row.change_1h_pct, current.change_1h_pct),
      change_24h_pct: pick(row.change_24h_pct, current.change_24h_pct),
      change_7d_pct: pick(row.change_7d_pct, current.change_7d_pct),
      change_30d_pct: pick(row.change_30d_pct, current.change_30d_pct),
      market_cap: pick(row.market_cap, current.market_cap),
      volume_24h: pick(row.volume_24h, current.volume_24h),
      setup_label: pick(row.setup_label, current.setup_label),
      pct_vs_sma_50: pick(row.pct_vs_sma_50, current.pct_vs_sma_50),
      pct_vs_sma_150: pick(row.pct_vs_sma_150, current.pct_vs_sma_150),
      pct_vs_sma_200: pick(row.pct_vs_sma_200, current.pct_vs_sma_200),
      sma_50_rising: pick(row.sma_50_rising, current.sma_50_rising),
      sma_150_rising: pick(row.sma_150_rising, current.sma_150_rising),
      sma_200_rising: pick(row.sma_200_rising, current.sma_200_rising),
      bullish_ma_stack: pick(row.bullish_ma_stack, current.bullish_ma_stack),
      volume_change_24h_pct: pick(row.volume_change_24h_pct, current.volume_change_24h_pct),
      volume_delta_7d_pct: pick(row.volume_delta_7d_pct, current.volume_delta_7d_pct),
      vol_x_7d: pick(row.vol_x_7d, current.vol_x_7d),
      volume_to_market_cap_pct: pick(row.volume_to_market_cap_pct, current.volume_to_market_cap_pct),
    });
  });
  return Array.from(merged.values());
}

function formatPrice(value: NullableNumber) {
  if (!present(value)) return '—';
  if (value >= 1000) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

function formatUsd(value: NullableNumber) {
  if (!present(value)) return '—';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: NullableNumber) {
  return present(value) ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : '—';
}

function tone(value: NullableNumber) {
  if (!present(value) || Math.abs(value) < 0.5) return 'text-gray-400';
  return value > 0 ? 'text-emerald-400/90' : 'text-red-400/90';
}

function MaCell({ value, rising }: { value: NullableNumber; rising: boolean | null }) {
  if (!present(value)) return <span className="text-gray-600">—</span>;
  return <span className={tone(value)}>{formatPercent(value)}{rising == null ? '' : rising ? ' ↑' : ' ↓'}</span>;
}

export default function CryptoUnifiedScreener() {
  const { getAuthHeaders } = useAuth();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [selectedRow, setSelectedRow] = useState<UnifiedRow | null>(null);

  const universe = useQuery<[CanonicalResponse, CmcRow[], CmcRow[]]>({
    queryKey: ['crypto-unified-screener'],
    queryFn: () => fetchUniverse(getAuthHeaders()),
    staleTime: 5 * 60 * 1000, retry: false, refetchInterval: false,
    refetchOnMount: false, refetchOnWindowFocus: false,
  });

  const rows = useMemo(
    () => mergeRows(universe.data?.[0].rows ?? [], universe.data?.[1] ?? [], universe.data?.[2] ?? []),
    [universe.data],
  );
  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter(row => !term || row.name.toLowerCase().includes(term) || row.symbol.toLowerCase().includes(term))
      .sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (!present(av) && !present(bv)) return 0;
        if (!present(av)) return 1;
        if (!present(bv)) return -1;
        return direction === 'asc' ? av - bv : bv - av;
      });
  }, [rows, search, sortKey, direction]);

  const sort = (key: SortKey) => {
    if (sortKey === key) setDirection(value => value === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setDirection(key === 'rank' ? 'asc' : 'desc');
    }
  };

  const isLoading = universe.isLoading;
  const error = universe.error;

  return (
    <>
      <section className="flex h-[calc(100vh-190px)] min-h-[430px] max-h-[820px] min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-black/45">
      <div className="flex flex-col gap-3 border-b border-l-2 border-white/10 border-l-cyan-400/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-gray-100">Crypto Screener</h3>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-gray-500">current terminal universe · {rows.length} assets</div>
        </div>
        <label className="flex h-8 w-full items-center gap-2 rounded-md border border-white/10 bg-black/30 px-2 sm:w-56">
          <Search className="h-3.5 w-3.5 text-gray-500" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search ticker or name…"
            className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-gray-200 outline-none placeholder:text-gray-600"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center font-mono text-[10px] text-gray-600">Loading terminal universe…</div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-4 text-center font-mono text-[10px] text-red-300">Crypto screener data is unavailable.</div>
        ) : (
          <table className="w-full min-w-[1580px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#090b0e]">
              <tr className="border-b border-white/10">
                <th className="px-3 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Asset</th>
                {SORT_COLUMNS.slice(0, 12).map(column => (
                  <th key={column.key} className="whitespace-nowrap px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">
                    <button type="button" onClick={() => sort(column.key)} className="hover:text-gray-200">
                      {column.label}{sortKey === column.key ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
                <th className="whitespace-nowrap px-2 py-2 font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">Setup</th>
                {SORT_COLUMNS.slice(12).map(column => (
                  <th key={column.key} className="whitespace-nowrap px-2 py-2 text-right font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">
                    <button type="button" onClick={() => sort(column.key)} className="hover:text-gray-200">
                      {column.label}{sortKey === column.key ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
                <th className="whitespace-nowrap px-3 py-2 text-center font-mono text-[9px] font-medium uppercase tracking-wider text-gray-500">MA Stack</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(row => {
                const hasStack = present(row.pct_vs_sma_50) && present(row.pct_vs_sma_150) && present(row.pct_vs_sma_200);
                return (
                  <tr key={row.key} className="group border-b border-white/[0.06] hover:bg-white/[0.025]">
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => setSelectedRow(row)} className="block min-w-[130px] text-left hover:text-cyan-200">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-100">{row.name}<ChartCandlestick className="h-2.5 w-2.5 text-white/25 group-hover:text-cyan-300" /></span>
                        <span className="font-mono text-[9px] uppercase tracking-wide text-gray-500">{row.symbol}</span>
                      </button>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] text-gray-400">{present(row.rank) ? `#${row.rank}` : '—'}</td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] text-gray-300">{formatPrice(row.price)}</td>
                    {[row.change_1h_pct, row.change_24h_pct, row.change_7d_pct, row.change_30d_pct].map((value, index) => <td key={index} className={`px-2 py-2 text-right font-mono text-[10px] ${tone(value)}`}>{formatPercent(value)}</td>)}
                    <td className="px-2 py-2 text-right font-mono text-[10px] text-gray-400">{formatUsd(row.market_cap)}</td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] text-gray-300">{formatUsd(row.volume_24h)}</td>
                    <td className={`px-2 py-2 text-right font-mono text-[10px] ${tone(row.volume_change_24h_pct)}`}>{formatPercent(row.volume_change_24h_pct)}</td>
                    <td className={`px-2 py-2 text-right font-mono text-[10px] ${tone(row.volume_delta_7d_pct)}`}>{formatPercent(row.volume_delta_7d_pct)}</td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] text-amber-300/90">{present(row.vol_x_7d) ? `${row.vol_x_7d.toFixed(2)}x` : '—'}</td>
                    <td className="px-2 py-2 text-right font-mono text-[10px] text-violet-300/80">{formatPercent(row.volume_to_market_cap_pct)}</td>
                    <td className="max-w-[150px] px-2 py-2 text-[9px] font-semibold text-cyan-200/80">{row.setup_label || '—'}</td>
                    <td className="px-2 py-2 text-right font-mono text-[10px]"><MaCell value={row.pct_vs_sma_50} rising={row.sma_50_rising} /></td>
                    <td className="px-2 py-2 text-right font-mono text-[10px]"><MaCell value={row.pct_vs_sma_150} rising={row.sma_150_rising} /></td>
                    <td className="px-2 py-2 text-right font-mono text-[10px]"><MaCell value={row.pct_vs_sma_200} rising={row.sma_200_rising} /></td>
                    <td className={`px-3 py-2 text-center font-mono text-[9px] font-semibold ${row.bullish_ma_stack ? 'text-emerald-400/90' : 'text-gray-500'}`}>{hasStack ? row.bullish_ma_stack ? 'BULLISH' : 'MIXED' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      </section>
      {selectedRow && (
        <CryptoDetailModal
          row={selectedRow}
          cmcSlug={safeSlug(selectedRow)}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </>
  );
}