import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, TrendingUp, BookOpen, Newspaper, Brain, Loader2, Zap, RefreshCw, CheckSquare, Square, Activity } from 'lucide-react';
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes';
import { mergeRealtimeQuote } from '@/lib/mergeRealtimeQuote';
import { PriceFreshnessBadge } from '@/components/PriceFreshnessBadge';

/* ── color tokens ─────────────────────────────────────────────────── */
const C = {
  bg: '#080c13', card: '#0d1623', card2: '#0a1020',
  border: '#1a2540', text: '#e2e8f0', dim: '#64748b',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  orange: '#fb923c', bright: '#fff',
  font: "'JetBrains Mono','Fira Code',monospace",
  sansFont: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

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
const V42_KK: React.CSSProperties = { fontSize: 8, color: C.dim, fontFamily: C.font };
const V42_VV: React.CSSProperties = { fontSize: 8, color: C.text, fontWeight: 600, fontFamily: C.font };
const V42_SEC: React.CSSProperties = { marginBottom: 14 };
const V42_LBL: React.CSSProperties = { fontSize: 7, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: C.teal, fontFamily: C.font, marginBottom: 5, display: 'block' };

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
        {raw != null && <span style={{ fontSize: 7, color: C.dim, fontFamily: C.font }}>q{Math.round(raw)}</span>}
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
  onClose: () => void;
}
type TabId = 'overview' | 'technical' | 'fundamentals' | 'news' | 'deep-dive';

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
  ticker, analysis, csvData, watchlistId, earningsEntry, confluenceRows, onClose
}: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
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

  const { data: identityData } = useQuery<Record<string, any>>({
    queryKey: ['company-identity', ticker.toUpperCase()],
    queryFn: async () => {
      const r = await fetch(`/api/fmp/company-identity?symbols=${encodeURIComponent(ticker)}`);
      if (!r.ok) return {};
      return r.json();
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
    enabled: !!ticker,
  });
  const fmpExchange: string | null = identityData?.[ticker.toUpperCase()]?.exchange ?? null;

  const { data: detail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ['ticker-detail', ticker.toUpperCase()],
    queryFn: async () => {
      const r = await fetch(`/api/watchlist/ticker-detail/${encodeURIComponent(ticker)}`, {
        credentials: 'include',
      });
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
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

  const companyName = detail?.company?.name ?? stock?.name ?? stock?.company ?? '';
  const displaySignal = stock?.signal ?? detail?.confluence_v42?.action?.label ?? null;
  const sigCol = signalColor(displaySignal);

  const headerChangePct: number | null =
    stock?.change_pct != null ? stock.change_pct
    : useRowFallback ? (confluenceRow?.change_pct ?? backendQuote?.change_pct ?? null)
    : (backendQuote?.change_pct ?? null);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',     label: 'Overview',     icon: <TrendingUp style={{ width: 13, height: 13 }} /> },
    { id: 'technical',    label: 'Technical',    icon: <Activity   style={{ width: 13, height: 13 }} /> },
    { id: 'fundamentals', label: 'Fundamentals', icon: <BookOpen   style={{ width: 13, height: 13 }} /> },
    { id: 'news',         label: 'News',         icon: <Newspaper  style={{ width: 13, height: 13 }} /> },
    { id: 'deep-dive',    label: 'AI Deep Dive', icon: <Brain      style={{ width: 13, height: 13 }} /> },
  ];

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 980, maxHeight: '92vh', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, background: C.card, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 20, fontWeight: 900, fontFamily: C.font, color: C.bright }}>{ticker}</span>
          {companyName && <span style={{ fontSize: 12, color: C.dim, fontFamily: C.sansFont }}>{companyName}</span>}
          {stock?._section && (
            <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: C.font, color: C.purple, background: `${C.purple}15`, border: `1px solid ${C.purple}30` }}>
              {stock._section}
            </span>
          )}
          {displaySignal && (
            <span style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: C.font, color: '#000', background: sigCol, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {displaySignal}
            </span>
          )}
          {stock?.risk_level && (
            <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: C.font, color: riskColor(stock.risk_level), background: `${riskColor(stock.risk_level)}15`, border: `1px solid ${riskColor(stock.risk_level)}30` }}>
              {stock.risk_level} RISK
            </span>
          )}
          {headerChangePct != null && (
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: C.font, color: headerChangePct >= 0 ? C.green : C.red }}>
              {headerChangePct >= 0 ? '+' : ''}{typeof headerChangePct === 'number' ? headerChangePct.toFixed(2) : headerChangePct}%
            </span>
          )}
          {useRowFallback && !stock?.price_source && (
            <span style={{ fontSize: 8, color: C.amber, fontFamily: C.font, border: `1px solid ${C.amber}30`, padding: '2px 6px', borderRadius: 3 }}>SCREENER DATA</span>
          )}
          {stock?.price_source && (
            <PriceFreshnessBadge meta={{ source: stock.price_source, is_realtime: stock.price_is_realtime, is_live_backup: stock.price_is_live_backup, is_stale: stock.price_is_stale, staleness_seconds: stock.staleness_seconds, quote_timestamp: stock.quote_timestamp, updated_at: stock.price_updated_at }} />
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: C.dim, cursor: 'pointer', padding: 4, background: 'none', border: 'none' }}><X style={{ width: 18, height: 18 }} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 20px', background: C.card }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', fontSize: 10, fontWeight: 700, fontFamily: C.font, cursor: 'pointer', color: activeTab === tab.id ? C.teal : C.dim, background: 'transparent', border: 'none', borderBottom: `2px solid ${activeTab === tab.id ? C.teal : 'transparent'}`, transition: 'all 0.15s' }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeTab === 'overview' && <OverviewTab stock={stock} ticker={ticker} csvRow={csvRow} earningsEntry={earningsEntry} fmpExchange={fmpExchange} detail={detail} detailLoading={detailLoading} confluenceRow={confluenceRow} />}
          {activeTab === 'technical' && <TechnicalTab detail={detail} detailLoading={detailLoading} confluenceRow={confluenceRow} stock={stock} useRowFallback={useRowFallback} />}
          {activeTab === 'fundamentals' && <FundamentalsTab detail={detail} detailLoading={detailLoading} />}
          {activeTab === 'news' && <NewsTab detail={detail} detailLoading={detailLoading} ticker={ticker} />}
          {activeTab === 'deep-dive' && <DeepDiveTab ticker={ticker} data={deepDive} loading={deepDiveLoading} error={deepDiveError} selectedModels={selectedModels} setSelectedModels={setSelectedModels} reportModel={reportModel} setReportModel={setReportModel} onGenerate={generateDeepDive} />}
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
function OverviewTab({ stock, ticker, csvRow, earningsEntry, fmpExchange, detail, detailLoading, confluenceRow }: {
  stock: any; ticker: string; csvRow?: any; earningsEntry?: any; fmpExchange?: string | null;
  detail?: any; detailLoading: boolean; confluenceRow?: any;
}) {
  const tvSymbol = resolveTVSymbol(ticker, stock, csvRow, fmpExchange);
  const tvUrl = `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=500&interval=D&range=3M&style=1&toolbar_bg=0d1623&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=exchange&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(tvSymbol)}`;

  const company = detail?.company;
  const conf = detail?.confluence_v42;
  const isNewFmt = stock?._format === 'new';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 1. TradingView Chart */}
      <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <iframe key={tvSymbol} src={tvUrl} style={{ width: '100%', height: 500, border: 'none', display: 'block' }} title={`${ticker} chart`} />
      </div>

      {/* 2. Upcoming Earnings */}
      {earningsEntry?.next_date && (
        <div>
          <SectionLabel>Upcoming Earnings</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6 }}>
            <MetricBox label="Date"    value={earningsEntry.next_date} raw />
            <MetricBox label="Est EPS" value={earningsEntry.est_eps != null ? `${Number(earningsEntry.est_eps) >= 0 ? '+' : ''}$${Math.abs(Number(earningsEntry.est_eps)).toFixed(2)}` : '—'} raw colored={earningsEntry.est_eps != null ? (Number(earningsEntry.est_eps) >= 0 ? 'green' : 'red') : undefined} />
            <MetricBox label="Last EPS" value={earningsEntry.last_eps != null ? `${Number(earningsEntry.last_eps) >= 0 ? '+' : ''}$${Math.abs(Number(earningsEntry.last_eps)).toFixed(2)}` : '—'} raw colored={earningsEntry.last_eps != null ? (Number(earningsEntry.last_eps) >= 0 ? 'green' : 'red') : undefined} />
            <MetricBox label="Rev Est" value={earningsEntry.revenue_estimated != null ? fmtLarge(earningsEntry.revenue_estimated) : '—'} raw />
            <MetricBox label="Price"   value={earningsEntry.price != null ? `$${Number(earningsEntry.price).toFixed(2)}` : '—'} raw />
          </div>
        </div>
      )}

      {/* 3. About */}
      {detailLoading && !detail && <LoadingRow label="Loading company profile…" />}
      {company && (
        <div>
          <SectionLabel>About</SectionLabel>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
            {company.description ? (
              <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>{company.description}</p>
            ) : (
              <p style={{ fontSize: 12, color: C.dim, fontFamily: C.sansFont, margin: 0 }}>Company profile unavailable.</p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 6, marginTop: 12 }}>
              {company.name     && <MetricBox label="Name"     value={company.name}     raw />}
              {company.sector   && <MetricBox label="Sector"   value={company.sector}   raw />}
              {company.industry && <MetricBox label="Industry" value={company.industry} raw />}
              {company.exchange && <MetricBox label="Exchange" value={company.exchange} raw />}
              {company.country  && <MetricBox label="Country"  value={company.country}  raw />}
              {company.market_cap != null && <MetricBox label="Mkt Cap" value={fmtLarge(company.market_cap)} raw />}
              {company.employees != null && <MetricBox label="Employees" value={fmtLarge(company.employees)} raw />}
            </div>
          </div>
        </div>
      )}

      {/* 4. Confluence Summary */}
      {conf && <ConfluenceSummarySection detail={detail} confluenceRow={confluenceRow} />}

      {/* Legacy analysis fallback (no backend detail) */}
      {!detailLoading && !conf && isNewFmt && stock && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {stock.catalyst && (
            <div><SectionLabel>Catalyst</SectionLabel>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>{stock.catalyst}</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {stock.sentiment   && <InfoCard label="Sentiment"   color={C.blue}>{stock.sentiment}</InfoCard>}
            {stock.action_note && <InfoCard label="Action Note" color={C.amber}>{stock.action_note}</InfoCard>}
          </div>
        </div>
      )}
      {!detailLoading && !conf && !isNewFmt && stock && (
        <>
          {stock.thesis && (<div><SectionLabel>Investment Thesis</SectionLabel><p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>{stock.thesis}</p></div>)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {stock.why_now   && <InfoCard label="Why Now"         color={C.amber}>{stock.why_now}</InfoCard>}
            {stock.sentiment && <InfoCard label="Sentiment"       color={C.blue}>{stock.sentiment}</InfoCard>}
            {stock.moat      && <InfoCard label="Competitive Moat" color={C.purple}>{stock.moat}</InfoCard>}
          </div>
          {stock.catalysts?.length > 0 && (
            <div><SectionLabel>Catalysts</SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {stock.catalysts.map((cat: string, i: number) => (
                  <span key={i} style={{ padding: '3px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: C.font, color: C.teal, background: `${C.teal}12`, border: `1px solid ${C.teal}25` }}>{cat}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {!detailLoading && !conf && !stock && (
        <div style={{ padding: 16, borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.dim, fontSize: 12, margin: 0, fontFamily: C.sansFont }}>No analysis data available for <strong style={{ color: C.text }}>{ticker}</strong>. Generate an AI Deep Dive for a full report.</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Confluence Summary Section — rich V42 display (migrated from drawer)
   ═══════════════════════════════════════════════════════════════════ */
function ConfluenceSummarySection({ detail, confluenceRow }: { detail: any; confluenceRow?: any }) {
  const [showDebug, setShowDebug] = useState(false);

  const v42   = detail?.confluence_v42;
  if (!v42) return null;

  const sc    = v42.score;
  const act   = v42.action;
  const comps = v42.components ?? {};
  const bon   = v42.bonuses;
  const risk  = v42.risk;
  const meta  = v42.metadata;
  const tech  = v42.technical;
  const dc    = detail?.direct_catalyst;
  const fund  = detail?.fundamentals;
  const valComp = comps.valuation;

  const decisionCfg = act ? (DECISION_BADGE_MAP[act.label?.toUpperCase()] ?? { label: act.label_display ?? act.label, clr: C.dim }) : null;

  return (
    <div>
      <SectionLabel>Confluence Analysis</SectionLabel>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>

        {/* Score header */}
        {sc && (
          <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' as const }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: ccsColor(sc.core), fontFamily: C.font, lineHeight: 1 }}>
                {sc.core.toFixed(1)}
              </span>
              <span style={{ fontSize: 11, color: C.dim, fontFamily: C.font }}>/100</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.purple, fontFamily: C.font }}>
                +{sc.bonus.toFixed(1)}
              </span>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>bonus</span>
              {decisionCfg && (
                <span style={{ padding: '3px 8px', borderRadius: 3, fontSize: 9, fontWeight: 800, fontFamily: C.font, color: '#000', background: decisionCfg.clr, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {decisionCfg.label}
                </span>
              )}
              {act?.execution_label && (
                <span style={{ fontSize: 9, color: C.amber, fontFamily: C.font }}>{act.execution_label}</span>
              )}
            </div>
            <div style={{ fontSize: 8, color: C.dim, fontFamily: C.font, marginTop: 4 }}>
              Total {sc.total.toFixed(1)} · Core max 100 · Bonus max 25
              {meta?.confidence_score > 0 && ` · Confidence ${meta.confidence_score.toFixed(0)}%`}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>
            {/* Action */}
            {act && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>Action</span>
                <V42DR k="Decision"     v={act.label_display}              clr={decisionCfg?.clr} />
                {act.execution_label && <V42DR k="Timing"       v={act.execution_label}           clr={C.amber} />}
                <V42DR k="Bucket"       v={act.bucket?.replace(/_/g, ' ')} />
                {act.invalidation_level != null && <V42DR k="Invalidation" v={`$${Number(act.invalidation_level).toFixed(2)}`} clr={C.red} />}
                {act.target_zone?.target_1 && <V42DR k="Target 1" v={`$${Number(act.target_zone.target_1).toFixed(2)}`} clr={C.green} />}
                {act.target_zone?.target_2 && <V42DR k="Target 2" v={`$${Number(act.target_zone.target_2).toFixed(2)}`} clr={C.teal} />}
                {act.target_zone?.risk_reward_ratio != null && <V42DR k="Risk/Reward" v={`${Number(act.target_zone.risk_reward_ratio).toFixed(1)}x`} />}
                {act.why_now?.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 7, color: C.green, fontFamily: C.font, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Why Now</span>
                    {act.why_now.map((b: string, i: number) => (
                      <div key={i} style={{ fontSize: 8, color: C.text, fontFamily: C.font, paddingLeft: 8, paddingTop: 2, lineHeight: 1.4 }}>· {b}</div>
                    ))}
                  </div>
                )}
                {act.why_wait?.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 7, color: C.amber, fontFamily: C.font, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>Why Wait</span>
                    {act.why_wait.map((b: string, i: number) => (
                      <div key={i} style={{ fontSize: 8, color: C.dim, fontFamily: C.font, paddingLeft: 8, paddingTop: 2, lineHeight: 1.4 }}>· {b}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Risk Flags */}
            {risk?.risk_flags?.length > 0 && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>⚠ Risk</span>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {risk.risk_flags.map((f: string, i: number) => (
                    <span key={i} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(239,68,68,0.15)', color: C.red, fontFamily: C.font, fontWeight: 700 }}>{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Caution Flags */}
            {(risk?.caution_flags ?? []).length > 0 && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>⚡ Caution</span>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {(risk!.caution_flags!).map((f: string, i: number) => (
                    <span key={i} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(245,158,11,0.14)', color: C.amber, fontFamily: C.font, fontWeight: 700 }}>{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Score Breakdown */}
            {sc && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>Score Breakdown</span>
                <V42PR k="Core Score"  pts={sc.core}  max={sc.core_max ?? 100} />
                <V42PR k="Bonus Score" pts={sc.bonus} max={sc.bonus_max ?? 25}  clr={C.purple} />
                {meta?.confidence_score > 0 && (
                  <V42DR k="Confidence" v={`${meta.confidence_score.toFixed(0)}%`}
                     clr={meta.confidence_score >= 80 ? C.green : meta.confidence_score >= 50 ? C.amber : C.red} />
                )}
              </div>
            )}

            {/* Data Coverage */}
            {meta?.data_status_flags?.length > 0 && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>Data Coverage</span>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {meta.data_status_flags.map((f: string, i: number) => (
                    <span key={i} style={{ fontSize: 7, padding: '2px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: C.dim, fontFamily: C.font }}>{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
                <div style={{ fontSize: 7, color: 'rgba(169,170,166,0.5)', fontFamily: C.font, marginTop: 4 }}>Coverage gaps — not bearish signals</div>
              </div>
            )}
          </div>

          <div>
            {/* Components */}
            {Object.keys(comps).length > 0 && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>Components</span>
                {([
                  ['theme',          'Theme',          15],
                  ['stage',          'Stage',          15],
                  ['options',        'Options',        18],
                  ['technical_setup','Technical Setup',  8],
                  ['entry_exit',     'Entry / Exit',   12],
                  ['catalyst',       'Catalyst',       12],
                  ['investment',     'Investment',     12],
                  ['valuation',      'Valuation',       8],
                ] as [string, string, number][]).map(([key, label, defMax]) => {
                  const c = comps[key];
                  if (!c) return null;
                  const pts = c.points;
                  const max = c.max_points ?? defMax;
                  if (pts == null) return null;
                  const subLabel = c.label ?? c.quality_label ?? (c.pillar_count != null ? `${c.pillar_count}/3 pillars` : null);
                  return (
                    <div key={key}>
                      <V42PR k={label} pts={pts} max={max} raw={c.raw_score} />
                      {subLabel && <div style={{ fontSize: 6, color: C.dim, fontFamily: C.font, paddingLeft: 8, paddingBottom: 2 }}>{safeStr(subLabel)}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bonuses */}
            {bon && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>Bonuses</span>
                <V42PR k="Social"     pts={bon.social?.points ?? null}    max={15} clr={C.purple} />
                {bon.social?.sections_hit > 0 && <V42DR k="Social sections" v={`${bon.social.sections_hit} hit`} />}
                <V42PR k="Whale / Insider" pts={bon.whale_insider?.points ?? null} max={5} clr={C.teal} />
                <V42PR k="Bottleneck" pts={bon.bottleneck?.points ?? null} max={5}  clr={C.orange} />
                {bon.bottleneck?.anchor_count > 0 && <V42DR k="Bottleneck anchors" v={`${bon.bottleneck.anchor_count}`} />}
              </div>
            )}

            {/* Technical Confluence Details */}
            {tech && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>Technical Details</span>
                <V42DR k="Stage"          v={tech.stage_label?.replace(/_/g, ' ')}           clr={C.teal} />
                <V42DR k="Stage Score"    v={tech.stage_score != null ? `${Math.round(tech.stage_score)}` : null} />
                <V42DR k="Setup"          v={tech.technical_setup_label}                      clr={C.teal} />
                <V42DR k="Entry State"    v={(tech.entry_state_display ?? tech.entry_state)?.replace(/_/g, ' ')} />
                <V42DR k="Entry Score"    v={tech.entry_score != null ? `${Math.round(tech.entry_score)}` : null} />
                <V42DR k="Extension"      v={tech.extension_state?.replace(/_/g, ' ')}
                   clr={tech.extension_state?.includes('EXTREME') || tech.extension_state?.includes('CHASE') ? C.red : tech.extension_state?.includes('MODERATE') ? C.amber : C.dim} />
                {tech.extension_quality && <V42DR k="Ext Quality" v={tech.extension_quality.replace(/_/g, ' ')} />}
                <V42DR k="Nearest Fib"    v={tech.nearest_fib_label} />
                <V42DR k="Distance Fib"   v={tech.distance_to_fib_pct != null ? `${Number(tech.distance_to_fib_pct).toFixed(1)}%` : null} />
                {tech.fib_wave_status && (
                  <V42DR k="Fib/Wave"
                     v={tech.fib_wave_status === 'pending_10y_backfill' ? 'Pending 10Y backfill' : tech.fib_wave_status.replace(/_/g, ' ')}
                     clr={tech.fib_wave_status === 'pending_10y_backfill' ? C.amber : C.dim} />
                )}
                <V42DR k="Wave Structure" v={tech.wave_structure?.replace(/_/g, ' ')} />
                <V42DR k="Wave Score"     v={tech.wave_score != null ? `${Math.round(tech.wave_score)}` : null} />
              </div>
            )}

            {/* Options Coverage */}
            {comps.options?.status && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>Options Coverage</span>
                <V42DR k="Status" v={comps.options.status.replace(/_/g, ' ')} />
              </div>
            )}

            {/* Catalyst */}
            <div style={V42_SEC}>
              <span style={V42_LBL}>Catalyst</span>
              {(() => {
                const catComp = comps.catalyst;
                const catPts = catComp?.points ?? null;
                if (catPts != null) {
                  const catMax = catComp?.max_points ?? 12;
                  return (
                    <>
                      <V42PR k="Catalyst Score" pts={catPts} max={catMax} />
                      {(catComp?.status === 'bearish_conflict' || catComp?.reason_codes?.includes('BEARISH_CATALYST_CONFLICT')) && (
                        <div style={{ fontSize: 8, color: C.amber, fontFamily: C.font, marginTop: 4 }}>Bearish catalyst conflict — catalyst points suppressed.</div>
                      )}
                      {dc ? (
                        <>
                          <V42DR k="Type" v={dc.catalyst_event_type ?? dc.event_type} />
                          <V42DR k="Tier" v={dc.catalyst_event_tier ?? dc.event_tier ?? dc.tier} clr={tierColor(dc.catalyst_event_tier ?? dc.tier)} />
                          {dc.catalyst_freshness_score != null && <V42DR k="Freshness" v={Number(dc.catalyst_freshness_score).toFixed(1)} />}
                          {dc.catalyst_relevance_score != null && <V42DR k="Relevance" v={Number(dc.catalyst_relevance_score).toFixed(1)} />}
                          {dc.catalyst_materiality_score != null && <V42DR k="Materiality" v={Number(dc.catalyst_materiality_score).toFixed(1)} />}
                          {dc.catalyst_reason_codes?.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginTop: 4 }}>
                              {dc.catalyst_reason_codes.slice(0, 5).map((rc: string, i: number) => (
                                <span key={i} style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.teal}15`, color: C.teal, fontFamily: C.font }}>{rc.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
                          )}
                          {dc.catalyst_explanation && (
                            <div style={{ marginTop: 6, padding: '7px 10px', background: `${tierColor(dc.tier)}0a`, border: `1px solid ${tierColor(dc.tier)}25`, borderRadius: 4 }}>
                              <div style={{ fontSize: 7, fontWeight: 800, color: tierColor(dc.tier), fontFamily: C.font, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 3 }}>
                                {dc.tier ? `Catalyst — ${safeStr(dc.tier).replace('_', ' ')}` : 'Catalyst Explanation'}
                              </div>
                              <p style={{ fontSize: 10, color: C.text, fontFamily: C.sansFont, lineHeight: 1.6, margin: 0 }}>{safeStr(dc.catalyst_explanation)}</p>
                            </div>
                          )}
                        </>
                      ) : catPts === 0 ? (
                        <div style={{ fontSize: 8, color: C.dim, fontFamily: C.font, marginTop: 2 }}>No direct catalyst detected.</div>
                      ) : null}
                    </>
                  );
                }
                return <V42DR k="Status" v="No catalyst data available." />;
              })()}
            </div>

            {/* Valuation */}
            {(valComp || fund?.pe_ratio != null || fund?.ps_ratio != null || fund?.forward_pe != null) && (
              <div style={V42_SEC}>
                <span style={V42_LBL}>Valuation</span>
                {valComp?.points != null && <V42PR k="Valuation Score" pts={valComp.points} max={valComp.max_points ?? 8} />}
                {(valComp?.label || valComp?.quality_label) && (
                  <V42DR k="Label" v={valComp.label ?? valComp.quality_label} clr={C.teal} />
                )}
                {valComp?.status && (
                  <V42DR k="Coverage" v={valComp.status.replace(/_/g, ' ')}
                     clr={valComp.status === 'partial' ? C.amber : C.dim} />
                )}
                {fund?.pe_ratio != null && <V42DR k="P/E"     v={`${Number(fund.pe_ratio).toFixed(1)}x`} />}
                {fund?.ps_ratio != null && <V42DR k="P/S"     v={`${Number(fund.ps_ratio).toFixed(1)}x`} />}
                <div style={V42_RR}>
                  <span style={V42_KK}>Forward P/E</span>
                  {fund?.forward_pe != null ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ ...V42_VV }}>{Number(fund.forward_pe).toFixed(1)}x</span>
                      {fund.forward_pe_is_approximate && (
                        <span style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.amber}20`, color: C.amber, fontFamily: C.font, fontWeight: 700 }}>APPROX.</span>
                      )}
                      {(fund.forward_pe_warning_codes ?? []).map((wc: string, i: number) => (
                        <span key={i} style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.amber}15`, color: C.amber, fontFamily: C.font }}>{wc.replace(/_/g, ' ')}</span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ ...V42_VV, color: C.dim }}>—</span>
                  )}
                </div>
                {fund?.forward_pe_source && <V42DR k="F.P/E Source" v={fund.forward_pe_source} />}
                {fund?.valuation_pe_score != null && <V42DR k="P/E Score" v={`${Number(fund.valuation_pe_score).toFixed(1)}`} />}
                {fund?.valuation_ps_score != null && <V42DR k="P/S Score" v={`${Number(fund.valuation_ps_score).toFixed(1)}`} />}
                {fund?.valuation_forward_pe_score != null && <V42DR k="F.P/E Score" v={`${Number(fund.valuation_forward_pe_score).toFixed(1)}`} />}
                {fund?.valuation_explanation && (
                  <div style={{ marginTop: 6, fontSize: 9, color: C.dim, fontFamily: C.sansFont, lineHeight: 1.5 }}>{safeStr(fund.valuation_explanation)}</div>
                )}
                {valComp?.status === 'partial' && (
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: C.font, marginTop: 4 }}>Partial valuation coverage.</div>
                )}
                {valComp?.status === 'unavailable' && (
                  <div style={{ fontSize: 8, color: C.dim, fontFamily: C.font, marginTop: 4 }}>Valuation unavailable.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Debug */}
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => setShowDebug(v => !v)}
            style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 4, color: C.dim, fontSize: 7, padding: '3px 8px', cursor: 'pointer', fontFamily: C.font, letterSpacing: '0.05em' }}>
            {showDebug ? '▲ HIDE DEBUG' : '▼ DEBUG'}
          </button>
          {showDebug && (
            <div style={{ marginTop: 8 }}>
              {meta?.reason_codes?.length > 0 && (
                <div>
                  <span style={{ ...V42_KK, display: 'block', marginBottom: 3 }}>Reason Codes ({meta.reason_codes.length}):</span>
                  {meta.reason_codes.slice(0, 20).map((rc: string, i: number) => (
                    <div key={i} style={{ fontSize: 7, color: C.dim, fontFamily: C.font, paddingLeft: 8 }}>· {rc}</div>
                  ))}
                </div>
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
const TECH_FIELDS: Array<{ label: string; keys: string[]; fmt?: 'pct' | 'large' | 'price' | 'raw' | 'mult'; colorFn?: (v: any) => string }> = [
  { label: 'Stage',            keys: ['stage', 'stage_label', 'technical_stage'],                fmt: 'raw' },
  { label: 'Technical State',  keys: ['technical_state', 'technical_state_label', 'tech_state'], fmt: 'raw' },
  { label: 'MA Stack',         keys: ['ma_stack', 'ma_alignment', 'ema_alignment'],              fmt: 'raw' },
  { label: 'Entry Zone',       keys: ['entry_zone', 'entry_state', 'entry_state_display'],       fmt: 'raw' },
  { label: 'Breakout Signal',  keys: ['breakout_signal', 'breakout'],                            fmt: 'raw' },
  { label: 'Momentum Trend',   keys: ['momentum_trend', 'momentum'],                             fmt: 'raw' },
  { label: 'Accum/Dist',       keys: ['accum_dist', 'accumulation_distribution', 'ad_state'],   fmt: 'raw' },
  { label: 'Squeeze',          keys: ['squeeze', 'squeeze_state', 'squeeze_signal'],             fmt: 'raw' },
  { label: 'Extension Risk',   keys: ['extension_risk', 'extension_state', 'chase_extension'],  fmt: 'raw' },
  { label: '% vs 50D',         keys: ['pct_vs_50d', 'percent_vs_50d', 'price_vs_50d_pct', 'vs_50d'],     fmt: 'pct' },
  { label: '% vs 200D',        keys: ['pct_vs_200d', 'percent_vs_200d', 'price_vs_200d_pct', 'vs_200d'], fmt: 'pct' },
  { label: '% From 52W High',  keys: ['pct_from_52w_high', 'dist_52w_high', 'from_52w_high'],    fmt: 'pct' },
  { label: '52W Position',     keys: ['pos_52w', 'position_52w', 'pos_52wk'],                    fmt: 'pct' },
  { label: 'ATR %',            keys: ['atr_pct', 'atr_percent', 'atr'],                          fmt: 'pct' },
  { label: 'Opt Score',        keys: ['options_score', 'opt_score', 'options_alignment_points'], fmt: 'raw' },
  { label: 'Opt Signal',       keys: ['options_signal', 'opt_signal', 'options_snapshot_signal'], fmt: 'raw' },
  { label: 'P/C Ratio',        keys: ['put_call_ratio', 'pc_ratio', 'p_c_ratio'],               fmt: 'raw' },
  { label: 'IV',               keys: ['iv', 'implied_volatility', 'options_iv'],                fmt: 'pct' },
  { label: 'Exp. Move',        keys: ['em', 'expected_move', 'expected_move_pct'],              fmt: 'pct' },
  { label: 'Opt Volume',       keys: ['opt_vol', 'options_volume', 'options_vol'],              fmt: 'large' },
  { label: 'Open Interest',    keys: ['oi', 'open_interest', 'options_oi'],                    fmt: 'large' },
  { label: 'Volume',           keys: ['volume', 'vol'],                                        fmt: 'large' },
  { label: 'Rel. Volume',      keys: ['rel_vol', 'relative_volume', 'volume_ratio', 'volx'],   fmt: 'mult' },
  { label: 'Vol Rank',         keys: ['vol_rank', 'volume_rank', 'vol_rank_pct'],              fmt: 'pct' },
  { label: 'Vol/MC',           keys: ['vol_mc', 'vol_to_market_cap', 'volume_market_cap_ratio'], fmt: 'raw' },
];

function TechnicalTab({ detail, detailLoading, confluenceRow, stock, useRowFallback }: {
  detail?: any; detailLoading: boolean; confluenceRow?: any; stock: any; useRowFallback: boolean;
}) {
  if (detailLoading && !detail) return <LoadingRow label="Loading technical data…" />;

  const tech = detail?.technical ?? {};
  const crRow = confluenceRow ?? {};

  /* Merge sources: backend technical first, quote fallback second for quote fields */
  function resolveField(keys: string[]): any {
    for (const k of keys) {
      const v = tech[k];
      if (v !== null && v !== undefined && v !== '') return v;
    }
    if (useRowFallback) {
      for (const k of keys) {
        const v = crRow[k];
        if (v !== null && v !== undefined && v !== '') return v;
      }
    }
    return undefined;
  }

  function formatVal(val: any, fmt?: string): string {
    if (val === null || val === undefined || val === '') return '—';
    switch (fmt) {
      case 'pct':   return fmtPct(val);
      case 'large': return fmtLarge(val);
      case 'mult':  return fmtMult(val);
      case 'price': { const n = Number(val); return isFinite(n) ? `$${n.toFixed(2)}` : String(val); }
      default:      return typeof val === 'number' ? (isFinite(val) ? val.toFixed(2) : '—') : String(val);
    }
  }

  const rows = TECH_FIELDS.map(f => {
    const val = resolveField(f.keys);
    return { label: f.label, value: formatVal(val, f.fmt), missing: val === undefined };
  }).filter(r => !r.missing);

  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ color: C.dim, fontSize: 12, fontFamily: C.sansFont }}>Technical data unavailable for this ticker.</div>
        {detail?.company && <div style={{ fontSize: 10, color: C.dim, fontFamily: C.font }}>Company: {detail.company.name}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Company / Theme header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4 }}>
        {detail?.company?.name && <span style={{ fontSize: 11, color: C.teal, fontFamily: C.font, fontWeight: 700 }}>{detail.company.name}</span>}
        {(tech.theme || crRow.theme) && (
          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 3, background: `${C.purple}15`, color: C.purple, fontFamily: C.font, border: `1px solid ${C.purple}30` }}>
            {safeStr(tech.theme ?? crRow.theme)}
          </span>
        )}
        {detail?.coverage?.technical_source && (
          <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, marginLeft: 'auto' }}>Source: {detail.coverage.technical_source}</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: C.card, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{r.label}</span>
            <span style={{ fontSize: 11, color: C.text, fontWeight: 600, fontFamily: C.font }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Fundamentals Tab — specific fields + Forward P/E handling
   ═══════════════════════════════════════════════════════════════════ */
type FundField = { label: string; key: string; fmt: 'dollar' | 'pct' | 'mult' | 'raw' | 'date' | 'large' };
const FUND_FIELDS: FundField[] = [
  { label: 'Theme',             key: 'theme',                      fmt: 'raw'   },
  { label: 'Market Cap',        key: 'market_cap',                 fmt: 'large' },
  { label: 'Revenue',           key: 'revenue',                    fmt: 'large' },
  { label: 'Rev Growth Q',      key: 'revenue_growth_q',           fmt: 'pct'   },
  { label: 'Rev Growth Y',      key: 'revenue_growth_y',           fmt: 'pct'   },
  { label: 'Gross Margin',      key: 'gross_margin',               fmt: 'pct'   },
  { label: 'FCF Margin',        key: 'fcf_margin',                 fmt: 'pct'   },
  { label: 'Free Cash Flow',    key: 'free_cash_flow',             fmt: 'large' },
  { label: 'Operating Income',  key: 'operating_income',           fmt: 'large' },
  { label: 'EBIT',              key: 'ebit',                       fmt: 'large' },
  { label: 'P/E',               key: 'pe_ratio',                   fmt: 'mult'  },
  { label: 'P/S',               key: 'ps_ratio',                   fmt: 'mult'  },
  { label: 'EV/EBITDA',         key: 'ev_ebitda',                  fmt: 'mult'  },
  { label: 'EPS Growth',        key: 'eps_growth',                 fmt: 'pct'   },
  { label: 'Debt/Equity',       key: 'debt_equity',                fmt: 'raw'   },
  { label: 'Net Debt/EBITDA',   key: 'net_debt_ebitda',            fmt: 'raw'   },
  { label: 'Insider %',         key: 'insider_percent',            fmt: 'pct'   },
  { label: 'Earnings Date',     key: 'earnings_date',              fmt: 'date'  },
  { label: 'Rev Growth Est',    key: 'revenue_growth_est',         fmt: 'pct'   },
  { label: 'Rev Growth NQ',     key: 'revenue_growth_next_quarter',fmt: 'pct'   },
  { label: 'Rev Growth NY',     key: 'revenue_growth_next_year',   fmt: 'pct'   },
  { label: 'EPS Growth Est',    key: 'eps_growth_est',             fmt: 'pct'   },
  { label: 'EPS Growth TQ',     key: 'eps_growth_this_quarter',    fmt: 'pct'   },
  { label: 'EPS Growth NQ',     key: 'eps_growth_next_quarter',    fmt: 'pct'   },
  { label: 'EPS Growth TY',     key: 'eps_growth_this_year',       fmt: 'pct'   },
  { label: 'EPS Growth NY',     key: 'eps_growth_next_year',       fmt: 'pct'   },
];

function formatFundVal(val: any, fmt: string): string {
  if (val === null || val === undefined || val === '') return '—';
  switch (fmt) {
    case 'pct':   return fmtPct(val);
    case 'mult':  return fmtMult(val);
    case 'large': return fmtLarge(val);
    case 'date':  return String(val);
    default:      return typeof val === 'number' ? (isFinite(val) ? val.toFixed(2) : '—') : String(val);
  }
}

function FundamentalsTab({ detail, detailLoading }: { detail?: any; detailLoading: boolean }) {
  if (detailLoading && !detail) return <LoadingRow label="Loading fundamentals…" />;

  const fund = detail?.fundamentals ?? {};
  const src  = detail?.fundamentals_source;

  const rows = FUND_FIELDS.map(f => ({
    label: f.label,
    value: formatFundVal(fund[f.key], f.fmt),
    missing: fund[f.key] === null || fund[f.key] === undefined || fund[f.key] === '',
  })).filter(r => !r.missing);

  if (rows.length === 0 && !fund.forward_pe) {
    return <div style={{ color: C.dim, fontSize: 12, fontFamily: C.sansFont }}>No fundamental data available for this ticker.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Source metadata */}
      {src && (
        <div style={{ display: 'flex', gap: 12, fontSize: 8, color: C.dim, fontFamily: C.font, marginBottom: 2 }}>
          {src.freshness_status && <span>Freshness: {src.freshness_status.replace(/_/g, ' ')}</span>}
          {src.last_updated && <span>Updated: {String(src.last_updated).slice(0, 10)}</span>}
          {src.missing_fields?.length > 0 && <span>Missing: {src.missing_fields.join(', ')}</span>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: C.card, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{r.label}</span>
            <span style={{ fontSize: 11, color: C.text, fontWeight: 600, fontFamily: C.font }}>{r.value}</span>
          </div>
        ))}

        {/* Forward P/E — special rendering */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: C.card, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>Forward P/E</span>
          {fund.forward_pe != null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: C.text, fontWeight: 600, fontFamily: C.font }}>{Number(fund.forward_pe).toFixed(1)}x</span>
              {fund.forward_pe_is_approximate && (
                <span style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.amber}20`, color: C.amber, fontFamily: C.font, fontWeight: 700, letterSpacing: '0.05em' }}>APPROX.</span>
              )}
              {(fund.forward_pe_warning_codes ?? []).map((wc: string, i: number) => (
                <span key={i} style={{ fontSize: 6, padding: '1px 4px', borderRadius: 2, background: `${C.amber}15`, color: C.amber, fontFamily: C.font }}>{wc.replace(/_/g, ' ')}</span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 11, color: C.dim, fontFamily: C.font }}>—</span>
          )}
        </div>

        {/* Forward P/E source */}
        {fund.forward_pe_source && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: C.card, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>F.P/E Source</span>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: C.font }}>{String(fund.forward_pe_source)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   News Tab — uses ticker-detail backend data, rich catalyst cards
   ═══════════════════════════════════════════════════════════════════ */
function NewsTab({ detail, detailLoading, ticker }: { detail?: any; detailLoading: boolean; ticker: string }) {
  if (detailLoading && !detail) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.dim, fontSize: 12, fontFamily: C.sansFont }}>
        <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
        Loading news for {ticker}…
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const newsData = detail?.news;
  const directArticles: any[] = newsData?.direct_catalyst_articles ?? [];
  const regularArticles: any[] = newsData?.articles ?? [];
  const totalCount = directArticles.length + regularArticles.length;

  if (!newsData) {
    return (
      <div style={{ padding: 14, borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
        <p style={{ color: C.dim, fontSize: 12, margin: 0, fontFamily: C.sansFont }}>
          News data is not available for <strong style={{ color: C.text }}>{ticker}</strong>.
        </p>
      </div>
    );
  }
  if (totalCount === 0) {
    return <div style={{ color: C.dim, fontSize: 12, fontFamily: C.sansFont }}>No recent news cached for <strong style={{ color: C.text }}>{ticker}</strong>.</div>;
  }

  const renderDirectCard = (item: any, idx: number) => {
    const tier = item.catalyst_event_tier ?? item.event_tier ?? item.tier ?? '';
    const isBearish = tier === 'TIER_E' || item.is_bearish_conflict;
    const tc = isBearish ? C.red : tierColor(tier);

    return (
      <div key={`dc-${idx}`} style={{ background: `${tc}06`, border: `1px solid ${tc}25`, borderRadius: 5, padding: '10px 12px', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 7, fontWeight: 800, color: isBearish ? C.red : C.amber, fontFamily: C.font, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
            {isBearish ? 'Bearish Catalyst' : 'Direct Catalyst'}
          </span>
          {tier && (
            <span style={{ fontSize: 7, padding: '1px 5px', borderRadius: 2, background: `${tc}15`, color: tc, fontFamily: C.font, fontWeight: 700 }}>
              {tier.replace('_', ' ')}
            </span>
          )}
          {(item.catalyst_event_type || item.event_type) && (
            <span style={{ fontSize: 7, color: C.dim, fontFamily: C.font }}>{item.catalyst_event_type ?? item.event_type}</span>
          )}
          {item.catalyst_score != null && (
            <span style={{ fontSize: 7, color: tc, fontFamily: C.font, marginLeft: 'auto' }}>score {Number(item.catalyst_score).toFixed(1)}</span>
          )}
        </div>

        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 12, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5, display: 'block' }}>{item.title}</span>
        </a>

        {item.summary && (
          <p style={{ fontSize: 10, color: C.dim, fontFamily: C.sansFont, lineHeight: 1.4, margin: '4px 0 0' }}>
            {item.summary.slice(0, 200)}{item.summary.length > 200 ? '…' : ''}
          </p>
        )}

        {/* Catalyst explanation */}
        {item.catalyst_explanation && (
          <p style={{ fontSize: 10, color: C.teal, fontFamily: C.sansFont, lineHeight: 1.5, margin: '6px 0 0', fontStyle: 'italic' }}>{item.catalyst_explanation}</p>
        )}

        {/* Materiality / Freshness / Relevance mini fields */}
        {(item.materiality_score != null || item.freshness_score != null || item.relevance_score != null) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
            {item.materiality_score != null && <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font }}>mat {Number(item.materiality_score).toFixed(1)}</span>}
            {item.freshness_score != null && <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font }}>fresh {Number(item.freshness_score).toFixed(1)}</span>}
            {item.relevance_score != null && <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font }}>rel {Number(item.relevance_score).toFixed(1)}</span>}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
          <span style={{ fontSize: 9, color: C.teal, fontFamily: C.font }}>{item.source}</span>
          {item.published_at && <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>{timeAgo(item.published_at)}</span>}
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
      <span style={{ fontSize: 12, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5 }}>{item.title}</span>
      {item.summary && (
        <span style={{ fontSize: 10, color: C.dim, fontFamily: C.sansFont, lineHeight: 1.4 }}>
          {item.summary.slice(0, 150)}{item.summary.length > 150 ? '…' : ''}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, color: C.teal, fontFamily: C.font }}>{item.source}</span>
        {item.published_at && <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>{timeAgo(item.published_at)}</span>}
        {item.rss_providers?.length > 0 && (
          <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, marginLeft: 'auto' }}>
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
        <span style={{ fontSize: 13, fontWeight: 800, color: C.text, fontFamily: C.font }}>
          {totalCount} ARTICLE{totalCount !== 1 ? 'S' : ''}
        </span>
        {directArticles.length > 0 && (
          <span style={{ fontSize: 9, color: C.amber, fontFamily: C.font, marginLeft: 8 }}>
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
          <button onClick={onGenerate} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: C.font, cursor: 'pointer', border: `1px solid ${C.border}`, background: C.card, color: C.dim }}>
            <RefreshCw style={{ width: 12, height: 12 }} />Regenerate
          </button>
        </div>
        {data.grok   && <ReportSection title="Grok — X/Twitter Sentiment" color={C.bright}  content={data.grok} />}
        {data.gemini && <ReportSection title="Gemini — Google Headlines"   color={C.blue}    content={data.gemini} />}
        {(data.claude || data.gpt) && <ReportSection title={data.claude ? 'Claude — Deep Analysis' : 'GPT — Deep Analysis'} color={C.purple} content={data.claude || data.gpt} />}
        {data.summary && (<div><SectionLabel>Combined Summary</SectionLabel><div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}><p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>{data.summary}</p></div></div>)}
        {(data.bull_case || data.bear_case) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {data.bull_case && (<div style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 6, padding: 14 }}><span style={{ fontSize: 9, fontWeight: 800, color: C.green, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bull Case</span><p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: C.sansFont, marginTop: 8, marginBottom: 0 }}>{data.bull_case}</p></div>)}
            {data.bear_case && (<div style={{ background: `${C.red}08`, border: `1px solid ${C.red}20`, borderRadius: 6, padding: 14 }}><span style={{ fontSize: 9, fontWeight: 800, color: C.red, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bear Case</span><p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: C.sansFont, marginTop: 8, marginBottom: 0 }}>{data.bear_case}</p></div>)}
          </div>
        )}
        {data.risk_factors?.length > 0 && (<div><SectionLabel>Risk Factors</SectionLabel><ul style={{ margin: 0, paddingLeft: 18 }}>{data.risk_factors.map((r: string, i: number) => (<li key={i} style={{ fontSize: 11, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5 }}>{r}</li>))}</ul></div>)}
      </div>
    );
  }
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.teal, fontSize: 12, fontFamily: C.font }}>
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
          <span style={{ fontSize: 10, fontWeight: 800, color: C.red, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>Generation Failed</span>
          <span style={{ fontSize: 11, color: C.red, fontFamily: C.sansFont, lineHeight: 1.5 }}>{error}</span>
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
        <div style={{ fontSize: 14, fontWeight: 800, color: C.bright, fontFamily: C.sansFont, marginBottom: 4 }}>AI Deep Dive — {ticker}</div>
        <p style={{ fontSize: 12, color: C.dim, fontFamily: C.sansFont, margin: 0, lineHeight: 1.5 }}>Select which AI models to query.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MODEL_OPTIONS.map(opt => {
          const checked = selectedModels.includes(opt.id);
          return (
            <div key={opt.id} role="button" tabIndex={0} onClick={() => toggleModel(opt.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleModel(opt.id); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 6, cursor: 'pointer', background: checked ? `${opt.color}08` : C.card, border: `1px solid ${checked ? opt.color + '40' : C.border}`, textAlign: 'left', transition: 'all 0.15s', userSelect: 'none' }}>
              {checked ? <CheckSquare style={{ width: 16, height: 16, color: opt.color, flexShrink: 0 }} /> : <Square style={{ width: 16, height: 16, color: C.dim, flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: checked ? opt.color : C.text, fontFamily: C.font }}>{opt.label}</div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: C.sansFont, marginTop: 2 }}>{opt.desc}</div>
              </div>
              {opt.id === 'claude_gpt' && checked && (
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {(['claude', 'gpt'] as const).map(m => (
                    <button key={m} onClick={() => setReportModel(m)} style={{ padding: '3px 10px', borderRadius: 3, fontSize: 9, fontWeight: 700, fontFamily: C.font, cursor: 'pointer', background: reportModel === m ? `${C.purple}30` : 'transparent', border: `1px solid ${reportModel === m ? C.purple : C.border}`, color: reportModel === m ? C.purple : C.dim }}>{m.toUpperCase()}</button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onGenerate} disabled={loading || selectedModels.length === 0}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 24px', borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: C.font, cursor: selectedModels.length === 0 ? 'not-allowed' : 'pointer', background: selectedModels.length === 0 ? C.card : `linear-gradient(135deg, ${C.teal}, ${C.purple})`, border: 'none', color: selectedModels.length === 0 ? C.dim : '#000', opacity: loading ? 0.7 : 1, transition: 'all 0.2s' }}>
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
        <span style={{ fontSize: 9, fontWeight: 800, color, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
        <p style={{ fontSize: 11, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0, whiteSpace: 'pre-wrap' }}>{text}</p>
      </div>
    </div>
  );
}

/* ── Shared sub-components ───────────────────────────────────────── */
function LoadingRow({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.dim, fontSize: 11, fontFamily: C.sansFont, padding: '8px 0' }}>
      <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite', flexShrink: 0 }} />
      {label}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 800, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
      {children}
    </div>
  );
}
function InfoCard({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 12, borderLeft: `3px solid ${color}` }}>
      <span style={{ fontSize: 8, fontWeight: 800, color, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ fontSize: 11, color: C.text, fontFamily: C.sansFont, lineHeight: 1.6, marginTop: 6 }}>{children}</div>
    </div>
  );
}
function MetricBox({ label, value, raw, colored }: { label: string; value?: any; raw?: boolean; colored?: 'green' | 'red' }) {
  if (value === undefined || value === null || value === '') return null;
  const display = raw ? String(value) : (typeof value === 'number' ? value.toFixed(1) : String(value));
  const col = colored === 'green' ? C.green : colored === 'red' ? C.red : C.text;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 10px', background: C.card, borderRadius: 4, border: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 13, color: col, fontWeight: 700, fontFamily: C.font, marginTop: 2 }}>{display}</span>
    </div>
  );
}
