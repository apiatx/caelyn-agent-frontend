import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WatchlistAnalysis from '@/components/WatchlistAnalysis';
import type { AnalysisSection, TickerCard } from '@/components/WatchlistAnalysis';
import { StockDetailModal } from '@/components/StockDetailModal';
import { RefreshCw, ExternalLink, Plus, Upload, FileText } from 'lucide-react';

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
            ticker: t.symbol,
            company: t.name,
            price: t.price,
            change_pct: t.change_pct,
            signal: t.change_pct != null ? (t.change_pct >= 0 ? 'BUY' : 'HOLD') : undefined,
            risk_level: t.risk_level,
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
  const csvInputRef = useRef<HTMLInputElement>(null);

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
      if (!r.ok) throw new Error('Refresh failed');
      return r.json();
    },
    onSuccess: (data) => {
      // If the response contains the new analysis directly, update cache immediately
      if (data && (data.analysis || data.sections)) {
        qc.setQueryData(['/api/watchlist', activeId], (old: any) => {
          if (!old) return old;
          // Response may wrap analysis in an `analysis` key, or be the analysis itself
          const newAnalysis = data.analysis ?? (data.sections ? data : undefined);
          return newAnalysis ? { ...old, analysis: newAnalysis } : old;
        });
      }
      // Also invalidate to refetch the canonical state from the server
      qc.invalidateQueries({ queryKey: ['/api/watchlist', activeId] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/news', activeId] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
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

  const handleTickerClick = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
  }, []);

  /* ── upload handlers ────────────────────────────────────────────── */
  const AGENT_BACKEND_URL = 'https://fast-api-server-trading-agent-aidanpilon.replit.app';

  async function handleUpload(csvText: string, _fileName?: string) {
    setUploadLoading(true);
    setShowAddPanel(false);
    setUploadStage('Analyzing watchlist...');
    const nameToSet = watchlistName.trim();
    setWatchlistName('');
    try {
      await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Analyze this watchlist CSV and give me a buy/hold/sell for every asset, plus the top 2-3 best investments right now based on the data.',
          csv_data: csvText,
        }),
      });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
      setTimeout(async () => {
        const listRes = await fetch('/api/watchlist/list');
        const list: WatchlistMeta[] = await listRes.json();
        qc.setQueryData(['/api/watchlist/list'], list);

        if (list.length > 0) {
          const newest = list[0];
          if (nameToSet) {
            await fetch(`/api/watchlist/${newest.id}/rename`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: nameToSet }),
            });
            qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
          }
          setActiveId(newest.id);
        }
        setUploadLoading(false);
        setUploadStage('');
      }, 2500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadLoading(false);
      setUploadStage('');
      alert('Upload failed: ' + (err.message || 'Unknown error'));
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
  const hasAnalysis = newFmt
    ? (analysis?.sections?.length > 0)
    : (analysis && (analysis.top_buys?.length || analysis.most_undervalued?.length || analysis.best_catalysts?.length || analysis.hidden_gems?.length || analysis.most_revolutionary?.length || analysis.right_sector?.length));
  const allStocks = extractAllStocks(analysis);
  const allNews = flattenNews(newsData);
  const marketThemes: string[] = newFmt ? (analysis?.market_themes || []) : [];
  const lastUpdated: string | undefined = newFmt ? analysis?.last_updated : watchlist?.saved_at;

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
    if (newFmt || !hasAnalysis || refreshMut.isPending) return null;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, padding: '10px 20px',
        background: `linear-gradient(90deg, ${C.teal}08, ${C.purple}08)`,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14 }}>{'\u26A1'}</span>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.text,
              fontFamily: C.sansFont,
            }}>
              Multi-source deep analysis available
            </div>
            <div style={{
              fontSize: 10, color: C.dim, fontFamily: C.sansFont, marginTop: 1,
            }}>
              Upgrade this watchlist with technical, sentiment, and catalyst data from multiple AI sources.
            </div>
          </div>
        </div>
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
        <span style={{ fontSize: 9, color: C.dim }}>({allStocks.length})</span>
      </div>

      {/* table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '62px 1fr 72px 52px 62px',
        padding: '6px 14px',
        borderBottom: `1px solid ${C.border}`,
        fontSize: 8, fontWeight: 700, color: C.dim,
        textTransform: 'uppercase' as const, letterSpacing: '0.08em',
      }}>
        <span>Ticker</span><span>Company</span><span>Price</span><span>Chg%</span><span>Risk</span>
      </div>

      {/* table rows */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="wl-scrollbar">
        {allStocks.map((stock, i) => {
          const cCol = changeColor(stock.change_pct);
          const rCol = riskColor(stock.risk_level);
          return (
            <div
              key={`row-${stock.ticker}-${i}`}
              onClick={() => stock.ticker && handleTickerClick(stock.ticker)}
              style={{
                display: 'grid',
                gridTemplateColumns: '62px 1fr 72px 52px 62px',
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
              <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: C.font }}>
                {stock.price != null ? `$${stock.price.toFixed(2)}` : '\u2014'}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: cCol, fontFamily: C.font }}>
                {stock.change_pct != null ? `${stock.change_pct > 0 ? '+' : ''}${stock.change_pct.toFixed(1)}%` : '\u2014'}
              </span>
              <span style={{
                fontSize: 7, fontWeight: 800, fontFamily: C.font,
                padding: '2px 5px', borderRadius: 3,
                color: rCol, background: rCol + '15',
                textTransform: 'uppercase' as const, letterSpacing: '0.04em',
                textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
                justifySelf: 'start',
              }}>
                {stock.risk_level ? stock.risk_level.toUpperCase() : '\u2014'}
              </span>
            </div>
          );
        })}
        {allStocks.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>No stocks</div>
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

            {/* Center: summary text */}
            <div style={{
              flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
              fontSize: 11, color: C.dim, textAlign: 'center' as const,
            }}>
              {newFmt
                ? (analysis?.sections?.length
                  ? `${analysis.sections.length} sections \u00B7 ${allStocks.length} tickers analyzed`
                  : '')
                : (analysis?.summary || '')}
            </div>

            {/* Right: last analyzed + refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {lastUpdated && (
                <span style={{ fontSize: 10, color: C.dim }}>
                  Last analyzed: {timeAgo(lastUpdated)}
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
                {refreshMut.isPending ? 'ANALYZING...' : '\u27F3 REFRESH'}
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

            {/* ── Row 2: WatchlistAnalysis section panels ── */}
            <div style={{ padding: '16px 20px', position: 'relative', minHeight: refreshMut.isPending ? 280 : undefined }}>
              {refreshMut.isPending && <AnalysisLoadingOverlay />}
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
