import { useState, useCallback, useMemo } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { RefreshCw, X, ChevronRight, ArrowLeft, AlertCircle, Loader2, SlidersHorizontal } from 'lucide-react';
import { fetchBottlenecksCurrent, fetchReport, refreshSnapshot } from '@/lib/screener';
import type { BottlenecksCurrentResponse, ScreenerEntry, ScreenerReport } from '@/types/screener';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TickerThematicBadge, ThematicSection, RegimeContextStrip } from '@/components/ui/ticker-thematic';

/* ── Design tokens — premium dark publication ─────────────────────── */
const C = {
  bg:       '#07090f',
  surface:  '#0c1120',
  card:     '#0f1628',
  border:   '#1c2a45',
  borderFaint: '#141e33',
  text:     '#e2e8f0',
  dim:      '#64748b',
  muted:    '#3d4f6b',
  bright:   '#f8fafc',
  indigo:   '#6366f1',
  indigoFg: '#a5b4fc',
  indigoSub:'rgba(99,102,241,0.08)',
  green:    '#22c55e',
  amber:    '#f59e0b',
  blue:     '#38bdf8',
  red:      '#ef4444',
  font:     "'JetBrains Mono','Fira Code',monospace",
  sans:     "'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

/* ── Filter option definitions ───────────────────────────────────── */
const MARKET_CAP_OPTIONS = [
  { value: '',            label: 'All Caps' },
  { value: 'large_mega',  label: 'Large/Mega Cap  ($100B+)' },
  { value: 'upper_mid',   label: 'Upper Mid Cap  ($20B–$99B)' },
  { value: 'lower_mid',   label: 'Lower Mid Cap  ($5B–$19B)' },
  { value: 'micro_small', label: 'Micro/Small Cap  (<$5B)' },
  { value: 'unknown',     label: 'Unknown / Foreign' },
];

const LAYER_OPTIONS = [
  { value: '',  label: 'All Layers' },
  { value: '1', label: 'Layer 1' },
  { value: '2', label: 'Layer 2' },
  { value: '3', label: 'Layer 3' },
];

const SORT_OPTIONS = [
  { value: 'best_fit',   label: 'Best Fit' },
  { value: 'market_cap', label: 'Market Cap' },
  { value: 'layer',      label: 'Layer' },
  { value: 'grade',      label: 'Grade' },
];

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmtCap(v?: number): string {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
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
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

function normaliseEntries(snap: BottlenecksCurrentResponse): ScreenerEntry[] {
  const rawRows = snap.rows || (snap as any).entries || (snap as any).ranked_list || (snap as any).candidates || (snap as any).results || [];
  return rawRows.map((r: any, i: number) => ({
    ...r,
    ticker: r.ticker || r.bottleneck_ticker || r.symbol || '',
    symbol: r.symbol || r.bottleneck_ticker || r.ticker || '',
    market_cap_usd: r.market_cap_usd ?? r.marketCap ?? r.market_cap,
    market_cap_bucket: r.market_cap_bucket || r.marketCapBucket || '',
    layer_depth: r.layer_depth ?? (typeof r.layer === 'number' ? r.layer : undefined),
    rank: r.rank ?? i + 1,
  }));
}

function snapshotId(snap: BottlenecksCurrentResponse): string {
  return (snap as any).visible_snapshot_id || (snap as any).snapshot_id || (snap as any).id || 'latest';
}

function tickerOf(e: ScreenerEntry): string {
  return e.ticker || (e as any).bottleneck_ticker || e.symbol || '';
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
  return e.best_blend_score ?? e.final_score ?? e.score ?? e.bottleneck_score;
}

/* ── Sub-components ───────────────────────────────────────────────── */

function LoadingState() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'80px 0', color:C.dim }}>
      <Loader2 size={28} style={{ animation:'spin 1s linear infinite', color:C.indigo }} />
      <span style={{ fontFamily:C.font, fontSize:11 }}>Loading snapshot…</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14, padding:'60px 24px', textAlign:'center' }}>
      <AlertCircle size={28} style={{ color:C.amber }} />
      <p style={{ fontFamily:C.sans, fontSize:14, color:C.dim, maxWidth:380 }}>{message}</p>
      <button onClick={onRetry} style={{ padding:'7px 20px', background:C.indigoSub, border:`1px solid rgba(99,102,241,0.3)`, borderRadius:6, color:C.indigoFg, fontFamily:C.font, fontSize:11, cursor:'pointer' }}>
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

