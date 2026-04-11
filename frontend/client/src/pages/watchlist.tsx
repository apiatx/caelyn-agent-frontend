import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WatchlistAnalysis from '@/components/WatchlistAnalysis';
import { StockDetailModal } from '@/components/StockDetailModal';
import { RefreshCw, ExternalLink } from 'lucide-react';

/* ── color tokens (Hyperliquid style) ──────────────────────────────── */
const C = {
  bg: '#080c13', card: '#0d1623', card2: '#0a1020',
  border: '#1a2540', text: '#e2e8f0', dim: '#64748b',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  font: "'JetBrains Mono','Fira Code',monospace",
};

/* ── signal color helper ────────────────────────────────────────────── */
function signalColor(signal?: string): string {
  if (!signal) return C.dim;
  const s = signal.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('STRONGBUY')) return C.green;
  if (s.includes('BUY'))       return C.teal;
  if (s.includes('HOLD'))      return C.amber;
  if (s.includes('AVOID') || s.includes('SELL')) return C.red;
  return C.dim;
}

function signalBg(signal?: string): string {
  const col = signalColor(signal);
  return col + '18';
}

/* ── relative time helper ───────────────────────────────────────────── */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── types ───────────────────────────────────────────────────────────── */
interface WatchlistResponse {
  tickers?: string[];
  csv_data?: any[];
  analysis?: any;
  saved_at?: string;
  empty?: boolean;
}

interface NewsItem {
  ticker: string;
  title: string;
  summary?: string;
  url: string;
  published_at: string;
  source: string;
}

interface NewsResponse {
  [ticker: string]: NewsItem[];
}

interface WatchlistMeta {
  id: string;
  name: string;
  ticker_count: number;
  saved_at: string;
  updated_at?: string;
}

/* ── extract all stocks from analysis ───────────────────────────────── */
function extractAllStocks(analysis: any): any[] {
  if (!analysis) return [];
  const cats = ['top_buys', 'most_undervalued', 'best_catalysts', 'hidden_gems', 'most_revolutionary', 'right_sector'];
  const stocks: any[] = [];
  for (const cat of cats) {
    if (Array.isArray(analysis[cat])) {
      stocks.push(...analysis[cat]);
    }
  }
  return stocks;
}

/* ── flatten news map ───────────────────────────────────────────────── */
function flattenNews(newsMap: NewsResponse | null | undefined): (NewsItem & { ticker: string })[] {
  if (!newsMap) return [];
  const items: (NewsItem & { ticker: string })[] = [];
  for (const [ticker, articles] of Object.entries(newsMap)) {
    if (Array.isArray(articles)) {
      for (const a of articles) {
        items.push({ ...a, ticker: a.ticker || ticker });
      }
    }
  }
  items.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  return items;
}

