import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, TrendingUp, TrendingDown, RefreshCw, X, Eye,
  ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter,
  Clock, Crown, AlertTriangle, Link2, Gem, Users, BarChart3, Gauge,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface InsiderTransaction {
  accession_number: string;
  ticker:           string;
  company_name:     string;
  insider_name:     string;
  insider_role:     string;
  transaction_date: string;
  transaction_type: string;
  shares:           number | null;
  price:            number | null;
  total_value:      number | null;
  pct_change_since: number | null;
  cluster_size:     number | null;
  cluster_type:     string | null;
  context_tags:     string[];
  score:            number;
  pct_of_holdings:  number | null;
  post_tx_holdings: number | null;
}
interface ClusterMember {
  insider_name:     string;
  insider_role:     string;
  transaction_type: string;
  total_value:      number | null;
}
interface InsiderStats {
  total_transactions?: number;
  total_buys?:         number;
  buys?:               number;
  total_sales?:        number;
  sales?:              number;
  avg_buy_score?:      number;
  top_buy_ticker?:     string;
  top_sell_ticker?:    string;
  last_refresh?:       string | null;
  total_results?:      number;
}
interface ScoreField {
  score: number;
  max:   number;
  detail?: string;
}
type ScoreFieldValue = number | ScoreField;
interface ScoreBreakdown {
  size?:         ScoreFieldValue;
  role?:         ScoreFieldValue;
  context?:      ScoreFieldValue;
  cluster?:      ScoreFieldValue;
  track_record?: ScoreFieldValue;
  [key: string]: ScoreFieldValue | undefined;
}
interface RecentTx {
  accession_number: string;
  transaction_type: string;
  transaction_date: string;
  insider_name:     string;
  total_value:      number | null;
  score:            number;
}
interface InsiderDetail extends InsiderTransaction {
  return_30d:               number | null;
  return_90d:               number | null;
  vs_52w_high:              number | null;
  score_breakdown:          ScoreBreakdown;
  recent_transactions:      RecentTx[];
  cluster_start_date?:      string | null;
  cluster_end_date?:        string | null;
  cluster_members?:         ClusterMember[];
  date_spread_days?:        number | null;
  role_diversity?:          number | null;
  position_impact_variance?: string | null;
}
interface ApiResponse {
  transactions: InsiderTransaction[];
  total:        number;
  offset:       number;
  limit:        number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const GICS_SECTORS = [
  "Energy","Materials","Industrials","Consumer Discretionary","Consumer Staples",
  "Health Care","Financials","Information Technology","Communication Services",
  "Utilities","Real Estate",
];
const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (s: string | null): string => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
};
const fmtNum = (v: number | null): string =>
  v == null ? "—" : v.toLocaleString("en-US");
const fmtPx = (v: number | null): string =>
  v == null ? "—" : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtVal = (v: number | null): string => {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};
const fmtPct = (v: number | null): string =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const pctCls = (v: number | null) =>
  v == null ? "text-gray-500" : v >= 0 ? "text-emerald-400" : "text-red-400";

const normType = (t: string): "Buy" | "Sale" | "Exercise" | "Gift" | string => {
  if (!t) return t;
  const u = t.toUpperCase();
  if (u === "P" || u === "BUY"  || u === "PURCHASE")  return "Buy";
  if (u === "S" || u === "SALE" || u === "SELL")       return "Sale";
  if (u === "M" || u === "EXERCISE")                   return "Exercise";
  if (u === "G" || u === "GIFT")                       return "Gift";
  return t;
};

// Solid badge classes (matching the screenshot's solid colored pills)
const TYPE_BADGE_SOLID: Record<string, string> = {
  Buy:      "bg-emerald-500 text-white border-0",
  Sale:     "bg-red-500 text-white border-0",
  Exercise: "bg-blue-500 text-white border-0",
  Gift:     "bg-gray-500 text-white border-0",
};
// Lighter badge for detail panel
const TYPE_BADGE_PANEL: Record<string, string> = {
  Buy:      "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  Sale:     "bg-red-500/20 text-red-400 border-red-500/40",
  Exercise: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  Gift:     "bg-gray-500/20 text-gray-400 border-gray-500/40",
};

const scoreColor = (s: number) =>
  s >= 80 ? "#10b981" : s >= 65 ? "#f59e0b" : s >= 50 ? "#6b7280" : "#374151";
