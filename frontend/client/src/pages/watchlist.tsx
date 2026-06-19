import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { useSetScreenContext } from '@/hooks/useSetScreenContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WatchlistAnalysis from '@/components/WatchlistAnalysis';
import type { AnalysisSection, TickerCard } from '@/components/WatchlistAnalysis';
import { StockDetailModal } from '@/components/StockDetailModal';
import { RefreshCw, ExternalLink, Plus, Upload, FileText, Star } from 'lucide-react';
import StrategySelector from '@/components/strategy-selector';
import { WatchlistScorePanel } from '@/components/playbook-score-panel';
import { fetchPlaybooks, scoreWatchlist } from '@/lib/playbooks';
import type { PlaybookSummary, WatchlistPlaybookResponse } from '@/types/playbook';
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes';
import { mergeRealtimeQuote } from '@/lib/mergeRealtimeQuote';
import { PriceFreshnessBadge } from '@/components/PriceFreshnessBadge';

/* ── color tokens (Hyperliquid style) ──────────────────────────────── */
const C = {
  bg: '#020202', card: '#0a0a0a', card2: '#060606',
  border: 'rgba(255,255,255,0.10)', text: '#f5f5f0', dim: '#a9aaa6',
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

interface TopArticle {
  title:             string;
  url:               string;
  source:            string;
  published_at:      string;
  symbol?:           string;
  major_news_score?: number;
  signal_strength?:  string;
  catalyst_type?:    string;
  bull_bear_impact?: string;
  why_it_matters?:   string;
}

interface FlatNewsItem extends NewsItem {
  symbol?:           string;
  major_news_score?: number;
  signal_strength?:  string;
  catalyst_type?:    string;
  bull_bear_impact?: string;
  why_it_matters?:   string;
}

interface NewsResponse {
  top_articles?: TopArticle[];
  is_building?:  boolean;
  cache_age_s?:  number;
  [ticker: string]: any;
}

interface MajorNewsItem {
  title: string;
  summary?: string;
  url: string;
  published_at?: string;
  source?: string;
  is_major_development?: boolean;
  is_top_major_development?: boolean;
  major_news_score?: number;
  major_news_label?: string;
  catalyst_type?: string;
  signal_strength?: string;
  bull_bear_impact?: string;
  why_it_matters?: string;
  matched_entities?: string[];
  matched_keywords?: string[];
  related_watchlist_symbols?: string[];
  source_quality?: string;
  surface_priority?: number;
  major_news_rank?: number;
  duplicate_cluster_key?: string;
}

interface MajorNewsResponse {
  major_developments: MajorNewsItem[];
  major_developments_count: number;
  high_signal_count?: number;
  by_catalyst_type?: Record<string, number>;
  news_signal_meta?: {
    total_articles?: number;
    total_major_developments?: number;
    total_top_major?: number;
    duplicate_clusters_removed?: number;
    unique_clusters?: number;
  };
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
            // Spread full backend ticker object first so any fundamentals fields
            // (revenue, pe_ratio, margins, etc.) the backend sends pass through.
            ...t,
            // Explicit overrides / aliases ensure correct field names regardless of
            // what the backend chose to call them.
            ticker: t.symbol || t.ticker,
            company: t.name || t.company,
            price: t.price,
            change_pct: t.change_pct_1d ?? t.change_pct,
            volume: t.volume,
            average_volume: t.average_volume ?? t.avg_volume,
            relative_volume: t.relative_volume ?? t.rel_vol ?? t.volx,
            high: t.high ?? t.day_high,
            low: t.low ?? t.day_low,
            sector: t.sector ?? t.category ?? t.industry,
            quote_source: t.quote_source,
            quote_updated_at: t.quote_updated_at ?? t.updated_at ?? t.price_updated_at,
            signal: (t.change_pct ?? t.change_pct_1d) != null ? ((t.change_pct ?? t.change_pct_1d) >= 0 ? 'BUY' : 'HOLD') : undefined,
            risk_level: t.risk_level,
            catalyst: t.catalyst,
            sentiment: t.sentiment,
            action_note: t.action_note,
            key_insight: t.key_insight,
            vol_mc_pct: t.vol_mc_pct ?? null,
            vol_mc_ratio: t.vol_mc_ratio ?? null,
            vol_mc_label: t.vol_mc_label ?? null,
            vol_mc_unavailable_reason: t.vol_mc_unavailable_reason ?? null,
            market_cap: t.market_cap ?? null,
            dollar_volume: t.dollar_volume ?? null,
            section_id: section.id,
            section_title: section.title,
            canonical_theme_name: section.canonical_theme_name || section.title,
            canonical_theme_id: section.canonical_theme_id || section.id,
            rel_vol_trend: t.rel_vol_trend ?? null,
            rel_vol_rank_delta: t.rel_vol_rank_delta ?? null,
            rel_vol_value_delta: t.rel_vol_value_delta ?? null,
            rel_vol_momentum_label: t.rel_vol_momentum_label ?? null,
            vol_mc_trend: t.vol_mc_trend ?? null,
            vol_mc_pct_delta: t.vol_mc_pct_delta ?? null,
            vol_mc_prev_pct: t.vol_mc_prev_pct ?? null,
            vol_mc_momentum_label: t.vol_mc_momentum_label ?? null,
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

/* ── resolve theme label from string or canonical object ────────────── */
// Backend may return market_themes entries as plain strings (old) or as
// { canonical_theme_name, canonical_theme_id } objects (new). Always prefer
// canonical_theme_name; fall back gracefully to the raw string.
function resolveThemeLabel(entry: string | { canonical_theme_name?: string; canonical_theme_id?: string; [k: string]: any }): string {
  if (typeof entry === 'string') return entry;
  return entry?.canonical_theme_name || entry?.canonical_theme_id || String(entry);
}

/* ── resolve section display title ─────────────────────────────────── */
// Prefers canonical_theme_name (new backend field) over legacy title string.
function resolveSectionTitle(section: any): string {
  return section?.canonical_theme_name || section?.title || 'Untitled';
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

/* ── compact number formatters ─────────────────────────────────────── */
const DASH = '—';

function formatPrice(p: any): string {
  if (p == null || !Number.isFinite(Number(p))) return DASH;
  return `$${Number(p).toFixed(2)}`;
}

function formatChgPct(c: any): string {
  if (c == null || !Number.isFinite(Number(c))) return DASH;
  const n = Number(c);
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function formatVolume(v: any): string {
  if (v == null || !Number.isFinite(Number(v))) return DASH;
  const n = Number(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

function formatVolMcPct(pct: any): string {
  if (pct == null || !Number.isFinite(Number(pct))) return DASH;
  return `${Number(pct).toFixed(2)}%`;
}

function volMcLabelColor(label: string | null | undefined, C: Record<string, string>): string {
  if (!label) return C.text;
  switch (label.toLowerCase()) {
    case 'low':      return C.dim;
    case 'normal':   return C.teal;
    case 'elevated': return C.amber;
    case 'high':     return C.red;
    default:         return C.text;
  }
}

function formatEpsVal(v: any): string {
  if (v == null || !Number.isFinite(Number(v))) return DASH;
  const n = Number(v);
  return (n >= 0 ? '+' : '') + `$${Math.abs(n).toFixed(2)}`;
}

function formatRevEst(v: any): string {
  if (v == null || !Number.isFinite(Number(v))) return DASH;
  const n = Number(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${Math.round(n)}`;
}

function formatRelVol(volume: any, averageVolume: any, preComputed?: any): string {
  // Prefer pre-computed relative_volume from backend (shared cache); fall back
  // to volume / average_volume when only the raw fields are present.
  if (preComputed != null && Number.isFinite(Number(preComputed))) {
    return `${Number(preComputed).toFixed(1)}x`;
  }
  const v = Number(volume);
  const av = Number(averageVolume);
  if (!Number.isFinite(v) || !Number.isFinite(av) || av === 0) return DASH;
  return `${(v / av).toFixed(1)}x`;
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
    @media (max-width: 900px) {
      .wl-top-split {
        grid-template-columns: 1fr !important;
        height: auto !important;
      }
      .wl-top-split > * {
        height: clamp(320px, 50vh, 520px) !important;
      }
    }
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
      background: 'rgba(2,2,2,0.90)',
      borderRadius: 8,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20,
    }}>
      {/* spinner */}
      <div style={{ position: 'relative', width: 48, height: 48 }}>
        <div className="wl-spin" style={{
          position: 'absolute', inset: 0,
          border: '2px solid rgba(255,255,255,0.08)',
          borderTopColor: 'rgba(255,255,255,0.55)',
          borderRadius: '50%',
        }} />
        <div className="wl-spin" style={{
          position: 'absolute', inset: 6,
          border: '2px solid rgba(255,255,255,0.05)',
          borderBottomColor: 'rgba(255,255,255,0.30)',
          borderRadius: '50%',
          animationDuration: '1.5s',
          animationDirection: 'reverse',
        }} />
      </div>

      {/* stage text */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
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
              background: i <= stageIdx ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.12)',
              transition: 'background 0.3s',
              boxShadow: i === stageIdx ? '0 0 6px rgba(255,255,255,0.25)' : 'none',
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
function NewFormatSections({ analysis, onTickerClick, allTickerSymbols, realtimeQuotes }: { analysis: any; onTickerClick?: (t: string) => void; allTickerSymbols?: string[]; realtimeQuotes?: Record<string, any> }) {
  const rawSections: any[] = analysis?.sections || [];
  if (!rawSections.length) return null;

  // Compute average 1D% for each section using live Tradier quotes (fallback to analysis data)
  function sectionAvg1d(section: any): number {
    const tickers: any[] = section.tickers || [];
    const vals: number[] = [];
    for (const t of tickers) {
      const sym = (t.symbol || t.ticker || '').toUpperCase();
      const rt = sym && realtimeQuotes ? realtimeQuotes[sym] : undefined;
      const pct = rt?.change_percent != null
        ? Number(rt.change_percent)
        : Number(t.change_pct ?? t.change_pct_1d ?? NaN);
      if (Number.isFinite(pct)) vals.push(pct);
    }
    if (!vals.length) return -Infinity;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  // Sort sections by avg 1D% descending (best performers first)
  const sections = [...rawSections].sort((a, b) => sectionAvg1d(b) - sectionAvg1d(a));

  // Build set of all symbols that appear in any section
  const analyzedSymbols = new Set<string>();
  for (const section of sections) {
    for (const t of (section.tickers || [])) {
      const sym = t.symbol || t.ticker;
      if (sym) analyzedSymbols.add(sym.toUpperCase());
    }
  }

  // Tickers in the watchlist but not yet analyzed by the backend
  const pendingSymbols = (allTickerSymbols || []).filter(s => !analyzedSymbols.has(s.toUpperCase()));

  // Helper: render a single stock row inside a section card
  function renderStockRow(stock: any, i: number, total: number, accent: string) {
    const sym = stock.symbol || stock.ticker;
    // Support both change_pct (old) and change_pct_1d (new backend field name)
    const chg = stock.change_pct ?? stock.change_pct_1d;
    const chgCol = chg != null ? (chg >= 0 ? C.green : C.red) : C.dim;
    // Primary insight: prefer key_insight, fall back to catalyst
    const insightLine = stock.key_insight || stock.catalyst;
    return (
      <div
        key={sym || i}
        onClick={() => sym && onTickerClick?.(sym)}
        style={{
          padding: '9px 14px',
          borderBottom: i < total - 1 ? `1px solid ${C.border}` : 'none',
          cursor: sym ? 'pointer' : 'default',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = `${accent}0c`)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Row 1: symbol | name | price | 1D chg% | risk badge | sentiment badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: insightLine || stock.action_note || stock.technical_setup ? 5 : 0 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: C.font, flexShrink: 0 }}>
            {sym || '—'}
          </span>
          <span style={{ fontSize: 9, color: C.dim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {stock.name || stock.company || sym}
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
          {stock.sentiment && (
            <span style={{
              fontSize: 7, fontWeight: 700, fontFamily: C.font,
              padding: '1px 5px', borderRadius: 3, flexShrink: 0,
              color: stock.sentiment.toLowerCase().includes('bull') || stock.sentiment.toLowerCase().includes('positive') ? C.green
                : stock.sentiment.toLowerCase().includes('bear') || stock.sentiment.toLowerCase().includes('negative') ? C.red
                : C.amber,
              background: (stock.sentiment.toLowerCase().includes('bull') || stock.sentiment.toLowerCase().includes('positive') ? C.green
                : stock.sentiment.toLowerCase().includes('bear') || stock.sentiment.toLowerCase().includes('negative') ? C.red
                : C.amber) + '18',
              textTransform: 'uppercase' as const,
              maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>
              {stock.sentiment}
            </span>
          )}
        </div>
        {/* Row 2: key_insight or catalyst (primary intelligence line) */}
        {insightLine && (
          <div style={{
            fontSize: 9, color: stock.key_insight ? C.text : C.dim,
            lineHeight: 1.4,
            marginBottom: stock.action_note || stock.technical_setup ? 3 : 0,
            overflow: 'hidden', display: '-webkit-box' as any,
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
          }}>
            {stock.key_insight ? '💡 ' : '⚡ '}{insightLine}
          </div>
        )}
        {/* Row 3: action note / recommendation */}
        {stock.action_note && (
          <div style={{ fontSize: 9, color: accent, fontWeight: 600, fontFamily: C.sansFont, lineHeight: 1.3, marginBottom: stock.technical_setup ? 3 : 0 }}>
            → {stock.action_note}
          </div>
        )}
        {/* Row 4: technical setup (dim, smaller) */}
        {stock.technical_setup && (
          <div style={{
            fontSize: 8, color: C.dim, fontFamily: C.font,
            lineHeight: 1.4, letterSpacing: '0.01em',
            overflow: 'hidden', display: '-webkit-box' as any,
            WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as any,
          }}>
            📊 {stock.technical_setup}
          </div>
        )}
      </div>
    );
  }

  // Helper: render a section card
  function renderSectionCard(section: any, accent: string, key: string | number) {
    const tickers: any[] = section.tickers || [];
    // Use canonical_theme_name if backend provides it; fall back to title
    const displayTitle = resolveSectionTitle(section);
    const avg1d = sectionAvg1d(section);
    const hasAvg = Number.isFinite(avg1d) && avg1d !== -Infinity;
    const avg1dColor = hasAvg ? (avg1d >= 0 ? C.green : C.red) : C.dim;
    return (
      <div key={key} style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${accent}`,
        borderRadius: 6,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: C.sansFont, letterSpacing: '0.02em', flex: 1, minWidth: 0 }}>
              {displayTitle}
            </div>
            {hasAvg && (
              <span style={{
                fontSize: 11, fontWeight: 800, fontFamily: C.font,
                color: avg1dColor,
                background: avg1dColor + '18',
                padding: '2px 7px', borderRadius: 4,
                flexShrink: 0,
                letterSpacing: '0.02em',
              }}>
                {avg1d > 0 ? '+' : ''}{avg1d.toFixed(2)}%
              </span>
            )}
          </div>
          {/* Show legacy title dimmed if canonical name overrides it */}
          {section.canonical_theme_name && section.title && section.canonical_theme_name !== section.title && (
            <div style={{ fontSize: 8, color: C.dim, marginTop: 2, fontFamily: C.font, letterSpacing: '0.02em' }}>
              id: {section.canonical_theme_id || section.id}
            </div>
          )}
          {section.subtitle && (
            <div style={{ fontSize: 9, color: C.dim, marginTop: 3, fontFamily: C.sansFont, lineHeight: 1.4 }}>
              {section.subtitle}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 340 }} className="wl-scrollbar">
          {tickers.map((stock: any, i: number) => renderStockRow(stock, i, tickers.length, accent))}
          {tickers.length === 0 && (
            <div style={{ padding: 14, fontSize: 10, color: C.dim, textAlign: 'center' }}>No tickers</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {sections.map((section: any) => {
          const accent = SECTION_ACCENTS[section.id] || C.teal;
          return renderSectionCard(section, accent, section.id);
        })}
      </div>

      {/* Pending analysis card — tickers in watchlist not yet analyzed */}
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
/* ═══════════════════════════════════════════════════════════════════
   FUNDAMENTALS SCAN TABLE — helpers & column definitions
   ═══════════════════════════════════════════════════════════════════ */
type FundColFmt = 'symbol' | 'str' | 'price' | 'compact' | 'pct' | 'ratio' | 'vol' | 'relvol' | 'date';
interface FundColDef { key: string; label: string; aliases?: string[]; fmt: FundColFmt }

const FUND_COLS: FundColDef[] = [
  { key: 'ticker',           label: 'Symbol',        aliases: ['symbol'],                                                          fmt: 'symbol'  },
  { key: 'sector',           label: 'Industry',      aliases: ['industry', 'category'],                                            fmt: 'str'     },
  { key: 'market_cap',       label: 'Mkt Cap',       aliases: ['marketCap', 'market_capitalization'],                              fmt: 'compact' },
  { key: 'price',            label: 'Price',         aliases: ['last', 'lastPrice', 'close'],                                      fmt: 'price'   },
  { key: 'volume',           label: 'Volume',        aliases: ['vol'],                                                             fmt: 'vol'     },
  { key: 'relative_volume',  label: 'Rel Vol',       aliases: ['rel_vol', 'relVol', 'volx'],                                       fmt: 'relvol'  },
  { key: 'revenue',          label: 'Revenue',       aliases: ['revenue_ttm', 'total_revenue', 'totalRevenue', 'annualRevenue'],   fmt: 'compact' },
  { key: 'revenue_growth_q', label: 'Rev Grwth (Q)', aliases: ['revenueGrowthQ', 'revenue_growth_quarter', 'revenue_growth_qoq'], fmt: 'pct'     },
  { key: 'revenue_growth',   label: 'Rev Grwth (Y)', aliases: ['revenue_growth_yoy', 'revenueGrowth', 'revenueGrowthYoy'],        fmt: 'pct'     },
  { key: 'gross_margin',     label: 'Gross Mgn',     aliases: ['grossMargin', 'gross_profit_margin'],                             fmt: 'pct'     },
  { key: 'fcf_margin',       label: 'FCF Mgn',       aliases: ['freeCashFlowMargin', 'fcfMargin', 'fcf_margin_pct'],              fmt: 'pct'     },
  { key: 'free_cash_flow',   label: 'Free CF',       aliases: ['fcf', 'freeCashFlow', 'free_cashflow', 'freeCashFlowTTM'],        fmt: 'compact' },
  { key: 'operating_income', label: 'Op. Income',    aliases: ['operatingIncome', 'operating_profit', 'operatingProfit'],         fmt: 'compact' },
  { key: 'ebit',             label: 'EBIT',          aliases: ['earningsBeforeInterestTax', 'ebit_ttm'],                          fmt: 'compact' },
  { key: 'pe_ratio',         label: 'P/E',           aliases: ['pe', 'priceEarnings', 'priceToEarningsRatio', 'pe_ttm'],          fmt: 'ratio'   },
  { key: 'ps_ratio',         label: 'P/S',           aliases: ['priceToSales', 'ps', 'price_to_sales', 'ps_ttm'],                 fmt: 'ratio'   },
  { key: 'ev_ebitda',        label: 'EV/EBITDA',     aliases: ['evToEbitda', 'ev_to_ebitda', 'enterpriseValueEbitda'],            fmt: 'ratio'   },
  { key: 'eps_growth',       label: 'EPS Grwth',     aliases: ['epsGrowth', 'eps_growth_yoy', 'epsGrowthYoy'],                    fmt: 'pct'     },
  { key: 'debt_to_equity',   label: 'D/E',           aliases: ['debtToEquity', 'debt_equity', 'debtEquityRatio', 'de_ratio'],     fmt: 'ratio'   },
  { key: 'net_debt_ebitda',  label: 'ND/EBITDA',     aliases: ['netDebtToEbitda', 'net_debt_to_ebitda', 'netDebtEbitda'],         fmt: 'ratio'   },
  { key: 'shares_insiders',  label: 'Insider %',     aliases: ['insiderOwnership', 'insider_ownership', 'insidersPercentHeld'],   fmt: 'pct'     },
  { key: 'earnings_date',    label: 'Earn. Date',    aliases: ['nextEarningsDate', 'next_earnings_date', 'earnings_next_date'],   fmt: 'date'    },
  { key: 'week_52_low',      label: '52W Low',       aliases: ['low_52w', 'fiftyTwoWeekLow', 'fiftytwoWeekLow', '52_week_low'],   fmt: 'price'   },
  { key: 'week_52_high',     label: '52W High',      aliases: ['high_52w', 'fiftyTwoWeekHigh', 'fiftytwoWeekHigh', '52_week_high'], fmt: 'price' },
  { key: 'price_vs_ma20',    label: '% vs MA20',     aliases: ['pct_from_ma20', 'change_from_ma20', 'pctVsMA20', 'ma20_pct_diff'], fmt: 'pct'   },
  { key: 'price_vs_ma50',    label: '% vs MA50',     aliases: ['pct_from_ma50', 'change_from_ma50', 'pctVsMA50', 'ma50_pct_diff'], fmt: 'pct'   },
  { key: 'price_vs_ma200',   label: '% vs MA200',    aliases: ['pct_from_ma200', 'change_from_ma200', 'pctVsMA200', 'ma200_pct_diff'], fmt: 'pct' },
  { key: 'rsi',              label: 'RSI',           aliases: ['rsi_14', 'relStrengthIndex', 'relative_strength_index'],          fmt: 'ratio'   },
  { key: 'atr',              label: 'ATR',           aliases: ['atr_14', 'averageTrueRange', 'average_true_range'],               fmt: 'ratio'   },
];

function fundGetField(row: any, key: string, aliases: string[] = []): any {
  if (!row) return undefined;
  if (row[key] !== undefined && row[key] !== null) return row[key];
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== null) return row[a];
  }
  const canonical = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const wants = [key, ...aliases].map(canonical);
  for (const k of Object.keys(row)) {
    if (wants.includes(canonical(k))) return row[k];
  }
  return undefined;
}

function fundFmtCompact(v: any): string {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n), sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(abs >= 100e9 ? 1 : 2)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(abs >= 100e6 ? 1 : 2)}M`;
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fundFmtPrice(v: any): string {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '—';
}

function fundFmtPct(v: any): { text: string; clr: string } {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return { text: '—', clr: '#64748b' };
  const pct = Math.abs(n) <= 1.5 ? n * 100 : n;
  const sign = pct > 0 ? '+' : '';
  return {
    text: `${sign}${pct.toFixed(2)}%`,
    clr: pct > 0 ? '#22c55e' : pct < 0 ? '#ef4444' : '#64748b',
  };
}

function fundFmtRatio(v: any): string {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n.toFixed(2) : '—';
}

function fundFmtVol(v: any): string {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n) || n === 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(0);
}

function fundFmtDate(v: any): string {
  if (!v) return '—';
  const d = new Date(String(v));
  if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  return String(v).slice(0, 10) || '—';
}

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
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'running'>('idle');
  const [addTickerInput, setAddTickerInput] = useState('');
  const [addTickerStatus, setAddTickerStatus] = useState<null | 'success' | 'duplicate' | 'error'>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const autoTriggeredRef = useRef<Set<string>>(new Set());
  const [strategyPlaybooks, setStrategyPlaybooks] = useState<PlaybookSummary[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('default');
  const [strategyScoreData, setStrategyScoreData] = useState<WatchlistPlaybookResponse | null>(null);
  const [strategyScoreLoading, setStrategyScoreLoading] = useState(false);
  const [sortKey, setSortKey] = useState<null | 'ticker' | 'company' | 'theme' | 'price' | 'chg' | 'volume' | 'relVol' | 'volMc' | 'rvRankMove' | 'optionsScore' | 'optionsPutCall' | 'optionsIv' | 'optionsExpectedMove' | 'optionsVolume' | 'optionsOi'>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [bottomView, setBottomView] = useState<'themes' | 'marketcap' | 'fundamentals'>('themes');
  const [mcSort, setMcSort] = useState<{ key: 'mktcap' | 'ticker' | 'price' | 'chg' | 'volx'; dir: 'asc' | 'desc' }>({ key: 'mktcap', dir: 'desc' });
  const [fundSort, setFundSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'market_cap', dir: 'desc' });
  /* ── Close Watch / favorites ─────────────────────────────────────── */
  const [innerView, setInnerView] = useState<'tickers' | 'close-watch'>('tickers');
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());

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
      if (!r.ok) throw new Error(`watchlist list: ${r.status}`);
      return r.json();
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
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
      if (!r.ok) throw new Error(`watchlist ${activeId}: ${r.status}`);
      return r.json();
    },
    enabled: !!activeId,
    retry: 2,
    staleTime: 60_000,
    // Poll while agent analysis is running in background on the server
    refetchInterval: refreshStatus === 'running' ? 20_000 : false,
  });

  // ── Page context for chatbot ──────────────────────────────────────────────
  useSetPageContext((() => {
    const parts = ['[Page: Watchlist]'];
    const meta = wlMetas?.find((m:any)=>m.id===activeId);
    if (meta?.name) parts.push(`Active watchlist: "${meta.name}"`);
    const tickers: string[] = [];
    if (Array.isArray((watchlist as any)?.tickers)) tickers.push(...(watchlist as any).tickers);
    if (!tickers.length && Array.isArray((watchlist as any)?.sections)) {
      for (const sec of (watchlist as any).sections) if (Array.isArray(sec.tickers)) tickers.push(...sec.tickers.map((t:any)=>t.ticker||t.symbol||t).filter(Boolean));
    }
    if (tickers.length) parts.push(`Watchlist tickers (${tickers.length}): ${tickers.slice(0,30).join(', ')}`);
    parts.push('Analyze these tickers for technical setup, fundamentals, momentum, or relative strength on request.');
    return parts.join('\n');
  })(), [watchlist, activeId, wlMetas]);

  useSetScreenContext((() => {
    const meta = wlMetas?.find((m: any) => m.id === activeId);
    // Collect rich stock objects from sections (new format) or plain tickers (legacy)
    const richStocks: any[] = [];
    if (Array.isArray((watchlist as any)?.sections)) {
      for (const sec of (watchlist as any).sections) {
        if (Array.isArray(sec.tickers)) {
          for (const t of sec.tickers) {
            richStocks.push({
              ticker: t.ticker ?? t.symbol ?? t,
              company: t.company ?? t.name ?? null,
              theme: sec.canonical_theme_name ?? sec.title ?? null,
              price: t.price ?? null,
              change_pct: t.change_pct ?? t.change_pct_1d ?? null,
              volume: t.volume ?? null,
              relative_volume: t.relative_volume ?? t.rel_vol ?? t.volx ?? null,
              signal: t.signal ?? null,
              rating: t.rating ?? t.score ?? null,
            });
          }
        }
      }
    }
    // Fallback: plain ticker strings
    const plainTickers: string[] = [];
    if (!richStocks.length && Array.isArray((watchlist as any)?.tickers)) {
      plainTickers.push(...(watchlist as any).tickers);
    }
    const rows = richStocks.length
      ? richStocks.slice(0, 40)
      : plainTickers.slice(0, 40).map(tk => ({ ticker: tk }));
    return {
      route: '/app/watchlist',
      page: 'watchlist',
      selected: activeId,
      sort: sortKey ? { key: sortKey, dir: sortDir } : null,
      row_count: richStocks.length || plainTickers.length,
      visible_symbols: rows.map((r: any) => r.ticker).filter(Boolean),
      visible_rows: rows,
      freshness: (watchlist as any)?.cache_ts ?? (watchlist as any)?.updated_at ?? undefined,
      extra: {
        watchlist_name: meta?.name ?? null,
        freshness: (watchlist as any)?.cache_ts ?? (watchlist as any)?.updated_at ?? null,
      },
    };
  })(), [watchlist, activeId, wlMetas, sortKey, sortDir]);

  /* ── news for active watchlist ───────────────────────────────────── */
  const { data: newsData, isFetching: newsFetching } = useQuery<NewsResponse>({
    queryKey: ['/api/watchlist/news', activeId],
    queryFn: async () => {
      if (!activeId) return {};
      const r = await fetch(`/api/watchlist/${activeId}/news`);
      if (!r.ok) return {};
      return r.json();
    },
    staleTime: 18 * 60_000,
    refetchInterval: 20 * 60 * 1000,
    enabled: !!activeId && !!watchlist?.analysis,
  });

  /* ── major developments for active watchlist ─────────────────────── */
  const { data: majorNewsData } = useQuery<MajorNewsResponse>({
    queryKey: ['/api/watchlist/news/major', activeId],
    queryFn: async () => {
      if (!activeId) return { major_developments: [], major_developments_count: 0 };
      try {
        const r = await fetch(`/api/watchlist/${activeId}/news/major`);
        if (!r.ok) return { major_developments: [], major_developments_count: 0 };
        return r.json();
      } catch { return { major_developments: [], major_developments_count: 0 }; }
    },
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60 * 1000,
    enabled: !!activeId && !!watchlist?.analysis,
  });

  /* ── watchlist earnings ──────────────────────────────────────────── */
  const { data: earningsResp, isLoading: earningsLoading, isError: earningsIsError } = useQuery<{
    earnings: any[]; meta?: any;
  }>({
    queryKey: ['earnings', 'watchlist', activeId],
    queryFn: async () => {
      const r = await fetch('/api/watchlist/earnings');
      if (!r.ok) throw new Error(`watchlist/earnings: ${r.status}`);
      return r.json();
    },
    enabled: !!activeId,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  /* ── earnings lookup map (ticker → event) ────────────────────────── */
  const earningsMap = useMemo<Record<string, any>>(() => {
    const m: Record<string, any> = {};
    for (const e of (earningsResp?.earnings ?? [])) {
      if (e.ticker) m[e.ticker.toUpperCase()] = e;
    }
    return m;
  }, [earningsResp]);

  /* ── favorites: fetch once, sync to Set, optimistic toggle ─────── */
  const { data: favoritesData } = useQuery<{ favorites: string[]; count: number }>({
    queryKey: ['watchlist-favorites'],
    queryFn: async () => {
      const r = await fetch('/api/watchlist/favorites');
      if (!r.ok) return { favorites: [], count: 0 };
      return r.json();
    },
    staleTime: 5 * 60_000,
  });

  const { data: optionsResp, isLoading: optionsLoading } = useQuery({
    queryKey: ['watchlist-options-signals', activeId],
    queryFn: async () => {
      const r = await fetch(`/api/watchlist/${activeId}/options-signals`);
      if (!r.ok) throw new Error(`watchlist options: ${r.status}`);
      return r.json();
    },
    enabled: !!activeId && (innerView === 'tickers' || innerView === 'close-watch'),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const optionsSignalsByTicker = (optionsResp?.signals ?? {}) as Record<string, any>;
  const optionsMeta = optionsResp?.options_meta as Record<string, any> | undefined;

  useEffect(() => {
    if (favoritesData?.favorites) {
      setFavoritesSet(new Set(favoritesData.favorites.map((t: string) => t.toUpperCase())));
    }
  }, [favoritesData]);

  const toggleFavorite = useCallback(async (ticker: string) => {
    const t = ticker.toUpperCase();
    const wasFav = favoritesSet.has(t);
    setFavoritesSet(prev => {
      const next = new Set(prev);
      if (wasFav) next.delete(t); else next.add(t);
      return next;
    });
    try {
      if (wasFav) {
        const r = await fetch(`/api/watchlist/favorites/${encodeURIComponent(t)}`, { method: 'DELETE' });
        if (!r.ok) throw new Error('remove failed');
      } else {
        const r = await fetch('/api/watchlist/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: t }),
        });
        if (!r.ok) throw new Error('add failed');
      }
    } catch {
      setFavoritesSet(prev => {
        const next = new Set(prev);
        if (wasFav) next.add(t); else next.delete(t);
        return next;
      });
    }
  }, [favoritesSet]);

  /* ── delete specific watchlist ───────────────────────────────────── */
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed to delete');
      return r.json();
    },
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
      // Invalidate Calendar Earnings for watchlist scope so next visit refetches
      qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('watchlist') });
      if (process.env.NODE_ENV !== 'production') console.log('[earnings-dynamic-sync]', { mutationType: 'watchlist-delete', invalidatedKeys: ['earnings+watchlist'] });
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

      // Backend returned 200 but analysis is still running in background
      if (data?.refresh_status === 'running') {
        setRefreshStatus('running');
        // Keep existing data, start polling watchlist endpoint
        qc.invalidateQueries({ queryKey: ['/api/watchlist', activeId] });
        return;
      }

      // Completed synchronously — update cache directly if payload included data
      setRefreshStatus('idle');
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
      // Invalidate Calendar Earnings for watchlist scope so next visit refetches
      qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('watchlist') });
      if (process.env.NODE_ENV !== 'production') console.log('[earnings-dynamic-sync]', { mutationType: 'watchlist-refresh', invalidatedKeys: ['earnings+watchlist'] });
    },
    onError: (err: any) => {
      setRefreshStatus('idle');
      setRefreshError(err?.message || 'Analysis failed');
    },
  });

  /* ── auto-clear running status when analysis sections arrive ───────── */
  useEffect(() => {
    if (refreshStatus === 'running') {
      const sections = (watchlist?.analysis as any)?.sections;
      if (Array.isArray(sections) && sections.length > 0) {
        setRefreshStatus('idle');
        qc.invalidateQueries({ queryKey: ['/api/watchlist/news', activeId] });
        qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
      }
    }
  }, [watchlist?.analysis, refreshStatus, activeId]);

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
      // Invalidate Calendar Earnings for watchlist scope so next visit refetches
      qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('watchlist') });
      if (process.env.NODE_ENV !== 'production') console.log('[earnings-dynamic-sync]', { mutationType: 'watchlist-add-tickers', invalidatedKeys: ['earnings+watchlist'] });
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
        // Invalidate Calendar Earnings for watchlist scope so next visit refetches
        qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('watchlist') });
        if (process.env.NODE_ENV !== 'production') console.log('[earnings-dynamic-sync]', { mutationType: 'watchlist-upload', invalidatedKeys: ['earnings+watchlist'] });
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
  const topArticles: TopArticle[] = newsData?.top_articles ?? [];
  const allNews: FlatNewsItem[] = topArticles.length > 0
    ? topArticles.map(a => ({ ...a, ticker: a.symbol ?? '' }))
    : flattenNews(newsData);
  const newsIsBuilding: boolean = newsData?.is_building ?? false;
  const newsCacheAge: number | null = newsData?.cache_age_s ?? null;
  const majorNews: MajorNewsItem[] = (majorNewsData?.major_developments ?? []).slice(0, 20);
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
    const quoteMerged = rt ? mergeRealtimeQuote(t, rt) : t;
    const opt = sym ? optionsSignalsByTicker[sym] : undefined;
    return opt ? { ...quoteMerged, ...opt } : quoteMerged;
  }), [baseMergedTickers, realtimeQuotes, optionsSignalsByTicker]);

  const pendingCount = mergedTickers.filter(t => t._pending).length;
  const analyzedCount = mergedTickers.length - pendingCount;

  /* ── ticker table sorting ────────────────────────────────────────── */
  function getSortValue(stock: any, key: NonNullable<typeof sortKey>): { v: any; missing: boolean } {
    switch (key) {
      case 'ticker': {
        const v = (stock.ticker || '').toString().toUpperCase();
        return { v, missing: !v };
      }
      case 'company': {
        const v = (stock.company || stock.name || '').toString().toLowerCase();
        return { v, missing: !v };
      }
      case 'theme': {
        const v = (stock.canonical_theme_name || stock.section_title || '').toString().toLowerCase();
        return { v, missing: !v };
      }
      case 'price': {
        const n = Number(stock.price);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'chg': {
        const n = Number(stock.change_pct ?? stock.change_pct_1d);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'volume': {
        const n = Number(stock.volume);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'relVol': {
        const pre = Number(stock.relative_volume);
        if (Number.isFinite(pre) && pre > 0) return { v: pre, missing: false };
        const v = Number(stock.volume);
        const av = Number(stock.average_volume);
        if (!Number.isFinite(v) || !Number.isFinite(av) || av === 0) return { v: 0, missing: true };
        return { v: v / av, missing: false };
      }
      case 'volMc': {
        const n = Number(stock.vol_mc_pct ?? stock.vol_mc_ratio);
        return { v: n, missing: !Number.isFinite(n) || n <= 0 };
      }
      case 'rvRankMove': {
        const trend = stock.rel_vol_trend;
        if (trend === 'flat') return { v: 0, missing: false };
        const delta = stock.rel_vol_rank_delta;
        if (delta == null || !Number.isFinite(Number(delta))) return { v: 0, missing: true };
        return { v: Number(delta), missing: false };
      }
      case 'optionsScore': { const n = Number(stock.options_score); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsPutCall': { const n = Number(stock.options_put_call_ratio); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsIv': { const n = Number(stock.options_iv); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsExpectedMove': { const n = Number(stock.options_expected_move); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsVolume': { const n = Number(stock.options_volume); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsOi': { const n = Number(stock.options_open_interest); return { v: n, missing: !Number.isFinite(n) }; }
    }
  }

  const sortedTickers = useMemo(() => {
    if (!sortKey) return mergedTickers;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...mergedTickers]
      .map((s, i) => ({ s, i, sv: getSortValue(s, sortKey) }))
      .sort((a, b) => {
        if (a.sv.missing && b.sv.missing) return a.i - b.i;
        if (a.sv.missing) return 1;
        if (b.sv.missing) return -1;
        if (typeof a.sv.v === 'number' && typeof b.sv.v === 'number') {
          return (a.sv.v - b.sv.v) * dir;
        }
        return String(a.sv.v).localeCompare(String(b.sv.v)) * dir;
      })
      .map(r => r.s);
  }, [mergedTickers, sortKey, sortDir]);

  function handleSortClick(key: NonNullable<typeof sortKey>) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const closeWatchTickers = useMemo(
    () => sortedTickers.filter(s => s.ticker && favoritesSet.has(s.ticker.toUpperCase())),
    [sortedTickers, favoritesSet],
  );

  /* ── tab bar renderer (shared between empty + main states) ─────── */
  const renderTabBar = () => (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 2,
      padding: '8px 16px 0', background: C.bg,
      borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap',
    }}>
      {(wlMetas || []).map((meta) => {
        const isActive = activeId === meta.id && innerView === 'tickers';
        return (
          <div
            key={meta.id}
            onClick={() => { setActiveId(meta.id); setShowAddPanel(false); setInnerView('tickers'); }}
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
                  background: C.bg, border: '1px solid rgba(255,255,255,0.35)',
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

      {/* Close Watch tab */}
      <div
        key="close-watch"
        onClick={() => { setShowAddPanel(false); setInnerView(innerView === 'close-watch' ? 'tickers' : 'close-watch'); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 10px',
          borderRadius: '4px 4px 0 0',
          background: innerView === 'close-watch' ? C.card : 'transparent',
          border: `1px solid ${innerView === 'close-watch' ? C.border : 'transparent'}`,
          borderBottom: innerView === 'close-watch' ? `1px solid ${C.card}` : '1px solid transparent',
          cursor: 'pointer', marginBottom: -1,
          fontFamily: C.font, fontSize: 11,
          color: innerView === 'close-watch' ? C.amber : '#475569',
          transition: 'color 0.15s',
          userSelect: 'none',
        }}
        title="Starred tickers"
      >
        <Star
          size={10}
          fill={innerView === 'close-watch' ? C.amber : 'none'}
          color={innerView === 'close-watch' ? C.amber : '#475569'}
          style={{ flexShrink: 0 }}
        />
        <span>Close Watch</span>
        <span style={{ fontSize: 9, color: '#475569', flexShrink: 0 }}>({favoritesSet.size})</span>
      </div>

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
          color: showAddPanel ? 'rgba(255,255,255,0.70)' : '#475569',
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
          <div className="wl-spin" style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.55)', borderRadius: '50%' }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{uploadStage}</span>
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
          onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
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
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
        >
          <Upload size={20} style={{ color: 'rgba(255,255,255,0.55)' }} />
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
            onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'}
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
  // marketThemes entries may be plain strings (old backend) or
  // { canonical_theme_name, canonical_theme_id } objects (new backend).
  // resolveThemeLabel handles both transparently.
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
        {marketThemes.map((entry, i) => {
          const label = resolveThemeLabel(entry as any);
          return (
            <span
              key={i}
              style={{
                flexShrink: 0,
                padding: '3px 10px', borderRadius: 4,
                fontSize: 10, fontWeight: 600,
                fontFamily: C.sansFont,
                color: 'rgba(255,255,255,0.60)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          );
        })}
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
        background: 'rgba(255,255,255,0.025)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {isUpgrading ? (
            <div className="wl-spin" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.55)', borderRadius: '50%', flexShrink: 0 }} />
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
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#f5f5f0', fontSize: 10, fontWeight: 800,
              fontFamily: C.font, cursor: 'pointer',
              letterSpacing: '0.05em',
              boxShadow: '0 0 12px rgba(255,255,255,0.06)',
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
          const chg1d = stock.change_pct ?? stock.change_pct_1d;
          const cCol = changeColor(chg1d);
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
              {chg1d != null && (
                <span style={{
                  fontSize: 8, fontWeight: 800, fontFamily: C.font,
                  padding: '1px 5px', borderRadius: 3,
                  color: cCol,
                  background: cCol + '15',
                }}>
                  {chg1d > 0 ? '+' : ''}{chg1d.toFixed(1)}%
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

  /* ── upcoming earnings section ──────────────────────────────────── */
  const renderEarningsSection = () => {
    const events = earningsResp?.earnings ?? [];
    if (!events.length && !earningsLoading) return null;
    return (
      <div style={{ padding: '0 20px 4px' }}>
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>
              UPCOMING EARNINGS
            </span>
            {earningsLoading ? (
              <div className="wl-spin" style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.50)', borderRadius: '50%' }} />
            ) : (
              <span style={{ fontSize: 9, color: C.dim }}>({events.length} in watchlist)</span>
            )}
            {earningsIsError && (
              <span style={{ fontSize: 9, color: C.red }}>Failed to load earnings</span>
            )}
          </div>

          {events.length > 0 && (
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }} className="wl-chip-strip">
              {events.map((ev: any, i: number) => {
                const importance = ev.importance as string | undefined;
                const importanceColor = importance === 'high' ? C.amber : importance === 'medium' ? C.teal : C.dim;
                const epsDir = (ev.est_eps != null && ev.last_eps != null)
                  ? ev.est_eps > ev.last_eps ? 'up' : ev.est_eps < ev.last_eps ? 'down' : 'flat'
                  : null;
                return (
                  <div
                    key={`earn-${ev.ticker}-${i}`}
                    onClick={() => handleTickerClick(ev.ticker)}
                    style={{
                      flexShrink: 0, cursor: 'pointer',
                      padding: '10px 16px',
                      borderRight: `1px solid ${C.border}`,
                      display: 'flex', flexDirection: 'column', gap: 5,
                      minWidth: 148,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* ticker + importance badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {ev.logo && (
                        <img
                          src={ev.logo}
                          alt={ev.ticker}
                          style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'contain', flexShrink: 0 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: C.font }}>{ev.ticker}</span>
                      {importance && (
                        <span style={{
                          fontSize: 7, fontWeight: 800, fontFamily: C.font,
                          padding: '1px 5px', borderRadius: 3,
                          color: importanceColor, background: importanceColor + '20',
                          textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                        }}>
                          {importance}
                        </span>
                      )}
                    </div>

                    {/* date + pre/post market */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, fontFamily: C.font }}>
                        {ev.next_date || DASH}
                      </span>
                      {ev.time && (
                        <span style={{ fontSize: 8, color: C.dim, fontFamily: C.font }}>
                          {ev.time === 'bmo' ? 'pre-mkt' : ev.time === 'amc' ? 'post-mkt' : ev.time}
                        </span>
                      )}
                    </div>

                    {/* EPS est + revenue */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                      {ev.est_eps != null && (
                        <div style={{ fontSize: 9, fontFamily: C.font }}>
                          <span style={{ color: C.dim }}>EPS </span>
                          <span style={{ color: C.text, fontWeight: 700 }}>${ev.est_eps.toFixed(2)}</span>
                          {epsDir === 'up' && <span style={{ color: C.green }}> ↑</span>}
                          {epsDir === 'down' && <span style={{ color: C.red }}> ↓</span>}
                        </div>
                      )}
                      {ev.revenue_estimated != null && (
                        <div style={{ fontSize: 9, fontFamily: C.font }}>
                          <span style={{ color: C.dim }}>Rev </span>
                          <span style={{ color: C.text, fontWeight: 700 }}>
                            {ev.revenue_estimated >= 1e9
                              ? '$' + (ev.revenue_estimated / 1e9).toFixed(1) + 'B'
                              : ev.revenue_estimated >= 1e6
                                ? '$' + (ev.revenue_estimated / 1e6).toFixed(0) + 'M'
                                : '$' + ev.revenue_estimated.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── ticker table for new format ─────────────────────── */
  const renderNewFormatTickerTable = (opts?: { rows?: typeof sortedTickers; title?: string }) => {
    const rows = opts?.rows ?? sortedTickers;
    const tableTitle = opts?.title ?? 'TICKERS';
    const TICKER_GRID = '64px minmax(140px, 1.6fr) minmax(120px, 1fr) 80px 64px 72px 64px 80px 68px 52px 80px 48px 52px 52px 60px 56px';
    const tickerColumns: { key?: NonNullable<typeof sortKey>; label: string }[] = [
      { key: 'ticker', label: 'Ticker' },
      { key: 'company', label: 'Company' },
      { key: 'theme', label: 'Theme' },
      { key: 'price', label: 'Price' },
      { key: 'chg', label: 'Chg %' },
      { key: 'volume', label: 'Volume' },
      { key: 'relVol', label: 'VOLX' },
      { key: 'rvRankMove', label: 'VOL RANK' },
      { key: 'volMc', label: 'Vol/MC' },
      { key: 'optionsScore', label: 'Opt Score' },
      { label: 'Opt Signal' },
      { key: 'optionsPutCall', label: 'P/C' },
      { key: 'optionsIv', label: 'IV' },
      { key: 'optionsExpectedMove', label: 'EM' },
      { key: 'optionsVolume', label: 'Opt Vol' },
      { key: 'optionsOi', label: 'OI' },
    ];
    return (
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        height: '100%', minHeight: 0,
      }}>
        <div style={{
          padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: tableTitle === 'CLOSE WATCH' ? C.amber : '#fff', letterSpacing: '0.1em' }}>
            {tableTitle}
          </span>
          <span style={{ fontSize: 9, color: C.dim }}>
            {opts?.rows !== undefined
              ? `${rows.length} ticker${rows.length !== 1 ? 's' : ''}`
              : pendingCount > 0
                ? `${analyzedCount} analyzed · ${pendingCount} pending`
                : `${mergedTickers.length} total`}
          </span>
          {!opts?.rows && pendingCount > 0 && (
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
          {optionsMeta && ((optionsMeta.live_calls_enqueued ?? 0) > 0 || (optionsMeta.scan_in_progress ?? 0) > 0) && (
            <span style={{ fontSize: 7, color: C.amber, opacity: 0.75, letterSpacing: '0.03em' }}>
              Options scan warming — cached rows shown first
            </span>
          )}
        </div>

        {/* scrollable area with horizontal overflow for narrow viewports */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }} className="wl-scrollbar">
          <div style={{ minWidth: 1280 }}>
            {/* table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: TICKER_GRID,
              padding: '6px 14px',
              borderBottom: `1px solid ${C.border}`,
              position: 'sticky' as const, top: 0, zIndex: 1,
              background: C.card,
              fontSize: 8, fontWeight: 700, color: C.dim,
              textTransform: 'uppercase' as const, letterSpacing: '0.08em',
              gap: 6,
            }}>
              {tickerColumns.map(col => {
                const sortable = col.key != null;
                const active = sortable && sortKey === col.key;
                return (
                  <span
                    key={col.key ?? col.label}
                    onClick={() => { if (col.key) handleSortClick(col.key); }}
                    style={{
                      cursor: sortable ? 'pointer' : 'default',
                      color: active ? '#f5f5f0' : C.dim,
                      userSelect: 'none' as const,
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      overflow: 'hidden', whiteSpace: 'nowrap' as const,
                    }}
                    title={sortable ? `Sort by ${col.label}` : col.label}
                  >
                    {col.label}
                    {sortable && (
                      <span style={{ fontSize: 8, opacity: active ? 1 : 0.3 }}>
                        {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            {/* table rows */}
            {rows.map((stock, i) => {
              const isPending = stock._pending;
              const chg1d = stock.change_pct ?? stock.change_pct_1d;
              const cCol = changeColor(chg1d);
              return (
                <div
                  key={`row-${stock.ticker}-${i}`}
                  onClick={() => !isPending && stock.ticker && handleTickerClick(stock.ticker)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: TICKER_GRID,
                    padding: '7px 14px',
                    borderBottom: `1px solid ${C.border}`,
                    background: i % 2 === 0 ? 'transparent' : `${C.border}08`,
                    cursor: isPending ? 'default' : 'pointer',
                    transition: 'background 0.1s',
                    alignItems: 'center',
                    opacity: isPending ? 0.55 : 1,
                    gap: 6,
                  }}
                  onMouseEnter={e => { if (!isPending) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : `${C.border}08`; }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden' }}>
                    {!isPending && stock.ticker && (
                      <button
                        onClick={e => { e.stopPropagation(); e.preventDefault(); void toggleFavorite(stock.ticker!); }}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, lineHeight: 1 }}
                        aria-label={favoritesSet.has((stock.ticker || '').toUpperCase()) ? `Remove ${stock.ticker} from Close Watch` : `Add ${stock.ticker} to Close Watch`}
                        title={favoritesSet.has((stock.ticker || '').toUpperCase()) ? `Remove ${stock.ticker} from Close Watch` : `Add ${stock.ticker} to Close Watch`}
                      >
                        <Star
                          size={10}
                          fill={favoritesSet.has((stock.ticker || '').toUpperCase()) ? C.amber : 'none'}
                          color={favoritesSet.has((stock.ticker || '').toUpperCase()) ? C.amber : C.dim}
                        />
                      </button>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 800, color: isPending ? C.dim : '#fff', fontFamily: C.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {stock.ticker || DASH}
                    </span>
                  </span>
                  <span style={{ fontSize: 10, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={stock.company || stock.name || ''}>
                    {stock.company || stock.name || DASH}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={stock.canonical_theme_name || stock.section_title || ''}>
                    {stock.canonical_theme_name || stock.section_title || DASH}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: C.font, display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden', whiteSpace: 'nowrap' as const }}>
                    {formatPrice(stock.price)}
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
                  <span style={{ fontSize: 10, fontWeight: 700, color: cCol, fontFamily: C.font, whiteSpace: 'nowrap' as const }}>
                    {formatChgPct(chg1d)}
                  </span>
                  <span style={{ fontSize: 10, color: C.text, fontFamily: C.font, whiteSpace: 'nowrap' as const }}>
                    {formatVolume(stock.volume)}
                  </span>
                  {/* Rel Vol — raw value only */}
                  <span style={{ fontSize: 10, color: C.text, fontFamily: C.font, whiteSpace: 'nowrap' as const }}>
                    {formatRelVol(stock.volume, stock.average_volume, stock.relative_volume)}
                  </span>
                  {/* REL VOL RANK MOVE — rank position change since last snapshot */}
                  <span style={{ fontSize: 10, fontFamily: C.font, whiteSpace: 'nowrap' as const }}>
                    {stock.rel_vol_trend === 'up' && stock.rel_vol_rank_delta != null ? (
                      <span
                        style={{ color: '#22c55e', fontWeight: 600 }}
                        title={`Moved up ${Math.abs(stock.rel_vol_rank_delta)} spots in relative-volume rank since the previous snapshot`}
                      >
                        +{Math.abs(stock.rel_vol_rank_delta)} ranks
                      </span>
                    ) : stock.rel_vol_trend === 'down' && stock.rel_vol_rank_delta != null ? (
                      <span
                        style={{ color: '#ef4444', fontWeight: 600 }}
                        title={`Moved down ${Math.abs(stock.rel_vol_rank_delta)} spots in relative-volume rank since the previous snapshot`}
                      >
                        -{Math.abs(stock.rel_vol_rank_delta)} ranks
                      </span>
                    ) : stock.rel_vol_trend === 'flat' ? (
                      <span style={{ color: C.dim }} title="No meaningful change in relative-volume rank">Flat</span>
                    ) : stock.rel_vol_trend === 'unknown' ? (
                      <span style={{ color: C.dim }} title="No prior relative-volume snapshot yet">New</span>
                    ) : (
                      <span style={{ color: C.dim }}>—</span>
                    )}
                  </span>
                  {/* Vol/MC — raw value only */}
                  <span
                    style={{
                      fontSize: 10, fontFamily: C.font, whiteSpace: 'nowrap' as const,
                      color: volMcLabelColor(stock.vol_mc_label, C),
                    }}
                    title={stock.vol_mc_unavailable_reason ?? (stock.vol_mc_label ? `Vol/MC: ${stock.vol_mc_label}` : undefined)}
                  >
                    {formatVolMcPct(stock.vol_mc_pct)}
                  </span>
                  {/* Options columns */}
                  {(() => {
                    const unavail = stock.options_data_available === false;
                    const stale = stock.options_stale === true;
                    const hasData = !optionsLoading || !!optionsResp;
                    const loadStr = optionsLoading && !optionsResp ? '…' : DASH;
                    // Score
                    const scoreVal = unavail ? null : (stock.options_score != null ? Number(stock.options_score) : null);
                    const scoreStr = scoreVal != null && Number.isFinite(scoreVal) ? (scoreVal >= 10 ? Math.round(scoreVal).toString() : scoreVal.toFixed(1)) : (hasData ? DASH : loadStr);
                    const scoreClr = scoreVal != null && scoreVal >= 70 ? C.green : scoreVal != null && scoreVal >= 50 ? C.amber : C.dim;
                    // Signal
                    const sig = unavail ? '' : (stock.options_signal ?? '');
                    const sigLower = sig.toLowerCase();
                    const sigClr = sigLower.includes('unusual') ? C.amber : sigLower.includes('gamma') ? '#a78bfa' : sigLower.includes('asym') ? C.green : sigLower.includes('vol') ? C.amber : sig ? C.teal : C.dimLow;
                    const sigStr = hasData ? (unavail ? DASH : (sig || DASH)) : loadStr;
                    const sigTitle = unavail ? (stock.options_unavailable_reason ?? 'Options data unavailable') : stale ? 'Stale options data' : undefined;
                    // P/C
                    const cp = unavail ? null : (stock.options_put_call_ratio != null ? Number(stock.options_put_call_ratio) : null);
                    const cpStr = cp != null && Number.isFinite(cp) ? cp.toFixed(2) : (hasData ? DASH : loadStr);
                    const cpClr = cp != null ? (cp < 0.7 ? C.green : cp > 1.3 ? C.red : C.dim) : C.dimLow;
                    // IV
                    const ivVal = unavail ? null : (stock.options_iv != null ? Number(stock.options_iv) : null);
                    const ivStr = ivVal != null && Number.isFinite(ivVal) ? `${(ivVal > 5 ? ivVal : ivVal * 100).toFixed(0)}%` : (hasData ? DASH : loadStr);
                    // EM
                    const emVal = unavail ? null : (stock.options_expected_move != null ? Number(stock.options_expected_move) : null);
                    const emStr = emVal != null && Number.isFinite(emVal) ? `${emVal.toFixed(1)}%` : (hasData ? DASH : loadStr);
                    // Opt Vol / OI
                    const optVol = unavail ? null : (stock.options_volume != null ? Number(stock.options_volume) : null);
                    const oi = unavail ? null : (stock.options_open_interest != null ? Number(stock.options_open_interest) : null);
                    const dimOpacity = stale ? 0.6 : 1;
                    return (
                      <>
                        <span style={{ fontSize:10, fontFamily:C.font, whiteSpace:'nowrap' as const, color:scoreClr, opacity:dimOpacity }} title={stale ? 'Stale options data' : undefined}>{scoreStr}</span>
                        <span style={{ fontSize:9, fontFamily:C.font, color:sigClr, textTransform:'uppercase' as const, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, opacity:dimOpacity }} title={sigTitle}>{sigStr}</span>
                        <span style={{ fontSize:10, fontFamily:C.font, whiteSpace:'nowrap' as const, color:cpClr, opacity:dimOpacity }}>{cpStr}</span>
                        <span style={{ fontSize:10, fontFamily:C.font, whiteSpace:'nowrap' as const, color: ivVal != null ? C.amber : C.dimLow, opacity:dimOpacity }}>{ivStr}</span>
                        <span style={{ fontSize:10, fontFamily:C.font, whiteSpace:'nowrap' as const, color: emVal != null ? '#a78bfa' : C.dimLow, opacity:dimOpacity }}>{emStr}</span>
                        <span style={{ fontSize:10, fontFamily:C.font, whiteSpace:'nowrap' as const, color:C.text, opacity:dimOpacity }}>{optVol != null ? formatVolume(optVol) : (hasData ? DASH : loadStr)}</span>
                        <span style={{ fontSize:10, fontFamily:C.font, whiteSpace:'nowrap' as const, color:C.text, opacity:dimOpacity }}>{oi != null ? formatVolume(oi) : (hasData ? DASH : loadStr)}</span>
                      </>
                    );
                  })()}
                </div>
              );
            })}
            {rows.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>
                {tableTitle === 'CLOSE WATCH'
                  ? 'No Close Watch tickers yet. Star tickers from the Tickers tab to add them here.'
                  : 'No tickers'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ── legacy ticker table ─────────────────────────────────────────── */
  const renderLegacyTickerTable = () => (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      height: '100%', minHeight: 0,
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
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : `${C.border}08`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {stock.ticker && (
                <button
                  onClick={e => { e.stopPropagation(); e.preventDefault(); void toggleFavorite(stock.ticker!); }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, lineHeight: 1 }}
                  aria-label={favoritesSet.has((stock.ticker || '').toUpperCase()) ? `Remove ${stock.ticker} from Close Watch` : `Add ${stock.ticker} to Close Watch`}
                  title={favoritesSet.has((stock.ticker || '').toUpperCase()) ? `Remove ${stock.ticker} from Close Watch` : `Add ${stock.ticker} to Close Watch`}
                >
                  <Star
                    size={10}
                    fill={favoritesSet.has((stock.ticker || '').toUpperCase()) ? C.amber : 'none'}
                    color={favoritesSet.has((stock.ticker || '').toUpperCase()) ? C.amber : C.dim}
                  />
                </button>
              )}
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>
                {stock.ticker || '\u2014'}
              </span>
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
        <div className="wl-spin" style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.55)', borderRadius: '50%' }} />
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
            <div><span style={{ color: 'rgba(255,255,255,0.40)' }}>&gt;</span> No watchlist loaded.</div>
            <div><span style={{ color: 'rgba(255,255,255,0.40)' }}>&gt;</span> Click <span style={{ color: 'rgba(255,255,255,0.70)' }}>+</span> above to add one, or upload a CSV in AI Terminal.</div>
            <div><span style={{ color: 'rgba(255,255,255,0.40)' }}>&gt;</span> <span className="wl-blink" style={{ color: C.text }}>_</span></div>
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
              {/* Agent analysis running in background — non-error state */}
              {refreshStatus === 'running' && !refreshMut.isPending && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 4,
                  background: `${C.teal}10`, border: `1px solid ${C.teal}30`,
                }}>
                  <div className="wl-spin" style={{ width: 10, height: 10, border: `2px solid ${C.teal}30`, borderTopColor: C.teal, borderRadius: '50%', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: C.teal, fontFamily: C.sansFont }}>
                    Agent analysis running…
                  </span>
                </div>
              )}
              {refreshError && !refreshMut.isPending && refreshStatus !== 'running' && (
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

            {/* ── Upgrade Banner (legacy → new format) ── */}
            {renderUpgradeBanner()}

            {/* ── Market Themes Banner (chips) ── */}
            {renderMarketThemes()}

            {/* ── Top Split: Ticker Table + Live News (fixed viewport-aware height) ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 1fr)',
              gap: 12,
              padding: '14px 20px 16px',
              height: 'clamp(360px, 50vh, 620px)',
            }}
              className="wl-top-split"
            >
              {/* ── Ticker Table (wider) ── */}
              {/* Show new-format table whenever we have saved symbols — covers pending state (no sections yet) */}
              {innerView === 'close-watch'
                ? renderNewFormatTickerTable({ rows: closeWatchTickers, title: 'CLOSE WATCH' })
                : (newFmt || allTickerSymbols.length > 0) ? renderNewFormatTickerTable() : renderLegacyTickerTable()
              }

              {/* ── Live News (narrower) ── */}
              <div style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                height: '100%', minHeight: 0,
              }}>
                <div style={{
                  padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>
                    LIVE NEWS
                  </span>
                  <span style={{ fontSize: 9, color: C.dim }}>({allNews.length})</span>
                  {newsCacheAge !== null && (
                    <span style={{ fontSize: 9, color: C.dim, marginLeft: 2 }}>
                      · Updated {newsCacheAge < 60
                        ? `${newsCacheAge}s ago`
                        : `${Math.round(newsCacheAge / 60)} min ago`}
                    </span>
                  )}
                  {(newsIsBuilding || newsFetching) && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                      padding: '2px 6px', borderRadius: 3,
                      color: C.teal, background: C.teal + '18',
                      border: `1px solid ${C.teal}30`,
                      textTransform: 'uppercase' as const,
                    }}>
                      Refreshing…
                    </span>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0', minHeight: 0 }} className="wl-scrollbar">
                  {/* ── Major Developments ── */}
                  {majorNews.length > 0 && (() => {
                    const impactColor = (impact?: string) => {
                      if (impact === 'bullish')  return '#22c55e';
                      if (impact === 'bearish')  return '#ef4444';
                      if (impact === 'mixed')    return '#f59e0b';
                      return C.dim;
                    };
                    return (
                      <>
                        <div style={{
                          padding: '7px 14px 6px',
                          borderBottom: `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: '#ffffff05',
                        }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: C.amber, letterSpacing: '0.12em' }}>
                            MAJOR DEVELOPMENTS
                          </span>
                          <span style={{ fontSize: 9, color: C.dim }}>({majorNews.length})</span>
                        </div>
                        {majorNews.map((item, i) => {
                          const col = impactColor(item.bull_bear_impact);
                          const symbols = item.related_watchlist_symbols ?? [];
                          return (
                            <a
                              key={`major-${i}`}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'block',
                                padding: '9px 14px',
                                borderBottom: `1px solid ${C.border}`,
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'background 0.1s',
                                borderLeft: `2px solid ${col}40`,
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = `${col}06`}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {/* badges row */}
                              <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 4, marginBottom: 5 }}>
                                {item.major_news_label && (
                                  <span style={{
                                    fontSize: 8, fontWeight: 700, fontFamily: C.font,
                                    padding: '2px 6px', borderRadius: 3,
                                    color: col, background: col + '18',
                                    border: `1px solid ${col}30`,
                                    textTransform: 'uppercase' as const, letterSpacing: '0.08em',
                                  }}>
                                    {item.major_news_label}
                                  </span>
                                )}
                                {item.bull_bear_impact && item.bull_bear_impact !== 'neutral' && item.bull_bear_impact !== 'unknown' && (
                                  <span style={{
                                    fontSize: 8, fontWeight: 600, fontFamily: C.font,
                                    padding: '2px 5px', borderRadius: 3,
                                    color: col, background: col + '10',
                                    border: `1px solid ${col}20`,
                                    textTransform: 'capitalize' as const,
                                  }}>
                                    {item.bull_bear_impact}
                                  </span>
                                )}
                                {symbols.slice(0, 4).map(sym => (
                                  <span key={sym} style={{
                                    fontSize: 8, fontWeight: 700, fontFamily: C.font,
                                    padding: '2px 5px', borderRadius: 3,
                                    color: C.teal, background: C.teal + '15',
                                    border: `1px solid ${C.teal}25`,
                                    textTransform: 'uppercase' as const,
                                  }}>
                                    {sym}
                                  </span>
                                ))}
                                {symbols.length > 4 && (
                                  <span style={{ fontSize: 8, color: C.dim }}>+{symbols.length - 4}</span>
                                )}
                                <ExternalLink style={{ width: 9, height: 9, color: C.dim, marginLeft: 'auto' }} />
                              </div>
                              {/* title */}
                              <div style={{
                                fontSize: 11, color: C.text, fontFamily: C.font,
                                lineHeight: 1.4, marginBottom: 4,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                              }}>
                                {item.title}
                              </div>
                              {/* why it matters */}
                              {item.why_it_matters && (
                                <div style={{
                                  fontSize: 10, color: C.dim, fontFamily: C.font,
                                  lineHeight: 1.35, marginBottom: 4,
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                                  fontStyle: 'italic',
                                }}>
                                  {item.why_it_matters}
                                </div>
                              )}
                              {/* matched entities */}
                              {item.matched_entities && item.matched_entities.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginBottom: 4 }}>
                                  {item.matched_entities.slice(0, 3).map((ent, ei) => (
                                    <span key={ei} style={{ fontSize: 8, color: C.dim, background: '#ffffff08', border: `1px solid ${C.border}`, borderRadius: 2, padding: '1px 4px', fontFamily: C.font }}>
                                      {ent}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {/* source + date */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {item.source && <span style={{ fontSize: 9, color: C.dim }}>{item.source}</span>}
                                {item.published_at && <span style={{ fontSize: 9, color: C.dim }}>{timeAgo(item.published_at)}</span>}
                              </div>
                            </a>
                          );
                        })}
                        {/* divider before normal feed */}
                        <div style={{
                          padding: '6px 14px 5px',
                          borderBottom: `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: '#ffffff03',
                        }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: '0.1em' }}>
                            ALL NEWS
                          </span>
                          <span style={{ fontSize: 9, color: C.dim }}>({allNews.length})</span>
                        </div>
                      </>
                    );
                  })()}
                  {majorNews.length === 0 && majorNewsData && allNews.length === 0 && (
                    <div style={{ padding: '6px 14px', fontSize: 10, color: C.dim, borderBottom: `1px solid ${C.border}` }}>
                      No major developments detected in recent watchlist news.
                    </div>
                  )}
                  {allNews.map((item, i) => {
                    const tickerStock = allStocks.find(s => (s.ticker || '').toUpperCase() === (item.ticker || '').toUpperCase());
                    const col = newFmt
                      ? (tickerStock?.section_id ? sectionAccent(tickerStock.section_id) : C.teal)
                      : signalColor(tickerStock?.signal);
                    const impactCol = item.bull_bear_impact === 'bullish' ? '#22c55e'
                      : item.bull_bear_impact === 'bearish' ? '#ef4444'
                      : item.bull_bear_impact === 'mixed'   ? '#f59e0b'
                      : null;
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
                          borderLeft: impactCol ? `2px solid ${impactCol}35` : undefined,
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = `${C.teal}08`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {item.ticker && (
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
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* badges row — only when rich fields are present */}
                          {(item.catalyst_type || item.signal_strength || (item.bull_bear_impact && item.bull_bear_impact !== 'neutral' && item.bull_bear_impact !== 'unknown')) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginBottom: 4 }}>
                              {item.catalyst_type && (
                                <span style={{
                                  fontSize: 8, fontWeight: 700, fontFamily: C.font,
                                  padding: '1px 5px', borderRadius: 3,
                                  color: C.amber, background: C.amber + '15',
                                  border: `1px solid ${C.amber}25`,
                                  textTransform: 'uppercase' as const, letterSpacing: '0.07em',
                                }}>
                                  {item.catalyst_type}
                                </span>
                              )}
                              {item.bull_bear_impact && item.bull_bear_impact !== 'neutral' && item.bull_bear_impact !== 'unknown' && impactCol && (
                                <span style={{
                                  fontSize: 8, fontWeight: 600, fontFamily: C.font,
                                  padding: '1px 5px', borderRadius: 3,
                                  color: impactCol, background: impactCol + '12',
                                  border: `1px solid ${impactCol}22`,
                                  textTransform: 'capitalize' as const,
                                }}>
                                  {item.bull_bear_impact}
                                </span>
                              )}
                              {item.signal_strength && (
                                <span style={{
                                  fontSize: 8, fontWeight: 600, fontFamily: C.font,
                                  padding: '1px 5px', borderRadius: 3,
                                  color: C.dim, background: '#ffffff08',
                                  border: `1px solid ${C.border}`,
                                  textTransform: 'capitalize' as const,
                                }}>
                                  {item.signal_strength}
                                </span>
                              )}
                            </div>
                          )}
                          <div style={{
                            fontSize: 11, color: C.text,
                            lineHeight: 1.4, marginBottom: 3,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                          }}>
                            {item.title}
                          </div>
                          {item.why_it_matters && (
                            <div style={{
                              fontSize: 10, color: C.dim, fontFamily: C.font,
                              lineHeight: 1.35, marginBottom: 3,
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                              fontStyle: 'italic',
                            }}>
                              {item.why_it_matters}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 9, color: C.dim }}>{item.source}</span>
                            <span style={{ fontSize: 9, color: C.dim }}>{timeAgo(item.published_at)}</span>
                          </div>
                        </div>
                        <ExternalLink style={{ width: 11, height: 11, color: C.dim, flexShrink: 0, marginTop: 2 }} />
                      </a>
                    );
                  })}
                  {allNews.length === 0 && !newsIsBuilding && !newsFetching && (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>
                      {watchlist?.analysis ? 'No news available yet' : 'No news available'}
                    </div>
                  )}
                  {allNews.length === 0 && (newsIsBuilding || newsFetching) && (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>
                      Building news feed…
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Signal Summary Strip (ticker chips) ── */}
            {newFmt ? renderNewFormatSignalStrip() : renderLegacySignalStrip()}

            {/* ── Upcoming Earnings ── */}
            {renderEarningsSection()}

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

            {/* ── Bottom Section View Switcher ── */}
            <div style={{ padding: '10px 20px 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
              {(['themes', 'marketcap', 'fundamentals'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setBottomView(v)}
                  style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
                    textTransform: 'uppercase' as const, fontFamily: C.font,
                    background: bottomView === v ? `${C.teal}22` : 'transparent',
                    color: bottomView === v ? C.teal : C.dim,
                    border: `1px solid ${bottomView === v ? `${C.teal}60` : C.border}`,
                    transition: 'all 0.12s',
                  }}
                >
                  {v === 'themes' ? 'Themes' : v === 'marketcap' ? 'Market Cap' : 'Fundamentals'}
                </button>
              ))}
            </div>

            {/* ── Canonical theme section cards / Market Cap buckets / Fundamentals ── */}
            <div style={{ padding: '4px 20px 24px', position: 'relative', minHeight: refreshMut.isPending && bottomView === 'themes' ? 280 : undefined }}>
              {(() => {
                /* ── THEMES ── */
                if (bottomView === 'themes') {
                  return (
                    <>
                      {refreshMut.isPending && <AnalysisLoadingOverlay />}
                      {newFmt
                        ? <NewFormatSections analysis={analysis} onTickerClick={handleTickerClick} allTickerSymbols={allTickerSymbols} realtimeQuotes={realtimeQuotes} />
                        : <WatchlistAnalysis data={analysis} onTickerClick={handleTickerClick} />
                      }
                    </>
                  );
                }

                /* ── MARKET CAP ── */
                if (bottomView === 'marketcap') {
                const mcTickers = (innerView === 'close-watch' ? closeWatchTickers : sortedTickers)
                  .filter(s => {
                    const mc = Number(s.market_cap);
                    return Number.isFinite(mc) && mc > 0;
                  });
                const buckets: { label: string; sub: string; min: number; max: number }[] = [
                  { label: 'Large Cap', sub: '$100B+',     min: 100_000_000_000, max: Infinity },
                  { label: 'Mid-Cap',   sub: '$10B–$100B', min: 10_000_000_000,  max: 100_000_000_000 },
                  { label: 'Small Cap', sub: '$1B–$10B',   min: 1_000_000_000,   max: 10_000_000_000 },
                  { label: 'Micro Cap', sub: '<$1B',       min: 0,               max: 1_000_000_000 },
                ];
                const mcDir = mcSort.dir === 'asc' ? 1 : -1;
                const numVolXOf = (s: any): number => {
                  const pre = Number(s.relative_volume);
                  if (Number.isFinite(pre) && pre > 0) return pre;
                  const v = Number(s.volume), av = Number(s.average_volume);
                  return (Number.isFinite(v) && Number.isFinite(av) && av > 0) ? v / av : -Infinity;
                };
                const mcSortFn = (a: any, b: any): number => {
                  switch (mcSort.key) {
                    case 'ticker': return mcDir * (a.ticker || '').toString().toUpperCase().localeCompare((b.ticker || '').toString().toUpperCase());
                    case 'price': { const av = Number(a.price), bv = Number(b.price); return mcDir * ((Number.isFinite(av) ? av : -Infinity) - (Number.isFinite(bv) ? bv : -Infinity)); }
                    case 'chg': { const av = Number(a.change_pct ?? a.change_pct_1d), bv = Number(b.change_pct ?? b.change_pct_1d); return mcDir * ((Number.isFinite(av) ? av : -Infinity) - (Number.isFinite(bv) ? bv : -Infinity)); }
                    case 'volx': return mcDir * (numVolXOf(a) - numVolXOf(b));
                    default: return Number(b.market_cap) - Number(a.market_cap);
                  }
                };
                const handleMcSort = (key: typeof mcSort.key) => {
                  setMcSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'ticker' ? 'asc' : 'desc' });
                };
                const mcThStyle = (key: typeof mcSort.key, align: 'left' | 'right' = 'right') => ({
                  textAlign: align as 'left' | 'right',
                  color: mcSort.key === key ? C.teal : C.dim,
                  cursor: 'pointer' as const,
                  userSelect: 'none' as const,
                  display: 'inline-flex' as const,
                  alignItems: 'center' as const,
                  gap: 2,
                  justifyContent: align === 'right' ? 'flex-end' as const : 'flex-start' as const,
                });
                const mcArr = (key: typeof mcSort.key) => mcSort.key === key ? (mcSort.dir === 'asc' ? '▲' : '▼') : '';
                return (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                    {buckets.map(bucket => {
                      const rows = mcTickers
                        .filter(s => { const mc = Number(s.market_cap); return mc >= bucket.min && mc < bucket.max; })
                        .sort(mcSortFn);
                      return (
                        <div
                          key={bucket.label}
                          style={{ flex: '1 1 200px', minWidth: 180, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}
                        >
                          {/* bucket header */}
                          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>{bucket.label}</span>
                            <span style={{ fontSize: 8, color: C.dim }}>{bucket.sub}</span>
                            <span style={{ fontSize: 8, color: C.dim, marginLeft: 'auto' }}>{rows.length}</span>
                          </div>
                          {/* sortable column headers */}
                          <div style={{
                            display: 'grid', gridTemplateColumns: '52px 1fr 52px 42px',
                            padding: '4px 10px', gap: 4,
                            fontSize: 7, fontWeight: 700, letterSpacing: '0.07em',
                            textTransform: 'uppercase' as const,
                            borderBottom: `1px solid ${C.border}22`,
                            position: 'sticky' as const, top: 0, background: C.card,
                          }}>
                            <span style={mcThStyle('ticker', 'left')} onClick={() => handleMcSort('ticker')}>
                              Ticker <span style={{ fontSize: 6 }}>{mcArr('ticker')}</span>
                            </span>
                            <span style={mcThStyle('price')} onClick={() => handleMcSort('price')}>
                              Price <span style={{ fontSize: 6 }}>{mcArr('price')}</span>
                            </span>
                            <span style={mcThStyle('chg')} onClick={() => handleMcSort('chg')}>
                              Chg% <span style={{ fontSize: 6 }}>{mcArr('chg')}</span>
                            </span>
                            <span style={mcThStyle('volx')} onClick={() => handleMcSort('volx')}>
                              VolX <span style={{ fontSize: 6 }}>{mcArr('volx')}</span>
                            </span>
                          </div>
                          {/* rows */}
                          <div style={{ maxHeight: 320, overflowY: 'auto' }} className="wl-scrollbar">
                            {rows.length === 0 ? (
                              <div style={{ padding: '12px 10px', fontSize: 9, color: C.dim, textAlign: 'center' as const }}>No tickers</div>
                            ) : rows.map((s, ri) => {
                              const chg = s.change_pct ?? s.change_pct_1d;
                              const cClr = changeColor(chg);
                              const vx = formatRelVol(s.volume, s.average_volume, s.relative_volume);
                              return (
                                <div
                                  key={`${s.ticker}-${ri}`}
                                  onClick={() => s.ticker && handleTickerClick(s.ticker)}
                                  style={{
                                    display: 'grid', gridTemplateColumns: '52px 1fr 52px 42px',
                                    padding: '5px 10px', gap: 4,
                                    borderBottom: `1px solid ${C.border}18`,
                                    background: ri % 2 === 0 ? 'transparent' : `${C.border}06`,
                                    cursor: s.ticker ? 'pointer' : 'default',
                                    alignItems: 'center',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : `${C.border}06`; }}
                                >
                                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', fontFamily: C.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.ticker || DASH}</span>
                                  <span style={{ fontSize: 10, color: C.text, fontFamily: C.font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{formatPrice(s.price)}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: cClr, fontFamily: C.font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{formatChgPct(chg)}</span>
                                  <span style={{ fontSize: 10, color: C.text, fontFamily: C.font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{vx}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
                } /* end marketcap */

                /* ── FUNDAMENTALS ── */
                const srcTickers = innerView === 'close-watch' ? closeWatchTickers : sortedTickers;

                // Build CSV lookup from already-loaded watchlist.csv_data — no new fetch
                const csvMap: Record<string, any> = {};
                for (const row of (watchlist?.csv_data || [])) {
                  const t = (row.ticker || row.Ticker || row.TICKER || row.symbol || row.Symbol || '').toString().toUpperCase();
                  if (t) csvMap[t] = row;
                }

                // Per-row merge: stock row (realtime) + csv row (fundamentals); stock wins for shared keys
                const fundRows = srcTickers.map(s => {
                  const key = (s.ticker || '').toString().toUpperCase();
                  const csv = csvMap[key] || {};
                  // CSV fills in blanks; stock's defined keys override CSV for realtime fields
                  return { ...csv, ...s };
                });

                // Sort
                const fDir = fundSort.dir === 'asc' ? 1 : -1;
                const fColDef = FUND_COLS.find(c => c.key === fundSort.key);
                const sortedFundRows = [...fundRows].sort((a, b) => {
                  if (!fColDef) return 0;
                  const av = fundGetField(a, fColDef.key, fColDef.aliases);
                  const bv = fundGetField(b, fColDef.key, fColDef.aliases);
                  if (fColDef.fmt === 'symbol' || fColDef.fmt === 'str' || fColDef.fmt === 'date') {
                    return fDir * String(av ?? '').localeCompare(String(bv ?? ''));
                  }
                  const an = typeof av === 'number' ? av : parseFloat(av);
                  const bn = typeof bv === 'number' ? bv : parseFloat(bv);
                  const af = Number.isFinite(an) ? an : (fundSort.dir === 'asc' ? Infinity : -Infinity);
                  const bf = Number.isFinite(bn) ? bn : (fundSort.dir === 'asc' ? Infinity : -Infinity);
                  return fDir * (af - bf);
                });

                const handleFundSort = (key: string) => {
                  const colFmt = FUND_COLS.find(c => c.key === key)?.fmt;
                  setFundSort(prev => prev.key === key
                    ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                    : { key, dir: (colFmt === 'symbol' || colFmt === 'str') ? 'asc' : 'desc' });
                };

                const fThClr = (key: string) => fundSort.key === key ? C.teal : C.dim;
                const fArr   = (key: string) => fundSort.key === key ? (fundSort.dir === 'asc' ? '▲' : '▼') : '';

                const TH: React.CSSProperties = {
                  padding: '5px 10px', fontSize: 7, fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                  cursor: 'pointer', userSelect: 'none' as const,
                  background: C.card, borderBottom: `1px solid ${C.border}`,
                  fontFamily: C.font,
                };
                const TD: React.CSSProperties = {
                  padding: '5px 10px', fontSize: 10, whiteSpace: 'nowrap' as const,
                  borderBottom: `1px solid ${C.border}18`, fontFamily: C.font,
                };

                return (
                  <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 6 }} className="wl-scrollbar">
                    <table style={{ borderCollapse: 'collapse' as const, minWidth: 'max-content', width: '100%' }}>
                      <thead>
                        <tr>
                          {FUND_COLS.map((col, ci) => (
                            <th
                              key={col.key}
                              onClick={() => handleFundSort(col.key)}
                              style={{
                                ...TH,
                                color: fThClr(col.key),
                                textAlign: ci === 0 ? 'left' as const : 'right' as const,
                                ...(ci === 0 ? {
                                  position: 'sticky' as const, left: 0, zIndex: 2,
                                  boxShadow: `2px 0 4px rgba(0,0,0,0.4)`,
                                } : { position: 'sticky' as const, top: 0, zIndex: 1 }),
                              }}
                            >
                              {col.label}{fundSort.key === col.key ? <span style={{ fontSize: 6, marginLeft: 2 }}>{fArr(col.key)}</span> : null}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFundRows.length === 0 ? (
                          <tr>
                            <td colSpan={FUND_COLS.length} style={{ ...TD, textAlign: 'center' as const, color: C.dim, padding: 16 }}>
                              No tickers
                            </td>
                          </tr>
                        ) : sortedFundRows.map((row, ri) => (
                          <tr
                            key={`${row.ticker}-${ri}`}
                            onClick={() => row.ticker && handleTickerClick(row.ticker)}
                            style={{ cursor: row.ticker ? 'pointer' : 'default', background: ri % 2 === 0 ? 'transparent' : `${C.border}06` }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : `${C.border}06`; }}
                          >
                            {FUND_COLS.map((col, ci) => {
                              const isFirst = ci === 0;
                              const stickyStyle: React.CSSProperties = isFirst ? {
                                position: 'sticky' as const, left: 0, zIndex: 1,
                                background: ri % 2 === 0 ? C.bg : '#0c1525',
                                boxShadow: '2px 0 4px rgba(0,0,0,0.4)',
                              } : {};

                              // RelVol uses existing formatRelVol helper
                              if (col.fmt === 'relvol') {
                                const vx = formatRelVol(row.volume, row.average_volume, row.relative_volume);
                                return (
                                  <td key={col.key} style={{ ...TD, ...stickyStyle, color: C.text, textAlign: 'right' as const }}>
                                    {vx}
                                  </td>
                                );
                              }

                              const v = fundGetField(row, col.key, col.aliases);
                              let content: React.ReactNode = '—';
                              let color = C.dim;

                              if (col.fmt === 'symbol') {
                                const sym = String(v || row.ticker || '—');
                                content = <span style={{ fontWeight: 800, color: '#fff' }}>{sym}</span>;
                                color = 'inherit';
                              } else if (col.fmt === 'str') {
                                content = v ? String(v) : '—';
                                color = v ? C.text : C.dim;
                              } else if (col.fmt === 'compact') {
                                const r = fundFmtCompact(v);
                                content = r; color = r === '—' ? C.dim : C.text;
                              } else if (col.fmt === 'price') {
                                const r = fundFmtPrice(v);
                                content = r; color = r === '—' ? C.dim : C.text;
                              } else if (col.fmt === 'vol') {
                                const r = fundFmtVol(v);
                                content = r; color = r === '—' ? C.dim : C.text;
                              } else if (col.fmt === 'pct') {
                                const r = fundFmtPct(v);
                                content = r.text; color = r.clr;
                              } else if (col.fmt === 'ratio') {
                                const r = fundFmtRatio(v);
                                content = r; color = r === '—' ? C.dim : C.text;
                              } else if (col.fmt === 'date') {
                                const r = fundFmtDate(v);
                                content = r; color = r === '—' ? C.dim : C.text;
                              }

                              return (
                                <td
                                  key={col.key}
                                  style={{
                                    ...TD, ...stickyStyle, color,
                                    textAlign: isFirst ? 'left' as const : 'right' as const,
                                    fontWeight: isFirst ? 700 : 400,
                                  }}
                                >
                                  {content}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
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
          earningsEntry={earningsMap[selectedTicker.toUpperCase()]}
          onClose={() => setSelectedTicker(null)}
        />
      )}
    </div>
  );
}
