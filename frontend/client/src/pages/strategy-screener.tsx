import { useState, useCallback, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { RefreshCw, X, ArrowLeft, AlertCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { fetchLatestSnapshot, fetchReport, refreshSnapshot, fetchAnchorRows, fetchAnchorOverlap, createManualNode, fetchMultiAnchorScreener, fetchAnchorList, fetchAnchorTickerDetail } from '@/lib/screener';
import type { ScreenerSnapshot, ScreenerEntry, ScreenerReport } from '@/types/screener';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThematicSection } from '@/components/ui/ticker-thematic';
import {
  ComposedChart, LineChart, BarChart,
  Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

/* ── Design tokens ──────────────────────────────────────────────── */
const C = {
  bg:          '#050505',
  surface:     '#080808',
  card:        '#0a0a0a',
  border:      '#1c1c1c',
  borderFaint: '#111111',
  text:        '#e2e8f0',
  dim:         '#64748b',
  muted:       '#2a2a2a',
  bright:      '#f5f5f0',
  indigo:      '#d8d8d2',
  indigoFg:    '#a9aaa6',
  indigoSub:   'rgba(255,255,255,0.04)',
  green:       '#22c55e',
  amber:       '#f59e0b',
  blue:        '#38bdf8',
  red:         '#ef4444',
  font:        "'JetBrains Mono','Fira Code',monospace",
  sans:        "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

/* ── Grade sort ranking ─────────────────────────────────────────── */
const GRADE_RANK: Record<string, number> = {
  'A+': 1, 'A': 2, 'A-': 3,
  'B+': 4, 'B': 5, 'B-': 6,
  'C+': 7, 'C': 8, 'C-': 9,
};

/* ── Helpers ────────────────────────────────────────────────────── */
function fmtCap(v?: number): string {
  if (!v) return '—';
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function gradeColor(g?: string): string {
  if (!g) return C.dim;
  const s = g.toUpperCase();
  if (s.startsWith('A')) return C.green;
  if (s.startsWith('B')) return C.blue;
  if (s.startsWith('C')) return C.amber;
  return C.dim;
}

function fmtDate(d?: string): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
}

function normaliseEntries(snap: ScreenerSnapshot): ScreenerEntry[] {
  /* Try every key shape the backend might use — never drop rows silently */
  const s = snap as any;
  const rawRows: any[] =
    s.results       ||
    s.entries       ||
    s.ranked_list   ||
    s.candidates    ||
    s.rows          ||
    s.bottlenecks   ||
    s.nodes         ||
    s.tickers       ||
    s.data          ||
    s.items         ||
    [];
  return rawRows.map((r: any, i: number) => ({
    ...r,
    ticker:            r.ticker           || r.symbol          || r.bottleneck_ticker || '',
    symbol:            r.symbol           || r.ticker          || r.bottleneck_ticker || '',
    market_cap_usd:    r.market_cap_usd   ?? r.marketCap       ?? r.market_cap        ?? null,
    market_cap_bucket: r.market_cap_bucket || r.marketCapBucket || '',
    layer_depth:       r.layer_depth      ?? (typeof r.layer === 'number' ? r.layer : undefined),
    rank:              r.rank != null ? r.rank : (r.bottleneck_score != null ? -(r.bottleneck_score) : i),
  }));
}

function snapId(snap: ScreenerSnapshot): string {
  return snap.snapshot_id || snap.id || 'latest';
}

function tickerOf(e: ScreenerEntry): string {
  return e.ticker || e.symbol || '';
}

function nameOf(e: ScreenerEntry): string {
  return e.company_name || e.name || tickerOf(e);
}

function themeOf(e: ScreenerEntry): string {
  if (e.theme) return e.theme;
  if (e.themes?.length) return e.themes[0];
  if (e.theme_tags?.length) return e.theme_tags[0];
  return '—';
}

function layerOf(e: ScreenerEntry): string {
  if (e.chain_layer) return e.chain_layer;
  if (e.layer_depth != null) return `L${e.layer_depth}`;
  return '—';
}

function gradeOf(e: ScreenerEntry): string {
  return e.grade || (typeof e.confidence === 'string' ? e.confidence : '') || '';
}

function scoreOf(e: ScreenerEntry): number | undefined {
  return (
    e.best_blend_score ?? e.final_score ?? e.score ??
    (e as any).cr_final_score ?? e.bottleneck_score
  );
}

function isAnchor(e: ScreenerEntry): boolean {
  return (e as any).is_anchor === true || (e as any).role_type === 'anchor';
}

function gradeRank(g: string): number {
  return GRADE_RANK[g?.toUpperCase()] ?? 99;
}

/* ── Sort logic ─────────────────────────────────────────────────── */
type SortCol = '#' | 'ticker' | 'name' | 'theme' | 'mktcap' | 'layer' | 'market' | 'grade';

function sortEntries(
  entries: ScreenerEntry[],
  col: SortCol,
  dir: 'asc' | 'desc',
): ScreenerEntry[] {
  const arr = [...entries];
  arr.sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case '#':
        cmp = (a.rank ?? 0) - (b.rank ?? 0);
        break;
      case 'ticker':
        cmp = tickerOf(a).localeCompare(tickerOf(b));
        break;
      case 'name':
        cmp = nameOf(a).localeCompare(nameOf(b));
        break;
      case 'theme':
        cmp = themeOf(a).localeCompare(themeOf(b));
        break;
      case 'mktcap':
        cmp = (a.market_cap_usd ?? 0) - (b.market_cap_usd ?? 0);
        break;
      case 'layer':
        cmp = (a.layer_depth ?? 99) - (b.layer_depth ?? 99);
        break;
      case 'market':
        cmp = (a.exchange || a.market || a.country || '').localeCompare(
              (b.exchange || b.market || b.country || ''));
        break;
      case 'grade':
        cmp = gradeRank(gradeOf(a)) - gradeRank(gradeOf(b));
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return arr;
}

/* ── Sub-components ─────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'80px 0', color:C.dim }}>
      <Loader2 size={28} style={{ animation:'spin 1s linear infinite', color:C.indigo }} />
      <span style={{ fontFamily:C.font, fontSize:11 }}>Loading…</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'60px 24px', textAlign:'center' }}>
      <AlertCircle size={28} style={{ color:C.amber }} />
      <p style={{ fontFamily:C.sans, fontSize:14, color:C.dim, maxWidth:380 }}>{message}</p>
      <button
        onClick={onRetry}
        style={{ padding:'7px 20px', background:C.indigoSub, border:`1px solid rgba(255,255,255,0.12)`, borderRadius:6, color:C.indigoFg, fontFamily:C.font, fontSize:11, cursor:'pointer' }}
      >
        Retry
      </button>
    </div>
  );
}

function GradeBadge({ grade }: { grade?: string }) {
  if (!grade) return <span style={{ color:C.muted, fontSize:11, fontFamily:C.font }}>—</span>;
  const clr = gradeColor(grade);
  return (
    <span style={{ display:'inline-block', minWidth:28, padding:'2px 7px', background:`${clr}14`, border:`1px solid ${clr}30`, borderRadius:4, color:clr, fontFamily:C.font, fontSize:10, fontWeight:700, textAlign:'center' }}>
      {grade}
    </span>
  );
}

function AccessBadge({ entry }: { entry: ScreenerEntry }) {
  const proxy = entry.adr_ticker || entry.adr_proxy || entry.us_access_proxy || entry.etf_proxy;
  if (entry.direct_tradable !== false && !proxy) return null;
  if (proxy) {
    return (
      <span style={{ display:'inline-block', padding:'1px 6px', background:`${C.amber}12`, border:`1px solid ${C.amber}30`, borderRadius:3, color:C.amber, fontFamily:C.font, fontSize:8, fontWeight:700, whiteSpace:'nowrap' }}>
        {proxy}
      </span>
    );
  }
  if (entry.direct_tradable === false) {
    return (
      <span style={{ display:'inline-block', padding:'1px 6px', background:`rgba(239,68,68,0.08)`, border:`1px solid rgba(239,68,68,0.2)`, borderRadius:3, color:'#f87171', fontFamily:C.font, fontSize:8, fontWeight:700 }}>
        Foreign
      </span>
    );
  }
  return null;
}

/* ── Report Section renderer ────────────────────────────────────── */
function ReportSection({ title, content }: { title: string; content?: string }) {
  if (!content?.trim()) return null;
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{ display:'inline-block', width:3, height:14, background:C.indigo, borderRadius:2, flexShrink:0 }} />
        <h3 style={{ fontFamily:C.sans, fontSize:12, fontWeight:700, color:C.indigoFg, textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>{title}</h3>
      </div>
      <p style={{ fontFamily:C.sans, fontSize:14, color:C.text, lineHeight:1.8, margin:0, paddingLeft:11, borderLeft:`1px solid ${C.borderFaint}` }}>
        {content}
      </p>
    </div>
  );
}

/* ── TradingView symbol builder ─────────────────────────────────── */
const TV_EX: Record<string, string> = {
  'NASDAQ': 'NASDAQ', 'NMS': 'NASDAQ', 'NGS': 'NASDAQ', 'NGM': 'NASDAQ', 'NCM': 'NASDAQ',
  'NYSE': 'NYSE', 'NYQ': 'NYSE',
  'NYSE AMERICAN': 'AMEX', 'NYSE ARCA': 'AMEX', 'AMEX': 'AMEX', 'ARCA': 'AMEX',
  'OTC': 'OTC', 'OTCMKTS': 'OTC', 'OTCPK': 'OTC', 'OTCBB': 'OTC', 'OTCQB': 'OTC', 'OTCQX': 'OTC',
  'CBOE': 'CBOE',
  'TSX': 'TSX', 'TORONTO': 'TSX',
  'TSXV': 'TSXV', 'CVE': 'TSXV',
  'LSE': 'LSE', 'LON': 'LSE', 'LONDON': 'LSE',
  'ASX': 'ASX',
  'HKEX': 'HKEX', 'HKG': 'HKEX', 'HK': 'HKEX',
  'SGX': 'SGX',
  'KRX': 'KRX', 'KOSPI': 'KRX', 'KOSDAQ': 'KOSDAQ',
  'TSE': 'TSE', 'TYO': 'TSE', 'JPX': 'TSE', 'OSA': 'TSE', 'JASDAQ': 'TSE',
  'XETRA': 'XETR', 'XETR': 'XETR', 'FWB': 'FWB',
  'EURONEXT': 'EURONEXT', 'EPA': 'EURONEXT', 'AMS': 'EURONEXT',
  'SIX': 'SIX', 'SWX': 'SIX',
  'NSE': 'NSE', 'BSE': 'BSE',
  'SSE': 'SSE', 'SHA': 'SSE', 'SZSE': 'SZSE', 'SHE': 'SZSE',
  'B3': 'BMFBOVESPA', 'BOVESPA': 'BMFBOVESPA', 'BVMF': 'BMFBOVESPA',
  'JSE': 'JSE', 'BMV': 'BMV', 'BVB': 'BVB', 'TADAWUL': 'TADAWUL',
  'TASE': 'TASE', 'IDX': 'IDX', 'SET': 'SET', 'BURSA': 'MYX',
};
const TV_US_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'AMEX', 'OTC', 'CBOE']);
const TV_NUMERIC_EXCHANGES = new Set([
  'TSE', 'KRX', 'KOSDAQ', 'SSE', 'SZSE', 'HKEX', 'NSE', 'BSE',
  'IDX', 'SET', 'MYX', 'TADAWUL', 'TASE',
]);

function looksLikeOtcAdr(tk: string): boolean {
  return /^[A-Z]{1,6}$/.test(tk);
}

function buildTVSymbol(entry: ScreenerEntry): string {
  if ((entry as any).tradingview_symbol) return String((entry as any).tradingview_symbol);
  const tk = (entry.ticker || entry.symbol || '').toUpperCase();
  if (!tk) return '';
  const usTicker = entry.adr_ticker || entry.adr_proxy || entry.us_access_proxy;
  if (usTicker) {
    const utk = usTicker.toUpperCase();
    return looksLikeOtcAdr(utk) ? `OTC:${utk}` : utk;
  }
  const rawEx = (entry.exchange || entry.market || '').toUpperCase().trim();
  if (!rawEx) {
    const country = (entry.country || '').toUpperCase();
    const isNonUs = country && country !== 'US' && country !== 'USA';
    if (isNonUs && looksLikeOtcAdr(tk)) return `OTC:${tk}`;
    return tk;
  }
  let tvEx: string | undefined = TV_EX[rawEx];
  if (!tvEx) {
    for (const [key, val] of Object.entries(TV_EX)) {
      if (rawEx.startsWith(key) || rawEx.includes(key)) { tvEx = val; break; }
    }
  }
  if (!tvEx) return tk;
  if (!TV_US_EXCHANGES.has(tvEx) && TV_NUMERIC_EXCHANGES.has(tvEx) && looksLikeOtcAdr(tk)) {
    return `OTC:${tk}`;
  }
  return `${tvEx}:${tk}`;
}

/* ── TradingView Chart ──────────────────────────────────────────── */
function TradingViewChart({ symbol }: { symbol: string }) {
  if (!symbol) return null;
  const studies = encodeURIComponent(
    ['RSI@tv-basicstudies', 'MACD@tv-basicstudies', 'BB@tv-basicstudies'].join('|')
  );
  const src = [
    'https://www.tradingview.com/widgetembed/',
    `?symbol=${encodeURIComponent(symbol)}`,
    '&interval=D&theme=dark&style=1&locale=en',
    '&enable_publishing=false&allow_symbol_change=true&save_image=false',
    '&hide_top_toolbar=0&hide_side_toolbar=0&withdateranges=1&hideideas=1',
    `&studies=${studies}`,
  ].join('');
  return (
    <div style={{ borderBottom:`1px solid ${C.border}`, background:C.bg, marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 22px 0' }}>
        <span style={{ fontFamily:C.font, fontSize:9, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Chart · {symbol}
        </span>
        <span style={{ fontFamily:C.font, fontSize:9, color:C.muted }}>RSI · MACD · BB</span>
      </div>
      <iframe key={symbol} src={src} style={{ width:'100%', height:380, border:'none', display:'block' }} allow="fullscreen" title={`${symbol} chart`} />
    </div>
  );
}

/* ── Report Panel ───────────────────────────────────────────────── */
function ReportPanel({
  entry,
  snapshotId: sid,
  onClose,
}: {
  entry: ScreenerEntry;
  snapshotId: string;
  onClose: () => void;
}) {
  const tk = tickerOf(entry);
  const { data: report, isLoading, error } = useQuery<ScreenerReport>({
    queryKey: ['screener-report', sid, tk],
    queryFn:  () => fetchReport(sid, tk),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const standardSections = (r: ScreenerReport) => [
    { title: 'Summary',                   content: r.summary },
    { title: 'Why It Matters',            content: r.why_it_matters },
    { title: 'Supply Chain Position',     content: r.supply_chain_position },
    { title: 'Supply Chain Map',          content: r.supply_chain_map },
    { title: 'Competitors',               content: r.competitors },
    { title: 'Catalysts',                 content: r.catalysts },
    { title: 'Rerating Case',             content: r.rerating_case },
    { title: 'Why Hidden',                content: r.why_hidden },
    { title: 'Key Risk',                  content: r.key_risk },
    { title: 'What to Verify Next',       content: r.what_to_verify_next },
    { title: 'What Would Break Thesis',   content: r.what_would_break_thesis },
  ];

  const extraSections = report?.sections
    ? report.sections.map(s => ({ title: s.label || '', content: s.content || s.text || '' }))
    : [];

  const anchor = isAnchor(entry);

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(680px, 100vw)', background:C.surface, borderLeft:`1px solid ${C.border}`, zIndex:80, display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.5)' }}>
      {/* Panel header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 22px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', color:C.dim, cursor:'pointer', padding:'4px 8px', borderRadius:4, fontFamily:C.font, fontSize:10 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontFamily:C.font, fontSize:16, fontWeight:700, color:C.bright }}>{tk}</span>
            <GradeBadge grade={gradeOf(entry)} />
            <AccessBadge entry={entry} />
            {anchor && (
              <span style={{ fontFamily:C.font, fontSize:9, fontWeight:700, color:C.indigoFg, textTransform:'uppercase', letterSpacing:'0.08em', opacity:0.8 }}>
                Anchor
              </span>
            )}
          </div>
          <div style={{ fontFamily:C.sans, fontSize:12, color:C.dim, marginTop:2 }}>{nameOf(entry)}</div>
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, color:C.dim, cursor:'pointer', padding:4 }}>
          <X size={14} />
        </button>
      </div>

      {/* Meta strip */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 22px', borderBottom:`1px solid ${C.borderFaint}`, background:C.indigoSub, flexShrink:0, flexWrap:'wrap' }}>
        {(entry.theme || entry.themes?.[0]) && (
          <span style={{ fontFamily:C.font, fontSize:10, color:C.indigoFg }}>{themeOf(entry)}</span>
        )}
        {entry.layer_depth != null && (
          <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>Layer {entry.layer_depth}</span>
        )}
        {entry.country && (
          <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>{entry.country}</span>
        )}
        {entry.market_cap_usd && (
          <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>{fmtCap(entry.market_cap_usd)}</span>
        )}
        {entry.why_now && (
          <span style={{ fontFamily:C.sans, fontSize:11, color:C.dim, fontStyle:'italic', flex:1, minWidth:120 }}>{entry.why_now}</span>
        )}
      </div>

      {/* Report body */}
      <div style={{ flex:1, overflowY:'auto' }}>
        <TradingViewChart symbol={buildTVSymbol(entry)} />
        <div style={{ padding:'24px 22px' }}>
          {isLoading && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'40px 0', color:C.dim }}>
              <Loader2 size={18} style={{ animation:'spin 1s linear infinite', color:C.indigo }} />
              <span style={{ fontFamily:C.font, fontSize:11 }}>Loading report…</span>
            </div>
          )}
          {error && !report && (
            <div style={{ padding:'32px 0' }}>
              {entry.thesis_summary && <ReportSection title="Thesis" content={entry.thesis_summary} />}
              {entry.why_now        && <ReportSection title="Why Now" content={entry.why_now} />}
              {entry.why_hidden     && <ReportSection title="Why Hidden" content={entry.why_hidden} />}
            </div>
          )}
          {report && !report.error && (
            <>
              {report.headline && (
                <p style={{ fontFamily:C.sans, fontSize:15, color:C.indigoFg, fontStyle:'italic', marginBottom:24, lineHeight:1.7, borderLeft:`3px solid ${C.indigo}`, paddingLeft:14 }}>
                  {report.headline}
                </p>
              )}
              {standardSections(report).map(s => (
                <ReportSection key={s.title} title={s.title} content={s.content} />
              ))}
              {extraSections.map(s => (
                <ReportSection key={s.title} title={s.title} content={s.content} />
              ))}
            </>
          )}
          {report?.error && (
            <div>
              {entry.thesis_summary && <ReportSection title="Thesis" content={entry.thesis_summary} />}
              {entry.why_now        && <ReportSection title="Why Now" content={entry.why_now} />}
            </div>
          )}
          <ThematicSection fields={entry} />
        </div>
      </div>
    </div>
  );
}

/* ── Sortable column header ─────────────────────────────────────── */
function SortableHeader({
  label,
  col,
  active,
  dir,
  align,
  onClick,
}: {
  label: string;
  col: SortCol;
  active: boolean;
  dir: 'asc' | 'desc';
  align?: string;
  onClick: (col: SortCol) => void;
}) {
  return (
    <th
      onClick={() => onClick(col)}
      style={{
        padding: '9px 12px',
        fontFamily: C.font,
        fontSize: 8,
        fontWeight: 700,
        color: active ? C.indigoFg : C.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        textAlign: (align as any) || 'left',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        userSelect: 'none',
        borderBottom: active ? `1px solid rgba(99,102,241,0.4)` : `1px solid ${C.border}`,
      }}
    >
      <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
        {label}
        {active ? (
          dir === 'asc'
            ? <ChevronUp size={9} style={{ opacity:0.8 }} />
            : <ChevronDown size={9} style={{ opacity:0.8 }} />
        ) : (
          <span style={{ display:'inline-block', width:9 }} />
        )}
      </span>
    </th>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════════
   Smart Options Tab
   ═══════════════════════════════════════════════════════════════════ */

function soFmt$(v?: number | null, dec = 2): string {
  if (v == null) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
}
function soFmtPct(v?: number | null, showSign = true): string {
  if (v == null) return '—';
  const s = showSign && v > 0 ? '+' : '';
  return `${s}${v.toFixed(2)}%`;
}
function soFmtM(v?: number | null): string {
  if (v == null) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function SmartOptionsTab() {
  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['smart-options'],
    queryFn: () => fetch('/api/strategy/smart-options').then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 5 * 60_000,
    gcTime:    15 * 60_000,
    retry: 1,
  });

  const [soView,    setSoView]    = useState<'all' | 'calls' | 'puts'>('all');
  const [tvTicker,  setTvTicker]  = useState<string | null>(null);

  const market = data?.market;
  const baseRows: any[] = (data?.rows ?? []).filter((r: any) => r.actual?.price != null);

  const rows: any[] = useMemo(() => {
    if (soView === 'calls') {
      return [...baseRows.filter((r: any) => r.signal === 'call')]
        .sort((a, b) => (b.gap?.pct ?? 0) - (a.gap?.pct ?? 0));
    }
    if (soView === 'puts') {
      return [...baseRows.filter((r: any) => r.signal === 'put')]
        .sort((a, b) => (a.gap?.pct ?? 0) - (b.gap?.pct ?? 0));
    }
    // 'all': calls first (high→low), then puts (low→high by pct, i.e. most negative first), then neutral
    const calls    = [...baseRows.filter((r: any) => r.signal === 'call')].sort((a, b) => (b.gap?.pct ?? 0) - (a.gap?.pct ?? 0));
    const puts     = [...baseRows.filter((r: any) => r.signal === 'put')].sort((a, b) => (a.gap?.pct ?? 0) - (b.gap?.pct ?? 0));
    const neutral  = baseRows.filter((r: any) => r.signal !== 'call' && r.signal !== 'put');
    return [...calls, ...puts, ...neutral];
  }, [baseRows, soView]);

  const signalColor = (s: string) => s === 'call' ? C.green : s === 'put' ? C.red : C.dim;
  const signalLabel = (s: string, str: string) => {
    if (s === 'call') return str === 'strong' ? '▲ Strong Call' : str === 'moderate' ? '▲ Call' : '▲ Weak Call';
    if (s === 'put')  return str === 'strong' ? '▼ Strong Put'  : str === 'moderate' ? '▼ Put'  : '▼ Weak Put';
    return '— Neutral';
  };
  const strategyLabel = (s: string) => s === 'call' ? 'Buy Calls / Go Long' : s === 'put' ? 'Buy Puts / Go Short' : 'Monitor';

  const marketStatusColor = (status?: string) => {
    if (!status) return C.dim;
    if (status === 'open') return C.green;
    if (status === 'pre_market' || status === 'post_market') return C.amber;
    return '#64748b';
  };

  return (
    <div style={{ padding: '24px 0', minHeight: 400 }}>

      {/* Market banner */}
      {market && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'flex-start',
          gap: 14,
        }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%', marginTop: 4, flexShrink: 0,
            background: marketStatusColor(market.status),
            boxShadow: `0 0 6px ${marketStatusColor(market.status)}`,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 13, fontFamily: C.sans, lineHeight: 1.5 }}>
              {market.context}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ color: C.dim, fontSize: 11, fontFamily: C.font }}>
                {market.et_time}
              </span>
              <span style={{ fontSize: 11, fontFamily: C.font, color: market.gap_meaningful ? C.green : C.amber }}>
                {market.gap_meaningful ? '● Gaps actionable' : '○ Gaps may be stale'}
              </span>
              {data?.with_gap != null && (
                <span style={{ color: C.dim, fontSize: 11, fontFamily: C.font }}>
                  {data.with_gap} gaps · {data.total_hl_equities} HL equities tracked
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.dim, fontFamily: C.sans, fontSize: 13 }}>
          <div style={{ marginBottom: 12, fontSize: 20 }}>⏳</div>
          Fetching Hyperliquid equity perp prices + market quotes…
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.red, fontFamily: C.sans, fontSize: 13 }}>
          Failed to load Smart Options data. <button onClick={() => refetch()} style={{ color: C.blue, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Sort toggles */}
      {!isLoading && !error && baseRows.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {(['all', 'calls', 'puts'] as const).map(v => {
            const active = soView === v;
            const col = v === 'calls' ? C.green : v === 'puts' ? C.red : C.indigo;
            const count = v === 'all' ? baseRows.length : baseRows.filter(r => r.signal === v.slice(0, -1)).length;
            const label = v === 'all' ? 'All' : v === 'calls' ? '▲ Top Calls' : '▼ Top Puts';
            return (
              <button key={v} onClick={() => setSoView(v)} style={{
                padding: '5px 14px', borderRadius: 6, cursor: 'pointer',
                fontFamily: C.font, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                background: active ? `${col}18` : 'transparent',
                color: active ? col : C.dim,
                border: `1px solid ${active ? col + '50' : C.border}`,
                transition: 'all 0.15s',
              }}>
                {label} <span style={{ opacity: 0.6, fontWeight: 400 }}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Rows */}
      {!isLoading && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row: any) => {
            const sig    = row.signal ?? 'neutral';
            const sigStr = row.signal_strength ?? 'weak';
            const gapPct = row.gap?.pct;
            const gapAbs = row.gap?.abs;
            const dir    = row.gap?.direction; // hl_discount | hl_premium
            const col    = signalColor(sig);
            const fundAnn = row.hl?.funding_rate_ann;

            return (
              <div key={row.ticker} style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '16px 20px', position: 'relative', overflow: 'hidden',
              }}>
                {/* Left accent bar */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  background: col, borderRadius: '10px 0 0 10px',
                }} />

                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                  {/* Ticker — click to open TradingView chart */}
                  <span
                    onClick={() => setTvTicker(row.ticker)}
                    style={{
                      color: C.bright, fontFamily: C.font, fontSize: 15, fontWeight: 700,
                      cursor: 'pointer', borderBottom: `1px dashed ${C.muted}`,
                      transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = C.blue)}
                    onMouseLeave={e => (e.currentTarget.style.color = C.bright)}
                    title="Open TradingView chart"
                  >
                    {row.ticker}
                  </span>

                  {/* Gap badge */}
                  <span style={{
                    color: col, fontFamily: C.font, fontSize: 14, fontWeight: 800,
                    background: `${col}15`, border: `1px solid ${col}40`,
                    borderRadius: 6, padding: '2px 10px',
                  }}>
                    {gapPct != null ? `${gapPct > 0 ? '+' : ''}${gapPct.toFixed(2)}%` : '—'}
                  </span>

                  {/* Signal label */}
                  <span style={{
                    color: col, fontFamily: C.font, fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.07em', textTransform: 'uppercase',
                  }}>
                    {signalLabel(sig, sigStr)}
                  </span>

                  {/* Strategy badge */}
                  <span style={{
                    marginLeft: 'auto', color: col, fontFamily: C.sans, fontSize: 10,
                    fontWeight: 700, background: `${col}12`, border: `1px solid ${col}30`,
                    borderRadius: 4, padding: '3px 9px', textTransform: 'uppercase',
                    letterSpacing: '0.06em', whiteSpace: 'nowrap',
                  }}>
                    {strategyLabel(sig)}
                  </span>
                </div>

                {/* Two-column data */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                  {/* HL column */}
                  <div style={{
                    background: C.bg, border: `1px solid ${C.borderFaint}`, borderRadius: 8, padding: '12px 14px',
                  }}>
                    <div style={{ color: '#38bdf8', fontFamily: C.font, fontSize: 9, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      Hyperliquid Perp
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>Price</span>
                        <span style={{ color: C.bright, fontFamily: C.font, fontSize: 12, fontWeight: 700 }}>
                          {soFmt$(row.hl?.price)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>24h Chg</span>
                        <span style={{ color: row.hl?.chg_24h_pct >= 0 ? C.green : C.red, fontFamily: C.font, fontSize: 10 }}>
                          {soFmtPct(row.hl?.chg_24h_pct)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>OI</span>
                        <span style={{ color: C.text, fontFamily: C.font, fontSize: 10 }}>
                          {soFmtM(row.hl?.oi_usd)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>Funding (ann)</span>
                        <span style={{
                          fontFamily: C.font, fontSize: 10,
                          color: fundAnn == null ? C.dim : fundAnn > 50 ? C.green : fundAnn < -50 ? C.red : C.text,
                        }}>
                          {fundAnn != null ? `${fundAnn > 0 ? '+' : ''}${fundAnn.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>Vol 24h</span>
                        <span style={{ color: C.text, fontFamily: C.font, fontSize: 10 }}>
                          {soFmtM(row.hl?.volume_24h_usd)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actual column */}
                  <div style={{
                    background: C.bg, border: `1px solid ${C.borderFaint}`, borderRadius: 8, padding: '12px 14px',
                  }}>
                    <div style={{ color: C.indigoFg, fontFamily: C.font, fontSize: 9, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      Equity Market
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>Last Price</span>
                        <span style={{ color: C.bright, fontFamily: C.font, fontSize: 12, fontWeight: 700 }}>
                          {soFmt$(row.actual?.price)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>24h Chg</span>
                        <span style={{ color: (row.actual?.change_pct ?? 0) >= 0 ? C.green : C.red, fontFamily: C.font, fontSize: 10 }}>
                          {soFmtPct(row.actual?.change_pct)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>Bid / Ask</span>
                        <span style={{ color: C.text, fontFamily: C.font, fontSize: 10 }}>
                          {soFmt$(row.actual?.bid)} / {soFmt$(row.actual?.ask)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>Prev Close</span>
                        <span style={{ color: C.text, fontFamily: C.font, fontSize: 10 }}>
                          {soFmt$(row.actual?.prevclose)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: C.dim, fontFamily: C.font, fontSize: 10 }}>Eq. Volume</span>
                        <span style={{ color: C.text, fontFamily: C.font, fontSize: 10 }}>
                          {row.actual?.volume != null ? row.actual.volume.toLocaleString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gap explanation */}
                <div style={{ marginTop: 10, color: C.dim, fontFamily: C.sans, fontSize: 11, lineHeight: 1.5 }}>
                  {dir === 'hl_discount'
                    ? `HL prices ${row.ticker} at ${soFmt$(row.hl?.price)} — ${Math.abs(gapPct ?? 0).toFixed(2)}% below the equity close of ${soFmt$(row.actual?.price)}. Crypto market pricing in a move lower.`
                    : dir === 'hl_premium'
                    ? `HL prices ${row.ticker} at ${soFmt$(row.hl?.price)} — ${Math.abs(gapPct ?? 0).toFixed(2)}% above the equity close of ${soFmt$(row.actual?.price)}. Crypto market pricing in a move higher.`
                    : `Gap: ${soFmt$(gapAbs)} (${soFmtPct(gapPct)})`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && data && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.dim, fontFamily: C.sans, fontSize: 13 }}>
          No actionable gaps found right now.
        </div>
      )}

      {/* ── TradingView chart modal ──────────────────────────────────── */}
      {tvTicker && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setTvTicker(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
              zIndex: 200, backdropFilter: 'blur(3px)',
            }}
          />
          {/* Panel */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(900px, 92vw)', height: 'min(560px, 80vh)',
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, zIndex: 201,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 18px', borderBottom: `1px solid ${C.border}`,
              background: C.surface, flexShrink: 0,
            }}>
              <span style={{ color: C.bright, fontFamily: C.font, fontSize: 13, fontWeight: 700 }}>
                {tvTicker}
              </span>
              <span style={{ color: C.dim, fontFamily: C.sans, fontSize: 11 }}>
                TradingView Chart
              </span>
              <a
                href={`https://www.tradingview.com/chart/?symbol=${tvTicker}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  marginLeft: 'auto', color: C.blue, fontFamily: C.font, fontSize: 10,
                  textDecoration: 'none', border: `1px solid ${C.blue}40`,
                  borderRadius: 4, padding: '3px 9px',
                }}
              >
                Open full chart ↗
              </a>
              <button
                onClick={() => setTvTicker(null)}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: C.dim, fontSize: 18, lineHeight: 1, padding: '0 2px',
                }}
              >
                ×
              </button>
            </div>
            {/* Chart iframe */}
            <iframe
              key={tvTicker}
              src={`https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=100%25&interval=D&range=3M&style=1&toolbar_bg=0d1623&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=America%2FNew_York&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(tvTicker)}`}
              style={{ flex: 1, border: 'none', width: '100%' }}
              allowFullScreen
              title={`TradingView chart — ${tvTicker}`}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Static anchor fallback list (used by ManualAddModal only)
   ═══════════════════════════════════════════════════════════════════ */
const STATIC_ANCHORS = [
  { key: 'SPCX',      label: 'X / X Ecosystem' },
  { key: 'NVDA',      label: 'NVIDIA' },
  { key: 'AMZN',      label: 'Amazon' },
  { key: 'MSFT',      label: 'Microsoft' },
  { key: 'GOOG',      label: 'Google / Alphabet' },
  { key: 'META',      label: 'Meta' },
  { key: 'AAPL',      label: 'Apple' },
  { key: 'TSM',       label: 'TSMC' },
  { key: 'AVGO',      label: 'Broadcom' },
  { key: 'AMD',       label: 'AMD' },
  { key: 'OPENAI',    label: 'OpenAI' },
  { key: 'ANTHROPIC', label: 'Anthropic' },
];

/* ═══════════════════════════════════════════════════════════════════
   Manual Add Modal
   ═══════════════════════════════════════════════════════════════════ */
const EMPTY_FORM = {
  anchor_key: '',
  ticker: '',
  company_name: '',
  tradingview_symbol: '',
  supply_chain_role: '',
  bottleneck_score: '',
  evidence_grade: 'B' as 'A' | 'B' | 'C',
  relationship_specificity: '',
  evidence: '',
  source_url: '',
  deal_signed_date: '',
  notes: '',
};

function ManualAddModal({
  defaultAnchorKey,
  anchorOptions,
  onClose,
  onSuccess,
}: {
  defaultAnchorKey: string;
  anchorOptions?: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, anchor_key: defaultAnchorKey });
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.ticker.trim()) { setErr('Ticker is required'); return; }
    if (!form.anchor_key.trim()) { setErr('Anchor is required'); return; }
    setSubmitting(true); setErr('');
    try {
      const score = form.bottleneck_score ? Number(form.bottleneck_score) : undefined;
      await createManualNode({
        anchor_key:               form.anchor_key.trim().toUpperCase(),
        ticker:                   form.ticker.trim().toUpperCase(),
        company_name:             form.company_name.trim() || undefined,
        tradingview_symbol:       form.tradingview_symbol.trim() || undefined,
        supply_chain_role:        form.supply_chain_role.trim() || undefined,
        bottleneck_score:         Number.isFinite(score) ? score : undefined,
        evidence_grade:           form.evidence_grade,
        relationship_specificity: form.relationship_specificity.trim() || undefined,
        evidence:                 form.evidence.trim() || undefined,
        source_url:               form.source_url.trim() || undefined,
        deal_signed_date:         form.deal_signed_date || undefined,
        notes:                    form.notes.trim() || undefined,
        manual_added:             true,
        source_type:              'manual',
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const INP: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 5,
    color: C.text, fontFamily: C.font, fontSize: 11,
    padding: '6px 10px', outline: 'none',
  };
  const LBL: CSSProperties = {
    fontFamily: C.font, fontSize: 9, color: C.dim,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    display: 'block', marginBottom: 4,
  };
  const ROW2: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, backdropFilter: 'blur(3px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 'min(560px, 94vw)', maxHeight: '90vh', overflowY: 'auto',
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
        zIndex: 301, padding: '24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, color: C.bright, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Add Bottleneck
          </span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.dim, padding: 4 }}>
            <X size={14} />
          </button>
        </div>

        {/* Anchor + Ticker */}
        <div style={ROW2}>
          <div>
            <label style={LBL}>Anchor *</label>
            <select value={form.anchor_key} onChange={set('anchor_key')} style={INP}>
              <option value="">— select —</option>
              {(anchorOptions && anchorOptions.length > 0
                ? anchorOptions.map(a => ({ key: a.anchor_key, label: a.visible_name || a.anchor_name || a.anchor_key }))
                : STATIC_ANCHORS
              ).map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={LBL}>Ticker *</label>
            <input value={form.ticker} onChange={set('ticker')} style={INP} placeholder="e.g. TSM" autoFocus />
          </div>
        </div>

        {/* Company + TV Symbol */}
        <div style={ROW2}>
          <div>
            <label style={LBL}>Company Name</label>
            <input value={form.company_name} onChange={set('company_name')} style={INP} placeholder="Full company name" />
          </div>
          <div>
            <label style={LBL}>TradingView Symbol</label>
            <input value={form.tradingview_symbol} onChange={set('tradingview_symbol')} style={INP} placeholder="e.g. TSE:6723" />
          </div>
        </div>

        {/* Role + Score */}
        <div style={ROW2}>
          <div>
            <label style={LBL}>Supply-Chain Role</label>
            <input value={form.supply_chain_role} onChange={set('supply_chain_role')} style={INP} placeholder="e.g. Wafer supplier" />
          </div>
          <div>
            <label style={LBL}>Bottleneck Score (0–100)</label>
            <input type="number" min={0} max={100} value={form.bottleneck_score} onChange={set('bottleneck_score')} style={INP} placeholder="e.g. 78" />
          </div>
        </div>

        {/* Grade + Specificity */}
        <div style={ROW2}>
          <div>
            <label style={LBL}>Evidence Grade</label>
            <select value={form.evidence_grade} onChange={set('evidence_grade')} style={INP}>
              <option value="A">A — High confidence</option>
              <option value="B">B — Medium confidence</option>
              <option value="C">C — Low confidence</option>
            </select>
          </div>
          <div>
            <label style={LBL}>Relationship Specificity</label>
            <input value={form.relationship_specificity} onChange={set('relationship_specificity')} style={INP} placeholder="e.g. Direct contract" />
          </div>
        </div>

        {/* Evidence text */}
        <div style={{ marginBottom: 12 }}>
          <label style={LBL}>Evidence</label>
          <textarea value={form.evidence} onChange={set('evidence')} rows={3} style={{ ...INP, resize: 'vertical' }} placeholder="Key evidence or reasoning…" />
        </div>

        {/* Source URL + Deal Date */}
        <div style={ROW2}>
          <div>
            <label style={LBL}>Source URL</label>
            <input value={form.source_url} onChange={set('source_url')} style={INP} placeholder="https://…" />
          </div>
          <div>
            <label style={LBL}>Deal Signed Date</label>
            <input type="date" value={form.deal_signed_date} onChange={set('deal_signed_date')} style={INP} />
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 16 }}>
          <label style={LBL}>Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2} style={{ ...INP, resize: 'vertical' }} placeholder="Any additional context…" />
        </div>

        {err && (
          <div style={{ fontFamily: C.font, fontSize: 10, color: C.amber, marginBottom: 12, padding: '6px 10px', background: `${C.amber}10`, border: `1px solid ${C.amber}30`, borderRadius: 5 }}>
            {err}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '7px 18px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.dim, fontFamily: C.font, fontSize: 11, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '7px 18px', background: C.indigoSub, border: `1px solid ${C.indigo}55`, borderRadius: 6, color: C.indigoFg, fontFamily: C.font, fontSize: 11, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Saving…' : 'Add Bottleneck'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Table cell / header styles
   ═══════════════════════════════════════════════════════════════════ */
const TH_STYLE: CSSProperties = {
  padding: '7px 10px', background: C.surface, borderBottom: `1px solid ${C.border}`,
  fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.dim,
  textTransform: 'uppercase', letterSpacing: '0.06em',
  position: 'sticky', top: 0, zIndex: 2, userSelect: 'none', whiteSpace: 'nowrap',
};
const TD: CSSProperties = { padding: '9px 10px', verticalAlign: 'middle' };

function ColHeader({ col, label, right, sortCol, sortDir, onSort }: {
  col: string; label: string; right?: boolean;
  sortCol: string; sortDir: 'asc' | 'desc';
  onSort: (c: string) => void;
}) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        ...TH_STYLE, cursor: 'pointer',
        textAlign: right ? 'right' : 'left',
        color: active ? C.bright : C.dim,
      }}
    >
      {label}
      {active && <span style={{ marginLeft: 4 }}>{sortDir === 'desc' ? '↓' : '↑'}</span>}
    </th>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Bottleneck Drawer
   ═══════════════════════════════════════════════════════════════════ */
function BottleneckDrawer({ ticker, primaryAnchor, tvSymbol, onClose }: {
  ticker: string; primaryAnchor: string; tvSymbol?: string; onClose: () => void;
}) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ['bn-drawer', primaryAnchor, ticker],
    queryFn: () => fetchAnchorTickerDetail(primaryAnchor, ticker),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!(primaryAnchor && ticker),
  });
  const row: any  = (data as any)?.row || {};
  const cross: any[] = (data as any)?.cross_anchor_appearances || [];
  const sym  = tvSymbol || row.tradingview_symbol || ticker;
  const name = (data as any)?.company_name || row.company_name || ticker;

  const sections: [string, string][] = [
    ['Why It Matters',          row.why_it_matters],
    ['Supply Chain Role',       row.supply_chain_role],
    ['Why Now',                 row.why_now],
    ['Why Hidden',              row.why_hidden],
    ['What Would Break Thesis', row.what_would_break_thesis],
    ['Evidence',                Array.isArray(row.evidence) ? (row.evidence as string[]).join('\n\n') : row.evidence],
    ['Risk Notes',              row.risk_notes],
  ].filter(([, v]) => v) as [string, string][];

  const confClr = (c: string) => c === 'high' ? C.green : c === 'medium' ? C.amber : C.dim;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(700px,100vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 201, display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 48px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: C.dim, padding: '3px 6px', borderRadius: 4, fontFamily: C.font, fontSize: 10 }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: C.font, fontSize: 15, fontWeight: 700, color: C.bright }}>{ticker}</span>
              {row.bottleneck_score != null && (
                <span style={{ fontFamily: C.font, fontSize: 10, color: C.amber }}>score {row.bottleneck_score}</span>
              )}
              {row.confidence && (
                <span style={{ padding: '1px 6px', background: `${confClr(row.confidence)}15`, border: `1px solid ${confClr(row.confidence)}35`, borderRadius: 3, fontFamily: C.font, fontSize: 9, color: confClr(row.confidence) }}>
                  {row.confidence}
                </span>
              )}
              {row.evidence_grade && <GradeBadge grade={row.evidence_grade} />}
            </div>
            <div style={{ fontFamily: C.sans, fontSize: 11, color: C.dim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.dim, cursor: 'pointer', padding: 4 }}>
            <X size={13} />
          </button>
        </div>

        {/* Meta strip */}
        <div style={{ display: 'flex', gap: 14, padding: '7px 20px', borderBottom: `1px solid ${C.borderFaint}`, background: C.indigoSub, flexShrink: 0, flexWrap: 'wrap' }}>
          {primaryAnchor && <span style={{ fontFamily: C.font, fontSize: 9, color: C.indigoFg }}>via {primaryAnchor}</span>}
          {row.layer_name   && <span style={{ fontFamily: C.font, fontSize: 9, color: C.dim }}>{row.layer_name}</span>}
          {row.category_name && <span style={{ fontFamily: C.font, fontSize: 9, color: C.blue }}>{row.category_name}</span>}
          {(row.market_cap || row.marketCap) && <span style={{ fontFamily: C.font, fontSize: 9, color: C.dim }}>{fmtCap(row.market_cap || row.marketCap)}</span>}
          {cross.length > 0 && <span style={{ fontFamily: C.font, fontSize: 9, color: C.amber }}>in {cross.length + 1} anchors</span>}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TradingViewChart symbol={sym} />
          <div style={{ padding: '20px 22px' }}>
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '30px 0', color: C.dim }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontFamily: C.font, fontSize: 11 }}>Loading research…</span>
              </div>
            )}
            {sections.map(([title, content]) => (
              <ReportSection key={title} title={title} content={content} />
            ))}
            {Array.isArray(row.source_urls) && (row.source_urls as string[]).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.indigoFg, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sources</div>
                {(row.source_urls as string[]).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', fontFamily: C.font, fontSize: 10, color: C.blue, marginBottom: 4, wordBreak: 'break-all' }}>
                    {url}
                  </a>
                ))}
              </div>
            )}
            {cross.length > 0 && (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.amber, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Also in {cross.length} other anchor{cross.length !== 1 ? 's' : ''}
                </div>
                {cross.map((c: any, i: number) => (
                  <div key={c.anchor_key || i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: `2px solid ${C.border}` }}>
                    <div style={{ fontFamily: C.font, fontSize: 10, fontWeight: 700, color: C.bright, marginBottom: 2 }}>
                      {c.anchor_name || c.anchor_key}
                      {c.bottleneck_score != null && <span style={{ fontFamily: C.font, fontSize: 9, color: C.dim, marginLeft: 8 }}>score {c.bottleneck_score}</span>}
                    </div>
                    {c.supply_chain_role && (
                      <div style={{ fontFamily: C.sans, fontSize: 11, color: C.dim, lineHeight: 1.6 }}>{c.supply_chain_role}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Chain Reaction — Bottleneck Screener (rebuilt)
   ═══════════════════════════════════════════════════════════════════ */
function StrategyScreenerInner() {
  const [activeTab,    setActiveTab]    = useState<string>('multi-anchor');
  const [sortCol,      setSortCol]      = useState<string>('anchor_count');
  const [sortDir,      setSortDir]      = useState<'asc' | 'desc'>('desc');
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('all');
  const [scoreMin,     setScoreMin]     = useState(0);
  const [directFilter, setDirectFilter] = useState('all');
  const [selectedRow,  setSelectedRow]  = useState<{ ticker: string; primaryAnchor: string; tvSymbol?: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const qc = useQueryClient();

  const { data: anchorsData } = useQuery<any>({
    queryKey: ['bottlenecks-anchors'],
    queryFn:  fetchAnchorList,
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
  const anchors: any[] = useMemo(() => anchorsData?.anchors ?? [], [anchorsData]);

  const tabQKey = activeTab === 'multi-anchor'
    ? ['bottlenecks-multi-anchor']
    : ['bottlenecks-anchor', activeTab];

  const { data: tabData, isLoading, error } = useQuery<any>({
    queryKey: tabQKey,
    queryFn:  activeTab === 'multi-anchor'
      ? () => fetchMultiAnchorScreener({ min_anchors: 2, limit: 1000 })
      : () => fetchAnchorRows(activeTab),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const rawRows: any[] = useMemo(() => {
    if (!tabData) return [];
    return activeTab === 'multi-anchor' ? (tabData.items ?? []) : (tabData.rows ?? []);
  }, [tabData, activeTab]);

  const backendCount: number = useMemo(() => {
    if (!tabData) return 0;
    if (activeTab === 'multi-anchor') return tabData.count ?? rawRows.length;
    return tabData.total_count ?? tabData.curated_count ?? rawRows.length;
  }, [tabData, activeTab, rawRows.length]);

  const categories: string[] = useMemo(() => {
    const s = new Set<string>();
    for (const r of rawRows) {
      const c = r.category_name || r.themes?.[0] || '';
      if (c) s.add(c);
    }
    return ['all', ...Array.from(s).sort()];
  }, [rawRows]);

  const doSort = useCallback((col: string) => {
    setSortCol(prev => {
      if (prev === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return col; }
      setSortDir('desc');
      return col;
    });
  }, []);

  const displayRows: any[] = useMemo(() => {
    let rows = [...rawRows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        (r.ticker || r.bottleneck_ticker || '').toLowerCase().includes(q) ||
        (r.company_name || '').toLowerCase().includes(q)
      );
    }
    if (catFilter !== 'all') {
      rows = rows.filter(r => {
        const cat = r.category_name || r.themes?.[0] || '';
        return cat.toLowerCase().includes(catFilter.toLowerCase());
      });
    }
    if (scoreMin > 0) {
      rows = rows.filter(r => {
        const sc = activeTab === 'multi-anchor'
          ? (r.max_bottleneck_score ?? 0)
          : (r.bottleneck_score ?? r.final_score ?? 0);
        return sc >= scoreMin;
      });
    }
    if (directFilter !== 'all') {
      rows = rows.filter(r =>
        (r.confidence || r.directness || '').toLowerCase() === directFilter.toLowerCase()
      );
    }
    rows.sort((a, b) => {
      let cmp = 0;
      if (activeTab === 'multi-anchor') {
        if      (sortCol === 'anchor_count') cmp = (a.anchor_count ?? 0)           - (b.anchor_count ?? 0);
        else if (sortCol === 'max_score')    cmp = (a.max_bottleneck_score ?? 0)    - (b.max_bottleneck_score ?? 0);
        else if (sortCol === 'avg_score')    cmp = (a.avg_bottleneck_score ?? 0)    - (b.avg_bottleneck_score ?? 0);
        else if (sortCol === 'mktcap')       cmp = (a.market_cap ?? 0)              - (b.market_cap ?? 0);
        else if (sortCol === 'change')       cmp = (a.change_percent_1d ?? -999)    - (b.change_percent_1d ?? -999);
        else if (sortCol === 'ticker')       cmp = (a.ticker || '').localeCompare(b.ticker || '');
      } else {
        if      (sortCol === 'score')    cmp = (a.bottleneck_score ?? a.final_score ?? 0) - (b.bottleneck_score ?? b.final_score ?? 0);
        else if (sortCol === 'category') cmp = (a.category_order ?? 99) - (b.category_order ?? 99);
        else if (sortCol === 'mktcap')   cmp = (a.market_cap ?? a.marketCap ?? 0) - (b.market_cap ?? b.marketCap ?? 0);
        else if (sortCol === 'change')   cmp = (a.change_percent_1d ?? -999) - (b.change_percent_1d ?? -999);
        else if (sortCol === 'ticker')   cmp = (a.bottleneck_ticker || a.ticker || '').localeCompare(b.bottleneck_ticker || b.ticker || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [rawRows, search, catFilter, scoreMin, directFilter, sortCol, sortDir, activeTab]);

  const switchTab = useCallback((key: string) => {
    setActiveTab(key);
    setSearch(''); setCatFilter('all'); setScoreMin(0); setDirectFilter('all');
    setSelectedRow(null);
    if (key === 'multi-anchor') { setSortCol('anchor_count'); setSortDir('desc'); }
    else                        { setSortCol('score');        setSortDir('desc'); }
  }, []);

  useSetPageContext('[Page: Chain Reaction Bottlenecks — Multi-anchor supply chain intelligence screener]');

  const tkOf   = (r: any) => r.ticker || r.bottleneck_ticker || '';
  const nameOf = (r: any) => r.company_name || tkOf(r);
  const tvOf   = (r: any) => r.tradingview_symbol || tkOf(r);

  const activeAnchorMeta = anchors.find(a => a.anchor_key === activeTab);

  const headerLine = useMemo(() => {
    if (activeTab === 'multi-anchor') {
      const anchorSet = new Set<string>();
      for (const r of rawRows) (r.anchors || []).forEach((a: string) => anchorSet.add(a));
      return `${backendCount} multi-anchor bottlenecks across ${anchorSet.size} anchors`;
    }
    const catSet = new Set<string>();
    for (const r of rawRows) { const c = r.category_name || ''; if (c) catSet.add(c); }
    return `${backendCount} bottlenecks${catSet.size > 0 ? ` across ${catSet.size} categories` : ''}`;
  }, [activeTab, backendCount, rawRows]);

  const fmtChange = (v?: number | null) => {
    if (v == null) return <span style={{ color: C.muted, fontFamily: C.font, fontSize: 10 }}>—</span>;
    const clr = v > 0 ? C.green : v < 0 ? C.red : C.dim;
    return <span style={{ color: clr, fontFamily: C.font, fontSize: 10 }}>{v > 0 ? '+' : ''}{v.toFixed(2)}%</span>;
  };
  const fmtScore = (v?: number | null) => {
    if (v == null) return <span style={{ color: C.muted, fontFamily: C.font, fontSize: 10 }}>—</span>;
    const clr = v >= 85 ? C.red : v >= 65 ? C.amber : v >= 45 ? C.blue : C.dim;
    return <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, color: clr }}>{Math.round(v)}</span>;
  };
  const confBadge = (conf?: string) => {
    if (!conf) return <span style={{ color: C.muted, fontFamily: C.font, fontSize: 9 }}>—</span>;
    const clr = conf === 'high' ? C.green : conf === 'medium' ? C.amber : C.dim;
    return (
      <span style={{ padding: '1px 6px', background: `${clr}15`, border: `1px solid ${clr}30`, borderRadius: 3, fontFamily: C.font, fontSize: 9, color: clr }}>
        {conf}
      </span>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .bn-row:hover { background:rgba(255,255,255,0.03)!important; cursor:pointer; }
        .bn-row td { border-bottom:1px solid ${C.borderFaint}; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 20px 80px' }}>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <div style={{ padding: '28px 0 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.indigo, display: 'inline-block', flexShrink: 0 }} />
                <span style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.indigoFg, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Chain Reaction · Bottlenecks
                </span>
              </div>
              <h1 style={{ fontFamily: C.sans, fontSize: 22, fontWeight: 700, color: C.bright, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                Chain Reaction
              </h1>
              <p style={{ fontFamily: C.sans, fontSize: 11, color: C.dim, margin: 0, maxWidth: 520, lineHeight: 1.55 }}>
                Anchor companies driving today's major themes — and the suppliers, scarce enablers, and bottleneck plays around them.
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              style={{ padding: '6px 14px', background: C.indigoSub, border: `1px solid ${C.border}`, borderRadius: 6, color: C.dim, fontFamily: C.font, fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              + Add Entry
            </button>
          </div>
        </div>

        {/* ── Tab bar ──────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
          {(() => {
            const active = activeTab === 'multi-anchor';
            return (
              <button key="multi-anchor" onClick={() => switchTab('multi-anchor')} style={{
                padding: '10px 16px', background: 'transparent', border: 'none',
                borderBottom: active ? `2px solid ${C.indigo}` : '2px solid transparent',
                color: active ? C.bright : C.dim,
                fontFamily: C.font, fontSize: 10, fontWeight: active ? 700 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                Multi-anchor bottlenecks
                {active && backendCount > 0 && (
                  <span style={{ marginLeft: 5, color: C.indigoFg, fontSize: 9 }}>({backendCount})</span>
                )}
              </button>
            );
          })()}
          <div style={{ width: 1, background: C.border, margin: '8px 0', flexShrink: 0 }} />
          {anchors.map(a => {
            const active = activeTab === a.anchor_key;
            return (
              <button key={a.anchor_key} onClick={() => switchTab(a.anchor_key)} style={{
                padding: '10px 14px', background: 'transparent', border: 'none',
                borderBottom: active ? `2px solid ${C.indigo}` : '2px solid transparent',
                color: active ? C.bright : C.dim,
                fontFamily: C.font, fontSize: 10, fontWeight: active ? 700 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {a.visible_name || a.anchor_name || a.anchor_key}
                {active && backendCount > 0 && (
                  <span style={{ marginLeft: 5, color: C.indigoFg, fontSize: 9 }}>({backendCount})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Anchor subtitle ──────────────────────────────────── */}
        {activeAnchorMeta?.subtitle && (
          <div style={{ padding: '5px 2px 0', fontFamily: C.font, fontSize: 9, color: C.dim }}>
            {activeAnchorMeta.subtitle}
          </div>
        )}

        {/* ── Filter bar ───────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 0 6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ticker / company…"
            style={{ padding: '5px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontFamily: C.font, fontSize: 10, outline: 'none', minWidth: 180 }}
          />
          {categories.length > 2 && (
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              style={{ padding: '5px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontFamily: C.font, fontSize: 10, outline: 'none' }}>
              {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
            </select>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: C.font, fontSize: 9, color: C.dim }}>Score ≥</span>
            <input type="number" min={0} max={100} value={scoreMin || ''} onChange={e => setScoreMin(e.target.value ? Number(e.target.value) : 0)} placeholder="0"
              style={{ width: 46, padding: '5px 8px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontFamily: C.font, fontSize: 10, outline: 'none' }} />
          </div>
          <select value={directFilter} onChange={e => setDirectFilter(e.target.value)}
            style={{ padding: '5px 10px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, color: C.text, fontFamily: C.font, fontSize: 10, outline: 'none' }}>
            <option value="all">All confidence</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {(search || catFilter !== 'all' || scoreMin > 0 || directFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setCatFilter('all'); setScoreMin(0); setDirectFilter('all'); }}
              style={{ padding: '4px 10px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.dim, fontFamily: C.font, fontSize: 9, cursor: 'pointer' }}>
              Clear
            </button>
          )}
          <span style={{ fontFamily: C.font, fontSize: 9, color: C.muted, marginLeft: 'auto' }}>
            {displayRows.length !== backendCount
              ? `${displayRows.length} of ${backendCount} rows`
              : headerLine}
          </span>
        </div>

        {/* ── States ───────────────────────────────────────────── */}
        {isLoading && !tabData && <LoadingState />}
        {error && !tabData && (
          <ErrorState
            message={`Could not load: ${(error as Error).message || 'Unknown error'}`}
            onRetry={() => qc.invalidateQueries({ queryKey: tabQKey })}
          />
        )}

        {/* ── Table ────────────────────────────────────────────── */}
        {tabData && (
          displayRows.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: C.dim, fontFamily: C.sans, fontSize: 14 }}>
              {rawRows.length === 0 ? 'No data available for this anchor.' : 'No rows match your filters — clear to see all rows.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: 2 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                  <tr>
                    {activeTab === 'multi-anchor' ? (<>
                      <ColHeader col="ticker"       label="Ticker"     sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                      <ColHeader col="name"         label="Company"    sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                      <th style={{ ...TH_STYLE, textAlign: 'left' }}>Anchors</th>
                      <ColHeader col="anchor_count" label="# Anchors"  sortCol={sortCol} sortDir={sortDir} onSort={doSort} right />
                      <ColHeader col="max_score"    label="Max Score"  sortCol={sortCol} sortDir={sortDir} onSort={doSort} right />
                      <ColHeader col="avg_score"    label="Avg Score"  sortCol={sortCol} sortDir={sortDir} onSort={doSort} right />
                      <th style={{ ...TH_STYLE, textAlign: 'left' }}>Grade</th>
                      <ColHeader col="mktcap"       label="Mkt Cap"    sortCol={sortCol} sortDir={sortDir} onSort={doSort} right />
                      <ColHeader col="change"       label="1D%"        sortCol={sortCol} sortDir={sortDir} onSort={doSort} right />
                      <th style={{ ...TH_STYLE, textAlign: 'left', minWidth: 200 }}>Primary Role</th>
                    </>) : (<>
                      <ColHeader col="ticker"   label="Ticker"    sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                      <ColHeader col="name"     label="Company"   sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                      <ColHeader col="category" label="Category"  sortCol={sortCol} sortDir={sortDir} onSort={doSort} />
                      <th style={{ ...TH_STYLE, textAlign: 'left', minWidth: 160 }}>Role</th>
                      <ColHeader col="score"    label="Score"     sortCol={sortCol} sortDir={sortDir} onSort={doSort} right />
                      <th style={{ ...TH_STYLE, textAlign: 'left' }}>Confidence</th>
                      <ColHeader col="mktcap"   label="Mkt Cap"   sortCol={sortCol} sortDir={sortDir} onSort={doSort} right />
                      <ColHeader col="change"   label="1D%"       sortCol={sortCol} sortDir={sortDir} onSort={doSort} right />
                      <th style={{ ...TH_STYLE, textAlign: 'left', minWidth: 200 }}>Why it matters</th>
                    </>)}
                    <th style={{ ...TH_STYLE, width: 18 }} />
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((r, idx) => {
                    const tk = tkOf(r);
                    const primaryAnchor = activeTab === 'multi-anchor'
                      ? (r.anchors?.[0] || '')
                      : activeTab;
                    return (
                      <tr
                        key={`${activeTab}-${tk}-${idx}`}
                        className="bn-row"
                        onClick={() => setSelectedRow({ ticker: tk, primaryAnchor, tvSymbol: tvOf(r) })}
                        style={{ background: 'transparent' }}
                      >
                        {activeTab === 'multi-anchor' ? (<>
                          <td style={TD}>
                            <span style={{ fontFamily: C.font, fontSize: 12, fontWeight: 700, color: C.bright }}>{tk || '—'}</span>
                            {r.manual_added && <span style={{ display: 'block', fontFamily: C.font, fontSize: 8, color: C.blue, marginTop: 1 }}>Manual</span>}
                          </td>
                          <td style={{ ...TD, maxWidth: 180 }}>
                            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.text, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(r)}</span>
                          </td>
                          <td style={{ ...TD, maxWidth: 260 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                              {(r.anchor_names || r.anchors || []).slice(0, 7).map((an: string, i: number) => (
                                <span key={i} style={{ padding: '1px 5px', background: C.indigoSub, border: `1px solid ${C.border}`, borderRadius: 3, fontFamily: C.font, fontSize: 8, color: C.indigoFg, whiteSpace: 'nowrap' }}>{an}</span>
                              ))}
                              {(r.anchor_names || r.anchors || []).length > 7 && (
                                <span style={{ fontFamily: C.font, fontSize: 8, color: C.dim }}>+{(r.anchor_names || r.anchors || []).length - 7}</span>
                              )}
                            </div>
                          </td>
                          <td style={{ ...TD, textAlign: 'right' }}>
                            <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, color: C.amber }}>{r.anchor_count ?? '—'}</span>
                          </td>
                          <td style={{ ...TD, textAlign: 'right' }}>{fmtScore(r.max_bottleneck_score)}</td>
                          <td style={{ ...TD, textAlign: 'right' }}>{fmtScore(r.avg_bottleneck_score)}</td>
                          <td style={TD}><GradeBadge grade={r.best_evidence_grade} /></td>
                          <td style={{ ...TD, textAlign: 'right' }}><span style={{ fontFamily: C.font, fontSize: 10, color: C.dim }}>{fmtCap(r.market_cap ?? r.marketCap)}</span></td>
                          <td style={{ ...TD, textAlign: 'right' }}>{fmtChange(r.change_percent_1d)}</td>
                          <td style={{ ...TD, maxWidth: 280 }}>
                            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.dim, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {(r.roles_by_anchor && (Object.values(r.roles_by_anchor)[0] as string)) || '—'}
                            </span>
                          </td>
                        </>) : (<>
                          <td style={TD}>
                            <span style={{ fontFamily: C.font, fontSize: 12, fontWeight: 700, color: C.bright }}>{tk || '—'}</span>
                            {r.manual_added && <span style={{ display: 'block', fontFamily: C.font, fontSize: 8, color: C.blue, marginTop: 1 }}>Manual</span>}
                          </td>
                          <td style={{ ...TD, maxWidth: 180 }}>
                            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.text, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(r)}</span>
                          </td>
                          <td style={TD}><span style={{ fontFamily: C.font, fontSize: 10, color: C.blue }}>{r.category_name || r.themes?.[0] || '—'}</span></td>
                          <td style={{ ...TD, maxWidth: 200 }}>
                            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.dim, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.supply_chain_role || '—'}</span>
                          </td>
                          <td style={{ ...TD, textAlign: 'right' }}>{fmtScore(r.bottleneck_score ?? r.final_score)}</td>
                          <td style={TD}>{confBadge(r.confidence)}</td>
                          <td style={{ ...TD, textAlign: 'right' }}><span style={{ fontFamily: C.font, fontSize: 10, color: C.dim }}>{fmtCap(r.market_cap ?? r.marketCap)}</span></td>
                          <td style={{ ...TD, textAlign: 'right' }}>{fmtChange(r.change_percent_1d)}</td>
                          <td style={{ ...TD, maxWidth: 280 }}>
                            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.dim, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.why_it_matters || '—'}</span>
                          </td>
                        </>)}
                        <td style={{ ...TD, color: C.dim, fontSize: 14, textAlign: 'center', width: 18 }}>›</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* ── Drawer ───────────────────────────────────────────── */}
      {selectedRow && (
        <BottleneckDrawer
          ticker={selectedRow.ticker}
          primaryAnchor={selectedRow.primaryAnchor}
          tvSymbol={selectedRow.tvSymbol}
          onClose={() => setSelectedRow(null)}
        />
      )}

      {/* ── Manual add modal ────────────────────────────────── */}
      {showAddModal && (
        <ManualAddModal
          defaultAnchorKey={activeTab === 'multi-anchor' ? '' : activeTab}
          anchorOptions={anchors}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: tabQKey }); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Shared constants + helpers for the three new strategy tabs
   ═══════════════════════════════════════════════════════════════════ */
const STRAT_BACKEND = 'https://fast-api-server-aidanpilon.replit.app';
const STRAT_KEY     = 'hippo_ak_7f3x9k2m4p8q1w5t';

const CC = {
  spx:   '#22c55e',
  vix:   '#f87171',
  yield: '#fbbf24',
  c7:    '#38bdf8',
  c30:   '#94a3b8',
  c63:   '#fb923c',
};

const TF_ROWS: Record<string, number> = { '7D': 10, '90D': 66, '1Y': 252, '5Y': 9999 };

const TT: CSSProperties = {
  background: '#050505',
  border: '1px solid #1c1c1c',
  borderRadius: 6,
  fontFamily: 'monospace',
  fontSize: 10,
  color: '#e2e8f0',
};

const WEEKLY_PROMPT =
  'Analyze the Weekly Price Movements scorecard. Compare 5-year, 1-year, past-quarter, and 7-day behavior. ' +
  'Explain which scenarios have meaningful sample size, whether recent behavior is diverging from long-term averages, ' +
  'and what risk regime this suggests. Do not give hard financial advice.';

const SCENARIO_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  red_friday_to_monday:   { label: 'Down Friday → Monday', icon: '▼', color: C.red   },
  green_friday_to_monday: { label: 'Up Friday → Monday',   icon: '▲', color: C.green },
  red_monday_to_friday:   { label: 'Down Monday → Friday', icon: '▼', color: C.red   },
  green_monday_to_friday: { label: 'Up Monday → Friday',   icon: '▲', color: C.green },
};

const SCENARIO_SHORT: Record<string, string> = {
  red_friday_to_monday:   'Dn Fri→Mon',
  green_friday_to_monday: 'Up Fri→Mon',
  red_monday_to_friday:   'Dn Mon→Fri',
  green_monday_to_friday: 'Up Mon→Fri',
};

/* ── Pure helpers ────────────────────────────────────────────────── */
function sgn(v?: number | null): string {
  return v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}
function sgnBps(v?: number | null): string {
  return v == null ? '—' : `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)} bps`;
}
function fmtCorr(v?: number | null): string {
  return v == null ? '—' : v.toFixed(3);
}
function fmtPrice2(v?: number | null): string {
  if (v == null) return '—';
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtNum2(v?: number | null): string {
  return v == null ? '—' : Number(v).toFixed(2);
}
function fmtYield(v?: number | null): string {
  return v == null ? '—' : `${Number(v).toFixed(3)}%`;
}
function fmtTs2(d?: string | null): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
}
function warnLevelColor(level?: string): string {
  if (!level) return C.dim;
  const l = level.toLowerCase();
  if (l.includes('extreme') || l.includes('critical')) return C.red;
  if (l.includes('high') || l.includes('elevated'))    return '#f97316';
  if (l.includes('caution') || l.includes('moderate')) return C.amber;
  if (l.includes('low') || l.includes('calm'))         return C.green;
  return C.dim;
}
function regimeLabelText(key?: string): string {
  return ({
    yields_rising_spx_rising:   'Yields ↑ · SPX ↑',
    yields_rising_spx_falling:  'Yields ↑ · SPX ↓',
    yields_falling_spx_rising:  'Yields ↓ · SPX ↑',
    yields_falling_spx_falling: 'Yields ↓ · SPX ↓',
    mixed_flat:                 'Mixed / Flat',
  } as Record<string, string>)[key ?? ''] ?? (key ?? '—');
}
function regimeColor(key?: string): string {
  if (key === 'yields_rising_spx_rising')   return C.green;
  if (key === 'yields_rising_spx_falling')  return C.red;
  if (key === 'yields_falling_spx_rising')  return C.blue;
  if (key === 'yields_falling_spx_falling') return C.amber;
  return C.muted;
}
function confColor(label?: string): string {
  const l = (label ?? '').toLowerCase();
  if (l.includes('high'))   return C.green;
  if (l.includes('medium')) return C.amber;
  return C.dim;
}
function fmtProb(v?: number | null): string {
  if (v == null) return '—';
  let n = Number(v);
  if (n > 100 && n <= 10000) n = n / 100;
  return `${n.toFixed(1)}%`;
}
function fmtProbNum(v?: number | null): number | null {
  if (v == null) return null;
  let n = Number(v);
  if (n > 100 && n <= 10000) n = n / 100;
  return n;
}
function fmtChartDate(d: string, numRows: number): string {
  if (!d || d.length < 10) return d ?? '';
  const [y, m, day] = d.split('-');
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon = MONTHS[parseInt(m) - 1] ?? m;
  if (numRows > 200) return `${mon} '${y.slice(2)}`;
  return `${mon} ${day}`;
}

/* ── UI sub-components ───────────────────────────────────────────── */
function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${C.borderFaint}` }}>
      <span style={{ fontFamily: C.font, fontSize: 10, color: C.dim }}>{label}</span>
      <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, color: color ?? C.bright }}>{value}</span>
    </div>
  );
}
function MetricPair({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ fontFamily: C.font, fontSize: 9, color: C.dim, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: C.font, fontSize: 12, fontWeight: 700, color: color ?? C.bright }}>{value}</div>
    </div>
  );
}
function SCard({ title, accent, children }: { title: string; accent?: string; children: ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: accent ?? C.indigo, borderRadius: '10px 0 0 10px' }} />
      <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: accent ?? C.indigoFg, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
function FreshWarn({ warning }: { warning?: string | null }) {
  if (!warning) return null;
  return (
    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
      <AlertCircle size={13} style={{ color: C.amber, flexShrink: 0 }} />
      <span style={{ fontFamily: C.sans, fontSize: 12, color: C.amber }}>{warning}</span>
    </div>
  );
}
function SrcFooter({ generatedAt, cacheTtl, sources }: { generatedAt?: string; cacheTtl?: number; sources?: Record<string, unknown> }) {
  if (!generatedAt && !sources) return null;
  return (
    <div style={{ marginTop: 20, paddingTop: 12, borderTop: `1px solid ${C.borderFaint}`, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      {generatedAt && (
        <span style={{ fontFamily: C.font, fontSize: 9, color: C.muted }}>
          Generated {fmtTs2(generatedAt)}{cacheTtl ? ` · TTL ${Math.round(cacheTtl / 60)}m` : ''}
        </span>
      )}
      {sources && Object.entries(sources).filter(([k]) => k !== 'freshness_warning').map(([k, v]) => (
        <span key={k} style={{ fontFamily: C.font, fontSize: 9, color: C.muted }}>
          {k}: <span style={{ color: C.dim }}>{String(v)}</span>
        </span>
      ))}
    </div>
  );
}

function HeroStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ flex: '1 1 auto', minWidth: 100 }}>
      <div style={{ fontFamily: C.font, fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: C.font, fontSize: 18, fontWeight: 700, color: color ?? C.bright, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: C.font, fontSize: 10, color: C.dim, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}
function HeroStrip({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 22px', marginBottom: 16 }}>
      {children}
    </div>
  );
}
function ChartBox({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 14 }}>
      <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.indigoFg, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: subtitle ? 2 : 10 }}>
        {title}
      </div>
      {subtitle && <div style={{ fontFamily: C.sans, fontSize: 11, color: C.dim, marginBottom: 10 }}>{subtitle}</div>}
      {children}
    </div>
  );
}
function TfBtn({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = ['7D', '90D', '1Y', '5Y'] as const;
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
      {opts.map(t => {
        const active = value === t;
        return (
          <button key={t} onClick={() => onChange(t)} style={{
            padding: '4px 13px', borderRadius: 5, cursor: 'pointer',
            fontFamily: C.font, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            background: active ? `${C.indigo}1a` : 'transparent',
            color: active ? C.indigoFg : C.dim,
            border: `1px solid ${active ? `${C.indigo}55` : C.border}`,
            transition: 'all 0.12s',
          }}>
            {t}
          </button>
        );
      })}
    </div>
  );
}
function CorrelationEmptyMsg() {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: C.dim, fontFamily: C.sans, fontSize: 12 }}>
      Not enough data for rolling correlation in this window.
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 1: VIX Risk Regime
   ═══════════════════════════════════════════════════════════════════ */
function VixRiskRegimeTab() {
  const [tf, setTf] = useState<string>('1Y');

  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['strategy-vix-risk-regime'],
    queryFn: () => fetch('/api/strategy/vix-risk-regime').then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
  });

  const allTs: any[] = data?.chart_data?.vix_spx_timeseries ?? [];
  const nRows = tf === '5Y' ? allTs.length : TF_ROWS[tf] ?? 252;
  const ts = allTs.slice(-nRows);
  const corrTs = ts.filter((r: any) => r.rolling_corr_7d != null || r.rolling_corr_30d != null || r.rolling_corr_63d != null);
  const last30 = ts.slice(-30);

  const snap    = data?.current_market_snapshot ?? {};
  const sig     = data?.vix_regime_signal ?? {};
  const corr    = data?.vix_spx_correlation ?? {};
  const windows = data?.historical_windows ?? {};
  const sources = data?.data_sources ?? {};
  const warnClr = warnLevelColor(sig.warning_level);

  useSetPageContext(
    data
      ? `[Page: VIX Risk Regime | TF: ${tf}]\nvix: ${snap.vix} | zone: ${data.vix_zone} | regime: ${data.risk_regime}\n` +
        `signal: ${sig.signal_title} | 30D corr: ${corr.rolling_corr_30d}\n` +
        `rows visible: ${ts.length} (${ts[0]?.date ?? ''} → ${ts[ts.length - 1]?.date ?? ''})\n` +
        JSON.stringify({ signal: sig, snapshot: snap, correlation: corr })
      : null,
    [data, tf],
  );

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={`Could not load VIX Risk Regime: ${(error as Error).message}`} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div style={{ padding: '24px 0', minHeight: 400 }}>
      <FreshWarn warning={sources.freshness_warning as string} />

      {/* Hero strip */}
      <HeroStrip>
        <HeroStat
          label="VIX"
          value={fmtNum2(snap.vix)}
          sub={sgn(snap.vix_change_pct) + ' today'}
          color={(snap.vix ?? 0) >= 30 ? C.red : (snap.vix ?? 0) >= 20 ? C.amber : C.green}
        />
        <HeroStat label="VIX Zone" value={data.vix_zone ?? '—'} color={warnClr} />
        <HeroStat label="Risk Regime" value={data.risk_regime ?? '—'} color={warnClr} />
        <HeroStat
          label="S&P 500"
          value={fmtPrice2(snap.spx_price)}
          sub={sgn(snap.spx_change_pct) + ' today'}
          color={(snap.spx_change_pct ?? 0) >= 0 ? C.green : C.red}
        />
        <HeroStat
          label="30D Corr"
          value={fmtCorr(corr.rolling_corr_30d)}
          sub={(corr.rolling_corr_30d ?? 0) < 0 ? 'Inverse relationship' : 'Same-direction'}
          color={(corr.rolling_corr_30d ?? 0) < 0 ? C.amber : C.green}
        />
        {sig.signal_title && (
          <div style={{ padding: '3px 10px', background: `${warnClr}14`, border: `1px solid ${warnClr}40`, borderRadius: 5, fontFamily: C.font, fontSize: 9, fontWeight: 700, color: warnClr, textTransform: 'uppercase', alignSelf: 'center', letterSpacing: '0.07em' }}>
            {sig.signal_title}
          </div>
        )}
      </HeroStrip>

      {/* Timeframe toggle */}
      <TfBtn value={tf} onChange={setTf} />

      {/* VIX vs SPX dual-axis chart */}
      <ChartBox title="VIX vs S&P 500" subtitle="Left axis: SPX price · Right axis: VIX level · Horizontal lines at 20, 30, 40">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={ts} margin={{ top: 4, right: 52, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false} axisLine={false}
              tickFormatter={d => fmtChartDate(d, ts.length)}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="spx"
              orientation="left"
              tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false} axisLine={false}
              width={52}
              domain={['auto', 'auto']}
              tickFormatter={v => `$${Number(v).toFixed(0)}`}
            />
            <YAxis
              yAxisId="vix"
              orientation="right"
              tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false} axisLine={false}
              width={30}
              domain={[0, 55]}
              tickFormatter={v => Number(v).toFixed(0)}
            />
            <Tooltip
              contentStyle={TT}
              formatter={(v: any, name: string) =>
                name === 'SPX' ? [`$${Number(v).toFixed(2)}`, 'SPX'] : [Number(v).toFixed(2), name]
              }
              labelFormatter={l => `Date: ${l}`}
            />
            <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 9, color: C.dim }} />
            <Line yAxisId="spx" dataKey="spx_close" stroke={CC.spx} dot={false} name="SPX" strokeWidth={1.5} isAnimationActive={false} connectNulls />
            <Line yAxisId="vix" dataKey="vix_close" stroke={CC.vix} dot={false} name="VIX" strokeWidth={1.5} isAnimationActive={false} connectNulls />
            <ReferenceLine yAxisId="vix" y={20} stroke={C.amber} strokeDasharray="4 2" strokeOpacity={0.55}
              label={{ value: '20', position: 'insideRight', fill: C.amber, fontSize: 8, fontFamily: 'monospace' }} />
            <ReferenceLine yAxisId="vix" y={30} stroke={C.red} strokeDasharray="4 2" strokeOpacity={0.55}
              label={{ value: '30', position: 'insideRight', fill: C.red, fontSize: 8, fontFamily: 'monospace' }} />
            <ReferenceLine yAxisId="vix" y={40} stroke={C.red} strokeDasharray="2 2" strokeOpacity={0.8}
              label={{ value: '40', position: 'insideRight', fill: C.red, fontSize: 8, fontFamily: 'monospace' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartBox>

      {/* Rolling correlation chart */}
      <ChartBox
        title="Rolling Correlation — VIX % vs SPX Return"
        subtitle="Negative = VIX rises when SPX falls (inverse, expected). Near –1.0 = strong inverse. Reference line at 0."
      >
        {corrTs.length > 2 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={corrTs} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                tickFormatter={d => fmtChartDate(d, corrTs.length)}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[-1, 1]}
                tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                width={30}
                tickFormatter={v => Number(v).toFixed(1)}
              />
              <Tooltip
                contentStyle={TT}
                formatter={(v: any, name: string) => v != null ? [Number(v).toFixed(3), name] : ['—', name]}
                labelFormatter={l => `Date: ${l}`}
              />
              <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 9, color: C.dim }} />
              <ReferenceLine y={0} stroke={C.dim} strokeDasharray="3 3"
                label={{ value: '0', position: 'insideRight', fill: C.dim, fontSize: 8, fontFamily: 'monospace' }} />
              <Line dataKey="rolling_corr_7d"  stroke={CC.c7}  dot={false} name="7D"  strokeWidth={1}   isAnimationActive={false} connectNulls={false} />
              <Line dataKey="rolling_corr_30d" stroke={CC.c30} dot={false} name="30D" strokeWidth={1.5} isAnimationActive={false} connectNulls={false} />
              <Line dataKey="rolling_corr_63d" stroke={CC.c63} dot={false} name="63D" strokeWidth={1.5} isAnimationActive={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <CorrelationEmptyMsg />}
      </ChartBox>

      {/* Daily moves bar chart */}
      {last30.some((r: any) => r.spx_return_pct != null) && (
        <ChartBox title={`Daily Moves — Last ${last30.length} Sessions`} subtitle="SPX % return vs VIX % change side by side">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last30} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barSize={4} barGap={1} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: C.muted, fontSize: 8, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                tickFormatter={d => fmtChartDate(d, 30)}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                width={36}
                tickFormatter={v => `${Number(v).toFixed(1)}%`}
              />
              <Tooltip
                contentStyle={TT}
                formatter={(v: any, name: string) => v != null ? [`${Number(v).toFixed(2)}%`, name] : ['—', name]}
                labelFormatter={l => `Date: ${l}`}
              />
              <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 9, color: C.dim }} />
              <ReferenceLine y={0} stroke={C.dim} />
              <Bar dataKey="spx_return_pct" name="SPX %" fill={CC.spx} isAnimationActive={false} />
              <Bar dataKey="vix_change_pct"  name="VIX %" fill={CC.vix} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      )}

      {/* Signal block */}
      {sig.signal_title && (
        <div style={{ background: `${warnClr}0a`, border: `1px solid ${warnClr}40`, borderRadius: 10, padding: '16px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: warnClr }}>
              {sig.signal_title}
            </span>
            {sig.warning_level && (
              <span style={{ padding: '2px 8px', background: `${warnClr}18`, border: `1px solid ${warnClr}40`, borderRadius: 4, fontFamily: C.font, fontSize: 9, fontWeight: 700, color: warnClr, textTransform: 'uppercase' }}>
                {sig.warning_level}
              </span>
            )}
          </div>
          {sig.signal_summary && <p style={{ fontFamily: C.sans, fontSize: 13, color: C.text, lineHeight: 1.7, margin: '0 0 10px' }}>{sig.signal_summary}</p>}
          {Array.isArray(sig.rules_used) && sig.rules_used.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {(sig.rules_used as string[]).map((r, i) => (
                <span key={i} style={{ padding: '2px 8px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: C.font, fontSize: 9, color: C.dim }}>
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Correlation summary strip */}
      {Object.keys(corr).length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 18px', marginBottom: 14 }}>
          <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.indigoFg, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>VIX / SPX Correlation</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 8 }}>
            {([['7D', corr.rolling_corr_7d], ['30D', corr.rolling_corr_30d], ['63D', corr.rolling_corr_63d]] as [string, number][]).map(([lbl, v]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: C.font, fontSize: 20, fontWeight: 700, color: C.bright }}>{fmtCorr(v)}</div>
                <div style={{ fontFamily: C.font, fontSize: 9, color: C.dim, marginTop: 2 }}>{lbl}</div>
                <div style={{ fontFamily: C.font, fontSize: 9, color: v < 0 ? C.amber : C.green, marginTop: 1 }}>{v < 0 ? 'Inverse' : 'Same-dir'}</div>
              </div>
            ))}
          </div>
          {corr.interpretation && (
            <p style={{ fontFamily: C.sans, fontSize: 11, color: C.dim, lineHeight: 1.65, margin: '6px 0 0', borderTop: `1px solid ${C.borderFaint}`, paddingTop: 6 }}>
              {corr.interpretation}
            </p>
          )}
        </div>
      )}

      {/* Historical windows */}
      {Object.keys(windows).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Historical Windows</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            {(['7d', 'quarter', '1y', '5y'] as string[]).map(key => {
              const w = windows[key];
              if (!w) return null;
              const ret = w.spx_return_pct as number;
              return (
                <div key={key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.indigoFg, textTransform: 'uppercase', marginBottom: 8 }}>
                    {key === 'quarter' ? '90D' : key.toUpperCase()} <span style={{ fontWeight: 400, color: C.muted }}>· {w.window}</span>
                  </div>
                  <StatRow label="VIX Min" value={fmtNum2(w.vix_min)} />
                  <StatRow label="VIX Max" value={fmtNum2(w.vix_max)} />
                  <StatRow label="VIX Avg" value={fmtNum2(w.vix_avg)} />
                  <StatRow label="SPX Return" value={sgn(ret)} color={ret >= 0 ? C.green : C.red} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SrcFooter generatedAt={data.generated_at} cacheTtl={data.cache_ttl_seconds} sources={sources} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 2: Weekly Price Movements
   ═══════════════════════════════════════════════════════════════════ */
function WeeklyPriceMovementsTab() {
  const [wKey, setWKey] = useState<string>('1y');
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [aiText, setAiText]   = useState('');

  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['strategy-weekly-price-movements'],
    queryFn: () => fetch('/api/strategy/weekly-price-movements').then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 60 * 60_000,
    gcTime: 90 * 60_000,
    retry: 1,
  });

  const win: any        = data?.windows?.[wKey] ?? {};
  const ctx: any        = data?.current_week_context ?? {};

  // window_summaries is an object with numeric string keys (0–15)
  const allSummaries: any[] = Object.values(data?.chart_data?.window_summaries ?? {});
  const selSummaries = allSummaries.filter((s: any) => s.window_key === wKey);

  const SCENARIO_KEYS = [
    'red_friday_to_monday',
    'green_friday_to_monday',
    'red_monday_to_friday',
    'green_monday_to_friday',
  ];

  // Probability chart data
  const probChartData = selSummaries.map((s: any) => ({
    name: SCENARIO_SHORT[s.scenario_key] ?? s.scenario_key,
    Green: fmtProbNum(s.green_probability),
    Red:   fmtProbNum(s.red_probability),
    insuf: s.insufficient_sample,
  }));

  // Average return chart data
  const avgRetData = selSummaries.map((s: any) => ({
    name: SCENARIO_SHORT[s.scenario_key] ?? s.scenario_key,
    avg:  s.average_return_pct,
    n:    s.sample_count,
  }));

  const askCaelyn = useCallback(async () => {
    if (!data) return;
    setAiState('loading');
    setAiText('');
    try {
      const res = await fetch(`${STRAT_BACKEND}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': STRAT_KEY },
        body: JSON.stringify({
          message: WEEKLY_PROMPT,
          screen_context: `[Weekly Price Movements | window: ${wKey}]\n${JSON.stringify({ windows: data.windows, current_week_context: ctx, selected_window_key: wKey })}`,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const j = await res.json();
      setAiText(j.response ?? j.message ?? JSON.stringify(j));
      setAiState('done');
    } catch (e: any) {
      setAiText(e?.message ?? 'Error contacting Caelyn.');
      setAiState('error');
    }
  }, [data, wKey]);

  useSetPageContext(
    data
      ? `[Page: Weekly Price Movements | window: ${wKey}]\n` +
        JSON.stringify({ window: win, context: ctx, selected_window_key: wKey })
      : null,
    [data, wKey],
  );

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={`Could not load Weekly Price Movements: ${(error as Error).message}`} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div style={{ padding: '24px 0', minHeight: 400 }}>
      <FreshWarn warning={data.freshness_warning as string} />

      {/* Hero strip */}
      <HeroStrip>
        <HeroStat label="Last Bar" value={ctx.last_bar_date ?? '—'} sub={ctx.today_weekday} />
        <HeroStat label="SPX Last Close" value={fmtPrice2(ctx.spx_last_close ?? ctx.last_close)} />
        <HeroStat label="52W High" value={fmtPrice2(ctx.spx_52w_high)} color={C.green} />
        <HeroStat label="52W Low"  value={fmtPrice2(ctx.spx_52w_low)}  color={C.red}   />
        {ctx.last_friday && (
          <HeroStat
            label={`Fri ${ctx.last_friday.date ?? ''}`}
            value={sgn(ctx.last_friday.change_pct)}
            sub={ctx.last_friday.direction === 'green' || ctx.last_friday.direction === 'up' ? '▲ Up day' : '▼ Down day'}
            color={(ctx.last_friday.direction === 'green' || ctx.last_friday.direction === 'up') ? C.green : C.red}
          />
        )}
        {ctx.last_monday && (
          <HeroStat
            label={`Mon ${ctx.last_monday.date ?? ''}`}
            value={sgn(ctx.last_monday.change_pct)}
            sub={ctx.last_monday.direction === 'green' || ctx.last_monday.direction === 'up' ? '▲ Up day' : '▼ Down day'}
            color={(ctx.last_monday.direction === 'green' || ctx.last_monday.direction === 'up') ? C.green : C.red}
          />
        )}
      </HeroStrip>

      {/* Window selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
        {([['5y', '5Y'], ['1y', '1Y'], ['quarter', '90D'], ['7d', '7D']] as [string, string][]).map(([k, lbl]) => {
          const active = wKey === k;
          return (
            <button key={k} onClick={() => setWKey(k)} style={{
              padding: '4px 14px', borderRadius: 5, cursor: 'pointer',
              fontFamily: C.font, fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              background: active ? `${C.indigo}1a` : 'transparent',
              color: active ? C.indigoFg : C.dim,
              border: `1px solid ${active ? `${C.indigo}55` : C.border}`,
              transition: 'all 0.12s',
            }}>
              {lbl}
            </button>
          );
        })}
      </div>

      {/* Probability comparison chart */}
      {probChartData.length > 0 && (
        <ChartBox
          title="Scenario Probabilities — Up vs Down"
          subtitle={`${wKey === 'quarter' ? '90D' : wKey.toUpperCase()} lookback · Green = SPX up · Red = SPX down`}
        >
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={probChartData} margin={{ top: 4, right: 20, left: 0, bottom: 38 }} barSize={20} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: C.muted, fontSize: 8, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                interval={0} angle={-20} textAnchor="end"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                width={30}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={TT}
                formatter={(v: any, name: string) => [`${Number(v).toFixed(1)}%`, name]}
                labelFormatter={l => `Scenario: ${l}`}
              />
              <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 9, color: C.dim }} />
              <ReferenceLine y={50} stroke={C.dim} strokeDasharray="3 3" />
              <Bar dataKey="Green" fill={CC.spx} name="Up prob"   isAnimationActive={false} />
              <Bar dataKey="Red"   fill={CC.vix} name="Down prob" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      )}

      {/* Average return chart */}
      {avgRetData.length > 0 && (
        <ChartBox
          title="Average Return by Scenario"
          subtitle="Based on historical occurrences · Sample count shown near bar"
        >
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={avgRetData} margin={{ top: 4, right: 20, left: 0, bottom: 38 }} barSize={28} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: C.muted, fontSize: 8, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                interval={0} angle={-20} textAnchor="end"
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                width={40}
                tickFormatter={v => `${Number(v).toFixed(2)}%`}
              />
              <Tooltip
                contentStyle={TT}
                formatter={(v: any, name: string) => [`${Number(v).toFixed(3)}%`, name]}
                labelFormatter={l => `Scenario: ${l}`}
              />
              <ReferenceLine y={0} stroke={C.dim} />
              <Bar dataKey="avg" name="Avg Return" isAnimationActive={false}>
                {avgRetData.map((entry: any, i: number) => (
                  <Cell key={i} fill={(entry.avg ?? 0) >= 0 ? CC.spx : CC.vix} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      )}

      {/* Scenario detail cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {SCENARIO_KEYS.map(key => {
          const sc = win[key];
          if (!sc || typeof sc !== 'object') return null;
          const meta   = SCENARIO_LABELS[key] ?? { label: key, icon: '·', color: C.dim };
          const insuf  = !!sc.insufficient_sample;
          const col    = meta.color;
          return (
            <div key={key} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', opacity: insuf ? 0.72 : 1, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: col, borderRadius: '10px 0 0 10px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: C.font, fontSize: 11, fontWeight: 700, color: col }}>
                  {meta.icon} {meta.label}
                </span>
                {insuf && (
                  <span style={{ padding: '2px 7px', background: `${C.amber}12`, border: `1px solid ${C.amber}35`, borderRadius: 4, fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.amber, textTransform: 'uppercase' }}>
                    Insufficient Sample
                  </span>
                )}
                {!insuf && sc.confidence_label && (
                  <span style={{ padding: '2px 7px', background: `${confColor(sc.confidence_label)}12`, border: `1px solid ${confColor(sc.confidence_label)}35`, borderRadius: 4, fontFamily: C.font, fontSize: 9, fontWeight: 700, color: confColor(sc.confidence_label), textTransform: 'uppercase' }}>
                    {sc.confidence_label} confidence
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontFamily: C.font, fontSize: 10, color: C.muted }}>n = {sc.sample_count ?? '—'}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 6 }}>
                <MetricPair label="Up Prob"    value={fmtProb(sc.green_probability)} color={insuf ? C.dim : C.green} />
                <MetricPair label="Down Prob"  value={fmtProb(sc.red_probability)}   color={insuf ? C.dim : C.red}   />
                <MetricPair label="Avg Return" value={sgn(sc.average_return_pct)}    color={insuf ? C.dim : (sc.average_return_pct ?? 0) >= 0 ? C.green : C.red} />
                <MetricPair label="Median"     value={sgn(sc.median_return_pct)}     color={insuf ? C.dim : (sc.median_return_pct ?? 0) >= 0 ? C.green : C.red} />
                <MetricPair label="Best"       value={sgn(sc.best_return_pct)}       color={insuf ? C.dim : C.green} />
                <MetricPair label="Worst"      value={sgn(sc.worst_return_pct)}      color={insuf ? C.dim : C.red}   />
                {sc.std_dev_pct != null && <MetricPair label="Std Dev" value={`${Number(sc.std_dev_pct).toFixed(3)}%`} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ask Caelyn */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 8 }}>
        <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.indigoFg, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Ask Caelyn</div>
        <p style={{ fontFamily: C.sans, fontSize: 12, color: C.dim, lineHeight: 1.65, margin: '0 0 12px', fontStyle: 'italic' }}>"{WEEKLY_PROMPT}"</p>
        <button
          onClick={askCaelyn}
          disabled={aiState === 'loading'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 6, cursor: aiState === 'loading' ? 'not-allowed' : 'pointer',
            fontFamily: C.font, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            background: `${C.indigo}20`, color: C.indigoFg,
            border: `1px solid ${C.indigo}50`, opacity: aiState === 'loading' ? 0.7 : 1,
          }}
        >
          {aiState === 'loading' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
          {aiState === 'loading' ? 'Thinking…' : '⚡ Ask Caelyn'}
        </button>
        {aiState === 'error' && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontFamily: C.sans, fontSize: 12, color: C.red }}>
            {aiText}
          </div>
        )}
        {aiState === 'done' && aiText && (
          <div style={{ marginTop: 12, padding: '14px 16px', background: `${C.indigo}0a`, border: `1px solid ${C.indigo}30`, borderRadius: 8, fontFamily: C.sans, fontSize: 13, color: C.text, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {aiText}
          </div>
        )}
      </div>

      <SrcFooter generatedAt={data.generated_at} cacheTtl={data.cache_ttl_seconds} sources={{ data_source: data.data_source }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 3: 10Y Yield vs S&P 500
   ═══════════════════════════════════════════════════════════════════ */
function TenYearSpxTab() {
  const [tf, setTf] = useState<string>('1Y');

  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['strategy-ten-year-spx'],
    queryFn: () => fetch('/api/strategy/ten-year-spx').then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 1,
  });

  const allTs: any[] = data?.chart_data?.ten_y_spx_timeseries ?? [];
  const nRows = tf === '5Y' ? allTs.length : TF_ROWS[tf] ?? 252;
  const ts = allTs.slice(-nRows);
  const corrTs = ts.filter((r: any) => r.rolling_corr_7d != null || r.rolling_corr_30d != null || r.rolling_corr_63d != null);
  const last30 = ts.slice(-30);
  const regimeStrip = last30.filter((r: any) => r.regime_label);

  const snap    = data?.current_market_snapshot ?? {};
  const tracker = data?.ten_year_spx_tracker ?? {};
  const corr    = data?.rolling_correlation ?? {};
  const regimes = data?.regime_labels ?? {};
  const windows = data?.historical_windows ?? {};
  const sources = data?.data_sources ?? {};

  useSetPageContext(
    data
      ? `[Page: 10Y Yield vs SPX | TF: ${tf}]\n10Y: ${tracker.us_10y_current}% | SPX: ${snap.spx_price}\n` +
        `7D regime: ${regimes['7d']} | 30D corr: ${corr.rolling_corr_30d}\n` +
        `rows visible: ${ts.length} (${ts[0]?.date ?? ''} → ${ts[ts.length - 1]?.date ?? ''})\n` +
        JSON.stringify({ tracker, correlation: corr, regime_labels: regimes })
      : null,
    [data, tf],
  );

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState message={`Could not load 10Y vs SPX: ${(error as Error).message}`} onRetry={() => refetch()} />;
  if (!data) return null;

  return (
    <div style={{ padding: '24px 0', minHeight: 400 }}>
      <FreshWarn warning={sources.freshness_warning as string} />

      {/* Hero strip */}
      <HeroStrip>
        <HeroStat
          label="10Y Yield"
          value={fmtYield(tracker.us_10y_current)}
          sub={sgnBps(tracker.us_10y_1d_bps) + ' today'}
          color={C.amber}
        />
        <HeroStat
          label="10Y — 7D Change"
          value={sgnBps(tracker.us_10y_7d_change_bps)}
          color={(tracker.us_10y_7d_change_bps ?? 0) >= 0 ? C.red : C.green}
        />
        <HeroStat
          label="S&P 500"
          value={fmtPrice2(snap.spx_price)}
          sub={sgn(snap.spx_change_pct) + ' today'}
          color={(snap.spx_change_pct ?? 0) >= 0 ? C.green : C.red}
        />
        <HeroStat
          label="30D Correlation"
          value={fmtCorr(corr.rolling_corr_30d)}
          sub={(corr.rolling_corr_30d ?? 0) < 0 ? 'Inverse relationship' : 'Same-direction'}
          color={(corr.rolling_corr_30d ?? 0) < 0 ? C.amber : C.green}
        />
        <HeroStat
          label="7D Regime"
          value={regimeLabelText(regimes['7d'])}
          color={regimeColor(regimes['7d'])}
        />
      </HeroStrip>

      {/* Timeframe toggle */}
      <TfBtn value={tf} onChange={setTf} />

      {/* 10Y vs SPX dual-axis chart */}
      <ChartBox title="10Y Yield vs S&P 500" subtitle="Left axis: SPX price · Right axis: 10Y yield %">
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={ts} margin={{ top: 4, right: 52, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false} axisLine={false}
              tickFormatter={d => fmtChartDate(d, ts.length)}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="spx"
              orientation="left"
              tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false} axisLine={false}
              width={52}
              domain={['auto', 'auto']}
              tickFormatter={v => `$${Number(v).toFixed(0)}`}
            />
            <YAxis
              yAxisId="yield"
              orientation="right"
              tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
              tickLine={false} axisLine={false}
              width={38}
              domain={[0.5, 6]}
              tickFormatter={v => `${Number(v).toFixed(2)}%`}
            />
            <Tooltip
              contentStyle={TT}
              formatter={(v: any, name: string) =>
                name === 'SPX' ? [`$${Number(v).toFixed(2)}`, 'SPX'] : [`${Number(v).toFixed(3)}%`, name]
              }
              labelFormatter={l => `Date: ${l}`}
            />
            <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 9, color: C.dim }} />
            <Line yAxisId="spx"   dataKey="spx_close"  stroke={CC.spx}   dot={false} name="SPX"      strokeWidth={1.5} isAnimationActive={false} connectNulls />
            <Line yAxisId="yield" dataKey="ten_yield"   stroke={CC.yield} dot={false} name="10Y Yield" strokeWidth={1.5} isAnimationActive={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartBox>

      {/* Rolling correlation chart */}
      <ChartBox
        title="Rolling Correlation — 10Y bps vs SPX Return"
        subtitle={corr.correlation_basis ?? 'US 10Y daily bps change vs S&P 500 daily % return'}
      >
        {corrTs.length > 2 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={corrTs} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                tickFormatter={d => fmtChartDate(d, corrTs.length)}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[-1, 1]}
                tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                width={30}
                tickFormatter={v => Number(v).toFixed(1)}
              />
              <Tooltip
                contentStyle={TT}
                formatter={(v: any, name: string) => v != null ? [Number(v).toFixed(3), name] : ['—', name]}
                labelFormatter={l => `Date: ${l}`}
              />
              <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 9, color: C.dim }} />
              <ReferenceLine y={0} stroke={C.dim} strokeDasharray="3 3"
                label={{ value: '0', position: 'insideRight', fill: C.dim, fontSize: 8, fontFamily: 'monospace' }} />
              <Line dataKey="rolling_corr_7d"  stroke={CC.c7}  dot={false} name="7D"  strokeWidth={1}   isAnimationActive={false} connectNulls={false} />
              <Line dataKey="rolling_corr_30d" stroke={CC.c30} dot={false} name="30D" strokeWidth={1.5} isAnimationActive={false} connectNulls={false} />
              <Line dataKey="rolling_corr_63d" stroke={CC.c63} dot={false} name="63D" strokeWidth={1.5} isAnimationActive={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <CorrelationEmptyMsg />}
      </ChartBox>

      {/* Daily move comparison chart */}
      {last30.some((r: any) => r.spx_return_pct != null) && (
        <ChartBox title={`Daily Moves — Last ${last30.length} Sessions`} subtitle="SPX % return vs 10Y basis point change">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last30} margin={{ top: 4, right: 12, left: 0, bottom: 0 }} barSize={4} barGap={1} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: C.muted, fontSize: 8, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                tickFormatter={d => fmtChartDate(d, 30)}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: C.muted, fontSize: 9, fontFamily: 'monospace' }}
                tickLine={false} axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={TT}
                formatter={(v: any, name: string) => {
                  if (v == null) return ['—', name];
                  return name === '10Y bps' ? [`${Number(v).toFixed(1)} bps`, name] : [`${Number(v).toFixed(2)}%`, name];
                }}
                labelFormatter={l => `Date: ${l}`}
              />
              <Legend wrapperStyle={{ fontFamily: 'monospace', fontSize: 9, color: C.dim }} />
              <ReferenceLine y={0} stroke={C.dim} />
              <Bar dataKey="spx_return_pct"  name="SPX %"   fill={CC.spx}   isAnimationActive={false} />
              <Bar dataKey="ten_y_change_bps" name="10Y bps" fill={CC.yield} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
      )}

      {/* Regime timeline strip */}
      {regimeStrip.length > 0 && (
        <ChartBox title={`Recent Regime — Last ${regimeStrip.length} Sessions`} subtitle="Hover each bar for date and regime label">
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto', padding: '2px 0 6px' }}>
            {regimeStrip.map((r: any, i: number) => (
              <div
                key={i}
                title={`${r.date}: ${regimeLabelText(r.regime_label)}`}
                style={{ flexShrink: 0, width: 14, height: 30, borderRadius: 2, background: regimeColor(r.regime_label), opacity: 0.85, cursor: 'default' }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 8 }}>
            {(['yields_rising_spx_rising', 'yields_rising_spx_falling', 'yields_falling_spx_rising', 'yields_falling_spx_falling', 'mixed_flat'] as string[]).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: regimeColor(k) }} />
                <span style={{ fontFamily: C.font, fontSize: 9, color: C.dim }}>{regimeLabelText(k)}</span>
              </div>
            ))}
          </div>
        </ChartBox>
      )}

      {/* Correlation summary numbers */}
      {Object.keys(corr).length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 18px', marginBottom: 14 }}>
          <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.indigoFg, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Correlation Summary</div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 8 }}>
            {([['7D', corr.rolling_corr_7d], ['30D', corr.rolling_corr_30d], ['63D', corr.rolling_corr_63d]] as [string, number][]).map(([lbl, v]) => (
              <div key={lbl} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: C.font, fontSize: 20, fontWeight: 700, color: C.bright }}>{fmtCorr(v)}</div>
                <div style={{ fontFamily: C.font, fontSize: 9, color: C.dim, marginTop: 2 }}>{lbl}</div>
                <div style={{ fontFamily: C.font, fontSize: 9, color: v < 0 ? C.amber : C.green, marginTop: 1 }}>{v < 0 ? 'Inverse' : 'Same-dir'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical windows */}
      {Object.keys(windows).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Historical Windows</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
            {(['7d', 'quarter', '1y', '5y'] as string[]).map(key => {
              const w = windows[key];
              if (!w) return null;
              const ret = w.spx_return_pct as number;
              return (
                <div key={key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.indigoFg, textTransform: 'uppercase', marginBottom: 8 }}>
                    {key === 'quarter' ? '90D' : key.toUpperCase()}
                  </div>
                  <StatRow label="10Y Start" value={w.ten_y_first != null ? fmtYield(w.ten_y_first) : '—'} />
                  <StatRow label="10Y End"   value={w.ten_y_last  != null ? fmtYield(w.ten_y_last)  : '—'} />
                  <StatRow label="SPX Return" value={sgn(ret)} color={ret >= 0 ? C.green : C.red} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SrcFooter generatedAt={data.generated_at} cacheTtl={data.cache_ttl_seconds} sources={sources} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Defiance 2X Tab
   ═══════════════════════════════════════════════════════════════════ */

const DEFI_STAGE_RANK: Record<string, number> = {
  'S1 Base': 1, 'S1-2 Watch': 2, 'S2 Breakout': 3, 'S2-S3 Advance': 4,
  'S3 Momentum': 5, 'S3-S4 Top': 6, 'S4 Decline': 7,
};
function defiStageRank(s?: string | null): number {
  if (!s) return 99;
  for (const [k, v] of Object.entries(DEFI_STAGE_RANK)) {
    if (s.startsWith(k)) return v;
  }
  const m = s.match(/S(\d)/); return m ? Number(m[1]) * 10 : 99;
}
function defiStageColor(s?: string | null): { color: string; bg: string; border: string } {
  if (!s) return { color: C.dim, bg: 'transparent', border: C.border };
  if (/^S2 Breakout/i.test(s))    return { color: '#14b8a6', bg: 'rgba(20,184,166,0.12)',   border: 'rgba(20,184,166,0.40)' };
  if (/^S2-S3 Advance/i.test(s))  return { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',    border: 'rgba(34,197,94,0.35)' };
  if (/^S3 Momentum/i.test(s))    return { color: '#818cf8', bg: 'rgba(129,140,248,0.10)',  border: 'rgba(129,140,248,0.35)' };
  if (/^S1-2 Watch/i.test(s))     return { color: C.amber,   bg: `${C.amber}18`,            border: `${C.amber}50` };
  if (/^S1 Base/i.test(s))        return { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',   border: 'rgba(96,165,250,0.30)' };
  if (/^S3-S4 Top/i.test(s))      return { color: '#fb923c', bg: 'rgba(251,146,60,0.10)',   border: 'rgba(251,146,60,0.30)' };
  if (/^S4 Decline/i.test(s))     return { color: C.red,     bg: `${C.red}15`,              border: `${C.red}40` };
  return { color: C.dim, bg: 'transparent', border: C.border };
}

type DefiSortKey = 'symbol' | 'etf' | 'price' | 'chg' | 'volx' | 'stage';

function DefianceTab() {
  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['defiance-2x-strategy'],
    queryFn: () => fetch('/api/strategy/defiance').then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 5 * 60_000,
    gcTime:    15 * 60_000,
    retry: 1,
  });

  const [tvTicker, setTvTicker] = useState<string | null>(null);
  const [sortKey, setSortKey]   = useState<DefiSortKey>('symbol');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc');

  const rawRows: any[] = useMemo(() => {
    const arr: any[] = Array.isArray(data) ? data : (data?.rows ?? data?.tickers ?? []);
    return arr.filter((r: any) => r.symbol && String(r.symbol).trim() !== '');
  }, [data]);

  const rows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rawRows].sort((a, b) => {
      const num = (x: any, field: string) => { const v = Number(x[field]); return Number.isFinite(v) ? v : -Infinity; };
      switch (sortKey) {
        case 'symbol':  return dir * (a.symbol ?? '').localeCompare(b.symbol ?? '');
        case 'etf':     return dir * ((a.defiance_etf?.symbol ?? '').localeCompare(b.defiance_etf?.symbol ?? ''));
        case 'price':   return dir * (num(a, 'price') - num(b, 'price'));
        case 'chg':     return dir * (num(a, 'change_pct') - num(b, 'change_pct'));
        case 'volx':    return dir * (num(a, 'vol_x') - num(b, 'vol_x'));
        case 'stage':   return dir * (defiStageRank(a.stage_analysis?.label) - defiStageRank(b.stage_analysis?.label));
        default:        return 0;
      }
    });
  }, [rawRows, sortKey, sortDir]);

  const handleSort = (key: DefiSortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'symbol' || key === 'etf' || key === 'stage' ? 'asc' : 'desc'); }
  };
  const arr = (key: DefiSortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const fmtPrice = (v?: any) => {
    const n = Number(v); if (!Number.isFinite(n) || n <= 0) return '—';
    return n >= 100 ? `$${n.toFixed(2)}` : `$${n.toFixed(2)}`;
  };
  const fmtPct = (v?: any) => {
    const n = Number(v); if (!Number.isFinite(n)) return '—';
    return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
  };

  const fmtX = (v?: any, dec = 1) => {
    const n = Number(v); return Number.isFinite(n) && n > 0 ? `${n.toFixed(dec)}×` : '—';
  };
  const chgClr = (v?: any) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return C.dim;
    return n > 0 ? C.green : n < 0 ? C.red : C.dim;
  };

  const TH = (key: DefiSortKey, label: string, align: 'left' | 'right' = 'right'): CSSProperties => ({
    padding: '7px 12px', fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: sortKey === key ? C.bright : C.dim,
    textAlign: align, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${C.border}`, background: C.surface,
    position: 'sticky', top: 0, zIndex: 2,
  });
  const TD: CSSProperties = { padding: '6px 12px', fontSize: 11, whiteSpace: 'nowrap', borderBottom: `1px solid ${C.border}`, fontFamily: C.font };

  return (
    <div style={{ padding: '24px 0', minHeight: 400 }}>

      {/* Disclaimer strip */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: '10px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 800, letterSpacing: '0.06em', fontFamily: C.font }}>DEFIANCE 2×</span>
        <span style={{ color: C.dim, fontFamily: C.sans, fontSize: 11 }}>
          Leveraged ETFs reset daily and are intended for active trading.
        </span>
        {rawRows.length > 0 && (
          <span style={{ marginLeft: 'auto', color: C.dim, fontFamily: C.font, fontSize: 10 }}>
            {rawRows.length} mapped
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && !rawRows.length && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.dim, fontFamily: C.sans, fontSize: 13 }}>
          <div style={{ marginBottom: 12, fontSize: 20 }}>⏳</div>
          Loading Defiance 2X universe…
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.red, fontFamily: C.sans, fontSize: 13 }}>
          Couldn't load Defiance 2X map.{' '}
          <button onClick={() => refetch()} style={{ color: C.blue, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && rawRows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.dim, fontFamily: C.sans, fontSize: 13 }}>
          No mapped Defiance 2X long single-stock ETFs found.
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 700 }}>
              <thead>
                <tr>
                  <th onClick={() => handleSort('symbol')} style={{ ...TH('symbol', 'UNDERLYING', 'left'), position: 'sticky', left: 0, zIndex: 3 }}>
                    Underlying{arr('symbol')}
                  </th>
                  <th onClick={() => handleSort('etf')}    style={TH('etf',    'DEFIANCE ETF', 'left')}>Defiance ETF{arr('etf')}</th>
                  <th onClick={() => handleSort('price')}  style={TH('price',  'PRICE')}>Price{arr('price')}</th>
                  <th onClick={() => handleSort('chg')}    style={TH('chg',    '1D %')}>1D %{arr('chg')}</th>
                  <th onClick={() => handleSort('volx')}   style={TH('volx',   'VOL×')}>Vol×{arr('volx')}</th>
                  <th onClick={() => handleSort('stage')}  style={TH('stage',  'STAGE', 'left')}>Stage{arr('stage')}</th>
                  <th style={{ ...TH('symbol', 'THEME', 'left'), cursor: 'default', color: C.dim }}>Theme</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const etf = row.defiance_etf;
                  const chartSym = row.chart_symbol || row.symbol;
                  if (!row.symbol) return null;
                  const sc = defiStageColor(row.stage_analysis?.label);
                  const rowBg = i % 2 === 0 ? 'transparent' : `${C.border}08`;
                  return (
                    <tr
                      key={row.symbol}
                      style={{ background: rowBg, transition: 'background 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = rowBg; }}
                    >
                      {/* Underlying — sticky left, click opens underlying chart */}
                      <td
                        onClick={() => setTvTicker(chartSym)}
                        style={{
                          ...TD, textAlign: 'left', fontWeight: 800, color: C.bright, fontSize: 12,
                          position: 'sticky', left: 0, background: rowBg, zIndex: 1,
                          cursor: 'pointer',
                        }}
                        title={`Open ${chartSym} chart`}
                      >
                        <span style={{ borderBottom: `1px dashed ${C.bright}50` }}>{row.symbol}</span>
                        {!etf && (
                          <span style={{ marginLeft: 6, fontSize: 8, color: C.red, fontFamily: C.sans }}>mapping error</span>
                        )}
                      </td>
                      {/* Defiance ETF chip — click opens ETF chart */}
                      <td style={{ ...TD, textAlign: 'left' }}>
                        {etf?.symbol ? (
                          <span
                            onClick={() => setTvTicker(etf.symbol)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              fontSize: 10, fontWeight: 700, fontFamily: C.font,
                              color: '#a78bfa', background: '#a78bfa15',
                              border: '1px solid #a78bfa35', borderRadius: 4,
                              padding: '2px 8px', whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            }}
                            title={`Open ${etf.symbol} chart`}
                          >
                            {etf.symbol} · 2X Long
                          </span>
                        ) : <span style={{ color: C.dim }}>—</span>}
                      </td>
                      {/* Price */}
                      <td style={{ ...TD, textAlign: 'right', color: C.text }}>{fmtPrice(row.price)}</td>
                      {/* 1D % */}
                      <td style={{ ...TD, textAlign: 'right', color: chgClr(row.change_pct), fontWeight: 700 }}>{fmtPct(row.change_pct)}</td>
                      {/* Vol× */}
                      <td style={{ ...TD, textAlign: 'right', color: C.dim }}>{fmtX(row.vol_x)}</td>
                      {/* Stage */}
                      <td style={{ ...TD, textAlign: 'left' }}>
                        {row.stage_analysis?.label ? (
                          <span style={{
                            fontSize: 9, fontWeight: 700, fontFamily: C.font,
                            color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`,
                            borderRadius: 3, padding: '1px 6px', whiteSpace: 'nowrap',
                          }}>{row.stage_analysis.label}</span>
                        ) : <span style={{ color: C.dim }}>—</span>}
                      </td>
                      {/* Theme */}
                      <td style={{ ...TD, textAlign: 'left', color: C.dim, fontStyle: 'italic', fontSize: 10 }}>
                        {row.theme ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TradingView chart modal — opens on underlying ticker only */}
      {tvTicker && (
        <>
          <div onClick={() => setTvTicker(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
            zIndex: 200, backdropFilter: 'blur(3px)',
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(900px, 92vw)', height: 'min(560px, 80vh)',
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, zIndex: 201,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 18px', borderBottom: `1px solid ${C.border}`,
              background: C.surface, flexShrink: 0,
            }}>
              <span style={{ color: C.bright, fontFamily: C.font, fontSize: 13, fontWeight: 700 }}>{tvTicker}</span>
              <span style={{ color: C.dim, fontFamily: C.sans, fontSize: 11 }}>TradingView Chart</span>
              <a href={`https://www.tradingview.com/chart/?symbol=${tvTicker}`} target="_blank" rel="noopener noreferrer"
                style={{ marginLeft: 'auto', color: C.blue, fontFamily: C.font, fontSize: 10, textDecoration: 'none', border: `1px solid ${C.blue}40`, borderRadius: 4, padding: '3px 9px' }}>
                Open full chart ↗
              </a>
              <button onClick={() => setTvTicker(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.dim, fontSize: 18, lineHeight: 1, padding: '0 2px' }}>
                ×
              </button>
            </div>
            <iframe
              key={tvTicker}
              src={`https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=100%25&interval=D&range=3M&style=1&toolbar_bg=0d1623&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=true&calendar=false&studies=%5B%5D&theme=dark&timezone=America%2FNew_York&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(tvTicker)}`}
              style={{ flex: 1, border: 'none', width: '100%' }}
              allowFullScreen
              title={`TradingView chart — ${tvTicker}`}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Strategy Page — five-tab wrapper
   ═══════════════════════════════════════════════════════════════════ */
export default function StrategyScreenerPage() {
  const [tab, setTab] = useState<'screener' | 'smart-options' | 'defiance' | 'vix-risk-regime' | 'weekly-price-movements' | 'ten-year-spx'>('smart-options');

  const tabStyle = (active: boolean): CSSProperties => ({
    padding: '8px 20px',
    fontFamily: C.font,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: active ? C.bright : C.dim,
    borderBottom: active ? `2px solid ${C.indigo}` : '2px solid transparent',
    transition: 'color 0.15s, border-color 0.15s',
  });

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 0, padding: '0 24px', background: C.surface }}>
        <button style={tabStyle(tab === 'smart-options')} onClick={() => setTab('smart-options')}>Smart Options</button>
        <button style={tabStyle(tab === 'defiance')} onClick={() => setTab('defiance')}>Defiance 2×</button>
        <button style={tabStyle(tab === 'vix-risk-regime')} onClick={() => setTab('vix-risk-regime')}>VIX Risk Regime</button>
        <button style={tabStyle(tab === 'weekly-price-movements')} onClick={() => setTab('weekly-price-movements')}>Weekly Movements</button>
        <button style={tabStyle(tab === 'ten-year-spx')} onClick={() => setTab('ten-year-spx')}>10Y Yield vs SPX</button>
        <button style={tabStyle(tab === 'screener')} onClick={() => setTab('screener')}>AI Bottlenecks</button>
      </div>

      {tab === 'screener' && <StrategyScreenerInner />}
      {tab === 'smart-options' && (
        <div style={{ padding: '0 24px', maxWidth: 1100, margin: '0 auto' }}>
          <SmartOptionsTab />
        </div>
      )}
      {tab === 'defiance' && (
        <div style={{ padding: '0 24px', maxWidth: 1200, margin: '0 auto' }}>
          <DefianceTab />
        </div>
      )}
      {tab === 'vix-risk-regime' && (
        <div style={{ padding: '0 24px', maxWidth: 1100, margin: '0 auto' }}>
          <VixRiskRegimeTab />
        </div>
      )}
      {tab === 'weekly-price-movements' && (
        <div style={{ padding: '0 24px', maxWidth: 1100, margin: '0 auto' }}>
          <WeeklyPriceMovementsTab />
        </div>
      )}
      {tab === 'ten-year-spx' && (
        <div style={{ padding: '0 24px', maxWidth: 1100, margin: '0 auto' }}>
          <TenYearSpxTab />
        </div>
      )}
    </div>
  );
}