const scoreTextCls = (s: number) =>
  s >= 80 ? "text-emerald-400" : s >= 65 ? "text-amber-400" : "text-gray-400";

const clusterCls = (n: number | null) => {
  if (!n || n <= 2) return "bg-gray-500/20 text-gray-400";
  if (n <= 5)       return "bg-blue-500/20 text-blue-400";
  return "bg-purple-500/20 text-purple-400";
};
const CLUSTER_TYPE_LABEL: Record<string, string> = {
  coordinated_buy:  "BUY",
  coordinated_sell: "SELL",
  lockup_expiry:    "LOCK",
  mixed:            "MIX",
};
const CLUSTER_TYPE_TEXT_CLS: Record<string, string> = {
  coordinated_buy:  "text-emerald-400",
  coordinated_sell: "text-red-400",
  lockup_expiry:    "text-gray-400",
  mixed:            "text-amber-400",
};
const CLUSTER_TYPE_FULL: Record<string, string> = {
  coordinated_buy:  "Coordinated Buy",
  coordinated_sell: "Coordinated Sell",
  lockup_expiry:    "Likely Lockup Expiry",
  mixed:            "Mixed Activity",
};
const CLUSTER_TYPE_BADGE_CLS: Record<string, string> = {
  coordinated_buy:  "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  coordinated_sell: "bg-red-500/20 text-red-400 border-red-500/30",
  lockup_expiry:    "bg-gray-500/20 text-gray-400 border-gray-500/30",
  mixed:            "bg-amber-500/20 text-amber-400 border-amber-500/30",
};
const CLUSTER_PANEL_BORDER: Record<string, string> = {
  coordinated_buy:  "border-emerald-500/30",
  coordinated_sell: "border-red-500/30",
  lockup_expiry:    "border-white/10",
  mixed:            "border-amber-500/30",
};

const fmtTs = (s: string | null): string => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 14, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <div className={`animate-pulse bg-white/[0.06] rounded ${className}`} style={{ width: w, height: h }} />;
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats, loading, onRefresh, refreshing }: {
  stats: InsiderStats | undefined; loading: boolean; onRefresh: () => void; refreshing: boolean;
}) {
  const totalTx    = stats?.total_transactions;
  const totalBuys  = stats?.total_buys ?? stats?.buys;
  const totalSales = stats?.total_sales ?? stats?.sales;
  const avgScore   = stats?.avg_buy_score;

  const items = [
    { icon: Activity,      label: "TOTAL TRANSACTIONS", val: totalTx    != null ? totalTx.toLocaleString()    : "—", cls: "text-white" },
    { icon: TrendingUp,    label: "BUYS",               val: totalBuys  != null ? totalBuys.toLocaleString()  : "—", cls: "text-emerald-400" },
    { icon: TrendingDown,  label: "SALES",              val: totalSales != null ? totalSales.toLocaleString() : "—", cls: "text-red-400" },
    { icon: Gauge,         label: "AVG BUY SCORE",      val: avgScore   != null ? avgScore.toFixed(1)          : "—", cls: "text-amber-400" },
    { icon: Crown,         label: "TOP BUY",            val: stats?.top_buy_ticker  ?? "—",                          cls: "text-emerald-400" },
    { icon: AlertTriangle, label: "TOP SELL",           val: stats?.top_sell_ticker ?? "—",                          cls: "text-red-400" },
    { icon: Clock,         label: "LAST REFRESH",       val: fmtTs(stats?.last_refresh ?? null),                     cls: "text-gray-400" },
  ];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map(({ icon: Icon, label, val, cls }) => (
        <div key={label}
          className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.07] rounded-lg px-3.5 py-2.5 flex-1 min-w-[120px]">
          <Icon className={`w-4 h-4 flex-shrink-0 ${cls}`} />
          <div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold leading-none mb-0.5">{label}</div>
            <div className={`text-sm font-bold font-mono leading-tight ${cls}`}>
              {loading ? <Skel w={48} h={13} /> : val}
            </div>
          </div>
        </div>
      ))}
      <button onClick={onRefresh} disabled={refreshing}
        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-xs text-teal-300 transition-colors disabled:opacity-50 flex-shrink-0 h-full">
        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}

