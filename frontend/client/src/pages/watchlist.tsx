import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import WatchlistAnalysis from '@/components/WatchlistAnalysis';
import { StockDetailModal } from '@/components/StockDetailModal';
import { RefreshCw, ListChecks, ExternalLink } from 'lucide-react';

/* ── color tokens ───────────────────────────────────────────────────── */
const C = {
  bg: '#0b0c10', card: '#111318', border: '#1a1d25', text: '#c9cdd6',
  bright: '#e8eaef', dim: '#6b7280', green: '#22c55e', red: '#ef4444',
  blue: '#3b82f6', gold: '#f59e0b', teal: '#14b8a6',
};
const font = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
const sansFont = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/* ── signal color helper ────────────────────────────────────────────── */
function signalColor(signal?: string): string {
  if (!signal) return C.dim;
  const s = signal.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('STRONGBUY')) return '#22c55e';
  if (s.includes('BUY'))       return '#14b8a6';
  if (s.includes('HOLD'))      return '#f59e0b';
  if (s.includes('AVOID') || s.includes('SELL')) return '#ef4444';
  return C.dim;
}

function signalBgTint(signal?: string): string {
  if (!signal) return 'transparent';
  const s = signal.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.includes('STRONGBUY')) return 'rgba(34,197,94,0.06)';
  if (s.includes('BUY'))       return 'rgba(20,184,166,0.06)';
  if (s.includes('HOLD'))      return 'rgba(245,158,11,0.06)';
  if (s.includes('AVOID') || s.includes('SELL')) return 'rgba(239,68,68,0.06)';
  return 'transparent';
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

/* ═══════════════════════════════════════════════════════════════════════
   WATCHLIST PAGE
   ═══════════════════════════════════════════════════════════════════════ */
