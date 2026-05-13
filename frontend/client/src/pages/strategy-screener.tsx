import { useState, useCallback, useMemo } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { RefreshCw, X, ArrowLeft, AlertCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { fetchLatestSnapshot, fetchReport, refreshSnapshot } from '@/lib/screener';
import type { ScreenerSnapshot, ScreenerEntry, ScreenerReport } from '@/types/screener';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ThematicSection } from '@/components/ui/ticker-thematic';

/* ── Design tokens ──────────────────────────────────────────────── */
const C = {
  bg:          '#07090f',
  surface:     '#0c1120',
  card:        '#0f1628',
  border:      '#1c2a45',
  borderFaint: '#141e33',
  text:        '#e2e8f0',
  dim:         '#64748b',
  muted:       '#3d4f6b',
  bright:      '#f8fafc',
  indigo:      '#6366f1',
  indigoFg:    '#a5b4fc',
  indigoSub:   'rgba(99,102,241,0.08)',
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
        style={{ padding:'7px 20px', background:C.indigoSub, border:`1px solid rgba(99,102,241,0.3)`, borderRadius:6, color:C.indigoFg, fontFamily:C.font, fontSize:11, cursor:'pointer' }}
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
export default function StrategyScreenerPage() {
  const [selectedEntry, setSelectedEntry] = useState<ScreenerEntry | null>(null);
  const [refreshMsg,    setRefreshMsg]    = useState<string>('');
  const [sortCol,       setSortCol]       = useState<SortCol>('#');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('asc');
  const qc = useQueryClient();

  const { data: snap, isLoading, error, refetch } = useQuery<ScreenerSnapshot>({
    queryKey: ['strategy-screener-latest'],
    queryFn:  () => fetchLatestSnapshot(),
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
