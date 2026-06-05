import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown, ChevronRight, ExternalLink, RefreshCw,
  AlertTriangle, Save, Trash2, Bookmark, X, Filter, BarChart3,
} from "lucide-react";
import { useSetPageContext } from "@/hooks/useSetPageContext";

/* ── Color constants (same palette as watchlist) ───────────────────────── */
const C = {
  bg: '#080c13', card: '#0d1623', card2: '#0a1020',
  border: '#1a2540', text: '#e2e8f0', dim: '#64748b',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  font: "'JetBrains Mono','Fira Code',monospace",
};

/* ── Types ──────────────────────────────────────────────────────────────── */
interface RadarSymbol {
  ticker:                string;
  tradingview_symbol?:   string;
  company_name?:         string;
  theme?:                string;
  market_cap_bucket?:    string;
  leader_tier?:          string;
  price?:                number | null;
  daily_change_pct?:     number | null;
  relative_volume?:      number | null;
  portfolio_weight_pct?: number | null;
  watchlist_section?:    string;
}

interface RadarGroup {
  key:     string;
  label:   string;
  count:   number;
  summary: {
    avg_change_pct?:             number | null;
    avg_relative_volume?:        number | null;
    total_portfolio_weight_pct?: number | null;
  };
  symbols: RadarSymbol[];
}

interface RadarResponse {
  source:   string;
  group_by: string;
  count:    number;
  groups:   RadarGroup[];
  warnings: string[];
}

interface FlatGroup extends RadarGroup {
  filteredSymbols: RadarSymbol[];
}

