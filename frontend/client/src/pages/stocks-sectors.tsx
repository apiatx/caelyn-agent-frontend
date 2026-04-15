import React, { useState, useMemo, useEffect, useRef, memo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, ExternalLink, BarChart3, RefreshCw,
  ChevronUp, ChevronDown, ChevronsUpDown, Bot, AlertTriangle,
  Eye, Clock, Layers, Info, ArrowRight, Zap, Activity,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types — exact backend shapes ────────────────────────────────────────────
interface SectorSeries {
  dates:  string[];
  prices: number[];
}
interface SectorSeriesMap {
  "1d":  SectorSeries;
  "7d":  SectorSeries;
  "30d": SectorSeries;
  "ytd": SectorSeries;
  "1y":  SectorSeries;
}
interface SectorRow {
  ticker:                string;
  name:                  string;
  price:                 number | null;
  change_1d:             number | null;
  change_7d:             number | null;
  change_30d:            number | null;
  change_ytd:            number | null;
  change_1y:             number | null;
  rotation_score:        number | null;
  relative_strength_rank:number | null;
  regime_tag:            "Leading" | "Improving" | "Weakening" | "Lagging" | null;
  is_cyclical:           boolean | null;
  ma_50d:                number | null;
  ma_200d:               number | null;
  pct_from_50d:          number | null;
  pct_from_200d:         number | null;
  series?:               SectorSeriesMap;
}
interface MacroOverlay {
  fed_rate:           number | null;
  cpi_yoy:            number | null;
  yield_10y:          number | null;
  yield_2y:           number | null;
  yield_curve_spread: number | null;
  spy_change_30d:     number | null;
}
interface Regime {
  market_posture:         string | null;
  cyclical_vs_defensive:  number | null;
  breadth_pct_above_spy:  number | null;
  leadership_style:       string | null;
  macro_overlay:          MacroOverlay | null;
}
interface Scenario {
  name:           string;
  timeframe?:     string;
  probability:    string;
  sector_winners?: string[];
  sector_losers?:  string[];
  analysis:       string;
}
interface Source {
  title:      string;
  url:        string;
  publisher?: string;
}
interface CurrentLeadership {
  leaders:     string[];
  laggards:    string[];
  explanation: string;
}
interface Analysis {
  market_regime?:     string | null;
  macro_regime?:      string | null;
  leadership_style?:  string | null;
  summary:            string | null;
  current_leadership: CurrentLeadership | null;
  outlook_1_4_weeks:  string | null;
  outlook_1_3_months: string | null;
  scenarios:          Scenario[];
  watch_items:        string[];
  sources:            Source[];
  generated_at?:      string | null;
}
interface DashboardData {
  updated_at:          string | null;
  analysis_updated_at: string | null;
  regime:              Regime;
  sectors:             SectorRow[];
  leaders:             SectorRow[];
  laggards:            SectorRow[];
  analysis:            Analysis | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SECTORS: { ticker: string; name: string; color: string }[] = [
  { ticker: "XLC",  name: "Comm. Services",    color: "#a855f7" },
  { ticker: "XLY",  name: "Consumer Disc.",     color: "#f59e0b" },
  { ticker: "XLP",  name: "Consumer Staples",   color: "#06b6d4" },
  { ticker: "XLE",  name: "Energy",             color: "#fbbf24" },
  { ticker: "XLF",  name: "Financials",         color: "#3b82f6" },
  { ticker: "XLV",  name: "Health Care",        color: "#22c55e" },
  { ticker: "XLI",  name: "Industrials",        color: "#0ea5e9" },
  { ticker: "XLB",  name: "Materials",          color: "#f97316" },
  { ticker: "XLRE", name: "Real Estate",        color: "#ec4899" },
  { ticker: "XLK",  name: "Technology",         color: "#8b5cf6" },
  { ticker: "XLU",  name: "Utilities",          color: "#64748b" },
];
const SECTOR_COLOR = Object.fromEntries(SECTORS.map(s => [s.ticker, s.color]));
const SECTOR_NAME  = Object.fromEntries(SECTORS.map(s => [s.ticker, s.name]));
const TF_OPTIONS   = ["1d", "7d", "30d", "ytd", "1y"] as const;
type Timeframe = typeof TF_OPTIONS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPct = (v: number | null, digits = 2): string =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
const fmtPx  = (v: number | null): string =>
  v == null ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTs  = (s: string | null): string => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const pctCls = (v: number | null) =>
  v == null ? "text-gray-500" : v >= 0 ? "text-emerald-400" : "text-red-400";

const TAG_STYLES: Record<string, string> = {
  Leading:   "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Improving: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Weakening: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Lagging:   "bg-red-500/20 text-red-400 border-red-500/30",
};
const REGIME_BADGE: Record<string, string> = {
  "risk-on":       "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "neutral":       "bg-amber-500/20 text-amber-300 border-amber-500/30",
  "risk-off":      "bg-red-500/20 text-red-300 border-red-500/30",
  "inflationary":  "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "disinflationary":"bg-sky-500/20 text-sky-300 border-sky-500/30",
  "mixed":         "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "value":         "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "cyclicals":     "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "transitioning": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "defensives":    "bg-teal-500/20 text-teal-300 border-teal-500/30",
  "balanced":      "bg-gray-500/20 text-gray-300 border-gray-500/30",
};
const regimeCls = (v: string | null) => {
  if (!v) return "bg-gray-500/20 text-gray-300 border-gray-500/30";
  const k = Object.keys(REGIME_BADGE).find(k => v.toLowerCase().includes(k));
  return k ? REGIME_BADGE[k] : "bg-gray-500/20 text-gray-300 border-gray-500/30";
};

// Convert backend series { dates, prices } to recharts-friendly normalized points
function buildChartData(sectors: SectorRow[], tf: Timeframe) {
  const seriesMap: Record<string, { date: string; price: number }[]> = {};
  for (const row of sectors) {
    const s = row.series?.[tf];
    if (!s || !s.dates?.length || !s.prices?.length) continue;
    seriesMap[row.ticker] = s.dates.map((d, i) => ({ date: d, price: s.prices[i] ?? 0 }));
  }
  const tickers = Object.keys(seriesMap);
  if (!tickers.length) return [];
  const allDates = [...new Set(tickers.flatMap(t => seriesMap[t].map(p => p.date)))].sort();
  const base: Record<string, number> = {};
  for (const t of tickers) base[t] = seriesMap[t][0]?.price || 1;

  return allDates.map(date => {
    const pt: Record<string, any> = { date: date.slice(5) }; // "MM-DD"
    for (const t of tickers) {
      const found = seriesMap[t].find(p => p.date === date);
      if (found && base[t]) pt[t] = +((found.price / base[t] - 1) * 100).toFixed(3);
    }
    return pt;
  });
}

// Mini sparkline from prices array
function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }) {
  if (!prices || prices.length < 2) return <span className="text-gray-600 text-xs">—</span>;
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const W = 56, H = 18;
  const pts = prices.map((v, i) => `${(i / (prices.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
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

// ─── Shared primitives ────────────────────────────────────────────────────────
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`bg-black/40 backdrop-blur-lg border-white/[0.06] ${className}`}>
      {children}
    </Card>
  );
}
function SectionHeader({ icon: Icon, title, badge, right, color = "teal" }: {
  icon: any; title: string; badge?: string; right?: React.ReactNode; color?: string;
}) {
  const grad: Record<string, string> = {
    teal: "from-teal-500 to-cyan-500", purple: "from-purple-500 to-pink-500",
    blue: "from-blue-500 to-indigo-500", amber: "from-amber-500 to-orange-500",
    green: "from-green-500 to-emerald-500",
  };
  return (
    <div className="flex items-center justify-between mb-5 gap-3">
      <div className="flex items-center gap-2.5">
        <div className={`w-6 h-6 bg-gradient-to-r ${grad[color] ?? grad.teal} rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {badge && <Badge className="bg-white/10 text-gray-300 border-white/10 text-xs">{badge}</Badge>}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap">{right}</div>}
    </div>
  );
}

