import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WatchlistAnalysis from '@/components/WatchlistAnalysis';
import type { AnalysisSection, TickerCard } from '@/components/WatchlistAnalysis';
import { StockDetailModal } from '@/components/StockDetailModal';
import { RefreshCw, ExternalLink, Plus, Upload, FileText } from 'lucide-react';
import StrategySelector from '@/components/strategy-selector';
import { WatchlistScorePanel } from '@/components/playbook-score-panel';
import { fetchPlaybooks, scoreWatchlist } from '@/lib/playbooks';
import type { PlaybookSummary, WatchlistPlaybookResponse } from '@/types/playbook';
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes';
import { mergeRealtimeQuote } from '@/lib/mergeRealtimeQuote';
import { PriceFreshnessBadge } from '@/components/PriceFreshnessBadge';

/* ── color tokens (Hyperliquid style) ──────────────────────────────── */
const C = {
  bg: '#080c13', card: '#0d1623', card2: '#0a1020',
  border: '#1a2540', text: '#e2e8f0', dim: '#64748b',
  teal: '#0ea5e9', green: '#22c55e', red: '#ef4444',
  amber: '#f59e0b', blue: '#3b82f6', purple: '#a855f7',
  font: "'JetBrains Mono','Fira Code',monospace",
  sansFont: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

/* ── signal color helper (for legacy data) ─────────────────────────── */
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

/* ── extract all stocks from analysis (supports both formats) ──────── */
function extractAllStocks(analysis: any): any[] {
  if (!analysis) return [];

  // New format: sections array with tickers
  if (Array.isArray(analysis.sections)) {
    const stocks: any[] = [];
    for (const section of analysis.sections) {
      if (Array.isArray(section.tickers)) {
        for (const t of section.tickers) {
          stocks.push({
            ticker: t.symbol || t.ticker,
            company: t.name || t.company,
            price: t.price,
            change_pct: t.change_pct,
            signal: t.change_pct != null ? (t.change_pct >= 0 ? 'BUY' : 'HOLD') : undefined,
            risk_level: t.risk_level,
            catalyst: t.catalyst,
            sentiment: t.sentiment,
            action_note: t.action_note,
            key_insight: t.key_insight,
            section_id: section.id,
            section_title: section.title,
          });
        }
      }
    }
    // Deduplicate by ticker
    const seen = new Set<string>();
    return stocks.filter(s => {
      if (!s.ticker || seen.has(s.ticker)) return false;
      seen.add(s.ticker);
      return true;
    });
  }

  // Legacy format
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

/* ── check if analysis is new format ───────────────────────────────── */
function isNewFormat(analysis: any): boolean {
  return analysis && Array.isArray(analysis.sections);
}

/* ── risk level color ──────────────────────────────────────────────── */
function riskColor(level?: string): string {
  if (!level) return C.dim;
  const l = level.toLowerCase();
  if (l === 'low') return C.green;
  if (l === 'moderate') return C.amber;
  if (l === 'high') return C.red;
  return C.dim;
}

/* ── change percent color ──────────────────────────────────────────── */
function changeColor(pct?: number): string {
  if (pct === undefined || pct === null) return C.dim;
  if (pct > 0) return C.green;
  if (pct < 0) return C.red;
  return C.dim;
}

/* ── section accent color ──────────────────────────────────────────── */
const SECTION_ACCENTS: Record<string, string> = {
  best_entries: '#22c55e',
  momentum_plays: '#f59e0b',
  catalyst_watch: '#3b82f6',
  sector_rotation: '#14b8a6',
  high_conviction: '#a855f7',
  contrarian_value: '#ec4899',
};

function sectionAccent(id: string): string {
  return SECTION_ACCENTS[id] || C.teal;
}

/* ── loading stage messages ────────────────────────────────────────── */
const LOADING_STAGES = [
  'Fetching technical indicators...',
  'Scanning X/Twitter sentiment via Grok...',
  'Searching news & catalysts via Gemini...',
  'Analyzing fundamentals with Claude...',
  'Checking SEC filings & insider activity...',
  'Synthesizing multi-source intelligence...',
];

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
    @keyframes wl-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes wl-stage-in { 0%{opacity:0;transform:translateY(6px)} 100%{opacity:1;transform:translateY(0)} }
    .wl-blink { animation: wl-blink 1s step-end infinite; }
    .wl-pulse { animation: wl-pulse 2s ease-in-out infinite; }
    .wl-spin  { animation: wl-spin 1s linear infinite; }
    .wl-shimmer { background: linear-gradient(90deg, ${C.border}00, ${C.border}40, ${C.border}00); background-size: 200% 100%; animation: wl-shimmer 1.5s ease-in-out infinite; }
    .wl-stage-in { animation: wl-stage-in 0.3s ease-out forwards; }
    .wl-scrollbar::-webkit-scrollbar { width:4px; height:4px; }
    .wl-scrollbar::-webkit-scrollbar-track { background:transparent; }
    .wl-scrollbar::-webkit-scrollbar-thumb { background:${C.border}; border-radius:2px; }
    .wl-chip-strip::-webkit-scrollbar { height:0; }
  `;
  document.head.appendChild(style);
}

/* ── loading overlay component ─────────────────────────────────────── */
function AnalysisLoadingOverlay() {
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIdx(prev => (prev + 1) % LOADING_STAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 10,
      background: 'rgba(8,12,19,0.85)',
      borderRadius: 8,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20,
    }}>
      {/* spinner */}
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div className="wl-spin" style={{
          position: 'absolute', inset: 0,
          border: `2px solid ${C.teal}15`,
          borderTopColor: C.teal,
          borderRadius: '50%',
        }} />
        <div className="wl-spin" style={{
          position: 'absolute', inset: 6,
          border: `2px solid ${C.purple}15`,
          borderBottomColor: C.purple,
          borderRadius: '50%',
          animationDuration: '1.5s',
          animationDirection: 'reverse',
        }} />
      </div>

      {/* stage text */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: C.teal,
          fontFamily: C.font, letterSpacing: '0.04em',
          marginBottom: 8,
        }}>
          MULTI-SOURCE ANALYSIS
        </div>
        <div
          key={stageIdx}
          className="wl-stage-in"
          style={{
            fontSize: 11, color: C.text, fontFamily: C.sansFont,
            minHeight: 18,
          }}
        >
          {LOADING_STAGES[stageIdx]}
        </div>
      </div>

      {/* progress dots */}
      <div style={{ display: 'flex', gap: 6 }}>
        {LOADING_STAGES.map((_, i) => (
          <div
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i <= stageIdx ? C.teal : `${C.border}`,
              transition: 'background 0.3s',
              boxShadow: i === stageIdx ? `0 0 6px ${C.teal}60` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── parse CSV → tickers (first column, skip header) ───────────────── */
function parseCsvTickers(csvText: string): string[] {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  return lines.slice(1)
    .map(l => l.split(',')[0].trim().replace(/^"(.*)"$/, '$1'))
    .filter(Boolean);
}

/* ── new-format sections display ────────────────────────────────────── */
function NewFormatSections({ analysis, onTickerClick, allTickerSymbols }: { analysis: any; onTickerClick?: (t: string) => void; allTickerSymbols?: string[] }) {
  const sections: any[] = analysis?.sections || [];
  if (!sections.length) return null;

  // Compute pending tickers
  const analyzedSymbols = new Set<string>();
  for (const section of sections) {
    for (const t of (section.tickers || [])) {
      const sym = t.symbol || t.ticker;
      if (sym) analyzedSymbols.add(sym.toUpperCase());
    }
  }
  const pendingSymbols = (allTickerSymbols || []).filter(s => !analyzedSymbols.has(s.toUpperCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
      {sections.map((section: any) => {
        const accent = SECTION_ACCENTS[section.id] || C.teal;
        const tickers: any[] = section.tickers || [];
        return (
          <div key={section.id} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: 6,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: C.sansFont, letterSpacing: '0.02em' }}>
                {section.title}
              </div>
              {section.subtitle && (
                <div style={{ fontSize: 9, color: C.dim, marginTop: 3, fontFamily: C.sansFont, lineHeight: 1.4 }}>
                  {section.subtitle}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 340 }} className="wl-scrollbar">
              {tickers.map((stock: any, i: number) => {
                const sym = stock.symbol || stock.ticker;
                const chg = stock.change_pct;
                const chgCol = chg != null ? (chg >= 0 ? C.green : C.red) : C.dim;
                return (
                  <div
                    key={sym || i}
                    onClick={() => sym && onTickerClick?.(sym)}
                    style={{
                      padding: '9px 14px',
                      borderBottom: i < tickers.length - 1 ? `1px solid ${C.border}` : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${accent}0c`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: C.font, flexShrink: 0 }}>
                        {sym || '—'}
                      </span>
                      <span style={{ fontSize: 9, color: C.dim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {stock.name || stock.company}
                      </span>
                      {stock.price != null && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: C.font, flexShrink: 0 }}>
                          ${Number(stock.price).toFixed(2)}
                        </span>
                      )}
                      {chg != null && (
                        <span style={{
                          fontSize: 8, fontWeight: 800, fontFamily: C.font,
                          padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                          color: chgCol, background: chgCol + '18',
                        }}>
                          {chg > 0 ? '+' : ''}{Number(chg).toFixed(1)}%
                        </span>
                      )}
                      {stock.risk_level && (
                        <span style={{
                          fontSize: 7, fontWeight: 800, fontFamily: C.font,
                          padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                          color: riskColor(stock.risk_level),
                          background: riskColor(stock.risk_level) + '18',
                          textTransform: 'uppercase' as const,
                        }}>
                          {stock.risk_level}
                        </span>
                      )}
                    </div>
                    {stock.catalyst && (
                      <div style={{ fontSize: 9, color: C.dim, lineHeight: 1.4, marginBottom: stock.action_note ? 3 : 0,
                        overflow: 'hidden', display: '-webkit-box' as any,
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        ⚡ {stock.catalyst}
                      </div>
                    )}
                    {stock.action_note && (
                      <div style={{ fontSize: 9, color: accent, fontWeight: 600, fontFamily: C.sansFont, lineHeight: 1.3 }}>
                        → {stock.action_note}
                      </div>
                    )}
                  </div>
                );
              })}
              {tickers.length === 0 && (
                <div style={{ padding: 14, fontSize: 10, color: C.dim, textAlign: 'center' }}>No tickers</div>
              )}
            </div>
          </div>
        );
      })}
      </div>

      {/* Pending analysis card — shown when some tickers haven't been analyzed yet */}
      {pendingSymbols.length > 0 && (
        <div style={{
          background: C.card, border: `1px solid ${C.amber}30`,
          borderLeft: `3px solid ${C.amber}`,
          borderRadius: 6, padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.amber, fontFamily: C.sansFont }}>
              ⏳ {pendingSymbols.length} Tickers Pending Analysis
            </span>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: C.sansFont }}>
              Hit Refresh to analyze all tickers in batches
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {pendingSymbols.slice(0, 60).map(sym => (
              <span key={sym} style={{
                fontSize: 9, fontWeight: 700, fontFamily: C.font,
                padding: '2px 7px', borderRadius: 3,
                color: C.dim, background: C.border,
              }}>
                {sym}
              </span>
            ))}
            {pendingSymbols.length > 60 && (
              <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font, padding: '2px 7px' }}>
                +{pendingSymbols.length - 60} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   WATCHLIST PAGE — Bloomberg Terminal Style
   ═══════════════════════════════════════════════════════════════════════ */
