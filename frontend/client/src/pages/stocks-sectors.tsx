import React, { useState, useMemo, useEffect, useRef, memo, useCallback } from "react";
import { useSetPageContext } from "@/hooks/useSetPageContext";
import { useSetScreenContext } from "@/hooks/useSetScreenContext";
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
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
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
interface TopStock {
  ticker:      string;
  name?:       string | null;
  role?:       string | null;
  sector?:     string | null;
  price?:      number | null;
  change_1d?:  number | null;
  change_7d?:  number | null;
  market_cap?: number | null;
  pe_ratio?:   number | null;
  catalyst?:   string | null;
  reason?:     string | null;
  tv_symbol?:  string | null;
  [key: string]: any;
}
interface Analysis {
  market_regime?:          string | null;
  macro_regime?:           string | null;
  leadership_style?:       string | null;
  summary:                 string | null;
  current_leadership:      CurrentLeadership | null;
  outlook_1_4_weeks:       string | null;
  outlook_1_3_months:      string | null;
  scenarios:               Scenario[];
  watch_items:             string[];
  sources:                 Source[];
  generated_at?:           string | null;
  top_stocks_to_watch?:    TopStock[];
  winning_sector_etfs?:    any[];
  theme_rotation?:         string | null;
}
interface ThemeRow {
  // Canonical fields from /api/themes/relative-strength
  theme_id:            string;
  display_name:        string;
  classification:      "sector" | "theme" | "sub_theme" | string | null;
  parent_sector:       string | null;
  sector_tags:         string[] | null;
  proxy_symbols:       string[];
  proxy_symbols_used:  string[];
  price:               number | null;
  lead_proxy:          string | null;
  timeframe:           string | null;
  return_pct:          number | null;
  performance:         { "1D"?: number; "7D"?: number; "30D"?: number; "YTD"?: number; "1Y"?: number; "5Y"?: number } | null;
  breadth_pct:         number | null;
  pct_from_50d:        number | null;
  trend_accel_20d:     number | null;
  rs_score:            number | null;
  rs_vs_spy:           number | null;
  rs_vs_qqq:           number | null;
  state:               string | null;
  state_reason:        string | null;
  momentum_rank:       number | null;
  leader_universe_source: string | null;
  leaders:             Array<{ symbol: string; return_pct: number }> | null;
  laggards:            Array<{ symbol: string; return_pct: number }> | null;
  last_updated:        string | null;
  proxy_source_health: Record<string, string> | null;
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
const TF_THEME_OPTIONS = ["1D", "7D", "30D", "YTD", "1Y", "5Y"] as const;
type ThemeTf = typeof TF_THEME_OPTIONS[number];
type Classification = "themes" | "sectors" | "all";
const THEME_PALETTE = [
  "#a855f7","#3b82f6","#22c55e","#f59e0b","#ec4899",
  "#06b6d4","#f97316","#8b5cf6","#0ea5e9","#fbbf24",
  "#10b981","#ef4444","#84cc16","#d946ef","#64748b",
];

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
const fmtFreshness = (lastUpdated: string | null | undefined): string => {
  if (!lastUpdated) return "";
  const diffMs = Date.now() - new Date(lastUpdated).getTime();
  if (isNaN(diffMs) || diffMs < 0) return "";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${Math.floor(hrs / 24)}d ago`;
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

// ─── View mode toggle ─────────────────────────────────────────────────────────
type ViewMode = "table" | "rs" | "line";
function ViewModeToggle({ mode, setMode }: { mode: ViewMode; setMode: (m: ViewMode) => void }) {
  const opts: { val: ViewMode; label: string }[] = [
    { val: "table", label: "Market Performance" },
    { val: "rs",    label: "Relative Strength" },
    { val: "line",  label: "Performance Curve" },
  ];
  return (
    <div className="flex items-center rounded border border-white/[0.08] bg-black/30 p-0.5 flex-shrink-0">
      {opts.map(o => (
        <button key={o.val} onClick={() => setMode(o.val)}
          className={`px-2.5 py-1 rounded text-[10px] font-medium tracking-wide transition-colors whitespace-nowrap ${
            mode === o.val
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
              : "text-white/35 hover:text-white/60"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Line Graph view ──────────────────────────────────────────────────────────
const LINE_TFS: ThemeTf[] = ["1D", "7D", "30D", "YTD", "1Y", "5Y"];

function LineGraphView({ themes, colorMap, tf }: { themes: ThemeRow[]; colorMap: Record<string, string>; tf: ThemeTf }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(themes.map(t => t.theme_id))
  );
  useEffect(() => {
    setSelectedIds(new Set(themes.map(t => t.theme_id)));
  }, [themes.length]);

  const toggleId = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Chips sorted by selected-TF value (best first) so the ordering matches the chart
  const sortedThemes = useMemo(() =>
    [...themes].sort((a, b) =>
      (b.performance?.[tf] ?? -Infinity) - (a.performance?.[tf] ?? -Infinity)
    ),
    [themes, tf]
  );

  const lineData = useMemo(() =>
    LINE_TFS.map(tfKey => {
      const pt: Record<string, any> = { tf: tfKey };
      themes.forEach(t => {
        if (selectedIds.has(t.theme_id)) {
          const v = t.performance?.[tfKey];
          if (v != null) pt[t.theme_id] = +v.toFixed(3);
        }
      });
      return pt;
    }),
    [themes, selectedIds]
  );

  const visibleThemes = useMemo(
    () => themes.filter(t => selectedIds.has(t.theme_id)),
    [themes, selectedIds]
  );

  return (
    <>
      <p className="text-[10px] text-gray-500 mb-3 -mt-1">
        Cumulative returns by lookback window · selected lookback highlighted · toggle items below to show/hide
      </p>
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {sortedThemes.map((t, i) => {
          const on    = selectedIds.has(t.theme_id);
          const color = colorMap[t.theme_id] ?? THEME_PALETTE[i % THEME_PALETTE.length];
          const label = t.proxy_symbols_used?.[0] ?? t.proxy_symbols?.[0] ?? t.theme_id.slice(0, 6);
          const tfVal = t.performance?.[tf];
          const tip   = `${t.display_name} · ${tf}: ${tfVal != null ? `${tfVal > 0 ? "+" : ""}${tfVal.toFixed(2)}%` : "n/a"}`;
          return (
            <button key={t.theme_id} onClick={() => toggleId(t.theme_id)} title={tip}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border transition-all flex-shrink-0 whitespace-nowrap ${
                on ? "text-white border-transparent" : "text-gray-600 border-white/10"
              }`}
              style={on ? { background: `${color}25`, borderColor: `${color}50` } : {}}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: on ? color : "#374151" }} />
              {label}
              {on && tfVal != null && (
                <span className={`ml-0.5 ${tfVal >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {tfVal >= 0 ? "+" : ""}{tfVal.toFixed(1)}%
                </span>
              )}
            </button>
          );
        })}
      </div>
      {visibleThemes.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-gray-600 text-sm">Select items above to display</div>
      ) : (
        <div style={{ height: Math.max(260, Math.min(400, visibleThemes.length * 6 + 200)) }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 4, right: 16, left: -12, bottom: 0 }}>
              <XAxis dataKey="tf" tick={({ x, y, payload }) => (
                <text x={x} y={y + 12} textAnchor="middle" fontSize={10}
                  fill={payload.value === tf ? "#38bdf8" : "#64748b"}
                  fontWeight={payload.value === tf ? 700 : 400}>
                  {payload.value}
                </text>
              )} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false}
                tickFormatter={v => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%`} />
              <Tooltip
                contentStyle={{ background: "#0d1623", border: "1px solid #1a2540", borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: "#94a3b8" }}
                labelFormatter={(lbl: string) => `${lbl}${lbl === tf ? " ◀ selected" : ""}`}
                formatter={(v: any, id: string) => {
                  const t = themes.find(x => x.theme_id === id);
                  const pct = Number(v);
                  return [`${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`, t?.display_name ?? id];
                }}
              />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
              <ReferenceLine x={tf} stroke="#38bdf8" strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.6} />
              {visibleThemes.map(t => (
                <Line key={t.theme_id} type="monotone" dataKey={t.theme_id}
                  dot={(props: any) => {
                    const isSel = props.payload?.tf === tf;
                    const col = colorMap[t.theme_id] ?? "#64748b";
                    return <circle key={props.key} cx={props.cx} cy={props.cy}
                      r={isSel ? 5 : 2.5} fill={isSel ? col : col}
                      stroke={isSel ? "#fff" : "none"} strokeWidth={isSel ? 1.5 : 0} />;
                  }}
                  activeDot={{ r: 5 }}
                  strokeWidth={1.5} stroke={colorMap[t.theme_id] ?? "#64748b"}
                  strokeOpacity={0.9} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

// ─── Classification toggle (Themes | Sectors | All) ──────────────────────────
function ClassificationToggle({ cls, setCls }: { cls: Classification; setCls: (c: Classification) => void }) {
  return (
    <div className="flex items-center rounded border border-white/[0.08] bg-black/30 p-0.5 flex-shrink-0">
      {(["themes", "sectors", "all"] as Classification[]).map(c => (
        <button
          key={c}
          onClick={() => setCls(c)}
          className={`px-2.5 py-1 rounded text-[10px] font-medium uppercase tracking-wide transition-colors ${
            cls === c
              ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
              : "text-white/35 hover:text-white/60"
          }`}
        >
          {c === "themes" ? "Themes" : c === "sectors" ? "Sectors" : "All"}
        </button>
      ))}
    </div>
  );
}

function applyClassFilter(themes: ThemeRow[], cls: Classification): ThemeRow[] {
  // "sectors" mode: backend already filtered to classification=sector
  // "all" mode: no client filter
  // "themes" mode: fetch all, exclude sector rows
  if (cls === "sectors" || cls === "all") return themes;
  return themes.filter(t => t.classification !== "sector");
}

// ─── Theme ETF → correct TradingView exchange prefix ─────────────────────────
// TradingView rejects AMEX: for NASDAQ/NYSE-listed ETFs; this map provides the right prefix.
const THEME_ETF_TV: Record<string, string> = {
  // Semiconductors
  SMH:   "NASDAQ:SMH",   SOXX:  "NASDAQ:SOXX",  SOXL:  "NASDAQ:SOXL",  SOXS:  "NASDAQ:SOXS",
  // AI / Robotics / Tech
  BOTZ:  "NASDAQ:BOTZ",  ROBO:  "NASDAQ:ROBO",  IRBO:  "NYSE:IRBO",
  QTUM:  "NASDAQ:QTUM",  SKYY:  "NASDAQ:SKYY",
  // Cybersecurity
  CIBR:  "NASDAQ:CIBR",  HACK:  "NASDAQ:HACK",  BUG:   "NASDAQ:BUG",   IHAK:  "AMEX:IHAK",
  // Fintech / Blockchain
  FINX:  "NASDAQ:FINX",  BLOK:  "NYSE:BLOK",    LEGR:  "NYSE:LEGR",
  // ARK
  ARKK:  "NYSE:ARKK",    ARKW:  "NYSE:ARKW",    ARKG:  "NYSE:ARKG",
  ARKF:  "NYSE:ARKF",    ARKX:  "NYSE:ARKX",    PRNT:  "NYSE:PRNT",    IZRL:  "AMEX:IZRL",
  // Clean Energy / EV
  ICLN:  "NASDAQ:ICLN",  QCLN:  "NASDAQ:QCLN",  LIT:   "NYSE:LIT",
  FAN:   "NYSE:FAN",     TAN:   "NYSE:TAN",      DRIV:  "AMEX:DRIV",   KARS:  "NYSE:KARS",
  HAIL:  "NYSE:HAIL",    IDRV:  "NASDAQ:IDRV",
  // Nuclear / Uranium
  URA:   "NYSE:URA",     URNM:  "NYSE:URNM",     NLR:   "AMEX:NLR",
  // Defense / Aerospace
  ITA:   "AMEX:ITA",     XAR:   "AMEX:XAR",      PPA:   "NYSE:PPA",
  // Biotech / Genomics
  XBI:   "AMEX:XBI",     IBB:   "NASDAQ:IBB",    IDNA:  "NYSE:IDNA",
  GNOM:  "AMEX:GNOM",
  // Med Devices / Healthcare equipment
  IHI:   "AMEX:IHI",     IHF:   "NYSE:IHF",
  // Regional banks / Financials
  KRE:   "NYSE:KRE",     IAT:   "AMEX:IAT",      KBWB:  "NASDAQ:KBWB",
  // Energy / Oil & Gas
  OIH:   "AMEX:OIH",     FCG:   "AMEX:FCG",      XOP:   "AMEX:XOP",
  AMLP:  "NYSE:AMLP",
  // Materials / Mining / Commodities
  COPX:  "AMEX:COPX",    GDX:   "NYSE:GDX",      GDXJ:  "NYSE:GDXJ",
  SLV:   "NYSE:SLV",     GLD:   "NYSE:GLD",       IAU:   "NYSE:IAU",
  RING:  "NASDAQ:RING",  REMX:  "NYSE:REMX",
  // Homebuilders / Real Estate
  XHB:   "AMEX:XHB",     ITB:   "AMEX:ITB",       SRVR:  "AMEX:SRVR",
  // Water / Infrastructure
  PHO:   "NASDAQ:PHO",   IQLT:  "AMEX:IQLT",
  // International / Emerging
  KWEB:  "NYSE:KWEB",    FXI:   "NYSE:FXI",       MCHI:  "NASDAQ:MCHI",
  EEM:   "NYSE:EEM",     VWO:   "NYSE:VWO",       EWJ:   "NYSE:EWJ",
  // Multi-asset / broad
  VNQ:   "NYSE:VNQ",
  // Sector SPDR fallbacks (in case any appear as a theme leader)
  XLC:   "NYSE:XLC",     XLY:   "NYSE:XLY",       XLP:   "NYSE:XLP",
  XLE:   "NYSE:XLE",     XLF:   "NYSE:XLF",       XLV:   "NYSE:XLV",
  XLI:   "NYSE:XLI",     XLB:   "NYSE:XLB",       XLRE:  "NYSE:XLRE",
  XLK:   "NYSE:XLK",     XLU:   "NYSE:XLU",
};
function themeEtfTvSymbol(ticker: string): string {
  return THEME_ETF_TV[ticker.toUpperCase()] ?? `AMEX:${ticker}`;
}

// ─── Unified display row — both sectors and themes render through this shape ───
interface DisplayRow {
  key:                    string;
  ticker:                 string;
  name:                   string | null;
  classification:         string | null;
  parent_sector:          string | null;
  price:                  number | null;
  change_1d:              number | null;
  change_7d:              number | null;
  change_30d:             number | null;
  change_ytd:             number | null;
  change_1y:              number | null;
  change_5y:              number | null;
  rotation_score:         number | null;
  relative_strength_rank: number | null;
  regime_tag:             string | null;
  state_reason:           string | null;
  rs_vs_spy:              number | null;
  rs_vs_qqq:              number | null;
  breadth_pct:            number | null;
  proxy_symbols_used:     string[];
  last_updated:           string | null;
  spkPrices:              number[];
  spkPos:                 boolean;
  dotColor:               string;
  tvSymbol:               string;
  series?:                any;
}

function buildThemeSparkline(theme: ThemeRow): number[] {
  const p = theme.performance;
  // Build synthetic price series from longest → shortest timeframe
  const vals = [p?.["5Y"], p?.["1Y"], p?.["YTD"], p?.["30D"], p?.["7D"], p?.["1D"]]
    .filter((v): v is number => v != null);
  if (vals.length < 2) return [];
  return vals.reduce<number[]>((acc, pct, i) => {
    if (i === 0) return [100 * (1 + pct / 100)];
    return [...acc, acc[acc.length - 1] * (1 + pct / 100)];
  }, []);
}

function normalizeThemeStatus(state: string | null): string | null {
  if (!state) return null;
  const s = state.toLowerCase();
  if (s.includes("lead"))                      return "Leading";
  if (s.includes("improv"))                    return "Improving";
  if (s.includes("weak") || s.includes("deteriorat")) return "Weakening";
  if (s.includes("lag"))                       return "Lagging";
  if (s.includes("neutral"))                   return "Neutral";
  if (s.includes("active"))                    return "Leading";
  if (s.includes("dead"))                      return "Lagging";
  return state;
}

function normalizeThemeToRow(theme: ThemeRow, idx: number): DisplayRow {
  const ticker    = theme.proxy_symbols_used?.[0] ?? theme.proxy_symbols?.[0] ?? theme.theme_id;
  const p         = theme.performance;
  const ch7       = p?.["7D"] ?? null;
  const spkPrices = buildThemeSparkline(theme);
  return {
    key:                    theme.theme_id,
    ticker,
    name:                   theme.display_name,
    classification:         theme.classification ?? null,
    parent_sector:          theme.parent_sector ?? null,
    price:                  theme.price ?? null,
    change_1d:              p?.["1D"] ?? theme.return_pct ?? null,
    change_7d:              ch7,
    change_30d:             p?.["30D"] ?? null,
    change_ytd:             p?.["YTD"] ?? null,
    change_1y:              p?.["1Y"] ?? null,
    change_5y:              p?.["5Y"] ?? null,
    rotation_score:         theme.rs_score,
    relative_strength_rank: theme.momentum_rank ?? idx + 1,
    regime_tag:             normalizeThemeStatus(theme.state),
    state_reason:           theme.state_reason ?? null,
    rs_vs_spy:              theme.rs_vs_spy ?? null,
    rs_vs_qqq:              theme.rs_vs_qqq ?? null,
    breadth_pct:            theme.breadth_pct ?? null,
    proxy_symbols_used:     theme.proxy_symbols_used ?? theme.proxy_symbols ?? [],
    last_updated:           theme.last_updated ?? null,
    spkPrices,
    spkPos:                 (ch7 ?? 0) >= 0,
    dotColor:               THEME_PALETTE[idx % THEME_PALETTE.length],
    tvSymbol:               themeEtfTvSymbol(ticker),
  };
}

// ─── Theme Relative Strength Chart ────────────────────────────────────────────
function ThemeRSView({ themes, tf }: { themes: ThemeRow[]; tf: ThemeTf }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(themes.map(t => t.theme_id))
  );

  useEffect(() => {
    setSelectedIds(new Set(themes.map(t => t.theme_id)));
  }, [themes.length]);

  const toggleId = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const pctForItem = (item: ThemeRow): number | null =>
    item.performance?.[tf] ?? (tf === "1D" ? item.return_pct : null) ?? null;

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    themes.forEach((t, i) => { map[t.theme_id] = THEME_PALETTE[i % THEME_PALETTE.length]; });
    return map;
  }, [themes]);

  // Sort leaders/laggards by the selected timeframe return
  const sorted = useMemo(() =>
    [...themes].sort((a, b) => (pctForItem(b) ?? -Infinity) - (pctForItem(a) ?? -Infinity)),
    [themes, tf]
  );

  const topLeaders  = sorted.slice(0, 3);
  const topLaggards = [...sorted].reverse().slice(0, 3);

  const selectedThemes = useMemo(() => themes.filter(t => selectedIds.has(t.theme_id)), [themes, selectedIds]);

  // Bar chart: one bar per selected theme for the chosen TF, sorted best → worst
  const barData = useMemo(() => {
    return selectedThemes
      .map(t => ({
        name:        t.proxy_symbols_used?.[0] ?? t.proxy_symbols?.[0] ?? t.theme_id.slice(0, 6),
        displayName: t.display_name,
        value:       pctForItem(t) ?? 0,
        hasData:     pctForItem(t) != null,
        color:       colorMap[t.theme_id] ?? "#64748b",
        stateReason: t.state_reason ?? "",
        rsSpy:       t.rs_vs_spy,
        rsQqq:       t.rs_vs_qqq,
      }))
      .sort((a, b) => b.value - a.value);
  }, [selectedThemes, tf]);

  const barDomain = useMemo((): [number, number] => {
    const vals = barData.filter(d => d.hasData).map(d => d.value);
    if (vals.length === 0) return [-5, 5];
    const minV = Math.min(0, ...vals);
    const maxV = Math.max(0, ...vals);
    const pad = Math.max(0.5, (maxV - minV) * 0.08);
    return [minV - pad, maxV + pad];
  }, [barData]);

  const tfLabel = tf;

  return (
    <>
      {/* Leaders / Laggards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
          <div className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Top Leaders</div>
          {topLeaders.length ? topLeaders.map(r => (
            <div key={r.theme_id} className="flex items-center gap-2 mb-1" title={r.state_reason ?? r.display_name}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: colorMap[r.theme_id] }} />
              <span className="text-xs font-mono font-bold text-white truncate max-w-[80px]">
                {r.proxy_symbols_used?.[0] ?? r.proxy_symbols?.[0] ?? r.theme_id}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[60px] hidden sm:block">{r.display_name}</span>
              <span className={`text-xs ml-auto ${pctCls(pctForItem(r))}`}>{fmtPct(pctForItem(r), 1)}</span>
            </div>
          )) : <span className="text-xs text-gray-600">—</span>}
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <div className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1"><TrendingDown className="w-3 h-3" />Bottom Laggards</div>
          {topLaggards.length ? topLaggards.map(r => (
            <div key={r.theme_id} className="flex items-center gap-2 mb-1" title={r.state_reason ?? r.display_name}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: colorMap[r.theme_id] }} />
              <span className="text-xs font-mono font-bold text-white truncate max-w-[80px]">
                {r.proxy_symbols_used?.[0] ?? r.proxy_symbols?.[0] ?? r.theme_id}
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[60px] hidden sm:block">{r.display_name}</span>
              <span className={`text-xs ml-auto ${pctCls(pctForItem(r))}`}>{fmtPct(pctForItem(r), 1)}</span>
            </div>
          )) : <span className="text-xs text-gray-600">—</span>}
        </div>
      </div>
      {/* Theme filter pills — show proxy ticker, tooltip shows display_name + proxies */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {themes.map((t, i) => {
          const on    = selectedIds.has(t.theme_id);
          const color = THEME_PALETTE[i % THEME_PALETTE.length];
          const label = t.proxy_symbols_used?.[0] ?? t.proxy_symbols?.[0] ?? t.theme_id.slice(0, 6);
          const tip   = `${t.display_name}${t.proxy_symbols_used?.length ? ` · ${t.proxy_symbols_used.join(", ")}` : ""}`;
          return (
            <button key={t.theme_id} onClick={() => toggleId(t.theme_id)}
              title={tip}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium border transition-all flex-shrink-0 whitespace-nowrap ${on ? "text-white border-transparent" : "text-gray-600 border-white/10"}`}
              style={on ? { background: `${color}30`, borderColor: `${color}60` } : {}}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: on ? color : "#374151" }} />
              {label}
            </button>
          );
        })}
      </div>
      {/* Chart label */}
      <div className="text-[10px] uppercase tracking-wider text-gray-600 mb-2 px-0.5">
        {tfLabel} relative performance — {themes.length} canonical themes
      </div>
      {/* Horizontal bar chart — one bar per theme, updates on TF change */}
      {barData.length > 0 ? (
        <div style={{ height: Math.max(220, barData.length * 20 + 16) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 52, left: 4, bottom: 0 }}>
              <XAxis type="number" domain={barDomain} tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false}
                tickFormatter={v => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}%`} />
              <YAxis type="category" dataKey="name" width={44}
                tick={{ fontSize: 9, fill: "#94a3b8", fontFamily: "monospace", fontWeight: 600 }}
                tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#0d1623", border: "1px solid #1a2540", borderRadius: 6, fontSize: 11 }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                formatter={(v: any, _name: any, props: any) => {
                  const d = props.payload;
                  if (!d?.hasData) return ["No data", d?.displayName ?? ""];
                  const lines: string[] = [
                    `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(2)}% (${tfLabel})`,
                  ];
                  if (d?.rsSpy != null) lines.push(`vs SPY: ${d.rsSpy > 0 ? "+" : ""}${d.rsSpy.toFixed(2)}%`);
                  if (d?.rsQqq != null) lines.push(`vs QQQ: ${d.rsQqq > 0 ? "+" : ""}${d.rsQqq.toFixed(2)}%`);
                  return [lines.join(" · "), d?.displayName ?? ""];
                }}
              />
              <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={13}>
                {barData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.hasData ? entry.color : "#1e293b"} fillOpacity={entry.hasData ? 0.85 : 0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">
          {selectedThemes.length === 0
            ? "Select themes above to compare performance"
            : `No ${tfLabel} data available`}
        </div>
      )}
    </>
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
            <h1 className="text-xl sm:text-2xl font-bold text-white">Themes</h1>
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
const TVTickerChart = memo(function TVTickerChart({ ticker, symbol }: { ticker: string; symbol?: string }) {
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
      symbol: symbol || `AMEX:${ticker}`,
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
      enabled_features: ["use_localstorage_for_settings","study_templates","header_indicators","header_compare","header_undo_redo","header_screenshot","header_chart_type","header_settings","header_resolutions","header_fullscreen_button","left_toolbar","drawing_templates"],
      disabled_features: ["volume_force_overlay","create_volume_indicator_by_default"],
      timeframes: [
        {text:"1m",resolution:"1"},{text:"15m",resolution:"15"},{text:"30m",resolution:"30"},
        {text:"1h",resolution:"60"},{text:"4h",resolution:"240"},{text:"1d",resolution:"D"},{text:"1w",resolution:"W"},
      ],
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

// ─── D: ETF Detail Panel (chart + performance + holdings) ────────────────────
interface EtfDetail {
  symbol:        string;
  price:         number | null;
  performance:   { "1d"?: number; "7d"?: number; "30d"?: number; ytd?: number; "1y"?: number } | null;
  holding_count: number | null;
  top_holdings:  { ticker: string; name: string; weight: number }[];
  holdings:      { ticker: string; name: string; weight: number }[];
  as_of:         string | null;
  source:        string | null;
}

function EtfDetailPanel({ ticker, tvSymbol, dotColor, name }: {
  ticker: string; tvSymbol?: string; dotColor?: string; name?: string | null;
}) {
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, isError } = useQuery<EtfDetail>({
    queryKey: ["sector-etf-detail", ticker],
    queryFn: () =>
      fetch(`/api/sectors/etf/${encodeURIComponent(ticker)}`)
        .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const perf          = data?.performance ?? null;
  const allHoldings   = data?.holdings?.length ? data.holdings : (data?.top_holdings ?? []);
  const topHoldings   = data?.top_holdings?.length ? data.top_holdings : allHoldings.slice(0, 15);
  const displayed     = showAll ? allHoldings : topHoldings;
  const canExpand     = allHoldings.length > topHoldings.length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ background: dotColor ?? "#64748b" }} />
        <span className="text-xs font-mono font-bold text-white">{ticker}</span>
        {name && <span className="text-xs text-gray-500">{name}</span>}
      </div>

      <TVTickerChart ticker={ticker} symbol={tvSymbol} />

      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skel w={80} h={14} /><Skel w={80} h={14} /><Skel w={80} h={14} /><Skel w={80} h={14} />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-amber-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> ETF holdings unavailable
        </div>
      ) : data ? (
        <div className="mt-4 space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-3 px-1 py-3 bg-white/[0.03] rounded-lg border border-white/[0.06]">
            {([
              { label: "Price", value: data.price != null ? `$${fmtPx(data.price)}` : null, cls: "text-white" },
              { label: "1D",    value: fmtPct(perf?.["1d"]),  cls: pctCls(perf?.["1d"] ?? null) },
              { label: "7D",    value: fmtPct(perf?.["7d"]),  cls: pctCls(perf?.["7d"] ?? null) },
              { label: "30D",   value: fmtPct(perf?.["30d"]), cls: pctCls(perf?.["30d"] ?? null) },
              { label: "YTD",   value: fmtPct(perf?.ytd),     cls: pctCls(perf?.ytd ?? null) },
              { label: "1Y",    value: fmtPct(perf?.["1y"]),  cls: pctCls(perf?.["1y"] ?? null) },
            ] as { label: string; value: string | null; cls: string }[]).map(({ label, value, cls }) => (
              <div key={label} className="flex flex-col gap-0.5 min-w-[52px]">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
                <span className={`text-sm font-mono font-bold tabular-nums ${cls}`}>{value ?? "—"}</span>
              </div>
            ))}
          </div>

          {displayed.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">ETF Holdings</span>
                  {data.as_of && (
                    <span className="text-[10px] text-gray-600">Top holdings as of {data.as_of}</span>
                  )}
                </div>
                {canExpand && (
                  <button
                    onClick={() => setShowAll(v => !v)}
                    className="text-[10px] text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    {showAll ? "Show fewer" : `Show all ${data.holding_count ?? allHoldings.length} holdings`}
                  </button>
                )}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="px-2 py-1.5 text-left text-[10px] text-gray-500 uppercase tracking-wider w-8">#</th>
                    <th className="px-2 py-1.5 text-left text-[10px] text-gray-500 uppercase tracking-wider">Ticker</th>
                    <th className="px-2 py-1.5 text-left text-[10px] text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-2 py-1.5 text-right text-[10px] text-gray-500 uppercase tracking-wider">Weight %</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((h, i) => (
                    <tr key={`${h.ticker ?? i}`} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                      <td className="px-2 py-1.5 text-gray-600 font-mono tabular-nums">{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono font-bold text-white">{h.ticker}</td>
                      <td className="px-2 py-1.5 text-gray-400 truncate max-w-[220px]">{h.name}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-gray-300">
                        {h.weight != null ? `${h.weight.toFixed(2)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── E: Top Stocks in Winning Sectors ────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; badge: string }> = {
  momentum_leader:    { label: "Momentum Leaders",      color: "text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  bottleneck_enabler: { label: "Bottleneck / Enablers", color: "text-amber-400",   border: "border-amber-500/25",  bg: "bg-amber-500/10",   badge: "bg-amber-500/20 text-amber-300 border-amber-500/30"   },
  bottleneck:         { label: "Bottleneck / Enablers", color: "text-amber-400",   border: "border-amber-500/25",  bg: "bg-amber-500/10",   badge: "bg-amber-500/20 text-amber-300 border-amber-500/30"   },
  anchor_giant:       { label: "Anchor Giants",         color: "text-blue-400",    border: "border-blue-500/25",   bg: "bg-blue-500/10",    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30"    },
  anchor:             { label: "Anchor Giants",         color: "text-blue-400",    border: "border-blue-500/25",   bg: "bg-blue-500/10",    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30"    },
  leading:            { label: "Leading",               color: "text-emerald-400", border: "border-emerald-500/25", bg: "bg-emerald-500/10", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  improving:          { label: "Improving",             color: "text-teal-400",    border: "border-teal-500/25",   bg: "bg-teal-500/10",    badge: "bg-teal-500/20 text-teal-300 border-teal-500/30"    },
  weakening:          { label: "Weakening",             color: "text-amber-400",   border: "border-amber-500/25",  bg: "bg-amber-500/10",   badge: "bg-amber-500/20 text-amber-300 border-amber-500/30"   },
  lagging:            { label: "Lagging",               color: "text-rose-400",    border: "border-rose-500/25",   bg: "bg-rose-500/10",    badge: "bg-rose-500/20 text-rose-300 border-rose-500/30"    },
};
const DEFAULT_ROLE_CFG = { label: "Notable Stocks", color: "text-gray-400", border: "border-white/10", bg: "bg-white/5", badge: "bg-white/10 text-gray-300 border-white/10" };

function roleCfg(role?: string | null) {
  if (!role) return DEFAULT_ROLE_CFG;
  const key = role.toLowerCase().replace(/[\s-]/g, "_");
  return ROLE_CONFIG[key] ?? DEFAULT_ROLE_CFG;
}

function TopStockRow({ stock }: { stock: TopStock }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = roleCfg(stock.role);
  const tvSym = stock.tv_symbol || stock.ticker;
  return (
    <div className={`rounded-xl border ${cfg.border} overflow-hidden`}>
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full text-left p-3 sm:p-4 hover:bg-white/[0.03] transition-colors ${expanded ? "bg-white/[0.04]" : ""}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono font-bold text-white text-sm">{stock.ticker}</span>
              {stock.name && <span className="text-xs text-gray-400 truncate">{stock.name}</span>}
              {stock.role && (
                <Badge className={`border text-[10px] px-1.5 py-0 ${cfg.badge}`}>
                  {stock.role.replace(/_/g, " ")}
                </Badge>
              )}
              {stock.sector && <span className="text-[10px] text-gray-600">{stock.sector}</span>}
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-mono">
              {stock.price != null && <span className="text-white">${fmtPx(stock.price)}</span>}
              {stock.change_1d != null && <span className={pctCls(stock.change_1d)}>{fmtPct(stock.change_1d)} 1D</span>}
              {stock.change_7d != null && <span className={pctCls(stock.change_7d)}>{fmtPct(stock.change_7d)} 7D</span>}
              {stock.pe_ratio != null && <span className="text-gray-500">P/E {stock.pe_ratio.toFixed(1)}</span>}
              {stock.market_cap != null && (
                <span className="text-gray-500">
                  {stock.market_cap >= 1e12 ? `$${(stock.market_cap/1e12).toFixed(1)}T`
                    : stock.market_cap >= 1e9 ? `$${(stock.market_cap/1e9).toFixed(1)}B`
                    : `$${(stock.market_cap/1e6).toFixed(0)}M`}
                </span>
              )}
            </div>
            {stock.catalyst && <p className="text-xs text-gray-400 mt-1 leading-relaxed">{stock.catalyst}</p>}
            {stock.reason && !stock.catalyst && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{stock.reason}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-gray-600">{expanded ? "Hide" : "Chart"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
          </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-white/[0.04] px-4 py-3 bg-black/30">
          {stock.reason && stock.catalyst && (
            <p className="text-xs text-gray-500 mb-3 leading-relaxed"><span className="text-gray-400 font-medium">Why included: </span>{stock.reason}</p>
          )}
          <TVTickerChart ticker={stock.ticker} symbol={tvSym} />
        </div>
      )}
    </div>
  );
}

function TopStocksPanel({ stocks, leaders }: { stocks: TopStock[] | undefined; leaders: SectorRow[] }) {
  const hasStocks  = (stocks?.length ?? 0) > 0;
  const hasLeaders = leaders.length > 0;
  if (!hasStocks && !hasLeaders) return null;

  // Prefer analysis stocks; fall back to dashboard leaders immediately
  const usingFallback = !hasStocks && hasLeaders;
  const displayItems: TopStock[] = hasStocks
    ? stocks!
    : leaders.map(l => ({
        ticker:    l.ticker,
        name:      l.name,
        price:     l.price,
        change_1d: l.change_1d,
        change_7d: l.change_7d,
        change_30d: l.change_30d,
        role:      l.regime_tag?.toLowerCase() ?? undefined,
      }));

  // Winning-sector chips shown in section header (always from leaders)
  const leaderChips = hasLeaders ? (
    <div className="flex items-center gap-1.5 flex-wrap">
      {leaders.map(l => {
        const color = SECTOR_COLOR[l.ticker] ?? "#22c55e";
        return (
          <span key={l.ticker}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border"
            style={{ borderColor: `${color}40`, color, background: `${color}12` }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            {l.ticker}
          </span>
        );
      })}
    </div>
  ) : undefined;

  // Group only when showing analysis stocks (leaders are a small flat list)
  const groups: Record<string, TopStock[]> = {};
  if (!usingFallback) {
    for (const s of displayItems) {
      const cfg = roleCfg(s.role);
      const key = cfg.label;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
  }
  const groupOrder = ["Momentum Leaders", "Bottleneck / Enablers", "Anchor Giants", "Notable Stocks"];
  const orderedGroups = [
    ...groupOrder.filter(g => groups[g]),
    ...Object.keys(groups).filter(g => !groupOrder.includes(g)),
  ];

  return (
    <GlassCard className="p-4 sm:p-6">
      <SectionHeader
        icon={Activity}
        title="Top Stocks in Winning Sectors"
        badge={usingFallback ? `${displayItems.length} SECTORS` : `${displayItems.length} NAMES`}
        color="amber"
        right={leaderChips}
      />
      {usingFallback ? (
        // Flat list of sector leaders from dashboard — no group headers
        <div className="space-y-2">
          {displayItems.map(s => <TopStockRow key={s.ticker} stock={s} />)}
        </div>
      ) : (
        // Grouped list from analysis
        <div className="space-y-5">
          {orderedGroups.map(groupLabel => {
            const groupStocks = groups[groupLabel];
            const cfg = roleCfg(groupStocks[0]?.role);
            return (
              <div key={groupLabel}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${cfg.color}`}>
                  <Zap className="w-3.5 h-3.5" />{groupLabel}
                </div>
                <div className="space-y-2">
                  {groupStocks.map(s => <TopStockRow key={s.ticker} stock={s} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

// ─── B + C: Unified Themes Card ───────────────────────────────────────────────
type SortKey = "ticker" | "change_1d" | "change_7d" | "change_30d" | "change_ytd" | "change_1y" | "change_5y" | "rotation_score";

function UnifiedThemesCard({
  loading: sectorLoading,
}: {
  sectors: SectorRow[]; loading: boolean;
  selectedTickers: Set<string>; onSelectTicker: (t: string) => void;
  onToggleTicker: (t: string) => void;
}) {
  const [viewMode, setViewMode]       = useState<ViewMode>("table");
  const [cls, setCls]                 = useState<Classification>("themes");
  const [tf, setTf]                   = useState<ThemeTf>("7D");
  const [sortKey, setSortKey]         = useState<SortKey>("rotation_score");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Single fetch — performance{} has all 5 TFs, shared across all 3 view modes
  const apiCls = cls === "sectors" ? "sector" : "all";
  const { data: raw, isLoading, isError } = useQuery<{ themes: ThemeRow[] }>({
    queryKey: ["themes-unified", cls],
    queryFn: () => fetch(`/api/themes/relative-strength?timeframe=1D&classification=${apiCls}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const allThemes = useMemo(() => applyClassFilter(raw?.themes ?? [], cls), [raw, cls]);
  const freshness = fmtFreshness(raw?.themes?.[0]?.last_updated);

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {};
    allThemes.forEach((t, i) => { map[t.theme_id] = THEME_PALETTE[i % THEME_PALETTE.length]; });
    return map;
  }, [allThemes]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const rows = useMemo(() => allThemes.map((t, i) => normalizeThemeToRow(t, i)), [allThemes]);

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const av = a[sortKey as keyof DisplayRow] as number | string | null;
    const bv = b[sortKey as keyof DisplayRow] as number | string | null;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string")
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  }), [rows, sortKey, sortDir]);

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

  const titleLabel =
    viewMode === "rs"   ? "Relative Strength" :
    viewMode === "line" ? "Performance Curve" : "Market Performance";

  return (
    <GlassCard className="p-4 sm:p-6 overflow-hidden">
      {/* ── Unified header ── */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-5">
        <div className="flex items-center gap-2.5 flex-wrap gap-y-2">
          <div className="w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="text-base font-semibold text-white whitespace-nowrap">{titleLabel}</h3>
          <ViewModeToggle mode={viewMode} setMode={v => { setViewMode(v); setExpandedKey(null); }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {freshness && <span className="text-[10px] text-gray-600 hidden lg:block">{freshness}</span>}
          {isLoading && <RefreshCw className="w-3 h-3 text-gray-600 animate-spin" />}
          {(viewMode === "rs" || viewMode === "line") && (
            <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
              {TF_THEME_OPTIONS.map(t => (
                <button key={t} onClick={() => setTf(t)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${tf === t ? "bg-blue-500 text-white" : "text-gray-400 hover:text-white"}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
          <ClassificationToggle cls={cls} setCls={v => { setCls(v); setExpandedKey(null); }} />
        </div>
      </div>

      {isError ? (
        <div className="flex items-center gap-2 text-sm text-amber-400 py-4">
          <AlertTriangle className="w-4 h-4" /> Failed to load data.
        </div>
      ) : isLoading && allThemes.length === 0 ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3"><Skel w={40} h={14} /><Skel w={120} h={14} /><Skel w={60} h={14} /><Skel w={60} h={14} /></div>
        ))}</div>
      ) : viewMode === "table" ? (
        /* ── TABLE VIEW ── */
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <Th label="#" /><Th label="Ticker" k="ticker" /><Th label="Name" />
                <Th label="1D" k="change_1d" /><Th label="7D" k="change_7d" />
                <Th label="30D" k="change_30d" /><Th label="YTD" k="change_ytd" />
                <Th label="1Y" k="change_1y" /><Th label="5Y" k="change_5y" />
                <Th label="Score" k="rotation_score" /><Th label="Trend" /><Th label="Status" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const expanded = expandedKey === row.key;
                const tagCls   = row.regime_tag ? (TAG_STYLES[row.regime_tag] ?? "") : "";
                const color    = colorMap[row.key] ?? row.dotColor;
                const tipText  = [
                  row.name,
                  row.classification ? `(${row.classification})` : "",
                  row.parent_sector ? `· ${row.parent_sector}` : "",
                  row.state_reason ? `\n${row.state_reason}` : "",
                  row.rs_vs_spy != null ? `\nvs SPY: ${row.rs_vs_spy > 0 ? "+" : ""}${row.rs_vs_spy.toFixed(2)}%` : "",
                  row.rs_vs_qqq != null ? ` vs QQQ: ${row.rs_vs_qqq > 0 ? "+" : ""}${row.rs_vs_qqq.toFixed(2)}%` : "",
                  row.proxy_symbols_used.length > 1 ? `\nProxies: ${row.proxy_symbols_used.join(", ")}` : "",
                ].filter(Boolean).join(" ");
                const tfClsActive = (_c: string) => "";
                return (
                  <React.Fragment key={row.key}>
                    <tr onClick={() => setExpandedKey(prev => prev === row.key ? null : row.key)}
                      className={`border-b border-white/[0.03] cursor-pointer transition-colors ${expanded ? "bg-white/[0.08]" : "hover:bg-white/[0.06]"}`}
                      title={tipText}>
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-gray-600 font-mono">
                          {row.relative_strength_rank != null ? `#${row.relative_strength_rank}` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="font-mono font-bold text-white text-sm">{row.ticker}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-gray-400 truncate max-w-[140px]">{row.name}</div>
                        {row.classification && (
                          <div className="text-[9px] text-gray-600 mt-0.5 capitalize">{row.classification.replace("_", " ")}</div>
                        )}
                      </td>
                      <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_1d)} ${tfClsActive("change_1d")}`}>{fmtPct(row.change_1d)}</td>
                      <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_7d)} ${tfClsActive("change_7d")}`}>{fmtPct(row.change_7d)}</td>
                      <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_30d)} ${tfClsActive("change_30d")}`}>{fmtPct(row.change_30d)}</td>
                      <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_ytd)} ${tfClsActive("change_ytd")}`}>{fmtPct(row.change_ytd)}</td>
                      <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_1y)} ${tfClsActive("change_1y")}`}>{fmtPct(row.change_1y)}</td>
                      <td className={`px-3 py-2.5 text-sm font-mono tabular-nums ${pctCls(row.change_5y)}`}>{fmtPct(row.change_5y)}</td>
                      <td className="px-3 py-2.5">
                        {row.rotation_score != null ? (
                          <div className="flex items-center gap-2 min-w-[68px]">
                            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, row.rotation_score)}%`, background: color }} />
                            </div>
                            <span className="text-xs text-gray-400 tabular-nums">{row.rotation_score.toFixed(0)}</span>
                          </div>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5"><Sparkline prices={row.spkPrices} positive={row.spkPos} /></td>
                      <td className="px-3 py-2.5">
                        {row.regime_tag
                          ? <Badge title={row.state_reason ?? undefined} className={`border text-[10px] px-1.5 py-0 cursor-help ${tagCls}`}>{row.regime_tag}</Badge>
                          : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${row.key}-detail`} className="bg-black/30">
                        <td colSpan={12} className="px-4 py-4">
                          <EtfDetailPanel ticker={row.ticker} tvSymbol={row.tvSymbol} dotColor={color} name={row.name} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {sorted.length === 0 && !isLoading && (
                <tr><td colSpan={11} className="px-3 py-8 text-center text-gray-500 text-sm">No data available</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === "rs" ? (
        /* ── RELATIVE STRENGTH VIEW ── */
        <ThemeRSView themes={allThemes} tf={tf} />
      ) : (
        /* ── LINE GRAPH VIEW ── */
        <LineGraphView themes={allThemes} colorMap={colorMap} tf={tf} />
      )}
    </GlassCard>
  );
}

// ─── D: Compact heatmap side panel ───────────────────────────────────────────
const TAG_ORDER: Record<string, number> = { Leading: 0, Improving: 1, Weakening: 2, Lagging: 3 };

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

      {/* Theme Rotation */}
      {analysis.theme_rotation && (
        <Block label="Theme Rotation" icon={Layers} text={analysis.theme_rotation} color="text-sky-400" />
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

// ─── Sector Rotation Signals (from Prophetik investor data) ──────────────────

interface BackendSectorEntry { sector: string; mentions?: number; stocks?: string[]; }
interface BackendSectorRotation {
  strongest_positive_sectors?: BackendSectorEntry[];
  strongest_negative_sectors?: BackendSectorEntry[];
  emerging_leadership?: BackendSectorEntry[];
  fading_leadership?: BackendSectorEntry[];
}
interface InvestorSectorSignal {
  sector: string;
  type: "positive" | "negative" | "emerging" | "fading";
  stocks?: string[];
  mentions?: number;
}

function transformInvestorSectors(sr?: BackendSectorRotation): InvestorSectorSignal[] {
  if (!sr) return [];
  const out: InvestorSectorSignal[] = [];
  (sr.strongest_positive_sectors ?? []).forEach(e => out.push({ sector: e.sector, type: "positive", stocks: e.stocks, mentions: e.mentions }));
  (sr.strongest_negative_sectors ?? []).forEach(e => out.push({ sector: e.sector, type: "negative", stocks: e.stocks, mentions: e.mentions }));
  (sr.emerging_leadership ?? []).forEach(e => out.push({ sector: e.sector, type: "emerging", stocks: e.stocks }));
  (sr.fading_leadership ?? []).forEach(e => out.push({ sector: e.sector, type: "fading", stocks: e.stocks }));
  return out;
}

const ISIGNAL_CONFIG = {
  positive: { label: "Positive",        text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  negative: { label: "Negative",        text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20"     },
  emerging: { label: "Emerging Leader", text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
  fading:   { label: "Fading",          text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
} as const;

function InvestorSectorCard({ signal }: { signal: InvestorSectorSignal }) {
  const cfg = ISIGNAL_CONFIG[signal.type];
  return (
    <div className={`rounded-xl p-4 border ${cfg.border} ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[8px] font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
        {signal.mentions != null && <span className="text-[8px] text-white/25">{signal.mentions} mentions</span>}
      </div>
      <p className="text-sm font-bold text-white/90 mb-3">{signal.sector}</p>
      {(signal.stocks?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {signal.stocks!.map(t => (
            <span key={t} className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border ${cfg.border} ${cfg.text} bg-black/20`}>{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function PredictSectorRotationSignals() {
  const { data: overview, isLoading } = useQuery<any>({
    queryKey: ["predict-investor-overview"],
    queryFn: () => fetch("/api/predict/investor/overview").then(r => r.ok ? r.json() : null).catch(() => null),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
  const investorSectors = transformInvestorSectors(overview?.sector_rotation);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
          <Layers className="w-3 h-3 text-white" />
        </div>
        <h3 className="text-base font-semibold text-white">Sector Rotation Signals</h3>
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">PREDICTION MARKET FLOWS</Badge>
      </div>
      <p className="text-xs text-white/30 mb-4">Which sectors are implied to be in or out by prediction market money flows</p>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-white/[0.04] animate-pulse" />)}
        </div>
      ) : investorSectors.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">Sector signals not yet available.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {investorSectors.map((s, i) => <InvestorSectorCard key={s.sector + s.type + i} signal={s} />)}
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
  const [externalResourcesOpen, setExternalResourcesOpen] = useState(false);
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
    onSuccess: (data: any) => {
      if (data?.summary) qc.setQueryData(["sector-rotation-analysis"], data);
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

  // ── Page context for chatbot ──────────────────────────────────────────────
  const _sectorsCtx = (() => {
    const parts = ['[Page: Themes & Sector Rotation]'];
    const regime = (dash as any)?.regime;
    if (regime?.market_posture) parts.push(`Market posture: ${regime.market_posture}`);
    if (regime?.leadership_style) parts.push(`Leadership style: ${regime.leadership_style}`);
    if (leaders.length) parts.push(`Leading sectors: ${leaders.join(', ')}`);
    if (laggards.length) parts.push(`Lagging sectors: ${laggards.join(', ')}`);
    if (sectors.length) {
      const top = sectors.slice(0,10).map(s=>`${s.ticker}(${s.regime_tag||'—'} ${s.change_1d!=null?`${s.change_1d>0?'+':''}${s.change_1d.toFixed(1)}%`:''})`).join(', ');
      parts.push(`Sector performance: ${top}`);
    }
    return parts.join('\n');
  })();
  useSetPageContext(_sectorsCtx, [dash, sectors, leaders, laggards]);

  useSetScreenContext((() => {
    const regime = (dash as any)?.regime;
    return {
      route: '/app/stocks/sectors',
      page: 'themes',
      row_count: sectors.length,
      visible_rows: sectors.slice(0, 20).map((s: any) => ({
        ticker: s.ticker,
        name: s.name ?? null,
        regime_tag: s.regime_tag ?? null,
        change_1d: s.change_1d ?? null,
        change_1w: s.change_1w ?? null,
        change_1m: s.change_1m ?? null,
        rotation_score: s.rotation_score ?? null,
        rs_rank: s.rs_rank ?? null,
      })),
      extra: {
        leaders,
        laggards,
        market_posture: regime?.market_posture ?? null,
        leadership_style: regime?.leadership_style ?? null,
        analysis_updated_at: dash?.analysis_updated_at ?? null,
        selected_tickers: Array.from(selectedTickers),
      },
      freshness: (dash as any)?.updated_at ?? undefined,
    };
  })(), [sectors, leaders, laggards, dash, selectedTickers]);

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

        {/* B + C: Unified card — Market Performance / Relative Strength / Line Graph */}
        <UnifiedThemesCard
          sectors={sectors} loading={dashLoading && !dash}
          selectedTickers={selectedTickers} onSelectTicker={selectTicker}
          onToggleTicker={toggleTicker}
        />

        {/* D: Top Stocks in Winning Sectors — winning sector chips in header */}
        <TopStocksPanel stocks={analysis?.top_stocks_to_watch} leaders={leaders} />

        {/* E: Agent Analysis */}
        <SectorAnalysisPanel
          analysis={analysis}
          analysisTs={analysisTs}
          loading={analysisLoading && !analysisRaw && !dash?.analysis}
          isNull={analysisNull}
          onRefresh={() => refreshMutation.mutate()}
          refreshing={refreshMutation.isPending}
        />

        {/* F: Sector Rotation Signals from Prophetik */}
        <PredictSectorRotationSignals />

        {/* ── External Resources (expandable accordion) ── */}
        <GlassCard className="p-3 sm:p-4 lg:p-6">
          <button
            onClick={() => setExternalResourcesOpen(v => !v)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                <ExternalLink className="w-3 h-3 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white">External Resources</h3>
            </div>
            <div className="flex items-center gap-2 text-white/40 group-hover:text-white/70 transition-colors">
              <span className="text-xs">{externalResourcesOpen ? "Collapse" : "Expand"}</span>
              {externalResourcesOpen
                ? <ChevronUp className="w-4 h-4" />
                : <ChevronDown className="w-4 h-4" />
              }
            </div>
          </button>

          {externalResourcesOpen && (
            <div className="mt-6 space-y-8">
              {/* ETF Heatmap */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-4 h-4 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-2.5 h-2.5 text-white" />
                  </div>
                  <h4 className="text-sm font-semibold text-white">ETF Heatmap</h4>
                  <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">ALL US ETFs</Badge>
                </div>
                <div className="w-full h-[600px] sm:h-[700px] rounded-lg overflow-hidden border border-white/[0.06]">
                  <ETFHeatmapWidget />
                </div>
              </div>

              {/* Stage Analysis Screener */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-2.5 h-2.5 text-white" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Stage Analysis Screener</h4>
                    <Badge className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border-white/[0.06] text-xs">SECTORS & FUNDS</Badge>
                  </div>
                  <button onClick={() => openInNewTab("https://screener.nextbigtrade.com/#/markets")}
                    className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Open Full View
                  </button>
                </div>
                <iframe src="https://screener.nextbigtrade.com/#/markets"
                  className="w-full h-[600px] rounded-lg border border-white/[0.06]"
                  title="Next Big Trade Sectors Screener" loading="eager" referrerPolicy="no-referrer"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
                  allow="fullscreen; clipboard-write; autoplay; camera; microphone; geolocation" frameBorder="0" />
              </div>

            </div>
          )}
        </GlassCard>

      </main>
    </div>
  );
}
