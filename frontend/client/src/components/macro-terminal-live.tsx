import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  { id: 'overview',   label: 'OVERVIEW',              shortcut: '1' },
  { id: 'trade',      label: 'SHOULD I TRADE TODAY?', shortcut: '2' },
  { id: 'rates',      label: 'RATES',                 shortcut: '3' },
  { id: 'inflation',  label: 'INFLATION',             shortcut: '4' },
  { id: 'growth',     label: 'GROWTH',                shortcut: '5' },
  { id: 'labor',      label: 'LABOR',                 shortcut: '6' },
  { id: 'sentiment',  label: 'RISK',                  shortcut: '7' },
  { id: 'watch',      label: 'WORLD',                 shortcut: '8' },
] as const;

type TabId = typeof TABS[number]['id'];

const API_MAP: Record<TabId, string> = {
  overview:  '/api/macro/dashboard',
  rates:     '/api/macro/rates',
  inflation: '/api/macro/inflation',
  growth:    '/api/macro/growth',
  labor:     '/api/macro/labor',
  sentiment: '/api/macro/risk',
  watch:     '/api/macro/dashboard',
  trade:     '/api/macro/dashboard',
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

  // ── Data prep — all sourced directly from FastAPI backend ──────────────────
  const MATS = ['1M', '3M', '6M', '1Y', '2Y', '5Y', '7Y', '10Y', '20Y', '30Y'];

  // yield_curve: numeric-keyed object → map by maturity label
  const ycMap: Record<string, any> = {};
  for (const e of Object.values(data.yield_curve || {}) as any[]) {
    if (MATS.includes(e.maturity)) ycMap[e.maturity] = e;
  }

  // yield_curve_snapshot: backend provides 1W and 1M ago for all 10 maturities
  const snap     = data.yield_curve_snapshot || {};
  const weekAgo  = snap.week_ago  || {};   // { '1M': 3.73, '3M': 3.73, ... }
  const monthAgo = snap.month_ago || {};   // { '1M': 3.71, '3M': 3.69, ... }

  // key_rates: backend provides current value, date, and change_1w_bps per maturity
  const kr       = data.key_rates  || {};
  const kr2y     = kr.us_2y  || {};
  const kr10y    = kr.us_10y || {};

  // fed_policy, spreads, mortgage: all from backend, including pre-computed changes
  const fed      = data.fed_policy || {};
  const spreads  = data.spreads    || {};
  const mortgage = data.mortgage   || {};

  // Indicators → status lookup (from backend indicators array)
  const indicators: { name: string; value: string; status: string }[] = data.indicators || [];
  const getStatus = (name: string) =>
    (indicators.find(i => i.name === name)?.status || 'neutral').toLowerCase();

  // Date helpers
  const asOf = data.last_updated
    ? new Date(data.last_updated).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const fmtCardDate = (d: string) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  // Time-series: history arrays — backend now provides us_2y, us_5y, us_10y, us_30y
  const hist = data.history || {};
  const h2y:   { date: string; value: number }[] = hist.us_2y   || [];
  const h5y:   { date: string; value: number }[] = hist.us_5y   || [];
  const h10y:  { date: string; value: number }[] = hist.us_10y  || [];
  const h30y:  { date: string; value: number }[] = hist.us_30y  || [];

  const cutoff = new Date(Date.now() - 50 * 86400000).toISOString().split('T')[0];
  const tsMap: Record<string, { date: string; us_2y?: number; us_5y?: number; us_10y?: number; us_30y?: number }> = {};
  for (const e of h2y)  if (e.date >= cutoff) tsMap[e.date] = { ...tsMap[e.date], date: e.date, us_2y:  e.value };
  for (const e of h5y)  if (e.date >= cutoff) tsMap[e.date] = { ...tsMap[e.date], date: e.date, us_5y:  e.value };
  for (const e of h10y) if (e.date >= cutoff) tsMap[e.date] = { ...tsMap[e.date], date: e.date, us_10y: e.value };
  for (const e of h30y) if (e.date >= cutoff) tsMap[e.date] = { ...tsMap[e.date], date: e.date, us_30y: e.value };
  const tsData = Object.values(tsMap).sort((a, b) => a.date.localeCompare(b.date));

  const tsFirst = tsData[0]?.date || '';
  const tsLast  = tsData[tsData.length - 1]?.date || '';
  const fmtMon  = (d: string) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
  const tsYear  = tsLast ? new Date(tsLast + 'T12:00:00').getFullYear() : '';
  const tsTitle = tsFirst
    ? `YIELD TIME SERIES — ${fmtMon(tsFirst)} TO ${fmtMon(tsLast)} ${tsYear}`
    : 'YIELD TIME SERIES';

  // Yield-curve area chart data
  const curveData = MATS
    .map(m => ({ maturity: m, yield: ycMap[m]?.yield ?? null }))
    .filter(d => d.yield != null);
  const ffRate = fed.funds_rate ?? null;

  // ── Display helpers ────────────────────────────────────────────────────────
  const fmtYld = (v: number | null | undefined) =>
    v != null ? v.toFixed(2) + '%' : '—';

  // bps integer: already an integer from backend (change_1w_bps), or decimal*100 for spread
  const fmtBpsInt = (bps: number | null | undefined) => {
    if (bps == null) return null;
    const b = Math.round(bps);
    return (b > 0 ? '+' : '') + b + ' bps';
  };

  // For the table Chg row: current - monthAgo in percentage points → bps
  const chgBpsStr = (curr: number | null | undefined, prev: number | null | undefined) => {
    if (curr == null || prev == null) return '—';
    const bps = Math.round((curr - prev) * 100);
    return (bps > 0 ? '+' : '') + bps + 'bp';
  };
  const chgBpsColor = (curr: number | null | undefined, prev: number | null | undefined) => {
    if (curr == null || prev == null) return T.dim;
    const bps = Math.round((curr - prev) * 100);
    if (bps === 0) return T.dim;
    return bps > 0 ? T.red : T.green; // yield up = bearish for bonds
  };

  const bpsIntColor = (bps: number | null | undefined) => {
    if (bps == null || Math.round(bps) === 0) return T.dim;
    return bps > 0 ? T.red : T.green;
  };

  const badgeStyle = (status: string) => {
    const s = status.toLowerCase();
    const color = (s === 'bearish' || s === 'elevated') ? T.red : s === 'bullish' ? T.green : T.amber;
    return {
      fontSize: 9, color, border: `1px solid ${color}`, padding: '1px 5px',
      borderRadius: 2, letterSpacing: '0.06em', fontWeight: 700, flexShrink: 0,
    };
  };
  const badgeLabel = (s: string) => {
    const sl = s.toLowerCase();
    if (sl === 'elevated') return 'BEARISH';
    return sl.toUpperCase();
  };
  const numColor = (status: string) => {
    const s = status.toLowerCase();
    return (s === 'bearish' || s === 'elevated') ? T.red : T.green;
  };

  const arrow = (bps: number | null | undefined) =>
    bps == null || Math.round(bps) === 0 ? '◆' : bps > 0 ? '▲' : '▼';

  const fmtXDate = (d: string) => d ? d.slice(5) : ''; // MM-DD

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Page title */}
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em' }}>
        <span style={{ color: T.green }}>$ </span>
        <span style={{ color: 'rgba(255,255,255,0.9)' }}>RATES &amp; YIELD CURVE</span>
        <span style={{ color: T.dim, fontSize: 11, fontWeight: 400 }}> — Click any card for analysis</span>
      </div>

      {/* ── YIELD CURVE SNAPSHOT TABLE ────────────────────────────────────── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '12px 16px', borderRadius: 2 }}>
        <div style={{ fontSize: 9, color: T.dim, letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>YIELD CURVE SNAPSHOT</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}` }}>
              <th style={{ textAlign: 'left', padding: '4px 0', fontSize: 10, color: T.dim, fontWeight: 600, minWidth: 68 }}>Maturity</th>
              {MATS.map(m => (
                <th key={m} style={{ textAlign: 'right', padding: '4px 3px', fontSize: 10, color: T.dim, fontWeight: 600 }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Current */}
            <tr style={{ borderBottom: `1px solid ${T.border}40` }}>
              <td style={{ padding: '6px 0', color: T.green, fontWeight: 700, fontSize: 11 }}>Current</td>
              {MATS.map(m => (
                <td key={m} className="tabular-nums" style={{ textAlign: 'right', padding: '6px 3px', color: T.green, fontWeight: 700, fontSize: 11 }}>
                  {fmtYld(ycMap[m]?.yield)}
                </td>
              ))}
            </tr>
            {/* 1W Ago — from backend yield_curve_snapshot.week_ago */}
            <tr style={{ borderBottom: `1px solid ${T.border}40` }}>
              <td style={{ padding: '5px 0', color: T.dim, fontSize: 11 }}>1W Ago</td>
              {MATS.map(m => (
                <td key={m} className="tabular-nums" style={{ textAlign: 'right', padding: '5px 3px', color: T.dim, fontSize: 11 }}>
                  {fmtYld(weekAgo[m] ?? null)}
                </td>
              ))}
            </tr>
            {/* 1M Ago — from backend yield_curve_snapshot.month_ago */}
            <tr style={{ borderBottom: `1px solid ${T.border}40` }}>
              <td style={{ padding: '5px 0', color: T.dim, fontSize: 11 }}>1M Ago</td>
              {MATS.map(m => (
                <td key={m} className="tabular-nums" style={{ textAlign: 'right', padding: '5px 3px', color: T.dim, fontSize: 11 }}>
                  {fmtYld(monthAgo[m] ?? null)}
                </td>
              ))}
            </tr>
            {/* Chg (1M) — computed from backend current vs month_ago */}
            <tr>
              <td style={{ padding: '5px 0', color: T.amber, fontWeight: 600, fontSize: 11 }}>Chg (1M)</td>
              {MATS.map(m => {
                const curr = ycMap[m]?.yield ?? null;
                const prev = monthAgo[m] ?? null;
                return (
                  <td key={m} className="tabular-nums" style={{ textAlign: 'right', padding: '5px 3px', color: chgBpsColor(curr, prev), fontWeight: 600, fontSize: 11 }}>
                    {chgBpsStr(curr, prev)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── TWO CHARTS ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 12 }}>

        {/* LEFT: Yield Curve Snapshot */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '12px 16px', borderRadius: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 9, color: T.dim, letterSpacing: 1.5, fontWeight: 700 }}>U.S. TREASURY YIELD CURVE</div>
              <div style={{ fontSize: 10, color: T.green, marginTop: 2 }}>As of {asOf}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: T.green }}>
              <span style={{ width: 16, height: 2, background: T.green, display: 'inline-block' }} />
              Current
            </div>
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ratesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={T.green} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={T.green} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="maturity" tick={chartTick} axisLine={false} tickLine={false} />
                <YAxis
                  tick={chartTick}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => v.toFixed(1) + '%'}
                  axisLine={false} tickLine={false} width={38}
                />
                <Tooltip
                  contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, fontSize: 11 }}
                  labelStyle={{ color: T.dim }}
                  formatter={(v: any) => [Number(v).toFixed(2) + '%', 'Yield']}
                />
                {ffRate != null && (
                  <ReferenceLine
                    y={ffRate}
                    stroke={T.dim}
                    strokeDasharray="4 3"
                    label={{ value: 'FF Rate', fill: T.dim, fontSize: 9, position: 'insideBottomRight' }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="yield"
                  stroke={T.green}
                  strokeWidth={2}
                  fill="url(#ratesGrad)"
                  dot={{ fill: T.green, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: T.green }}
                  name="Current"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: Yield Time Series */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '12px 16px', borderRadius: 2 }}>
          <div style={{ fontSize: 9, color: T.dim, letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
            {tsTitle}
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ ...chartTick, fontSize: 9 }}
                  tickFormatter={fmtXDate}
                  interval="preserveStartEnd"
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={chartTick}
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => v.toFixed(1) + '%'}
                  axisLine={false} tickLine={false} width={36}
                />
                <Tooltip
                  contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, fontSize: 11 }}
                  labelStyle={{ color: T.dim }}
                  formatter={(v: any, n: string) => [Number(v).toFixed(2) + '%', n]}
                />
                <Line type="monotone" dataKey="us_2y"  stroke={T.cyan}  strokeWidth={1.5} dot={false} name="2Y"  />
                <Line type="monotone" dataKey="us_5y"  stroke={T.green} strokeWidth={1.5} dot={false} name="5Y"  />
                <Line type="monotone" dataKey="us_10y" stroke={T.amber} strokeWidth={1.5} dot={false} name="10Y" />
                <Line type="monotone" dataKey="us_30y" stroke={T.red}   strokeWidth={1.5} dot={false} name="30Y" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Legend — 2Y/5Y/10Y/30Y from backend history */}
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8 }}>
            {[
              { label: '2Y',  color: T.cyan  },
              { label: '5Y',  color: T.green },
              { label: '10Y', color: T.amber },
              { label: '30Y', color: T.red   },
            ].map(({ label, color }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontSize: 8 }}>◇</span>
                  <span style={{ width: 12, height: 2, background: color, display: 'inline-block' }} />
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 6 METRIC CARDS (3 + 3) ────────────────────────────────────────── */}
      {[
        // Row 1 — all values and changes from backend directly
        [
          {
            // fed_policy.funds_rate_range + funds_rate_range_date
            title: 'FED FUNDS RATE',
            value: fed.funds_rate_range ? fed.funds_rate_range + '%' : (fed.funds_rate != null ? fed.funds_rate.toFixed(2) + '%' : '—'),
            status: getStatus('Fed Funds Rate'),
            changeText: null as string | null,
            date: fmtCardDate(fed.funds_rate_range_date || ''),
          },
          {
            // key_rates.us_10y.value + change_1w_bps + date
            title: '10Y TREASURY YIELD',
            value: kr10y.value != null ? Number(kr10y.value).toFixed(2) + '%' : '—',
            status: getStatus('10Y Yield'),
            changeText: kr10y.change_1w_bps != null && kr10y.value != null
              ? `${arrow(kr10y.change_1w_bps)} ${fmtBpsInt(kr10y.change_1w_bps)} from ${(kr10y.value - kr10y.change_1w_bps / 100).toFixed(2)}%`
              : null,
            date: fmtCardDate(kr10y.date || ''),
          },
          {
            // key_rates.us_2y.value + change_1w_bps + date
            title: '2Y TREASURY YIELD',
            value: kr2y.value != null ? Number(kr2y.value).toFixed(2) + '%' : '—',
            status: getStatus('2Y Yield'),
            changeText: kr2y.change_1w_bps != null && kr2y.value != null
              ? `${arrow(kr2y.change_1w_bps)} ${fmtBpsInt(kr2y.change_1w_bps)} from ${(kr2y.value - kr2y.change_1w_bps / 100).toFixed(2)}%`
              : null,
            date: fmtCardDate(kr2y.date || ''),
          },
        ],
        // Row 2 — all values and changes from backend directly
        [
          {
            // spreads['2s10s'] + change_2s10s_1w_bps
            title: '2S10S SPREAD',
            value: spreads['2s10s'] != null ? (spreads['2s10s'] >= 0 ? '+' : '') + Math.round(spreads['2s10s'] * 100) + ' bps' : '—',
            status: spreads['2s10s'] != null ? (spreads['2s10s'] < 0 ? 'bearish' : 'neutral') : 'neutral',
            changeText: (() => {
              const bps = spreads.change_2s10s_1w_bps ?? null;
              const curr = spreads['2s10s'] ?? null;
              if (bps == null || curr == null) return null;
              const prevBps = Math.round(curr * 100) - Math.round(bps);
              return `${arrow(bps)} ${fmtBpsInt(bps)} from ${prevBps >= 0 ? '+' : ''}${prevBps} bps`;
            })(),
            date: fmtCardDate(kr10y.date || ''),
          },
          {
            // spreads['10y3m'] + change_10y3m_1w_bps + spread_10y3m_date
            title: '10Y3M SPREAD',
            value: spreads['10y3m'] != null ? (spreads['10y3m'] >= 0 ? '+' : '') + Math.round(spreads['10y3m'] * 100) + ' bps' : '—',
            status: spreads['10y3m'] != null ? (spreads['10y3m'] < 0 ? 'bearish' : 'neutral') : 'neutral',
            changeText: (() => {
              const bps = spreads.change_10y3m_1w_bps ?? null;
              const curr = spreads['10y3m'] ?? null;
              if (bps == null || curr == null) return null;
              const prevBps = Math.round(curr * 100) - Math.round(bps);
              return `${arrow(bps)} ${fmtBpsInt(bps)} from ${prevBps >= 0 ? '+' : ''}${prevBps} bps`;
            })(),
            date: fmtCardDate(spreads.spread_10y3m_date || ''),
          },
          {
            // mortgage.rate_30y + change_1w_bps + rate_30y_date
            title: '30Y MORTGAGE RATE',
            value: mortgage.rate_30y != null ? Number(mortgage.rate_30y).toFixed(2) + '%' : '—',
            status: getStatus('30Y Mortgage'),
            changeText: (() => {
              const bps = mortgage.change_1w_bps ?? null;
              const curr = mortgage.rate_30y ?? null;
              if (bps == null || curr == null) return null;
              const prevPct = (curr - bps / 100).toFixed(2);
              return `${arrow(bps)} ${fmtBpsInt(bps)} from ${prevPct}%`;
            })(),
            date: fmtCardDate(mortgage.rate_30y_date || ''),
          },
        ],
      ].map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {row.map((c) => (
            <div
              key={c.title}
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {/* Title + badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: T.dim, letterSpacing: '0.08em', fontWeight: 600 }}>{c.title}</span>
                <span style={badgeStyle(c.status)}>{badgeLabel(c.status)}</span>
              </div>
              {/* Big number */}
              <div
                className="tabular-nums"
                style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: numColor(c.status), lineHeight: 1.1 }}
              >
                {c.value}
              </div>
              {/* Change + date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 10, color: T.dim }}>{c.changeText ?? ''}</span>
                <span style={{ fontSize: 10, color: T.dim }}>{c.date}</span>
              </div>
            </div>
          ))}
        </div>
      ))}

    </div>
  );
}

// ─── TAB 3: INFLATION ────────────────────────────────────────────────────────
function InflationTab({ data }: { data: any }) {
  if (!data) return null;

  /* ── Pull all backend fields ─────────────────────────────────────────── */
  const hl          = data.headline            || {};
  const histRaw: any[] = Array.isArray(data.history) ? data.history : Object.values(data.history || {});
  const components: any[] = data.cpi_components || [];
  const indicators: any[] = data.indicators    || [];
  const commentary: string = data.commentary   || '';
  const altMeasures        = data.alternative_measures  || {};
  const mktExp             = data.market_expectations   || {};
  const fedPref            = data.fed_preferred         || {};

  /* ── Indicator status lookup ─────────────────────────────────────────── */
  const indStatus = (keyword: string) => {
    const hit = indicators.find((i: any) =>
      i.name.toLowerCase().includes(keyword.toLowerCase())
    );
    return hit?.status ?? 'neutral';
  };

  /* ── Badge helpers ───────────────────────────────────────────────────── */
  type BadgeInfo = { label: string; bg: string; color: string; border: string };
  const inflBadge = (status: string): BadgeInfo => {
    const s = status.toLowerCase();
    if (s === 'bearish' || s === 'elevated' || s === 'well_above_target')
      return { label: 'BEARISH', bg: `${T.red}20`,   color: T.red,   border: `${T.red}50`   };
    if (s === 'bullish')
      return { label: 'BULLISH', bg: `${T.green}20`, color: T.green, border: `${T.green}50` };
    return { label: 'NEUTRAL',   bg: `${T.amber}20`, color: T.amber, border: `${T.amber}50` };
  };
  const inflBadgeStyle = (status: string) => {
    const b = inflBadge(status);
    return {
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
      padding: '2px 6px', borderRadius: 2,
      background: b.bg, color: b.color, border: `1px solid ${b.border}`,
    };
  };
  const inflNumColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'bearish' || s === 'elevated') return T.red;
    if (s === 'bullish') return T.green;
    return T.amber;
  };

  /* ── History: label each point with Month + Year context ─────────────── */
  // Backend returns months in chronological order starting ~Feb 2025
  let yearCtx = 25;
  const histLabelled = histRaw.map((h: any, i: number) => {
    if (i > 0 && h.month === 'Jan') yearCtx = 26;
    return { ...h, label: `${h.month} ${yearCtx}` };
  });
  // Detect government-shutdown gap (Oct missing, Nov present)
  const hasMissingOct = histRaw.some((h: any) => h.month === 'Nov')
                     && !histRaw.some((h: any) => h.month === 'Oct');

  /* ── CPI components: split into two columns ──────────────────────────── */
  const half      = Math.ceil(components.length / 2);
  const leftCol   = components.slice(0, half);
  const rightCol  = components.slice(half);
  const maxAbsVal = Math.max(...components.map((c: any) => Math.abs(c.value)), 0.1);

  /* ── 6 metric cards ──────────────────────────────────────────────────── */
  const cpiSt    = indStatus('CPI');
  const corePceSt = fedPref.target_status === 'well_above_target' ? 'elevated' : indStatus('PCE');
  const ppiSt    = indStatus('PPI');

  const cardRows = [
    /* Row 1 */
    [
      {
        title: 'CPI (HEADLINE YOY)',
        // headline.cpi_yoy from backend
        value: hl.cpi_yoy  != null ? `${Number(hl.cpi_yoy).toFixed(1)}%`        : '—',
        status: cpiSt,
        change: null as string | null,
        date: '',
      },
      {
        title: 'CORE CPI (YOY)',
        // headline.core_cpi_yoy from backend
        value: hl.core_cpi_yoy != null ? `${Number(hl.core_cpi_yoy).toFixed(1)}%` : '—',
        status: cpiSt,
        change: null,
        date: '',
      },
      {
        title: 'CORE PCE (YOY)',
        // fed_preferred.core_pce_yoy from backend — prefixed with ~ (est.)
        value: hl.core_pce_yoy != null ? `~${Number(hl.core_pce_yoy).toFixed(1)}%` : '—',
        status: corePceSt,
        change: null,
        date: '',
      },
    ],
    /* Row 2 */
    [
      {
        title: 'PPI (YOY)',
        // headline.ppi_yoy from backend
        value: hl.ppi_yoy != null ? `${Number(hl.ppi_yoy).toFixed(1)}%` : '—',
        status: ppiSt,
        change: null,
        date: '',
      },
      {
        title: 'CPI MOM',
        // headline.cpi_mom from backend — format as +X.X%
        value: hl.cpi_mom != null
          ? `${Number(hl.cpi_mom) >= 0 ? '+' : ''}${Number(hl.cpi_mom).toFixed(1)}%`
          : '—',
        status: 'elevated',
        change: null,
        date: '',
      },
      {
        title: 'OIL (WTI VIA USD)',
        // ⚠ Not yet provided by backend — backend instruction below
        value: '—',
        status: 'neutral',
        change: null,
        date: 'backend needed',
      },
    ],
  ] as const;

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── CHART: CPI TREND — HEADLINE VS CORE ───────────────────────── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 16px' }}>

        {/* Header row: title + legend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc' }}>
              CPI TREND — HEADLINE VS CORE (CPI INDEX LEVEL)
            </div>
            {hasMissingOct && (
              <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>
                Note: Oct 2025 data unavailable due to government shutdown
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0, fontSize: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.green }}>
              <span style={{ width: 10, height: 10, background: T.green, display: 'inline-block' }} />
              Headline
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.amber }}>
              <span style={{ width: 10, height: 10, background: T.amber, display: 'inline-block' }} />
              Core
            </span>
          </div>
        </div>

        {/* Grouped bar chart — data from backend history[] */}
        {histLabelled.length > 0 && (
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histLabelled} barGap={2} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={chartTick}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={42}
                />
                <YAxis tick={chartTick} width={50} />
                <Tooltip
                  contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, fontSize: 11 }}
                  labelStyle={{ color: T.dim }}
                  formatter={(v: any, n: string) => [Number(v).toFixed(1), n]}
                />
                <Bar dataKey="headline" name="Headline" fill={T.green}  opacity={0.85} radius={[1,1,0,0]} />
                <Bar dataKey="core"     name="Core"     fill={T.amber}  opacity={0.85} radius={[1,1,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Commentary — from backend commentary field */}
        {commentary && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}40`, fontSize: 11, color: '#aaa', lineHeight: 1.55 }}>
            <span style={{ color: T.green, fontWeight: 700, marginRight: 6 }}>&gt;</span>
            {commentary}
          </div>
        )}
      </div>

      {/* ── CPI ALTERNATIVE MEASURES (what backend cpi_components provides) ── */}
      {components.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc', marginBottom: 10 }}>
            ALTERNATIVE INFLATION MEASURES (YOY %)
          </div>

          {/* Two-column horizontal bars — from cpi_components[] */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 32px' }}>
            {[leftCol, rightCol].map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {col.map((c: any) => {
                  const pct      = Math.abs(c.value) / maxAbsVal * 100;
                  const isNeg    = c.value < 0;
                  const barColor = isNeg ? T.cyan : c.hot ? T.amber : T.red;
                  return (
                    <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: T.dim, width: 160, flexShrink: 0 }}>
                        {c.name}
                      </span>
                      <div style={{ flex: 1, height: 6, background: `${T.border}40`, borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
                        <div style={{
                          position: 'absolute', top: 0, left: 0, height: '100%',
                          width: `${Math.min(pct, 100)}%`,
                          background: barColor, borderRadius: 1,
                        }} />
                      </div>
                      <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: barColor, minWidth: 44, textAlign: 'right' }}>
                        {c.value > 0 ? '+' : ''}{Number(c.value).toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Market expectations strip — from market_expectations + alternative_measures */}
          {(mktExp.breakeven_5y != null || mktExp.breakeven_10y != null || altMeasures.sticky_cpi != null) && (
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}40`, display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 11, color: T.dim }}>
              {mktExp.breakeven_5y != null && (
                <span>5Y Breakeven: <span style={{ color: T.cyan, fontWeight: 700 }} className="tabular-nums">{mktExp.breakeven_5y.toFixed(2)}%</span></span>
              )}
              {mktExp.breakeven_10y != null && (
                <span>10Y Breakeven: <span style={{ color: T.cyan, fontWeight: 700 }} className="tabular-nums">{mktExp.breakeven_10y.toFixed(2)}%</span></span>
              )}
              {altMeasures.sticky_cpi != null && (
                <span>Sticky CPI: <span style={{ color: T.amber, fontWeight: 700 }} className="tabular-nums">{altMeasures.sticky_cpi.toFixed(1)}%</span></span>
              )}
              {altMeasures.trimmed_mean_pce != null && (
                <span>Trimmed Mean PCE: <span style={{ color: T.amber, fontWeight: 700 }} className="tabular-nums">{altMeasures.trimmed_mean_pce.toFixed(1)}%</span></span>
              )}
              {fedPref.target != null && (
                <span>Fed Target: <span style={{ color: T.green, fontWeight: 700 }} className="tabular-nums">{fedPref.target.toFixed(1)}%</span></span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 6 METRIC CARDS (2 rows × 3) ───────────────────────────────── */}
      {cardRows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {row.map((c) => {
            const b      = inflBadge(c.status);
            const nColor = inflNumColor(c.status);
            return (
              <div
                key={c.title}
                style={{
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2,
                  padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                {/* Title + badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: T.dim, letterSpacing: '0.08em', fontWeight: 600 }}>
                    {c.title}
                  </span>
                  {c.status !== 'neutral' && (
                    <span style={inflBadgeStyle(c.status)}>{b.label}</span>
                  )}
                </div>
                {/* Big number */}
                <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: nColor, lineHeight: 1.1 }}>
                  {c.value}
                </div>
                {/* Change + date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: T.dim }}>{c.change ?? ''}</span>
                  <span style={{ fontSize: 10, color: T.dim }}>{c.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}

    </div>
  );
}

// ─── TAB 4: GROWTH ───────────────────────────────────────────────────────────
function GrowthTab({ data }: { data: any }) {
  if (!data) return null;

  /* ── Pull backend fields ──────────────────────────────────────────────── */
  const gdpData: any[]      = data.gdp           || [];
  const pmiData: any[]      = data.pmi           || [];
  const mfgObj              = data.manufacturing  || {};
  const consumer            = data.consumer       || {};
  const liquidity           = data.liquidity      || {};
  const indicators: any[]   = data.indicators    || [];
  const commentary: string  = data.commentary    || '';

  /* ── GDP: abbreviate quarter labels (Q1 2024 → Q1 24) ────────────────── */
  const gdpLabelled = gdpData.map((q: any) => ({
    ...q,
    label: (q.quarter || '').replace(' 20', ' '),
  }));
  const lastGdp = gdpData[gdpData.length - 1] || null;

  /* ── PMI: add year context to month labels ───────────────────────────── */
  let pmiyear = 25;
  const pmiLabelled = pmiData.map((p: any, i: number) => {
    if (i > 0 && p.month === 'Jan') pmiyear = 26;
    // svc values are in correct PMI range (~50-60)
    // mfg values from backend are in wrong scale (~12,600) — omitted from chart
    return { ...p, label: `${p.month} ${pmiyear}` };
  });
  const lastPmi = pmiData[pmiData.length - 1] || null;

  /* ── Status → badge mapping ──────────────────────────────────────────── */
  type GBadge = { label: string; bg: string; color: string; border: string };
  const growthBadge = (status: string): GBadge => {
    const s = (status || '').toLowerCase();
    if (s === 'positive' || s === 'bullish')
      return { label: 'BULLISH', bg: `${T.green}20`, color: T.green, border: `${T.green}50` };
    if (s === 'negative' || s === 'bearish' || s === 'elevated')
      return { label: 'BEARISH', bg: `${T.red}20`,   color: T.red,   border: `${T.red}50`   };
    return { label: 'NEUTRAL',  bg: `${T.amber}20`,  color: T.amber, border: `${T.amber}50` };
  };
  const gBadgeStyle = (status: string) => {
    const b = growthBadge(status);
    return { fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 2, background: b.bg, color: b.color, border: `1px solid ${b.border}` };
  };
  const gNumColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'positive' || s === 'bullish') return T.green;
    if (s === 'negative' || s === 'bearish') return T.red;
    return T.amber;
  };

  // Look up indicator status by keyword
  const indSt = (kw: string) =>
    (indicators.find((i: any) => i.name.toLowerCase().includes(kw.toLowerCase()))?.status) ?? 'neutral';

  /* ── 6 metric cards ──────────────────────────────────────────────────── */
  const gdpSt   = indSt('gdp');
  const ismSt   = indSt('manufacturing');
  const m2St    = indSt('m2');
  const csmSt   = indSt('consumer');

  const cardRows = [
    [
      {
        title: `REAL GDP (${lastGdp?.quarter ?? 'LATEST'})`,
        // gdp[last].gdp from backend
        value: lastGdp?.gdp != null
          ? `${lastGdp.gdp >= 0 ? '+' : ''}${Number(lastGdp.gdp).toFixed(1)}%`
          : '—',
        status: gdpSt,
        change: null as string | null,
        date: lastGdp?.quarter ?? '',
      },
      {
        title: 'GDP 2026 FORECAST',
        // ⚠ Not yet provided by backend
        value: '—',
        status: 'neutral',
        change: null,
        date: 'backend needed',
      },
      {
        title: 'ISM MANUFACTURING',
        // manufacturing.ism_manufacturing from backend
        // Note: backend returns wrong scale (~12573 instead of ~52); displayed as-is
        value: mfgObj.ism_manufacturing != null ? `${Number(mfgObj.ism_manufacturing).toFixed(0)}` : '—',
        status: ismSt,
        change: null,
        date: '',
      },
    ],
    [
      {
        title: 'ISM SERVICES',
        // pmi[last].svc from backend (services PMI, correct scale ~56)
        value: lastPmi?.svc != null ? `${Number(lastPmi.svc).toFixed(1)}` : '—',
        status: 'positive',
        change: null,
        date: lastPmi ? `${lastPmi.month} 26` : '',
      },
      {
        title: 'M2 MONEY SUPPLY',
        // liquidity.m2_current_trillion + m2_yoy_growth from backend
        value: liquidity.m2_current_trillion != null ? `$${Number(liquidity.m2_current_trillion).toFixed(1)}T` : '—',
        status: m2St,
        change: liquidity.m2_yoy_growth != null ? `▲ +${liquidity.m2_yoy_growth.toFixed(1)}% YoY` : null,
        date: '',
      },
      {
        title: 'HOUSING STARTS',
        // ⚠ Not yet provided by backend
        value: '—',
        status: 'neutral',
        change: null,
        date: 'backend needed',
      },
    ],
  ];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── ROW 1: TWO SIDE-BY-SIDE CHARTS ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* LEFT: REAL GDP GROWTH chart */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc', marginBottom: 8 }}>
            REAL GDP GROWTH (SAAR, %)
          </div>
          {gdpLabelled.length > 0 && (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gdpLabelled} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="label" tick={chartTick} interval={0} angle={-30} textAnchor="end" height={40} />
                  <YAxis tick={chartTick} width={32} />
                  <ReferenceLine y={2} stroke={T.amber} strokeDasharray="4 3" strokeWidth={1} />
                  <Tooltip
                    contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, fontSize: 11 }}
                    labelStyle={{ color: T.dim }}
                    formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'GDP']}
                  />
                  <Bar dataKey="gdp" name="GDP %" radius={[1,1,0,0]}>
                    {gdpLabelled.map((e: any, i: number) => (
                      <Cell
                        key={i}
                        fill={e.gdp >= 3.5 ? T.green : e.gdp >= 1.5 ? T.amber : T.red}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Commentary from backend */}
          {commentary && (
            <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${T.border}40`, fontSize: 10, color: '#aaa', lineHeight: 1.5 }}>
              <span style={{ color: T.green, fontWeight: 700, marginRight: 5 }}>▶</span>
              {commentary}
            </div>
          )}
        </div>

        {/* RIGHT: ISM PMI — SERVICES chart (mfg data from backend is wrong scale) */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc' }}>
              ISM PMI — SERVICES
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.cyan }}>
                <span style={{ width: 10, height: 10, background: T.cyan, display: 'inline-block' }} />
                Services
              </span>
            </div>
          </div>
          {pmiLabelled.length > 0 && (
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pmiLabelled} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="label" tick={chartTick} interval={1} angle={-30} textAnchor="end" height={40} />
                  <YAxis tick={chartTick} width={32} domain={['auto', 'auto']} />
                  <ReferenceLine y={50} stroke={T.amber} strokeDasharray="4 3" strokeWidth={1} label={{ value: '50', position: 'right', fill: T.amber, fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, fontSize: 11 }}
                    labelStyle={{ color: T.dim }}
                    formatter={(v: any, n: string) => [`${Number(v).toFixed(1)}`, n]}
                  />
                  <Bar dataKey="svc" name="Services" fill={T.cyan} opacity={0.85} radius={[1,1,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* PMI expansion note */}
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${T.border}40`, fontSize: 10, color: '#aaa', lineHeight: 1.5 }}>
            <span style={{ color: T.green, fontWeight: 700, marginRight: 5 }}>▶</span>
            Services PMI above 50 = expansion. Manufacturing PMI data pending backend correction.
          </div>
        </div>
      </div>

      {/* ── 6 METRIC CARDS (2 rows × 3) ──────────────────────────────────── */}
      {cardRows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {row.map((c) => {
            const b      = growthBadge(c.status);
            const nColor = gNumColor(c.status);
            return (
              <div
                key={c.title}
                style={{
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2,
                  padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: T.dim, letterSpacing: '0.08em', fontWeight: 600 }}>{c.title}</span>
                  {c.status !== 'neutral' && (
                    <span style={gBadgeStyle(c.status)}>{b.label}</span>
                  )}
                </div>
                <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: nColor, lineHeight: 1.1 }}>
                  {c.value}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: T.dim }}>{c.change ?? ''}</span>
                  <span style={{ fontSize: 10, color: T.dim }}>{c.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}

    </div>
  );
}

// ─── TAB 5: LABOR ────────────────────────────────────────────────────────────
function LaborTab({ data }: { data: any }) {
  if (!data) return null;

  /* ── Pull backend fields ──────────────────────────────────────────────── */
  const employment          = data.employment   || {};
  const wages               = data.wages        || {};
  const claims              = data.claims       || {};
  const jobOpenings         = data.job_openings || {};
  const commentary: string  = data.commentary  || '';
  const indicators: any[]   = data.indicators  || [];
  const unemployHist: any[] = data.unemployment || [];
  const nfpHist: any[]      = data.nfp         || [];

  /* ── Add year context to history arrays ─────────────────────────────── */
  let uYear = 25;
  const unemployLabelled = unemployHist.map((u: any, i: number) => {
    if (i > 0 && u.month === 'Jan') uYear = 26;
    return { ...u, label: `${u.month} ${uYear}` };
  });
  let nYear = 25;
  const nfpLabelled = nfpHist.map((n: any, i: number) => {
    if (i > 0 && n.month === 'Jan') nYear = 26;
    return { ...n, label: `${n.month} ${nYear}` };
  });

  /* ── Alert condition: NFP negative ──────────────────────────────────── */
  const nfpNegative = (employment.nfp_mom_change ?? 0) < 0;
  const lastNfpK    = employment.nfp_mom_change != null
    ? Math.round(employment.nfp_mom_change / 1000)
    : null;

  /* ── Badge helpers ───────────────────────────────────────────────────── */
  type LBadge = { label: string; bg: string; color: string; border: string };
  const laborBadge = (status: string): LBadge => {
    const s = (status || '').toLowerCase();
    if (s === 'positive' || s === 'bullish')
      return { label: 'BULLISH', bg: `${T.green}20`, color: T.green, border: `${T.green}50` };
    if (s === 'negative' || s === 'bearish' || s === 'elevated')
      return { label: 'BEARISH', bg: `${T.red}20`,   color: T.red,   border: `${T.red}50`   };
    return { label: 'NEUTRAL',  bg: `${T.amber}20`,  color: T.amber, border: `${T.amber}50` };
  };
  const lBadgeStyle = (status: string) => {
    const b = laborBadge(status);
    return { fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 2, background: b.bg, color: b.color, border: `1px solid ${b.border}` };
  };
  const lNumColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'positive' || s === 'bullish') return T.green;
    if (s === 'negative' || s === 'bearish' || s === 'elevated') return T.red;
    return T.amber;
  };

  // Indicator status lookup
  const indSt = (kw: string) =>
    (indicators.find((i: any) => i.name.toLowerCase().includes(kw.toLowerCase()))?.status) ?? 'neutral';

  /* ── 6 metric cards ──────────────────────────────────────────────────── */
  const unempSt  = indSt('unemployment');
  const nfpSt    = indSt('nfp last');
  const wageSt   = indSt('wage');
  const claimsSt = indSt('claims');
  const joltsst  = indSt('jolts');
  const u6St     = indSt('u-6');

  const cardRows = [
    [
      {
        title: 'UNEMPLOYMENT RATE',
        // employment.unemployment_rate from backend
        value: employment.unemployment_rate != null ? `${Number(employment.unemployment_rate).toFixed(1)}%` : '—',
        status: unempSt,
        change: employment.u6_rate != null ? `U-6: ${employment.u6_rate.toFixed(1)}%` : null as string | null,
        date: 'Feb 2026',
      },
      {
        title: 'NONFARM PAYROLLS',
        // employment.nfp_mom_change from backend — show "Negative" when < 0
        value: lastNfpK != null ? (lastNfpK < 0 ? 'Negative' : `+${lastNfpK}K`) : '—',
        status: nfpSt,
        change: employment.nfp_3m_avg != null
          ? `3M avg: ${Math.round(employment.nfp_3m_avg / 1000)}K/mo`
          : null,
        date: 'Feb 2026',
      },
      {
        title: 'WAGE GROWTH',
        // wages.avg_hourly_earnings_yoy from backend
        value: wages.avg_hourly_earnings_yoy != null ? `${Number(wages.avg_hourly_earnings_yoy).toFixed(1)}%` : '—',
        status: wageSt,
        change: null as string | null,
        date: 'Latest',
      },
    ],
    [
      {
        title: 'INITIAL CLAIMS',
        // claims.initial_claims from backend
        value: claims.initial_claims != null ? `${Math.round(claims.initial_claims / 1000)}K` : '—',
        status: claimsSt,
        change: claims.continued_claims != null ? `Continued: ${Math.round(claims.continued_claims / 1000)}K` : null,
        date: 'Weekly',
      },
      {
        title: 'JOLTS OPENINGS',
        // job_openings.jolts_millions from backend
        value: jobOpenings.jolts_millions != null ? `${Number(jobOpenings.jolts_millions).toFixed(1)}M` : '—',
        status: joltsst,
        change: null,
        date: 'Latest',
      },
      {
        title: 'PARTICIPATION RATE',
        // employment.participation_rate from backend
        value: employment.participation_rate != null ? `${Number(employment.participation_rate).toFixed(1)}%` : '—',
        status: 'neutral',
        change: null,
        date: 'Latest',
      },
    ],
  ];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── ALERT BANNER — shown when NFP is negative ─────────────────── */}
      {nfpNegative && (
        <div style={{
          border: `1px solid ${T.red}60`, background: `${T.red}08`, borderRadius: 2,
          padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ color: T.amber, fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
          <div style={{ fontSize: 11, color: '#ddd', lineHeight: 1.6 }}>
            <span style={{ color: T.red, fontWeight: 700, letterSpacing: '0.05em' }}>LABOR MARKET DETERIORATION</span>
            {' — '}{commentary}
          </div>
        </div>
      )}

      {/* ── TWO SIDE-BY-SIDE CHARTS ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* LEFT: UNEMPLOYMENT RATE — from unemployment[] */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc', marginBottom: 3 }}>
              UNEMPLOYMENT RATE (%)
            </div>
            {employment.unemployment_rate != null && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: T.red }} className="tabular-nums">
                  {Number(employment.unemployment_rate).toFixed(1)}%
                </span>
                {employment.nfp_3m_avg != null && (
                  <span style={{ fontSize: 10, color: T.green }}>
                    ▲ trending up
                  </span>
                )}
              </div>
            )}
          </div>
          {unemployLabelled.length > 0 && (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={unemployLabelled}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="label" tick={chartTick} interval={1} angle={-30} textAnchor="end" height={40} />
                  <YAxis tick={chartTick} width={36} domain={[3.8, 4.8]} />
                  <ReferenceLine
                    y={4.5}
                    stroke={T.amber}
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    label={{ value: 'C', position: 'right', fill: T.amber, fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, fontSize: 11 }}
                    labelStyle={{ color: T.dim }}
                    formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'U-3']}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke={T.red}
                    strokeWidth={2}
                    dot={{ r: 2, fill: T.red }}
                    name="U-3 Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* RIGHT: NONFARM PAYROLLS — from nfp[] */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc', marginBottom: 3 }}>
              NONFARM PAYROLLS (K/MONTH)
            </div>
            {lastNfpK != null && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: lastNfpK < 0 ? T.red : T.green }} className="tabular-nums">
                  {lastNfpK < 0 ? '' : '+'}{lastNfpK}K
                </span>
                {nfpNegative && (
                  <span style={{ fontSize: 10, color: T.red, fontWeight: 600 }}>First negative since COVID</span>
                )}
              </div>
            )}
          </div>
          {nfpLabelled.length > 0 && (
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nfpLabelled}>
                  <defs>
                    <linearGradient id="nfpGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.green} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={T.green} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="label" tick={chartTick} interval={1} angle={-30} textAnchor="end" height={40} />
                  <YAxis
                    tick={chartTick}
                    width={42}
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}K`}
                  />
                  <ReferenceLine
                    y={70000}
                    stroke={T.amber}
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    label={{ value: 'B', position: 'right', fill: T.amber, fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, fontSize: 11 }}
                    labelStyle={{ color: T.dim }}
                    formatter={(v: any) => [`${Math.round(Number(v) / 1000)}K`, 'NFP']}
                  />
                  <Area
                    type="monotone"
                    dataKey="nfp"
                    stroke={T.green}
                    strokeWidth={2}
                    fill="url(#nfpGrad)"
                    dot={{ r: 2, fill: T.green }}
                    name="NFP"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── LABOR MARKET STRUCTURE — COMMENTARY ────────────────────────── */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc', marginBottom: 10 }}>
          LABOR MARKET STRUCTURE
        </div>
        {/* commentary from backend */}
        {commentary && (
          <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.65, marginBottom: 8 }}>
            <span style={{ color: T.green, fontWeight: 700, marginRight: 6 }}>&gt;</span>
            {commentary}
          </div>
        )}
        {/* Supplementary metrics from backend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 11, color: T.dim, paddingTop: 8, borderTop: `1px solid ${T.border}40` }}>
          {employment.nfp_3m_avg != null && (
            <span>NFP 3M avg: <span style={{ color: T.amber, fontWeight: 700 }} className="tabular-nums">
              {Math.round(employment.nfp_3m_avg / 1000)}K/mo
            </span></span>
          )}
          {employment.u6_rate != null && (
            <span>U-6 Rate: <span style={{ color: T.amber, fontWeight: 700 }} className="tabular-nums">
              {employment.u6_rate.toFixed(1)}%
            </span></span>
          )}
          {employment.participation_rate != null && (
            <span>Participation: <span style={{ color: T.amber, fontWeight: 700 }} className="tabular-nums">
              {employment.participation_rate.toFixed(1)}%
            </span></span>
          )}
          {claims.initial_claims != null && (
            <span>Initial Claims: <span style={{ color: T.cyan, fontWeight: 700 }} className="tabular-nums">
              {Math.round(claims.initial_claims / 1000)}K
            </span></span>
          )}
          {claims.continued_claims != null && (
            <span>Continued Claims: <span style={{ color: T.cyan, fontWeight: 700 }} className="tabular-nums">
              {Math.round(claims.continued_claims / 1000)}K
            </span></span>
          )}
        </div>
      </div>

      {/* ── 6 METRIC CARDS (2 rows × 3) ──────────────────────────────────── */}
      {cardRows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {row.map((c) => {
            const b      = laborBadge(c.status);
            const nColor = lNumColor(c.status);
            return (
              <div
                key={c.title}
                style={{
                  background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2,
                  padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: T.dim, letterSpacing: '0.08em', fontWeight: 600 }}>{c.title}</span>
                  <span style={lBadgeStyle(c.status)}>{b.label}</span>
                </div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: c.value === 'Negative' ? 20 : 22, fontWeight: 700, letterSpacing: '-0.02em', color: nColor, lineHeight: 1.1 }}
                >
                  {c.value}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: T.dim }}>{c.change ?? ''}</span>
                  <span style={{ fontSize: 10, color: T.dim }}>{c.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}

    </div>
  );
}

// ─── TAB 6: SENTIMENT & RISK ─────────────────────────────────────────────────
function RiskTab({ data }: { data: any }) {
  if (!data) return null;

  /* ── Pull backend fields ─────────────────────────────────────────────── */
  const volatility          = data.volatility        || {};
  const creditSpreads       = data.credit_spreads    || {};
  const fearGreed           = data.fear_greed        || {};
  const dollar              = data.dollar            || {};
  const yieldCurveRisk      = data.yield_curve_risk  || {};
  const riskFramework: any[]= data.risk_framework    || [];
  const indicators: any[]   = data.indicators        || [];
  const commentary: string  = data.commentary        || '';
  // history.vix: array of {date, value} — 261 daily points
  const vixHistory: any[]   = (data.history?.vix) || [];
  const fgComponents        = fearGreed.components   || {};

  /* ── VIX history: format date labels for X-axis ──────────────────────── */
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const fmtDateLabel = (s: string) => {
    try {
      const [y, m] = s.split('-');
      return `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`;
    } catch { return s; }
  };
  // Sample ~every 20 points to keep chart readable (261 pts → ~13 ticks)
  const vixChartData = vixHistory.map((v: any) => ({
    value: v.value,
    label: fmtDateLabel(v.date),
  }));

  /* ── Alert condition: extreme fear or any red risk framework item ────── */
  const hasExtremeFear  = fearGreed.rating === 'extreme fear';
  const hasRedRisk      = riskFramework.some((r: any) => r.color === 'red');
  const showAlert       = hasExtremeFear || hasRedRisk;
  const alertRiskItem   = riskFramework.find((r: any) => r.color === 'red');

  /* ── Color helpers for risk framework items ──────────────────────────── */
  const riskColor = (color: string) => {
    if (color === 'red')   return { fg: T.red,   bg: `${T.red}12`,   border: `${T.red}40`   };
    if (color === 'amber') return { fg: T.amber, bg: `${T.amber}12`, border: `${T.amber}40` };
    return                        { fg: T.green, bg: `${T.green}08`, border: `${T.green}35` };
  };

  /* ── Badge helpers ───────────────────────────────────────────────────── */
  type RBadge = { label: string; bg: string; color: string; border: string };
  const riskBadge = (status: string): RBadge => {
    const s = (status || '').toLowerCase();
    if (s === 'elevated' || s === 'negative' || s === 'bearish')
      return { label: 'BEARISH', bg: `${T.red}20`,   color: T.red,   border: `${T.red}50`   };
    if (s === 'positive' || s === 'bullish')
      return { label: 'BULLISH', bg: `${T.green}20`, color: T.green, border: `${T.green}50` };
    return { label: 'NEUTRAL',   bg: `${T.amber}20`, color: T.amber, border: `${T.amber}50` };
  };
  const rBadgeStyle = (status: string) => {
    const b = riskBadge(status);
    return { fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 2, background: b.bg, color: b.color, border: `1px solid ${b.border}` };
  };
  const rNumColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'elevated' || s === 'negative' || s === 'bearish') return T.red;
    if (s === 'positive' || s === 'bullish') return T.green;
    return T.amber;
  };

  // Indicator status lookup
  const indSt = (kw: string) =>
    (indicators.find((i: any) => i.name.toLowerCase().includes(kw.toLowerCase()))?.status) ?? 'neutral';

  /* ── 6 metric cards ──────────────────────────────────────────────────── */
  const vixSt    = indSt('vix');
  const hyoasSt  = creditSpreads.hy_signal === 'normal' ? 'neutral' : 'elevated';
  const fgSt     = fearGreed.rating === 'extreme fear' ? 'negative' : fearGreed.rating === 'greed' ? 'positive' : 'neutral';

  const cardRows = [
    [
      {
        title: 'VIX',
        // volatility.vix from backend
        value: volatility.vix != null ? `${Number(volatility.vix).toFixed(2)}` : '—',
        status: vixSt,
        change: volatility.interpretation ? volatility.interpretation : null as string | null,
        date: '',
      },
      {
        title: 'FEAR & GREED INDEX',
        // fear_greed.score + rating from backend
        value: fearGreed.score != null ? `${Number(fearGreed.score).toFixed(1)}` : '—',
        status: fgSt,
        change: fearGreed.rating ? fearGreed.rating.toUpperCase() : null,
        date: '',
      },
      {
        title: 'HY OAS SPREAD',
        // credit_spreads.hy_oas from backend
        value: creditSpreads.hy_oas != null ? `${Number(creditSpreads.hy_oas).toFixed(2)}%` : '—',
        status: hyoasSt,
        change: creditSpreads.hy_signal ? `Signal: ${creditSpreads.hy_signal}` : null,
        date: '',
      },
    ],
    [
      {
        title: 'BBB OAS SPREAD',
        // credit_spreads.bbb_oas from backend
        value: creditSpreads.bbb_oas != null ? `${Number(creditSpreads.bbb_oas).toFixed(2)}%` : '—',
        status: 'neutral',
        change: null as string | null,
        date: '',
      },
      {
        title: '2s10s YIELD SPREAD',
        // yield_curve_risk.spread_2s10s + inverted from backend
        value: yieldCurveRisk.spread_2s10s != null
          ? `${yieldCurveRisk.spread_2s10s >= 0 ? '+' : ''}${Number(yieldCurveRisk.spread_2s10s).toFixed(2)}%`
          : '—',
        status: yieldCurveRisk.inverted ? 'elevated' : 'neutral',
        change: yieldCurveRisk.inverted != null
          ? (yieldCurveRisk.inverted ? 'Inverted — recession signal' : 'Not inverted')
          : null,
        date: '',
      },
      {
        title: 'VIX SIGNAL',
        // volatility.signal from backend
        value: volatility.signal ? volatility.signal.toUpperCase() : '—',
        status: volatility.signal === 'elevated' ? 'elevated' : 'neutral',
        change: fearGreed.momentum_shift ? fearGreed.momentum_shift : null,
        date: '',
      },
    ],
  ];

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── ALERT BANNER — extreme fear or red risk item ──────────────── */}
      {showAlert && (
        <div style={{
          border: `1px solid ${T.red}60`, background: `${T.red}08`, borderRadius: 2,
          padding: '10px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: T.amber, fontSize: 13 }}>⚠</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.red, letterSpacing: '0.06em' }}>
              {alertRiskItem
                ? `${alertRiskItem.label}: ${alertRiskItem.level}`
                : 'EXTREME MARKET FEAR DETECTED'}
            </span>
          </div>
          {fearGreed.signal && (
            <div style={{ fontSize: 11, color: '#ccc', lineHeight: 1.6 }}>
              {/* fear_greed.signal from backend */}
              {fearGreed.signal}
            </div>
          )}
          {alertRiskItem && (
            <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
              {alertRiskItem.detail}
            </div>
          )}
        </div>
      )}

      {/* ── TWO SIDE-BY-SIDE CHARTS ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* LEFT: VIX chart — from history.vix[] */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 14px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc', marginBottom: 2 }}>
                CBOE VOLATILITY INDEX (VIX)
              </div>
              {volatility.vix != null && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: T.amber }} className="tabular-nums">
                    {Number(volatility.vix).toFixed(2)}
                  </span>
                  <span style={{ fontSize: 10, color: T.dim }}>
                    {volatility.signal ? `(${volatility.signal})` : ''}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* VIX line chart using history.vix */}
          {vixChartData.length > 0 && (
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={vixChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={chartTick}
                    interval={Math.floor(vixChartData.length / 6)}
                    height={35}
                  />
                  <YAxis tick={chartTick} width={32} domain={[10, 'auto']} />
                  {/* "F" = elevated fear threshold */}
                  <ReferenceLine y={28} stroke={T.red} strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'F', position: 'right', fill: T.red, fontSize: 10 }} />
                  {/* "N" = normal/neutral threshold */}
                  <ReferenceLine y={20} stroke={T.green} strokeDasharray="4 3" strokeWidth={1}
                    label={{ value: 'N', position: 'right', fill: T.green, fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, fontSize: 11 }}
                    labelStyle={{ color: T.dim }}
                    formatter={(v: any) => [`${Number(v).toFixed(2)}`, 'VIX']}
                  />
                  <Line type="monotone" dataKey="value" stroke={T.amber} strokeWidth={1.5} dot={false} name="VIX" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* RIGHT: Fear & Greed components — from fear_greed.components */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc', marginBottom: 6 }}>
            FEAR & GREED INDEX
          </div>
          {fearGreed.score != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: fearGreed.score < 25 ? T.red : fearGreed.score > 75 ? T.green : T.amber }} className="tabular-nums">
                {Number(fearGreed.score).toFixed(1)}
              </span>
              <span style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase' }}>
                {fearGreed.rating}
              </span>
            </div>
          )}
          {/* Component breakdown — from fear_greed.components */}
          {Object.keys(fgComponents).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Object.entries(fgComponents).map(([key, comp]: [string, any]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const score = comp?.score ?? 0;
                const pct   = Math.min(Math.max(score, 0), 100);
                const col   = score < 25 ? T.red : score > 75 ? T.green : T.amber;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 9, color: T.dim, width: 140, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 4, background: `${T.border}40`, borderRadius: 1, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 1 }} />
                    </div>
                    <span style={{ fontSize: 9, color: col, minWidth: 28, textAlign: 'right' }} className="tabular-nums">
                      {Number(score).toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Momentum shift */}
          {fearGreed.momentum_shift && (
            <div style={{ marginTop: 8, fontSize: 10, color: T.dim, borderTop: `1px solid ${T.border}40`, paddingTop: 6 }}>
              {fearGreed.momentum_shift}
            </div>
          )}
        </div>
      </div>

      {/* ── RISK HEAT MAP — DRUCKENMILLER FRAMEWORK ──────────────────────── */}
      {riskFramework.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: '#ccc', marginBottom: 10 }}>
            RISK HEAT MAP — DRUCKENMILLER FRAMEWORK
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {riskFramework.map((r: any) => {
              const { fg, bg, border } = riskColor(r.color || 'green');
              return (
                <div
                  key={r.label}
                  style={{ border: `1px solid ${border}`, background: bg, borderRadius: 2, padding: '10px 12px' }}
                >
                  <div style={{ fontSize: 9, color: fg, letterSpacing: '0.1em', opacity: 0.8, marginBottom: 4 }}>
                    {r.label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: fg, marginBottom: 4 }}>
                    {r.level}
                  </div>
                  <div style={{ fontSize: 9, color: fg, opacity: 0.65, lineHeight: 1.4 }}>
                    {r.detail}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 6 METRIC CARDS (2 rows × 3) ──────────────────────────────────── */}
      {cardRows.map((row, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {row.map((c) => {
            const b      = riskBadge(c.status);
            const nColor = rNumColor(c.status);
            return (
              <div
                key={c.title}
                style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: T.dim, letterSpacing: '0.08em', fontWeight: 600 }}>{c.title}</span>
                  <span style={rBadgeStyle(c.status)}>{b.label}</span>
                </div>
                <div className="tabular-nums" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: nColor, lineHeight: 1.1 }}>
                  {c.value}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: T.dim }}>{c.change ?? ''}</span>
                  <span style={{ fontSize: 10, color: T.dim }}>{c.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* ── COMMENTARY ───────────────────────────────────────────────────── */}
      {commentary && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, padding: '10px 14px', fontSize: 11, color: T.dim, lineHeight: 1.6 }}>
          <span style={{ color: T.green, fontWeight: 700, marginRight: 6 }}>&gt;</span>
          {/* commentary from backend */}
          {commentary}
        </div>
      )}

    </div>
  );
}

// ─── TAB 8: WORLD ─────────────────────────────────────────────────────────────
// Forex heatmap + Economic map

const WatchForexHeatmap = memo(function WatchForexHeatmap() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({ colorTheme: 'dark', isTransparent: true, locale: 'en', currencies: ['EUR','USD','JPY','GBP','CHF','AUD','CAD','NZD','CNY'], width: '100%', height: '100%' });
    container.current.appendChild(script);
  }, []);
  return (
    <div className="tradingview-widget-container" ref={container} style={{ width: '100%', height: '100%' }}>
      <div className="tradingview-widget-container__widget" style={{ width: '100%', height: '100%' }} />
    </div>
  );
});

function WatchEconomicMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    containerRef.current.appendChild(iframe);
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><style>body{margin:0;padding:0;overflow:hidden;background:transparent;}</style></head><body><script type="module" src="https://widgets.tradingview-widget.com/w/en/tv-economic-map.js"><\/script><tv-economic-map metric="intr" theme="dark" transparent style="width:100%;height:700px;display:block;"></tv-economic-map></body></html>`);
      doc.close();
    }
    return () => {
      if (containerRef.current && iframe.parentNode === containerRef.current) {
        containerRef.current.removeChild(iframe);
      }
    };
  }, []);
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

