import { useState, useEffect, useMemo, useRef } from 'react';
import { useTheme, DARK_C } from '@/contexts/ThemeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, TrendingUp, BookOpen, Newspaper, Brain, Loader2, Zap, RefreshCw, CheckSquare, Square, Activity, BarChart2 } from 'lucide-react';
import { useEarningsLive } from '@/contexts/EarningsLiveContext';
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes';
import { mergeRealtimeQuote } from '@/lib/mergeRealtimeQuote';
import { PriceFreshnessBadge } from '@/components/PriceFreshnessBadge';
import { EarningsTab } from '@/components/EarningsTab';
import { hasCompanyProfile, isEarningsSupported, type TickerDetailResponse } from '@/components/tickerDetailContract';

/* ── color tokens ─────────────────────────────────────────────────── */
let C = DARK_C;
const _sdmFont = "'JetBrains Mono','Fira Code',monospace";
const _sdmSans = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/* ── helpers ─────────────────────────────────────────────────────── */
function signalColor(signal?: string): string {
  if (!signal) return C.dim;
  const s = signal.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('STRONGBUY')) return C.green;
  if (s.includes('BUY'))       return C.teal;
  if (s.includes('HOLD'))      return C.amber;
  if (s.includes('AVOID') || s.includes('SELL')) return C.red;
  return C.dim;
}
function riskColor(risk?: string): string {
  if (!risk) return C.dim;
  const r = risk.toUpperCase();
  if (r.includes('HIGH')) return C.red;
  if (r.includes('MED'))  return C.amber;
  if (r.includes('LOW'))  return C.green;
  return C.dim;
}
function ptsColor(pts: number | null, max: number): string {
  if (pts == null) return C.dim;
  const pct = max > 0 ? (pts / max) * 100 : 0;
  if (pct >= 75) return C.green;
  if (pct >= 45) return C.amber;
  return C.red;
}
function ccsColor(n: number): string {
  if (n >= 75) return C.green;
  if (n >= 55) return C.teal;
  if (n >= 40) return C.amber;
  return C.red;
}
function tierColor(tier?: string): string {
  if (!tier) return C.amber;
  const t = (tier || '').toUpperCase();
  if (t === 'TIER_A' || t === 'A') return C.green;
  if (t === 'TIER_B' || t === 'B') return C.teal;
  if (t === 'TIER_C' || t === 'C') return C.amber;
  return C.amber;
}
function actionBadgeColor(label?: string): string {
  if (!label) return C.dim;
  const l = (label || '').toUpperCase().replace(/[^A-Z_]/g, '');
  if (l === 'READY' || l === 'ACTIONABLE') return C.green;
  if (l.includes('NEAR')) return C.teal;
  if (l === 'WATCH' || l.includes('SUPPORT') || l.includes('RESET')) return C.amber;
  if (l === 'AVOID' || l.includes('RISK') || l.includes('CONFLICT')) return C.red;
  return C.dim;
}
const DECISION_BADGE_MAP: Record<string, { label: string; clr: string }> = {
  READY:                 { label: 'READY',         clr: C.green  },
  ACTIONABLE:            { label: 'ACTIONABLE',     clr: C.green  },
  NEAR_ACTIONABLE:       { label: 'NEAR ACT.',      clr: C.teal   },
  WATCH:                 { label: 'WATCH',          clr: C.blue   },
  CONFLUENCE_AT_SUPPORT: { label: 'AT SUPPORT',     clr: C.blue   },
  WATCH_FOR_RESET:       { label: 'WATCH/RESET',    clr: C.amber  },
  AVOID:                 { label: 'AVOID',          clr: C.red    },
  RISK_CONFLICT:         { label: 'RISK/CONFLICT',  clr: C.red    },
  NO_CLEAR_CONFLUENCE:   { label: 'NO CONFLUENCE',  clr: C.dim    },
};
function fmtNum(val: any, pct?: boolean, mult?: boolean): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (!isFinite(num)) return String(val);
  if (pct) return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  if (mult) return `${num.toFixed(1)}x`;
  const abs = Math.abs(num);
  if (abs >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `$${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `$${(num / 1e6).toFixed(1)}M`;
  if (abs >= 1e3)  return `$${(num / 1e3).toFixed(1)}K`;
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toFixed(2);
}
function fmtPct(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  const n = Number(val);
  if (!isFinite(n)) return String(val);
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}
function fmtMult(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  const n = Number(val);
  if (!isFinite(n)) return String(val);
  return `${n.toFixed(1)}x`;
}
function fmtLarge(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = Number(val);
  if (!isFinite(num)) return String(val);
  const abs = Math.abs(num);
  if (abs >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${(num / 1e6).toFixed(1)}M`;
  if (abs >= 1e3)  return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(2);
}
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
/** Try a list of key names on obj, return first non-null value */
function pick(obj: any, ...keys: string[]): any {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== null && v !== undefined && v !== '') return v;
  }
  return undefined;
}
/** Safely coerce any backend value to a display string */
function safeStr(val: any): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'string') return val || '—';
  if (typeof val === 'number') return isFinite(val) ? String(val) : '—';
  if (typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return val.name ?? val.label ?? val.display_name ?? val.title ?? (val.id != null ? String(val.id) : '—');
  }
  return String(val);
}

/* ── Module-level V42 display primitives (must be OUTSIDE all components) ── */
const V42_RR: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' };
const V42_KK: React.CSSProperties = { fontSize: 8, color: C.dim, fontFamily: _sdmFont };
const V42_VV: React.CSSProperties = { fontSize: 8, color: C.text, fontWeight: 600, fontFamily: _sdmFont };
const V42_SEC: React.CSSProperties = { marginBottom: 14 };
const V42_LBL: React.CSSProperties = { fontSize: 7, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: C.teal, fontFamily: _sdmFont, marginBottom: 5, display: 'block' };

function V42DR({ k, v, clr }: { k: string; v?: string | number | null; clr?: string }) {
  if (v == null || v === '') return null;
  return (
    <div style={V42_RR}>
      <span style={V42_KK}>{k}</span>
      <span style={{ ...V42_VV, color: clr ?? C.text }}>{safeStr(v)}</span>
    </div>
  );
}
function V42PR({ k, pts, max, raw, clr }: { k: string; pts: number | null; max: number; raw?: number | null; clr?: string }) {
  if (pts == null) return null;
  const c = clr ?? ptsColor(pts, max);
  const pct = max > 0 ? (pts / max) * 100 : 0;
  return (
    <div style={V42_RR}>
      <span style={V42_KK}>{k}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {raw != null && <span style={{ fontSize: 7, color: C.dim, fontFamily: _sdmFont }}>q{Math.round(raw)}</span>}
        <div style={{ width: 40, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: c, borderRadius: 2 }} />
        </div>
        <span style={{ ...V42_VV, color: c, minWidth: 60, textAlign: 'right' as const }}>{pts.toFixed(1)} / {max}</span>
      </div>
    </div>
  );
}

/* ── types ───────────────────────────────────────────────────────── */
interface StockDetailModalProps {
  ticker: string;
  analysis: any;
  csvData?: any[];
  watchlistId?: string | null;
  earningsEntry?: any;
  confluenceRows?: any[];
  screenerRow?: any;    /* full screener row — primary source for Technical/Fundamentals tabs */
  allNews?: any[];      /* watchlist live news — fallback for News tab */
  onClose: () => void;
  initialPrimaryTab?: string;
  initialEarningsTab?: string;
}
type TabId = 'overview' | 'technical' | 'fundamentals' | 'news' | 'deep-dive' | 'earnings';