export default function WatchlistPage() {
  const qc = useQueryClient();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [plainTextInput, setPlainTextInput] = useState('');
  const [watchlistName, setWatchlistName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [addTickerInput, setAddTickerInput] = useState('');
  const [addTickerStatus, setAddTickerStatus] = useState<null | 'success' | 'duplicate' | 'error'>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const autoTriggeredRef = useRef<Set<string>>(new Set());
  const [strategyPlaybooks, setStrategyPlaybooks] = useState<PlaybookSummary[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('default');
  const [strategyScoreData, setStrategyScoreData] = useState<WatchlistPlaybookResponse | null>(null);
  const [strategyScoreLoading, setStrategyScoreLoading] = useState(false);

  useEffect(() => { ensureBlinkStyle(); }, []);

  useEffect(() => {
    fetchPlaybooks().then(setStrategyPlaybooks).catch(() => {});
  }, []);

  const runStrategyScore = useCallback((strategyId: string, tickers: string[]) => {
    if (strategyId === 'default' || !tickers.length) return;
    setStrategyScoreLoading(true);
    scoreWatchlist(strategyId, tickers.slice(0, 50))
      .then(setStrategyScoreData)
      .catch(() => {})
      .finally(() => setStrategyScoreLoading(false));
  }, []);

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
      setRefreshError(null);
      const r = await fetch(`/api/watchlist/${activeId}/refresh`, { method: 'POST' });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || body.detail || `Server error ${r.status}`);
      }
      return r.json();
    },
    onSuccess: (data) => {
      setRefreshError(null);
      if (data && (data.analysis || data.sections)) {
        qc.setQueryData(['/api/watchlist', activeId], (old: any) => {
          if (!old) return old;
          const newAnalysis = data.analysis ?? (data.sections ? data : undefined);
          return newAnalysis ? { ...old, analysis: newAnalysis } : old;
        });
      }
      qc.invalidateQueries({ queryKey: ['/api/watchlist', activeId] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/news', activeId] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
    },
    onError: (err: any) => {
      setRefreshError(err?.message || 'Analysis failed');
    },
  });

  const renameMut = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const r = await fetch(`/api/watchlist/${id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
      setRenamingId(null);
    },
  });

  /* ── add tickers to active watchlist ────────────────────────────── */
  const addTickersMut = useMutation({
    mutationFn: async (tickers: string[]) => {
      if (!activeId) throw new Error('No active watchlist');
      const r = await fetch(`/api/watchlist/${activeId}/tickers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
      return data;
    },
    onSuccess: (data) => {
      setAddTickerInput('');
      setAddTickerStatus(data.added === 0 ? 'duplicate' : 'success');
      setTimeout(() => setAddTickerStatus(null), 2000);
      qc.invalidateQueries({ queryKey: ['/api/watchlist', activeId] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
    },
    onError: () => {
      setAddTickerStatus('error');
      setTimeout(() => setAddTickerStatus(null), 3000);
    },
  });

  function handleAddTickers() {
    const raw = addTickerInput.trim();
    if (!raw || !activeId) return;
    const tickers = raw.split(/[\s,;]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    if (!tickers.length) return;
    addTickersMut.mutate(tickers);
  }

  const handleTickerClick = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
  }, []);

  /* ── upload handlers ────────────────────────────────────────────── */
  async function handleUpload(csvText: string, _fileName?: string) {
    setUploadLoading(true);
    setShowAddPanel(false);
    setUploadStage('Parsing watchlist...');
    const nameToSet = watchlistName.trim();
    setWatchlistName('');
    try {
      const tickers = parseCsvTickers(csvText);
      if (!tickers.length) {
        alert('No tickers found in the CSV. Make sure the first column contains ticker symbols.');
        setUploadLoading(false);
        setUploadStage('');
        return;
      }
      setUploadStage(`Creating watchlist (${tickers.length} tickers)...`);
      const createRes = await fetch('/api/watchlist/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers, name: nameToSet || undefined, csv_data: csvText }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || `Server returned ${createRes.status}`);
      }
      const created = await createRes.json();
      const newId: string = created.id;
      if (newId) {
        qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
        setActiveId(newId);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadLoading(false);
      setUploadStage('');
    }
  }

  function handleCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) handleUpload(text, file.name);
    };
    reader.readAsText(file);
  }

  function handlePlainTextSubmit() {
    if (!plainTextInput.trim()) return;
    const tickers = plainTextInput.split(/[\n,;\s]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    const csvText = 'Ticker\n' + tickers.join('\n');
    handleUpload(csvText, 'manual-watchlist.csv');
    setPlainTextInput('');
  }

  const analysis = watchlist?.analysis;
  const newFmt = isNewFormat(analysis);

  /* ── auto-trigger new pipeline for old-format watchlists ──────────── */
  useEffect(() => {
    if (
      activeId &&
      analysis &&
      !Array.isArray(analysis.sections) &&
      !refreshMut.isPending &&
      !autoTriggeredRef.current.has(activeId)
    ) {
      autoTriggeredRef.current.add(activeId);
      refreshMut.mutate();
    }
  }, [activeId, analysis]);
  const hasAnalysis = newFmt
    ? (analysis?.sections?.length > 0)
    : (analysis && (analysis.top_buys?.length || analysis.most_undervalued?.length || analysis.best_catalysts?.length || analysis.hidden_gems?.length || analysis.most_revolutionary?.length || analysis.right_sector?.length));
  const allStocks = extractAllStocks(analysis);
  const allNews = flattenNews(newsData);
  const marketThemes: string[] = newFmt ? (analysis?.market_themes || []) : [];
  const lastUpdated: string | undefined = newFmt ? analysis?.last_updated : watchlist?.saved_at;

  /* ── merged ticker list: all CSV tickers + analysis data where available ── */
  const allTickerSymbols: string[] = watchlist?.tickers || [];
  const analyzedMap = new Map<string, any>(allStocks.map(s => [s.ticker?.toUpperCase(), s]));
  const baseMergedTickers = allTickerSymbols.length > 0
    ? allTickerSymbols.map(sym => {
        const key = sym.toUpperCase();
        const analyzed = analyzedMap.get(key);
        return analyzed ? { ...analyzed, _pending: false } : { ticker: sym, _pending: true };
      })
    : allStocks.map(s => ({ ...s, _pending: false }));

  /* ── realtime hydration: overlay live quote prices over analysis data ── */
  const realtimeSymbols = useMemo(() => {
    const out: string[] = [];
    for (const t of baseMergedTickers) {
      const sym = (t.ticker || '').toString().trim();
      if (sym) out.push(sym);
    }
    return out;
  }, [baseMergedTickers.map(t => t.ticker).join('|')]);
  const { quotesBySymbol: realtimeQuotes } = useRealtimeQuotes(realtimeSymbols, { enabled: realtimeSymbols.length > 0 });

  const mergedTickers = useMemo(() => baseMergedTickers.map((t) => {
    const sym = (t.ticker || '').toString().toUpperCase();
    const rt = sym ? realtimeQuotes[sym] : undefined;
    return rt ? mergeRealtimeQuote(t, rt) : t;
  }), [baseMergedTickers, realtimeQuotes]);

  const pendingCount = mergedTickers.filter(t => t._pending).length;
  const analyzedCount = mergedTickers.length - pendingCount;

  /* ── tab bar renderer (shared between empty + main states) ─────── */
  const renderTabBar = () => (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 2,
      padding: '8px 16px 0', background: C.bg,
      borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap',
    }}>
      {(wlMetas || []).map((meta) => {
        const isActive = activeId === meta.id;
        return (
          <div
            key={meta.id}
            onClick={() => { setActiveId(meta.id); setShowAddPanel(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px 5px 12px',
              borderRadius: '4px 4px 0 0',
              background: isActive ? C.card : 'transparent',
              border: `1px solid ${isActive ? C.border : 'transparent'}`,
              borderBottom: isActive ? `1px solid ${C.card}` : '1px solid transparent',
              cursor: 'pointer', marginBottom: -1,
              fontFamily: C.font, fontSize: 11,
              color: isActive ? C.text : '#475569',
              transition: 'color 0.15s',
            }}
          >
            {renamingId === meta.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && renameValue.trim()) {
                    renameMut.mutate({ id: meta.id, name: renameValue.trim() });
                  }
                  if (e.key === 'Escape') setRenamingId(null);
                }}
                onBlur={() => {
                  if (renameValue.trim() && renameValue.trim() !== meta.name) {
                    renameMut.mutate({ id: meta.id, name: renameValue.trim() });
                  } else {
                    setRenamingId(null);
                  }
                }}
                style={{
                  width: 120, padding: '1px 4px', borderRadius: 2,
                  background: C.bg, border: `1px solid ${C.teal}`,
                  color: C.text, fontFamily: C.font, fontSize: 11,
                  outline: 'none',
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenamingId(meta.id);
                  setRenameValue(meta.name);
                }}
                style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text' }}
                title="Double-click to rename"
              >
                {meta.name}
              </span>
            )}
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
            >{'\u00D7'}</button>
          </div>
        );
      })}

      {/* + ADD TAB */}
      <button
        onClick={() => {
          setShowAddPanel(!showAddPanel);
          if (!showAddPanel) setActiveId(null);
        }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 26,
          borderRadius: '4px 4px 0 0',
          background: showAddPanel ? C.card : 'transparent',
          border: `1px solid ${showAddPanel ? C.border : 'transparent'}`,
          borderBottom: showAddPanel ? `1px solid ${C.card}` : '1px solid transparent',
          cursor: 'pointer', marginBottom: -1,
          color: showAddPanel ? C.teal : '#475569',
          fontSize: 16, fontWeight: 700,
          transition: 'color 0.15s',
          fontFamily: C.font,
        }}
        title="Add new watchlist"
      >
        <Plus size={14} />
      </button>

      {uploadLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', marginBottom: -1 }}>
          <div className="wl-spin" style={{ width: 12, height: 12, border: `2px solid ${C.teal}30`, borderTopColor: C.teal, borderRadius: '50%' }} />
          <span style={{ fontSize: 10, color: C.teal }}>{uploadStage}</span>
        </div>
      )}
    </div>
  );

  /* ── add panel renderer ──────────────────────────────────────────── */
  const renderAddPanel = () => showAddPanel ? (
    <div style={{
      padding: '20px 20px 16px',
      background: C.card,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: '0.05em' }}>
        ADD NEW WATCHLIST
      </div>

      {/* Watchlist Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text, flexShrink: 0 }}>NAME</span>
        <input
          type="text"
          value={watchlistName}
          onChange={e => setWatchlistName(e.target.value)}
          placeholder="My Watchlist (optional)"
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 4,
            background: C.bg, border: `1px solid ${C.border}`,
            color: C.text, fontFamily: C.font, fontSize: 11,
            outline: 'none',
          }}
          onFocus={e => e.currentTarget.style.borderColor = C.teal}
          onBlur={e => e.currentTarget.style.borderColor = C.border}
        />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {/* Option 1: CSV Upload */}
        <div style={{
          flex: 1, minWidth: 260,
          padding: 16, borderRadius: 6,
          background: C.card2, border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}
          onClick={() => csvInputRef.current?.click()}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.teal}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
        >
          <Upload size={20} style={{ color: C.teal }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Upload CSV File</div>
          <div style={{ fontSize: 10, color: C.dim, textAlign: 'center' }}>
            Drag & drop or click to select a .csv file with stock tickers and data
          </div>
        </div>

        {/* Option 2: Plain Text */}
        <div style={{
          flex: 1, minWidth: 260,
          padding: 16, borderRadius: 6,
          background: C.card2, border: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: C.purple }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Enter Tickers</span>
          </div>
          <textarea
            value={plainTextInput}
            onChange={e => setPlainTextInput(e.target.value)}
            placeholder="AAPL, NVDA, CRDO, PLTR, ARM..."
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 4,
              background: C.bg, border: `1px solid ${C.border}`,
              color: C.text, fontFamily: C.font, fontSize: 11,
              resize: 'vertical', outline: 'none',
            }}
            onFocus={e => e.currentTarget.style.borderColor = C.purple}
            onBlur={e => e.currentTarget.style.borderColor = C.border}
          />
          <button
            onClick={handlePlainTextSubmit}
            disabled={!plainTextInput.trim()}
            style={{
              alignSelf: 'flex-end',
              padding: '5px 16px', borderRadius: 4,
              background: plainTextInput.trim() ? C.purple : 'transparent',
              border: `1px solid ${plainTextInput.trim() ? C.purple : C.border}`,
              color: plainTextInput.trim() ? '#fff' : C.dim,
              fontSize: 10, fontWeight: 700, fontFamily: C.font,
              cursor: plainTextInput.trim() ? 'pointer' : 'not-allowed',
              letterSpacing: '0.04em',
            }}
          >
            ANALYZE
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={csvInputRef}
        accept=".csv,.tsv,.txt"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCsvFile(file);
          e.target.value = '';
        }}
      />
    </div>
  ) : null;

  /* ── market themes banner ────────────────────────────────────────── */
  const renderMarketThemes = () => {
    if (!marketThemes.length) return null;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 20px',
        background: C.card2,
        borderBottom: `1px solid ${C.border}`,
        overflowX: 'auto',
      }}
        className="wl-chip-strip"
      >
        <span style={{
          fontSize: 8, fontWeight: 800, color: C.dim,
          fontFamily: C.font, letterSpacing: '0.08em',
          textTransform: 'uppercase', flexShrink: 0,
        }}>
          THEMES
        </span>
        {marketThemes.map((theme, i) => (
          <span
            key={i}
            style={{
              flexShrink: 0,
              padding: '3px 10px', borderRadius: 4,
              fontSize: 10, fontWeight: 600,
              fontFamily: C.sansFont,
              color: C.teal,
              background: `${C.teal}10`,
              border: `1px solid ${C.teal}20`,
              whiteSpace: 'nowrap',
            }}
          >
            {theme}
          </span>
        ))}
      </div>
    );
  };

  /* ── upgrade banner for legacy format ─────────────────────────────── */
  const renderUpgradeBanner = () => {
    if (newFmt || !hasAnalysis) return null;
    const autoTriggered = activeId ? autoTriggeredRef.current.has(activeId) : false;
    const isUpgrading = refreshMut.isPending;

    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, padding: '10px 20px',
        background: `linear-gradient(90deg, ${C.teal}08, ${C.purple}08)`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {isUpgrading ? (
            <div className="wl-spin" style={{ width: 14, height: 14, border: `2px solid ${C.teal}30`, borderTopColor: C.teal, borderRadius: '50%', flexShrink: 0 }} />
          ) : (
            <span style={{ fontSize: 14 }}>{'\u26A1'}</span>
          )}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.text,
              fontFamily: C.sansFont,
            }}>
              {isUpgrading ? 'Auto-upgrading to multi-source analysis...' : 'Multi-source deep analysis available'}
            </div>
            <div style={{
              fontSize: 10, color: C.dim, fontFamily: C.sansFont, marginTop: 1,
            }}>
              {isUpgrading
                ? 'Fetching technical, sentiment, and catalyst data from multiple AI sources.'
                : 'Upgrade this watchlist with technical, sentiment, and catalyst data from multiple AI sources.'}
            </div>
          </div>
        </div>
        {!isUpgrading && !autoTriggered && (
          <button
            onClick={() => refreshMut.mutate()}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 18px', borderRadius: 5,
              background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`,
              border: 'none',
              color: '#fff', fontSize: 10, fontWeight: 800,
              fontFamily: C.font, cursor: 'pointer',
              letterSpacing: '0.05em',
              boxShadow: `0 0 12px ${C.teal}30`,
            }}
          >
            <RefreshCw style={{ width: 11, height: 11 }} />
            RUN DEEP ANALYSIS
          </button>
        )}
      </div>
    );
  };

  /* ── signal strip for new format ─────────────────────────────────── */
  const renderNewFormatSignalStrip = () => {
    if (!newFmt || !allStocks.length) return null;
    return (
      <div className="wl-chip-strip" style={{
        display: 'flex', gap: 6,
        padding: '10px 20px',
        overflowX: 'auto',
        borderBottom: `1px solid ${C.border}`,
        background: C.card2,
      }}>
        {allStocks.map((stock, i) => {
          const col = stock.section_id ? sectionAccent(stock.section_id) : C.teal;
          const cCol = changeColor(stock.change_pct);
          return (
            <button
              key={`chip-${stock.ticker || i}`}
              onClick={() => stock.ticker && handleTickerClick(stock.ticker)}
              style={{
                flexShrink: 0,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 4,
                background: col + '10',
                border: `1px solid ${col}25`,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = col + '22'}
              onMouseLeave={e => e.currentTarget.style.background = col + '10'}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: C.font }}>
                {stock.ticker || '\u2014'}
              </span>
              {stock.price != null && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: C.font }}>
                  ${stock.price.toFixed(2)}
                </span>
              )}
              {stock.change_pct != null && (
                <span style={{
                  fontSize: 8, fontWeight: 800, fontFamily: C.font,
                  padding: '1px 5px', borderRadius: 3,
                  color: cCol,
                  background: cCol + '15',
                }}>
                  {stock.change_pct > 0 ? '+' : ''}{stock.change_pct.toFixed(1)}%
                </span>
              )}
              {stock.risk_level && (
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: riskColor(stock.risk_level),
                  boxShadow: `0 0 3px ${riskColor(stock.risk_level)}60`,
                  flexShrink: 0,
                }} />
              )}
            </button>
          );
        })}
        {pendingCount > 0 && (
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 4,
            background: C.amber + '10', border: `1px solid ${C.amber}25`,
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.amber, fontFamily: C.font }}>
              +{pendingCount} pending analysis
            </span>
          </div>
        )}
      </div>
    );
  };

  /* ── legacy signal strip ─────────────────────────────────────────── */
  const renderLegacySignalStrip = () => {
    if (newFmt) return null;
    return (
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
                {stock.ticker || '\u2014'}
              </span>
              <span style={{
                fontSize: 8, fontWeight: 800, fontFamily: C.font,
                padding: '1px 6px', borderRadius: 3,
                color: '#000', background: col,
                textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                whiteSpace: 'nowrap' as const,
              }}>
                {stock.signal || '\u2014'}
              </span>
            </button>
          );
        })}
        {allStocks.length === 0 && (
          <span style={{ fontSize: 10, color: C.dim }}>No signals</span>
        )}
      </div>
    );
  };

  /* ── ticker table for new format ─────────────────────────────────── */
  const renderNewFormatTickerTable = () => (
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
        <span style={{ fontSize: 9, color: C.dim }}>
          {pendingCount > 0
            ? `${analyzedCount} analyzed · ${pendingCount} pending`
            : `${mergedTickers.length} total`}
        </span>
        {pendingCount > 0 && (
          <span style={{
            fontSize: 7, fontWeight: 800, fontFamily: C.font,
            padding: '2px 6px', borderRadius: 3,
            color: C.amber, background: C.amber + '18',
            border: `1px solid ${C.amber}30`,
            textTransform: 'uppercase' as const, letterSpacing: '0.04em',
          }}>
            {pendingCount} PENDING ANALYSIS
          </span>
        )}
      </div>

      {/* table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '62px 1fr 72px 52px 70px',
        padding: '6px 14px',
        borderBottom: `1px solid ${C.border}`,
        fontSize: 8, fontWeight: 700, color: C.dim,
        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
      }}>
        <span>Ticker</span><span>Company</span><span>Price</span><span>Chg%</span><span>Status</span>
      </div>

      {/* table rows */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="wl-scrollbar">
        {mergedTickers.map((stock, i) => {
          const isPending = stock._pending;
          const cCol = changeColor(stock.change_pct);
          const rCol = riskColor(stock.risk_level);
          return (
            <div
              key={`row-${stock.ticker}-${i}`}
              onClick={() => !isPending && stock.ticker && handleTickerClick(stock.ticker)}
              style={{
                display: 'grid',
                gridTemplateColumns: '62px 1fr 72px 52px 70px',
                padding: '7px 14px',
                borderBottom: `1px solid ${C.border}`,
                background: i % 2 === 0 ? 'transparent' : `${C.border}08`,
                cursor: isPending ? 'default' : 'pointer',
                transition: 'background 0.1s',
                alignItems: 'center',
                opacity: isPending ? 0.55 : 1,
              }}
              onMouseEnter={e => { if (!isPending) e.currentTarget.style.background = `${C.teal}0c`; }}
              onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : `${C.border}08`; }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: isPending ? C.dim : '#fff' }}>
                {stock.ticker || '\u2014'}
              </span>
              <span style={{ fontSize: 10, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                {isPending ? '' : (stock.company || '\u2014')}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: C.font, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {!isPending && stock.price != null ? `$${stock.price.toFixed(2)}` : '\u2014'}
                {!isPending && stock.price_source && (
                  <PriceFreshnessBadge
                    compact
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
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: cCol, fontFamily: C.font }}>
                {!isPending && stock.change_pct != null
                  ? `${stock.change_pct > 0 ? '+' : ''}${stock.change_pct.toFixed(1)}%`
                  : '\u2014'}
              </span>
              <span style={{
                fontSize: 7, fontWeight: 800, fontFamily: C.font,
                padding: '2px 5px', borderRadius: 3,
                color: isPending ? C.amber : rCol,
                background: (isPending ? C.amber : rCol) + '15',
                textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
                justifySelf: 'start',
              }}>
                {isPending ? 'PENDING' : (stock.risk_level ? stock.risk_level.toUpperCase() : '\u2014')}
              </span>
            </div>
          );
        })}
        {mergedTickers.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>No tickers</div>
        )}
      </div>
    </div>
  );

  /* ── legacy ticker table ─────────────────────────────────────────── */
  const renderLegacyTickerTable = () => (
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
              {stock.ticker || '\u2014'}
            </span>
            <span style={{ fontSize: 10, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {stock.company || '\u2014'}
            </span>
            <span style={{
              fontSize: 7, fontWeight: 800,
              padding: '2px 6px', borderRadius: 3,
              color: '#000', background: signalColor(stock.signal),
              textTransform: 'uppercase' as const, letterSpacing: '0.04em',
              textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
              justifySelf: 'start',
            }}>
              {stock.signal || '\u2014'}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: signalColor(stock.signal), textAlign: 'center' as const }}>
              {stock.score ?? '\u2014'}
            </span>
            <span style={{ fontSize: 10, color: C.text, textAlign: 'right' as const }}>
              {stock.ps_ratio != null ? (typeof stock.ps_ratio === 'number' ? stock.ps_ratio.toFixed(1) : stock.ps_ratio) : '\u2014'}
            </span>
            <span style={{ fontSize: 10, color: C.text, textAlign: 'right' as const }}>
              {stock.pe_ratio != null ? (typeof stock.pe_ratio === 'number' ? stock.pe_ratio.toFixed(1) : stock.pe_ratio) : '\u2014'}
            </span>
          </div>
        ))}
        {allStocks.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>No stocks</div>
        )}
      </div>
    </div>
  );

  /* ── loading state ───────────────────────────────────────────────── */
  if (wlLoading && !wlMetas?.length) {
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
        {renderTabBar()}
        {renderAddPanel()}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ fontFamily: C.font, fontSize: 14, color: C.dim, lineHeight: 2.2, textAlign: 'center' }}>
            <div><span style={{ color: C.teal }}>&gt;</span> No watchlist loaded.</div>
            <div><span style={{ color: C.teal }}>&gt;</span> Click <span style={{ color: C.teal }}>+</span> above to add one, or upload a CSV in AI Terminal.</div>
            <div><span style={{ color: C.teal }}>&gt;</span> <span className="wl-blink" style={{ color: C.text }}>_</span></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: C.font, display: 'flex', flexDirection: 'column' }}>

      {/* ── Watchlist Tabs ── */}
      {renderTabBar()}
      {renderAddPanel()}

      {!showAddPanel && (
        <>
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

            {/* Add tickers inline input */}
            {activeId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    ref={addInputRef}
                    type="text"
                    value={addTickerInput}
                    onChange={e => { setAddTickerInput(e.target.value); setAddTickerStatus(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddTickers(); }}
                    placeholder="Add tickers"
                    disabled={addTickersMut.isPending}
                    style={{
                      width: 130,
                      height: 26,
                      padding: '0 28px 0 8px',
                      borderRadius: 4,
                      background: addTickerStatus === 'success' ? `${C.green}15`
                        : addTickerStatus === 'error' ? `${C.red}15`
                        : addTickerStatus === 'duplicate' ? `${C.amber}15`
                        : C.card2,
                      border: `1px solid ${
                        addTickerStatus === 'success' ? `${C.green}60`
                        : addTickerStatus === 'error' ? `${C.red}60`
                        : addTickerStatus === 'duplicate' ? `${C.amber}60`
                        : C.border
                      }`,
                      color: addTickerStatus === 'success' ? C.green
                        : addTickerStatus === 'error' ? C.red
                        : addTickerStatus === 'duplicate' ? C.amber
                        : C.dim,
                      fontFamily: C.font,
                      fontSize: 10,
                      outline: 'none',
                      transition: 'border-color 0.15s, background 0.15s',
                      opacity: addTickersMut.isPending ? 0.6 : 1,
                    }}
                    onFocus={e => { if (!addTickerStatus) e.currentTarget.style.borderColor = C.teal; }}
                    onBlur={e => { if (!addTickerStatus) e.currentTarget.style.borderColor = C.border; }}
                  />
                  {/* Status icon or submit button inside the input */}
                  <span style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 11, lineHeight: 1, pointerEvents: addTickersMut.isPending ? 'none' : 'auto',
                    cursor: addTickerInput.trim() && !addTickersMut.isPending ? 'pointer' : 'default',
                    color: addTickerStatus === 'success' ? C.green
                      : addTickerStatus === 'error' ? C.red
                      : addTickerStatus === 'duplicate' ? C.amber
                      : addTickerInput.trim() ? C.teal : C.dim,
                    transition: 'color 0.15s',
                  }}
                    onClick={handleAddTickers}
                  >
                    {addTickersMut.isPending ? '…'
                      : addTickerStatus === 'success' ? '✓'
                      : addTickerStatus === 'duplicate' ? '='
                      : addTickerStatus === 'error' ? '✕'
                      : '+'}
                  </span>
                </div>
              </div>
            )}

            {/* Center: summary text */}
            <div style={{
              flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              fontSize: 11, color: C.dim, textAlign: 'center' as const,
            }}>
              {newFmt
                ? (analysis?.sections?.length
                  ? pendingCount > 0
                    ? `${analysis.sections.length} sections · ${analyzedCount}/${mergedTickers.length} analyzed · ${pendingCount} pending`
                    : `${analysis.sections.length} sections · ${analyzedCount} tickers analyzed`
                  : '')
                : (analysis?.summary || '')}
            </div>

            {/* Strategy selector */}
            {strategyPlaybooks.length > 0 && (
              <StrategySelector
                playbooks={strategyPlaybooks}
                selectedId={selectedStrategy}
                onChange={(id) => {
                  setSelectedStrategy(id);
                  if (id !== 'default') {
                    runStrategyScore(id, allTickerSymbols);
                  } else {
                    setStrategyScoreData(null);
                  }
                }}
                compact
              />
            )}

            {/* Right: error + last analyzed + refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {refreshError && !refreshMut.isPending && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 4,
                  background: `${C.red}12`, border: `1px solid ${C.red}30`,
                  maxWidth: 320,
                }}>
                  <span style={{ fontSize: 9, color: C.red, fontFamily: C.font, fontWeight: 700 }}>
                    ✕ ANALYSIS FAILED:
                  </span>
                  <span style={{ fontSize: 9, color: C.red, fontFamily: C.sansFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {refreshError}
                  </span>
                  <button
                    onClick={() => setRefreshError(null)}
                    style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1, flexShrink: 0 }}
                  >×</button>
                </div>
              )}
              {lastUpdated && !refreshError && (
                <span style={{ fontSize: 10, color: C.dim }}>
                  Last analyzed: {timeAgo(lastUpdated)}
                </span>
              )}
              <button
                onClick={() => { setRefreshError(null); refreshMut.mutate(); }}
                disabled={refreshMut.isPending}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 12px', borderRadius: 4,
                  background: refreshError ? `${C.amber}15` : 'transparent',
                  border: `1px solid ${refreshError ? C.amber : C.teal}50`,
                  color: refreshError ? C.amber : C.teal,
                  fontSize: 10, fontWeight: 700,
                  fontFamily: C.font, cursor: refreshMut.isPending ? 'not-allowed' : 'pointer',
                  opacity: refreshMut.isPending ? 0.5 : 1,
                  letterSpacing: '0.04em',
                }}
              >
                <RefreshCw
                  style={{ width: 11, height: 11 }}
                  className={refreshMut.isPending ? 'wl-spin' : ''}
                />
                {refreshMut.isPending ? 'ANALYZING...' : refreshError ? '↺ RETRY' : '⟳ REFRESH'}
              </button>
            </div>
          </div>

          {/* ═══ MAIN BODY (scrollable) ═══ */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="wl-scrollbar">

            {/* ── Market Themes Banner ── */}
            {renderMarketThemes()}

            {/* ── Upgrade Banner (legacy → new format) ── */}
            {renderUpgradeBanner()}

            {/* ── Row 1: Signal Summary Strip ── */}
            {newFmt ? renderNewFormatSignalStrip() : renderLegacySignalStrip()}

            {/* ── Strategy Score Panel ── */}
            {selectedStrategy !== 'default' && (strategyScoreData || strategyScoreLoading) && (
              <div style={{ padding: '0 20px' }}>
                {strategyScoreLoading && !strategyScoreData ? (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: C.dim, fontFamily: C.font }}>
                    Scoring {allTickerSymbols.length} tickers against {strategyPlaybooks.find(p => p.id === selectedStrategy)?.short_label || selectedStrategy}…
                  </div>
                ) : strategyScoreData ? (
                  <WatchlistScorePanel
                    data={strategyScoreData}
                    playbookName={strategyPlaybooks.find(p => p.id === selectedStrategy)?.name || selectedStrategy}
                    playbookColor={strategyPlaybooks.find(p => p.id === selectedStrategy)?.ui_color}
                    loading={strategyScoreLoading}
                    onRescore={() => runStrategyScore(selectedStrategy, allTickerSymbols)}
                  />
                ) : null}
              </div>
            )}

            {/* ── Row 2: Section panels (new format) / Category panels (legacy) ── */}
            <div style={{ padding: '16px 20px', position: 'relative', minHeight: refreshMut.isPending ? 280 : undefined }}>
              {refreshMut.isPending && <AnalysisLoadingOverlay />}
              {newFmt
                ? <NewFormatSections analysis={analysis} onTickerClick={handleTickerClick} allTickerSymbols={allTickerSymbols} />
                : <WatchlistAnalysis data={analysis} onTickerClick={handleTickerClick} />
              }
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
              {newFmt ? renderNewFormatTickerTable() : renderLegacyTickerTable()}

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
                    const tickerStock = allStocks.find(s => (s.ticker || '').toUpperCase() === (item.ticker || '').toUpperCase());
                    const col = newFmt
                      ? (tickerStock?.section_id ? sectionAccent(tickerStock.section_id) : C.teal)
                      : signalColor(tickerStock?.signal);
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
        </>
      )}

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
