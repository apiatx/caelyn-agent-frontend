import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   Bloomberg-style terminal CSS (injected once)
   ═══════════════════════════════════════════════════════════════════════════ */
const TERMINAL_STYLES = `
  :root {
    --term-green: 142 70% 55%;
    --term-red: 0 72% 55%;
    --term-amber: 45 90% 55%;
    --term-cyan: 185 70% 55%;
    --term-dim: 220 10% 40%;
    --term-bg: 220 20% 4%;
    --term-surface: 220 20% 7%;
    --term-border: 220 15% 14%;
  }
  @keyframes blink { 0%,50%{opacity:1} 51%,to{opacity:0} }
  @keyframes scanline { 0%{transform:translateY(-100%)} to{transform:translateY(100vh)} }
  .cursor-blink { animation: blink 1s step-end infinite; }
  .scanline::after {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(to right, transparent, hsl(142 70% 55% / .03), transparent);
    animation: scanline 8s linear infinite; pointer-events: none; z-index: 100;
  }
  .glow-green { text-shadow: 0 0 8px hsl(142 70% 55% / .4); }
  .glow-red   { text-shadow: 0 0 8px hsl(0 72% 55% / .4); }
  .glow-amber { text-shadow: 0 0 8px hsl(45 90% 55% / .4); }
  .tabular-nums { font-variant-numeric: tabular-nums lining-nums; }
`;

let stylesInjected = false;
function injectTerminalStyles() {
  if (stylesInjected) return;
  const el = document.createElement('style');
  el.textContent = TERMINAL_STYLES;
  document.head.appendChild(el);
  stylesInjected = true;
}

// ─── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg: 'hsl(var(--term-bg))',
  surface: 'hsl(var(--term-surface))',
  border: 'hsl(var(--term-border))',
  green: 'hsl(var(--term-green))',
  red: 'hsl(var(--term-red))',
  amber: 'hsl(var(--term-amber))',
  cyan: 'hsl(var(--term-cyan))',
  dim: 'hsl(var(--term-dim))',
};

// ─── Tab config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'OVERVIEW', shortcut: '1' },
  { id: 'rates', label: 'RATES', shortcut: '2' },
  { id: 'inflation', label: 'INFLATION', shortcut: '3' },
  { id: 'growth', label: 'GROWTH', shortcut: '4' },
  { id: 'labor', label: 'LABOR', shortcut: '5' },
  { id: 'sentiment', label: 'RISK', shortcut: '6' },
] as const;

type TabId = typeof TABS[number]['id'];

const API_MAP: Record<TabId, string> = {
  overview: '/api/macro/dashboard',
  rates: '/api/macro/rates',
  inflation: '/api/macro/inflation',
  growth: '/api/macro/growth',
  labor: '/api/macro/labor',
  sentiment: '/api/macro/risk',
};

