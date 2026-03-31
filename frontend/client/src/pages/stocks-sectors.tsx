import { useState, useMemo, useEffect, useRef, memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, ExternalLink, BarChart3, RefreshCw,
  ChevronUp, ChevronDown, ChevronsUpDown, Bot, AlertTriangle,
  Eye, EyeOff, Clock, Layers, Info, ArrowRight,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SectorSeries {
  "1d":  { t: number; v: number }[];
  "7d":  { t: number; v: number }[];
  "30d": { t: number; v: number }[];
  "ytd": { t: number; v: number }[];
  "1y":  { t: number; v: number }[];
}
interface SectorRow {
  ticker:         string;
  name:           string;
  price:          number | null;
  change_1d:      number | null;
  change_7d:      number | null;
  change_30d:     number | null;
  change_ytd:     number | null;
  change_1y:      number | null;
  momentum_score: number | null;
  regime_tag:     "Leading" | "Improving" | "Weakening" | "Lagging" | null;
  series?:        SectorSeries;
}
interface Regime {
  market_regime:    string | null;
  macro_regime:     string | null;
  leadership_style: string | null;
}
interface Scenario {
  name:        string;
  probability: string;
  impact:      string;
}
interface Source {
  title: string;
  url:   string;
}
interface Analysis {
  summary:            string | null;
  current_leadership: string | null;
  weakening_areas:    string | null;
  outlook_1_4_weeks:  string | null;
  outlook_1_3_months: string | null;
  scenarios:          Scenario[];
  watch_items:        string[];
  sources:            Source[];
}
interface DashboardData {
  updated_at:          string | null;
  analysis_updated_at: string | null;
  regime:              Regime;
  sectors:             SectorRow[];
  leaders:             string[];
  laggards:            string[];
  analysis:            Analysis;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTORS: { ticker: string; name: string; color: string }[] = [
  { ticker: "XLC",  name: "Communication Services", color: "#a855f7" },
  { ticker: "XLY",  name: "Consumer Discretionary",  color: "#f59e0b" },
  { ticker: "XLP",  name: "Consumer Staples",         color: "#06b6d4" },
  { ticker: "XLE",  name: "Energy",                   color: "#fbbf24" },
  { ticker: "XLF",  name: "Financials",               color: "#3b82f6" },
  { ticker: "XLV",  name: "Health Care",              color: "#22c55e" },
  { ticker: "XLI",  name: "Industrials",              color: "#0ea5e9" },
  { ticker: "XLB",  name: "Materials",                color: "#f97316" },
  { ticker: "XLRE", name: "Real Estate",              color: "#ec4899" },
  { ticker: "XLK",  name: "Technology",               color: "#8b5cf6" },
  { ticker: "XLU",  name: "Utilities",                color: "#64748b" },
];
const SECTOR_COLOR = Object.fromEntries(SECTORS.map(s => [s.ticker, s.color]));
const SECTOR_NAME  = Object.fromEntries(SECTORS.map(s => [s.ticker, s.name]));
const TF_OPTIONS = ["1d", "7d", "30d", "ytd", "1y"] as const;
type Timeframe = typeof TF_OPTIONS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPct = (v: number | null, digits = 2): string =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
const fmtPx  = (v: number | null): string =>
  v == null ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTs  = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const pctColor = (v: number | null, cls = false): string => {
  if (v == null) return cls ? "text-gray-500" : "#64748b";
  if (v >= 0)   return cls ? "text-emerald-400" : "#22c55e";
  return              cls ? "text-red-400"     : "#ef4444";
};
const TAG_STYLES: Record<string, string> = {
  Leading:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Improving: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Weakening: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Lagging:   "bg-red-500/20 text-red-400 border-red-500/30",
};
const REGIME_STYLES: Record<string, string> = {
  "Risk-On":      "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Neutral":      "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "Risk-Off":     "bg-red-500/20 text-red-300 border-red-500/30",
  "Inflationary": "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Disinflationary":"bg-sky-500/20 text-sky-300 border-sky-500/30",
  "Mixed":        "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Cyclicals":    "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Defensives":   "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "Balanced":     "bg-gray-500/20 text-gray-300 border-gray-500/30",
};
const regimeBadge = (label: string | null) => {
  if (!label) return null;
  const s = Object.keys(REGIME_STYLES).find(k => label.toLowerCase().includes(k.toLowerCase()));
  return s ? REGIME_STYLES[s] : "bg-gray-500/20 text-gray-300 border-gray-500/30";
};

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (!values || values.length < 2) return <span className="text-gray-600 text-xs">—</span>;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const W = 56, H = 18;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
  return (
    <svg width={W} height={H} className="inline-block">
      <polyline points={pts} fill="none" stroke={positive ? "#22c55e" : "#ef4444"} strokeWidth="1.5" />
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 16, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <div className={`animate-pulse bg-white/[0.05] rounded ${className}`} style={{ width: w, height: h }} />;
}

// ─── GlassCard (preserved from original) ─────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`bg-black/40 backdrop-blur-lg border-white/[0.06] ${className}`}>
      {children}
    </Card>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, badge, right, color = "teal" }: {
  icon: any; title: string; badge?: string; right?: React.ReactNode; color?: string;
}) {
  const gradMap: Record<string, string> = {
    teal:   "from-teal-500 to-cyan-500",
    purple: "from-purple-500 to-pink-500",
    blue:   "from-blue-500 to-indigo-500",
    amber:  "from-amber-500 to-orange-500",
    green:  "from-green-500 to-emerald-500",
  };
  return (
    <div className="flex items-center justify-between mb-5 gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-6 h-6 bg-gradient-to-r ${gradMap[color] ?? gradMap.teal} rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {badge && <Badge className="bg-white/10 text-gray-300 border-white/10 text-xs">{badge}</Badge>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

// ─── A: Regime Summary Header ─────────────────────────────────────────────────
function RegimeSummaryHeader({ data }: { data: DashboardData | undefined; }) {
  const regime = data?.regime;
  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Sector Rotation</h1>
          </div>
          <p className="text-sm text-gray-400 max-w-xl">
            Real-time sector leadership, macro regime, and forward-looking rotation analysis
          </p>
          {data && (
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
              {data.updated_at && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Market data: {fmtTs(data.updated_at)}
                </span>
              )}
              {data.analysis_updated_at && (
                <span className="flex items-center gap-1">
                  <Bot className="w-3 h-3" /> AI outlook: {fmtTs(data.analysis_updated_at)}
                </span>
              )}
            </div>
          )}
          {!data && (
            <div className="flex gap-3 mt-3">
              <Skel w={140} h={14} /><Skel w={160} h={14} />
            </div>
          )}
        </div>
        {/* Regime badges */}
        <div className="flex flex-wrap gap-2">
          {!data ? (
            <><Skel w={80} h={24} className="rounded-full" /><Skel w={100} h={24} className="rounded-full" /><Skel w={80} h={24} className="rounded-full" /></>
          ) : regime ? (
            <>
              {regime.market_regime    && <Badge className={`border text-xs ${regimeBadge(regime.market_regime)}`}>{regime.market_regime}</Badge>}
              {regime.macro_regime     && <Badge className={`border text-xs ${regimeBadge(regime.macro_regime)}`}>{regime.macro_regime}</Badge>}
              {regime.leadership_style && <Badge className={`border text-xs ${regimeBadge(regime.leadership_style)}`}>{regime.leadership_style} Leadership</Badge>}
            </>
          ) : (
            <span className="text-xs text-gray-600">Regime data unavailable</span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── B: Sector Performance Table ──────────────────────────────────────────────
type SortKey = "ticker" | "price" | "change_1d" | "change_7d" | "change_30d" | "change_ytd" | "change_1y" | "momentum_score";
function SectorPerformanceTable({
  sectors, loading, selectedTickers, onSelectTicker,
}: {
  sectors: SectorRow[]; loading: boolean; selectedTickers: Set<string>; onSelectTicker: (t: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("change_1d");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [tf, setTf] = useState<Timeframe>("7d");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const av = a[sortKey] as number | null;
      const bv = b[sortKey] as number | null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [sectors, sortKey, sortDir]);

  const Th = ({ label, k }: { label: string; k?: SortKey }) => (
    <th
      onClick={k ? () => handleSort(k) : undefined}
      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${k ? "cursor-pointer select-none hover:text-gray-300 transition-colors" : ""}`}>
      <div className="flex items-center gap-1">
        {label}
        {k && (
          sortKey === k
            ? sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-teal-400" /> : <ChevronDown className="w-3 h-3 text-teal-400" />
            : <ChevronsUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  const pctKey = (row: SectorRow): number | null => {
    if (tf === "1d")  return row.change_1d;
    if (tf === "7d")  return row.change_7d;
    if (tf === "30d") return row.change_30d;
    if (tf === "ytd") return row.change_ytd;
    return row.change_1y;
  };

  if (loading) {
    return (
      <GlassCard className="p-4 sm:p-6 overflow-hidden">
        <SectionHeader icon={BarChart3} title="Sector Performance" />
        <div className="space-y-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skel w={50} h={14} /><Skel w={120} h={14} /><Skel w={60} h={14} /><Skel w={60} h={14} /><Skel w={60} h={14} /><Skel w={60} h={14} /><Skel w={50} h={14} />
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 sm:p-6 overflow-hidden">
      <SectionHeader icon={BarChart3} title="Sector Performance" badge="SPDR ETFs"
        right={
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {TF_OPTIONS.map(t => (
              <button key={t} onClick={() => setTf(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${tf === t ? "bg-teal-500 text-white" : "text-gray-400 hover:text-white"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <Th label="Ticker"   k="ticker" />
              <Th label="Sector"   />
              <Th label="Price"    k="price" />
              <Th label="1D"       k="change_1d" />
              <Th label="7D"       k="change_7d" />
              <Th label="30D"      k="change_30d" />
              <Th label="YTD"      k="change_ytd" />
              <Th label="1Y"       k="change_1y" />
              <Th label="Momentum" k="momentum_score" />
              <Th label="Trend"    />
              <Th label="Status"   />
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const sel     = selectedTickers.has(row.ticker);
              const color   = SECTOR_COLOR[row.ticker] ?? "#64748b";
              const tagCls  = row.regime_tag ? (TAG_STYLES[row.regime_tag] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30") : "";
              const spkVals = row.series ? (row.series[tf] ?? []).map(p => p.v) : [];
              const spkPos  = (pctKey(row) ?? 0) >= 0;
              return (
                <tr key={row.ticker}
                  onClick={() => onSelectTicker(row.ticker)}
                  className={`border-b border-white/[0.03] cursor-pointer transition-colors ${sel ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="font-mono font-bold text-white text-sm">{row.ticker}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[140px] truncate">{row.name}</td>
                  <td className="px-3 py-2.5 text-sm font-mono text-white tabular-nums">{fmtPx(row.price)}</td>
                  <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctColor(row.change_1d, true)}`}>{fmtPct(row.change_1d)}</td>
                  <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctColor(row.change_7d, true)}`}>{fmtPct(row.change_7d)}</td>
                  <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctColor(row.change_30d, true)}`}>{fmtPct(row.change_30d)}</td>
                  <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctColor(row.change_ytd, true)}`}>{fmtPct(row.change_ytd)}</td>
                  <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctColor(row.change_1y, true)}`}>{fmtPct(row.change_1y)}</td>
                  <td className="px-3 py-2.5">
                    {row.momentum_score != null ? (
                      <div className="flex items-center gap-2 min-w-[70px]">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(row.momentum_score * 100).toFixed(0)}%`, background: color }} />
                        </div>
                        <span className="text-xs text-gray-400 tabular-nums">{(row.momentum_score * 100).toFixed(0)}</span>
                      </div>
                    ) : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <Sparkline values={spkVals} positive={spkPos} />
                  </td>
                  <td className="px-3 py-2.5">
                    {row.regime_tag
                      ? <Badge className={`border text-[10px] px-1.5 py-0 ${tagCls}`}>{row.regime_tag}</Badge>
                      : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-500 text-sm">No sector data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ─── C: Relative Strength Chart ───────────────────────────────────────────────
function SectorRotationChart({
  sectors, leaders, laggards, loading,
  selectedTickers, onToggleTicker,
}: {
  sectors: SectorRow[]; leaders: string[]; laggards: string[]; loading: boolean;
  selectedTickers: Set<string>; onToggleTicker: (t: string) => void;
}) {
  const [tf, setTf] = useState<Timeframe>("7d");

  // Build chart data: normalize all sectors so they start at 0%
  const chartData = useMemo(() => {
    const seriesMap: Record<string, { t: number; v: number }[]> = {};
    for (const row of sectors) {
      if (!row.series || !row.series[tf]) continue;
      seriesMap[row.ticker] = row.series[tf];
    }
    const tickers = Object.keys(seriesMap);
    if (!tickers.length) return [];
    // Get the union of all timestamps
    const allTs = [...new Set(tickers.flatMap(t => seriesMap[t].map(p => p.t)))].sort((a, b) => a - b);
    // For each ticker, find base value
    const base: Record<string, number> = {};
    for (const t of tickers) {
      const pts = seriesMap[t];
      base[t] = pts[0]?.v ?? 1;
    }
    return allTs.map(ts => {
      const point: Record<string, number | string> = {
        t: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
      for (const t of tickers) {
        const pt = seriesMap[t].find(p => p.t === ts);
        if (pt && base[t]) point[t] = +((pt.v / base[t] - 1) * 100).toFixed(3);
      }
      return point;
    });
  }, [sectors, tf]);

  const displayedTickers = useMemo(
    () => SECTORS.map(s => s.ticker).filter(t => selectedTickers.has(t)),
    [selectedTickers],
  );

  if (loading) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <SectionHeader icon={TrendingUp} title="Relative Strength" color="blue" />
        <Skel h={200} />
      </GlassCard>
    );
  }

  const topLeaders  = leaders.slice(0, 3);
  const topLaggards = laggards.slice(0, 3);

  return (
    <GlassCard className="p-4 sm:p-6">
      <SectionHeader icon={TrendingUp} title="Relative Strength" badge="Normalised to start" color="blue"
        right={
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {TF_OPTIONS.map(t => (
              <button key={t} onClick={() => setTf(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${tf === t ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />
      {/* Leaders / Laggards summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <div className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Top Leaders</div>
          {topLeaders.length ? topLeaders.map(t => (
            <div key={t} className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: SECTOR_COLOR[t] }} />
              <span className="text-xs font-mono font-bold text-white">{t}</span>
              <span className="text-xs text-gray-400">{SECTOR_NAME[t]}</span>
            </div>
          )) : <span className="text-xs text-gray-600">—</span>}
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <div className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Bottom Laggards</div>
          {topLaggards.length ? topLaggards.map(t => (
            <div key={t} className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: SECTOR_COLOR[t] }} />
              <span className="text-xs font-mono font-bold text-white">{t}</span>
              <span className="text-xs text-gray-400">{SECTOR_NAME[t]}</span>
            </div>
          )) : <span className="text-xs text-gray-600">—</span>}
        </div>
      </div>
      {/* Sector toggles */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SECTORS.map(s => {
          const on = selectedTickers.has(s.ticker);
          return (
            <button key={s.ticker} onClick={() => onToggleTicker(s.ticker)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium border transition-all ${on ? "text-white border-transparent" : "text-gray-600 border-white/10 bg-transparent"}`}
              style={on ? { background: `${s.color}30`, borderColor: `${s.color}60` } : {}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? s.color : "#374151" }} />
              {s.ticker}
            </button>
          );
        })}
      </div>
      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} tickFormatter={v => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} />
              <Tooltip
                contentStyle={{ background: "#0d1623", border: "1px solid #1a2540", borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(v: any, name: string) => [`${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`, name]}
              />
              {displayedTickers.map(t => (
                <Line key={t} type="monotone" dataKey={t} dot={false} strokeWidth={1.5}
                  stroke={SECTOR_COLOR[t] ?? "#64748b"} strokeOpacity={0.9} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-56 flex items-center justify-center text-gray-600 text-sm">
          No series data — backend should return <code className="mx-1 text-xs text-gray-500">series["{tf}"]</code> per sector
        </div>
      )}
    </GlassCard>
  );
}

// ─── D: Sector Heatmap Cards ──────────────────────────────────────────────────
function SectorHeatmapCards({
  sectors, tf, loading, selectedTickers, onSelectTicker,
}: {
  sectors: SectorRow[]; tf: Timeframe; loading: boolean;
  selectedTickers: Set<string>; onSelectTicker: (t: string) => void;
}) {
  const pctByTf = (row: SectorRow) => {
    if (tf === "1d")  return row.change_1d;
    if (tf === "7d")  return row.change_7d;
    if (tf === "30d") return row.change_30d;
    if (tf === "ytd") return row.change_ytd;
    return row.change_1y;
  };

  const sorted = useMemo(
    () => [...sectors].sort((a, b) => (pctByTf(b) ?? -999) - (pctByTf(a) ?? -999)),
    [sectors, tf],
  );

  if (loading) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <SectionHeader icon={Layers} title="Sector Snapshot" color="amber" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 11 }).map((_, i) => <Skel key={i} h={80} />)}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 sm:p-6">
      <SectionHeader icon={Layers} title="Sector Snapshot" color="amber" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {sorted.map((row, idx) => {
          const val    = pctByTf(row);
          const color  = SECTOR_COLOR[row.ticker] ?? "#64748b";
          const tagCls = row.regime_tag ? (TAG_STYLES[row.regime_tag] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30") : "";
          const sel    = selectedTickers.has(row.ticker);
          return (
            <div key={row.ticker} onClick={() => onSelectTicker(row.ticker)}
              className={`relative rounded-xl p-3 border cursor-pointer transition-all ${sel ? "border-white/20 scale-[1.02]" : "border-white/[0.06] hover:border-white/15 hover:scale-[1.01]"}`}
              style={{ background: sel ? `${color}12` : "rgba(255,255,255,0.03)" }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-mono font-bold text-white text-sm">{row.ticker}</div>
                  <div className="text-[10px] text-gray-500 leading-tight mt-0.5 max-w-[80px] truncate">{row.name}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] text-gray-600">#{idx + 1}</span>
                  {row.regime_tag && <Badge className={`border text-[9px] px-1 py-0 leading-3 ${tagCls}`}>{row.regime_tag}</Badge>}
                </div>
              </div>
              <div className={`text-lg font-bold font-mono tabular-nums ${pctColor(val, true)}`}>{fmtPct(val, 1)}</div>
              {row.momentum_score != null && (
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(row.momentum_score * 100).toFixed(0)}%`, background: color }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── E: Agent Analysis Panel ──────────────────────────────────────────────────
function SectorAnalysisPanel({ analysis, analysisTs, loading, error }: {
  analysis: Analysis | undefined; analysisTs: string | null; loading: boolean; error: boolean;
}) {
  const [openScenario, setOpenScenario] = useState<number | null>(null);

  if (loading) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <SectionHeader icon={Bot} title="Agent Analysis" color="purple" />
        <div className="space-y-3">
          <Skel h={14} w="60%" /><Skel h={48} /><Skel h={14} w="50%" /><Skel h={36} /><Skel h={14} w="70%" /><Skel h={60} />
        </div>
      </GlassCard>
    );
  }
  if (error || !analysis) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <SectionHeader icon={Bot} title="Agent Analysis" color="purple" />
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
          <p className="text-sm text-gray-400 mb-2">Agent analysis unavailable</p>
          <p className="text-xs text-gray-600">Check backend endpoint <code className="bg-white/5 px-1 rounded">/api/sector-rotation/analysis</code></p>
        </div>
      </GlassCard>
    );
  }

  const Block = ({ label, icon: Icon, text, color = "text-teal-400" }: { label: string; icon: any; text: string | null; color?: string }) => {
    if (!text) return null;
    return (
      <div className="mb-5">
        <div className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2 ${color}`}>
          <Icon className="w-3.5 h-3.5" />{label}
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
      </div>
    );
  };

  const PROB_COLORS: Record<string, string> = {
    high:   "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  return (
    <GlassCard className="p-4 sm:p-6">
      <SectionHeader icon={Bot} title="Agent Analysis" color="purple"
        right={
          <div className="flex items-center gap-2">
            {analysisTs && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtTs(analysisTs)}</span>}
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">Updated Weekly</Badge>
          </div>
        }
      />
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <Block label="Regime Summary"     icon={Info}         text={analysis.summary}            color="text-teal-400" />
          <Block label="Current Leadership" icon={TrendingUp}   text={analysis.current_leadership} color="text-emerald-400" />
          <Block label="Weakening Areas"    icon={TrendingDown} text={analysis.weakening_areas}    color="text-red-400" />
        </div>
        <div>
          <Block label="1–4 Week Outlook"   icon={ArrowRight}   text={analysis.outlook_1_4_weeks}  color="text-blue-400" />
          <Block label="1–3 Month Outlook"  icon={ArrowRight}   text={analysis.outlook_1_3_months} color="text-purple-400" />
        </div>
      </div>

      {/* Scenarios */}
      {analysis.scenarios?.length > 0 && (
        <div className="mt-4 mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />Scenario Analysis
          </div>
          <div className="space-y-2">
            {analysis.scenarios.map((s, i) => {
              const probCls = PROB_COLORS[s.probability?.toLowerCase()] ?? PROB_COLORS.medium;
              return (
                <div key={i} className="border border-white/[0.06] rounded-lg overflow-hidden">
                  <button onClick={() => setOpenScenario(openScenario === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{s.name}</span>
                      <Badge className={`border text-[10px] px-1.5 py-0 ${probCls}`}>{s.probability}</Badge>
                    </div>
                    {openScenario === i ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                  </button>
                  {openScenario === i && (
                    <div className="px-3 pb-3 text-sm text-gray-400 leading-relaxed border-t border-white/[0.04]">
                      <div className="pt-2">{s.impact}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Watch items */}
      {analysis.watch_items?.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />Policy / Macro Watch
          </div>
          <ul className="space-y-1.5">
            {analysis.watch_items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>{item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources */}
      {analysis.sources?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Sources</div>
          <div className="flex flex-wrap gap-2">
            {analysis.sources.map((src, i) => (
              <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors">
                <ExternalLink className="w-3 h-3" />{src.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── TradingView ETF Heatmap (preserved from original) ───────────────────────
const ETFHeatmapWidget = memo(function ETFHeatmapWidget() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-etf-heatmap.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      dataSource: "AllUSEtf",
      blockSize: "Value.Traded|1W",
      blockColor: "change",
      grouping: "asset_class",
      locale: "en",
      symbolUrl: "",
      colorTheme: "dark",
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: "100%",
      height: "100%",
    });
    container.current.appendChild(script);
  }, []);
  return (
    <div className="tradingview-widget-container" ref={container}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StocksSectorsPage() {
  const openInNewTab = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

  // Track selected sectors (for chart + table cross-highlight)
  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(
    new Set(SECTORS.map(s => s.ticker)),
  );
  const [heatmapTf, setHeatmapTf] = useState<Timeframe>("7d");

  const toggleTicker = useCallback((t: string) => {
    setSelectedTickers(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  }, []);
  const selectTicker = useCallback((t: string) => {
    setSelectedTickers(prev => {
      const next = new Set(prev);
      next.add(t);
      return next;
    });
  }, []);

  // ── Data: dashboard (market data, sectors, regime) ──
  const {
    data: dashData, isLoading: dashLoading, isError: dashError, refetch: refetchDash, dataUpdatedAt,
  } = useQuery<DashboardData>({
    queryKey: ["sector-rotation-dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/sector-rotation/dashboard");
      if (!r.ok) throw new Error(`Server ${r.status}`);
      return r.json();
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
    retry: 2,
  });

  // ── Data: AI analysis (weekly, slow poll) ──
  const {
    data: analysisData, isLoading: analysisLoading, isError: analysisError,
  } = useQuery<{ analysis: Analysis; updated_at: string }>({
    queryKey: ["sector-rotation-analysis"],
    queryFn: async () => {
      const r = await fetch("/api/sector-rotation/analysis");
      if (!r.ok) throw new Error(`Server ${r.status}`);
      return r.json();
    },
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Prefer inline analysis from dashboard, fall back to dedicated endpoint
  const analysis      = dashData?.analysis ?? analysisData?.analysis;
  const analysisTs    = dashData?.analysis_updated_at ?? analysisData?.updated_at ?? null;
  const sectors       = dashData?.sectors ?? [];
  const hasApiData    = !!dashData;

  return (
    <div className="min-h-screen text-white" style={{ background: "#050608" }}>
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4 space-y-4 lg:space-y-6">

        {/* ── A: Regime Summary Header ── */}
        <RegimeSummaryHeader data={dashData} />

        {/* Error state for market data */}
        {dashError && !dashData && (
          <GlassCard className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-300">Could not load sector market data</p>
                <p className="text-xs text-gray-500 mt-0.5">Backend endpoint <code className="bg-white/5 px-1 rounded">/api/sector-rotation/dashboard</code> may not be available yet</p>
              </div>
              <button onClick={() => refetchDash()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </GlassCard>
        )}

        {/* ── B: Sector Performance Table ── */}
        <SectorPerformanceTable
          sectors={sectors} loading={dashLoading && !dashData}
          selectedTickers={selectedTickers} onSelectTicker={selectTicker}
        />

        {/* ── C+D: Chart + Heatmap side by side on large screens ── */}
        <div className="grid xl:grid-cols-3 gap-4 lg:gap-6">
          <div className="xl:col-span-2">
            <SectorRotationChart
              sectors={sectors} leaders={dashData?.leaders ?? []} laggards={dashData?.laggards ?? []}
              loading={dashLoading && !dashData} selectedTickers={selectedTickers} onToggleTicker={toggleTicker}
            />
          </div>
          <div className="xl:col-span-1">
            <GlassCard className="p-4 sm:p-6 h-full">
              <SectionHeader icon={Layers} title="Snapshot" color="amber"
                right={
                  <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                    {(["1d","7d","30d"] as Timeframe[]).map(t => (
                      <button key={t} onClick={() => setHeatmapTf(t)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${heatmapTf === t ? "bg-amber-500 text-white" : "text-gray-400 hover:text-white"}`}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                }
              />
              {dashLoading && !dashData
                ? <div className="grid grid-cols-2 gap-2">{Array.from({length:11}).map((_,i)=><Skel key={i} h={60} />)}</div>
                : (
                  <div className="grid grid-cols-2 gap-2">
                    {[...sectors]
                      .sort((a,b)=>{
                        const va=heatmapTf==="1d"?a.change_1d:heatmapTf==="7d"?a.change_7d:a.change_30d;
                        const vb=heatmapTf==="1d"?b.change_1d:heatmapTf==="7d"?b.change_7d:b.change_30d;
                        return (vb??-999)-(va??-999);
                      })
                      .map(row => {
                        const val   = heatmapTf==="1d"?row.change_1d:heatmapTf==="7d"?row.change_7d:row.change_30d;
                        const color = SECTOR_COLOR[row.ticker] ?? "#64748b";
                        const sel   = selectedTickers.has(row.ticker);
                        return (
                          <div key={row.ticker} onClick={() => selectTicker(row.ticker)}
                            className={`rounded-lg p-2 border cursor-pointer transition-all text-center ${sel?"border-white/20":"border-white/[0.04] hover:border-white/10"}`}
                            style={{ background: `${color}${sel?"18":"0c"}` }}>
                            <div className="font-mono font-bold text-white text-xs">{row.ticker}</div>
                            <div className={`text-sm font-bold font-mono tabular-nums mt-0.5 ${pctColor(val,true)}`}>{fmtPct(val,1)}</div>
                          </div>
                        );
                      })
                    }
                  </div>
                )
              }
            </GlassCard>
          </div>
        </div>

        {/* ── E: Agent Analysis ── */}
        <SectorAnalysisPanel
          analysis={analysis}
          analysisTs={analysisTs}
          loading={(analysisLoading && !analysisData) && (dashLoading && !dashData)}
          error={analysisError && !analysis}
        />

        {/* ── EXISTING CONTENT PRESERVED ─────────────────────────────── */}
        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">ETF Heatmap</h3>
              <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">ALL US ETFs</Badge>
            </div>
          </div>
          <div className="w-full h-[600px] sm:h-[700px] rounded-lg overflow-hidden border border-white/[0.06]">
            <ETFHeatmapWidget />
          </div>
        </GlassCard>

        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white">Stage Analysis Screener</h3>
              <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-white/[0.06] text-xs">SECTORS & FUNDS</Badge>
            </div>
            <button onClick={() => openInNewTab("https://screener.nextbigtrade.com/#/markets")}
              className="text-purple-400 hover:text-purple-300 text-xs sm:text-sm flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Open Full View
            </button>
          </div>
          <div className="w-full space-y-6">
            <iframe
              src="https://screener.nextbigtrade.com/#/markets"
              className="w-full h-[600px] rounded-lg border border-white/[0.06]"
              title="Next Big Trade Sectors Screener"
              loading="eager"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
              allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation"
              frameBorder="0"
            />
            <button onClick={() => openInNewTab("https://www.vaneck.com/us/en/investments/social-sentiment-etf-buzz/overview/")}
              className="w-full bg-gradient-to-br from-amber-500/10 to-yellow-600/10 hover:from-amber-500/20 hover:to-yellow-600/20 border border-amber-500/20 hover:border-amber-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
              <div className="text-sm font-medium text-white group-hover:text-amber-300 mb-1">BUZZ Social Sentiment ETF</div>
              <div className="text-xs text-crypto-silver">VanEck social sentiment ETF overview and performance</div>
            </button>
            <button onClick={() => openInNewTab("https://www.ssga.com/us/en/institutional/resources/sector-tracker#currentTab=dayOne&fundTicker=xle")}
              className="w-full bg-gradient-to-br from-yellow-500/10 to-amber-600/10 hover:from-yellow-500/20 hover:to-amber-600/20 border border-yellow-500/20 hover:border-yellow-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
              <div className="text-sm font-medium text-white group-hover:text-yellow-300 mb-1">SPDR Sector Tracker</div>
              <div className="text-xs text-crypto-silver">State Street sector performance and ETF analysis</div>
            </button>
            <button onClick={() => openInNewTab("https://www.slickcharts.com/")}
              className="w-full bg-gradient-to-br from-blue-500/10 to-cyan-600/10 hover:from-blue-500/20 hover:to-cyan-600/20 border border-blue-500/20 hover:border-blue-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
              <div className="text-sm font-medium text-white group-hover:text-blue-300 mb-1">SlickCharts Indices</div>
              <div className="text-xs text-crypto-silver">Stock market indices and data</div>
            </button>
            <button onClick={() => openInNewTab("https://www.etf.com/")}
              className="w-full bg-gradient-to-br from-green-500/10 to-emerald-600/10 hover:from-green-500/20 hover:to-emerald-600/20 border border-green-500/20 hover:border-green-400/40 rounded-lg p-4 transition-all duration-300 text-left group">
              <div className="text-sm font-medium text-white group-hover:text-green-300 mb-1">ETF.com</div>
              <div className="text-xs text-crypto-silver">ETF research, news and analysis</div>
            </button>
          </div>
        </GlassCard>

      </main>
    </div>
  );
}
