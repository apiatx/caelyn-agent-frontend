import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RCTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#080c13',
  surface: '#0d1420',
  card: '#111927',
  border: '#1a2540',
  text: '#dde6f0',
  dim: '#5e7a99',
  dimLow: '#2a3c55',
  green: '#1fd073',
  red: '#f04d4d',
  amber: '#e8a020',
  blue: '#38bdf8',
  teal: '#0ea5e9',
  purple: '#a78bfa',
  font: '"SF Mono","Fira Code","Consolas",monospace',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface CTHolding {
  ticker: string;
  price: number;
  change: number;
  change_pct: number;
  allocation_pct: number;
}
interface CTChartPoint { date: string; portfolio: number; sp500: number; }
interface CTAllocationItem { label: string; pct: number; color: string; }
interface CTCorrelationMatrix { tickers: string[]; values: number[][]; }
interface CTRiskMetrics {
  weighted_volatility: number;
  max_drawdown: number;
  top_concentration: number;
  top_concentration_label: string;
  portfolio_beta: number;
  sharpe_ratio: number;
  sortino_ratio: number;
}
interface CTVolatilityItem { ticker: string; vol: number; }
interface CTRiskSuggestion { level: 'RISK' | 'WARN' | 'INFO'; title: string; body: string; }
interface CTMover { ticker: string; change_pct: number; price: number; w52_low: number; w52_high: number; }
interface CTEarningsItem { ticker: string; company: string; wtd: string; last_eps: number; next_date: string; est_eps: number; }
interface CTNewsItem { symbol: string; headline: string; time_ago: string; }
interface CTTickerItem { symbol: string; price: number; change_pct: number; }

interface CaelynTerminalData {
  portfolio: {
    value: number;
    change_today: number;
    change_pct_today: number;
    perf_1d: number; perf_5d: number; perf_1m: number; perf_6m: number; perf_1y: number;
    total_return_pct: number;
    total_return_value: number;
    sentiment: string;
    market_status: string;
  };
  positions_count: number;
  holdings: CTHolding[];
  performance_chart: CTChartPoint[];
  asset_allocation: CTAllocationItem[];
  correlation_matrix: CTCorrelationMatrix;
  risk_metrics: CTRiskMetrics;
  volatility: CTVolatilityItem[];
  risk_suggestions: CTRiskSuggestion[];
  top_movers: { gainers: CTMover[]; losers: CTMover[] };
  earnings_calendar: CTEarningsItem[];
  news_ticker: CTNewsItem[];
  ticker_tape: CTTickerItem[];
  as_of: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = (n: number) => '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number, d = 2) => n.toFixed(d);
const sign = (n: number) => n >= 0 ? '+' : '';
const pctColor = (n: number) => n >= 0 ? C.green : C.red;

function corrBg(v: number): string {
  if (v >= 0.8) return '#0c3b2e';
  if (v >= 0.5) return '#0a3328';
  if (v >= 0.2) return '#0d2b22';
  if (v >= -0.2) return '#151f2e';
  if (v >= -0.5) return '#331212';
  return '#4a1010';
}
function corrTxt(v: number): string {
  if (v >= 0.5) return '#4ade80';
  if (v >= 0.2) return '#86efac';
  if (v >= -0.2) return C.dim;
  if (v >= -0.5) return '#fca5a5';
  return '#f87171';
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}
function CardHeader({ label, badge }: { label: string; badge?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderBottom: `1px solid ${C.border}`, background: '#0d1623' }}>
      <span style={{ fontFamily: C.font, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.dim, textTransform: 'uppercase' }}>{label}</span>
      {badge && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: C.teal, textTransform: 'uppercase', background: `${C.teal}18`, border: `1px solid ${C.teal}44`, borderRadius: 3, padding: '1px 6px' }}>{badge}</span>}
    </div>
  );
}

