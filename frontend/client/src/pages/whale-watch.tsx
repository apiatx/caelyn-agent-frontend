import { useState, useEffect, useCallback, useMemo } from "react";
import { useSetPageContext } from "@/hooks/useSetPageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  RefreshCw, X, ChevronUp, ChevronDown, ChevronsUpDown,
  Waves, Building2, User, Landmark, TrendingDown,
  BarChart3, Brain, Trophy, Flame, Search, Zap,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════
interface WhaleStats {
  institutions:      number;
  individuals:       number;
  congress:          number;
  notable_investors: number;
}

interface Whale {
  name:          string;
  category:      "institution" | "individual" | "congress" | "famous_investor" | string;
  ai_theme:      string;
  return_1m:     number | null;
  return_3m:     number | null;
  return_6m:     number | null;
  return_1y:     number | null;
  last_updated?: string | null;
  updated_at?:   string | null;
  new_buys_count?: number;
}

interface Holding {
  rank:         number;
  ticker:       string;
  company_name: string;
  shares:       number | null;
  value_usd:    number | null;
  weight_pct:   number | null;
  quarter?:     string;
}

interface NewBuy {
  ticker: string;
  company_name: string;
  transaction_type: "NEW" | "ADDED";
  shares: number | null;
  value_usd: number | null;
  quarter: string;
}

interface ReturnPeriod {
  period: string;
  whale_return: number | null;
  spy_return: number | null;
}

interface FamousInvestor {
  name:              string;
  description:       string;
  ai_theme:          string | null;
  investing_themes:  string;
  return_1y:         number | null;
  known_positions:   string[];
  last_updated?:     string | null;
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
  if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};
const fmtNum = (v: number | null) => v == null ? "—" : v.toLocaleString("en-US");
const fmtTs = (s: string | null | undefined): string => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const CAT_BADGE: Record<string, string> = {
  institution: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  individual: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  congress: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  famous_investor: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
};
const CAT_ICON: Record<string, React.ReactNode> = {
  institution: <Building2 className="w-3 h-3" />,
  individual: <User className="w-3 h-3" />,
  congress: <Landmark className="w-3 h-3" />,
  famous_investor: <Zap className="w-3 h-3" />,
};
const catBadge = (c: string | undefined | null) => {
  const key = c ?? "";
  const cls = CAT_BADGE[key] ?? "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  const icon = CAT_ICON[key] ?? <User className="w-3 h-3" />;
  const label = key === "famous_investor" ? "Notable Investor" : key ? key.charAt(0).toUpperCase() + key.slice(1) : "Unknown";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>
      {icon}{label}
    </span>
  );
};