export default function WatchlistPage() {
  const qc = useQueryClient();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  /* ── fetch watchlist ─────────────────────────────────────────────── */
  const { data: watchlist, isLoading: wlLoading } = useQuery<WatchlistResponse>({
    queryKey: ['/api/watchlist'],
    staleTime: 60_000,
  });

  /* ── fetch news (poll every 5 min) ───────────────────────────────── */
  const { data: newsData } = useQuery<NewsResponse>({
    queryKey: ['/api/watchlist/news'],
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
    enabled: !!(watchlist?.analysis),
  });

  /* ── refresh mutation ────────────────────────────────────────────── */
  const refreshMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/watchlist/refresh');
      return res.json();
    },
    onSuccess: (data) => {
      qc.setQueryData(['/api/watchlist'], (old: any) => ({
        ...old,
        analysis: data.analysis || data,
        saved_at: data.saved_at || new Date().toISOString(),
      }));
      qc.invalidateQueries({ queryKey: ['/api/watchlist/news'] });
    },
  });

  const handleTickerClick = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
  }, []);

  const analysis = watchlist?.analysis;
  const hasAnalysis = analysis && (analysis.top_buys?.length || analysis.most_undervalued?.length || analysis.best_catalysts?.length || analysis.hidden_gems?.length || analysis.most_revolutionary?.length || analysis.right_sector?.length);
  const allStocks = extractAllStocks(analysis);
  const allNews = flattenNews(newsData);

  /* ── empty state ─────────────────────────────────────────────────── */
  if (!wlLoading && !hasAnalysis) {
    return (
      <div style={{ minHeight: '100vh', background: '#050608', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <ListChecks style={{ width: 56, height: 56, color: C.dim, margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.bright, fontFamily: sansFont, marginBottom: 8 }}>
            No Watchlist Yet
          </h2>
          <p style={{ fontSize: 14, color: C.dim, fontFamily: sansFont, lineHeight: 1.6 }}>
            Upload a CSV in the <span style={{ color: C.blue }}>AI Terminal</span> to create your watchlist.
          </p>
        </div>
      </div>
    );
  }

  /* ── loading state ───────────────────────────────────────────────── */
  if (wlLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#050608', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-6 h-6 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050608', color: C.text, fontFamily: sansFont }}>
      {/* ═══ ZONE A — Analysis Dashboard (top ~60%) ═══ */}
      <div style={{ padding: '20px 24px 12px' }}>
        {/* header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.bright, fontFamily: font, letterSpacing: '0.04em' }}>
            WATCHLIST
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {watchlist?.saved_at && (
              <span style={{ fontSize: 11, color: C.dim, fontFamily: font }}>
                Last analyzed: {timeAgo(watchlist.saved_at)}
              </span>
            )}
            <button
              onClick={() => refreshMut.mutate()}
              disabled={refreshMut.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6,
                background: refreshMut.isPending ? `${C.blue}20` : `${C.blue}15`,
                border: `1px solid ${C.blue}30`,
                color: C.blue, fontSize: 11, fontWeight: 700, fontFamily: font,
                cursor: refreshMut.isPending ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: refreshMut.isPending ? 0.6 : 1,
              }}
            >
              <RefreshCw style={{ width: 13, height: 13, animation: refreshMut.isPending ? 'spin 1s linear infinite' : 'none' }} />
              {refreshMut.isPending ? 'Refreshing...' : 'Refresh Analysis'}
            </button>
          </div>
        </div>

        {/* analysis content — with loading overlay during refresh */}
        <div style={{ position: 'relative' }}>
          {refreshMut.isPending && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(5,6,8,0.7)', borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div className="w-8 h-8 border-2 border-blue-500/40 border-t-blue-500 rounded-full animate-spin" />
            </div>
          )}
          {analysis && (
            <WatchlistAnalysis data={analysis} onTickerClick={handleTickerClick} />
          )}
        </div>
      </div>

      {/* ═══ ZONE B + C — Bottom split ═══ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 3fr',
        gap: 16,
        padding: '12px 24px 24px',
        minHeight: 300,
      }}>
        {/* ── ZONE B — Ticker Table ── */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.bright, fontFamily: font, letterSpacing: '0.05em' }}>
              WATCHLIST
            </span>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>({allStocks.length})</span>
          </div>

          {/* table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '70px 1fr 80px 45px 60px',
            padding: '8px 16px',
            borderBottom: `1px solid ${C.border}`,
            fontSize: 9, fontWeight: 700, color: C.dim, fontFamily: font,
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            <span>Ticker</span><span>Company</span><span>Signal</span><span>Score</span><span>P/S</span>
          </div>

          {/* table rows */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="scrollbar-hide">
            {allStocks.map((stock, i) => (
              <div
                key={`${stock.ticker}-${i}`}
                onClick={() => stock.ticker && handleTickerClick(stock.ticker)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 80px 45px 60px',
                  padding: '8px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  background: signalBgTint(stock.signal),
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  alignItems: 'center',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = signalBgTint(stock.signal)}
              >
                <span style={{ fontSize: 12, fontWeight: 800, color: C.bright, fontFamily: font }}>
                  {stock.ticker || '—'}
                </span>
                <span style={{ fontSize: 11, color: C.dim, fontFamily: sansFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stock.company || '—'}
                </span>
                <span style={{
                  fontSize: 8, fontWeight: 800, fontFamily: font,
                  padding: '2px 8px', borderRadius: 999,
                  color: '#000', background: signalColor(stock.signal),
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  textAlign: 'center', whiteSpace: 'nowrap',
                }}>
                  {stock.signal || '—'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: signalColor(stock.signal), fontFamily: font, textAlign: 'center' }}>
                  {stock.score ?? '—'}
                </span>
                <span style={{ fontSize: 11, color: C.text, fontFamily: font, textAlign: 'right' }}>
                  {stock.ps_ratio != null ? (typeof stock.ps_ratio === 'number' ? stock.ps_ratio.toFixed(1) : stock.ps_ratio) : '—'}
                </span>
              </div>
            ))}
            {allStocks.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: C.dim }}>No stocks</div>
            )}
          </div>
        </div>

        {/* ── ZONE C — News Feed ── */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.bright, fontFamily: font, letterSpacing: '0.05em' }}>
              NEWS FEED
            </span>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>({allNews.length})</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }} className="scrollbar-hide">
            {allNews.map((item, i) => (
              <a
                key={`${item.ticker}-${i}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 16px',
                  borderBottom: `1px solid ${C.border}`,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* ticker pill */}
                <span style={{
                  flexShrink: 0,
                  fontSize: 9, fontWeight: 800, fontFamily: font,
                  padding: '2px 8px', borderRadius: 4,
                  color: C.blue, background: `${C.blue}15`,
                  border: `1px solid ${C.blue}25`,
                  textTransform: 'uppercase',
                }}>
                  {item.ticker}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, color: C.bright, fontFamily: sansFont,
                    lineHeight: 1.4, marginBottom: 4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, color: C.dim, fontFamily: sansFont }}>{item.source}</span>
                    <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>{timeAgo(item.published_at)}</span>
                  </div>
                </div>
                <ExternalLink style={{ width: 12, height: 12, color: C.dim, flexShrink: 0, marginTop: 2 }} />
              </a>
            ))}
            {allNews.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: C.dim }}>
                {watchlist?.analysis ? 'Loading news...' : 'No news available'}
              </div>
            )}
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
