import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import MultiChartsPage from "./multicharts";
import {
  ChevronDown, ChevronRight, ExternalLink,
  AlertTriangle, BarChart3, Columns2, Rows2,
} from "lucide-react";
import { useSetPageContext } from "@/hooks/useSetPageContext";

/* ── Color constants ────────────────────────────────────────────────────── */
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
  relative_volume?:      number | null;
  portfolio_weight_pct?: number | null;
  watchlist_section?:    string;
}

interface RadarGroup {
  key:     string;
  label:   string;
  count:   number;
  summary: {
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

/* ── TradingView URL — exact same params as MultiCharts page ────────────── */
function buildTvUrl(symbol: string, interval: string): string {
  const tvInterval = interval === '30m' ? '30' : interval === '1h' ? '60' : interval;
  const enc = encodeURIComponent(symbol.trim().toUpperCase());
  return (
    `https://s.tradingview.com/embed-widget/advanced-chart/` +
    `?locale=en` +
    `&symbol=${enc}` +
    `&interval=${tvInterval}` +
    `&range=3M` +
    `&style=1` +
    `&toolbar_bg=0d1623` +
    `&theme=dark` +
    `&timezone=exchange` +
    `&withdateranges=true` +
    `&hide_side_toolbar=true` +
    `&hide_top_toolbar=false` +
    `&allow_symbol_change=true` +
    `&enable_publishing=false` +
    `&calendar=false` +
    `&studies=%5B%5D` +
    `&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D` +
    `&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%5D`
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtPrice(p?: number | null): string {
  if (p == null) return '—';
  return p >= 1000 ? `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${p.toFixed(2)}`;
}

function fmtRelvol(r?: number | null): string {
  if (r == null) return '—';
  return `${r.toFixed(1)}x`;
}

const MKT_CAP_ORDER: Record<string, number> = {
  Mega: 0, Large: 1, Mid: 2, Small: 3, Micro: 4, Nano: 5,
};

/* ── Button helpers ─────────────────────────────────────────────────────── */
const btnBase: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, fontFamily: C.font,
  padding: '4px 10px', borderRadius: 3, cursor: 'pointer',
  border: `1px solid ${C.border}`, letterSpacing: '0.06em',
  background: 'transparent',
};

function activeBtn(color = C.teal): React.CSSProperties {
  return { ...btnBase, color, background: color + '20', borderColor: color + '40' };
}

const inactiveBtn: React.CSSProperties = {
  ...btnBase, color: C.dim,
};

const selectStyle: React.CSSProperties = {
  fontSize: 9, fontFamily: C.font, fontWeight: 600,
  background: C.card, border: `1px solid ${C.border}`,
  color: C.text, borderRadius: 3, padding: '4px 24px 4px 8px',
  cursor: 'pointer', outline: 'none', appearance: 'none',
};

/* ── RadarChartCard ─────────────────────────────────────────────────────── */
interface RadarChartCardProps {
  sym:          RadarSymbol;
  interval:     string;
  compact:      boolean;
  source:       string;
  staggerIndex: number;
}

const RadarChartCard = memo(function RadarChartCard({ sym, interval, compact, source, staggerIndex }: RadarChartCardProps) {
  const tvSym = sym.tradingview_symbol || sym.ticker;
  const rvCol = sym.relative_volume == null ? C.dim
    : sym.relative_volume >= 2   ? C.amber
    : sym.relative_volume >= 1.5 ? C.teal : C.dim;

  /* ── IntersectionObserver + stagger: iframe mounts 1s apart top-to-bottom */
  const cardRef        = useRef<HTMLDivElement>(null);
  const [iframeMounted, setIframeMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Reset when symbol or interval changes so stale iframe doesn't persist */
  const prevKeyRef = useRef('');
  const stableKey  = `${tvSym}||${interval}`;
  if (prevKeyRef.current !== stableKey) {
    prevKeyRef.current = stableKey;
    if (iframeMounted) setIframeMounted(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }

  useEffect(() => {
    const el = cardRef.current;
    if (!el || iframeMounted) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          obs.disconnect();
          /* Stagger: each card waits staggerIndex × 1 000 ms before mounting */
          timerRef.current = setTimeout(() => setIframeMounted(true), staggerIndex * 1000);
        }
      },
      { rootMargin: '300px 0px' },
    );
    obs.observe(el);
    return () => { obs.disconnect(); if (timerRef.current) clearTimeout(timerRef.current); };
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [stableKey, iframeMounted, staggerIndex]);

  return (
    <div style={{
      border: `1px solid ${C.border}`, borderRadius: 6,
      background: C.card, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '7px 10px', borderBottom: `1px solid ${C.border}`,
        background: C.card2, display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.teal, fontFamily: C.font, letterSpacing: '0.05em' }}>
            {sym.ticker}
          </span>
          {sym.price != null && (
            <span style={{ fontSize: 10, color: C.text, fontFamily: C.font }}>
              {fmtPrice(sym.price)}
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

        {sym.company_name && (
          <div style={{
            fontSize: 9, color: C.dim, fontFamily: C.font,
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {sym.company_name}
          </div>
        )}

        {!compact && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {sym.theme && (
              <span title={sym.theme} style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font, padding: '1px 5px', borderRadius: 3,
                color: C.purple, background: C.purple + '15', border: `1px solid ${C.purple}25`,
                maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {sym.theme}
              </span>
            )}
            {sym.market_cap_bucket && (
              <span style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font, padding: '1px 5px', borderRadius: 3,
                color: C.blue, background: C.blue + '15', border: `1px solid ${C.blue}25`,
              }}>
                {sym.market_cap_bucket}
              </span>
            )}
            {sym.leader_tier && (
              <span title={sym.leader_tier} style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font, padding: '1px 5px', borderRadius: 3,
                color: C.amber, background: C.amber + '15', border: `1px solid ${C.amber}25`,
                maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {sym.leader_tier}
              </span>
            )}
            {sym.relative_volume != null && (
              <span style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font, padding: '1px 5px', borderRadius: 3,
                color: rvCol, background: rvCol + '15', border: `1px solid ${rvCol}25`,
              }}>
                {fmtRelvol(sym.relative_volume)} rvol
              </span>
            )}
            {source === 'portfolio' && sym.portfolio_weight_pct != null && (
              <span style={{
                fontSize: 8, fontWeight: 600, fontFamily: C.font, padding: '1px 5px', borderRadius: 3,
                color: C.green, background: C.green + '15', border: `1px solid ${C.green}25`,
              }}>
                {sym.portfolio_weight_pct.toFixed(1)}% wt
              </span>
            )}
          </div>
        )}

        {compact && (
          <div style={{ display: 'flex', gap: 6 }}>
            {sym.relative_volume != null && (
              <span style={{ fontSize: 8, color: rvCol, fontFamily: C.font }}>
                {fmtRelvol(sym.relative_volume)} rvol
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

      {/* TradingView iframe — mounted only when card enters viewport */}
      <div
        ref={cardRef}
        style={{ height: compact ? 210 : 340, position: 'relative', flexShrink: 0, background: C.card2 }}
      >
        {iframeMounted ? (
          <iframe
            key={`${sym.ticker}-${interval}`}
            src={buildTvUrl(tvSym, interval)}
            title={sym.ticker}
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        ) : (
          /* Lightweight placeholder until IntersectionObserver fires */
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            color: C.dim, fontFamily: C.font,
          }}>
            <BarChart3 style={{ width: 22, height: 22, opacity: 0.25 }} />
            <span style={{ fontSize: 9, letterSpacing: '0.06em' }}>{sym.ticker}</span>
          </div>
        )}
      </div>
    </div>
  );
});

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
  const visible = symbols.slice(0, limit);
  const hasMore = symbols.length > limit;
  const s       = group.summary;
  const hasRV   = s.avg_relative_volume != null;
  const hasWt   = source === 'portfolio' && s.total_portfolio_weight_pct != null;

  return (
    <div style={{ marginBottom: 5 }}>
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
        <span style={{ fontSize: 11, fontWeight: 800, color: C.text, fontFamily: C.font, letterSpacing: '0.08em' }}>
          {group.label}
        </span>
        <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>
          ({symbols.length}{symbols.length !== group.count ? `/${group.count}` : ''})
        </span>
        {hasRV && (
          <span style={{
            fontSize: 8, color: C.amber, fontFamily: C.font, padding: '1px 5px', borderRadius: 3,
            background: C.amber + '12', border: `1px solid ${C.amber}20`,
          }}>
            avg {fmtRelvol(s.avg_relative_volume)} rvol
          </span>
        )}
        {hasWt && (
          <span style={{
            fontSize: 8, color: C.teal, fontFamily: C.font, padding: '1px 5px', borderRadius: 3,
            background: C.teal + '12', border: `1px solid ${C.teal}20`,
          }}>
            {(s.total_portfolio_weight_pct ?? 0).toFixed(1)}% portfolio
          </span>
        )}
      </div>

      {/* Chart grid — iframes only mount when expanded */}
      {expanded && (
        <div style={{
          border: `1px solid ${C.border}`, borderTop: 'none',
          borderRadius: '0 0 4px 4px', background: C.bg, padding: 10,
        }}>
          {visible.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim, fontFamily: C.font }}>
              No symbols match current filters in this group.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${visible.length === 1 ? 1 : cols}, 1fr)`,
              gap: 10,
            }}>
              {visible.map((sym, i) => (
                <RadarChartCard
                  key={sym.ticker}
                  sym={sym}
                  interval={interval}
                  compact={compact}
                  source={source}
                  staggerIndex={i}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <button
                onClick={e => { e.stopPropagation(); onLoadMore(); }}
                style={{ ...btnBase, color: C.teal, background: C.teal + '15', borderColor: C.teal + '30', padding: '5px 18px' }}
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

/* ── Compare Panel ──────────────────────────────────────────────────────── */
function ComparePanel() {
  const [layout,  setLayout]  = useState<'side-by-side' | 'top-bottom'>('side-by-side');
  const [input1,  setInput1]  = useState('AAPL');
  const [input2,  setInput2]  = useState('NVDA');
  const [sym1,    setSym1]    = useState('AAPL');
  const [sym2,    setSym2]    = useState('NVDA');

  const apply = () => {
    if (input1.trim()) setSym1(input1.trim().toUpperCase());
    if (input2.trim()) setSym2(input2.trim().toUpperCase());
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') apply();
  };

  const inputStyle: React.CSSProperties = {
    fontSize: 11, fontFamily: C.font, fontWeight: 700,
    background: C.card2, border: `1px solid ${C.border}`,
    color: C.teal, borderRadius: 3, padding: '4px 8px',
    outline: 'none', width: 100, letterSpacing: '0.06em',
    textTransform: 'uppercase',
  };

  const iframeStyle: React.CSSProperties = {
    flex: 1, border: 0, display: 'block', minHeight: 0, minWidth: 0,
  };

  const isHoriz = layout === 'side-by-side';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
        borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Symbol inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>CHART 1</span>
          <input
            value={input1}
            onChange={e => setInput1(e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="AAPL"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>CHART 2</span>
          <input
            value={input2}
            onChange={e => setInput2(e.target.value.toUpperCase())}
            onKeyDown={handleKey}
            placeholder="NVDA"
            style={inputStyle}
          />
        </div>
        <button
          onClick={apply}
          style={{ ...btnBase, color: C.teal, background: C.teal + '20', borderColor: C.teal + '40', padding: '4px 12px' }}
        >
          APPLY
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: C.border, margin: '0 4px' }} />

        {/* Layout toggle */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={() => setLayout('side-by-side')}
            title="Side by side"
            style={layout === 'side-by-side' ? activeBtn(C.purple) : inactiveBtn}
          >
            <Columns2 style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
            SIDE BY SIDE
          </button>
          <button
            onClick={() => setLayout('top-bottom')}
            title="Top and bottom"
            style={layout === 'top-bottom' ? activeBtn(C.purple) : inactiveBtn}
          >
            <Rows2 style={{ width: 10, height: 10, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
            TOP / BOTTOM
          </button>
        </div>

        <span style={{ fontSize: 8, color: C.dim, marginLeft: 'auto', letterSpacing: '0.04em' }}>
          You can also change the symbol directly inside each chart
        </span>
      </div>

      {/* Charts */}
      <div style={{
        display: 'flex',
        flexDirection: isHoriz ? 'row' : 'column',
        flex: 1, minHeight: 0, gap: 0,
      }}>
        {/* Chart 1 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, borderRight: isHoriz ? `1px solid ${C.border}` : 'none', borderBottom: !isHoriz ? `1px solid ${C.border}` : 'none' }}>
          <div style={{ padding: '5px 10px', background: C.card2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.teal, fontFamily: C.font, letterSpacing: '0.06em' }}>{sym1}</span>
          </div>
          <iframe
            key={`compare-1-${sym1}`}
            src={buildTvUrl(sym1, 'D')}
            title={`Compare Chart 1 — ${sym1}`}
            allowFullScreen
            style={iframeStyle}
          />
        </div>

        {/* Chart 2 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
          <div style={{ padding: '5px 10px', background: C.card2, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.teal, fontFamily: C.font, letterSpacing: '0.06em' }}>{sym2}</span>
          </div>
          <iframe
            key={`compare-2-${sym2}`}
            src={buildTvUrl(sym2, 'D')}
            title={`Compare Chart 2 — ${sym2}`}
            allowFullScreen
            style={iframeStyle}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function ChartRadarPage() {
  /* ── Tab: custom | watchlist | portfolio | compare ──────────────────── */
  const [tab, setTab] = useState<'custom' | 'watchlist' | 'portfolio' | 'compare'>('custom');
  /* Custom is the default tab — mount it immediately */
  const [customMounted,  setCustomMounted]  = useState(true);
  const [compareMounted, setCompareMounted] = useState(false);

  const handleTabChange = useCallback((t: 'custom' | 'watchlist' | 'portfolio' | 'compare') => {
    if (t === 'custom')  setCustomMounted(true);
    if (t === 'compare') setCompareMounted(true);
    setTab(t);
  }, []);

  /* Derive API source — falls back to watchlist for non-curated tabs */
  const source: 'watchlist' | 'portfolio' =
    tab === 'watchlist' || tab === 'portfolio' ? tab : 'watchlist';

  /* Core controls */
  const [groupBy, setGroupBy] = useState('theme');
  const [sort,    setSort]    = useState('ticker');

  /* Warnings collapse */
  const [warningsOpen, setWarningsOpen] = useState(false);

  /* Expand / load-more state */
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupLimits,    setGroupLimits]    = useState<Record<string, number>>({});

  /* Page context for AI chatbot */
  useSetPageContext(
    `[Chart Radar] source:${source} group_by:${groupBy}`,
    [source, groupBy],
  );

  /* ── Universe query ─────────────────────────────────────────────────── */
  const { data, isLoading, isError } = useQuery<RadarResponse>({
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

  /* ── Auto-expand first group when data arrives (use primitive deps only) */
  const lastAutoExpandKey = useRef('');
  useEffect(() => {
    if (!data?.groups?.length) return;
    const key = `${source}|${groupBy}|${data.count}`;
    if (key === lastAutoExpandKey.current) return;
    lastAutoExpandKey.current = key;
    setExpandedGroups(new Set([data.groups[0].key]));
    setGroupLimits({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.count, source, groupBy]);

  /* ── Sort symbols per group ─────────────────────────────────────────── */
  const filteredGroups = useMemo<FlatGroup[]>(() => {
    if (!data) return [];
    return data.groups.flatMap<FlatGroup>(g => {
      const syms = [...g.symbols].sort((a, b) => {
        switch (sort) {
          case 'relvol':  return (b.relative_volume      ?? 0) - (a.relative_volume      ?? 0);
          case 'mktcap':  return (MKT_CAP_ORDER[a.market_cap_bucket ?? ''] ?? 99) - (MKT_CAP_ORDER[b.market_cap_bucket ?? ''] ?? 99);
          case 'weight':  return (b.portfolio_weight_pct ?? 0) - (a.portfolio_weight_pct ?? 0);
          case 'price':   return (b.price                ?? 0) - (a.price                ?? 0);
          default:        return a.ticker.localeCompare(b.ticker);
        }
      });
      if (syms.length === 0) return [];
      return [{ ...g, filteredSymbols: syms }];
    });
  }, [data, sort]);

  /* ── Group expand / collapse ────────────────────────────────────────── */
  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const loadMore = useCallback((key: string) => {
    setGroupLimits(prev => ({ ...prev, [key]: (prev[key] ?? 6) + 6 }));
  }, []);

  /* ── Performance log (dev) ──────────────────────────────────────────── */
  useEffect(() => {
    if (!data) return;
    const expandedArr = Array.from(expandedGroups);
    const visibleCards = filteredGroups
      .filter(g => expandedArr.includes(g.key))
      .reduce((sum, g) => sum + Math.min(g.filteredSymbols.length, groupLimits[g.key] ?? 6), 0);
    const firstExpanded = filteredGroups.find(g => expandedArr.includes(g.key));
    const firstSym      = firstExpanded?.filteredSymbols[0];
    const firstIframeSrc = firstSym
      ? buildTvUrl(firstSym.tradingview_symbol || firstSym.ticker, 'D')
      : null;
    console.log('[CHART_RADAR_RENDER]', {
      groups:        filteredGroups.length,
      expandedGroups: expandedArr,
      visibleCards,
      mountedIframes: 'lazy — IntersectionObserver gated per card',
      firstIframeSrc,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedGroups, filteredGroups, groupLimits]);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: C.font, display: 'flex', flexDirection: 'column' }}>

      {/* ── Control bar — always visible across all three tabs ───────────── */}
      <div style={{ borderBottom: `1px solid ${C.border}`, background: C.card, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', flexWrap: 'wrap' }}>
          {/* Title */}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '0.12em', marginRight: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <BarChart3 style={{ width: 14, height: 14, color: C.teal }} />
            CHART RADAR
          </span>

          {/* 4-way tab toggle: CUSTOM | WATCHLIST | PORTFOLIO | COMPARE */}
          <div style={{ display: 'flex', gap: 2 }}>
            {(['custom', 'watchlist', 'portfolio', 'compare'] as const).map(t => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                style={tab === t
                  ? activeBtn(t === 'compare' ? C.purple : C.teal)
                  : inactiveBtn}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* GROUP — only shown for curated tabs */}
          {(tab === 'watchlist' || tab === 'portfolio') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>GROUP</span>
              <div style={{ position: 'relative' }}>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)} style={selectStyle}>
                  <option value="theme">Theme</option>
                  <option value="market_cap">Market Cap</option>
                  <option value="leader_tier">Leader Tier</option>
                </select>
                <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.dim }} />
              </div>
            </div>
          )}

          {/* SORT — only shown for curated tabs */}
          {(tab === 'watchlist' || tab === 'portfolio') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 8, color: C.dim, letterSpacing: '0.06em' }}>SORT</span>
              <div style={{ position: 'relative' }}>
                <select value={sort} onChange={e => setSort(e.target.value)} style={selectStyle}>
                  <option value="ticker">Ticker A–Z</option>
                  <option value="relvol">Rel Vol ↓</option>
                  <option value="mktcap">Market Cap</option>
                  <option value="weight">Port Weight ↓</option>
                  <option value="price">Price ↓</option>
                </select>
                <ChevronDown style={{ width: 10, height: 10, position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: C.dim }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Custom MultiCharts — only mounted after first CUSTOM click, then CSS-gated ── */}
      <div style={tab !== 'custom' ? { display: 'none' } : { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {customMounted && (
          <MultiChartsPage isActive={tab === 'custom'} onCurated={() => setTab('watchlist')} />
        )}
      </div>

      {/* ── Compare — only mounted after first COMPARE click, then CSS-gated ── */}
      <div style={tab !== 'compare' ? { display: 'none' } : { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {compareMounted && <ComparePanel />}
      </div>

      {/* ── Curated content — hidden when CUSTOM or COMPARE tab active ───── */}
      <div style={(tab === 'custom' || tab === 'compare') ? { display: 'none' } : { flex: 1, overflowY: 'auto', padding: '12px 16px' }}>

        {/* Warnings — collapsible */}
        {data?.warnings && data.warnings.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => setWarningsOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                background: C.amber + '10', border: `1px solid ${C.amber}25`,
                borderRadius: warningsOpen ? '4px 4px 0 0' : 4,
                padding: '6px 10px', cursor: 'pointer',
              }}
            >
              <AlertTriangle style={{ width: 10, height: 10, color: C.amber, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: C.amber, fontFamily: C.font, flex: 1, textAlign: 'left' }}>
                {data.warnings.length} notice{data.warnings.length !== 1 ? 's' : ''} from data pipeline
              </span>
              <ChevronDown style={{
                width: 10, height: 10, color: C.amber, flexShrink: 0,
                transform: warningsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
              }} />
            </button>
            {warningsOpen && (
              <div style={{
                background: C.amber + '08', border: `1px solid ${C.amber}25`, borderTop: 'none',
                borderRadius: '0 0 4px 4px', padding: '8px 12px',
              }}>
                {data.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 9, color: C.amber, fontFamily: C.font, lineHeight: 1.8 }}>
                    · {w}
                  </div>
                ))}
              </div>
            )}
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
          <div style={{ padding: 40, textAlign: 'center', borderRadius: 6, border: `1px solid ${C.red}30`, background: C.red + '08' }}>
            <AlertTriangle style={{ width: 22, height: 22, color: C.red, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 11, color: C.red, fontFamily: C.font, marginBottom: 12 }}>
              Failed to load chart universe. Check backend connectivity.
            </div>
            <button onClick={() => window.location.reload()} style={{ ...btnBase, color: C.teal, background: C.teal + '15', borderColor: C.teal + '30' }}>
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
            cols={3}
            compact={false}
            interval="D"
            source={source}
          />
        ))}
      </div>
    </div>
  );
}