function WatchTab() {
  const panelStyle = {
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 2, overflow: 'hidden',
  };
  const labelStyle = {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: T.dim, padding: '8px 12px',
    borderBottom: `1px solid ${T.border}`, textTransform: 'uppercase' as const,
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── FOREX HEATMAP — full width ────────────────────────────────── */}
      <div style={{ ...panelStyle, height: 520 }}>
        <div style={labelStyle}>FOREX HEATMAP</div>
        <div style={{ height: 'calc(100% - 37px)' }}>
          <WatchForexHeatmap />
        </div>
      </div>

      {/* ── ECONOMIC MAP — full width ─────────────────────────────────── */}
      <div style={{ ...panelStyle, height: 740 }}>
        <div style={labelStyle}>ECONOMIC MAP</div>
        <div style={{ height: 'calc(100% - 37px)' }}>
          <WatchEconomicMap />
        </div>
      </div>

    </div>
  );
}

// ─── TAB 8: TRADE (Should I Be Trading?) ────────────────────────────────────

type STDecision = 'YES' | 'CAUTION' | 'NO';
type STDirection = 'up' | 'down' | 'flat';
type STMode = 'swing' | 'day';
type STTerminalType = 'dim' | 'red' | 'green' | 'yellow' | 'blue' | 'white';
interface STMetric { label: string; value: string; status?: string; ok: boolean; }
interface STPillar { title: string; score: number; weight: number; direction: STDirection; metrics: STMetric[]; }
interface STExecCond { label: string; value?: string; status?: string; ok: boolean; }
interface STTerminalLine { type: STTerminalType; text: string; }
interface STSectorItem { ticker: string; name: string; change_pct: number; }
interface STDashboard {
  decision: STDecision; market_quality_score: number; execution_window_score: number; mode: STMode;
  pillars: STPillar[]; summary: string; execution_conditions: STExecCond[];
  terminal_analysis: STTerminalLine[]; alert: { show: boolean; title: string; text: string }; as_of: string; from_cache: boolean;
  sector_performance?: STSectorItem[];
}

