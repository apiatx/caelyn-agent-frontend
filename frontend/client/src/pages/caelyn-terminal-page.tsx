import { useState, useEffect } from 'react';
import { useSetPageContext } from '@/hooks/useSetPageContext';
import StocksPortfolioPage from './stocks-portfolio';
import { PortfolioCompareWatchlistButton, PortfolioCompareWatchlistModal } from '@/components/portfolio-compare-watchlist';
import { useQuery } from '@tanstack/react-query';
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
interface CTHolding { ticker: string; price: N; change: N; change_pct: N; allocation_pct: N; }
interface CTChartPoint { date: string; portfolio: N; sp500: N; }
interface CTAllocationItem { label: string; pct: N; color: string; }
interface CTCorrelationMatrix { tickers: string[]; values: (N)[][]; }
interface CTRiskMetrics {
  weighted_volatility: N; max_drawdown: N;
  top_concentration: N; top_concentration_label: string;
  portfolio_beta: N; sharpe_ratio: N; sortino_ratio: N;
}
interface CTVolatilityItem { ticker: string; vol: N; }
interface CTRiskSuggestion { level: string; title: string; body: string; }
interface CTMover { ticker: string; change_pct: N; price: N; w52_low: N; w52_high: N; }
interface CTEarningsItem { ticker: string; company: string; wtd: string; last_eps: N; next_date: string; est_eps: N; }
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

