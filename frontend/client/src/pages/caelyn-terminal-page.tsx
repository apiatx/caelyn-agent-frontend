import { useState, useEffect, Fragment } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import StocksPortfolioPage from './stocks-portfolio';
import { PortfolioCompareWatchlistModal } from '@/components/portfolio-compare-watchlist';
import { GitCompare } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip as RCTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#080c13', surface: '#0d1420', card: '#111927', border: '#1a2540',
  text: '#dde6f0', dim: '#5e7a99', dimLow: '#2a3c55',
  green: '#1fd073', red: '#f04d4d', amber: '#e8a020', teal: '#0ea5e9', purple: '#a78bfa',
  font: '"SF Mono","Fira Code","Consolas",monospace',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type N = number | null | undefined;
interface CTHolding { ticker: string; price: N; change: N; change_pct: N; allocation_pct: N; volume?: N; avg_volume?: N; vol_x?: N; }
interface CTChartPoint { date: string; portfolio: N; sp500: N; }
interface CTAllocTicker { ticker: string; company: string; }
interface CTAllocationItem { label: string; pct: N; color: string; tickers?: CTAllocTicker[]; }
interface CTCorrelationMatrix { tickers: string[]; values: (N)[][]; }
interface CTRiskMetrics {
  weighted_volatility: N; max_drawdown: N;
  top_concentration: N; top_concentration_label: string;
  portfolio_beta: N; sharpe_ratio: N; sortino_ratio: N;
}
interface CTVolatilityItem { ticker: string; vol: N; }
interface CTRiskSuggestion { level: string; title: string; body: string; }
interface CTMover { ticker: string; change_pct: N; price: N; w52_low: N; w52_high: N; }
interface CTEarningsItem { ticker: string; company: string; wtd: string; last_eps: N; next_date: string; est_eps: N; date_iso?: string; }
interface CTNewsItem { symbol: string; headline: string; time_ago: string; }
interface CTTickerItem { symbol: string; price: N; change_pct: N; }
interface CaelynTerminalData {
  is_placeholder?: boolean;
  portfolio: {
    value: N; change_today: N; change_pct_today: N;
    perf_1d: N; perf_5d: N; perf_1m: N; perf_6m: N; perf_1y: N;
    total_return_pct: N; total_return_value: N;
    sentiment: string; market_status: string;
  };
  positions_count: N;
  holdings: CTHolding[];
  performance_chart?: CTChartPoint[];
  performance_charts?: { '1D': CTChartPoint[]; '5D': CTChartPoint[]; '1M': CTChartPoint[]; '6M': CTChartPoint[]; '1Y': CTChartPoint[] };
  asset_allocation: CTAllocationItem[];
  asset_class_allocation?: CTAllocationItem[];
  sector_allocation?: Array<{ label: string; pct: N; color?: string; tickers?: CTAllocTicker[] }>;
  theme_allocation?: Array<{ name: string; weight_pct: N; symbols?: string[]; market_value?: N; color?: string; tickers?: CTAllocTicker[] }>;
  period_returns?: Record<string, { pct: N; value: N; reason?: string | null }>;
  correlation_matrix: CTCorrelationMatrix;
  risk_metrics: CTRiskMetrics;
  volatility: CTVolatilityItem[];
  risk_suggestions: CTRiskSuggestion[];
  top_movers: { gainers: CTMover[]; losers: CTMover[] };
  earnings_calendar: CTEarningsItem[];
  news_ticker: CTNewsItem[];
  ticker_tape: CTTickerItem[];
  _synced_from_local?: boolean;
  as_of: string;
}

// ─── Allocation color maps ─────────────────────────────────────────────────────
const ASSET_CLASS_COLORS: Record<string, string> = {
  'Stocks': '#a78bfa', 'ETFs': '#38bdf8', 'Crypto': '#f59e0b',
  'Commodities': '#ef4444', 'Indices': '#10b981',
};
const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#6366f1', 'Communication Services': '#38bdf8',
  'Healthcare': '#22c55e', 'Financial Services': '#f59e0b',
  'Consumer Cyclical': '#ec4899', 'Consumer Defensive': '#8b5cf6',
  'Industrials': '#f97316', 'Basic Materials': '#06b6d4',
  'Utilities': '#0ea5e9', 'Real Estate': '#a78bfa', 'Energy': '#d97706',
  'Other': '#6b7280',
};
const THEME_PIE_C = ['#6366f1','#38bdf8','#f59e0b','#22c55e','#ec4899','#8b5cf6','#f97316','#06b6d4','#0ea5e9','#a78bfa','#d97706','#ef4444'];

// ─── Placeholder Data (mirrors actual portfolio: NVDA, OSS, BUZZ, GOLD, BTC) ──
const PH_CHART_DATES: Record<string, string[]> = {
  '1D': ['10:00','11:00','12:00','13:00','14:00','15:00','16:00'],
  '5D': ['Mon','Tue','Wed','Thu','Fri'],
  '1M': Array.from({length:6},(_,i)=>`W${i+1}`),
  '6M': ['Oct','Nov','Dec','Jan','Feb','Mar'],
  '1Y': ['Apr','Jun','Aug','Oct','Dec','Feb','Mar'],
};
const mkPH = (dates: string[]) => dates.map(date => ({ date, portfolio: 0, sp500: 0 }));
const PH_CHARTS = { '1D': mkPH(PH_CHART_DATES['1D']), '5D': mkPH(PH_CHART_DATES['5D']), '1M': mkPH(PH_CHART_DATES['1M']), '6M': mkPH(PH_CHART_DATES['6M']), '1Y': mkPH(PH_CHART_DATES['1Y']) };
const PH_CHART = PH_CHARTS['1Y'];
const PH_CORR_TICKERS = ['NVDA','OSS','BUZZ','BTC','GOLD'];
const PH_CORR_VALUES = PH_CORR_TICKERS.map((_, ri) =>
  PH_CORR_TICKERS.map((_, ci) => (ri === ci ? 1.0 : 0))
);
const PLACEHOLDER: CaelynTerminalData = {
  is_placeholder: true,
  portfolio: {
    value: 0, change_today: 0, change_pct_today: 0,
    perf_1d: 0, perf_5d: 0, perf_1m: 0, perf_6m: 0, perf_1y: 0,
    total_return_pct: 0, total_return_value: 0,
    sentiment: '—', market_status: '—',
  },
  positions_count: 0,
  holdings: ['NVDA','OSS','BUZZ','GOLD','BTC'].map(t => ({ ticker: t, price: 0, change: 0, change_pct: 0, allocation_pct: 0 })),
  performance_chart: PH_CHART,
  performance_charts: PH_CHARTS,
  asset_allocation: [
    { label: 'Tech Equity',  pct: 52, color: '#38bdf8' },
    { label: 'Small Cap',    pct: 5,  color: '#6366f1' },
    { label: 'Thematic ETF', pct: 26, color: '#f59e0b' },
    { label: 'Commodities',  pct: 12, color: '#22c55e' },
    { label: 'Crypto',       pct: 5,  color: '#a78bfa' },
  ],
  correlation_matrix: { tickers: PH_CORR_TICKERS, values: PH_CORR_VALUES },
  risk_metrics: { weighted_volatility: 0, max_drawdown: 0, top_concentration: 0, top_concentration_label: '—', portfolio_beta: 0, sharpe_ratio: 0, sortino_ratio: 0 },
  volatility: ['NVDA','OSS','BUZZ','BTC','GOLD'].map(t => ({ ticker: t, vol: 0 })),
  risk_suggestions: [
    { level: 'RISK', title: 'Awaiting Analysis', body: 'Risk suggestions will appear here once the backend data feed is connected.' },
    { level: 'RISK', title: 'Awaiting Analysis', body: 'Portfolio concentration analysis will be shown when market data loads.' },
    { level: 'RISK', title: 'Awaiting Analysis', body: 'Asset correlation risk will be calculated once backend data is available.' },
  ],
  top_movers: {
    gainers: [
      { ticker: '—', change_pct: 0, price: 0, w52_low: 0, w52_high: 1 },
      { ticker: '—', change_pct: 0, price: 0, w52_low: 0, w52_high: 1 },
    ],
    losers: [
      { ticker: '—', change_pct: 0, price: 0, w52_low: 0, w52_high: 1 },
      { ticker: '—', change_pct: 0, price: 0, w52_low: 0, w52_high: 1 },
    ],
  },
  earnings_calendar: [
    { ticker: 'NVDA', company: 'NVIDIA',    wtd: '—', last_eps: 0, next_date: '—', est_eps: 0 },
    { ticker: 'MSFT', company: 'Microsoft', wtd: '—', last_eps: 0, next_date: '—', est_eps: 0 },
    { ticker: 'AAPL', company: 'Apple',     wtd: '—', last_eps: 0, next_date: '—', est_eps: 0 },
    { ticker: 'GOOGL',company: 'Alphabet',  wtd: '—', last_eps: 0, next_date: '—', est_eps: 0 },
    { ticker: 'META', company: 'Meta',      wtd: '—', last_eps: 0, next_date: '—', est_eps: 0 },
    { ticker: 'AMZN', company: 'Amazon',    wtd: '—', last_eps: 0, next_date: '—', est_eps: 0 },
    { ticker: 'OSS',  company: 'One Stop',  wtd: '—', last_eps: 0, next_date: '—', est_eps: 0 },
  ],
  ticker_tape: ['SPY','QQQ','NVDA','GLD','BTC-USD','ETH-USD','IWM','VIX','TLT','DXY'].map(s => ({ symbol: s, price: 0, change_pct: 0 })),
  news_ticker: [
    { symbol: '—', headline: 'Awaiting live news feed — connect backend to populate market intelligence', time_ago: '—' },
    { symbol: '—', headline: 'Portfolio analytics will appear here once the data service is online', time_ago: '—' },
  ],
  as_of: '',
};