const ST = {
  bg: '#0d1117', card: '#161b22', border: '#21262d',
  text: '#e6edf3', dim: '#8b949e', dimLow: '#484f58',
  green: '#3fb950', yellow: '#e3b341', orange: '#f0883e', red: '#f85149', blue: '#58a6ff',
};
function stScoreColor(s: number) {
  if (s >= 70) return ST.green; if (s >= 50) return ST.yellow;
  if (s >= 30) return ST.orange; return ST.red;
}
function stDecisionColor(d: STDecision) {
  if (d === 'YES') return ST.green; if (d === 'CAUTION') return ST.yellow; return ST.red;
}
function stTermColor(t: STTerminalType) {
  if (t === 'red') return ST.red; if (t === 'green') return ST.green;
  if (t === 'yellow') return ST.yellow; if (t === 'blue') return ST.blue;
  if (t === 'white') return ST.text; return ST.dim;
}
function stParseVal(v: string): { main: string; sub: string } {
  const m = v.match(/^([^(]+?)(?:\s*\(([^)]+)\))?$/);
  return { main: m?.[1]?.trim() ?? v, sub: m?.[2]?.trim() ?? '' };
}
function stStatusWordColor(status: string, ok: boolean): string {
  const s = status.toLowerCase();
  const neutral = ['normal','neutral','stable','moderate','easing','upcoming','soon','hold','clear'];
  if (neutral.some(w => s === w || s.startsWith(w))) return ST.yellow;
  return ok ? ST.green : ST.red;
}
function stPillarIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('volat')) return '⚡'; if (t.includes('trend')) return '↗';
  if (t.includes('breadth')) return '≋'; if (t.includes('macro') || t.includes('liquid')) return '◉';
  if (t.includes('moment') || t.includes('sent')) return '◎'; return '●';
}
function stPositionLabel(d: STDecision) {
  if (d === 'YES') return { label: 'FULL SIZE', sub: 'Press risk' };
  if (d === 'CAUTION') return { label: 'SELECTIVE', sub: 'Half size' };
  return { label: 'MINIMAL', sub: 'Preserve capital' };
}
function stFindMetric(pillars: STPillar[], titleKey: string, labelKey: string): STMetric | undefined {
  const p = pillars.find(p => p.title.toLowerCase().includes(titleKey.toLowerCase()));
  return p?.metrics.find(m => m.label.toLowerCase().includes(labelKey.toLowerCase()));
}
const stFetchDashboard = async (mode: STMode): Promise<STDashboard> => {
  const res = await fetch(`/api/trading-dashboard?mode=${mode}`);
  if (!res.ok) throw new Error('Failed');
  return res.json();
};
const stPostRefresh = async (mode: STMode): Promise<STDashboard> => {
  const r = await fetch(`/api/trading-dashboard/refresh?mode=${mode}`, { method: 'POST' });
  if (!r.ok) return stFetchDashboard(mode);
  return r.json();
};

