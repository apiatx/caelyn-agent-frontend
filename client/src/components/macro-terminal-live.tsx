import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

// ─── Design tokens matching the original terminal ────────────────────────────
const T = {
  bg: 'hsl(220 20% 4%)',
  surface: 'hsl(220 20% 7%)',
  border: 'hsl(220 15% 14%)',
  green: 'hsl(142 70% 55%)',
  red: 'hsl(0 72% 55%)',
  amber: 'hsl(45 90% 55%)',
  cyan: 'hsl(185 70% 55%)',
  dim: 'hsl(220 10% 40%)',
};

// ─── Tab config ──────────────────────────────────────────────────────────────
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

// ─── Shared styles ───────────────────────────────────────────────────────────
const card = `border border-[${T.border}] rounded-lg p-4 bg-[${T.surface}]`;
const sectionTitle = 'text-xs font-bold tracking-wider uppercase mb-3';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    positive: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    neutral: 'text-white/60 bg-white/5 border-white/10',
    elevated: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    negative: 'text-red-400 bg-red-500/10 border-red-500/20',
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    inverted: 'text-red-400 bg-red-500/10 border-red-500/20',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors[status] || colors.neutral}`}>
      {status.toUpperCase()}
    </span>
  );
}

function IndicatorCard({ name, value, status }: { name: string; value: string; status: string }) {
  return (
    <div className={`border border-[hsl(220_15%_14%)] rounded-lg p-3 bg-[hsl(220_20%_7%)] hover:border-[hsl(220_15%_20%)] transition-colors`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-white/40 uppercase tracking-wide">{name}</span>
        <StatusBadge status={status} />
      </div>
      <div className="text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(220_20%_10%)] border border-[hsl(220_15%_20%)] rounded px-3 py-2 text-xs">
      <div className="text-white/60 mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-white">
          <span style={{ color: p.color }}>{p.name}: </span>
          {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── TAB 1: OVERVIEW ─────────────────────────────────────────────────────────
function OverviewTab({ data }: { data: any }) {
  if (!data) return null;

  const etfNames: Record<string, string> = {
    SPY: 'S&P 500', QQQ: 'Nasdaq 100', TLT: '20+ Yr Treasury',
    GLD: 'Gold', USO: 'Crude Oil', HYG: 'High Yield Corp',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold tracking-wider text-white uppercase">
          $ MARKET SNAPSHOT
        </h2>
        <p className="text-[10px] text-white/30 mt-1">
          — Live benchmark ETFs, VIX, yield snapshot
        </p>
      </div>

      {/* ETF Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.benchmark_etfs?.map((etf: any) => {
          const up = etf.change_pct >= 0;
          return (
            <div key={etf.ticker} className="border border-[hsl(220_15%_14%)] rounded-lg p-3 bg-[hsl(220_20%_7%)] hover:border-[hsl(220_15%_20%)] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-white/90 tracking-wide">{etf.ticker}</span>
                <span className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {up ? '+' : ''}{etf.change_pct?.toFixed(2)}%
                </span>
              </div>
              <div className="text-base font-semibold text-white mb-1">${etf.price?.toFixed(2)}</div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30">{etfNames[etf.ticker] || etf.ticker}</span>
                <span className={`text-[10px] ${etf.pct_from_52w_high >= -5 ? 'text-white/40' : 'text-amber-400/70'}`}>
                  {etf.pct_from_52w_high?.toFixed(1)}% from 52WH
                </span>
              </div>
            </div>
          );
        })}

        {/* VIX Card */}
        {data.vix && (() => {
          const v = data.vix;
          const level = v.current >= 30 ? 'high' : v.current >= 20 ? 'elevated' : 'low';
          const lc = level === 'high' ? 'text-red-400 border-red-500/20 bg-red-500/5'
            : level === 'elevated' ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
              : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
          const down = v.change_pct < 0;
          return (
            <div className={`border rounded-lg p-3 transition-colors ${lc}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold tracking-wide">VIX</span>
                <span className={`flex items-center gap-1 text-xs font-medium ${down ? 'text-emerald-400' : 'text-red-400'}`}>
                  {down ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                  {v.change_pct >= 0 ? '+' : ''}{v.change_pct?.toFixed(2)}%
                </span>
              </div>
              <div className="text-base font-semibold mb-1">{v.current?.toFixed(2)}</div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] opacity-60">Volatility Index</span>
                <span className="text-[10px] opacity-60 capitalize">{level}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Yield Snapshot */}
      {data.yield_snapshot && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.cyan }}>$ YIELD SNAPSHOT</h3>
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(data.yield_snapshot).map(([mat, val]: [string, any]) => (
              <div key={mat} className="text-center">
                <div className="text-[10px] text-white/40 uppercase mb-1">{mat}</div>
                <div className="text-sm font-semibold text-white">{val ? `${val.toFixed(2)}%` : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Indicator Cards */}
      {data.indicators && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.indicators.map((ind: any) => (
            <IndicatorCard key={ind.name} {...ind} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TAB 2: RATES ────────────────────────────────────────────────────────────
function RatesTab({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: T.cyan }}>
          $ RATES & YIELD CURVE
        </h2>
        <p className="text-[10px] text-white/30 mt-1">— Treasury yields, spreads, Fed policy</p>
      </div>

      {/* Yield Curve Chart */}
      {data.yield_curve?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.cyan }}>YIELD CURVE</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.yield_curve}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                <XAxis dataKey="maturity" tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="yield" stroke={T.cyan} strokeWidth={2} dot={{ fill: T.cyan, r: 3 }} name="Current" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Yield Table */}
      {data.yield_curve?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.cyan }}>YIELD CURVE SNAPSHOT</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 border-b border-[hsl(220_15%_14%)]">
                <th className="text-left py-2">Maturity</th>
                <th className="text-right py-2">Current</th>
                <th className="text-right py-2">Change</th>
                <th className="text-right py-2">Prior Close</th>
              </tr>
            </thead>
            <tbody>
              {data.yield_curve.map((y: any) => (
                <tr key={y.maturity} className="border-b border-[hsl(220_15%_14%)]/50">
                  <td className="py-2 text-white/70 font-medium">{y.maturity}</td>
                  <td className="py-2 text-right text-white font-semibold">{y.yield ? y.yield.toFixed(2) + '%' : '—'}</td>
                  <td className={`py-2 text-right font-medium ${y.change > 0 ? 'text-red-400' : y.change < 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                    {y.change ? (y.change > 0 ? '+' : '') + y.change.toFixed(2) : '—'}
                  </td>
                  <td className="py-2 text-right text-white/40">{y.previousClose ? y.previousClose.toFixed(2) + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Spreads */}
      {data.spreads && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.cyan }}>KEY SPREADS</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-white/40 mb-1">2s10s Spread</div>
              <div className={`text-lg font-bold ${data.spreads['2s10s'] < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {data.spreads['2s10s'] >= 0 ? '+' : ''}{(data.spreads['2s10s'] * 100).toFixed(0)} bps
              </div>
              {data.spreads['2s10s'] < 0 && <div className="text-[10px] text-red-400/70 mt-1">INVERTED</div>}
            </div>
            <div>
              <div className="text-[10px] text-white/40 mb-1">10Y-3M Spread</div>
              <div className={`text-lg font-bold ${data.spreads['10y3m'] < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {data.spreads['10y3m'] >= 0 ? '+' : ''}{(data.spreads['10y3m'] * 100).toFixed(0)} bps
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicator Cards */}
      {data.indicators && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: T.amber }}>
          $ INFLATION
        </h2>
        <p className="text-[10px] text-white/30 mt-1">— CPI, PCE, component breakdown, trends</p>
      </div>

      {/* Headline Numbers */}
      {data.headline && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: 'CPI YoY', val: data.headline.cpi_yoy },
            { label: 'Core CPI', val: data.headline.core_cpi_yoy },
            { label: 'Core PCE', val: data.headline.core_pce_yoy },
            { label: 'PPI YoY', val: data.headline.ppi_yoy },
            { label: 'CPI MoM', val: data.headline.cpi_mom },
            { label: 'Target', val: data.headline.target },
          ].map(({ label, val }) => (
            <div key={label} className="border border-[hsl(220_15%_14%)] rounded-lg p-3 bg-[hsl(220_20%_7%)] text-center">
              <div className="text-[10px] text-white/40 uppercase mb-1">{label}</div>
              <div className={`text-sm font-bold ${val > data.headline.target ? 'text-amber-400' : 'text-emerald-400'}`}>
                {val}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inflation History Chart */}
      {data.history?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.amber }}>INFLATION TREND</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} domain={[1.5, 4]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="headline" stroke={T.amber} strokeWidth={2} dot={false} name="Headline" />
                <Line type="monotone" dataKey="core" stroke={T.red} strokeWidth={2} dot={false} name="Core" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ background: T.amber }} /> Headline</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ background: T.red }} /> Core</span>
          </div>
        </div>
      )}

      {/* CPI Components */}
      {data.cpi_components?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.amber }}>CPI COMPONENT BREAKDOWN (YoY %)</h3>
          <div className="space-y-2">
            {data.cpi_components.map((c: any) => {
              const maxVal = Math.max(...data.cpi_components.map((x: any) => Math.abs(x.value)));
              const pct = Math.abs(c.value) / maxVal * 100;
              return (
                <div key={c.name} className="flex items-center gap-3">
                  <span className="text-xs text-white/60 w-40 shrink-0 text-right">{c.name}</span>
                  <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden relative">
                    <div
                      className={`h-full rounded ${c.hot ? 'bg-amber-500/60' : c.value < 0 ? 'bg-emerald-500/40' : 'bg-white/20'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium w-14 text-right ${c.hot ? 'text-amber-400' : c.value < 0 ? 'text-emerald-400' : 'text-white/60'}`}>
                    {c.value > 0 ? '+' : ''}{c.value}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicator Cards */}
      {data.indicators && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: T.green }}>
          $ GROWTH & ACTIVITY
        </h2>
        <p className="text-[10px] text-white/30 mt-1">— GDP, ISM, PMI, economic activity</p>
      </div>

      {/* GDP Chart */}
      {data.gdp?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.green }}>REAL GDP GROWTH (QoQ SAAR %)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.gdp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                <XAxis dataKey="quarter" tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
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

      {/* PMI Chart */}
      {data.pmi?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.green }}>MANUFACTURING vs SERVICES PMI</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.pmi}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} domain={[44, 60]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="mfg" stroke={T.amber} strokeWidth={2} dot={{ r: 2 }} name="Manufacturing" />
                <Line type="monotone" dataKey="svc" stroke={T.cyan} strokeWidth={2} dot={{ r: 2 }} name="Services" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ background: T.amber }} /> Manufacturing</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ background: T.cyan }} /> Services</span>
          </div>
          {/* 50 threshold line note */}
          <div className="text-[10px] text-white/30 mt-1">— Readings above 50 indicate expansion</div>
        </div>
      )}

      {/* Indicator Cards */}
      {data.indicators && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: T.red }}>
          $ LABOR MARKET
        </h2>
        <p className="text-[10px] text-white/30 mt-1">— Employment, payrolls, wages, participation</p>
      </div>

      {/* Unemployment Rate */}
      {data.unemployment?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.red }}>UNEMPLOYMENT RATE (%)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.unemployment}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} domain={[3.8, 4.8]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="rate" stroke={T.red} strokeWidth={2} dot={{ r: 2 }} name="U-3 Rate" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* NFP */}
      {data.nfp?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.red }}>NON-FARM PAYROLLS (K)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.nfp}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="nfp" name="NFP (K)">
                  {data.nfp.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.nfp >= 100 ? T.green : entry.nfp >= 0 ? T.amber : T.red} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-white/30 mt-1">— Declining payroll trend signals labor market deterioration</div>
        </div>
      )}

      {/* Indicator Cards */}
      {data.indicators && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
    red: 'text-red-400 border-red-500/30 bg-red-500/10',
    amber: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    green: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold tracking-wider uppercase" style={{ color: T.red }}>
          $ SENTIMENT & RISK
        </h2>
        <p className="text-[10px] text-white/30 mt-1">— VIX, Consumer, Gold, Credit, Geopolitical</p>
      </div>

      {/* Risk Framework Grid */}
      {data.risk_framework?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.red }}>DRUCKENMILLER RISK FRAMEWORK</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {data.risk_framework.map((r: any) => (
              <div key={r.label} className={`border rounded-lg p-3 text-center ${levelColors[r.color] || levelColors.green}`}>
                <div className="text-[10px] uppercase tracking-wide opacity-80 mb-1">{r.label}</div>
                <div className="text-sm font-bold mb-1">{r.level}</div>
                <div className="text-[9px] opacity-60">{r.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIX History */}
      {data.vix_history?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.amber }}>VIX HISTORY</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.vix_history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} domain={[10, 45]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="vix" stroke={T.amber} strokeWidth={2} dot={{ r: 2 }} name="VIX" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Consumer Confidence */}
      {data.confidence?.length > 0 && (
        <div className="border border-[hsl(220_15%_14%)] rounded-lg p-4 bg-[hsl(220_20%_7%)]">
          <h3 className={sectionTitle} style={{ color: T.cyan }}>CONSUMER CONFIDENCE & SENTIMENT</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.confidence}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 14%)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} />
                <YAxis tick={{ fill: 'hsl(220 10% 40%)', fontSize: 10 }} domain={[50, 105]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="conf" stroke={T.cyan} strokeWidth={2} dot={false} name="Conference Board" />
                <Line type="monotone" dataKey="umich" stroke={T.amber} strokeWidth={2} dot={false} name="UMich" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ background: T.cyan }} /> Conference Board</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ background: T.amber }} /> UMich</span>
          </div>
        </div>
      )}

      {/* Indicator Cards */}
      {data.indicators && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {data.indicators.map((ind: any) => (
            <IndicatorCard key={ind.name} {...ind} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN MACRO TERMINAL COMPONENT ───────────────────────────────────────────
export function MacroTerminalLive() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Keyboard shortcuts (1-6)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < TABS.length) {
      setActiveTab(TABS[idx].id);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const { data, isLoading, error, dataUpdatedAt } = useQuery({
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

  return (
    <div className="w-full min-h-screen" style={{ background: T.bg, color: 'white', fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace" }}>
      {/* Tab Bar */}
      <div className="border-b" style={{ borderColor: T.border }}>
        <div className="flex items-center px-4 py-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-xs font-bold tracking-wider whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-white border-emerald-400'
                  : 'text-white/40 border-transparent hover:text-white/60'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[9px] text-white/20">[{tab.shortcut}]</span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-[10px] text-white/20 pr-2">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Loading...'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {isLoading && !data && (
          <div className="space-y-4 animate-pulse">
            <div className="h-6 bg-white/5 rounded w-64" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-white/5 rounded-lg" />
              ))}
            </div>
            <div className="h-64 bg-white/5 rounded-lg" />
          </div>
        )}
        {error && !data && (
          <div className="text-center py-12 text-white/40">
            <div className="text-sm mb-2">Failed to load {activeTab} data</div>
            <div className="text-xs">Check your connection and try again</div>
          </div>
        )}
        {data && tabComponents[activeTab]}
      </div>
    </div>
  );
}
