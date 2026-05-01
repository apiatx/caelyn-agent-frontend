import { useState, useEffect, useMemo } from 'react';
import { X, TrendingUp, BookOpen, Newspaper, Brain, Loader2, Zap, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes';
import { mergeRealtimeQuote } from '@/lib/mergeRealtimeQuote';
import { PriceFreshnessBadge } from '@/components/PriceFreshnessBadge';

/* ── color tokens ─────────────────────────────────────────────────── */
const C = {
  bg: '#080c13', card: '#0d1623', card2: '#0a1020',
  border: '#1a2540', text: '#e2e8f0', dim: '#64748b',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  bright: '#fff',
  font: "'JetBrains Mono','Fira Code',monospace",
  sansFont: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

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

function fmtNumber(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6)  return (num / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3)  return (num / 1e3).toFixed(1) + 'K';
  if (Number.isInteger(num)) return num.toLocaleString();
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

/* ── types ───────────────────────────────────────────────────────── */
interface NewsItem {
  ticker?: string;
  title: string;
  summary?: string;
  url: string;
  published_at: string;
  source: string;
}

interface StockDetailModalProps {
  ticker: string;
  analysis: any;
  csvData?: any[];
  newsItems: NewsItem[];
  onClose: () => void;
}

type TabId = 'overview' | 'fundamentals' | 'news' | 'deep-dive';

/* ── find stock in either format ─────────────────────────────────── */
function findStockInAnalysis(analysis: any, ticker: string): any | null {
  if (!analysis) return null;
  const t = ticker.toUpperCase();

  // New format: sections[*].tickers[*].symbol
  if (Array.isArray(analysis.sections)) {
    for (const section of analysis.sections) {
      const arr = Array.isArray(section.tickers) ? section.tickers : [];
      const found = arr.find((s: any) => (s.symbol || s.ticker)?.toUpperCase() === t);
      if (found) return { ...found, _section: section.title, _format: 'new' };
    }
  }

  // Old format: top_buys, most_undervalued, best_catalysts, hidden_gems, etc.
  const cats = ['top_buys', 'most_undervalued', 'best_catalysts', 'hidden_gems', 'most_revolutionary', 'right_sector'];
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
   STOCK DETAIL MODAL
   ═══════════════════════════════════════════════════════════════════ */
export function StockDetailModal({ ticker, analysis, csvData, newsItems, onClose }: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [deepDive, setDeepDive] = useState<any>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>(['grok', 'gemini', 'claude']);
  const [reportModel, setReportModel] = useState<'claude' | 'gpt'>('claude');

  /* ── find stock ─────────────────────────────────────────────────── */
  const baseStock = findStockInAnalysis(analysis, ticker);

  /* ── realtime hydration ──────────────────────────────────────────── */
  const tickerSymbols = useMemo(() => (ticker ? [ticker] : []), [ticker]);
  const { quotesBySymbol: realtimeQuotes } = useRealtimeQuotes(tickerSymbols, { enabled: !!ticker });
  const stock = useMemo(() => {
    const rt = ticker ? realtimeQuotes[ticker.toUpperCase()] : undefined;
    if (!baseStock && !rt) return null;
    return rt ? mergeRealtimeQuote(baseStock || { symbol: ticker }, rt) : baseStock;
  }, [baseStock, realtimeQuotes, ticker]);

  /* ── find CSV row ───────────────────────────────────────────────── */
  const csvRow = csvData?.find((r: any) => {
    const t = r.ticker || r.Ticker || r.TICKER || r.symbol || r.Symbol;
    return t?.toUpperCase() === ticker.toUpperCase();
  });

  /* ── generate AI deep dive ──────────────────────────────────────── */
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
          const msg = body.detail || body.error || body.message
            || (r.status === 502 ? 'Backend service unavailable — the deep-dive endpoint is not yet implemented on the server.'
              : r.status === 504 ? 'Request timed out — LLM calls are slow, try again.'
              : `Server error ${r.status}`);
          throw new Error(msg);
        }
        return r.json();
      })
      .then(data => { setDeepDive(data); setDeepDiveLoading(false); })
      .catch(err => { setDeepDiveError(err.message); setDeepDiveLoading(false); });
  };

  /* ── close on escape ─────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const sigCol = signalColor(stock?.signal);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',    label: 'Overview',    icon: <TrendingUp style={{ width: 13, height: 13 }} /> },
    { id: 'fundamentals',label: 'Fundamentals',icon: <BookOpen   style={{ width: 13, height: 13 }} /> },
    { id: 'news',        label: 'News',        icon: <Newspaper  style={{ width: 13, height: 13 }} /> },
    { id: 'deep-dive',   label: 'AI Deep Dive',icon: <Brain      style={{ width: 13, height: 13 }} /> },
  ];

  const companyName = stock?.name || stock?.company || '';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 920, maxHeight: '92vh',
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 10, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Modal Header ── */}
        <div style={{
          padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
          background: C.card,
        }}>
          <span style={{ fontSize: 20, fontWeight: 900, fontFamily: C.font, color: C.bright }}>
            {ticker}
          </span>
          {companyName && (
            <span style={{ fontSize: 12, color: C.dim, fontFamily: C.sansFont }}>{companyName}</span>
          )}
          {stock?._section && (
            <span style={{
              padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700,
              fontFamily: C.font, color: C.purple, background: `${C.purple}15`,
              border: `1px solid ${C.purple}30`,
            }}>
              {stock._section}
            </span>
          )}
          {stock?.signal && (
            <span style={{
              padding: '3px 10px', borderRadius: 3,
              fontSize: 9, fontWeight: 800, fontFamily: C.font,
              color: '#000', background: sigCol,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {stock.signal}
            </span>
          )}
          {stock?.risk_level && (
            <span style={{
              padding: '2px 8px', borderRadius: 3, fontSize: 9, fontWeight: 700,
              fontFamily: C.font, color: riskColor(stock.risk_level),
              background: `${riskColor(stock.risk_level)}15`,
              border: `1px solid ${riskColor(stock.risk_level)}30`,
            }}>
              {stock.risk_level} RISK
            </span>
          )}
          {stock?.change_pct != null && (
            <span style={{
              fontSize: 12, fontWeight: 700, fontFamily: C.font,
              color: stock.change_pct >= 0 ? C.green : C.red,
            }}>
              {stock.change_pct >= 0 ? '+' : ''}{typeof stock.change_pct === 'number' ? stock.change_pct.toFixed(2) : stock.change_pct}%
            </span>
          )}
          {stock?.price_source && (
            <PriceFreshnessBadge
              meta={{
                source: stock.price_source,
                is_realtime: stock.price_is_realtime,
                is_live_backup: stock.price_is_live_backup,
                is_stale: stock.price_is_stale,
                staleness_seconds: stock.staleness_seconds,
                quote_timestamp: stock.quote_timestamp,
                updated_at: stock.price_updated_at,
              }}
            />
          )}
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: C.dim, cursor: 'pointer', padding: 4, background: 'none', border: 'none' }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: `1px solid ${C.border}`,
          padding: '0 20px', background: C.card,
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '9px 14px', fontSize: 10, fontWeight: 700,
                fontFamily: C.font, cursor: 'pointer',
                color: activeTab === tab.id ? C.teal : C.dim,
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? C.teal : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeTab === 'overview' && <OverviewTab stock={stock} ticker={ticker} />}
          {activeTab === 'fundamentals' && <FundamentalsTab csvRow={csvRow} stock={stock} />}
          {activeTab === 'news' && <NewsTab ticker={ticker} items={newsItems} />}
          {activeTab === 'deep-dive' && (
            <DeepDiveTab
              ticker={ticker}
              data={deepDive}
              loading={deepDiveLoading}
              error={deepDiveError}
              selectedModels={selectedModels}
              setSelectedModels={setSelectedModels}
              reportModel={reportModel}
              setReportModel={setReportModel}
              onGenerate={generateDeepDive}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Overview Tab ═══════════════════════════════════════════════════ */
function OverviewTab({ stock, ticker }: { stock: any; ticker: string }) {
  const exchange = ticker.startsWith('BTC') || ticker.startsWith('ETH') ? 'BINANCE' : 'NASDAQ';
  const tvUrl = `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=520&interval=D&range=3M&style=1&toolbar_bg=0d1623&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=exchange&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${exchange}:${ticker}`;

  const isNewFmt = stock?._format === 'new';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* TradingView Chart */}
      <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <iframe
          key={ticker}
          src={tvUrl}
          style={{ width: '100%', height: 520, border: 'none', display: 'block' }}
          title={`${ticker} chart`}
        />
      </div>

      {/* New format overview */}
      {isNewFmt && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Catalyst */}
          {stock.catalyst && (
            <div>
              <SectionLabel>Catalyst</SectionLabel>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>
                {stock.catalyst}
              </p>
            </div>
          )}

          {/* Sentiment + Action grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {stock.sentiment && (
              <InfoCard label="Sentiment" color={C.blue}>{stock.sentiment}</InfoCard>
            )}
            {stock.action_note && (
              <InfoCard label="Action Note" color={C.amber}>{stock.action_note}</InfoCard>
            )}
          </div>

          {/* Price info */}
          {(stock.price != null) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
              <MetricBox label="Price" value={`$${typeof stock.price === 'number' ? stock.price.toFixed(2) : stock.price}`} raw />
              {stock.change_pct != null && (
                <MetricBox label="Change" value={`${stock.change_pct >= 0 ? '+' : ''}${typeof stock.change_pct === 'number' ? stock.change_pct.toFixed(2) : stock.change_pct}%`} raw colored={stock.change_pct >= 0 ? 'green' : 'red'} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Old format overview */}
      {!isNewFmt && stock && (
        <>
          {stock.thesis && (
            <div>
              <SectionLabel>Investment Thesis</SectionLabel>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>{stock.thesis}</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {stock.why_now && <InfoCard label="Why Now" color={C.amber}>{stock.why_now}</InfoCard>}
            {stock.sentiment && (
              <InfoCard label="Sentiment" color={C.blue}>
                {stock.sentiment}
                {stock.reason && <div style={{ marginTop: 6, fontSize: 10, color: C.dim }}>{stock.reason}</div>}
              </InfoCard>
            )}
            {stock.moat && <InfoCard label="Competitive Moat" color={C.purple}>{stock.moat}</InfoCard>}
          </div>
          {stock.catalysts?.length > 0 && (
            <div>
              <SectionLabel>Catalysts</SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {stock.catalysts.map((cat: string, i: number) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: 4,
                    fontSize: 10, fontWeight: 600, fontFamily: C.font,
                    color: C.teal, background: `${C.teal}12`, border: `1px solid ${C.teal}25`,
                  }}>{cat}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <SectionLabel>Valuation Metrics</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
              <MetricBox label="P/S"        value={stock.ps_ratio} />
              <MetricBox label="P/E"        value={stock.pe_ratio} />
              <MetricBox label="P/FCF"      value={stock.pfcf} />
              <MetricBox label="EV/Revenue" value={stock.ev_revenue} />
              <MetricBox label="PEG"        value={stock.peg} />
              <MetricBox label="vs Peers"   value={stock.vs_peers} />
            </div>
          </div>
        </>
      )}

      {/* No analysis fallback */}
      {!stock && (
        <div style={{ padding: 16, borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.dim, fontSize: 12, margin: 0, fontFamily: C.sansFont }}>
            No analysis data available for <strong style={{ color: C.text }}>{ticker}</strong>. Generate an AI Deep Dive for a full report.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══ Fundamentals Tab ══════════════════════════════════════════════ */
function FundamentalsTab({ csvRow, stock }: { csvRow: any; stock: any }) {
  const data = csvRow || stock || {};
  const entries = Object.entries(data).filter(([k, v]) =>
    !['display_type', 'catalysts', 'thesis', '_format', '_section'].includes(k) &&
    typeof v !== 'object' && v !== null && v !== undefined && v !== ''
  );

  if (entries.length === 0) {
    return (
      <div style={{ color: C.dim, fontSize: 12, fontFamily: C.sansFont }}>
        No fundamental data available for this ticker.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
      {entries.map(([key, val]) => (
        <div key={key} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '7px 12px', background: C.card,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {key.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: 11, color: C.text, fontWeight: 600, fontFamily: C.font, textAlign: 'right' }}>
            {typeof val === 'number' ? fmtNumber(val) : String(val)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══ News Tab ══════════════════════════════════════════════════════ */
function NewsTab({ ticker, items }: { ticker: string; items: NewsItem[] }) {
  const [fetched, setFetched] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tried, setTried] = useState(false);

  // If parent already provided news, use those. Otherwise fetch on demand.
  useEffect(() => {
    if (items.length > 0 || tried) return;
    setTried(true);
    setLoading(true);
    fetch(`/api/proxy/news/ticker?tickers=${encodeURIComponent(ticker)}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : {})
      .then((data: any) => {
        // data may be { [ticker]: NewsItem[] } or NewsItem[]
        let arr: NewsItem[] = [];
        if (Array.isArray(data)) {
          arr = data;
        } else if (typeof data === 'object') {
          const key = Object.keys(data).find(k => k.toUpperCase() === ticker.toUpperCase());
          if (key && Array.isArray(data[key])) arr = data[key];
          else arr = Object.values(data).flat() as NewsItem[];
        }
        setFetched(arr);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticker, items.length, tried]);

  const allItems = items.length > 0 ? items : fetched;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.dim, fontSize: 12 }}>
        <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
        Fetching latest news for {ticker}...
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div style={{ color: C.dim, fontSize: 12, fontFamily: C.sansFont }}>
        No news available for <strong style={{ color: C.text }}>{ticker}</strong> right now.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {allItems.slice(0, 15).map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: '11px 14px', borderRadius: 4,
            textDecoration: 'none', transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.card}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 12, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5 }}>
            {item.title}
          </span>
          {item.summary && (
            <span style={{ fontSize: 11, color: C.dim, fontFamily: C.sansFont, lineHeight: 1.4 }}>
              {item.summary.slice(0, 150)}{item.summary.length > 150 ? '…' : ''}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, color: C.teal, fontFamily: C.font }}>{item.source}</span>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>{timeAgo(item.published_at)}</span>
          </div>
        </a>
      ))}
    </div>
  );
}

/* ═══ Deep Dive Tab ═════════════════════════════════════════════════ */
const MODEL_OPTIONS = [
  { id: 'grok',   label: 'Grok',   desc: 'X/Twitter sentiment, real-time news', color: C.bright },
  { id: 'gemini', label: 'Gemini', desc: 'Google search headlines, web intelligence', color: C.blue },
  { id: 'claude_gpt', label: 'Claude / GPT', desc: 'Deep reasoning & report structuring', color: C.purple },
];

interface DeepDiveTabProps {
  ticker: string;
  data: any;
  loading: boolean;
  error: string | null;
  selectedModels: string[];
  setSelectedModels: (m: string[]) => void;
  reportModel: 'claude' | 'gpt';
  setReportModel: (m: 'claude' | 'gpt') => void;
  onGenerate: () => void;
}

function DeepDiveTab({
  ticker, data, loading, error,
  selectedModels, setSelectedModels,
  reportModel, setReportModel,
  onGenerate,
}: DeepDiveTabProps) {

  const toggleModel = (id: string) => {
    setSelectedModels(
      selectedModels.includes(id)
        ? selectedModels.filter(m => m !== id)
        : [...selectedModels, id]
    );
  };

  /* Show report if we have data */
  if (data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Re-generate button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onGenerate}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 4,
              fontSize: 10, fontWeight: 700, fontFamily: C.font,
              cursor: 'pointer', border: `1px solid ${C.border}`,
              background: C.card, color: C.dim,
            }}
          >
            <RefreshCw style={{ width: 12, height: 12 }} />
            Regenerate
          </button>
        </div>

        {/* Grok section */}
        {data.grok && (
          <ReportSection title="Grok — X/Twitter Sentiment" color={C.bright} content={data.grok} />
        )}

        {/* Gemini section */}
        {data.gemini && (
          <ReportSection title="Gemini — Google Headlines" color={C.blue} content={data.gemini} />
        )}

        {/* Claude/GPT section */}
        {(data.claude || data.gpt) && (
          <ReportSection
            title={data.claude ? 'Claude — Deep Analysis' : 'GPT — Deep Analysis'}
            color={C.purple}
            content={data.claude || data.gpt}
          />
        )}

        {/* Combined summary */}
        {data.summary && (
          <div>
            <SectionLabel>Combined Summary</SectionLabel>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16 }}>
              <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>{data.summary}</p>
            </div>
          </div>
        )}

        {/* Bull / Bear */}
        {(data.bull_case || data.bear_case) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {data.bull_case && (
              <div style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, borderRadius: 6, padding: 14 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: C.green, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bull Case</span>
                <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: C.sansFont, marginTop: 8, marginBottom: 0 }}>{data.bull_case}</p>
              </div>
            )}
            {data.bear_case && (
              <div style={{ background: `${C.red}08`, border: `1px solid ${C.red}20`, borderRadius: 6, padding: 14 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: C.red, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bear Case</span>
                <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: C.sansFont, marginTop: 8, marginBottom: 0 }}>{data.bear_case}</p>
              </div>
            )}
          </div>
        )}

        {/* Risk factors */}
        {data.risk_factors?.length > 0 && (
          <div>
            <SectionLabel>Risk Factors</SectionLabel>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data.risk_factors.map((r: string, i: number) => (
                <li key={i} style={{ fontSize: 11, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5 }}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Technical + Analyst */}
        {data.technical_outlook && (
          <div>
            <SectionLabel>Technical Outlook</SectionLabel>
            <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: C.sansFont, margin: 0 }}>{data.technical_outlook}</p>
          </div>
        )}
        {data.analyst_sentiment && (
          <div>
            <SectionLabel>Analyst Sentiment</SectionLabel>
            <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: C.sansFont, margin: 0 }}>{data.analyst_sentiment}</p>
          </div>
        )}
      </div>
    );
  }

  /* Loading skeleton */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.teal, fontSize: 12, fontFamily: C.font }}>
          <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          Querying {selectedModels.join(', ')} for {ticker}...
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: C.card, borderRadius: 6, height: 70 + i * 18, opacity: 0.35, animation: 'pulse 1.5s infinite' }} />
        ))}
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.35}50%{opacity:.6}}`}</style>
      </div>
    );
  }

  /* Error state */
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 6,
          background: `${C.red}10`, border: `1px solid ${C.red}30`,
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: C.red, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Generation Failed
          </span>
          <span style={{ fontSize: 11, color: C.red, fontFamily: C.sansFont, lineHeight: 1.5 }}>
            {error}
          </span>
        </div>
        <ModelPicker
          ticker={ticker}
          selectedModels={selectedModels}
          toggleModel={toggleModel}
          reportModel={reportModel}
          setReportModel={setReportModel}
          onGenerate={onGenerate}
          loading={loading}
        />
      </div>
    );
  }

  /* Initial state — show picker */
  return (
    <ModelPicker
      ticker={ticker}
      selectedModels={selectedModels}
      toggleModel={toggleModel}
      reportModel={reportModel}
      setReportModel={setReportModel}
      onGenerate={onGenerate}
      loading={loading}
    />
  );
}

/* ── Model Picker ─────────────────────────────────────────────────── */
function ModelPicker({ ticker, selectedModels, toggleModel, reportModel, setReportModel, onGenerate, loading }: {
  ticker: string;
  selectedModels: string[];
  toggleModel: (id: string) => void;
  reportModel: 'claude' | 'gpt';
  setReportModel: (m: 'claude' | 'gpt') => void;
  onGenerate: () => void;
  loading: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.bright, fontFamily: C.sansFont, marginBottom: 4 }}>
          AI Deep Dive — {ticker}
        </div>
        <p style={{ fontSize: 12, color: C.dim, fontFamily: C.sansFont, margin: 0, lineHeight: 1.5 }}>
          Select which AI models to query. Each plays to its strengths to build a complete picture of this asset.
        </p>
      </div>

      {/* Model cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {MODEL_OPTIONS.map(opt => {
          const checked = selectedModels.includes(opt.id);
          return (
            <div
              key={opt.id}
              role="button"
              tabIndex={0}
              onClick={() => toggleModel(opt.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleModel(opt.id); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 6, cursor: 'pointer',
                background: checked ? `${opt.color}08` : C.card,
                border: `1px solid ${checked ? opt.color + '40' : C.border}`,
                textAlign: 'left', transition: 'all 0.15s', userSelect: 'none',
              }}
            >
              {checked
                ? <CheckSquare style={{ width: 16, height: 16, color: opt.color, flexShrink: 0 }} />
                : <Square      style={{ width: 16, height: 16, color: C.dim,      flexShrink: 0 }} />
              }
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: checked ? opt.color : C.text, fontFamily: C.font }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: C.sansFont, marginTop: 2 }}>
                  {opt.desc}
                </div>
              </div>

              {/* Claude/GPT sub-selector */}
              {opt.id === 'claude_gpt' && checked && (
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  {(['claude', 'gpt'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setReportModel(m)}
                      style={{
                        padding: '3px 10px', borderRadius: 3,
                        fontSize: 9, fontWeight: 700, fontFamily: C.font,
                        cursor: 'pointer',
                        background: reportModel === m ? `${C.purple}30` : 'transparent',
                        border: `1px solid ${reportModel === m ? C.purple : C.border}`,
                        color: reportModel === m ? C.purple : C.dim,
                      }}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={loading || selectedModels.length === 0}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 24px', borderRadius: 6,
          fontSize: 12, fontWeight: 800, fontFamily: C.font,
          cursor: selectedModels.length === 0 ? 'not-allowed' : 'pointer',
          background: selectedModels.length === 0 ? C.card : `linear-gradient(135deg, ${C.teal}, ${C.purple})`,
          border: 'none', color: selectedModels.length === 0 ? C.dim : '#000',
          opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
        }}
      >
        <Zap style={{ width: 14, height: 14 }} />
        Generate Deep Dive Report
      </button>

      {selectedModels.length === 0 && (
        <p style={{ fontSize: 10, color: C.red, fontFamily: C.font, margin: 0, textAlign: 'center' }}>
          Select at least one model to generate a report.
        </p>
      )}

      {/* Info note */}
      <div style={{ padding: 12, borderRadius: 6, background: C.card, border: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 10, color: C.dim, fontFamily: C.sansFont, margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: C.text }}>How it works:</strong> Grok queries X/Twitter for real-time sentiment and breaking news. 
          Gemini searches Google for analyst upgrades, headlines, and web intelligence. 
          Claude/GPT synthesizes everything into a structured analysis with bull/bear cases and risk factors.
          Generation typically takes 20-40 seconds.
        </p>
      </div>
    </div>
  );
}

/* ── Report Section (for deep dive) ──────────────────────────────── */
function ReportSection({ title, color, content }: { title: string; color: string; content: any }) {
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 3, height: 14, background: color, borderRadius: 2 }} />
        <span style={{ fontSize: 9, fontWeight: 800, color, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {title}
        </span>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
        <p style={{ fontSize: 11, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0, whiteSpace: 'pre-wrap' }}>
          {text}
        </p>
      </div>
    </div>
  );
}

/* ═══ Shared sub-components ═════════════════════════════════════════ */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, color: C.dim, fontFamily: C.font,
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
    }}>
      {children}
    </div>
  );
}

function InfoCard({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
      padding: 12, borderLeft: `3px solid ${color}`,
    }}>
      <span style={{ fontSize: 8, fontWeight: 800, color, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <div style={{ fontSize: 11, color: C.text, fontFamily: C.sansFont, lineHeight: 1.6, marginTop: 6 }}>
        {children}
      </div>
    </div>
  );
}

function MetricBox({ label, value, raw, colored }: { label: string; value?: any; raw?: boolean; colored?: 'green' | 'red' }) {
  if (value === undefined || value === null || value === '') return null;
  const display = raw ? String(value) : (typeof value === 'number' ? value.toFixed(1) : String(value));
  const col = colored === 'green' ? C.green : colored === 'red' ? C.red : C.text;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '6px 10px', background: C.card,
      borderRadius: 4, border: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 13, color: col, fontWeight: 700, fontFamily: C.font, marginTop: 2 }}>{display}</span>
    </div>
  );
}
