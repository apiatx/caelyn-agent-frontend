import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
  Globe,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import { openSecureLink } from "@/utils/security";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
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
  block_number?: number;
  subnets: SubnetData[];
  as_of: string;
  error?: string;
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

interface BlockHistoryItem {
  label: string;
  blocks: number;
  expected: number;
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

function num(v: string | number | undefined | null): number {
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
  if (v >= 1e9) return `τ${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `τ${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `τ${(v / 1e3).toFixed(1)}K`;
  if (v >= 1) return `τ${v.toFixed(2)}`;
  if (v >= 0.001) return `τ${v.toFixed(4)}`;
  return `τ${v.toFixed(6)}`;
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

function fmtNumber(v: number): string {
  return v.toLocaleString("en-US");
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
      {/* Header skeleton */}
      <div className="h-10 w-full rounded-lg bg-orange-500/20" />
      {/* KPI bar skeleton */}
      <div className="flex gap-3 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-14 w-40 rounded-lg bg-white/[0.04] border border-white/[0.08]"
          />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="h-[200px] rounded-lg bg-white/[0.04] border border-white/[0.08]" />
      {/* Table skeleton */}
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] p-4 space-y-3">
        <div className="h-6 w-48 bg-white/[0.06] rounded" />
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
  const [showChart, setShowChart] = useState(true);
  const [showBlocksChart, setShowBlocksChart] = useState(true);
  const [blockScale, setBlockScale] = useState<"days" | "hours">("days");

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardData>({
    queryKey: ["/api/bittensor/dashboard"],
    refetchInterval: 60000,
    retry: 2,
  });

  const { data: metagraph, isLoading: metaLoading } = useQuery<{
    data?: MetagraphValidator[];
  }>({
    queryKey: [`/api/bittensor/subnet/${selectedNetuid}/metagraph`],
    enabled: selectedNetuid !== null,
  });

  const { data: priceHistory } = useQuery<{ data?: PriceHistoryItem[] }>({
    queryKey: ["/api/bittensor/price/history"],
  });

  const { data: blocksHistory } = useQuery<{ data?: BlockHistoryItem[] }>({
    queryKey: [`/api/bittensor/blocks/history?scale=${blockScale}&points=30`],
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

  // ─── Blocks chart data ──────────────────────────────────────────────────

  const blocksData = useMemo(() => {
    const raw = blocksHistory?.data || (blocksHistory as any);
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [blocksHistory]);

  const blockTarget = blockScale === "days" ? 7200 : 300;

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

  // ════════════════════ SECTION 1: HEADER ════════════════════

  const taoPrice = num(dashboard?.tao_price?.price);
  const taoChange = num(dashboard?.tao_price?.change_24h);
  const totalSubnets = dashboard?.subnets?.length ?? 0;
  const fearScore = dashboard?.total_market?.fear_greed_score ?? 0;
  const fearLabel = dashboard?.total_market?.fear_greed_label ?? "N/A";
  const blockNumber = dashboard?.block_number;

  const hasError = error || dashboard?.error;

  return (
    <div className="space-y-4">
      {/* ════════════════════ 1. HEADER BAR ════════════════════ */}
      <div className="bg-[#f97316] rounded-lg px-4 py-2.5 flex items-center justify-between">
        <span className="text-black font-mono font-bold text-sm tracking-wider">
          TAO DASHBOARD
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black/40 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black/60" />
            </span>
            <span className="text-black font-mono font-bold text-xs">LIVE</span>
          </span>
          {dashboard?.as_of && (
            <span className="text-black/60 font-mono text-xs">
              {new Date(dashboard.as_of).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* ════════════════════ 2. KPI TICKER BAR ════════════════════ */}
      <div className="flex flex-wrap gap-2 overflow-x-auto">
        {/* TAO Price */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/50 text-xs uppercase tracking-wider">TAO</span>
          <span className="text-white font-bold font-mono text-sm">
            ${taoPrice.toFixed(2)}
          </span>
          <span className={`text-xs font-mono ${pctColor(taoChange)}`}>
            {fmtPct(taoChange)}
          </span>
        </div>

        {/* Total Subnets */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/50 text-xs uppercase tracking-wider">Subnets</span>
          <span className="text-white font-bold font-mono text-sm">{totalSubnets}</span>
        </div>

        {/* Fear & Greed */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/50 text-xs uppercase tracking-wider">Fear & Greed</span>
          <span className="text-orange-400 font-bold font-mono text-sm">{fearScore}</span>
          <span className="text-white/40 text-xs">({fearLabel})</span>
        </div>

        {/* Block Number */}
        {blockNumber && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <span className="text-white/50 text-xs uppercase tracking-wider">Block</span>
            <span className="text-white font-bold font-mono text-sm">
              #{fmtNumber(blockNumber)}
            </span>
          </div>
        )}

        {/* Total Market */}
        {dashboard?.total_market?.total_price_tao && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <span className="text-white/50 text-xs uppercase tracking-wider">Total Mkt</span>
            <span className="text-white font-bold font-mono text-sm">
              τ{fmtNumber(Math.round(num(dashboard.total_market.total_price_tao)))}
            </span>
          </div>
        )}
      </div>

      {/* ════════════════════ 3. ERROR STATE ════════════════════ */}
      {hasError && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium">
            {dashboard?.error || "Failed to load Bittensor data"}
          </p>
          {(dashboard?.error?.includes("TAOSTATS_API_KEY") ||
            (typeof error === "object" &&
              error !== null &&
              "message" in error &&
              String((error as any).message).includes("TAOSTATS_API_KEY"))) && (
            <p className="text-white/50 text-sm mt-2">
              Add TAOSTATS_API_KEY to your Replit backend Secrets and restart.
            </p>
          )}
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 rounded-md bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw className="w-3 h-3 inline mr-1.5" />
            Retry
          </button>
        </div>
      )}

      {/* ════════════════════ 4. TAO PRICE CHART ════════════════════ */}
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <button
          onClick={() => setShowChart((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-white/70 text-sm font-medium font-mono">
            TAO / USD &nbsp; 30D
          </span>
          {showChart ? (
            <ChevronUp className="w-4 h-4 text-white/40" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/40" />
          )}
        </button>

        {showChart && (
          <div className="px-4 pb-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
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
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3, fill: "#f97316" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-white/30 text-sm">
                No price history available.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════ 5. BLOCKS EMITTED CHART ════════════════════ */}
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowBlocksChart((v) => !v)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-white/70 text-sm font-medium font-mono">
              BLOCKS EMITTED / {blockScale === "days" ? "DAY" : "HOUR"} &nbsp;|&nbsp; Target: {fmtNumber(blockTarget)}
            </span>
            {showBlocksChart ? (
              <ChevronUp className="w-4 h-4 text-white/40" />
            ) : (
              <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </button>
          <div className="flex gap-1">
            <button
              onClick={() => setBlockScale("days")}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                blockScale === "days"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                  : "text-white/40 hover:text-white/60 border border-white/[0.08]"
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setBlockScale("hours")}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                blockScale === "hours"
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                  : "text-white/40 hover:text-white/60 border border-white/[0.08]"
              }`}
            >
              144H
            </button>
          </div>
        </div>

        {showBlocksChart && (
          <div className="px-4 pb-4">
            {blocksData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={blocksData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={50}
                    tickFormatter={(v: number) => fmtNumber(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111318",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                    formatter={(value: number) => [fmtNumber(value), "Blocks"]}
                  />
                  <ReferenceLine
                    y={blockTarget}
                    stroke="white"
                    strokeDasharray="4 4"
                    label={{ value: "Target", fill: "rgba(255,255,255,0.4)", fontSize: 10, position: "right" }}
                  />
                  <Bar
                    dataKey="blocks"
                    fill="#f97316"
                    radius={[2, 2, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-white/30 text-sm">
                No block history available.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════ 6. SUBNET SCREENER TABLE ════════════════════ */}
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.08]">
          <span className="text-white/70 text-sm font-medium font-mono tracking-wider">
            SUBNET SCREENER — {totalSubnets} SUBNETS
          </span>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/[0.08]">
                <tr>
                  {(
                    [
                      ["netuid", "#", "3rem"],
                      ["name", "Name", "12rem"],
                      ["price", "Price", "7rem"],
                      ["market_cap", "Mkt Cap", "8rem"],
                      ["price_change_24h", "24h %", "6rem"],
                      ["price_change_7d", "7d %", "6rem"],
                      ["emission", "Emiss", "6rem"],
                      ["volume_24h", "Vol 24h", "7rem"],
                      ["tao_in", "TAO Pool", "7rem"],
                    ] as [SortKey, string, string][]
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
                  <th className="px-3 py-2.5 text-left text-white/50 font-medium whitespace-nowrap w-[5rem]">
                    7D
                  </th>
                  <th className="px-3 py-2.5 text-left text-white/50 font-medium whitespace-nowrap w-[5rem]">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSubnets.map((s) => {
                  const isSelected = selectedNetuid === s.netuid;
                  const change24h = num(s.price_change_24h);
                  const change7d = num(s.price_change_7d);
                  const emissionVal = num(s.emission);
                  const emissionDisplay = emissionVal < 1
                    ? (emissionVal * 100).toFixed(2) + "%"
                    : emissionVal.toFixed(2) + "%";

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
                      <td className="px-3 py-2 text-white font-medium whitespace-nowrap max-w-[12rem] truncate relative group">
                        <span title={s.name || `Subnet ${s.netuid}`}>
                          {s.name || `Subnet ${s.netuid}`}
                        </span>
                        {s.description && (
                          <div className="invisible group-hover:visible absolute left-0 top-full z-50 max-w-xs bg-[#1a1a2e] border border-white/[0.15] rounded-md px-3 py-2 text-xs text-white/70 shadow-lg whitespace-normal">
                            {s.description.length > 200
                              ? s.description.slice(0, 200) + "..."
                              : s.description}
                          </div>
                        )}
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
                        {emissionDisplay}
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

      {/* ════════════════════ 7. SUBNET DETAIL PANEL ════════════════════ */}
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
            <div className="flex gap-2">
              <button
                onClick={() =>
                  openSecureLink(
                    `https://taostats.io/subnets/${selectedSubnet.netuid}`
                  )
                }
                className="text-orange-400 hover:text-orange-300 text-xs flex items-center gap-1"
              >
                TaoStats <ExternalLink className="w-3 h-3" />
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedNetuid(null)}
                className="border-white/[0.08] text-white/50 hover:text-white text-xs"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ["Price", fmtTao(num(selectedSubnet.price))],
              ["Market Cap", fmtUsd(num(selectedSubnet.market_cap))],
              [
                "Emission",
                num(selectedSubnet.emission) < 1
                  ? (num(selectedSubnet.emission) * 100).toFixed(2) + "%"
                  : num(selectedSubnet.emission).toFixed(2) + "%",
              ],
              ["TAO Pool", fmtTao(num(selectedSubnet.tao_in))],
              ["Alpha", fmtTao(num(selectedSubnet.alpha_in))],
              ["Vol 24h", fmtUsd(num(selectedSubnet.volume_24h))],
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
              {showMetagraph ? "Hide Metagraph" : "View Metagraph ▼"}
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
              {metaLoading ? (
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
                        Stake (τ)
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
                          {fmtTao(num(v.stake) / 1e9)}
                        </td>
                        <td className="px-3 py-1.5 text-white/70 font-mono">
                          {(num(v.emission) / 1e9).toFixed(6)}
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

      {/* ════════════════════ 8. EXTERNAL RESOURCES ════════════════════ */}
      <details className="mt-6 rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors text-white/50 text-sm font-medium select-none list-none flex items-center justify-between">
          <span>External Resources & Tools</span>
          <ChevronDown className="w-4 h-4" />
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
