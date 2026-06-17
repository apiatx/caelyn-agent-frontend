import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, ArrowDown, ArrowUpDown, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type ColDef = { key: string; label: string; numeric?: boolean; aliases?: string[] };

// ── Column definitions — mirrors ScreenerHub fundamentals tab ─────────────────
const FUND_COLUMNS: ColDef[] = [
  { key: 'symbol',         label: 'Symbol',     aliases: ['ticker', 'stock'] },
  { key: 'company_name',   label: 'Company',    aliases: ['companyName', 'name', 'company'] },
  { key: 'price',          label: 'Price',      numeric: true, aliases: ['last', 'lastPrice'] },
  { key: 'change_1d',      label: '1D %',       numeric: true, aliases: ['change_percent_1d', 'changePercent1d', 'oneDayChange', 'pct_1d', 'change_pct_1d', 'day_change_pct'] },
  { key: 'change_7d',      label: '7D %',       numeric: true, aliases: ['7d', '7D', '5D', '5d', 'price_change_7d', 'change_5d', 'week_change'] },
  { key: 'change_30d',     label: '30D %',      numeric: true, aliases: ['30d', '30D', '1M', 'price_change_30d', 'change_1m', 'month_change'] },
  { key: 'change_ytd',     label: 'YTD %',      numeric: true, aliases: ['ytd', 'YTD', 'price_change_ytd', 'ytd_change'] },
  { key: 'change_1y',      label: '1Y %',       numeric: true, aliases: ['1y', '1Y', 'price_change_1y', 'year_change', 'oneYearChange'] },
  { key: 'market_cap',     label: 'Market Cap', numeric: true, aliases: ['marketCap', 'mcap'] },
  { key: 'pe_ratio',       label: 'P/E',        numeric: true, aliases: ['pe', 'priceEarnings', 'price_to_earnings', 'priceToEarningsRatio', 'pe_ttm'] },
  { key: 'eps',            label: 'EPS',        numeric: true, aliases: ['eps_ttm', 'earningsPerShare', 'eps_diluted'] },
  { key: 'revenue',        label: 'Revenue',    numeric: true, aliases: ['revenue_ttm', 'total_revenue', 'totalRevenue', 'annualRevenue'] },
  { key: 'gross_margin',   label: 'Gross Mgn',  numeric: true, aliases: ['grossMargin', 'gross_profit_margin', 'grossProfitMargin'] },
  { key: 'net_margin',     label: 'Net Mgn',    numeric: true, aliases: ['netProfitMargin', 'profit_margin', 'netMargin', 'profitMargin'] },
  { key: 'roe',            label: 'ROE',        numeric: true, aliases: ['returnOnEquity', 'return_on_equity', 'roeTTM'] },
  { key: 'debt_to_equity', label: 'D/E',        numeric: true, aliases: ['debtToEquity', 'de_ratio', 'debtEquityRatio', 'totalDebtToEquity'] },
  { key: 'revenue_growth', label: 'Rev Grwth',  numeric: true, aliases: ['revenueGrowth', 'revenue_growth_yoy', 'revenue_growth_rate', 'revenueGrowthYoy'] },
  { key: 'beta',           label: 'Beta',       numeric: true },
  { key: 'sector',         label: 'Sector' },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function cx(...xs: Array<string | false | undefined | null>): string {
  return xs.filter(Boolean).join(' ');
}

function getField(row: any, primary: string, aliases: string[] = []): any {
  if (row == null) return undefined;
  if (row[primary] !== undefined && row[primary] !== null) return row[primary];
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== null) return row[a];
  }
  const want = [primary, ...aliases].map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const k of Object.keys(row)) {
    if (want.includes(k.toLowerCase().replace(/[^a-z0-9]/g, ''))) return row[k];
  }
  return undefined;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtCompactCurrency(v: any): string {
  const n = toNum(v);
  if (n === null) return '—';
  const abs = Math.abs(n), sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(abs >= 100e9 ? 1 : 2)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(abs >= 100e6 ? 1 : 2)}M`;
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtCurrency(v: any): string {
  const n = toNum(v);
  if (n === null) return '—';
  return `$${n.toFixed(2)}`;
}

function fmtPct(v: any): { text: string; positive: boolean; negative: boolean } {
  const n = toNum(v);
  if (n === null) return { text: '—', positive: false, negative: false };
  const pct = Math.abs(n) <= 1.5 ? n * 100 : n;
  const sign = pct > 0 ? '+' : '';
  return { text: `${sign}${pct.toFixed(2)}%`, positive: pct > 0, negative: pct < 0 };
}

// ── Cell renderer — identical logic to ScreenerHub ────────────────────────────
function renderCell(row: any, c: ColDef): React.ReactNode {
  const v = getField(row, c.key, c.aliases);

  if (c.key === 'symbol') {
    const sym = String(v ?? '—');
    return <span className="font-semibold text-white">{sym}</span>;
  }

  if (c.key === 'company_name') {
    if (!v) return <span className="text-white/40">—</span>;
    return <span className="text-white/80 max-w-[160px] truncate block" title={String(v)}>{String(v)}</span>;
  }

  if (c.key === 'market_cap' || c.key === 'revenue') {
    return <span>{fmtCompactCurrency(v)}</span>;
  }

  if (c.key === 'price') return <span>{fmtCurrency(v)}</span>;

  if (c.key === 'beta') {
    const n = toNum(v);
    if (n === null) return <span className="text-white/40">—</span>;
    return <span>{n.toFixed(2)}</span>;
  }

  if (['change_1d','change_7d','change_30d','change_ytd','change_1y'].includes(c.key)) {
    const { text, positive, negative } = fmtPct(v);
    return <span className={cx(positive && 'text-emerald-300', negative && 'text-rose-300', !positive && !negative && 'text-white/40')}>{text}</span>;
  }

  if (c.key === 'pe_ratio') {
    const n = toNum(v);
    if (n === null || n <= 0) return <span className="text-white/40">—</span>;
    return <span className={n > 50 ? 'text-rose-300' : ''}>{n.toFixed(1)}x</span>;
  }

  if (c.key === 'eps') {
    const n = toNum(v);
    if (n === null) return <span className="text-white/40">—</span>;
    return <span className={n < 0 ? 'text-rose-300' : ''}>{n < 0 ? '-' : ''}${Math.abs(n).toFixed(2)}</span>;
  }

  if (['gross_margin','net_margin','roe','revenue_growth'].includes(c.key)) {
    const { text, positive, negative } = fmtPct(v);
    return <span className={cx(positive && 'text-emerald-300', negative && 'text-rose-300', !positive && !negative && 'text-white/40')}>{text}</span>;
  }

  if (c.key === 'debt_to_equity') {
    const n = toNum(v);
    if (n === null) return <span className="text-white/40">—</span>;
    return <span className={n > 2 ? 'text-rose-300' : ''}>{n.toFixed(2)}</span>;
  }

  if (c.key === 'sector' || c.key === 'industry') {
    if (!v) return <span className="text-white/40">—</span>;
    return <span className="text-white/70 text-[11px]">{String(v)}</span>;
  }

  if (c.numeric) {
    const n = toNum(v);
    if (n === null) return <span className="text-white/40">—</span>;
    return <span>{n.toFixed(2)}</span>;
  }
  if (v === null || v === undefined || v === '') return <span className="text-white/40">—</span>;
  return <span>{String(v)}</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PortfolioFundamentalsView() {
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<string>('symbol');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const t0 = useMemo(() => Date.now(), []);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['portfolio-fundamentals'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio/fundamentals', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const rows: any[] = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  const symbols: string[] = data?.symbols ?? [];
  const unavailableRaw: any[] = data?.unavailable_symbols ?? data?.unavailable ?? [];
  const unavailable: string[] = unavailableRaw.map((s: any) =>
    typeof s === 'string' ? s : (s?.symbol ?? s?.ticker ?? s?.name ?? String(s))
  );
  const cacheInfo = data?.cache ?? data?.cache_info ?? null;
  const holdingsCount: number = data?.holdings_count ?? rows.length;
  const totalPosCount: number = data?.total_position_count ?? holdingsCount;
  const eqPosCount: number | null = data?.equity_position_count ?? null;
  const optPosCount: number | null = data?.option_position_count ?? null;

  // Filter to columns that have ≥1 non-null value in the data
  const visibleColumns = useMemo<ColDef[]>(() => {
    if (!rows.length) return FUND_COLUMNS;
    return FUND_COLUMNS.filter(c =>
      rows.some(row => {
        const v = getField(row, c.key, c.aliases);
        return v !== null && v !== undefined && v !== '';
      })
    );
  }, [rows]);

  // Sort
  const sortedRows = useMemo(() => {
    if (!rows.length) return rows;
    const col = visibleColumns.find(c => c.key === sortKey);
    return [...rows].sort((a, b) => {
      const av = getField(a, sortKey, col?.aliases);
      const bv = getField(b, sortKey, col?.aliases);
      const an = toNum(av), bn = toNum(bv);
      let cmp = 0;
      if (an !== null && bn !== null) cmp = an - bn;
      else if (an !== null) cmp = 1;
      else if (bn !== null) cmp = -1;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir, visibleColumns]);

  const onSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Diagnostic log
  useEffect(() => {
    if (!data) return;
    const elapsed = Date.now() - t0;
    const hits = typeof cacheInfo === 'object' && cacheInfo !== null ? cacheInfo.hits ?? null : null;
    const misses = typeof cacheInfo === 'object' && cacheInfo !== null ? cacheInfo.misses ?? null : null;
    console.log('[portfolio-fundamentals-ui]', {
      rows: rows.length,
      symbols: symbols.length || rows.length,
      unavailable: unavailable.length,
      cacheSource: typeof cacheInfo === 'string' ? cacheInfo : (cacheInfo?.source ?? data?.fundamentals_cache_status ?? null),
      cacheHits: hits,
      cacheMisses: misses,
      selectedView: 'fundamentals',
      columnsRendered: visibleColumns.length,
      responseMs: elapsed,
    });
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cache label helper
  const cacheLabel = (() => {
    if (!data) return null;
    const s = typeof cacheInfo === 'string' ? cacheInfo : (cacheInfo?.source ?? data?.fundamentals_cache_status ?? null);
    if (!s) return null;
    const sl = String(s).toLowerCase();
    if (sl.includes('fresh')) return { text: 'Fresh', clr: '#4ade80' };
    if (sl.includes('mixed')) return { text: 'Mixed', clr: '#f59e0b' };
    if (sl.includes('cached') || sl.includes('cache')) return { text: 'Cached', clr: '#5cc8f0' };
    return { text: String(s), clr: '#64748b' };
  })();

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : null;

  return (
    <div className="flex flex-col gap-4 p-4 min-h-0">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-sm font-bold tracking-wide text-white">Portfolio Fundamentals</h2>
            {totalPosCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(92,200,240,0.12)', color: '#5cc8f0', border: '1px solid rgba(92,200,240,0.25)' }}>
                {eqPosCount != null && optPosCount != null
                  ? `${eqPosCount} stocks · ${optPosCount} options`
                  : `${totalPosCount} position${totalPosCount !== 1 ? 's' : ''}`}
              </span>
            )}
            {unavailable.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                <AlertTriangle className="w-2.5 h-2.5" />
                {unavailable.length} unavailable
              </span>
            )}
          </div>
          <p className="text-[11px] mt-0.5" style={{ color: '#475569' }}>
            Fundamentals shown by underlying symbol · stocks + option underlyings
          </p>
        </div>

        {/* Cache status + refresh */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {cacheLabel && (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium"
              style={{ background: 'rgba(255,255,255,0.04)', color: cacheLabel.clr, border: '1px solid rgba(255,255,255,0.08)' }}>
              {cacheLabel.text}
            </span>
          )}
          {lastUpdated && (
            <span className="text-[10px]" style={{ color: '#334155' }}>
              {lastUpdated}
            </span>
          )}
          <button
            onClick={() => { queryClient.invalidateQueries({ queryKey: ['portfolio-fundamentals'] }); refetch(); }}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
            style={{ background: 'rgba(92,200,240,0.08)', color: '#5cc8f0', border: '1px solid rgba(92,200,240,0.2)', opacity: isFetching ? 0.5 : 1 }}>
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Unavailable symbols notice */}
      {unavailable.length > 0 && (
        <div className="rounded-lg px-3 py-2 text-[11px] flex items-start gap-2"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', color: '#94a3b8' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>Fundamentals unavailable for: <span style={{ color: '#f59e0b' }}>{unavailable.join(', ')}</span></span>
        </div>
      )}

      {/* Table container */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.35)' }}>
        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
          <table className="w-full text-xs">
            {/* Sticky header */}
            <thead style={{ background: 'rgba(13,22,35,0.95)', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                {visibleColumns.map(c => {
                  const isSorted = sortKey === c.key;
                  return (
                    <th key={c.key}
                      onClick={() => onSort(c.key)}
                      className="px-3 py-2 text-left whitespace-nowrap cursor-pointer select-none font-semibold transition-colors hover:text-white"
                      style={{ color: isSorted ? '#5cc8f0' : '#64748b', fontSize: 11 }}>
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {isSorted
                          ? sortDir === 'asc'
                            ? <ArrowUp className="w-3 h-3" />
                            : <ArrowDown className="w-3 h-3" />
                          : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Loading state */}
            {isLoading ? (
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {FUND_COLUMNS.slice(0, 8).map((c, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className="h-3 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: j === 0 ? 40 : j === 1 ? 100 : 60 }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>

            /* Error state */
            ) : error ? (
              <tbody>
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-12 text-center">
                    <div className="text-sm font-medium" style={{ color: '#f87171' }}>
                      Failed to load fundamentals
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#475569' }}>
                      {(error as Error).message}
                    </div>
                    <button onClick={() => refetch()} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}>
                      Retry
                    </button>
                  </td>
                </tr>
              </tbody>

            /* Empty state */
            ) : sortedRows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-12 text-center">
                    <div className="text-sm font-medium" style={{ color: '#475569' }}>
                      No open portfolio holdings found.
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#334155' }}>
                      Add holdings to see fundamental data here.
                    </div>
                  </td>
                </tr>
              </tbody>

            /* Data rows */
            ) : (
              <tbody>
                {sortedRows.map((row, i) => {
                  const sym = (getField(row, 'symbol', ['ticker', 'stock']) as string) ?? `row-${i}`;
                  const isUnavail = unavailable.includes(sym);
                  return (
                    <tr key={sym}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', opacity: isUnavail ? 0.5 : 1 }}
                      className="transition-colors hover:bg-white/[0.025]">
                      {visibleColumns.map(c => (
                        <td key={c.key} className="px-3 py-2.5 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {renderCell(row, c)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
      </div>

      {/* Refreshing indicator when re-fetching with stale data */}
      {isFetching && !isLoading && (
        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#334155' }}>
          <Loader2 className="w-3 h-3 animate-spin" /> Refreshing fundamentals…
        </div>
      )}
    </div>
  );
}