/* ── find stock in analysis ─────────────────────────────────────── */
function findStockInAnalysis(analysis: any, ticker: string): any | null {
  if (!analysis) return null;
  const t = ticker.toUpperCase();
  if (Array.isArray(analysis.sections)) {
    for (const section of analysis.sections) {
      const arr = Array.isArray(section.tickers) ? section.tickers : [];
      const found = arr.find((s: any) => (s.symbol || s.ticker)?.toUpperCase() === t);
      if (found) return { ...found, _section: section.title, _format: 'new' };
    }
  }
  const cats = ['top_buys','most_undervalued','best_catalysts','hidden_gems','most_revolutionary','right_sector'];
  for (const cat of cats) {
    const arr = analysis[cat];
    if (Array.isArray(arr)) {
      const found = arr.find((s: any) => s.ticker?.toUpperCase() === t);
      if (found) return { ...found, _format: 'old' };
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */
export function StockDetailModal({
  ticker, analysis, csvData, watchlistId, earningsEntry, confluenceRows,
  screenerRow, allNews, onClose, initialPrimaryTab, initialEarningsTab,
}: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(
    (initialPrimaryTab as TabId) ?? 'overview',
  );
  const [deepDive, setDeepDive] = useState<any>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>(['grok', 'gemini', 'claude']);
  const [reportModel, setReportModel] = useState<'claude' | 'gpt'>('claude');

  const baseStock = findStockInAnalysis(analysis, ticker);
  const tickerSymbols = useMemo(() => (ticker ? [ticker] : []), [ticker]);
  const { quotesBySymbol: realtimeQuotes } = useRealtimeQuotes(tickerSymbols, { enabled: !!ticker });
  const stock = useMemo(() => {
    const rt = ticker ? realtimeQuotes[ticker.toUpperCase()] : undefined;
    if (!baseStock && !rt) return null;
    return rt ? mergeRealtimeQuote(baseStock || { symbol: ticker }, rt) : baseStock;
  }, [baseStock, realtimeQuotes, ticker]);

  const csvRow = csvData?.find((r: any) => {
    const t = r.ticker || r.Ticker || r.TICKER || r.symbol || r.Symbol;
    return t?.toUpperCase() === ticker.toUpperCase();
  });

  const { data: detail, isLoading: detailLoading } = useQuery<TickerDetailResponse | null>({
    queryKey: ['ticker-detail', ticker.toUpperCase(), 'v3'],
    queryFn: async () => {
      const r = await fetch(`/api/watchlist/ticker-detail/${encodeURIComponent(ticker)}`, {
        credentials: 'include',
      });
      if (!r.ok) return null;
      const raw = await r.json();
      /* Normalize response envelope: { data: { data: {} } } | { data: {} } | { result: {} } | flat */
      return raw?.data?.data ?? raw?.data ?? raw?.result ?? raw;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnMount: true,
    retry: 1,
    enabled: !!ticker,
  });

  const confluenceRow = useMemo(() =>
    confluenceRows?.find(row =>
      (row.ticker || row.symbol || '').toUpperCase() === ticker.toUpperCase()
    ),
    [confluenceRows, ticker]
  );
  const backendQuote = detail?.quote;
  const useRowFallback = backendQuote?.quote_status === 'row_fallback_recommended';

  const generateDeepDive = () => {
    if (deepDiveLoading) return;
    setDeepDiveLoading(true);
    setDeepDiveError(null);
    setDeepDive(null);
    const models = selectedModels.map(m => m === 'claude_gpt' ? reportModel : m);
    fetch(`/api/watchlist/stock/${encodeURIComponent(ticker)}/deep-dive`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ models, report_model: reportModel }),
    })
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.detail || body.error || body.message || `Error ${r.status}`);
        }
        return r.json();
      })
      .then(data => { setDeepDive(data); setDeepDiveLoading(false); })
      .catch(err => { setDeepDiveError(err.message); setDeepDiveLoading(false); });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const queryClient = useQueryClient();
  const { eventBySymbol } = useEarningsLive();
  const sdmLiveEvent = eventBySymbol(ticker);

  // One-time ticker-detail refetch when results or reaction data change for this ticker
  const lastRefetchKeyRef = useRef<string>('');
  useEffect(() => {
    if (!sdmLiveEvent) return;
    const { state, event_id, revision } = sdmLiveEvent;
    const isResultState = state === 'results_available' || state === 'results_updated' || state === 'complete';
    const hasReaction = sdmLiveEvent.reaction_payload != null;
    if (!isResultState && !hasReaction) return;
    // Deduplicate: event + state + revision + reaction checksum so polling never re-fires for same data
    const rp = sdmLiveEvent.reaction_payload as any;
    const rxChecksum = rp ? `${rp.move_pct ?? ''}:${String(rp.is_preliminary ?? '')}` : 'none';
    const key = `${event_id}__${state}__${revision}__${rxChecksum}`;
    if (lastRefetchKeyRef.current === key) return;
    lastRefetchKeyRef.current = key;
    queryClient.invalidateQueries({ queryKey: ['ticker-detail', ticker.toUpperCase(), 'v3'] });
  }, [sdmLiveEvent, ticker, queryClient]);

  const companyName = detail?.company?.name ?? stock?.name ?? stock?.company ?? '';
  const displaySignal = stock?.signal ?? detail?.confluence_v42?.action?.label ?? null;
  const sigCol = signalColor(displaySignal);

  const headerChangePct: number | null =
    stock?.change_pct != null ? stock.change_pct
    : useRowFallback ? (confluenceRow?.change_pct ?? backendQuote?.change_pct ?? null)
    : (backendQuote?.change_pct ?? null);

  // Eligibility is an explicit backend decision. Optional earnings subsections may all be empty.
  const hasEarnings = detailLoading || isEarningsSupported(detail);
  const currentPrice: number | null =
    stock?.price != null ? Number(stock.price) :
    backendQuote?.price != null ? Number(backendQuote.price) : null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',     label: 'Overview',     icon: <TrendingUp style={{ width: 13, height: 13 }} /> },
    { id: 'technical',    label: 'Technical',    icon: <Activity   style={{ width: 13, height: 13 }} /> },
    { id: 'fundamentals', label: 'Fundamentals', icon: <BookOpen   style={{ width: 13, height: 13 }} /> },
    { id: 'news',         label: 'News',         icon: <Newspaper  style={{ width: 13, height: 13 }} /> },
    ...(hasEarnings ? [{ id: 'earnings' as TabId, label: 'Earnings', icon: <BarChart2 style={{ width: 13, height: 13 }} /> }] : []),
    { id: 'deep-dive',    label: 'AI Deep Dive', icon: <Brain      style={{ width: 13, height: 13 }} /> },
  ];

  // If the user clicked into Earnings while loading but data came back with no earnings_intelligence,
  // snap back to overview so they aren't stranded on a vanished tab.
  useEffect(() => {
    if (!detailLoading && !hasEarnings && activeTab === 'earnings') {
      setActiveTab('overview');
    }
  }, [detailLoading, hasEarnings, activeTab]);

  const { C: _C } = useTheme(); C = _C;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 980, maxHeight: '92vh', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, background: C.card, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 20, fontWeight: 900, fontFamily: _sdmFont, color: C.bright }}>{ticker}</span>
          {companyName && <span style={{ fontSize: 12, color: C.dim, fontFamily: _sdmSans }}>{companyName}</span>}
          {stock?._section && (
            <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _sdmFont, color: C.purple, background: `${C.purple}15`, border: `1px solid ${C.purple}30` }}>
              {stock._section}
            </span>
          )}
          {displaySignal && (
            <span style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: _sdmFont, color: '#000', background: sigCol, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {displaySignal}
            </span>
          )}
          {stock?.risk_level && (
            <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _sdmFont, color: riskColor(stock.risk_level), background: `${riskColor(stock.risk_level)}15`, border: `1px solid ${riskColor(stock.risk_level)}30` }}>
              {stock.risk_level} RISK
            </span>
          )}
          {headerChangePct != null && (
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: _sdmFont, color: headerChangePct >= 0 ? C.green : C.red }}>
              {headerChangePct >= 0 ? '+' : ''}{typeof headerChangePct === 'number' ? headerChangePct.toFixed(2) : headerChangePct}%
            </span>
          )}
          {useRowFallback && !stock?.price_source && (
            <span style={{ fontSize: 8, color: C.amber, fontFamily: _sdmFont, border: `1px solid ${C.amber}30`, padding: '2px 6px', borderRadius: 3 }}>SCREENER DATA</span>
          )}
          {stock?.price_source && (
            <PriceFreshnessBadge meta={{ source: stock.price_source, is_realtime: stock.price_is_realtime, is_live_backup: stock.price_is_live_backup, is_stale: stock.price_is_stale, staleness_seconds: stock.staleness_seconds, quote_timestamp: stock.quote_timestamp, updated_at: stock.price_updated_at }} />
          )}
          {sdmLiveEvent && (() => {
            const st = sdmLiveEvent.state;
            const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
            if (st === 'scheduled' && sdmLiveEvent.expected_date !== todayStr) return null;
            const badgeLabel =
              st === 'scheduled' ? 'EARNINGS TODAY' :
              st === 'monitoring' ? 'LIVE EARNINGS' :
              st === 'filing_detected' ? 'RELEASE DETECTED' :
              st === 'results_partial' ? 'PARTIAL RESULTS' :
              st === 'results_available' || st === 'complete' ? 'RESULTS' :
              st === 'results_updated' ? 'UPDATED' : 'RESULTS';
            const badgeColor =
              sdmLiveEvent.classification === 'double_beat' ? '#22c55e' :
              sdmLiveEvent.classification === 'double_miss' ? '#ef4444' :
              st === 'results_updated' ? '#0ea5e9' : '#f59e0b';
            return (
              <span style={{
                padding: '3px 9px', borderRadius: 3, fontSize: 9, fontWeight: 800,
                fontFamily: _sdmFont, color: '#000', background: badgeColor,
                letterSpacing: '0.05em', textTransform: 'uppercase' as const,
              }}>
                {badgeLabel}
              </span>
            );
          })()}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: C.dim, cursor: 'pointer', padding: 4, background: 'none', border: 'none' }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', flexShrink: 0, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '0 20px', margin: '8px 0 0', background: C.card }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', fontSize: 10, fontWeight: 700, fontFamily: _sdmFont, cursor: 'pointer', color: activeTab === tab.id ? C.teal : C.dim, background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? C.teal : 'transparent'}`, transition: 'all 0.15s' }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeTab === 'overview' && <OverviewTab stock={stock} ticker={ticker} csvRow={csvRow} earningsEntry={earningsEntry} detail={detail} detailLoading={detailLoading} confluenceRow={confluenceRow} />}
          {activeTab === 'technical' && <TechnicalTab detail={detail} detailLoading={detailLoading} confluenceRow={confluenceRow} stock={stock} useRowFallback={useRowFallback} screenerRow={screenerRow} />}
          {activeTab === 'fundamentals' && <FundamentalsTab detail={detail} detailLoading={detailLoading} confluenceRow={confluenceRow} stock={stock} screenerRow={screenerRow} />}
          {activeTab === 'news' && <NewsTab detail={detail} detailLoading={detailLoading} ticker={ticker} allNews={allNews} />}
          {activeTab === 'deep-dive' && <DeepDiveTab ticker={ticker} data={deepDive} loading={deepDiveLoading} error={deepDiveError} selectedModels={selectedModels} setSelectedModels={setSelectedModels} reportModel={reportModel} setReportModel={setReportModel} onGenerate={generateDeepDive} />}
          {activeTab === 'earnings' && <EarningsTab detail={detail} detailLoading={detailLoading} currentPrice={currentPrice} ticker={ticker} initialSubTab={initialEarningsTab as any} earningsEntry={earningsEntry} />}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TradingView helpers
   ═══════════════════════════════════════════════════════════════════ */
function tvExchangeFromFmp(raw: string): string {
  const r = (raw || '').toUpperCase().trim();
  if (r === 'NASDAQ') return 'NASDAQ';
  if (r === 'NYSE' || r === 'NYQ' || r === 'NYS') return 'NYSE';
  if (r === 'AMEX' || r === 'NYSEARCA' || r === 'NYSE ARCA' || r === 'BATS') return 'AMEX';
  if (r === 'OTC' || r === 'OTCBB' || r === 'PINK' || r === 'OTCMKTS') return 'OTC';
  if (r === 'ASX') return 'ASX';
  if (r === 'LSE' || r === 'AIM') return 'LSE';
  if (r === 'EURONEXT' || r === 'AMS' || r === 'EPA' || r === 'EBR' || r === 'BIT') return 'EURONEXT';
  if (r === 'TSX' || r === 'TSXV') return 'TSX';
  if (r === 'HKEX' || r === 'HKG') return 'HKEX';
  if (r === 'TSE' || r === 'JPX' || r === 'TYO') return 'TSE';
  return '';
}
function resolveTVSymbol(ticker: string, stock: any, csvRow: any, fmpExchange?: string | null): string {
  const t = ticker.toUpperCase().trim();
  if (t.includes(':')) {
    const colonIdx = t.indexOf(':');
    const prefix = t.slice(0, colonIdx);
    const sym    = t.slice(colonIdx + 1);
    const map: Record<string, string> = { AIM:'LSE', AMS:'EURONEXT', EPA:'EURONEXT', EBR:'EURONEXT', BIT:'EURONEXT', ASX:'ASX', TSX:'TSX', TSXV:'TSX', LSE:'LSE', HKG:'HKEX', TYO:'TSE', KSE:'KRX' };
    return `${map[prefix] ?? prefix}:${sym}`;
  }
  const cryptoBases = ['BTC','ETH','SOL','BNB','ADA','XRP','DOT','AVAX','MATIC','LINK','UNI','DOGE','SHIB','LTC','ATOM','TAO','RENDER','FET','ARB','OP'];
  for (const b of cryptoBases) {
    if (t === b || t === `${b}USD` || t === `${b}USDT`) return `BINANCE:${b}USDT`;
  }
  const fmpEx = tvExchangeFromFmp(fmpExchange || '');
  if (fmpEx) return `${fmpEx}:${t}`;
  const rawEx = (stock?.exchangeShortName || stock?.exchange || csvRow?.exchangeShortName || csvRow?.exchange || csvRow?.Exchange || '').toUpperCase().trim();
  const staticEx = tvExchangeFromFmp(rawEx);
  if (staticEx) return `${staticEx}:${t}`;
  return t;
}

/* ═══════════════════════════════════════════════════════════════════
   Overview Tab
   ═══════════════════════════════════════════════════════════════════ */
function OverviewTab({ stock, ticker, csvRow, earningsEntry, detail, detailLoading, confluenceRow }: {
  stock: any; ticker: string; csvRow?: any; earningsEntry?: any;
  detail?: TickerDetailResponse | null; detailLoading: boolean; confluenceRow?: any;
}) {
  const tvSymbol = resolveTVSymbol(ticker, stock, csvRow, detail?.company?.exchange ?? null);
  const tvUrl = `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=D&range=3M&style=1&toolbar_bg=0d1623&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=exchange&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(tvSymbol)}`;
  const [descExpanded, setDescExpanded] = useState(false);

  const conf = detail?.confluence_v42 ?? detail?.confluence ?? null;
  const isNewFmt = stock?._format === 'new';

  /* Explicit source objects — never merge row fallback into detailCompany */
  const detailCompany = detail?.company ?? null;

  /* About field priority — each field read independently, detailCompany always wins */
  const aboutName =
    detailCompany?.name
    ?? detailCompany?.company_name
    ?? detailCompany?.companyName
    ?? stock?.name
    ?? stock?.company
    ?? confluenceRow?.company
    ?? ticker;

  const aboutTicker = detailCompany?.symbol ?? ticker;

  const aboutExchange =
    detailCompany?.exchange
    ?? stock?.exchange
    ?? confluenceRow?.exchange
    ?? null;

  const aboutSector =
    detailCompany?.sector
    ?? confluenceRow?.sector
    ?? stock?.sector
    ?? null;

  const aboutIndustry =
    detailCompany?.industry
    ?? confluenceRow?.industry
    ?? stock?.industry
    ?? null;

  const aboutMarketCap =
    detailCompany?.market_cap
    ?? confluenceRow?.market_cap
    ?? null;

  /* Description priority chain — never let row fallback overwrite detailCompany */
  const aboutDescription: string | null =
    detailCompany?.description
    ?? detailCompany?.profile?.description
    ?? detail?.company_profile?.description
    ?? detail?.company_profile?.profile?.description
    ?? detail?.overview?.description
    ?? stock?.description
    ?? confluenceRow?.description
    ?? null;

  const ABOUT_LIMIT = 700;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 1. TradingView Chart */}
      <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <iframe key={tvSymbol} src={tvUrl} style={{ width: '100%', height: 500, border: 'none', display: 'block' }} title={`${ticker} chart`} />
      </div>

      {/* 2. About — always rendered, loading state inside */}
      <div>
        <SectionLabel>About</SectionLabel>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
          {detailLoading && !detail ? (
            <LoadingRow label="Loading company profile…" />
          ) : (
            <>
              {/* Name + ticker + exchange */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' as const, marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: C.text, fontFamily: _sdmSans }}>
                  {aboutName}
                </span>
                <span style={{ fontSize: 11, color: C.teal, fontFamily: _sdmFont, fontWeight: 700 }}>{aboutTicker}</span>
                {aboutExchange && (
                  <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: C.dim, fontFamily: _sdmFont, border: `1px solid ${C.border}` }}>
                    {aboutExchange}
                  </span>
                )}
              </div>

              {/* Metadata chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 6, marginBottom: 14 }}>
                <MetricBox label="Sector" value={aboutSector == null ? '—' : String(aboutSector)} raw />
                <MetricBox label="Industry" value={aboutIndustry == null ? '—' : String(aboutIndustry)} raw />
                <MetricBox label="Mkt Cap" value={aboutMarketCap == null ? '—' : fmtLarge(aboutMarketCap)} raw />
                <MetricBox label="Country" value={detailCompany?.country == null ? '—' : String(detailCompany.country)} raw />
                <MetricBox label="Beta" value={detailCompany?.beta == null ? '—' : Number(detailCompany.beta).toFixed(2)} raw />
                <MetricBox label="Employees" value={detailCompany?.employees == null ? '—' : fmtLarge(detailCompany.employees)} raw />
                <MetricBox label="CEO" value={detailCompany?.ceo ?? detailCompany?.ceo_name ?? '—'} raw />
                <MetricBox label="Exchange" value={aboutExchange ?? '—'} raw />
              </div>

              {/* Website */}
              {detailCompany?.website ? (
                <div style={{ marginBottom: 10 }}>
                  <a href={detailCompany.website} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: C.teal, fontFamily: _sdmSans, textDecoration: 'none' }}>
                    {String(detailCompany.website).replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </div>
              ) : <p style={{ fontSize: 11, color: C.dim, fontFamily: _sdmSans, margin: '0 0 10px' }}>Website unavailable</p>}

              {/* Description */}
              {aboutDescription ? (() => {
                const full = String(aboutDescription);
                const isLong = full.length > ABOUT_LIMIT;
                const shown = isLong && !descExpanded ? full.slice(0, ABOUT_LIMIT) + '…' : full;
                return (
                  <div>
                    <p style={{ fontSize: 12, color: C.text, lineHeight: 1.8, fontFamily: _sdmSans, margin: 0 }}>{shown}</p>
                    {isLong && (
                      <button onClick={() => setDescExpanded(v => !v)}
                        style={{ marginTop: 8, background: 'none', border: 'none', color: C.teal, fontSize: 11, cursor: 'pointer', fontFamily: _sdmSans, padding: 0 }}>
                        {descExpanded ? '▲ Show less' : '▼ Show more'}
                      </button>
                    )}
                  </div>
                );
              })() : hasCompanyProfile(detail) ? (
                <p style={{ fontSize: 12, color: C.dim, fontFamily: _sdmSans, margin: 0 }}>Description unavailable.</p>
              ) : (
                <p style={{ fontSize: 12, color: C.dim, fontFamily: _sdmSans, margin: 0 }}>
                  Company profile unavailable for <strong style={{ color: C.dim }}>{ticker}</strong>.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* 4. Confluence Summary — always rendered; component handles its own empty state */}
      <ConfluenceSummarySection detail={detail} confluenceRow={confluenceRow} ticker={ticker} />

      {/* 5. Legacy fallback only when no v42 AND no confluenceRow */}
      {!detailLoading && !conf && !confluenceRow && isNewFmt && stock && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stock.catalyst && (
            <div><SectionLabel>Catalyst</SectionLabel>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: _sdmSans, margin: 0 }}>{stock.catalyst}</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {stock.sentiment   && <InfoCard label="Sentiment"   color={C.blue}>{stock.sentiment}</InfoCard>}
            {stock.action_note && <InfoCard label="Action Note" color={C.amber}>{stock.action_note}</InfoCard>}
          </div>
        </div>
      )}
      {!detailLoading && !conf && !confluenceRow && !isNewFmt && stock && (
        <>
          {stock.thesis && (<div><SectionLabel>Investment Thesis</SectionLabel><p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: _sdmSans, margin: 0 }}>{stock.thesis}</p></div>)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {stock.why_now   && <InfoCard label="Why Now"         color={C.amber}>{stock.why_now}</InfoCard>}
            {stock.sentiment && <InfoCard label="Sentiment"       color={C.blue}>{stock.sentiment}</InfoCard>}
            {stock.moat      && <InfoCard label="Competitive Moat" color={C.purple}>{stock.moat}</InfoCard>}
          </div>
          {stock.catalysts?.length > 0 && (
            <div><SectionLabel>Catalysts</SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {stock.catalysts.map((cat: string, i: number) => (
                  <span key={i} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: _sdmFont, color: C.teal, background: `${C.teal}12`, border: `1px solid ${C.teal}25` }}>{cat}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {!detailLoading && !conf && !confluenceRow && !stock && (
        <div style={{ padding: 16, borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.dim, fontSize: 12, margin: 0, fontFamily: _sdmSans }}>No analysis data available for <strong style={{ color: C.text }}>{ticker}</strong>. Generate an AI Deep Dive for a full report.</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Confluence Analysis Section — full dashboard (rebuilt)
   ═══════════════════════════════════════════════════════════════════ */

/* Construct a minimal v42 object from flat confluenceRow fields.
   Field names use `caelyn_confluence_*` prefix (from alignment endpoint)
   with plain aliases as fallbacks. */
function readV42FromRow(row: any): any {
  if (!row) return null;
  /* Score fields */
  const core   = row.caelyn_confluence_core_score ?? row.core_score ?? row.ccs_score ?? null;
  const bonus  = row.caelyn_confluence_bonus_score ?? row.bonus_score ?? 0;
  const total  = row.caelyn_confluence_total_score ?? row.total_score ?? null;
  const bucket = row.caelyn_confluence_bucket ?? row.bucket ?? row.action_bucket ?? null;
  const confScore = row.caelyn_confluence_confidence_score ?? row.confidence_score ?? null;
  const reasonCodes: string[] = Array.isArray(row.caelyn_confluence_reason_codes)
    ? row.caelyn_confluence_reason_codes
    : (Array.isArray(row.reason_codes) ? row.reason_codes : []);

  /* Component point fields (no caelyn_ prefix — direct flat fields from alignment) */
  const themePts  = row.theme_alignment_points ?? null;
  const stagePts  = row.stage_quality_points ?? null;
  const optPts    = row.options_alignment_points ?? null;
  const techPts   = row.technical_setup_points ?? null;
  const entryPts  = row.entry_exit_points ?? null;
  const catPts2   = row.catalyst_alignment_points ?? null;
  const invPts2   = row.investment_alignment_points ?? null;
  const valPts2   = row.valuation_alignment_points ?? null;

  const hasData = core != null || themePts != null || catPts2 != null
    || valPts2 != null || invPts2 != null || stagePts != null;
  if (!hasData) return null;

  /* Action label from bucket or explicit field */
  const actionLabel = row.action_label ?? (bucket ? bucket.toLowerCase() : null) ?? row.signal ?? null;

  /* Why now / why wait */
  const whyNow  = Array.isArray(row.why_now)  ? row.why_now  : (row.why_now  ? [String(row.why_now)]  : []);
  const whyWait = Array.isArray(row.why_wait) ? row.why_wait : (row.why_wait ? [String(row.why_wait)] : []);

  return {
    score: {
      core: core ?? 0,
      bonus,
      total: total ?? ((core ?? 0) + bonus),
      core_max: 100,
      bonus_max: 25,
    },
    action: {
      label: actionLabel,
      label_display: row.action_label_display ?? actionLabel,
      execution_label: row.execution_label ?? row.timing_label ?? row.actionability_state?.replace(/_/g, ' ') ?? null,
      bucket,
      invalidation_level: row.invalidation_level ?? null,
      why_now:  whyNow,
      why_wait: whyWait,
      target_zone: row.target_1 != null ? {
        target_1: row.target_1,
        target_2: row.target_2 ?? null,
        risk_reward_ratio: row.risk_reward_ratio ?? null,
      } : null,
    },
    components: {
      theme:           themePts  != null ? { points: themePts,  max_points: 15, label: row.theme_label     ?? null } : undefined,
      stage:           stagePts  != null ? { points: stagePts,  max_points: 15, label: row.stage_label     ?? null } : undefined,
      options:         optPts    != null ? { points: optPts,    max_points: 18, status: row.options_status ?? null } : undefined,
      technical_setup: techPts   != null ? { points: techPts,   max_points: 8                                     } : undefined,
      entry_exit:      entryPts  != null ? { points: entryPts,  max_points: 12                                    } : undefined,
      catalyst:        catPts2   != null ? { points: catPts2,   max_points: 12, status: row.catalyst_status ?? null } : undefined,
      investment:      invPts2   != null ? { points: invPts2,   max_points: 12, label: row.investment_label ?? null } : undefined,
      valuation:       valPts2   != null ? { points: valPts2,   max_points: 8,  label: row.valuation_label ?? null, status: row.valuation_coverage_status ?? null } : undefined,
    },
    metadata: {
      confidence_score: confScore,
      data_status_flags: Array.isArray(row.data_status_flags) ? row.data_status_flags : [],
      reason_codes: reasonCodes,
    },
    technical: (row.stage_label != null || row.entry_state != null || row.actionability_state != null) ? {
      stage_label:           row.stage_label ?? null,
      stage_score:           row.stage_score ?? null,
      technical_setup_label: row.setup_label ?? row.technical_setup_label ?? null,
      entry_state:           row.entry_state ?? row.actionability_state ?? null,
      entry_state_display:   row.entry_state_display ?? null,
      entry_score:           row.entry_score ?? null,
      extension_state:       row.extension_state ?? null,
      extension_quality:     row.extension_quality ?? null,
      extension_reset_state: row.extension_reset_state ?? null,
      nearest_fib_label:     row.nearest_fib_label ?? null,
      distance_to_fib_pct:   row.distance_to_fib_pct ?? null,
      fib_wave_status:       row.fib_wave_status ?? null,
      wave_structure:        row.wave_structure ?? null,
      wave_score:            row.wave_score ?? null,
    } : null,
    bonuses: (row.bottleneck_bonus_points != null || row.whale_insider_bonus_points != null || row.social_bonus_points != null) ? {
      bottleneck:    { points: row.bottleneck_bonus_points   ?? null, anchor_count: row.bottleneck_anchor_count ?? 0 },
      whale_insider: { points: row.whale_insider_bonus_points ?? null },
      social:        { points: row.social_bonus_points ?? null, sections_hit: row.social_sections_hit ?? 0 },
    } : null,
    risk: {
      risk_flags:    Array.isArray(row.risk_flags)    ? row.risk_flags    : [],
      caution_flags: Array.isArray(row.caution_flags) ? row.caution_flags : [],
    },
  };
}

/* Component card definition */
interface CCompDef { key: string; label: string; max: number; crKey: string }
const CONF_COMP_DEFS: CCompDef[] = [
  { key: 'theme',          label: 'Theme',          max: 15, crKey: 'theme_alignment_points'     },
  { key: 'stage',          label: 'Stage',          max: 15, crKey: 'stage_quality_points'       },
  { key: 'options',        label: 'Options',        max: 18, crKey: 'options_alignment_points'   },
  { key: 'technical_setup',label: 'Technical Setup',max:  8, crKey: 'technical_setup_points'     },
  { key: 'entry_exit',     label: 'Entry / Exit',   max: 12, crKey: 'entry_exit_points'          },
  { key: 'catalyst',       label: 'Catalyst',       max: 12, crKey: 'catalyst_alignment_points'  },
  { key: 'investment',     label: 'Investment',     max: 12, crKey: 'investment_alignment_points' },
  { key: 'valuation',      label: 'Valuation',      max:  8, crKey: 'valuation_alignment_points' },
];

function CCompCard({ def, comps, cr }: { def: CCompDef; comps: any; cr: any }) {
  const c = comps[def.key];
  const pts: number | null = c?.points ?? cr[def.crKey] ?? null;
  const max = c?.max_points ?? def.max;
  const subLabel: string | null = c?.label ?? c?.quality_label ?? (c?.pillar_count != null ? `${c.pillar_count}/3 pillars` : null);
  const pct = pts != null && max > 0 ? (pts / max) * 100 : 0;
  const color = pts != null ? ptsColor(pts, max) : C.dim;
  return (
    <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px', minHeight: 68 }}>
      <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: C.dim, fontFamily: _sdmFont, marginBottom: 6 }}>{def.label}</div>
      {pts != null ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: _sdmFont, whiteSpace: 'nowrap' as const }}>{Number.isInteger(pts) ? pts : pts.toFixed(1)}/{max}</span>
          </div>
          {subLabel && <div style={{ fontSize: 8, color: C.dim, fontFamily: _sdmSans }}>{safeStr(subLabel)}</div>}
        </>
      ) : (
        <div style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>—</div>
      )}
    </div>
  );
}

function CConfSubHdr({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: C.teal, fontFamily: _sdmFont, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

function ConfluenceSummarySection({ detail, confluenceRow, ticker }: { detail: any; confluenceRow?: any; ticker: string }) {
  const [showDebug, setShowDebug] = useState(false);

  const v42 =
    detail?.confluence_v42
    ?? detail?.confluence
    ?? confluenceRow?.confluence_v42
    ?? readV42FromRow(confluenceRow)
    ?? null;

  if (!v42) {
    return (
      <div>
        <SectionLabel>Confluence Analysis</SectionLabel>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
          <p style={{ fontSize: 12, color: C.dim, fontFamily: _sdmSans, margin: 0 }}>
            Confluence data unavailable for <strong style={{ color: C.text }}>{ticker}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const sc    = v42.score;
  const act   = v42.action;
  const comps = v42.components ?? {};
  const bon   = v42.bonuses;
  const risk  = v42.risk;
  const meta  = v42.metadata;
  const tech  = v42.technical;
  const cr    = confluenceRow ?? {};
  const fund  = detail?.fundamentals ?? {};
  const dc    = detail?.direct_catalyst ?? null;

  const decisionCfg = act?.label
    ? (DECISION_BADGE_MAP[act.label?.toUpperCase()] ?? { label: act.label_display ?? act.label, clr: actionBadgeColor(act.label) })
    : null;

  /* ── Catalyst fields ── */
  const catComp  = comps.catalyst;
  const catPts: number | null = catComp?.points ?? cr.catalyst_alignment_points ?? null;
  const catMax   = catComp?.max_points ?? 12;
  const isBearishCat = catComp?.status === 'bearish_conflict'
    || (catComp?.reason_codes ?? []).includes('BEARISH_CATALYST_CONFLICT');
  const eventType     = dc?.catalyst_event_type ?? dc?.event_type ?? cr.catalyst_event_type ?? null;
  const eventTier     = dc?.catalyst_event_tier ?? dc?.event_tier ?? dc?.tier ?? cr.catalyst_event_tier ?? null;
  const catalystExpl  = dc?.catalyst_explanation ?? cr.catalyst_explanation ?? null;
  const directPresent = !!dc || cr.direct_catalyst_present === true;
  const catReasonCodes: string[] = dc?.catalyst_reason_codes ?? cr.catalyst_reason_codes ?? [];

  /* ── Valuation fields ── */
  const valComp  = comps.valuation;
  const valPts: number | null = valComp?.points ?? cr.valuation_alignment_points ?? null;
  const valMax   = valComp?.max_points ?? 8;
  const valLabel = valComp?.label ?? valComp?.quality_label ?? cr.valuation_label ?? null;
  const valCoverage = valComp?.status ?? cr.valuation_coverage_status ?? null;
  const peRatio  = fund.pe_ratio ?? cr.pe_ratio ?? null;
  const psRatio  = fund.ps_ratio ?? cr.ps_ratio ?? null;
  const fwdPe    = fund.forward_pe ?? cr.forward_pe ?? null;
  const fwdPeSrc = fund.forward_pe_source ?? cr.forward_pe_source ?? null;
  const fwdPeApprox: boolean = fund.forward_pe_is_approximate ?? false;
  const fwdPeWarnCodes: string[] = fund.forward_pe_warning_codes ?? [];
  const valPeScore  = fund.valuation_pe_score ?? cr.valuation_pe_score ?? null;
  const valPsScore  = fund.valuation_ps_score ?? cr.valuation_ps_score ?? null;
  const valFwdScore = fund.valuation_forward_pe_score ?? cr.valuation_forward_pe_score ?? null;
  const valExpl     = fund.valuation_explanation ?? cr.valuation_explanation ?? null;
  const valMissing: string[] = valComp?.missing_fields ?? cr.valuation_missing_fields ?? [];

  /* ── Investment fields ── */
  const invComp  = comps.investment;
  const invPts: number | null = invComp?.points ?? cr.investment_alignment_points ?? null;
  const invMax   = invComp?.max_points ?? 12;
  const invLabel = invComp?.label ?? invComp?.quality_label ?? cr.investment_label ?? null;
  const finHealthScore = invComp?.financial_health_score ?? fund.financial_health_score ?? cr.financial_health_score ?? null;
  const finHealthLabel = invComp?.financial_health_label ?? fund.financial_health_label ?? cr.financial_health_label ?? null;
  const curGrowthScore = invComp?.current_growth_score ?? fund.current_growth_score ?? cr.current_growth_score ?? null;
  const curGrowthLabel = invComp?.current_growth_label ?? fund.current_growth_label ?? cr.current_growth_label ?? null;
  const fwdGrowthScore = invComp?.forward_growth_score ?? fund.forward_growth_score ?? cr.forward_growth_score ?? null;
  const fwdGrowthLabel = invComp?.forward_growth_label ?? fund.forward_growth_label ?? cr.forward_growth_label ?? null;
  const invExpl  = invComp?.explanation ?? cr.investment_explanation ?? null;

  /* ── Options ── */
  const optStatus = comps.options?.status ?? cr.options_status ?? null;

  return (
    <div>
      <SectionLabel>Confluence Analysis</SectionLabel>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ═ A: Header Summary Strip ═ */}
        {sc && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '12px 16px' }}>
            {/* Top row: score + decision + timing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: ccsColor(sc.core), fontFamily: _sdmFont, lineHeight: 1 }}>
                  {Number(sc.core).toFixed(1)}
                </span>
                <span style={{ fontSize: 10, color: C.dim, fontFamily: _sdmFont }}>/100</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.purple, fontFamily: _sdmFont }}>+{Number(sc.bonus).toFixed(1)}</span>
                <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>bonus /25</span>
              </div>
              {decisionCfg && (
                <span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 9, fontWeight: 800, fontFamily: _sdmFont, color: '#000', background: decisionCfg.clr, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
                  {decisionCfg.label}
                </span>
              )}
              {act?.execution_label && (
                <span style={{ padding: '3px 8px', borderRadius: 3, fontSize: 9, fontWeight: 600, fontFamily: _sdmFont, color: C.amber, background: `${C.amber}15`, border: `1px solid ${C.amber}30` }}>
                  {act.execution_label}
                </span>
              )}
              {meta?.confidence_score > 0 && (
                <span style={{ fontSize: 9, color: meta.confidence_score >= 80 ? C.green : meta.confidence_score >= 50 ? C.amber : C.red, fontFamily: _sdmFont, fontWeight: 600 }}>
                  {Number(meta.confidence_score).toFixed(0)}% confidence
                </span>
              )}
            </div>
            {/* Detail row: bucket, invalidation, targets, total */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' as const, marginBottom: (risk?.risk_flags?.length > 0 || risk?.caution_flags?.length > 0) ? 8 : 0 }}>
              {act?.bucket && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>
                  Bucket: <span style={{ color: C.text }}>{act.bucket.replace(/_/g, ' ')}</span>
                </span>
              )}
              {act?.invalidation_level != null && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>
                  Inv: <span style={{ color: C.red }}>${Number(act.invalidation_level).toFixed(2)}</span>
                </span>
              )}
              {act?.target_zone?.target_1 != null && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>
                  T1: <span style={{ color: C.green }}>${Number(act.target_zone.target_1).toFixed(2)}</span>
                </span>
              )}
              {act?.target_zone?.target_2 != null && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>
                  T2: <span style={{ color: C.teal }}>${Number(act.target_zone.target_2).toFixed(2)}</span>
                </span>
              )}
              {act?.target_zone?.risk_reward_ratio != null && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>
                  R/R: <span style={{ color: C.text }}>{Number(act.target_zone.risk_reward_ratio).toFixed(1)}x</span>
                </span>
              )}
              <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>
                Total: <span style={{ color: C.text }}>{sc.total != null ? Number(sc.total).toFixed(1) : (Number(sc.core) + Number(sc.bonus)).toFixed(1)}</span>
              </span>
            </div>
            {/* Risk / Caution flags */}
            {(risk?.risk_flags?.length > 0 || risk?.caution_flags?.length > 0) && (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                {(risk?.risk_flags ?? []).map((f: string, i: number) => (
                  <span key={`rf${i}`} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: C.red, fontFamily: _sdmFont, fontWeight: 700 }}>⚠ {f.replace(/_/g, ' ')}</span>
                ))}
                {(risk?.caution_flags ?? []).map((f: string, i: number) => (
                  <span key={`cf${i}`} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.14)', color: C.amber, fontFamily: _sdmFont, fontWeight: 700 }}>⚡ {f.replace(/_/g, ' ')}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═ B: Why Now / Why Wait ═ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: `${C.green}08`, border: `1px solid ${C.green}25`, borderRadius: 5, padding: '10px 12px' }}>
            <div style={{ fontSize: 7, fontWeight: 800, color: C.green, fontFamily: _sdmFont, textTransform: 'uppercase' as const, letterSpacing: '0.10em', marginBottom: 6 }}>✓ Why Now</div>
            {(act?.why_now ?? []).length > 0
              ? (act?.why_now ?? []).map((b: string, i: number) => (
                  <div key={i} style={{ fontSize: 10, color: C.text, fontFamily: _sdmSans, paddingLeft: 4, paddingBottom: 3, lineHeight: 1.5 }}>· {b}</div>
                ))
              : <div style={{ fontSize: 9, color: C.dim, fontFamily: _sdmSans }}>No active why-now drivers.</div>
            }
          </div>
          <div style={{ background: `${C.amber}08`, border: `1px solid ${C.amber}25`, borderRadius: 5, padding: '10px 12px' }}>
            <div style={{ fontSize: 7, fontWeight: 800, color: C.amber, fontFamily: _sdmFont, textTransform: 'uppercase' as const, letterSpacing: '0.10em', marginBottom: 6 }}>⏳ Why Wait</div>
            {(act?.why_wait ?? []).length > 0
              ? (act?.why_wait ?? []).map((b: string, i: number) => (
                  <div key={i} style={{ fontSize: 10, color: C.dim, fontFamily: _sdmSans, paddingLeft: 4, paddingBottom: 3, lineHeight: 1.5 }}>· {b}</div>
                ))
              : <div style={{ fontSize: 9, color: C.dim, fontFamily: _sdmSans }}>No wait reasons.</div>
            }
          </div>
        </div>

        {/* ═ C: 8-Component Grid ═ */}
        <div>
          <CConfSubHdr>Core Components</CConfSubHdr>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {CONF_COMP_DEFS.map(def => <CCompCard key={def.key} def={def} comps={comps} cr={cr} />)}
          </div>
        </div>

        {/* ═ Deep Dives — 2-col grid ═ */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* D: Valuation Deep Dive */}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
            <CConfSubHdr>Valuation Deep Dive</CConfSubHdr>
            {valPts != null && <V42PR k="Valuation Score" pts={valPts} max={valMax} />}
            {valLabel    && <V42DR k="Label"    v={valLabel} clr={C.teal} />}
            {valCoverage && <V42DR k="Coverage" v={valCoverage.replace(/_/g, ' ')} clr={valCoverage === 'partial' ? C.amber : valCoverage === 'full' ? C.green : C.dim} />}
            <V42DR k="P/E" v={peRatio != null ? `${Number(peRatio).toFixed(1)}x` : null} />
            <V42DR k="P/S" v={psRatio != null ? `${Number(psRatio).toFixed(1)}x` : null} />
            <div style={V42_RR}>
              <span style={V42_KK}>Forward P/E</span>
              {fwdPe != null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={V42_VV}>{Number(fwdPe).toFixed(1)}x</span>
                  {fwdPeApprox && <span style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.amber}20`, color: C.amber, fontFamily: _sdmFont, fontWeight: 700 }}>APPROX.</span>}
                  {fwdPeWarnCodes.map((wc: string, i: number) => (
                    <span key={i} style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.amber}15`, color: C.amber, fontFamily: _sdmFont }}>{wc.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              ) : <span style={{ ...V42_VV, color: C.dim }}>—</span>}
            </div>
            {fwdPeSrc    && <V42DR k="F.P/E Source" v={fwdPeSrc} />}
            {valPeScore  != null && <V42DR k="P/E Score"   v={`${Number(valPeScore).toFixed(1)}`} />}
            {valPsScore  != null && <V42DR k="P/S Score"   v={`${Number(valPsScore).toFixed(1)}`} />}
            {valFwdScore != null && <V42DR k="F.P/E Score" v={`${Number(valFwdScore).toFixed(1)}`} />}
            {valExpl && <div style={{ marginTop: 6, fontSize: 9, color: C.dim, fontFamily: _sdmSans, lineHeight: 1.5 }}>{safeStr(valExpl)}</div>}
            {valMissing.length > 0 && <div style={{ marginTop: 4, fontSize: 8, color: C.dim, fontFamily: _sdmFont }}>Missing: {valMissing.join(', ')}</div>}
            {valCoverage === 'partial'     && <div style={{ fontSize: 8, color: C.dim, fontFamily: _sdmFont, marginTop: 3 }}>Partial valuation coverage.</div>}
            {valCoverage === 'unavailable' && <div style={{ fontSize: 8, color: C.dim, fontFamily: _sdmFont, marginTop: 3 }}>Valuation unavailable.</div>}
          </div>

          {/* E: Catalyst Deep Dive */}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
            <CConfSubHdr>Catalyst Deep Dive</CConfSubHdr>
            {catPts != null && <V42PR k="Catalyst Score" pts={catPts} max={catMax} />}
            {isBearishCat && <div style={{ fontSize: 8, color: C.amber, fontFamily: _sdmFont, marginBottom: 4 }}>Bearish conflict — points suppressed.</div>}
            {directPresent ? (
              <>
                <V42DR k="Type" v={eventType} />
                <V42DR k="Tier" v={eventTier} clr={tierColor(eventTier)} />
                {(dc?.catalyst_materiality_score ?? cr.catalyst_materiality_score) != null && (
                  <V42DR k="Materiality" v={`${Number(dc?.catalyst_materiality_score ?? cr.catalyst_materiality_score).toFixed(1)}`} />
                )}
                {(dc?.catalyst_freshness_score ?? cr.catalyst_freshness_score) != null && (
                  <V42DR k="Freshness" v={`${Number(dc?.catalyst_freshness_score ?? cr.catalyst_freshness_score).toFixed(1)}`} />
                )}
                {(dc?.catalyst_relevance_score ?? cr.catalyst_relevance_score) != null && (
                  <V42DR k="Relevance" v={`${Number(dc?.catalyst_relevance_score ?? cr.catalyst_relevance_score).toFixed(1)}`} />
                )}
                {catReasonCodes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginTop: 4 }}>
                    {catReasonCodes.slice(0, 6).map((rc: string, i: number) => (
                      <span key={i} style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.teal}15`, color: C.teal, fontFamily: _sdmFont }}>{rc.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                )}
                {catalystExpl && (
                  <div style={{ marginTop: 6, padding: '7px 10px', background: `${tierColor(eventTier)}0a`, border: `1px solid ${tierColor(eventTier)}25`, borderRadius: 4 }}>
                    <div style={{ fontSize: 7, fontWeight: 800, color: tierColor(eventTier), fontFamily: _sdmFont, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 3 }}>
                      {eventTier ? `Catalyst — ${safeStr(eventTier).replace('_', ' ')}` : 'Catalyst Explanation'}
                    </div>
                    <p style={{ fontSize: 10, color: C.text, fontFamily: _sdmSans, lineHeight: 1.6, margin: 0 }}>{safeStr(catalystExpl)}</p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont, marginTop: 4 }}>No direct catalyst detected.</div>
            )}
          </div>

          {/* F: Investment Deep Dive */}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
            <CConfSubHdr>Investment Deep Dive</CConfSubHdr>
            {invPts != null && <V42PR k="Investment Score" pts={invPts} max={invMax} />}
            {invLabel && <V42DR k="Label" v={invLabel} clr={C.teal} />}
            {finHealthScore != null && (
              <V42DR k="Financial Health" v={finHealthLabel ? `${Number(finHealthScore).toFixed(1)} — ${finHealthLabel}` : `${Number(finHealthScore).toFixed(1)}`} />
            )}
            {curGrowthScore != null && (
              <V42DR k="Current Growth" v={curGrowthLabel ? `${Number(curGrowthScore).toFixed(1)} — ${curGrowthLabel}` : `${Number(curGrowthScore).toFixed(1)}`} />
            )}
            {fwdGrowthScore != null && (
              <V42DR k="Forward Growth" v={fwdGrowthLabel ? `${Number(fwdGrowthScore).toFixed(1)} — ${fwdGrowthLabel}` : `${Number(fwdGrowthScore).toFixed(1)}`} />
            )}
            {invExpl && <div style={{ marginTop: 6, fontSize: 9, color: C.dim, fontFamily: _sdmSans, lineHeight: 1.5 }}>{safeStr(invExpl)}</div>}
            {invPts == null && !invLabel && finHealthScore == null && (
              <div style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>Investment data not available.</div>
            )}
          </div>

          {/* G: Technical / Entry Detail */}
          {tech ? (
            <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
              <CConfSubHdr>Technical / Entry Detail</CConfSubHdr>
              <V42DR k="Stage"       v={tech.stage_label?.replace(/_/g, ' ')} clr={C.teal} />
              <V42DR k="Stage Score" v={tech.stage_score != null ? `${Math.round(tech.stage_score)}` : null} />
              <V42DR k="Setup"       v={tech.technical_setup_label} clr={C.teal} />
              <V42DR k="Entry State" v={(tech.entry_state_display ?? tech.entry_state)?.replace(/_/g, ' ')} />
              <V42DR k="Entry Score" v={tech.entry_score != null ? `${Math.round(tech.entry_score)}` : null} />
              <V42DR k="Extension"   v={tech.extension_state?.replace(/_/g, ' ')}
                 clr={tech.extension_state?.includes('EXTREME') || tech.extension_state?.includes('CHASE') ? C.red : tech.extension_state?.includes('MODERATE') ? C.amber : C.dim} />
              {tech.extension_quality    && <V42DR k="Ext Quality" v={tech.extension_quality.replace(/_/g, ' ')} />}
              {tech.extension_reset_state && <V42DR k="Ext Reset"  v={tech.extension_reset_state.replace(/_/g, ' ')} />}
              <V42DR k="Nearest Fib"  v={tech.nearest_fib_label} />
              <V42DR k="Dist Fib"     v={tech.distance_to_fib_pct != null ? `${Number(tech.distance_to_fib_pct).toFixed(1)}%` : null} />
              {tech.fib_wave_status && (
                <V42DR k="Fib/Wave"
                   v={tech.fib_wave_status === 'pending_10y_backfill' ? 'Pending 10Y backfill' : tech.fib_wave_status.replace(/_/g, ' ')}
                   clr={tech.fib_wave_status === 'pending_10y_backfill' ? C.amber : C.dim} />
              )}
              <V42DR k="Wave Structure" v={tech.wave_structure?.replace(/_/g, ' ')} />
              <V42DR k="Wave Score"     v={tech.wave_score != null ? `${Math.round(tech.wave_score)}` : null} />
            </div>
          ) : (
            /* Placeholder card if no tech data — keeps grid symmetrical */
            <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
              <CConfSubHdr>Technical / Entry Detail</CConfSubHdr>
              <div style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>Technical detail not available.</div>
            </div>
          )}
        </div>

        {/* ═ H: Bonuses + Coverage ═ */}
        <div style={{ display: 'grid', gridTemplateColumns: bon ? '1fr 1fr' : '1fr', gap: 10 }}>
          {/* Bonuses */}
          {bon && (
            <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
              <CConfSubHdr>Bonuses</CConfSubHdr>
              <V42PR k="Social"          pts={bon.social?.points ?? null}          max={15} clr={C.purple} />
              {bon.social?.sections_hit > 0 && <V42DR k="Social sections" v={`${bon.social.sections_hit} hit`} />}
              <V42PR k="Whale / Insider" pts={bon.whale_insider?.points ?? null}   max={5}  clr={C.teal} />
              <V42PR k="Bottleneck"      pts={bon.bottleneck?.points ?? null}      max={5}  clr={C.orange} />
              {bon.bottleneck?.anchor_count > 0 && <V42DR k="Bottleneck anchors" v={`${bon.bottleneck.anchor_count}`} />}
            </div>
          )}

          {/* Coverage / Gaps */}
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
            <CConfSubHdr>Coverage / Gaps</CConfSubHdr>
            {optStatus   && <V42DR k="Options coverage"   v={optStatus.replace(/_/g, ' ')} />}
            {catPts != null && <V42DR k="Catalyst coverage" v={catPts > 0 ? 'Present' : 'Not detected'} clr={catPts > 0 ? C.green : C.dim} />}
            {valCoverage && <V42DR k="Valuation coverage" v={valCoverage.replace(/_/g, ' ')} clr={valCoverage === 'full' ? C.green : valCoverage === 'partial' ? C.amber : C.dim} />}
            {bon?.whale_insider?.points != null && (
              <V42DR k="Whale / Insider" v={bon.whale_insider.points > 0 ? 'Present' : 'None detected'} clr={bon.whale_insider.points > 0 ? C.teal : C.dim} />
            )}
            {meta?.data_status_flags?.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 7, color: C.dim, fontFamily: _sdmFont, marginBottom: 3 }}>Data Flags:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
                  {meta.data_status_flags.map((f: string, i: number) => (
                    <span key={i} style={{ fontSize: 7, padding: '1px 4px', borderRadius: 2, background: 'rgba(255,255,255,0.05)', color: C.dim, fontFamily: _sdmFont }}>{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 8, fontSize: 8, color: 'rgba(100,116,139,0.5)', fontFamily: _sdmFont, fontStyle: 'italic' as const }}>
              Coverage gaps are not bearish signals.
            </div>
          </div>
        </div>

        {/* ═ I: Debug (collapsed by default) ═ */}
        <div style={{ paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => setShowDebug(v => !v)}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, color: C.dim, fontSize: 7, padding: '3px 8px', cursor: 'pointer', fontFamily: _sdmFont, letterSpacing: '0.05em' }}>
            {showDebug ? '▲ HIDE DEBUG' : '▼ DEBUG'}
          </button>
          {showDebug && (
            <div style={{ marginTop: 8 }}>
              {meta?.reason_codes?.length > 0 && (
                <div>
                  <span style={{ ...V42_KK, display: 'block', marginBottom: 3 }}>Reason Codes ({meta.reason_codes.length}):</span>
                  {meta.reason_codes.slice(0, 30).map((rc: string, i: number) => (
                    <div key={i} style={{ fontSize: 7, color: C.dim, fontFamily: _sdmFont, paddingLeft: 8 }}>· {rc}</div>
                  ))}
                </div>
              )}
              {v42 && (
                <pre style={{ fontSize: 7, color: C.dim, fontFamily: _sdmFont, marginTop: 8, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const, maxHeight: 160, overflow: 'auto', background: 'rgba(0,0,0,0.3)', padding: 8, borderRadius: 4 }}>
                  {JSON.stringify({ score: sc, action_label: act?.label, component_keys: Object.keys(comps) }, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Technical Tab — specific field mapping
   ═══════════════════════════════════════════════════════════════════ */
/* ─── Technical grouped definitions ─────────────────────────────── */
type TechFmt = 'pct' | 'large' | 'price' | 'raw' | 'mult';
interface TechFieldDef { label: string; keys: string[]; fmt?: TechFmt }
const TECH_GROUPS: { label: string; fields: TechFieldDef[] }[] = [
  { label: 'Price / Volume', fields: [
    { label: 'Price',          keys: ['price', 'last_price', 'current_price', 'close'],                                              fmt: 'price' },
    { label: 'Chg %',          keys: ['change_pct', 'change_pct_1d', 'chg_pct', 'change_percent', 'changesPercentage'],              fmt: 'pct'   },
    { label: 'Volume',         keys: ['volume', 'vol'],                                                                               fmt: 'large' },
    { label: 'Rel. Volume',    keys: ['volx', 'rel_vol', 'relative_volume', 'volume_ratio'],                                          fmt: 'mult'  },
    { label: 'Vol Rank',       keys: ['vol_rank', 'rel_vol_rank', 'volume_rank', 'vol_rank_pct', 'rv_rank'],                          fmt: 'pct'   },
    { label: 'Vol/MC',         keys: ['vol_mc_pct', 'vol_mc_ratio', 'vol_mc', 'vol_to_market_cap', 'volume_market_cap_ratio'],        fmt: 'raw'   },
  ]},
  { label: 'Stage / Trend', fields: [
    { label: 'Stage',          keys: ['stage', 'stage_label', 'technical_stage'],                                                     fmt: 'raw'   },
    { label: 'Technical State',keys: ['technical_state', 'technical_state_label', 'tech_state'],                                      fmt: 'raw'   },
    { label: 'Momentum Trend', keys: ['momentum_trend', 'momentum'],                                                                  fmt: 'raw'   },
    { label: 'MA Stack',       keys: ['ma_stack', 'ma_alignment', 'ema_alignment'],                                                   fmt: 'raw'   },
  ]},
  { label: 'Moving Average / Extension', fields: [
    { label: '% vs 50D',       keys: ['pct_vs_50d', 'percent_vs_50d', 'price_vs_50d_pct', 'vs_50d'],                                fmt: 'pct'   },
    { label: '% vs 200D',      keys: ['pct_vs_200d', 'percent_vs_200d', 'price_vs_200d_pct', 'vs_200d'],                            fmt: 'pct'   },
    { label: 'Extension Risk', keys: ['extension_risk', 'extension_state', 'chase_extension'],                                        fmt: 'raw'   },
  ]},
  { label: '52-Week Position', fields: [
    { label: '52W Pos',        keys: ['pos_52w', 'position_52w', 'pos_52wk'],                                                         fmt: 'pct'   },
    { label: '% From 52W High',keys: ['pct_from_52w_high', 'dist_52w_high', 'from_52w_high'],                                         fmt: 'pct'   },
  ]},
  { label: 'Entry / Breakout', fields: [
    { label: 'Entry Zone',     keys: ['entry_zone', 'entry_state', 'entry_state_display'],                                            fmt: 'raw'   },
    { label: 'Breakout Signal',keys: ['breakout_signal', 'breakout'],                                                                 fmt: 'raw'   },
    { label: 'Accum/Dist',     keys: ['accum_dist', 'accumulation_distribution', 'ad_state'],                                         fmt: 'raw'   },
    { label: 'Squeeze',        keys: ['squeeze', 'squeeze_state', 'squeeze_signal'],                                                  fmt: 'raw'   },
    { label: 'ATR %',          keys: ['atr_pct', 'atr_percent', 'atr'],                                                               fmt: 'pct'   },
  ]},
  { label: 'Options Overlay', fields: [
    { label: 'Opt Score',      keys: ['options_score', 'opt_score', 'options_alignment_points'],                                      fmt: 'raw'   },
    { label: 'Opt Signal',     keys: ['options_signal', 'opt_signal', 'options_snapshot_signal'],                                     fmt: 'raw'   },
    { label: 'P/C Ratio',      keys: ['options_put_call_ratio', 'put_call_ratio', 'pc_ratio', 'p_c_ratio'],                           fmt: 'raw'   },
    { label: 'IV',             keys: ['options_iv', 'iv', 'implied_volatility', 'atm_iv'],                                            fmt: 'pct'   },
    { label: 'Exp. Move',      keys: ['options_expected_move', 'em', 'expected_move', 'expected_move_pct'],                           fmt: 'pct'   },
    { label: 'Opt Volume',     keys: ['options_volume', 'opt_vol', 'options_vol'],                                                    fmt: 'large' },
    { label: 'Open Interest',  keys: ['options_open_interest', 'open_interest', 'oi', 'options_oi'],                                  fmt: 'large' },
  ]},
];

function TechnicalTab({ detail, detailLoading, confluenceRow, stock, useRowFallback, screenerRow }: {
  detail?: any; detailLoading: boolean; confluenceRow?: any; stock: any; useRowFallback: boolean; screenerRow?: any;
}) {
  if (detailLoading && !detail) return <LoadingRow label="Loading technical data…" />;

  const tech  = detail?.technical ?? {};
  const crRow = confluenceRow ?? {};
  /* Primary row fallback — screenerRow has all the watchlist screener fields */
  const sRow: any = screenerRow ?? stock ?? {};
  /* Derive stage label from nested objects if backend returns them nested */
  const derivedSRow: Record<string, any> = {
    ...sRow,
    stage:              sRow.stage ?? sRow.stage_analysis?.label ?? sRow.stage2_breakout?.label ?? null,
    vol_mc_pct:         sRow.vol_mc_pct  ?? sRow.vol_mc_ratio   ?? null,
    options_put_call_ratio: sRow.options_put_call_ratio ?? sRow.put_call_ratio ?? null,
    options_open_interest:  sRow.options_open_interest  ?? sRow.open_interest  ?? null,
  };

  function resolveField(keys: string[]): any {
    for (const k of keys) {
      const v = tech[k];
      if (v !== null && v !== undefined && v !== '') return v;
    }
    /* Screener row is primary fallback — it has all the watchlist technical fields */
    for (const k of keys) {
      const v = derivedSRow[k];
      if (v !== null && v !== undefined && v !== '') return v;
    }
    for (const k of keys) {
      const v = crRow[k];
      if (v !== null && v !== undefined && v !== '') return v;
    }
    return undefined;
  }

  function formatVal(val: any, fmt?: string): string {
    if (val === null || val === undefined || val === '') return '—';
    switch (fmt) {
      case 'pct':   return fmtPct(val);
      case 'large': return fmtLarge(val);
      case 'mult':  return fmtMult(val);
      case 'price': { const n = Number(val); return isFinite(n) ? `$${n.toFixed(2)}` : safeStr(val); }
      default:      return typeof val === 'number' ? (isFinite(val) ? val.toFixed(2) : '—') : safeStr(val);
    }
  }

  const themeVal = safeStr(tech.theme ?? derivedSRow.canonical_theme_name ?? derivedSRow.theme ?? crRow.theme ?? null);
  const hasAny = TECH_GROUPS.some(g => g.fields.some(f => resolveField(f.keys) !== undefined));

  if (!hasAny) {
    return <div style={{ color: C.dim, fontSize: 12, fontFamily: _sdmSans }}>Technical data unavailable for this ticker.</div>;
  }

  function getTechColor(label: string, rawVal: any): string {
    if (rawVal === undefined || rawVal === null || rawVal === '') return C.text;
    const s = String(rawVal).toLowerCase();
    const n = Number(rawVal);
    switch (label) {
      case 'MA Stack':
        return s === 'bull' ? C.green : s === 'bear' ? C.red : s ? C.amber : C.dim;
      case '% vs 50D':
      case '% vs 200D':
      case 'Chg %':
        return Number.isFinite(n) ? (n > 0 ? C.green : n < 0 ? C.red : C.dim) : C.text;
      case 'Extension Risk':
        return s === 'overheated' ? C.orange : s === 'extended' ? C.amber : (s === 'normal' || s === 'pullback_buy_zone') ? C.green : C.dim;
      case '% From 52W High':
        return Number.isFinite(n) ? (n >= 0 ? C.green : n > -5 ? C.amber : C.dim) : C.dim;
      case 'Entry Zone':
        return s === 'optimal' ? C.green : s === 'breakout_watch' ? C.amber : s === 'extended' ? C.orange : C.dim;
      case 'Breakout Signal':
        return s === 'triggered' ? C.green : s === 'near_trigger' ? C.amber : s === 'failed' ? C.red : C.dim;
      case 'Accum/Dist':
        return s === 'bullish' ? C.green : s === 'bearish' ? C.red : C.dim;
      case 'Squeeze':
        return s === 'expansion' ? C.green : s === 'compression' ? C.red : s === 'squeeze' ? C.amber : C.dim;
      case 'Momentum Trend':
        return s === 'positive' ? C.green : s === 'negative' ? C.red : C.dim;
      case 'Technical State':
        return s === 'overheated' ? C.orange : s === 'extended' ? C.amber : s === 'normal' ? C.green : s === 'weak' ? C.red : C.dim;
      default:
        return C.text;
    }
  }

  const fRow = (label: string, value: string, color?: string) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: C.card, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 11, color: color ?? C.text, fontWeight: 600, fontFamily: _sdmFont }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
        {detail?.company?.name && <span style={{ fontSize: 12, color: C.teal, fontFamily: _sdmFont, fontWeight: 700 }}>{safeStr(detail.company.name)}</span>}
        {themeVal && themeVal !== '—' && (
          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, background: `${C.purple}15`, color: C.purple, fontFamily: _sdmFont, border: `1px solid ${C.purple}30` }}>
            {themeVal}
          </span>
        )}
        {detail?.coverage?.technical_source && (
          <span style={{ fontSize: 8, color: C.dim, fontFamily: _sdmFont, marginLeft: 'auto' }}>Source: {safeStr(detail.coverage.technical_source)}</span>
        )}
      </div>

      {TECH_GROUPS.map(group => {
        const visibleRows = group.fields
          .map(f => { const raw = resolveField(f.keys); return { label: f.label, raw, value: formatVal(raw, f.fmt) }; })
          .filter(r => r.value !== '—');
        if (visibleRows.length === 0) return null;
        return (
          <div key={group.label}>
            <SectionLabel>{group.label}</SectionLabel>
            <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              {visibleRows.map(r => fRow(r.label, r.value, getTechColor(r.label, r.raw)))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Fundamentals Tab — grouped sections
   ═══════════════════════════════════════════════════════════════════ */
type FundField = { label: string; key: string; fmt: 'pct' | 'mult' | 'raw' | 'date' | 'large' };
const FUND_GROUPS: { label: string; fields: FundField[] }[] = [
  { label: 'Company / Scale', fields: [
    { label: 'Market Cap',      key: 'market_cap',                 fmt: 'large' },
    { label: 'Theme',           key: 'canonical_theme_name',       fmt: 'raw'   },
  ]},
  { label: 'Revenue & Growth', fields: [
    { label: 'Revenue',         key: 'revenue',                    fmt: 'large' },
    { label: 'Rev Growth Q',    key: 'revenue_growth_q',           fmt: 'pct'   },
    { label: 'Rev Growth Y',    key: 'revenue_growth',             fmt: 'pct'   },
    { label: 'Rev Growth Est',  key: 'revenue_growth_est',         fmt: 'pct'   },
    { label: 'Rev Growth NQ',   key: 'rev_growth_next_quarter',    fmt: 'pct'   },
    { label: 'Rev Growth NY',   key: 'rev_growth_next_year',       fmt: 'pct'   },
  ]},
  { label: 'EPS & Earnings', fields: [
    { label: 'EPS Growth',      key: 'eps_growth',                 fmt: 'pct'   },
    { label: 'EPS Growth Est',  key: 'eps_growth_est',             fmt: 'pct'   },
    { label: 'EPS Growth TQ',   key: 'eps_growth_tq',              fmt: 'pct'   },
    { label: 'EPS Growth NQ',   key: 'eps_growth_nq',              fmt: 'pct'   },
    { label: 'EPS Growth TY',   key: 'eps_growth_ty',              fmt: 'pct'   },
    { label: 'EPS Growth NY',   key: 'eps_growth_ny',              fmt: 'pct'   },
    { label: 'Earnings Date',   key: 'earnings_date',              fmt: 'date'  },
  ]},
  { label: 'Margins', fields: [
    { label: 'Gross Margin',    key: 'gross_margin',               fmt: 'pct'   },
    { label: 'FCF Margin',      key: 'fcf_margin',                 fmt: 'pct'   },
  ]},
  { label: 'Valuation Multiples', fields: [
    { label: 'P/E',             key: 'pe_ratio',                   fmt: 'mult'  },
    { label: 'P/S',             key: 'ps_ratio',                   fmt: 'mult'  },
    { label: 'EV/EBITDA',       key: 'ev_ebitda',                  fmt: 'mult'  },
  ]},
  { label: 'Cash Flow & Profitability', fields: [
    { label: 'Free Cash Flow',  key: 'free_cash_flow',             fmt: 'large' },
    { label: 'Operating Income',key: 'operating_income',           fmt: 'large' },
    { label: 'EBIT',            key: 'ebit',                       fmt: 'large' },
  ]},
  { label: 'Balance Sheet & Ownership', fields: [
    { label: 'Debt / Equity',   key: 'debt_to_equity',             fmt: 'raw'   },
    { label: 'Net Debt/EBITDA', key: 'net_debt_ebitda',            fmt: 'raw'   },
    { label: 'Insider %',       key: 'shares_insiders',            fmt: 'pct'   },
  ]},
];

function formatFundVal(val: any, fmt: string): string {
  if (val === null || val === undefined || val === '') return '—';
  switch (fmt) {
    case 'pct':   return fmtPct(val);
    case 'mult':  return fmtMult(val);
    case 'large': return fmtLarge(val);
    case 'date':  return String(val);
    default:      return typeof val === 'number' ? (isFinite(val) ? val.toFixed(2) : '—') : safeStr(val);
  }
}

function FundamentalsTab({ detail, detailLoading, confluenceRow, stock, screenerRow }: {
  detail?: any; detailLoading: boolean; confluenceRow?: any; stock?: any; screenerRow?: any;
}) {
  if (detailLoading && !detail) return <LoadingRow label="Loading fundamentals…" />;

  const fund = detail?.fundamentals ?? {};
  const src  = detail?.fundamentals_source;
  /* screenerRow first — it has all the watchlist fundamental fields */
  const rowFb = screenerRow ?? confluenceRow ?? stock ?? {};

  /* Resolve a field: detail.fundamentals first, then screener row / stock fallback */
  function getFund(key: string): any {
    const v = fund[key];
    if (v !== null && v !== undefined && v !== '') return v;
    const rv = rowFb[key];
    if (rv !== null && rv !== undefined && rv !== '') return rv;
    /* Theme aliases */
    if (key === 'canonical_theme_name') {
      const aliases = ['canonical_theme', 'theme', 'market_theme', 'canonical_theme_id'];
      for (const alias of aliases) {
        const av = fund[alias] ?? rowFb[alias];
        if (av !== null && av !== undefined && av !== '') return av;
      }
    }
    return null;
  }

  const fwdPE = getFund('forward_pe');
  const hasForwardPE = fwdPE != null;
  const hasAnyData = FUND_GROUPS.some(g => g.fields.some(f => getFund(f.key) != null)) || hasForwardPE;

  if (!hasAnyData) {
    return <div style={{ color: C.dim, fontSize: 12, fontFamily: _sdmSans }}>No fundamental data available for this ticker.</div>;
  }

  function getFundColor(key: string, val: any): string {
    const n = Number(val);
    if (!Number.isFinite(n)) return C.text;
    const coloredKeys = [
      'revenue_growth_q','revenue_growth','revenue_growth_est','rev_growth_next_quarter','rev_growth_next_year',
      'eps_growth','eps_growth_est','eps_growth_tq','eps_growth_nq','eps_growth_ty','eps_growth_ny',
      'gross_margin','fcf_margin','free_cash_flow','operating_income','ebit',
    ];
    if (coloredKeys.includes(key)) return n > 0 ? C.green : n < 0 ? C.red : C.dim;
    return C.text;
  }

  const fRow = (label: string, value: React.ReactNode, key?: string, color?: string) => (
    <div key={key ?? label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: C.card, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: 11, color: color ?? C.text, fontWeight: 600, fontFamily: _sdmFont }}>{value}</span>
    </div>
  );

  const fwdPEApprox = getFund('forward_pe_is_approximate');
  const fwdPEWarnings: string[] = getFund('forward_pe_warning_codes') ?? [];
  const fwdPESrc = getFund('forward_pe_source');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {src && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, fontSize: 8, color: C.dim, fontFamily: _sdmFont }}>
          {src.freshness_status && <span>Freshness: {src.freshness_status.replace(/_/g, ' ')}</span>}
          {src.last_updated && <span>Updated: {String(src.last_updated).slice(0, 10)}</span>}
          {src.missing_fields?.length > 0 && <span style={{ color: C.amber }}>Missing: {src.missing_fields.join(', ')}</span>}
        </div>
      )}

      {FUND_GROUPS.map(group => {
        const isValuation = group.label === 'Valuation Multiples';
        const visibleFields = group.fields
          .map(f => ({ ...f, val: getFund(f.key) }))
          .filter(f => f.val != null && f.val !== '');

        if (!isValuation && visibleFields.length === 0) return null;
        if (isValuation && visibleFields.length === 0 && !hasForwardPE) return null;

        return (
          <div key={group.label}>
            <SectionLabel>{group.label}</SectionLabel>
            <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              {visibleFields.map(f => fRow(f.label, formatFundVal(f.val, f.fmt), f.key, getFundColor(f.key, f.val)))}
              {isValuation && hasForwardPE && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: C.card, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Forward P/E</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: C.text, fontWeight: 600, fontFamily: _sdmFont }}>{Number(fwdPE).toFixed(1)}x</span>
                    {fwdPEApprox && (
                      <span style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.amber}20`, color: C.amber, fontFamily: _sdmFont, fontWeight: 700, letterSpacing: '0.05em' }}>APPROX.</span>
                    )}
                    {fwdPEWarnings.map((wc: string, i: number) => (
                      <span key={i} style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.amber}15`, color: C.amber, fontFamily: _sdmFont }}>{wc.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              )}
              {isValuation && fwdPESrc && (
                fRow('F.P/E Source', String(fwdPESrc), 'fwd_pe_src')
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   News Tab — uses ticker-detail backend data, rich catalyst cards
   ═══════════════════════════════════════════════════════════════════ */
function NewsTab({ detail, detailLoading, ticker, allNews }: { detail?: any; detailLoading: boolean; ticker: string; allNews?: any[] }) {
  /* Watchlist live news filtered to this ticker — used as fallback when detail.news is empty */
  const wlTickerNews: any[] = allNews?.filter(
    item => (item.ticker || '').toUpperCase() === ticker.toUpperCase()
  ) ?? [];
  if (detailLoading && !detail && wlTickerNews.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.dim, fontSize: 12, fontFamily: _sdmSans }}>
        <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
        Loading news for {ticker}…
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const newsData = detail?.news ?? {};
  /* Support multiple backend shapes for articles */
  const directArticles: any[] =
    newsData?.direct_catalyst_articles
    ?? detail?.direct_catalyst?.articles
    ?? (detail?.direct_catalyst?.article ? [detail.direct_catalyst.article] : undefined)
    ?? detail?.direct_catalyst_articles
    ?? [];
  const regularArticles: any[] =
    (Array.isArray(newsData?.articles) && newsData.articles.length > 0 ? newsData.articles : undefined)
    ?? (Array.isArray(detail?.news_articles) && detail.news_articles.length > 0 ? detail.news_articles : undefined)
    ?? wlTickerNews;  /* fallback: live watchlist news filtered to this ticker */
  const totalCount = directArticles.length + regularArticles.length;

  if (!detail && wlTickerNews.length === 0) {
    return (
      <div style={{ padding: 14, borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.dim, fontSize: 12, margin: 0, fontFamily: _sdmSans }}>
          News data is not available for <strong style={{ color: C.text }}>{ticker}</strong>.
        </p>
      </div>
    );
  }
  if (totalCount === 0) {
    return <div style={{ color: C.dim, fontSize: 12, fontFamily: _sdmSans }}>No recent news cached for <strong style={{ color: C.text }}>{ticker}</strong>.</div>;
  }

  const renderDirectCard = (item: any, idx: number) => {
    const tier = item.catalyst_event_tier ?? item.event_tier ?? item.tier ?? '';
    const isBearish = tier === 'TIER_E' || item.is_bearish_conflict;
    const tc = isBearish ? C.red : tierColor(tier);

    return (
      <div key={`dc-${idx}`} style={{ background: `${tc}06`, border: `1px solid ${tc}25`, borderRadius: 5, padding: '10px 12px', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: isBearish ? C.red : C.amber, fontFamily: _sdmFont, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
            {isBearish ? 'Bearish Catalyst' : 'Direct Catalyst'}
          </span>
          {tier && (
            <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 2, background: `${tc}15`, color: tc, fontFamily: _sdmFont, fontWeight: 700 }}>
              {tier.replace('_', ' ')}
            </span>
          )}
          {(item.catalyst_event_type || item.event_type) && (
            <span style={{ fontSize: 7, color: C.dim, fontFamily: _sdmFont }}>{item.catalyst_event_type ?? item.event_type}</span>
          )}
          {item.catalyst_score != null && (
            <span style={{ fontSize: 7, color: tc, fontFamily: _sdmFont, marginLeft: 'auto' }}>score {Number(item.catalyst_score).toFixed(1)}</span>
          )}
        </div>

        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 12, color: C.text, fontFamily: _sdmSans, lineHeight: 1.5, display: 'block' }}>{item.title}</span>
        </a>

        {item.summary && (
          <p style={{ fontSize: 10, color: C.dim, fontFamily: _sdmSans, lineHeight: 1.4, margin: '4px 0 0' }}>
            {item.summary.slice(0, 200)}{item.summary.length > 200 ? '…' : ''}
          </p>
        )}

        {/* Catalyst explanation */}
        {item.catalyst_explanation && (
          <p style={{ fontSize: 10, color: C.teal, fontFamily: _sdmSans, lineHeight: 1.5, margin: '6px 0 0', fontStyle: 'italic' }}>{item.catalyst_explanation}</p>
        )}

        {/* Materiality / Freshness / Relevance mini fields */}
        {(item.materiality_score != null || item.freshness_score != null || item.relevance_score != null) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
            {item.materiality_score != null && <span style={{ fontSize: 8, color: C.dim, fontFamily: _sdmFont }}>mat {Number(item.materiality_score).toFixed(1)}</span>}
            {item.freshness_score != null && <span style={{ fontSize: 8, color: C.dim, fontFamily: _sdmFont }}>fresh {Number(item.freshness_score).toFixed(1)}</span>}
            {item.relevance_score != null && <span style={{ fontSize: 8, color: C.dim, fontFamily: _sdmFont }}>rel {Number(item.relevance_score).toFixed(1)}</span>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
          <span style={{ fontSize: 9, color: C.teal, fontFamily: _sdmFont }}>{item.source}</span>
          {item.published_at && <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>{timeAgo(item.published_at)}</span>}
        </div>
      </div>
    );
  };

  const renderRegularCard = (item: any, idx: number) => (
    <a
      key={`reg-${idx}`}
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'flex', flexDirection: 'column' as const, gap: 3, padding: '9px 12px', borderRadius: 4, textDecoration: 'none', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = C.card}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontSize: 12, color: C.text, fontFamily: _sdmSans, lineHeight: 1.5 }}>{item.title}</span>
      {item.summary && (
        <span style={{ fontSize: 10, color: C.dim, fontFamily: _sdmSans, lineHeight: 1.4 }}>
          {item.summary.slice(0, 150)}{item.summary.length > 150 ? '…' : ''}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, color: C.teal, fontFamily: _sdmFont }}>{item.source}</span>
        {item.published_at && <span style={{ fontSize: 9, color: C.dim, fontFamily: _sdmFont }}>{timeAgo(item.published_at)}</span>}
        {item.rss_providers?.length > 0 && (
          <span style={{ fontSize: 8, color: C.dim, fontFamily: _sdmFont, marginLeft: 'auto' }}>
            {item.rss_providers.map((p: string) => p.toUpperCase()).join(' + ')}
          </span>
        )}
      </div>
    </a>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: _sdmFont }}>
          {totalCount} ARTICLE{totalCount !== 1 ? 'S' : ''}
        </span>
        {directArticles.length > 0 && (
          <span style={{ fontSize: 9, color: C.amber, fontFamily: _sdmFont, marginLeft: 8 }}>
            · {directArticles.length} DIRECT CATALYST
          </span>
        )}
      </div>

      {/* Direct catalyst cards first */}
      {directArticles.length > 0 && (
        <>
          {directArticles.map((item, i) => renderDirectCard(item, i))}
          {regularArticles.length > 0 && <div style={{ margin: '10px 0', borderBottom: `1px solid ${C.border}` }} />}
        </>
      )}

      {/* Regular articles */}
      {regularArticles.map((item, i) => renderRegularCard(item, i))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Deep Dive Tab
   ═══════════════════════════════════════════════════════════════════ */
const MODEL_OPTIONS = [
  { id: 'grok',      label: 'Grok',         desc: 'X/Twitter sentiment, real-time news', color: C.bright },
  { id: 'gemini',    label: 'Gemini',        desc: 'Google search headlines, web intelligence', color: C.blue },
  { id: 'claude_gpt',label: 'Claude / GPT', desc: 'Deep reasoning & report structuring', color: C.purple },
];
interface DeepDiveTabProps {
  ticker: string; data: any; loading: boolean; error: string | null;
  selectedModels: string[]; setSelectedModels: (m: string[]) => void;
  reportModel: 'claude' | 'gpt'; setReportModel: (m: 'claude' | 'gpt') => void;
  onGenerate: () => void;
}
function DeepDiveTab({ ticker, data, loading, error, selectedModels, setSelectedModels, reportModel, setReportModel, onGenerate }: DeepDiveTabProps) {
  const toggleModel = (id: string) => {
    setSelectedModels(selectedModels.includes(id) ? selectedModels.filter(m => m !== id) : [...selectedModels, id]);
  };
  if (data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onGenerate} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: _sdmFont, cursor: 'pointer', border: `1px solid ${C.border}`, background: C.card, color: C.dim }}>
            <RefreshCw style={{ width: 12, height: 12 }} />Regenerate
          </button>
        </div>
        {data.grok   && <ReportSection title="Grok — X/Twitter Sentiment" color={C.bright}  content={data.grok} />}
        {data.gemini && <ReportSection title="Gemini — Google Headlines"   color={C.blue}    content={data.gemini} />}
        {(data.claude || data.gpt) && <ReportSection title={data.claude ? 'Claude — Deep Analysis' : 'GPT — Deep Analysis'} color={C.purple} content={data.claude || data.gpt} />}
        {data.summary && (<div><SectionLabel>Combined Summary</SectionLabel><div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}><p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, fontFamily: _sdmSans, margin: 0 }}>{data.summary}</p></div></div>)}
        {(data.bull_case || data.bear_case) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {data.bull_case && (<div style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 6, padding: 14 }}><span style={{ fontSize: 9, fontWeight: 800, color: C.green, fontFamily: _sdmFont, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bull Case</span><p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: _sdmSans, marginTop: 8, marginBottom: 0 }}>{data.bull_case}</p></div>)}
            {data.bear_case && (<div style={{ background: `${C.red}08`, border: `1px solid ${C.red}20`, borderRadius: 6, padding: 14 }}><span style={{ fontSize: 9, fontWeight: 800, color: C.red, fontFamily: _sdmFont, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bear Case</span><p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: _sdmSans, marginTop: 8, marginBottom: 0 }}>{data.bear_case}</p></div>)}
          </div>
        )}
        {data.risk_factors?.length > 0 && (<div><SectionLabel>Risk Factors</SectionLabel><ul style={{ margin: 0, paddingLeft: 18 }}>{data.risk_factors.map((r: string, i: number) => (<li key={i} style={{ fontSize: 11, color: C.text, fontFamily: _sdmSans, lineHeight: 1.5 }}>{r}</li>))}</ul></div>)}
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.teal, fontSize: 12, fontFamily: _sdmFont }}>
          <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          Querying {selectedModels.join(', ')} for {ticker}...
        </div>
        {[1,2,3,4].map(i => (<div key={i} style={{ background: C.card, borderRadius: 6, height: 70 + i * 18, opacity: 0.35 }} />))}
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '10px 14px', borderRadius: 6, background: `${C.red}10`, border: `1px solid ${C.red}30` }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: C.red, fontFamily: _sdmFont, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Generation Failed</span>
          <span style={{ fontSize: 11, color: C.red, fontFamily: _sdmSans, lineHeight: 1.5 }}>{error}</span>
        </div>
        <ModelPicker ticker={ticker} selectedModels={selectedModels} toggleModel={toggleModel} reportModel={reportModel} setReportModel={setReportModel} onGenerate={onGenerate} loading={loading} />
      </div>
    );
  }
  return <ModelPicker ticker={ticker} selectedModels={selectedModels} toggleModel={toggleModel} reportModel={reportModel} setReportModel={setReportModel} onGenerate={onGenerate} loading={loading} />;
}