interface SavedView {
  id:       string;
  name:     string;
  source:   string;
  group_by: string;
  sort:     string;
  columns:  number;
  interval: string;
  compact:  boolean;
  filters?: Record<string, string>;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function buildTvUrl(symbol: string, interval: string): string {
  const tvInterval = interval === '30m' ? '30' : interval === '1h' ? '60' : interval;
  const enc = encodeURIComponent(symbol.trim().toUpperCase());
  return (
    `https://s.tradingview.com/embed-widget/advanced-chart/` +
    `?locale=en&symbol=${enc}&interval=${tvInterval}&range=3M&style=1` +
    `&toolbar_bg=0d1623&theme=dark&timezone=exchange` +
    `&withdateranges=true&hide_side_toolbar=false&hide_top_toolbar=false` +
    `&allow_symbol_change=false&enable_publishing=false&calendar=false`
  );
}

function fmtPrice(p?: number | null): string {
  if (p == null) return '—';
  return p >= 1000
    ? `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${p.toFixed(2)}`;
}

function fmtPct(p?: number | null): string | null {
  if (p == null) return null;
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

function fmtRelvol(r?: number | null): string {
  if (r == null) return '—';
  return `${r.toFixed(1)}x`;
}

function getToken(): string {
  return localStorage.getItem('caelyn_jwt') || sessionStorage.getItem('caelyn_jwt') || '';
}

const MKT_CAP_ORDER: Record<string, number> = {
  Mega: 0, Large: 1, Mid: 2, Small: 3, Micro: 4, Nano: 5,
};

const LEADER_TIER_ORDER: Record<string, number> = {
  'Market Leader': 0, 'Sector Leader': 1, 'Emerging Leader': 2,
  'Niche Breakout': 3, 'Watch List': 4,
};

/* ── Button style helpers ───────────────────────────────────────────────── */
const btnBase: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, fontFamily: C.font,
  padding: '4px 10px', borderRadius: 3, cursor: 'pointer',
  border: `1px solid ${C.border}`, letterSpacing: '0.06em',
  background: 'transparent', transition: 'all 0.1s',
};
const activeBtn = (color = C.teal): React.CSSProperties => ({
  ...btnBase, color, background: color + '20', borderColor: color + '40',
});
const inactiveBtn: React.CSSProperties = {
  ...btnBase, color: C.dim, background: 'transparent', borderColor: C.border,
};
const selectStyle: React.CSSProperties = {
  fontSize: 9, fontFamily: C.font, fontWeight: 600,
  background: C.card, border: `1px solid ${C.border}`,
  color: C.text, borderRadius: 3, padding: '4px 24px 4px 8px',
  cursor: 'pointer', outline: 'none', appearance: 'none',
};

/* ── RadarChartCard ─────────────────────────────────────────────────────── */
interface RadarChartCardProps {
  sym:      RadarSymbol;
  interval: string;
  compact:  boolean;
  source:   string;
}

function RadarChartCard({ sym, interval, compact, source }: RadarChartCardProps) {
  const tvSym  = sym.tradingview_symbol || sym.ticker;
  const pctStr = fmtPct(sym.daily_change_pct);
  const pctCol = sym.daily_change_pct == null ? C.dim
    : sym.daily_change_pct >= 0 ? C.green : C.red;
  const rvCol  = sym.relative_volume == null ? C.dim
    : sym.relative_volume >= 2 ? C.amber
    : sym.relative_volume >= 1.5 ? C.teal : C.dim;

  const chartHeight = compact ? 210 : 340;

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 6,
      background: C.card, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Card header */}
      <div style={{
        padding: '7px 10px', borderBottom: `1px solid ${C.border}`,
        background: C.card2, display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        {/* Row 1: ticker · price · change · TV link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 800, color: C.teal,
            fontFamily: C.font, letterSpacing: '0.05em',
          }}>
            {sym.ticker}
          </span>
          {sym.price != null && (
            <span style={{ fontSize: 10, color: C.text, fontFamily: C.font }}>
              {fmtPrice(sym.price)}
            </span>
          )}
          {pctStr && (
            <span style={{ fontSize: 9, fontWeight: 700, color: pctCol, fontFamily: C.font }}>
              {pctStr}
            </span>
          )}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSym)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: 'auto', color: C.dim, lineHeight: 0 }}
            title="Open on TradingView"
          >
            <ExternalLink style={{ width: 9, height: 9 }} />
          </a>
        </div>

        {/* Row 2: company name */}
        {sym.company_name && (
          <div style={{
            fontSize: 9, color: C.dim, fontFamily: C.font,
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {sym.company_name}
          </div>
        )}

        {/* Row 3: badges (full mode) */}
        {!compact && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {sym.theme && (
              <span title={sym.theme} style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font,
                padding: '1px 5px', borderRadius: 3,
                color: C.purple, background: C.purple + '15', border: `1px solid ${C.purple}25`,
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {sym.theme}
              </span>
            )}
            {sym.market_cap_bucket && (
              <span style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font,
                padding: '1px 5px', borderRadius: 3,
                color: C.blue, background: C.blue + '15', border: `1px solid ${C.blue}25`,
              }}>
                {sym.market_cap_bucket}
              </span>
            )}
            {sym.leader_tier && (
              <span title={sym.leader_tier} style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font,
                padding: '1px 5px', borderRadius: 3,
                color: C.amber, background: C.amber + '15', border: `1px solid ${C.amber}25`,
                maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {sym.leader_tier}
              </span>
            )}
            {sym.relative_volume != null && (
              <span style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font,
                padding: '1px 5px', borderRadius: 3,
                color: rvCol, background: rvCol + '15', border: `1px solid ${rvCol}25`,
              }}>
                {fmtRelvol(sym.relative_volume)} rvol
              </span>
            )}
            {source === 'portfolio' && sym.portfolio_weight_pct != null && (
              <span style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font,
                padding: '1px 5px', borderRadius: 3,
                color: C.green, background: C.green + '15', border: `1px solid ${C.green}25`,
              }}>
                {sym.portfolio_weight_pct.toFixed(1)}% wt
              </span>
            )}
          </div>
        )}

        {/* Compact mode: inline stats */}
        {compact && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {sym.relative_volume != null && (
              <span style={{ fontSize: 8, color: rvCol, fontFamily: C.font }}>
                {fmtRelvol(sym.relative_volume)} rvol
              </span>
            )}
            {source === 'portfolio' && sym.portfolio_weight_pct != null && (
              <span style={{ fontSize: 8, color: C.green, fontFamily: C.font }}>
                {sym.portfolio_weight_pct.toFixed(1)}% wt
              </span>
            )}
            {sym.market_cap_bucket && (
              <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font }}>
                {sym.market_cap_bucket}
              </span>
            )}
          </div>
        )}
      </div>

      {/* TradingView iframe — only mounted when parent group is expanded */}
      <div style={{ height: chartHeight, position: 'relative', flexShrink: 0 }}>
        <iframe
          key={`${sym.ticker}-${tvSym}-${interval}`}
          src={buildTvUrl(tvSym, interval)}
          title={sym.ticker}
          allowFullScreen
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            border: 0, background: C.card,
          }}
        />
      </div>
    </div>
  );
}