function corrBg(v: N): string {
  const n = coerce(v);
  if (n >= 0.8) return '#0c3b2e'; if (n >= 0.5) return '#0a3328'; if (n >= 0.2) return '#0d2b22';
  if (n >= -0.2) return '#151f2e'; if (n >= -0.5) return '#331212'; return '#4a1010';
}
function corrTxt(v: N): string {
  const n = coerce(v);
  if (n >= 0.5) return '#4ade80'; if (n >= 0.2) return '#86efac';
  if (n >= -0.2) return C.dim; if (n >= -0.5) return '#fca5a5'; return '#f87171';
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

  const { data, isLoading, isFetching } = useQuery<CaelynTerminalData>({
    queryKey: ['caelyn-terminal'],
    queryFn: async () => {
      const res = await fetch('/api/caelyn-terminal');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    staleTime: Infinity,
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

  useEffect(() => {
    const dashboardSymbols = (dashboardHoldings ?? []).map(h => h.ticker).sort();
    const terminalSymbols  = (data?.holdings ?? []).map((h: CTHolding) => h.ticker).sort();
    const isSynced         = data ? !data.is_placeholder && !data._synced_from_local : false;
    console.log('[portfolio-sync-ui] dashboardSymbols:', dashboardSymbols);
    console.log('[portfolio-sync-ui] terminalSymbols:', terminalSymbols);
    console.log('[portfolio-sync-ui] terminal.is_placeholder:', data?.is_placeholder, '| _synced_from_local:', data?._synced_from_local, '| isSynced:', isSynced);
  }, [data, dashboardHoldings]);

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
      parts.push('Portfolio analytics terminal — shows holdings, performance, risk metrics, correlation matrix, and earnings calendar for the connected portfolio.');
    }
    return parts.join('\n');
  })(), [d, ph]);
  const p   = d.portfolio;
  const cm  = d.correlation_matrix;

  // Placeholder-aware formatters
  const D$   = (n: N) => (ph || isNull(n)) ? '—' : fmt$(n);
  const DN   = (n: N, dec = 2) => (ph || isNull(n)) ? '—' : fmtN(n, dec);
  const DPct = (n: N, dec = 2) => (ph || isNull(n)) ? '—' : `${sign(n)}${fmtN(n, dec)}%`;
  const DS   = (s: string) => s === '—' ? '—' : s;

  const sentColor = p.sentiment === 'BULLISH' ? C.green : p.sentiment === 'BEARISH' ? C.red : C.amber;
  const mktColor  = p.market_status === 'OPEN' ? C.green : p.market_status === 'PRE-MARKET' ? C.amber : C.red;
  const perfMap: Record<string, N> = { '1D':p.perf_1d,'5D':p.perf_5d,'1M':p.perf_1m,'6M':p.perf_6m,'1Y':p.perf_1y };

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
        <div style={{ flexShrink:0, marginLeft:8 }}>
          <PortfolioCompareWatchlistButton onClick={() => setCompareOpen(true)} />
        </div>
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

      {/* ── MAIN GRID ─────────────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'row', overflow:'hidden', minHeight:0 }}>

        {/* ── COL 1: Holdings + Earnings ──────────────────────────── */}
        <div style={{ flex:'0 0 235px', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

          {/* Holdings */}
          <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, display:'flex', flexDirection:'column', flex:'0 0 auto', maxHeight:'55%', overflow:'hidden' }}>
            <CardHdr label="Holdings" badge={posLabel} />
            <div style={{ overflowY:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:9, tableLayout:'fixed' }}>
                <colgroup>
                  <col style={{ width:'22%' }} />
                  <col style={{ width:'22%' }} />
                  <col style={{ width:'19%' }} />
                  <col style={{ width:'19%' }} />
                  <col style={{ width:'18%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:'#0d1623' }}>
                    {['TICKER','PRICE','CHG','CHG%','ALLOC'].map(h => (
                      <th key={h} style={{ padding:'4px 3px', color:C.dim, fontWeight:600, textAlign:h==='TICKER'?'left':'right', fontSize:8, letterSpacing:0.3, overflow:'hidden' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.holdings.map((h, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.dimLow}22` }}>
                      <td style={{ padding:'4px 3px', color:C.teal, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{h.ticker}</td>
                      <td style={{ padding:'4px 3px', textAlign:'right', color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{D$(h.price)}</td>
                      <td style={{ padding:'4px 3px', textAlign:'right', color: ph ? C.dim : pctClr(h.change), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ph ? '—' : `${sign(h.change)}${fmtN(h.change,2)}`}</td>
                      <td style={{ padding:'4px 3px', textAlign:'right', color: ph ? C.dim : pctClr(h.change_pct), overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{DPct(h.change_pct)}</td>
                      <td style={{ padding:'4px 3px', textAlign:'right', color:C.purple, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ph ? '—' : `${fmtN(h.allocation_pct,1)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Earnings Calendar */}
          <div style={{ background:C.card, flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <CardHdr label="Earnings Calendar" badge="Upcoming" />
            <div style={{ overflowY:'auto', flex:1 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:8, tableLayout:'fixed' }}>
                <colgroup>
                  <col style={{ width:'22%' }} />
                  <col style={{ width:'20%' }} />
                  <col style={{ width:'18%' }} />
                  <col style={{ width:'22%' }} />
                  <col style={{ width:'18%' }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}`, position:'sticky', top:0, background:'#0d1623' }}>
                    {['TICKER','WTD','LAST','DATE','EST'].map(h => (
                      <th key={h} style={{ padding:'3px 3px', color:C.dim, fontWeight:600, textAlign:h==='TICKER'?'left':'right', fontSize:7, letterSpacing:0.2 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.earnings_calendar.map((e, i) => (
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
        </div>

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
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.performance_charts?.[perfPeriod] ?? d.performance_chart ?? PH_CHART} margin={{ top:4, right:8, bottom:0, left:-10 }}>
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

          {/* Asset Allocation */}
          <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, flex:'0 0 auto' }}>
            <CardHdr label="Asset Allocation" badge="Breakdown" />
            <div style={{ display:'flex', alignItems:'center', padding:'8px 10px', gap:10 }}>
              <div style={{ width:108, height:108, flexShrink:0, opacity: ph ? 0.4 : 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.asset_allocation} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="pct" strokeWidth={0}>
                      {d.asset_allocation.map((a, i) => <Cell key={i} fill={a.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                {d.asset_allocation.map((a, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:a.color, flexShrink:0, opacity: ph ? 0.4 : 1 }} />
                      <span style={{ fontSize:9, color:C.dim }}>{a.label}</span>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, color: ph ? C.dim : C.text }}>{ph ? '—' : `${fmtN(a.pct,1)}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Correlation Matrix */}
          <div style={{ background:C.card, flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <CardHdr label="Correlation Matrix" badge="Heat Map" />
            <div style={{ padding:'8px 10px', overflowY:'auto', flex:1 }}>
              {cm.tickers.length > 0 && (
                <table style={{ borderCollapse:'separate', borderSpacing:2, fontSize:8, tableLayout:'fixed', width:'100%' }}>
                  <colgroup>
                    <col style={{ width:'12%' }} />
                    {cm.tickers.map((_,i) => <col key={i} style={{ width:`${88 / cm.tickers.length}%` }} />)}
                  </colgroup>
                  <thead>
                    <tr>
                      <th />
                      {cm.tickers.map(t => <th key={t} style={{ padding:'2px 2px', color:C.dim, fontWeight:600, textAlign:'center', fontSize:7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cm.tickers.map((row, ri) => (
                      <tr key={ri}>
                        <td style={{ padding:'2px 3px', color:C.dim, fontWeight:700, textAlign:'right', fontSize:7, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row}</td>
                        {cm.values[ri]?.map((v, ci) => (
                          <td key={ci} style={{ padding:'3px 2px', background: ph && ri !== ci ? C.dimLow + '44' : corrBg(v), textAlign:'center', borderRadius:3, color: ph && ri !== ci ? C.dimLow : corrTxt(v), fontWeight:700, fontSize:8, height:22 }}>
                            {ph && ri !== ci ? '—' : fmtN(v, 2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── COL 3: Risk Analysis + Volatility ──────────────── */}
        <div style={{ flex:'0 0 210px', borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

          {/* Risk Metrics */}
          <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, flex:'0 0 auto' }}>
            <CardHdr label="Risk Analysis" badge="Metrics" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:C.border }}>
              {[
                { label:'Weighted Volatility', value: DN(d.risk_metrics.weighted_volatility,1)+(ph?'':'%'), sub:'Annualized' },
                { label:'Max Drawdown (1Y)',   value: DN(d.risk_metrics.max_drawdown,1)+(ph?'':'%'),        sub:'Peak to trough' },
                { label:'Top Concentration',   value: DN(d.risk_metrics.top_concentration,0)+(ph?'':'%'),   sub:d.risk_metrics.top_concentration_label },
                { label:'Portfolio Beta',       value: DN(d.risk_metrics.portfolio_beta,2),                  sub:'vs S&P 500' },
                { label:'Sharpe Ratio',         value: DN(d.risk_metrics.sharpe_ratio,2),                    sub:'Risk-adj. return' },
                { label:'Sortino Ratio',        value: DN(d.risk_metrics.sortino_ratio,2),                   sub:'Downside risk-adj.' },
              ].map((m, i) => (
                <div key={i} style={{ padding:'10px 12px', background:C.card }}>
                  <div style={{ fontSize:18, fontWeight:900, color: ph ? C.dim : C.text, lineHeight:1 }}>{m.value}</div>
                  <div style={{ fontSize:9, color:C.teal, marginTop:3, fontWeight:600 }}>{m.label}</div>
                  <div style={{ fontSize:8, color:C.dim, marginTop:2 }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Volatility */}
          <div style={{ background:C.card, flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <CardHdr label="Volatility" badge="Annualized" />
            <div style={{ padding:'6px 10px', display:'flex', flexDirection:'column', gap:4, overflowY:'auto', flex:1 }}>
              {d.volatility.map((v, i) => {
                const maxVol = Math.max(...d.volatility.map(x => x.vol), 1);
                const barPct = ph ? 0 : (v.vol / maxVol) * 100;
                const color = v.vol > 35 ? C.red : v.vol > 20 ? C.amber : C.green;
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:38, fontSize:9, color:C.teal, fontWeight:700, flexShrink:0 }}>{v.ticker}</span>
                    <div style={{ flex:1, height:14, background:C.dimLow, borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${barPct}%`, background: ph ? C.dimLow : color, borderRadius:2, transition:'width 0.6s' }} />
                    </div>
                    <span style={{ width:38, fontSize:9, color: ph ? C.dim : color, fontWeight:700, textAlign:'right', flexShrink:0 }}>{DN(v.vol,1)}{ph ? '' : '%'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── COL 4: Suggestions + Movers ─────────────────────── */}
        <div style={{ flex:'0 0 245px', display:'flex', flexDirection:'column', overflow:'hidden', height:'100%' }}>

          {/* Risk Suggestions */}
          <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, flex:'0 0 auto', maxHeight:'55%', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <CardHdr label="Risk Suggestions" badge="Intel" />
            <div style={{ padding:8, overflowY:'auto', flex:1 }}>
              {d.risk_suggestions.map((s, i) => <SuggCard key={i} s={s} />)}
            </div>
          </div>

          {/* Top Movers */}
          <div style={{ background:C.card, flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <CardHdr label="Top Movers" badge="Daily" />
            <div style={{ padding:8, overflowY:'auto', flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:6 }}>
                <span style={{ fontSize:9, color:C.green, fontWeight:700 }}>▲ {ph ? '—' : d.top_movers.gainers.length} up</span>
                <span style={{ fontSize:9, color:C.dim }}>·</span>
                <span style={{ fontSize:9, color:C.red, fontWeight:700 }}>▼ {ph ? '—' : d.top_movers.losers.length} down</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[...d.top_movers.gainers.slice(0,2).map(m => ({...m, isGainer:true})), ...d.top_movers.losers.slice(0,2).map(m => ({...m, isGainer:false}))].map((m, i) => {
                  const color = m.isGainer ? C.green : C.red;
                  return (
                    <div key={i} style={{ border:`1px solid ${color}33`, borderRadius:5, padding:'7px 9px', background:`${color}08` }}>
                      <div style={{ fontSize:7, fontWeight:800, color, letterSpacing:1, marginBottom:3 }}>{m.isGainer ? '↑ GAINER' : '↓ LOSER'}</div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                        <span style={{ fontSize:11, fontWeight:800, color: ph ? C.dim : C.text }}>{m.ticker}</span>
                        <span style={{ fontSize:10, fontWeight:700, color: ph ? C.dim : color }}>{ph ? '—' : `${m.isGainer?'+':''}${fmtN(m.change_pct,2)}%`}</span>
                      </div>
                      <div style={{ fontSize:9, color:C.dim, marginTop:1 }}>{ph ? '—' : fmt$(m.price)}</div>
                      <RangeBar low={m.w52_low} high={m.w52_high} price={m.price} ph={ph} />
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:2 }}>
                        <span style={{ fontSize:8, color:C.dim }}>{ph ? '—' : fmtN(m.w52_low,0)}</span>
                        <span style={{ fontSize:7, color:C.dim }}>52W RANGE</span>
                        <span style={{ fontSize:8, color:C.dim }}>{ph ? '—' : fmtN(m.w52_high,0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

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