function PerfBadge({ label, val }: { label: string; val: number }) {
  const color = val >= 0 ? C.green : C.red;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <span style={{ fontSize: 9, color: C.dim, letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{sign(val)}{fmtN(val)}%</span>
    </div>
  );
}

function RangeBar({ low, high, price }: { low: number; high: number; price: number }) {
  const range = high - low;
  const pos = range > 0 ? Math.min(100, Math.max(0, ((price - low) / range) * 100)) : 50;
  return (
    <div style={{ position: 'relative', height: 4, background: C.dimLow, borderRadius: 2, marginTop: 4 }}>
      <div style={{ position: 'absolute', left: 0, width: `${pos}%`, height: '100%', background: C.teal, borderRadius: 2 }} />
      <div style={{ position: 'absolute', left: `${pos}%`, top: -2, width: 2, height: 8, background: '#fff', borderRadius: 1, transform: 'translateX(-50%)' }} />
    </div>
  );
}

function SuggestionCard({ s }: { s: CTRiskSuggestion }) {
  const colors = { RISK: C.red, WARN: C.amber, INFO: C.teal };
  const color = colors[s.level] ?? C.dim;
  return (
    <div style={{ border: `1px solid ${color}33`, borderRadius: 5, padding: '7px 9px', background: `${color}08`, marginBottom: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 8, fontWeight: 800, color, background: `${color}22`, borderRadius: 3, padding: '1px 5px', letterSpacing: 1 }}>{s.level}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{s.title}</span>
      </div>
      <p style={{ fontSize: 9, color: C.dim, margin: 0, lineHeight: 1.5 }}>{s.body}</p>
    </div>
  );
}

// ─── Loading / Error ──────────────────────────────────────────────────────────
function CTLoading() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: C.teal, letterSpacing: 3, fontSize: 12, marginBottom: 12 }}>LOADING TERMINAL...</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: C.teal, animation: `ctblink 1s ${i * 0.3}s infinite` }} />)}
        </div>
        <style>{`@keyframes ctblink{0%,100%{opacity:.15}50%{opacity:1}}`}</style>
      </div>
    </div>
  );
}
function CTError() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: C.font }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>⚠ TERMINAL UNAVAILABLE</div>
        <div style={{ color: C.dim, fontSize: 10 }}>Backend data feed not connected.</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CaelynTerminalPage() {
  const [perfPeriod, setPerfPeriod] = useState<'1D' | '5D' | '1M' | '6M' | '1Y'>('1Y');

  const { data, isLoading, isError } = useQuery<CaelynTerminalData>({
    queryKey: ['caelyn-terminal'],
    queryFn: async () => {
      const res = await fetch('/api/caelyn-terminal');
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 1,
  });

  if (isLoading) return <CTLoading />;
  if (isError || !data) return <CTError />;

  const d = data;
  const p = d.portfolio;
  const sentColor = p.sentiment === 'BULLISH' ? C.green : p.sentiment === 'BEARISH' ? C.red : C.amber;
  const mktColor = p.market_status === 'OPEN' ? C.green : p.market_status === 'PRE-MARKET' ? C.amber : C.red;
  const cm = d.correlation_matrix;
  const perfMap: Record<string, number> = { '1D': p.perf_1d, '5D': p.perf_5d, '1M': p.perf_1m, '6M': p.perf_6m, '1Y': p.perf_1y };

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: C.font, fontSize: 12, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{ background: '#060b14', borderBottom: `1px solid ${C.border}`, padding: '0 14px', height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 5, background: `linear-gradient(135deg, ${C.teal}, #0369a1)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#fff', letterSpacing: 0.5 }}>CT</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: C.text }}>CAELYN TERMINAL</div>
            <div style={{ fontSize: 8, color: C.dim, letterSpacing: 2 }}>PERSONAL PORTFOLIO</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text }}>{fmt$(p.value)}</div>
            <div style={{ fontSize: 9, color: p.change_today >= 0 ? C.green : C.red }}>{sign(p.change_today)}{fmt$(p.change_today)} today</div>
          </div>
          <div style={{ display: 'flex', gap: 10, borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
            {(['1D','5D','1M','6M','1Y'] as const).map(k => (
              <PerfBadge key={k} label={k} val={perfMap[k] ?? 0} />
            ))}
          </div>
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1 }}>TOTAL RETURN</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: p.total_return_pct >= 0 ? C.green : C.red }}>{sign(p.total_return_pct)}{fmtN(p.total_return_pct)}%</div>
          </div>
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 20 }}>
            <div style={{ fontSize: 9, color: C.dim, letterSpacing: 1 }}>SENTIMENT</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: sentColor }}>{p.sentiment}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, display: 'inline-block' }} />
            <span style={{ fontSize: 10, color: C.dim }}>LIVE</span>
            <span style={{ fontSize: 10, color: mktColor, background: `${mktColor}18`, border: `1px solid ${mktColor}55`, borderRadius: 3, padding: '1px 7px', fontWeight: 700 }}>MARKET: {p.market_status}</span>
          </div>
        </div>
      </div>

      {/* ── TICKER TAPE ──────────────────────────────────────────────────── */}
      <div style={{ background: '#07101a', borderBottom: `1px solid ${C.border}`, padding: '4px 10px', display: 'flex', gap: 20, overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
        {d.ticker_tape.map((t, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: C.dim, fontSize: 10 }}>{t.symbol}</span>
            <span style={{ color: C.text, fontSize: 10, fontWeight: 600 }}>{fmtN(t.price, 2)}</span>
            <span style={{ fontSize: 10, color: pctColor(t.change_pct) }}>{sign(t.change_pct)}{fmtN(t.change_pct)}%</span>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '200px 1fr 270px 260px', gap: 0, overflow: 'hidden' }}>

        {/* ── COL 1: Holdings + Earnings ───────────────────────────────── */}
        <div style={{ borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <Card style={{ borderRadius: 0, border: 'none', borderBottom: `1px solid ${C.border}` }}>
            <CardHeader label="Holdings" badge={`${d.positions_count} Positions`} />
            <div style={{ overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['TICKER','PRICE','CHG','CHG%','ALLOC'].map(h => (
                      <th key={h} style={{ padding: '4px 6px', color: C.dim, fontWeight: 600, textAlign: h === 'TICKER' ? 'left' : 'right', fontSize: 9, letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.holdings.map((h, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.dimLow}30` }}>
                      <td style={{ padding: '4px 6px', color: C.teal, fontWeight: 700 }}>{h.ticker}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: C.text }}>{fmtN(h.price, 2)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: pctColor(h.change) }}>{sign(h.change)}{fmtN(h.change, 2)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: pctColor(h.change_pct) }}>{sign(h.change_pct)}{fmtN(h.change_pct, 2)}%</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: C.purple }}>{fmtN(h.allocation_pct, 1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card style={{ borderRadius: 0, border: 'none', flex: 1 }}>
            <CardHeader label="Earnings Calendar" badge="Upcoming" />
            <div style={{ overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['TICKER','COMPANY','WTD','LAST','DATE','EST'].map(h => (
                      <th key={h} style={{ padding: '3px 5px', color: C.dim, fontWeight: 600, textAlign: h === 'COMPANY' ? 'left' : 'right', fontSize: 8, letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.earnings_calendar.map((e, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.dimLow}30` }}>
                      <td style={{ padding: '3px 5px', color: C.teal, fontWeight: 700 }}>{e.ticker}</td>
                      <td style={{ padding: '3px 5px', color: C.dim, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.company}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', color: C.text }}>{e.wtd}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', color: C.dim }}>{e.last_eps}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', color: C.amber }}>{e.next_date}</td>
                      <td style={{ padding: '3px 5px', textAlign: 'right', color: C.dim }}>{e.est_eps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── COL 2: Charts ─────────────────────────────────────────────── */}
        <div style={{ borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Performance chart */}
          <Card style={{ borderRadius: 0, border: 'none', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderBottom: `1px solid ${C.border}`, background: '#0d1623' }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: C.dim, textTransform: 'uppercase' }}>Portfolio vs S&P 500</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['1D','5D','1M','6M','1Y'] as const).map(k => (
                  <button key={k} onClick={() => setPerfPeriod(k)} style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, cursor: 'pointer', border: `1px solid ${perfPeriod === k ? C.teal : C.border}`, background: perfPeriod === k ? `${C.teal}20` : 'transparent', color: perfPeriod === k ? C.teal : C.dim, letterSpacing: 0.5 }}>{k}</button>
                ))}
              </div>
            </div>
            <div style={{ height: 160, padding: '8px 4px 4px 0' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.performance_chart} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: C.dim }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 8, fill: C.dim }} tickLine={false} axisLine={false} tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`} />
                  <RCTooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 10, color: C.text, borderRadius: 4 }} formatter={(v: number, name: string) => [`${sign(v)}${fmtN(v, 1)}%`, name === 'portfolio' ? 'Portfolio' : 'S&P 500']} />
                  <Line type="monotone" dataKey="portfolio" stroke={C.teal} dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="sp500" stroke={C.dim} dot={false} strokeWidth={1.5} strokeDasharray="4 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 14, padding: '4px 10px 8px', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 2, background: C.teal }} /><span style={{ fontSize: 9, color: C.dim }}>Portfolio</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 14, height: 2, background: C.dim, borderTop: '1px dashed' }} /><span style={{ fontSize: 9, color: C.dim }}>S&P 500</span></div>
            </div>
          </Card>

          {/* Asset Allocation */}
          <Card style={{ borderRadius: 0, border: 'none', borderBottom: `1px solid ${C.border}` }}>
            <CardHeader label="Asset Allocation" badge="Breakdown" />
            <div style={{ display: 'flex', alignItems: 'center', padding: 10, gap: 10 }}>
              <div style={{ width: 100, height: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={d.asset_allocation} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="pct" strokeWidth={0}>
                      {d.asset_allocation.map((a, i) => <Cell key={i} fill={a.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {d.asset_allocation.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: a.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: C.dim }}>{a.label}</span>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.text }}>{fmtN(a.pct, 1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Correlation Matrix */}
          <Card style={{ borderRadius: 0, border: 'none', flex: 1 }}>
            <CardHeader label="Correlation Matrix" badge="Heat Map" />
            <div style={{ padding: 8, overflowX: 'auto' }}>
              {cm.tickers.length > 0 && (
                <table style={{ borderCollapse: 'collapse', fontSize: 9 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }} />
                      {cm.tickers.map(t => <th key={t} style={{ padding: '2px 3px', color: C.dim, fontWeight: 600, textAlign: 'center', minWidth: 32 }}>{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {cm.tickers.map((row, ri) => (
                      <tr key={ri}>
                        <td style={{ padding: '2px 4px', color: C.dim, fontWeight: 600, textAlign: 'right', fontSize: 8 }}>{row}</td>
                        {cm.values[ri]?.map((v, ci) => (
                          <td key={ci} style={{ padding: '2px 3px', background: corrBg(v), textAlign: 'center', borderRadius: 2, color: corrTxt(v), fontWeight: 600, minWidth: 32, height: 22 }}>
                            {fmtN(v, 2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>

        {/* ── COL 3: Risk Analysis + Volatility ────────────────────────── */}
        <div style={{ borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Risk Metrics */}
          <Card style={{ borderRadius: 0, border: 'none', borderBottom: `1px solid ${C.border}` }}>
            <CardHeader label="Risk Analysis" badge="Metrics" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.border }}>
              {[
                { label: 'Weighted Volatility', value: `${fmtN(d.risk_metrics.weighted_volatility, 1)}%`, sub: 'Annualized' },
                { label: 'Max Drawdown (1Y)', value: `${fmtN(d.risk_metrics.max_drawdown, 1)}%`, sub: 'Peak to trough' },
                { label: 'Top Concentration', value: `${fmtN(d.risk_metrics.top_concentration, 0)}%`, sub: d.risk_metrics.top_concentration_label },
                { label: 'Portfolio Beta', value: fmtN(d.risk_metrics.portfolio_beta, 2), sub: 'vs S&P 500' },
                { label: 'Sharpe Ratio', value: fmtN(d.risk_metrics.sharpe_ratio, 2), sub: 'Risk-adj. return' },
                { label: 'Sortino Ratio', value: fmtN(d.risk_metrics.sortino_ratio, 2), sub: 'Downside risk-adj.' },
              ].map((m, i) => (
                <div key={i} style={{ padding: '10px 12px', background: C.card }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: C.text, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: C.teal, marginTop: 3, fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 8, color: C.dim, marginTop: 2 }}>{m.sub}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Volatility Bars */}
          <Card style={{ borderRadius: 0, border: 'none', flex: 1 }}>
            <CardHeader label="Volatility" badge="Annualized" />
            <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {d.volatility.map((v, i) => {
                const maxVol = Math.max(...d.volatility.map(x => x.vol), 1);
                const pct = (v.vol / maxVol) * 100;
                const color = v.vol > 35 ? C.red : v.vol > 20 ? C.amber : C.green;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 38, fontSize: 9, color: C.teal, fontWeight: 700, flexShrink: 0 }}>{v.ticker}</span>
                    <div style={{ flex: 1, height: 12, background: C.dimLow, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.6s' }} />
                    </div>
                    <span style={{ width: 38, fontSize: 9, color, fontWeight: 700, textAlign: 'right', flexShrink: 0 }}>{fmtN(v.vol, 1)}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── COL 4: Risk Suggestions + Top Movers ─────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>

          {/* Risk Suggestions */}
          <Card style={{ borderRadius: 0, border: 'none', borderBottom: `1px solid ${C.border}` }}>
            <CardHeader label="Risk Suggestions" badge="Intel" />
            <div style={{ padding: 8 }}>
              {d.risk_suggestions.map((s, i) => <SuggestionCard key={i} s={s} />)}
            </div>
          </Card>

          {/* Top Movers */}
          <Card style={{ borderRadius: 0, border: 'none', flex: 1 }}>
            <CardHeader label="Top Movers" badge="Daily" />
            <div style={{ padding: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>▲ {d.top_movers.gainers.length} up</span>
                <span style={{ fontSize: 9, color: C.dim }}>·</span>
                <span style={{ fontSize: 9, color: C.red, fontWeight: 700 }}>▼ {d.top_movers.losers.length} down</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[...d.top_movers.gainers.slice(0, 2), ...d.top_movers.losers.slice(0, 2)].map((m, i) => {
                  const isGainer = i < d.top_movers.gainers.slice(0, 2).length;
                  const color = isGainer ? C.green : C.red;
                  return (
                    <div key={i} style={{ border: `1px solid ${color}33`, borderRadius: 5, padding: '8px 9px', background: `${color}08` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: C.text }}>{m.ticker}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color }}>
                          {isGainer ? '+' : ''}{fmtN(m.change_pct, 2)}%
                        </span>
                      </div>
                      <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>{fmt$(m.price)}</div>
                      <RangeBar low={m.w52_low} high={m.w52_high} price={m.price} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 8, color: C.dim }}>{fmtN(m.w52_low, 0)}</span>
                        <span style={{ fontSize: 7, color: C.dim }}>52W RANGE</span>
                        <span style={{ fontSize: 8, color: C.dim }}>{fmtN(m.w52_high, 0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── NEWS TICKER ──────────────────────────────────────────────────── */}
      <div style={{ background: '#060b14', borderTop: `1px solid ${C.border}`, height: 26, display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: C.amber, background: `${C.amber}22`, padding: '0 10px', height: '100%', display: 'flex', alignItems: 'center', letterSpacing: 1, borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>NEWS</div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 40, animation: 'ctscroll 60s linear infinite', whiteSpace: 'nowrap' }}>
            {[...d.news_ticker, ...d.news_ticker].map((n, i) => (
              <span key={i} style={{ fontSize: 9, color: C.dim, flexShrink: 0 }}>
                <span style={{ color: C.teal, fontWeight: 700, marginRight: 4 }}>{n.symbol}</span>
                {n.headline}
                <span style={{ color: C.dimLow, marginLeft: 6 }}>{n.time_ago}</span>
                <span style={{ color: C.border, margin: '0 16px' }}>·</span>
              </span>
            ))}
          </div>
        </div>
        <style>{`@keyframes ctscroll { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }`}</style>
      </div>

    </div>
  );
}
