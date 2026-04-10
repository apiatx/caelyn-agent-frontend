import { useState, useEffect } from 'react';
import { X, TrendingUp, BookOpen, Newspaper, Brain, Loader2 } from 'lucide-react';

/* ── color tokens (Hyperliquid style) ──────────────────────────────── */
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

/* ── number formatter ───────────────────────────────────────────────── */
function fmtNumber(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return String(val);
  const abs = Math.abs(num);
  if (abs >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (num / 1e3).toFixed(1) + 'K';
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

/* ── types ───────────────────────────────────────────────────────────── */
interface NewsItem {
  ticker: string;
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

/* ═══════════════════════════════════════════════════════════════════════
   STOCK DETAIL MODAL
   ═══════════════════════════════════════════════════════════════════════ */
export function StockDetailModal({ ticker, analysis, csvData, newsItems, onClose }: StockDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [deepDive, setDeepDive] = useState<any>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);

  /* ── find stock in analysis ─────────────────────────────────────── */
  const findStock = () => {
    if (!analysis) return null;
    const cats = ['top_buys', 'most_undervalued', 'best_catalysts', 'hidden_gems', 'most_revolutionary', 'right_sector'];
    for (const cat of cats) {
      const arr = analysis[cat];
      if (Array.isArray(arr)) {
        const found = arr.find((s: any) => s.ticker?.toUpperCase() === ticker.toUpperCase());
        if (found) return found;
      }
    }
    return null;
  };
  const stock = findStock();

  /* ── find CSV row ───────────────────────────────────────────────── */
  const csvRow = csvData?.find((r: any) => {
    const t = r.ticker || r.Ticker || r.TICKER || r.symbol || r.Symbol;
    return t?.toUpperCase() === ticker.toUpperCase();
  });

  /* ── lazy load deep dive ────────────────────────────────────────── */
  useEffect(() => {
    if (activeTab !== 'deep-dive' || deepDive || deepDiveLoading) return;
    setDeepDiveLoading(true);
    setDeepDiveError(null);
    fetch(`/api/watchlist/stock/${encodeURIComponent(ticker)}`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(data => { setDeepDive(data); setDeepDiveLoading(false); })
      .catch(err => { setDeepDiveError(err.message); setDeepDiveLoading(false); });
  }, [activeTab, ticker, deepDive, deepDiveLoading]);

  /* ── close on escape ────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const sigCol = signalColor(stock?.signal);
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp style={{ width: 13, height: 13 }} /> },
    { id: 'fundamentals', label: 'Fundamentals', icon: <BookOpen style={{ width: 13, height: 13 }} /> },
    { id: 'news', label: 'News', icon: <Newspaper style={{ width: 13, height: 13 }} /> },
    { id: 'deep-dive', label: 'AI Deep Dive', icon: <Brain style={{ width: 13, height: 13 }} /> },
  ];

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
          {stock?.company && (
            <span style={{ fontSize: 12, color: C.dim, fontFamily: C.sansFont }}>{stock.company}</span>
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
          {stock?.score != null && (
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `${sigCol}18`, border: `2px solid ${sigCol}50`,
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: sigCol, fontFamily: C.font }}>
                {stock.score}
              </span>
            </div>
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
          {activeTab === 'news' && <NewsTab items={newsItems} />}
          {activeTab === 'deep-dive' && <DeepDiveTab data={deepDive} loading={deepDiveLoading} error={deepDiveError} />}
        </div>
      </div>
    </div>
  );
}

/* ═══ Overview Tab ═══════════════════════════════════════════════════ */
function OverviewTab({ stock, ticker }: { stock: any; ticker: string }) {
  /* TradingView chart embed */
  const exchange = ticker.startsWith('BTC') || ticker.startsWith('ETH') ? 'BINANCE' : 'NASDAQ';
  const tvUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tv_${ticker}&symbol=${exchange}:${ticker}&interval=D&hidesidetoolbar=1&symboledit=0&saveimage=0&toolbarbg=0d1623&studies=[]&theme=dark&style=1&timezone=exchange&locale=en`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* TradingView Chart */}
      <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
        <iframe
          key={ticker}
          src={tvUrl}
          style={{ width: '100%', height: 380, border: 'none', display: 'block' }}
          title={`${ticker} chart`}
        />
      </div>

      {!stock && <div style={{ color: C.dim, fontSize: 12 }}>No analysis available for this ticker.</div>}

      {stock && (
        <>
          {/* thesis */}
          {stock.thesis && (
            <div>
              <SectionLabel>Investment Thesis</SectionLabel>
              <p style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>{stock.thesis}</p>
            </div>
          )}

          {/* grid: why now / sentiment / moat */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {stock.why_now && (
              <InfoCard label="Why Now" color={C.amber}>{stock.why_now}</InfoCard>
            )}
            {stock.sentiment && (
              <InfoCard label="Sentiment" color={C.blue}>
                {stock.sentiment}
                {stock.reason && <div style={{ marginTop: 6, fontSize: 10, color: C.dim }}>{stock.reason}</div>}
              </InfoCard>
            )}
            {stock.moat && (
              <InfoCard label="Competitive Moat" color={C.purple}>{stock.moat}</InfoCard>
            )}
          </div>

          {/* catalysts */}
          {stock.catalysts?.length > 0 && (
            <div>
              <SectionLabel>Catalysts</SectionLabel>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {stock.catalysts.map((cat: string, i: number) => (
                  <span key={i} style={{
                    padding: '3px 10px', borderRadius: 4,
                    fontSize: 10, fontWeight: 600, fontFamily: C.font,
                    color: C.teal, background: `${C.teal}12`, border: `1px solid ${C.teal}25`,
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* valuation metrics */}
          <div>
            <SectionLabel>Valuation Metrics</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 6 }}>
              <MetricBox label="P/S" value={stock.ps_ratio} />
              <MetricBox label="P/E" value={stock.pe_ratio} />
              <MetricBox label="P/FCF" value={stock.pfcf} />
              <MetricBox label="EV/Revenue" value={stock.ev_revenue} />
              <MetricBox label="PEG" value={stock.peg} />
              <MetricBox label="vs Peers" value={stock.vs_peers} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══ Fundamentals Tab ══════════════════════════════════════════════ */
function FundamentalsTab({ csvRow, stock }: { csvRow: any; stock: any }) {
  const data = csvRow || stock || {};
  const entries = Object.entries(data).filter(([k]) =>
    !['display_type', 'catalysts', 'thesis'].includes(k) && typeof data[k] !== 'object'
  );

  if (entries.length === 0) {
    return <div style={{ color: C.dim, fontSize: 12 }}>No fundamental data available.</div>;
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
            {typeof val === 'number' ? fmtNumber(val) : String(val ?? '—')}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══ News Tab ══════════════════════════════════════════════════════ */
function NewsTab({ items }: { items: NewsItem[] }) {
  const limited = items.slice(0, 10);

  if (limited.length === 0) {
    return <div style={{ color: C.dim, fontSize: 12 }}>No news available for this ticker.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {limited.map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', flexDirection: 'column', gap: 4,
            padding: '11px 14px', borderRadius: 4,
            textDecoration: 'none',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.card}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: 12, color: C.text, fontFamily: C.sansFont, lineHeight: 1.5 }}>
            {item.title}
          </span>
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
function DeepDiveTab({ data, loading, error }: { data: any; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ background: C.card, borderRadius: 6, height: 70 + i * 18, opacity: 0.4 }} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div style={{ color: C.red, fontSize: 12 }}>Failed to load AI analysis: {error}</div>;
  }

  if (!data) {
    return <div style={{ color: C.dim, fontSize: 12 }}>Click to load AI deep dive analysis.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {data.extended_thesis && (
        <div>
          <SectionLabel>Extended Thesis</SectionLabel>
          <p style={{ fontSize: 12, color: C.text, lineHeight: 1.7, fontFamily: C.sansFont, margin: 0 }}>{data.extended_thesis}</p>
        </div>
      )}

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

      {data.technical_outlook && (
        <div>
          <SectionLabel>Technical Outlook</SectionLabel>
          <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: C.sansFont, margin: 0 }}>{data.technical_outlook}</p>
        </div>
      )}

      {data.analyst_sentiment && (
        <div>
          <SectionLabel>Analyst Sentiment Summary</SectionLabel>
          <p style={{ fontSize: 11, color: C.text, lineHeight: 1.6, fontFamily: C.sansFont, margin: 0 }}>{data.analyst_sentiment}</p>
        </div>
      )}

      {data.sector_peers?.length > 0 && (
        <div>
          <SectionLabel>Sector Peers Comparison</SectionLabel>
          <div style={{ borderRadius: 6, overflow: 'hidden', border: `1px solid ${C.border}` }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 100px',
              padding: '7px 14px', background: C.card,
              fontSize: 8, fontWeight: 700, color: C.dim, fontFamily: C.font,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <span>Ticker</span><span>Market Cap</span><span>Key Multiple</span>
            </div>
            {data.sector_peers.map((peer: any, i: number) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 100px',
                padding: '7px 14px', borderBottom: `1px solid ${C.border}`,
                background: i % 2 === 0 ? 'transparent' : `${C.border}08`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: C.bright, fontFamily: C.font }}>{peer.ticker}</span>
                <span style={{ fontSize: 10, color: C.text, fontFamily: C.font }}>{fmtNumber(peer.market_cap)}</span>
                <span style={{ fontSize: 10, color: C.teal, fontFamily: C.font }}>{peer.key_multiple ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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

function MetricBox({ label, value }: { label: string; value?: any }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'number' ? value.toFixed(1) : String(value);
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '6px 10px', background: C.card,
      borderRadius: 4, border: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, fontWeight: 700, fontFamily: C.font, marginTop: 2 }}>{display}</span>
    </div>
  );
}