// ─── Format helpers ───────────────────────────────────────────────────────────
const coerce = (n: N): number => (n == null || !isFinite(n as number)) ? 0 : (n as number);
const fmt$   = (n: N) => '$' + Math.abs(coerce(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN   = (n: N, d = 2) => coerce(n).toFixed(d);
const sign   = (n: N) => coerce(n) >= 0 ? '+' : '';
const pctClr = (n: N) => coerce(n) >= 0 ? C.green : C.red;
const isNull = (n: N) => n == null;

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function CardHdr({ label, badge }: { label: string; badge?: string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderBottom:`1px solid ${C.border}`, background:'#0d1623' }}>
      <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, textTransform:'uppercase' }}>{label}</span>
      {badge && <span style={{ fontSize:9, fontWeight:700, letterSpacing:1, color:C.teal, textTransform:'uppercase', background:`${C.teal}18`, border:`1px solid ${C.teal}44`, borderRadius:3, padding:'1px 6px' }}>{badge}</span>}
    </div>
  );
}

function RangeBar({ low, high, price, ph }: { low:number; high:number; price:number; ph:boolean }) {
  const range = high - low;
  const pos = (!ph && range > 0) ? Math.min(100, Math.max(0, ((price - low) / range) * 100)) : 50;
  return (
    <div style={{ position:'relative', height:4, background:C.dimLow, borderRadius:2, marginTop:4 }}>
      <div style={{ position:'absolute', left:0, width:`${pos}%`, height:'100%', background: ph ? C.dimLow : C.teal, borderRadius:2 }} />
      {!ph && <div style={{ position:'absolute', left:`${pos}%`, top:-2, width:2, height:8, background:'#fff', borderRadius:1, transform:'translateX(-50%)' }} />}
    </div>
  );
}

