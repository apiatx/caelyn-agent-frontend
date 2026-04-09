import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
  Globe,
  MessageCircle,
} from "lucide-react";
import { openSecureLink } from "@/utils/security";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubnetData {
  netuid: number;
  name: string;
  description: string;
  price: string;
  market_cap: string;
  price_change_24h: string;
  price_change_7d: string;
  emission: string;
  tao_in: string;
  alpha_in: string;
  volume_24h: string;
  seven_day_price_history: number[];
  is_active: boolean;
  discord?: string;
  twitter?: string;
  github?: string;
}

interface DashboardData {
  tao_price: { price: string; change_24h: string };
  total_market: {
    total_price_tao: string;
    fear_greed_score: number;
    fear_greed_label: string;
  };
  network_stats: Record<string, any>;
  subnets: SubnetData[];
  as_of: string;
}

interface MetagraphValidator {
  uid: number;
  hotkey: string;
  vtrust: number;
  stake: string;
  emission: string;
  stake_weight?: number;
}

interface PriceHistoryItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

type SortKey =
  | "netuid"
  | "name"
  | "price"
  | "market_cap"
  | "price_change_24h"
  | "price_change_7d"
  | "emission"
  | "volume_24h"
  | "tao_in";
type SortDir = "asc" | "desc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function num(v: string | number | undefined): number {
  if (v === undefined || v === null || v === "") return 0;
  return typeof v === "number" ? v : parseFloat(v) || 0;
}

function fmtUsd(v: number): string {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

function fmtTao(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.001) return v.toFixed(4);
  return v.toFixed(6);
}

