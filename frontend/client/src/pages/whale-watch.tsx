import { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw, X, ChevronUp, ChevronDown, ChevronsUpDown,
  Waves, Building2, User, Landmark, TrendingUp, TrendingDown,
  BarChart3, Brain, Trophy,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════
interface Whale {
  name:       string;
  category:   "institution" | "individual" | "congress" | string;
  ai_theme:   string;
  return_1m:  number | null;
  return_3m:  number | null;
  return_6m:  number | null;
  return_1y:  number | null;
  updated_at?: string | null;
}

interface Holding {
  rank:         number;
  ticker:       string;
  company_name: string;
  shares:       number | null;
  value:        number | null;
  weight_pct:   number | null;
}

interface ReturnPeriod {
  period:       string;
  whale_return: number | null;
  spy_return:   number | null;
}

interface WhaleReturns {
  periods: ReturnPeriod[];
}

type SortKey = "return_1m" | "return_3m" | "return_6m" | "return_1y";
type SortDir = "asc" | "desc";

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════
const fmtPct = (v: number | null) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const pctCls = (v: number | null) =>
  v == null ? "text-white/30" : v >= 0 ? "text-emerald-400" : "text-red-400";

const fmtVal = (v: number | null): string => {
  if (v == null) return "—";
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
  if (a >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

const fmtNum = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("en-US");

const fmtTs = (s: string | null | undefined): string => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const CAT_BADGE: Record<string, string> = {
  institution: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  individual:  "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  congress:    "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
};
const CAT_ICON: Record<string, React.ReactNode> = {
  institution: <Building2 className="w-3 h-3" />,
  individual:  <User className="w-3 h-3" />,
  congress:    <Landmark className="w-3 h-3" />,
};
const catBadge = (c: string) => {
  const cls = CAT_BADGE[c] ?? "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  const icon = CAT_ICON[c] ?? <User className="w-3 h-3" />;
  const label = c.charAt(0).toUpperCase() + c.slice(1);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Skeleton
// ═══════════════════════════════════════════════════════════════════════════════
function Skel({ w = "100%", h = 14, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <div className={`animate-pulse bg-white/[0.06] rounded ${className}`} style={{ width: w, height: h }} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sort header helper
// ═══════════════════════════════════════════════════════════════════════════════
function SortTh({
  label, col, sortKey, sortDir, onClick,
}: { label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir; onClick: (c: SortKey) => void }) {
  const active = sortKey === col;
  return (
    <th
      className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap"
      onClick={() => onClick(col)}
    >
      <span className={`inline-flex items-center justify-end gap-1 ${active ? "text-[hsl(200,90%,58%)]" : "text-white/30 hover:text-white/60"} transition-colors`}>
        {label}
        {active
          ? sortDir === "desc"
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronUp className="w-3 h-3" />
          : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
      </span>
    </th>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Holdings Tab
// ═══════════════════════════════════════════════════════════════════════════════
function HoldingsTab({ whaleName }: { whaleName: string }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/whales/${encodeURIComponent(whaleName)}/holdings`)
      .then(r => r.ok ? r.json() : Promise.reject(`Error ${r.status}`))
      .then(d => {
        const arr: Holding[] = Array.isArray(d) ? d : (d.holdings ?? []);
        setHoldings(arr.slice(0, 20));
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [whaleName]);

  const maxWeight = useMemo(() => Math.max(...holdings.map(h => h.weight_pct ?? 0), 1), [holdings]);

  if (loading) return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 8 }).map((_, i) => <Skel key={i} h={32} />)}
    </div>
  );
  if (error) return <div className="p-6 text-center text-red-400 text-sm">{error}</div>;
  if (!holdings.length) return <div className="p-6 text-center text-white/30 text-sm">No holdings data available.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30 w-8">#</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Ticker</th>
            <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Company</th>
            <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-white/30">Shares</th>
            <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-white/30">Value</th>
            <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-white/30 w-32">Weight</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              <td className="px-3 py-2 text-[11px] text-white/25 font-mono">{h.rank ?? i + 1}</td>
              <td className="px-3 py-2">
                <span className="text-[11px] font-bold font-mono text-[hsl(200,90%,58%)]">{h.ticker || "—"}</span>
              </td>
              <td className="px-3 py-2 text-[11px] text-white/70">{h.company_name || "—"}</td>
              <td className="px-3 py-2 text-right text-[11px] font-mono text-white/50">{fmtNum(h.shares)}</td>
              <td className="px-3 py-2 text-right text-[11px] font-mono text-white/70">{fmtVal(h.value)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[11px] font-mono text-white/60 w-10 text-right">
                    {h.weight_pct != null ? `${h.weight_pct.toFixed(1)}%` : "—"}
                  </span>
                  <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[hsl(200,90%,58%)] rounded-full"
                      style={{ width: `${Math.min(100, ((h.weight_pct ?? 0) / maxWeight) * 100)}%` }}
                    />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Returns Tab
// ═══════════════════════════════════════════════════════════════════════════════
function ReturnsTab({ whaleName }: { whaleName: string }) {
  const [data, setData]     = useState<WhaleReturns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/whales/${encodeURIComponent(whaleName)}/returns`)
      .then(r => r.ok ? r.json() : Promise.reject(`Error ${r.status}`))
      .then(d => setData(d))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [whaleName]);

  if (loading) return (
    <div className="p-4 space-y-3">
      <Skel h={200} />
    </div>
  );
  if (error) return <div className="p-6 text-center text-red-400 text-sm">{error}</div>;
  if (!data?.periods?.length) return <div className="p-6 text-center text-white/30 text-sm">No returns data available.</div>;

  const chartData = data.periods.map(p => ({
    period: p.period,
    Whale:  p.whale_return,
    SPY:    p.spy_return,
  }));

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#0d0e14] border border-white/[0.08] rounded-lg p-2.5 text-xs shadow-xl">
        <div className="text-white/50 mb-1.5 font-medium">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-white/60">{p.name}:</span>
            <span className={p.value >= 0 ? "text-emerald-400" : "text-red-400"}>
              {fmtPct(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-4 text-[11px] text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-[hsl(200,90%,58%)] inline-block" /> Whale
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-amber-400 inline-block" /> SPY Benchmark
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
          <XAxis dataKey="period" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={false} tickLine={false}
            tickFormatter={v => `${v > 0 ? "+" : ""}${v}%`}
          />
          <Tooltip content={customTooltip} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Bar dataKey="Whale" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={(entry.Whale ?? 0) >= 0 ? "hsl(200,90%,58%)" : "#ef4444"}
              />
            ))}
          </Bar>
          <Bar dataKey="SPY" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={(entry.SPY ?? 0) >= 0 ? "#f59e0b" : "#dc2626"}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Theme Tab
// ═══════════════════════════════════════════════════════════════════════════════
function ThemeTab({ whale }: { whale: Whale }) {
  return (
    <div className="p-6">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 mb-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(200,90%,58%)/20] to-purple-500/20 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            {CAT_ICON[whale.category] ?? <User className="w-5 h-5 text-white/40" />}
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">{whale.name}</h3>
            <div className="mt-1 mb-3">{catBadge(whale.category)}</div>
            <p className="text-white/40 text-xs">
              {whale.category === "institution" && "Institutional investor tracked by 13F filings"}
              {whale.category === "individual"  && "High-net-worth individual investor"}
              {whale.category === "congress"    && "U.S. Congressional member — STOCK Act disclosures"}
              {!["institution","individual","congress"].includes(whale.category) && "Tracked investor"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[hsl(200,90%,58%)/5] to-purple-500/5 border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-[hsl(200,90%,58%)]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">AI Investment Theme</span>
        </div>
        <p className="text-white/80 text-sm leading-relaxed italic">"{whale.ai_theme || "No theme available."}"</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "1M Return", value: whale.return_1m },
          { label: "3M Return", value: whale.return_3m },
          { label: "6M Return", value: whale.return_6m },
          { label: "1Y Return", value: whale.return_1y },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-lg font-bold font-mono ${pctCls(value)}`}>{fmtPct(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Whale Detail Modal
// ═══════════════════════════════════════════════════════════════════════════════
function WhaleModal({ whale, onClose }: { whale: Whale; onClose: () => void }) {
  const [tab, setTab] = useState<"holdings" | "returns" | "theme">("holdings");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden"
        style={{ background: "#0a0b0f" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Waves className="w-5 h-5 text-[hsl(200,90%,58%)]" />
            <div>
              <h2 className="text-white font-semibold text-sm">{whale.name}</h2>
              <div className="mt-0.5">{catBadge(whale.category)}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] flex-shrink-0 px-4 pt-2">
          {(["holdings", "returns", "theme"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-medium capitalize transition-all border-b-2 -mb-px ${
                tab === t
                  ? "text-[hsl(200,90%,58%)] border-[hsl(200,90%,58%)]"
                  : "text-white/35 border-transparent hover:text-white/60"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === "holdings" && <HoldingsTab whaleName={whale.name} />}
          {tab === "returns"  && <ReturnsTab  whaleName={whale.name} />}
          {tab === "theme"    && <ThemeTab    whale={whale} />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function WhaleWatchPage() {
  const [whales, setWhales]         = useState<Whale[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortKey, setSortKey]       = useState<SortKey>("return_3m");
  const [sortDir, setSortDir]       = useState<SortDir>("desc");
  const [selected, setSelected]     = useState<Whale | null>(null);

  const loadWhales = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/whales");
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const d = await r.json();
      setWhales(Array.isArray(d) ? d : (d.whales ?? []));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load whale data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWhales(); }, [loadWhales]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/whales/refresh", { method: "POST" });
      await loadWhales();
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(col); setSortDir("desc"); }
  };

  const sorted = useMemo(() => {
    return [...whales].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [whales, sortKey, sortDir]);

  const lastUpdated = useMemo(() => {
    const ts = whales.map(w => w.updated_at).filter(Boolean).sort().pop();
    return ts ?? null;
  }, [whales]);

  // Summary stats
  const counts = useMemo(() => ({
    total:       whales.length,
    institution: whales.filter(w => w.category === "institution").length,
    individual:  whales.filter(w => w.category === "individual").length,
    congress:    whales.filter(w => w.category === "congress").length,
  }), [whales]);

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "#050608" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[hsl(200,90%,58%)/10] border border-[hsl(200,90%,58%)/20] flex items-center justify-center">
              <Waves className="w-5 h-5 text-[hsl(200,90%,58%)]" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Whale Watch</h1>
          </div>
          <p className="text-[12px] text-white/35 ml-12">
            Track the world's most profitable institutional investors
          </p>
          {lastUpdated && (
            <p className="text-[10px] text-white/20 ml-12 mt-0.5">
              Last updated: {fmtTs(lastUpdated)}
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Data
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Tracked", value: counts.total, icon: <Waves className="w-4 h-4 text-[hsl(200,90%,58%)]" />, cls: "text-[hsl(200,90%,58%)]" },
          { label: "Institutions",  value: counts.institution, icon: <Building2 className="w-4 h-4 text-blue-400" />, cls: "text-blue-400" },
          { label: "Individuals",   value: counts.individual,  icon: <User className="w-4 h-4 text-purple-400" />,   cls: "text-purple-400" },
          { label: "Congress",      value: counts.congress,    icon: <Landmark className="w-4 h-4 text-emerald-400" />, cls: "text-emerald-400" },
        ].map(({ label, value, icon, cls }) => (
          <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              {icon}
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${cls}`}>
              {loading ? <Skel w={40} h={28} /> : value}
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <TrendingDown className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadWhales} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Whale Leaderboard</span>
          {!loading && <span className="ml-auto text-[10px] text-white/20">{whales.length} whales tracked</span>}
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skel w={20} h={14} />
                <Skel w="35%" h={14} />
                <Skel w={60} h={18} />
                <Skel w={50} h={14} className="ml-auto" />
                <Skel w={50} h={14} />
                <Skel w={50} h={14} />
                <Skel w={50} h={14} />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 && !error ? (
          <div className="p-12 text-center text-white/25 text-sm">No whale data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30 w-8">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Whale</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Category</th>
                  <SortTh label="1M"  col="return_1m" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                  <SortTh label="3M"  col="return_3m" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                  <SortTh label="6M"  col="return_6m" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                  <SortTh label="1Y"  col="return_1y" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                  <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-white/30"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((w, i) => (
                  <tr
                    key={w.name}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group"
                  >
                    <td className="px-3 py-3 text-[11px] text-white/25 font-mono">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-white/85 text-[12px]">{w.name}</div>
                      {w.ai_theme && (
                        <div className="text-[10px] text-white/30 italic mt-0.5 leading-tight max-w-xs">
                          "{w.ai_theme.length > 70 ? w.ai_theme.slice(0, 70) + "…" : w.ai_theme}"
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">{catBadge(w.category)}</td>
                    <td className={`px-3 py-3 text-right text-[12px] font-mono font-medium ${pctCls(w.return_1m)}`}>{fmtPct(w.return_1m)}</td>
                    <td className={`px-3 py-3 text-right text-[12px] font-mono font-medium ${pctCls(w.return_3m)}`}>{fmtPct(w.return_3m)}</td>
                    <td className={`px-3 py-3 text-right text-[12px] font-mono font-medium ${pctCls(w.return_6m)}`}>{fmtPct(w.return_6m)}</td>
                    <td className={`px-3 py-3 text-right text-[12px] font-mono font-medium ${pctCls(w.return_1y)}`}>{fmtPct(w.return_1y)}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => setSelected(w)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[hsl(200,90%,58%)/10] border border-[hsl(200,90%,58%)/20] text-[hsl(200,90%,58%)] hover:bg-[hsl(200,90%,58%)/20] transition-all opacity-0 group-hover:opacity-100"
                      >
                        View Portfolio
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && <WhaleModal whale={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
