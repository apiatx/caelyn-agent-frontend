import { useState, useEffect, useCallback, useRef, useMemo, Fragment, memo } from 'react';
import { useTheme, DARK_C } from '@/contexts/ThemeContext';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import { useSetScreenContext } from '@/hooks/useSetScreenContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import WatchlistAnalysis from '@/components/WatchlistAnalysis';
import type { AnalysisSection, TickerCard } from '@/components/WatchlistAnalysis';
import { StockDetailModal } from '@/components/StockDetailModal';
import { RefreshCw, ExternalLink, Plus, Upload, FileText, Star, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import StrategySelector from '@/components/strategy-selector';
import { WatchlistScorePanel } from '@/components/playbook-score-panel';
import { fetchPlaybooks, scoreWatchlist } from '@/lib/playbooks';
import type { PlaybookSummary, WatchlistPlaybookResponse } from '@/types/playbook';
import { useRealtimeQuotes } from '@/hooks/useRealtimeQuotes';
import { mergeRealtimeQuote } from '@/lib/mergeRealtimeQuote';
import { PriceFreshnessBadge } from '@/components/PriceFreshnessBadge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CaelynConfluenceSection, CaelynRowBreakdown } from '@/components/caelyn-confluence';
import { buildThemeTaxonomyIndex, rowMatchesTaxonomySelection, getTaxonomyChipOrder } from '@/lib/watchlist-theme-taxonomy';
import type { ThemeTaxonomyIndex } from '@/lib/watchlist-theme-taxonomy';

/* ── color tokens (Hyperliquid style) ──────────────────────────────── */
let C = DARK_C;
const font = "'JetBrains Mono','Fira Code',monospace";
const sansFont = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
  upcoming_earnings?: {
    events?: any[];
    stale?: boolean;
    cache_status?: string;
    symbols_requested?: string[];
    missing_symbols?: string[];
    last_updated?: string;
  };
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
  symbol?:           string | null;
  major_news_score?: number;
  signal_strength?:  string;
  catalyst_type?:    string;
  bull_bear_impact?: string;
  why_it_matters?:   string;
  watchlist_symbols?:   string[];
  anchor_symbols?:      string[];
  highlight_symbols?:   string[];
  highlighted_tickers?: Array<{ ticker: string; role: 'watchlist' | 'anchor' }>;
}

interface FlatNewsItem extends NewsItem {
  symbol?:           string;
  major_news_score?: number;
  signal_strength?:  string;
  catalyst_type?:    string;
  bull_bear_impact?: string;
  why_it_matters?:   string;
}

interface NewsActivityItem {
  ticker: string;
  articles_48h: number | null;
  previous_articles_48h: number | null;
  delta_count: number | null;
  delta_pct: number | null;
  delta_label?: string | null;
  activity_as_of?: string | null;
  coverage_status?: string | null;
}

interface RssActivityMeta {
  providers?: string[];
  window_hours?: number;
  comparison_window_hours?: number;
  retention_hours?: number;
  collector_started_at?: string | null;
  last_full_sweep_at?: string | null;
  sweep_in_progress?: boolean;
  current_sweep_started_at?: string | null;
  last_sweep_duration_ms?: number | null;
  ticker_count?: number;
}

type NewsView = 'activity' | 'all' | 'hyperscaler';
type ActivitySortKey = 'ticker' | 'articles_48h' | 'news_mc' | 'delta_count';

interface NewsResponse {
  top_articles?: TopArticle[];
  is_building?:  boolean;
  cache_age_s?:  number;
  articles?: Record<string, NewsItem[]>;
  ticker_activity?: NewsActivityItem[];
  hyperscaler_articles?: TopArticle[];
  rss_activity_meta?: RssActivityMeta;
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
            canonical_theme_name: t.canonical_theme_name || section.canonical_theme_name || section.title,
            canonical_theme_id: t.canonical_theme_id || section.canonical_theme_id || section.id,
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
function flattenNews(newsMap: Record<string, NewsItem[]> | null | undefined): FlatNewsItem[] {
  if (!newsMap) return [];
  const rows: FlatNewsItem[] = [];
  for (const [mapKey, articles] of Object.entries(newsMap)) {
    if (!Array.isArray(articles)) continue;
    const canonicalTicker = mapKey.toUpperCase();
    for (const a of articles) {
      // Map key is the canonical ticker association — always wins over any article-level ticker field
      rows.push({ ...a, ticker: canonicalTicker });
    }
  }
  rows.sort((a, b) =>
    new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
  );
  return rows;
}

/* ── check if analysis is new format ───────────────────────────────── */
function isNewFormat(analysis: any): boolean {
  return analysis && Array.isArray(analysis.sections);
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

function getDailyChangePct(row: any): number | null {
  const v = row.change_pct ?? row.change_pct_1d ?? row.change_percent ?? row.changePct ??
    row.changesPercentage ?? row.day_change_percent ?? row.price_change_percent ??
    row.chg_percent ?? row.chgPct ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function get7dChangePct(row: any): number | null {
  const v = row.change_7d ?? row.change7d ?? row.priceChange7d ??
    row.performance7d ?? row.return7d ?? row.pct_change_7d ?? row.chg_7d ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function get30dChangePct(row: any): number | null {
  const v = row.change_30d ?? row.change30d ?? row.priceChange30d ??
    row.performance30d ?? row.return30d ?? row.pct_change_30d ?? row.chg_30d ?? null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avgDailyChangePct(rows: any[]): number | null {
  const vals = rows.map(getDailyChangePct).filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function fmtAvgChg(avg: number | null): { text: string; color: string } {
  if (avg === null) return { text: DASH, color: 'inherit' };
  const text = `${avg > 0 ? '+' : ''}${avg.toFixed(2)}%`;
  const color = avg > 0 ? C.green : avg < 0 ? C.red : C.dim;
  return { text, color };
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

function fmtOptCurr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  const s = n < 0 ? '-' : '';
  if (a >= 1_000_000) return `${s}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${s}$${(a / 1_000).toFixed(0)}K`;
  return `${s}$${a.toFixed(0)}`;
}
function fmtOptDelta(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  const sign = n >= 0 ? '+' : '-';
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${sign}$${(a / 1_000).toFixed(0)}K`;
  return `${sign}$${a.toFixed(0)}`;
}
// ── Normalize a raw options-signals row into canonical frontend field names ──
// Applied once per row before spreading onto the ticker; keeps 0 as valid.
function normalizeOptionsSignal(raw: Record<string, any>): Record<string, any> {
  const first = (keys: string[]): any => {
    for (const k of keys) {
      const v = raw[k];
      if (v !== undefined && v !== null) return v;
    }
    return null;
  };
  return {
    ...raw,
    options_score:                  first(['options_score', 'score']),
    options_signal:                 first(['options_signal', 'signal']),
    options_volume_put_call_ratio:  first(['volume_put_call_ratio', 'options_put_call_ratio', 'p_c', 'put_call_ratio']),
    options_premium_put_call_ratio: first(['premium_put_call_ratio']),
    options_net_premium:            first(['options_net_premium', 'net_premium']),
    options_net_premium_delta_1d:   first(['net_premium_change_1d', 'options_net_premium_delta_1d']),
    options_net_premium_delta_7d:   first(['net_premium_change_7d', 'options_net_premium_delta_7d']),
    options_net_premium_delta_30d:  first(['net_premium_change_30d', 'options_net_premium_delta_30d']),
    options_iv:                     first(['options_iv', 'iv', 'implied_volatility']),
    options_expected_move:          first(['options_expected_move', 'expected_move', 'em']),
    options_volume:                 first(['options_volume', 'volume', 'vol']),
    options_open_interest:          first(['options_open_interest', 'open_interest', 'total_open_interest', 'total_oi']),
    options_call_premium:           first(['options_call_premium', 'call_premium']),
    options_put_premium:            first(['options_put_premium', 'put_premium']),
    options_call_volume:            first(['options_call_volume', 'call_volume']),
    options_put_volume:             first(['options_put_volume', 'put_volume']),
    options_call_oi:                first(['options_call_open_interest', 'call_open_interest', 'call_oi']),
    options_put_oi:                 first(['options_put_open_interest', 'put_open_interest', 'put_oi']),
    options_ask_premium:            first(['options_interval_ask_premium', 'prior_session_ask_premium', 'options_ask_premium']),
    options_bid_premium:            first(['options_interval_bid_premium', 'prior_session_bid_premium', 'options_bid_premium']),
    options_mid_premium:            first(['options_interval_midpoint_premium', 'prior_session_midpoint_premium', 'options_mid_premium']),
    options_snapshot_status:        first(['scan_status', 'options_classification', 'snapshot_status', 'options_snapshot_status']),
    options_data_as_of:             first(['snapshot_as_of', 'options_updated_at', 'prior_session_saved_at', 'options_data_as_of']),
  };
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
          fontFamily: font, letterSpacing: '0.04em',
          marginBottom: 8,
        }}>
          MULTI-SOURCE ANALYSIS
        </div>
        <div
          key={stageIdx}
          className="wl-stage-in"
          style={{
            fontSize: 11, color: C.text, fontFamily: sansFont,
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
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: font, flexShrink: 0 }}>
            {sym || '—'}
          </span>
          <span style={{ fontSize: 9, color: C.dim, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {stock.name || stock.company || sym}
          </span>
          {stock.price != null && (
            <span style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: font, flexShrink: 0 }}>
              ${Number(stock.price).toFixed(2)}
            </span>
          )}
          {chg != null && (
            <span style={{
              fontSize: 8, fontWeight: 800, fontFamily: font,
              padding: '1px 5px', borderRadius: 3, flexShrink: 0,
              color: chgCol, background: chgCol + '18',
            }}>
              {chg > 0 ? '+' : ''}{Number(chg).toFixed(1)}%
            </span>
          )}
          {stock.risk_level && (
            <span style={{
              fontSize: 7, fontWeight: 800, fontFamily: font,
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
              fontSize: 7, fontWeight: 700, fontFamily: font,
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
          <div style={{ fontSize: 9, color: accent, fontWeight: 600, fontFamily: sansFont, lineHeight: 1.3, marginBottom: stock.technical_setup ? 3 : 0 }}>
            → {stock.action_note}
          </div>
        )}
        {/* Row 4: technical setup (dim, smaller) */}
        {stock.technical_setup && (
          <div style={{
            fontSize: 8, color: C.dim, fontFamily: font,
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
        <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: `${accent}10` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: sansFont, letterSpacing: '0.02em', flex: 1, minWidth: 0 }}>
              {displayTitle}
            </div>
            {hasAvg && (
              <span style={{
                fontSize: 11, fontWeight: 800, fontFamily: font,
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
            <div style={{ fontSize: 8, color: C.dim, marginTop: 2, fontFamily: font, letterSpacing: '0.02em' }}>
              id: {section.canonical_theme_id || section.id}
            </div>
          )}
          {section.subtitle && (
            <div style={{ fontSize: 9, color: C.dim, marginTop: 3, fontFamily: sansFont, lineHeight: 1.4 }}>
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
            <span style={{ fontSize: 11, fontWeight: 800, color: C.amber, fontFamily: sansFont }}>
              ⏳ {pendingSymbols.length} Tickers Pending Analysis
            </span>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: sansFont }}>
              Hit Refresh to analyze all tickers in batches
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {pendingSymbols.slice(0, 60).map(sym => (
              <span key={sym} style={{
                fontSize: 9, fontWeight: 700, fontFamily: font,
                padding: '2px 7px', borderRadius: 3,
                color: C.dim, background: C.border,
              }}>
                {sym}
              </span>
            ))}
            {pendingSymbols.length > 60 && (
              <span style={{ fontSize: 9, color: C.dim, fontFamily: font, padding: '2px 7px' }}>
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
   THEME PERFORMANCE GROUPINGS — backend-authoritative, deterministic
   Consumes GET /api/watchlist/{id}/performance/theme (no AI/LLM, no re-sort)
   ═══════════════════════════════════════════════════════════════════════ */
function normalizeThemeGroups(resp: any): any[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  // Backend contract (GET /api/watchlist/:wid/performance/theme): { theme_cards: [...] }
  return resp.theme_cards || resp.themes || resp.groups || resp.sections || resp.theme_groups || [];
}

function themeGroupName(group: any): string {
  return group?.theme_name || group?.canonical_theme_name || group?.theme || group?.name || group?.label || 'Unassigned';
}

function themeGroupPct1d(group: any): number | null {
  const v = group?.theme_1d_pct ?? group?.theme_change_pct_1d ?? group?.avg_change_pct_1d ??
    group?.performance_1d ?? group?.change_pct_1d ?? group?.avg_1d_pct ?? null;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

function themeGroupTickers(group: any): any[] {
  return group?.tickers || group?.symbols || group?.holdings || [];
}

function themeTickerSymbol(t: any): string {
  return (t?.symbol || t?.ticker || '').toString().toUpperCase();
}

function themeTickerPct1d(t: any): number | null {
  const v = t?.change_pct_1d ?? t?.change_pct ?? t?.change_percent ?? t?.day_change_percent ?? null;
  return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
}

function ThemePerformanceGroupings({ resp, isLoading, isError, onTickerClick }: { resp: any; isLoading: boolean; isError: boolean; onTickerClick?: (t: string) => void }) {
  if (isLoading) {
    return (
      <div style={{ padding: 24, fontSize: 10, color: C.dim, textAlign: 'center' as const }}>
        Loading Theme performance groupings…
      </div>
    );
  }
  if (isError) {
    return (
      <div style={{
        padding: 16, fontSize: 10, color: C.amber, textAlign: 'center' as const,
        background: `${C.amber}10`, border: `1px solid ${C.amber}30`, borderRadius: 6,
      }}>
        Theme performance grouping is temporarily unavailable. Other groupings remain usable.
      </div>
    );
  }
  const groups = normalizeThemeGroups(resp);
  if (!groups.length) {
    return (
      <div style={{ padding: 24, fontSize: 10, color: C.dim, textAlign: 'center' as const }}>
        No Theme groupings returned.
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
      {groups.map((group: any, gi: number) => {
        const name = themeGroupName(group);
        const isUnassigned = name.toLowerCase() === 'unassigned';
        const accent = isUnassigned ? C.dim : (SECTION_ACCENTS[group.canonical_theme_id || group.theme_id || name] || C.teal);
        const pct = themeGroupPct1d(group);
        const hasPct = pct != null;
        const pctColor = hasPct ? (pct >= 0 ? C.green : C.red) : C.dim;
        const tickers = themeGroupTickers(group);
        return (
          <div key={group.theme_id || group.canonical_theme_id || name || gi} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: 6,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, background: `${accent}10` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: accent, fontFamily: sansFont, letterSpacing: '0.02em', flex: 1, minWidth: 0 }}>
                  {name}
                </div>
                {hasPct && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, fontFamily: font,
                    color: pctColor,
                    background: pctColor + '18',
                    padding: '2px 7px', borderRadius: 4,
                    flexShrink: 0,
                    letterSpacing: '0.02em',
                  }}>
                    {pct! > 0 ? '+' : ''}{pct!.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize: 8, color: C.dim, marginTop: 3, fontFamily: font }}>
                {tickers.length} ticker{tickers.length === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 340 }} className="wl-scrollbar">
              {tickers.length === 0 ? (
                <div style={{ padding: 14, fontSize: 10, color: C.dim, textAlign: 'center' as const }}>No tickers</div>
              ) : tickers.map((t: any, i: number) => {
                const sym = themeTickerSymbol(t);
                const chg = themeTickerPct1d(t);
                const chgColor = changeColor(chg ?? undefined);
                return (
                  <div
                    key={sym || i}
                    onClick={() => sym && onTickerClick?.(sym)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 14px',
                      borderBottom: i < tickers.length - 1 ? `1px solid ${C.border}` : 'none',
                      cursor: sym ? 'pointer' : 'default',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${accent}0c`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: font, flexShrink: 0 }}>
                      {sym || DASH}
                    </span>
                    {t.price != null && (
                      <span style={{ fontSize: 10, color: C.text, fontFamily: font, flex: 1, textAlign: 'left' as const }}>
                        {formatPrice(t.price)}
                      </span>
                    )}
                    <span style={{
                      fontSize: 9, fontWeight: 800, fontFamily: font,
                      padding: '1px 6px', borderRadius: 3, flexShrink: 0, marginLeft: 'auto',
                      color: chgColor, background: chgColor + '18',
                    }}>
                      {chg != null ? formatChgPct(chg) : DASH}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   WATCHLIST PAGE — Bloomberg Terminal Style
   ═══════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
   FUNDAMENTALS SCAN TABLE — helpers & column definitions
   ═══════════════════════════════════════════════════════════════════ */
type FundColFmt = 'symbol' | 'str' | 'price' | 'compact' | 'pct' | 'pct_rev' | 'ratio' | 'vol' | 'relvol' | 'date' | 'status' | 'risk' | 'score' | 'months';
interface FundColDef { key: string; label: string; aliases?: string[]; fmt: FundColFmt; tooltip?: string }

const FUND_COLS: FundColDef[] = [
  { key: 'ticker',           label: 'Ticker',        aliases: ['symbol'],                                                          fmt: 'symbol'  },
  { key: 'company',          label: 'Company',       aliases: ['name', 'company_name', 'companyName'],                             fmt: 'str'     },
  { key: 'canonical_theme_name', label: 'Theme',     aliases: ['section_title', 'watchlist_theme', 'ai_theme', 'enhanced_theme', 'theme_label', 'mapped_theme'], fmt: 'str' },
  { key: 'market_cap',       label: 'Mkt Cap',       aliases: ['marketCap', 'market_capitalization'],                              fmt: 'compact' },
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
  { key: 'revenue_growth_est',        label: 'Rev Grwth Est',   aliases: ['Revenue Growth Est.', 'Revenue Growth Estimate', 'Rev Growth Est.', 'revenueGrowthEstimate', 'revGrowthEst', 'analyst_revenue_growth_est'],                                           fmt: 'pct' },
  { key: 'rev_growth_next_quarter',   label: 'Rev Grwth NQ',    aliases: ['Revenue Growth Next Quarter', 'Rev Growth Next Quarter', 'Revenue Growth NQ', 'Rev Growth NQ', 'revenue_growth_next_quarter', 'revenueGrowthNextQuarter', 'revGrowthNextQuarter'],     fmt: 'pct' },
  { key: 'rev_growth_next_year',      label: 'Rev Grwth NY',    aliases: ['Revenue Growth Next Year', 'Rev Growth Next Year', 'Revenue Growth NY', 'Rev Growth NY', 'revenue_growth_next_year', 'revenueGrowthNextYear', 'revGrowthNextYear'],                    fmt: 'pct' },
  { key: 'eps_growth_est',            label: 'EPS Grwth Est',   aliases: ['EPS Growth Est.', 'EPS Growth Estimate', 'epsGrowthEstimate', 'epsGrowthEst', 'analyst_eps_growth_est'],                                                                              fmt: 'pct' },
  { key: 'eps_growth_tq',             label: 'EPS Grwth TQ',    aliases: ['EPS Growth This Quarter', 'EPS Growth TQ', 'eps_growth_this_quarter', 'epsGrowthThisQuarter'],                                                                                        fmt: 'pct' },
  { key: 'eps_growth_nq',             label: 'EPS Grwth NQ',    aliases: ['EPS Growth Next Quarter', 'EPS Growth NQ', 'eps_growth_next_quarter', 'epsGrowthNextQuarter'],                                                                                        fmt: 'pct' },
  { key: 'eps_growth_ty',             label: 'EPS Grwth TY',    aliases: ['EPS Growth This Year', 'EPS Growth TY', 'eps_growth_this_year', 'epsGrowthThisYear'],                                                                                                 fmt: 'pct' },
  { key: 'eps_growth_ny',             label: 'EPS Grwth NY',    aliases: ['EPS Growth Next Year', 'EPS Growth NY', 'eps_growth_next_year', 'epsGrowthNextYear'],                                                                                                 fmt: 'pct' },
];

/* ═══════════════════════════════════════════════════════════════════
   QUALITY SCREENER — types, category column definitions
   ═══════════════════════════════════════════════════════════════════ */
type FundamentalsCategory = 'overview' | 'financialHealth' | 'growth' | 'valuation';
const WL_FUNDAMENTALS_CATEGORY_KEY = 'wl_fundamentals_category';

const Q_BASE: FundColDef[] = [
  { key: 'ticker',               label: 'Ticker',  aliases: ['symbol'],                                                                                          fmt: 'symbol' },
  { key: 'company',              label: 'Company', aliases: ['name', 'company_name', 'companyName'],                                                            fmt: 'str'    },
  { key: 'canonical_theme_name', label: 'Theme',   aliases: ['section_title','watchlist_theme','ai_theme','enhanced_theme','theme_label','mapped_theme'],       fmt: 'str'    },
];

const QUALITY_OVERVIEW_COLS: FundColDef[] = [
  ...Q_BASE,
  { key: 'net_cash_debt',                 label: 'Net Cash/Debt',  aliases: ['Net Cash / Debt','netCashDebt','net_cash_or_debt'],                                                      fmt: 'compact', tooltip: 'Cash and short-term investments minus total debt. Positive means the company has net cash; negative means net debt. Positive is generally stronger, but compare debt with EBITDA and cash generation because absolute dollars depend on company size.' },
  { key: 'cash_runway_status',            label: 'Runway',         aliases: ['Cash Runway Status','cashRunwayStatus','runway_status'],                                                  fmt: 'status',  tooltip: 'Summarizes cash-runway health. Self-Funding means free cash flow is nonnegative. Adequate generally means 24+ months, Caution means 12–24 months, and Critical means under 12 months.' },
  { key: 'current_ratio',                 label: 'Curr Ratio',     aliases: ['Current Ratio','currentRatio'],                                                                          fmt: 'ratio',   tooltip: 'Current assets divided by current liabilities. Around 1.5 or higher is generally strong, 1.0–1.5 is adequate but worth monitoring, and below 1.0 may indicate short-term liquidity pressure. Less meaningful for banks and insurers.' },
  { key: 'roic',                          label: 'ROIC',           aliases: ['ROIC','return_on_invested_capital','returnOnInvestedCapital','roic_pct'],                                 fmt: 'pct',     tooltip: 'Return generated on invested capital. Above 15% is generally excellent, 8–15% is solid, and below 8% is weaker. Persistent ROIC above the cost of capital can indicate a durable business advantage.' },
  { key: 'fcf_conversion',                label: 'FCF Conv',       aliases: ['FCF Conversion','fcfConversion','free_cash_flow_conversion','fcf_conversion_ratio'],                     fmt: 'ratio',   tooltip: 'TTM free cash flow divided by materially positive TTM net income. Around 0.8x or higher is generally strong, 0.5–0.8x is mixed, and below 0.5x may indicate weak earnings-to-cash conversion. Values above 1x mean cash flow exceeds accounting income.' },
  { key: 'diluted_shares_growth_yoy',     label: 'Shrs Grwth',     aliases: ['Diluted Shares Growth YoY','dilutedSharesGrowthYoy','diluted_shares_growth'],                           fmt: 'pct_rev', tooltip: 'Change in average diluted shares versus the prior year. Negative means buybacks and is generally favorable. 0–3% dilution is moderate; above 3% indicates meaningful shareholder dilution.' },
  { key: 'revenue_acceleration',          label: 'Rev Accel',      aliases: ['Revenue Acceleration','revenueAcceleration','revenue_accel'],                                           fmt: 'pct',     tooltip: "Latest quarterly YoY revenue growth minus the prior quarter's YoY growth. Positive means growth is accelerating; near zero means stable; materially negative means growth is decelerating." },
  { key: 'forward_revenue_growth',        label: 'Fwd Rev Grwth',  aliases: ['Forward Revenue Growth','forwardRevenueGrowth','fwd_revenue_growth'],                                   fmt: 'pct',     tooltip: 'FY1 consensus revenue compared with the latest completed actual fiscal year. Above 20% is generally strong, 5–20% is moderate, and below 5% is slow or declining.' },
  { key: 'revenue_estimate_revision_90d', label: 'Rev Est Δ90D',   aliases: ['Revenue Estimate Revision 90D','revenueEstimateRevision90d','rev_revision_90d','rev_est_revision_90d'], fmt: 'pct',     tooltip: 'Percentage change in FY1 revenue consensus versus the stored observation nearest 90 days ago. Positive means analysts raised revenue expectations; negative means expectations were cut. Building means 90-day history has not accumulated yet.' },
  { key: 'eps_estimate_revision_90d',     label: 'EPS Est Δ90D',   aliases: ['EPS Estimate Revision 90D','epsEstimateRevision90d','eps_revision_90d','eps_est_revision_90d'],          fmt: 'pct',     tooltip: 'Percentage change in FY1 EPS consensus versus the stored observation nearest 90 days ago. Positive means analysts raised earnings expectations; negative means expectations were cut. Building means 90-day history has not accumulated yet.' },
  { key: 'forward_pe',                    label: 'Fwd P/E',        aliases: ['Forward P/E','forwardPE','forward_price_earnings','fwd_pe','forward_pe_ratio'],                         fmt: 'ratio',   tooltip: 'Current price divided by FY1 consensus EPS. Below 20x is broadly inexpensive, 20–35x is moderate, and above 35x is expensive. High-growth companies may justify higher multiples. N/M means forward EPS is nonpositive or unavailable.' },
  { key: 'forward_ps',                    label: 'Fwd P/S',        aliases: ['Forward P/S','forwardPS','forward_price_sales','fwd_ps','forward_ps_ratio'],                            fmt: 'ratio',   tooltip: 'Current market capitalization divided by FY1 consensus revenue. Below 4x is broadly lower-priced, 4–10x is premium, and above 10x is expensive. Compare with forward growth and expected margins.' },
];

const QUALITY_FINANCIAL_STRENGTH_COLS: FundColDef[] = [
  ...Q_BASE,
  { key: 'cash',               label: 'Cash',          aliases: ['Cash','cashAndEquivalents','cash_and_equivalents','cash_and_cash_equivalents'],                  fmt: 'compact', tooltip: "Cash and short-term liquidity reported on the latest balance sheet. A larger number is not automatically better; compare it with debt, market capitalization and the company's cash-burn rate." },
  { key: 'net_cash_debt',      label: 'Net Cash/Debt', aliases: ['Net Cash / Debt','netCashDebt','net_cash_or_debt'],                                              fmt: 'compact', tooltip: 'Cash and short-term investments minus total debt. Positive means the company has net cash; negative means net debt. Positive is generally stronger, but compare debt with EBITDA and cash generation because absolute dollars depend on company size.' },
  { key: 'cash_runway_months', label: 'Runway Months', aliases: ['Cash Runway Months','cashRunwayMonths','runway_months'],                                         fmt: 'months',  tooltip: 'For cash-burning companies, estimated months of cash remaining at the current TTM burn rate. Self-funding or 24+ months is generally strong; 12–24 months deserves monitoring; under 12 months can indicate financing or dilution risk.' },
  { key: 'cash_runway_status', label: 'Runway Status', aliases: ['Cash Runway Status','cashRunwayStatus','runway_status'],                                         fmt: 'status',  tooltip: 'Summarizes cash-runway health. Self-Funding means free cash flow is nonnegative. Adequate generally means 24+ months, Caution means 12–24 months, and Critical means under 12 months.' },
  { key: 'current_ratio',      label: 'Curr Ratio',    aliases: ['Current Ratio','currentRatio'],                                                                  fmt: 'ratio',   tooltip: 'Current assets divided by current liabilities. Around 1.5 or higher is generally strong, 1.0–1.5 is adequate but worth monitoring, and below 1.0 may indicate short-term liquidity pressure. Less meaningful for banks and insurers.' },
  { key: 'interest_coverage',  label: 'Int Coverage',  aliases: ['Interest Coverage','interestCoverage','interest_coverage_ratio'],                               fmt: 'ratio',   tooltip: 'TTM EBIT divided by absolute TTM interest expense. Above 5x is generally strong, 2–5x is moderate, and below 2x indicates limited debt-service capacity. Negative means operating losses do not cover interest.' },
  { key: 'debt_to_equity',     label: 'D/E',           aliases: ['debtToEquity','debt_equity','debtEquityRatio','de_ratio'],                                       fmt: 'ratio',   tooltip: 'Total debt divided by shareholder equity. Below 0.5x is generally conservative, 0.5–1.5x is moderate, and above 1.5x indicates higher leverage. Negative equity makes this ratio especially concerning. Industry norms vary.' },
  { key: 'net_debt_ebitda',    label: 'ND/EBITDA',     aliases: ['netDebtToEbitda','net_debt_to_ebitda','netDebtEbitda'],                                          fmt: 'ratio',   tooltip: 'Net debt divided by TTM EBITDA. Negative means net cash and is generally favorable. Below 1x is strong, 1–3x is moderate, and above 3x indicates elevated leverage. Not meaningful when EBITDA is nonpositive.' },
  { key: 'altman_z_score',     label: 'Altman Z',      aliases: ['Altman Z-Score','altmanZScore','altman_z','altman_z_score_value'],                               fmt: 'ratio',   tooltip: 'Provider-supplied balance-sheet distress indicator. Above 2.99 is generally considered Safe, 1.81–2.99 is the Grey Zone, and below 1.81 indicates elevated distress risk. Not appropriate for many banks, insurers or REITs.' },
  { key: 'altman_z_risk',      label: 'Altman Risk',   aliases: ['Altman Z-Risk','altmanZRisk','altman_risk','altman_z_classification'],                          fmt: 'risk',    tooltip: 'Classification derived from Altman Z: Safe, Grey Zone or Distress. Use as a financial-stress warning rather than a standalone investment decision.' },
  { key: 'piotroski_score',    label: 'Piotroski',     aliases: ['Piotroski Score','piotroskiScore','piotroski_f_score','piotroski'],                              fmt: 'score',   tooltip: 'Nine-point financial-strength score based on profitability, leverage, liquidity and operating improvement. 7–9 is generally strong, 4–6 is mixed, and 0–3 is weak.' },
];

const QUALITY_BUSINESS_QUALITY_COLS: FundColDef[] = [
  ...Q_BASE,
  { key: 'gross_margin',             label: 'Gross Mgn',      aliases: ['grossMargin','gross_profit_margin'],                                                          fmt: 'pct',    tooltip: 'Gross profit as a percentage of revenue. Higher margins generally indicate pricing power or favorable unit economics. Above 50% is broadly strong, 25–50% is moderate, and below 25% is lower-margin, but sector comparisons matter significantly.' },
  { key: 'operating_margin',         label: 'Op Margin',      aliases: ['Operating Margin','operatingMargin','operating_profit_margin','op_margin'],                   fmt: 'pct',    tooltip: 'Operating income as a percentage of revenue after normal operating expenses. Above 20% is generally strong, 10–20% is healthy, and below 10% is weaker. Negative margins indicate operating losses.' },
  { key: 'fcf_margin',               label: 'FCF Mgn',        aliases: ['freeCashFlowMargin','fcfMargin','fcf_margin_pct'],                                            fmt: 'pct',    tooltip: 'Free cash flow as a percentage of revenue. Above 15% is generally strong, 5–15% is moderate, and below 5% is weak. Negative values indicate cash burn.' },
  { key: 'roic',                     label: 'ROIC',           aliases: ['ROIC','return_on_invested_capital','returnOnInvestedCapital','roic_pct'],                      fmt: 'pct',    tooltip: 'Return generated on invested capital. Above 15% is generally excellent, 8–15% is solid, and below 8% is weaker. Persistent ROIC above the cost of capital can indicate a durable business advantage.' },
  { key: 'fcf_yield',                label: 'FCF Yield',      aliases: ['FCF Yield','fcfYield','free_cash_flow_yield','fcf_yield_pct'],                                fmt: 'pct',    tooltip: 'TTM free cash flow divided by current market capitalization. Above 5% is generally attractive, 2–5% is moderate, and below 2% is expensive or weak. Negative means the company is burning cash.' },
  { key: 'fcf_conversion',           label: 'FCF Conv',       aliases: ['FCF Conversion','fcfConversion','free_cash_flow_conversion','fcf_conversion_ratio'],          fmt: 'ratio',  tooltip: 'TTM free cash flow divided by materially positive TTM net income. Around 0.8x or higher is generally strong, 0.5–0.8x is mixed, and below 0.5x may indicate weak earnings-to-cash conversion. Values above 1x mean cash flow exceeds accounting income.' },
  { key: 'diluted_shares_growth_yoy',label: 'Shrs Grwth YoY',aliases: ['Diluted Shares Growth YoY','dilutedSharesGrowthYoy','diluted_shares_growth'],                  fmt: 'pct_rev',tooltip: 'Change in average diluted shares versus the prior year. Negative means buybacks and is generally favorable. 0–3% dilution is moderate; above 3% indicates meaningful shareholder dilution.' },
  { key: 'sbc_revenue',              label: 'SBC/Rev',        aliases: ['SBC / Revenue','sbcRevenue','sbc_to_revenue','sbc_pct_revenue','sbc_as_pct_revenue'],         fmt: 'pct',    tooltip: 'Stock-based compensation as a percentage of revenue. Below 5% is generally low, 5–15% is material but common in growth companies, and above 15% indicates heavy dilution risk.' },
];

const QUALITY_GROWTH_QUALITY_COLS: FundColDef[] = [
  ...Q_BASE,
  { key: 'revenue_growth',                label: 'Rev Grwth (Y)',  aliases: ['revenue_growth_yoy','revenueGrowth','revenueGrowthYoy'],                                                            fmt: 'pct',  tooltip: 'Year-over-year revenue growth. Above 20% is generally strong, 5–20% is moderate, and below 5% is slow. Negative values indicate contraction.' },
  { key: 'revenue_acceleration',          label: 'Rev Accel',      aliases: ['Revenue Acceleration','revenueAcceleration','revenue_accel'],                                                      fmt: 'pct',  tooltip: "Latest quarterly YoY revenue growth minus the prior quarter's YoY growth. Positive means growth is accelerating; near zero means stable; materially negative means growth is decelerating." },
  { key: 'gross_margin_change_yoy',       label: 'GM Δ YoY',       aliases: ['Gross Margin Change YoY','grossMarginChangeYoy','gross_margin_change','gross_margin_change_yoy'],                  fmt: 'pct',  tooltip: 'Current TTM gross margin minus prior-year TTM gross margin, measured in percentage points. Above +1 point indicates meaningful expansion, between -1 and +1 is broadly stable, and below -1 indicates deterioration.' },
  { key: 'incremental_operating_margin',  label: 'Incr Op Mgn',    aliases: ['Incremental Operating Margin','incrementalOperatingMargin','incremental_op_margin'],                               fmt: 'pct',  tooltip: 'Change in TTM operating income divided by the positive change in TTM revenue. Above 20% generally shows strong operating leverage, 0–20% is modest, and below 0% means added revenue is not improving operating profit.' },
  { key: 'forward_revenue_growth',        label: 'Fwd Rev Grwth',  aliases: ['Forward Revenue Growth','forwardRevenueGrowth','fwd_revenue_growth'],                                              fmt: 'pct',  tooltip: 'FY1 consensus revenue compared with the latest completed actual fiscal year. Above 20% is generally strong, 5–20% is moderate, and below 5% is slow or declining.' },
  { key: 'revenue_estimate_revision_90d', label: 'Rev Est Δ90D',   aliases: ['Revenue Estimate Revision 90D','revenueEstimateRevision90d','rev_revision_90d','rev_est_revision_90d'],            fmt: 'pct',  tooltip: 'Percentage change in FY1 revenue consensus versus the stored observation nearest 90 days ago. Positive means analysts raised revenue expectations; negative means expectations were cut. Building means 90-day history has not accumulated yet.' },
  { key: 'eps_growth',                    label: 'EPS Grwth',      aliases: ['epsGrowth','eps_growth_yoy','epsGrowthYoy'],                                                                       fmt: 'pct',  tooltip: 'Diluted EPS growth versus the exact same fiscal quarter one year earlier. Above 20% is generally strong, 0–20% is positive but moderate, and below 0% indicates declining earnings. Turnarounds through zero are shown as not meaningful rather than misleading percentages.' },
  { key: 'eps_estimate_revision_90d',     label: 'EPS Est Δ90D',   aliases: ['EPS Estimate Revision 90D','epsEstimateRevision90d','eps_revision_90d','eps_est_revision_90d'],                    fmt: 'pct',  tooltip: 'Percentage change in FY1 EPS consensus versus the stored observation nearest 90 days ago. Positive means analysts raised earnings expectations; negative means expectations were cut. Building means 90-day history has not accumulated yet.' },
];

const QUALITY_VALUATION_COLS: FundColDef[] = [
  ...Q_BASE,
  { key: 'pe_ratio',          label: 'P/E',           aliases: ['pe','priceEarnings','priceToEarningsRatio','pe_ttm'],                                          fmt: 'ratio',  tooltip: 'Current market value divided by TTM net income. Lower can indicate a cheaper valuation, but growth and business quality matter. Below 20x is broadly inexpensive, 20–35x is moderate, and above 35x is expensive. N/M means earnings are nonpositive or unavailable.' },
  { key: 'forward_pe',        label: 'Fwd P/E',       aliases: ['Forward P/E','forwardPE','forward_price_earnings','fwd_pe','forward_pe_ratio'],               fmt: 'ratio',  tooltip: 'Current price divided by FY1 consensus EPS. Below 20x is broadly inexpensive, 20–35x is moderate, and above 35x is expensive. High-growth companies may justify higher multiples. N/M means forward EPS is nonpositive or unavailable.' },
  { key: 'ps_ratio',          label: 'P/S',           aliases: ['priceToSales','ps','price_to_sales','ps_ttm'],                                                fmt: 'ratio',  tooltip: 'Current market capitalization divided by TTM revenue. Below 4x is broadly lower-priced, 4–10x is premium, and above 10x is expensive. Margin quality and growth determine whether a high multiple is justified.' },
  { key: 'forward_ps',        label: 'Fwd P/S',       aliases: ['Forward P/S','forwardPS','forward_price_sales','fwd_ps','forward_ps_ratio'],                  fmt: 'ratio',  tooltip: 'Current market capitalization divided by FY1 consensus revenue. Below 4x is broadly lower-priced, 4–10x is premium, and above 10x is expensive. Compare with forward growth and expected margins.' },
  { key: 'ev_ebitda',         label: 'EV/EBITDA',     aliases: ['evToEbitda','ev_to_ebitda','enterpriseValueEbitda'],                                          fmt: 'ratio',  tooltip: 'Enterprise value divided by positive TTM EBITDA. Below 15x is broadly lower-priced, 15–25x is premium, and above 25x is expensive. N/M means EBITDA or enterprise value is nonpositive.' },
  { key: 'forward_ev_sales',  label: 'Fwd EV/S',      aliases: ['Forward EV/Sales','forwardEvSales','forward_ev_to_sales','fwd_ev_sales'],                     fmt: 'ratio',  tooltip: 'Enterprise value divided by FY1 consensus revenue. Below 4x is broadly lower-priced, 4–10x is premium, and above 10x is expensive. Best interpreted alongside growth and margins.' },
  { key: 'forward_ev_ebitda', label: 'Fwd EV/EBITDA', aliases: ['Forward EV/EBITDA','forwardEvEbitda','forward_ev_to_ebitda','fwd_ev_ebitda'],                fmt: 'ratio',  tooltip: 'Enterprise value divided by positive FY1 consensus EBITDA. Below 15x is broadly lower-priced, 15–25x is premium, and above 25x is expensive. N/M means expected EBITDA or enterprise value is nonpositive.' },
  { key: 'p_fcf',             label: 'P/FCF',         aliases: ['P/FCF','pFcf','price_to_fcf','price_to_free_cash_flow'],                                     fmt: 'ratio',  tooltip: 'Current market capitalization divided by positive TTM free cash flow. Below 20x is broadly attractive, 20–35x is moderate, and above 35x is expensive. N/M means free cash flow is nonpositive.' },
  { key: 'fcf_yield',         label: 'FCF Yield',     aliases: ['FCF Yield','fcfYield','free_cash_flow_yield','fcf_yield_pct'],                                fmt: 'pct',    tooltip: 'TTM free cash flow divided by current market capitalization. Above 5% is generally attractive, 2–5% is moderate, and below 2% is expensive or weak. Negative means the company is burning cash.' },
];

/* ── New column arrays for reorganized navigation ──────────────────────── */

// Fundamentals → Overview
const FUND_OVERVIEW_COLS: FundColDef[] = [
  ...Q_BASE,
  FUND_COLS.find(c => c.key === 'market_cap')!,
  FUND_COLS.find(c => c.key === 'revenue')!,
  QUALITY_GROWTH_QUALITY_COLS.find(c => c.key === 'revenue_growth')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'gross_margin')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'fcf_margin')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'net_cash_debt')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'roic')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'fcf_conversion')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'diluted_shares_growth_yoy')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'revenue_acceleration')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'forward_revenue_growth')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'revenue_estimate_revision_90d')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'forward_ps')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'forward_pe')!,
];

// Fundamentals → Financials
const FUND_FINANCIALS_COLS: FundColDef[] = [
  ...Q_BASE,
  FUND_COLS.find(c => c.key === 'market_cap')!,
  FUND_COLS.find(c => c.key === 'revenue')!,
  FUND_COLS.find(c => c.key === 'revenue_growth_q')!,
  FUND_COLS.find(c => c.key === 'revenue_growth')!,
  FUND_COLS.find(c => c.key === 'gross_margin')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'operating_margin')!,
  FUND_COLS.find(c => c.key === 'fcf_margin')!,
  FUND_COLS.find(c => c.key === 'free_cash_flow')!,
  FUND_COLS.find(c => c.key === 'operating_income')!,
  FUND_COLS.find(c => c.key === 'ebit')!,
  FUND_COLS.find(c => c.key === 'eps_growth')!,
  FUND_COLS.find(c => c.key === 'shares_insiders')!,
];

// Legacy arrays — kept for backwards-compat; content absorbed into Financial Health
const FUND_STRENGTH_COLS = QUALITY_FINANCIAL_STRENGTH_COLS;
const FUND_QUALITY_COLS: FundColDef[] = QUALITY_BUSINESS_QUALITY_COLS.filter(c => c.key !== 'fcf_yield');

// Fundamentals → Valuation
const FUND_VALUATION_COLS = QUALITY_VALUATION_COLS;

// Fundamentals → Financial Health (combines old Financials + Strength + Quality)
const FUND_FINANCIAL_HEALTH_COLS: FundColDef[] = [
  ...Q_BASE,
  FUND_COLS.find(c => c.key === 'market_cap')!,
  FUND_COLS.find(c => c.key === 'revenue')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'gross_margin')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'operating_margin')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'fcf_margin')!,
  FUND_COLS.find(c => c.key === 'free_cash_flow')!,
  FUND_COLS.find(c => c.key === 'operating_income')!,
  FUND_COLS.find(c => c.key === 'ebit')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'roic')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'fcf_conversion')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'cash')!,
  // Total Debt: no canonical frontend field available — column omitted
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'net_cash_debt')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'current_ratio')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'interest_coverage')!,
  FUND_COLS.find(c => c.key === 'debt_to_equity')!,
  FUND_COLS.find(c => c.key === 'net_debt_ebitda')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'cash_runway_months')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'cash_runway_status')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'diluted_shares_growth_yoy')!,
  QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === 'sbc_revenue')!,
  FUND_COLS.find(c => c.key === 'shares_insiders')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'altman_z_score')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'altman_z_risk')!,
  QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === 'piotroski_score')!,
];

// Fundamentals → Growth (combines former Growth + Estimates into one flat view)
const FUND_GROWTH_COMBINED_COLS: FundColDef[] = [
  ...Q_BASE,
  FUND_COLS.find(c => c.key === 'revenue_growth_q')!,
  QUALITY_GROWTH_QUALITY_COLS.find(c => c.key === 'revenue_growth')!,
  QUALITY_GROWTH_QUALITY_COLS.find(c => c.key === 'revenue_acceleration')!,
  QUALITY_GROWTH_QUALITY_COLS.find(c => c.key === 'gross_margin_change_yoy')!,
  QUALITY_GROWTH_QUALITY_COLS.find(c => c.key === 'incremental_operating_margin')!,
  QUALITY_GROWTH_QUALITY_COLS.find(c => c.key === 'forward_revenue_growth')!,
  FUND_COLS.find(c => c.key === 'revenue_growth_est')!,
  FUND_COLS.find(c => c.key === 'rev_growth_next_quarter')!,
  FUND_COLS.find(c => c.key === 'rev_growth_next_year')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'revenue_estimate_revision_90d')!,
  FUND_COLS.find(c => c.key === 'eps_growth')!,
  FUND_COLS.find(c => c.key === 'eps_growth_est')!,
  FUND_COLS.find(c => c.key === 'eps_growth_tq')!,
  FUND_COLS.find(c => c.key === 'eps_growth_nq')!,
  FUND_COLS.find(c => c.key === 'eps_growth_ty')!,
  FUND_COLS.find(c => c.key === 'eps_growth_ny')!,
  QUALITY_OVERVIEW_COLS.find(c => c.key === 'eps_estimate_revision_90d')!,
  FUND_COLS.find(c => c.key === 'earnings_date')!,
];

// Legacy aliases kept for any remaining internal references
const EARNINGS_GROWTH_COLS = FUND_GROWTH_COMBINED_COLS;
const EARNINGS_ESTIMATES_COLS = FUND_GROWTH_COMBINED_COLS;

/* Helper: look up a column def across all Quality + Fundamental column sets */
function findAnyColDef(key: string): FundColDef | undefined {
  return FUND_COLS.find(c => c.key === key)
    || QUALITY_OVERVIEW_COLS.find(c => c.key === key)
    || QUALITY_FINANCIAL_STRENGTH_COLS.find(c => c.key === key)
    || QUALITY_BUSINESS_QUALITY_COLS.find(c => c.key === key)
    || QUALITY_GROWTH_QUALITY_COLS.find(c => c.key === key)
    || QUALITY_VALUATION_COLS.find(c => c.key === key)
    || FUND_OVERVIEW_COLS.find(c => c.key === key)
    || FUND_FINANCIALS_COLS.find(c => c.key === key)
    || FUND_FINANCIAL_HEALTH_COLS.find(c => c.key === key)
    || FUND_GROWTH_COMBINED_COLS.find(c => c.key === key);
}

/** Keys of Quality columns whose fmt === 'pct' — use qualFmtPct (no ×100 scaling). */
const QUALITY_PCT_KEYS = new Set<string>(
  [...QUALITY_OVERVIEW_COLS, ...QUALITY_FINANCIAL_STRENGTH_COLS,
   ...QUALITY_BUSINESS_QUALITY_COLS, ...QUALITY_GROWTH_QUALITY_COLS,
   ...QUALITY_VALUATION_COLS, ...FUND_OVERVIEW_COLS, ...FUND_FINANCIALS_COLS,
   ...FUND_QUALITY_COLS, ...FUND_FINANCIAL_HEALTH_COLS, ...FUND_GROWTH_COMBINED_COLS]
    .filter(c => c.fmt === 'pct')
    .map(c => c.key)
);

/** Valuation-multiple columns that must display N/M for non-positive or missing values. */
const VALUATION_MULTIPLE_KEYS = new Set<string>([
  'pe_ratio', 'forward_pe', 'ps_ratio', 'forward_ps',
  'ev_ebitda', 'forward_ev_sales', 'forward_ev_ebitda', 'p_fcf',
]);

/** Explicit map from valuation column key → backend not-meaningful reason field name. */
const VALUATION_NM_REASON_KEYS: Record<string, string> = {
  pe_ratio:          '_pe_not_meaningful_reason',
  forward_pe:        '_forward_pe_not_meaningful_reason',
  ps_ratio:          '_ps_not_meaningful_reason',
  forward_ps:        '_forward_ps_not_meaningful_reason',
  ev_ebitda:         '_ev_ebitda_not_meaningful_reason',
  forward_ev_sales:  '_forward_ev_sales_not_meaningful_reason',
  forward_ev_ebitda: '_forward_ev_ebitda_not_meaningful_reason',
  p_fcf:             '_p_fcf_not_meaningful_reason',
};

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

/* ── canonical display theme for any Watchlist row ───────────────────────
   Priority: AI-enhanced name → section title → persisted theme fields.
   CSV industry / raw sector must NEVER be returned here.              */
function getWatchlistTheme(row: any): string | undefined {
  if (!row) return undefined;
  return row.canonical_theme_name || row.section_title ||
         row.theme ||
         row.watchlist_theme || row.ai_theme || row.enhanced_theme ||
         row.theme_label || row.mapped_theme || undefined;
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

/* ── Quality-specific formatters ──────────────────────────────────────── */
function qualFmtPct(v: any, reversed = false): { text: string; clr: string } {
  if (typeof v === 'string') {
    const lower = v.toLowerCase().replace(/%$/, '').trim();
    if (lower === 'not_meaningful' || lower === 'n/m') return { text: 'N/M', clr: '#64748b' };
    if (lower === 'history_building') return { text: 'Building', clr: '#64748b' };
  }
  // Backend sends percentage-point values (e.g. 0.42 means 0.42%, 14.90 means 14.90%).
  // Strip trailing % from strings, then use the number directly — no ×100 scaling.
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/%$/, ''));
  if (!Number.isFinite(n)) return { text: '—', clr: '#64748b' };
  const sign = n > 0 ? '+' : '';
  const clr = reversed
    ? (n < 0 ? '#22c55e' : n > 0 ? '#ef4444' : '#64748b')
    : (n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : '#64748b');
  return { text: `${sign}${n.toFixed(2)}%`, clr };
}

function qualFmtCompactSigned(v: any): { text: string; clr: string } {
  if (typeof v === 'string' && v.toLowerCase() === 'not_meaningful') return { text: 'N/M', clr: '#64748b' };
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return { text: '—', clr: '#64748b' };
  const abs = Math.abs(n), sign = n < 0 ? '-' : '';
  let text: string;
  if (abs >= 1e12)      text = `${sign}$${(abs / 1e12).toFixed(2)}T`;
  else if (abs >= 1e9)  text = `${sign}$${(abs / 1e9).toFixed(abs >= 100e9 ? 1 : 2)}B`;
  else if (abs >= 1e6)  text = `${sign}$${(abs / 1e6).toFixed(abs >= 100e6 ? 1 : 2)}M`;
  else if (abs >= 1e3)  text = `${sign}$${(abs / 1e3).toFixed(1)}K`;
  else                  text = `${sign}$${abs.toFixed(2)}`;
  return { text, clr: n > 0 ? '#22c55e' : n < 0 ? '#ef4444' : '#64748b' };
}

const RUNWAY_STATUS_RANK: Record<string, number> = { self_funding: 5, adequate: 4, caution: 3, critical: 2, not_meaningful: 1 };
const ALTMAN_RISK_RANK:   Record<string, number> = { safe: 4, grey: 3, distress: 2, not_meaningful: 1 };

function qualFmtRunwayStatus(v: any): { text: string; clr: string; tooltip?: string } {
  if (!v) return { text: '—', clr: '#64748b' };
  const s = String(v).toLowerCase().replace(/-/g, '_').trim();
  if (s === 'self_funding')   return { text: 'Self-Funding', clr: '#22c55e' };
  if (s === 'adequate')       return { text: 'Adequate',     clr: '#0ea5e9' };
  if (s === 'caution')        return { text: 'Caution',      clr: '#f59e0b' };
  if (s === 'critical')       return { text: 'Critical',     clr: '#ef4444' };
  if (s === 'not_meaningful') return { text: 'N/M',          clr: '#64748b', tooltip: 'Not meaningful for this company structure' };
  return { text: String(v), clr: '#64748b' };
}

function qualFmtAltmanRisk(v: any): { text: string; clr: string; tooltip?: string } {
  if (!v) return { text: '—', clr: '#64748b' };
  const s = String(v).toLowerCase().trim();
  if (s === 'safe')            return { text: 'Safe',    clr: '#22c55e' };
  if (s === 'grey')            return { text: 'Grey',    clr: '#f59e0b' };
  if (s === 'distress')        return { text: 'Distress',clr: '#ef4444' };
  if (s === 'not_meaningful')  return { text: 'N/M',     clr: '#64748b', tooltip: 'Not applicable for this company type' };
  return { text: String(v), clr: '#64748b' };
}

function qualFmtPiotroski(v: any): { text: string; clr: string } {
  if (typeof v === 'string' && v.toLowerCase() === 'not_meaningful') return { text: 'N/M', clr: '#64748b' };
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return { text: '—', clr: '#64748b' };
  const score = Math.round(n);
  return { text: String(score), clr: score >= 7 ? '#22c55e' : score >= 4 ? '#f59e0b' : '#ef4444' };
}

function qualFmtMonths(v: any): { text: string; clr: string } {
  if (v === null || v === undefined || v === '') return { text: '—', clr: '#64748b' };
  if (typeof v === 'string' && v.toLowerCase() === 'not_meaningful') return { text: 'N/M', clr: '#64748b' };
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return { text: '—', clr: '#64748b' };
  return { text: `${n.toFixed(1)} mo`, clr: n >= 24 ? '#22c55e' : n >= 12 ? '#f59e0b' : '#ef4444' };
}

/** Centralized Quality-only threshold band colors.
 *  Returns a color string for metrics with defined thresholds, or '' for neutral/no-threshold metrics.
 *  Apply only in Quality mode over plain-text cell content (not badge/status cells). */
function qualBandColor(key: string, n: number): string {
  if (!Number.isFinite(n)) return '';
  const G = '#22c55e', A = '#f59e0b', R = '#ef4444';
  switch (key) {
    case 'net_cash_debt':             return n > 0 ? G : n < 0 ? R : A;
    case 'cash_runway_months':        return n >= 24 ? G : n >= 12 ? A : R;
    case 'current_ratio':             return n >= 1.5 ? G : n >= 1.0 ? A : R;
    case 'interest_coverage':         return n >= 5 ? G : n >= 2 ? A : R;
    case 'debt_to_equity':            return n < 0 ? R : n <= 0.5 ? G : n <= 1.5 ? A : R;
    case 'net_debt_ebitda':           return n <= 1 ? G : n <= 3 ? A : R;
    case 'altman_z_score':            return n >= 2.99 ? G : n >= 1.81 ? A : R;
    case 'piotroski_score':           return n >= 7 ? G : n >= 4 ? A : R;
    case 'gross_margin':              return n >= 50 ? G : n >= 25 ? A : R;
    case 'operating_margin':          return n >= 20 ? G : n >= 10 ? A : R;
    case 'fcf_margin':                return n >= 15 ? G : n >= 5 ? A : R;
    case 'roic':                      return n >= 15 ? G : n >= 8 ? A : R;
    case 'fcf_yield':                 return n >= 5 ? G : n >= 2 ? A : R;
    case 'fcf_conversion':            return n >= 0.8 ? G : n >= 0.5 ? A : R;
    case 'diluted_shares_growth_yoy': return n <= 0 ? G : n <= 3 ? A : R;
    case 'sbc_revenue':               return n <= 5 ? G : n <= 15 ? A : R;
    case 'revenue_growth':            return n >= 20 ? G : n >= 5 ? A : R;
    case 'revenue_acceleration':      return n >= 2 ? G : n > -2 ? A : R;
    case 'gross_margin_change_yoy':   return n >= 1 ? G : n > -1 ? A : R;
    case 'incremental_operating_margin': return n >= 20 ? G : n >= 0 ? A : R;
    case 'forward_revenue_growth':    return n >= 20 ? G : n >= 5 ? A : R;
    case 'revenue_estimate_revision_90d': return n > 1 ? G : n >= -1 ? A : R;
    case 'eps_growth':                return n >= 20 ? G : n >= 0 ? A : R;
    case 'eps_estimate_revision_90d': return n > 2 ? G : n >= -2 ? A : R;
    case 'pe_ratio': case 'forward_pe':
      return n <= 20 ? G : n <= 35 ? A : R;
    case 'ps_ratio': case 'forward_ps': case 'forward_ev_sales':
      return n <= 4 ? G : n <= 10 ? A : R;
    case 'ev_ebitda': case 'forward_ev_ebitda':
      return n <= 15 ? G : n <= 25 ? A : R;
    case 'p_fcf':
      return n <= 20 ? G : n <= 35 ? A : R;
    default: return ''; // cash: neutral, no universal absolute threshold
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FUNDAMENTAL GROUPING + HIGH CONVICTION ZONE — shared helpers
   Percentile-based, active-watchlist-relative. No LLM, no API calls.
   ═══════════════════════════════════════════════════════════════════════════ */
type FgBucket = 'Market Leaders' | 'High Growth' | 'Speculative Future Growth Leaders' | 'High Speculation';
type FgContext = { pctMap: Map<string, number[]> };

const FG_CURRENT_KEYS  = ['revenue_growth','revenue_growth_q','eps_growth','gross_margin','fcf_margin'] as const;
const FG_FORECAST_KEYS = ['revenue_growth_est','rev_growth_next_quarter','rev_growth_next_year',
  'eps_growth_est','eps_growth_tq','eps_growth_nq','eps_growth_ty','eps_growth_ny'] as const;
const FG_ALL_KEYS = [
  'market_cap','revenue',...FG_CURRENT_KEYS,
  'free_cash_flow','operating_income','ebit','pe_ratio','ps_ratio','ev_ebitda',
  'debt_to_equity','net_debt_ebitda','shares_insiders',...FG_FORECAST_KEYS,
] as const;

function fgParseMetric(row: any, key: string): number | null {
  const col = FUND_COLS.find(c => c.key === key);
  const v = fundGetField(row, key, col?.aliases ?? []);
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return null;
  if (col?.fmt === 'pct' && Math.abs(n) <= 1.5) return n * 100;
  return n;
}

function buildFgContext(rows: any[]): FgContext {
  const pctMap = new Map<string, number[]>();
  for (const key of FG_ALL_KEYS) {
    const vals: number[] = [];
    for (const row of rows) { const v = fgParseMetric(row, key); if (v !== null) vals.push(v); }
    pctMap.set(key, vals.sort((a, b) => a - b));
  }
  return { pctMap };
}

function getMetricPercentile(value: number, sortedVals: number[]): number {
  if (!sortedVals.length) return 50;
  let lo = 0, hi = sortedVals.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; if (sortedVals[mid] <= value) lo = mid + 1; else hi = mid; }
  return (lo / sortedVals.length) * 100;
}

function isTop15(key: string, row: any, ctx: FgContext): boolean {
  const v = fgParseMetric(row, key); if (v === null) return false;
  return getMetricPercentile(v, ctx.pctMap.get(key) ?? []) >= 85;
}

function hasSevereRedFlag(row: any): boolean {
  const gm = fgParseMetric(row,'gross_margin'), fcfm = fgParseMetric(row,'fcf_margin');
  const fcf = fgParseMetric(row,'free_cash_flow'), de = fgParseMetric(row,'debt_to_equity');
  const nde = fgParseMetric(row,'net_debt_ebitda'), rgy = fgParseMetric(row,'revenue_growth');
  return (gm !== null && gm < 0) || (fcfm !== null && fcfm < -30) ||
    (fcf !== null && fcf < -5e9 && fcfm === null) || (de !== null && de > 10) ||
    (nde !== null && nde > 15) || (rgy !== null && rgy < -30);
}

function hasAnyRedFlag(row: any): boolean {
  const gm = fgParseMetric(row,'gross_margin'), fcfm = fgParseMetric(row,'fcf_margin');
  const fcf = fgParseMetric(row,'free_cash_flow'), oi = fgParseMetric(row,'operating_income');
  const ebit = fgParseMetric(row,'ebit'), de = fgParseMetric(row,'debt_to_equity');
  const nde = fgParseMetric(row,'net_debt_ebitda'), rgy = fgParseMetric(row,'revenue_growth');
  return (rgy !== null && rgy < -5) || (fcfm !== null && fcfm < -5) ||
    (fcf !== null && fcf < 0 && fcfm === null) || (oi !== null && oi < 0) ||
    (ebit !== null && ebit < 0) || (gm !== null && gm < 10) ||
    (de !== null && de > 3) || (nde !== null && nde > 5);
}

function scoreMarketLeader(row: any): number {
  return (fgParseMetric(row,'market_cap') ?? 0) / 1e9 * 0.5 +
    (fgParseMetric(row,'gross_margin') ?? 0) + (fgParseMetric(row,'fcf_margin') ?? 0) +
    (fgParseMetric(row,'free_cash_flow') ?? 0) / 1e9 * 0.1;
}

function scoreHighGrowth(row: any, ctx: FgContext): number {
  return [...FG_CURRENT_KEYS].reduce((s, k) => {
    const v = fgParseMetric(row, k); if (v === null) return s;
    return s + getMetricPercentile(v, ctx.pctMap.get(k) ?? []);
  }, 0);
}

function scoreSpecFutureGrowth(row: any, ctx: FgContext): number {
  const fScore = [...FG_FORECAST_KEYS].reduce((s, k) => {
    const v = fgParseMetric(row, k); if (v === null) return s;
    return s + getMetricPercentile(v, ctx.pctMap.get(k) ?? []);
  }, 0);
  return fScore + (fgParseMetric(row,'revenue_growth') ?? 0);
}

function scoreHighSpeculation(row: any): number {
  const rgy = fgParseMetric(row,'revenue_growth'), fcfm = fgParseMetric(row,'fcf_margin');
  const oi = fgParseMetric(row,'operating_income');
  return (rgy !== null && rgy < 0 ? Math.abs(rgy) * 2 : 0) +
    (fcfm !== null && fcfm < 0 ? Math.abs(fcfm) : 0) + (oi !== null && oi < 0 ? 20 : 0);
}

function qualifiesMarketLeader(row: any, ctx: FgContext): boolean {
  const mc = fgParseMetric(row,'market_cap'); if (mc === null || mc < 100e9) return false;
  const rgy = fgParseMetric(row,'revenue_growth'), fcfm = fgParseMetric(row,'fcf_margin');
  const fcf = fgParseMetric(row,'free_cash_flow'), oi = fgParseMetric(row,'operating_income');
  const ebit = fgParseMetric(row,'ebit'), gm = fgParseMetric(row,'gross_margin');
  const de = fgParseMetric(row,'debt_to_equity'), nde = fgParseMetric(row,'net_debt_ebitda');
  if (rgy  !== null && rgy  < -5)  return false;
  if (fcfm !== null && fcfm < 0)   return false;
  if (fcf  !== null && fcf  < 0    && fcfm === null) return false;
  if (oi   !== null && oi   < 0)   return false;
  if (ebit !== null && ebit < 0)   return false;
  if (gm   !== null && gm   < 10)  return false;
  if (de   !== null && de   > 5)   return false;
  if (nde  !== null && nde  > 7)   return false;
  return true;
}

function qualifiesHighGrowth(row: any, ctx: FgContext): boolean {
  const hasTop15 = (FG_CURRENT_KEYS as readonly string[]).some(k => isTop15(k, row, ctx));
  if (!hasTop15) {
    const above70 = [...FG_CURRENT_KEYS].filter(k => {
      const v = fgParseMetric(row, k); if (v === null) return false;
      return getMetricPercentile(v, ctx.pctMap.get(k) ?? []) >= 70;
    }).length;
    if (above70 < 3) return false;
  }
  const rgy = fgParseMetric(row,'revenue_growth'), rgq = fgParseMetric(row,'revenue_growth_q');
  const gm = fgParseMetric(row,'gross_margin'), de = fgParseMetric(row,'debt_to_equity');
  const nde = fgParseMetric(row,'net_debt_ebitda'), oi = fgParseMetric(row,'operating_income');
  const fcf = fgParseMetric(row,'free_cash_flow'), fcfm = fgParseMetric(row,'fcf_margin');
  if (rgy !== null && rgy < 0) return false;
  if (rgy === null && rgq !== null && rgq < 0) return false;
  if (gm  !== null && gm  < 10) return false;
  if (de  !== null && de  > 7)  return false;
  if (nde !== null && nde > 10) return false;
  const oiNeg  = oi !== null && oi < 0;
  const fcfNeg = (fcfm !== null && fcfm < -20) || (fcf !== null && fcf < 0 && fcfm === null);
  if (oiNeg && fcfNeg && gm !== null && gm < 20) return false;
  return true;
}

function qualifiesSpecFuture(row: any, ctx: FgContext): boolean {
  if ((FG_FORECAST_KEYS as readonly string[]).some(k => isTop15(k, row, ctx))) return true;
  const rgy = fgParseMetric(row,'revenue_growth'), rgq = fgParseMetric(row,'revenue_growth_q');
  if (!((rgy !== null && rgy > 30) || (rgq !== null && rgq > 30))) return false;
  const oi = fgParseMetric(row,'operating_income'), fcf = fgParseMetric(row,'free_cash_flow');
  const fcfm = fgParseMetric(row,'fcf_margin'), de = fgParseMetric(row,'debt_to_equity');
  const epsg = fgParseMetric(row,'eps_growth');
  return (oi !== null && oi < 0) || (fcfm !== null && fcfm < 0) ||
    (fcf !== null && fcf < 0 && fcfm === null) || (de !== null && de > 2) || (epsg !== null && epsg < 0);
}

function qualifiesHighSpeculation(row: any, ctx: FgContext): boolean {
  if ([...FG_CURRENT_KEYS,...FG_FORECAST_KEYS].some(k => isTop15(k, row, ctx))) return false;
  let neg = 0;
  const rgy = fgParseMetric(row,'revenue_growth'), fcfm = fgParseMetric(row,'fcf_margin');
  const fcf = fgParseMetric(row,'free_cash_flow'), oi = fgParseMetric(row,'operating_income');
  const ebit = fgParseMetric(row,'ebit'), gm = fgParseMetric(row,'gross_margin');
  const de = fgParseMetric(row,'debt_to_equity'), nde = fgParseMetric(row,'net_debt_ebitda');
  const epsg = fgParseMetric(row,'eps_growth');
  if (rgy  !== null && rgy  < -5)  neg++;
  if (fcfm !== null && fcfm < -10) neg++;
  else if (fcf !== null && fcf < 0 && fcfm === null) neg++;
  if (oi   !== null && oi   < 0)   neg++;
  if (ebit !== null && ebit < 0)   neg++;
  if (gm   !== null && gm   < 15)  neg++;
  if (de   !== null && de   > 3)   neg++;
  if (nde  !== null && nde  > 5)   neg++;
  if (epsg !== null && epsg < -20) neg++;
  const dc = ['market_cap','revenue','revenue_growth','gross_margin','fcf_margin','operating_income']
    .filter(k => fgParseMetric(row, k) !== null).length;
  if (dc <= 1) neg += 2; else if (dc <= 2) neg++;
  return neg >= 3;
}

function assignFundamentalGroups(row: any, ctx: FgContext): FgBucket | null {
  if (qualifiesMarketLeader(row, ctx))    return 'Market Leaders';
  if (qualifiesHighGrowth(row, ctx))      return 'High Growth';
  if (qualifiesSpecFuture(row, ctx))      return 'Speculative Future Growth Leaders';
  if (qualifiesHighSpeculation(row, ctx)) return 'High Speculation';
  return null;
}

function getExtremeMetricTags(row: any, ctx: FgContext, bucket: FgBucket): Array<{label: string; pos: boolean}> {
  const tags: Array<{label: string; pos: boolean}> = [];
  const top15 = (k: string) => isTop15(k, row, ctx);
  const mc = fgParseMetric(row,'market_cap'), rgy = fgParseMetric(row,'revenue_growth');
  const rgq = fgParseMetric(row,'revenue_growth_q'), gm = fgParseMetric(row,'gross_margin');
  const fcfm = fgParseMetric(row,'fcf_margin'), fcf = fgParseMetric(row,'free_cash_flow');
  const oi = fgParseMetric(row,'operating_income'), ebit = fgParseMetric(row,'ebit');
  const de = fgParseMetric(row,'debt_to_equity'), nde = fgParseMetric(row,'net_debt_ebitda');
  const epsg = fgParseMetric(row,'eps_growth'), ins = fgParseMetric(row,'shares_insiders');

  if (bucket === 'High Speculation') {
    tags.push({ label: 'AVOID', pos: false });
    if (rgy !== null && rgy < -5) tags.push({ label: 'Rev Decline', pos: false });
    if (fcfm !== null && fcfm < -10) tags.push({ label: 'Negative FCF', pos: false });
    else if (fcf !== null && fcf < 0 && fcfm === null) tags.push({ label: 'Negative FCF', pos: false });
    if (oi !== null && oi < 0) tags.push({ label: 'Neg Op Income', pos: false });
    if ((de !== null && de > 3) || (nde !== null && nde > 5)) tags.push({ label: 'High Debt', pos: false });
    if (gm !== null && gm < 15) tags.push({ label: 'Weak Gross Mgn', pos: false });
    const dc = ['market_cap','revenue','revenue_growth','gross_margin','fcf_margin','operating_income']
      .filter(k => fgParseMetric(row, k) !== null).length;
    if (dc <= 2) tags.push({ label: 'Missing Fundamentals', pos: false });
    return tags.slice(0, 3);
  }
  // Positive
  if (mc !== null && mc >= 100e9) tags.push({ label: '$100B+ Anchor', pos: true });
  if (top15('revenue_growth') || top15('revenue_growth_q')) tags.push({ label: 'Top 15% Rev Growth', pos: true });
  else if (rgy !== null && rgy > 40) tags.push({ label: 'Huge Rev Growth', pos: true });
  if (top15('eps_growth')) tags.push({ label: 'Top 15% EPS Growth', pos: true });
  if (top15('gross_margin')) tags.push({ label: 'Top 15% Gross Mgn', pos: true });
  if (top15('fcf_margin')) tags.push({ label: 'Top 15% FCF Mgn', pos: true });
  else if (fcfm !== null && fcfm > 15) tags.push({ label: 'Strong FCF Mgn', pos: true });
  const revFcastTop15 = ['revenue_growth_est','rev_growth_next_quarter','rev_growth_next_year'].some(k => top15(k));
  const epsFcastTop15 = ['eps_growth_est','eps_growth_tq','eps_growth_nq','eps_growth_ty','eps_growth_ny'].some(k => top15(k));
  if (revFcastTop15) tags.push({ label: 'Top 15% Rev Forecast', pos: true });
  if (epsFcastTop15) tags.push({ label: 'Top 15% EPS Forecast', pos: true });
  if (ebit !== null && ebit > 0 && bucket === 'Market Leaders') tags.push({ label: 'Positive EBIT', pos: true });
  if (fcf !== null && fcf > 5e9 && bucket === 'Market Leaders') tags.push({ label: 'Strong FCF', pos: true });
  if (ins !== null && ins > 10) tags.push({ label: 'Insider Heavy', pos: true });
  // Negative (growth/spec buckets)
  if (bucket !== 'Market Leaders') {
    if (fcfm !== null && fcfm < -5) tags.push({ label: 'Negative FCF', pos: false });
    else if (fcf !== null && fcf < 0 && fcfm === null) tags.push({ label: 'Negative FCF', pos: false });
    if (oi !== null && oi < 0) tags.push({ label: 'Neg Op Income', pos: false });
    if (de !== null && de > 2) tags.push({ label: 'Debt Funding Growth', pos: false });
    if (epsg !== null && epsg < -10) tags.push({ label: 'EPS Pressure', pos: false });
  }
  const pos = tags.filter(t => t.pos), neg = tags.filter(t => !t.pos);
  return (bucket === 'Speculative Future Growth Leaders' ? [...neg, ...pos] : [...pos, ...neg]).slice(0, 3);
}

/* ── High Conviction Investment Zone + Trade Zone helpers ── */
const HCIZ_ALLOWED_STAGES = ['S1 Base', 'S1-2 Watch', 'S2 Breakout'];

function getStageLabel(row: any): string {
  return (
    row.stage_analysis?.label ?? row.stage2_breakout?.label ??
    row.stage_analysis?.stage ?? row.stage2_breakout?.stage ?? ''
  );
}

function isHcizStage(label: string): boolean {
  return HCIZ_ALLOWED_STAGES.some(s => label.startsWith(s));
}

function getGrowthDriver(row: any, ctx: FgContext, bucket: FgBucket): string {
  if (bucket === 'High Growth') {
    if (isTop15('revenue_growth', row, ctx) || isTop15('revenue_growth_q', row, ctx)) return 'Top 15% Rev Growth';
    if (isTop15('eps_growth', row, ctx)) return 'Top 15% EPS Growth';
    if (isTop15('gross_margin', row, ctx)) return 'Top 15% Gross Mgn';
    if (isTop15('fcf_margin', row, ctx)) return 'Top 15% FCF Mgn';
    const rgy = fgParseMetric(row, 'revenue_growth');
    if (rgy !== null && rgy > 40) return 'Huge Rev Ramp';
    return 'Strong Growth';
  }
  const revFcastTop = ['revenue_growth_est','rev_growth_next_quarter','rev_growth_next_year'].some(k => isTop15(k, row, ctx));
  const epsFcastTop = ['eps_growth_est','eps_growth_tq','eps_growth_nq','eps_growth_ty','eps_growth_ny'].some(k => isTop15(k, row, ctx));
  if (revFcastTop) return 'Top 15% Rev Forecast';
  if (epsFcastTop) return 'Top 15% EPS Forecast';
  const rgy = fgParseMetric(row, 'revenue_growth');
  if (rgy !== null && rgy > 30) return 'Huge Rev Ramp';
  return 'Forecast-Led Growth';
}

function convictionScore(row: any, ctx: FgContext, bucket: FgBucket, stageLabel: string): number {
  const stageScore = stageLabel.startsWith('S2 Breakout') ? 30 : stageLabel.startsWith('S1-2 Watch') ? 20 : 10;
  const growthScore = bucket === 'High Growth' ? scoreHighGrowth(row, ctx) : scoreSpecFutureGrowth(row, ctx) * 0.8;
  const groupBonus = bucket === 'High Growth' ? 10 : 0;
  const mc = fgParseMetric(row, 'market_cap') ?? 1e9;
  const mcScore = Math.log10(Math.max(mc / 1e6, 1)) * 0.5;
  return stageScore + growthScore + groupBonus + mcScore;
}

function isHighConvictionInvestmentZone(
  row: any, ctx: FgContext
): { qualifies: boolean; bucket: FgBucket | null; stageLabel: string } {
  const bucket = assignFundamentalGroups(row, ctx);
  if (bucket !== 'High Growth' && bucket !== 'Speculative Future Growth Leaders') {
    return { qualifies: false, bucket: null, stageLabel: '' };
  }
  const stageLabel = getStageLabel(row);
  if (!isHcizStage(stageLabel)) return { qualifies: false, bucket, stageLabel };
  return { qualifies: true, bucket, stageLabel };
}

/* ── High Conviction Trade Zone helpers ── */
type TradeCtx = { volxSorted: number[]; volMcSorted: number[] };

function buildTradeContext(rows: any[]): TradeCtx {
  const volxSorted = rows
    .map(r => { const v = Number(r.relative_volume ?? r.rel_vol ?? r.volx); return isFinite(v) && v > 0 ? v : null; })
    .filter((v): v is number => v !== null).sort((a, b) => a - b);
  const volMcSorted = rows
    .map(r => { const v = Number(r.vol_mc_pct ?? r.vol_mc_ratio); return isFinite(v) && v > 0 ? v : null; })
    .filter((v): v is number => v !== null).sort((a, b) => a - b);
  return { volxSorted, volMcSorted };
}

function tradePctile(val: number, sorted: number[]): number {
  if (sorted.length === 0) return 0;
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid] < val) lo = mid + 1; else hi = mid; }
  return lo / sorted.length;
}

function getOptionsScore(row: any): number | null {
  const v = Number(row.options_score ?? row.opt_score ?? row.flow_score);
  return isFinite(v) ? v : null;
}

function getOptionsSignalStr(row: any): string {
  return String(row.options_signal ?? row.option_signal ?? row.opt_signal ?? '').toLowerCase();
}

function getVolXVal(row: any): number | null {
  const v = Number(row.relative_volume ?? row.rel_vol ?? row.volx);
  return isFinite(v) && v > 0 ? v : null;
}

function getVolMcPct(row: any, ctx: TradeCtx): number {
  // vol_mc_pct from backend is already a 0-100 percentile rank
  const pre = Number(row.vol_mc_pct);
  if (isFinite(pre) && pre > 0) return Math.min(pre, 100);
  // fallback: compute from raw ratio vs peers
  const ratio = Number(row.vol_mc_ratio);
  if (isFinite(ratio) && ratio > 0) return tradePctile(ratio, ctx.volMcSorted) * 100;
  // fallback: compute from volume / market_cap
  const vol = Number(row.volume); const mc = Number(row.market_cap ?? row.marketCap);
  if (isFinite(vol) && isFinite(mc) && mc > 0) {
    const r = vol / mc; return tradePctile(r, ctx.volMcSorted) * 100;
  }
  return 0;
}

function scoreTradeConfluence(row: any, ctx: TradeCtx): {
  score: number; optStrength: number; volxStrength: number; volMcStrength: number;
  optScore: number | null; volxVal: number | null; stageLabel: string; hasLoudSignal: boolean;
} {
  const stageLabel = getStageLabel(row);
  if (!isHcizStage(stageLabel)) {
    return { score: 0, optStrength: 0, volxStrength: 0, volMcStrength: 0, optScore: null, volxVal: null, stageLabel, hasLoudSignal: false };
  }

  // Stage score (15% weight, expressed as 0–100)
  const stageStrength = stageLabel.startsWith('S2 Breakout') ? 100 : stageLabel.startsWith('S1-2 Watch') ? 85 : 70;

  // Options (25% weight)
  const optScore = getOptionsScore(row);
  const optSigStr = getOptionsSignalStr(row);
  let optStrength = 0;
  if (optScore !== null) {
    optStrength = Math.min(optScore, 100);
  } else if (optSigStr.includes('unusual')) {
    optStrength = 70;
  } else if (optSigStr.includes('bullish') || optSigStr.includes('high')) {
    optStrength = 60;
  } else if (optSigStr.includes('positive') || optSigStr.includes('active')) {
    optStrength = 50;
  }
  // Missing options data = 0, not a disqualifier

  // VolX (35% weight)
  const volxVal = getVolXVal(row);
  let volxStrength = 0;
  if (volxVal !== null) {
    const pct = tradePctile(volxVal, ctx.volxSorted) * 100;
    volxStrength = pct;
    // Absolute thresholds as floor
    if (volxVal >= 5) volxStrength = Math.max(volxStrength, 95);
    else if (volxVal >= 3) volxStrength = Math.max(volxStrength, 80);
    else if (volxVal >= 2) volxStrength = Math.max(volxStrength, 70);
    else if (volxVal >= 1.5) volxStrength = Math.max(volxStrength, 55);
  }

  // Vol/MC (25% weight)
  const volMcStrength = getVolMcPct(row, ctx);

  // Weighted score (0–100)
  const score = (volxStrength * 0.35) + (volMcStrength * 0.25) + (optStrength * 0.25) + (stageStrength * 0.15);

  // At least one loud signal is required (stage alone cannot qualify)
  const volxLoud = volxStrength >= 70 || (volxVal !== null && volxVal >= 2.0);
  const volMcLoud = volMcStrength >= 70; // top ~15% or above
  const optLoud = optStrength >= 50;
  const hasLoudSignal = volxLoud || volMcLoud || optLoud;

  return { score, optStrength, volxStrength, volMcStrength, optScore, volxVal, stageLabel, hasLoudSignal };
}

function getTradeSignalTags(row: any, ctx: TradeCtx,
  optScore: number | null, volxVal: number | null, volxStrength: number, volMcStrength: number, optStrength: number
): Array<{ label: string; pos: boolean }> {
  const tags: Array<{ label: string; pos: boolean }> = [];

  // VolX tags (lead with this — highest weight)
  if (volxVal !== null) {
    if (volxStrength >= 95 || volxVal >= 5) tags.push({ label: 'Elite VolX', pos: true });
    else if (volxStrength >= 80 || volxVal >= 3) tags.push({ label: 'High VolX', pos: true });
    else if (volxStrength >= 70 || volxVal >= 2) tags.push({ label: 'Rel Vol Leader', pos: true });
    else if (volxStrength >= 55 || volxVal >= 1.5) tags.push({ label: 'Vol Surge', pos: true });
  }

  // Vol/MC tags
  if (volMcStrength >= 95) tags.push({ label: 'Elite Vol/MC', pos: true });
  else if (volMcStrength >= 85) tags.push({ label: 'Top Vol/MC', pos: true });
  else if (volMcStrength >= 70) tags.push({ label: 'High Vol/MC', pos: true });

  // Options tags
  if (optScore !== null) {
    if (optScore >= 85) tags.push({ label: 'Elite Options', pos: true });
    else if (optScore >= 70) tags.push({ label: 'Options > 70', pos: true });
    else if (optScore >= 50) tags.push({ label: 'Options > 50', pos: true });
  } else if (optStrength > 0) {
    const sig = getOptionsSignalStr(row);
    if (sig.includes('unusual')) tags.push({ label: 'Unusual Activity', pos: true });
    else if (sig.includes('bullish') || sig.includes('high')) tags.push({ label: 'Bullish Flow', pos: true });
  } else {
    // Options truly missing — add risk tag but only if there's room and positive tags already exist
    const iv = Number(row.options_iv);
    if (isFinite(iv) && iv > 80 && tags.length > 0) tags.push({ label: 'High IV', pos: false });
  }

  // Combo tag
  if (optStrength >= 50 && volxVal !== null && volxVal >= 2) {
    const hasFlowTag = tags.some(t => t.label === 'Flow + Volume');
    if (!hasFlowTag) tags.push({ label: 'Flow + Volume', pos: true });
  }

  // Only return if there's at least one positive tag
  const hasPosTag = tags.some(t => t.pos);
  return hasPosTag ? tags.slice(0, 4) : [];
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROWTH MOMENTUM HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
const GM_ALLOWED_STAGES = ['S2 Breakout', 'S2-S3 Advance', 'S3 Momentum'] as const;
function isGroMoStage(label: string): boolean {
  return GM_ALLOWED_STAGES.some(s => label.startsWith(s));
}

function gmGrowthScore(row: any, ctx: FgContext): number {
  const currentKeys = ['revenue_growth', 'revenue_growth_q', 'eps_growth', 'gross_margin', 'fcf_margin'] as const;
  const forecastKeys = ['revenue_growth_est', 'rev_growth_next_year', 'eps_growth_est', 'eps_growth_ny'] as const;
  let bestCurrent = 0;
  for (const k of currentKeys) {
    const v = fgParseMetric(row, k);
    if (v !== null) { const p = getMetricPercentile(v, ctx.pctMap.get(k) ?? []); if (p > bestCurrent) bestCurrent = p; }
  }
  let bestForecast = 0;
  for (const k of forecastKeys) {
    const v = fgParseMetric(row, k);
    if (v !== null) { const p = getMetricPercentile(v, ctx.pctMap.get(k) ?? []); if (p > bestForecast) bestForecast = p; }
  }
  return bestCurrent * 0.6 + bestForecast * 0.4;
}

function gmHasGrowthGate(row: any, ctx: FgContext, bucket: FgBucket): boolean {
  const gateKeys = ['revenue_growth', 'revenue_growth_q', 'eps_growth',
    'revenue_growth_est', 'rev_growth_next_year', 'eps_growth_est', 'eps_growth_ny'] as const;
  for (const k of gateKeys) {
    const v = fgParseMetric(row, k);
    if (v !== null && getMetricPercentile(v, ctx.pctMap.get(k) ?? []) >= 75) return true;
  }
  if (bucket === 'Market Leaders') {
    const eps = fgParseMetric(row, 'eps_growth'), rev = fgParseMetric(row, 'revenue_growth');
    if (eps !== null && eps > 0 && rev !== null && rev > 0) return true;
  }
  return false;
}

function scoreGrowthMomentum(row: any, fgCtx: FgContext, tCtx: TradeCtx): number {
  const stageLabel = getStageLabel(row);
  const stageStr = stageLabel.startsWith('S2-S3 Advance') ? 100 : stageLabel.startsWith('S2 Breakout') ? 90 : 85;
  const growthStr = gmGrowthScore(row, fgCtx);
  const volxVal = getVolXVal(row);
  const volxPct = volxVal !== null ? tradePctile(volxVal, tCtx.volxSorted) * 100 : 0;
  const volxStr = volxVal !== null ? Math.min(100, volxPct * 0.6 + Math.min(volxVal * 15, 40)) : 0;
  const optScore = getOptionsScore(row);
  const optStr = optScore !== null ? Math.min(optScore, 100) : 0;
  return growthStr * 0.40 + stageStr * 0.25 + volxStr * 0.20 + optStr * 0.15;
}

function getGroMoTags(row: any, ctx: FgContext, tCtx: TradeCtx, bucket: FgBucket): Array<{label: string; pos: boolean}> {
  const tags: Array<{label: string; pos: boolean}> = [];
  const stageLabel = getStageLabel(row);
  if (stageLabel.startsWith('S2-S3 Advance')) tags.push({ label: 'S2-S3 Advance', pos: true });
  else if (stageLabel.startsWith('S2 Breakout')) tags.push({ label: 'S2 Breakout', pos: true });
  else tags.push({ label: 'S3 Momentum', pos: true });
  if (bucket === 'Market Leaders') tags.push({ label: 'Market Leader', pos: true });
  else if (bucket === 'High Growth') tags.push({ label: 'High Growth', pos: true });
  else tags.push({ label: 'Future Growth', pos: true });
  if (isTop15('revenue_growth', row, ctx) || isTop15('revenue_growth_q', row, ctx)) tags.push({ label: 'Top Rev Growth', pos: true });
  if (isTop15('eps_growth', row, ctx)) tags.push({ label: 'Top EPS Growth', pos: true });
  const hasFcTop = (['revenue_growth_est', 'rev_growth_next_year', 'eps_growth_est', 'eps_growth_ny'] as const).some(k => isTop15(k, row, ctx));
  if (hasFcTop) tags.push({ label: 'Top Forecasts', pos: true });
  const revQ = fgParseMetric(row, 'revenue_growth_q'), revY = fgParseMetric(row, 'revenue_growth');
  if (revQ !== null && revQ > 30 && revY !== null && revY > 20) tags.push({ label: 'Revenue Ramp', pos: true });
  const volxVal = getVolXVal(row);
  const volxPct = volxVal !== null ? tradePctile(volxVal, tCtx.volxSorted) : 0;
  if (volxVal !== null && volxVal >= 5) tags.push({ label: 'Elite VolX', pos: true });
  else if (volxVal !== null && volxVal >= 2) tags.push({ label: 'High VolX', pos: true });
  else if (volxPct >= 0.85) tags.push({ label: 'Rel Vol Leader', pos: true });
  const optScore = getOptionsScore(row);
  if (optScore !== null && optScore >= 70) tags.push({ label: 'Options > 70', pos: true });
  else if (optScore !== null && optScore >= 50) tags.push({ label: 'Options > 50', pos: true });
  else if (optScore !== null && optScore >= 25) tags.push({ label: 'Options > 25', pos: true });
  const fcfm = fgParseMetric(row, 'fcf_margin');
  if (fcfm !== null && fcfm < 0) tags.push({ label: 'Not FCF Positive', pos: false });
  const de = fgParseMetric(row, 'debt_to_equity');
  if (de !== null && de > 3) tags.push({ label: 'Debt Funding Growth', pos: false });
  if (stageLabel.startsWith('S3 Momentum')) tags.push({ label: 'Mature Momentum', pos: false });
  return tags.slice(0, 5);
}

/* ─── Signal LKG (last-known-valid) merge ──────────────────────────────────
   When a background refetch returns null/undefined/empty for signal fields that
   were previously populated (common after-hours), preserve the previous value.
   Only applies to signal-derived fields; live quote fields always use fresh data.
   ─────────────────────────────────────────────────────────────────────────── */
const SIGNAL_LKG_FIELDS = [
  'relative_volume', 'rel_vol', 'volx', 'vol_x',
  'vol_mc_pct', 'vol_mc_ratio', 'volume_market_cap', 'vol_market_cap', 'volume_to_market_cap',
  'options_score', 'opt_score', 'flow_score',
  'options_signal', 'option_signal', 'opt_signal',
  'options_volume', 'opt_vol',
  'options_open_interest', 'oi',
  'options_iv', 'iv',
  // Unified options fields
  'options_put_call_ratio', 'options_volume_put_call_ratio', 'options_premium_put_call_ratio',
  'options_net_premium', 'options_net_premium_delta_1d', 'options_net_premium_delta_7d', 'options_net_premium_delta_30d',
  'options_call_premium', 'options_put_premium',
  'options_call_volume', 'options_put_volume',
  'options_call_oi', 'options_put_oi',
  'options_ask_premium', 'options_bid_premium', 'options_mid_premium',
  'options_snapshot_status', 'options_data_as_of',
] as const;

const isMissingSignalValue = (v: unknown): boolean =>
  v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));

/* ═══════════════════════════════════════════════════════════════════════════
   SCREENER FILTER SYSTEM — frontend-only, no API calls, no LLM
   ═══════════════════════════════════════════════════════════════════════════ */
type FilterFieldType = 'numeric' | 'text';
type FilterOperator  = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between' | 'contains' | 'not_contains' | 'exists' | 'missing';

interface ScreenerFilter {
  id: string;
  fieldKey: string;
  operator: FilterOperator;
  value: string;
  value2: string;
}

interface FilterFieldDef {
  key: string;
  label: string;
  type: FilterFieldType;
  group: 'Technical' | 'Fundamental' | 'Quality';
  unit?: string;
}

const SCREENER_FILTER_FIELDS: FilterFieldDef[] = [
  { key: 'ticker',                  label: 'Symbol',              type: 'text',    group: 'Technical' },
  { key: 'company',                 label: 'Company',             type: 'text',    group: 'Technical' },
  { key: 'canonical_theme',         label: 'Theme',               type: 'text',    group: 'Technical' },
  { key: 'price',                   label: 'Price',               type: 'numeric', group: 'Technical', unit: '$' },
  { key: 'chg',                     label: 'Daily % Change',      type: 'numeric', group: 'Technical', unit: '%' },
  { key: 'volume',                  label: 'Volume',              type: 'numeric', group: 'Technical' },
  { key: 'volx',                    label: 'VolX',                type: 'numeric', group: 'Technical', unit: 'x' },
  { key: 'vol_mc',                  label: 'Vol / Mkt Cap',       type: 'numeric', group: 'Technical' },
  { key: 'stage',                   label: 'Stage',               type: 'text',    group: 'Technical' },
  { key: 'options_score',           label: 'Options Score',       type: 'numeric', group: 'Technical' },
  { key: 'options_signal',          label: 'Options Signal',      type: 'text',    group: 'Technical' },
  { key: 'put_call',                label: 'Put/Call',            type: 'numeric', group: 'Technical' },
  { key: 'iv',                      label: 'IV',                  type: 'numeric', group: 'Technical', unit: '%' },
  { key: 'exp_move',                label: 'Expected Move',       type: 'numeric', group: 'Technical', unit: '%' },
  { key: 'opt_volume',              label: 'Options Volume',      type: 'numeric', group: 'Technical' },
  { key: 'open_interest',           label: 'Open Interest',       type: 'numeric', group: 'Technical' },
  { key: 'market_cap',              label: 'Market Cap',          type: 'numeric', group: 'Fundamental', unit: '$' },
  { key: 'revenue',                 label: 'Revenue',             type: 'numeric', group: 'Fundamental', unit: '$' },
  { key: 'revenue_growth_q',        label: 'Revenue Growth (Q)',  type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'revenue_growth',          label: 'Revenue Growth (Y)',  type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'gross_margin',            label: 'Gross Margin',        type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'fcf_margin',              label: 'FCF Margin',          type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'free_cash_flow',          label: 'Free Cash Flow',      type: 'numeric', group: 'Fundamental', unit: '$' },
  { key: 'operating_income',        label: 'Operating Income',    type: 'numeric', group: 'Fundamental', unit: '$' },
  { key: 'ebit',                    label: 'EBIT',                type: 'numeric', group: 'Fundamental', unit: '$' },
  { key: 'pe_ratio',                label: 'P/E',                 type: 'numeric', group: 'Fundamental' },
  { key: 'ps_ratio',                label: 'P/S',                 type: 'numeric', group: 'Fundamental' },
  { key: 'ev_ebitda',               label: 'EV/EBITDA',           type: 'numeric', group: 'Fundamental' },
  { key: 'eps_growth',              label: 'EPS Growth',          type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'debt_to_equity',          label: 'Debt / Equity',       type: 'numeric', group: 'Fundamental' },
  { key: 'net_debt_ebitda',         label: 'Net Debt / EBITDA',   type: 'numeric', group: 'Fundamental' },
  { key: 'shares_insiders',         label: 'Insider %',           type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'earnings_date',           label: 'Earnings Date',       type: 'text',    group: 'Fundamental' },
  { key: 'revenue_growth_est',      label: 'Rev Growth Est.',     type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'rev_growth_next_quarter', label: 'Rev Growth NQ',       type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'rev_growth_next_year',    label: 'Rev Growth NY',       type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'eps_growth_est',          label: 'EPS Growth Est.',     type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'eps_growth_tq',           label: 'EPS Growth TQ',       type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'eps_growth_nq',           label: 'EPS Growth NQ',       type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'eps_growth_ty',           label: 'EPS Growth TY',       type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'eps_growth_ny',           label: 'EPS Growth NY',       type: 'numeric', group: 'Fundamental', unit: '%' },
  { key: 'cash_runway_months',       label: 'Runway Months',         type: 'numeric', group: 'Quality'      },
  { key: 'cash_runway_status',       label: 'Runway Status',         type: 'text',    group: 'Quality'      },
  { key: 'current_ratio',            label: 'Current Ratio',         type: 'numeric', group: 'Quality'      },
  { key: 'interest_coverage',        label: 'Interest Coverage',     type: 'numeric', group: 'Quality'      },
  { key: 'altman_z_score',           label: 'Altman Z-Score',        type: 'numeric', group: 'Quality'      },
  { key: 'altman_z_risk',            label: 'Altman Z-Risk',         type: 'text',    group: 'Quality'      },
  { key: 'piotroski_score',          label: 'Piotroski Score',       type: 'numeric', group: 'Quality'      },
  { key: 'roic',                     label: 'ROIC',                  type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'fcf_yield',                label: 'FCF Yield',             type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'fcf_conversion',           label: 'FCF Conversion',        type: 'numeric', group: 'Quality'      },
  { key: 'operating_margin',         label: 'Operating Margin',      type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'diluted_shares_growth_yoy',label: 'Diluted Shares Growth', type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'sbc_revenue',              label: 'SBC / Revenue',         type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'revenue_acceleration',     label: 'Revenue Acceleration',  type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'gross_margin_change_yoy',  label: 'Gross Margin Δ YoY',    type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'incremental_operating_margin', label: 'Incr. Op. Margin',  type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'forward_revenue_growth',   label: 'Fwd Revenue Growth',    type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'revenue_estimate_revision_90d', label: 'Rev Est Revision 90D', type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'eps_estimate_revision_90d',label: 'EPS Est Revision 90D',  type: 'numeric', group: 'Quality', unit: '%' },
  { key: 'forward_pe',               label: 'Forward P/E',           type: 'numeric', group: 'Quality'      },
  { key: 'forward_ps',               label: 'Forward P/S',           type: 'numeric', group: 'Quality'      },
  { key: 'forward_ev_sales',         label: 'Fwd EV/Sales',          type: 'numeric', group: 'Quality'      },
  { key: 'forward_ev_ebitda',        label: 'Fwd EV/EBITDA',         type: 'numeric', group: 'Quality'      },
  { key: 'p_fcf',                    label: 'P/FCF',                  type: 'numeric', group: 'Quality'      },
];

const NUMERIC_OPS: { op: FilterOperator; label: string }[] = [
  { op: 'gt',      label: 'greater than (>)'  },
  { op: 'gte',     label: 'at least (≥)'       },
  { op: 'lt',      label: 'less than (<)'      },
  { op: 'lte',     label: 'at most (≤)'        },
  { op: 'eq',      label: 'equals (=)'         },
  { op: 'between', label: 'between'            },
  { op: 'exists',  label: 'has a value'        },
  { op: 'missing', label: 'is missing / empty' },
];

const TEXT_OPS: { op: FilterOperator; label: string }[] = [
  { op: 'contains',     label: 'contains'           },
  { op: 'not_contains', label: 'does not contain'   },
  { op: 'eq',           label: 'equals exactly'     },
  { op: 'exists',       label: 'has a value'        },
  { op: 'missing',      label: 'is empty / missing' },
];

function parseFilterInputValue(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^\+/, '');
  if (!s || s === '—') return null;
  const mB = s.match(/^\$?([\d,.]+)\s*[Bb]$/); if (mB) return parseFloat(mB[1].replace(/,/g,'')) * 1e9;
  const mM = s.match(/^\$?([\d,.]+)\s*[Mm]$/); if (mM) return parseFloat(mM[1].replace(/,/g,'')) * 1e6;
  const mK = s.match(/^\$?([\d,.]+)\s*[Kk]$/); if (mK) return parseFloat(mK[1].replace(/,/g,'')) * 1e3;
  const cleaned = s.replace(/[%xX]$/, '').replace(/^\$/, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function getFilterFieldRawValue(row: any, fieldKey: string): number | string | null {
  switch (fieldKey) {
    case 'ticker':          { const v = String(row.ticker || row.symbol || '').trim(); return v || null; }
    case 'company':         { const v = String(row.company || row.name || '').trim(); return v || null; }
    case 'canonical_theme': return getWatchlistTheme(row) || null;
    case 'price':           { const n = Number(row.price); return Number.isFinite(n) ? n : null; }
    case 'chg':             { const n = Number(row.change_pct ?? row.change_pct_1d); return Number.isFinite(n) ? n : null; }
    case 'volume':          { const n = Number(row.volume); return Number.isFinite(n) ? n : null; }
    case 'volx':            return getVolXVal(row);
    case 'vol_mc':          { const n = Number(row.vol_mc_pct ?? row.vol_mc_ratio); return (Number.isFinite(n) && n > 0) ? n : null; }
    case 'stage':           return getStageLabel(row) || null;
    case 'options_score':   return getOptionsScore(row);
    case 'options_signal':  { const v = String(row.options_signal ?? '').trim(); return v || null; }
    case 'put_call':        { const n = Number(row.options_put_call_ratio); return Number.isFinite(n) ? n : null; }
    case 'iv':              { const n = Number(row.options_iv); return Number.isFinite(n) ? n : null; }
    case 'exp_move':        { const n = Number(row.options_expected_move); return Number.isFinite(n) ? n : null; }
    case 'opt_volume':      { const n = Number(row.options_volume); return Number.isFinite(n) ? n : null; }
    case 'open_interest':   { const n = Number(row.options_open_interest); return Number.isFinite(n) ? n : null; }
    default: {
      const col = findAnyColDef(fieldKey);
      const v = fundGetField(row, fieldKey, col?.aliases ?? []);
      if (v === undefined || v === null) return null;
      if (col?.fmt === 'str' || col?.fmt === 'symbol' || col?.fmt === 'date' || col?.fmt === 'status' || col?.fmt === 'risk') return String(v);
      const s = String(v).replace(/%$/, '').trim();
      if (s.toLowerCase() === 'not_meaningful' || s.toLowerCase() === 'history_building') return null;
      const n = typeof v === 'number' ? v : parseFloat(s);
      return Number.isFinite(n) ? n : null;
    }
  }
}

function applyOneFilter(rawValue: number | string | null, filter: ScreenerFilter, fieldType: FilterFieldType): boolean {
  const { operator: op, value, value2 } = filter;
  if (op === 'exists')  return rawValue !== null && rawValue !== '' && rawValue !== undefined;
  if (op === 'missing') return rawValue === null || rawValue === '' || rawValue === undefined;
  if (fieldType === 'text') {
    const sv = String(rawValue ?? '').toLowerCase();
    const v  = (value ?? '').toLowerCase().trim();
    if (!v) return true;
    if (op === 'contains')     return sv.includes(v);
    if (op === 'not_contains') return !sv.includes(v);
    if (op === 'eq')           return sv === v;
    return true;
  }
  if (rawValue === null || rawValue === undefined) return false;
  const rn = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
  if (!Number.isFinite(rn)) return false;
  const vn = parseFilterInputValue(value ?? '');
  if (vn === null) return true;
  if (op === 'gt')      return rn > vn;
  if (op === 'gte')     return rn >= vn;
  if (op === 'lt')      return rn < vn;
  if (op === 'lte')     return rn <= vn;
  if (op === 'eq')      return Math.abs(rn - vn) <= Math.max(Math.abs(vn) * 0.0001, 0.0001);
  if (op === 'between') {
    const vn2 = parseFilterInputValue(value2 ?? '');
    if (vn2 === null) return true;
    return rn >= Math.min(vn, vn2) && rn <= Math.max(vn, vn2);
  }
  return true;
}

function applyScreenerFilters(row: any, filters: ScreenerFilter[]): boolean {
  return filters.every(f => {
    const def = SCREENER_FILTER_FIELDS.find(d => d.key === f.fieldKey);
    if (!def) return true;
    return applyOneFilter(getFilterFieldRawValue(row, f.fieldKey), f, def.type);
  });
}

function formatFilterChipLabel(f: ScreenerFilter): string {
  const def = SCREENER_FILTER_FIELDS.find(d => d.key === f.fieldKey);
  const label = def?.label ?? f.fieldKey;
  const op = f.operator;
  const sym: Partial<Record<FilterOperator, string>> = { gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=' };
  if (op === 'exists')       return `${label}: has value`;
  if (op === 'missing')      return `${label}: missing`;
  if (op === 'between')      return `${label}: ${f.value}–${f.value2}`;
  if (op === 'contains')     return `${label} ~ "${f.value}"`;
  if (op === 'not_contains') return `${label} !~ "${f.value}"`;
  if (op === 'eq' && def?.type === 'text') return `${label} = "${f.value}"`;
  return `${label} ${sym[op] ?? op} ${f.value}`;
}

const SCREENER_FILTERS_LS_KEY = 'watchlist_screener_filters_v1';
function loadStoredFilters(): ScreenerFilter[] {
  try { const r = localStorage.getItem(SCREENER_FILTERS_LS_KEY); if (r) return JSON.parse(r) as ScreenerFilter[]; } catch {}
  return [];
}
function saveFiltersToStorage(f: ScreenerFilter[]): void {
  try { localStorage.setItem(SCREENER_FILTERS_LS_KEY, JSON.stringify(f)); } catch {}
}

/* ── Strategy display label map: backend ID → user-visible label & report alias ──
   Backend supports aliases: bottlenecks→serenity, asymmetry→sjcapital.
   scoreWatchlist still uses the backend ID (serenity/sjcapital).
   Strategy reports use the alias (bottlenecks/asymmetry).              */
const STRATEGY_DISPLAY: Record<string, { label: string; reportId: string }> = {
  serenity:  { label: 'Bottlenecks', reportId: 'bottlenecks' },
  sjcapital: { label: 'Asymmetry',   reportId: 'asymmetry'   },
};

function wlApiHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': 'hippo_ak_7f3x9k2m4p8q1w5t' };
  const tok = localStorage.getItem('caelyn_jwt') || sessionStorage.getItem('caelyn_jwt');
  if (tok) h['Authorization'] = `Bearer ${tok}`;
  return h;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * WlRowCtx / WlTickerRow
 * Context object + memo-wrapped row for the watchlist ticker table.
 * Module-level so React.memo comparison is stable across WatchlistPage renders.
 * ─────────────────────────────────────────────────────────────────────────── */
/* ─── Taxonomy editor helpers (module-level, used by WlTaxonomyEditorPanel) ── */

/** Hydrate editor draft state from a Watchlist stock row. */
function wlHydrateTaxonomyDraft(
  stock: any,
  index: ThemeTaxonomyIndex,
): { themeId: string | null; subthemeId: string | null; additionals: string[] } {
  const primaryId =
    (stock?.primary_theme_id as string | null | undefined) ||
    (stock?.canonical_theme_id as string | null | undefined) ||
    null;
  let themeId: string | null = null;
  let subthemeId: string | null = null;
  if (primaryId) {
    const node = index.nodeById.get(primaryId);
    if (node?.classification === 'theme') {
      themeId = primaryId;
    } else if (node?.classification === 'sub_theme') {
      subthemeId = primaryId;
      const parentId = node.parent_theme_id;
      if (parentId && index.nodeById.has(parentId)) themeId = parentId;
    }
  }
  const rawIds: string[] = Array.isArray(stock?.theme_ids) ? (stock.theme_ids as string[]) : [];
  const additionals = rawIds.filter((id: string) => id !== primaryId);
  return { themeId, subthemeId, additionals };
}

/** Derive the most-specific primary label for the theme cell. */
function wlBuildThemeCellLabel(stock: any, index: ThemeTaxonomyIndex): string | null {
  const primaryId =
    (stock?.primary_theme_id as string | null | undefined) ||
    (stock?.canonical_theme_id as string | null | undefined) ||
    null;
  if (primaryId) {
    const n = index.nodeById.get(primaryId);
    if (n) return n.display_name;
  }
  return (stock?.canonical_theme_name as string | null | undefined) || null;
}

/** Count of additional (non-primary) theme memberships. */
function wlBuildThemeCellAdditionalCount(stock: any): number {
  if (Array.isArray(stock?.additional_theme_ids)) return (stock.additional_theme_ids as string[]).length;
  const primaryId =
    (stock?.primary_theme_id as string | null | undefined) ||
    (stock?.canonical_theme_id as string | null | undefined);
  if (!primaryId || !Array.isArray(stock?.theme_ids)) return 0;
  return (stock.theme_ids as string[]).filter((id: string) => id !== primaryId).length;
}

/** Build a multiline tooltip for the theme cell. */
function wlBuildThemeCellTooltip(stock: any, index: ThemeTaxonomyIndex): string {
  const parts: string[] = [];
  const sector = stock?.sector as string | null | undefined;
  if (sector) parts.push(`Sector: ${sector}`);
  const primaryId =
    (stock?.primary_theme_id as string | null | undefined) ||
    (stock?.canonical_theme_id as string | null | undefined) ||
    null;
  if (primaryId) {
    const node = index.nodeById.get(primaryId);
    if (node?.classification === 'theme') {
      parts.push(`Theme: ${node.display_name}`);
      parts.push('Subtheme: —');
    } else if (node?.classification === 'sub_theme') {
      const parent = node.parent_theme_id ? index.nodeById.get(node.parent_theme_id) : null;
      if (parent) parts.push(`Theme: ${parent.display_name}`);
      parts.push(`Subtheme: ${node.display_name}`);
    }
  }
  const addIds: string[] = Array.isArray(stock?.additional_theme_ids)
    ? (stock.additional_theme_ids as string[])
    : [];
  if (addIds.length > 0) {
    const names = addIds.map((id: string) => index.nodeById.get(id)?.display_name || id);
    parts.push(`Additional: ${names.join(', ')}`);
  }
  return parts.join('\n');
}

/* ─── WlTaxonomyEditorPanel — hierarchical taxonomy assignment editor ───── */

interface WlTaxonomyEditorPanelProps {
  ticker: string;
  stockRow: any;
  taxonomyIndex: ThemeTaxonomyIndex;
  token: string;
  activeWatchlistId: string;
  queryClient: any; // QueryClient from @tanstack/react-query
  onClose: () => void;
  onSaveSuccess: (ticker: string) => void;
}

/** Compact hierarchical taxonomy editor rendered as a fixed overlay.
 *  All draft state is local — nothing persists until Save is clicked.
 *  Save fires exactly ONE PUT /api/themes/admin/ticker-taxonomy/{ticker}. */
function WlTaxonomyEditorPanel({
  ticker, stockRow, taxonomyIndex, token, activeWatchlistId, queryClient, onClose, onSaveSuccess,
}: WlTaxonomyEditorPanelProps) {
  const [draftThemeId, setDraftThemeId] = useState<string | null>(null);
  const [draftSubthemeId, setDraftSubthemeId] = useState<string | null>(null);
  const [draftAdditionals, setDraftAdditionals] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  // Hydrate draft from stock row on open (run once)
  useEffect(() => {
    const h = wlHydrateTaxonomyDraft(stockRow, taxonomyIndex);
    setDraftThemeId(h.themeId);
    setDraftSubthemeId(h.subthemeId);
    setDraftAdditionals(h.additionals);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { nodeById, childrenByParentThemeId } = taxonomyIndex;

  // Top-level themes (classification==="theme") sorted A→Z
  // market_lens, deprecated, sector are naturally excluded by classification filter
  const topLevelThemes = useMemo(() => {
    const result: { theme_id: string; display_name: string }[] = [];
    nodeById.forEach(node => {
      if (node.classification === 'theme') result.push({ theme_id: node.theme_id, display_name: node.display_name });
    });
    return result.sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [nodeById]);

  // Subthemes for the selected draft theme (children via parent_theme_id)
  const subthemesForDraftTheme = useMemo(() => {
    if (!draftThemeId) return [];
    const childIds = childrenByParentThemeId.get(draftThemeId) ?? [];
    return childIds
      .map(id => nodeById.get(id))
      .filter((n): n is NonNullable<typeof n> => !!n && n.classification === 'sub_theme')
      .map(n => ({ theme_id: n.theme_id, display_name: n.display_name }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [draftThemeId, nodeById, childrenByParentThemeId]);

  // Effective primary_theme_id sent to backend:
  //   sub_theme selected → draftSubthemeId
  //   theme-only selected → draftThemeId
  const effectivePrimaryId = draftSubthemeId ?? draftThemeId ?? null;

  // Set of already-selected IDs so "Add" picker can exclude them
  const addedSet = useMemo(
    () => new Set([...(effectivePrimaryId ? [effectivePrimaryId] : []), ...draftAdditionals]),
    [effectivePrimaryId, draftAdditionals],
  );

  // "Add additional" picker: grouped by parent theme, filtered by search
  // Only classification==="theme" or "sub_theme"; market_lens/deprecated/sector excluded
  const pickerGroups = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    const groups: { parentId: string; parentName: string; items: { id: string; label: string }[] }[] = [];
    topLevelThemes.forEach(theme => {
      const items: { id: string; label: string }[] = [];
      // The theme node itself
      if (!addedSet.has(theme.theme_id) && (!q || theme.display_name.toLowerCase().includes(q))) {
        items.push({ id: theme.theme_id, label: theme.display_name });
      }
      // Sub_theme children of this theme
      const childIds = childrenByParentThemeId.get(theme.theme_id) ?? [];
      childIds.forEach(cid => {
        const cn = nodeById.get(cid);
        if (!cn || cn.classification !== 'sub_theme') return;
        if (addedSet.has(cn.theme_id)) return;
        if (q && !cn.display_name.toLowerCase().includes(q) && !theme.display_name.toLowerCase().includes(q)) return;
        items.push({ id: cn.theme_id, label: cn.display_name });
      });
      if (items.length > 0) groups.push({ parentId: theme.theme_id, parentName: theme.display_name, items });
    });
    return groups;
  }, [topLevelThemes, nodeById, childrenByParentThemeId, addedSet, addSearch]);

  const sectorLabel = (stockRow?.sector as string | null | undefined) || null;

  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);
    // Defensive: remove effectivePrimaryId from additionals if present
    const cleanAdditionals = draftAdditionals.filter(id => id !== effectivePrimaryId);
    try {
      const r = await fetch(`/api/themes/admin/ticker-taxonomy/${encodeURIComponent(ticker)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          primary_theme_id: effectivePrimaryId ?? null,
          additional_theme_ids: cleanAdditionals,
        }),
      });
      const data: any = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.detail || data?.error || `Save failed (${r.status})`);
      // Optimistically patch the cached watchlist so the theme column reflects the
      // new assignment immediately, without waiting for the background refetch.
      const savedPrimaryId: string | null = data?.primary_theme_id ?? null;
      const savedThemeIds: string[] = data?.theme_ids ?? (savedPrimaryId ? [savedPrimaryId] : []);
      const savedAdditionalIds: string[] = data?.additional_theme_ids ?? [];
      const savedSubthemeIds: string[] = data?.subtheme_ids ?? [];
      queryClient.setQueryData(['/api/watchlist', activeWatchlistId], (old: any) => {
        if (!old || !old.analysis?.sections) return old;
        const upperTicker = ticker.toUpperCase();
        return {
          ...old,
          analysis: {
            ...old.analysis,
            sections: old.analysis.sections.map((sec: any) => ({
              ...sec,
              tickers: Array.isArray(sec.tickers)
                ? sec.tickers.map((t: any) =>
                    (t.ticker || '').toUpperCase() !== upperTicker ? t : {
                      ...t,
                      primary_theme_id: savedPrimaryId,
                      theme_ids: savedThemeIds,
                      additional_theme_ids: savedAdditionalIds,
                      subtheme_ids: savedSubthemeIds,
                      // Clear canonical fallback so wlBuildThemeCellLabel uses primary_theme_id
                      canonical_theme_id: savedPrimaryId ?? t.canonical_theme_id,
                    }
                  )
                : sec.tickers,
            })),
          },
        };
      });
      // Invalidate in background so next refetch is fresh
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist', activeWatchlistId] });
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist', activeWatchlistId, 'performance/theme'] });
      queryClient.invalidateQueries({ queryKey: ['themes-unified', 'themes'] });
      onSaveSuccess(ticker);
      onClose();
    } catch (e: any) {
      setSaveError(e?.message || 'Save failed. Try again.');
    } finally {
      setIsSaving(false);
    }
  }

  // Shared styles
  const _lbl: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: C.dim, fontFamily: font, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 };
  const _sec: React.CSSProperties = { padding: '10px 16px', borderBottom: `1px solid ${C.border}` };
  const _sel: React.CSSProperties = { width: '100%', background: C.card2, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '5px 8px', fontSize: 11, fontFamily: sansFont, outline: 'none', cursor: 'pointer' };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{ width: 380, maxHeight: '85vh', overflowY: 'auto', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: sansFont }}>{ticker} — Edit Classification</span>
          <button onClick={onClose} disabled={isSaving} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', padding: 2, fontSize: 14, lineHeight: 1 }}>✕</button>
        </div>

        {/* Sector — read-only; actual company sector, not thematic rollup */}
        <div style={_sec}>
          <div style={_lbl}>Sector</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: C.text, fontFamily: sansFont }}>{sectorLabel || '—'}</span>
            <span style={{ fontSize: 9, color: C.dim, opacity: 0.55, fontFamily: sansFont }}>Actual company sector · read-only</span>
          </div>
        </div>

        {/* Primary Theme — classification==="theme" only */}
        <div style={_sec}>
          <div style={_lbl}>Primary Theme</div>
          <select
            value={draftThemeId ?? ''}
            onChange={e => { setDraftThemeId(e.target.value || null); setDraftSubthemeId(null); }}
            style={_sel}
          >
            <option value="">— None —</option>
            {topLevelThemes.map(t => (
              <option key={t.theme_id} value={t.theme_id}>{t.display_name}</option>
            ))}
          </select>
        </div>

        {/* Subtheme — shown when theme is selected and has sub_theme children */}
        {draftThemeId && subthemesForDraftTheme.length > 0 && (
          <div style={_sec}>
            <div style={_lbl}>Subtheme</div>
            <select
              value={draftSubthemeId ?? ''}
              onChange={e => setDraftSubthemeId(e.target.value || null)}
              style={_sel}
            >
              <option value="">— General {nodeById.get(draftThemeId)?.display_name ?? ''} —</option>
              {subthemesForDraftTheme.map(s => (
                <option key={s.theme_id} value={s.theme_id}>{s.display_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Additional Themes — optional; grouped in "Add" picker */}
        <div style={_sec}>
          <div style={_lbl}>Additional Themes</div>
          {draftAdditionals.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {draftAdditionals.map(id => {
                const n = nodeById.get(id);
                if (!n) return null;
                return (
                  <span
                    key={id}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 12, fontSize: 10, fontFamily: sansFont, fontWeight: 600, background: `${C.border}20`, border: `1px solid ${C.border}`, color: C.text, whiteSpace: 'nowrap' as const }}
                  >
                    {n.display_name}
                    <span
                      onClick={() => setDraftAdditionals(prev => prev.filter(a => a !== id))}
                      title={`Remove ${n.display_name}`}
                      style={{ cursor: 'pointer', opacity: 0.65, fontWeight: 700, fontSize: 11, lineHeight: 1 }}
                    >×</span>
                  </span>
                );
              })}
            </div>
          )}
          {!showAddPicker ? (
            <button
              onClick={() => setShowAddPicker(true)}
              style={{ background: 'none', border: `1px dashed ${C.border}`, color: C.teal, fontSize: 10, fontFamily: sansFont, cursor: 'pointer', padding: '4px 10px', borderRadius: 4 }}
            >
              + Add additional theme
            </button>
          ) : (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', marginTop: 4 }}>
              <input
                autoFocus
                placeholder="Search themes…"
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                style={{ width: '100%', background: C.card2, color: C.text, border: 'none', borderBottom: `1px solid ${C.border}`, padding: '6px 10px', fontSize: 11, fontFamily: sansFont, outline: 'none', boxSizing: 'border-box' as const }}
              />
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {pickerGroups.length === 0 ? (
                  <div style={{ padding: '8px 10px', fontSize: 10, color: C.dim, fontFamily: sansFont }}>No matches</div>
                ) : pickerGroups.map(g => (
                  <div key={g.parentId}>
                    <div style={{ padding: '4px 10px', fontSize: 9, fontWeight: 800, color: C.dim, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.07em', background: `${C.border}18` }}>
                      {g.parentName}
                    </div>
                    {g.items.map(item => (
                      <div
                        key={item.id}
                        onClick={() => { setDraftAdditionals(prev => prev.includes(item.id) ? prev : [...prev, item.id]); setAddSearch(''); setShowAddPicker(false); }}
                        style={{ padding: '5px 10px 5px 18px', fontSize: 11, color: C.text, fontFamily: sansFont, cursor: 'pointer', borderBottom: `1px solid ${C.border}18` }}
                        onMouseEnter={e => (e.currentTarget.style.background = `${C.teal}15`)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ padding: '6px 10px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setShowAddPicker(false); setAddSearch(''); }}
                  style={{ fontSize: 10, color: C.dim, background: 'none', border: 'none', cursor: 'pointer', fontFamily: sansFont }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Save error */}
        {saveError && (
          <div style={{ margin: '0 16px 8px', padding: '8px 10px', background: `${C.red}15`, border: `1px solid ${C.red}40`, borderRadius: 4, fontSize: 10, color: C.red, fontFamily: sansFont }}>
            {saveError}
          </div>
        )}

        {/* Cancel / Save */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', justifyContent: 'flex-end', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{ padding: '6px 16px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: sansFont, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`, color: C.text, cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.5 : 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{ padding: '6px 18px', borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: sansFont, background: isSaving ? `${C.teal}12` : `${C.teal}22`, border: `1px solid ${C.teal}`, color: C.teal, cursor: isSaving ? 'default' : 'pointer' }}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

interface WlRowCtx {
  screenerMode: string;
  optionsLoading: boolean;
  /** True once the options query has resolved at least once (stable: false→true only). */
  optionsAvailable: boolean;
  optSecColsState: Set<string>;
  activeId: string;
  isAdmin: boolean;
  tickerGrid: string;
  tickerTableMinWidth: number;
  onTickerClick: (ticker: string) => void;
  onToggleFavorite: (ticker: string) => void;
  onDeleteStart: (info: { ticker: string; company: string | null; wid: string }) => void;
  onToggleExpand: (sym: string) => void;
  onOpenTaxonomyEditor: (ticker: string) => void;
}

interface WlTickerRowProps {
  stock: any;
  isExpanded: boolean;
  isFavorite: boolean;
  /** Per-ticker hydration entry — undefined when the ticker is not being hydrated. */
  hydrationEntry?: { quote: string; technical: string; fundamentals: string; options: string };
  /** Most-specific primary theme label (display_name) — computed at map call-site. */
  primaryThemeLabel: string | null;
  /** Count of additional (non-primary) theme memberships for the +N chip. */
  additionalThemeCount: number;
  /** Multiline tooltip with Sector/Theme/Subtheme/Additional context. */
  themeTooltip: string;
  /** True while a theme assignment is in flight for this specific ticker. */
  themeAssignPending: boolean;
  /** Theme-assign result feedback for this specific ticker; null when none. */
  rowThemeFeedback: { type: 'ok' | 'err'; msg: string } | null;
  ctx: WlRowCtx;
}

/** Re-renders only when stock object identity or ctx identity changes.
 *  Per-symbol identity preservation in mergedTickers ensures rows with unchanged
 *  price/options data receive the same stock reference across quote polls. */
const WlTickerRow = memo(function WlTickerRow({ stock, isExpanded, isFavorite, hydrationEntry, primaryThemeLabel, additionalThemeCount, themeTooltip, themeAssignPending, rowThemeFeedback, ctx }: WlTickerRowProps) {
  const {
    screenerMode, optionsLoading, optionsAvailable, optSecColsState, activeId,
    isAdmin, tickerGrid, tickerTableMinWidth,
    onTickerClick, onToggleFavorite, onDeleteStart, onToggleExpand, onOpenTaxonomyEditor,
  } = ctx;

  const isPending = stock._pending;
  const chg1d = getDailyChangePct(stock);
  const cCol = changeColor(chg1d ?? undefined);
  const _sa = (stock as any).stage_analysis;
  const _s2 = stock.stage2_breakout;
  const _stageLabel: string | null = _sa?.label ?? _s2?.label ?? null;
  const _stageReason: string | null = _sa?.reason ?? _s2?.reason ?? null;
  let _sClr = C.dim, _sBg = 'transparent', _sBdr = C.border;
  if (_stageLabel) {
    if (/^S2 Breakout/i.test(_stageLabel)) { _sClr = C.teal; _sBg = `${C.teal}18`; _sBdr = `${C.teal}50`; }
    else if (/^S2-S3 Advance/i.test(_stageLabel)) { _sClr = '#22c55e'; _sBg = 'rgba(34,197,94,0.10)'; _sBdr = 'rgba(34,197,94,0.35)'; }
    else if (/^S3 Momentum/i.test(_stageLabel)) { _sClr = '#818cf8'; _sBg = 'rgba(129,140,248,0.10)'; _sBdr = 'rgba(129,140,248,0.35)'; }
    else if (/^S1-2 Watch/i.test(_stageLabel)) { _sClr = C.amber; _sBg = `${C.amber}15`; _sBdr = `${C.amber}45`; }
    else if (/^S1 Base/i.test(_stageLabel)) { _sClr = '#60a5fa'; _sBg = 'rgba(96,165,250,0.10)'; _sBdr = 'rgba(96,165,250,0.30)'; }
    else if (/^S3-S4 Top/i.test(_stageLabel)) { _sClr = '#fb923c'; _sBg = 'rgba(251,146,60,0.10)'; _sBdr = 'rgba(251,146,60,0.30)'; }
    else if (/^S4 Decline/i.test(_stageLabel)) { _sClr = C.red; _sBg = `${C.red}15`; _sBdr = `${C.red}40`; }
  }
  const _sym = (stock.ticker || stock.symbol || '') as string;
  const _isExpanded = isExpanded;

  return (
    <div style={{ display: 'contents' }}>
    <div
      data-wl-row
      onClick={() => !isPending && stock.ticker && onTickerClick(stock.ticker)}
      style={{
        display: 'grid',
        gridTemplateColumns: tickerGrid,
        minWidth: tickerTableMinWidth,
        padding: '7px 14px',
        borderBottom: `1px solid ${C.border}`,
        background: 'var(--wl-row-bg, transparent)',
        cursor: isPending ? 'default' : 'pointer',
        transition: 'background 0.1s',
        alignItems: 'center',
        opacity: isPending ? 0.55 : 1,
        gap: 6,
        position: 'relative' as const,
        zIndex: 0,
        contentVisibility: 'auto' as any,
        containIntrinsicSize: '0 44px' as any,
      }}
      onMouseEnter={e => { if (!isPending) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--wl-row-bg, transparent)'; }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 3, overflow: 'hidden', position: 'sticky' as const, left: 0, zIndex: 1, background: 'var(--wl-sticky-bg, transparent)', alignSelf: 'stretch' as const }}>
        {!isPending && stock.ticker && (
          <button
            onClick={e => { e.stopPropagation(); e.preventDefault(); void onToggleFavorite(stock.ticker!); }}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, lineHeight: 1 }}
            aria-label={isFavorite ? `Remove ${stock.ticker} from Favorites` : `Add ${stock.ticker} to Favorites`}
            title={isFavorite ? `Remove ${stock.ticker} from Favorites` : `Add ${stock.ticker} to Favorites`}
          >
            <Star
              size={10}
              fill={isFavorite ? C.amber : 'none'}
              color={isFavorite ? C.amber : C.dim}
            />
          </button>
        )}
        {!isPending && stock.ticker && activeId && (
          <button
            onClick={e => { e.stopPropagation(); e.preventDefault(); onDeleteStart({ ticker: stock.ticker!, company: stock.company || stock.name || null, wid: activeId }); }}
            title={`Remove ${stock.ticker} from Watchlist`}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, lineHeight: 1, color: '#333', transition: 'color 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}
          >
            <Trash2 size={9} />
          </button>
        )}
        <span style={{ fontSize: 11, fontWeight: 800, color: isPending ? C.dim : '#fff', fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
          {stock.ticker || DASH}
        </span>
        {!isPending && _sym && (
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand(_sym); }}
            title={_isExpanded ? 'Collapse Caelyn Breakdown' : 'Expand Caelyn Breakdown'}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, color: _isExpanded ? C.teal : C.dim, opacity: _isExpanded ? 1 : 0.5, transition: 'all 0.12s' }}
          >
            {_isExpanded ? <ChevronUp size={9} /> : <ChevronDown size={9} style={{ transform: 'rotate(0deg)' }} />}
          </button>
        )}
      </span>
      <span style={{ fontSize: 10, color: C.dim, overflow: 'hidden', whiteSpace: 'nowrap' as const, display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }} title={stock.company || stock.name || ''}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flexShrink: 1, minWidth: 0 }}>{typeof (stock.company || stock.name) === 'string' ? (stock.company || stock.name || DASH) : (stock.company || stock.name) ? String(stock.company || stock.name) : DASH}</span>
        {hydrationEntry && (() => {
          const hs = hydrationEntry;
          const isTerminal = (s: string) => s === 'done' || s === 'error' || s === 'no_options';
          const isActive = (s: string) => !isTerminal(s) && s !== 'queued' && s !== 'unknown';
          const catLabel = (key: string, val: string) => {
            if (val === 'done') return `${key} ✓`;
            if (val === 'no_options') return `${key}: none`;
            if (val === 'queued') return `${key}: queued`;
            if (val === 'error') return `${key}: err`;
            if (val === 'running') return `${key}: running`;
            if (val === 'pending') return `${key}: pending`;
            return null;
          };
          const allDone = isTerminal(hs.quote) && isTerminal(hs.technical) && isTerminal(hs.fundamentals) && isTerminal(hs.options);
          const anyActive = isActive(hs.quote) || isActive(hs.technical) || isActive(hs.fundamentals) || isActive(hs.options);
          const parts = [
            catLabel('Q', hs.quote),
            catLabel('T', hs.technical),
            catLabel('F', hs.fundamentals),
            catLabel('O', hs.options),
          ].filter(Boolean).join('  ');
          return (
            <span style={{ fontSize: 8, color: allDone ? C.green : anyActive ? C.amber : 'rgba(255,255,255,0.35)', background: allDone ? `${C.green}18` : anyActive ? `${C.amber}18` : 'rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap' as const, fontFamily: font, flexShrink: 0 }}>
              {parts || 'Hydrating…'}
            </span>
          );
        })()}
      </span>
      {isAdmin && stock.ticker ? (
        <span style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <button
            onClick={e => { e.stopPropagation(); onOpenTaxonomyEditor(stock.ticker); }}
            onPointerDown={e => e.stopPropagation()}
            disabled={themeAssignPending}
            title={themeTooltip || (primaryThemeLabel ? `Edit taxonomy: ${primaryThemeLabel}` : `Assign taxonomy to ${stock.ticker}`)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: themeAssignPending ? 'default' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 3, overflow: 'hidden',
              fontSize: 10, fontFamily: font,
              color: themeAssignPending ? C.dim : (primaryThemeLabel ? 'rgba(255,255,255,0.50)' : C.teal),
              opacity: themeAssignPending ? 0.6 : 1,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {themeAssignPending ? 'Updating…' : (primaryThemeLabel || '+ Assign')}
            </span>
            {additionalThemeCount > 0 && !themeAssignPending && (
              <span style={{ fontSize: 9, fontFamily: sansFont, color: C.teal, background: `${C.teal}20`, borderRadius: 10, padding: '0 4px', flexShrink: 0 }}>
                +{additionalThemeCount}
              </span>
            )}
            {!themeAssignPending && <ChevronDown size={10} style={{ flexShrink: 0, opacity: 0.6 }} />}
          </button>
          {rowThemeFeedback && (
            <span style={{ fontSize: 8.5, color: rowThemeFeedback.type === 'ok' ? C.green : C.red, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {rowThemeFeedback.msg}
            </span>
          )}
        </span>
      ) : (
        <span
          style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}
          title={themeTooltip || primaryThemeLabel || ''}
        >
          {primaryThemeLabel || 'Unassigned / Needs Theme'}
        </span>
      )}
      {/* ── Mode-specific cells ──────────────────────────────── */}
      {screenerMode === 'market' && (() => {
        const _sp: React.CSSProperties = { fontSize: 10, fontFamily: font, whiteSpace: 'nowrap' as const };
        const _bv = (stock as any).beta != null ? Number((stock as any).beta) : null;
        const _bStr = _bv != null && Number.isFinite(_bv) ? _bv.toFixed(2) : DASH;
        const _bClr = _bv == null ? C.dim : Math.abs(_bv) > 1.5 ? '#fb923c' : _bv > 1 ? C.amber : _bv < 0 ? '#a78bfa' : C.text;
        const _c7 = get7dChangePct(stock);
        const _c7Clr = _c7 == null ? C.dim : _c7 > 0 ? C.green : _c7 < 0 ? C.red : C.dim;
        const _c30 = get30dChangePct(stock);
        const _c30Clr = _c30 == null ? C.dim : _c30 > 0 ? C.green : _c30 < 0 ? C.red : C.dim;
        return (
          <>
            <span style={{ ..._sp, fontWeight: 700, color: C.text, display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
              {formatPrice(stock.price)}
              {!isPending && stock.price_source && (
                <PriceFreshnessBadge compact meta={{ source: stock.price_source, is_realtime: stock.price_is_realtime, is_live_backup: stock.price_is_live_backup, is_stale: stock.price_is_stale, staleness_seconds: stock.staleness_seconds, quote_timestamp: stock.quote_timestamp, updated_at: stock.price_updated_at }} />
              )}
            </span>
            <span style={{ ..._sp, fontWeight: 700, color: cCol }}>{formatChgPct(chg1d)}</span>
            <span style={{ ..._sp, fontWeight: 700, color: _c7Clr }}>{formatChgPct(_c7)}</span>
            <span style={{ ..._sp, fontWeight: 700, color: _c30Clr }}>{formatChgPct(_c30)}</span>
            <span style={{ ..._sp, color: C.text }}>{formatVolume(stock.volume)}</span>
            <span style={{ ..._sp, color: C.text }}>{formatRelVol(stock.volume, stock.average_volume, stock.relative_volume)}</span>
            <span style={_sp}>
              {stock.rel_vol_trend === 'up' && stock.rel_vol_rank_delta != null ? (
                <span style={{ color: '#22c55e', fontWeight: 600 }} title={`Moved up ${Math.abs(stock.rel_vol_rank_delta)} spots in relative-volume rank since the previous snapshot`}>+{Math.abs(stock.rel_vol_rank_delta)} ranks</span>
              ) : stock.rel_vol_trend === 'down' && stock.rel_vol_rank_delta != null ? (
                <span style={{ color: '#ef4444', fontWeight: 600 }} title={`Moved down ${Math.abs(stock.rel_vol_rank_delta)} spots in relative-volume rank since the previous snapshot`}>-{Math.abs(stock.rel_vol_rank_delta)} ranks</span>
              ) : stock.rel_vol_trend === 'flat' ? (
                <span style={{ color: C.dim }} title="No meaningful change in relative-volume rank">Flat</span>
              ) : stock.rel_vol_trend === 'unknown' ? (
                <span style={{ color: C.dim }} title="No prior relative-volume snapshot yet">New</span>
              ) : <span style={{ color: C.dim }}>—</span>}
            </span>
            <span style={{ ..._sp, color: volMcLabelColor(stock.vol_mc_label, C) }} title={stock.vol_mc_unavailable_reason ?? (stock.vol_mc_label ? `Vol/MC: ${stock.vol_mc_label}` : undefined)}>{formatVolMcPct(stock.vol_mc_pct)}</span>
            <span style={{ ..._sp, color: _bClr }}>{_bStr}</span>
          </>
        );
      })()}
      {screenerMode === 'technical' && (() => {
        const _sp: React.CSSProperties = { fontSize: 10, fontFamily: font, whiteSpace: 'nowrap' as const };
        const _tl = (s: string | null | undefined) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : DASH;
        const _signedPct = (v: number | null | undefined) => v != null && Number.isFinite(Number(v)) ? `${Number(v) > 0 ? '+' : ''}${Number(v).toFixed(1)}%` : DASH;
        const _tm = _s2?.technical_metrics;
        const _ts = _s2?.technical_state;
        const _tsVal: string | null | undefined = _ts ?? _tm?.technical_state;
        const _tsClr = _tsVal === 'overheated' ? '#fb923c' : _tsVal === 'extended' ? C.amber : _tsVal === 'normal' ? '#22c55e' : _tsVal === 'weak' ? C.red : C.dim;
        const _ezClr = _tm?.entry_zone === 'optimal' ? '#22c55e' : _tm?.entry_zone === 'breakout_watch' ? C.amber : _tm?.entry_zone === 'extended' ? '#fb923c' : C.dim;
        const _bsClr = _tm?.breakout_signal === 'triggered' ? '#22c55e' : _tm?.breakout_signal === 'near_trigger' ? C.amber : _tm?.breakout_signal === 'failed' ? C.red : C.dim;
        const _moClr = _tm?.momentum_trend === 'positive' ? '#22c55e' : _tm?.momentum_trend === 'negative' ? C.red : C.dim;
        const _extClr = _tm?.extension_risk === 'overheated' ? '#fb923c' : _tm?.extension_risk === 'extended' ? C.amber : _tm?.extension_risk === 'normal' ? '#22c55e' : C.dim;
        const _maClr = _tm?.ma_stack === 'bull' ? '#22c55e' : _tm?.ma_stack === 'bear' ? C.red : _tm?.ma_stack ? C.amber : C.dim;
        const _p50 = _tm?.pct_vs_sma_50; const _p50Clr = _p50 != null ? (Number(_p50) > 0 ? '#22c55e' : C.red) : C.dim;
        const _p200 = _tm?.pct_vs_sma_200; const _p200Clr = _p200 != null ? (Number(_p200) > 0 ? '#22c55e' : C.red) : C.dim;
        const _pos52 = _tm?.range_position_52w;
        const _pos52Str = _pos52 != null && Number.isFinite(Number(_pos52)) ? `${Number(_pos52).toFixed(0)}%` : DASH;
        const _pffh = _tm?.pct_from_52w_high;
        const _pffhStr = _pffh == null ? DASH : Number(_pffh) >= 0 ? 'At High' : `${Number(_pffh).toFixed(1)}%`;
        const _pffhClr = _pffh == null ? C.dim : Number(_pffh) >= 0 ? '#22c55e' : Number(_pffh) > -5 ? C.amber : C.dim;
        const _adClr = _tm?.accumulation_distribution_signal === 'bullish' ? '#22c55e' : _tm?.accumulation_distribution_signal === 'bearish' ? C.red : C.dim;
        const _sqClr = _tm?.squeeze_signal === 'expansion' ? '#22c55e' : _tm?.squeeze_signal === 'compression' ? C.red : _tm?.squeeze_signal === 'squeeze' ? C.amber : C.dim;
        const _atrV = _tm?.atr_14_pct;
        const _atrStr = _atrV != null && Number.isFinite(Number(_atrV)) ? `${Number(_atrV).toFixed(1)}%` : DASH;
        return (
          <>
            {_stageLabel ? (
              <span title={_stageReason ?? undefined} style={{ display: 'inline-block', fontSize: 7, fontWeight: 800, fontFamily: font, padding: '2px 5px', borderRadius: 3, color: _sClr, background: _sBg, border: `1px solid ${_sBdr}`, textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const, lineHeight: 1.4, cursor: _stageReason ? 'help' : 'default' }}>{_stageLabel}</span>
            ) : <span style={{ ..._sp, color: C.dim }}>—</span>}
            <span style={{ ..._sp, color: _tsClr }}>{_tl(_tsVal)}</span>
            <span style={{ ..._sp, color: _ezClr, paddingLeft: 16 }}>{_tl(_tm?.entry_zone)}</span>
            <span style={{ ..._sp, color: _bsClr }}>{_tl(_tm?.breakout_signal)}</span>
            <span style={{ ..._sp, color: _moClr }}>{_tl(_tm?.momentum_trend)}</span>
            <span style={{ ..._sp, color: _extClr }}>{_tm?.extension_risk === 'pullback_buy_zone' ? 'Pullback Buy' : _tl(_tm?.extension_risk)}</span>
            <span style={{ ..._sp, color: _maClr }}>{_tl(_tm?.ma_stack)}</span>
            <span style={{ ..._sp, color: _p50Clr }}>{_signedPct(_p50)}</span>
            <span style={{ ..._sp, color: _p200Clr }}>{_signedPct(_p200)}</span>
            <span style={{ ..._sp, color: _pos52 != null ? C.text : C.dim }}>{_pos52Str}</span>
            <span style={{ ..._sp, color: _pffhClr }}>{_pffhStr}</span>
            <span style={{ ..._sp, color: _adClr }}>{_tl(_tm?.accumulation_distribution_signal)}</span>
            <span style={{ ..._sp, color: _sqClr }}>{_tl(_tm?.squeeze_signal)}</span>
            <span style={{ ..._sp, color: _atrV != null ? C.text : C.dim }}>{_atrStr}</span>
          </>
        );
      })()}
      {screenerMode === 'options' && (() => {
        // Options-mode-only calculations — only execute when Options tab is active.
        // In Market/Technical/Fundamentals modes these ~40 Number() conversions are skipped.
        const _oHasMetrics = (
          stock.options_score != null || stock.options_signal != null ||
          stock.options_iv != null || stock.options_expected_move != null ||
          stock.options_volume != null || stock.options_open_interest != null ||
          stock.options_volume_put_call_ratio != null || stock.options_premium_put_call_ratio != null ||
          stock.options_net_premium != null || stock.options_call_premium != null ||
          stock.options_put_premium != null
        );
        const _oUn = stock.options_data_available === false && !_oHasMetrics;
        const _oSt = !_oUn && (stock.options_stale === true || ((): boolean => {
          const st = (stock.options_snapshot_status ?? '') as string;
          return st === 'prior_session' || st === 'lkg_market_closed' || st === 'stale_but_usable' || st === 'stale_long_term';
        })());
        const _oHas = !optionsLoading || optionsAvailable;
        const _oLd = optionsLoading && !optionsAvailable ? '…' : DASH;
        const _oDim = _oSt ? 0.6 : 1;
        const _scVal = _oUn ? null : (stock.options_score != null ? Number(stock.options_score) : null);
        const _scStr = _scVal != null && Number.isFinite(_scVal) ? (_scVal >= 10 ? Math.round(_scVal).toString() : _scVal.toFixed(1)) : (_oHas ? DASH : _oLd);
        const _scClr = _scVal != null && _scVal >= 70 ? C.green : _scVal != null && _scVal >= 50 ? C.amber : C.dim;
        const _oSig = _oUn ? '' : (stock.options_signal ?? '');
        const _oSigL = _oSig.toLowerCase();
        const _oSigClr = _oSigL.includes('unusual') ? C.amber : _oSigL.includes('gamma') ? '#a78bfa' : _oSigL.includes('asym') ? C.green : _oSigL.includes('vol') ? C.amber : _oSig ? C.teal : C.dim;
        const _oSigStr = _oHas ? (_oUn ? DASH : (_oSig || DASH)) : _oLd;
        const _oSigT = _oUn ? (stock.options_unavailable_reason ?? 'Options data unavailable') : _oSt ? 'Stale / prior-session data' : undefined;
        const _oCP = stock.options_premium_put_call_ratio != null ? Number(stock.options_premium_put_call_ratio) : null;
        const _oCPStr = _oCP != null && Number.isFinite(_oCP) ? _oCP.toFixed(2) : (_oHas ? DASH : _oLd);
        const _oCPClr = _oCP != null ? (_oCP < 0.7 ? C.green : _oCP > 1.3 ? C.red : C.dim) : C.dim;
        const _oIV = stock.options_iv != null ? Number(stock.options_iv) : null;
        const _oIVStr = _oIV != null && Number.isFinite(_oIV) ? `${(_oIV > 5 ? _oIV : _oIV * 100).toFixed(0)}%` : (_oHas ? DASH : _oLd);
        const _oEM = stock.options_expected_move != null ? Number(stock.options_expected_move) : null;
        const _oEMStr = _oEM != null && Number.isFinite(_oEM) ? `${_oEM.toFixed(1)}%` : (_oHas ? DASH : _oLd);
        const _oVol = stock.options_volume != null ? Number(stock.options_volume) : null;
        const _oOI  = stock.options_open_interest != null ? Number(stock.options_open_interest) : null;
        const _oVPC = stock.options_volume_put_call_ratio != null ? Number(stock.options_volume_put_call_ratio) : null;
        const _oVPCStr = _oVPC != null && Number.isFinite(_oVPC) ? _oVPC.toFixed(2) : (_oHas ? DASH : _oLd);
        const _oVPCClr = _oVPC != null ? (_oVPC < 0.7 ? C.green : _oVPC > 1.3 ? C.red : C.dim) : C.dim;
        const _oNP    = stock.options_net_premium != null ? Number(stock.options_net_premium) : null;
        const _oNPClr = _oNP != null ? (_oNP > 0 ? C.green : _oNP < 0 ? C.red : C.dim) : C.dim;
        const _oNP1d  = stock.options_net_premium_delta_1d  != null ? Number(stock.options_net_premium_delta_1d)  : null;
        const _oNP7d  = stock.options_net_premium_delta_7d  != null ? Number(stock.options_net_premium_delta_7d)  : null;
        const _oNP30d = stock.options_net_premium_delta_30d != null ? Number(stock.options_net_premium_delta_30d) : null;
        const _oCallP = stock.options_call_premium  != null ? Number(stock.options_call_premium)  : null;
        const _oPutP  = stock.options_put_premium   != null ? Number(stock.options_put_premium)   : null;
        const _oAskP  = stock.options_ask_premium   != null ? Number(stock.options_ask_premium)   : null;
        const _oBidP  = stock.options_bid_premium   != null ? Number(stock.options_bid_premium)   : null;
        const _oMidP  = stock.options_mid_premium   != null ? Number(stock.options_mid_premium)   : null;
        const _oCallV = stock.options_call_volume   != null ? Number(stock.options_call_volume)   : null;
        const _oPutV  = stock.options_put_volume    != null ? Number(stock.options_put_volume)    : null;
        const _oCallO = stock.options_call_oi       != null ? Number(stock.options_call_oi)       : null;
        const _oPutO  = stock.options_put_oi        != null ? Number(stock.options_put_oi)        : null;
        return (
          <>
            {/* Opt Score */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:_scClr, opacity:_oDim }} title={_oSt ? 'Stale options data' : undefined}>{_scStr}</span>
            {/* Opt Signal */}
            <span style={{ fontSize:9, fontFamily:font, color:_oSigClr, textTransform:'uppercase' as const, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const, opacity:_oDim }} title={_oSigT}>{_oSigStr}</span>
            {/* Vol P/C */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:_oVPCClr, opacity:_oDim }} title="Put contracts ÷ call contracts">{_oVPCStr}</span>
            {/* Prem P/C */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:_oCPClr, opacity:_oDim }} title="Put premium ÷ call premium">{_oCPStr}</span>
            {/* Net Prem */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:_oNPClr, opacity:_oDim }}>{_oNP != null && Number.isFinite(_oNP) ? fmtOptCurr(_oNP) : (_oHas ? DASH : _oLd)}</span>
            {/* Net 1D */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:_oNP1d != null ? (_oNP1d > 0 ? C.green : _oNP1d < 0 ? C.red : C.dim) : C.dim, opacity:_oDim }}>{_oNP1d != null && Number.isFinite(_oNP1d) ? fmtOptDelta(_oNP1d) : (_oHas ? DASH : _oLd)}</span>
            {/* Net 7D */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:_oNP7d != null ? (_oNP7d > 0 ? C.green : _oNP7d < 0 ? C.red : C.dim) : C.dim, opacity:_oDim }}>{_oNP7d != null && Number.isFinite(_oNP7d) ? fmtOptDelta(_oNP7d) : (_oHas ? DASH : _oLd)}</span>
            {/* Net 30D */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:_oNP30d != null ? (_oNP30d > 0 ? C.green : _oNP30d < 0 ? C.red : C.dim) : C.dim, opacity:_oDim }}>{_oNP30d != null && Number.isFinite(_oNP30d) ? fmtOptDelta(_oNP30d) : (_oHas ? DASH : _oLd)}</span>
            {/* IV */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oIV != null ? C.amber : C.dim, opacity:_oDim }}>{_oIVStr}</span>
            {/* EM */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oEM != null ? '#a78bfa' : C.dim, opacity:_oDim }}>{_oEMStr}</span>
            {/* Opt Vol */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:C.text, opacity:_oDim }}>{_oVol != null ? formatVolume(_oVol) : (_oHas ? DASH : _oLd)}</span>
            {/* OI */}
            <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color:C.text, opacity:_oDim }}>{_oOI != null ? formatVolume(_oOI) : (_oHas ? DASH : _oLd)}</span>
            {/* Secondary columns */}
            {optSecColsState.has('optionsCallPrem') && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oCallP != null ? C.green : C.dim, opacity:_oDim }}>{_oCallP != null ? fmtOptCurr(_oCallP) : (_oHas ? DASH : _oLd)}</span>}
            {optSecColsState.has('optionsPutPrem')  && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oPutP  != null ? C.red   : C.dim, opacity:_oDim }}>{_oPutP  != null ? fmtOptCurr(_oPutP)  : (_oHas ? DASH : _oLd)}</span>}
            {optSecColsState.has('optionsAskPrem')  && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oAskP  != null ? C.text  : C.dim, opacity:_oDim }}>{_oAskP  != null ? fmtOptCurr(_oAskP)  : (_oHas ? DASH : _oLd)}</span>}
            {optSecColsState.has('optionsBidPrem')  && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oBidP  != null ? C.text  : C.dim, opacity:_oDim }}>{_oBidP  != null ? fmtOptCurr(_oBidP)  : (_oHas ? DASH : _oLd)}</span>}
            {optSecColsState.has('optionsMidPrem')  && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oMidP  != null ? C.text  : C.dim, opacity:_oDim }}>{_oMidP  != null ? fmtOptCurr(_oMidP)  : (_oHas ? DASH : _oLd)}</span>}
            {optSecColsState.has('optionsCallVol')  && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oCallV != null ? C.green : C.dim, opacity:_oDim }}>{_oCallV != null ? formatVolume(_oCallV) : (_oHas ? DASH : _oLd)}</span>}
            {optSecColsState.has('optionsPutVol')   && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oPutV  != null ? C.red   : C.dim, opacity:_oDim }}>{_oPutV  != null ? formatVolume(_oPutV)  : (_oHas ? DASH : _oLd)}</span>}
            {optSecColsState.has('optionsCallOi')   && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oCallO != null ? C.green : C.dim, opacity:_oDim }}>{_oCallO != null ? formatVolume(_oCallO) : (_oHas ? DASH : _oLd)}</span>}
            {optSecColsState.has('optionsPutOi')    && <span style={{ fontSize:10, fontFamily:font, whiteSpace:'nowrap' as const, color: _oPutO  != null ? C.red   : C.dim, opacity:_oDim }}>{_oPutO  != null ? formatVolume(_oPutO)  : (_oHas ? DASH : _oLd)}</span>}
          </>
        );
      })()}
    </div>
    {_isExpanded && _sym && <CaelynRowBreakdown stock={stock} />}
    </div>
  );
});

export default function WatchlistPage() {
  const { C: _C } = useTheme(); C = _C;
  const qc = useQueryClient();
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [initialTickerTabs, setInitialTickerTabs] = useState<{ primaryTab?: string; earningsTab?: string }>({});
  const [modalNavKey, setModalNavKey] = useState(0);

  // Process URL deep-link params on mount (cross-page navigation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const openTicker = params.get('openTicker');
    const primaryTab  = params.get('primaryTab')  ?? undefined;
    const earningsTab = params.get('earningsTab') ?? undefined;
    if (openTicker) {
      setSelectedTicker(openTicker.toUpperCase());
      setInitialTickerTabs({ primaryTab, earningsTab });
      requestAnimationFrame(() => window.history.replaceState({}, '', window.location.pathname));
    }
  }, []);

  // In-page alert navigation (alert bell / toast while already on watchlist)
  useEffect(() => {
    const handler = (ev: Event) => {
      const { ticker, primaryTab, earningsTab } = (ev as CustomEvent).detail ?? {};
      if (!ticker) return;
      setSelectedTicker((ticker as string).toUpperCase());
      setInitialTickerTabs({ primaryTab, earningsTab });
      setModalNavKey(k => k + 1);
    };
    window.addEventListener('caelyn:earnings:open', handler);
    return () => window.removeEventListener('caelyn:earnings:open', handler);
  }, []);
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
  const [addStatusMsg, setAddStatusMsg] = useState('');
  const [selectedSecurity, setSelectedSecurity] = useState<{
    canonical_ticker: string; company_name?: string | null;
    exchange_short_name?: string | null; country?: string | null; exchange?: string | null;
  } | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ ticker: string; company?: string | null; wid: string } | null>(null);
  const [deleteErrMsg, setDeleteErrMsg] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const autoTriggeredRef = useRef<Set<string>>(new Set());
  const lkgSignalMapRef = useRef<Map<string, any>>(new Map());
  const lkgActiveIdRef = useRef<string | null>(null);
  const [strategyPlaybooks, setStrategyPlaybooks] = useState<PlaybookSummary[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('default');
  const [strategyScoreData, setStrategyScoreData] = useState<WatchlistPlaybookResponse | null>(null);
  const [strategyScoreLoading, setStrategyScoreLoading] = useState(false);
  const [strategyReportModal, setStrategyReportModal] = useState<{
    open: boolean; report: any | null; loading: boolean; error: string | null;
  }>({ open: false, report: null, loading: false, error: null });
  const [reportHistoryModal, setReportHistoryModal] = useState<{
    open: boolean; history: any[]; loading: boolean; selectedReport: any | null; selectedLoading: boolean;
  }>({ open: false, history: [], loading: false, selectedReport: null, selectedLoading: false });
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [optSecColsState, setOptSecColsState] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('wl_opt_sec_cols_v1');
      return s ? new Set(JSON.parse(s) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });
  const toggleOptSecCol = (key: string) => {
    setOptSecColsState(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem('wl_opt_sec_cols_v1', JSON.stringify([...next])); } catch {}
      return next;
    });
  };
  const [showOptColsMenu, setShowOptColsMenu] = useState(false);
  const [bottomView, setBottomView] = useState<'golden' | 'gromo' | 'themes' | 'marketcap' | 'fundGrouping' | 'hciz' | 'hctz'>('golden');
  const [mcSort, setMcSort] = useState<{ key: 'mktcap' | 'ticker' | 'price' | 'chg' | 'volx'; dir: 'asc' | 'desc' }>({ key: 'mktcap', dir: 'desc' });
  const [confluenceEverMounted, setConfluenceEverMounted] = useState(false);
  const [screenerMode, setScreenerMode] = useState<'market' | 'technical' | 'options' | 'fundamentals' | 'confluence'>(() => {
    try {
      const v = localStorage.getItem('wl_screener_mode') as string;
      if (v === 'market' || v === 'technical' || v === 'options' || v === 'fundamentals' || v === 'confluence') return v;
      if (v === 'growth' || v === 'earnings') {
        try { localStorage.setItem(WL_FUNDAMENTALS_CATEGORY_KEY, 'growth'); } catch {}
        return 'fundamentals';
      }
      if (v === 'fundamental' || v === 'quality') return 'fundamentals';
      return 'technical';
    } catch { return 'technical'; }
  });
  const [fundamentalsCategory, setFundamentalsCategory] = useState<FundamentalsCategory>(() => {
    try {
      const v = localStorage.getItem(WL_FUNDAMENTALS_CATEGORY_KEY) as string;
      if (v === 'overview' || v === 'financialHealth' || v === 'growth' || v === 'valuation') return v as FundamentalsCategory;
      if (v === 'financials' || v === 'strength' || v === 'quality' || v === 'financial-strength' || v === 'business-quality' || v === 'growth-quality') return 'financialHealth';
      return 'overview';
    } catch { return 'overview'; }
  });
  const [hideForeignTickers, setHideForeignTickers] = useState<boolean>(() => {
    try { return localStorage.getItem('wl_hide_foreign') === '1'; } catch { return false; }
  });
  const toggleHideForeign = () => setHideForeignTickers(v => {
    const next = !v;
    try { localStorage.setItem('wl_hide_foreign', next ? '1' : '0'); } catch {}
    return next;
  });
  const [screenerFullscreen, setScreenerFullscreen] = useState(false);
  /* ── Screener filters ────────────────────────────────────────────── */
  const [screenerFilters, setScreenerFilters] = useState<ScreenerFilter[]>(loadStoredFilters);
  const [selectedTaxonomyIds, setSelectedTaxonomyIds] = useState<Set<string>>(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [draftField, setDraftField] = useState<string>(SCREENER_FILTER_FIELDS[0].key);
  const [draftOp, setDraftOp]   = useState<FilterOperator>('gt');
  const [draftVal, setDraftVal]   = useState('');
  const [draftVal2, setDraftVal2] = useState('');
  /* ── Live News view state ─────────────────────────────────────────── */
  const [newsView, setNewsView] = useState<NewsView>('activity');
  const [activitySort, setActivitySort] = useState<{ key: ActivitySortKey; dir: 'asc' | 'desc' }>({ key: 'articles_48h', dir: 'desc' });

  /* ── Close Watch / favorites ─────────────────────────────────────── */
  const [innerView, setInnerView] = useState<'tickers' | 'close-watch'>('tickers');
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  /* ── Hydration tracking for newly-added tickers ────────────────── */
  const [pendingOptRows, setPendingOptRows] = useState<Map<string, { ticker: string; company?: string; wid: string }>>(new Map());
  /* Per-watchlist last-good rows: keyed by watchlist id, preserves rows during refetch */
  const lastGoodRowsByWid = useRef<Map<string, any[]>>(new Map());
  const [hydrationStatus, setHydrationStatus] = useState<Map<string, { quote: string; technical: string; fundamentals: string; options: string }>>(new Map());
  const hydrationIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const [activeTaxonomyEditTicker, setActiveTaxonomyEditTicker] = useState<string | null>(null);

  const toggleExpandedTicker = useCallback((sym: string) => setExpandedTickers(prev => {
    const next = new Set(prev);
    if (next.has(sym)) next.delete(sym); else next.add(sym);
    return next;
  }), []);

  useEffect(() => { ensureBlinkStyle(); }, []);

  // Debounce add input for security search (300ms); clear when security selected
  useEffect(() => {
    if (selectedSecurity) return; // don't re-query after selection
    const id = setTimeout(() => setDebouncedSearch(addTickerInput.trim()), 300);
    return () => clearTimeout(id);
  }, [addTickerInput, selectedSecurity]);

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
  const { data: wlMetas, isLoading: wlMetasLoading, isError: wlMetasError, refetch: refetchMetas } = useQuery<WatchlistMeta[]>({
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

  /* ── auto-select Primary on load (fallback to first) ─────────────── */
  useEffect(() => {
    if (wlMetas?.length && !activeId) {
      const primary = wlMetas.find(m =>
        (m as any).is_primary === true ||
        (m as any).kind === 'primary' ||
        (m as any).type === 'primary' ||
        m.name.toLowerCase() === 'primary'
      );
      setActiveId((primary ?? wlMetas[0]).id);
    }
  }, [wlMetas, activeId]);

  /* ── active watchlist data ───────────────────────────────────────── */
  const { data: watchlist, isLoading: wlLoading, isFetching: wlFetching } = useQuery<WatchlistResponse>({
    queryKey: ['/api/watchlist', activeId],
    queryFn: async ({ signal }) => {
      if (!activeId) return null;
      const r = await fetch(`/api/watchlist/${activeId}`, { signal });
      if (!r.ok) throw new Error(`watchlist ${activeId}: ${r.status}`);
      return r.json();
    },
    enabled: !!activeId,
    retry: 0,
    staleTime: 60_000,
    // Keep cache alive for 8h so returning to the page never shows a blank —
    // stale data renders immediately while a background refetch runs.
    gcTime: 8 * 60 * 60_000,
    // Poll while agent analysis is running in background on the server
    refetchInterval: refreshStatus === 'running' ? 20_000 : false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
      sort: sortKey ? { key: sortKey, dir: sortDir } : undefined,
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
  const { data: newsData, isFetching: newsFetching, isError: newsIsError } = useQuery<NewsResponse>({
    queryKey: ['/api/watchlist/news', activeId],
    queryFn: async () => {
      if (!activeId) return {};
      const url = `/api/watchlist/${activeId}/news`;
      const text = await fetch(url).then(r => {
        if (!r.ok) {
          console.error('[watchlist-news]', { activeId, url, status: r.status });
          throw new Error(`Watchlist news failed (${r.status})`);
        }
        return r.text();
      });
      try { return JSON.parse(text); }
      catch { throw new Error('Watchlist news: invalid JSON'); }
    },
    staleTime: 18 * 60_000,
    refetchInterval: 20 * 60 * 1000,
    enabled: !!activeId && !!watchlist?.analysis,
    retry: 1,
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
    earnings: any[]; upcoming?: any[]; recent?: any[]; meta?: any;
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
    refetchOnWindowFocus: false,
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

  /* ── Caelyn Confluence alignment rows (true backend confluence row source) ── */
  /* Only fetch when Confluence tab is active or a ticker popup is open —
   * alignment is only consumed by CaelynConfluenceSection and (optionally)
   * StockDetailModal. Saves a cold-backend round-trip on every other tab. */
  // Lazy-first-mount: mark Confluence as ever-mounted on first activation.
  // Before first activation CaelynConfluenceSection is not mounted at all,
  // eliminating its initial render cost. After first use it stays mounted
  // (display:none while hidden) to preserve internal filter state.
  useEffect(() => {
    if (screenerMode === 'confluence') setConfluenceEverMounted(true);
  }, [screenerMode]);

  const { data: alignmentResp } = useQuery({
    queryKey: ['watchlist-alignment', activeId],
    queryFn: async () => {
      const r = await fetch(`/api/watchlist/${activeId}/alignment`);
      if (!r.ok) throw new Error(`watchlist alignment: ${r.status}`);
      return r.json();
    },
    enabled: !!activeId && (screenerMode === 'confluence' || !!selectedTicker),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: themePerfResp, isLoading: themePerfLoading, isError: themePerfIsError } = useQuery({
    queryKey: ['/api/watchlist', activeId, 'performance/theme'],
    queryFn: async () => {
      const r = await fetch(`/api/watchlist/${activeId}/performance/theme`);
      if (!r.ok) throw new Error(`watchlist performance/theme: ${r.status}`);
      return r.json();
    },
    enabled: !!activeId && bottomView === 'themes',
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  /* ── Canonical Taxonomy — shared query reusing global prefetch cache ──
   *   key ["themes-unified", "themes"] matches GlobalDataContext.tsx:90
   *   timeframe=1D&classification=all provides the canonical taxonomy for
   *   filter options, admin assignment, and matching logic. */
  const { isAdmin, token } = useAuth();
  const getThemeJwt = useCallback(
    () => token ?? localStorage.getItem('caelyn_jwt') ?? sessionStorage.getItem('caelyn_jwt') ?? '',
    [token]
  );
  const { data: themeUniverseResp } = useQuery({
    queryKey: ['themes-unified', 'themes'],
    queryFn: () => fetch(`/api/themes/relative-strength?timeframe=1D&classification=all`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const taxonomyIndex: ThemeTaxonomyIndex = useMemo(() => {
    const nodes = (themeUniverseResp as any)?.themes ?? [];
    return buildThemeTaxonomyIndex(nodes);
  }, [themeUniverseResp]);
  const wlIdentityCsv = useMemo(() => {
    const tickers: string[] = (watchlist?.tickers as string[] | undefined) ?? [];
    if (!tickers.length) return '';
    const sections = (watchlist as any)?.analysis?.sections ?? [];
    const hasBeta = new Set<string>();
    for (const sec of sections) {
      for (const t of (sec.tickers ?? [])) {
        const sym = ((t.ticker || t.symbol || '') as string).toUpperCase();
        const b = t.beta;
        if (sym && b != null && b !== '' && Number.isFinite(Number(b))) hasBeta.add(sym);
      }
    }
    // Include only symbols that genuinely need identity resolution:
    //   - Exchange-qualified symbols (OTC:, LSE:, etc.) → need exchange & company name
    //   - Symbols without beta from analysis → need beta
    return tickers.filter(s => s.includes(':') || !hasBeta.has(s.toUpperCase())).sort().join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(watchlist?.tickers ?? []).join(','), watchlist]);
  const { data: wlIdentityData } = useQuery<Record<string, { name: string; logo: string | null; exchange: string | null; beta: number | null }>>({
    queryKey: ['company-identity', wlIdentityCsv],
    queryFn: () => fetch(`/api/fmp/company-identity?symbols=${encodeURIComponent(wlIdentityCsv)}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    enabled: wlIdentityCsv.length > 0,
    staleTime: 24 * 60 * 60_000,
    retry: 1,
    // Retry unresolved identities on the server's negative TTL cadence (~5 min)
    // while keeping resolved identities cached client-side for 24h.
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: false,
  });
  const betaByTicker = useMemo<Record<string, number>>(() => {
    if (!wlIdentityData || typeof wlIdentityData !== 'object' || Array.isArray(wlIdentityData)) return {};
    const out: Record<string, number> = {};
    for (const [sym, d] of Object.entries(wlIdentityData)) {
      if (!d || typeof d !== 'object') continue;
      const bRaw = (d as any).beta;
      const bNum = Number(bRaw);
      if (bRaw != null && Number.isFinite(bNum)) out[sym.toUpperCase()] = bNum;
    }
    return out;
  }, [wlIdentityData]);
  const exchangeByTicker = useMemo<Record<string, string | null>>(() => {
    if (!wlIdentityData || typeof wlIdentityData !== 'object' || Array.isArray(wlIdentityData)) return {};
    const out: Record<string, string | null> = {};
    for (const [sym, d] of Object.entries(wlIdentityData)) {
      if (!d || typeof d !== 'object') continue;
      const ex = (d as any).exchange;
      out[sym.toUpperCase()] = typeof ex === 'string' && ex.length > 0 ? ex : null;
    }
    return out;
  }, [wlIdentityData]);
  const companyNameByTicker = useMemo<Record<string, string | null>>(() => {
    if (!wlIdentityData || typeof wlIdentityData !== 'object' || Array.isArray(wlIdentityData)) return {};
    const out: Record<string, string | null> = {};
    for (const [sym, d] of Object.entries(wlIdentityData)) {
      if (!d || typeof d !== 'object') continue;
      const nm = (d as any).name;
      if (typeof nm === 'string' && nm.length > 0) {
        const nmUpper = nm.toUpperCase();
        const symUpper = sym.toUpperCase();
        // Exclude fallback names: canonical ticker itself (OTC:MALJF) or bare ticker (MALJF)
        if (nmUpper === symUpper) continue;
        const colonIdx = sym.indexOf(':');
        if (colonIdx > 0 && nmUpper === sym.slice(colonIdx + 1).toUpperCase()) continue;
        out[symUpper] = nm;
      }
    }
    return out;
  }, [wlIdentityData]);

  const [themeAssignPendingTicker, setThemeAssignPendingTicker] = useState<string | null>(null);
  const [themeAssignFeedback, setThemeAssignFeedback] = useState<{ ticker: string; type: 'ok' | 'err'; msg: string } | null>(null);

  // Taxonomy save success handler: sets brief feedback, clears pending
  const handleTaxonomySaveSuccess = useCallback((ticker: string) => {
    setThemeAssignFeedback({ ticker, type: 'ok', msg: 'Taxonomy saved' });
    setTimeout(() => setThemeAssignFeedback(f => (f?.ticker === ticker ? null : f)), 4000);
  }, []);

  const optionsSignalsByTicker = (optionsResp?.signals ?? {}) as Record<string, any>;
  const optionsMeta = optionsResp?.options_meta as Record<string, any> | undefined;


  useEffect(() => {
    if (favoritesData?.favorites) {
      setFavoritesSet(new Set(favoritesData.favorites.map((t: string) => t.toUpperCase())));
    }
  }, [favoritesData]);

  // Security search — fires only when actively searching (no selected security)
  const searchEnabled = !selectedSecurity && debouncedSearch.length >= 1;
  const { data: secSearchData, isFetching: secSearchLoading, isError: secSearchError } = useQuery<{
    query: string;
    results: Array<{
      canonical_ticker: string; provider_symbol: string; provider_exchange: string;
      company_name: string | null; exchange: string | null; exchange_short_name: string | null;
      country: string | null; currency: string | null; security_type: string | null;
      is_actively_trading: boolean; display_symbol: string;
    }>;
    count: number;
  }>({
    queryKey: ['watchlist-security-search', debouncedSearch],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/watchlist/security-search?q=${encodeURIComponent(debouncedSearch)}&limit=25`, { signal });
      if (!r.ok) throw new Error(`search-${r.status}`);
      const json = await r.json();
      if (json?.error) throw new Error(`search-provider: ${json.error}`);
      if (!Array.isArray(json?.results)) throw new Error('search-malformed: no results array');
      return json;
    },
    enabled: searchEnabled,
    staleTime: 30_000,
    retry: (failureCount, error: any) => {
      // No retry for aborted (superseded) queries or ordinary 4xx responses
      if (error?.name === 'AbortError') return false;
      const msg = String(error?.message ?? '');
      if (/^search-4\d\d/.test(msg)) return false;
      return failureCount < 1;
    },
    retryDelay: 800,
  });

  const toggleFavorite = useCallback(async (ticker: string) => {
    const t = ticker.toUpperCase();
    const wasFav = favoritesSet.has(t);
    // Optimistic update
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
      // Keep React Query cache in sync so any future refetch returns correct data
      qc.setQueryData<{ favorites: string[]; count: number }>(['watchlist-favorites'], old => {
        if (!old) return old;
        const updated = wasFav
          ? old.favorites.filter(f => f.toUpperCase() !== t)
          : [...old.favorites.filter(f => f.toUpperCase() !== t), t];
        return { favorites: updated, count: updated.length };
      });
    } catch {
      // Revert optimistic update on failure
      setFavoritesSet(prev => {
        const next = new Set(prev);
        if (wasFav) next.add(t); else next.delete(t);
        return next;
      });
    }
  }, [favoritesSet, qc]);

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

  /* ── generate strategy report — Part B (safe, non-destructive) ───── */
  const generateStrategyReport = async () => {
    if (!activeId || selectedStrategy === 'default') return;
    const reportId = STRATEGY_DISPLAY[selectedStrategy]?.reportId ?? selectedStrategy;
    setStrategyReportModal({ open: true, report: null, loading: true, error: null });
    try {
      const r = await fetch('/api/watchlist/strategy-report/generate', {
        method: 'POST',
        headers: wlApiHeaders(),
        body: JSON.stringify({ watchlist_id: activeId, strategy_id: reportId, save: true }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error || body.detail || `Report generation failed (${r.status})`);
      }
      const data = await r.json();
      setStrategyReportModal({ open: true, report: data, loading: false, error: null });
    } catch (e: any) {
      setStrategyReportModal({ open: true, report: null, loading: false, error: e.message || 'Report generation failed' });
    }
  };

  /* ── report history — Part D ─────────────────────────────────────── */
  const openReportHistory = async () => {
    if (!activeId) return;
    setReportHistoryModal({ open: true, history: [], loading: true, selectedReport: null, selectedLoading: false });
    try {
      const r = await fetch(`/api/watchlist/strategy-report/history?watchlist_id=${activeId}`, { headers: wlApiHeaders() });
      if (!r.ok) throw new Error(`History fetch failed (${r.status})`);
      const data = await r.json();
      const history = Array.isArray(data) ? data : (data?.reports ?? data?.history ?? []);
      setReportHistoryModal({ open: true, history, loading: false, selectedReport: null, selectedLoading: false });
    } catch {
      setReportHistoryModal({ open: true, history: [], loading: false, selectedReport: null, selectedLoading: false });
    }
  };

  const openSavedReport = async (reportId: string) => {
    setReportHistoryModal(prev => ({ ...prev, selectedLoading: true }));
    try {
      const r = await fetch(`/api/watchlist/strategy-report/${reportId}`, { headers: wlApiHeaders() });
      if (!r.ok) throw new Error(`Failed to load report (${r.status})`);
      const data = await r.json();
      setReportHistoryModal(prev => ({ ...prev, selectedLoading: false }));
      setStrategyReportModal({ open: true, report: data, loading: false, error: null });
    } catch {
      setReportHistoryModal(prev => ({ ...prev, selectedLoading: false }));
    }
  };

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
  /* ── startHydrationPoll — polls hydration status every 5 s, up to 5 min ── */
  const startHydrationPoll = useCallback((wid: string, ticker: string) => {
    const sym = ticker.toUpperCase();
    const startedAt = Date.now();
    const MAX_MS = 5 * 60_000;
    const existing = hydrationIntervals.current.get(sym);
    if (existing) clearInterval(existing);
    // isTerminal: done | error | no_options  (non-terminal: pending | running | queued | unknown)
    const isTerminal = (s: string) => s === 'done' || s === 'error' || s === 'no_options';
    const id = setInterval(async () => {
      if (Date.now() - startedAt > MAX_MS) {
        // Max time reached — mark options as "queued" if still non-terminal; stop polling
        clearInterval(id);
        hydrationIntervals.current.delete(sym);
        setHydrationStatus(prev => {
          const cur = prev.get(sym);
          if (!cur) return prev;
          const timedOut = { ...cur, options: isTerminal(cur.options) ? cur.options : 'queued' };
          return new Map(prev).set(sym, timedOut);
        });
        setTimeout(() => setHydrationStatus(prev => { const m = new Map(prev); m.delete(sym); return m; }), 8000);
        return;
      }
      try {
        const resp = await fetch(`/api/watchlist/${wid}/tickers/${encodeURIComponent(sym)}/hydration-status`);
        if (!resp.ok) return;
        const data = await resp.json();
        const hs = data?.hydration_status;
        if (!hs) return;
        const next = {
          quote: String(hs.quote ?? 'unknown'),
          technical: String(hs.technical ?? 'unknown'),
          fundamentals: String(hs.fundamentals ?? 'unknown'),
          options: String(hs.options ?? 'unknown'),
        };
        setHydrationStatus(prev => {
          const p = prev.get(sym);
          if (p && p.quote === next.quote && p.technical === next.technical &&
              p.fundamentals === next.fundamentals && p.options === next.options) return prev;
          // Invalidate watchlist on any status change
          qc.invalidateQueries({ queryKey: ['/api/watchlist', wid] });
          // Invalidate ticker detail when fundamentals or options reach terminal
          const prevFund = p?.fundamentals ?? '';
          const prevOpts = p?.options ?? '';
          if ((!isTerminal(prevFund) && isTerminal(next.fundamentals)) ||
              (!isTerminal(prevOpts) && isTerminal(next.options))) {
            qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.some((k: any) => typeof k === 'string' && k.toLowerCase() === sym.toLowerCase()) });
          }
          return new Map(prev).set(sym, next);
        });
        if (isTerminal(next.quote) && isTerminal(next.technical) && isTerminal(next.fundamentals) && isTerminal(next.options)) {
          clearInterval(id);
          hydrationIntervals.current.delete(sym);
          qc.invalidateQueries({ queryKey: ['/api/watchlist', wid] });
          setTimeout(() => setHydrationStatus(prev => { const m = new Map(prev); m.delete(sym); return m; }), 5000);
        }
      } catch { /* swallow */ }
    }, 5_000);
    hydrationIntervals.current.set(sym, id);
  }, [qc]);

  const addTickersMut = useMutation({
    mutationFn: async (tickers: string[]) => {
      if (!activeId) throw new Error('No active watchlist');
      const r = await fetch(`/api/watchlist/${activeId}/tickers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.detail || `Error ${r.status}`);
      return data;
    },
    onMutate: (tickers) => {
      if (!activeId) return;
      const realSet = new Set(((qc.getQueryData<any>(['/api/watchlist', activeId])?.tickers) ?? []).map((t: string) => t.toUpperCase()));
      setPendingOptRows(prev => {
        const next = new Map(prev);
        for (const t of tickers) { const sym = t.toUpperCase(); if (!realSet.has(sym)) next.set(sym, { ticker: sym, wid: activeId }); }
        return next;
      });
    },
    onSuccess: (data, variables) => {
      setAddTickerInput('');
      const results: any[] = Array.isArray(data.results) ? data.results : [];
      const addedSyms = results.length > 0
        ? results.filter((r: any) => !r.duplicate).map((r: any) => String(r.ticker || r.symbol || '').toUpperCase()).filter(Boolean)
        : variables.map(t => t.toUpperCase());
      const isDup = addedSyms.length === 0;
      setAddTickerStatus(isDup ? 'duplicate' : 'success');
      setAddStatusMsg(isDup ? 'Already in Watchlist' : `Added ${addedSyms.length} ticker${addedSyms.length !== 1 ? 's' : ''} — priority hydration started`);
      setTimeout(() => { setAddTickerStatus(null); setAddStatusMsg(''); }, 3000);
      qc.invalidateQueries({ queryKey: ['/api/watchlist', activeId] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
      if (innerView === 'close-watch' && addedSyms.length > 0) {
        for (const t of variables) toggleFavorite(t);
      }
      qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('watchlist') });
      if (process.env.NODE_ENV !== 'production') console.log('[earnings-dynamic-sync]', { mutationType: 'watchlist-add-tickers', invalidatedKeys: ['earnings+watchlist'] });
      if (activeId && addedSyms.length > 0) {
        for (const sym of addedSyms) startHydrationPoll(activeId, sym);
      }
    },
    onError: (_, tickers) => {
      setAddTickerStatus('error');
      setTimeout(() => { setAddTickerStatus(null); setAddStatusMsg(''); }, 3000);
      setPendingOptRows(prev => { const next = new Map(prev); for (const t of tickers) next.delete(t.toUpperCase()); return next; });
    },
  });

  function handleAddTickers() {
    const raw = addTickerInput.trim();
    if (!raw || !activeId) return;
    const tickers = raw.split(/[\s,;]+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    if (!tickers.length) return;
    addTickersMut.mutate(tickers);
  }

  // Canonical single-security add mutation
  const addSecurityMut = useMutation({
    mutationFn: async ({ wid, security }: {
      wid: string;
      security: { canonical_ticker: string; company_name?: string | null; exchange_short_name?: string | null; country?: string | null };
    }) => {
      const r = await fetch(`/api/watchlist/${wid}/ticker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonical_ticker: security.canonical_ticker,
          company_name: security.company_name ?? null,
          exchange_short_name: security.exchange_short_name ?? null,
          country: security.country ?? null,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.detail || `Error ${r.status}`);
      return data;
    },
    onMutate: ({ wid, security }) => {
      const sym = security.canonical_ticker.toUpperCase();
      setPendingOptRows(prev => new Map(prev).set(sym, { ticker: sym, company: security.company_name ?? undefined, wid }));
    },
    onSuccess: (data, { wid, security }) => {
      const isDup = data.duplicate === true;
      const sym = security.canonical_ticker.toUpperCase();
      if (isDup) {
        const existing = data.existing_ticker || security.canonical_ticker;
        const msg = data.conflict_type === 'exchange_family_alias'
          ? `Already tracked as ${existing}`
          : 'Already in Watchlist';
        setAddTickerStatus('duplicate');
        setAddStatusMsg(msg);
        setTimeout(() => { setAddTickerStatus(null); setAddStatusMsg(''); }, 3000);
        setPendingOptRows(prev => { const m = new Map(prev); m.delete(sym); return m; });
      } else {
        setAddTickerStatus('success');
        setAddStatusMsg(`Added ${security.canonical_ticker} — hydrating…`);
        setTimeout(() => { setAddTickerStatus(null); setAddStatusMsg(''); }, 3000);
        setAddTickerInput('');
        setSelectedSecurity(null);
        setSuggestionsOpen(false);
        setDebouncedSearch('');
        startHydrationPoll(wid, security.canonical_ticker);
      }
      qc.invalidateQueries({ queryKey: ['/api/watchlist', wid] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/news', wid] });
      qc.invalidateQueries({ queryKey: ['watchlist-options-signals', wid] });
      qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('watchlist') });
    },
    onError: (_, { security }) => {
      const sym = security.canonical_ticker.toUpperCase();
      setPendingOptRows(prev => { const m = new Map(prev); m.delete(sym); return m; });
      setAddTickerStatus('error');
      setAddStatusMsg('Add failed. Try again.');
      setTimeout(() => { setAddTickerStatus(null); setAddStatusMsg(''); }, 3000);
    },
  });

  // Optimistic cache sanitizer — removes a canonical ticker from cached Watchlist shape
  function sanitizeWatchlistCache(data: any, ticker: string): any {
    const canon = ticker.toUpperCase();
    const matchesTicker = (t: string) => (t || '').toUpperCase() === canon;
    return {
      ...data,
      tickers: Array.isArray(data.tickers)
        ? data.tickers.filter((t: string) => !matchesTicker(t))
        : data.tickers,
      csv_data: Array.isArray(data.csv_data)
        ? data.csv_data.filter((r: any) => !matchesTicker(r?.ticker || r?.symbol || ''))
        : data.csv_data,
      analysis: data.analysis ? {
        ...data.analysis,
        sections: Array.isArray(data.analysis.sections)
          ? data.analysis.sections.map((s: any) => ({
              ...s,
              tickers: Array.isArray(s.tickers)
                ? s.tickers.filter((t: any) =>
                    typeof t === 'string'
                      ? !matchesTicker(t)
                      : !matchesTicker(t?.ticker || t?.symbol || ''))
                : s.tickers,
            }))
          : data.analysis.sections,
      } : data.analysis,
    };
  }

  // Canonical single-security delete mutation with optimistic update
  const deleteTickerMut = useMutation({
    mutationFn: async ({ wid, ticker }: { wid: string; ticker: string }) => {
      const r = await fetch(`/api/watchlist/${wid}/ticker/${encodeURIComponent(ticker)}`, {
        method: 'DELETE',
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.detail || `Error ${r.status}`);
      return data;
    },
    onMutate: async ({ wid, ticker }) => {
      await qc.cancelQueries({ queryKey: ['/api/watchlist', wid] });
      const prev = qc.getQueryData(['/api/watchlist', wid]);
      qc.setQueryData(['/api/watchlist', wid], (old: any) => old ? sanitizeWatchlistCache(old, ticker) : old);
      return { prev, wid };
    },
    onSuccess: (_, { wid }) => {
      setDeleteConfirm(null);
      setDeleteErrMsg(null);
      qc.invalidateQueries({ queryKey: ['/api/watchlist', wid] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/list'] });
      qc.invalidateQueries({ queryKey: ['/api/watchlist/news', wid] });
      qc.invalidateQueries({ queryKey: ['watchlist-options-signals', wid] });
      qc.invalidateQueries({ predicate: q => Array.isArray(q.queryKey) && q.queryKey.includes('earnings') && q.queryKey.includes('watchlist') });
    },
    onError: (_err, vars, context: any) => {
      if (context?.prev !== undefined) {
        qc.setQueryData(['/api/watchlist', context.wid], context.prev);
      }
      setDeleteErrMsg(`Could not remove ${vars.ticker}. No changes were saved.`);
    },
  });

  // Current watchlist member set for "IN WATCHLIST" badge in autocomplete
  const currentTickerSet = useMemo(() => {
    if (!watchlist?.tickers) return new Set<string>();
    return new Set((watchlist.tickers as string[]).map((t: string) => t.toUpperCase()));
  }, [watchlist]);

  const handleTickerClick = useCallback((ticker: string) => {
    setSelectedTicker(ticker);
  }, []);

  // Grid layout values computed at component level so rowCtx stays stable
  // across realtime-quote polls (changes only when screenerMode / optSecCols change).
  const _wlVisibleSecColsLen = useMemo(() => {
    if (screenerMode !== 'options') return 0;
    return ['optionsCallPrem','optionsPutPrem','optionsAskPrem','optionsBidPrem',
            'optionsMidPrem','optionsCallVol','optionsPutVol','optionsCallOi','optionsPutOi']
      .filter(k => optSecColsState.has(k)).length;
  }, [screenerMode, optSecColsState]);

  const _wlTickerGrid = useMemo(() => {
    const OD = '64px minmax(140px,1.6fr) minmax(100px,1fr) 48px minmax(58px,0.8fr) 52px 52px 68px 56px 56px 56px 44px 44px 56px 52px';
    return screenerMode === 'market'
      ? '64px minmax(140px, 1.6fr) minmax(120px, 1fr) 80px 64px 64px 64px 72px 64px 80px 68px 80px'
      : screenerMode === 'options'
        ? `${OD}${_wlVisibleSecColsLen > 0 ? ' ' + Array(_wlVisibleSecColsLen).fill('60px').join(' ') : ''}`
        : '64px minmax(140px, 1.6fr) minmax(120px, 1fr) 80px 80px 104px 116px 80px 100px 64px 68px 72px 72px 84px 112px 64px 52px';
  }, [screenerMode, _wlVisibleSecColsLen]);

  const _wlTickerTableMinWidth = useMemo(() =>
    screenerMode === 'market' ? 960
      : screenerMode === 'options' ? (1040 + _wlVisibleSecColsLen * 60)
      : 1456,
  [screenerMode, _wlVisibleSecColsLen]);

  /* Shared context object for every WlTickerRow — rebuilt only when one of its
   * values changes, NOT on realtime-quote polls. Combined with per-symbol
   * identity preservation in mergedTickers, React.memo skips unchanged rows. */
  // Stable boolean: false until options query resolves, then true for the lifetime
  // of the watchlist session. Put outside useMemo so it's stable across polls.
  const optionsAvailable = !!optionsResp;

  /* Shared context for WlTickerRow — contains ONLY truly shared, stable values.
   * Per-ticker dynamic values (hydration, theme override, theme pending, feedback)
   * are resolved at the map call-site and passed as individual row props,
   * preventing Map-mutation from invalidating ALL rows on every update. */
  const onOpenTaxonomyEditorStable = useCallback(
    (ticker: string) => setActiveTaxonomyEditTicker(ticker),
    [],
  );

  const rowCtx = useMemo<WlRowCtx>(() => ({
    screenerMode,
    optionsLoading,
    optionsAvailable,
    optSecColsState,
    activeId: activeId ?? '',
    isAdmin,
    tickerGrid: _wlTickerGrid,
    tickerTableMinWidth: _wlTickerTableMinWidth,
    onTickerClick: handleTickerClick,
    onToggleFavorite: toggleFavorite,
    onDeleteStart: (info) => setDeleteConfirm(info),
    onToggleExpand: toggleExpandedTicker,
    onOpenTaxonomyEditor: onOpenTaxonomyEditorStable,
  }), [
    screenerMode, optionsLoading, optionsAvailable, optSecColsState, activeId,
    isAdmin, _wlTickerGrid, _wlTickerTableMinWidth,
    handleTickerClick, toggleFavorite, toggleExpandedTicker, onOpenTaxonomyEditorStable,
  ]);

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

  /* ── Clear hydration/pending state when active watchlist changes ─── */
  useEffect(() => {
    setPendingOptRows(new Map());
    setHydrationStatus(new Map());
    for (const id of hydrationIntervals.current.values()) clearInterval(id);
    hydrationIntervals.current.clear();
  }, [activeId]);

  /* ── Remove pending rows that appear in the real refetched list ──── */
  useEffect(() => {
    if (pendingOptRows.size === 0) return;
    const tickers: string[] = (watchlist?.tickers ?? []) as string[];
    const realSet = new Set(tickers.map((t: string) => t.toUpperCase()));
    setPendingOptRows(prev => {
      let changed = false;
      const next = new Map(prev);
      for (const k of [...next.keys()]) { if (realSet.has(k)) { next.delete(k); changed = true; } }
      return changed ? next : prev;
    });
  }, [watchlist]);

  /* ── Cleanup all polling intervals on unmount ────────────────────── */
  useEffect(() => {
    return () => { for (const id of hydrationIntervals.current.values()) clearInterval(id); };
  }, []);
  const hasAnalysis = newFmt
    ? (analysis?.sections?.length > 0)
    : (analysis && (analysis.top_buys?.length || analysis.most_undervalued?.length || analysis.best_catalysts?.length || analysis.hidden_gems?.length || analysis.most_revolutionary?.length || analysis.right_sector?.length));
  // Memoized — analysis/newsData/majorNewsData are from useQuery; references
  // only change when a new fetch completes, so these are stable between polls.
  const allStocks = useMemo(() => extractAllStocks(analysis), [analysis]);
  // Part H/J: ALL NEWS always sources from newsData.articles — no topArticles priority
  const allNews: FlatNewsItem[] = useMemo(() => flattenNews(newsData?.articles ?? {}), [newsData]);
  const newsIsBuilding: boolean = newsData?.is_building ?? false;
  const newsCacheAge: number | null = newsData?.cache_age_s ?? null;
  const majorNews: MajorNewsItem[] = useMemo(() => (majorNewsData?.major_developments ?? []).slice(0, 20), [majorNewsData]);
  const lastUpdated: string | undefined = newFmt ? analysis?.last_updated : watchlist?.saved_at;

  /* ── merged ticker list: all CSV tickers + analysis data where available ── */
  const allTickerSymbols: string[] = useMemo(
    () => (watchlist?.tickers as string[] | undefined) || [],
    [watchlist],
  );
  const analyzedMap = useMemo(
    () => new Map<string, any>(allStocks.map(s => [s.ticker?.toUpperCase(), s])),
    [allStocks],
  );
  const baseMergedTickers = useMemo(() => [
    ...(allTickerSymbols.length > 0
      ? allTickerSymbols.map(sym => {
          const key = sym.toUpperCase();
          const analyzed = analyzedMap.get(key);
          return analyzed ? { ...analyzed, _pending: false } : { ticker: sym, _pending: true };
        })
      : allStocks.map(s => ({ ...s, _pending: false }))),
    ...[...pendingOptRows.values()]
      .filter(r => r.wid === activeId && !allTickerSymbols.some((t: string) => t.toUpperCase() === r.ticker.toUpperCase()))
      .map(r => ({ ticker: r.ticker, company: r.company, _pending: true, _optimistic: true })),
  ], [allTickerSymbols, analyzedMap, allStocks, pendingOptRows, activeId]);

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

  // Per-symbol input identity cache: reuse merged output only when ALL merge inputs
  // are unchanged (base row, stabilized quote, raw options, beta, exchange). This replaces the
  // unsafe 10-field display-field whitelist with source-level tracking — any canonical
  // change (technical, fundamental, taxonomy, 7D, IV, OI, etc.) forces a new output.
  type _RowInputCache = { base: any; quote: any; rawOpt: any; beta: any; exchange: any; fmpName: any; output: any };
  const rowIdentityRef = useRef<Map<string, _RowInputCache>>(new Map());
  // Stabilized realtime quote: reuses previous quote object when all 15 tracked fields
  // are identical so an unchanged poll does not produce a new reference.
  const stableQuoteRef = useRef<Map<string, any>>(new Map());
  const QUOTE_STABILITY_FIELDS = [
    'price', 'last', 'change', 'change_percent', 'volume', 'high', 'low',
    'source', 'is_realtime', 'is_live_backup', 'is_stale',
    'updated_at', 'quote_timestamp', 'staleness_seconds', 'market_session',
  ] as const;

  const mergedTickers = useMemo(() => {
    // Clear caches when switching to a different watchlist
    if (lkgActiveIdRef.current !== activeId) {
      lkgSignalMapRef.current = new Map();
      lkgActiveIdRef.current = activeId;
      rowIdentityRef.current = new Map();
      stableQuoteRef.current = new Map();
    }
    const prev = lkgSignalMapRef.current;

    const result = baseMergedTickers.map((baseRow) => {
      const sym = (baseRow.ticker || '').toString().toUpperCase();

      // ── Quote stabilization ──────────────────────────────────────────────
      // If the incoming quote object is new (fresh deserialization) but ALL 15
      // tracked fields are bit-identical to the last stable quote, reuse the
      // previous object. This prevents an unchanged realtime poll from producing
      // a new reference and defeating the input-identity check below.
      const rawQuote = sym ? realtimeQuotes[sym] : undefined;
      let stableQuote: typeof rawQuote = rawQuote;
      if (rawQuote) {
        const prevStable = stableQuoteRef.current.get(sym);
        if (prevStable) {
          let unchanged = true;
          for (const f of QUOTE_STABILITY_FIELDS) {
            if (!Object.is((prevStable as any)[f], (rawQuote as any)[f])) { unchanged = false; break; }
          }
          if (unchanged) stableQuote = prevStable;
        }
        stableQuoteRef.current.set(sym, stableQuote!);
      }

      const rawOpt = sym ? optionsSignalsByTicker[sym] : undefined;
      const beta = sym ? betaByTicker[sym] : undefined;
      const exchange = sym ? exchangeByTicker[sym] ?? null : null;
      const fmpName = sym ? companyNameByTicker[sym] ?? null : null;

      // ── Input identity check ─────────────────────────────────────────────
      // Reuse the previous merged output ONLY when all 4 merge inputs are the
      // same reference (or same scalar value for beta). This guarantees:
      //   • Any canonical change (technical, fundamental, taxonomy, 7D, IV, OI…)
      //     forces a new output because baseMergedTickers spreads new objects.
      //   • A quote poll where no values changed reuses the previous output.
      //   • An options refetch (every 2 min) only rebuilds when rawOpt changed.
      const prevCache = sym ? rowIdentityRef.current.get(sym) : undefined;
      if (prevCache &&
          prevCache.base === baseRow &&
          prevCache.quote === stableQuote &&
          prevCache.rawOpt === rawOpt &&
          Object.is(prevCache.beta, beta) &&
          Object.is(prevCache.exchange, exchange) &&
          Object.is(prevCache.fmpName, fmpName)) {
        // All inputs unchanged — reuse cached output; keep LKG map current
        if (sym) prev.set(sym, prevCache.output);
        return prevCache.output;
      }

      // ── Build new merged row ─────────────────────────────────────────────
      const quoteMerged = stableQuote ? mergeRealtimeQuote(baseRow, stableQuote) : baseRow;
      const opt = rawOpt ? normalizeOptionsSignal(rawOpt) : undefined;
      const next: any = opt ? { ...quoteMerged, ...opt } : quoteMerged;

      // Inject beta from FMP company-identity when not present in analysis row
      if (beta !== undefined && (next.beta == null || next.beta === '')) {
        next.beta = beta;
      }
      // Inject exchange from FMP company-identity when not present in analysis row
      if (exchange != null && (next.exchange == null || next.exchange === '')) {
        next.exchange = exchange;
      }
      // Inject company name from FMP company-identity when row has no legitimate name
      if (fmpName != null) {
        const bareTicker = sym.includes(':') ? sym.slice(sym.indexOf(':') + 1).toUpperCase() : sym.toUpperCase();
        const isPlaceholder = (v: unknown) => {
          if (v == null || v === '') return true;
          const s = String(v).toUpperCase();
          return s === sym.toUpperCase() || s === bareTicker;
        };
        if (isPlaceholder(next.company)) next.company = fmpName;
        if (isPlaceholder(next.name)) next.name = fmpName;
      }

      // LKG merge: when a refetch returns null/undefined/empty for a signal field,
      // preserve the last-known-valid value from the previous payload.
      // 0 is treated as a valid value and is NOT preserved over.
      const prevRow = sym ? prev.get(sym) : undefined;
      let output: any;
      if (!prevRow) {
        output = next;
      } else {
        const merged: any = { ...next };
        for (const field of SIGNAL_LKG_FIELDS) {
          if (isMissingSignalValue(next[field]) && !isMissingSignalValue(prevRow[field])) {
            merged[field] = prevRow[field];
          }
        }
        output = merged;
      }

      // Store in identity cache and update LKG
      if (sym) {
        rowIdentityRef.current.set(sym, { base: baseRow, quote: stableQuote, rawOpt, beta, exchange, fmpName, output });
        prev.set(sym, output);
      }
      return output;
    });

    // ── LKG validation debug (set to true to diagnose signal data loss) ─────
    const LKG_DEBUG = false;
    if (LKG_DEBUG && prev.size > 0) {
      const countNonNull = (arr: any[], field: string) =>
        arr.filter(r => !isMissingSignalValue(r[field])).length;
      const prevArr = [...prev.values()];
      console.group('[LKG] Signal field coverage');
      console.log('relative_volume — prev:', countNonNull(prevArr, 'relative_volume'), '/ next (raw):', countNonNull(baseMergedTickers as any[], 'relative_volume'), '/ merged:', countNonNull(result, 'relative_volume'));
      console.log('vol_mc_pct      — prev:', countNonNull(prevArr, 'vol_mc_pct'), '/ next (raw):', countNonNull(baseMergedTickers as any[], 'vol_mc_pct'), '/ merged:', countNonNull(result, 'vol_mc_pct'));
      console.log('options_score   — prev:', countNonNull(prevArr, 'options_score'), '/ next (raw):', countNonNull(baseMergedTickers as any[], 'options_score'), '/ merged:', countNonNull(result, 'options_score'));
      console.groupEnd();
    }
    // ── end LKG debug ─────────────────────────────────────────────────────

    return result;
  }, [baseMergedTickers, realtimeQuotes, optionsSignalsByTicker, activeId, betaByTicker, exchangeByTicker, companyNameByTicker]);

  const pendingCount = mergedTickers.filter(t => t._pending).length;
  const analyzedCount = mergedTickers.length - pendingCount;

  /* ── CSV-enriched tickers for sorting: merges uploaded CSV data into each
   * ticker row so that fundamental column sorts (market_cap, pe_ratio, etc.)
   * work correctly when switching between Technical and Fundamental views.   */
  const csvMergedTickers = useMemo(() => {
    const csvRows: any[] = (watchlist as any)?.csv_data ?? [];
    if (!csvRows.length) return mergedTickers;
    const csvMap: Record<string, any> = {};
    for (const row of csvRows) {
      const t = (row.ticker || row.Ticker || row.TICKER || row.symbol || row.Symbol || '').toString().toUpperCase();
      if (t) csvMap[t] = row;
    }
    return mergedTickers.map(s => {
      const tkKey = ((s as any).ticker || '').toString().toUpperCase();
      const csv = csvMap[tkKey];
      if (!csv) return s;
      const merged: any = { ...csv };
      for (const [k, v] of Object.entries(s as any)) {
        if (v !== undefined && v !== null && v !== '') {
          merged[k] = v;
        } else if (!(k in merged)) {
          merged[k] = v;
        }
      }
      return merged;
    });
  }, [mergedTickers, (watchlist as any)?.csv_data]);

  /* ── market-cap lookup for NEWS/MC ──────────────────────────────────── */
  const mcByTicker = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of mergedTickers) {
      const key = String(t.ticker || '').trim().toUpperCase();
      const mc = Number(t.market_cap);
      if (key && isFinite(mc) && mc > 0) map.set(key, mc);
    }
    return map;
  }, [mergedTickers]);

  /* ── LIVE NEWS header counts ─────────────────────────────────────── */
  const activityViewCount  = (newsData?.ticker_activity ?? []).length;
  const allNewsViewCount   = allNews.length;
  const hyperscalerViewCount = (newsData?.hyperscaler_articles ?? []).length;

  /* ── ticker table sorting ────────────────────────────────────────── */
  function getSortValue(stock: any, key: string): { v: any; missing: boolean } {
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
        const v = (stock.canonical_theme_name || stock.section_title || stock.theme || '').toString().toLowerCase();
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
      case 'chg7d': {
        const n = get7dChangePct(stock);
        return { v: n ?? 0, missing: n == null };
      }
      case 'chg30d': {
        const n = get30dChangePct(stock);
        return { v: n ?? 0, missing: n == null };
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
      case 'optionsPutCall': { const n = Number(stock.options_premium_put_call_ratio); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsVolPc': { const n = Number(stock.options_volume_put_call_ratio); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsNetPrem': { const n = Number(stock.options_net_premium); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsNetPrem1d': { const n = Number(stock.options_net_premium_delta_1d); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsNetPrem7d': { const n = Number(stock.options_net_premium_delta_7d); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsNetPrem30d': { const n = Number(stock.options_net_premium_delta_30d); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsCallPrem': { const n = Number(stock.options_call_premium); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsPutPrem': { const n = Number(stock.options_put_premium); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsCallVol': { const n = Number(stock.options_call_volume); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsPutVol': { const n = Number(stock.options_put_volume); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsCallOi': { const n = Number(stock.options_call_oi); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsPutOi': { const n = Number(stock.options_put_oi); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsAskPrem': { const n = Number(stock.options_ask_premium); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsBidPrem': { const n = Number(stock.options_bid_premium); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsIv': { const n = Number(stock.options_iv); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsExpectedMove': { const n = Number(stock.options_expected_move); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsVolume': { const n = Number(stock.options_volume); return { v: n, missing: !Number.isFinite(n) }; }
      case 'optionsOi': { const n = Number(stock.options_open_interest); return { v: n, missing: !Number.isFinite(n) }; }
      case 'stage2': {
        const STAGE_SORT_RANK: Record<string, number> = {
          'S1 Base': 1, 'S1-2 Watch': 2, 'S2 Breakout': 3,
          'S2-S3 Advance': 4, 'S3 Momentum': 5, 'S3-S4 Top': 6, 'S4 Decline': 7,
        };
        const sa = (stock as any).stage_analysis;
        const s2 = stock.stage2_breakout;
        const lbl: string | null = sa?.label ?? s2?.label ?? null;
        const rank = lbl != null ? (STAGE_SORT_RANK[lbl] ?? null) : null;
        return { v: rank ?? 999, missing: rank == null };
      }
      case 'pctVs50d': {
        const n = Number(stock.stage2_breakout?.technical_metrics?.pct_vs_sma_50);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'pctVs200d': {
        const n = Number(stock.stage2_breakout?.technical_metrics?.pct_vs_sma_200);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'pos52w': {
        const n = Number(stock.stage2_breakout?.technical_metrics?.range_position_52w);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'pctFrom52wHigh': {
        const n = Number(stock.stage2_breakout?.technical_metrics?.pct_from_52w_high);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'atrPct': {
        const n = Number(stock.stage2_breakout?.technical_metrics?.atr_14_pct);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'techTimingScore': {
        const n = Number(stock.stage2_breakout?.technical_timing_score);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'maStack': {
        const RANK: Record<string, number> = { bull: 3, mixed: 2, bear: 1 };
        const v = stock.stage2_breakout?.technical_metrics?.ma_stack ?? null;
        const r = v != null ? (RANK[v] ?? 0) : 0;
        return { v: r, missing: r === 0 };
      }
      case 'extRisk': {
        const RANK: Record<string, number> = {
          pullback_buy_zone: 6, healthy: 5, neutral: 4, extended: 3, overheated: 2, broken: 1,
        };
        const v = stock.stage2_breakout?.technical_metrics?.extension_risk ?? null;
        const r = v != null ? (RANK[v] ?? 0) : 0;
        return { v: r, missing: r === 0 };
      }
      case 'entryZone': {
        const RANK: Record<string, number> = {
          fresh_breakout: 8, breakout_watch: 7, '20d_pullback': 6, '50d_pullback': 5,
          neutral: 4, extended: 3, overheated: 2, broken: 1,
        };
        const v = stock.stage2_breakout?.technical_metrics?.entry_zone ?? null;
        const r = v != null ? (RANK[v] ?? 0) : 0;
        return { v: r, missing: r === 0 };
      }
      case 'bkSignal': {
        const RANK: Record<string, number> = {
          confirmed_breakout: 8, fresh_breakout: 7, near_trigger: 6, coiling: 5,
          no_setup: 4, extended_breakout: 3, failed_breakout: 1,
        };
        const v = stock.stage2_breakout?.technical_metrics?.breakout_signal ?? null;
        const r = v != null ? (RANK[v] ?? 0) : 0;
        return { v: r, missing: r === 0 };
      }
      case 'accumDist': {
        const RANK: Record<string, number> = {
          heavy_accumulation: 5, accumulation: 4, dry_up: 3, neutral: 2, distribution: 1,
        };
        const v = stock.stage2_breakout?.technical_metrics?.accumulation_distribution_signal ?? null;
        const r = v != null ? (RANK[v] ?? 0) : 0;
        return { v: r, missing: r === 0 };
      }
      case 'squeezeSig': {
        const RANK: Record<string, number> = {
          coiling: 5, tight: 4, expansion: 3, normal: 2, volatile: 1,
        };
        const v = stock.stage2_breakout?.technical_metrics?.squeeze_signal ?? null;
        const r = v != null ? (RANK[v] ?? 0) : 0;
        return { v: r, missing: r === 0 };
      }
      case 'momentumTrend': {
        const RANK: Record<string, number> = {
          accelerating: 5, positive: 4, cooling: 3, diverging: 2, negative: 1, neutral: 0,
        };
        const v = stock.stage2_breakout?.technical_metrics?.momentum_trend ?? null;
        const r = v != null ? (RANK[v] ?? 0) : 0;
        return { v: r, missing: r === 0 };
      }
      case 'techState': {
        const RANK: Record<string, number> = {
          breakout_trigger: 9, pullback_entry: 8, coiling: 7, trend_advance: 6,
          neutral: 5, extended: 4, overheated: 3, distribution: 2, broken: 1,
        };
        const v = stock.stage2_breakout?.technical_state ?? null;
        const r = v != null ? (RANK[v] ?? 0) : 0;
        return { v: r, missing: r === 0 };
      }
      case 'beta': {
        const n = Number(stock.beta);
        return { v: n, missing: !Number.isFinite(n) };
      }
      case 'cash_runway_status': {
        const s = String(fundGetField(stock, key, ['Cash Runway Status','cashRunwayStatus','runway_status']) ?? '').toLowerCase().replace(/-/g,'_').trim();
        const r = RUNWAY_STATUS_RANK[s] ?? 0;
        return { v: r, missing: r === 0 };
      }
      case 'altman_z_risk': {
        const s = String(fundGetField(stock, key, ['Altman Z-Risk','altmanZRisk','altman_risk','altman_z_classification']) ?? '').toLowerCase().trim();
        const r = ALTMAN_RISK_RANK[s] ?? 0;
        return { v: r, missing: r === 0 };
      }
      default: {
        const col = findAnyColDef(key);
        const v = fundGetField(stock, key, col?.aliases ?? []);
        if (v === undefined || v === null) return { v: null, missing: true };
        if (col?.fmt === 'symbol' || col?.fmt === 'str' || col?.fmt === 'date') {
          return { v: String(v), missing: false };
        }
        const sv = String(v).replace(/%$/, '').trim().toLowerCase();
        if (sv === 'not_meaningful' || sv === 'history_building') return { v: null, missing: true };
        const n = typeof v === 'number' ? v : parseFloat(sv);
        if (!Number.isFinite(n)) return { v: null, missing: true };
        // Only the 8 valuation-multiple columns reject non-positive values (sort after valid rows).
        // Net Debt/EBITDA, Interest Coverage, FCF Yield etc. remain numerically sortable when negative.
        if (VALUATION_MULTIPLE_KEYS.has(key) && n <= 0) return { v: null, missing: true };
        return { v: n, missing: false };
      }
    }
  }

  const sortedTickers = useMemo(() => {
    if (!sortKey) return csvMergedTickers;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...csvMergedTickers]
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
  }, [csvMergedTickers, sortKey, sortDir]);

  /* ── Last-good row retention: store non-empty sorted rows per watchlist ── */
  useEffect(() => {
    if (activeId && sortedTickers.length > 0) {
      lastGoodRowsByWid.current.set(activeId, sortedTickers);
    }
  }, [activeId, sortedTickers]);

  /* ── Seed LKG from React Query cache when activeId changes ─────────────
   * useRef resets on component unmount, so LKG is lost on navigation.
   * React Query cache persists across unmount (up to gcTime=8h).
   * On activeId change, if cache has watchlist data, seed LKG with stub rows
   * so displayRows is never empty during the first refetch after remount.   */
  useEffect(() => {
    if (!activeId) return;
    if ((lastGoodRowsByWid.current.get(activeId) ?? []).length > 0) return;
    const cached = qc.getQueryData<WatchlistResponse | null>(['/api/watchlist', activeId]);
    if (!cached?.tickers?.length) return;
    const stubs = (cached.tickers as string[]).map((sym: string) => ({ ticker: sym, _pending: true }));
    lastGoodRowsByWid.current.set(activeId, stubs);
  }, [activeId, qc]);

  /* ── Display rows: use same-watchlist LKG rows during refetch instead of blank ── */
  const _wlidLkgRows = activeId ? (lastGoodRowsByWid.current.get(activeId) ?? []) : [];
  const isRefreshing = sortedTickers.length === 0 && _wlidLkgRows.length > 0 && (wlLoading || wlFetching);
  const displayRows = isRefreshing ? _wlidLkgRows : sortedTickers;

  /* ── Caelyn Confluence true rows — from backend alignment endpoint ── */
  const confluenceRows = useMemo(() => {
    if (!alignmentResp) return null;
    /* Handle multiple possible response shapes from FastAPI */
    let rows: any[] = [];
    if (Array.isArray(alignmentResp)) {
      rows = alignmentResp;
    } else if (Array.isArray(alignmentResp.rows)) {
      rows = alignmentResp.rows;
    } else if (Array.isArray(alignmentResp.alignment_rows)) {
      rows = alignmentResp.alignment_rows;
    } else if (Array.isArray(alignmentResp.tickers)) {
      rows = alignmentResp.tickers;
    } else if (alignmentResp.data && Array.isArray(alignmentResp.data)) {
      rows = alignmentResp.data;
    }
    if (!rows.length) return null;
    /* Flatten nested alignment row objects into the flat shape that
       caelyn-confluence.tsx helpers expect. Keep nested objects too
       so helpers with optional-chaining paths still work. */
    return rows.map((r: any) => {
      const act  = r.actionability  && typeof r.actionability  === 'object' ? r.actionability  : {};
      const tr   = r.trade_alignment && typeof r.trade_alignment === 'object' ? r.trade_alignment : {};
      const inv  = r.investment_alignment && typeof r.investment_alignment === 'object' ? r.investment_alignment : {};
      const ent  = r.entry           && typeof r.entry           === 'object' ? r.entry           : {};
      const cat  = r.catalyst        && typeof r.catalyst        === 'object' ? r.catalyst        : {};
      const tp   = r.theme_policy    && typeof r.theme_policy    === 'object' ? r.theme_policy    : {};
      const opts = r.options         && typeof r.options         === 'object' ? r.options         : {};
      const val  = r.valuation_alignment && typeof r.valuation_alignment === 'object' ? r.valuation_alignment : (r.valuation && typeof r.valuation === 'object' ? r.valuation : {});

      /* Derive caelyn_confluence_bucket from actionability.state when backend hasn't computed it.
         Full mapping from backend actionability.state values → spec bucket taxonomy. */
      const actState = (act.state ?? (typeof r.actionability === 'string' ? r.actionability : '')).toUpperCase();
      const derivedBucket: string | null = r.caelyn_confluence_bucket ?? (
        actState === 'READY' || actState === 'BUY'                        ? 'ACTIONABLE'          :
        actState === 'WATCH' || actState === 'EARLY_WATCH'                ? 'NEAR_ACTIONABLE'     :
        actState === 'REVERSAL_WATCH'                                     ? 'AT_SUPPORT'          :
        actState === 'WAIT_FOR_RETEST' || actState === 'WAIT_FOR_BREAKOUT'? 'WATCH_FOR_RESET'     :
        actState === 'AVOID' || actState === 'SHORT_AVOID'
          || actState === 'TOO_EXTENDED'                                  ? 'RISK_CONFLICT'       :
        actState === 'NEUTRAL'                                            ? 'NO_CLEAR_CONFLUENCE' :
        null
      );

      return {
        /* Keep nested objects so helpers using optional-chaining still work */
        ...r,
        /* Normalise ticker / company */
        ticker:  r.ticker  ?? r.symbol ?? '',
        company: r.company ?? r.name   ?? '',
        /* Flat actionability */
        actionability_state: actState,
        options_entry_conflict: r.options_entry_conflict ?? act.options_entry_conflict ?? false,
        setup_summary:          r.setup_summary          ?? act.setup_summary          ?? null,
        /* Flat trade */
        trade_alignment_score:  r.trade_alignment_score  ?? tr.score  ?? null,
        trade_archetype:        r.trade_archetype         ?? tr.archetype ?? null,
        /* Flat investment */
        investment_alignment_score:            r.investment_alignment_score            ?? inv.score              ?? null,
        investment_alignment_state:            r.investment_alignment_state            ?? inv.state              ?? null,
        investment_alignment_available:        r.investment_alignment_available        ?? inv.available          ?? false,
        investment_alignment_unavailable_reason: r.investment_alignment_unavailable_reason ?? inv.unavailable_reason ?? null,
        /* Flat entry (entry = entry_risk_reward in helpers) */
        entry_risk_reward_state: r.entry_risk_reward_state ?? ent.state ?? null,
        entry_risk_reward_score: r.entry_risk_reward_score ?? ent.score ?? null,
        entry_grade:             r.entry_grade             ?? ent.grade ?? null,
        /* Flat catalyst */
        catalyst_alignment_score:   r.catalyst_alignment_score   ?? cat.score            ?? null,
        catalyst_primary_event:     r.catalyst_primary_event     ?? cat.primary_event    ?? null,
        catalyst_rss_event:         r.catalyst_rss_event         ?? cat.rss_event        ?? null,
        catalyst_scheduled_event:   r.catalyst_scheduled_event   ?? cat.scheduled_event  ?? null,
        catalyst_bearish_conflict:  r.catalyst_bearish_conflict  ?? cat.bearish_conflict ?? null,
        catalyst_v2_score:          r.catalyst_v2_score          ?? cat.v2_score         ?? null,
        catalyst_v2_primary_event:  r.catalyst_v2_primary_event  ?? cat.v2_primary_event ?? null,
        /* Flat theme policy */
        theme_policy_boost:     r.theme_policy_boost     ?? tp.boost     ?? null,
        theme_policy_event:     r.theme_policy_event     ?? tp.event      ?? null,
        theme_policy_available: r.theme_policy_available ?? tp.available  ?? false,
        theme_policy_theme:     r.theme_policy_theme     ?? tp.theme ?? tp.name ?? null,
        /* Flat options */
        options_alignment_score: r.options_alignment_score ?? opts.alignment_score ?? null,
        /* Flat valuation — extracted from nested r.valuation_alignment or r.valuation object */
        valuation_alignment_points: r.valuation_alignment_points ?? val.points ?? val.alignment_points ?? null,
        valuation_quality_score:    r.valuation_quality_score    ?? val.quality_score ?? null,
        valuation_label:            r.valuation_label            ?? val.label ?? val.quality_label ?? null,
        valuation_coverage_status:  r.valuation_coverage_status  ?? val.coverage_status ?? null,
        valuation_pe_ratio:         r.valuation_pe_ratio         ?? val.pe_ratio ?? null,
        valuation_ps_ratio:         r.valuation_ps_ratio         ?? val.ps_ratio ?? null,
        valuation_forward_pe:       r.valuation_forward_pe       ?? val.forward_pe ?? null,
        /* Confluence — null from backend until computed, derived bucket present */
        caelyn_confluence_score:  r.caelyn_confluence_score  ?? null,
        caelyn_confluence_bucket: derivedBucket,
      };
    });
  }, [alignmentResp]);

  /* ── unified CSV-merged rows for filter evaluation ───────────────── */
  const csvMergedScreenerRows = useMemo(() => {
    const csvMap: Record<string, any> = {};
    for (const row of ((watchlist as any)?.csv_data || [])) {
      const t = String(row.ticker || row.Ticker || row.TICKER || row.symbol || row.Symbol || '').toUpperCase();
      if (t) csvMap[t] = row;
    }
    return mergedTickers.map(s => {
      const tkKey = String((s as any).ticker || '').toUpperCase();
      const csv = csvMap[tkKey] || {};
      const canonicalTheme = getWatchlistTheme(s);
      const merged: Record<string, any> = { ...csv };
      for (const [k, v] of Object.entries(s as Record<string, any>)) {
        if (v !== undefined && v !== null && v !== '') merged[k] = v;
        else if (!(k in merged)) merged[k] = v;
      }
      if (canonicalTheme) merged['canonical_theme_name'] = canonicalTheme;
      return merged;
    });
  }, [mergedTickers, watchlist]);

  /* ── Taxonomy filter is now derived from canonical backend response
   *   via buildThemeTaxonomyIndex — see taxonomyIndex above.
   *   The old screenerThemes / SCREENER_THEME_HIDDEN / label-based
   *   filtering has been removed. */

  /* ── filtered symbol set — null = no active filters ─────────────── */
  const filteredSymbolSet = useMemo<Set<string> | null>(() => {
    if (!screenerFilters.length) return null;
    const passing = new Set<string>();
    for (const row of csvMergedScreenerRows) {
      if (applyScreenerFilters(row, screenerFilters)) {
        const sym = String(row.ticker || row.symbol || '').toUpperCase();
        if (sym) passing.add(sym);
      }
    }
    return passing;
  }, [csvMergedScreenerRows, screenerFilters]);

  function handleSortClick(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const closeWatchTickers = useMemo(() => {
    if (favoritesSet.size === 0) return [];
    // Walk sortedTickers (already sorted by current sortKey/sortDir) and keep only favourites.
    // This preserves column-sort order instead of locking to insertion order.
    const seen = new Set<string>();
    const sorted: any[] = [];
    for (const row of sortedTickers) {
      const sym = row.ticker?.toUpperCase() ?? '';
      if (sym && favoritesSet.has(sym)) {
        sorted.push(row);
        seen.add(sym);
      }
    }
    // Append stubs for any favourites not present in the current watchlist data
    for (const sym of favoritesSet) {
      if (!seen.has(sym)) sorted.push({ ticker: sym, _pending: true });
    }
    return sorted;
  }, [sortedTickers, favoritesSet]);

  /* ── Canonical ticker symbol list for the currently-viewed tab ─────
   * Used by Upcoming Earnings (and eventually Live News, Confluence).
   * Uses displayRows (which includes LKG rows during refetch) so the
   * symbol set is never accidentally empty during a loading transition. */
  const isFavoritesTab = innerView === 'close-watch';
  const selectedTabSymbols: string[] = isFavoritesTab
    ? [...favoritesSet].map(s => s.toUpperCase())
    : displayRows.map(r => (r.ticker || '').toString().toUpperCase()).filter(Boolean);

  /* ── Canonical earnings symbol list — scoped to active tab ──────────
   * Non-Favorites: derive from watchlist.tickers (canonical membership,
   * stable across Screener sorts/filters). Falls back to csvMergedTickers
   * when tickers not yet hydrated.
   * Favorites branch is unchanged — uses favoritesSet directly.
   * Alpha-sorted so the query key is stable regardless of render order. */
  const selectedTabKind = isFavoritesTab ? 'favorites' : 'watchlist';
  const selectedTabId   = isFavoritesTab ? 'favorites' : (activeId ?? '');
  const selectedEarningsSymbols: string[] = useMemo(() => {
    if (isFavoritesTab) {
      return [...favoritesSet].map(s => s.toUpperCase()).filter(Boolean).sort();
    }
    const canonical = watchlist?.tickers;
    if (canonical && canonical.length > 0) {
      return [...new Set(
        canonical.map((s: string) => s.trim().toUpperCase()).filter(Boolean)
      )].sort();
    }
    // Fallback while tickers not yet hydrated — csvMergedTickers has the rows
    return [...new Set(
      csvMergedTickers.map(r => (r.ticker || '').toString().toUpperCase()).filter(Boolean)
    )].sort();
  }, [isFavoritesTab, favoritesSet, watchlist, csvMergedTickers]);

  // Ref to track when warming-poll began — used by refetchInterval to cap at 90 s
  const earningsPollingStartRef = useRef<number>(0);

  /* ── Earnings scoped to currently-visible symbols ───────────────────
   * Query key is stable (alpha-sorted symbols) so Screener sort/filter
   * changes do not fire a second network request.
   * wait_for_sync:false lets FastAPI return immediately with stale data
   * while the backend refreshes in the background.                    */
  const {
    data: earningsBySymbolsResp,
    isLoading: earningsBySymbolsLoading,
    isError: earningsBySymbolsError,
    refetch: refetchEarningsBySymbols,
  } = useQuery<{
    events?: any[];
    earnings?: any[];
    upcoming?: any[];
    recent?: any[];
    symbols_requested?: string[];
    missing_symbols?: string[];
    source?: string;
    stale?: boolean;
    cache_status?: string;
  }>({
    queryKey: ['watchlist-earnings-by-symbols', selectedTabKind, selectedTabId, selectedEarningsSymbols.join(',')],
    queryFn: async () => {
      const r = await fetch('/api/watchlist/earnings/by-symbols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: selectedEarningsSymbols, wait_for_sync: false }),
      });
      const text = await r.text();
      if (!r.ok) {
        const preview = text.slice(0, 200);
        console.error('[earnings/by-symbols] HTTP', r.status, preview);
        throw new Error(`earnings/by-symbols ${r.status}: ${preview}`);
      }
      let data: any;
      try { data = JSON.parse(text); } catch {
        console.error('[earnings/by-symbols] non-JSON:', text.slice(0, 200));
        throw new Error(`earnings/by-symbols: non-JSON (${text.slice(0, 80)})`);
      }
      if (data?.cache_status === 'error') {
        console.error('[earnings/by-symbols] cache_status=error:', JSON.stringify(data).slice(0, 200));
        throw new Error('earnings/by-symbols: backend cache_status=error');
      }
      return data;
    },
    enabled: selectedEarningsSymbols.length > 0,
    staleTime: 5 * 60_000,
    retry: 1,
    // Poll every 4 s while cache is warming; stop when settled or after 90 s cap
    refetchInterval: (query: any) => {
      const status: string = (query.state.data as any)?.cache_status ?? '';
      const isSyncing = status === 'miss_syncing' || status === 'partial_syncing' || status === 'stale_syncing';
      if (!isSyncing) { earningsPollingStartRef.current = 0; return false; }
      if (earningsPollingStartRef.current === 0) earningsPollingStartRef.current = Date.now();
      return Date.now() - earningsPollingStartRef.current < 90_000 ? 4_000 : false;
    },
  });

  /* ── Derived syncing / polling-expired state (component level) ──── */
  const isSyncingStatus = (
    earningsBySymbolsResp?.cache_status === 'miss_syncing' ||
    earningsBySymbolsResp?.cache_status === 'partial_syncing' ||
    earningsBySymbolsResp?.cache_status === 'stale_syncing'
  );
  const [earningsPollingExpired, setEarningsPollingExpired] = useState(false);
  useEffect(() => {
    if (!isSyncingStatus) { setEarningsPollingExpired(false); return; }
    const t = setTimeout(() => setEarningsPollingExpired(true), 90_000);
    return () => clearTimeout(t);
  }, [isSyncingStatus]);

  /* ── Upcoming / Recent earnings toggle ─────────────────────────── */
  const [earningsView, setEarningsView] = useState<'upcoming' | 'recent'>('upcoming');

  /* ── tab bar renderer (shared between empty + main states) ─────── */
  const isPrimaryMeta = (m: WatchlistMeta) =>
    (m as any).is_primary === true ||
    (m as any).kind === 'primary' ||
    (m as any).type === 'primary' ||
    m.name.toLowerCase() === 'primary';

  const orderedWlMetas = (() => {
    const all = wlMetas || [];
    const primary = all.filter(isPrimaryMeta);
    const others  = all.filter(m => !isPrimaryMeta(m));
    return [...primary, ...others];
  })();

  const renderTabBar = () => (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 2,
      padding: '8px 16px 0', background: C.bg,
      borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap',
    }}>
      {orderedWlMetas.slice(0, 1).map((meta) => {
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
              fontFamily: font, fontSize: 11,
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
                  color: C.text, fontFamily: font, fontSize: 11,
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

      {/* Favorites tab — second position */}
      <div
        key="close-watch"
        onClick={() => {
          setShowAddPanel(false);
          if (innerView === 'close-watch') {
            setInnerView('tickers');
          } else {
            const primaryId = orderedWlMetas[0]?.id;
            if (primaryId) setActiveId(primaryId);
            setInnerView('close-watch');
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 10px',
          borderRadius: '4px 4px 0 0',
          background: innerView === 'close-watch' ? C.card : 'transparent',
          border: `1px solid ${innerView === 'close-watch' ? C.border : 'transparent'}`,
          borderBottom: innerView === 'close-watch' ? `1px solid ${C.card}` : '1px solid transparent',
          cursor: 'pointer', marginBottom: -1,
          fontFamily: font, fontSize: 11,
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
        <span>Favorites</span>
        <span style={{ fontSize: 9, color: '#475569', flexShrink: 0 }}>({favoritesSet.size})</span>
      </div>

      {/* Remaining custom watchlists — after Favorites */}
      {orderedWlMetas.slice(1).map((meta) => {
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
              fontFamily: font, fontSize: 11,
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
                  color: C.text, fontFamily: font, fontSize: 11,
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
          color: showAddPanel ? 'rgba(255,255,255,0.70)' : '#475569',
          fontSize: 16, fontWeight: 700,
          transition: 'color 0.15s',
          fontFamily: font,
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
            color: C.text, fontFamily: font, fontSize: 11,
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
              color: C.text, fontFamily: font, fontSize: 11,
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
              fontSize: 10, fontWeight: 700, fontFamily: font,
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

  /* ── canonical taxonomy chip bar (always visible, no dropdown) ────── */
  const taxonomyChipOrder = useMemo(
    () => getTaxonomyChipOrder(taxonomyIndex),
    [taxonomyIndex],
  );

  const renderTaxonomyBar = () => {
    const { nodeById } = taxonomyIndex;
    const { sectorOrder, themeOrder, subthemeOrder } = taxonomyChipOrder;

    const chipStyle = (active: boolean, isParent: boolean): React.CSSProperties => ({
      flexShrink: 0, cursor: 'pointer',
      padding: '3px 10px', borderRadius: 4,
      fontSize: 10, fontWeight: active ? 700 : isParent ? 700 : 600,
      fontFamily: sansFont,
      color: active ? '#fff' : 'rgba(255,255,255,0.60)',
      background: active ? 'rgba(20,184,166,0.18)' : 'rgba(255,255,255,0.06)',
      border: active ? `1px solid ${C.teal}` : `1px solid rgba(255,255,255,0.12)`,
      whiteSpace: 'nowrap',
      transition: 'background 0.12s, border-color 0.12s, color 0.12s',
    });

    const labelStyle: React.CSSProperties = {
      fontSize: 8, fontWeight: 800, color: C.dim,
      fontFamily: font, letterSpacing: '0.08em',
      textTransform: 'uppercase', flexShrink: 0,
      marginRight: 2,
    };

    const toggleId = (id: string) => {
      setSelectedTaxonomyIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    const hasChildren = (id: string) => {
      const desc = taxonomyIndex.descendantIdsByThemeId.get(id);
      return desc != null && desc.size > 0;
    };

    const rowStyle: React.CSSProperties = {
      display: 'flex', alignItems: 'center', gap: 4,
      overflowX: 'auto', overflowY: 'hidden',
      flexWrap: 'nowrap',
    };

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 4,
        padding: '6px 20px',
        background: C.card2,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {/* Row 1: SECTORS + Clear pinned right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={labelStyle}>SECTORS</span>
          <div style={{ ...rowStyle, flex: 1, minWidth: 0 }} className="wl-chip-strip">
            {sectorOrder.map(id => {
              const node = nodeById.get(id);
              if (!node) return null;
              const active = selectedTaxonomyIds.has(id);
              return (
                <span key={id} onClick={() => toggleId(id)}
                  style={chipStyle(active, false)}
                >
                  {node.display_name}
                </span>
              );
            })}
          </div>
          {selectedTaxonomyIds.size > 0 && (
            <span
              onClick={() => setSelectedTaxonomyIds(new Set())}
              style={{
                flexShrink: 0, cursor: 'pointer',
                padding: '3px 8px', borderRadius: 4,
                fontSize: 10, fontWeight: 700,
                fontFamily: sansFont,
                color: C.teal,
                background: 'rgba(20,184,166,0.12)',
                border: `1px solid ${C.teal}`,
                whiteSpace: 'nowrap',
              }}
            >
              Clear
            </span>
          )}
        </div>

        {/* Row 2: THEMES — classification === "theme" only; market_lens/deprecated excluded */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={labelStyle}>THEMES</span>
          <div style={{ ...rowStyle, flex: 1, minWidth: 0 }} className="wl-chip-strip">
          {themeOrder.map(id => {
            const node = nodeById.get(id);
            if (!node) return null;
            const active = selectedTaxonomyIds.has(id);
            const isParent = hasChildren(id);
            return (
              <span key={id} onClick={() => toggleId(id)}
                style={chipStyle(active, isParent)}
              >
                {node.display_name}
              </span>
            );
          })}
          </div>
        </div>

        {/* Row 3: SUBTHEMES — classification === "sub_theme" only; parent name shown as tooltip */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={labelStyle}>SUBTHEMES</span>
          <div style={{ ...rowStyle, flex: 1, minWidth: 0 }} className="wl-chip-strip">
          {subthemeOrder.map(id => {
            const node = nodeById.get(id);
            if (!node) return null;
            const active = selectedTaxonomyIds.has(id);
            const parentNode = node.parent_theme_id ? nodeById.get(node.parent_theme_id) : undefined;
            const titleText = parentNode
              ? `${parentNode.display_name} → ${node.display_name}`
              : node.display_name;
            return (
              <span key={id} onClick={() => toggleId(id)}
                title={titleText}
                style={chipStyle(active, false)}
              >
                {node.display_name}
              </span>
            );
          })}
          </div>
        </div>
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
              fontFamily: sansFont,
            }}>
              {isUpgrading ? 'Auto-upgrading to multi-source analysis...' : 'Multi-source deep analysis available'}
            </div>
            <div style={{
              fontSize: 10, color: C.dim, fontFamily: sansFont, marginTop: 1,
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
              fontFamily: font, cursor: 'pointer',
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
          const chg1d = getDailyChangePct(stock);
          const cCol = changeColor(chg1d ?? undefined);
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
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: font }}>
                {stock.ticker || '\u2014'}
              </span>
              {stock.price != null && (
                <span style={{ fontSize: 9, color: C.dim, fontFamily: font }}>
                  ${stock.price.toFixed(2)}
                </span>
              )}
              {chg1d != null && (
                <span style={{
                  fontSize: 8, fontWeight: 800, fontFamily: font,
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
            <span style={{ fontSize: 9, fontWeight: 700, color: C.amber, fontFamily: font }}>
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
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: font }}>
                {stock.ticker || '\u2014'}
              </span>
              <span style={{
                fontSize: 8, fontWeight: 800, fontFamily: font,
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

  /* ── upcoming / recent earnings section ─────────────────────────────
   * Uses the scoped POST /api/watchlist/earnings/by-symbols query.
   * Two tabs: Upcoming Earnings | Recent Earnings (last 30 days).
   * No additional API requests — both views use earningsBySymbolsResp. */
  const renderEarningsSection = () => {
    // Normalize upcoming event fields — handles both old and new backend shapes
    function normalizeEarningsEvent(ev: any) {
      return {
        ticker: String(ev.ticker ?? ev.symbol ?? '').toUpperCase(),
        company: ev.company ?? ev.company_name ?? ev.name ?? '',
        date: ev.next_date ?? ev.earnings_date_fmt ?? ev.earnings_date ?? ev.date_raw ?? null,
        rawDate: ev.date_raw ?? ev.earnings_date ?? ev.next_date ?? null,
        time: ev.time ?? ev.when ?? null,
        epsEstimate: ev.est_eps ?? ev.eps_estimate ?? null,
        lastEps: ev.last_eps ?? ev.previous_eps ?? null,
        epsGrowthPct: ev.eps_growth_pct ?? ev.eps_growth_estimate ?? ev.eps_growth_yoy ?? null,
        epsTransitionLabel: ev.eps_transition_type ?? ev.eps_growth_transition ?? null,
        revenueEstimate: ev.revenue_estimated ?? ev.revenue_estimate ?? null,
        revenueActual: ev.revenue_actual ?? null,
        lastRevenue: ev.prior_year_revenue ?? ev.last_revenue ?? ev.previous_revenue ?? null,
        revGrowthPct: ev.revenue_growth_pct ?? ev.revenue_growth_estimate ?? ev.revenue_growth_yoy ?? null,
        importance: ev.importance ?? null,
        logo: ev.logo ?? ev.image ?? ev.company_logo ?? ev.companyLogo ?? ev.profile_image ?? ev.icon ?? null,
        marketCap: ev.market_cap ?? null,
      };
    }

    // Growth helpers for upcoming cards
    function calcWlGrowth(
      estimate: number | null, prior: number | null,
      explicitPct: number | null, explicitLabel: string | null
    ): { pct: number | null; label: string | null } {
      if (explicitPct != null && isFinite(explicitPct)) return { pct: explicitPct, label: null };
      if (explicitLabel) return { pct: null, label: explicitLabel };
      if (estimate == null || prior == null || !isFinite(estimate) || !isFinite(prior) || prior === 0) return { pct: null, label: null };
      if (prior > 0 && estimate > 0) return { pct: ((estimate / prior) - 1) * 100, label: null };
      if (prior > 0 && estimate <= 0) return { pct: null, label: 'Loss expected' };
      if (prior < 0 && estimate >= 0) return { pct: null, label: 'Profit expected' };
      if (prior < 0 && estimate < 0) return { pct: null, label: estimate > prior ? 'Loss narrowing' : 'Loss widening' };
      return { pct: null, label: null };
    }
    function fmtWlGrowth(g: { pct: number | null; label: string | null }): string | null {
      if (g.label) return g.label;
      if (g.pct == null || !isFinite(g.pct)) return null;
      return (g.pct >= 0 ? '+' : '') + g.pct.toFixed(1) + '%';
    }
    function wlGrowthCol(g: { pct: number | null; label: string | null }): string {
      if (g.label) return '#94a3b8';
      if (g.pct == null) return C.dim;
      return g.pct >= 0 ? C.green : C.red;
    }

    // Normalize recent event fields
    function normalizeRecentEvent(ev: any) {
      const fp = String(ev.fiscal_period ?? '').trim();
      const fy = String(ev.fiscal_year ?? '').trim();
      // Backend returns earnings_date_fmt ("Jul 28") and earnings_date ("2026-07-28").
      // Older shapes may use report_date / date / date_raw as fallbacks.
      const rawDate =
        ev.earnings_date_fmt ??
        ev.earnings_date ??
        ev.report_date ??
        ev.date ??
        ev.date_raw ??
        null;
      return {
        ticker: String(ev.ticker ?? ev.symbol ?? '').toUpperCase(),
        company: ev.company ?? ev.company_name ?? ev.name ?? '',
        quarter: fp && fy ? `${fp} ${fy}` : fp || fy || '',
        date: rawDate,
        timing: ev.timing ?? ev.time ?? ev.when ?? null,
        classification: ev.classification ?? null,
        epsActual: ev.eps_actual ?? null,
        epsEstimate: ev.eps_estimate ?? null,
        epsSurprisePct: ev.eps_surprise_pct ?? null,
        revActual: ev.revenue_actual ?? null,
        revEstimate: ev.revenue_estimate ?? null,
        revSurprisePct: ev.revenue_surprise_pct ?? null,
        post1d: ev.post_earnings_1d_pct ?? ev.post_1d_pct ?? ev.reaction_1d_pct ?? null,
        logo: ev.logo ?? ev.image ?? ev.company_logo ?? null,
      };
    }

    // FMP logo URL is deterministic from ticker
    const fmpLogo = (ticker: string) =>
      ticker ? `https://financialmodelingprep.com/image-stock/${ticker}.png` : null;

    // Revenue compact formatter for recent cards
    const fmtRevC = (v: number | null): string => {
      if (v == null) return '—';
      const abs = Math.abs(v);
      if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
      if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    };

    // Short date formatter: "2026-07-24" → "Jul 24". Safe for all timezones.
    const fmtShortDate = (d: string | null | undefined): string | null => {
      if (!d) return null;
      try {
        const s = String(d).trim();
        const dt = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T12:00:00` : s);
        return isNaN(dt.getTime()) ? null : dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } catch { return null; }
    };

    // Classification helpers for recent cards
    const cls2border = (cls: string | null) => {
      if (cls === 'double_beat') return '#22c55e';
      if (cls === 'double_miss') return '#ef4444';
      if (cls === 'mixed' || cls === 'partial') return '#f59e0b';
      return 'transparent';
    };
    const cls2bg = (cls: string | null) => {
      if (cls === 'double_beat') return 'rgba(34,197,94,0.04)';
      if (cls === 'double_miss') return 'rgba(239,68,68,0.04)';
      if (cls === 'mixed' || cls === 'partial') return 'rgba(245,158,11,0.04)';
      return 'transparent';
    };
    const cls2text = (cls: string | null): { label: string; color: string } => {
      if (cls === 'double_beat') return { label: 'Double Beat', color: '#22c55e' };
      if (cls === 'double_miss') return { label: 'Double Miss', color: '#ef4444' };
      if (cls === 'mixed')       return { label: 'Mixed',       color: '#f59e0b' };
      if (cls === 'partial')     return { label: 'Partial',     color: '#f59e0b' };
      return { label: 'Results Reported', color: '#64748b' };
    };

    // LKG: events attached to the watchlist response itself — available in the
    // same round-trip as the Screener, so Upcoming can render immediately.
    const attachedEvents: any[] =
      (!isFavoritesTab && watchlist?.upcoming_earnings?.events)
        ? watchlist.upcoming_earnings.events
        : [];

    // Events from the scoped by-symbols response (any alias the backend may use)
    const bsEvents: any[] =
      earningsBySymbolsResp?.upcoming
      ?? earningsBySymbolsResp?.events
      ?? earningsBySymbolsResp?.earnings
      ?? [];

    // Settled success = response present, not loading, not errored, not syncing
    const bsSettledSuccess =
      !earningsBySymbolsLoading && !earningsBySymbolsError &&
      earningsBySymbolsResp != null && !isSyncingStatus;

    // Merge rule:
    // – settled success  → use by-symbols events (authoritative, even when empty)
    // – loading/syncing/error → use partial by-symbols events if any, else LKG
    const rawUpcoming: any[] = bsSettledSuccess
      ? bsEvents
      : bsEvents.length > 0 ? bsEvents : attachedEvents;

    // Scoped Recent bootstrap: filter the global earningsResp.recent to only tickers
    // in this watchlist — prevents cross-watchlist leakage while giving instant LKG data.
    const selectedSymbolSet = new Set(selectedEarningsSymbols);
    const scopedRecentBootstrap: any[] = (earningsResp?.recent ?? []).filter((row: any) => {
      const t = (row?.ticker ?? row?.symbol ?? '').toString().toUpperCase();
      return t && selectedSymbolSet.has(t);
    });

    // by-symbols recent (partial or settled)
    const bsRecent: any[] = earningsBySymbolsResp?.recent ?? [];

    // Recent source priority (spec §3):
    // 1. by-symbols settled+non-syncing → authoritative (may legitimately be empty)
    // 2. by-symbols loading/syncing/error with partial data → use it
    // 3. fallback → scoped bootstrap/LKG filtered to this watchlist's symbols
    const recentSource: any[] = bsSettledSuccess
      ? bsRecent
      : bsRecent.length > 0 ? bsRecent : scopedRecentBootstrap;

    const rawRecent: any[] = recentSource.slice().sort((a: any, b: any) => {
      const da = String(a.report_date ?? a.date ?? '');
      const db = String(b.report_date ?? b.date ?? '');
      if (db > da) return 1; if (da > db) return -1;
      const ua = String(a.updated_at ?? ''); const ub = String(b.updated_at ?? '');
      return ub > ua ? 1 : ua > ub ? -1 : 0;
    });

    const events = rawUpcoming.map(normalizeEarningsEvent);
    const recentEvents = rawRecent.map(normalizeRecentEvent);

    const sectionTitle = earningsView === 'upcoming' ? 'UPCOMING EARNINGS' : 'RECENT EARNINGS';

    // Compact segmented toggle
    const renderToggle = () => (
      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: 2, gap: 1 }}>
        {(['upcoming', 'recent'] as const).map(view => (
          <button
            key={view}
            onClick={(e) => { e.stopPropagation(); setEarningsView(view); }}
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setEarningsView(view); }}
            aria-pressed={earningsView === view}
            style={{
              fontSize: 9, fontWeight: 700, fontFamily: font,
              padding: '3px 10px', borderRadius: 3, cursor: 'pointer', border: 'none',
              textTransform: 'uppercase' as const, letterSpacing: '0.07em',
              background: earningsView === view ? 'rgba(255,255,255,0.18)' : 'transparent',
              color: earningsView === view ? '#fff' : '#475569',
              outline: 'none', transition: 'background 0.12s, color 0.12s',
            }}
          >
            {view === 'upcoming' ? 'Upcoming' : 'Recent'}
          </button>
        ))}
      </div>
    );

    // ── State 1: canonical symbols still resolving (watchlist loading)
    const symbolsStillLoading = !isFavoritesTab && selectedEarningsSymbols.length === 0 && (wlLoading || wlFetching);
    if (symbolsStillLoading) return null;

    // ── State 2: watchlist loaded but genuinely has no tickers
    if (selectedEarningsSymbols.length === 0 && !wlLoading) {
      return (
        <div style={{ padding: '0 20px 4px' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' as const, gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>{sectionTitle}</span>
              {renderToggle()}
            </div>
            <div style={{ padding: '20px 14px', textAlign: 'center' as const, fontSize: 10, color: C.dim, fontFamily: font }}>
              No tickers in this watchlist.
            </div>
          </div>
        </div>
      );
    }

    // ── State 3: cold loading (query in flight, no cards from LKG or attached)
    // Section stays visible with a spinner instead of disappearing.
    if (earningsBySymbolsLoading && events.length === 0 && recentEvents.length === 0) {
      return (
        <div style={{ padding: '0 20px 4px' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' as const, gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>{sectionTitle}</span>
              {renderToggle()}
            </div>
            <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="wl-spin" style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.50)', borderRadius: '50%', flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>Loading earnings…</span>
            </div>
          </div>
        </div>
      );
    }

    // ── State 3.5: error with no cards at all — show honest retryable message
    if (earningsBySymbolsError && events.length === 0 && recentEvents.length === 0) {
      return (
        <div style={{ padding: '0 20px 4px' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' as const, gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>{sectionTitle}</span>
              {renderToggle()}
            </div>
            <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' as const }}>
              <span style={{ fontSize: 10, color: C.red, fontFamily: font }}>Earnings temporarily unavailable</span>
              <button
                onClick={() => { setEarningsPollingExpired(false); void refetchEarningsBySymbols(); }}
                style={{ fontSize: 9, color: C.teal, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', fontFamily: font, textDecoration: 'underline' }}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ── State 4: genuinely empty — only when settled, non-syncing, non-error
    const activeIsEmpty = earningsView === 'upcoming' ? events.length === 0 : recentEvents.length === 0;
    if (activeIsEmpty && bsSettledSuccess) {
      return (
        <div style={{ padding: '0 20px 4px' }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' as const, flexWrap: 'wrap' as const, gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>{sectionTitle}</span>
              {renderToggle()}
            </div>
            <div style={{ padding: '20px 14px', textAlign: 'center' as const, fontSize: 10, color: C.dim, fontFamily: font }}>
              {earningsView === 'upcoming'
                ? 'No upcoming earnings for this watchlist.'
                : 'No watchlist earnings reported in the past 30 days.'}
            </div>
          </div>
        </div>
      );
    }

    // ── Shared card sizing — applied to both Upcoming and Recent branches
    const CARD_STYLE = {
      flexShrink: 0,
      cursor: 'pointer',
      padding: '10px 16px',
      borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column' as const, gap: 6,
      minWidth: 168,
      minHeight: 110,
    } as const;

    // Inline TIMING_FULL mapping — same semantics as EarningsTab popup
    const TIMING_FULL: Record<string, string> = {
      bmo: 'Before Market Open',
      amc: 'After Market Close',
      during_market: 'During Market Hours',
    };

    // ── State 5: events available — render section
    return (
      <div style={{ padding: '0 20px 4px' }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{
            padding: '10px 14px', borderBottom: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' as const,
            flexWrap: 'wrap' as const, gap: 6, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>
                {sectionTitle}
              </span>
              {(earningsBySymbolsLoading || isSyncingStatus) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className="wl-spin" style={{ width: 10, height: 10, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.50)', borderRadius: '50%' }} />
                  {isSyncingStatus && !earningsBySymbolsLoading && (
                    <span style={{ fontSize: 9, color: C.dim, fontFamily: font }}>Refreshing…</span>
                  )}
                </div>
              ) : !earningsBySymbolsError ? (
                <span style={{ fontSize: 9, color: C.dim }}>
                  ({earningsView === 'upcoming' ? events.length : recentEvents.length} in watchlist)
                </span>
              ) : null}
              {earningsBySymbolsError && (
                <span style={{ fontSize: 9, color: C.red }}>Refresh failed</span>
              )}
              {(earningsBySymbolsError || (isSyncingStatus && earningsPollingExpired)) && (
                <button
                  onClick={() => { setEarningsPollingExpired(false); void refetchEarningsBySymbols(); }}
                  style={{ fontSize: 9, color: C.teal, background: 'none', border: 'none', cursor: 'pointer', padding: '1px 4px', fontFamily: font, textDecoration: 'underline' }}
                >
                  Retry
                </button>
              )}
            </div>
            {renderToggle()}
          </div>

          {/* ── Upcoming Earnings Cards ─────────────────────────────── */}
          {earningsView === 'upcoming' && events.length > 0 && (
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }} className="wl-chip-strip">
              {events.map((ev: any, i: number) => {
                const importance = ev.importance as string | undefined;
                const importanceColor = importance === 'high' ? C.amber : importance === 'medium' ? C.teal : C.dim;
                const epsDir = (ev.epsEstimate != null && ev.lastEps != null)
                  ? ev.epsEstimate > ev.lastEps ? 'up' : ev.epsEstimate < ev.lastEps ? 'down' : 'flat'
                  : null;
                const epsG = calcWlGrowth(
                  ev.epsEstimate as number | null,
                  ev.lastEps as number | null,
                  ev.epsGrowthPct as number | null,
                  ev.epsTransitionLabel as string | null,
                );
                const epsGrowthStr = fmtWlGrowth(epsG);
                const epsGrowthCol = wlGrowthCol(epsG);
                const revG = calcWlGrowth(
                  ev.revenueEstimate as number | null,
                  ev.lastRevenue as number | null,
                  ev.revGrowthPct as number | null,
                  null,
                );
                const revGrowthStr = fmtWlGrowth(revG);
                const revGrowthCol = wlGrowthCol(revG);
                return (
                  <div
                    key={`earn-${ev.ticker}-${i}`}
                    onClick={() => handleTickerClick(ev.ticker)}
                    style={{ ...CARD_STYLE, borderLeft: '2px solid transparent', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {(() => {
                        const logoSrc = ev.logo ?? fmpLogo(ev.ticker);
                        if (logoSrc) {
                          return (
                            <img
                              src={logoSrc} alt={ev.ticker}
                              style={{ width: 18, height: 18, borderRadius: 3, objectFit: 'contain', flexShrink: 0 }}
                              onError={e => {
                                const img = e.currentTarget;
                                img.style.display = 'none';
                                const fallback = img.nextSibling as HTMLElement | null;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          );
                        }
                        return null;
                      })()}
                      <span style={{ display: 'none', width: 18, height: 18, borderRadius: 3, flexShrink: 0, alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', fontSize: 7, fontWeight: 800, color: C.dim, fontFamily: font }}>
                        {ev.ticker.slice(0, 2)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: font }}>{ev.ticker}</span>
                      {importance && (
                        <span style={{ fontSize: 7, fontWeight: 800, fontFamily: font, padding: '1px 5px', borderRadius: 3, color: importanceColor, background: importanceColor + '20', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
                          {importance}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, fontFamily: font }}>
                        {ev.date || 'Date unavailable'}
                      </span>
                      {(() => {
                        if (!ev.time) return null;
                        const t = String(ev.time);
                        const label = TIMING_FULL[t] ?? (t === 'unknown' ? null : t);
                        return label ? (
                          <span style={{ fontSize: 8, color: C.dim, fontFamily: font, whiteSpace: 'nowrap' as const }}>
                            · {label}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
                      {/* EPS Est. row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 9, fontFamily: font }}>
                          <span style={{ color: C.dim }}>EPS Est. </span>
                          {ev.epsEstimate != null ? (
                            <>
                              <span style={{ color: C.text, fontWeight: 700 }}>
                                {(ev.epsEstimate as number) < 0
                                  ? `-$${Math.abs(ev.epsEstimate as number).toFixed(2)}`
                                  : `$${(ev.epsEstimate as number).toFixed(2)}`}
                              </span>
                              {epsDir === 'up' && <span style={{ color: C.green }}> ↑</span>}
                              {epsDir === 'down' && <span style={{ color: C.red }}> ↓</span>}
                            </>
                          ) : (
                            <span style={{ color: C.dim, fontWeight: 700 }}>—</span>
                          )}
                        </div>
                        {epsGrowthStr && (
                          <span style={{ fontSize: 8, color: epsGrowthCol, fontFamily: font, whiteSpace: 'nowrap' as const }}>
                            · {epsGrowthStr}
                          </span>
                        )}
                      </div>
                      {/* Rev Est. row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 9, fontFamily: font }}>
                          <span style={{ color: C.dim }}>Rev Est. </span>
                          {ev.revenueEstimate != null ? (
                            <span style={{ color: C.text, fontWeight: 700 }}>
                              {(ev.revenueEstimate as number) >= 1e9
                                ? '$' + ((ev.revenueEstimate as number) / 1e9).toFixed(1) + 'B'
                                : (ev.revenueEstimate as number) >= 1e6
                                  ? '$' + ((ev.revenueEstimate as number) / 1e6).toFixed(0) + 'M'
                                  : '$' + (ev.revenueEstimate as number).toLocaleString()}
                            </span>
                          ) : (
                            <span style={{ color: C.dim, fontWeight: 700 }}>—</span>
                          )}
                        </div>
                        {revGrowthStr && (
                          <span style={{ fontSize: 8, color: revGrowthCol, fontFamily: font, whiteSpace: 'nowrap' as const }}>
                            · {revGrowthStr}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Recent Earnings Cards ───────────────────────────────── */}
          {earningsView === 'recent' && recentEvents.length > 0 && (
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }} className="wl-chip-strip">
              {recentEvents.map((ev: any, i: number) => {
                const clsInfo = cls2text(ev.classification);
                const accentBorder = cls2border(ev.classification);
                const accentBg = cls2bg(ev.classification);
                const hasRevEst = ev.revEstimate != null;
                const hasEpsEst = ev.epsEstimate != null;
                const epsSurpOk = ev.epsSurprisePct != null && Math.abs(ev.epsSurprisePct as number) < 600;
                const logoSrc = ev.logo ?? fmpLogo(ev.ticker);
                return (
                  <div
                    key={`recent-${ev.ticker}-${i}`}
                    onClick={() => {
                      setInitialTickerTabs({ primaryTab: 'earnings', earningsTab: 'overview' });
                      handleTickerClick(ev.ticker);
                    }}
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setInitialTickerTabs({ primaryTab: 'earnings', earningsTab: 'overview' });
                        handleTickerClick(ev.ticker);
                      }
                    }}
                    style={{ ...CARD_STYLE, borderLeft: accentBorder !== 'transparent' ? `2px solid ${accentBorder}` : '2px solid transparent', background: accentBg, outline: 'none', transition: 'filter 0.1s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                    onFocus={e => { (e.currentTarget as HTMLElement).style.outline = `1px solid ${accentBorder !== 'transparent' ? accentBorder : 'rgba(255,255,255,0.25)'}`; }}
                    onBlur={e => { (e.currentTarget as HTMLElement).style.outline = 'none'; }}
                  >
                    {/* Header: logo+ticker (left) | date (right) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' as const, gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                        {logoSrc && (
                          <img src={logoSrc} alt={ev.ticker}
                            style={{ width: 16, height: 16, borderRadius: 2, objectFit: 'contain', flexShrink: 0 }}
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: font, flexShrink: 0 }}>{ev.ticker}</span>
                      </div>
                      {(() => {
                        const ds = fmtShortDate(ev.date);
                        return ds ? (
                          <span style={{ fontSize: 9, fontWeight: 700, color: C.amber, fontFamily: font, flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                            {ds}
                          </span>
                        ) : null;
                      })()}
                    </div>

                    {/* Primary result row: REV + EPS (visible before date/timing) */}
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 7, fontWeight: 800, color: C.dim, fontFamily: font, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 1 }}>REV</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: font }}>{fmtRevC(ev.revActual)}</div>
                        {hasRevEst && ev.revSurprisePct != null ? (
                          <div style={{ fontSize: 9, color: (ev.revSurprisePct as number) >= 0 ? C.green : C.red, fontFamily: font }}>
                            {(ev.revSurprisePct as number) >= 0 ? '+' : ''}{(ev.revSurprisePct as number).toFixed(1)}%
                          </div>
                        ) : !hasRevEst ? (
                          <div style={{ fontSize: 8, color: C.dim, fontFamily: font }}>Est. N/A</div>
                        ) : null}
                      </div>
                      <div>
                        <div style={{ fontSize: 7, fontWeight: 800, color: C.dim, fontFamily: font, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 1 }}>EPS</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.text, fontFamily: font }}>
                          {ev.epsActual != null ? `$${(ev.epsActual as number).toFixed(2)}` : '—'}
                        </div>
                        {hasEpsEst && epsSurpOk ? (
                          <div style={{ fontSize: 9, color: (ev.epsSurprisePct as number) >= 0 ? C.green : C.red, fontFamily: font }}>
                            {(ev.epsSurprisePct as number) >= 0 ? '+' : ''}{(ev.epsSurprisePct as number).toFixed(1)}%
                          </div>
                        ) : !hasEpsEst ? (
                          <div style={{ fontSize: 8, color: C.dim, fontFamily: font }}>Est. N/A</div>
                        ) : null}
                      </div>
                    </div>

                    {/* Secondary row: timing · classification · Post 1D chip */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' as const }}>
                      {ev.timing && (
                        <span style={{ fontSize: 8, color: C.dim, fontFamily: font }}>
                          {ev.timing === 'amc' ? '· AMC' : ev.timing === 'bmo' ? '· BMO' : `· ${String(ev.timing).toUpperCase()}`}
                        </span>
                      )}
                      <span style={{ fontSize: 8, fontWeight: 600, color: clsInfo.color, fontFamily: font }}>· {clsInfo.label}</span>
                      {ev.post1d != null ? (
                        <span style={{
                          fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3, fontFamily: font,
                          color: (ev.post1d as number) > 0 ? '#22c55e' : (ev.post1d as number) < 0 ? '#ef4444' : C.dim,
                          background: (ev.post1d as number) > 0 ? 'rgba(34,197,94,0.18)' : (ev.post1d as number) < 0 ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.06)',
                        }}>
                          Post 1D {(ev.post1d as number) > 0 ? '+' : ''}{(ev.post1d as number).toFixed(2)}%
                        </span>
                      ) : (
                        <span style={{ fontSize: 8, color: C.dim, fontFamily: font }}>· Pending</span>
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

  /* ── foreign classification for watchlist Hide-Foreign toggle ────
   * Uses per-row exchange metadata (from FMP company-identity) when available.
   * Known US exchange codes (including OTC) → NOT foreign.
   * Null/unknown exchange → fallback to colon-free symbol heuristic.
   * True foreign exchanges (TSX, LSE, TSE, HKEX, etc.) → foreign. */
  function isForeignForWatchlistFilter(row: any): boolean {
    const ticker: string = String(row.ticker || row.symbol || '');
    if (!ticker) return false;
    const exchange: string | null = (row.exchange != null && row.exchange !== '')
      ? String(row.exchange)
      : null;
    if (exchange) {
      const x = exchange.toUpperCase().trim();
      if (
        x === 'NASDAQ' || x === 'NMS' || x === 'NGS' || x === 'NCM' ||
        x === 'NYSE'   || x === 'NYQ' ||
        x === 'AMEX'   || x === 'NYSEARCA' || x === 'NYSE ARCA' || x === 'BATS' ||
        x === 'OTC'    || x === 'OTCBB' || x === 'PINK' || x === 'OTCMKTS' ||
        x === 'OTCQB'  || x === 'OTCQX' ||
        x === 'CBOE'   || x === 'IEX'
      ) {
        return false;
      }
      if (
        x.includes('NASDAQ') || x.includes('NYSE') || x.includes('AMEX') ||
        x.includes('OTC')    || x.includes('BATS') || x.includes('CBOE') ||
        x.includes('IEX')    || x.includes('PINK') || x.includes('OTCQB') ||
        x.includes('OTCQX')  || x.includes('OTCMKTS')
      ) {
        return false;
      }
    }
    return ticker.includes(':');
  }

  /* ── ticker table for new format ─────────────────────── */
  const renderNewFormatTickerTable = (opts?: { rows?: typeof sortedTickers; title?: string }) => {
    const rows = opts?.rows ?? displayRows;
    const tableTitle = opts?.title ?? 'SCREENER';
    const isMainScreener = tableTitle === 'SCREENER' || tableTitle === 'FAVORITES';
    // Apply hide-foreign filter
    const visibleRows = hideForeignTickers
      ? rows.filter(r => !isForeignForWatchlistFilter(r))
      : rows;
    const foreignHidden = rows.length - visibleRows.length;
    // Apply screener filters (only for the main Screener panel, not Close Watch or custom row sets)
    const screenerFilteredRows = (isMainScreener && filteredSymbolSet)
      ? visibleRows.filter(r => filteredSymbolSet.has(String((r as any).ticker || (r as any).symbol || '').toUpperCase()))
      : visibleRows;
    const filterHidden = visibleRows.length - screenerFilteredRows.length;
    // Apply canonical taxonomy filter (ID-based, multi-select union semantics)
    const filteredRows = (isMainScreener && selectedTaxonomyIds.size > 0)
      ? screenerFilteredRows.filter(r =>
          rowMatchesTaxonomySelection(r as any, selectedTaxonomyIds, taxonomyIndex))
      : screenerFilteredRows;
    // Mode-specific grid layout and column headers
    const SEC_OPT_COLS: { key: string; label: string; tooltip?: string }[] = [
      { key: 'optionsCallPrem', label: 'Call Prem', tooltip: 'Aggregate call option premium for this ticker.' },
      { key: 'optionsPutPrem',  label: 'Put Prem',  tooltip: 'Aggregate put option premium for this ticker.' },
      { key: 'optionsAskPrem',  label: 'Ask Prem',  tooltip: 'Interval ask-side premium (session flow).' },
      { key: 'optionsBidPrem',  label: 'Bid Prem',  tooltip: 'Interval bid-side premium (session flow).' },
      { key: 'optionsMidPrem',  label: 'Mid Prem',  tooltip: 'Interval mid/unknown-side premium.' },
      { key: 'optionsCallVol',  label: 'Call Vol',  tooltip: 'Call contract volume.' },
      { key: 'optionsPutVol',   label: 'Put Vol',   tooltip: 'Put contract volume.' },
      { key: 'optionsCallOi',   label: 'Call OI',   tooltip: 'Call open interest.' },
      { key: 'optionsPutOi',    label: 'Put OI',    tooltip: 'Put open interest.' },
    ];
    const visibleSecCols = screenerMode === 'options' ? SEC_OPT_COLS.filter(c => optSecColsState.has(c.key)) : [];
    const OPT_DEFAULT_GRID = '64px minmax(140px,1.6fr) minmax(100px,1fr) 48px minmax(58px,0.8fr) 52px 52px 68px 56px 56px 56px 44px 44px 56px 52px';
    const TICKER_GRID =
      screenerMode === 'market'
        ? '64px minmax(140px, 1.6fr) minmax(120px, 1fr) 80px 64px 64px 64px 72px 64px 80px 68px 80px'
        : screenerMode === 'options'
          ? `${OPT_DEFAULT_GRID}${visibleSecCols.length > 0 ? ' ' + visibleSecCols.map(() => '60px').join(' ') : ''}`
          : /* technical */ '64px minmax(140px, 1.6fr) minmax(120px, 1fr) 80px 80px 104px 116px 80px 100px 64px 68px 72px 72px 84px 112px 64px 52px';
    const TICKER_TABLE_MIN_WIDTH =
      screenerMode === 'market' ? 960
      : screenerMode === 'options' ? (1040 + visibleSecCols.length * 60)
      : /* technical */ 1456;
    const tickerColumns: { key?: NonNullable<typeof sortKey>; label: string; tooltip?: string }[] =
      screenerMode === 'market' ? [
        { key: 'ticker',      label: 'Ticker' },
        { key: 'company',     label: 'Company' },
        { key: 'theme',       label: 'Theme' },
        { key: 'price',       label: 'Price' },
        { key: 'chg',         label: '1D %' },
        { key: 'chg7d',       label: '7D %',  tooltip: '7-day price performance.' },
        { key: 'chg30d',      label: '30D %', tooltip: '30-day price performance.' },
        { key: 'volume',      label: 'Volume' },
        { key: 'relVol',      label: 'VOLX' },
        { key: 'rvRankMove',  label: 'VOL RANK' },
        { key: 'volMc',       label: 'Vol/MC' },
        { key: 'beta',        label: 'Beta', tooltip: 'Measures price sensitivity to broad market movements. Beta above 1.0 means more volatile than the market; below 1.0 means less volatile; negative beta tends to move opposite to the market.' },
      ]
      : screenerMode === 'options' ? [
        { key: 'ticker',               label: 'Ticker' },
        { key: 'company',              label: 'Company' },
        { key: 'theme',                label: 'Theme' },
        { key: 'optionsScore',         label: 'Opt Score' },
        { label: 'Opt Signal' },
        { key: 'optionsVolPc',         label: 'Vol P/C',   tooltip: 'Put contracts ÷ call contracts — lower is more call-active.' },
        { key: 'optionsPutCall',       label: 'Prem P/C',  tooltip: 'Put premium ÷ call premium — lower is more call-heavy.' },
        { key: 'optionsNetPrem',       label: 'Net Prem',  tooltip: 'Net options premium (calls minus puts) — positive is call-heavy.' },
        { key: 'optionsNetPrem1d',     label: 'Net 1D',    tooltip: 'Change in net premium vs 1 day ago.' },
        { key: 'optionsNetPrem7d',     label: 'Net 7D',    tooltip: 'Change in net premium vs 7 days ago.' },
        { key: 'optionsNetPrem30d',    label: 'Net 30D',   tooltip: 'Change in net premium vs 30 days ago.' },
        { key: 'optionsIv',            label: 'IV' },
        { key: 'optionsExpectedMove',  label: 'EM' },
        { key: 'optionsVolume',        label: 'Opt Vol' },
        { key: 'optionsOi',            label: 'OI' },
        ...visibleSecCols,
      ]
      : /* technical */ [
        { key: 'ticker',         label: 'Ticker' },
        { key: 'company',        label: 'Company' },
        { key: 'theme',          label: 'Theme' },
        { key: 'stage2',         label: 'Stage' },
        { key: 'techState',      label: 'Technical State',  tooltip: 'Summary chart condition: Coiling, Pullback Entry, Breakout Trigger, Trend Advance, Extended, Overheated, Distribution, Broken, or Neutral. Chart timing context — not a buy/sell rating.' },
        { key: 'entryZone',      label: 'Entry Zone',       tooltip: 'Interpreted entry timing label — shows whether the stock is near a 20D/50D pullback, breakout watch, fresh breakout, extended, overheated, broken, or neutral.' },
        { key: 'bkSignal',       label: 'Breakout Signal',  tooltip: 'Detects coiling, near-trigger, fresh breakout, confirmed breakout, extended breakout, failed breakout, or no setup. Separates actionable breakouts from chase/failed setups.' },
        { key: 'momentumTrend',  label: 'Momentum Trend',   tooltip: 'Recent price momentum / rate-of-change trend. Positive or accelerating supports the trend; Cooling, diverging, or negative warns momentum is fading.' },
        { key: 'extRisk',        label: 'Extension Risk',   tooltip: 'Flags whether price is healthy, extended, overheated, in a pullback zone, or broken. Helps avoid chasing names too far above key moving averages.' },
        { key: 'maStack',        label: 'MA Stack',         tooltip: 'Whether short/intermediate/long moving averages are aligned bullishly, mixed, or bearishly. Bull = constructive trend; Bear = weak or broken trend.' },
        { key: 'pctVs50d',       label: '% vs 50D',         tooltip: 'Price distance from the 50-day moving average. Near/above can be healthy; very far above can mean extended; below can signal weakness.' },
        { key: 'pctVs200d',      label: '% vs 200D',        tooltip: 'Price distance from the 200-day moving average. Shows long-term trend context. Below the 200D is generally weaker.' },
        { key: 'pos52w',         label: '52W Pos',          tooltip: 'Where price sits in its 52-week range from 0–100%. Higher = closer to yearly highs / leadership; very low = damaged or early recovery.' },
        { key: 'pctFrom52wHigh', label: '% From 52W High', tooltip: 'How far below the 52-week high price currently is. Near 0 = near highs / breakout area; deeply negative = more overhead supply or damage.' },
        { key: 'accumDist',      label: 'Accum/Dist',       tooltip: 'Recent price/volume behavior scored as accumulation vs. distribution. Accumulation = demand; Distribution = selling pressure; Dry-up can indicate a base or squeeze.' },
        { key: 'squeezeSig',     label: 'Squeeze',          tooltip: 'Volatility compression or expansion. Tight/coiling = setup energy building; Volatile = wider risk; Expansion = the move may already be underway.' },
        { key: 'atrPct',         label: 'ATR %',            tooltip: 'Average true range as a percent of price. Used to size risk — higher ATR means the stock is more volatile and requires wider stops.' },
      ];

    /* ── inline filter modal ─────────────────────────────────────────── */
    const filterModal = (showFilterModal && isMainScreener) ? (() => {
      const fieldDef = SCREENER_FILTER_FIELDS.find(f => f.key === draftField) || SCREENER_FILTER_FIELDS[0];
      const operators = fieldDef.type === 'text' ? TEXT_OPS : NUMERIC_OPS;
      const needsValue = draftOp !== 'exists' && draftOp !== 'missing';
      const isBetween  = draftOp === 'between';
      const techFields = SCREENER_FILTER_FIELDS.filter(f => f.group === 'Technical');
      const fundFields = SCREENER_FILTER_FIELDS.filter(f => f.group === 'Fundamental');
      const INPUT_S: React.CSSProperties = { fontSize: 11, padding: '5px 8px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text, fontFamily: font, outline: 'none' };
      const handleAdd = () => {
        if (needsValue && !draftVal.trim()) return;
        const next: ScreenerFilter[] = [...screenerFilters, {
          id: Math.random().toString(36).slice(2),
          fieldKey: draftField, operator: draftOp,
          value: draftVal.trim(), value2: draftVal2.trim(),
        }];
        setScreenerFilters(next); saveFiltersToStorage(next);
        setDraftVal(''); setDraftVal2('');
      };
      const handleFieldChange = (key: string) => {
        const def = SCREENER_FILTER_FIELDS.find(f => f.key === key);
        const ops = (def?.type === 'text') ? TEXT_OPS : NUMERIC_OPS;
        setDraftField(key);
        if (!ops.find(o => o.op === draftOp)) setDraftOp(ops[0].op);
        setDraftVal(''); setDraftVal2('');
      };
      const removeFilter = (id: string) => {
        const next = screenerFilters.filter(f => f.id !== id);
        setScreenerFilters(next); saveFiltersToStorage(next);
      };
      return (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: '52px 20px 20px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowFilterModal(false); }}
        >
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, width: 380, maxHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.65)', overflow: 'hidden' }}>
            {/* Modal header */}
            <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.08em', fontFamily: font }}>SCREENER FILTERS</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {screenerFilters.length > 0 && (
                  <button onClick={() => { setScreenerFilters([]); saveFiltersToStorage([]); }} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: `${C.red}15`, border: `1px solid ${C.red}35`, color: C.red, cursor: 'pointer', fontFamily: font, fontWeight: 700 }}>
                    Clear All
                  </button>
                )}
                <button onClick={() => setShowFilterModal(false)} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, cursor: 'pointer', fontFamily: font }}>✕</button>
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Add filter form */}
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: font, marginBottom: 8 }}>Add Filter</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* Field selector */}
                  <select value={draftField} onChange={e => handleFieldChange(e.target.value)} style={{ ...INPUT_S, width: '100%', cursor: 'pointer' }}>
                    <optgroup label="── Technical ──">
                      {techFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </optgroup>
                    <optgroup label="── Fundamental ──">
                      {fundFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </optgroup>
                    <optgroup label="── Quality ──">
                      {SCREENER_FILTER_FIELDS.filter(f => f.group === 'Quality').map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </optgroup>
                  </select>
                  {/* Operator + value */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <select value={draftOp} onChange={e => { setDraftOp(e.target.value as FilterOperator); setDraftVal(''); setDraftVal2(''); }} style={{ ...INPUT_S, flex: '1 1 130px', minWidth: 0, cursor: 'pointer' }}>
                      {operators.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
                    </select>
                    {needsValue && (
                      <input value={draftVal} onChange={e => setDraftVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} placeholder={isBetween ? 'Min' : (fieldDef.unit ? `e.g. 1.5${fieldDef.unit}` : 'Value')} style={{ ...INPUT_S, flex: '1 1 80px', minWidth: 56 }} />
                    )}
                    {isBetween && (
                      <input value={draftVal2} onChange={e => setDraftVal2(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} placeholder="Max" style={{ ...INPUT_S, flex: '1 1 80px', minWidth: 56 }} />
                    )}
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={needsValue && !draftVal.trim()}
                    style={{ fontSize: 10, padding: '6px 12px', borderRadius: 4, background: `${C.teal}1a`, border: `1px solid ${C.teal}55`, color: C.teal, cursor: (needsValue && !draftVal.trim()) ? 'not-allowed' : 'pointer', fontFamily: font, fontWeight: 700, opacity: (needsValue && !draftVal.trim()) ? 0.45 : 1, transition: 'opacity 0.1s' }}
                  >
                    + Add Filter
                  </button>
                </div>
              </div>

              {/* Active filters list */}
              {screenerFilters.length > 0 ? (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: font, marginBottom: 8 }}>
                    Active ({screenerFilters.length}) — AND logic
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {screenerFilters.map(f => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: `${C.teal}0d`, border: `1px solid ${C.teal}30`, borderRadius: 6 }}>
                        <span style={{ flex: 1, fontSize: 11, color: C.text, fontFamily: font }}>{formatFilterChipLabel(f)}</span>
                        <button onClick={() => removeFilter(f.id)} style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0, opacity: 0.7 }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center' as const, padding: '16px 0', color: C.dim, fontSize: 11, fontFamily: font }}>
                  No active filters. Add one above to narrow the screener.
                </div>
              )}
            </div>
          </div>
        </div>
      );
    })() : null;

    return (
      <div style={screenerFullscreen ? {
        position: 'fixed' as const, inset: 0, zIndex: 9998,
        background: C.bg, border: 'none', borderRadius: 0,
        display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
      } : {
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
        display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
        height: '100%', minHeight: 0,
      }}>
        {filterModal}
        {/* Header row */}
        <div style={{
          padding: '10px 14px', borderBottom: screenerFilters.length > 0 && isMainScreener ? 'none' : `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: tableTitle === 'FAVORITES' ? C.amber : '#fff', letterSpacing: '0.1em' }}>
            {tableTitle}
          </span>
          {(
            <div style={{ display: 'flex', borderRadius: 3, overflow: 'hidden', border: `1px solid ${C.border}` }}>
              {(['market', 'technical', 'options', 'fundamentals', 'confluence'] as const).map((mode, mi, arr) => (
                <button
                  key={mode}
                  onClick={() => {
                    setScreenerMode(mode);
                    try { localStorage.setItem('wl_screener_mode', mode); } catch {}
                  }}
                  style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.07em',
                    padding: '3px 9px', cursor: 'pointer',
                    textTransform: 'uppercase' as const, fontFamily: font,
                    background: screenerMode === mode ? `${C.teal}22` : 'transparent',
                    color: screenerMode === mode ? C.teal : C.dim,
                    border: 'none',
                    borderRight: mi < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  {mode === 'market' ? 'Market' : mode === 'technical' ? 'Technical' : mode === 'options' ? 'Options' : mode === 'fundamentals' ? 'Fundamentals' : 'Confluence'}
                </button>
              ))}
            </div>
          )}
          <span style={{ fontSize: 9, color: C.dim }}>
            {opts?.rows !== undefined
              ? (hideForeignTickers && foreignHidden > 0
                  ? `${rows.length} tickers · ${visibleRows.length} shown`
                  : `${rows.length} ticker${rows.length !== 1 ? 's' : ''}`)
              : isRefreshing
                ? `${rows.length} tickers`
                : (filteredSymbolSet && isMainScreener)
                  ? `${mergedTickers.length} total · ${filteredRows.length} shown · ${filterHidden + foreignHidden} filtered`
                  : pendingCount > 0
                    ? `${analyzedCount} analyzed · ${pendingCount} pending`
                    : (hideForeignTickers && foreignHidden > 0
                        ? `${mergedTickers.length} total · ${visibleRows.length} shown`
                        : `${mergedTickers.length} total`)}
          </span>
          {isRefreshing && !opts?.rows && (
            <span style={{
              fontSize: 7, fontWeight: 700, fontFamily: font,
              padding: '2px 6px', borderRadius: 3,
              color: C.amber, background: C.amber + '18',
              border: `1px solid ${C.amber}30`,
              textTransform: 'uppercase' as const, letterSpacing: '0.04em',
            }}>
              REFRESHING…
            </span>
          )}
          {(screenerMode === 'market' || screenerMode === 'technical' || screenerMode === 'options') && !opts?.rows && !isRefreshing && pendingCount > 0 && (  // growth/fundamentals use table renderer, no pending indicator needed
            <span style={{
              fontSize: 7, fontWeight: 800, fontFamily: font,
              padding: '2px 6px', borderRadius: 3,
              color: C.amber, background: C.amber + '18',
              border: `1px solid ${C.amber}30`,
              textTransform: 'uppercase' as const, letterSpacing: '0.04em',
            }}>
              {pendingCount} PENDING ANALYSIS
            </span>
          )}
          {(screenerMode === 'market' || screenerMode === 'technical' || screenerMode === 'options') && optionsMeta && (
            ((optionsMeta.deferred_symbols_count ?? 0) > 0 || (optionsMeta.inflight_symbols_count ?? 0) > 0) ? (
              <span style={{ fontSize: 7, color: C.amber, opacity: 0.75, letterSpacing: '0.03em' }}>
                Options scan warming — cached rows shown first
              </span>
            ) : (
              <span style={{ fontSize: 7, color: C.dim, opacity: 0.7, letterSpacing: '0.03em' }}>
                Options scan cached
                {optionsMeta.data_available_count != null && optionsMeta.symbols_requested != null
                  ? ` · ${optionsMeta.data_available_count}/${optionsMeta.symbols_requested} with options data`
                  : ''}
              </span>
            )
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {isMainScreener && (
              <button
                onClick={() => setShowFilterModal(v => !v)}
                style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.07em',
                  padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                  textTransform: 'uppercase' as const, fontFamily: font,
                  background: screenerFilters.length > 0 ? `${C.teal}22` : 'transparent',
                  color: screenerFilters.length > 0 ? C.teal : C.dim,
                  border: `1px solid ${screenerFilters.length > 0 ? `${C.teal}60` : C.border}`,
                  transition: 'all 0.12s', flexShrink: 0,
                }}
                title="Screener Filters"
              >
                {screenerFilters.length > 0 ? `⊙ Filters (${screenerFilters.length})` : '⊕ Filters'}
              </button>
            )}
            {screenerMode === 'options' && (
              <div style={{ position: 'relative' }}>
                {showOptColsMenu && (
                  <div style={{ position: 'fixed', inset: 0, zIndex: 9990 }} onClick={() => setShowOptColsMenu(false)} />
                )}
                <button
                  onClick={() => setShowOptColsMenu(v => !v)}
                  style={{
                    fontSize: 8, fontWeight: 700, letterSpacing: '0.07em',
                    padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                    textTransform: 'uppercase' as const, fontFamily: font,
                    background: optSecColsState.size > 0 ? `${C.purple}22` : 'transparent',
                    color: optSecColsState.size > 0 ? '#a78bfa' : C.dim,
                    border: `1px solid ${optSecColsState.size > 0 ? '#a78bfa60' : C.border}`,
                    transition: 'all 0.12s', flexShrink: 0,
                  }}
                  title="Toggle optional columns"
                >
                  {optSecColsState.size > 0 ? `⊞ Cols (${optSecColsState.size})` : '⊞ Cols'}
                </button>
                {showOptColsMenu && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 9991,
                    background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
                    padding: '6px 0', minWidth: 156, boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
                    marginTop: 3,
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '3px 10px 5px', fontSize: 8, fontWeight: 700, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase' as const, fontFamily: font }}>
                      Optional Columns
                    </div>
                    {SEC_OPT_COLS.map(c => (
                      <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px', cursor: 'pointer', fontSize: 11, color: optSecColsState.has(c.key) ? C.text : C.dim, fontFamily: font }}>
                        <input
                          type="checkbox"
                          checked={optSecColsState.has(c.key)}
                          onChange={() => toggleOptSecCol(c.key)}
                          style={{ cursor: 'pointer', accentColor: '#a78bfa' }}
                        />
                        {c.label}
                      </label>
                    ))}
                    {optSecColsState.size > 0 && (
                      <div style={{ padding: '4px 10px 2px', borderTop: `1px solid ${C.border}`, marginTop: 3 }}>
                        <button onClick={() => { setOptSecColsState(new Set()); try { localStorage.removeItem('wl_opt_sec_cols_v1'); } catch {} }} style={{ fontSize: 9, color: C.dim, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: font }}>
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={toggleHideForeign}
              style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.07em',
                padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                textTransform: 'uppercase' as const, fontFamily: font,
                background: hideForeignTickers ? `${C.teal}22` : 'transparent',
                color: hideForeignTickers ? C.teal : C.dim,
                border: `1px solid ${hideForeignTickers ? `${C.teal}60` : C.border}`,
                transition: 'all 0.12s',
                flexShrink: 0,
              }}
              title={hideForeignTickers ? 'Show all tickers including foreign exchanges' : 'Hide tickers from non-U.S. foreign exchanges. OTC and U.S. listings remain visible.'}
            >
              {hideForeignTickers ? '⊘ Hide Foreign' : 'Hide Foreign'}
            </button>
            <button
              onClick={() => setScreenerFullscreen(v => !v)}
              title={screenerFullscreen ? 'Exit full view' : 'Expand to full view'}
              style={{
                background: 'none', border: 'none', padding: '2px 4px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                color: screenerFullscreen ? C.teal : C.dim,
                flexShrink: 0, transition: 'color 0.12s',
              }}
            >
              {screenerFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
        {/* Filter chips strip — visible when filters are active */}
        {isMainScreener && screenerFilters.length > 0 && (
          <div style={{ padding: '5px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 5, flexWrap: 'wrap' as const, alignItems: 'center', background: `${C.teal}07`, flexShrink: 0 }}>
            {screenerFilters.map(f => {
              const next = screenerFilters.filter(x => x.id !== f.id);
              return (
                <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '2px 6px 2px 7px', borderRadius: 10, background: `${C.teal}18`, border: `1px solid ${C.teal}40`, color: C.teal, fontFamily: font, whiteSpace: 'nowrap' as const }}>
                  {formatFilterChipLabel(f)}
                  <button onClick={() => { setScreenerFilters(next); saveFiltersToStorage(next); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 12, lineHeight: 1, padding: '0 1px', opacity: 0.65 }}>×</button>
                </span>
              );
            })}
            <button onClick={() => { setScreenerFilters([]); saveFiltersToStorage([]); }} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.dim}40`, color: C.dim, cursor: 'pointer', fontFamily: font }}>
              Clear All
            </button>
          </div>
        )}

        {screenerMode === 'options' && (() => {
          const firstOpt = mergedTickers.find(t => t.options_snapshot_status || t.options_data_as_of);
          const status   = (firstOpt?.options_snapshot_status ?? null) as string | null;
          const asOf     = (firstOpt?.options_data_as_of ?? null) as string | null;
          if (!status && !asOf) return null;
          const statusColor = status === 'live' ? C.green : status === 'prior_session' ? C.amber : C.dim;
          const statusDot   = status === 'live' ? '●' : status === 'prior_session' ? '◐' : '○';
          const statusLabel = status === 'live' ? 'Live' : status === 'prior_session' ? 'Prior session' : status === 'cached' ? 'Cached' : (status ?? 'Options data');
          let asOfStr = '';
          if (asOf) {
            try {
              const d = new Date(asOf);
              const isToday = new Date().toDateString() === d.toDateString();
              asOfStr = isToday
                ? ` · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} ET`
                : ` · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            } catch {}
          }
          return (
            <div style={{ padding: '3px 14px', borderBottom: `1px solid ${C.border}`, fontSize: 9, color: statusColor, display: 'flex', alignItems: 'center', gap: 4, background: `${statusColor}08`, flexShrink: 0 }}>
              <span>{statusDot}</span>
              <span style={{ fontWeight: 700, fontFamily: font }}>{statusLabel}</span>
              {asOfStr && <span style={{ color: C.dim, fontFamily: font }}>{asOfStr}</span>}
            </div>
          );
        })()}
        {screenerMode === 'fundamentals' && (
          <div style={{ padding: '6px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 4, flexShrink: 0, background: `${C.teal}06` }}>
            {([ ['overview','Overview'], ['financialHealth','Financial Health'], ['growth','Growth'], ['valuation','Valuation'] ] as [FundamentalsCategory, string][]).map(([cat, label]) => (
              <button
                key={cat}
                onClick={() => { setFundamentalsCategory(cat); try { localStorage.setItem(WL_FUNDAMENTALS_CATEGORY_KEY, cat); } catch {} }}
                style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
                  padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
                  textTransform: 'uppercase' as const, fontFamily: font,
                  background: fundamentalsCategory === cat ? `${C.teal}22` : 'transparent',
                  color: fundamentalsCategory === cat ? C.teal : C.dim,
                  border: `1px solid ${fundamentalsCategory === cat ? `${C.teal}55` : C.border}`,
                  transition: 'all 0.12s',
                }}
              >{label}</button>
            ))}
          </div>
        )}
        {tableTitle !== 'CLOSE WATCH' && (
          <div style={{ display: screenerMode === 'confluence' ? 'flex' : 'none', flex: 1, minHeight: 0 }}>
            {/* Only mount after first activation — zero initial Confluence render cost */}
            {confluenceEverMounted && (
              <CaelynConfluenceSection
                rows={confluenceRows ?? csvMergedScreenerRows}
                onTickerClick={handleTickerClick}
                totalTickers={allTickerSymbols.length}
                usingAlignmentEndpoint={confluenceRows != null}
                embedded
              />
            )}
          </div>
        )}
        {screenerMode === 'confluence' ? null : tableTitle !== 'CLOSE WATCH' && screenerMode === 'fundamentals' ? (
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }} className="wl-scrollbar">
            {renderFundamentalScreenerContent(filteredRows,
              fundamentalsCategory === 'financialHealth' ? FUND_FINANCIAL_HEALTH_COLS
              : fundamentalsCategory === 'growth'        ? FUND_GROWTH_COMBINED_COLS
              : fundamentalsCategory === 'valuation'     ? FUND_VALUATION_COLS
              : FUND_OVERVIEW_COLS,
              true
            )}
          </div>
        ) : (
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, position: 'relative' as const, zIndex: 0 }} className="wl-scrollbar">
          <div style={{ minWidth: TICKER_TABLE_MIN_WIDTH }}>
            {/* table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: TICKER_GRID,
              minWidth: TICKER_TABLE_MIN_WIDTH,
              padding: '6px 14px',
              borderBottom: `1px solid ${C.border}`,
              position: 'sticky' as const, top: 0, zIndex: 2,
              background: C.card,
              fontSize: 8, fontWeight: 700, color: C.dim,
              textTransform: 'uppercase' as const, letterSpacing: '0.08em',
              gap: 6,
            }}>
              <TooltipProvider delayDuration={180}>
              {tickerColumns.map(col => {
                const sortable = col.key != null;
                const active = sortable && sortKey === col.key;
                const spanEl = (
                  <span
                    key={col.key ?? col.label}
                    onClick={() => { if (col.key) handleSortClick(col.key); }}
                    style={{
                      cursor: sortable ? 'pointer' : 'default',
                      color: active ? '#f5f5f0' : C.dim,
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      overflow: 'hidden', whiteSpace: 'nowrap' as const,
                      ...(col.key === 'ticker' ? {
                        position: 'sticky' as const,
                        left: 0,
                        zIndex: 1,
                        background: C.card,
                      } : col.key === 'entryZone' ? { paddingLeft: 16 } : {}),
                    }}
                    title={!col.tooltip ? (sortable ? `Sort by ${col.label}` : col.label) : undefined}
                  >
                    {col.label}
                    {col.tooltip && (
                      <span style={{ fontSize: 7, opacity: 0.45, lineHeight: 1, flexShrink: 0 }}>?</span>
                    )}
                    {sortable && (
                      <span style={{ fontSize: 8, opacity: active ? 1 : 0.3 }}>
                        {active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </span>
                );
                if (!col.tooltip) return spanEl;
                return (
                  <Tooltip key={col.key ?? col.label}>
                    <TooltipTrigger asChild>{spanEl}</TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      style={{
                        maxWidth: 260, fontSize: 11, lineHeight: 1.5,
                        background: '#141414', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#e5e5e0', padding: '8px 10px', borderRadius: 6,
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 600, marginBottom: 3, textTransform: 'none', letterSpacing: 0 }}>{col.label}</p>
                      <p style={{ margin: 0, opacity: 0.8, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{col.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              </TooltipProvider>
            </div>

            {/* loading / empty states for screener */}
            {filteredRows.length === 0 && (wlLoading || wlFetching) && !isRefreshing && (
              <div style={{ padding: '40px 14px', textAlign: 'center' as const, color: C.dim, fontSize: 10, fontFamily: font }}>
                Loading watchlist…
              </div>
            )}
            {filteredRows.length === 0 && !wlLoading && !wlFetching && !isRefreshing && (
              <div style={{ padding: '40px 14px', textAlign: 'center' as const, color: C.dim, fontSize: 10, fontFamily: font }}>
                No tickers in this watchlist.
              </div>
            )}

            {/* table rows — continuous render: all filtered tickers mounted for smooth scrolling */}
            {filteredRows.map((stock, absoluteIdx) => {
              const sym = (stock.ticker || stock.symbol || '') as string;
              const symUp = sym.toUpperCase();
              return (
                // Outer display:contents div carries CSS vars for zebra striping.
                // React.memo on WlTickerRow never sees the sort index —
                // only stock/isExpanded/isFavorite/per-ticker-props/ctx change.
                <div
                  key={`${activeId}:${sym}`}
                  style={{
                    display: 'contents',
                    ['--wl-row-bg' as any]: absoluteIdx % 2 === 0 ? 'transparent' : `${C.border}08`,
                    ['--wl-sticky-bg' as any]: absoluteIdx % 2 === 0 ? C.bg : C.card,
                  }}
                >
                  <WlTickerRow
                    stock={stock}
                    isExpanded={expandedTickers.has(sym)}
                    isFavorite={favoritesSet.has(symUp)}
                    hydrationEntry={hydrationStatus.get(symUp)}
                    primaryThemeLabel={wlBuildThemeCellLabel(stock, taxonomyIndex)}
                    additionalThemeCount={wlBuildThemeCellAdditionalCount(stock)}
                    themeTooltip={wlBuildThemeCellTooltip(stock, taxonomyIndex)}
                    themeAssignPending={themeAssignPendingTicker === sym}
                    rowThemeFeedback={themeAssignFeedback?.ticker === sym ? { type: themeAssignFeedback.type, msg: themeAssignFeedback.msg } : null}
                    ctx={rowCtx}
                  />
                </div>
              );
            })}
            {visibleRows.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>
                {tableTitle === 'FAVORITES'
                  ? 'No Favorites yet. Star tickers from the Tickers tab to add them here.'
                  : 'No tickers'}
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    );
  };

  /* ── CSV map memoized at component level so renderFundamentalScreenerContent
   * does not rebuild it on every screener render ─────────────────────────── */
  const wlCsvMap = useMemo<Record<string, any>>(() => {
    const m: Record<string, any> = {};
    for (const row of (watchlist?.csv_data || [])) {
      const t = (row.ticker || row.Ticker || row.TICKER || row.symbol || row.Symbol || '').toString().toUpperCase();
      if (t) m[t] = row;
    }
    return m;
  }, [watchlist?.csv_data]);

  /* ── Memoized per-ticker Fundamentals view-models ─────────────────────────
   * The CSV-merge / canonical-theme-override work is done once when allStocks or
   * wlCsvMap changes — NOT repeated every time the user clicks the Fundamentals tab.
   * renderFundamentalScreenerContent just sorts and slices these pre-built models. */
  const fundRowModels = useMemo<Record<string, any>>(() => {
    const models: Record<string, any> = {};
    for (const s of allStocks) {
      const tkKey = (s.ticker || '').toString().toUpperCase();
      if (!tkKey) continue;
      const csv = wlCsvMap[tkKey] || {};
      const canonicalTheme = getWatchlistTheme(s);
      const merged: Record<string, any> = { ...csv };
      for (const [k, v] of Object.entries(s)) {
        if (v !== undefined && v !== null && v !== '') {
          merged[k] = v;
        } else if (!(k in merged)) {
          merged[k] = v;
        }
      }
      if (canonicalTheme) merged['canonical_theme_name'] = canonicalTheme;
      if (csv.industry != null) merged['csv_industry'] = csv.industry;
      else if (csv.sector != null) merged['csv_industry'] = csv.sector;
      models[tkKey] = merged;
    }
    return models;
  }, [allStocks, wlCsvMap]);

  /* ── fundamental screener content (reused in top Screener panel + formerly bottom tab) ─── */
  const renderFundamentalScreenerContent = (srcRows: typeof sortedTickers, cols: FundColDef[] = FUND_COLS, isQualityMode = false) => {
    // Look up pre-built view-models — CSV merge already done in fundRowModels useMemo.
    const fundRows = srcRows.map(s => {
      const tkKey = (s.ticker || '').toString().toUpperCase();
      return fundRowModels[tkKey] ?? { ...s };
    });

    // fundRows already arrive pre-sorted via sortedTickers — no independent re-sort needed.
    // Re-sorting here would diverge from the Technical tab's order when switching views.
    const sortedFundRows = fundRows;

    const handleFundSortLocal = (key: string) => {
      if (sortKey === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        const colFmt = cols.find(c => c.key === key)?.fmt;
        setSortDir((colFmt === 'symbol' || colFmt === 'str') ? 'asc' : 'desc');
      }
    };

    const fThClr = (key: string) => sortKey === key ? C.teal : C.dim;
    const fArr   = (key: string) => sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '';

    const TH: React.CSSProperties = {
      padding: '6px 14px', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
      textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
      cursor: 'pointer',
      background: C.card, borderBottom: `1px solid ${C.border}`,
      fontFamily: font,
    };
    const TD: React.CSSProperties = {
      padding: '7px 14px', fontSize: 10, whiteSpace: 'nowrap' as const,
      borderBottom: `1px solid ${C.border}`, fontFamily: font,
    };

    return (
      <div style={{ width: '100%' }}>
        <table style={{ borderCollapse: 'collapse' as const, minWidth: 'max-content', width: '100%' }}>
          <thead>
            <tr>
              {cols.map((col, ci) => {
                const isActive = sortKey === col.key;
                return (
                <th
                  key={col.key}
                  onClick={() => handleFundSortLocal(col.key)}
                  title={col.tooltip}
                  style={{
                    ...TH,
                    color: isActive ? '#f5f5f0' : C.dim,
                    textAlign: (ci === 0 || col.fmt === 'str') ? 'left' as const : 'right' as const,
                    position: 'sticky' as const,
                    top: 0,
                    zIndex: ci === 0 ? 3 : 2,
                    ...(col.key === 'company' ? { width: 140, minWidth: 140, maxWidth: 140 } : {}),
                    ...(col.key === 'canonical_theme_name' ? { width: 120, minWidth: 120, maxWidth: 130 } : {}),
                    ...(ci === 0 ? {
                      left: 0,
                      background: C.card,
                      boxShadow: `2px 0 4px rgba(0,0,0,0.4)`,
                    } : {}),
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {col.label}
                    <span style={{ fontSize: 8, opacity: isActive ? 1 : 0.3 }}>
                      {isActive ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </span>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedFundRows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} style={{ ...TD, textAlign: 'center' as const, color: C.dim, padding: 16 }}>
                  No tickers
                </td>
              </tr>
            ) : sortedFundRows.map((row, ri) => {
              const rowBg      = ri % 2 === 0 ? 'transparent' : `${C.border}08`;
              const rowHover   = 'rgba(255,255,255,0.03)';
              const stickyBase = ri % 2 === 0 ? C.bg : C.card;
              const setTdBgs = (el: HTMLTableRowElement, bg: string) => {
                (Array.from(el.querySelectorAll('td')) as HTMLTableCellElement[])
                  .forEach((td, i) => { td.style.background = i === 0 ? stickyBase : bg; });
              };
              const fundSym = (row.ticker || '').toString().toUpperCase();
              const fundExpanded = expandedTickers.has(fundSym);
              return (
              <Fragment key={row.ticker || String(ri)}>
              <tr
                onClick={() => row.ticker && handleTickerClick(row.ticker)}
                style={{ cursor: row.ticker ? 'pointer' : 'default', transition: 'background 0.1s' }}
                onMouseEnter={e => setTdBgs(e.currentTarget, rowHover)}
                onMouseLeave={e => setTdBgs(e.currentTarget, rowBg)}
              >
                {cols.map((col, ci) => {
                  const isFirst = ci === 0;
                  const stickyStyle: React.CSSProperties = isFirst ? {
                    position: 'sticky' as const, left: 0, zIndex: 1,
                    background: ri % 2 === 0 ? C.bg : C.card,
                    boxShadow: '2px 0 4px rgba(0,0,0,0.5)',
                  } : { background: rowBg };

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
                    const tk = (row.ticker || '').toString().toUpperCase();
                    const isFav = favoritesSet.has(tk);
                    content = (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {tk && (
                          <button
                            onClick={e => { e.stopPropagation(); e.preventDefault(); void toggleFavorite(tk); }}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, lineHeight: 1 }}
                            aria-label={isFav ? `Remove ${sym} from Favorites` : `Add ${sym} to Favorites`}
                            title={isFav ? `Remove ${sym} from Favorites` : `Add ${sym} to Favorites`}
                          >
                            <Star size={10} fill={isFav ? C.amber : 'none'} color={isFav ? C.amber : C.dim} />
                          </button>
                        )}
                        {tk && activeId && (
                          <button
                            onClick={e => { e.stopPropagation(); e.preventDefault(); setDeleteConfirm({ ticker: tk, company: row.company || row.name || null, wid: activeId }); }}
                            title={`Remove ${sym} from Watchlist`}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, lineHeight: 1, color: '#333', transition: 'color 0.15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}
                          >
                            <Trash2 size={9} />
                          </button>
                        )}
                        <span style={{ fontWeight: 800, color: '#fff' }}>{sym}</span>
                        {tk && (
                          <button
                            onClick={e => { e.stopPropagation(); toggleExpandedTicker(tk); }}
                            title={expandedTickers.has(tk) ? 'Collapse Caelyn Breakdown' : 'Expand Caelyn Breakdown'}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, color: expandedTickers.has(tk) ? C.teal : C.dim, opacity: expandedTickers.has(tk) ? 1 : 0.5, transition: 'all 0.12s' }}
                          >
                            {expandedTickers.has(tk) ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
                          </button>
                        )}
                      </span>
                    );
                    color = 'inherit';
                  } else if (col.fmt === 'str' && col.key === 'canonical_theme_name') {
                    const rowThemePending = themeAssignPendingTicker === row.ticker;
                    const rowThemeFeedback = themeAssignFeedback?.ticker === row.ticker ? themeAssignFeedback : null;
                    const fundThemeLabel = wlBuildThemeCellLabel(row, taxonomyIndex) || String(v || row.canonical_theme_name || row.section_title || row.theme || '') || null;
                    const fundThemeAddlCount = wlBuildThemeCellAdditionalCount(row);
                    const fundThemeTooltip = wlBuildThemeCellTooltip(row, taxonomyIndex);
                    content = isAdmin && row.ticker ? (
                      <span style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <button
                          onClick={e => { e.stopPropagation(); setActiveTaxonomyEditTicker(row.ticker); }}
                          onPointerDown={e => e.stopPropagation()}
                          disabled={rowThemePending}
                          title={fundThemeTooltip || (fundThemeLabel ? `Edit taxonomy: ${fundThemeLabel}` : `Assign taxonomy to ${row.ticker}`)}
                          style={{
                            background: 'none', border: 'none', padding: 0, cursor: rowThemePending ? 'default' : 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 3, overflow: 'hidden',
                            fontSize: 10, fontFamily: font,
                            color: rowThemePending ? C.dim : (fundThemeLabel ? 'rgba(255,255,255,0.50)' : C.teal),
                            opacity: rowThemePending ? 0.6 : 1,
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                            {rowThemePending ? 'Updating…' : (fundThemeLabel || '+ Assign')}
                          </span>
                          {fundThemeAddlCount > 0 && !rowThemePending && (
                            <span style={{ fontSize: 9, fontFamily: sansFont, color: C.teal, background: `${C.teal}20`, borderRadius: 10, padding: '0 4px', flexShrink: 0 }}>
                              +{fundThemeAddlCount}
                            </span>
                          )}
                          {!rowThemePending && <ChevronDown size={10} style={{ flexShrink: 0, opacity: 0.6 }} />}
                        </button>
                        {rowThemeFeedback && (
                          <span style={{ fontSize: 8.5, color: rowThemeFeedback.type === 'ok' ? C.green : C.red, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rowThemeFeedback.msg}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={fundThemeTooltip || fundThemeLabel || ''}>
                        {fundThemeLabel || 'Unassigned / Needs Theme'}
                      </span>
                    );
                    color = 'inherit';
                  } else if (col.fmt === 'str' && col.key === 'company') {
                    content = (
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 140, fontSize: 10, color: C.dim }}>
                        {v ? String(v) : '—'}
                      </span>
                    );
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
                    // Quality pct columns deliver percentage-point values — use qualFmtPct (no ×100).
                    // Identified by explicit column-key membership, not a broad cols comparison.
                    if (QUALITY_PCT_KEYS.has(col.key)) {
                      // Revision estimate columns: show Building badge when value is absent
                      // but the backend reason indicates history is still accumulating.
                      const isMissing = (v === null || v === undefined || String(v).trim() === '');
                      if (isMissing && col.key === 'revenue_estimate_revision_90d'
                          && String(row['_rev_revision_reason'] ?? '').toLowerCase() === 'history_building') {
                        content = (<span title="90-day revenue estimate history is still accumulating" style={{ fontSize: 9, color: '#64748b', cursor: 'help', background: 'rgba(100,116,139,0.1)', padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(100,116,139,0.25)' }}>Building</span>);
                        color = 'inherit';
                      } else if (isMissing && col.key === 'eps_estimate_revision_90d'
                          && String(row['_eps_revision_reason'] ?? '').toLowerCase() === 'history_building') {
                        content = (<span title="90-day EPS estimate history is still accumulating" style={{ fontSize: 9, color: '#64748b', cursor: 'help', background: 'rgba(100,116,139,0.1)', padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(100,116,139,0.25)' }}>Building</span>);
                        color = 'inherit';
                      } else {
                        const r = qualFmtPct(v, false);
                        content = r.text; color = r.clr;
                      }
                    } else {
                      const r = fundFmtPct(v);
                      content = r.text; color = r.clr;
                    }
                  } else if (col.fmt === 'ratio') {
                    // Valuation-multiple columns (P/E, P/FCF, EV/EBITDA, etc.) → N/M for
                    // null/missing, non-positive values, or when backend supplies a reason.
                    // Non-valuation ratios (Net Debt/EBITDA, Interest Coverage, etc.) render normally.
                    if (VALUATION_MULTIPLE_KEYS.has(col.key)) {
                      const nmReason = (VALUATION_NM_REASON_KEYS[col.key]
                        ? row[VALUATION_NM_REASON_KEYS[col.key]] as string | undefined
                        : undefined);
                      const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
                      const isNonPositive = !Number.isFinite(n) || n <= 0;
                      if (nmReason || isNonPositive) {
                        content = (
                          <span title={nmReason || undefined} style={{
                            fontSize: 9, color: '#64748b',
                            cursor: nmReason ? 'help' : 'default',
                            background: 'rgba(100,116,139,0.1)', padding: '1px 5px',
                            borderRadius: 3, border: '1px solid rgba(100,116,139,0.25)',
                          }}>N/M</span>
                        );
                        color = 'inherit';
                      } else {
                        const r = fundFmtRatio(v);
                        content = r; color = r === '—' ? C.dim : C.text;
                      }
                    } else {
                      const r = fundFmtRatio(v);
                      content = r; color = r === '—' ? C.dim : C.text;
                    }
                  } else if (col.fmt === 'date') {
                    const r = fundFmtDate(v);
                    content = r; color = r === '—' ? C.dim : C.text;
                  } else if (col.fmt === 'pct_rev') {
                    const r = qualFmtPct(v, true);
                    content = r.text; color = r.clr;
                  } else if (col.fmt === 'status') {
                    const r = qualFmtRunwayStatus(v);
                    const reason = row[`_${col.key}_not_meaningful_reason`] || row['_cash_runway_not_meaningful_reason'];
                    content = (
                      <span title={reason || r.tooltip} style={{
                        display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                        fontSize: 9, fontWeight: 700, background: `${r.clr}1a`,
                        border: `1px solid ${r.clr}45`, color: r.clr,
                        cursor: (reason || r.tooltip) ? 'help' : 'default', whiteSpace: 'nowrap' as const,
                      }}>{r.text}</span>
                    );
                    color = 'inherit';
                  } else if (col.fmt === 'risk') {
                    const r = qualFmtAltmanRisk(v);
                    const reason = row[`_${col.key}_not_meaningful_reason`] || row['_altman_z_not_meaningful_reason'];
                    content = (
                      <span title={reason || r.tooltip} style={{
                        display: 'inline-block', padding: '1px 6px', borderRadius: 3,
                        fontSize: 9, fontWeight: 700, background: `${r.clr}1a`,
                        border: `1px solid ${r.clr}45`, color: r.clr,
                        cursor: (reason || r.tooltip) ? 'help' : 'default', whiteSpace: 'nowrap' as const,
                      }}>{r.text}</span>
                    );
                    color = 'inherit';
                  } else if (col.fmt === 'score') {
                    const r = qualFmtPiotroski(v);
                    content = r.text; color = r.clr;
                  } else if (col.fmt === 'months') {
                    const r = qualFmtMonths(v);
                    content = r.text; color = r.clr;
                  } else if (col.fmt === 'compact' && col.key === 'net_cash_debt') {
                    const r = qualFmtCompactSigned(v);
                    content = r.text; color = r.clr;
                  }

                  // Quality threshold band colors — override formatter defaults with explicit
                  // threshold-based colors. Only in Quality mode, only for plain-text cells.
                  if (isQualityMode && color !== 'inherit') {
                    const rawN = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(/%$/, ''));
                    const bc = qualBandColor(col.key, rawN);
                    if (bc) color = bc;
                  }

                  // Generic N/M / history_building catch for non-string non-symbol Quality fields
                  if (isQualityMode && col.fmt !== 'symbol' && col.fmt !== 'str' && col.fmt !== 'status' && col.fmt !== 'risk') {
                    const sv = String(v ?? '').toLowerCase().trim();
                    if (sv === 'not_meaningful' || sv === 'nm') {
                      const reason = row[`_${col.key}_not_meaningful_reason`] || undefined;
                      content = (
                        <span title={reason || 'Not applicable for this company type'} style={{
                          fontSize: 9, color: '#64748b', cursor: reason ? 'help' : 'default',
                          background: 'rgba(100,116,139,0.1)', padding: '1px 5px',
                          borderRadius: 3, border: '1px solid rgba(100,116,139,0.25)',
                        }}>N/M</span>
                      );
                      color = 'inherit';
                    } else if (sv === 'history_building') {
                      content = (
                        <span title="≈90 days of stored consensus history required" style={{
                          fontSize: 9, color: '#64748b', cursor: 'help',
                          background: 'rgba(100,116,139,0.1)', padding: '1px 5px',
                          borderRadius: 3, border: '1px solid rgba(100,116,139,0.25)',
                        }}>Building</span>
                      );
                      color = 'inherit';
                    }
                  }

                  return (
                    <td
                      key={col.key}
                      title={col.tooltip}
                      style={{
                        ...TD, ...stickyStyle, color,
                        textAlign: (isFirst || col.fmt === 'str') ? 'left' as const : 'right' as const,
                        fontWeight: isFirst ? 700 : 400,
                        ...(col.key === 'company' ? { maxWidth: 160, overflow: 'hidden' as const } : {}),
                        ...(col.key === 'canonical_theme_name' ? { maxWidth: 130, overflow: 'hidden' as const } : {}),
                      }}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
              {fundExpanded && fundSym && (
                <tr>
                  <td colSpan={cols.length} style={{ padding: 0, background: C.bg }}>
                    <CaelynRowBreakdown stock={row} />
                  </td>
                </tr>
              )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
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
          SCREENER
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
                  aria-label={favoritesSet.has((stock.ticker || '').toUpperCase()) ? `Remove ${stock.ticker} from Favorites` : `Add ${stock.ticker} to Favorites`}
                  title={favoritesSet.has((stock.ticker || '').toUpperCase()) ? `Remove ${stock.ticker} from Favorites` : `Add ${stock.ticker} to Favorites`}
                >
                  <Star
                    size={10}
                    fill={favoritesSet.has((stock.ticker || '').toUpperCase()) ? C.amber : 'none'}
                    color={favoritesSet.has((stock.ticker || '').toUpperCase()) ? C.amber : C.dim}
                  />
                </button>
              )}
              {stock.ticker && activeId && (
                <button
                  onClick={e => { e.stopPropagation(); e.preventDefault(); setDeleteConfirm({ ticker: stock.ticker!, company: stock.company || stock.name || null, wid: activeId }); }}
                  title={`Remove ${stock.ticker} from Watchlist`}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, lineHeight: 1, color: '#333', transition: 'color 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333'; }}
                >
                  <Trash2 size={9} />
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

  /* ── loading state: metas not yet resolved (no cached data) ─────── */
  if (wlMetasLoading && !wlMetas) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="wl-spin" style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.55)', borderRadius: '50%' }} />
      </div>
    );
  }

  /* ── error state: failed with no cached data ─────────────────────── */
  if (wlMetasError && !wlMetas) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
        {renderTabBar()}
        {renderAddPanel()}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ fontSize: 13, color: C.dim, fontFamily: font, marginBottom: 12 }}>Unable to load watchlist.</div>
            <button
              onClick={() => refetchMetas()}
              style={{ fontSize: 11, fontWeight: 700, fontFamily: font, color: C.teal, background: 'transparent', border: `1px solid ${C.teal}40`, borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── true empty state: metas loaded successfully but no watchlists ── */
  if (!wlMetasLoading && wlMetas && wlMetas.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: font, display: 'flex', flexDirection: 'column' }}>
        {renderTabBar()}
        {renderAddPanel()}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ fontFamily: font, fontSize: 14, color: C.dim, lineHeight: 2.2, textAlign: 'center' as const }}>
            <div>No watchlist loaded.</div>
            <div>Click <span style={{ color: 'rgba(255,255,255,0.70)' }}>+</span> above to add one.</div>
          </div>
        </div>
      </div>
    );
  }

  /* ── watchlist data still loading (activeId set, data in flight) ─── */
  if (activeId && wlLoading && !watchlist) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="wl-spin" style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.12)', borderTopColor: 'rgba(255,255,255,0.55)', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: font, display: 'flex', flexDirection: 'column' }}>

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
            {activeId && (() => {
              const searchResults = secSearchData?.results ?? [];
              const isAlreadyInWl = selectedSecurity
                ? currentTickerSet.has(selectedSecurity.canonical_ticker.toUpperCase())
                : false;
              const addDisabled = !selectedSecurity || addSecurityMut.isPending || isAlreadyInWl;

              const handleSelectSecurity = (s: typeof searchResults[0]) => {
                setSelectedSecurity(s);
                setAddTickerInput(s.canonical_ticker);
                setSuggestionsOpen(false);
                setHighlightedIdx(-1);
              };

              const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (!suggestionsOpen || searchResults.length === 0) {
                  if (e.key === 'Enter' && selectedSecurity && !addDisabled) {
                    e.preventDefault();
                    addSecurityMut.mutate({ wid: activeId!, security: selectedSecurity });
                  }
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIdx(prev => Math.min(prev + 1, searchResults.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIdx(prev => Math.max(prev - 1, -1));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (highlightedIdx >= 0 && searchResults[highlightedIdx]) {
                    handleSelectSecurity(searchResults[highlightedIdx]);
                  }
                } else if (e.key === 'Escape') {
                  setSuggestionsOpen(false);
                  setHighlightedIdx(-1);
                }
              };

              const inputBorderColor = addTickerStatus === 'success' ? `${C.green}60`
                : addTickerStatus === 'error' ? `${C.red}60`
                : addTickerStatus === 'duplicate' ? `${C.amber}60`
                : selectedSecurity ? `${C.teal}80`
                : C.border;
              const inputBg = addTickerStatus === 'success' ? `${C.green}15`
                : addTickerStatus === 'error' ? `${C.red}15`
                : addTickerStatus === 'duplicate' ? `${C.amber}15`
                : selectedSecurity ? `${C.teal}08` : C.card2;
              const inputColor = addTickerStatus === 'success' ? C.green
                : addTickerStatus === 'error' ? C.red
                : addTickerStatus === 'duplicate' ? C.amber
                : selectedSecurity ? '#fff' : C.dim;

              const showDropdown = suggestionsOpen && !selectedSecurity && (
                secSearchLoading || secSearchError ||
                (searchResults.length > 0) ||
                (debouncedSearch.length > 0 && !secSearchLoading && !secSearchError)
              );

              return (
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {/* Search input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={addInputRef}
                      type="text"
                      value={addTickerInput}
                      onChange={e => {
                        const v = e.target.value;
                        setAddTickerInput(v);
                        setAddTickerStatus(null);
                        setAddStatusMsg('');
                        if (selectedSecurity) setSelectedSecurity(null);
                        setSuggestionsOpen(true);
                        setHighlightedIdx(-1);
                      }}
                      onFocus={() => { if (!selectedSecurity) setSuggestionsOpen(true); }}
                      onBlur={() => { setTimeout(() => setSuggestionsOpen(false), 180); }}
                      onKeyDown={handleInputKeyDown}
                      placeholder="Search security…"
                      disabled={addSecurityMut.isPending}
                      autoComplete="off"
                      style={{
                        width: 148,
                        height: 26,
                        padding: '0 8px',
                        borderRadius: 4,
                        background: inputBg,
                        border: `1px solid ${inputBorderColor}`,
                        color: inputColor,
                        fontFamily: font,
                        fontSize: 10,
                        outline: 'none',
                        transition: 'border-color 0.15s, background 0.15s',
                        opacity: addSecurityMut.isPending ? 0.6 : 1,
                      }}
                    />
                    {/* Autocomplete dropdown */}
                    {showDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: 3, zIndex: 200,
                        width: 360, maxHeight: 260, overflowY: 'auto',
                        background: '#0a0a12', border: `1px solid ${C.border}`,
                        borderRadius: 5, boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
                      }}>
                        {secSearchLoading && (
                          <div style={{ padding: '10px 12px', fontSize: 10, color: C.dim, fontFamily: font }}>
                            Searching securities…
                          </div>
                        )}
                        {secSearchError && !secSearchLoading && (
                          <div style={{ padding: '10px 12px', fontSize: 10, color: C.red, fontFamily: font }}>
                            Security search unavailable. Try again.
                          </div>
                        )}
                        {!secSearchLoading && !secSearchError && searchResults.length === 0 && debouncedSearch.length > 0 && (
                          <div style={{ padding: '10px 12px', fontSize: 10, color: C.dim, fontFamily: font }}>
                            No matching securities found.
                          </div>
                        )}
                        {!secSearchLoading && !secSearchError && searchResults.map((r, idx) => {
                          const inWl = currentTickerSet.has(r.canonical_ticker.toUpperCase());
                          const isHl = idx === highlightedIdx;
                          const exLabel = r.exchange_short_name || r.provider_exchange || '';
                          const country = r.country ? ` · ${r.country}` : '';
                          return (
                            <div
                              key={r.canonical_ticker + idx}
                              onMouseDown={() => handleSelectSecurity(r)}
                              onMouseEnter={() => setHighlightedIdx(idx)}
                              style={{
                                padding: '7px 12px',
                                cursor: 'pointer',
                                background: isHl ? 'rgba(255,255,255,0.06)' : 'transparent',
                                borderBottom: `1px solid ${C.border}28`,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                              }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontFamily: font, fontWeight: 800, fontSize: 11, color: '#fff', letterSpacing: '0.04em' }}>
                                    {r.canonical_ticker}
                                  </span>
                                  {inWl && (
                                    <span style={{ fontSize: 7, fontWeight: 700, color: C.teal, background: `${C.teal}18`, border: `1px solid ${C.teal}40`, padding: '1px 5px', borderRadius: 3, letterSpacing: '0.06em' }}>
                                      IN WATCHLIST
                                    </span>
                                  )}
                                </div>
                                {r.company_name && (
                                  <div style={{ fontSize: 10, color: C.text, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {r.company_name}
                                  </div>
                                )}
                                <div style={{ fontSize: 9, color: '#484848', marginTop: 1 }}>
                                  {exLabel}{country}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Add button — enabled only when security selected */}
                  <button
                    disabled={addDisabled}
                    onClick={() => {
                      if (selectedSecurity && activeId && !addDisabled) {
                        addSecurityMut.mutate({ wid: activeId, security: selectedSecurity });
                      }
                    }}
                    style={{
                      height: 26, padding: '0 10px', borderRadius: 4, flexShrink: 0,
                      background: addDisabled ? 'transparent' : `${C.teal}22`,
                      border: `1px solid ${addDisabled ? C.border : `${C.teal}60`}`,
                      color: addTickerStatus === 'success' ? C.green
                        : addTickerStatus === 'error' ? C.red
                        : addTickerStatus === 'duplicate' ? C.amber
                        : addDisabled ? '#333' : C.teal,
                      fontFamily: font, fontSize: 10, fontWeight: 700,
                      cursor: addDisabled ? 'default' : 'pointer',
                      transition: 'all 0.15s', whiteSpace: 'nowrap',
                    }}
                  >
                    {addSecurityMut.isPending ? 'Adding…'
                      : addTickerStatus === 'success' ? `✓ ${addStatusMsg}`
                      : addTickerStatus === 'duplicate' ? `= ${addStatusMsg}`
                      : addTickerStatus === 'error' ? '✕ Failed'
                      : 'Add'}
                  </button>
                </div>
              );
            })()}

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
                playbooks={strategyPlaybooks.map(p =>
                  STRATEGY_DISPLAY[p.id] ? { ...p, short_label: STRATEGY_DISPLAY[p.id].label } : p
                )}
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

            {/* Right: status + history + refresh */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {/* Agent analysis running in background — non-error state */}
              {refreshStatus === 'running' && !refreshMut.isPending && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 4,
                  background: `${C.teal}10`, border: `1px solid ${C.teal}30`,
                }}>
                  <div className="wl-spin" style={{ width: 10, height: 10, border: `2px solid ${C.teal}30`, borderTopColor: C.teal, borderRadius: '50%', flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: C.teal, fontFamily: sansFont }}>
                    Agent analysis running…
                  </span>
                </div>
              )}
              {refreshError && !refreshMut.isPending && refreshStatus !== 'running' && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 4,
                  background: `${C.red}12`, border: `1px solid ${C.red}30`,
                  maxWidth: 280,
                }}>
                  <span style={{ fontSize: 9, color: C.red, fontFamily: font, fontWeight: 700 }}>✕</span>
                  <span style={{ fontSize: 9, color: C.red, fontFamily: sansFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                    {refreshError}
                  </span>
                  <button onClick={() => setRefreshError(null)} style={{ background: 'none', border: 'none', color: C.red, cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1, flexShrink: 0 }}>×</button>
                </div>
              )}
              {lastUpdated && !refreshError && selectedStrategy === 'default' && (
                <span style={{ fontSize: 10, color: C.dim }}>
                  Last analyzed: {timeAgo(lastUpdated)}
                </span>
              )}

              {/* 📜 Report history button — Part D */}
              <button
                onClick={openReportHistory}
                title="View saved strategy reports"
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: 4,
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.dim, fontSize: 13,
                  cursor: 'pointer', transition: 'border-color 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = C.teal)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
              >
                📜
              </button>

              {/* Refresh / Generate Report button */}
              {selectedStrategy === 'default' ? (
                <button
                  title="Select Bottlenecks or Asymmetry to generate a strategy report"
                  disabled
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 4,
                    background: 'transparent',
                    border: `1px solid ${C.border}`,
                    color: C.dim, fontSize: 10, fontWeight: 700,
                    fontFamily: font, cursor: 'not-allowed',
                    letterSpacing: '0.04em', opacity: 0.5,
                  }}
                >
                  <RefreshCw style={{ width: 11, height: 11 }} />
                  REPORT
                </button>
              ) : (
                <button
                  onClick={generateStrategyReport}
                  disabled={strategyReportModal.loading}
                  title={`Generate ${STRATEGY_DISPLAY[selectedStrategy]?.label ?? selectedStrategy} report for this watchlist`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 12px', borderRadius: 4,
                    background: strategyReportModal.loading ? `rgba(99,102,241,0.15)` : 'transparent',
                    border: `1px solid rgba(99,102,241,0.5)`,
                    color: '#a5b4fc', fontSize: 10, fontWeight: 700,
                    fontFamily: font,
                    cursor: strategyReportModal.loading ? 'not-allowed' : 'pointer',
                    opacity: strategyReportModal.loading ? 0.7 : 1,
                    letterSpacing: '0.04em',
                  }}
                >
                  <RefreshCw
                    style={{ width: 11, height: 11 }}
                    className={strategyReportModal.loading ? 'wl-spin' : ''}
                  />
                  {strategyReportModal.loading ? 'GENERATING...' : '⟳ REPORT'}
                </button>
              )}
            </div>
          </div>

          {/* ═══ MAIN BODY (scrollable) ═══ */}
          <div style={{ flex: 1, overflowY: 'auto' }} className="wl-scrollbar">

            {/* ── Upgrade Banner (legacy → new format) ── */}
            {renderUpgradeBanner()}

            {/* ── Market Themes Banner (chips) ── */}
            {renderTaxonomyBar()}

            {/* ── Top Split: Ticker Table + Live News (fixed viewport-aware height) ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 270px)',
              gap: 12,
              padding: '14px 20px 16px',
              height: 'clamp(360px, 50vh, 620px)',
            }}
              className="wl-top-split"
            >
              {/* ── Ticker Table (wider) ── */}
              {/* Show new-format table whenever we have saved symbols — covers pending state (no sections yet) */}
              {innerView === 'close-watch'
                ? renderNewFormatTickerTable({ rows: closeWatchTickers, title: 'FAVORITES' })
                : (newFmt || displayRows.length > 0 || wlLoading || wlFetching) ? renderNewFormatTickerTable() : renderLegacyTickerTable()
              }

              {/* ── Live News (narrower) — three-toggle card ── */}
              <div style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 6,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                height: '100%', minHeight: 0,
              }}>
                {/* Header: title + status */}
                <div style={{
                  padding: '9px 14px 8px', borderBottom: `1px solid ${C.border}`,
                  display: 'flex', flexDirection: 'column', gap: 7, flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', letterSpacing: '0.1em' }}>
                      LIVE NEWS
                    </span>
                    <span style={{ fontSize: 9, color: C.dim }}>
                      ({newsView === 'activity' ? activityViewCount : newsView === 'all' ? allNewsViewCount : hyperscalerViewCount})
                    </span>
                    {newsCacheAge !== null && (
                      <span style={{ fontSize: 9, color: C.dim }}>
                        · Updated {newsCacheAge < 60
                          ? `${newsCacheAge}s ago`
                          : `${Math.round(newsCacheAge / 60)} min ago`}
                      </span>
                    )}
                    {(newsIsBuilding || newsFetching) && (
                      <span style={{
                        marginLeft: 'auto', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em',
                        padding: '2px 6px', borderRadius: 3,
                        color: C.teal, background: C.teal + '18', border: `1px solid ${C.teal}30`,
                        textTransform: 'uppercase' as const,
                      }}>
                        Refreshing…
                      </span>
                    )}
                  </div>
                  {/* Toggle row — Part D */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                    {(['activity', 'all', 'hyperscaler'] as NewsView[]).map(v => {
                      const labels: Record<NewsView, string> = {
                        activity: 'ACTIVITY',
                        all: 'ALL NEWS',
                        hyperscaler: 'HYPERSCALER DEALS',
                      };
                      const active = newsView === v;
                      return (
                        <button
                          key={v}
                          onClick={() => setNewsView(v)}
                          style={{
                            fontSize: 8, fontWeight: 700, letterSpacing: '0.07em',
                            padding: '3px 7px', borderRadius: 3, fontFamily: font,
                            color: active ? C.teal : C.dim,
                            background: active ? `${C.teal}14` : 'transparent',
                            border: `1px solid ${active ? `${C.teal}40` : C.border}`,
                            cursor: 'pointer', textTransform: 'uppercase' as const,
                            transition: 'all 0.1s',
                          }}
                        >
                          {labels[v]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Body — Part E / H / I */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '2px 0', minHeight: 0 }} className="wl-scrollbar">

                  {/* ── Error state — Part B ── */}
                  {newsIsError && (
                    <div style={{
                      margin: 12, padding: '10px 14px', borderRadius: 4,
                      background: '#ef444412', border: '1px solid #ef444430',
                      fontSize: 10, color: '#ef4444', fontFamily: font,
                    }}>
                      News data unavailable — server error. Will retry automatically.
                    </div>
                  )}

                  {/* ── NEWS ACTIVITY — 48H semantics + NEWS/MC ── */}
                  {!newsIsError && newsView === 'activity' && (() => {
                    const tickerSet = new Set(allTickerSymbols.map((t: string) => t.toUpperCase()));
                    const activityRows = (newsData?.ticker_activity ?? []).filter(
                      r => tickerSet.size === 0 || tickerSet.has(r.ticker.toUpperCase())
                    );

                    // Enrich rows with locally-derived NEWS/MC
                    const fmtNewsMc = (v: number | null): string => {
                      if (v == null) return '—';
                      if (v === 0) return '0.0';
                      if (v >= 0.1) return v.toFixed(1);
                      return v.toFixed(2);
                    };

                    type EnrichedRow = NewsActivityItem & { _newsMc: number | null };
                    const enriched: EnrichedRow[] = activityRows.map(row => {
                      const mc = mcByTicker.get(String(row.ticker || '').trim().toUpperCase());
                      const a48 = row.articles_48h;
                      const _newsMc = (a48 != null && mc != null && isFinite(mc) && mc > 0)
                        ? (a48 * 1_000_000_000) / mc
                        : null;
                      return { ...row, _newsMc };
                    });

                    const sorted = [...enriched].sort((a, b) => {
                      const { key, dir } = activitySort;
                      let av: any, bv: any;
                      if (key === 'ticker')        { av = a.ticker;      bv = b.ticker; }
                      else if (key === 'articles_48h') { av = a.articles_48h; bv = b.articles_48h; }
                      else if (key === 'news_mc')   { av = a._newsMc;    bv = b._newsMc; }
                      else                          { av = a.delta_count; bv = b.delta_count; }
                      if (av == null && bv == null) return 0;
                      if (av == null) return 1;
                      if (bv == null) return -1;
                      if (key === 'ticker') return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
                      return dir === 'asc' ? av - bv : bv - av;
                    });

                    const toggleSort = (k: ActivitySortKey) => {
                      setActivitySort(prev => {
                        if (prev.key !== k) return { key: k, dir: k === 'ticker' ? 'asc' : 'desc' };
                        return { key: k, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
                      });
                    };

                    const fmtDelta = (row: NewsActivityItem): { text: string; color: string } => {
                      const s = row.coverage_status;
                      if (s === 'warming' || s === 'stale' || s === 'provider_partial') return { text: '—', color: C.dim };
                      if (row.delta_count == null) return { text: '—', color: C.dim };
                      const dc = row.delta_count;
                      if (row.delta_label === 'new') return { text: `+${dc} (NEW)`, color: C.teal };
                      if (row.delta_pct != null && isFinite(row.delta_pct) && !isNaN(row.delta_pct)) {
                        const sign = dc > 0 ? '+' : '';
                        const pSign = dc > 0 ? '+' : '';
                        return { text: `${sign}${dc} (${pSign}${row.delta_pct.toFixed(1)}%)`, color: dc > 0 ? '#22c55e' : dc < 0 ? '#ef4444' : C.dim };
                      }
                      const sign = dc > 0 ? '+' : '';
                      return { text: `${sign}${dc}`, color: dc > 0 ? '#22c55e' : dc < 0 ? '#ef4444' : C.dim };
                    };

                    const thStyle = (k: ActivitySortKey, align: 'left' | 'right'): React.CSSProperties => ({
                      padding: '4px 5px', fontSize: 8, fontWeight: 700, letterSpacing: '0.07em',
                      color: activitySort.key === k ? C.teal : C.dim,
                      textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none',
                      background: '#ffffff04', whiteSpace: 'nowrap',
                      borderBottom: `1px solid ${C.border}`,
                      textAlign: align, fontFamily: font,
                    });

                    return activityRows.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>
                        {newsFetching ? 'Loading activity data…' : 'No news activity data available yet.'}
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={thStyle('ticker', 'left')} onClick={() => toggleSort('ticker')}>
                              TICKER{activitySort.key === 'ticker' ? (activitySort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th style={thStyle('articles_48h', 'right')} onClick={() => toggleSort('articles_48h')}>
                              48H NEWS{activitySort.key === 'articles_48h' ? (activitySort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th
                              style={{ ...thStyle('news_mc', 'right'), maxWidth: 60 }}
                              onClick={() => toggleSort('news_mc')}
                              title="Unique Yahoo + Google RSS articles in the last 48 hours per $1B of market cap"
                            >
                              NEWS/MC{activitySort.key === 'news_mc' ? (activitySort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                            <th style={thStyle('delta_count', 'right')} onClick={() => toggleSort('delta_count')}>
                              48H Δ{activitySort.key === 'delta_count' ? (activitySort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map(row => {
                            const delta = fmtDelta(row);
                            const tickerStock = allStocks.find(s => (s.ticker || '').toUpperCase() === row.ticker.toUpperCase());
                            const col = newFmt
                              ? (tickerStock?.section_id ? sectionAccent(tickerStock.section_id) : C.teal)
                              : C.teal;
                            return (
                              <tr
                                key={row.ticker}
                                style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#ffffff06'}
                                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                                onClick={() => handleTickerClick(row.ticker)}
                              >
                                <td style={{ padding: '5px 5px' }}>
                                  <span style={{
                                    fontSize: 9, fontWeight: 800, fontFamily: font,
                                    padding: '2px 5px', borderRadius: 3,
                                    color: col, background: col + '15', border: `1px solid ${col}25`,
                                    textTransform: 'uppercase',
                                  }}>
                                    {row.ticker}
                                  </span>
                                </td>
                                <td style={{ padding: '5px 5px', textAlign: 'right', fontSize: 10, color: row.articles_48h != null ? C.text : C.dim, fontFamily: font }}>
                                  {row.articles_48h != null ? row.articles_48h : '—'}
                                </td>
                                <td style={{ padding: '5px 5px', textAlign: 'right', fontSize: 10, color: row._newsMc != null ? C.text : C.dim, fontFamily: font }}>
                                  {fmtNewsMc(row._newsMc)}
                                </td>
                                <td style={{ padding: '5px 5px', textAlign: 'right', fontSize: 10, color: delta.color, fontFamily: font, whiteSpace: 'nowrap' }}>
                                  {delta.text}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}

                  {/* ── ALL NEWS — Part H ── */}
                  {!newsIsError && newsView === 'all' && (() => {
                    const tickerSet = new Set(allTickerSymbols.map((t: string) => t.toUpperCase()));
                    const visibleNews = tickerSet.size > 0
                      ? allNews.filter(item => tickerSet.has((item.ticker || '').toUpperCase()))
                      : allNews;
                    return (
                      <>
                        {visibleNews.map((item, i) => {
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
                                padding: '9px 14px', borderBottom: `1px solid ${C.border}`,
                                borderLeft: impactCol ? `2px solid ${impactCol}35` : undefined,
                                textDecoration: 'none', cursor: 'pointer', transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = `${C.teal}08`}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {item.ticker && (
                                <span style={{
                                  flexShrink: 0, fontSize: 8, fontWeight: 800, fontFamily: font,
                                  padding: '2px 7px', borderRadius: 3,
                                  color: col, background: col + '15', border: `1px solid ${col}25`,
                                  textTransform: 'uppercase' as const,
                                }}>
                                  {item.ticker}
                                </span>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                {(item.catalyst_type || item.signal_strength || (item.bull_bear_impact && item.bull_bear_impact !== 'neutral' && item.bull_bear_impact !== 'unknown')) && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, marginBottom: 4 }}>
                                    {item.catalyst_type && (
                                      <span style={{ fontSize: 8, fontWeight: 700, fontFamily: font, padding: '1px 5px', borderRadius: 3, color: C.amber, background: C.amber + '15', border: `1px solid ${C.amber}25`, textTransform: 'uppercase' as const, letterSpacing: '0.07em' }}>
                                        {item.catalyst_type}
                                      </span>
                                    )}
                                    {item.bull_bear_impact && item.bull_bear_impact !== 'neutral' && item.bull_bear_impact !== 'unknown' && impactCol && (
                                      <span style={{ fontSize: 8, fontWeight: 600, fontFamily: font, padding: '1px 5px', borderRadius: 3, color: impactCol, background: impactCol + '12', border: `1px solid ${impactCol}22`, textTransform: 'capitalize' as const }}>
                                        {item.bull_bear_impact}
                                      </span>
                                    )}
                                    {item.signal_strength && (
                                      <span style={{ fontSize: 8, fontWeight: 600, fontFamily: font, padding: '1px 5px', borderRadius: 3, color: C.dim, background: '#ffffff08', border: `1px solid ${C.border}`, textTransform: 'capitalize' as const }}>
                                        {item.signal_strength}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div style={{ fontSize: 11, color: C.text, lineHeight: 1.4, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                                  {item.title}
                                </div>
                                {item.why_it_matters && (
                                  <div style={{ fontSize: 10, color: C.dim, fontFamily: font, lineHeight: 1.35, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', fontStyle: 'italic' }}>
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
                        {visibleNews.length === 0 && !newsIsBuilding && !newsFetching && (
                          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>
                            {watchlist?.analysis ? 'No news available yet' : 'No news available'}
                          </div>
                        )}
                        {visibleNews.length === 0 && (newsIsBuilding || newsFetching) && (
                          <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>Building news feed…</div>
                        )}
                      </>
                    );
                  })()}

                  {/* ── HYPERSCALER DEALS — highlighted_tickers + watchlist scoping ── */}
                  {!newsIsError && newsView === 'hyperscaler' && (() => {
                    const tickerSet = new Set(allTickerSymbols.map((t: string) => t.toUpperCase()));

                    // Part K — scope filter: match via watchlist_symbols or highlighted watchlist role
                    const hyperItems = (newsData?.hyperscaler_articles ?? []).filter(a => {
                      const wlSyms: string[] = a.watchlist_symbols?.length
                        ? a.watchlist_symbols
                        : (a.highlighted_tickers ?? []).filter(x => x.role === 'watchlist').map(x => x.ticker);
                      // If no watchlist symbols on the article, show regardless (general hyperscaler news)
                      // Backend already scoped by wid, so treat empty wlSyms as "matches all"
                      return wlSyms.length === 0 ||
                        wlSyms.some(s => tickerSet.size === 0 || tickerSet.has(String(s || '').trim().toUpperCase()));
                    });
                    // Preserve backend ordering (Part M)

                    const impactColor = (impact?: string) =>
                      impact === 'bullish' ? '#22c55e' : impact === 'bearish' ? '#ef4444' : impact === 'mixed' ? '#f59e0b' : C.dim;

                    return hyperItems.length === 0 ? (
                      <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim }}>
                        {newsFetching ? 'Loading hyperscaler deals…' : 'No hyperscaler deal or partnership news detected for this Watchlist.'}
                      </div>
                    ) : (
                      <>
                        {hyperItems.map((item, i) => {
                          const col = impactColor(item.bull_bear_impact);
                          const highlighted = item.highlighted_tickers ?? [];
                          const wlBadges  = highlighted.filter(x => x.role === 'watchlist');
                          const anchorBadges = highlighted.filter(x => x.role === 'anchor');
                          return (
                            <a
                              key={`hyper-${i}`}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'block', padding: '9px 14px',
                                borderBottom: `1px solid ${C.border}`,
                                borderLeft: `2px solid ${col}40`,
                                textDecoration: 'none', cursor: 'pointer', transition: 'background 0.1s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = `${col}06`}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {/* ── Catalyst + impact badges row ── */}
                              <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 4, marginBottom: 5 }}>
                                <span style={{ fontSize: 8, fontWeight: 700, fontFamily: font, padding: '2px 6px', borderRadius: 3, color: C.teal, background: C.teal + '18', border: `1px solid ${C.teal}30`, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
                                  Hyperscaler Deal
                                </span>
                                {item.bull_bear_impact && item.bull_bear_impact !== 'neutral' && item.bull_bear_impact !== 'unknown' && (
                                  <span style={{ fontSize: 8, fontWeight: 600, fontFamily: font, padding: '2px 5px', borderRadius: 3, color: col, background: col + '10', border: `1px solid ${col}20`, textTransform: 'capitalize' as const }}>
                                    {item.bull_bear_impact}
                                  </span>
                                )}
                                <ExternalLink style={{ width: 9, height: 9, color: C.dim, marginLeft: 'auto' }} />
                              </div>

                              {/* ── Part I/J: highlighted ticker badges — watchlist then anchor ── */}
                              {highlighted.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 6 }}>
                                  {wlBadges.map(ht => {
                                    const inWl = tickerSet.has(ht.ticker.toUpperCase());
                                    return (
                                      <span
                                        key={`wl-${ht.ticker}`}
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); if (inWl) handleTickerClick(ht.ticker); }}
                                        style={{
                                          fontSize: 9, fontWeight: 800, fontFamily: font,
                                          padding: '2px 7px', borderRadius: 3,
                                          color: C.teal, background: C.teal + '18', border: `1px solid ${C.teal}35`,
                                          textTransform: 'uppercase' as const,
                                          cursor: inWl ? 'pointer' : 'default',
                                        }}
                                      >
                                        {ht.ticker}
                                      </span>
                                    );
                                  })}
                                  {anchorBadges.map(ht => {
                                    const inWl = tickerSet.has(ht.ticker.toUpperCase());
                                    return (
                                      <span
                                        key={`anc-${ht.ticker}`}
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); if (inWl) handleTickerClick(ht.ticker); }}
                                        style={{
                                          fontSize: 8, fontWeight: 700, fontFamily: font,
                                          padding: '2px 6px', borderRadius: 3,
                                          color: C.amber, background: C.amber + '14', border: `1px solid ${C.amber}30`,
                                          textTransform: 'uppercase' as const,
                                          cursor: inWl ? 'pointer' : 'default',
                                          display: 'inline-flex', alignItems: 'center', gap: 3,
                                        }}
                                      >
                                        {ht.ticker}
                                        <span style={{ fontSize: 7, fontWeight: 600, letterSpacing: '0.06em', color: C.amber + 'cc' }}>ANCHOR</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* ── Title ── */}
                              <div style={{ fontSize: 11, color: C.text, fontFamily: font, lineHeight: 1.4, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                                {item.title}
                              </div>
                              {item.why_it_matters && (
                                <div style={{ fontSize: 10, color: C.dim, fontFamily: font, lineHeight: 1.35, marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden', fontStyle: 'italic' }}>
                                  {item.why_it_matters}
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {item.source && <span style={{ fontSize: 9, color: C.dim }}>{item.source}</span>}
                                {item.published_at && <span style={{ fontSize: 9, color: C.dim }}>{timeAgo(item.published_at)}</span>}
                              </div>
                            </a>
                          );
                        })}
                      </>
                    );
                  })()}

                </div>
              </div>
            </div>

            {/* ── Upcoming Earnings ── */}
            {renderEarningsSection()}

            {/* ── Strategy Score Panel ── */}
            {selectedStrategy !== 'default' && (strategyScoreData || strategyScoreLoading) && (
              <div style={{ padding: '0 20px' }}>
                {strategyScoreLoading && !strategyScoreData ? (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 11, color: C.dim, fontFamily: font }}>
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
            <div style={{ padding: '10px 20px 2px', display: 'flex', alignItems: 'center', gap: 5 }}>
              {/* SETUPS group */}
              <span style={{ fontSize: 7, fontWeight: 700, color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase' as const, opacity: 0.5 }}>Setups</span>
              {(['golden', 'hciz', 'hctz', 'gromo'] as const).map(v => {
                const isActive = bottomView === v;
                const ac = v === 'golden' ? '#f59e0b' : v === 'gromo' ? '#3b82f6' : v === 'hciz' ? '#a855f7' : '#22c55e';
                return (
                  <button key={v} onClick={() => setBottomView(v)} style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
                    textTransform: 'uppercase' as const, fontFamily: font,
                    background: isActive ? `${ac}18` : 'transparent',
                    color: isActive ? ac : C.dim,
                    border: `1px solid ${isActive ? `${ac}60` : C.border}`,
                    transition: 'all 0.12s',
                  }}>
                    {v === 'golden' ? 'Golden Zone' : v === 'gromo' ? 'Growth Momentum' : v === 'hciz' ? 'HC Investment Zone' : 'HC Trade Zone'}
                  </button>
                );
              })}
              {/* spacer pushes performance group to the right */}
              <span style={{ flex: 1 }} />
              {/* PERFORMANCE GROUPINGS group */}
              <span style={{ fontSize: 7, fontWeight: 700, color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase' as const, opacity: 0.5 }}>Performance Groupings</span>
              {(['fundGrouping', 'themes', 'marketcap'] as const).map(v => {
                const isActive = bottomView === v;
                const ac = C.teal;
                return (
                  <button key={v} onClick={() => setBottomView(v)} style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    padding: '3px 10px', borderRadius: 3, cursor: 'pointer',
                    textTransform: 'uppercase' as const, fontFamily: font,
                    background: isActive ? `${ac}18` : 'transparent',
                    color: isActive ? ac : C.dim,
                    border: `1px solid ${isActive ? `${ac}60` : C.border}`,
                    transition: 'all 0.12s',
                  }}>
                    {v === 'fundGrouping' ? 'Fundamental' : v === 'themes' ? 'Theme' : 'Market Cap'}
                  </button>
                );
              })}
            </div>

            {/* ── Canonical theme section cards / Market Cap buckets / Fundamentals ── */}
            <div style={{ padding: '4px 20px 24px', position: 'relative', minHeight: refreshMut.isPending && bottomView === 'themes' ? 280 : undefined }}>
              {(() => {
                /* ── THEMES (backend-authoritative performance/theme endpoint) ── */
                if (bottomView === 'themes') {
                  return (
                    <ThemePerformanceGroupings
                      resp={themePerfResp}
                      isLoading={themePerfLoading}
                      isError={themePerfIsError}
                      onTickerClick={handleTickerClick}
                    />
                  );
                }

                /* ── MARKET CAP ── */
                if (bottomView === 'marketcap') {
                const mcTickers = (innerView === 'close-watch' ? closeWatchTickers : sortedTickers)
                  .filter(s => {
                    const mc = Number(s.market_cap);
                    return Number.isFinite(mc) && mc > 0;
                  });
                const buckets: { label: string; sub: string; min: number; max: number; color: string }[] = [
                  { label: 'Large Cap', sub: '$100B+',     min: 100_000_000_000, max: Infinity,          color: '#22c55e' },
                  { label: 'Mid-Cap',   sub: '$10B–$100B', min: 10_000_000_000,  max: 100_000_000_000,   color: '#3b82f6' },
                  { label: 'Small Cap', sub: '$1B–$10B',   min: 1_000_000_000,   max: 10_000_000_000,    color: '#a855f7' },
                  { label: 'Micro Cap', sub: '<$1B',       min: 0,               max: 1_000_000_000,     color: '#f59e0b' },
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
                      const mcAvg = fmtAvgChg(avgDailyChangePct(rows));
                      return (
                        <div
                          key={bucket.label}
                          style={{ flex: '1 1 200px', minWidth: 180, background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${bucket.color}`, borderRadius: 6, overflow: 'hidden' }}
                        >
                          {/* bucket header */}
                          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: `${bucket.color}10` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: bucket.color, letterSpacing: '0.06em' }}>{bucket.label}</span>
                              <span style={{ fontSize: 10, fontWeight: 800, color: mcAvg.color, fontFamily: font, flexShrink: 0 }}>{mcAvg.text}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 8, color: C.dim }}>{bucket.sub}</span>
                              <span style={{ fontSize: 8, color: C.dim, marginLeft: 'auto' }}>{rows.length}</span>
                            </div>
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
                                  <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{s.ticker || DASH}</span>
                                  <span style={{ fontSize: 10, color: C.text, fontFamily: font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{formatPrice(s.price)}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: cClr, fontFamily: font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{formatChgPct(chg)}</span>
                                  <span style={{ fontSize: 10, color: C.text, fontFamily: font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{vx}</span>
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
                if (bottomView !== 'fundGrouping' && bottomView !== 'hciz' && bottomView !== 'hctz' && bottomView !== 'golden' && bottomView !== 'gromo') return null;

                const srcTickers = innerView === 'close-watch' ? closeWatchTickers : sortedTickers;

                /* ── HIGH CONVICTION TRADE ZONE ── early return; no CSV merge needed */
                if (bottomView === 'hctz') {
                  const tCtx = buildTradeContext(srcTickers);
                  type TzRow = typeof srcTickers[0] & {
                    _score: number; _optScore: number | null; _volxVal: number | null;
                    _stageLabel: string; _volxStr: number; _volMcStr: number; _optStr: number;
                    _tags: Array<{ label: string; pos: boolean }>;
                  };
                  // Score all early-stage candidates
                  type Candidate = TzRow & { _hasLoudSignal: boolean };
                  const candidates: Candidate[] = [];
                  for (const r of srcTickers) {
                    const { score, optStrength, volxStrength, volMcStrength, optScore, volxVal, stageLabel, hasLoudSignal } =
                      scoreTradeConfluence(r, tCtx);
                    if (!isHcizStage(stageLabel)) continue; // stage mandatory
                    candidates.push({
                      ...r,
                      _score: score,
                      _optScore: optScore,
                      _volxVal: volxVal,
                      _stageLabel: stageLabel,
                      _volxStr: volxStrength,
                      _volMcStr: volMcStrength,
                      _optStr: optStrength,
                      _hasLoudSignal: hasLoudSignal,
                      _tags: [],
                    });
                  }
                  candidates.sort((a, b) => b._score - a._score);

                  // Qualification: (loud signal + score >= 55) OR (top 10 with score >= 45)
                  const tzRows: TzRow[] = [];
                  candidates.forEach((c, idx) => {
                    const passesScore = c._hasLoudSignal && c._score >= 55;
                    const passesTop10 = idx < 10 && c._hasLoudSignal && c._score >= 45;
                    if (!passesScore && !passesTop10) return;
                    const tags = getTradeSignalTags(c, tCtx, c._optScore, c._volxVal, c._volxStr, c._volMcStr, c._optStr);
                    if (tags.filter(t => t.pos).length === 0) return; // must have at least one positive tag
                    tzRows.push({ ...c, _tags: tags });
                  });

                  const tzStageColor = (lbl: string) => {
                    if (lbl.startsWith('S2 Breakout')) return { c: C.teal, bg: `${C.teal}18`, bd: `${C.teal}50` };
                    if (lbl.startsWith('S1-2 Watch')) return { c: C.amber, bg: `${C.amber}15`, bd: `${C.amber}45` };
                    return { c: '#60a5fa', bg: 'rgba(96,165,250,0.10)', bd: 'rgba(96,165,250,0.30)' };
                  };

                  const TZ_TH: React.CSSProperties = {
                    padding: '5px 10px', fontSize: 7, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                    background: C.card, borderBottom: `1px solid ${C.border}`,
                    fontFamily: font, color: C.dim,
                  };
                  const TZ_TD: React.CSSProperties = {
                    padding: '5px 10px', fontSize: 10, whiteSpace: 'nowrap' as const,
                    borderBottom: `1px solid ${C.border}18`, fontFamily: font,
                    verticalAlign: 'middle' as const,
                  };

                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#22c55e', letterSpacing: '0.04em' }}>High Conviction Trade Zone</span>
                        <span style={{ fontSize: 8, color: C.dim }}>— signal confluence · early stage · {tzRows.length} qualifying</span>
                      </div>
                      {tzRows.length === 0 ? (
                        <div style={{ padding: '32px 0', textAlign: 'center' as const, color: C.dim, fontSize: 10, fontFamily: font }}>
                          No High Conviction Trade Zone setups right now.<br />
                          <span style={{ fontSize: 8, opacity: 0.6, marginTop: 4, display: 'block' }}>Requires an early stage (S1/S1-2/S2) plus at least one loud signal — VolX, Vol/MC, or Options. Rules are not loosened automatically.</span>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 6 }} className="wl-scrollbar">
                          <table style={{ borderCollapse: 'collapse' as const, minWidth: 'max-content', width: '100%' }}>
                            <thead>
                              <tr>
                                {['Symbol','Stage','Score','Options','VolX','Vol/MC','Price','% Chg','Signal Tags'].map((h, hi) => (
                                  <th key={h} style={{ ...TZ_TH, textAlign: 'left' as const,
                                    ...(hi === 0 ? { position: 'sticky' as const, left: 0, zIndex: 2, boxShadow: '2px 0 4px rgba(0,0,0,0.4)' } : {})
                                  }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tzRows.map((row, ri) => {
                                const rowBg = ri % 2 === 0 ? '#08080c' : '#0a120e';
                                const rowHover = 'rgba(34,197,94,0.07)';
                                const setTdBg = (el: HTMLTableRowElement, bg: string) =>
                                  (Array.from(el.querySelectorAll('td')) as HTMLTableCellElement[]).forEach(td => { td.style.background = bg; });
                                const chg = (row as any).change_pct ?? (row as any).change_pct_1d;
                                const cClr = changeColor(chg);
                                const sc = tzStageColor(row._stageLabel);
                                const optDisplay = row._optScore !== null
                                  ? String(Math.round(row._optScore))
                                  : (getOptionsSignalStr(row) || '—');
                                const volxDisplay = row._volxVal !== null ? `${row._volxVal.toFixed(1)}x` : '—';
                                const volMcDisplay = (() => {
                                  const pre = Number((row as any).vol_mc_pct);
                                  if (isFinite(pre) && pre > 0) return `${Math.round(pre)}p`;
                                  return (row as any).vol_mc_label ?? '—';
                                })();
                                return (
                                  <tr key={`${(row as any).ticker}-${ri}`}
                                    onClick={() => (row as any).ticker && handleTickerClick((row as any).ticker)}
                                    style={{ cursor: (row as any).ticker ? 'pointer' : 'default' }}
                                    onMouseEnter={e => setTdBg(e.currentTarget, rowHover)}
                                    onMouseLeave={e => setTdBg(e.currentTarget, rowBg)}
                                  >
                                    {/* Symbol */}
                                    <td style={{ ...TZ_TD, background: rowBg, fontWeight: 800, color: '#fff',
                                      position: 'sticky' as const, left: 0, zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.4)' }}>
                                      {(row as any).ticker || DASH}
                                    </td>
                                    {/* Stage */}
                                    <td style={{ ...TZ_TD, background: rowBg }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, color: sc.c, background: sc.bg,
                                        border: `1px solid ${sc.bd}`, padding: '1px 6px', borderRadius: 3 }}>
                                        {row._stageLabel}
                                      </span>
                                    </td>
                                    {/* Score */}
                                    <td style={{ ...TZ_TD, background: rowBg, color: '#22c55e', fontWeight: 800 }}>
                                      {Math.round(row._score)}
                                    </td>
                                    {/* Options */}
                                    <td style={{ ...TZ_TD, background: rowBg, color: row._optScore !== null ? (row._optScore >= 70 ? '#22c55e' : row._optScore >= 50 ? C.amber : C.dim) : C.dim }}>
                                      {optDisplay}
                                    </td>
                                    {/* VolX */}
                                    <td style={{ ...TZ_TD, background: rowBg, color: row._volxVal !== null && row._volxVal >= 2 ? '#22c55e' : C.dim }}>
                                      {volxDisplay}
                                    </td>
                                    {/* Vol/MC */}
                                    <td style={{ ...TZ_TD, background: rowBg, color: row._volMcStr >= 85 ? '#22c55e' : row._volMcStr >= 70 ? C.amber : C.dim }}>
                                      {volMcDisplay}
                                    </td>
                                    {/* Price */}
                                    <td style={{ ...TZ_TD, background: rowBg, color: C.text }}>{formatPrice((row as any).price)}</td>
                                    {/* % Chg */}
                                    <td style={{ ...TZ_TD, background: rowBg, color: cClr, fontWeight: 700 }}>{formatChgPct(chg)}</td>
                                    {/* Signal Tags */}
                                    <td style={{ ...TZ_TD, background: rowBg, minWidth: 180 }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
                                        {row._tags.map((tag, ti) => (
                                          <span key={ti} style={{
                                            fontSize: 7, fontWeight: 700, fontFamily: font,
                                            padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' as const,
                                            color: tag.pos ? '#22c55e' : '#ef4444',
                                            background: tag.pos ? '#22c55e18' : '#ef444418',
                                            border: `1px solid ${tag.pos ? '#22c55e30' : '#ef444430'}`,
                                          }}>{tag.label}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                } /* end hctz */

                // Build CSV lookup from already-loaded watchlist.csv_data — no new fetch
                const csvMap: Record<string, any> = {};
                for (const row of (watchlist?.csv_data || [])) {
                  const t = (row.ticker || row.Ticker || row.TICKER || row.symbol || row.Symbol || '').toString().toUpperCase();
                  if (t) csvMap[t] = row;
                }

                // Per-row merge: start with CSV (fundamentals), then overlay live fields only when
                // the live value is a real value (not undefined / null / empty string).
                // This prevents the live row from clobbering populated CSV technical/fundamental fields.
                const fundRows = srcTickers.map(s => {
                  const tkKey = (s.ticker || '').toString().toUpperCase();
                  const csv = csvMap[tkKey] || {};
                  // Snapshot canonical theme before any merge so CSV cannot overwrite it
                  const canonicalTheme = getWatchlistTheme(s);
                  const merged: Record<string, any> = { ...csv };
                  for (const [k, v] of Object.entries(s)) {
                    if (v !== undefined && v !== null && v !== '') {
                      merged[k] = v;
                    } else if (!(k in merged)) {
                      // keep undefined slot so the key exists but CSV value wins if present
                      merged[k] = v;
                    }
                  }
                  // Restore AI-enhanced theme — always wins over any CSV industry/sector/category
                  if (canonicalTheme) merged['canonical_theme_name'] = canonicalTheme;
                  // Preserve raw CSV industry separately in case it is useful for future reference
                  if (csv.industry != null) merged['csv_industry'] = csv.industry;
                  else if (csv.sector != null) merged['csv_industry'] = csv.sector;
                  return merged;
                });

                /* ── GOLDEN ZONE ── intersection of Investment Zone + Trade Zone */
                if (bottomView === 'golden') {
                  const gzFgCtx = buildFgContext(fundRows);
                  const gzTCtx = buildTradeContext(fundRows);

                  // Trade zone: score every early-stage row, apply same 2-tier gate as HCTZ
                  type TScored = { ticker: string; score: number; hasLoud: boolean; optScore: number | null; volxVal: number | null; volxStr: number; volMcStr: number; optStr: number };
                  const tradeScoredList: TScored[] = [];
                  for (const r of fundRows) {
                    const { score, hasLoudSignal, optScore, volxVal, volxStrength, volMcStrength, optStrength, stageLabel } = scoreTradeConfluence(r, gzTCtx);
                    if (!isHcizStage(stageLabel)) continue;
                    tradeScoredList.push({ ticker: (r.ticker || '').toUpperCase(), score, hasLoud: hasLoudSignal, optScore, volxVal, volxStr: volxStrength, volMcStr: volMcStrength, optStr: optStrength });
                  }
                  tradeScoredList.sort((a, b) => b.score - a.score);
                  const tradePassMap = new Map<string, TScored>();
                  tradeScoredList.forEach((ts, idx) => {
                    if ((ts.hasLoud && ts.score >= 55) || (idx < 10 && ts.hasLoud && ts.score >= 45)) {
                      tradePassMap.set(ts.ticker, ts);
                    }
                  });

                  // Investment zone: classify each fundRow using shared helpers
                  type GzRow = typeof fundRows[0] & {
                    _bucket: FgBucket; _stageLabel: string; _investScore: number;
                    _tradeScore: number; _goldenScore: number;
                    _investDriver: string; _tradeTs: TScored;
                    _tags: Array<{ label: string; pos: boolean }>;
                  };
                  const strictRows: GzRow[] = [];
                  for (const r of fundRows) {
                    const bucket = assignFundamentalGroups(r, gzFgCtx);
                    if (bucket !== 'High Growth' && bucket !== 'Speculative Future Growth Leaders') continue;
                    const stageLabel = getStageLabel(r);
                    if (!isHcizStage(stageLabel)) continue;
                    const ticker = (r.ticker || '').toUpperCase();
                    const ts = tradePassMap.get(ticker);
                    if (!ts) continue; // not in Trade Zone
                    const investScore = convictionScore(r, gzFgCtx, bucket, stageLabel);
                    const stageStr = stageLabel.startsWith('S2 Breakout') ? 100 : stageLabel.startsWith('S1-2 Watch') ? 85 : 70;
                    const goldenScore = investScore * 0.5 + ts.score * 0.4 + stageStr * 0.1;
                    const investTags = getExtremeMetricTags(r, gzFgCtx, bucket);
                    const tradeTags = getTradeSignalTags(r, gzTCtx, ts.optScore, ts.volxVal, ts.volxStr, ts.volMcStr, ts.optStr);
                    // Merge: investment tags first, then trade tags, no dupes, max 4
                    const merged: Array<{ label: string; pos: boolean }> = [];
                    const seen = new Set<string>();
                    for (const t of [...investTags, ...tradeTags]) {
                      if (!seen.has(t.label)) { seen.add(t.label); merged.push(t); }
                    }
                    strictRows.push({ ...r, _bucket: bucket, _stageLabel: stageLabel, _investScore: investScore, _tradeScore: ts.score, _goldenScore: goldenScore, _investDriver: getGrowthDriver(r, gzFgCtx, bucket), _tradeTs: ts, _tags: merged.slice(0, 4) });
                  }
                  strictRows.sort((a, b) => b._goldenScore - a._goldenScore);

                  // Fallback: investment-eligible + any loud trade signal (softer gate)
                  let gzRows: GzRow[] = strictRows;
                  if (gzRows.length < 3) {
                    const fallbackRows: GzRow[] = [];
                    const seenTickers = new Set(strictRows.map(r => (r.ticker || '').toUpperCase()));
                    tradeScoredList.forEach((ts, idx) => {
                      if (seenTickers.has(ts.ticker)) return;
                      if (!ts.hasLoud || ts.score < 40) return;
                      const r = fundRows.find(f => (f.ticker || '').toUpperCase() === ts.ticker);
                      if (!r) return;
                      const bucket = assignFundamentalGroups(r, gzFgCtx);
                      if (bucket !== 'High Growth' && bucket !== 'Speculative Future Growth Leaders') return;
                      const stageLabel = getStageLabel(r);
                      if (!isHcizStage(stageLabel)) return;
                      const investScore = convictionScore(r, gzFgCtx, bucket, stageLabel);
                      const stageStr = stageLabel.startsWith('S2 Breakout') ? 100 : stageLabel.startsWith('S1-2 Watch') ? 85 : 70;
                      const goldenScore = investScore * 0.5 + ts.score * 0.4 + stageStr * 0.1;
                      const investTags = getExtremeMetricTags(r, gzFgCtx, bucket);
                      const tradeTags = getTradeSignalTags(r, gzTCtx, ts.optScore, ts.volxVal, ts.volxStr, ts.volMcStr, ts.optStr);
                      const merged: Array<{ label: string; pos: boolean }> = [];
                      const seen = new Set<string>();
                      for (const t of [...investTags, ...tradeTags]) {
                        if (!seen.has(t.label)) { seen.add(t.label); merged.push(t); }
                      }
                      fallbackRows.push({ ...r, _bucket: bucket, _stageLabel: stageLabel, _investScore: investScore, _tradeScore: ts.score, _goldenScore: goldenScore, _investDriver: getGrowthDriver(r, gzFgCtx, bucket), _tradeTs: ts, _tags: merged.slice(0, 4) });
                    });
                    fallbackRows.sort((a, b) => b._goldenScore - a._goldenScore);
                    gzRows = [...strictRows, ...fallbackRows];
                  }

                  const gzStageColor = (lbl: string) => {
                    if (lbl.startsWith('S2 Breakout')) return { c: C.teal, bg: `${C.teal}18`, bd: `${C.teal}50` };
                    if (lbl.startsWith('S1-2 Watch')) return { c: C.amber, bg: `${C.amber}15`, bd: `${C.amber}45` };
                    return { c: '#60a5fa', bg: 'rgba(96,165,250,0.10)', bd: 'rgba(96,165,250,0.30)' };
                  };
                  const GZ_TH: React.CSSProperties = {
                    padding: '5px 10px', fontSize: 7, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                    background: C.card, borderBottom: `1px solid ${C.border}`,
                    fontFamily: font, color: C.dim,
                  };
                  const GZ_TD: React.CSSProperties = {
                    padding: '5px 10px', fontSize: 10, whiteSpace: 'nowrap' as const,
                    borderBottom: `1px solid ${C.border}18`, fontFamily: font,
                    verticalAlign: 'middle' as const,
                  };

                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.04em' }}>Golden Zone</span>
                        <span style={{ fontSize: 8, color: C.dim }}>— A+ setups · investment + trade confluence · early stage · {gzRows.length} qualifying</span>
                      </div>
                      {gzRows.length === 0 ? (
                        <div style={{ padding: '32px 0', textAlign: 'center' as const, color: C.dim, fontSize: 10, fontFamily: font }}>
                          No Golden Zone setups right now.<br />
                          <span style={{ fontSize: 8, opacity: 0.6, marginTop: 4, display: 'block' }}>Requires both high-conviction investment strength and high-conviction trade confluence in an early stage.</span>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', border: `1px solid #f59e0b30`, borderRadius: 6, boxShadow: '0 0 12px rgba(245,158,11,0.06)' }} className="wl-scrollbar">
                          <table style={{ borderCollapse: 'collapse' as const, minWidth: 'max-content', width: '100%' }}>
                            <thead>
                              <tr>
                                {['Symbol','Stage','Golden Score','Investment Signal','Trade Signal','VolX','Options','Price','% Chg','Tags'].map((h, hi) => (
                                  <th key={h} style={{ ...GZ_TH, textAlign: 'left' as const,
                                    ...(hi === 0 ? { position: 'sticky' as const, left: 0, zIndex: 2, boxShadow: '2px 0 4px rgba(0,0,0,0.4)' } : {})
                                  }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {gzRows.map((row, ri) => {
                                const rowBg = ri % 2 === 0 ? '#08080c' : '#120e04';
                                const rowHover = 'rgba(245,158,11,0.07)';
                                const setTdBg = (el: HTMLTableRowElement, bg: string) =>
                                  (Array.from(el.querySelectorAll('td')) as HTMLTableCellElement[]).forEach(td => { td.style.background = bg; });
                                const chg = row.change_pct ?? row.change_pct_1d;
                                const cClr = changeColor(chg);
                                const sc = gzStageColor(row._stageLabel);
                                const volxDisplay = row._tradeTs.volxVal !== null ? `${row._tradeTs.volxVal.toFixed(1)}x` : '—';
                                const optDisplay = row._tradeTs.optScore !== null ? String(Math.round(row._tradeTs.optScore)) : (getOptionsSignalStr(row) || '—');
                                const bucketShort = row._bucket === 'High Growth' ? 'HG' : 'SFG';
                                const bucketClr = row._bucket === 'High Growth' ? '#0ea5e9' : '#a855f7';
                                return (
                                  <tr key={`${row.ticker}-${ri}`}
                                    onClick={() => row.ticker && handleTickerClick(row.ticker)}
                                    style={{ cursor: row.ticker ? 'pointer' : 'default' }}
                                    onMouseEnter={e => setTdBg(e.currentTarget, rowHover)}
                                    onMouseLeave={e => setTdBg(e.currentTarget, rowBg)}
                                  >
                                    {/* Symbol */}
                                    <td style={{ ...GZ_TD, background: rowBg, fontWeight: 800, color: '#fff',
                                      position: 'sticky' as const, left: 0, zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.4)' }}>
                                      <span>{row.ticker || DASH}</span>
                                      <span style={{ marginLeft: 5, fontSize: 7, fontWeight: 700, color: bucketClr, background: `${bucketClr}15`, border: `1px solid ${bucketClr}35`, padding: '0px 4px', borderRadius: 2 }}>{bucketShort}</span>
                                    </td>
                                    {/* Stage */}
                                    <td style={{ ...GZ_TD, background: rowBg }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, color: sc.c, background: sc.bg, border: `1px solid ${sc.bd}`, padding: '1px 6px', borderRadius: 3 }}>{row._stageLabel}</span>
                                    </td>
                                    {/* Golden Score */}
                                    <td style={{ ...GZ_TD, background: rowBg, color: '#f59e0b', fontWeight: 800, fontSize: 11 }}>
                                      {Math.round(row._goldenScore)}
                                    </td>
                                    {/* Investment Signal */}
                                    <td style={{ ...GZ_TD, background: rowBg, color: '#a855f7', fontWeight: 600, fontSize: 9, maxWidth: 140 }}>
                                      {row._investDriver}
                                    </td>
                                    {/* Trade Signal */}
                                    <td style={{ ...GZ_TD, background: rowBg, color: '#22c55e', fontWeight: 600, fontSize: 9, maxWidth: 120 }}>
                                      {row._tags.find(t => t.pos && (t.label.includes('VolX') || t.label.includes('Vol/MC') || t.label.includes('Options') || t.label.includes('Flow') || t.label.includes('Volume')))?.label ?? '—'}
                                    </td>
                                    {/* VolX */}
                                    <td style={{ ...GZ_TD, background: rowBg, color: row._tradeTs.volxVal !== null && row._tradeTs.volxVal >= 2 ? '#22c55e' : C.dim }}>
                                      {volxDisplay}
                                    </td>
                                    {/* Options */}
                                    <td style={{ ...GZ_TD, background: rowBg, color: row._tradeTs.optScore !== null ? (row._tradeTs.optScore >= 70 ? '#22c55e' : row._tradeTs.optScore >= 50 ? C.amber : C.dim) : C.dim }}>
                                      {optDisplay}
                                    </td>
                                    {/* Price */}
                                    <td style={{ ...GZ_TD, background: rowBg, color: C.text }}>{formatPrice(row.price)}</td>
                                    {/* % Chg */}
                                    <td style={{ ...GZ_TD, background: rowBg, color: cClr, fontWeight: 700 }}>{formatChgPct(chg)}</td>
                                    {/* Tags */}
                                    <td style={{ ...GZ_TD, background: rowBg, minWidth: 180 }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
                                        {row._tags.map((tag, ti) => (
                                          <span key={ti} style={{
                                            fontSize: 7, fontWeight: 700, fontFamily: font,
                                            padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' as const,
                                            color: tag.pos ? '#f59e0b' : '#ef4444',
                                            background: tag.pos ? '#f59e0b18' : '#ef444418',
                                            border: `1px solid ${tag.pos ? '#f59e0b35' : '#ef444430'}`,
                                          }}>{tag.label}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                } /* end golden */

                /* ── GROWTH MOMENTUM ── strong growth + S2/S2-S3/S3 stage + vol + options */
                if (bottomView === 'gromo') {
                  const gmFgCtx = buildFgContext(fundRows);
                  const gmTCtx = buildTradeContext(fundRows);

                  type GmRow = typeof fundRows[0] & {
                    _bucket: FgBucket; _stageLabel: string; _gmScore: number;
                    _revGrowth: number | null; _epsGrowth: number | null; _fcastGrowth: number | null;
                    _volxVal: number | null; _optScore: number | null;
                    _tags: Array<{label: string; pos: boolean}>;
                  };
                  const gmRows: GmRow[] = [];

                  for (const r of fundRows) {
                    const bucket = assignFundamentalGroups(r, gmFgCtx);
                    if (bucket !== 'Market Leaders' && bucket !== 'High Growth' && bucket !== 'Speculative Future Growth Leaders') continue;
                    const stageLabel = getStageLabel(r);
                    if (!isGroMoStage(stageLabel)) continue;
                    const optScore = getOptionsScore(r);
                    if (optScore === null || optScore < 25) continue;
                    const volxVal = getVolXVal(r);
                    const volxPctile = volxVal !== null ? tradePctile(volxVal, gmTCtx.volxSorted) : 0;
                    const hasVolX = (volxVal !== null && volxVal >= 1.5) || volxPctile >= 0.75;
                    if (!hasVolX) continue;
                    if (!gmHasGrowthGate(r, gmFgCtx, bucket)) continue;
                    const gmScore = scoreGrowthMomentum(r, gmFgCtx, gmTCtx);
                    const bestFc = (['revenue_growth_est','rev_growth_next_year','eps_growth_est','eps_growth_ny'] as const)
                      .map(k => fgParseMetric(r, k)).filter((v): v is number => v !== null)
                      .reduce((best, v) => Math.max(best, v), 0) || null;
                    gmRows.push({
                      ...r,
                      _bucket: bucket,
                      _stageLabel: stageLabel,
                      _gmScore: gmScore,
                      _revGrowth: fgParseMetric(r, 'revenue_growth') ?? fgParseMetric(r, 'revenue_growth_q'),
                      _epsGrowth: fgParseMetric(r, 'eps_growth'),
                      _fcastGrowth: bestFc,
                      _volxVal: volxVal,
                      _optScore: optScore,
                      _tags: getGroMoTags(r, gmFgCtx, gmTCtx, bucket),
                    });
                  }

                  // Sort: gmScore desc, then S2-S3 Advance first, then S2 Breakout, then S3
                  const stageOrder = (s: string) => s.startsWith('S2-S3') ? 0 : s.startsWith('S2 Breakout') ? 1 : 2;
                  gmRows.sort((a, b) => {
                    if (Math.abs(b._gmScore - a._gmScore) > 2) return b._gmScore - a._gmScore;
                    const so = stageOrder(a._stageLabel) - stageOrder(b._stageLabel);
                    if (so !== 0) return so;
                    return b._gmScore - a._gmScore;
                  });

                  const gmStageColor = (lbl: string) => {
                    if (lbl.startsWith('S2-S3 Advance')) return { c: '#22c55e', bg: 'rgba(34,197,94,0.12)', bd: 'rgba(34,197,94,0.40)' };
                    if (lbl.startsWith('S2 Breakout')) return { c: C.teal, bg: `${C.teal}18`, bd: `${C.teal}50` };
                    return { c: C.amber, bg: `${C.amber}15`, bd: `${C.amber}45` };
                  };
                  const gmBucketShort = (b: FgBucket) => b === 'Market Leaders' ? 'ML' : b === 'High Growth' ? 'HG' : 'SFG';
                  const gmBucketColor = (b: FgBucket) => b === 'Market Leaders' ? '#22c55e' : b === 'High Growth' ? '#0ea5e9' : '#a855f7';
                  const GM_TH: React.CSSProperties = {
                    padding: '5px 10px', fontSize: 7, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                    background: C.card, borderBottom: `1px solid ${C.border}`,
                    fontFamily: font, color: C.dim,
                  };
                  const GM_TD: React.CSSProperties = {
                    padding: '5px 10px', fontSize: 10, whiteSpace: 'nowrap' as const,
                    borderBottom: `1px solid ${C.border}18`, fontFamily: font,
                    verticalAlign: 'middle' as const,
                  };

                  return (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', letterSpacing: '0.04em' }}>Growth Momentum</span>
                        <span style={{ fontSize: 8, color: C.dim }}>— strong fundamentals · S2/S2-S3/S3 stage · options ≥ 25 · elevated VolX · {gmRows.length} qualifying</span>
                      </div>
                      {gmRows.length === 0 ? (
                        <div style={{ padding: '32px 0', textAlign: 'center' as const, color: C.dim, fontSize: 10, fontFamily: font }}>
                          No Growth Momentum setups right now.<br />
                          <span style={{ fontSize: 8, opacity: 0.6, marginTop: 4, display: 'block' }}>Requires strong growth fundamentals, S2/S2-S3/S3 stage momentum, options score ≥ 25, and elevated VolX.</span>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', border: `1px solid #3b82f630`, borderRadius: 6, boxShadow: '0 0 12px rgba(59,130,246,0.06)' }} className="wl-scrollbar">
                          <table style={{ borderCollapse: 'collapse' as const, minWidth: 'max-content', width: '100%' }}>
                            <thead>
                              <tr>
                                {['Symbol','Group','Stage','GM Score','Rev Growth','EPS Growth','Forecast','VolX','Options','Price','% Chg','Tags'].map((h, hi) => (
                                  <th key={h} style={{ ...GM_TH, textAlign: 'left' as const,
                                    ...(hi === 0 ? { position: 'sticky' as const, left: 0, zIndex: 2, boxShadow: '2px 0 4px rgba(0,0,0,0.4)' } : {})
                                  }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {gmRows.map((row, ri) => {
                                const rowBg = ri % 2 === 0 ? '#08080c' : '#060c12';
                                const rowHover = 'rgba(59,130,246,0.07)';
                                const setTdBg = (el: HTMLTableRowElement, bg: string) =>
                                  (Array.from(el.querySelectorAll('td')) as HTMLTableCellElement[]).forEach(td => { td.style.background = bg; });
                                const chg = row.change_pct ?? row.change_pct_1d;
                                const cClr = changeColor(chg);
                                const sc = gmStageColor(row._stageLabel);
                                const bClr = gmBucketColor(row._bucket);
                                const fmtGrowth = (v: number | null) => v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(0)}%`;
                                return (
                                  <tr key={`${row.ticker}-${ri}`}
                                    onClick={() => row.ticker && handleTickerClick(row.ticker)}
                                    style={{ cursor: row.ticker ? 'pointer' : 'default' }}
                                    onMouseEnter={e => setTdBg(e.currentTarget, rowHover)}
                                    onMouseLeave={e => setTdBg(e.currentTarget, rowBg)}
                                  >
                                    {/* Symbol */}
                                    <td style={{ ...GM_TD, background: rowBg, fontWeight: 800, color: '#fff',
                                      position: 'sticky' as const, left: 0, zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.4)' }}>
                                      {row.ticker || DASH}
                                    </td>
                                    {/* Group */}
                                    <td style={{ ...GM_TD, background: rowBg }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, color: bClr, background: `${bClr}15`, border: `1px solid ${bClr}35`, padding: '1px 5px', borderRadius: 2 }}>{gmBucketShort(row._bucket)}</span>
                                    </td>
                                    {/* Stage */}
                                    <td style={{ ...GM_TD, background: rowBg }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, color: sc.c, background: sc.bg, border: `1px solid ${sc.bd}`, padding: '1px 6px', borderRadius: 3 }}>{row._stageLabel}</span>
                                    </td>
                                    {/* GM Score */}
                                    <td style={{ ...GM_TD, background: rowBg, color: '#3b82f6', fontWeight: 800, fontSize: 11 }}>
                                      {Math.round(row._gmScore)}
                                    </td>
                                    {/* Rev Growth */}
                                    <td style={{ ...GM_TD, background: rowBg, color: row._revGrowth !== null && row._revGrowth > 20 ? '#22c55e' : C.text, fontWeight: row._revGrowth !== null && row._revGrowth > 20 ? 700 : 400 }}>
                                      {fmtGrowth(row._revGrowth)}
                                    </td>
                                    {/* EPS Growth */}
                                    <td style={{ ...GM_TD, background: rowBg, color: row._epsGrowth !== null && row._epsGrowth > 0 ? '#22c55e' : row._epsGrowth !== null && row._epsGrowth < 0 ? '#ef4444' : C.text }}>
                                      {fmtGrowth(row._epsGrowth)}
                                    </td>
                                    {/* Forecast */}
                                    <td style={{ ...GM_TD, background: rowBg, color: row._fcastGrowth !== null && row._fcastGrowth > 15 ? '#22c55e' : C.dim }}>
                                      {fmtGrowth(row._fcastGrowth)}
                                    </td>
                                    {/* VolX */}
                                    <td style={{ ...GM_TD, background: rowBg, color: row._volxVal !== null && row._volxVal >= 2 ? '#22c55e' : C.dim }}>
                                      {row._volxVal !== null ? `${row._volxVal.toFixed(1)}x` : '—'}
                                    </td>
                                    {/* Options */}
                                    <td style={{ ...GM_TD, background: rowBg, color: row._optScore !== null ? (row._optScore >= 70 ? '#22c55e' : row._optScore >= 50 ? C.amber : C.dim) : C.dim }}>
                                      {row._optScore !== null ? String(Math.round(row._optScore)) : '—'}
                                    </td>
                                    {/* Price */}
                                    <td style={{ ...GM_TD, background: rowBg, color: C.text }}>{formatPrice(row.price)}</td>
                                    {/* % Chg */}
                                    <td style={{ ...GM_TD, background: rowBg, color: cClr, fontWeight: 700 }}>{formatChgPct(chg)}</td>
                                    {/* Tags */}
                                    <td style={{ ...GM_TD, background: rowBg, minWidth: 180 }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
                                        {row._tags.map((tag, ti) => (
                                          <span key={ti} style={{
                                            fontSize: 7, fontWeight: 700, fontFamily: font,
                                            padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' as const,
                                            color: tag.pos ? '#3b82f6' : '#ef4444',
                                            background: tag.pos ? '#3b82f618' : '#ef444418',
                                            border: `1px solid ${tag.pos ? '#3b82f635' : '#ef444430'}`,
                                          }}>{tag.label}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                } /* end gromo */

                /* ── FUNDAMENTAL GROUPING ── */
                if (bottomView === 'fundGrouping') {
                  // Build percentile context from active fundRows only (Primary vs Close Watch)
                  const fgCtx = buildFgContext(fundRows);
                  const fgBucketDefs: { id: FgBucket; label: string; sub: string; color: string }[] = [
                    { id: 'Market Leaders',                   label: 'Market Leaders',       sub: 'Proven Anchors — No Red Flags',       color: '#22c55e' },
                    { id: 'High Growth',                      label: 'High Growth',          sub: 'Top 15% Current Growth Metrics',      color: '#0ea5e9' },
                    { id: 'Speculative Future Growth Leaders', label: 'Spec. Future Growth',  sub: 'Forecast-Driven / Growth Investment',  color: '#a855f7' },
                    { id: 'High Speculation',                 label: 'High Speculation',     sub: 'Avoid / Weak Fundamentals',           color: '#f59e0b' },
                  ];
                  // Assign rows — rows that don't qualify for any bucket are omitted
                  type FgQRow = typeof fundRows[0] & { _bucket: FgBucket; _score: number };
                  const fgQRows: FgQRow[] = [];
                  for (const r of fundRows) {
                    const bucket = assignFundamentalGroups(r, fgCtx);
                    if (bucket === null) continue;
                    let score = 0;
                    if (bucket === 'Market Leaders')                   score = scoreMarketLeader(r);
                    else if (bucket === 'High Growth')                 score = scoreHighGrowth(r, fgCtx);
                    else if (bucket === 'Speculative Future Growth Leaders') score = scoreSpecFutureGrowth(r, fgCtx);
                    else                                               score = scoreHighSpeculation(r);
                    fgQRows.push({ ...r, _bucket: bucket, _score: score });
                  }
                  const totalQualified = fgQRows.length;
                  return (
                    <div>
                      {/* summary bar */}
                      <div style={{ padding: '6px 2px 10px', fontSize: 9, color: C.dim, fontFamily: font }}>
                        {totalQualified} of {fundRows.length} tickers qualify — the rest have mediocre or incomplete fundamentals and are omitted.
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                        {fgBucketDefs.map(bDef => {
                          const rows = fgQRows
                            .filter(r => r._bucket === bDef.id)
                            .sort((a, b) => b._score - a._score);
                          const fgAvg = fmtAvgChg(avgDailyChangePct(rows));
                          return (
                            <div key={bDef.id} style={{ flex: '1 1 200px', minWidth: 190, background: C.card, border: `1px solid ${C.border}`, borderLeft: `3px solid ${bDef.color}`, borderRadius: 6, overflow: 'hidden' }}>
                              {/* bucket header */}
                              <div style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, background: `${bDef.color}10` }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                                  <span style={{ fontSize: 10, fontWeight: 800, color: bDef.color, letterSpacing: '0.05em' }}>{bDef.label}</span>
                                  <span style={{ fontSize: 10, fontWeight: 800, color: fgAvg.color, fontFamily: font, flexShrink: 0 }}>{fgAvg.text}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: 7.5, color: C.dim, letterSpacing: '0.04em' }}>{bDef.sub}</span>
                                  <span style={{ fontSize: 9, fontWeight: 700, color: bDef.color }}>{rows.length}</span>
                                </div>
                              </div>
                              {/* col headers */}
                              <div style={{ display: 'grid', gridTemplateColumns: '54px 48px 44px 54px', padding: '3px 10px', gap: 4, fontSize: 7, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: C.dim, borderBottom: `1px solid ${C.border}22` }}>
                                <span>Ticker</span>
                                <span style={{ textAlign: 'right' as const }}>Price</span>
                                <span style={{ textAlign: 'right' as const }}>Chg%</span>
                                <span style={{ textAlign: 'right' as const }}>Mkt Cap</span>
                              </div>
                              {/* rows */}
                              <div style={{ maxHeight: 400, overflowY: 'auto' }} className="wl-scrollbar">
                                {rows.length === 0 ? (
                                  <div style={{ padding: '16px 10px', fontSize: 9, color: C.dim, textAlign: 'center' as const }}>No qualifying tickers</div>
                                ) : rows.map((r, ri) => {
                                  const chg = r.change_pct ?? r.change_pct_1d;
                                  const cClr = changeColor(chg);
                                  const mcStr = fundFmtCompact(r.market_cap ?? r.marketCap);
                                  const tags = getExtremeMetricTags(r, fgCtx, bDef.id);
                                  return (
                                    <div
                                      key={`${r.ticker}-${ri}`}
                                      onClick={() => r.ticker && handleTickerClick(r.ticker)}
                                      style={{ borderBottom: `1px solid ${C.border}18`, cursor: r.ticker ? 'pointer' : 'default', background: ri % 2 === 0 ? 'transparent' : `${C.border}06` }}
                                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = ri % 2 === 0 ? 'transparent' : `${C.border}06`; }}
                                    >
                                      <div style={{ display: 'grid', gridTemplateColumns: '54px 48px 44px 54px', padding: '5px 10px 2px', gap: 4, alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', fontFamily: font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{r.ticker || DASH}</span>
                                        <span style={{ fontSize: 10, color: C.text, fontFamily: font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{formatPrice(r.price)}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: cClr, fontFamily: font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{formatChgPct(chg)}</span>
                                        <span style={{ fontSize: 9, color: C.dim, fontFamily: font, textAlign: 'right' as const, whiteSpace: 'nowrap' as const }}>{mcStr}</span>
                                      </div>
                                      {tags.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3, padding: '2px 10px 5px' }}>
                                          {tags.map((tag, ti) => (
                                            <span key={ti} style={{
                                              fontSize: 7, fontWeight: 700, fontFamily: font,
                                              padding: '1px 5px', borderRadius: 3,
                                              color: tag.pos ? '#22c55e' : '#ef4444',
                                              background: tag.pos ? '#22c55e18' : '#ef444418',
                                              border: `1px solid ${tag.pos ? '#22c55e30' : '#ef444430'}`,
                                              whiteSpace: 'nowrap' as const,
                                            }}>{tag.label}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } /* end fundGrouping */

                /* ── HIGH CONVICTION INVESTMENT ZONE ── */
                if (bottomView === 'hciz') {
                  const hcizCtx = buildFgContext(fundRows);
                  type HcizRow = typeof fundRows[0] & {
                    _bucket: FgBucket; _stageLabel: string; _convScore: number;
                    _driver: string; _tags: Array<{label: string; pos: boolean}>;
                  };
                  const hcizRows: HcizRow[] = [];
                  for (const r of fundRows) {
                    const { qualifies, bucket, stageLabel } = isHighConvictionInvestmentZone(r, hcizCtx);
                    if (!qualifies || !bucket) continue;
                    hcizRows.push({
                      ...r,
                      _bucket: bucket,
                      _stageLabel: stageLabel,
                      _convScore: convictionScore(r, hcizCtx, bucket, stageLabel),
                      _driver: getGrowthDriver(r, hcizCtx, bucket),
                      _tags: getExtremeMetricTags(r, hcizCtx, bucket),
                    });
                  }
                  hcizRows.sort((a, b) => b._convScore - a._convScore);

                  const stageColor = (lbl: string) => {
                    if (lbl.startsWith('S2 Breakout')) return { c: C.teal, bg: `${C.teal}18`, bd: `${C.teal}50` };
                    if (lbl.startsWith('S1-2 Watch')) return { c: C.amber, bg: `${C.amber}15`, bd: `${C.amber}45` };
                    return { c: '#60a5fa', bg: 'rgba(96,165,250,0.10)', bd: 'rgba(96,165,250,0.30)' };
                  };
                  const bucketColor = (b: FgBucket) => b === 'High Growth' ? '#0ea5e9' : '#a855f7';
                  const bucketLabel = (b: FgBucket) => b === 'High Growth' ? 'High Growth' : 'Spec. Future Growth';

                  const HCIZ_TH: React.CSSProperties = {
                    padding: '5px 10px', fontSize: 7, fontWeight: 700, letterSpacing: '0.07em',
                    textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
                    background: C.card, borderBottom: `1px solid ${C.border}`,
                    fontFamily: font, color: C.dim,
                  };
                  const HCIZ_TD: React.CSSProperties = {
                    padding: '5px 10px', fontSize: 10, whiteSpace: 'nowrap' as const,
                    borderBottom: `1px solid ${C.border}18`, fontFamily: font,
                    verticalAlign: 'middle' as const,
                  };

                  return (
                    <div>
                      {/* header strip */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#a855f7', letterSpacing: '0.04em' }}>High Conviction Investment Zone</span>
                        <span style={{ fontSize: 8, color: C.dim }}>— fundamentally elite · technically early · {hcizRows.length} qualifying</span>
                      </div>
                      {hcizRows.length === 0 ? (
                        <div style={{ padding: '32px 0', textAlign: 'center' as const, color: C.dim, fontSize: 10, fontFamily: font }}>
                          No High Conviction Investment Zone setups right now.<br />
                          <span style={{ fontSize: 8, opacity: 0.6, marginTop: 4, display: 'block' }}>Rules are not loosened to fill this tab — only genuine setups appear.</span>
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto', border: `1px solid ${C.border}`, borderRadius: 6 }} className="wl-scrollbar">
                          <table style={{ borderCollapse: 'collapse' as const, minWidth: 'max-content', width: '100%' }}>
                            <thead>
                              <tr>
                                {['Symbol','Group','Stage','Price','% Chg','Mkt Cap','Growth Driver','Reason Tags'].map((h, hi) => (
                                  <th key={h} style={{ ...HCIZ_TH, textAlign: hi === 0 ? 'left' as const : 'left' as const,
                                    ...(hi === 0 ? { position: 'sticky' as const, left: 0, zIndex: 2, boxShadow: '2px 0 4px rgba(0,0,0,0.4)' } : {})
                                  }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {hcizRows.map((row, ri) => {
                                const rowBg    = ri % 2 === 0 ? '#08080c' : '#0d1420';
                                const rowHover = 'rgba(168,85,247,0.07)';
                                const setTdBg = (el: HTMLTableRowElement, bg: string) =>
                                  (Array.from(el.querySelectorAll('td')) as HTMLTableCellElement[]).forEach(td => { td.style.background = bg; });
                                const chg = row.change_pct ?? row.change_pct_1d;
                                const cClr = changeColor(chg);
                                const mcStr = fundFmtCompact(row.market_cap ?? row.marketCap);
                                const sc = stageColor(row._stageLabel);
                                const bc = bucketColor(row._bucket);
                                return (
                                  <tr key={`${row.ticker}-${ri}`}
                                    onClick={() => row.ticker && handleTickerClick(row.ticker)}
                                    style={{ cursor: row.ticker ? 'pointer' : 'default' }}
                                    onMouseEnter={e => setTdBg(e.currentTarget, rowHover)}
                                    onMouseLeave={e => setTdBg(e.currentTarget, rowBg)}
                                  >
                                    {/* Symbol */}
                                    <td style={{ ...HCIZ_TD, background: rowBg, fontWeight: 800, color: '#fff',
                                      position: 'sticky' as const, left: 0, zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.4)' }}>
                                      {row.ticker || DASH}
                                    </td>
                                    {/* Group */}
                                    <td style={{ ...HCIZ_TD, background: rowBg }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, color: bc, background: `${bc}18`,
                                        border: `1px solid ${bc}40`, padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap' as const }}>
                                        {bucketLabel(row._bucket)}
                                      </span>
                                    </td>
                                    {/* Stage */}
                                    <td style={{ ...HCIZ_TD, background: rowBg }}>
                                      <span style={{ fontSize: 8, fontWeight: 700, color: sc.c, background: sc.bg,
                                        border: `1px solid ${sc.bd}`, padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap' as const }}>
                                        {row._stageLabel}
                                      </span>
                                    </td>
                                    {/* Price */}
                                    <td style={{ ...HCIZ_TD, background: rowBg, color: C.text }}>{formatPrice(row.price)}</td>
                                    {/* % Chg */}
                                    <td style={{ ...HCIZ_TD, background: rowBg, color: cClr, fontWeight: 700 }}>{formatChgPct(chg)}</td>
                                    {/* Mkt Cap */}
                                    <td style={{ ...HCIZ_TD, background: rowBg, color: C.dim }}>{mcStr}</td>
                                    {/* Growth Driver */}
                                    <td style={{ ...HCIZ_TD, background: rowBg, color: '#a855f7', fontWeight: 600, fontSize: 9 }}>
                                      {row._driver}
                                    </td>
                                    {/* Reason Tags */}
                                    <td style={{ ...HCIZ_TD, background: rowBg, minWidth: 180 }}>
                                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 3 }}>
                                        {row._tags.map((tag, ti) => (
                                          <span key={ti} style={{
                                            fontSize: 7, fontWeight: 700, fontFamily: font,
                                            padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' as const,
                                            color: tag.pos ? '#22c55e' : '#ef4444',
                                            background: tag.pos ? '#22c55e18' : '#ef444418',
                                            border: `1px solid ${tag.pos ? '#22c55e30' : '#ef444430'}`,
                                          }}>{tag.label}</span>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                } /* end hciz */

                return null;
              })()}
            </div>

            {/* ── Signal Summary Strip (ticker chips) ── */}
            {newFmt ? renderNewFormatSignalStrip() : renderLegacySignalStrip()}

          </div>
        </>
      )}

      {/* ═══ Strategy Report Modal — Part C ═══ */}
      {strategyReportModal.open && (
        <div
          onClick={() => setStrategyReportModal(s => ({ ...s, open: false }))}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f1117', border: `1px solid ${C.border}`,
              borderRadius: 10, width: '90vw', maxWidth: 780,
              maxHeight: '85vh', display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0', fontFamily: font }}>
                {strategyReportModal.report
                  ? `${strategyReportModal.report.strategy_name ?? strategyReportModal.report.strategy_id ?? STRATEGY_DISPLAY[selectedStrategy]?.label ?? 'Strategy'} Report`
                  : 'Strategy Report'}
              </span>
              <button
                onClick={() => setStrategyReportModal(s => ({ ...s, open: false }))}
                style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              >×</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} className="wl-scrollbar">
              {strategyReportModal.loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
                  <div className="wl-spin" style={{ width: 28, height: 28, border: `3px solid rgba(99,102,241,0.2)`, borderTopColor: '#6366f1', borderRadius: '50%' }} />
                  <span style={{ fontSize: 11, color: C.dim, fontFamily: font }}>
                    Generating report — this may take 10–30 seconds…
                  </span>
                </div>
              )}
              {strategyReportModal.error && !strategyReportModal.loading && (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: C.red, fontFamily: font, marginBottom: 6 }}>Report generation failed</div>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: sansFont }}>{strategyReportModal.error}</div>
                </div>
              )}
              {strategyReportModal.report && !strategyReportModal.loading && (() => {
                const rpt = strategyReportModal.report;
                const results: any[] = rpt.results ?? rpt.ranked_results ?? rpt.tickers ?? [];
                const wlName = rpt.watchlist_name ?? (wlMetas ?? []).find(w => w.id === activeId)?.name ?? '';
                return (
                  <>
                    {/* Meta row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px', marginBottom: 16 }}>
                      {wlName && <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>Watchlist: <span style={{ color: C.text }}>{wlName}</span></span>}
                      {rpt.generated_at && <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>Generated: <span style={{ color: C.text }}>{new Date(rpt.generated_at).toLocaleString()}</span></span>}
                      {rpt.ticker_count != null && <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>Tickers: <span style={{ color: C.text }}>{rpt.ticker_count}</span></span>}
                      {rpt.matched_count != null && <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>Matched: <span style={{ color: '#22c55e' }}>{rpt.matched_count}</span></span>}
                      {rpt.cache_freshness && <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>Cache: <span style={{ color: C.amber }}>{typeof rpt.cache_freshness === 'string' ? rpt.cache_freshness : JSON.stringify(rpt.cache_freshness)}</span></span>}
                    </div>

                    {/* Results table */}
                    {results.length === 0 && (
                      <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: C.dim, fontFamily: font }}>
                        No matched tickers in this report.
                      </div>
                    )}
                    {results.length > 0 && results.map((item: any, idx: number) => {
                      const ticker = item.ticker ?? item.symbol ?? '';
                      const score = item.score ?? item.fit_score ?? item.rank_score;
                      const rank = item.rank ?? idx + 1;
                      const reasons: string[] = Array.isArray(item.reasons) ? item.reasons : (item.reason ? [item.reason] : []);
                      const missing = item.missing_data_notes ?? item.missing_data ?? '';
                      const supporting = item.supporting_fields ?? item.details ?? {};
                      return (
                        <div key={ticker || idx} style={{
                          padding: '10px 12px', marginBottom: 8,
                          background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`,
                          borderRadius: 6,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: reasons.length ? 6 : 0 }}>
                            <span style={{ fontSize: 9, color: C.dim, fontFamily: font, minWidth: 20 }}>#{rank}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0', fontFamily: font }}>{ticker}</span>
                            {score != null && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, fontFamily: font,
                                color: Number(score) >= 70 ? '#22c55e' : Number(score) >= 40 ? C.amber : C.dim,
                                marginLeft: 'auto',
                              }}>
                                {typeof score === 'number' ? score.toFixed(1) : score}
                              </span>
                            )}
                          </div>
                          {reasons.map((r: string, i: number) => (
                            <div key={i} style={{ fontSize: 10, color: C.text, fontFamily: sansFont, paddingLeft: 30, lineHeight: 1.5 }}>
                              · {r}
                            </div>
                          ))}
                          {typeof supporting === 'object' && Object.keys(supporting).length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', paddingLeft: 30, marginTop: 4 }}>
                              {Object.entries(supporting).map(([k, v]) => (
                                <span key={k} style={{ fontSize: 9, color: C.dim, fontFamily: font }}>
                                  {k}: <span style={{ color: C.text }}>{String(v)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          {missing && (
                            <div style={{ fontSize: 9, color: C.amber, fontFamily: font, paddingLeft: 30, marginTop: 4, opacity: 0.8 }}>
                              ⚠ {missing}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Report History Modal — Part D ═══ */}
      {reportHistoryModal.open && (
        <div
          onClick={() => setReportHistoryModal(s => ({ ...s, open: false }))}
          style={{
            position: 'fixed', inset: 0, zIndex: 9000,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#0f1117', border: `1px solid ${C.border}`,
              borderRadius: 10, width: 480, maxHeight: '70vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 18px', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e0e0e0', fontFamily: font }}>📜 Saved Reports</span>
              <button
                onClick={() => setReportHistoryModal(s => ({ ...s, open: false }))}
                style={{ background: 'none', border: 'none', color: C.dim, cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
              >×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 18px' }} className="wl-scrollbar">
              {reportHistoryModal.loading && (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 11, color: C.dim, fontFamily: font }}>
                  Loading…
                </div>
              )}
              {!reportHistoryModal.loading && reportHistoryModal.history.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 11, color: C.dim, fontFamily: font }}>
                  No saved reports for this watchlist yet.
                  {selectedStrategy !== 'default' && (
                    <div style={{ marginTop: 8 }}>
                      Click ⟳ REPORT to generate one.
                    </div>
                  )}
                </div>
              )}
              {reportHistoryModal.history.map((h: any, i: number) => {
                const rid = h.report_id ?? h.id ?? '';
                const stratLabel = STRATEGY_DISPLAY[h.strategy_id]?.label ?? h.strategy_name ?? h.strategy_id ?? '—';
                const generatedAt = h.generated_at ? new Date(h.generated_at).toLocaleString() : '—';
                const matchedCount = h.matched_count ?? h.ticker_count ?? null;
                return (
                  <div
                    key={rid || i}
                    onClick={() => rid && openSavedReport(rid)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', marginBottom: 6,
                      background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`,
                      borderRadius: 6, cursor: rid ? 'pointer' : 'default',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (rid) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'; }}
                    onMouseLeave={e => { if (rid) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#c4b5fd', fontFamily: font, marginBottom: 2 }}>{stratLabel}</div>
                      <div style={{ fontSize: 9, color: C.dim, fontFamily: font }}>{generatedAt}</div>
                    </div>
                    {matchedCount != null && (
                      <span style={{ fontSize: 10, color: '#22c55e', fontFamily: font, fontWeight: 700 }}>
                        {matchedCount} matched
                      </span>
                    )}
                    {reportHistoryModal.selectedLoading && <span style={{ fontSize: 10, color: C.dim, fontFamily: font }}>…</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirmation Modal ═══ */}
      {deleteConfirm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9980, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setDeleteConfirm(null); setDeleteErrMsg(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0d0d14', border: `1px solid ${C.border}`, borderRadius: 8, padding: '24px 28px', minWidth: 320, maxWidth: 400, boxShadow: '0 12px 40px rgba(0,0,0,0.7)', fontFamily: font }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
              Remove from {wlMetas?.find(m => m.id === deleteConfirm.wid)?.name || 'Watchlist'}?
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: font, letterSpacing: '0.04em' }}>{deleteConfirm.ticker}</span>
              {deleteConfirm.company && <span style={{ fontSize: 11, color: C.dim }}>{deleteConfirm.company}</span>}
            </div>
            <div style={{ fontSize: 10, color: '#484848', marginBottom: 20, lineHeight: 1.6 }}>
              This permanently removes the stock from this Watchlist.<br />You can add it again later through security search.
            </div>
            {deleteErrMsg && (
              <div style={{ marginBottom: 14, padding: '8px 10px', borderRadius: 4, background: '#3a0a0a', border: '1px solid #ef444430', fontSize: 10, color: '#ef4444', fontFamily: font, lineHeight: 1.5 }}>
                {deleteErrMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteErrMsg(null); }}
                style={{ padding: '6px 16px', borderRadius: 4, background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, fontFamily: font, fontSize: 11, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                disabled={deleteTickerMut.isPending}
                onClick={() => {
                  if (!deleteConfirm) return;
                  setDeleteErrMsg(null);
                  deleteTickerMut.mutate({ wid: deleteConfirm.wid, ticker: deleteConfirm.ticker });
                }}
                style={{ padding: '6px 16px', borderRadius: 4, background: deleteTickerMut.isPending ? '#2a0a0a' : '#3a0a0a', border: '1px solid #ef444440', color: deleteTickerMut.isPending ? '#666' : '#ef4444', fontFamily: font, fontSize: 11, fontWeight: 700, cursor: deleteTickerMut.isPending ? 'default' : 'pointer', transition: 'all 0.15s' }}
              >
                {deleteTickerMut.isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Taxonomy Editor Panel ═══ */}
      {activeTaxonomyEditTicker && (() => {
        const _edStock = allStocks.find(s => (s.ticker || '').toUpperCase() === activeTaxonomyEditTicker.toUpperCase()) ?? {};
        return (
          <WlTaxonomyEditorPanel
            ticker={activeTaxonomyEditTicker}
            stockRow={_edStock}
            taxonomyIndex={taxonomyIndex}
            token={token || ''}
            activeWatchlistId={activeId ?? ''}
            queryClient={qc}
            onClose={() => setActiveTaxonomyEditTicker(null)}
            onSaveSuccess={handleTaxonomySaveSuccess}
          />
        );
      })()}

      {/* ═══ Stock Detail Modal ═══ */}
      {selectedTicker && (() => {
        const _t = selectedTicker.toUpperCase();
        const _sRow = csvMergedScreenerRows?.find(
          (r: any) => (r.ticker || r.symbol || '').toUpperCase() === _t
        ) ?? confluenceRows?.find(
          (r: any) => (r.ticker || r.symbol || '').toUpperCase() === _t
        ) ?? undefined;
        return (
          <StockDetailModal
            key={`${selectedTicker}-${modalNavKey}`}
            ticker={selectedTicker}
            analysis={analysis}
            csvData={watchlist?.csv_data}
            watchlistId={activeId}
            earningsEntry={earningsMap[_t]}
            confluenceRows={confluenceRows ?? csvMergedScreenerRows}
            screenerRow={_sRow}
            allNews={allNews}
            initialPrimaryTab={initialTickerTabs.primaryTab}
            initialEarningsTab={initialTickerTabs.earningsTab}
            onClose={() => { setSelectedTicker(null); setInitialTickerTabs({}); }}
          />
        );
      })()}
    </div>
  );
}