function ModelPicker({ ticker, selectedModels, toggleModel, reportModel, setReportModel, onGenerate, loading }: {
  ticker: string; selectedModels: string[]; toggleModel: (id: string) => void;
  reportModel: 'claude' | 'gpt'; setReportModel: (m: 'claude' | 'gpt') => void;
  onGenerate: () => void; loading: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.bright, fontFamily: _sdmSans, marginBottom: 4 }}>AI Deep Dive — {ticker}</div>
        <p style={{ fontSize: 12, color: C.dim, fontFamily: _sdmSans, margin: 0, lineHeight: 1.5 }}>Select which AI models to query.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MODEL_OPTIONS.map(opt => {
          const checked = selectedModels.includes(opt.id);
          return (
            <div key={opt.id} role="button" tabIndex={0} onClick={() => toggleModel(opt.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleModel(opt.id); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 6, cursor: 'pointer', background: checked ? `${opt.color}08` : C.card, border: `1px solid ${checked ? opt.color + '40' : C.border}`, textAlign: 'left', transition: 'all 0.15s', userSelect: 'none' }}>
              {checked ? <CheckSquare style={{ width: 16, height: 16, color: opt.color, flexShrink: 0 }} /> : <Square style={{ width: 16, height: 16, color: C.dim, flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: checked ? opt.color : C.text, fontFamily: _sdmFont }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: _sdmSans, marginTop: 2 }}>{opt.desc}</div>
              </div>
              {opt.id === 'claude_gpt' && checked && (
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {(['claude', 'gpt'] as const).map(m => (
                    <button key={m} onClick={() => setReportModel(m)} style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: _sdmFont, cursor: 'pointer', background: reportModel === m ? `${C.purple}30` : 'transparent', border: `1px solid ${reportModel === m ? C.purple : C.border}`, color: reportModel === m ? C.purple : C.dim }}>{m.toUpperCase()}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onGenerate} disabled={loading || selectedModels.length === 0}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: _sdmFont, cursor: selectedModels.length === 0 ? 'not-allowed' : 'pointer', background: selectedModels.length === 0 ? C.card : `linear-gradient(135deg, ${C.teal}, ${C.purple})`, border: 'none', color: selectedModels.length === 0 ? C.dim : '#000', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
        <Zap style={{ width: 14, height: 14 }} />Generate Deep Dive Report
      </button>
    </div>
  );
}

/* ── Report Section ───────────────────────────────────────────────── */
function ReportSection({ title, color, content }: { title: string; color: string; content: any }) {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 3, height: 14, background: color, borderRadius: 2 }} />
        <span style={{ fontSize: 9, fontWeight: 800, color, fontFamily: _sdmFont, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
        <p style={{ fontSize: 11, color: C.text, lineHeight: 1.7, fontFamily: _sdmSans, margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
      </div>
    </div>
  );
}

/* ── Shared sub-components ───────────────────────────────────────── */
function LoadingRow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.dim, fontSize: 11, fontFamily: _sdmSans, padding: '8px 0' }}>
      <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
      {label}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 800, color: C.dim, fontFamily: _sdmFont, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
      {children}
    </div>
  );
}
function InfoCard({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, borderLeft: `3px solid ${color}` }}>
      <span style={{ fontSize: 8, fontWeight: 800, color, fontFamily: _sdmFont, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ fontSize: 11, color: C.text, fontFamily: _sdmSans, lineHeight: 1.6, marginTop: 6 }}>{children}</div>
    </div>
  );
}
function MetricBox({ label, value, raw, colored }: { label: string; value?: any; raw?: boolean; colored?: 'green' | 'red' }) {
  if (value === undefined || value === null || value === '') return null;
  const display = raw ? String(value) : (typeof value === 'number' ? value.toFixed(1) : String(value));
  const col = colored === 'green' ? C.green : colored === 'red' ? C.red : C.text;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 10px', background: C.card, borderRadius: 4, border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 8, color: C.dim, fontFamily: _sdmFont, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 13, color: col, fontWeight: 700, fontFamily: _sdmFont, marginTop: 2 }}>{display}</span>
    </div>
  );
}