function STGauge({ score, size = 120, thick = 9 }: { score: number; size?: number; thick?: number }) {
  const r = (size - thick * 2) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ - (Math.min(Math.max(score, 0), 100) / 100) * circ;
  const color = stScoreColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={ST.card} strokeWidth={thick} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={thick}
        strokeDasharray={circ} strokeDashoffset={fill} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${color}88)` }} />
    </svg>
  );
}

function STTickerTape({ pillars }: { pillars: STPillar[] }) {
  const items: { label: string; val: string; ok?: boolean }[] = [];
  const vix = stFindMetric(pillars, 'volat', 'vix');
  const fg = stFindMetric(pillars, 'volat', 'fear');
  const tnx = stFindMetric(pillars, 'macro', '10y');
  const dxy = stFindMetric(pillars, 'macro', 'dxy');
  const spyChg = stFindMetric(pillars, 'trend', 'spy chg');
  const qqqChg = stFindMetric(pillars, 'trend', 'qqq');
  const hyoas = stFindMetric(pillars, 'volat', 'oas');
  const spread = stFindMetric(pillars, 'macro', '2s10s');
  if (vix) items.push({ label: 'VIX', val: stParseVal(vix.value).main, ok: vix.ok });
  if (fg) items.push({ label: 'FEAR/GREED', val: stParseVal(fg.value).main, ok: fg.ok });
  if (tnx) items.push({ label: 'TNX', val: stParseVal(tnx.value).main, ok: tnx.ok });
  if (dxy) items.push({ label: 'DXY', val: stParseVal(dxy.value).main, ok: dxy.ok });
  if (spyChg) items.push({ label: 'SPY', val: stParseVal(spyChg.value).main, ok: spyChg.ok });
  if (qqqChg) items.push({ label: 'QQQ', val: stParseVal(qqqChg.value).main, ok: qqqChg.ok });
  if (hyoas) items.push({ label: 'HY OAS', val: stParseVal(hyoas.value).main, ok: hyoas.ok });
  if (spread) items.push({ label: '2s10s', val: stParseVal(spread.value).main, ok: spread.ok });
  for (const p of pillars) items.push({ label: p.title.split('/')[0].trim(), val: p.score.toFixed(0) + '/100' });
  const doubled = [...items, ...items, ...items];
  return (
    <div style={{ background: '#090d12', borderBottom: `1px solid ${ST.border}`, overflow: 'hidden', height: 28, display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', animation: 'ticker 60s linear infinite', whiteSpace: 'nowrap', willChange: 'transform' }}>
        {doubled.map((it, i) => {
          const valColor = it.ok === undefined ? ST.dim : it.ok ? ST.green : ST.red;
          return (
            <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '0 18px', fontFamily: 'monospace', fontSize: 11 }}>
              <span style={{ color: ST.dim }}>{it.label}</span>
              <span style={{ color: valColor, fontWeight: 600 }}>{it.val}</span>
              <span style={{ color: ST.dimLow, marginLeft: 4 }}>│</span>
            </span>
          );
        })}
      </div>
      <style>{`@keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-33.333%)} }`}</style>
    </div>
  );
}

function TradingTab() {
  const [stMode, setStMode] = useState<STMode>('swing');
  const [timeLeft, setTimeLeft] = useState(45);
  const qc = useQueryClient();
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['trading-dashboard', stMode],
    queryFn: () => stFetchDashboard(stMode),
    refetchInterval: 45000,
    staleTime: 30000,
    retry: 2,
  });
  const refresh = useMutation({
    mutationFn: () => stPostRefresh(stMode),
    onSuccess: (d) => { qc.setQueryData(['trading-dashboard', stMode], d); setTimeLeft(45); },
  });
  useEffect(() => {
    setTimeLeft(45);
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [dataUpdatedAt]);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: ST.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: ST.blue, letterSpacing: 3, fontSize: 12, marginBottom: 12 }}>LOADING MARKET DATA...</div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {[0,1,2].map(i => <div key={i} style={{ width:7,height:7,borderRadius:'50%',background:ST.blue,animation:`blink 1s ${i*0.3}s infinite` }}/>)}
        </div>
        <style>{`@keyframes blink{0%,100%{opacity:.15}50%{opacity:1}}`}</style>
      </div>
    </div>
  );
  if (isError || !data) return (
    <div style={{ minHeight: '100vh', background: ST.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: ST.red, fontSize: 12, marginBottom: 12 }}>⚠ BACKEND UNREACHABLE</div>
        <button onClick={() => refresh.mutate()} style={{ padding: '6px 18px', background: 'transparent', border: `1px solid ${ST.blue}`, color: ST.blue, fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}>↻ RETRY</button>
      </div>
    </div>
  );

  const d = data;
  const pillars = d.pillars ?? [];
  const execution_conditions = d.execution_conditions ?? [];
  const terminal_analysis = d.terminal_analysis ?? [];
  const mqs = d.market_quality_score;
  const ews = d.execution_window_score;
  const dc = stDecisionColor(d.decision);
  const pos = stPositionLabel(d.decision);
  const asOf = new Date(d.as_of);
  const secsAgo = Math.round((Date.now() - asOf.getTime()) / 1000);
  const agoLabel = secsAgo < 90 ? `${secsAgo}s ago` : secsAgo < 3600 ? `${Math.round(secsAgo/60)}m ago` : asOf.toLocaleTimeString();

  return (
    <div style={{ background: ST.bg, color: ST.text, fontFamily: '"SF Mono","Fira Code","Consolas",monospace', fontSize: 12, lineHeight: 1.5 }}>
      {/* ── TOP BAR ─────────────────────────────────── */}
      <div style={{ background: '#090d12', borderBottom: `1px solid ${ST.border}`, padding: '0 16px', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: ST.text, letterSpacing: 1 }}>SHOULD I BE TRADING?</span>
          <span style={{ color: ST.dimLow, fontSize: 10, letterSpacing: 2 }}>MARKET QUALITY TERMINAL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', border: `1px solid ${ST.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {(['swing','day'] as STMode[]).map(m => (
              <button key={m} onClick={() => setStMode(m)} style={{ padding: '4px 12px', background: stMode===m ? '#1f2937' : 'transparent', color: stMode===m ? ST.yellow : ST.dim, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: stMode===m ? 700 : 400 }}>
                {m}
              </button>
            ))}
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: d.from_cache ? ST.yellow : ST.green }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.from_cache ? ST.yellow : ST.green, display: 'inline-block', boxShadow: `0 0 6px ${d.from_cache ? ST.yellow : ST.green}` }} />
            {d.from_cache ? 'CACHED' : 'LIVE'}
          </span>
          <span style={{ color: ST.dimLow, fontSize: 10 }}>{agoLabel}</span>
          <button onClick={() => refresh.mutate()} disabled={refresh.isPending} style={{ background: 'transparent', border: 'none', color: ST.dim, cursor: 'pointer', fontSize: 13, padding: '2px 4px', opacity: refresh.isPending ? 0.4 : 1 }} title="Refresh">↻</button>
        </div>
      </div>

      {/* ── TICKER TAPE ─────────────────────────────── */}
      <STTickerTape pillars={pillars} />

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* ── HERO ROW ──────────────────────────────── */}
        <div style={{ background: ST.card, border: `1px solid ${ST.border}`, borderRadius: 6, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 0 }}>
          <div style={{ minWidth: 110, paddingRight: 18, borderRight: `1px solid ${ST.border}` }}>
            <div style={{ color: ST.dim, fontSize: 9, letterSpacing: 2, marginBottom: 6 }}>DECISION</div>
            <div style={{ width: 68, height: 52, border: `2px solid ${dc}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${dc}44`, background: `${dc}0d` }}>
              <span style={{ fontSize: 24, fontWeight: 900, color: dc, letterSpacing: 1 }}>{d.decision}</span>
            </div>
            <div style={{ color: ST.dimLow, fontSize: 9, marginTop: 5, textTransform: 'capitalize' }}>{d.mode} Trading</div>
          </div>
          <div style={{ padding: '0 20px', borderRight: `1px solid ${ST.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <STGauge score={mqs ?? 0} size={110} thick={8} />
              <div style={{ position: 'absolute', textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: stScoreColor(mqs ?? 0), lineHeight: 1 }}>{mqs != null ? mqs.toFixed(0) : '—'}</div>
                <div style={{ fontSize: 10, color: ST.dim, lineHeight: 1 }}>/ 100</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 0, padding: '0 10px' }}>
            {pillars.map((p, i) => {
              const color = stScoreColor(p.score);
              const barWidth = Math.min(p.score, 100);
              return (
                <div key={i} style={{ flex: 1, padding: '0 12px', borderRight: i < d.pillars.length - 1 ? `1px solid ${ST.border}` : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontSize: 14, color: ST.dim }}>{stPillarIcon(p.title)}</div>
                  <div style={{ fontSize: 8, color: ST.dim, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' }}>
                    {p.title.split('/')[0].trim().replace('MARKET ','').replace('MOMENTUM','MOM').replace('VOLATILITY','VOLAT')}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{(p.score ?? 0).toFixed(0)}</div>
                  <div style={{ width: '100%', height: 3, background: ST.bg, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${barWidth}%`, background: color, borderRadius: 2, boxShadow: `0 0 4px ${color}88`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ minWidth: 110, paddingLeft: 18, borderLeft: `1px solid ${ST.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ color: ST.dim, fontSize: 9, letterSpacing: 2 }}>POSITION SIZE</div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <STGauge score={mqs ?? 0} size={46} thick={4} />
              <span style={{ position: 'absolute', fontSize: 8, color: dc, fontWeight: 700 }}>●</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: dc }}>{pos.label}</div>
            <div style={{ fontSize: 9, color: ST.dimLow, textAlign: 'center' }}>{pos.sub}</div>
          </div>
        </div>

        {/* ── ALERT BANNER — populated entirely by backend ─ */}
        {d.alert.show && (
          <div style={{ background: '#1a140099', border: `1px solid ${ST.yellow}55`, borderRadius: 4, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: ST.yellow, fontSize: 13, flexShrink: 0 }}>⚠</span>
            <span style={{ color: ST.yellow, fontSize: 11, fontWeight: 800, letterSpacing: 1.2, flexShrink: 0, textTransform: 'uppercase' }}>{d.alert.title}</span>
            <span style={{ color: '#c8a840', fontSize: 11 }}>{d.alert.text}</span>
          </div>
        )}

        {/* ── 5 PILLAR CARDS ───────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {pillars.map((p, i) => {
            const color = stScoreColor(p.score);
            return (
              <div key={i} style={{ background: ST.card, border: `1px solid ${ST.border}`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px 6px', borderBottom: `1px solid ${ST.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11 }}>{stPillarIcon(p.title)}</span>
                      <span style={{ color: ST.dim, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        {p.title.split('/')[0].trim().replace('MARKET ','')}
                      </span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 900, color }}>{(p.score ?? 0).toFixed(0)}</span>
                  </div>
                  <div style={{ marginTop: 6, height: 3, background: ST.bg, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.min(p.score, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(p.metrics ?? []).map((m, j) => {
                    const { main, sub } = stParseVal(m.value);
                    const statusText = m.status ?? sub ?? '';
                    const sColor = statusText ? stStatusWordColor(statusText, m.ok) : (m.ok ? ST.green : ST.red);
                    return (
                      <div key={j} style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
                        <span style={{ color: ST.dimLow, fontSize: 10, flexShrink: 0 }}>●</span>
                        <span style={{ color: ST.dim, fontSize: 10, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{m.label}</span>
                        <span style={{ color: ST.text, fontSize: 10, fontWeight: 600, flexShrink: 0, marginLeft: 4, whiteSpace: 'nowrap' }}>{main}</span>
                        {statusText
                          ? <span style={{ color: sColor, fontSize: 9, flexShrink: 0, marginLeft: 3, whiteSpace: 'nowrap' }}>{statusText}</span>
                          : <span style={{ color: m.ok ? ST.green : ST.red, fontSize: 9, flexShrink: 0, marginLeft: 3 }}>{m.ok ? '↑' : '↓'}</span>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── BOTTOM ROW ────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr 240px', gap: 8 }}>
          {/* EXECUTION WINDOW */}
          <div style={{ background: ST.card, border: `1px solid ${ST.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${ST.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: ST.red, fontSize: 10 }}>◈</span>
                <span style={{ color: ST.dim, fontSize: 9, letterSpacing: 1.5 }}>EXECUTION WINDOW</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: stScoreColor(ews ?? 0) }}>{ews != null ? ews.toFixed(0) : '—'}</span>
            </div>
            <div style={{ height: 2, background: ST.bg }}>
              <div style={{ height: '100%', width: `${Math.min(ews ?? 0, 100)}%`, background: stScoreColor(ews ?? 0), transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {execution_conditions.map((ec, i) => {
                const okColor = ec.ok ? ST.green : ST.red;
                const statusColor = ec.status ? stStatusWordColor(ec.status, ec.ok) : okColor;
                const rawLabel = ec.label.includes('(') ? ec.label.split('(')[0].trim() : ec.label;
                const displayLabel = rawLabel
                  .replace(/\bvolatility acceptable\b/gi,'').replace(/\btrend intact\b/gi,'')
                  .replace(/\btoday\/tomorrow\b/gi,'').replace(/\bsectors positive\b/gi,'positive')
                  .replace(/\bbelow\b/gi,'below').trim();
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <span style={{ color: ST.dimLow, fontSize: 10, flexShrink: 0 }}>●</span>
                      <span style={{ color: ST.dim, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayLabel}</span>
                    </span>
                    <span style={{ color: ST.text, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {ec.value ?? (ec.ok ? 'Yes' : 'No')}
                    </span>
                    <span style={{ color: statusColor, fontSize: 9, fontStyle: 'italic', whiteSpace: 'nowrap', minWidth: 64, textAlign: 'right' }}>
                      {ec.status ?? (ec.ok ? 'PASS' : 'FAIL')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* MARKET METRICS */}
          {(() => {
            const allMetrics = pillars.flatMap(p => (p.metrics ?? []).map(m => ({ ...m })));
            const barItems = allMetrics.slice(0, 10);
            return (
              <div style={{ background: ST.card, border: `1px solid ${ST.border}`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${ST.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: ST.dim, fontSize: 10 }}>◎</span>
                    <span style={{ color: ST.dim, fontSize: 9, letterSpacing: 1.5 }}>MARKET METRICS</span>
                  </div>
                  <span style={{ color: ST.dimLow, fontSize: 9 }}>all pillars</span>
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {barItems.map((m, i) => {
                    const { main } = stParseVal(m.value);
                    const isScore = /^\d+\/100$/.test(main);
                    const numVal = isScore ? parseInt(main) : null;
                    const barPct = numVal !== null ? numVal : (m.ok ? 70 : 25);
                    const color = m.ok ? ST.green : ST.red;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: ST.dimLow, fontSize: 9, width: 68, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.label}</span>
                        <div style={{ flex: 1, height: 9, background: ST.bg, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ color, fontSize: 9, fontWeight: 600, width: 38, textAlign: 'right', flexShrink: 0 }}>{main}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* SECTOR PERFORMANCE */}
          {(() => {
            const sectors = d.sector_performance;
            const hasSectors = sectors && sectors.length > 0;
            const minPct = hasSectors ? Math.min(...sectors.map(s => s.change_pct)) : -3;
            const maxPct = hasSectors ? Math.max(...sectors.map(s => s.change_pct)) : 3;
            const absMax = Math.max(Math.abs(minPct), Math.abs(maxPct), 0.01);
            return (
              <div style={{ background: ST.card, border: `1px solid ${ST.border}`, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', borderBottom: `1px solid ${ST.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: ST.dim, fontSize: 10 }}>▤</span>
                    <span style={{ color: ST.dim, fontSize: 9, letterSpacing: 1.5 }}>SECTOR PERFORMANCE</span>
                  </div>
                  {!hasSectors && <span style={{ color: ST.dimLow, fontSize: 9 }}>awaiting data</span>}
                </div>
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {hasSectors ? sectors.map((s, i) => {
                    const isPos = s.change_pct >= 0;
                    const color = isPos ? ST.green : ST.red;
                    const barPct = (Math.abs(s.change_pct) / absMax) * 100;
                    const shortName = s.name.replace('Consumer ','Con ').replace('Communication','Communic.').replace('Real Estate','Real Est.').replace('Technology','Tech').replace('Industrials','Industrl').replace('Materials','Material').replace('Financials','Finance').replace('Health Care','Hlth Care');
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: ST.dimLow, fontSize: 9, width: 62, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortName}</span>
                        <div style={{ flex: 1, height: 9, background: ST.bg, borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: isPos ? 'flex-start' : 'flex-end' }}>
                          <div style={{ height: '100%', width: `${barPct}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                        </div>
                        <span style={{ color, fontSize: 9, fontWeight: 600, width: 42, textAlign: 'right', flexShrink: 0 }}>{isPos ? '+' : ''}{s.change_pct.toFixed(2)}%</span>
                      </div>
                    );
                  }) : pillars.map((p, i) => {
                    const color = stScoreColor(p.score);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: ST.dimLow, fontSize: 9, width: 62, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.title.split('/')[0].trim().replace('MARKET ','').replace('MOMENTUM','Mom').replace('VOLATILITY','Volat')}
                        </span>
                        <div style={{ flex: 1, height: 9, background: ST.bg, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(p.score,100)}%`, background: color, borderRadius: 2, opacity: 0.35 }} />
                        </div>
                        <span style={{ color: ST.dimLow, fontSize: 9, width: 42, textAlign: 'right', flexShrink: 0 }}>—</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* SCORING WEIGHTS */}
          <div style={{ background: ST.card, border: `1px solid ${ST.border}`, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${ST.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: ST.dim, fontSize: 10 }}>▦</span>
                <span style={{ color: ST.dim, fontSize: 9, letterSpacing: 1.5 }}>SCORING WEIGHTS</span>
              </div>
            </div>
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pillars.map((p, i) => {
                const color = stScoreColor(p.score);
                const shortTitle = p.title.split('/')[0].trim().replace('MARKET ','').replace('MOMENTUM','Momentum').replace('VOLATILITY','Volatility');
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: ST.dim, fontSize: 9, width: 64, flexShrink: 0 }}>{shortTitle}</span>
                    <div style={{ flex: 1, height: 10, background: ST.bg, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(p.score, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                    </div>
                    <span style={{ color, fontSize: 10, fontWeight: 700, width: 20, textAlign: 'right', flexShrink: 0 }}>{p.score.toFixed(0)}</span>
                    <span style={{ color: ST.dimLow, fontSize: 9, width: 28, textAlign: 'right', flexShrink: 0 }}>+{p.weight}%</span>
                  </div>
                );
              })}
              <div style={{ height: 1, background: ST.border, margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: ST.dim, fontSize: 10 }}>TOTAL SCORE</span>
                <span style={{ color: stScoreColor(mqs ?? 0), fontSize: 14, fontWeight: 900 }}>{mqs != null ? mqs.toFixed(0) : '—'}/100</span>
              </div>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {[
                  { dot: ST.green, text: '80–100: YES (press risk)' },
                  { dot: ST.yellow, text: '60–79: CAUTION (selective)' },
                  { dot: ST.red, text: '<60: NO (preserve capital)' },
                ].map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.dot, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ color: ST.dimLow, fontSize: 9 }}>{l.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── TERMINAL ANALYSIS ─────────────────────── */}
        <div style={{ background: ST.card, border: `1px solid ${ST.border}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${ST.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: ST.dim, fontSize: 10 }}>▶</span>
              <span style={{ color: ST.dim, fontSize: 9, letterSpacing: 1.5 }}>TERMINAL ANALYSIS</span>
              <span style={{ color: ST.dimLow, fontSize: 9, padding: '1px 6px', border: `1px solid ${ST.dimLow}44`, borderRadius: 2 }}>AI-generated market assessment</span>
            </div>
            <span style={{ color: ST.dimLow, fontSize: 9 }}>Updated {asOf.toLocaleString()}</span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            {terminal_analysis.map((line, i) => (
              <div key={i} style={{ fontFamily: 'inherit', fontSize: 11, lineHeight: 1.9, color: stTermColor(line.type), whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {line.text || '\u00A0'}
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ───────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 2px', color: ST.dimLow, fontSize: 9 }}>
          <span>Data: Live backend pipeline | Auto-refresh: 45s | Not financial advice</span>
          <span>Refresh in {timeLeft}s</span>
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab') as TabId | null;
    return t && TABS.some(tab => tab.id === t) ? t : 'overview';
  });
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
    overview:  <OverviewTab data={data} />,
    rates:     <RatesTab data={data} />,
    inflation: <InflationTab data={data} />,
    growth:    <GrowthTab data={data} />,
    labor:     <LaborTab data={data} />,
    sentiment: <RiskTab data={data} />,
    watch:     <WatchTab />,
    trade:     null,
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
          KEYS [1-8] TO NAVIGATE
        </div>
      </div>

      {/* Content */}
      {activeTab === 'trade' ? (
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <TradingTab />
        </div>
      ) : (
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
      )}
    </div>
  );
}