/* ── GroupSection ───────────────────────────────────────────────────────── */
interface GroupSectionProps {
  group:      RadarGroup;
  symbols:    RadarSymbol[];
  expanded:   boolean;
  onToggle:   () => void;
  limit:      number;
  onLoadMore: () => void;
  cols:       number;
  compact:    boolean;
  interval:   string;
  source:     string;
}

function GroupSection({
  group, symbols, expanded, onToggle, limit, onLoadMore,
  cols, compact, interval, source,
}: GroupSectionProps) {
  const visible  = symbols.slice(0, limit);
  const hasMore  = symbols.length > limit;
  const s        = group.summary;
  const pctStr   = fmtPct(s.avg_change_pct);
  const hasRV    = s.avg_relative_volume != null;
  const hasWt    = source === 'portfolio' && s.total_portfolio_weight_pct != null;
  const pctCol   = (s.avg_change_pct ?? 0) >= 0 ? C.green : C.red;

  return (
    <div style={{ marginBottom: 6 }}>
      {/* Group header */}
      <div
        role="button"
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', cursor: 'pointer',
          background: expanded ? C.card2 : C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: expanded ? '4px 4px 0 0' : 4,
          userSelect: 'none',
        }}
      >
        {expanded
          ? <ChevronDown  style={{ width: 12, height: 12, color: C.dim, flexShrink: 0 }} />
          : <ChevronRight style={{ width: 12, height: 12, color: C.dim, flexShrink: 0 }} />
        }
        <span style={{
          fontSize: 11, fontWeight: 800, color: C.text,
          fontFamily: C.font, letterSpacing: '0.08em',
        }}>
          {group.label}
        </span>
        <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>
          ({symbols.length}{symbols.length !== group.count ? `/${group.count}` : ''})
        </span>
        {hasRV && (
          <span style={{
            fontSize: 8, color: C.amber, fontFamily: C.font,
            padding: '1px 5px', borderRadius: 3,
            background: C.amber + '12', border: `1px solid ${C.amber}20`,
          }}>
            avg {fmtRelvol(s.avg_relative_volume)} rvol
          </span>
        )}
        {pctStr && (
          <span style={{
            fontSize: 8, fontWeight: 700, color: pctCol, fontFamily: C.font,
            padding: '1px 5px', borderRadius: 3,
            background: pctCol + '12', border: `1px solid ${pctCol}20`,
          }}>
            {pctStr}
          </span>
        )}
        {hasWt && (
          <span style={{
            fontSize: 8, color: C.teal, fontFamily: C.font,
            padding: '1px 5px', borderRadius: 3,
            background: C.teal + '12', border: `1px solid ${C.teal}20`,
          }}>
            {(s.total_portfolio_weight_pct ?? 0).toFixed(1)}% portfolio
          </span>
        )}
      </div>

      {/* Chart grid — only rendered when expanded (lazy iframe mounting) */}
      {expanded && (
        <div style={{
          border: `1px solid ${C.border}`, borderTop: 'none',
          borderRadius: '0 0 4px 4px', background: C.bg, padding: 10,
        }}>
          {visible.length === 0 ? (
            <div style={{
              padding: 20, textAlign: 'center',
              fontSize: 11, color: C.dim, fontFamily: C.font,
            }}>
              No symbols match current filters in this group.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${visible.length === 1 ? 1 : cols}, 1fr)`,
              gap: 10,
            }}>
              {visible.map(sym => (
                <RadarChartCard
                  key={sym.ticker}
                  sym={sym}
                  interval={interval}
                  compact={compact}
                  source={source}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                onClick={e => { e.stopPropagation(); onLoadMore(); }}
                style={{
                  ...btnBase,
                  color: C.teal, background: C.teal + '15',
                  border: `1px solid ${C.teal}30`,
                  padding: '5px 18px',
                }}
              >
                LOAD MORE ({symbols.length - limit} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function ChartRadarPage() {
  /* Controls */
  const [source,          setSource]          = useState<'watchlist' | 'portfolio'>('watchlist');
  const [groupBy,         setGroupBy]         = useState('theme');
  const [sort,            setSort]            = useState('ticker');
  const [cols,            setCols]            = useState<number>(3);
  const [compact,         setCompact]         = useState(false);
  const [chartInterval,   setChartInterval]   = useState('D');
  const [filtersOpen,     setFiltersOpen]     = useState(false);
  const [filterSearch,    setFilterSearch]    = useState('');
  const [filterTheme,     setFilterTheme]     = useState('');
  const [filterMktCap,    setFilterMktCap]    = useState('');
  const [filterLeaderTier,setFilterLeaderTier]= useState('');
  const [filterMinRelVol, setFilterMinRelVol] = useState('');

  /* Expand / load-more */
  const [expandedGroups, setExpandedGroups]   = useState<Set<string>>(new Set());
  const [groupLimits,    setGroupLimits]      = useState<Record<string, number>>({});

  /* Saved views */
  const [viewsOpen,    setViewsOpen]    = useState(false);
  const [newViewName,  setNewViewName]  = useState('');
  const [viewSaving,   setViewSaving]   = useState(false);

  /* Page context for AI chatbot */
  useSetPageContext((() => ({
    page: 'chart_radar',
    description: 'Chart Radar — TradingView chart grid organized into collapsible groups (theme, market cap, leader tier, etc.)',
    source, group_by: groupBy,
  }))());

  /* ── Universe query ─────────────────────────────────────────────────── */
  const { data, isLoading, isError, isFetching, refetch } = useQuery<RadarResponse>({
    queryKey: ['/api/chart-radar/universe', source, groupBy],
    queryFn: async () => {
      const qs = new URLSearchParams({ source, group_by: groupBy });
      const r  = await fetch(`/api/chart-radar/universe?${qs}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  /* ── Saved views query ──────────────────────────────────────────────── */
  const { data: savedViews = [], refetch: refetchViews } = useQuery<SavedView[]>({
    queryKey: ['/api/chart-radar/views'],
    queryFn: async () => {
      const token = getToken();
      const r = await fetch('/api/chart-radar/views', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return [];
      const d = await r.json();
      return Array.isArray(d) ? d : (d.views ?? []);
    },
    staleTime: 60_000,
  });

  /* ── Auto-expand first group when data changes ──────────────────────── */
  const lastDataKey = useRef('');
  useEffect(() => {
    if (!data) return;
    const key = `${source}-${groupBy}-${data.count}`;
    if (key === lastDataKey.current) return;
    lastDataKey.current = key;
    const firstKey = data.groups?.[0]?.key;
    setExpandedGroups(firstKey ? new Set([firstKey]) : new Set());
    setGroupLimits({});
  }, [data, source, groupBy]);

  /* ── Filter option sets ─────────────────────────────────────────────── */
  const allThemes = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    for (const g of data.groups) for (const sym of g.symbols) if (sym.theme) s.add(sym.theme);
    return [...s].sort();
  }, [data]);

  const allMktCaps = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    for (const g of data.groups) for (const sym of g.symbols) if (sym.market_cap_bucket) s.add(sym.market_cap_bucket);
    return [...s].sort((a, b) => (MKT_CAP_ORDER[a] ?? 99) - (MKT_CAP_ORDER[b] ?? 99));
  }, [data]);

  const allLeaderTiers = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    for (const g of data.groups) for (const sym of g.symbols) if (sym.leader_tier) s.add(sym.leader_tier);
    return [...s].sort((a, b) => (LEADER_TIER_ORDER[a] ?? 99) - (LEADER_TIER_ORDER[b] ?? 99));
  }, [data]);

  const hasAnyChange = useMemo(
    () => !!data?.groups.some(g => g.symbols.some(s => s.daily_change_pct != null)),
    [data],
  );

  /* ── Filter + sort symbols per group ────────────────────────────────── */
  const filteredGroups = useMemo<FlatGroup[]>(() => {
    if (!data) return [];
    const search = filterSearch.trim().toLowerCase();
    const minRV  = parseFloat(filterMinRelVol) || 0;

    return data.groups.flatMap<FlatGroup>(g => {
      let syms = g.symbols.filter(sym => {
        if (search && !(
          sym.ticker.toLowerCase().includes(search) ||
          (sym.company_name ?? '').toLowerCase().includes(search)
        )) return false;
        if (filterTheme      && sym.theme             !== filterTheme)      return false;
        if (filterMktCap     && sym.market_cap_bucket !== filterMktCap)     return false;
        if (filterLeaderTier && sym.leader_tier        !== filterLeaderTier) return false;
        if (minRV > 0 && (sym.relative_volume == null || sym.relative_volume < minRV)) return false;
        return true;
      });

      syms = [...syms].sort((a, b) => {
        switch (sort) {
          case 'relvol':  return (b.relative_volume     ?? 0)   - (a.relative_volume     ?? 0);
          case 'mktcap':  return (MKT_CAP_ORDER[a.market_cap_bucket ?? ''] ?? 99) - (MKT_CAP_ORDER[b.market_cap_bucket ?? ''] ?? 99);
          case 'weight':  return (b.portfolio_weight_pct ?? 0)   - (a.portfolio_weight_pct ?? 0);
          case 'price':   return (b.price                ?? 0)   - (a.price                ?? 0);
          case 'change':  return (b.daily_change_pct      ?? -999) - (a.daily_change_pct    ?? -999);
          default:        return a.ticker.localeCompare(b.ticker);
        }
      });

      if (syms.length === 0) return [];
      return [{ ...g, filteredSymbols: syms }];
    });
  }, [data, filterSearch, filterTheme, filterMktCap, filterLeaderTier, filterMinRelVol, sort]);

  /* ── Expand / collapse ──────────────────────────────────────────────── */
  const toggleGroup  = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const expandAll   = useCallback(() => {
    if (data) setExpandedGroups(new Set(data.groups.map(g => g.key)));
  }, [data]);

  const collapseAll = useCallback(() => setExpandedGroups(new Set()), []);

  const loadMore = useCallback((key: string) => {
    setGroupLimits(prev => ({ ...prev, [key]: (prev[key] ?? 6) + 6 }));
  }, []);

  /* ── Saved views ────────────────────────────────────────────────────── */
  const applyView = useCallback((v: SavedView) => {
    setSource(v.source as 'watchlist' | 'portfolio');
    setGroupBy(v.group_by);
    setSort(v.sort);
    setCols(v.columns);
    setCompact(v.compact);
    setChartInterval(v.interval);
    if (v.filters) {
      setFilterSearch(v.filters.search ?? '');
      setFilterTheme(v.filters.theme ?? '');
      setFilterMktCap(v.filters.mktcap ?? '');
      setFilterLeaderTier(v.filters.leaderTier ?? '');
      setFilterMinRelVol(v.filters.minRelVol ?? '');
    }
    setViewsOpen(false);
  }, []);

  const saveView = useCallback(async () => {
    if (!newViewName.trim()) return;
    setViewSaving(true);
    try {
      const token = getToken();
      await fetch('/api/chart-radar/views', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: newViewName.trim(),
          source, group_by: groupBy, sort, columns: cols,
          interval: chartInterval, compact,
          filters: {
            search: filterSearch, theme: filterTheme,
            mktcap: filterMktCap, leaderTier: filterLeaderTier,
            minRelVol: filterMinRelVol,
          },
        }),
      });
      setNewViewName('');
      refetchViews();
    } finally {
      setViewSaving(false);
    }
  }, [newViewName, source, groupBy, sort, cols, chartInterval, compact,
      filterSearch, filterTheme, filterMktCap, filterLeaderTier, filterMinRelVol, refetchViews]);

  const deleteView = useCallback(async (id: string) => {
    const token = getToken();
    await fetch(`/api/chart-radar/views/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    refetchViews();
  }, [refetchViews]);

  /* ── Derived UI flags ───────────────────────────────────────────────── */
  const hasFilters = !!(filterSearch || filterTheme || filterMktCap || filterLeaderTier || filterMinRelVol);
  const activeFilterCount = [filterSearch, filterTheme, filterMktCap, filterLeaderTier, filterMinRelVol].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setFilterSearch(''); setFilterTheme(''); setFilterMktCap('');
    setFilterLeaderTier(''); setFilterMinRelVol('');
  }, []);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{
      background: C.bg, minHeight: '100vh', color: C.text,
      fontFamily: C.font, display: 'flex', flexDirection: 'column',
    }}>

      {/* ── Top Control Bar ─────────────────────────────────────────────── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>

        {/* Row 1: title · source · group-by · sort · saved views · refresh */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', flexWrap: 'wrap',
        }}>
          <span style={{
            fontSize: 13, fontWeight: 900, color: '#fff',
            letterSpacing: '0.12em', marginRight: 4, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <BarChart3 style={{ width: 14, height: 14, color: C.teal }} />
            CHART RADAR
          </span>

          {/* Source toggle */}
          <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
            {(['watchlist', 'portfolio'] as const).map(s => (
              <button key={s} onClick={() => setSource(s)}
                style={source === s ? activeBtn(C.teal) : inactiveBtn}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Group by */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>GROUP</span>
            <div style={{ position: 'relative' }}>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={selectStyle}>
                <option value="theme">Theme</option>
                <option value="market_cap">Market Cap</option>
                <option value="leader_tier">Leader Tier</option>
                <option value="watchlist_section">WL Section</option>
                <option value="portfolio_weight">Portfolio Wt</option>
                <option value="none">None</option>
              </select>
              <ChevronDown style={{
                width: 10, height: 10, position: 'absolute',
                right: 6, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: C.dim,
              }} />
            </div>
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>SORT</span>
            <div style={{ position: 'relative' }}>
              <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
                <option value="ticker">Ticker A–Z</option>
                <option value="relvol">Rel Vol ↓</option>
                <option value="mktcap">Market Cap</option>
                <option value="weight">Port Weight ↓</option>
                <option value="price">Price ↓</option>
                {hasAnyChange && <option value="change">Daily % ↓</option>}
              </select>
              <ChevronDown style={{
                width: 10, height: 10, position: 'absolute',
                right: 6, top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: C.dim,
              }} />
            </div>
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setFiltersOpen(f => !f)}
            style={{
              ...(hasFilters ? activeBtn(C.amber) : filtersOpen ? activeBtn(C.teal) : inactiveBtn),
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Filter style={{ width: 9, height: 9 }} />
            FILTER{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>

          {/* Saved views */}
          <button
            onClick={() => setViewsOpen(v => !v)}
            style={{
              ...(viewsOpen ? activeBtn(C.teal) : inactiveBtn),
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <Bookmark style={{ width: 9, height: 9 }} />
            VIEWS{savedViews.length > 0 ? ` (${savedViews.length})` : ''}
          </button>

          {/* Refresh */}
          <button onClick={() => refetch()} style={{ ...inactiveBtn, display: 'flex', alignItems: 'center', gap: 3 }}>
            <RefreshCw style={{ width: 9, height: 9, ...(isFetching ? { animation: 'spin 1s linear infinite' } : {}) }} />
            {isFetching ? 'LOADING…' : 'REFRESH'}
          </button>

          {/* Count */}
          {data && (
            <span style={{ fontSize: 9, color: C.dim, marginLeft: 2 }}>
              {data.count.toLocaleString()} symbols · {filteredGroups.length} groups
            </span>
          )}
        </div>

        {/* Row 2: layout · interval · expand/collapse */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 16px 10px', flexWrap: 'wrap',
          borderTop: `1px solid ${C.border}05`,
        }}>
          {/* Columns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>COLS</span>
            {([2, 3, 4] as const).map(n => (
              <button key={n} onClick={() => setCols(n)}
                style={cols === n ? activeBtn(C.teal) : inactiveBtn}>
                {n}
              </button>
            ))}
          </div>

          {/* Compact */}
          <button onClick={() => setCompact(c => !c)}
            style={compact ? activeBtn(C.purple) : inactiveBtn}>
            COMPACT
          </button>

          {/* Interval */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>INTERVAL</span>
            {(['30m', '1h', 'D', 'W', 'M'] as const).map(iv => (
              <button key={iv} onClick={() => setChartInterval(iv)}
                style={chartInterval === iv ? activeBtn(C.teal) : inactiveBtn}>
                {iv}
              </button>
            ))}
          </div>

          {/* Expand / Collapse All */}
          <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
            <button onClick={expandAll}   style={inactiveBtn}>EXPAND ALL</button>
            <button onClick={collapseAll} style={inactiveBtn}>COLLAPSE ALL</button>
          </div>
        </div>

        {/* Row 3: Filters (collapsible) */}
        {filtersOpen && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px 11px', flexWrap: 'wrap',
            borderTop: `1px solid ${C.border}`,
            background: C.card2,
          }}>
            {/* Search */}
            <input
              placeholder="Search ticker / company…"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              style={{
                fontSize: 9, fontFamily: C.font, background: C.bg,
                border: `1px solid ${C.border}`, color: C.text,
                borderRadius: 3, padding: '4px 8px', outline: 'none', width: 180,
              }}
            />

            {/* Theme */}
            {allThemes.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select value={filterTheme} onChange={e => setFilterTheme(e.target.value)} style={selectStyle}>
                  <option value="">All Themes</option>
                  {allThemes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.dim }} />
              </div>
            )}

            {/* Market Cap */}
            {allMktCaps.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select value={filterMktCap} onChange={e => setFilterMktCap(e.target.value)} style={selectStyle}>
                  <option value="">All Sizes</option>
                  {allMktCaps.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.dim }} />
              </div>
            )}

            {/* Leader Tier */}
            {allLeaderTiers.length > 0 && (
              <div style={{ position: 'relative' }}>
                <select value={filterLeaderTier} onChange={e => setFilterLeaderTier(e.target.value)} style={selectStyle}>
                  <option value="">All Tiers</option>
                  {allLeaderTiers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.dim }} />
              </div>
            )}

            {/* Min RelVol */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>MIN RVOL</span>
              <input
                placeholder="e.g. 1.5"
                value={filterMinRelVol}
                onChange={e => setFilterMinRelVol(e.target.value)}
                style={{
                  fontSize: 9, fontFamily: C.font, background: C.bg,
                  border: `1px solid ${C.border}`, color: C.text,
                  borderRadius: 3, padding: '4px 8px', outline: 'none', width: 60,
                }}
              />
            </div>

            {/* Clear all */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                style={{
                  ...btnBase, color: C.red, background: C.red + '10',
                  borderColor: C.red + '30', display: 'flex', alignItems: 'center', gap: 3,
                }}
              >
                <X style={{ width: 8, height: 8 }} /> CLEAR
              </button>
            )}
          </div>
        )}

        {/* Row 4: Saved views panel (collapsible) */}
        {viewsOpen && (
          <div style={{
            borderTop: `1px solid ${C.border}`,
            padding: '10px 16px 12px',
            display: 'flex', alignItems: 'flex-start', gap: 12, background: C.card2,
          }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              {savedViews.length === 0 && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>
                  No saved views yet.
                </span>
              )}
              {savedViews.map(v => (
                <div key={v.id} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px 3px 10px', borderRadius: 3,
                  border: `1px solid ${C.border}`, background: C.bg,
                }}>
                  <button
                    onClick={() => applyView(v)}
                    style={{
                      fontSize: 9, color: C.teal, fontFamily: C.font,
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    }}
                  >
                    {v.name}
                  </button>
                  <button
                    onClick={() => deleteView(v.id)}
                    title="Delete view"
                    style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: C.dim, lineHeight: 0, marginLeft: 2 }}
                  >
                    <Trash2 style={{ width: 9, height: 9 }} />
                  </button>
                </div>
              ))}
            </div>
            {/* Save current config */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <input
                placeholder="View name…"
                value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveView()}
                style={{
                  fontSize: 9, fontFamily: C.font, background: C.bg,
                  border: `1px solid ${C.border}`, color: C.text,
                  borderRadius: 3, padding: '4px 8px', outline: 'none', width: 130,
                }}
              />
              <button
                onClick={saveView}
                disabled={!newViewName.trim() || viewSaving}
                style={{
                  ...btnBase,
                  color: newViewName.trim() ? C.teal : C.dim,
                  background: newViewName.trim() ? C.teal + '18' : 'transparent',
                  borderColor: newViewName.trim() ? C.teal + '40' : C.border,
                  display: 'flex', alignItems: 'center', gap: 3,
                  opacity: viewSaving ? 0.5 : 1,
                }}
              >
                <Save style={{ width: 9, height: 9 }} />
                {viewSaving ? 'SAVING…' : 'SAVE'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

        {/* Warnings */}
        {data?.warnings && data.warnings.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 12px', marginBottom: 10, borderRadius: 4,
            background: C.amber + '10', border: `1px solid ${C.amber}25`,
          }}>
            <AlertTriangle style={{ width: 11, height: 11, color: C.amber, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: C.amber, fontFamily: C.font }}>
              {data.warnings.join(' · ')}
            </span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div style={{ padding: 80, textAlign: 'center', color: C.dim, fontSize: 11, fontFamily: C.font }}>
            Loading chart universe…
          </div>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div style={{
            padding: 40, textAlign: 'center', borderRadius: 6,
            border: `1px solid ${C.red}30`, background: C.red + '08',
          }}>
            <AlertTriangle style={{ width: 22, height: 22, color: C.red, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 11, color: C.red, fontFamily: C.font, marginBottom: 12 }}>
              Failed to load chart universe. Check backend connectivity.
            </div>
            <button onClick={() => refetch()} style={{ ...btnBase, color: C.teal, background: C.teal + '15', borderColor: C.teal + '30' }}>
              RETRY
            </button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && data && filteredGroups.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: C.dim, fontSize: 11, fontFamily: C.font }}>
            {data.count === 0
              ? source === 'portfolio'
                ? 'No portfolio holdings found. Add holdings to see charts here.'
                : 'No symbols found for this source.'
              : 'No symbols match the current filters.'}
          </div>
        )}

        {/* Groups */}
        {!isLoading && filteredGroups.map(g => (
          <GroupSection
            key={g.key}
            group={g}
            symbols={g.filteredSymbols}
            expanded={expandedGroups.has(g.key)}
            onToggle={() => toggleGroup(g.key)}
            limit={groupLimits[g.key] ?? 6}
            onLoadMore={() => loadMore(g.key)}
            cols={cols}
            compact={compact}
            interval={chartInterval}
            source={source}
          />
        ))}
      </div>
    </div>
  );
}