// ─── Quick Filters ────────────────────────────────────────────────────────────
type QuickFilter = "all" | "high-buy" | "high-sell" | "clustered" | "large";
type ClusterSubFilter = "all" | "coordinated_buy" | "coordinated_sell" | "lockup_expiry" | "mixed";

const CLUSTER_SUB_FILTERS: { id: ClusterSubFilter; label: string; cls: string; activeCls: string }[] = [
  { id: "all",              label: "All Clusters",      cls: "text-gray-500 border-white/[0.08]",         activeCls: "bg-white/10 border-white/20 text-white" },
  { id: "coordinated_buy",  label: "Coordinated Buys",  cls: "text-emerald-500/70 border-emerald-500/20", activeCls: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" },
  { id: "coordinated_sell", label: "Coordinated Sells", cls: "text-red-500/70 border-red-500/20",         activeCls: "bg-red-500/15 border-red-500/40 text-red-300" },
  { id: "lockup_expiry",    label: "Lockup Expiry",     cls: "text-gray-500 border-white/[0.08]",         activeCls: "bg-white/10 border-white/20 text-white" },
  { id: "mixed",            label: "Mixed",             cls: "text-amber-500/70 border-amber-500/20",     activeCls: "bg-amber-500/15 border-amber-500/40 text-amber-300" },
];

function QuickFilters({
  active, onChange, clusterSub, onClusterSub,
}: {
  active: QuickFilter; onChange: (f: QuickFilter) => void;
  clusterSub: ClusterSubFilter; onClusterSub: (f: ClusterSubFilter) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mr-1">QUICK:</span>

        {/* All */}
        <button onClick={() => onChange("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active === "all" ? "bg-white/10 border-white/25 text-white" : "bg-transparent border-white/[0.08] text-gray-500 hover:text-gray-300"}`}>
          <Filter className="w-3 h-3" />
          All
        </button>

        {/* High-Conviction Buys */}
        <button onClick={() => onChange("high-buy")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active === "high-buy" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-transparent border-emerald-500/20 text-emerald-500/70 hover:text-emerald-400"}`}>
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
          High-Conviction Buys
        </button>

        {/* High-Conviction Sells */}
        <button onClick={() => onChange("high-sell")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active === "high-sell" ? "bg-red-500/15 border-red-500/40 text-red-300" : "bg-transparent border-red-500/20 text-red-500/70 hover:text-red-400"}`}>
          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
          High-Conviction Sells
        </button>

        {/* Clustered */}
        <button onClick={() => onChange("clustered")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active === "clustered" ? "bg-blue-500/15 border-blue-500/40 text-blue-300" : "bg-transparent border-blue-500/20 text-blue-500/70 hover:text-blue-400"}`}>
          <Users className="w-3 h-3" />
          Clustered
        </button>

        {/* Large Trades */}
        <button onClick={() => onChange("large")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${active === "large" ? "bg-purple-500/15 border-purple-500/40 text-purple-300" : "bg-transparent border-purple-500/20 text-purple-500/70 hover:text-purple-400"}`}>
          <Gem className="w-3 h-3" />
          Large Trades
        </button>
      </div>

      {active === "clustered" && (
        <div className="flex flex-wrap gap-1.5 pl-[72px]">
          {CLUSTER_SUB_FILTERS.map(sf => (
            <button key={sf.id} onClick={() => onClusterSub(sf.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${clusterSub === sf.id ? sf.activeCls : `bg-transparent ${sf.cls}`}`}>
              {sf.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Filter Row ───────────────────────────────────────────────────────────────
interface Filters {
  search:    string;
  type:      string;
  sector:    string;
  timeframe: string;
  min_score: string;
}
function FilterRow({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const update = (k: keyof Filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...filters, [k]: e.target.value });
  const selCls = "bg-[#0d1117] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-teal-500/50 min-w-0 cursor-pointer";
  const isFiltered = !!(filters.search || filters.type || filters.sector || (filters.timeframe && filters.timeframe !== "6m") || filters.min_score);
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
        <input value={filters.search} onChange={update("search")} placeholder="Search ticker, company, insider…"
          className="w-full bg-[#0d1117] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-teal-500/50" />
      </div>
      <select value={filters.type} onChange={update("type")} className={selCls}>
        <option value="">All Types</option>
        <option value="P">Buys</option>
        <option value="S">Sales</option>
        <option value="M">Exercises</option>
        <option value="G">Gifts</option>
      </select>
      <select value={filters.sector} onChange={update("sector")} className={selCls}>
        <option value="">All Sectors</option>
        {GICS_SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={filters.timeframe} onChange={update("timeframe")} className={selCls}>
        <option value="1w">1 Week</option>
        <option value="1m">1 Month</option>
        <option value="3m">3 Months</option>
        <option value="6m">6 Months</option>
      </select>
      <select value={filters.min_score} onChange={update("min_score")} className={selCls}>
        <option value="">Any Score</option>
        <option value="80">80+</option>
        <option value="70">70+</option>
        <option value="60">60+</option>
        <option value="50">50+</option>
      </select>
      {isFiltered && (
        <span className="text-[10px] font-semibold text-teal-400 border border-teal-500/30 rounded-full px-2.5 py-1 bg-teal-500/[0.07]">
          Filtered
        </span>
      )}
    </div>
  );
}

// ─── Score Cell (table) ───────────────────────────────────────────────────────
function ScoreCell({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="w-[3px] h-5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 h-1 bg-white/[0.07] rounded-full overflow-hidden" style={{ maxWidth: 44 }}>
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
type SortKey = "score" | "transaction_date" | "shares" | "total_value" | "pct_change_since";

function InsiderTable({
  rows, loading, sortKey, sortDir, onSort, onRowClick, selectedId,
}: {
  rows: InsiderTransaction[]; loading: boolean;
  sortKey: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  onRowClick: (tx: InsiderTransaction) => void;
  selectedId: string | null;
}) {
  const Th = ({ label, k, hidden }: { label: string; k?: SortKey; hidden?: boolean }) => (
    <th onClick={k ? () => onSort(k) : undefined}
      className={`px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-black/30 ${k ? "cursor-pointer select-none hover:text-gray-300 transition-colors" : ""} ${hidden ? "hidden xl:table-cell" : ""}`}>
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
      <div className="space-y-px">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-3 px-3 py-2.5 bg-white/[0.02]">
            <Skel w={72} /><Skel w={48} /><Skel w={130} /><Skel w={110} /><Skel w={80} /><Skel w={60} />
          </div>
        ))}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Eye className="w-10 h-10 text-gray-700 mb-3" />
        <p className="text-sm text-gray-500">No insider transactions found</p>
        <p className="text-xs text-gray-600 mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px]">
        <thead>
          <tr className="border-b border-white/[0.07]">
            <Th label="Score"   k="score" />
            <Th label="Ticker" />
            <Th label="Company" />
            <Th label="Insider" />
            <Th label="Role" />
            <Th label="Date"    k="transaction_date" />
            <Th label="Type" />
            <Th label="Shares"  k="shares" />
            <Th label="Price" />
            <Th label="Value"   k="total_value" />
            <Th label="% Chg"   k="pct_change_since" />
            <Th label="Cluster" hidden />
            <Th label="Context" hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const type   = normType(row.transaction_type);
            const isBuy  = type === "Buy";
            const isSale = type === "Sale";
            const sel    = selectedId === row.accession_number;
            return (
              <tr key={row.accession_number} onClick={() => onRowClick(row)}
                className={`border-b border-white/[0.04] cursor-pointer transition-colors ${
                  sel
                    ? "bg-teal-500/[0.08] border-l-2 border-l-teal-500"
                    : idx % 2 === 0
                      ? "bg-transparent hover:bg-white/[0.025]"
                      : "bg-white/[0.012] hover:bg-white/[0.03]"
                }`}>
                {/* Score */}
                <td className="px-3 py-2 w-[120px]">
                  <ScoreCell score={row.score} />
                </td>
                {/* Ticker */}
                <td className="px-3 py-2">
                  <span className={`font-mono font-bold text-sm tracking-wide ${isBuy ? "text-emerald-400" : isSale ? "text-red-400" : "text-white"}`}>
                    {row.ticker}
                  </span>
                </td>
                {/* Company */}
                <td className="px-3 py-2 text-xs text-gray-500 max-w-[140px] truncate">{row.company_name}</td>
                {/* Insider */}
                <td className="px-3 py-2 text-xs font-semibold text-gray-200 max-w-[130px] truncate">{row.insider_name}</td>
                {/* Role */}
                <td className="px-3 py-2 text-xs text-gray-500 max-w-[110px] truncate">{row.insider_role}</td>
                {/* Date */}
                <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(row.transaction_date)}</td>
                {/* Type */}
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${TYPE_BADGE_SOLID[type] ?? "bg-gray-600 text-white"}`}>
                    {type}
                  </span>
                </td>
                {/* Shares */}
                <td className="px-3 py-2 text-xs font-mono text-gray-300 tabular-nums">{fmtNum(row.shares)}</td>
                {/* Price */}
                <td className="px-3 py-2 text-xs font-mono text-gray-300 tabular-nums">{fmtPx(row.price)}</td>
                {/* Value */}
                <td className={`px-3 py-2 text-xs font-mono tabular-nums font-semibold ${isBuy ? "text-emerald-400" : isSale ? "text-red-400" : "text-gray-300"}`}>
                  {fmtVal(row.total_value)}
                </td>
                {/* % Chg */}
                <td className={`px-3 py-2 text-xs font-mono tabular-nums ${pctCls(row.pct_change_since)}`}>
                  {fmtPct(row.pct_change_since)}
                </td>
                {/* Cluster */}
                <td className="px-3 py-2 hidden xl:table-cell">
                  {row.cluster_size != null && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${clusterCls(row.cluster_size)}`}>
                        {row.cluster_size}
                      </span>
                      {row.cluster_type && CLUSTER_TYPE_LABEL[row.cluster_type] && (
                        <span className={`text-[8px] font-bold leading-none ${CLUSTER_TYPE_TEXT_CLS[row.cluster_type] ?? "text-gray-400"}`}>
                          {CLUSTER_TYPE_LABEL[row.cluster_type]}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                {/* Context */}
                <td className="px-3 py-2 hidden xl:table-cell max-w-[200px]">
                  <div className="flex flex-wrap gap-1">
                    {(row.context_tags ?? []).slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] bg-white/[0.04] border border-white/[0.06] rounded px-1.5 py-0.5 text-gray-500">{tag}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ total, offset, limit, onChange }: {
  total: number; offset: number; limit: number; onChange: (o: number) => void;
}) {
  const page     = Math.floor(offset / limit) + 1;
  const totalPgs = Math.ceil(total / limit);
  const from     = offset + 1;
  const to       = Math.min(offset + limit, total);
  return (
    <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-white/[0.06] mt-3 flex-wrap gap-2">
      <span>Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()} results</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(0, offset - limit))} disabled={offset === 0}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
          ← Prev
        </button>
        <span className="px-2 text-gray-400">Page {page} of {totalPgs}</span>
        <button onClick={() => onChange(offset + limit)} disabled={page >= totalPgs}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Score Breakdown (detail panel) ───────────────────────────────────────────
function resolveScoreField(v: ScoreFieldValue | undefined, fallbackMax: number): { num: number; max: number } {
  if (v == null)             return { num: 0, max: fallbackMax };
  if (typeof v === "number") return { num: v, max: fallbackMax };
  return { num: v.score ?? 0, max: v.max ?? fallbackMax };
}

const BREAKDOWN_COLORS = ["#3b82f6","#06b6d4","#10b981","#a3e635","#f59e0b"];

function DetailScoreBar({
  label, value, max, color,
}: { label: string; value: ScoreFieldValue | undefined; max: number; color: string }) {
  const { num, max: resolvedMax } = resolveScoreField(value, max);
  const pct = resolvedMax > 0 ? Math.min((num / resolvedMax) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-[90px] flex-shrink-0 text-[10px] text-gray-400 text-right leading-tight truncate">
        {label} <span className="text-gray-600">({resolvedMax})</span>
      </div>
      <div className="flex-1 h-3 bg-white/[0.06] rounded-sm overflow-hidden">
        <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-6 text-right text-[10px] font-mono font-bold flex-shrink-0" style={{ color }}>{num}</div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ accession, onClose }: { accession: string; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery<InsiderDetail>({
    queryKey: ["insider-detail", accession],
    queryFn: async () => {
      const r = await fetch(`/api/insider-activity/detail/${accession}`);
      if (!r.ok) throw new Error("Failed to load detail");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const type  = detail ? normType(detail.transaction_type) : "";
  const isBuy = type === "Buy";

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] z-50 flex flex-col bg-[#06080f] border-l border-white/[0.08] shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] flex-shrink-0">
        {detail ? (
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-white font-mono tracking-wide">{detail.ticker}</span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${TYPE_BADGE_SOLID[type] ?? "bg-gray-600 text-white"}`}>{type}</span>
          </div>
        ) : <div className="flex gap-2"><Skel w={64} h={28} /><Skel w={44} h={22} /></div>}
        <button onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {isLoading ? (
          <div className="space-y-3"><Skel h={100} /><Skel h={140} /><Skel h={80} /><Skel h={120} /></div>
        ) : detail ? (
          <>
            {/* Conviction Score */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-3">Conviction Score</div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className={`text-5xl font-bold font-mono leading-none ${scoreTextCls(detail.score)}`}>{detail.score}</span>
                <span className="text-gray-500 text-base">/ 100</span>
              </div>
              {/* Gradient conviction bar */}
              <div className="h-2.5 bg-white/[0.07] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${detail.score}%`,
                    background: `linear-gradient(to right, #10b981, ${detail.score >= 70 ? "#10b981" : detail.score >= 50 ? "#f59e0b" : "#ef4444"})`,
                  }} />
              </div>
            </div>

            {/* Transaction Info grid */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2.5">Transaction Info</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {([
                  ["Company",          detail.company_name],
                  ["Insider",          detail.insider_name],
                  ["Role",             detail.insider_role],
                  ["Filed",            fmtDate(detail.transaction_date)],
                  ["Shares",           fmtNum(detail.shares)],
                  ["Price",            fmtPx(detail.price)],
                  ["Total Value",      fmtVal(detail.total_value)],
                  ["Post-Tx Holdings", fmtNum(detail.post_tx_holdings)],
                  ["% of Holdings",    detail.pct_of_holdings != null ? `${detail.pct_of_holdings.toFixed(1)}%` : "—"],
                  ["Cluster Size",     detail.cluster_size != null ? String(detail.cluster_size) : "—"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-0.5 font-medium">{k}</div>
                    <div className="text-xs text-gray-200 font-mono truncate">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Context Tags */}
            {(detail.context_tags ?? []).length > 0 && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Context Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {detail.context_tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-white/[0.05] border border-white/[0.09] rounded-full px-2.5 py-1 text-gray-400">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Price Context */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2.5">Price Context</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ["30D RETURN",  detail.return_30d],
                  ["90D RETURN",  detail.return_90d],
                  ["VS 52W HIGH", detail.vs_52w_high],
                ] as [string, number | null][]).map(([k, v]) => (
                  <div key={k} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 text-center">
                    <div className="text-[9px] text-gray-600 uppercase tracking-widest mb-1.5 font-medium">{k}</div>
                    <div className={`text-sm font-bold font-mono ${pctCls(v)}`}>{v != null ? fmtPct(v) : "—"}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Breakdown */}
            {detail.score_breakdown && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-3">Score Breakdown</div>
                <DetailScoreBar label="Size"         value={detail.score_breakdown.size}         max={20} color={BREAKDOWN_COLORS[0]} />
                <DetailScoreBar label="Role"         value={detail.score_breakdown.role}         max={15} color={BREAKDOWN_COLORS[1]} />
                <DetailScoreBar label="Context"      value={detail.score_breakdown.context}      max={15} color={BREAKDOWN_COLORS[2]} />
                <DetailScoreBar label="Cluster"      value={detail.score_breakdown.cluster}      max={10} color={BREAKDOWN_COLORS[3]} />
                <DetailScoreBar label="Track Record" value={detail.score_breakdown.track_record} max={10} color={BREAKDOWN_COLORS[4]} />
              </div>
            )}

            {/* Cluster Analysis */}
            {(detail.cluster_size ?? 0) >= 2 && (
              <div className={`border rounded-xl p-4 space-y-3 ${CLUSTER_PANEL_BORDER[detail.cluster_type ?? ""] ?? "border-white/[0.07]"}`}>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Cluster Analysis</div>
                {detail.cluster_type && (
                  <Badge className={`border text-[10px] px-2 py-0.5 ${CLUSTER_TYPE_BADGE_CLS[detail.cluster_type] ?? ""}`}>
                    {CLUSTER_TYPE_FULL[detail.cluster_type] ?? detail.cluster_type}
                  </Badge>
                )}
                {(detail.cluster_start_date || detail.cluster_end_date) && (
                  <p className="text-[11px] text-gray-400">
                    {detail.cluster_size} insiders active
                    {detail.cluster_start_date && <> between <span className="text-white">{fmtDate(detail.cluster_start_date)}</span></>}
                    {detail.cluster_end_date   && <> and <span className="text-white">{fmtDate(detail.cluster_end_date)}</span></>}
                  </p>
                )}
                {(detail.cluster_members ?? []).length > 0 && (
                  <div className="space-y-1">
                    {detail.cluster_members!.map((m, i) => {
                      const mt = normType(m.transaction_type);
                      return (
                        <div key={i} className="flex items-center gap-2 text-[10px] bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-1.5">
                          <span className="text-gray-300 font-semibold flex-1 truncate">{m.insider_name}</span>
                          <span className="text-gray-500 truncate max-w-[80px]">{m.insider_role}</span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${TYPE_BADGE_SOLID[mt] ?? "bg-gray-600 text-white"}`}>{mt}</span>
                          <span className="font-mono text-gray-300 flex-shrink-0">{fmtVal(m.total_value)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {detail.cluster_type === "coordinated_sell" && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {detail.date_spread_days != null && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                        <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Date Spread</div>
                        <div className="text-xs font-mono text-gray-300">{detail.date_spread_days}d</div>
                      </div>
                    )}
                    {detail.role_diversity != null && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                        <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Role Diversity</div>
                        <div className="text-xs font-mono text-gray-300">{detail.role_diversity} roles</div>
                      </div>
                    )}
                    {detail.position_impact_variance && (
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-2 text-center">
                        <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-0.5">Impact Var.</div>
                        <div className="text-xs font-mono text-gray-300 capitalize">{detail.position_impact_variance}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Recent Activity */}
            {(detail.recent_transactions ?? []).length > 0 && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2.5">
                  Recent {detail.ticker} Insider Activity
                </div>
                <div className="space-y-1.5">
                  {detail.recent_transactions.slice(0, 5).map(tx => {
                    const tt = normType(tx.transaction_type);
                    return (
                      <div key={tx.accession_number}
                        className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0 ${TYPE_BADGE_SOLID[tt] ?? "bg-gray-600 text-white"}`}>{tt}</span>
                        <span className="text-[10px] text-gray-500 flex-shrink-0">{fmtDate(tx.transaction_date)}</span>
                        <span className="text-[10px] text-gray-300 font-semibold truncate flex-1">{tx.insider_name}</span>
                        <span className="text-[10px] font-mono text-gray-300 flex-shrink-0">{fmtVal(tx.total_value)}</span>
                        <span className={`text-[10px] font-mono font-bold flex-shrink-0 ${scoreTextCls(tx.score)}`}>{tx.score}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-16 text-gray-600 text-sm">Failed to load detail</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const DEFAULT_FILTERS: Filters = { search: "", type: "", sector: "", timeframe: "6m", min_score: "" };

export default function InsiderActivityPage() {
  const [filters,          setFilters]          = useState<Filters>(DEFAULT_FILTERS);
  const [quickFilter,      setQuickFilter]      = useState<QuickFilter>("all");
  const [clusterSubFilter, setClusterSubFilter] = useState<ClusterSubFilter>("all");
  const [sortKey,          setSortKey]          = useState<SortKey>("score");
  const [sortDir,          setSortDir]          = useState<"asc" | "desc">("desc");
  const [offset,           setOffset]           = useState(0);
  const [selectedTx,       setSelectedTx]       = useState<InsiderTransaction | null>(null);
  const [lastUpdated,      setLastUpdated]      = useState<number>(Date.now());
  const qc = useQueryClient();

  const qp = useMemo(() => {
    const p: Record<string, string> = {
      sort: sortKey, order: sortDir, limit: String(PAGE_SIZE), offset: String(offset),
    };
    if (filters.search)    p.search    = filters.search;
    if (filters.type)      p.type      = filters.type;
    if (filters.sector)    p.sector    = filters.sector;
    if (filters.timeframe) p.timeframe = filters.timeframe;
    if (filters.min_score) p.min_score = filters.min_score;
    if (quickFilter === "high-buy")  { p.type = "P"; p.min_score = "70"; }
    if (quickFilter === "high-sell") { p.type = "S"; p.min_score = "70"; }
    if (quickFilter === "clustered") {
      p.clustered_only = "true";
      if (clusterSubFilter !== "all") p.cluster_type = clusterSubFilter;
    }
    if (quickFilter === "large") { p.min_value = "1000000"; }
    return new URLSearchParams(p).toString();
  }, [filters, quickFilter, clusterSubFilter, sortKey, sortDir, offset]);

  const { data: apiData, isLoading, isFetching } = useQuery<ApiResponse>({
    queryKey: ["insider-activity", qp],
    queryFn:  async () => {
      const r = await fetch(`/api/insider-activity?${qp}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<InsiderStats>({
    queryKey: ["insider-activity-stats"],
    queryFn:  async () => {
      const r = await fetch("/api/insider-activity/stats");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { mutate: doRefresh, isPending: refreshing } = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/insider-activity/refresh", { method: "POST" });
      if (!r.ok) throw new Error("Refresh failed");
      return r.json();
    },
    onSuccess: () => {
      setLastUpdated(Date.now());
      qc.invalidateQueries({ queryKey: ["insider-activity"] });
      qc.invalidateQueries({ queryKey: ["insider-activity-stats"] });
    },
  });

  useEffect(() => {
    if (selectedTx) return;
    const id = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["insider-activity"] });
      qc.invalidateQueries({ queryKey: ["insider-activity-stats"] });
      setLastUpdated(Date.now());
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [selectedTx, qc]);

  const handleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
    setOffset(0);
  };
  const handleFilterChange   = (f: Filters)          => { setFilters(f);         setOffset(0); };
  const handleQuickFilter    = (f: QuickFilter)       => { setQuickFilter(f);     setClusterSubFilter("all"); setOffset(0); };
  const handleClusterSubFilter = (f: ClusterSubFilter) => { setClusterSubFilter(f); setOffset(0); };

  const rows  = apiData?.transactions ?? [];
  const total = apiData?.total ?? stats?.total_results ?? 0;

  return (
    <div className="min-h-screen bg-[#06080f] p-3 sm:p-4 lg:p-6 space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Eye className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">Insider Activity</h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest">Live</span>
            </span>
          </div>
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-0.5">SEC Form 4 Filings · Ranked by Conviction Score</p>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <StatsBar stats={stats} loading={statsLoading} onRefresh={() => doRefresh()} refreshing={refreshing} />

      {/* ── Filters ── */}
      <div className="bg-white/[0.025] border border-white/[0.07] rounded-xl px-4 py-3 space-y-3">
        <QuickFilters
          active={quickFilter} onChange={handleQuickFilter}
          clusterSub={clusterSubFilter} onClusterSub={handleClusterSubFilter}
        />
        <div className="h-px bg-white/[0.05]" />
        <FilterRow filters={filters} onChange={handleFilterChange} />
      </div>

      {/* ── Table ── */}
      <div className="bg-white/[0.025] border border-white/[0.07] rounded-xl overflow-hidden">
        {/* Table header bar */}
        <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-semibold text-white">Transactions</span>
            {isFetching && !isLoading && (
              <span className="text-[10px] text-gray-600 ml-1 animate-pulse">updating…</span>
            )}
          </div>
          <span className="text-xs text-gray-600">{total.toLocaleString()} results</span>
        </div>

        <InsiderTable
          rows={rows}
          loading={isLoading}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={setSelectedTx}
          selectedId={selectedTx?.accession_number ?? null}
        />

        {rows.length > 0 && (
          <div className="px-4 pb-4">
            <Pagination total={total} offset={offset} limit={PAGE_SIZE} onChange={setOffset} />
          </div>
        )}
      </div>

      {/* ── Detail Panel ── */}
      {selectedTx && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 sm:hidden" onClick={() => setSelectedTx(null)} />
          <div className="fixed inset-0 bg-black/30 z-40 hidden sm:block pointer-events-none" />
          <DetailPanel accession={selectedTx.accession_number} onClose={() => setSelectedTx(null)} />
        </>
      )}
    </div>
  );
}