/* ── blinking cursor CSS (injected once) ────────────────────────────── */
const BLINK_STYLE_ID = 'watchlist-blink-css';
function ensureBlinkStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(BLINK_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BLINK_STYLE_ID;
  style.textContent = `
    @keyframes wl-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
    @keyframes wl-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes wl-spin  { to{transform:rotate(360deg)} }
    .wl-blink { animation: wl-blink 1s step-end infinite; }
    .wl-pulse { animation: wl-pulse 2s ease-in-out infinite; }
    .wl-spin  { animation: wl-spin 1s linear infinite; }
    .wl-scrollbar::-webkit-scrollbar { width:4px; height:4px; }
    .wl-scrollbar::-webkit-scrollbar-track { background:transparent; }
    .wl-scrollbar::-webkit-scrollbar-thumb { background:${C.border}; border-radius:2px; }
    .wl-chip-strip::-webkit-scrollbar { height:0; }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════════════════
   WATCHLIST PAGE — Bloomberg Terminal Style
   ═══════════════════════════════════════════════════════════════════════ */
export default function WatchlistPage() {
  const qc = useQueryClient();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => { ensureBlinkStyle(); }, []);

  /* ── list of all watchlists ──────────────────────────────────────── */
  const { data: wlMetas, refetch: refetchMetas } = useQuery<WatchlistMeta[]>({
    queryKey: ['/api/watchlist/list'],
    queryFn: async () => {
      const r = await fetch('/api/watchlist/list');
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  /* ── auto-select first on load ───────────────────────────────────── */
  useEffect(() => {
    if (wlMetas?.length && !activeId) {
      setActiveId(wlMetas[0].id);
    }
  }, [wlMetas, activeId]);

  /* ── active watchlist data ───────────────────────────────────────── */
  const { data: watchlist, isLoading: wlLoading } = useQuery<WatchlistResponse>({
    queryKey: ['/api/watchlist', activeId],
    queryFn: async () => {
      if (!activeId) return null;
      const r = await fetch(`/api/watchlist/${activeId}`);
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!activeId,
    staleTime: 60_000,
  });

  /* ── news for active watchlist ───────────────────────────────────── */
  const { data: newsData } = useQuery<NewsResponse>({
    queryKey: ['/api/watchlist/news', activeId],
    queryFn: async () => {
      if (!activeId) return {};
      const r = await fetch(`/api/watchlist/${activeId}/news`);
      if (!r.ok) return {};
      return r.json();
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    enabled: !!activeId && !!watchlist?.analysis,
  });

  /* ── delete specific watchlist ───────────────────────────────────── */
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      return r.json();
    },
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
      const remaining = (wlMetas || []).filter(w => w.id !== deletedId);
      setActiveId(remaining[0]?.id ?? null);
    },
  });

  /* ── refresh active watchlist ────────────────────────────────────── */
  const refreshMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/watchlist/${activeId}/refresh`, { method: 'POST' });
      return r.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['/api/watchlist', activeId] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/news', activeId] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
    },
  });

  const handleTickerClick = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
  }, []);

  const analysis = watchlist?.analysis;
  const hasAnalysis = analysis && (analysis.top_buys?.length || analysis.most_undervalued?.length || analysis.best_catalysts?.length || analysis.hidden_gems?.length || analysis.most_revolutionary?.length || analysis.right_sector?.length);
  const allStocks = extractAllStocks(analysis);
  const allNews = flattenNews(newsData);

  /* ── loading state ───────────────────────────────────────────────── */
  if (wlLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="wl-spin" style={{ width: 24, height: 24, border: `2px solid ${C.teal}30`, borderTopColor: C.teal, borderRadius: '50%' }} />
      </div>
    );
  }

  /* ── empty state — terminal prompt ───────────────────────────────── */
  if (!activeId || (!wlLoading && (!watchlist || watchlist.empty))) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.font, display: 'flex', flexDirection: 'column' }}>
        {/* ── Watchlist Tabs (even in empty state) ── */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 2,
          padding: '8px 16px 0', background: '#080c13',
          borderBottom: '1px solid #1a2540', flexWrap: 'wrap',
        }}>
          {(wlMetas || []).map((meta) => {
            const isActive = activeId === meta.id;
            return (
              <div
                key={meta.id}
                onClick={() => setActiveId(meta.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px 5px 12px',
                  borderRadius: '4px 4px 0 0',
                  background: isActive ? '#0d1623' : 'transparent',
                  border: `1px solid ${isActive ? '#1a2540' : 'transparent'}`,
                  borderBottom: isActive ? '1px solid #0d1623' : '1px solid transparent',
                  cursor: 'pointer', marginBottom: -1,
                  fontFamily: "'JetBrains Mono','Fira Code',monospace",
                  fontSize: 11,
                  color: isActive ? '#e2e8f0' : '#475569',
                  transition: 'color 0.15s',
                }}
              >
                <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {meta.name}
                </span>
                <span style={{ fontSize: 9, color: '#475569', flexShrink: 0 }}>
                  ({meta.ticker_count})
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${meta.name}"?`)) deleteMut.mutate(meta.id);
                  }}
                  disabled={deleteMut.isPending}
                  style={{
                    background: 'transparent', border: 'none',
                    color: '#475569', cursor: 'pointer',
                    fontSize: 14, lineHeight: 1, padding: '0 1px',
                    display: 'flex', alignItems: 'center',
                    borderRadius: 2,
                  }}
                  title="Delete watchlist"
                >×</button>
              </div>
            );
          })}
          {(!wlMetas || wlMetas.length === 0) && !wlLoading && (
            <span style={{ padding: '5px 12px', fontSize: 11, color: '#334155', fontFamily: 'inherit' }}>
              Upload a CSV in AI Terminal to create a watchlist
            </span>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ fontFamily: C.font, fontSize: 14, color: C.dim, lineHeight: 2.2 }}>
            <div><span style={{ color: C.teal }}>&gt;</span> No watchlist loaded.</div>
            <div><span style={{ color: C.teal }}>&gt;</span> Upload a CSV on the AI Terminal page to initialize.</div>
            <div><span style={{ color: C.teal }}>&gt;</span> <span className="wl-blink" style={{ color: C.text }}>_</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.font, display: 'flex', flexDirection: 'column' }}>

      {/* ── Watchlist Tabs ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2,
        padding: '8px 16px 0', background: '#080c13',
        borderBottom: '1px solid #1a2540', flexWrap: 'wrap',
      }}>
        {(wlMetas || []).map((meta) => {
          const isActive = activeId === meta.id;
          return (
            <div
              key={meta.id}
              onClick={() => setActiveId(meta.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px 5px 12px',
                borderRadius: '4px 4px 0 0',
                background: isActive ? '#0d1623' : 'transparent',
                border: `1px solid ${isActive ? '#1a2540' : 'transparent'}`,
                borderBottom: isActive ? '1px solid #0d1623' : '1px solid transparent',
                cursor: 'pointer', marginBottom: -1,
                fontFamily: "'JetBrains Mono','Fira Code',monospace",
                fontSize: 11,
                color: isActive ? '#e2e8f0' : '#475569',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meta.name}
              </span>
              <span style={{ fontSize: 9, color: '#475569', flexShrink: 0 }}>
                ({meta.ticker_count})
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${meta.name}"?`)) deleteMut.mutate(meta.id);
                }}
                disabled={deleteMut.isPending}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#475569', cursor: 'pointer',
                  fontSize: 14, lineHeight: 1, padding: '0 1px',
                  display: 'flex', alignItems: 'center',
                  borderRadius: 2,
                }}
                title="Delete watchlist"
              >×</button>
            </div>
          );
        })}
        {(!wlMetas || wlMetas.length === 0) && !wlLoading && (
          <span style={{ padding: '5px 12px', fontSize: 11, color: '#334155', fontFamily: 'inherit' }}>
            Upload a CSV in AI Terminal to create a watchlist
          </span>
        )}
      </div>

      {/* ═══ HEADER BAR (fixed, 44px) ═══ */}
      <div style={{
        height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16,
        borderBottom: `1px solid ${C.border}`,
        background: C.card,
      }}>
        {/* Left: WATCHLIST + pulse dot */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span className="wl-pulse" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: C.teal, boxShadow: `0 0 6px ${C.teal}`,
          }} />
          <span style={{
            fontSize: 13, fontWeight: 800, color: '#fff',
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
          }}>
            WATCHLIST
          </span>
        </div>

        {/* Center: summary text */}
        <div style={{
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          fontSize: 11, color: C.dim, textAlign: 'center' as const,
        }}>
          {analysis?.summary || ''}
        </div>

        {/* Right: last analyzed + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {watchlist?.saved_at && (
            <span style={{ fontSize: 10, color: C.dim }}>
              Last analyzed: {timeAgo(watchlist.saved_at)}
            </span>
          )}
          <button
            onClick={() => refreshMut.mutate()}
            disabled={refreshMut.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 4,
              background: 'transparent',
              border: `1px solid ${C.teal}50`,
              color: C.teal, fontSize: 10, fontWeight: 700,
              fontFamily: C.font, cursor: refreshMut.isPending ? 'not-allowed' : 'pointer',
              opacity: refreshMut.isPending ? 0.5 : 1,
              letterSpacing: '0.04em',
            }}
          >
            <RefreshCw
              style={{ width: 11, height: 11 }}
              className={refreshMut.isPending ? 'wl-spin' : ''}
            />
            {refreshMut.isPending ? 'REFRESHING' : '\u27F3 REFRESH'}
          </button>
        </div>
      </div>

      {/* ═══ MAIN BODY (scrollable) ═══ */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="wl-scrollbar">

        {/* ── Row 1: Signal Summary Strip ── */}
        <div className="wl-chip-strip" style={{
          display: 'flex', gap: 6,
          padding: '10px 20px',
          overflowX: 'auto',
          borderBottom: `1px solid ${C.border}`,
          background: C.card2,
        }}>
          {allStocks.map((stock, i) => {
            const col = signalColor(stock.signal);
            return (
              <button
                key={`chip-${stock.ticker || i}`}
                onClick={() => stock.ticker && handleTickerClick(stock.ticker)}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 4,
                  background: col + '12',
                  border: `1px solid ${col}30`,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = col + '25'}
                onMouseLeave={e => e.currentTarget.style.background = col + '12'}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: C.font }}>
                  {stock.ticker || '—'}
                </span>
                <span style={{
                  fontSize: 8, fontWeight: 800, fontFamily: C.font,
                  padding: '1px 6px', borderRadius: 3,
                  color: '#000', background: col,
                  textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {stock.signal || '—'}
                </span>
              </button>
            );
          })}
          {allStocks.length === 0 && (
            <span style={{ fontSize: 10, color: C.dim }}>No signals</span>
          )}
        </div>

        {/* ── Row 2: WatchlistAnalysis category panels ── */}
        <div style={{ padding: '16px 20px', position: 'relative' }}>
          {refreshMut.isPending && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(8,12,19,0.75)', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div className="wl-spin" style={{ width: 28, height: 28, border: `2px solid ${C.teal}30`, borderTopColor: C.teal, borderRadius: '50%' }} />
            </div>
          )}
          <WatchlistAnalysis data={analysis} onTickerClick={handleTickerClick} />
        </div>

        {/* ── Row 3: Bottom Split (Ticker Table + News Feed) ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 3fr',
          gap: 12,
          padding: '0 20px 24px',
          minHeight: 300,
        }}>
          {/* ── Ticker Table ── */}
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>
                TICKERS
              </span>
              <span style={{ fontSize: 9, color: C.dim }}>({allStocks.length})</span>
            </div>

            {/* table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '62px 1fr 72px 40px 50px 50px',
              padding: '6px 14px',
              borderBottom: `1px solid ${C.border}`,
              fontSize: 8, fontWeight: 700, color: C.dim,
              textTransform: 'uppercase' as const, letterSpacing: '0.08em',
            }}>
              <span>Ticker</span><span>Company</span><span>Signal</span><span>Score</span><span>P/S</span><span>P/E</span>
            </div>

            {/* table rows */}
            <div style={{ flex: 1, overflowY: 'auto' }} className="wl-scrollbar">
              {allStocks.map((stock, i) => (
                <div
                  key={`row-${stock.ticker}-${i}`}
                  onClick={() => stock.ticker && handleTickerClick(stock.ticker)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '62px 1fr 72px 40px 50px 50px',
                    padding: '7px 14px',
                    borderBottom: `1px solid ${C.border}`,
                    background: i % 2 === 0 ? 'transparent' : `${C.border}08`,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.teal}0c`}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : `${C.border}08`}
                >
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
                    {stock.ticker || '—'}
                  </span>
                  <span style={{ fontSize: 10, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {stock.company || '—'}
                  </span>
                  <span style={{
                    fontSize: 7, fontWeight: 800,
                    padding: '2px 6px', borderRadius: 3,
                    color: '#000', background: signalColor(stock.signal),
                    textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                    textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
                    justifySelf: 'start',
                  }}>
                    {stock.signal || '—'}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: signalColor(stock.signal), textAlign: 'center' as const }}>
                    {stock.score ?? '—'}
                  </span>
                  <span style={{ fontSize: 10, color: C.text, textAlign: 'right' as const }}>
                    {stock.ps_ratio != null ? (typeof stock.ps_ratio === 'number' ? stock.ps_ratio.toFixed(1) : stock.ps_ratio) : '—'}
                  </span>
                  <span style={{ fontSize: 10, color: C.text, textAlign: 'right' as const }}>
                    {stock.pe_ratio != null ? (typeof stock.pe_ratio === 'number' ? stock.pe_ratio.toFixed(1) : stock.pe_ratio) : '—'}
                  </span>
                </div>
              ))}
              {allStocks.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>No stocks</div>
              )}
            </div>
          </div>

          {/* ── News Feed ── */}
          <div style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>
                LIVE NEWS
              </span>
              <span style={{ fontSize: 9, color: C.dim }}>({allNews.length})</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0' }} className="wl-scrollbar">
              {allNews.map((item, i) => {
                const tickerStock = allStocks.find(s => s.ticker?.toUpperCase() === item.ticker?.toUpperCase());
                const col = signalColor(tickerStock?.signal);
                return (
                  <a
                    key={`news-${item.ticker}-${i}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '9px 14px',
                      borderBottom: `1px solid ${C.border}`,
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.teal}08`}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* ticker pill in signal color */}
                    <span style={{
                      flexShrink: 0,
                      fontSize: 8, fontWeight: 800, fontFamily: C.font,
                      padding: '2px 7px', borderRadius: 3,
                      color: col, background: col + '15',
                      border: `1px solid ${col}25`,
                      textTransform: 'uppercase' as const,
                    }}>
                      {item.ticker}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 11, color: C.text,
                        lineHeight: 1.4, marginBottom: 3,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                      }}>
                        {item.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, color: C.dim }}>{item.source}</span>
                        <span style={{ fontSize: 9, color: C.dim }}>{timeAgo(item.published_at)}</span>
                      </div>
                    </div>
                    <ExternalLink style={{ width: 11, height: 11, color: C.dim, flexShrink: 0, marginTop: 2 }} />
                  </a>
                );
              })}
              {allNews.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>
                  {watchlist?.analysis ? 'Loading news...' : 'No news available'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Stock Detail Modal ═══ */}
      {selectedTicker && (
        <StockDetailModal
          ticker={selectedTicker}
          analysis={analysis}
          csvData={watchlist?.csv_data}
          newsItems={allNews.filter(n => n.ticker?.toUpperCase() === selectedTicker.toUpperCase())}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  );
}