function fmtPct(v: number): string {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(2)}%`;
}

function pctColor(v: number): string {
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}

function truncate(s: string, n = 8): string {
  if (!s || s.length <= n + 4) return s || "";
  return `${s.slice(0, n)}...${s.slice(-4)}`;
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) {
    return <div className="w-[80px] h-[24px]" />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const color = positive ? "#34d399" : "#f87171";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* KPI bar skeleton */}
      <div className="flex gap-3 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-14 w-40 rounded-lg bg-white/[0.04] border border-white/[0.08]"
          />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-8 bg-white/[0.06] rounded" />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BittensorDashboardSection() {
  const [selectedNetuid, setSelectedNetuid] = useState<number | null>(null);
  const [showMetagraph, setShowMetagraph] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showPriceChart, setShowPriceChart] = useState(true);
  const [showResources, setShowResources] = useState(false);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: ["/api/bittensor/dashboard"],
    refetchInterval: 60000,
  });

  const { data: metagraph, isLoading: metagraphLoading } = useQuery<{
    data?: MetagraphValidator[];
  }>({
    queryKey: [`/api/bittensor/subnet/${selectedNetuid}/metagraph`],
    enabled: !!selectedNetuid && showMetagraph,
  });

  const { data: priceHistory } = useQuery<{ data?: PriceHistoryItem[] }>({
    queryKey: ["/api/bittensor/price/history"],
  });

  // ─── Sorting ─────────────────────────────────────────────────────────────

  const sortedSubnets = useMemo(() => {
    if (!dashboard?.subnets) return [];
    const arr = [...dashboard.subnets];
    arr.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "name") {
        const cmp = (a.name || "").localeCompare(b.name || "");
        return sortDir === "asc" ? cmp : -cmp;
      }
      av = num((a as any)[sortKey]);
      bv = num((b as any)[sortKey]);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [dashboard?.subnets, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  // ─── Selected subnet data ────────────────────────────────────────────────

  const selectedSubnet = useMemo(
    () => dashboard?.subnets?.find((s) => s.netuid === selectedNetuid) ?? null,
    [dashboard?.subnets, selectedNetuid]
  );

  // ─── Price chart data ────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    const raw = priceHistory?.data || (priceHistory as any);
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
      date: item.date
        ? new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "",
      close: num(item.close),
    }));
  }, [priceHistory]);

  // ─── Top 10 validators from metagraph ────────────────────────────────────

  const topValidators = useMemo(() => {
    const raw = metagraph?.data || (metagraph as any);
    if (!Array.isArray(raw)) return [];
    return [...raw]
      .sort((a, b) => num(b.stake_weight ?? b.stake) - num(a.stake_weight ?? a.stake))
      .slice(0, 10);
  }, [metagraph]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Activity className="w-12 h-12 text-white/30" />
        <p className="text-white/50 text-sm">
          Failed to load Bittensor dashboard data.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
        >
          <RefreshCw className="w-3 h-3 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const taoPrice = num(dashboard.tao_price?.price);
  const taoChange = num(dashboard.tao_price?.change_24h);
  const totalSubnets = dashboard.subnets?.length ?? 0;
  const fearScore = dashboard.total_market?.fear_greed_score ?? 0;
  const fearLabel = dashboard.total_market?.fear_greed_label ?? "N/A";

  return (
    <div className="space-y-4">
      {/* ════════════════════ 1. TOP KPI BAR ════════════════════ */}
      <div className="flex flex-wrap gap-2">
        {/* TAO Price */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            TAO
          </span>
          <span className="text-white font-bold font-mono text-sm">
            ${taoPrice.toFixed(2)}
          </span>
          <span className={`text-xs font-mono ${pctColor(taoChange)}`}>
            {fmtPct(taoChange)}
          </span>
        </div>

        {/* Total Subnets */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Subnets
          </span>
          <span className="text-white font-bold font-mono text-sm">
            {totalSubnets}
          </span>
        </div>

        {/* Fear & Greed */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Fear & Greed
          </span>
          <span className="text-orange-400 font-bold font-mono text-sm">
            {fearScore}
          </span>
          <span className="text-white/40 text-xs">{fearLabel}</span>
        </div>

        {/* LIVE indicator */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="text-emerald-400 text-xs font-semibold tracking-wider">
            LIVE
          </span>
        </div>

        {/* Last updated */}
        {dashboard.as_of && (
          <div className="flex items-center gap-1.5 px-3 py-2.5 text-white/30 text-xs">
            Updated{" "}
            {new Date(dashboard.as_of).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>

      {/* ════════════════════ 2. MAIN SUBNET TABLE ════════════════════ */}
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-[#0a0c10] border-b border-white/[0.08]">
                <tr>
                  {(
                    [
                      ["netuid", "#"],
                      ["name", "Name"],
                      ["price", "Price (τ)"],
                      ["market_cap", "Mkt Cap"],
                      ["price_change_24h", "24h%"],
                      ["price_change_7d", "7d%"],
                      ["emission", "Emission"],
                      ["volume_24h", "Vol 24h"],
                      ["tao_in", "TAO Pool"],
                    ] as [SortKey, string][]
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="px-3 py-2.5 text-left text-white/50 font-medium cursor-pointer hover:text-white/80 select-none whitespace-nowrap"
                    >
                      {label}
                      <SortIcon col={key} />
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-left text-white/50 font-medium whitespace-nowrap">
                    7D
                  </th>
                  <th className="px-3 py-2.5 text-left text-white/50 font-medium whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSubnets.map((s) => {
                  const isSelected = selectedNetuid === s.netuid;
                  const change24h = num(s.price_change_24h);
                  const change7d = num(s.price_change_7d);

                  return (
                    <tr
                      key={s.netuid}
                      onClick={() => {
                        setSelectedNetuid(isSelected ? null : s.netuid);
                        setShowMetagraph(false);
                      }}
                      className={`border-b border-white/[0.04] cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-orange-500/10"
                          : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <td className="px-3 py-2 text-white/60 font-mono">
                        {s.netuid}
                      </td>
                      <td className="px-3 py-2 text-white font-medium whitespace-nowrap max-w-[140px] truncate">
                        {s.name || `Subnet ${s.netuid}`}
                      </td>
                      <td className="px-3 py-2 text-white font-mono">
                        {fmtTao(num(s.price))}
                      </td>
                      <td className="px-3 py-2 text-white/80 font-mono">
                        {fmtUsd(num(s.market_cap))}
                      </td>
                      <td className={`px-3 py-2 font-mono ${pctColor(change24h)}`}>
                        {fmtPct(change24h)}
                      </td>
                      <td className={`px-3 py-2 font-mono ${pctColor(change7d)}`}>
                        {fmtPct(change7d)}
                      </td>
                      <td className="px-3 py-2 text-white/70 font-mono">
                        {num(s.emission).toFixed(4)}
                      </td>
                      <td className="px-3 py-2 text-white/70 font-mono">
                        {fmtUsd(num(s.volume_24h))}
                      </td>
                      <td className="px-3 py-2 text-white/70 font-mono">
                        {fmtTao(num(s.tao_in))}
                      </td>
                      <td className="px-3 py-2">
                        <Sparkline
                          data={s.seven_day_price_history}
                          positive={change7d >= 0}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {s.is_active ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0">
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-white/40 border-white/10 text-[10px] px-1.5 py-0"
                          >
                            Inactive
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ════════════════════ 3. SUBNET DETAIL PANEL ════════════════════ */}
      {selectedSubnet && (
        <div className="rounded-lg bg-white/[0.04] border border-orange-500/20 p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                SN{selectedSubnet.netuid} — {selectedSubnet.name || "Unknown"}
              </h3>
              {selectedSubnet.description && (
                <p className="text-white/40 text-sm mt-1 max-w-2xl">
                  {selectedSubnet.description}
                </p>
              )}
              {/* Social links */}
              <div className="flex gap-3 mt-2">
                {selectedSubnet.discord && (
                  <button
                    onClick={() => openSecureLink(selectedSubnet.discord!)}
                    className="text-white/40 hover:text-indigo-400 transition-colors"
                    title="Discord"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
                {selectedSubnet.twitter && (
                  <button
                    onClick={() => openSecureLink(selectedSubnet.twitter!)}
                    className="text-white/40 hover:text-sky-400 transition-colors"
                    title="Twitter"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                )}
                {selectedSubnet.github && (
                  <button
                    onClick={() => openSecureLink(selectedSubnet.github!)}
                    className="text-white/40 hover:text-white transition-colors"
                    title="GitHub"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedNetuid(null)}
              className="border-white/[0.08] text-white/50 hover:text-white text-xs"
            >
              Close
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ["Price", `${fmtTao(num(selectedSubnet.price))} τ`],
              ["Market Cap", fmtUsd(num(selectedSubnet.market_cap))],
              ["Emission", num(selectedSubnet.emission).toFixed(4)],
              ["TAO in Pool", fmtTao(num(selectedSubnet.tao_in))],
              ["Alpha in Pool", fmtTao(num(selectedSubnet.alpha_in))],
              ["Volume 24h", fmtUsd(num(selectedSubnet.volume_24h))],
            ].map(([label, value]) => (
              <div
                key={label}
                className="bg-white/[0.04] border border-white/[0.06] rounded-md px-3 py-2"
              >
                <div className="text-white/40 text-[10px] uppercase tracking-wider">
                  {label}
                </div>
                <div className="text-white font-mono text-sm font-medium mt-0.5">
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* View Metagraph Button */}
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetagraph((v) => !v)}
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs"
            >
              {showMetagraph ? "Hide Metagraph" : "View Metagraph"}
              {showMetagraph ? (
                <ChevronUp className="w-3 h-3 ml-1" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-1" />
              )}
            </Button>
          </div>

          {/* Metagraph Table */}
          {showMetagraph && (
            <div className="rounded-md bg-black/30 border border-white/[0.06] overflow-hidden">
              {metagraphLoading ? (
                <div className="p-4 text-white/40 text-sm text-center animate-pulse">
                  Loading metagraph...
                </div>
              ) : topValidators.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.04]">
                    <tr>
                      <th className="px-3 py-2 text-left text-white/50 font-medium">
                        UID
                      </th>
                      <th className="px-3 py-2 text-left text-white/50 font-medium">
                        Hotkey
                      </th>
                      <th className="px-3 py-2 text-left text-white/50 font-medium">
                        VTrust
                      </th>
                      <th className="px-3 py-2 text-left text-white/50 font-medium">
                        Stake
                      </th>
                      <th className="px-3 py-2 text-left text-white/50 font-medium">
                        Emission
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topValidators.map((v: any) => (
                      <tr
                        key={v.uid}
                        className="border-t border-white/[0.04] hover:bg-white/[0.02]"
                      >
                        <td className="px-3 py-1.5 text-white/70 font-mono">
                          {v.uid}
                        </td>
                        <td className="px-3 py-1.5 text-white/70 font-mono">
                          {truncate(v.hotkey)}
                        </td>
                        <td className="px-3 py-1.5 text-white/70 font-mono">
                          {num(v.vtrust).toFixed(4)}
                        </td>
                        <td className="px-3 py-1.5 text-white/70 font-mono">
                          {fmtTao(num(v.stake))}
                        </td>
                        <td className="px-3 py-1.5 text-white/70 font-mono">
                          {num(v.emission).toFixed(6)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-4 text-white/30 text-sm text-center">
                  No metagraph data available.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════ 4. TAO PRICE CHART ════════════════════ */}
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <button
          onClick={() => setShowPriceChart((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-white/70 text-sm font-medium">
            TAO Price — 30D
          </span>
          {showPriceChart ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        {showPriceChart && (
          <div className="px-4 pb-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                    tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111318",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                    itemStyle={{ color: "#fb923c" }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, "Close"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#fb923c"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: "#fb923c" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-white/30 text-sm">
                No price history available.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════ 5. EXTERNAL RESOURCES ════════════════════ */}
      <details
        open={showResources}
        onToggle={(e) =>
          setShowResources((e.target as HTMLDetailsElement).open)
        }
        className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden"
      >
        <summary className="px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors text-white/50 text-sm font-medium select-none list-none flex items-center justify-between">
          <span>External Resources</span>
          {showResources ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </summary>

        <div className="p-4 space-y-6">
          {/* TaoBot */}
          <ResourceEmbed
            title="TaoBot"
            url="https://www.tao.bot/explore"
            color="text-blue-400"
          />

          {/* Link Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ResourceButton
              label="TaoStats"
              desc="Bittensor network analytics"
              url="https://taostats.io/"
              accent="orange"
            />
            <ResourceButton
              label="Tao.app"
              desc="Explorer & analytics"
              url="https://www.tao.app/explorer"
              accent="cyan"
            />
            <ResourceButton
              label="Bittensor.ai"
              desc="Official Bittensor hub"
              url="https://www.bittensor.ai/"
              accent="purple"
            />
          </div>

          {/* Side-by-side iframes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResourceEmbed title="TaoTensorLaw" url="https://taotensorlaw.com/" color="text-blue-400" />
            <ResourceEmbed title="TaoMarketCap" url="https://taomarketcap.com/blockchain/accounts" color="text-orange-400" />
          </div>

          <ResourceEmbed title="TaoYield" url="https://www.taoyield.com/" color="text-emerald-400" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResourceEmbed title="TaoRevenue" url="https://taorevenue.com/" color="text-purple-400" />
            <ResourceEmbed title="Backprop Finance" url="https://backprop.finance/screener/bubbles" color="text-green-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResourceEmbed title="TaoTrack Simulator" url="https://taotrack.com/simulator" color="text-cyan-400" />
            <ResourceEmbed title="TaoCagr" url="https://taocagr.com/" color="text-amber-400" />
          </div>

          <ResourceEmbed title="TaoGalaxy" url="https://taogalaxy.com/app" color="text-pink-400" />
          <ResourceEmbed title="SubnetAlpha" url="https://subnetalpha.ai/" color="text-indigo-400" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ResourceEmbed title="TaoBridge" url="https://taobridge.xyz/" color="text-purple-400" />
            <ResourceEmbed title="TaoFi Swap" url="https://www.taofi.com/swap" color="text-teal-400" />
            <ResourceEmbed title="VoidAI Bridge" url="https://bridge.voidai.com/bridge-chains" color="text-violet-400" />
          </div>

          <ResourceEmbed title="TaoHub Portfolio" url="https://www.taohub.info/" color="text-white/50" />
        </div>
      </details>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResourceEmbed({
  title,
  url,
  color,
}: {
  title: string;
  url: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-end mb-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs ${color} hover:opacity-80 transition-opacity flex items-center gap-1`}
        >
          Open Full View <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="bg-black/20 border border-white/[0.06] rounded-lg overflow-hidden">
        <iframe
          src={url}
          className="w-full h-[600px] border-0"
          title={title}
          frameBorder="0"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          style={{ background: "transparent", colorScheme: "dark" }}
        />
      </div>
    </div>
  );
}

function ResourceButton({
  label,
  desc,
  url,
  accent,
}: {
  label: string;
  desc: string;
  url: string;
  accent: string;
}) {
  const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    orange: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30 hover:border-orange-400/50",
      text: "text-orange-400",
      icon: "group-hover:text-orange-400",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/30 hover:border-cyan-500",
      text: "text-cyan-500",
      icon: "group-hover:text-cyan-500",
    },
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30 hover:border-purple-300",
      text: "text-purple-400",
      icon: "group-hover:text-purple-300",
    },
  };
  const c = colors[accent] || colors.orange;

  return (
    <button
      onClick={() => openSecureLink(url)}
      className={`group relative overflow-hidden bg-black border ${c.border} rounded-lg p-5 transition-all duration-300 hover:scale-[1.02]`}
    >
      <div className="flex flex-col items-center justify-center space-y-2">
        <div
          className={`w-12 h-12 ${c.bg} border ${c.border} rounded-xl flex items-center justify-center`}
        >
          <span className={`text-xl font-bold ${c.text}`}>
            {label.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <h3 className="text-base font-bold text-white">{label}</h3>
        <p className="text-xs text-white/35">{desc}</p>
      </div>
      <div className="absolute top-2 right-2">
        <ExternalLink
          className={`w-3.5 h-3.5 text-white/20 ${c.icon} transition-colors`}
        />
      </div>
    </button>
  );
}