function Skel({ w = "100%", h = 14, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <div className={`animate-pulse bg-white/[0.06] rounded ${className}`} style={{ width: w, height: h }} />;
}

function SortTh({ label, col, sortKey, sortDir, onClick }: {
  label: string; col: SortKey; sortKey: SortKey; sortDir: SortDir; onClick: (c: SortKey) => void;
}) {
  const active = sortKey === col;
  return (
    <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap" onClick={() => onClick(col)}>
      <span className={`inline-flex items-center justify-end gap-1 ${active ? "text-[hsl(200,90%,58%)]" : "text-white/30 hover:text-white/60"} transition-colors`}>
        {label}
        {active ? sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" /> : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
      </span>
    </th>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Holdings Tab
// ═══════════════════════════════════════════════════════════════════════════════
function HoldingsTab({ whaleName }: { whaleName: string }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/whales/${encodeURIComponent(whaleName)}/holdings`)
      .then(r => r.ok ? r.json() : Promise.reject(`Error ${r.status}`))
      .then(d => setHoldings((Array.isArray(d) ? d : (d.holdings ?? [])).slice(0, 20)))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [whaleName]);

  const maxWeight = useMemo(() => Math.max(...holdings.map(h => h.weight_pct ?? 0), 1), [holdings]);

  if (loading) return <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skel key={i} h={32} />)}</div>;
  if (error) return <div className="p-6 text-center text-red-400 text-sm">{error}</div>;
  if (!holdings.length) return <div className="p-6 text-center text-white/30 text-sm">No holdings data available.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {["#", "Ticker", "Company", "Shares", "Value", "Weight"].map(h => (
              <th key={h} className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 ${h === "Weight" || h === "Shares" || h === "Value" ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              <td className="px-3 py-2 text-[11px] text-white/25 font-mono">{h.rank ?? i + 1}</td>
              <td className="px-3 py-2"><span className="text-[11px] font-bold font-mono text-[hsl(200,90%,58%)]">{h.ticker || "—"}</span></td>
              <td className="px-3 py-2 text-[11px] text-white/70">{h.company_name || "—"}</td>
              <td className="px-3 py-2 text-right text-[11px] font-mono text-white/50">{fmtNum(h.shares)}</td>
              <td className="px-3 py-2 text-right text-[11px] font-mono text-white/70">{fmtVal(h.value_usd)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[11px] font-mono text-white/60 w-10 text-right">{h.weight_pct != null ? `${h.weight_pct.toFixed(1)}%` : "—"}</span>
                  <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-[hsl(200,90%,58%)] rounded-full" style={{ width: `${Math.min(100, ((h.weight_pct ?? 0) / maxWeight) * 100)}%` }} />
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
// New Buys Tab
// ═══════════════════════════════════════════════════════════════════════════════
function NewBuysTab({ whaleName }: { whaleName: string }) {
  const [buys, setBuys] = useState<NewBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/whales/${encodeURIComponent(whaleName)}/new-buys`)
      .then(r => r.ok ? r.json() : Promise.reject(`Error ${r.status}`))
      .then(d => setBuys(d.transactions ?? d ?? []))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [whaleName]);

  if (loading) return <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skel key={i} h={40} />)}</div>;
  if (error) return <div className="p-6 text-center text-red-400 text-sm">{error}</div>;
  if (!buys.length) return (
    <div className="p-12 text-center">
      <Flame className="w-8 h-8 text-white/10 mx-auto mb-3" />
      <div className="text-white/30 text-sm">No new buys detected this quarter.</div>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {["Ticker", "Company", "Type", "Shares", "Value"].map(h => (
              <th key={h} className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/30 ${["Shares","Value"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buys.map((b, i) => (
            <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
              <td className="px-3 py-3"><span className="text-[12px] font-bold font-mono text-[hsl(200,90%,58%)]">{b.ticker}</span></td>
              <td className="px-3 py-3 text-[11px] text-white/70">{b.company_name || "—"}</td>
              <td className="px-3 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  b.transaction_type === "NEW"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                }`}>
                  {b.transaction_type === "NEW" ? "🆕 NEW" : "📈 ADDED"}
                </span>
              </td>
              <td className="px-3 py-3 text-right text-[11px] font-mono text-white/50">{fmtNum(b.shares)}</td>
              <td className="px-3 py-3 text-right text-[11px] font-mono text-white/70">{fmtVal(b.value_usd)}</td>
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
  const [data, setData] = useState<{ periods: ReturnPeriod[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/whales/${encodeURIComponent(whaleName)}/returns`)
      .then(r => r.ok ? r.json() : Promise.reject(`Error ${r.status}`))
      .then(d => setData(d))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [whaleName]);

  if (loading) return <div className="p-4"><Skel h={200} /></div>;
  if (error) return <div className="p-6 text-center text-red-400 text-sm">{error}</div>;
  if (!data?.periods?.length) return <div className="p-6 text-center text-white/30 text-sm">No returns data available.</div>;

  const chartData = data.periods.map(p => ({ period: p.period, Whale: p.whale_return, SPY: p.spy_return }));
  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#0d0e14] border border-white/[0.08] rounded-lg p-2.5 text-xs shadow-xl">
        <div className="text-white/50 mb-1.5 font-medium">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-white/60">{p.name}:</span>
            <span className={p.value >= 0 ? "text-emerald-400" : "text-red-400"}>{fmtPct(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center gap-4 text-[11px] text-white/40">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-[hsl(200,90%,58%)] inline-block" /> Whale</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-amber-400 inline-block" /> SPY Benchmark</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
          <XAxis dataKey="period" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v > 0 ? "+" : ""}${v}%`} />
          <Tooltip content={customTooltip} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Bar dataKey="Whale" radius={[3, 3, 0, 0]}>
            {chartData.map((e, i) => <Cell key={i} fill={(e.Whale ?? 0) >= 0 ? "hsl(200,90%,58%)" : "#ef4444"} />)}
          </Bar>
          <Bar dataKey="SPY" radius={[3, 3, 0, 0]}>
            {chartData.map((e, i) => <Cell key={i} fill={(e.SPY ?? 0) >= 0 ? "#f59e0b" : "#dc2626"} fillOpacity={0.7} />)}
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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[hsl(200,90%,58%)]/20 to-purple-500/20 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            {CAT_ICON[whale.category] ?? <User className="w-5 h-5 text-white/40" />}
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">{whale.name}</h3>
            <div className="mt-1 mb-3">{catBadge(whale.category)}</div>
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-[hsl(200,90%,58%)]/5 to-purple-500/5 border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-[hsl(200,90%,58%)]" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">AI Investment Theme</span>
        </div>
        <p className="text-white/80 text-sm leading-relaxed italic">"{whale.ai_theme || "No theme available."}"</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[["1M Return", whale.return_1m], ["3M Return", whale.return_3m], ["6M Return", whale.return_6m], ["1Y Return", whale.return_1y]].map(([label, value]) => (
          <div key={label as string} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 text-center">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-lg font-bold font-mono ${pctCls(value as number | null)}`}>{fmtPct(value as number | null)}</div>
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
  const [tab, setTab] = useState<"holdings" | "new-buys" | "returns" | "theme">("holdings");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tabs: { key: typeof tab; label: string }[] = [
    { key: "holdings", label: "Holdings" },
    { key: "new-buys", label: "🔥 New Buys" },
    { key: "returns", label: "Returns" },
    { key: "theme", label: "Theme" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-white/[0.08] shadow-2xl overflow-hidden" style={{ background: "#0a0b0f" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Waves className="w-5 h-5 text-[hsl(200,90%,58%)]" />
            <div>
              <h2 className="text-white font-semibold text-sm">{whale.name}</h2>
              <div className="mt-0.5 flex items-center gap-2">
                {catBadge(whale.category)}
                {whale.return_1y != null && (
                  <span className={`text-[11px] font-bold font-mono ${pctCls(whale.return_1y)}`}>
                    {fmtPct(whale.return_1y)} 1Y
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex border-b border-white/[0.06] flex-shrink-0 px-4 pt-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-xs font-medium transition-all border-b-2 -mb-px ${tab === t.key ? "text-[hsl(200,90%,58%)] border-[hsl(200,90%,58%)]" : "text-white/35 border-transparent hover:text-white/60"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === "holdings" && <HoldingsTab whaleName={whale.name} />}
          {tab === "new-buys" && <NewBuysTab whaleName={whale.name} />}
          {tab === "returns" && <ReturnsTab whaleName={whale.name} />}
          {tab === "theme" && <ThemeTab whale={whale} />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Famous Investor Card
// ═══════════════════════════════════════════════════════════════════════════════
function FamousInvestorCard({ investor, onClick }: { investor: FamousInvestor; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 cursor-pointer hover:bg-white/[0.04] hover:border-amber-500/30 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">{investor.name}</h3>
          <div className="mt-1">{catBadge("famous_investor")}</div>
        </div>
        {investor.return_1y != null && (
          <div className="text-right">
            <div className={`text-xl font-bold font-mono ${pctCls(investor.return_1y)}`}>{fmtPct(investor.return_1y)}</div>
            <div className="text-[10px] text-white/30">1Y Est.</div>
          </div>
        )}
      </div>
      {investor.description && (
        <p className="text-[11px] text-white/40 leading-relaxed mb-3 line-clamp-2">{investor.description}</p>
      )}
      {investor.known_positions?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {investor.known_positions.slice(0, 12).map((ticker, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-[hsl(200,90%,58%)]/10 border border-[hsl(200,90%,58%)]/20 text-[hsl(200,90%,58%)] text-[10px] font-mono font-bold">
              {ticker}
            </span>
          ))}
          {investor.known_positions.length > 12 && (
            <span className="px-2 py-0.5 rounded-md bg-white/[0.04] text-white/30 text-[10px]">+{investor.known_positions.length - 12} more</span>
          )}
        </div>
      )}
      {investor.investing_themes && (
        <p className="text-[10px] text-white/35 italic mb-2">{investor.investing_themes}</p>
      )}
      {investor.ai_theme && (
        <p className="text-[10px] text-white/25 italic border-t border-white/[0.04] pt-2 line-clamp-2">"{investor.ai_theme}"</p>
      )}
      <div className="mt-3 flex items-center gap-1 text-[9px] text-white/20">
        <Search className="w-2.5 h-2.5" />
        Source: Public disclosures, interviews & filings
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
export default function WhaleWatchPage() {
  const { authFetch } = useAuth();
  const [whales, setWhales]               = useState<Whale[]>([]);
  const [famousInvestors, setFamousInvestors] = useState<FamousInvestor[]>([]);
  const [stats, setStats]                 = useState<WhaleStats | null>(null);
  const [loading, setLoading]             = useState(true);
  const [famousLoading, setFamousLoading] = useState(true);
  const [statsLoading, setStatsLoading]   = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [refreshing, setRefreshing]       = useState(false);
  const [discovering, setDiscovering]     = useState(false);
  const [discoverMsg, setDiscoverMsg]     = useState<string | null>(null);
  const [sortKey, setSortKey]             = useState<SortKey>("return_1y");
  const [sortDir, setSortDir]             = useState<SortDir>("desc");
  const [selected, setSelected]           = useState<Whale | null>(null);

  // ── Page context for chatbot ──────────────────────────────────────────────
  useSetPageContext((() => {
    const parts = ['[Page: Whale Watch — Institutional & Famous Investor Tracking]'];
    if (selected) {
      parts.push(`Viewing: ${selected.name} (${selected.category}) — AI theme: ${selected.ai_theme||'—'}`);
      if (selected.return_1y!=null) parts.push(`1Y return: ${selected.return_1y>0?'+':''}${selected.return_1y.toFixed(1)}%`);
    } else if (whales.length) {
      const topWhales = whales.slice(0,8).map(w=>w.name).join(', ');
      parts.push(`Tracked investors: ${topWhales}`);
    }
    parts.push('Ask about holdings, recent buys, portfolio themes, or performance for any tracked whale or famous investor.');
    return parts.join('\n');
  })(), [selected, whales]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await fetch("/api/whales/stats");
      if (!r.ok) return;
      const d = await r.json();
      setStats(d);
    } catch { } finally { setStatsLoading(false); }
  }, []);

  const loadWhales = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/whales");
      if (!r.ok) throw new Error(`Error ${r.status}`);
      const d = await r.json();
      setWhales(Array.isArray(d) ? d : (d.whales ?? []));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFamous = useCallback(async (autoSeed = false) => {
    setFamousLoading(true);
    try {
      const r = await fetch("/api/whales/famous");
      if (!r.ok) return;
      const d = await r.json();
      const list: FamousInvestor[] = Array.isArray(d) ? d : (d.investors ?? []);
      setFamousInvestors(list);
      if (list.length === 0 && autoSeed) {
        // Seed data on first load if empty
        try {
          await authFetch("/api/whales/discover-famous", { method: "POST" });
          const r2 = await fetch("/api/whales/famous");
          if (r2.ok) {
            const d2 = await r2.json();
            setFamousInvestors(Array.isArray(d2) ? d2 : (d2.investors ?? []));
          }
        } catch { }
      }
    } catch { } finally { setFamousLoading(false); }
  }, []);

  useEffect(() => {
    loadStats();
    loadWhales();
    loadFamous(true);
  }, [loadStats, loadWhales, loadFamous]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadWhales(), loadStats()]);
    } catch { } finally { setRefreshing(false); }
  };

  const handleDiscover = async () => {
    setDiscovering(true); setDiscoverMsg(null);
    try {
      const r = await authFetch("/api/whales/discover-famous", { method: "POST" });
      if (!r.ok) throw new Error("Discovery failed");
      await loadFamous();
      setDiscoverMsg("Notable investors updated");
    } catch {
      setDiscoverMsg("Discovery failed — try again");
    } finally { setDiscovering(false); }
  };

  const handleSort = (col: SortKey) => {
    if (sortKey === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(col); setSortDir("desc"); }
  };

  // Filter out famous_investor from main leaderboard
  const institutionWhales = useMemo(() =>
    whales.filter(w => w.category !== "famous_investor"),
    [whales]
  );

  const sorted = useMemo(() => {
    return [...institutionWhales].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [institutionWhales, sortKey, sortDir]);

  const lastUpdated = useMemo(() =>
    whales.map(w => w.last_updated ?? w.updated_at).filter(Boolean).sort().pop() ?? null,
    [whales]
  );

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "#050608" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[hsl(200,90%,58%)]/10 border border-[hsl(200,90%,58%)]/20 flex items-center justify-center">
              <Waves className="w-5 h-5 text-[hsl(200,90%,58%)]" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Whale Watch</h1>
          </div>
          <p className="text-[12px] text-white/35 ml-12">Track the world's most profitable investors</p>
          {lastUpdated && <p className="text-[10px] text-white/20 ml-12 mt-0.5">Last updated: {fmtTs(lastUpdated)}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Institutions",    value: stats?.institutions,      icon: <Building2 className="w-4 h-4 text-blue-400" />,    cls: "text-blue-400" },
          { label: "Individuals",     value: stats?.individuals,       icon: <User className="w-4 h-4 text-purple-400" />,       cls: "text-purple-400" },
          { label: "Congress",        value: stats?.congress,          icon: <Landmark className="w-4 h-4 text-emerald-400" />,  cls: "text-emerald-400" },
          { label: "Notable Investors", value: stats?.notable_investors, icon: <Zap className="w-4 h-4 text-amber-400" />,      cls: "text-amber-400" },
        ].map(({ label, value, icon, cls }) => (
          <div key={label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">{icon}<span className="text-[10px] text-white/30 uppercase tracking-wider">{label}</span></div>
            <div className={`text-2xl font-bold ${cls}`}>
              {statsLoading ? <Skel w={40} h={28} /> : (value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <TrendingDown className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
          <button onClick={loadWhales} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {/* ── Leaderboard ── */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">Institutional Leaderboard</span>
          <span className="ml-auto text-[10px] text-white/20">{institutionWhales.length} tracked · sorted by 1Y return</span>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex items-center gap-3"><Skel w={20} h={14} /><Skel w="35%" h={14} /><Skel w={60} h={18} /><Skel w={50} h={14} className="ml-auto" /><Skel w={50} h={14} /><Skel w={50} h={14} /><Skel w={50} h={14} /></div>)}</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center text-white/25 text-sm">No data available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30 w-8">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Whale</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Category</th>
                  <SortTh label="1M" col="return_1m" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                  <SortTh label="3M" col="return_3m" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                  <SortTh label="6M" col="return_6m" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                  <SortTh label="1Y" col="return_1y" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                  <th className="px-3 py-2.5 w-28"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((w, i) => (
                  <tr key={w.name} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group">
                    <td className="px-3 py-3 text-[11px] text-white/25 font-mono">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white/85 text-[12px]">{w.name}</span>
                        {(w.new_buys_count ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[9px] font-bold">
                            <Flame className="w-2.5 h-2.5" />{w.new_buys_count}
                          </span>
                        )}
                      </div>
                      {w.ai_theme && <div className="text-[10px] text-white/30 italic mt-0.5 max-w-xs truncate">"{w.ai_theme.slice(0, 65)}{w.ai_theme.length > 65 ? "…" : ""}"</div>}
                    </td>
                    <td className="px-3 py-3">{catBadge(w.category)}</td>
                    <td className={`px-3 py-3 text-right text-[12px] font-mono font-medium ${pctCls(w.return_1m)}`}>{fmtPct(w.return_1m)}</td>
                    <td className={`px-3 py-3 text-right text-[12px] font-mono font-medium ${pctCls(w.return_3m)}`}>{fmtPct(w.return_3m)}</td>
                    <td className={`px-3 py-3 text-right text-[12px] font-mono font-medium ${pctCls(w.return_6m)}`}>{fmtPct(w.return_6m)}</td>
                    <td className={`px-3 py-3 text-right text-[12px] font-mono font-medium ${pctCls(w.return_1y)}`}>{fmtPct(w.return_1y)}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => setSelected(w)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-[hsl(200,90%,58%)]/10 border border-[hsl(200,90%,58%)]/20 text-[hsl(200,90%,58%)] hover:bg-[hsl(200,90%,58%)]/20 transition-all opacity-0 group-hover:opacity-100">
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

      {/* ── Famous Investor Radar ── */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-bold text-white">Notable Investor Radar</h2>
            </div>
            <p className="text-[11px] text-white/30">Known positions sourced from public interviews, 13D filings, and news. Not complete portfolios.</p>
          </div>
          <div className="flex items-center gap-2">
            {discoverMsg && <span className="text-[11px] text-emerald-400">{discoverMsg}</span>}
            <button onClick={handleDiscover} disabled={discovering}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-40">
              <Search className={`w-3.5 h-3.5 ${discovering ? "animate-spin" : ""}`} />
              {discovering ? "Searching..." : "Rediscover"}
            </button>
          </div>
        </div>

        {famousLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skel key={i} h={180} />)}
          </div>
        ) : famousInvestors.length === 0 ? (
          <div className="bg-white/[0.02] border border-amber-500/20 rounded-xl p-8 text-center">
            <Zap className="w-8 h-8 text-amber-400/30 mx-auto mb-3" />
            <p className="text-white/40 text-sm mb-4">No notable investors discovered yet.</p>
            <button onClick={handleDiscover} disabled={discovering}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all">
              {discovering ? "Searching..." : "Discover Top Investors"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {famousInvestors.map(inv => (
              <FamousInvestorCard
                key={inv.name}
                investor={inv}
                onClick={() => setSelected({ ...inv, category: "famous_investor", return_1m: null, return_3m: null, return_6m: null } as Whale)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && <WhaleModal whale={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}