const CAP_BUCKET_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  // ── Backend canonical bucket names ────────────────────────────────
  large_cap:   { label: 'Large Cap',   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  mid_cap:     { label: 'Mid Cap',     color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  small_cap:   { label: 'Small Cap',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  micro_cap:   { label: 'Micro Cap',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  mega_cap:    { label: 'Mega Cap',    color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  // ── Legacy / alternative names ────────────────────────────────────
  micro_small: { label: 'Micro/Small', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  lower_mid:   { label: 'Lower Mid',   color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  upper_mid:   { label: 'Upper Mid',   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  large_mega:  { label: 'Large/Mega',  color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  large:       { label: 'Large',       color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  mega:        { label: 'Mega',        color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  micro:       { label: 'Micro',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  small:       { label: 'Small',       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  mid:         { label: 'Mid',         color: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
};

function CapBucketBadge({ bucket }: { bucket: string }) {
  const key = bucket.toLowerCase().replace(/[\s-]/g, '_');
  const cfg = CAP_BUCKET_STYLES[key];
  if (!cfg) return null;
  return (
    <span style={{ display: 'block', marginTop: 2, padding: '1px 5px', background: cfg.bg, border: `1px solid ${cfg.color}30`, borderRadius: 3, fontFamily: C.font, fontSize: 8, color: cfg.color, whiteSpace: 'nowrap' }}>
      {cfg.label}
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

/* ── Report Section renderer ─────────────────────────────────────── */
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

/* ── TradingView symbol builder ──────────────────────────────────── */
// Maps raw exchange names/codes → TradingView-specific exchange prefixes.
// Partial/substring matching is used for verbose names like "NASDAQ Global Select Market".
const TV_EX: Record<string, string> = {
  // ── US ──────────────────────────────────────────────────────────
  'NASDAQ': 'NASDAQ', 'NMS': 'NASDAQ', 'NGS': 'NASDAQ', 'NGM': 'NASDAQ', 'NCM': 'NASDAQ',
  'NYSE': 'NYSE', 'NYQ': 'NYSE',
  'NYSE AMERICAN': 'AMEX', 'NYSE ARCA': 'AMEX', 'AMEX': 'AMEX', 'ARCA': 'AMEX',
  'OTC': 'OTC', 'OTCMKTS': 'OTC', 'OTCPK': 'OTC', 'OTCBB': 'OTC', 'OTCQB': 'OTC', 'OTCQX': 'OTC',
  'CBOE': 'CBOE',
  // ── Canada ──────────────────────────────────────────────────────
  'TSX': 'TSX', 'TORONTO': 'TSX',
  'TSXV': 'TSXV', 'CVE': 'TSXV',
  // ── UK ──────────────────────────────────────────────────────────
  'LSE': 'LSE', 'LON': 'LSE', 'LONDON': 'LSE',
  // ── Australia ───────────────────────────────────────────────────
  'ASX': 'ASX',
  // ── Hong Kong ───────────────────────────────────────────────────
  'HKEX': 'HKEX', 'HKG': 'HKEX', 'HK': 'HKEX',
  // ── Singapore ───────────────────────────────────────────────────
  'SGX': 'SGX',
  // ── South Korea ─────────────────────────────────────────────────
  'KRX': 'KRX', 'KOSPI': 'KRX', 'KOSDAQ': 'KOSDAQ',
  // ── Japan — TradingView uses TSE for Tokyo Stock Exchange ────────
  'TSE': 'TSE', 'TYO': 'TSE', 'JPX': 'TSE', 'OSA': 'TSE', 'JASDAQ': 'TSE',
  // ── Germany ─────────────────────────────────────────────────────
  'XETRA': 'XETR', 'XETR': 'XETR', 'FWB': 'FWB',
  // ── France / Pan-Europe ─────────────────────────────────────────
  'EURONEXT': 'EURONEXT', 'EPA': 'EURONEXT', 'AMS': 'EURONEXT',
  // ── Switzerland ─────────────────────────────────────────────────
  'SIX': 'SIX', 'SWX': 'SIX',
  // ── India ───────────────────────────────────────────────────────
  'NSE': 'NSE', 'BSE': 'BSE',
  // ── China ───────────────────────────────────────────────────────
  'SSE': 'SSE', 'SHA': 'SSE', 'SZSE': 'SZSE', 'SHE': 'SZSE',
  // ── Brazil ──────────────────────────────────────────────────────
  'B3': 'BMFBOVESPA', 'BOVESPA': 'BMFBOVESPA', 'BVMF': 'BMFBOVESPA',
  // ── Other ───────────────────────────────────────────────────────
  'JSE': 'JSE', 'BMV': 'BMV', 'BVB': 'BVB', 'TADAWUL': 'TADAWUL',
  'TASE': 'TASE', 'IDX': 'IDX', 'SET': 'SET', 'BURSA': 'MYX',
};

// TradingView exchange codes that are US markets — alphabetical tickers here are valid
const TV_US_EXCHANGES = new Set(['NASDAQ', 'NYSE', 'AMEX', 'OTC', 'CBOE']);

// Native tickers on these foreign exchanges are numeric (009150, 6981, etc.)
// An all-letter ticker paired with one of these is a US OTC ADR — route to OTC:
const TV_NUMERIC_EXCHANGES = new Set([
  'TSE', 'KRX', 'KOSDAQ', 'SSE', 'SZSE', 'HKEX', 'NSE', 'BSE',
  'IDX', 'SET', 'MYX', 'TADAWUL', 'TASE',
]);

function looksLikeOtcAdr(tk: string): boolean {
  // US OTC ADR tickers are purely alphabetical (e.g. MRAAY, SEMCY, SSNLF)
  // Native foreign tickers are numeric or contain dots/hyphens (009150, 6981.T)
  return /^[A-Z]{1,6}$/.test(tk);
}

function buildTVSymbol(entry: ScreenerEntry): string {
  const tk = (entry.ticker || entry.symbol || '').toUpperCase();
  if (!tk) return '';

  // 1. Explicit US ADR/proxy: always use it — drop direct_tradable guard
  const usTicker = entry.adr_ticker || entry.adr_proxy || entry.us_access_proxy;
  if (usTicker) {
    const utk = usTicker.toUpperCase();
    // Well-known ADRs on major US exchanges resolve fine without prefix via TV search
    // OTC-style (pure alpha, ≥4 chars) need OTC: prefix
    return looksLikeOtcAdr(utk) ? `OTC:${utk}` : utk;
  }

  const rawEx = (entry.exchange || entry.market || '').toUpperCase().trim();
  if (!rawEx) {
    // No exchange: if country is non-US and ticker looks like an OTC ADR, prefix OTC:
    const country = (entry.country || '').toUpperCase();
    const isNonUs = country && country !== 'US' && country !== 'USA';
    if (isNonUs && looksLikeOtcAdr(tk)) return `OTC:${tk}`;
    return tk;
  }

  // Resolve to TradingView exchange code
  let tvEx: string | undefined = TV_EX[rawEx];
  if (!tvEx) {
    for (const [key, val] of Object.entries(TV_EX)) {
      if (rawEx.startsWith(key) || rawEx.includes(key)) { tvEx = val; break; }
    }
  }

  if (!tvEx) return tk; // Unknown exchange — bare ticker, let TV search

  // 2. If the mapped exchange is a foreign numeric-ticker market but the ticker is
  //    all-alphabetical, it's a US OTC ADR being listed under its home exchange.
  //    Route to OTC: so TradingView can find it.
  if (!TV_US_EXCHANGES.has(tvEx) && TV_NUMERIC_EXCHANGES.has(tvEx) && looksLikeOtcAdr(tk)) {
    return `OTC:${tk}`;
  }

  return `${tvEx}:${tk}`;
}

/* ── TradingView Chart ───────────────────────────────────────────── */
function TradingViewChart({ symbol }: { symbol: string }) {
  if (!symbol) return null;

  const sym = symbol;

  const studies = encodeURIComponent(
    ['RSI@tv-basicstudies', 'MACD@tv-basicstudies', 'BB@tv-basicstudies'].join('|')
  );

  const src = [
    'https://www.tradingview.com/widgetembed/',
    `?symbol=${encodeURIComponent(sym)}`,
    '&interval=D',
    '&theme=dark',
    '&style=1',
    '&locale=en',
    '&enable_publishing=false',
    '&allow_symbol_change=true',
    '&save_image=false',
    '&hide_top_toolbar=0',
    '&hide_side_toolbar=0',
    '&withdateranges=1',
    '&hideideas=1',
    `&studies=${studies}`,
  ].join('');

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, background: C.bg, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 22px 0' }}>
        <span style={{ fontFamily: C.font, fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Chart · {sym}
        </span>
        <span style={{ fontFamily: C.font, fontSize: 9, color: C.muted }}>RSI · MACD · BB</span>
      </div>
      <iframe
        key={sym}
        src={src}
        style={{
          width: '100%',
          height: 380,
          border: 'none',
          display: 'block',
        }}
        allow="fullscreen"
        title={`${sym} chart`}
      />
    </div>
  );
}

/* ── Report Panel ────────────────────────────────────────────────── */
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
    queryFn: () => fetchReport(sid, tk),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const sectionsFromReport = (r: ScreenerReport) => [
    { title: 'Summary', content: r.summary },
    { title: 'Why It Matters', content: r.why_it_matters },
    { title: 'Supply Chain Position', content: r.supply_chain_position },
    { title: 'Supply Chain Map', content: r.supply_chain_map },
    { title: 'Competitors', content: r.competitors },
    { title: 'Catalysts', content: r.catalysts },
    { title: 'Rerating Case', content: r.rerating_case },
    { title: 'Why Hidden', content: r.why_hidden },
    { title: 'Key Risk', content: r.key_risk },
    { title: 'What to Verify Next', content: r.what_to_verify_next },
    { title: 'What Would Break Thesis', content: r.what_would_break_thesis },
  ];

  const extraSections: { title: string; content: string }[] = report?.sections
    ? report.sections.map(s => ({ title: s.label || '', content: s.content || s.text || '' }))
    : [];

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(680px, 100vw)', background:C.surface, borderLeft:`1px solid ${C.border}`, zIndex:80, display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.5)' }}>
      {/* Panel header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'16px 22px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', color:C.dim, cursor:'pointer', padding:'4px 8px', borderRadius:4, fontFamily:C.font, fontSize:10 }}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:C.font, fontSize:16, fontWeight:700, color:C.bright }}>{tk}</span>
            <GradeBadge grade={gradeOf(entry)} />
            <AccessBadge entry={entry} />
          </div>
          <div style={{ fontFamily:C.sans, fontSize:12, color:C.dim, marginTop:2 }}>{nameOf(entry)}</div>
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, color:C.dim, cursor:'pointer', padding:4 }}>
          <X size={14} />
        </button>
      </div>

      {/* Meta strip */}
      <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 22px', borderBottom:`1px solid ${C.borderFaint}`, background:C.indigoSub, flexShrink:0, flexWrap:'wrap' }}>
        {entry.theme || entry.themes?.[0] ? <span style={{ fontFamily:C.font, fontSize:10, color:C.indigoFg }}>{themeOf(entry)}</span> : null}
        {entry.layer_depth != null && <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>Layer {entry.layer_depth}</span>}
        {entry.country && <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>{entry.country}</span>}
        {entry.market_cap_usd && <span style={{ fontFamily:C.font, fontSize:10, color:C.dim }}>{fmtCap(entry.market_cap_usd)}</span>}
        {entry.why_now && <span style={{ fontFamily:C.sans, fontSize:11, color:C.dim, fontStyle:'italic', flex:1, minWidth:120 }}>{entry.why_now}</span>}
      </div>

      {/* Report body — chart + text scroll together */}
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
            <p style={{ fontFamily:C.sans, fontSize:13, color:C.dim, textAlign:'center' }}>
              Report unavailable — showing snapshot data.
            </p>
            {entry.thesis_summary && <ReportSection title="Thesis" content={entry.thesis_summary} />}
            {entry.why_now && <ReportSection title="Why Now" content={entry.why_now} />}
            {entry.why_hidden && <ReportSection title="Why Hidden" content={entry.why_hidden} />}
          </div>
        )}
        {report && !report.error && (
          <>
            {report.headline && (
              <p style={{ fontFamily:C.sans, fontSize:15, color:C.indigoFg, fontStyle:'italic', marginBottom:24, lineHeight:1.7, borderLeft:`3px solid ${C.indigo}`, paddingLeft:14 }}>
                {report.headline}
              </p>
            )}
            {sectionsFromReport(report).map(s => <ReportSection key={s.title} title={s.title} content={s.content} />)}
            {extraSections.map(s => <ReportSection key={s.title} title={s.title} content={s.content} />)}
          </>
        )}
        {report?.error && (
          <div>
            <p style={{ fontFamily:C.sans, fontSize:13, color:C.dim, textAlign:'center', marginBottom:16 }}>Report load error — showing available data.</p>
            {entry.thesis_summary && <ReportSection title="Thesis" content={entry.thesis_summary} />}
            {entry.why_now && <ReportSection title="Why Now" content={entry.why_now} />}
          </div>
        )}
        <ThematicSection fields={entry} />
        </div>
      </div>
    </div>
  );
}

/* ── Compact select ──────────────────────────────────────────────── */
function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const active = value !== '';
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '5px 28px 5px 10px',
        backgroundColor: active ? `rgba(99,102,241,0.12)` : C.card,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2364748b'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : C.border}`,
        borderRadius: 5,
        color: active ? C.indigoFg : C.dim,
        fontFamily: C.font,
        fontSize: 10,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        minWidth: 130,
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} style={{ background: C.surface, color: C.text }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export default function StrategyScreenerPage() {
  const [selectedEntry, setSelectedEntry] = useState<ScreenerEntry | null>(null);
  const [refreshMsg, setRefreshMsg] = useState<string>('');
  const [marketCap, setMarketCap] = useState('');
  const [layer, setLayer] = useState('');
  const [sortBy, setSortBy] = useState('best_fit');
  const qc = useQueryClient();

  const {
    data: snap,
    isLoading,
    error,
    refetch,
  } = useQuery<BottlenecksCurrentResponse>({
    queryKey: ['bottlenecks-current'],
    queryFn: () => fetchBottlenecksCurrent({ limit: 20 }),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const refreshMut = useMutation({
    mutationFn: refreshSnapshot,
    onSuccess: (data) => {
      const genuinelyChanged =
        (data as any).snapshot_changed ??
        (data as any).diagnostics?.snapshot_genuinely_changed ??
        true;
      if (genuinelyChanged === false) {
        const reason = (data as any).diagnostics?.snapshot_genuinely_changed_reason ||
          (data as any).reason || data.message || 'Snapshot already current — no new data detected';
        setRefreshMsg(reason);
      } else {
        setRefreshMsg(data.message || data.status || 'Snapshot refreshed');
      }
      setTimeout(() => setRefreshMsg(''), 6000);
      qc.invalidateQueries({ queryKey: ['bottlenecks-current'] });
    },
    onError: (err: any) => {
      setRefreshMsg(`Refresh error: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setRefreshMsg(''), 5000);
    },
  });

  // All rows normalised — ticker/market_cap/layer fields mapped
  const allEntries: ScreenerEntry[] = useMemo(
    () => snap ? normaliseEntries(snap) : [],
    [snap]
  );

  // Client-side filter + sort (new endpoint doesn't accept filter params)
  const entries: ScreenerEntry[] = useMemo(() => {
    let filtered = allEntries;
    if (marketCap) {
      filtered = filtered.filter(e => {
        const b = String(e.market_cap_bucket || '').toLowerCase().replace(/[\s-]/g, '_');
        return b === marketCap;
      });
    }
    if (layer) {
      filtered = filtered.filter(e => String(e.layer_depth) === layer);
    }
    if (sortBy === 'market_cap') {
      filtered = [...filtered].sort((a, b) => (b.market_cap_usd ?? 0) - (a.market_cap_usd ?? 0));
    } else if (sortBy === 'layer') {
      filtered = [...filtered].sort((a, b) => (a.layer_depth ?? 99) - (b.layer_depth ?? 99));
    }
    return filtered;
  }, [allEntries, marketCap, layer, sortBy]);

  const sid = useMemo(() => snap ? snapshotId(snap) : 'latest', [snap]);

  const derivedTopThemes = useMemo(() => {
    if (snap?.themes_in_visible?.length) return snap.themes_in_visible.slice(0, 4);
    if (!allEntries.length) return [] as string[];
    const counts = new Map<string, number>();
    for (const e of allEntries) {
      const t = e.theme || e.themes?.[0] || '';
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
  }, [snap, allEntries]);

  const derivedLeadNames = useMemo(() => {
    return allEntries
      .slice()
      .sort((a, b) => (scoreOf(b) ?? 0) - (scoreOf(a) ?? 0))
      .slice(0, 3)
      .map(e => e.company_name || e.name || tickerOf(e))
      .filter(Boolean) as string[];
  }, [allEntries]);

  const hiddenGemCount = useMemo(() => {
    const gemBuckets = new Set([
      'micro_small', 'lower_mid', 'upper_mid',
      'small_cap', 'micro_cap', 'mid_cap',
      'micro', 'small', 'mid',
    ]);
    return allEntries.filter(e => {
      const b = String(e.market_cap_bucket ?? '').toLowerCase().replace(/[\s-]/g, '_');
      return gemBuckets.has(b) || (e.market_cap_usd != null && e.market_cap_usd > 0 && e.market_cap_usd < 20e9);
    }).length;
  }, [allEntries]);

  const snapshotAgeLabel = useMemo(() => {
    const ts = snap?.visible_generated_at || (snap as any)?.generated_at || (snap as any)?.lastUpdated;
    if (!ts) return null;
    try {
      const diffMs = Date.now() - new Date(ts).getTime();
      const diffDays = Math.floor(diffMs / 86_400_000);
      if (diffDays === 0) return 'today';
      if (diffDays === 1) return '1 day ago';
      return `${diffDays} days ago`;
    } catch { return null; }
  }, [snap]);

  const handleRowClick = useCallback((e: ScreenerEntry) => {
    setSelectedEntry(e);
  }, []);

  // Build filter summary
  const resultCount = entries.length;
  const mcLabel = MARKET_CAP_OPTIONS.find(o => o.value === marketCap)?.label?.split('  ')[0] ?? 'All Caps';
  const layerLabel = LAYER_OPTIONS.find(o => o.value === layer)?.label ?? 'All Layers';
  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Best Fit';
  const filterSummary = `Showing ${resultCount} · ${mcLabel} · ${layerLabel} · ${sortLabel}`;

  // ── Page context for chatbot ──────────────────────────────────────────────
  useSetPageContext((() => {
    const parts = ['[Page: Chain Reaction Bottlenecks — Cross-Theme Supply Chain Intelligence]'];
    parts.push(`Filters: ${mcLabel} · ${layerLabel} · Sort: ${sortLabel}`);
    if (allEntries.length) {
      const topEntries = allEntries.slice(0,15).map(e=>`${tickerOf(e)}${e.grade?`(${e.grade})`:''}`.trim()).filter(Boolean);
      parts.push(`Bottleneck rows (${allEntries.length} entries): ${topEntries.join(', ')}`);
      if (derivedTopThemes.length) parts.push(`Themes: ${derivedTopThemes.join(', ')}`);
    }
    parts.push('Diversity-gated bottleneck names across nuclear, rare earth, defense, semicap, energy and semiconductor supply chains.');
    return parts.join('\n');
  })(), [allEntries, derivedTopThemes, mcLabel, layerLabel, sortLabel]);

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text }}>
      {/* CSS for spinner */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ss-row:hover { background: rgba(99,102,241,0.06) !important; cursor:pointer; }
        .ss-row td { border-bottom: 1px solid ${C.borderFaint}; }
      `}</style>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 80px' }}>

        {/* ── Hero header ──────────────────────────────────────── */}
        <div style={{ padding:'40px 0 32px', borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:C.indigo }} />
                <span style={{ fontFamily:C.font, fontSize:9, fontWeight:700, color:C.indigoFg, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                  Chain Reaction Bottlenecks
                </span>
                {snap?.week_start && (
                  <>
                    <span style={{ color:C.muted, fontSize:9, fontFamily:C.font }}>·</span>
                    <span style={{ fontFamily:C.font, fontSize:9, color:C.dim }}>Week of {snap.week_start}</span>
                  </>
                )}
              </div>
              <h1 style={{ fontFamily:C.sans, fontSize:28, fontWeight:700, color:C.bright, margin:'0 0 6px', letterSpacing:'-0.01em' }}>
                Chain Reaction
              </h1>
              <p style={{ fontFamily:C.sans, fontSize:13, color:C.dim, margin:'0 0 10px', maxWidth:620, lineHeight:1.65 }}>
                Find anchor stocks that control major themes — and map the suppliers, beneficiaries, catalysts, fundamentals, and technical setups moving around them.
              </p>
              {snap?.note && (
                <p style={{ fontFamily:C.sans, fontSize:13, color:C.dim, margin:'0 0 10px', maxWidth:600, lineHeight:1.7, fontStyle:'italic' }}>
                  {snap.note}
                </p>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                {snap?.visible_generated_at && (
                  <span style={{ fontFamily:C.font, fontSize:10, color:C.muted }}>
                    Generated {fmtDate(snap.visible_generated_at)}
                  </span>
                )}
                {snap?.diversity_gate_result && (
                  <span style={{ padding:'2px 10px', background:C.indigoSub, border:`1px solid rgba(99,102,241,0.2)`, borderRadius:4, fontFamily:C.font, fontSize:10, color:C.indigoFg }}>
                    {(snap.diversity_gate_result as any).themes_achieved ?? ''} themes · diversity gate passed
                  </span>
                )}
                {derivedTopThemes.length > 0 ? (
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {derivedTopThemes.slice(0,4).map(t => (
                      <span key={t} style={{ padding:'2px 8px', background:`rgba(56,189,248,0.08)`, border:`1px solid rgba(56,189,248,0.2)`, borderRadius:4, fontFamily:C.font, fontSize:9, color:C.blue }}>
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {allEntries.length > 0 && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6, flexWrap:'wrap' }}>
                    {snapshotAgeLabel && (
                      <span style={{ fontFamily:C.font, fontSize:9, color: snapshotAgeLabel !== 'today' ? C.amber : C.muted }}>
                        Snapshot: {snapshotAgeLabel}
                      </span>
                    )}
                    {hiddenGemCount > 0 && (
                      <span style={{ padding:'2px 8px', background:`rgba(245,158,11,0.08)`, border:`1px solid rgba(245,158,11,0.2)`, borderRadius:4, fontFamily:C.font, fontSize:9, color:C.amber }}>
                        {hiddenGemCount} sub-$20B name{hiddenGemCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {derivedLeadNames.length > 0 && (
                      <span style={{ fontFamily:C.font, fontSize:9, color:C.dim }}>
                        Lead: {derivedLeadNames.join(' · ')}
                      </span>
                    )}
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
                  border:`1px solid ${refreshMut.isPending ? C.indigo : C.border}`,
                  borderRadius:6, color: refreshMut.isPending ? C.indigoFg : C.dim,
                  fontFamily:C.font, fontSize:10, cursor: refreshMut.isPending ? 'not-allowed' : 'pointer',
                  transition:'all 0.15s',
                }}
              >
                <RefreshCw size={12} style={{ animation: refreshMut.isPending ? 'spin 1s linear infinite' : 'none' }} />
                {refreshMut.isPending ? 'Refreshing…' : 'Refresh Snapshot'}
              </button>
              {refreshMsg && (
                <span style={{ fontFamily:C.font, fontSize:9, color: (refreshMsg.toLowerCase().includes('fail') || refreshMsg.toLowerCase().includes('error')) ? C.amber : C.green }}>
                  {refreshMsg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Filter toolbar ───────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 0', borderBottom:`1px solid ${C.borderFaint}`, flexWrap:'wrap' }}>
          <SlidersHorizontal size={12} style={{ color:C.muted, flexShrink:0 }} />
          <FilterSelect value={marketCap} onChange={setMarketCap} options={MARKET_CAP_OPTIONS} />
          <FilterSelect value={layer} onChange={setLayer} options={LAYER_OPTIONS} />
          <span style={{ color:C.muted, fontFamily:C.font, fontSize:9, padding:'0 2px' }}>sort</span>
          <FilterSelect value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
          {(marketCap || layer || sortBy !== 'best_fit') && (
            <button
              onClick={() => { setMarketCap(''); setLayer(''); setSortBy('best_fit'); }}
              style={{ marginLeft:4, padding:'4px 10px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:4, color:C.muted, fontFamily:C.font, fontSize:9, cursor:'pointer' }}
            >
              Reset
            </button>
          )}
          {isLoading && <Loader2 size={11} style={{ color:C.indigo, animation:'spin 1s linear infinite', marginLeft:4 }} />}
        </div>

        {/* ── Content area ─────────────────────────────────────── */}
        {isLoading && !snap && <LoadingState />}
        {error && !snap && (
          <ErrorState
            message={`Could not load bottlenecks: ${(error as Error).message || 'Unknown error'}`}
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
            {/* Active filter summary */}
            <div style={{ padding:'10px 0 0', fontFamily:C.font, fontSize:9, color:C.muted }}>
              {filterSummary}
            </div>

            {/* Stats strip */}
            <div style={{ display:'flex', alignItems:'center', gap:24, padding:'16px 0', borderBottom:`1px solid ${C.borderFaint}`, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontFamily:C.font, fontSize:18, fontWeight:700, color:C.bright }}>{entries.length}</div>
                <div style={{ fontFamily:C.font, fontSize:9, color:C.dim, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Ranked Entries</div>
              </div>
              {snap.universe_count != null && snap.universe_count !== allEntries.length && (
                <div>
                  <div style={{ fontFamily:C.font, fontSize:18, fontWeight:700, color:C.dim }}>{snap.universe_count}</div>
                  <div style={{ fontFamily:C.font, fontSize:9, color:C.dim, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Universe</div>
                </div>
              )}
              {snap.visible_count != null && (
                <div>
                  <div style={{ fontFamily:C.font, fontSize:18, fontWeight:700, color:C.indigoFg }}>{snap.visible_count}</div>
                  <div style={{ fontFamily:C.font, fontSize:9, color:C.dim, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Diversity-Gated</div>
                </div>
              )}
            </div>

            {/* ── Ranked list table ─────────────────────────────── */}
            {entries.length === 0 ? (
              <div style={{ padding:'48px 0', textAlign:'center', color:C.dim, fontFamily:C.sans, fontSize:14 }}>
                No entries in this snapshot.
              </div>
            ) : (
              <div style={{ marginTop:24, overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'auto' }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                      {['#', 'Ticker', 'Company / Role', 'Theme', 'Mkt Cap', 'Layer', 'Market', 'Grade'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', fontFamily:C.font, fontSize:8, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left', whiteSpace:'nowrap' }}>
                          {h}
                        </th>
                      ))}
                      <th style={{ width:20 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => {
                      const tk = tickerOf(e);
                      const score = scoreOf(e);
                      return (
                        <tr
                          key={tk || idx}
                          className="ss-row"
                          onClick={() => handleRowClick(e)}
                          style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)', transition:'background 0.1s' }}
                        >
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.muted, width:36 }}>
                            {e.rank ?? idx + 1}
                          </td>
                          <td style={{ padding:'12px 12px', whiteSpace:'nowrap' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                              <span style={{ fontFamily:C.font, fontSize:13, fontWeight:700, color:C.bright }}>{tk || '—'}</span>
                              <AccessBadge entry={e} />
                            </div>
                            {score != null && (
                              <div style={{ fontFamily:C.font, fontSize:8, color:C.muted, marginTop:2 }}>
                                score {Math.round(score)}
                              </div>
                            )}
                            <TickerThematicBadge fields={e} />
                          </td>
                          <td style={{ padding:'12px 12px', maxWidth:220 }}>
                            <div style={{ fontFamily:C.sans, fontSize:12, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {nameOf(e)}
                            </div>
                            {(e.role || e.chain_role_type) && (
                              <div style={{ fontFamily:C.font, fontSize:9, color:C.dim, marginTop:2 }}>
                                {e.role || e.chain_role_type}
                              </div>
                            )}
                          </td>
                          <td style={{ padding:'12px 12px', whiteSpace:'nowrap' }}>
                            <span style={{ fontFamily:C.font, fontSize:10, color:C.blue }}>{themeOf(e)}</span>
                          </td>
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {fmtCap(e.market_cap_usd)}
                            {(e as any).market_cap_bucket && (
                              <CapBucketBadge bucket={String((e as any).market_cap_bucket)} />
                            )}
                          </td>
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {layerOf(e)}
                          </td>
                          <td style={{ padding:'12px 12px', fontFamily:C.font, fontSize:10, color:C.dim, whiteSpace:'nowrap' }}>
                            {e.exchange || e.market || e.country || '—'}
                          </td>
                          <td style={{ padding:'12px 12px' }}>
                            <GradeBadge grade={gradeOf(e)} />
                          </td>
                          <td style={{ padding:'12px 8px' }}>
                            <ChevronRight size={14} style={{ color:C.muted }} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Empty fallback when no snapshot yet but no error ─── */}
        {!isLoading && !error && !snap && (
          <div style={{ padding:'64px 0', textAlign:'center', color:C.dim, fontFamily:C.sans, fontSize:14 }}>
            No data available yet. Use the Refresh Snapshot button to generate one.
          </div>
        )}
      </div>

      {/* ── Report panel overlay ──────────────────────────────── */}
      {selectedEntry && snap && (
        <>
          {/* Backdrop */}
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
