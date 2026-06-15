import { useState, useCallback, useMemo, type CSSProperties, type ReactNode } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { RefreshCw, X, ArrowLeft, AlertCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { fetchLatestSnapshot, fetchReport, refreshSnapshot } from '@/lib/screener';
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
  const rawRows =
    snap.results || snap.entries || snap.ranked_list ||
    snap.candidates || (snap as any).rows || [];
  return rawRows.map((r: any, i: number) => ({
    ...r,
    ticker:           r.ticker || r.symbol || '',
    symbol:           r.symbol || r.ticker || '',
    market_cap_usd:   r.market_cap_usd ?? r.marketCap ?? r.market_cap,
    market_cap_bucket: r.market_cap_bucket || r.marketCapBucket || '',
    layer_depth:      r.layer_depth ?? (typeof r.layer === 'number' ? r.layer : undefined),
    rank:             r.rank ?? i + 1,
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
   Chain Reaction Screener (existing page — unchanged)
   ═══════════════════════════════════════════════════════════════════ */
function StrategyScreenerInner() {
  const [selectedEntry, setSelectedEntry] = useState<ScreenerEntry | null>(null);
  const [refreshMsg,    setRefreshMsg]    = useState<string>('');
  const [sortCol,       setSortCol]       = useState<SortCol>('#');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('asc');
  const qc = useQueryClient();

  const { data: snap, isLoading, error, refetch } = useQuery<ScreenerSnapshot>({
    queryKey: ['strategy-screener-latest'],
    queryFn:  () => fetchLatestSnapshot(),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });

  const refreshMut = useMutation({
    mutationFn: refreshSnapshot,
    onSuccess: (data) => {
      const genuinelyChanged =
        (data as any).snapshot_changed ??
        (data as any).diagnostics?.snapshot_genuinely_changed ??
        true;
      if (genuinelyChanged === false) {
        setRefreshMsg(
          (data as any).diagnostics?.snapshot_genuinely_changed_reason ||
          (data as any).reason ||
          data.message ||
          'Already up to date'
        );
      } else {
        setRefreshMsg(data.message || data.status || 'Snapshot refreshed');
      }
      setTimeout(() => setRefreshMsg(''), 6000);
      qc.invalidateQueries({ queryKey: ['strategy-screener-latest'] });
    },
    onError: (err: any) => {
      setRefreshMsg(`Refresh error: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setRefreshMsg(''), 5000);
    },
  });

  const allEntries = useMemo(
    () => snap ? normaliseEntries(snap) : [],
    [snap],
  );

  const entries = useMemo(
    () => sortEntries(allEntries, sortCol, sortDir),
    [allEntries, sortCol, sortDir],
  );

  const sid = useMemo(() => snap ? snapId(snap) : 'latest', [snap]);

  const derivedTopThemes = useMemo(() => {
    if (snap?.top_themes?.length) return (snap.top_themes as string[]).slice(0, 4);
    const active = snap?.regime_context?.active_themes as string[] | undefined;
    if (active?.length) return active.slice(0, 4);
    if (!allEntries.length) return [] as string[];
    const counts = new Map<string, number>();
    for (const e of allEntries) {
      const t = e.theme || e.themes?.[0] || '';
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
  }, [snap, allEntries]);

  const snapshotAgeLabel = useMemo(() => {
    const ts = snap?.generated_at || snap?.created_at;
    if (!ts) return null;
    try {
      const diffMs   = Date.now() - new Date(ts as string).getTime();
      const diffDays = Math.floor(diffMs / 86_400_000);
      if (diffDays === 0) return 'today';
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch { return null; }
  }, [snap]);

  const handleColSort = useCallback((col: SortCol) => {
    setSortCol(prev => {
      if (prev === col) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return col;
      }
      setSortDir('asc');
      return col;
    });
  }, []);

  const handleRowClick = useCallback((e: ScreenerEntry) => {
    setSelectedEntry(e);
  }, []);

  useSetPageContext((() => {
    const parts = ['[Page: Chain Reaction Bottlenecks — Cross-Theme Supply Chain Intelligence]'];
    if (allEntries.length) {
      const top = allEntries.slice(0, 15)
        .map(e => `${tickerOf(e)}${gradeOf(e) ? `(${gradeOf(e)})` : ''}`)
        .filter(Boolean);
      parts.push(`Entries (${allEntries.length}): ${top.join(', ')}`);
      if (derivedTopThemes.length) parts.push(`Themes: ${derivedTopThemes.join(', ')}`);
      const anchors = allEntries.filter(isAnchor).map(e => tickerOf(e));
      if (anchors.length) parts.push(`Anchors: ${anchors.join(', ')}`);
    }
    parts.push('Diversity-gated bottleneck names across nuclear, rare earth, defense, semicap, energy and semiconductor supply chains.');
    return parts.join('\n');
  })(), [allEntries, derivedTopThemes]);

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ss-row:hover { background: rgba(99,102,241,0.05) !important; cursor: pointer; }
        .ss-row td { border-bottom: 1px solid ${C.borderFaint}; }
        .ss-th:hover { color: ${C.indigoFg} !important; }
      `}</style>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* ── Hero header ─────────────────────────────────── */}
        <div style={{ padding:'40px 0 28px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:C.indigo }} />
                <span style={{ fontFamily:C.font, fontSize:9, fontWeight:700, color:C.indigoFg, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                  Chain Reaction Bottlenecks
                </span>
                {snap?.cadence_label && (
                  <>
                    <span style={{ color:C.muted, fontSize:9, fontFamily:C.font }}>·</span>
                    <span style={{ fontFamily:C.font, fontSize:9, color:C.dim }}>{snap.cadence_label as string}</span>
                  </>
                )}
              </div>

              <h1 style={{ fontFamily:C.sans, fontSize:28, fontWeight:700, color:C.bright, margin:'0 0 8px', letterSpacing:'-0.01em' }}>
                Chain Reaction
              </h1>
              <p style={{ fontFamily:C.sans, fontSize:13, color:C.dim, margin:'0 0 14px', maxWidth:620, lineHeight:1.65 }}>
                Chain Reaction maps the market anchors driving today's biggest themes, then surfaces the suppliers, scarce enablers, and bottleneck companies positioned around them.
              </p>

              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                {snap?.generated_at && (
                  <span style={{ fontFamily:C.font, fontSize:10, color:C.muted }}>
                    Generated {fmtDate(snap.generated_at as string)}
                    {snapshotAgeLabel && snapshotAgeLabel !== 'today' && (
                      <span style={{ color:C.amber, marginLeft:6 }}>({snapshotAgeLabel})</span>
                    )}
                  </span>
                )}
                {derivedTopThemes.length > 0 && (
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {derivedTopThemes.map(t => (
                      <span key={t} style={{ padding:'2px 8px', background:'rgba(56,189,248,0.07)', border:'1px solid rgba(56,189,248,0.18)', borderRadius:4, fontFamily:C.font, fontSize:9, color:C.blue }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Refresh button */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
              <button
                onClick={() => refreshMut.mutate()}
                disabled={refreshMut.isPending || isLoading}
                style={{
                  display:'flex', alignItems:'center', gap:7, padding:'8px 16px',
                  background: refreshMut.isPending ? C.indigoSub : 'transparent',
                  border: `1px solid ${refreshMut.isPending ? C.indigo : C.border}`,
                  borderRadius: 6,
                  color: refreshMut.isPending ? C.indigoFg : C.dim,
                  fontFamily: C.font, fontSize:10,
                  cursor: refreshMut.isPending ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <RefreshCw size={12} style={{ animation: refreshMut.isPending ? 'spin 1s linear infinite' : 'none' }} />
                {refreshMut.isPending ? 'Refreshing…' : 'Refresh'}
              </button>
              {refreshMsg && (
                <span style={{
                  fontFamily: C.font, fontSize:9,
                  color: (refreshMsg.toLowerCase().includes('error') || refreshMsg.toLowerCase().includes('fail'))
                    ? C.amber : C.green,
                }}>
                  {refreshMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────── */}
        {isLoading && !snap && <LoadingState />}
        {error && !snap && (
          <ErrorState
            message={`Could not load data: ${(error as Error).message || 'Unknown error'}`}
            onRetry={() => refetch()}
          />
        )}
        {snap?.error && (
          <ErrorState
            message={String(snap.error)}
            onRetry={() => refetch()}
          />
        )}

        {snap && !snap.error && (
          <>
            {entries.length === 0 ? (
              <div style={{ padding:'60px 0', textAlign:'center', color:C.dim, fontFamily:C.sans, fontSize:14 }}>
                No entries in this snapshot.
              </div>
            ) : (
              <div style={{ marginTop:16, overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'auto' }}>
                  <thead>
                    <tr>
                      {(
                        [
                          { label: '#',             col: '#'      as SortCol },
                          { label: 'Ticker',        col: 'ticker' as SortCol },
                          { label: 'Company / Role',col: 'name'   as SortCol },
                          { label: 'Theme',         col: 'theme'  as SortCol },
                          { label: 'Mkt Cap',       col: 'mktcap' as SortCol },
                          { label: 'Layer',         col: 'layer'  as SortCol },
                          { label: 'Market',        col: 'market' as SortCol },
                          { label: 'Grade',         col: 'grade'  as SortCol },
                        ] as { label: string; col: SortCol }[]
                      ).map(h => (
                        <SortableHeader
                          key={h.col}
                          label={h.label}
                          col={h.col}
                          active={sortCol === h.col}
                          dir={sortDir}
                          onClick={handleColSort}
                        />
                      ))}
                      <th style={{ width:20, borderBottom:`1px solid ${C.border}` }} />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => {
                      const tk    = tickerOf(e);
                      const score = scoreOf(e);
                      const anchor = isAnchor(e);
                      const role   = (e as any).role_type as string | undefined;
                      const roleLabel = anchor
                        ? 'Anchor'
                        : (e.role || e.chain_role_type || role || null);

                      return (
                        <tr
                          key={tk || idx}
                          className="ss-row"
                          onClick={() => handleRowClick(e)}
                          style={{
                            background: anchor
                              ? 'rgba(99,102,241,0.04)'
                              : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.007)',
                            transition: 'background 0.1s',
                          }}
                        >
                          {/* # */}
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.muted, width:36 }}>
                            {e.rank ?? idx + 1}
                          </td>

                          {/* Ticker */}
                          <td style={{ padding:'12px 12px', whiteSpace:'nowrap' }}>
                            <div style={{ fontFamily:C.font, fontSize:13, fontWeight:700, color: anchor ? C.indigoFg : C.bright }}>
                              {tk || '—'}
                            </div>
                            {anchor && (
                              <div style={{ fontFamily:C.font, fontSize:8, fontWeight:700, color:C.indigoFg, textTransform:'uppercase', letterSpacing:'0.08em', opacity:0.75, marginTop:2 }}>
                                Anchor
                              </div>
                            )}
                            {score != null && !anchor && (
                              <div style={{ fontFamily:C.font, fontSize:8, color:C.muted, marginTop:2 }}>
                                {Math.round(score)}
                              </div>
                            )}
                            <AccessBadge entry={e} />
                          </td>

                          {/* Company / Role */}
                          <td style={{ padding:'12px 12px', maxWidth:220 }}>
                            <div style={{ fontFamily:C.sans, fontSize:12, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {nameOf(e)}
                            </div>
                            {roleLabel && (
                              <div style={{ fontFamily:C.font, fontSize:9, color: anchor ? C.indigoFg : C.dim, marginTop:2, opacity: anchor ? 0.85 : 1 }}>
                                {anchor ? `Anchor · ${e.role || e.chain_role_type || 'market driver'}` : roleLabel}
                              </div>
                            )}
                          </td>

                          {/* Theme */}
                          <td style={{ padding:'12px 12px', whiteSpace:'nowrap' }}>
                            <span style={{ fontFamily:C.font, fontSize:10, color:C.blue }}>{themeOf(e)}</span>
                          </td>

                          {/* Mkt Cap */}
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {fmtCap(e.market_cap_usd)}
                          </td>

                          {/* Layer */}
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {layerOf(e)}
                          </td>

                          {/* Market */}
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {e.exchange || e.market || e.country || '—'}
                          </td>

                          {/* Grade */}
                          <td style={{ padding:'12px 12px' }}>
                            <GradeBadge grade={gradeOf(e)} />
                          </td>

                          {/* Chevron */}
                          <td style={{ padding:'12px 8px', color:C.muted }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div style={{ padding:'12px 0', fontFamily:C.font, fontSize:9, color:C.muted }}>
                  {entries.length} entries · sorted by {sortCol === '#' ? 'rank' : sortCol} {sortDir}
                </div>
              </div>
            )}
          </>
        )}

        {!isLoading && !error && !snap && (
          <div style={{ padding:'64px 0', textAlign:'center', color:C.dim, fontFamily:C.sans, fontSize:14 }}>
            No data available. Use the Refresh button to generate a snapshot.
          </div>
        )}
      </div>

      {/* ── Report panel overlay ─────────────────────────── */}
      {selectedEntry && snap && (
        <>
          <div
            onClick={() => setSelectedEntry(null)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:79, backdropFilter:'blur(2px)' }}
          />
          <ReportPanel
            entry={selectedEntry}
            snapshotId={sid}
            onClose={() => setSelectedEntry(null)}
          />
        </>
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
   Strategy Page — five-tab wrapper
   ═══════════════════════════════════════════════════════════════════ */
export default function StrategyScreenerPage() {
  const [tab, setTab] = useState<'screener' | 'smart-options' | 'vix-risk-regime' | 'weekly-price-movements' | 'ten-year-spx'>('screener');

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
        <button style={tabStyle(tab === 'screener')} onClick={() => setTab('screener')}>Chain Reaction</button>
        <button style={tabStyle(tab === 'smart-options')} onClick={() => setTab('smart-options')}>Smart Options</button>
        <button style={tabStyle(tab === 'vix-risk-regime')} onClick={() => setTab('vix-risk-regime')}>VIX Risk Regime</button>
        <button style={tabStyle(tab === 'weekly-price-movements')} onClick={() => setTab('weekly-price-movements')}>Weekly Movements</button>
        <button style={tabStyle(tab === 'ten-year-spx')} onClick={() => setTab('ten-year-spx')}>10Y Yield vs SPX</button>
      </div>

      {tab === 'screener' && <StrategyScreenerInner />}
      {tab === 'smart-options' && (
        <div style={{ padding: '0 24px', maxWidth: 1100, margin: '0 auto' }}>
          <SmartOptionsTab />
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