// ─── Shared styles ──────────────────────────────────────────────────────────
const card = 'border border-[hsl(var(--term-border))] bg-[hsl(var(--term-surface))] p-3';
const sectionTitle = 'text-[10px] text-[hsl(var(--term-dim))] tracking-wider uppercase mb-2';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    positive: 'text-[hsl(var(--term-green))] bg-[hsl(var(--term-green)/0.08)] border-[hsl(var(--term-green)/0.2)]',
    neutral: 'text-[hsl(var(--term-dim))] bg-white/5 border-white/10',
    elevated: 'text-[hsl(var(--term-amber))] bg-[hsl(var(--term-amber)/0.08)] border-[hsl(var(--term-amber)/0.2)]',
    negative: 'text-[hsl(var(--term-red))] bg-[hsl(var(--term-red)/0.08)] border-[hsl(var(--term-red)/0.2)]',
    high: 'text-[hsl(var(--term-red))] bg-[hsl(var(--term-red)/0.08)] border-[hsl(var(--term-red)/0.2)]',
    low: 'text-[hsl(var(--term-green))] bg-[hsl(var(--term-green)/0.08)] border-[hsl(var(--term-green)/0.2)]',
    inverted: 'text-[hsl(var(--term-red))] bg-[hsl(var(--term-red)/0.06)] border-[hsl(var(--term-red)/0.3)]',
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 border ${colors[status] || colors.neutral}`}>
      {status.toUpperCase()}
    </span>
  );
}

function IndicatorCard({ name, value, status }: { name: string; value: string; status: string }) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[hsl(var(--term-dim))] uppercase tracking-wide">{name}</span>
        <StatusBadge status={status} />
      </div>
      <div className="text-sm font-semibold text-white tabular-nums">{value}</div>
    </div>
  );
}

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(var(--term-surface))] border border-[hsl(var(--term-border))] px-3 py-2 text-xs">
      <div className="text-[hsl(var(--term-dim))] mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-white tabular-nums">
          <span style={{ color: p.color }}>{p.name}: </span>
          {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

const chartGrid = 'hsl(220 15% 14%)';
const chartTick = { fill: 'hsl(220 10% 40%)', fontSize: 10 };

// ─── Calendar helpers ────────────────────────────────────────────────────────
function getNthWeekday(year: number, month: number, weekday: number, n: number): Date {
  const d = new Date(year, month, 1);
  let count = 0;
  while (count < n) {
    if (d.getDay() === weekday) count++;
    if (count < n) d.setDate(d.getDate() + 1);
  }
  return d;
}
function getLastWeekday(year: number, month: number, weekday: number): Date {
  const d = new Date(year, month + 1, 0);
  while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
  return d;
}
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function computeUpcomingEvents(today: Date) {
  const fomcDates = ['2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-09'];
  const events: Array<{ date: Date; label: string; impact: 'high'|'medium' }> = [];
  for (const d of fomcDates) {
    const dt = new Date(d + 'T12:00:00');
    if (dt > today) events.push({ date: dt, label: 'FOMC Rate Decision', impact: 'high' });
  }
  for (let m = 0; m <= 2; m++) {
    const ref = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const yr = ref.getFullYear(); const mo = ref.getMonth();
    const cpi = getNthWeekday(yr, mo, 3, 2);
    if (cpi > today) events.push({ date: cpi, label: `CPI Report (${MONTH_SHORT[(mo+11)%12]})`, impact: 'high' });
    const ppi = new Date(cpi); ppi.setDate(ppi.getDate()+1);
    if (ppi > today) events.push({ date: ppi, label: `PPI Report (${MONTH_SHORT[(mo+11)%12]})`, impact: 'medium' });
    const pce = getLastWeekday(yr, mo, 5);
    if (pce > today) events.push({ date: pce, label: `PCE Report (${MONTH_SHORT[(mo+10)%12]})`, impact: 'medium' });
    const nfp = getNthWeekday(yr, mo, 5, 1);
    if (nfp > today) events.push({ date: nfp, label: `Unemployment Rate (${MONTH_SHORT[(mo+11)%12]})`, impact: 'medium' });
    if ([1,4,7,10].includes(mo)) {
      const gdp = new Date(yr, mo, 30);
      if (gdp > today) events.push({ date: gdp, label: `GDP Q${Math.ceil(mo/3)} (Advance)`, impact: 'high' });
    }
  }
  events.sort((a,b) => a.date.getTime()-b.date.getTime());
  const fmt = (d: Date) => `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  return events.slice(0,8).map(e => ({ dateLabel: fmt(e.date), label: e.label, impact: e.impact }));
}