// ─── A: Regime Summary Header ─────────────────────────────────────────────────
function RegimeSummaryHeader({ data, loading }: { data: DashboardData | undefined; loading: boolean }) {
  const regime = data?.regime;
  const macro  = regime?.macro_overlay;
  return (
    <GlassCard className="p-4 sm:p-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white">Sector Rotation</h1>
            {data?.updated_at && (
              <span className="flex items-center gap-1 text-xs text-gray-500 ml-1">
                <Clock className="w-3 h-3" /> Market: {fmtTs(data.updated_at)}
              </span>
            )}
            {loading && <Skel w={120} h={14} />}
          </div>
          <p className="text-sm text-gray-400 max-w-xl">
            Real-time sector leadership, macro regime, and forward-looking rotation analysis
          </p>
          {data?.analysis_updated_at && (
            <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> AI: {data.analysis_updated_at}</span>
            </div>
          )}
        </div>
        {/* Regime badges + macro pills */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {loading ? (
              <><Skel w={80} h={24} className="rounded-full" /><Skel w={100} h={24} className="rounded-full" /><Skel w={80} h={24} className="rounded-full" /></>
            ) : regime ? (
              <>
                {regime.market_posture   && <Badge className={`border text-xs ${regimeCls(regime.market_posture)}`}>{regime.market_posture}</Badge>}
                {regime.leadership_style && <Badge className={`border text-xs ${regimeCls(regime.leadership_style)}`}>{regime.leadership_style} Leadership</Badge>}
                {regime.breadth_pct_above_spy != null && (
                  <Badge className="border text-xs bg-white/5 text-gray-300 border-white/10">
                    {regime.breadth_pct_above_spy.toFixed(1)}% above SPY
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-xs text-gray-600">Regime data unavailable</span>
            )}
          </div>
          {/* Macro overlay pills */}
          {macro && (
            <div className="flex flex-wrap gap-2">
              {macro.fed_rate      != null && <span className="text-[10px] bg-white/5 border border-white/[0.06] rounded px-2 py-0.5 text-gray-400">Fed {macro.fed_rate.toFixed(2)}%</span>}
              {macro.cpi_yoy      != null && <span className="text-[10px] bg-white/5 border border-white/[0.06] rounded px-2 py-0.5 text-gray-400">CPI {macro.cpi_yoy.toFixed(2)}%</span>}
              {macro.yield_10y    != null && <span className="text-[10px] bg-white/5 border border-white/[0.06] rounded px-2 py-0.5 text-gray-400">10Y {macro.yield_10y.toFixed(2)}%</span>}
              {macro.yield_curve_spread != null && (
                <span className={`text-[10px] border rounded px-2 py-0.5 ${macro.yield_curve_spread >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                  Curve {macro.yield_curve_spread >= 0 ? "+" : ""}{macro.yield_curve_spread.toFixed(2)}%
                </span>
              )}
              {macro.spy_change_30d != null && (
                <span className={`text-[10px] border rounded px-2 py-0.5 ${macro.spy_change_30d >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                  SPY 30D {fmtPct(macro.spy_change_30d, 2)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

// ─── TradingView per-ticker chart (loads on demand) ──────────────────────────
const TVTickerChart = memo(function TVTickerChart({ ticker }: { ticker: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: false,
      width: "100%",
      height: 550,
      symbol: `AMEX:${ticker}`,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    ref.current.appendChild(script);
    return () => { if (ref.current) ref.current.innerHTML = ""; };
  }, [ticker]);
  return (
    <div ref={ref} className="tradingview-widget-container w-full" style={{ height: 550 }}>
      <div className="tradingview-widget-container__widget" style={{ height: 550, width: "100%" }} />
    </div>
  );
});

// ─── B: Sector Performance Table ──────────────────────────────────────────────
type SortKey = "ticker" | "price" | "change_1d" | "change_7d" | "change_30d" | "change_ytd" | "change_1y" | "rotation_score";

function SectorPerformanceTable({
  sectors, loading, selectedTickers, onSelectTicker,
}: {
  sectors: SectorRow[]; loading: boolean;
  selectedTickers: Set<string>; onSelectTicker: (t: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rotation_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const toggleExpand = (ticker: string) => {
    setExpandedTicker(prev => prev === ticker ? null : ticker);
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    return [...sectors].sort((a, b) => {
      const av = a[sortKey] as number | string | null;
      const bv = b[sortKey] as number | string | null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string" && typeof bv === "string")
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [sectors, sortKey, sortDir]);

  const Th = ({ label, k }: { label: string; k?: SortKey }) => (
    <th onClick={k ? () => handleSort(k) : undefined}
      className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${k ? "cursor-pointer select-none hover:text-gray-300 transition-colors" : ""}`}>
      <div className="flex items-center gap-1">
        {label}
        {k && (sortKey === k
          ? sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-teal-400" /> : <ChevronDown className="w-3 h-3 text-teal-400" />
          : <ChevronsUpDown className="w-3 h-3 opacity-30" />)}
      </div>
    </th>
  );

  if (loading) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <SectionHeader icon={BarChart3} title="Sector Performance" />
        <div className="space-y-2">{Array.from({ length: 11 }).map((_, i) => (
          <div key={i} className="flex gap-3"><Skel w={50} h={14} /><Skel w={120} h={14} /><Skel w={60} h={14} /><Skel w={60} h={14} /><Skel w={60} h={14} /></div>
        ))}</div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4 sm:p-6 overflow-hidden">
      <SectionHeader icon={BarChart3} title="Sector Performance" badge="SPDR ETFs" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <Th label="Rank" /><Th label="Ticker" k="ticker" /><Th label="Sector" />
              <Th label="Price" k="price" /><Th label="1D" k="change_1d" />
              <Th label="7D" k="change_7d" /><Th label="30D" k="change_30d" />
              <Th label="YTD" k="change_ytd" /><Th label="1Y" k="change_1y" />
              <Th label="Score" k="rotation_score" /><Th label="Trend" /><Th label="Status" />
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const sel       = selectedTickers.has(row.ticker);
              const expanded  = expandedTicker === row.ticker;
              const color     = SECTOR_COLOR[row.ticker] ?? "#64748b";
              const tagCls    = row.regime_tag ? (TAG_STYLES[row.regime_tag] ?? "") : "";
              const spkPrices = row.series?.["7d"]?.prices ?? [];
              const spkPos    = (row.change_7d ?? 0) >= 0;
              return (
                <React.Fragment key={row.ticker}>
                  <tr onClick={() => { onSelectTicker(row.ticker); toggleExpand(row.ticker); }}
                    className={`border-b border-white/[0.03] cursor-pointer transition-colors ${expanded ? "bg-white/[0.08]" : sel ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`}>
                    <td className="px-3 py-2.5">
                      {row.relative_strength_rank != null
                        ? <span className="text-xs text-gray-500 font-mono">#{row.relative_strength_rank}</span>
                        : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="font-mono font-bold text-white text-sm">{row.ticker}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[130px] truncate">{row.name}</td>
                    <td className="px-3 py-2.5 text-sm font-mono text-white tabular-nums">{fmtPx(row.price)}</td>
                    <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_1d)}`}>{fmtPct(row.change_1d)}</td>
                    <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_7d)}`}>{fmtPct(row.change_7d)}</td>
                    <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_30d)}`}>{fmtPct(row.change_30d)}</td>
                    <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_ytd)}`}>{fmtPct(row.change_ytd)}</td>
                    <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_1y)}`}>{fmtPct(row.change_1y)}</td>
                    <td className="px-3 py-2.5">
                      {row.rotation_score != null ? (
                        <div className="flex items-center gap-2 min-w-[72px]">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${row.rotation_score}%`, background: color }} />
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums">{row.rotation_score.toFixed(0)}</span>
                        </div>
                      ) : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5"><Sparkline prices={spkPrices} positive={spkPos} /></td>
                    <td className="px-3 py-2.5">
                      {row.regime_tag
                        ? <Badge className={`border text-[10px] px-1.5 py-0 ${tagCls}`}>{row.regime_tag}</Badge>
                        : <span className="text-gray-600 text-xs">—</span>}
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${row.ticker}-chart`} className="bg-black/30">
                      <td colSpan={12} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-xs font-mono font-bold text-white">{row.ticker}</span>
                          <span className="text-xs text-gray-500">{row.name}</span>
                        </div>
                        <TVTickerChart ticker={row.ticker} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {sorted.length === 0 && (
              <tr><td colSpan={12} className="px-3 py-8 text-center text-gray-500 text-sm">No sector data available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}

// ─── C: Relative Strength Chart ───────────────────────────────────────────────
function SectorRotationChart({
  sectors, leaders, laggards, loading, selectedTickers, onToggleTicker,
}: {
  sectors: SectorRow[]; leaders: SectorRow[]; laggards: SectorRow[]; loading: boolean;
  selectedTickers: Set<string>; onToggleTicker: (t: string) => void;
}) {
  const [tf, setTf] = useState<Timeframe>("7d");

  const chartData = useMemo(() => buildChartData(sectors, tf), [sectors, tf]);

  const displayedTickers = useMemo(
    () => SECTORS.map(s => s.ticker).filter(t => selectedTickers.has(t)),
    [selectedTickers],
  );

  if (loading) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <SectionHeader icon={TrendingUp} title="Relative Strength" color="blue" />
        <Skel h={220} />
      </GlassCard>
    );
  }

  const topLeaders  = leaders.slice(0, 3);
  const topLaggards = laggards.slice(0, 3);

  return (
    <GlassCard className="p-4 sm:p-6 h-full flex flex-col">
      <SectionHeader icon={TrendingUp} title="Relative Strength" badge="Normalised" color="blue"
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
      {/* Leaders / Laggards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <div className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Top Leaders</div>
          {topLeaders.length ? topLeaders.map(r => (
            <div key={r.ticker} className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: SECTOR_COLOR[r.ticker] }} />
              <span className="text-xs font-mono font-bold text-white">{r.ticker}</span>
              <span className={`text-xs ml-auto ${pctCls(r.change_7d)}`}>{fmtPct(r.change_7d, 1)}</span>
            </div>
          )) : <span className="text-xs text-gray-600">—</span>}
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <div className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1"><TrendingDown className="w-3 h-3" />Bottom Laggards</div>
          {topLaggards.length ? topLaggards.map(r => (
            <div key={r.ticker} className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: SECTOR_COLOR[r.ticker] }} />
              <span className="text-xs font-mono font-bold text-white">{r.ticker}</span>
              <span className={`text-xs ml-auto ${pctCls(r.change_7d)}`}>{fmtPct(r.change_7d, 1)}</span>
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
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium border transition-all ${on ? "text-white border-transparent" : "text-gray-600 border-white/10"}`}
              style={on ? { background: `${s.color}30`, borderColor: `${s.color}60` } : {}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: on ? s.color : "#374151" }} />
              {s.ticker}
            </button>
          );
        })}
      </div>
      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="flex-1 min-h-[208px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false}
                tickFormatter={v => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%`} />
              <Tooltip contentStyle={{ background: "#0d1623", border: "1px solid #1a2540", borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: "#94a3b8" }}
                itemSorter={(item: any) => -(item.value ?? 0)}
                formatter={(v: any, name: string) => [`${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(2)}%`, name]} />
              {displayedTickers.map(t => (
                <Line key={t} type="monotone" dataKey={t} dot={false} strokeWidth={1.5}
                  stroke={SECTOR_COLOR[t] ?? "#64748b"} strokeOpacity={0.9} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 min-h-[208px] flex items-center justify-center text-gray-600 text-sm">
          Series data not yet available for {tf.toUpperCase()} timeframe
        </div>
      )}
    </GlassCard>
  );
}

// ─── D: Compact heatmap side panel ───────────────────────────────────────────
const TAG_ORDER: Record<string, number> = { Leading: 0, Improving: 1, Weakening: 2, Lagging: 3 };

function SectorSnapshotPanel({ sectors, loading, selectedTickers, onSelectTicker }: {
  sectors: SectorRow[]; loading: boolean;
  selectedTickers: Set<string>; onSelectTicker: (t: string) => void;
}) {
  const [tf, setTf] = useState<Timeframe>("7d");
  const pctByTf = (row: SectorRow) =>
    tf === "1d" ? row.change_1d : tf === "7d" ? row.change_7d : tf === "30d" ? row.change_30d : tf === "ytd" ? row.change_ytd : row.change_1y;

  const sorted = useMemo(() =>
    [...sectors].sort((a, b) => {
      const ao = TAG_ORDER[a.regime_tag ?? ""] ?? 4;
      const bo = TAG_ORDER[b.regime_tag ?? ""] ?? 4;
      return ao - bo;
    }),
    [sectors],
  );

  const tagColor = (tag: string | null) => {
    if (tag === "Leading")   return "#22c55e";
    if (tag === "Improving") return "#0ea5e9";
    if (tag === "Weakening") return "#f59e0b";
    if (tag === "Lagging")   return "#ef4444";
    return "#64748b";
  };

  const cols = sorted.length || 11;

  return (
    <GlassCard className="p-3 sm:p-4">
      <SectionHeader icon={Layers} title="Snapshot" color="amber"
        right={
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {(["1d","7d","30d"] as Timeframe[]).map(t => (
              <button key={t} onClick={() => setTf(t)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${tf === t ? "bg-amber-500 text-white" : "text-gray-400 hover:text-white"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />
      {loading ? (
        <div className="flex gap-1.5">
          {Array.from({length: 11}).map((_, i) => <Skel key={i} h={40} className="flex-1" />)}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: "6px" }}>
          {sorted.map(row => {
            const val   = pctByTf(row);
            const color = SECTOR_COLOR[row.ticker] ?? "#64748b";
            const sel   = selectedTickers.has(row.ticker);
            return (
              <div key={row.ticker} onClick={() => onSelectTicker(row.ticker)}
                className={`rounded-lg cursor-pointer transition-all border ${sel ? "border-white/20 scale-[1.02]" : "border-white/[0.04] hover:border-white/10"}`}
                style={{ background: `${color}${sel ? "18" : "0c"}`, padding: "5px 7px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 3, flexWrap: "nowrap" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#fff", fontSize: 10, whiteSpace: "nowrap" }}>{row.ticker}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 10, whiteSpace: "nowrap", color: val != null ? (val >= 0 ? "#22c55e" : "#ef4444") : "#64748b" }}>
                    {fmtPct(val, 1)}
                  </span>
                </div>
                {row.regime_tag && (
                  <div style={{ fontSize: 9, fontWeight: 600, color: tagColor(row.regime_tag), marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row.regime_tag}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

// ─── E: Agent Analysis Panel ──────────────────────────────────────────────────
function SectorAnalysisPanel({ analysis, analysisTs, loading, isNull, onRefresh, refreshing }: {
  analysis: Analysis | null | undefined;
  analysisTs: string | null;
  loading: boolean;
  isNull: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [openScenario, setOpenScenario] = useState<number | null>(null);

  const RefreshBtn = () => (
    <button onClick={onRefresh} disabled={refreshing}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-xs text-purple-300 transition-colors disabled:opacity-50">
      <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
      {refreshing ? "Generating (~30s)…" : "Generate Analysis"}
    </button>
  );

  if (loading) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <SectionHeader icon={Bot} title="Agent Analysis" color="purple" />
        <div className="space-y-3"><Skel h={14} w="60%" /><Skel h={48} /><Skel h={14} w="50%" /><Skel h={36} /></div>
      </GlassCard>
    );
  }

  if (isNull || !analysis) {
    return (
      <GlassCard className="p-4 sm:p-6">
        <SectionHeader icon={Bot} title="Agent Analysis" color="purple"
          right={<RefreshBtn />}
        />
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Bot className="w-10 h-10 text-purple-400/40 mb-3" />
          <p className="text-sm text-gray-400 mb-1">No analysis generated yet</p>
          <p className="text-xs text-gray-600 mb-4">Click "Generate Analysis" to run the weekly AI outlook (takes ~30 seconds)</p>
          <RefreshBtn />
        </div>
      </GlassCard>
    );
  }

  const PROB_COLORS: Record<string, string> = {
    high:   "bg-red-500/20 text-red-400 border-red-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low:    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

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

  const leaderTickers  = analysis.current_leadership?.leaders ?? [];
  const laggardTickers = analysis.current_leadership?.laggards ?? [];

  return (
    <GlassCard className="p-4 sm:p-6">
      <SectionHeader icon={Bot} title="Agent Analysis" color="purple"
        right={
          <div className="flex items-center gap-2 flex-wrap">
            {analysisTs && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{analysisTs}</span>}
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">Updated Weekly</Badge>
            <RefreshBtn />
          </div>
        }
      />
      {/* Regime line */}
      {(analysis.market_regime || analysis.macro_regime || analysis.leadership_style) && (
        <div className="flex flex-wrap gap-2 mb-5">
          {analysis.market_regime   && <Badge className={`border text-xs ${regimeCls(analysis.market_regime)}`}>{analysis.market_regime}</Badge>}
          {analysis.macro_regime    && <Badge className={`border text-xs ${regimeCls(analysis.macro_regime)}`}>{analysis.macro_regime}</Badge>}
          {analysis.leadership_style && <Badge className={`border text-xs ${regimeCls(analysis.leadership_style)}`}>{analysis.leadership_style}</Badge>}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <Block label="Regime Summary" icon={Info} text={analysis.summary} color="text-teal-400" />
          {/* Current leadership as tickers + explanation */}
          {analysis.current_leadership && (
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />Current Leadership
              </div>
              <div className="flex flex-wrap gap-2 mb-2">
                {leaderTickers.map(t => (
                  <span key={t} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">{t}</span>
                ))}
                {laggardTickers.map(t => (
                  <span key={t} className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">{t}</span>
                ))}
              </div>
              {analysis.current_leadership.explanation && (
                <p className="text-sm text-gray-300 leading-relaxed">{analysis.current_leadership.explanation}</p>
              )}
            </div>
          )}
        </div>
        <div>
          <Block label="1–4 Week Outlook" icon={ArrowRight} text={analysis.outlook_1_4_weeks}  color="text-blue-400" />
          <Block label="1–3 Month Outlook" icon={ArrowRight} text={analysis.outlook_1_3_months} color="text-purple-400" />
        </div>
      </div>

      {/* Scenarios */}
      {analysis.scenarios?.length > 0 && (
        <div className="mt-2 mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />Scenario Analysis
          </div>
          <div className="space-y-2">
            {analysis.scenarios.map((s, i) => {
              const probCls = PROB_COLORS[s.probability?.toLowerCase()] ?? PROB_COLORS.medium;
              return (
                <div key={i} className="border border-white/[0.06] rounded-lg overflow-hidden">
                  <button onClick={() => setOpenScenario(openScenario === i ? null : i)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white text-left">{s.name}</span>
                      <Badge className={`border text-[10px] px-1.5 py-0 ${probCls}`}>{s.probability}</Badge>
                      {s.timeframe && <span className="text-[10px] text-gray-500">{s.timeframe}</span>}
                    </div>
                    {openScenario === i ? <ChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  </button>
                  {openScenario === i && (
                    <div className="px-3 pb-3 border-t border-white/[0.04]">
                      {(s.sector_winners?.length || s.sector_losers?.length) && (
                        <div className="flex flex-wrap gap-2 mt-2 mb-2">
                          {s.sector_winners?.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">{t} ↑</span>)}
                          {s.sector_losers?.map(t => <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/25">{t} ↓</span>)}
                        </div>
                      )}
                      <p className="text-sm text-gray-400 leading-relaxed">{s.analysis}</p>
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
                <ExternalLink className="w-3 h-3" />
                {src.title}{src.publisher ? ` — ${src.publisher}` : ""}
              </a>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── TradingView ETF Heatmap (preserved) ─────────────────────────────────────
const ETFHeatmapWidget = memo(function ETFHeatmapWidget() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-etf-heatmap.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      dataSource: "AllUSEtf", blockSize: "Value.Traded|1W", blockColor: "change",
      grouping: "asset_class", locale: "en", symbolUrl: "", colorTheme: "dark",
      hasTopBar: false, isDataSetEnabled: false, isZoomEnabled: true,
      hasSymbolTooltip: true, isMonoSize: false, width: "100%", height: "100%",
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
  const qc = useQueryClient();
  const { authFetch } = useAuth();

  const [selectedTickers, setSelectedTickers] = useState<Set<string>>(
    new Set(SECTORS.map(s => s.ticker)),
  );
  const toggleTicker  = useCallback((t: string) => setSelectedTickers(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; }), []);
  const selectTicker  = useCallback((t: string) => setSelectedTickers(prev => { const n = new Set(prev); n.add(t); return n; }), []);

  // ── Dashboard (fast — skip AI analysis initially) ──
  const {
    data: dash, isLoading: dashLoading, isError: dashError, refetch: refetchDash,
  } = useQuery<DashboardData>({
    queryKey: ["sector-rotation-dashboard"],
    queryFn: async () => {
      const r = await fetch("/api/sector-rotation/dashboard?include_analysis=false");
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    refetchInterval: 2 * 60 * 1000,
    staleTime: 90 * 1000,
    retry: 2,
  });

  // ── Analysis (separate, slower, weekly) ──
  const {
    data: analysisRaw, isLoading: analysisLoading, isError: analysisError,
  } = useQuery<Analysis | null>({
    queryKey: ["sector-rotation-analysis"],
    queryFn: async () => {
      const r = await fetch("/api/sector-rotation/analysis");
      if (!r.ok) throw new Error(`${r.status}`);
      const j = await r.json();
      return j ?? null;
    },
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ── Refresh mutation (POST) ──
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const r = await authFetch("/api/sector-rotation/refresh-analysis", { method: "POST" });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sector-rotation-analysis"] });
      qc.invalidateQueries({ queryKey: ["sector-rotation-dashboard"] });
    },
  });

  const sectors      = dash?.sectors ?? [];
  const leaders      = dash?.leaders ?? [];
  const laggards     = dash?.laggards ?? [];
  const analysis     = dash?.analysis ?? analysisRaw ?? null;
  const analysisTs   = dash?.analysis_updated_at ?? (analysis as any)?.generated_at ?? null;
  const analysisNull = !analysisLoading && !dashLoading && analysis === null;

  return (
    <div className="min-h-screen text-white" style={{ background: "#050608" }}>
      <main className="max-w-[95vw] mx-auto px-2 sm:px-3 py-4 space-y-4 lg:space-y-6">

        {/* A: Regime Header */}
        <RegimeSummaryHeader data={dash} loading={dashLoading && !dash} />

        {/* Error banner */}
        {dashError && !dash && (
          <GlassCard className="p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-gray-300">Could not load sector market data</p>
                <p className="text-xs text-gray-500 mt-0.5">Backend may be warming up (first boot can take ~15s)</p>
              </div>
              <button onClick={() => refetchDash()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-300 transition-colors">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          </GlassCard>
        )}

        {/* D: Snapshot — full-width one-row strip */}
        <SectorSnapshotPanel
          sectors={sectors} loading={dashLoading && !dash}
          selectedTickers={selectedTickers} onSelectTicker={selectTicker}
        />

        {/* B: Performance Table */}
        <SectorPerformanceTable
          sectors={sectors} loading={dashLoading && !dash}
          selectedTickers={selectedTickers} onSelectTicker={selectTicker}
        />

        {/* C: Chart — full width */}
        <SectorRotationChart
          sectors={sectors} leaders={leaders} laggards={laggards}
          loading={dashLoading && !dash}
          selectedTickers={selectedTickers} onToggleTicker={toggleTicker}
        />

        {/* E: Agent Analysis */}
        <SectorAnalysisPanel
          analysis={analysis}
          analysisTs={analysisTs}
          loading={(analysisLoading && !analysisRaw && !dash?.analysis) && (dashLoading && !dash)}
          isNull={analysisNull}
          onRefresh={() => refreshMutation.mutate()}
          refreshing={refreshMutation.isPending}
        />

        {/* ── PRESERVED: TradingView ETF Heatmap ── */}
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

        {/* ── PRESERVED: Stage Analysis Screener + External Links ── */}
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
            <iframe src="https://screener.nextbigtrade.com/#/markets"
              className="w-full h-[600px] rounded-lg border border-white/[0.06]"
              title="Next Big Trade Sectors Screener" loading="eager" referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
              allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation" frameBorder="0" />
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