function SuggCard({ s }: { s: CTRiskSuggestion }) {
  const clrs = { RISK: C.red, WARN: C.amber, INFO: C.teal };
  const clr = clrs[s.level] ?? C.dim;
  return (
    <div style={{ border:`1px solid ${clr}33`, borderRadius:5, padding:'7px 9px', background:`${clr}08`, marginBottom:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
        <span style={{ fontSize:8, fontWeight:800, color:clr, background:`${clr}22`, borderRadius:3, padding:'1px 5px', letterSpacing:1 }}>{s.level}</span>
        <span style={{ fontSize:10, fontWeight:700, color:C.text }}>{s.title}</span>
      </div>
      <p style={{ fontSize:10, color:C.dim, margin:0, lineHeight:1.55 }}>{s.body}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CaelynTerminalPage() {
  const [perfPeriod, setPerfPeriod] = useState<'1D'|'5D'|'1M'|'6M'|'1Y'>('1Y');
  const [view, setView] = useState<'terminal'|'dashboard'>('terminal');
  const [compareOpen, setCompareOpen] = useState(false);
  const [allocTab, setAllocTab] = useState<'asset'|'sectors'|'themes'>('themes');
  type SortDir = 'asc'|'desc';
  const [holdSort, setHoldSort] = useState<{ col: string; dir: SortDir }>({ col: 'ALLOC', dir: 'desc' });
  const [earnSort, setEarnSort] = useState<{ col: string; dir: SortDir }>({ col: 'DATE', dir: 'asc' });
  const [optSort,  setOptSort]  = useState<{ col: string; dir: SortDir }>({ col: 'SCORE', dir: 'desc' });
  const [allocHover, setAllocHover] = useState<{ label: string; tickers: CTAllocTicker[]; x: number; y: number } | null>(null);
  const [categorizingThemes, setCategorizingThemes] = useState(false);
  const [categorizeResult, setCategorizeResult] = useState<'success'|'error'|null>(null);
  // ticker -> themeName authoritative client cache.
  // Populated automatically from any successful FastAPI theme_allocation render
  // (everything except the Unclassified bucket). Used to (a) re-bucket Unclassified
  // tickers locally if FastAPI regresses, and (b) suppress the CATEGORIZE button
  // for any ticker we've already classified once.
  const [tickerThemeMap, setTickerThemeMap] = useState<Record<string,string>>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('ticker_theme_map') || '{}') || {};
      // Strip any stale __UNCATEGORIZED__ sentinels so the CATEGORIZE button reappears
      const cleaned: Record<string,string> = {};
      for (const [k, v] of Object.entries(raw)) { if (v && v !== '__UNCATEGORIZED__') cleaned[k] = v as string; }
      return cleaned;
    }
    catch { return {}; }
  });
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStage, setAiStage] = useState('');
  const [goals, setGoals] = useState<{ target_value: number; target_return: number; horizon: string }>(() => {
    try { return JSON.parse(localStorage.getItem('portfolio_goals') || 'null') ?? { target_value: 500000, target_return: 25, horizon: '3Y' }; }
    catch { return { target_value: 500000, target_return: 25, horizon: '3Y' }; }
  });
  const [editingGoals, setEditingGoals] = useState(false);
  const [editGoalVals, setEditGoalVals] = useState<{ target_value: string; target_return: string; horizon: string }>({ target_value: '', target_return: '', horizon: '' });
  const queryClient = useQueryClient();

  const handleCategorizeThemes = async (symbols: string[]) => {
    setCategorizingThemes(true);
    setCategorizeResult(null);
    try {
      const res = await fetch('/api/portfolio/categorize-themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: symbols }),
      });
      if (!res.ok) throw new Error('Failed');
      const body = await res.json().catch(() => ({} as any));
      // Try to capture per-ticker assignments directly from FastAPI's response so
      // we cache them even if the next /api/caelyn-terminal still puts them in Unclassified.
      const newAssignments: Record<string,string> = {};
      const themesArr = body?.theme_allocation ?? body?.themes ?? body?.assignments ?? body?.classified ?? [];
      if (Array.isArray(themesArr)) {
        for (const t of themesArr) {
          const themeName = t?.name ?? t?.theme;
          const syms = t?.symbols ?? (t?.ticker ? [t.ticker] : []);
          if (themeName && !/unclassified/i.test(themeName) && Array.isArray(syms)) {
            for (const s of syms) newAssignments[String(s).toUpperCase()] = themeName;
          }
        }
      }
      if (body?.classifications && typeof body.classifications === 'object') {
        for (const [tk, theme] of Object.entries(body.classifications)) {
          if (theme && !/unclassified/i.test(String(theme))) newAssignments[String(tk).toUpperCase()] = String(theme);
        }
      }
      // Only stamp tickers that got real theme names — leave unresolved tickers
      // with no entry so the CATEGORIZE button stays visible for them.
      const next = { ...tickerThemeMap, ...newAssignments };
      setTickerThemeMap(next);
      try { localStorage.setItem('ticker_theme_map', JSON.stringify(next)); } catch {}
      setCategorizeResult('success');
      setTimeout(() => setCategorizeResult(null), 4000);
      queryClient.invalidateQueries({ queryKey: ['caelyn-terminal'] });
    } catch {
      setCategorizeResult('error');
      setTimeout(() => setCategorizeResult(null), 4000);
    } finally {
      setCategorizingThemes(false);
    }
  };

  const { data, isLoading, isFetching } = useQuery<CaelynTerminalData>({
    queryKey: ['caelyn-terminal'],
    queryFn: async () => {
      const res = await fetch('/api/caelyn-terminal');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    staleTime: 0,
    retry: 1,
  });

  const { data: dashboardHoldings } = useQuery<{ id: string; ticker: string; shares: number; avgCost: number }[]>({
    queryKey: ['stock-holdings'],
    queryFn: async () => {
      const res = await fetch('/api/stock-holdings');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    staleTime: 60_000,
  });

  const { data: portfolioNewsData } = useQuery<Record<string, { title: string; url: string; source: string; published_at: string }[]>>({
    queryKey: ['portfolio-news'],
    queryFn: async () => {
      const r = await fetch('/api/portfolio/news');
      if (!r.ok) return {};
      return r.json();
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });

  const { data: portfolioOptions } = useQuery<{ tickers: Array<{ ticker: string; underlying_price?: N; price_change_pct?: N; pc_ratio?: N; iv_current?: N; expected_move?: N; primary_signal?: string | null; confidence?: string | null; composite_score?: N; total_volume?: N; call_put_volume_ratio?: N; }> }>({
    queryKey: ['portfolio-options'],
    queryFn: async () => {
      const r = await fetch('/api/portfolio/options');
      if (!r.ok) return { tickers: [] };
      return r.json();
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });


  const handleAIReview = async () => {
    if (!dashboardHoldings?.length) return;
    setAiLoading(true);
    setAiReview(null);
    const stages = ['Analyzing portfolio...','Pulling price data...','Scanning technicals...','Checking fundamentals...','Reading sentiment...','Building portfolio view...','Generating ratings...','Almost done — this can take up to 30 seconds...'];
    let idx = 0;
    setAiStage(stages[0]);
    const iv = setInterval(() => { idx++; if (idx < stages.length) setAiStage(stages[idx]); }, 2000);
    try {
      const holdingsPayload = dashboardHoldings.map(h => ({ ticker: h.ticker, shares: h.shares, avg_cost: h.avgCost }));
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      const res = await fetch('/api/portfolio-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: holdingsPayload }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Server returned ${res.status}${errText ? ': ' + errText.slice(0, 120) : ''}`);
      }
      const rev = await res.json();
      setAiReview(rev.message || rev.text || rev.analysis || 'No analysis returned.');
    } catch (err: any) {
      if (err.name === 'AbortError') setAiReview('Portfolio review timed out. Please try again.');
      else setAiReview(`Failed to get portfolio review. Please try again. (${err.message})`);
    } finally {
      clearInterval(iv);
      setAiStage('');
      setAiLoading(false);
    }
  };

  // Passively learn ticker -> theme assignments from any successful FastAPI render.
  // Anything in a non-Unclassified bucket is recorded once and persisted forever
  // (until user removes the ticker from their portfolio or manually clears).
  useEffect(() => {
    const themes = data?.theme_allocation;
    if (!Array.isArray(themes) || themes.length === 0) return;
    const learned: Record<string,string> = {};
    for (const t of themes) {
      const name = (t as any)?.name;
      const syms = (t as any)?.symbols ?? [];
      if (!name || /unclassified/i.test(name) || !Array.isArray(syms)) continue;
      for (const s of syms) {
        const sym = String(s).toUpperCase();
        if (!tickerThemeMap[sym] || tickerThemeMap[sym] !== name) learned[sym] = name;
      }
    }
    if (Object.keys(learned).length > 0) {
      const next = { ...tickerThemeMap, ...learned };
      setTickerThemeMap(next);
      try { localStorage.setItem('ticker_theme_map', JSON.stringify(next)); } catch {}
    }
  }, [data?.theme_allocation]);

  useEffect(() => {
    const canonicalSymbols  = (dashboardHoldings ?? []).map(h => h.ticker).sort();
    const terminalSymbols   = (data?.holdings ?? []).map((h: CTHolding) => h.ticker).sort();
    const symbolsMatch      = JSON.stringify(canonicalSymbols) === JSON.stringify(terminalSymbols);
    const renderedState     = data ? (data.is_placeholder ? 'placeholder' : data._synced_from_local ? 'synced_local' : 'live') : 'no_data';
    const chartPts          = data?.performance_charts?.[perfPeriod] ?? data?.performance_chart ?? [];
    const missingUiFields: string[] = [];
    if (!chartPts || chartPts.length < 2) missingUiFields.push(`performance_chart(${chartPts.length ?? 0}pts<2)`);
    if (!data?.volatility?.length)        missingUiFields.push('volatility(empty—needs_history)');
    const volCount   = data?.volatility?.length ?? 0;
    const perfPeriodCounts: Record<string, number> = {};
    if (data?.performance_charts) {
      for (const k of ['1D','5D','1M','6M','1Y'] as const) {
        perfPeriodCounts[k] = (data.performance_charts as any)[k]?.length ?? 0;
      }
    }
    console.log('[portfolio-terminal-render-debug]', JSON.stringify({
      dashboardSymbols: canonicalSymbols, terminalSymbols, allMatch: symbolsMatch,
      backendKeys: data ? Object.keys(data) : [],
      performancePointCounts: Object.keys(perfPeriodCounts).length ? perfPeriodCounts : { current: chartPts?.length ?? 0 },
      volatilityCount: volCount, renderedState, missingUiFields,
    }));
  }, [data, dashboardHoldings, isFetching, isLoading, perfPeriod]);

  // Always render the full layout — use placeholder when backend not yet connected
  const d   = data ?? PLACEHOLDER;
  const ph  = d.is_placeholder ?? !data;

  // ── Page context for chatbot ──────────────────────────────────────────────
  useSetPageContext((() => {
    const parts = ['[Page: Portfolio Terminal]'];
    if (!ph && d.holdings?.length) {
      const holdings = d.holdings.map((h:any)=>`${h.ticker}${h.allocation_pct!=null?`(${Number(h.allocation_pct).toFixed(1)}%)`:''}`).join(', ');
      parts.push(`Portfolio holdings: ${holdings}`);
      const p = d.portfolio;
      if (p.perf_1d!=null) parts.push(`Today: ${p.perf_1d>0?'+':''}${Number(p.perf_1d).toFixed(2)}% · 1M: ${p.perf_1m!=null?(p.perf_1m>0?'+':'')+Number(p.perf_1m).toFixed(2)+'%':'—'}`);
      if (p.sentiment) parts.push(`Sentiment: ${p.sentiment}`);
    } else {
      parts.push('Portfolio analytics terminal — shows holdings, performance, risk metrics, investment style, goals, news, and earnings calendar for the connected portfolio.');
    }
    return parts.join('\n');
  })(), [d, ph]);
  const p   = d.portfolio;

  // ── Derived values for new panels ────────────────────────────────────────
  const styleScore = (() => {
    if (ph || !d?.risk_metrics) return null;
    const rm = d.risk_metrics;
    const beta    = Math.min(Math.max((coerce(rm.portfolio_beta) - 0.5) / 1.5, 0), 1);
    const vol     = Math.min(coerce(rm.weighted_volatility) / 55, 1);
    const conc    = Math.min(coerce(rm.top_concentration) / 100, 1);
    const posCount = coerce(d.positions_count);
    const diversity = posCount > 0 ? Math.max(0, 1 - (posCount - 1) / 19) : 0.5;
    const dd      = Math.min(Math.abs(coerce(rm.max_drawdown)) / 40, 1);
    return Math.round((beta * 0.28 + vol * 0.28 + conc * 0.18 + diversity * 0.13 + dd * 0.13) * 100);
  })();
  const styleLabel = styleScore === null ? null
    : styleScore < 18 ? 'Conservative' : styleScore < 36 ? 'Moderate'
    : styleScore < 55 ? 'Growth'        : styleScore < 72 ? 'Aggressive' : 'High Risk';
  const styleColor = styleScore === null ? C.dim
    : styleScore < 18 ? C.green : styleScore < 36 ? C.teal
    : styleScore < 55 ? C.amber : styleScore < 72 ? '#f97316' : C.red;

  const topPerformers = (() => {
    if (!d?.holdings?.length || !dashboardHoldings?.length) return [];
    return d.holdings.map(h => {
      const raw = dashboardHoldings.find(r => r.ticker === h.ticker);
      const avgCost = raw?.avgCost ?? 0;
      const returnPct = avgCost > 0 && h.price != null
        ? ((Number(h.price) - avgCost) / avgCost) * 100 : null;
      return { ticker: h.ticker, returnPct, price: h.price, avgCost };
    }).filter(h => h.returnPct !== null)
      .sort((a, b) => (b.returnPct ?? 0) - (a.returnPct ?? 0))
      .slice(0, 6);
  })();

  const flatPortfolioNews = (() => {
    if (!portfolioNewsData) return [];
    const items: { ticker: string; title: string; url: string; source: string; published_at: string }[] = [];
    for (const [ticker, articles] of Object.entries(portfolioNewsData)) {
      for (const a of articles) items.push({ ticker, ...a });
    }
    return items.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()).slice(0, 50);
  })();

  // Placeholder-aware formatters
  const D$   = (n: N) => (ph || isNull(n)) ? '—' : fmt$(n);
  const DN   = (n: N, dec = 2) => (ph || isNull(n)) ? '—' : fmtN(n, dec);
  const DPct = (n: N, dec = 2) => (ph || isNull(n)) ? '—' : `${sign(n)}${fmtN(n, dec)}%`;
  const DM   = (n: N, dec: number, unit: string) => (ph || isNull(n)) ? '—' : `${fmtN(n, dec)}${unit}`;
  const DS   = (s: string) => s === '—' ? '—' : s;

  const sentColor = p.sentiment === 'BULLISH' ? C.green : p.sentiment === 'BEARISH' ? C.red : C.amber;
  const mktColor  = p.market_status === 'OPEN' ? C.green : p.market_status === 'PRE-MARKET' ? C.amber : C.red;
  const pr = d.period_returns;
  const perfMap: Record<string, N> = {
    '1D': pr?.['1D']?.pct ?? p.perf_1d,
    '5D': pr?.['5D']?.pct ?? p.perf_5d,
    '1M': pr?.['1M']?.pct ?? p.perf_1m,
    '6M': pr?.['6M']?.pct ?? p.perf_6m,
    '1Y': pr?.['1Y']?.pct ?? p.perf_1y,
  };
  const chartPoints = d.performance_charts?.[perfPeriod] ?? d.performance_chart ?? (ph ? PH_CHART : []);
  const hasChartData = (chartPoints as any[]).length >= 2;

  const posLabel  = (ph || isNull(d.positions_count)) ? '— Positions' : `${d.positions_count} Positions`;
  const liveColor = (isLoading || isFetching) ? C.amber : ph ? C.red : C.green;
  const liveLabel = (isLoading || isFetching) ? 'CONNECTING' : ph ? 'OFFLINE' : 'LIVE';

  return (
    <div style={{ background:C.bg, color:C.text, fontFamily:C.font, fontSize:12, height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Thin loading bar */}
      {(isLoading || isFetching) && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, zIndex:100, overflow:'hidden' }}>
          <div style={{ height:'100%', width:'40%', background:C.teal, animation:'ctslide 1.4s ease-in-out infinite' }} />
          <style>{`@keyframes ctslide{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ background:'#060b14', borderBottom:`1px solid ${C.border}`, padding:'0 14px', height:46, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:28, height:28, borderRadius:5, background:`linear-gradient(135deg, ${C.teal}, #0369a1)`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:11, color:'#fff', letterSpacing:0.5 }}>{view === 'terminal' ? 'PT' : 'PD'}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, letterSpacing:1.5, color:C.text }}>{view === 'terminal' ? 'PORTFOLIO TERMINAL' : 'PORTFOLIO DASHBOARD'}</div>
          </div>
          {/* ── View Toggle ── */}
          <div style={{ display:'flex', background:'#0d1623', borderRadius:5, padding:2, border:`1px solid ${C.border}`, marginLeft:8 }}>
            {(['TERMINAL','DASHBOARD'] as const).map(v => {
              const isActive = view === v.toLowerCase();
              return (
                <button key={v} onClick={() => setView(v.toLowerCase() as 'terminal'|'dashboard')} style={{ fontSize:9, fontWeight:800, padding:'3px 12px', borderRadius:4, cursor:'pointer', border:'none', background: isActive ? C.teal : 'transparent', color: isActive ? '#fff' : C.dim, letterSpacing:1, transition:'all 0.15s' }}>{v}</button>
              );
            })}
          </div>
        </div>

        {view === 'terminal' ? (
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:900, color:C.text }}>{ph ? '—' : fmt$(p.value)}</div>
              <div style={{ fontSize:9, color: ph ? C.dim : pctClr(p.change_today) }}>
                {ph ? '— today' : `${sign(p.change_today)}${fmt$(p.change_today)} today`}
              </div>
            </div>
            <div style={{ borderLeft:`1px solid ${C.border}`, paddingLeft:18, flexShrink:0 }}>
              <div style={{ fontSize:7, color:C.dim, letterSpacing:2, marginBottom:3, textTransform:'uppercase' }}>Change</div>
              <div style={{ display:'flex', gap:12 }}>
                {(['1D','5D','1M','6M','1Y'] as const).map(k => (
                  <div key={k} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                    <span style={{ fontSize:9, color:C.dim, letterSpacing:1 }}>{k}</span>
                    <span style={{ fontSize:11, fontWeight:700, color: ph ? C.dim : pctClr(perfMap[k]) }}>{DPct(perfMap[k])}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderLeft:`1px solid ${C.border}`, paddingLeft:18, flexShrink:0 }}>
              <div style={{ fontSize:9, color:C.dim, letterSpacing:1 }}>TOTAL RETURN</div>
              <div style={{ fontSize:13, fontWeight:800, color: ph ? C.dim : pctClr(p.total_return_pct) }}>{DPct(p.total_return_pct)}</div>
            </div>
            <div style={{ borderLeft:`1px solid ${C.border}`, paddingLeft:18, flexShrink:0 }}>
              <div style={{ fontSize:9, color:C.dim, letterSpacing:1 }}>SENTIMENT</div>
              <div style={{ fontSize:11, fontWeight:700, color: ph ? C.dim : sentColor }}>{DS(p.sentiment)}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:liveColor, boxShadow:`0 0 6px ${liveColor}`, display:'inline-block' }} />
              <span style={{ fontSize:10, color:C.dim }}>{liveLabel}</span>
              <span style={{ fontSize:10, color:mktColor, background:`${mktColor}18`, border:`1px solid ${mktColor}55`, borderRadius:3, padding:'1px 7px', fontWeight:700 }}>
                MARKET: {ph ? '—' : p.market_status}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:900, color:C.text }}>{ph ? '—' : fmt$(p.value)}</div>
              <div style={{ fontSize:9, color: ph ? C.dim : pctClr(p.change_today) }}>
                {ph ? '— today' : `${sign(p.change_today)}${fmt$(p.change_today)} today`}
              </div>
            </div>
            <div style={{ borderLeft:`1px solid ${C.border}`, paddingLeft:18, flexShrink:0 }}>
              <div style={{ fontSize:7, color:C.dim, letterSpacing:2, marginBottom:3, textTransform:'uppercase' }}>Change</div>
              <div style={{ display:'flex', gap:12 }}>
                {(['1D','5D','1M','6M','1Y'] as const).map(k => (
                  <div key={k} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
                    <span style={{ fontSize:9, color:C.dim, letterSpacing:1 }}>{k}</span>
                    <span style={{ fontSize:11, fontWeight:700, color: ph ? C.dim : pctClr(perfMap[k]) }}>{DPct(perfMap[k])}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderLeft:`1px solid ${C.border}`, paddingLeft:18, flexShrink:0 }}>
              <div style={{ fontSize:9, color:C.dim, letterSpacing:1 }}>TOTAL RETURN</div>
              <div style={{ fontSize:13, fontWeight:800, color: ph ? C.dim : pctClr(p.total_return_pct) }}>{DPct(p.total_return_pct)}</div>
            </div>
            <div style={{ borderLeft:`1px solid ${C.border}`, paddingLeft:18, flexShrink:0 }}>
              <div style={{ fontSize:9, color:C.dim, letterSpacing:1 }}>SENTIMENT</div>
              <div style={{ fontSize:11, fontWeight:700, color: ph ? C.dim : sentColor }}>{DS(p.sentiment)}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:liveColor, boxShadow:`0 0 6px ${liveColor}`, display:'inline-block' }} />
              <span style={{ fontSize:10, color:C.dim }}>{liveLabel}</span>
              <span style={{ fontSize:10, color:mktColor, background:`${mktColor}18`, border:`1px solid ${mktColor}55`, borderRadius:3, padding:'1px 7px', fontWeight:700 }}>
                MARKET: {ph ? '—' : p.market_status}
              </span>
            </div>
          </div>
        )}
      </div>

      {view === 'terminal' && (<>

      {/* ── TICKER TAPE ──────────────────────────────────────────────── */}
      <div style={{ background:'#07101a', borderBottom:`1px solid ${C.border}`, padding:'4px 0', display:'flex', alignItems:'center', overflowX:'auto', flexShrink:0, scrollbarWidth:'none' }}>
        <div style={{ fontSize:9, fontWeight:800, color:C.red, background:`${C.red}22`, padding:'0 10px', height:'100%', display:'flex', alignItems:'center', letterSpacing:1.5, borderRight:`1px solid ${C.border}`, flexShrink:0, minHeight:22 }}>MARKETS</div>
        <div style={{ display:'flex', gap:20, padding:'0 14px', overflowX:'auto', scrollbarWidth:'none' }}>
          {d.ticker_tape.map((t, i) => (
            <div key={i} style={{ display:'flex', gap:6, alignItems:'center', whiteSpace:'nowrap', flexShrink:0 }}>
              <span style={{ color:C.dim, fontSize:10 }}>{t.symbol}</span>
              <span style={{ color:C.text, fontSize:10, fontWeight:600 }}>{ph ? '—' : fmtN(t.price, 2)}</span>
              <span style={{ fontSize:10, color: ph ? C.dim : pctClr(t.change_pct) }}>{ph ? '—' : `${sign(t.change_pct)}${fmtN(t.change_pct)}%`}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN GRID (row: LeftCol | RightSide) ──────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'row', overflow:'hidden', minHeight:0 }}>

        {/* ── LEFT COL: Holdings + Earnings + Goals (full height) ─── */}
        <div style={{ flex:'0 0 235px', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

          {/* Holdings */}
          {(() => {
            const mkHoldSort = (col: string) => () => setHoldSort(s => ({ col, dir: s.col === col ? (s.dir === 'asc' ? 'desc' : 'asc') : (col === 'TICKER' ? 'asc' : 'desc') }));
            const parseNum = (s: string | N) => typeof s === 'number' ? s : 0;
            const sortedHoldings = ph ? d.holdings : [...d.holdings].sort((a, b) => {
              let av: any, bv: any;
              if (holdSort.col === 'TICKER')  { av = a.ticker; bv = b.ticker; return holdSort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av); }
              if (holdSort.col === 'PRICE')   { av = parseNum(a.price);        bv = parseNum(b.price); }
              if (holdSort.col === 'VOLX')    {
                const av0 = (a.vol_x != null ? a.vol_x : (a.volume && a.avg_volume ? (a.volume as number) / (a.avg_volume as number) : 0));
                const bv0 = (b.vol_x != null ? b.vol_x : (b.volume && b.avg_volume ? (b.volume as number) / (b.avg_volume as number) : 0));
                av = av0; bv = bv0;
              }
              if (holdSort.col === 'CHG%')    { av = parseNum(a.change_pct);   bv = parseNum(b.change_pct); }
              if (holdSort.col === 'ALLOC')   { av = parseNum(a.allocation_pct); bv = parseNum(b.allocation_pct); }
              return holdSort.dir === 'asc' ? av - bv : bv - av;
            });
            const thStyle = (col: string) => ({ padding:'4px 3px', color: holdSort.col === col ? C.teal : C.dim, fontWeight:600, textAlign:(col==='TICKER'?'left':'right') as 'left'|'right', fontSize:8, letterSpacing:0.3, overflow:'hidden', cursor:'pointer', userSelect:'none' as const, whiteSpace:'nowrap' as const });
            const arrow = (col: string) => holdSort.col === col ? (holdSort.dir === 'asc' ? '▲' : '▼') : '';
            return (
              <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flex:'3 1 0', minHeight:0, overflow:'hidden' }}>
                <CardHdr label="Holdings" badge={posLabel} />
                <div style={{ overflowY:'auto', flex:1 }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:9, tableLayout:'fixed' }}>
                    <colgroup>
                      <col style={{ width:'22%' }} /><col style={{ width:'22%' }} /><col style={{ width:'19%' }} /><col style={{ width:'19%' }} /><col style={{ width:'18%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:'#0d1623' }}>
                        {(['TICKER','PRICE','VOLX','CHG%','ALLOC'] as const).map(h => (
                          <th key={h} style={thStyle(h)} onClick={mkHoldSort(h)}>{h} <span style={{ fontSize:6, opacity:0.7 }}>{arrow(h)}</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHoldings.map((h, i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${C.dimLow}22` }}>
                          <td style={{ padding:'4px 3px', color:C.teal, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.ticker}</td>
                          <td style={{ padding:'4px 3px', textAlign:'right', color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{D$(h.price)}</td>
                          {(() => {
                            const vx = h.vol_x != null ? (h.vol_x as number) : (h.volume && h.avg_volume ? (h.volume as number) / (h.avg_volume as number) : null);
                            const isUnusual = vx != null && vx >= 2.5;
                            const color = ph || vx == null ? C.dim : isUnusual ? C.amber : C.text;
                            const txt = ph || vx == null ? '—' : `${fmtN(vx, 1)}×`;
                            return <td title={isUnusual ? 'Unusual: ≥ 2.5× average volume' : 'Volume vs 30-day average'} style={{ padding:'4px 3px', textAlign:'right', color, fontWeight: isUnusual ? 700 : 500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{txt}</td>;
                          })()}
                          <td style={{ padding:'4px 3px', textAlign:'right', color: ph ? C.dim : pctClr(h.change_pct), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{DPct(h.change_pct)}</td>
                          <td style={{ padding:'4px 3px', textAlign:'right', color:C.purple, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ph ? '—' : `${fmtN(h.allocation_pct,1)}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Earnings */}
          {(() => {
            const mkEarnSort = (col: string) => () => setEarnSort(s => ({ col, dir: s.col === col ? (s.dir === 'asc' ? 'desc' : 'asc') : (col === 'TICKER' ? 'asc' : col === 'DATE' ? 'asc' : 'desc') }));
            const parseVal = (s: N | string): number => {
              if (s == null) return -Infinity;
              const str = String(s).replace(/[$,+%M]/g, '').trim();
              if (str === '—' || str === '') return -Infinity;
              return parseFloat(str) || -Infinity;
            };
            const sortedEarnings = ph ? d.earnings_calendar : [...d.earnings_calendar].sort((a, b) => {
              const dir = earnSort.dir === 'asc' ? 1 : -1;
              if (earnSort.col === 'TICKER') return dir * a.ticker.localeCompare(b.ticker);
              if (earnSort.col === 'DATE') {
                const EARN_MONS: Record<string,string> = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
                const toIso = (item: typeof a): string => {
                  if (item.date_iso) return item.date_iso;
                  const nd = (item.next_date || '').trim();
                  const m = nd.match(/^(\w{3})\s+(\d+)$/);
                  if (!m || !EARN_MONS[m[1]]) return '';
                  const mon = EARN_MONS[m[1]], day = m[2].padStart(2,'0');
                  const now = new Date();
                  const yr = parseInt(mon) < (now.getMonth() + 1) ? now.getFullYear() + 1 : now.getFullYear();
                  return `${yr}-${mon}-${day}`;
                };
                const ai = toIso(a), bi = toIso(b);
                if (!ai && !bi) return 0; if (!ai) return dir; if (!bi) return -dir;
                return dir * (ai < bi ? -1 : ai > bi ? 1 : 0);
              }
              if (earnSort.col === 'WTD')  return dir * (parseVal(a.wtd)    - parseVal(b.wtd));
              if (earnSort.col === 'LAST') return dir * (parseVal(a.last_eps) - parseVal(b.last_eps));
              if (earnSort.col === 'EST')  return dir * (parseVal(a.est_eps) - parseVal(b.est_eps));
              return 0;
            });
            const thE = (col: string) => ({ padding:'3px 3px', color: earnSort.col === col ? C.teal : C.dim, fontWeight:600, textAlign:(col==='TICKER'?'left':'right') as 'left'|'right', fontSize:7, letterSpacing:0.2, cursor:'pointer', userSelect:'none' as const, whiteSpace:'nowrap' as const });
            const arrE = (col: string) => earnSort.col === col ? (earnSort.dir === 'asc' ? '▲' : '▼') : '';
            return (
              <div style={{ background:C.card, flex:'1.5 1 0', minHeight:0, borderBottom:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <CardHdr label="Earnings" />
                <div style={{ overflowY:'auto', flex:1 }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:8, tableLayout:'fixed' }}>
                    <colgroup>
                      <col style={{ width:'22%' }} /><col style={{ width:'20%' }} /><col style={{ width:'18%' }} /><col style={{ width:'22%' }} /><col style={{ width:'18%' }} />
                    </colgroup>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:'#0d1623' }}>
                        {(['TICKER','WTD','LAST','DATE','EST'] as const).map(h => (
                          <th key={h} style={thE(h)} onClick={mkEarnSort(h)}>{h} <span style={{ fontSize:6, opacity:0.7 }}>{arrE(h)}</span></th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEarnings.map((e, i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${C.dimLow}22` }}>
                          <td style={{ padding:'3px 3px', color:C.teal, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.ticker}</td>
                          <td style={{ padding:'3px 3px', textAlign:'right', color: ph ? C.dim : pctClr(parseFloat(e.wtd)), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.wtd}</td>
                          <td style={{ padding:'3px 3px', textAlign:'right', color:C.dim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ph ? '—' : e.last_eps}</td>
                          <td style={{ padding:'3px 3px', textAlign:'right', color:C.amber, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.next_date}</td>
                          <td style={{ padding:'3px 3px', textAlign:'right', color:C.dim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ph ? '—' : e.est_eps}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* ── Investment Goals — anchored to bottom of LeftCol ── */}
          <div style={{ flex:'0 0 auto', display:'flex', flexDirection:'column', overflow:'hidden', background:C.card, maxHeight:175 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderBottom:`1px solid ${C.border}`, background:'#0d1623', flexShrink:0 }}>
              <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, textTransform:'uppercase' }}>Investment Goals</span>
              <button onClick={() => {
                if (!editingGoals) {
                  setEditGoalVals({ target_value: String(goals.target_value), target_return: String(goals.target_return), horizon: goals.horizon });
                } else {
                  const tv = parseFloat(editGoalVals.target_value) || goals.target_value;
                  const tr = parseFloat(editGoalVals.target_return) || goals.target_return;
                  const updated = { target_value: tv, target_return: tr, horizon: editGoalVals.horizon || goals.horizon };
                  setGoals(updated);
                  localStorage.setItem('portfolio_goals', JSON.stringify(updated));
                }
                setEditingGoals(e => !e);
              }} style={{ fontSize:8, fontWeight:700, letterSpacing:0.8, padding:'2px 7px', borderRadius:3, border:`1px solid ${editingGoals ? C.teal : C.border}`, background: editingGoals ? `${C.teal}22` : 'transparent', color: editingGoals ? C.teal : C.dim, cursor:'pointer' }}>
                {editingGoals ? 'SAVE' : 'EDIT'}
              </button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'8px 12px', display:'flex', flexDirection:'column', gap:8 }}>
              {(() => {
                const current = ph ? 0 : coerce(p.value);
                const target = goals.target_value;
                const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                return (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:8, color:C.dim, fontWeight:600 }}>Portfolio Target</span>
                      <span style={{ fontSize:8, color:C.teal, fontWeight:700 }}>{ph ? '—' : `${fmtN(pct, 0)}%`}</span>
                    </div>
                    {editingGoals ? (
                      <input type="number" value={editGoalVals.target_value} onChange={e => setEditGoalVals(v => ({ ...v, target_value: e.target.value }))}
                        style={{ width:'100%', background:'#0a1020', border:`1px solid ${C.teal}55`, borderRadius:3, padding:'2px 6px', color:C.text, fontSize:9, fontFamily:C.font, outline:'none', boxSizing:'border-box' }} />
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ flex:1, height:4, background:C.dimLow, borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: pct >= 100 ? C.green : C.teal, borderRadius:2, transition:'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize:7, color:C.dim, whiteSpace:'nowrap' }}>{ph ? '—' : fmt$(current)} / {fmt$(target)}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              {(() => {
                const current = ph ? 0 : coerce(p.total_return_pct);
                const target = goals.target_return;
                const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                return (
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:8, color:C.dim, fontWeight:600 }}>Return Target</span>
                      <span style={{ fontSize:8, color: ph ? C.dim : pctClr(current), fontWeight:700 }}>{ph ? '—' : `${sign(current)}${fmtN(current, 1)}%`}</span>
                    </div>
                    {editingGoals ? (
                      <input type="number" value={editGoalVals.target_return} onChange={e => setEditGoalVals(v => ({ ...v, target_return: e.target.value }))}
                        style={{ width:'100%', background:'#0a1020', border:`1px solid ${C.teal}55`, borderRadius:3, padding:'2px 6px', color:C.text, fontSize:9, fontFamily:C.font, outline:'none', boxSizing:'border-box' }} />
                    ) : (
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ flex:1, height:4, background:C.dimLow, borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.max(pct, 0)}%`, background: current < 0 ? C.red : pct >= 100 ? C.green : C.teal, borderRadius:2, transition:'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize:7, color:C.dimLow, whiteSpace:'nowrap' }}>{target}% goal</span>
                      </div>
                    )}
                  </div>
                );
              })()}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                <span style={{ fontSize:8, color:C.dim, fontWeight:600 }}>Horizon</span>
                {editingGoals ? (
                  <div style={{ display:'flex', gap:2, flex:1, justifyContent:'flex-end' }}>
                    {['1Y','2Y','3Y','5Y','10Y'].map(h => (
                      <button key={h} onClick={() => setEditGoalVals(v => ({ ...v, horizon: h }))}
                        style={{ minWidth:22, fontSize:7, fontWeight:700, padding:'2px 0', borderRadius:3, border:`1px solid ${editGoalVals.horizon === h ? C.teal : C.border}`, background: editGoalVals.horizon === h ? `${C.teal}22` : 'transparent', color: editGoalVals.horizon === h ? C.teal : C.dim, cursor:'pointer' }}>
                        {h}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize:12, fontWeight:900, color:C.teal }}>{goals.horizon}</span>
                )}
              </div>
            </div>
          </div>
        </div>{/* close LeftCol */}

        {/* ── RIGHT SIDE: TopRow + BottomRow stacked ──────────────── */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

        {/* ── TOP ROW: 3-column grid ─────────────────────────────── */}
        <div style={{ flex:'0 0 68%', display:'flex', flexDirection:'row', overflow:'hidden', borderBottom:`1px solid ${C.border}` }}>

        {/* ── COL 2: Charts ─────────────────────────────────────── */}
        <div style={{ flex:1, minWidth:0, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

          {/* Performance Chart */}
          <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, flex:'0 0 auto' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 10px', borderBottom:`1px solid ${C.border}`, background:'#0d1623' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, textTransform:'uppercase' }}>Portfolio vs S&amp;P 500</span>
                <div style={{ display:'flex', gap:12, marginLeft:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:14, height:2, background: ph ? C.dimLow : C.teal, opacity: ph ? 0.3 : 1 }} /><span style={{ fontSize:9, color:C.dim }}>Portfolio</span></div>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}><div style={{ width:12, height:2, background: ph ? C.dimLow : C.dim, opacity: ph ? 0.3 : 1, backgroundImage: ph ? undefined : `repeating-linear-gradient(90deg,${C.dim} 0 4px,transparent 4px 7px)` }} /><span style={{ fontSize:9, color:C.dim }}>S&amp;P 500</span></div>
                </div>
              </div>
              <div style={{ display:'flex', gap:4 }}>
                {(['1D','5D','1M','6M','1Y'] as const).map(k => (
                  <button key={k} onClick={() => setPerfPeriod(k)} style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:3, cursor:'pointer', border:`1px solid ${perfPeriod===k?C.teal:C.border}`, background: perfPeriod===k?`${C.teal}20`:'transparent', color: perfPeriod===k?C.teal:C.dim, letterSpacing:0.5 }}>{k}</button>
                ))}
                <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:3, border:`1px solid ${C.teal}`, color:C.teal, letterSpacing:0.5, marginLeft:2 }}>{perfPeriod} PERFORMANCE</span>
              </div>
            </div>
            <div style={{ height:165, padding:'8px 4px 4px 0', position:'relative' }}>
              {ph && (
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
                  <span style={{ fontSize:9, color:C.dim, letterSpacing:2 }}>AWAITING DATA</span>
                </div>
              )}
              {!ph && !hasChartData && (
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:2, gap:4, background:C.card, borderRadius:4 }}>
                  <span style={{ fontSize:9, color:C.dim, letterSpacing:1.5 }}>NO HISTORY YET</span>
                  <span style={{ fontSize:8, color:C.dimLow, textAlign:'center', lineHeight:1.6 }}>Performance chart builds as portfolio<br/>saves &amp; value snapshots accumulate</span>
                </div>
              )}
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartPoints as any[]} margin={{ top:4, right:8, bottom:0, left:-10 }}>
                  <defs>
                    <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.teal} stopOpacity={ph ? 0.08 : 0.28} />
                      <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize:8, fill:C.dim }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize:8, fill:C.dim }} tickLine={false} axisLine={false} tickFormatter={v => `${v>0?'+':''}${v}%`} />
                  {!ph && <RCTooltip contentStyle={{ background:C.card, border:`1px solid ${C.border}`, fontSize:10, color:C.text, borderRadius:4 }} formatter={(v:number, name:string) => [`${sign(v)}${fmtN(v,1)}%`, name==='portfolio'?'Portfolio':'S&P 500']} />}
                  <Area type="monotone" dataKey="portfolio" stroke={ph ? C.dimLow : C.teal} strokeWidth={2} fill="url(#portfolioGrad)" dot={false} strokeOpacity={ph ? 0.3 : 1} />
                  <Line type="monotone" dataKey="sp500" stroke={ph ? C.dimLow : C.dim} dot={false} strokeWidth={1.5} strokeDasharray="4 3" strokeOpacity={ph ? 0.3 : 1} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Asset Allocation — three-tab: Asset Class | Sectors | Themes */}
          <div style={{ background:C.card, flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 10px', borderBottom:`1px solid ${C.border}`, background:'#0d1623' }}>
              <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, textTransform:'uppercase' }}>Asset Allocation</span>
              <div style={{ display:'flex', gap:1, background:'#080c13', borderRadius:4, padding:2, border:`1px solid ${C.border}` }}>
                {(['asset','sectors','themes'] as const).map(tab => (
                  <button key={tab} onClick={() => setAllocTab(tab)} style={{
                    fontSize:8, fontWeight:700, padding:'2px 8px', borderRadius:3, border:'none', cursor:'pointer', letterSpacing:0.5,
                    background: allocTab === tab ? C.teal : 'transparent',
                    color: allocTab === tab ? '#fff' : C.dim, transition:'all 0.1s',
                  }}>
                    {tab === 'asset' ? 'Asset Class' : tab === 'sectors' ? 'Sectors' : 'Themes'}
                  </button>
                ))}
              </div>
            </div>
            {(() => {
              type AllocRow = { label: string; pct: N; color: string; sublabel?: string };
              let allocData: AllocRow[] = [];
              if (ph) {
                allocData = d.asset_allocation.map((a, i) => ({ label: a.label, pct: a.pct, color: a.color }));
              } else if (allocTab === 'asset') {
                allocData = (d.asset_class_allocation ?? []).map((a, i) => ({
                  label: a.label, pct: a.pct,
                  color: ASSET_CLASS_COLORS[a.label] ?? a.color ?? THEME_PIE_C[i % THEME_PIE_C.length],
                }));
                if (!allocData.length) allocData = d.asset_allocation.map((a, i) => ({
                  label: a.label, pct: a.pct,
                  color: ASSET_CLASS_COLORS[a.label] ?? a.color ?? THEME_PIE_C[i % THEME_PIE_C.length],
                }));
              } else if (allocTab === 'sectors') {
                allocData = (d.sector_allocation ?? []).map((a, i) => ({
                  label: a.label, pct: a.pct,
                  color: a.color ?? SECTOR_COLORS[a.label] ?? THEME_PIE_C[i % THEME_PIE_C.length],
                }));
                if (!allocData.length) allocData = d.asset_allocation.map((a, i) => ({
                  label: a.label, pct: a.pct, color: a.color ?? THEME_PIE_C[i % THEME_PIE_C.length],
                }));
              } else {
                // Re-bucket using the persistent ticker_theme_map cache so previously
                // classified tickers stay out of Unclassified even if FastAPI regresses.
                const allocByTicker: Record<string, number> = {};
                for (const h of (d.holdings ?? [])) allocByTicker[h.ticker.toUpperCase()] = Number(h.allocation_pct ?? 0);
                const portTickers = Object.keys(allocByTicker);
                type Bucket = { symbols: string[]; pct: number; color?: string; isUnclassified: boolean };
                const buckets = new Map<string, Bucket>();
                // Seed with FastAPI's order/colors so the pie keeps a stable look
                for (const t of (d.theme_allocation ?? [])) {
                  buckets.set(t.name, { symbols: [], pct: 0, color: t.color, isUnclassified: /unclassified/i.test(t.name) });
                }
                // FastAPI's current bucket per ticker (this render)
                const fapiBucketOf: Record<string,string> = {};
                for (const t of (d.theme_allocation ?? [])) for (const s of (t.symbols ?? [])) fapiBucketOf[String(s).toUpperCase()] = t.name;
                for (const sym of portTickers) {
                  const fapi = fapiBucketOf[sym];
                  const rawCached = tickerThemeMap[sym];
                  // Sentinel '__UNCATEGORIZED__' only suppresses the CATEGORIZE button — it must NOT become a bucket label.
                  const cached = rawCached && rawCached !== '__UNCATEGORIZED__' ? rawCached : null;
                  // Prefer cache only when FastAPI bucketed this ticker into Unclassified
                  const target = (fapi && !/unclassified/i.test(fapi)) ? fapi : (cached || fapi || 'Unclassified');
                  if (!buckets.has(target)) buckets.set(target, { symbols: [], pct: 0, isUnclassified: /unclassified/i.test(target) });
                  const b = buckets.get(target)!;
                  b.symbols.push(sym);
                  b.pct += allocByTicker[sym] ?? 0;
                }
                allocData = Array.from(buckets.entries())
                  .filter(([_, b]) => b.symbols.length > 0)
                  .map(([name, b], i) => ({
                    label: name, pct: b.pct,
                    color: b.color ?? THEME_PIE_C[i % THEME_PIE_C.length],
                    sublabel: b.symbols.length ? b.symbols.slice(0,4).join(', ') + (b.symbols.length > 4 ? ` +${b.symbols.length - 4}` : '') : undefined,
                    fallback_used: b.isUnclassified,
                    symbols: b.symbols,
                    isUnclassified: b.isUnclassified,
                  } as any));
              }
              return (
                <div style={{ flex:1, display:'flex', alignItems:'stretch', columnGap:18, padding:'10px 10px', minHeight:0, overflow:'hidden' }}>
                  {/* Pie zone — flex:1 takes leftover width; pie auto-sizes to fit zone (square, capped by both width & height) and centers itself */}
                  <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center', justifyContent:'center', opacity: ph ? 0.4 : 1 }}>
                    <div style={{ height:'100%', aspectRatio:'1 / 1', maxWidth:'100%', maxHeight:'100%', display:'flex' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={allocData} cx="50%" cy="50%" innerRadius="58%" outerRadius="98%" dataKey="pct" strokeWidth={0}>
                            {allocData.map((a, i) => <Cell key={i} fill={a.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Labels + % zone — scrollable if rows overflow the section height */}
                  <div style={{ flexShrink:0, overflowY:'auto', display:'grid', gridTemplateColumns:'auto auto', columnGap:14, alignContent:'start', alignItems:'center' }}>
                    {allocData.map((a, i) => {
                      const hasTickers = !ph && (a as any).tickers?.length > 0;
                      return (
                        <div key={i} style={{ display:'contents' }}>
                          <div
                            style={{ display:'flex', alignItems:'flex-start', gap:5, minWidth:0, borderRadius:3, padding:'2px 4px', cursor: hasTickers ? 'default' : undefined, background: allocHover?.label === a.label ? `${a.color}14` : 'transparent', transition:'background 0.1s' }}
                            onMouseEnter={hasTickers ? (e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); setAllocHover({ label: a.label, tickers: (a as any).tickers, x: r.right + 6, y: r.top }); } : undefined}
                            onMouseLeave={hasTickers ? () => setAllocHover(null) : undefined}
                          >
                            <div style={{ width:8, height:8, borderRadius:2, background:a.color, flexShrink:0, opacity: ph ? 0.4 : 1, marginTop:2 }} />
                            <div style={{ minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                <span style={{ fontSize:9, color: allocHover?.label === a.label ? C.text : C.dim, whiteSpace:'nowrap' }}>{a.label}</span>
                                {allocTab === 'themes' && !ph && (a as any).isUnclassified && (((a as any).symbols ?? []) as string[]).some((s: string) => { const v = tickerThemeMap[s.toUpperCase()]; return !v || v === '__UNCATEGORIZED__'; }) && (
                                  <button
                                    disabled={categorizingThemes}
                                    onClick={(e) => { e.stopPropagation(); const needsCat = ((a as any).symbols ?? []).filter((s: string) => { const v = tickerThemeMap[s.toUpperCase()]; return !v || v === '__UNCATEGORIZED__'; }); handleCategorizeThemes(needsCat.length ? needsCat : ((a as any).symbols ?? [])); }}
                                    style={{ fontSize:7, fontWeight:800, letterSpacing:0.8, padding:'1px 5px', borderRadius:3, border:`1px solid ${categorizeResult === 'error' ? C.red : categorizeResult === 'success' ? C.green : C.amber}55`, background:`${categorizeResult === 'error' ? C.red : categorizeResult === 'success' ? C.green : C.amber}14`, color: categorizeResult === 'error' ? C.red : categorizeResult === 'success' ? C.green : C.amber, cursor: categorizingThemes ? 'wait' : 'pointer', flexShrink:0, transition:'all 0.15s', opacity: categorizingThemes ? 0.6 : 1 }}
                                  >
                                    {categorizingThemes ? '···' : categorizeResult === 'success' ? '✓ DONE' : categorizeResult === 'error' ? 'RETRY' : 'CATEGORIZE'}
                                  </button>
                                )}
                              </div>
                              {(a as any).sublabel && <span style={{ fontSize:7, color:C.dimLow, display:'block', whiteSpace:'nowrap' }}>{(a as any).sublabel}</span>}
                            </div>
                          </div>
                          <span style={{ justifySelf:'end', alignSelf:'center', fontSize:10, fontWeight:700, color: ph ? C.dim : C.text, padding:'2px 0' }}>
                            {ph ? '—' : `${fmtN(a.pct as number, 1)}%`}
                          </span>
                        </div>
                      );
                    })}
                    {!ph && allocData.length === 0 && (
                      <span style={{ gridColumn:'1 / span 2', fontSize:9, color:C.dimLow, textAlign:'center', padding:'8px 0', display:'block' }}>No data</span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        {/* ── COL 3: Portfolio News (taller) + Investment Style (shorter) ──────────────── */}
        <div style={{ flex:'0 0 210px', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

          {/* Portfolio News — moved up, takes remaining space */}
          <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, flex:1, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <CardHdr label="Portfolio News" badge={`${flatPortfolioNews.length}`} />
            <div style={{ flex:1, overflowY:'auto', padding:'2px 0' }}>
              {flatPortfolioNews.length === 0 && (
                <div style={{ padding:'14px 8px', textAlign:'center', fontSize:10, color:C.dim }}>
                  {ph ? 'Awaiting data...' : 'Loading news for your holdings...'}
                </div>
              )}
              {flatPortfolioNews.map((item, i) => (
                <a key={`pn-${i}`} href={item.url} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'flex-start', gap:6, padding:'6px 8px', borderBottom:`1px solid ${C.dimLow}22`, textDecoration:'none', cursor:'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${C.teal}08`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, flexShrink:0, minWidth:38 }}>
                    <span style={{ fontSize:7, fontWeight:800, fontFamily:C.font, padding:'2px 5px', borderRadius:3, color:C.teal, background:`${C.teal}15`, border:`1px solid ${C.teal}25`, textTransform:'uppercase' }}>
                      {item.ticker}
                    </span>
                    <span style={{ fontSize:7, color:C.dim, whiteSpace:'nowrap' }}>{timeAgo(item.published_at)}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:9, color:C.text, lineHeight:1.35, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as const, overflow:'hidden' }}>
                      {item.title}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Investment Style — shorter, redundant metric rows removed */}
          <div style={{ background:C.card, flex:'0 0 auto', display:'flex', flexDirection:'column' }}>
            <CardHdr label="Investment Style" badge="Risk Profile" />
            <div style={{ padding:'10px 12px 12px', display:'flex', flexDirection:'column' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:30, fontWeight:900, color: ph ? C.dim : styleColor, lineHeight:1 }}>{ph ? '—' : styleScore}</div>
                <div style={{ fontSize:9, fontWeight:700, color: ph ? C.dim : styleColor, letterSpacing:1, marginTop:3 }}>{ph ? 'AWAITING DATA' : (styleLabel ?? '—')}</div>
                <div style={{ fontSize:8, color:C.dim, marginTop:2 }}>Risk profile score / 100</div>
              </div>
              <div style={{ padding:'0 4px', margin:'8px 0 2px' }}>
                <div style={{ position:'relative', height:8, borderRadius:4, background:`linear-gradient(to right, ${C.green}, ${C.teal}, ${C.amber}, #f97316, ${C.red})`, marginBottom:5 }}>
                  {!ph && styleScore !== null && (
                    <div style={{ position:'absolute', top:-3, left:`${styleScore}%`, transform:'translateX(-50%)', width:4, height:14, background:'#fff', borderRadius:2, boxShadow:'0 0 6px rgba(255,255,255,0.7)' }} />
                  )}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:7, color:C.dim }}>Conservative</span>
                  <span style={{ fontSize:7, color:C.dim }}>High Risk</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── COL 4: Risk Suggestions + Risk Analysis ─────────────────────── */}
        <div style={{ flex:'0 0 245px', display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

          {/* Risk Suggestions — fills available space between top of column and Risk Analysis below */}
          <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, flex:1, minHeight:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <CardHdr label="Risk Suggestions" badge="Intel" />
            <div style={{ padding:8, overflowY:'auto', flex:1 }}>
              {d.risk_suggestions.map((s, i) => <SuggCard key={i} s={s} />)}
            </div>
          </div>

          {/* Risk Analysis — sits flush with AI Portfolio Review row beneath it */}
          <div style={{ background:C.card, flex:'0 0 auto', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <CardHdr label="Risk Analysis" badge="Metrics" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:C.border }}>
              {[
                { label:'Weighted Volatility', value: DM(d.risk_metrics.weighted_volatility,1,'%'), sub:'Annualized' },
                { label:'Max Drawdown (1Y)',   value: DM(d.risk_metrics.max_drawdown,1,'%'),        sub:'Peak to trough' },
                { label:'Top Concentration',   value: DM(d.risk_metrics.top_concentration,1,'%'),   sub: d.risk_metrics.top_concentration_label || '—' },
                { label:'Portfolio Beta',       value: DM(d.risk_metrics.portfolio_beta,2,''),       sub:'vs S&P 500' },
                { label:'Sharpe Ratio',         value: DM(d.risk_metrics.sharpe_ratio,2,''),         sub:'Risk-adj. return' },
                { label:'Sortino Ratio',        value: DM(d.risk_metrics.sortino_ratio,2,''),        sub:'Downside risk-adj.' },
              ].map((m, i) => (
                <div key={i} style={{ padding:'10px 12px', background:C.card }}>
                  <div style={{ fontSize:18, fontWeight:900, color: ph ? C.dim : C.text, lineHeight:1 }}>{m.value}</div>
                  <div style={{ fontSize:9, color:C.teal, marginTop:3, fontWeight:600 }}>{m.label}</div>
                  <div style={{ fontSize:8, color:C.dim, marginTop:2 }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>{/* close top row */}

      {/* ── BOTTOM ROW: 4 panels (Goals moved to LeftCol) ─────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'row', overflow:'hidden', minHeight:0 }}>

        {/* ── PANEL 2: Top Performing Assets ── */}
        <div style={{ flex:'0 0 200px', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', background:C.card }}>
          <div style={{ padding:'7px 10px', borderBottom:`1px solid ${C.border}`, background:'#0d1623', flexShrink:0 }}>
            <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, textTransform:'uppercase' }}>Top Performers</span>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
            {(ph || topPerformers.length === 0) ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:80, gap:4 }}>
                <span style={{ fontSize:9, color:C.dim, letterSpacing:1.5 }}>{ph ? 'AWAITING DATA' : 'LOADING...'}</span>
              </div>
            ) : topPerformers.map((t, i) => {
              const ret = t.returnPct ?? 0;
              const color = ret >= 0 ? C.green : C.red;
              const maxAbs = Math.max(...topPerformers.map(x => Math.abs(x.returnPct ?? 0)), 1);
              const barW = (Math.abs(ret) / maxAbs) * 100;
              return (
                <div key={t.ticker} style={{ padding:'7px 12px', borderBottom:`1px solid ${C.dimLow}22`, display:'flex', flexDirection:'column', gap:3 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                    <span style={{ fontSize:11, fontWeight:800, color:C.teal }}>{t.ticker}</span>
                    <span style={{ fontSize:11, fontWeight:700, color }}>{ret >= 0 ? '+' : ''}{fmtN(ret, 1)}%</span>
                  </div>
                  <div style={{ height:3, background:C.dimLow, borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${barW}%`, background:color, borderRadius:2 }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:8, color:C.dim }}>Avg: {fmt$(t.avgCost)}</span>
                    <span style={{ fontSize:8, color:C.dim }}>Now: {fmt$(t.price)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PANEL 3: Volatility (swapped here from top row) ── */}
        <div style={{ flex:'0 0 200px', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', background:C.card }}>
          <div style={{ padding:'7px 10px', borderBottom:`1px solid ${C.border}`, background:'#0d1623', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, textTransform:'uppercase' }}>Volatility</span>
            <span style={{ fontSize:8, color:C.dimLow }}>Annualized</span>
          </div>
          <div style={{ flex:1, padding:'8px 10px', display:'flex', flexDirection:'column', gap:5, overflowY:'auto' }}>
            {d.volatility.length === 0 && !ph && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:80, gap:4 }}>
                <span style={{ fontSize:9, color:C.dim, letterSpacing:1.5 }}>UNAVAILABLE</span>
                <span style={{ fontSize:8, color:C.dimLow, textAlign:'center', lineHeight:1.6 }}>Volatility requires historical<br/>price returns per holding</span>
              </div>
            )}
            {d.volatility.map((v, i) => {
              const maxVol = Math.max(...d.volatility.map(x => x.vol), 1);
              const barPct = ph ? 0 : (v.vol / maxVol) * 100;
              const color = v.vol > 35 ? C.red : v.vol > 20 ? C.amber : C.green;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:42, fontSize:9, color:C.teal, fontWeight:700, flexShrink:0 }}>{v.ticker}</span>
                  <div style={{ flex:1, height:14, background:C.dimLow, borderRadius:2, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${barPct}%`, background: ph ? C.dimLow : color, borderRadius:2, transition:'width 0.6s' }} />
                  </div>
                  <span style={{ width:38, fontSize:9, color: ph ? C.dim : color, fontWeight:700, textAlign:'right', flexShrink:0 }}>{DN(v.vol,1)}{ph ? '' : '%'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── PANEL 4: Portfolio Options (swapped here from top row) ── */}
        <div style={{ flex:1, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', background:C.card, minWidth:0 }}>
          <div style={{ padding:'7px 10px', borderBottom:`1px solid ${C.border}`, background:'#0d1623', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, textTransform:'uppercase' }}>Portfolio Options</span>
            <span style={{ fontSize:8, color:C.dimLow }}>Flow</span>
          </div>
          {(() => {
            const rows = portfolioOptions?.tickers ?? [];
            const dir = optSort.dir === 'asc' ? 1 : -1;
            const numCmp = (a: any, b: any) => {
              const av = a == null ? -Infinity : Number(a);
              const bv = b == null ? -Infinity : Number(b);
              return dir * (av - bv);
            };
            const sorted = [...rows].sort((a, b) => {
              switch (optSort.col) {
                case 'TICKER': return dir * a.ticker.localeCompare(b.ticker);
                case 'SCORE':  return numCmp(a.composite_score, b.composite_score);
                case 'P/C': {
                  const av = a.pc_ratio ?? a.call_put_volume_ratio;
                  const bv = b.pc_ratio ?? b.call_put_volume_ratio;
                  return numCmp(av, bv);
                }
                case 'IV':   return numCmp(a.iv_current, b.iv_current);
                case 'EM':   return numCmp(a.expected_move, b.expected_move);
                case 'VOL':  return numCmp(a.total_volume, b.total_volume);
                case 'SIGNAL': return dir * (a.primary_signal || '').localeCompare(b.primary_signal || '');
                default: return 0;
              }
            });
            const mkSort = (col: string) => () => setOptSort(s => ({ col, dir: s.col === col ? (s.dir === 'asc' ? 'desc' : 'asc') : (col === 'TICKER' ? 'asc' : 'desc') }));
            const thO = (col: string) => ({ padding:'5px 6px', color: optSort.col === col ? C.teal : C.dim, fontWeight:700, textAlign:(col==='TICKER'||col==='SIGNAL'?'left':'right') as 'left'|'right', fontSize:9, letterSpacing:0.5, cursor:'pointer', userSelect:'none' as const, whiteSpace:'nowrap' as const });
            const arrO = (col: string) => optSort.col === col ? (optSort.dir === 'asc' ? '▲' : '▼') : '';
            if (ph) return <div style={{ padding:'20px', textAlign:'center', fontSize:11, color:C.dim }}>Awaiting data...</div>;
            return (
              <div style={{ overflow:'auto', flex:1 }}>
                <table style={{ width:'100%', minWidth:560, borderCollapse:'collapse', fontSize:10, tableLayout:'fixed' }}>
                  <colgroup>
                    <col style={{ width:'12%', minWidth:60 }} /><col style={{ width:'10%', minWidth:50 }} /><col style={{ width:'10%', minWidth:50 }} /><col style={{ width:'10%', minWidth:50 }} /><col style={{ width:'10%', minWidth:50 }} /><col style={{ width:'12%', minWidth:60 }} /><col style={{ width:'36%', minWidth:160 }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:'#0d1623' }}>
                      {(['TICKER','SCORE','P/C','IV','EM','VOL','SIGNAL'] as const).map(h => (
                        <th key={h} style={thO(h)} onClick={mkSort(h)}>{h} <span style={{ fontSize:7, opacity:0.7 }}>{arrO(h)}</span></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((t, i) => {
                      const sig = (t.primary_signal || '').toLowerCase();
                      const sigColor = sig.includes('unusual') ? C.amber : sig.includes('gamma') ? C.purple : sig.includes('asym') ? C.green : sig.includes('vol') ? C.amber : sig ? C.teal : C.dimLow;
                      const cp = t.pc_ratio ?? t.call_put_volume_ratio ?? null;
                      const cpStr = cp == null ? '—' : fmtN(cp as number, 2);
                      const cpColor = cp == null ? C.dimLow : ((cp as number) < 0.7 ? C.green : (cp as number) > 1.3 ? C.red : C.dim);
                      const iv = t.iv_current != null ? `${fmtN((t.iv_current as number) * 100, 0)}%` : '—';
                      const em = t.expected_move != null ? `${fmtN((t.expected_move as number) * 100, 1)}%` : '—';
                      const vol = t.total_volume != null ? (t.total_volume >= 1000 ? `${fmtN((t.total_volume as number)/1000, 1)}K` : String(t.total_volume)) : '—';
                      const score = t.composite_score != null ? fmtN(t.composite_score as number, 0) : '—';
                      const scoreColor = t.composite_score != null && (t.composite_score as number) >= 70 ? C.green : t.composite_score != null && (t.composite_score as number) >= 50 ? C.amber : C.dim;
                      return (
                        <tr key={i} style={{ borderBottom:`1px solid ${C.dimLow}22` }}>
                          <td style={{ padding:'5px 6px', color:C.teal, fontWeight:700 }}>{t.ticker}</td>
                          <td style={{ padding:'5px 6px', textAlign:'right', color:scoreColor, fontWeight:700 }}>{score}</td>
                          <td style={{ padding:'5px 6px', textAlign:'right', color:cpColor }}>{cpStr}</td>
                          <td style={{ padding:'5px 6px', textAlign:'right', color: t.iv_current != null ? C.amber : C.dimLow }}>{iv}</td>
                          <td style={{ padding:'5px 6px', textAlign:'right', color: t.expected_move != null ? C.purple : C.dimLow }}>{em}</td>
                          <td style={{ padding:'5px 6px', textAlign:'right', color:C.dim }}>{vol}</td>
                          <td style={{ padding:'5px 6px', color:sigColor, fontSize:9, fontWeight:700, textTransform:'uppercase', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.primary_signal || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

        {/* ── PANEL 5: AI Portfolio Review ── */}
        <div style={{ flex:'0 0 280px', display:'flex', flexDirection:'column', overflow:'hidden', background:C.card }}>
          <div style={{ padding:'7px 10px', borderBottom:`1px solid ${C.border}`, background:'#0d1623', flexShrink:0 }}>
            <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, letterSpacing:1.5, color:C.dim, textTransform:'uppercase' }}>AI Portfolio Review</span>
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', padding:'12px' }}>
            {!aiReview && !aiLoading && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:10 }}>
                <div style={{ textAlign:'center', marginBottom:4 }}>
                  <div style={{ fontSize:10, color:C.dim, lineHeight:1.6 }}>Comprehensive AI analysis of your portfolio — risk exposure, position sizing, momentum, and actionable recommendations.</div>
                </div>
                <button onClick={handleAIReview} disabled={aiLoading || !dashboardHoldings?.length}
                  style={{ background:'linear-gradient(135deg, #2090d0, #5cc8f0, #80d8f8)', boxShadow:'0 0 20px rgba(32,144,208,0.4), 0 0 40px rgba(92,200,240,0.2)', borderRadius:8, padding:'9px 20px', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:'#fff', letterSpacing:0.5, opacity: aiLoading || !dashboardHoldings?.length ? 0.6 : 1 }}>
                  Run AI Review
                </button>
                <span style={{ fontSize:9, color:C.dimLow }}>Takes 20–40 seconds</span>
                <button onClick={() => setCompareOpen(true)}
                  style={{ marginTop:6, background:'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(167,139,250,0.12))', border:'1px solid rgba(56,189,248,0.35)', borderRadius:8, padding:'8px 16px', cursor:'pointer', fontSize:11, fontWeight:700, color:'#38bdf8', letterSpacing:0.5, boxShadow:'0 0 12px rgba(56,189,248,0.08)', display:'inline-flex', alignItems:'center', gap:6 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(167,139,250,0.18))'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.6)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(56,189,248,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(167,139,250,0.12))'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.35)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(56,189,248,0.08)'; }}>
                  <GitCompare size={12} /> Compare to Watchlist
                </button>
              </div>
            )}
            {aiLoading && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:8 }}>
                <div style={{ width:28, height:28, border:`3px solid ${C.teal}33`, borderTop:`3px solid ${C.teal}`, borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
                <span style={{ fontSize:10, color:C.teal, textAlign:'center', lineHeight:1.5 }}>{aiStage}</span>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            )}
            {aiReview && !aiLoading && (
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ flex:1, overflowY:'auto', fontSize:11, color:C.text, lineHeight:1.65, whiteSpace:'pre-wrap', padding:'2px 0 8px' }}>
                  {aiReview}
                </div>
                <div style={{ display:'flex', gap:8, marginTop:8, flexShrink:0, flexWrap:'wrap' }}>
                  <button onClick={handleAIReview}
                    style={{ padding:'7px 14px', background:'transparent', border:`1px solid ${C.border}`, borderRadius:6, color:C.dim, fontSize:10, cursor:'pointer', fontWeight:600 }}>
                    Re-run Analysis
                  </button>
                  <button onClick={() => setCompareOpen(true)}
                    style={{ padding:'7px 14px', background:'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(167,139,250,0.12))', border:'1px solid rgba(56,189,248,0.35)', borderRadius:6, color:'#38bdf8', fontSize:10, cursor:'pointer', fontWeight:700, letterSpacing:0.5, display:'inline-flex', alignItems:'center', gap:6, boxShadow:'0 0 12px rgba(56,189,248,0.08)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(167,139,250,0.18))'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.6)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(167,139,250,0.12))'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.35)'; }}>
                    <GitCompare size={11} /> Compare to Watchlist
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>{/* close bottom row */}
      </div>{/* close right side */}
      </div>{/* close outer main grid */}

      {/* ── NEWS TICKER ──────────────────────────────────────────────── */}
      <div style={{ background:'#060b14', borderTop:`1px solid ${C.border}`, height:26, display:'flex', alignItems:'center', overflow:'hidden', flexShrink:0 }}>
        <div style={{ fontSize:9, fontWeight:800, color:C.amber, background:`${C.amber}22`, padding:'0 10px', height:'100%', display:'flex', alignItems:'center', letterSpacing:1, borderRight:`1px solid ${C.border}`, flexShrink:0 }}>NEWS</div>
        <div style={{ flex:1, overflow:'hidden' }}>
          <div style={{ display:'flex', gap:40, animation:'ctscroll 60s linear infinite', whiteSpace:'nowrap' }}>
            {[...d.news_ticker, ...d.news_ticker].map((n, i) => (
              <span key={i} style={{ fontSize:9, color:C.dim, flexShrink:0 }}>
                <span style={{ color:C.teal, fontWeight:700, marginRight:4 }}>{n.symbol}</span>
                {n.headline}
                <span style={{ color:C.dimLow, marginLeft:6 }}>{n.time_ago}</span>
                <span style={{ color:C.border, margin:'0 16px' }}>·</span>
              </span>
            ))}
          </div>
        </div>
        <style>{`@keyframes ctscroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      </div>

      {/* ── Asset Allocation Hover Tooltip ──────────────────────────── */}
      {allocHover && allocHover.tickers.length > 0 && (
        <div style={{ position:'fixed', left: Math.min(allocHover.x, window.innerWidth - 200), top: Math.max(4, Math.min(allocHover.y, window.innerHeight - (allocHover.tickers.length * 22 + 28))), zIndex:9999, background:'#0d1623', border:`1px solid ${C.border}`, borderRadius:6, padding:'8px 10px', minWidth:180, maxWidth:240, boxShadow:'0 8px 32px rgba(0,0,0,0.6)', pointerEvents:'none' }}>
          <div style={{ fontSize:8, fontWeight:800, letterSpacing:1.5, color:C.dim, textTransform:'uppercase', marginBottom:6, borderBottom:`1px solid ${C.border}`, paddingBottom:4 }}>{allocHover.label}</div>
          {allocHover.tickers.map((t, i) => (
            <div key={i} style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8, padding:'2px 0' }}>
              <span style={{ fontSize:10, fontWeight:700, color:C.teal, flexShrink:0 }}>{t.ticker}</span>
              <span style={{ fontSize:9, color:C.dim, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'right', flex:1 }}>{t.company !== t.ticker ? t.company : ''}</span>
            </div>
          ))}
        </div>
      )}

      </>)}

      {/* ── DASHBOARD VIEW ───────────────────────────────────────────── */}
      {view === 'dashboard' && (
        <div style={{ flex:1, overflow:'auto', background:'#050608' }}>
          <StocksPortfolioPage />
        </div>
      )}

      {/* ── Compare to Watchlist Modal ────────────────────────────────── */}
      <PortfolioCompareWatchlistModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />

    </div>
  );
}