// ─── TAB 1: OVERVIEW ─────────────────────────────────────────────────────────
function OverviewTab({ data }: { data: any }) {
  if (!data) return null;

  const { data: ratesData } = useQuery<any>({ queryKey: ['/api/macro/rates'], staleTime: 120_000, refetchInterval: 120_000 });
  const { data: spyHistData } = useQuery<any>({ queryKey: ['/api/macro/spy-history'], staleTime: 300_000 });

  // ── Regime derivation ──
  const infl = data.inflation || {};
  const fed = data.fed || {};
  const labor = data.labor || {};
  const rates = data.rates_and_yields || {};
  const liq = data.liquidity || {};
  const scen = data.scenarios || {};
  const gdpData = data.gdp || {};
  const latestGdp: number = (gdpData.quarterly_data ?? []).slice(-1)[0]?.gdp ?? 2;
  const nfp: number = labor.nfp_last ?? 100000;
  const corePce: number = infl.core_pce_yoy ?? 0;
  const cpi: number = infl.cpi_yoy ?? 0;
  const unemp: number = labor.unemployment_rate ?? 4;

  let regime = 'MIXED SIGNALS';
  let rColor = T.amber;
  if (corePce > 2.5 && (latestGdp < 2 || nfp < 50000)) { regime = 'STAGFLATION RISK'; rColor = T.amber; }
  else if (corePce > 3 && latestGdp > 2.5) { regime = 'OVERHEATING'; rColor = T.red; }
  else if (cpi < 2.2 && latestGdp > 2) { regime = 'GOLDILOCKS'; rColor = T.green; }
  else if (latestGdp < 0 || nfp < -200000) { regime = 'RECESSION RISK'; rColor = T.red; }

  // ── Dates ──
  const lastUpdated = new Date(data.last_updated || Date.now());
  const asOfDate = lastUpdated.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const snapLabel = `MARKET SNAPSHOT — ${lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`;

  // ── Narrative bullets from live backend data ──
  const narratives: string[] = [
    `The U.S. economy is caught between competing forces. ${gdpData.commentary || `GDP at ${latestGdp.toFixed(1)}% in the latest quarter.`} ${labor.commentary || ''} ${nfp < 0 ? `February showing outright job losses (${nfp.toLocaleString()})` : `NFP at +${nfp.toLocaleString()}`} and unemployment rising to ${unemp}%.`,
    `Inflation is the Fed's primary constraint. CPI is at ${cpi}% but core PCE is estimated at ${corePce}% — ${Math.round((corePce - 2) * 100)}bps above target. ${infl.commentary || ''} ${scen.bear?.[0] || ''}`,
    `The Fed faces a dilemma. Rates at ${fed.funds_rate_range || fed.funds_rate} — ${fed.commentary || ''} ${rates.commentary || ''} The yield curve has ${(rates.spread_2s10s ?? 0) > 0 ? `re-steepened (2s10s +${Math.round((rates.spread_2s10s ?? 0) * 100)}bps)` : 'inverted'}.`,
    `Key signals: ${liq.commentary || ''} ${scen.base || ''} Resolution depends on ${(rates.spread_2s10s ?? 0) > 0 ? 'inflation trajectory and labor market resilience' : 'whether the yield curve re-steepens'}.`,
  ];

  // ── SPY data ──
  const spy = (data.benchmark_etfs ?? []).find((e: any) => e.ticker === 'SPY') ?? null;
  const spyHistory: { date: string; close: number }[] = spyHistData?.historical ?? [];
  const closes = spyHistory.map((h: any) => h.close).filter(Boolean) as number[];
  const spy52wLow = closes.length > 0 ? Math.min(...closes) : null;
  const spy52wHigh = closes.length > 0 ? Math.max(...closes) : null;

  // Downsample to ~every 5th point for chart performance
  const spyChartData = spyHistory
    .filter((_: any, i: number) => i % 3 === 0 || i === spyHistory.length - 1)
    .map((h: any) => ({ date: h.date.slice(5), close: parseFloat(h.close.toFixed(2)) }));

  // ── Yield curve ──
  const yieldCurve = (ratesData?.yield_curve ?? []).filter((y: any) => y.yield != null);
  const ffRate: number = fed.funds_rate ?? 3.64;

  // ── ETFs + VIX ──
  const etfs: any[] = data.benchmark_etfs ?? [];
  const vix = data.vix ?? null;

  // ── Key risks (scenarios.bear + derived) ──
  const keyRisks: string[] = [
    ...(scen.bear ?? []),
    nfp < 0 ? `AI-driven 'jobless growth' → structural unemployment rise` : `Rising unemployment (${unemp}%) → demand destruction`,
    (rates.spread_2s10s ?? 0) < 0 ? `Yield curve inversion → recession signal ahead` : `Fiscal deficits → term premium expansion → higher long rates`,
    `Consumer confidence collapse → spending finally rolls over`,
  ].slice(0, 4);

  // ── Key opportunities ──
  const keyOpps: string[] = [
    ...(scen.bull ?? []),
    `Fed eventually cuts → front-end duration trade`,
    `${scen.base || 'Soft landing base case → equity multiple expansion'}`,
  ].slice(0, 4);

  // ── Upcoming events ──
  const upcomingEvents = computeUpcomingEvents(new Date());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24 }}>

      {/* ─ MACRO REGIME ─ */}
      <div style={{
        border: `1px solid ${rColor}50`,
        borderLeft: `3px solid ${rColor}`,
        background: `linear-gradient(135deg, ${rColor}08 0%, transparent 60%)`,
        padding: '14px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ color: rColor, fontSize: 14 }}>⚠</span>
          <span style={{ color: rColor, fontSize: 12, fontWeight: 700, letterSpacing: 1.5 }}>
            MACRO REGIME: {regime}
          </span>
        </div>
        <div style={{ color: T.dim, fontSize: 10, marginBottom: 12, letterSpacing: 0.5 }}>
          {asOfDate} — Real-time Macro Intelligence
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {narratives.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <span style={{ color: T.green, fontSize: 11, flexShrink: 0, marginTop: 2 }}>{'>'}</span>
              <span style={{ color: T.green, fontSize: 11, lineHeight: 1.65, opacity: 0.85 }}>{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─ MARKET SNAPSHOT ─ */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '10px 14px' }}>
        <div style={{ color: T.dim, fontSize: 9, letterSpacing: 1.5, marginBottom: 10 }}>{snapLabel}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${etfs.length + (vix ? 1 : 0)}, 1fr)`, gap: 2 }}>
          {etfs.map((etf: any) => {
            const up = (etf.change_pct ?? 0) >= 0;
            const col = up ? T.green : T.red;
            const far = Math.abs(etf.pct_from_52w_high ?? 0) > 10;
            return (
              <div key={etf.ticker} style={{ textAlign: 'center', padding: '4px 2px' }}>
                <div style={{ color: T.dim, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>{etf.ticker}</div>
                <div style={{ color: col, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>${etf.price?.toFixed(2)}</div>
                <div style={{ color: col, fontSize: 10, marginTop: 3 }}>{up ? '+' : ''}{etf.change_pct?.toFixed(2)}%</div>
                <div style={{ color: far ? T.amber : T.dim, fontSize: 9, marginTop: 3 }}>
                  {etf.pct_from_52w_high?.toFixed(1)}% from 52WH
                </div>
              </div>
            );
          })}
          {vix && (() => {
            const vc = vix.current ?? 0;
            const vixCol = vc >= 30 ? T.red : vc >= 20 ? T.amber : T.green;
            const vixLbl = vc >= 30 ? 'High' : vc >= 20 ? 'Elevated' : 'Normal';
            const vixChgDown = (vix.change_pct ?? 0) < 0;
            return (
              <div style={{ textAlign: 'center', padding: '4px 2px' }}>
                <div style={{ color: T.dim, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>VIX</div>
                <div style={{ color: vixCol, fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{vc.toFixed(2)}</div>
                <div style={{ color: vixChgDown ? T.green : T.red, fontSize: 10, marginTop: 3 }}>
                  {vix.change_pct != null ? `${vix.change_pct >= 0 ? '+' : ''}${vix.change_pct.toFixed(2)}%` : '—'}
                </div>
                <div style={{ color: vixCol, fontSize: 9, marginTop: 3 }}>{vixLbl}</div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ─ CHARTS ROW ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* SPY 1-YEAR */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ color: T.dim, fontSize: 9, letterSpacing: 1, marginBottom: 3 }}>S&P 500 (SPY) — 1 YEAR</div>
              {spy && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ color: T.green, fontSize: 15, fontWeight: 700 }}>${spy.price?.toFixed(2)}</span>
                  <span style={{ color: (spy.change_pct ?? 0) >= 0 ? T.green : T.red, fontSize: 11 }}>
                    {(spy.change_pct ?? 0) >= 0 ? '+' : ''}{spy.change_pct?.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
            {spy52wHigh && spy52wLow && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: T.dim, fontSize: 9 }}>52W Range</div>
                <div style={{ color: T.dim, fontSize: 10, marginTop: 2 }}>${spy52wLow.toFixed(2)} – ${spy52wHigh.toFixed(2)}</div>
              </div>
            )}
          </div>
          <div style={{ height: 200 }}>
            {spyChartData.length > 4 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spyChartData} margin={{ top: 4, right: 4, bottom: 0, left: 2 }}>
                  <defs>
                    <linearGradient id="spyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={T.green} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke={T.border} strokeOpacity={0.35} />
                  <XAxis dataKey="date" tick={{ fill: T.dim, fontSize: 9 }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: T.dim, fontSize: 9 }} tickLine={false} axisLine={false} domain={['auto','auto']} tickFormatter={(v) => `$${v}`} width={52} />
                  <Tooltip
                    content={({ active, payload }: any) =>
                      active && payload?.[0] ? (
                        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '6px 10px', fontSize: 11 }}>
                          <div style={{ color: T.dim, marginBottom: 2 }}>{payload[0].payload.date}</div>
                          <div style={{ color: T.green }}>${(payload[0].value as number)?.toFixed(2)}</div>
                        </div>
                      ) : null
                    }
                  />
                  <Area type="monotone" dataKey="close" stroke={T.green} strokeWidth={1.5} fill="url(#spyGrad)" dot={false} name="SPY" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: T.dim, fontSize: 11 }}>Loading chart…</div>
                  {spy && <div style={{ color: T.green, fontSize: 20, fontWeight: 700, marginTop: 8 }}>${spy.price?.toFixed(2)}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TREASURY YIELD CURVE */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ color: T.dim, fontSize: 9, letterSpacing: 1 }}>U.S. TREASURY YIELD CURVE</div>
              <div style={{ color: T.dim, fontSize: 10, marginTop: 3 }}>As of {asOfDate}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-end' }}>
              {[['Current', T.green], ['FF Rate', T.amber]] .map(([lbl, col]) => (
                <div key={lbl as string} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 14, height: 1.5, background: col as string, display: 'inline-block' }} />
                  <span style={{ color: T.dim, fontSize: 9 }}>{lbl as string}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ height: 200 }}>
            {yieldCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yieldCurve} margin={{ top: 4, right: 32, bottom: 0, left: 2 }}>
                  <defs>
                    <linearGradient id="yieldGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={T.green} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={T.green} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 6" stroke={T.border} strokeOpacity={0.35} />
                  <XAxis dataKey="maturity" tick={{ fill: T.dim, fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: T.dim, fontSize: 9 }} tickLine={false} axisLine={false} domain={['auto','auto']} tickFormatter={(v) => `${v.toFixed(1)}%`} width={36} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <ReferenceLine
                    y={ffRate}
                    stroke={T.amber}
                    strokeDasharray="3 4"
                    strokeOpacity={0.7}
                    label={{ value: 'FF Rate', position: 'insideRight', fill: T.amber, fontSize: 8 }}
                  />
                  <Line type="monotone" dataKey="yield" stroke={T.green} strokeWidth={2} dot={{ fill: T.green, r: 3, strokeWidth: 0 }} name="Current" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: T.dim, fontSize: 11 }}>Loading yield data…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─ BOTTOM 3 COLUMNS ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>

        {/* KEY RISKS */}
        <div style={{ border: `1px solid ${T.red}35`, background: `${T.red}07`, padding: '12px 14px' }}>
          <div style={{ color: T.red, fontSize: 9, letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>KEY RISKS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {keyRisks.map((risk, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: T.red, fontSize: 10, flexShrink: 0, marginTop: 1 }}>▶</span>
                <span style={{ color: T.dim, fontSize: 11, lineHeight: 1.5 }}>{risk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KEY OPPORTUNITIES */}
        <div style={{ border: `1px solid ${T.green}35`, background: `${T.green}07`, padding: '12px 14px' }}>
          <div style={{ color: T.green, fontSize: 9, letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>KEY OPPORTUNITIES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {keyOpps.map((opp, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <span style={{ color: T.green, fontSize: 10, flexShrink: 0, marginTop: 1 }}>▶</span>
                <span style={{ color: T.dim, fontSize: 11, lineHeight: 1.5 }}>{opp}</span>
              </div>
            ))}
          </div>
        </div>

        {/* UPCOMING EVENTS */}
        <div style={{ border: `1px solid ${T.border}`, background: T.surface, padding: '12px 14px' }}>
          <div style={{ color: T.dim, fontSize: 9, letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>UPCOMING EVENTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {upcomingEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: ev.impact === 'high' ? T.red : T.amber, fontSize: 8, flexShrink: 0 }}>●</span>
                <span style={{ color: T.dim, fontSize: 10, minWidth: 44, flexShrink: 0 }}>{ev.dateLabel}</span>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>{ev.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// ─── TAB 2: RATES ────────────────────────────────────────────────────────────
function RatesTab({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      {/* Yield Curve Chart */}
      {data.yield_curve?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.cyan }}>YIELD CURVE</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.yield_curve}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="maturity" tick={chartTick} />
                <YAxis tick={chartTick} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="yield" stroke={T.cyan} strokeWidth={2} dot={{ fill: T.cyan, r: 3 }} name="Current" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Yield Table */}
      {data.yield_curve?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.cyan }}>YIELD CURVE SNAPSHOT</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[hsl(var(--term-dim))] border-b border-[hsl(var(--term-border))]">
                <th className="text-left py-2 text-[10px] tracking-wider">Maturity</th>
                <th className="text-right py-2 text-[10px] tracking-wider">Current</th>
                <th className="text-right py-2 text-[10px] tracking-wider">Change</th>
                <th className="text-right py-2 text-[10px] tracking-wider">Prior Close</th>
              </tr>
            </thead>
            <tbody>
              {data.yield_curve.map((y: any) => (
                <tr key={y.maturity} className="border-b border-[hsl(var(--term-border))]/50">
                  <td className="py-2 text-[hsl(var(--term-dim))]">{y.maturity}</td>
                  <td className="py-2 text-right text-[hsl(var(--term-green))] glow-green tabular-nums font-semibold">
                    {y.yield ? y.yield.toFixed(2) + '%' : '—'}
                  </td>
                  <td className={`py-2 text-right tabular-nums font-medium ${y.change > 0 ? 'text-[hsl(var(--term-red))]' : y.change < 0 ? 'text-[hsl(var(--term-green))]' : 'text-[hsl(var(--term-dim))]'}`}>
                    {y.change ? (y.change > 0 ? '+' : '') + y.change.toFixed(2) : '—'}
                  </td>
                  <td className="py-2 text-right text-[hsl(var(--term-dim))] tabular-nums">
                    {y.previousClose ? y.previousClose.toFixed(2) + '%' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Spreads */}
      {data.spreads && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.cyan }}>KEY SPREADS</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-[hsl(var(--term-dim))] mb-1">2s10s Spread</div>
              <div className={`text-lg font-bold tabular-nums ${data.spreads['2s10s'] < 0 ? 'text-[hsl(var(--term-red))] glow-red' : 'text-[hsl(var(--term-green))] glow-green'}`}>
                {data.spreads['2s10s'] >= 0 ? '+' : ''}{(data.spreads['2s10s'] * 100).toFixed(0)} bps
              </div>
              {data.spreads['2s10s'] < 0 && <div className="text-[10px] text-[hsl(var(--term-red))]">INVERTED</div>}
            </div>
            <div>
              <div className="text-[10px] text-[hsl(var(--term-dim))] mb-1">10Y-3M Spread</div>
              <div className={`text-lg font-bold tabular-nums ${data.spreads['10y3m'] < 0 ? 'text-[hsl(var(--term-red))] glow-red' : 'text-[hsl(var(--term-green))] glow-green'}`}>
                {data.spreads['10y3m'] >= 0 ? '+' : ''}{(data.spreads['10y3m'] * 100).toFixed(0)} bps
              </div>
            </div>
          </div>
        </div>
      )}

      {data.indicators && (
        <div className="grid grid-cols-3 gap-3">
          {data.indicators.map((ind: any) => (
            <IndicatorCard key={ind.name} {...ind} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB 3: INFLATION ────────────────────────────────────────────────────────
function InflationTab({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      {data.headline && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.amber }}>HEADLINE NUMBERS</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { label: 'CPI YoY', val: data.headline.cpi_yoy },
              { label: 'Core CPI', val: data.headline.core_cpi_yoy },
              { label: 'Core PCE', val: data.headline.core_pce_yoy },
              { label: 'PPI YoY', val: data.headline.ppi_yoy },
              { label: 'CPI MoM', val: data.headline.cpi_mom },
              { label: 'Target', val: data.headline.target },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <div className="text-[10px] text-[hsl(var(--term-dim))] uppercase mb-1">{label}</div>
                <div className={`text-sm font-bold tabular-nums ${val > data.headline.target ? 'text-[hsl(var(--term-amber))] glow-amber' : 'text-[hsl(var(--term-green))] glow-green'}`}>
                  {val}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.history?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.amber }}>INFLATION TREND</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.history}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="month" tick={chartTick} />
                <YAxis tick={chartTick} domain={[1.5, 4]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="headline" stroke={T.amber} strokeWidth={2} dot={false} name="Headline" />
                <Line type="monotone" dataKey="core" stroke={T.red} strokeWidth={2} dot={false} name="Core" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: T.amber }} /> Headline</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: T.red }} /> Core</span>
          </div>
        </div>
      )}

      {data.cpi_components?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.amber }}>CPI COMPONENT BREAKDOWN (YoY %)</div>
          <div className="space-y-2">
            {data.cpi_components.map((c: any) => {
              const maxVal = Math.max(...data.cpi_components.map((x: any) => Math.abs(x.value)));
              const pct = Math.abs(c.value) / maxVal * 100;
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs text-[hsl(var(--term-dim))] w-40 shrink-0 text-right">{c.name}</span>
                  <div className="flex-1 h-4 bg-white/5 overflow-hidden relative">
                    <div
                      className={`h-full ${c.hot ? 'bg-[hsl(var(--term-amber)/0.15)]' : c.value < 0 ? 'bg-[hsl(var(--term-green)/0.15)]' : 'bg-white/10'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-14 text-right tabular-nums ${c.hot ? 'text-[hsl(var(--term-amber))]' : c.value < 0 ? 'text-[hsl(var(--term-green))]' : 'text-[hsl(var(--term-dim))]'}`}>
                    {c.value > 0 ? '+' : ''}{c.value}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.indicators && (
        <div className="grid grid-cols-3 gap-3">
          {data.indicators.map((ind: any) => (
            <IndicatorCard key={ind.name} {...ind} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB 4: GROWTH ───────────────────────────────────────────────────────────
function GrowthTab({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      {data.gdp?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.green }}>REAL GDP GROWTH (QoQ SAAR %)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.gdp}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="quarter" tick={chartTick} />
                <YAxis tick={chartTick} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="gdp" name="GDP %">
                  {data.gdp.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.gdp >= 2.5 ? T.green : entry.gdp >= 1.5 ? T.amber : T.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.pmi?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.green }}>MANUFACTURING vs SERVICES PMI</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.pmi}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="month" tick={chartTick} />
                <YAxis tick={chartTick} domain={[44, 60]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="mfg" stroke={T.amber} strokeWidth={2} dot={{ r: 2 }} name="Manufacturing" />
                <Line type="monotone" dataKey="svc" stroke={T.cyan} strokeWidth={2} dot={{ r: 2 }} name="Services" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: T.amber }} /> Manufacturing</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: T.cyan }} /> Services</span>
          </div>
          <div className="text-[10px] text-[hsl(var(--term-dim))] mt-1">— Readings above 50 indicate expansion</div>
        </div>
      )}

      {data.indicators && (
        <div className="grid grid-cols-3 gap-3">
          {data.indicators.map((ind: any) => (
            <IndicatorCard key={ind.name} {...ind} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB 5: LABOR ────────────────────────────────────────────────────────────
function LaborTab({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      {data.unemployment?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.red }}>UNEMPLOYMENT RATE (%)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.unemployment}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="month" tick={chartTick} />
                <YAxis tick={chartTick} domain={[3.8, 4.8]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="rate" stroke={T.red} strokeWidth={2} dot={{ r: 2 }} name="U-3 Rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.nfp?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.red }}>NON-FARM PAYROLLS (K)</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.nfp}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="month" tick={chartTick} />
                <YAxis tick={chartTick} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="nfp" name="NFP (K)">
                  {data.nfp.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.nfp >= 100 ? T.green : entry.nfp >= 0 ? T.amber : T.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-[hsl(var(--term-dim))] mt-1">— Declining payroll trend signals labor market deterioration</div>
        </div>
      )}

      {data.indicators && (
        <div className="grid grid-cols-3 gap-3">
          {data.indicators.map((ind: any) => (
            <IndicatorCard key={ind.name} {...ind} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB 6: SENTIMENT & RISK ─────────────────────────────────────────────────
function RiskTab({ data }: { data: any }) {
  if (!data) return null;
  const levelColors: Record<string, string> = {
    red: 'text-[hsl(var(--term-red))] border-[hsl(var(--term-red)/0.3)] bg-[hsl(var(--term-red)/0.06)]',
    amber: 'text-[hsl(var(--term-amber))] border-[hsl(var(--term-amber)/0.3)] bg-[hsl(var(--term-amber)/0.08)]',
    green: 'text-[hsl(var(--term-green))] border-[hsl(var(--term-green)/0.2)] bg-[hsl(var(--term-green)/0.06)]',
  };
  return (
    <div className="space-y-4">
      {data.risk_framework?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.red }}>DRUCKENMILLER RISK FRAMEWORK</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.risk_framework.map((r: any) => (
              <div key={r.label} className={`border p-3 text-center ${levelColors[r.color] || levelColors.green}`}>
                <div className="text-[10px] uppercase tracking-wide opacity-80 mb-1">{r.label}</div>
                <div className="text-sm font-bold mb-1">{r.level}</div>
                <div className="text-[9px] opacity-60">{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.vix_history?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.amber }}>VIX HISTORY</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.vix_history}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="month" tick={chartTick} />
                <YAxis tick={chartTick} domain={[10, 45]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="vix" stroke={T.amber} strokeWidth={2} dot={{ r: 2 }} name="VIX" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.confidence?.length > 0 && (
        <div className={card}>
          <div className={sectionTitle} style={{ color: T.cyan }}>CONSUMER CONFIDENCE & SENTIMENT</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.confidence}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="month" tick={chartTick} />
                <YAxis tick={chartTick} domain={[50, 105]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="conf" stroke={T.cyan} strokeWidth={2} dot={false} name="Conference Board" />
                <Line type="monotone" dataKey="umich" stroke={T.amber} strokeWidth={2} dot={false} name="UMich" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: T.cyan }} /> Conference Board</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: T.amber }} /> UMich</span>
          </div>
        </div>
      )}

      {data.indicators && (
        <div className="grid grid-cols-3 gap-3">
          {data.indicators.map((ind: any) => (
            <IndicatorCard key={ind.name} {...ind} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Live clock hook ─────────────────────────────────────────────────────────
function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function MacroTerminalLive() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const now = useLiveClock();

  useEffect(() => { injectTerminalStyles(); }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < TABS.length) setActiveTab(TABS[idx].id);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const { data, isLoading } = useQuery({
    queryKey: [API_MAP[activeTab]],
    refetchInterval: 120_000,
    staleTime: 60_000,
    retry: 3,
    refetchOnWindowFocus: true,
  });

  const tabComponents: Record<TabId, React.ReactNode> = {
    overview: <OverviewTab data={data} />,
    rates: <RatesTab data={data} />,
    inflation: <InflationTab data={data} />,
    growth: <GrowthTab data={data} />,
    labor: <LaborTab data={data} />,
    sentiment: <RiskTab data={data} />,
  };

  const clockStr = now.toLocaleTimeString('en-US', { hour12: false });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      className="h-screen flex flex-col scanline relative"
      style={{ background: T.bg, color: 'white', fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace" }}
    >
      {/* Terminal Title Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.red, opacity: 0.8, display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.amber, opacity: 0.8, display: 'inline-block' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.green, opacity: 0.8, display: 'inline-block' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: T.green, fontSize: 13 }}>■</span>
          <span style={{ color: T.green, fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>MACRO TERMINAL</span>
          <span style={{ color: T.dim, fontSize: 10, marginLeft: 2 }}>v2.6.0</span>
        </div>
        <div style={{ color: T.dim, fontSize: 10, letterSpacing: 1, marginLeft: 'auto', marginRight: 'auto' }}>
          FRED / BLS / BEA / ISM / TREASURY
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: T.dim, fontSize: 10 }}>{dateStr.toUpperCase()}</span>
          <span style={{ color: T.green, fontSize: 11, fontWeight: 600, minWidth: 56 }}>{clockStr}</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isLoading ? T.amber : T.green, display: 'inline-block', animation: isLoading ? 'blink 0.8s infinite' : undefined }} />
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: `1px solid ${T.border}`, padding: '0 14px', flexShrink: 0 }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '7px 14px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
                color: active ? 'white' : T.dim,
                border: active ? `1px solid ${T.border}` : '1px solid transparent',
                borderBottom: active ? `1px solid ${T.bg}` : '1px solid transparent',
                background: active ? T.surface : 'transparent',
                marginBottom: active ? -1 : 0,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}
            >
              {tab.shortcut} {tab.label}
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', color: T.dim, fontSize: 10 }}>
          KEYS [1-6] TO NAVIGATE
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        {isLoading && !data && (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-white/5 w-64" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-white/5" />
              ))}
            </div>
            <div className="h-64 bg-white/5" />
          </div>
        )}
        {!isLoading && !data && (
          <div className="text-center py-12 text-[hsl(var(--term-dim))]">
            <div className="text-sm mb-2">Failed to load {activeTab} data</div>
            <div className="text-xs">Check your connection and try again</div>
          </div>
        )}
        {data && tabComponents[activeTab]}
      </div>
    </div>
  );
}
