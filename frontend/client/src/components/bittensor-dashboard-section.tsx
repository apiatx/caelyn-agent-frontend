import React, { useState, useMemo } from "react";
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
  Search,
  TrendingUp,
  Shield,
  Zap,
  BarChart3,
  ArrowUpDown,
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

interface SignalBreakdown {
  momentum_score: number;
  flow_score: number;
  emission_score: number;
  social_score: number;
  health_score: number;
}

interface SubnetData {
  netuid: number;
  name: string;
  symbol: string;
  description: string;
  price: string;
  market_cap: string;
  fdv: string;
  price_change_1h: string;
  price_change_24h: string;
  price_change_7d: string;
  price_change_30d: string;
  emission_pct: string;
  tao_in: string;
  alpha_in: string;
  alpha_circ: string;
  volume_24h: string;
  buy_volume_24h: string;
  sell_volume_24h: string;
  net_volume_24h: string;
  ath_60d: string;
  atl_60d: string;
  seven_day_price_history: number[];
  root_prop: string;
  gini_coeff_top_100?: number;
  hhi?: number;
  realized_pnl_tao?: string;
  unrealized_pnl_tao?: string;
  signal_score: number;
  signal_breakdown: SignalBreakdown;
  price_vs_ath_60d_pct: number;
  social_score: number;
  latest_unique_authors: number;
  latest_total_messages: number;
  total_analyses_24h: number;
  last_analysis_timestamp: string | null;
  tao_needed_to_sustain: number;
  tags: string[];
  discord?: string;
  twitter?: string;
  github?: string;
  website?: string;
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
  root_claim_stats?: Record<string, any>;
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

type TabId = "signal" | "all" | "social" | "sustainability";
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

function signalColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function riskColor(taoNeeded: number): string {
  if (taoNeeded < 50) return "text-emerald-400";
  if (taoNeeded < 200) return "text-amber-400";
  return "text-red-400";
}

function riskLabel(taoNeeded: number): string {
  if (taoNeeded < 50) return "Low";
  if (taoNeeded < 200) return "Medium";
  return "High";
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────

function Sparkline({
  data,
  positive,
  width = 80,
  height = 24,
}: {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const color = positive ? "#34d399" : "#f87171";
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
    >
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

// ─── Signal Score Bar ────────────────────────────────────────────────────────

function SignalScoreBar({ score }: { score: number }) {
  const color = signalColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="absolute h-full rounded-full"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}

// ─── Price Range Bar (60d) ───────────────────────────────────────────────────

function PriceRangeBar({
  pct,
}: {
  pct: number;
}) {
  return (
    <div className="relative w-20 h-1.5 bg-white/10 rounded-full">
      <div
        className="absolute h-full w-0.5 bg-white/60 rounded-full"
        style={{ left: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

// ─── Signal Breakdown Panel ──────────────────────────────────────────────────

function SignalBreakdownPanel({
  breakdown,
  subnet,
}: {
  breakdown: SignalBreakdown;
  subnet: SubnetData;
}) {
  const components = [
    {
      label: "Momentum",
      score: breakdown.momentum_score,
      detail: `${fmtPct(num(subnet.price_change_7d))} 7d`,
      weight: "30%",
    },
    {
      label: "Flow",
      score: breakdown.flow_score,
      detail: `${((num(subnet.buy_volume_24h) / (num(subnet.buy_volume_24h) + num(subnet.sell_volume_24h) || 1)) * 100).toFixed(0)}% buy`,
      weight: "25%",
    },
    {
      label: "Emission",
      score: breakdown.emission_score,
      detail: `${num(subnet.emission_pct).toFixed(2)}% of network`,
      weight: "20%",
    },
    {
      label: "Social",
      score: breakdown.social_score,
      detail: `${fmtNumber(subnet.latest_total_messages)} messages`,
      weight: "15%",
    },
    {
      label: "Health",
      score: breakdown.health_score,
      detail: `Gini: ${(subnet.gini_coeff_top_100 ?? 0).toFixed(2)}`,
      weight: "10%",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 px-4 py-3 bg-white/[0.02] border-t border-white/[0.06]">
      {components.map((c) => (
        <div key={c.label} className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-[10px] uppercase tracking-wider">
              {c.label} ({c.weight})
            </span>
            <span
              className="text-xs font-mono"
              style={{ color: signalColor(c.score) }}
            >
              {c.score.toFixed(0)}
            </span>
          </div>
          <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="absolute h-full rounded-full transition-all"
              style={{
                width: `${c.score}%`,
                background: signalColor(c.score),
              }}
            />
          </div>
          <span className="text-white/30 text-[10px]">{c.detail}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Signal Card (top movers) ────────────────────────────────────────────────

function SignalCard({
  subnet,
  onClick,
}: {
  subnet: SubnetData;
  onClick: () => void;
}) {
  const ch24h = num(subnet.price_change_24h);
  const ch7d = num(subnet.price_change_7d);
  const emission = num(subnet.emission_pct);

  // Pick top 2 signal drivers
  const drivers: string[] = [];
  if (Math.abs(ch7d) > 5)
    drivers.push(`${ch7d > 0 ? "🔥" : "📉"} ${fmtPct(ch7d)} 7d`);
  if (emission > 2) drivers.push(`⚡ ${emission.toFixed(1)}% emission`);
  const buyPct =
    (num(subnet.buy_volume_24h) /
      (num(subnet.buy_volume_24h) + num(subnet.sell_volume_24h) || 1)) *
    100;
  if (buyPct > 65) drivers.push(`💰 ${buyPct.toFixed(0)}% buy`);
  if (subnet.latest_total_messages > 50 && drivers.length < 2)
    drivers.push(`📊 ${fmtNumber(subnet.latest_total_messages)} msgs`);
  if (Math.abs(ch24h) > 3 && drivers.length < 2)
    drivers.push(`${ch24h > 0 ? "📈" : "📉"} ${fmtPct(ch24h)} 24h`);

  return (
    <button
      onClick={onClick}
      className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-3 text-left hover:bg-white/[0.06] hover:border-white/[0.12] transition-all group"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-white font-medium text-sm truncate">
            {subnet.name}
          </span>
          <Badge className="bg-white/10 text-white/60 border-white/10 text-[9px] px-1 py-0 shrink-0">
            {subnet.symbol}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white font-mono text-sm">
          {fmtTao(num(subnet.price))}
        </span>
        <span className={`text-xs font-mono ${pctColor(ch24h)}`}>
          {fmtPct(ch24h)}
        </span>
      </div>
      <div className="mb-2">
        <SignalScoreBar score={subnet.signal_score} />
      </div>
      <div className="mb-2">
        <Sparkline
          data={subnet.seven_day_price_history}
          positive={ch7d >= 0}
          width={120}
          height={28}
        />
      </div>
      {drivers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {drivers.slice(0, 2).map((d, i) => (
            <span
              key={i}
              className="text-[10px] bg-white/[0.06] rounded px-1.5 py-0.5 text-white/60"
            >
              {d}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-full rounded-lg bg-orange-500/20" />
      <div className="flex gap-3 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-14 w-40 rounded-lg bg-white/[0.04] border border-white/[0.08]"
          />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-lg bg-white/[0.04] border border-white/[0.08]"
          />
        ))}
      </div>
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
  const [activeTab, setActiveTab] = useState<TabId>("signal");
  const [expandedSignalRow, setExpandedSignalRow] = useState<number | null>(
    null
  );
  const [selectedNetuid, setSelectedNetuid] = useState<number | null>(null);
  const [showMetagraph, setShowMetagraph] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [showBlocksChart, setShowBlocksChart] = useState(false);
  const [blockScale, setBlockScale] = useState<"days" | "hours">("days");

  // Sort state per tab
  const [signalSortKey, setSignalSortKey] = useState<string>("signal_score");
  const [signalSortDir, setSignalSortDir] = useState<SortDir>("desc");
  const [allSortKey, setAllSortKey] = useState<string>("market_cap");
  const [allSortDir, setAllSortDir] = useState<SortDir>("desc");
  const [socialSortKey, setSocialSortKey] = useState<string>("latest_total_messages");
  const [socialSortDir, setSocialSortDir] = useState<SortDir>("desc");
  const [sustainSortKey, setSustainSortKey] = useState<string>(
    "tao_needed_to_sustain"
  );
  const [sustainSortDir, setSustainSortDir] = useState<SortDir>("desc");

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

  // ─── Derived data ───────────────────────────────────────────────────────

  const subnets = dashboard?.subnets ?? [];

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    subnets.forEach((s) => s.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [subnets]);

  // Signal board top movers (top 8 by signal_score)
  const topSignal = useMemo(() => {
    return [...subnets]
      .sort((a, b) => (b.signal_score ?? 0) - (a.signal_score ?? 0))
      .slice(0, 8);
  }, [subnets]);

  // Filtered/sorted for All Subnets tab
  const filteredSubnets = useMemo(() => {
    let arr = [...subnets];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.symbol.toLowerCase().includes(q) ||
          String(s.netuid).includes(q)
      );
    }
    if (selectedTag) {
      arr = arr.filter((s) => s.tags?.includes(selectedTag));
    }
    arr.sort((a, b) => {
      const av = num((a as any)[allSortKey]);
      const bv = num((b as any)[allSortKey]);
      return allSortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [subnets, searchQuery, selectedTag, allSortKey, allSortDir]);

  // Social tab sorted
  const socialSubnets = useMemo(() => {
    return [...subnets].sort((a, b) => {
      const av = num((a as any)[socialSortKey]);
      const bv = num((b as any)[socialSortKey]);
      return socialSortDir === "asc" ? av - bv : bv - av;
    });
  }, [subnets, socialSortKey, socialSortDir]);

  // Sustainability tab sorted
  const sustainSubnets = useMemo(() => {
    return [...subnets].sort((a, b) => {
      const av = num((a as any)[sustainSortKey]);
      const bv = num((b as any)[sustainSortKey]);
      return sustainSortDir === "asc" ? av - bv : bv - av;
    });
  }, [subnets, sustainSortKey, sustainSortDir]);

  // Signal feed sorted
  const signalSubnets = useMemo(() => {
    return [...subnets].sort((a, b) => {
      const av = num((a as any)[signalSortKey]);
      const bv = num((b as any)[signalSortKey]);
      return signalSortDir === "asc" ? av - bv : bv - av;
    });
  }, [subnets, signalSortKey, signalSortDir]);

  // Sort helpers
  const handleSignalSort = (key: string) => {
    if (signalSortKey === key) setSignalSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSignalSortKey(key); setSignalSortDir("desc"); }
  };
  const handleAllSort = (key: string) => {
    if (allSortKey === key) setAllSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setAllSortKey(key); setAllSortDir("desc"); }
  };
  const handleSocialSort = (key: string) => {
    if (socialSortKey === key) setSocialSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSocialSortKey(key); setSocialSortDir("desc"); }
  };
  const handleSustainSort = (key: string) => {
    if (sustainSortKey === key) setSustainSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSustainSortKey(key); setSustainSortDir("desc"); }
  };

  const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
    if (!active) return <ArrowUpDown className="w-3 h-3 inline ml-0.5 opacity-30" />;
    return dir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5" />
    );
  };

  // Price chart data
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

  const blocksData = useMemo(() => {
    const raw = blocksHistory?.data || (blocksHistory as any);
    if (!Array.isArray(raw)) return [];
    return raw;
  }, [blocksHistory]);

  const blockTarget = blockScale === "days" ? 7200 : 300;

  // Top 10 validators from metagraph
  const topValidators = useMemo(() => {
    const raw = metagraph?.data || (metagraph as any);
    if (!Array.isArray(raw)) return [];
    return [...raw]
      .sort(
        (a, b) => num(b.stake_weight ?? b.stake) - num(a.stake_weight ?? a.stake)
      )
      .slice(0, 10);
  }, [metagraph]);

  const selectedSubnet = useMemo(
    () => subnets.find((s) => s.netuid === selectedNetuid) ?? null,
    [subnets, selectedNetuid]
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  if (isLoading) return <DashboardSkeleton />;

  const taoPrice = num(dashboard?.tao_price?.price);
  const taoChange = num(dashboard?.tao_price?.change_24h);
  const fearScore = dashboard?.total_market?.fear_greed_score ?? 0;
  const fearLabel = dashboard?.total_market?.fear_greed_label ?? "N/A";
  const blockNumber = dashboard?.block_number;
  const rootClaim = dashboard?.root_claim_stats;
  const hasError = error || dashboard?.error;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "signal",
      label: "Signal Feed",
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      id: "all",
      label: "All Subnets",
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      id: "social",
      label: "Social Pulse",
      icon: <MessageCircle className="w-3.5 h-3.5" />,
    },
    {
      id: "sustainability",
      label: "Sustainability",
      icon: <Shield className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ════════════════════ 1. HEADER BAR ════════════════════ */}
      <div className="bg-[#f97316] rounded-lg px-4 py-2.5 flex items-center justify-between">
        <span className="text-black font-mono font-bold text-sm tracking-wider">
          TAO SIGNAL INTELLIGENCE
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

      {/* ════════════════════ 2. HEADER STATS BAR ════════════════════ */}
      <div className="flex flex-wrap gap-2 overflow-x-auto">
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

        {/* Fear & Greed */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Fear & Greed
          </span>
          <span className="text-orange-400 font-bold font-mono text-sm">
            {fearScore}
          </span>
          <span className="text-white/40 text-xs">({fearLabel})</span>
        </div>

        {/* Block Number */}
        {blockNumber ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <span className="text-white/50 text-xs uppercase tracking-wider">
              Block
            </span>
            <span className="text-white font-bold font-mono text-sm">
              #{fmtNumber(blockNumber)}
            </span>
          </div>
        ) : null}

        {/* Market Cap */}
        {dashboard?.total_market?.total_price_tao ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <span className="text-white/50 text-xs uppercase tracking-wider">
              Mkt Cap
            </span>
            <span className="text-white font-bold font-mono text-sm">
              τ{fmtNumber(Math.round(num(dashboard.total_market.total_price_tao)))}
            </span>
          </div>
        ) : null}

        {/* Root Claim Stats */}
        {rootClaim && (rootClaim.apy || rootClaim.daily_reward_tao) ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
            <span className="text-white/50 text-xs uppercase tracking-wider">
              Root APY
            </span>
            <span className="text-emerald-400 font-bold font-mono text-sm">
              {rootClaim.apy
                ? `${num(rootClaim.apy).toFixed(1)}%`
                : `τ${num(rootClaim.daily_reward_tao).toFixed(2)}/d`}
            </span>
          </div>
        ) : null}

        {/* Subnet Count */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <span className="text-white/50 text-xs uppercase tracking-wider">
            Subnets
          </span>
          <span className="text-white font-bold font-mono text-sm">
            {subnets.length}
          </span>
        </div>
      </div>

      {/* ════════════════════ 3. ERROR STATE ════════════════════ */}
      {hasError && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-medium">
            {dashboard?.error || "Failed to load Bittensor data"}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 rounded-md bg-red-500/20 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw className="w-3 h-3 inline mr-1.5" />
            Retry
          </button>
        </div>
      )}

      {/* ════════════════════ 4. SIGNAL BOARD — TOP MOVERS ════════════════════ */}
      {topSignal.length > 0 && (
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-white/70 text-sm font-medium font-mono tracking-wider">
              TOP SIGNAL
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {topSignal.map((s) => (
              <SignalCard
                key={s.netuid}
                subnet={s}
                onClick={() => {
                  setSelectedNetuid(s.netuid);
                  setActiveTab("signal");
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════ 5. TAB BAR ════════════════════ */}
      <div className="flex gap-1 border-b border-white/[0.08] pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab.id
                ? "text-orange-400 border-orange-400"
                : "text-white/40 border-transparent hover:text-white/60"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════ SIGNAL FEED TAB ════════════════════ */}
      {activeTab === "signal" && (
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/[0.08]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-white/50 font-medium w-10">
                      #
                    </th>
                    <th className="px-3 py-2.5 text-left text-white/50 font-medium">
                      Subnet
                    </th>
                    {([
                      ["signal_score", "Signal"],
                      ["price", "Price (τ)"],
                      ["price_change_1h", "1h%"],
                      ["price_change_24h", "24h%"],
                      ["price_change_7d", "7d%"],
                      ["volume_24h", "Vol 24h"],
                      ["emission_pct", "Emission%"],
                    ] as [string, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => handleSignalSort(key)}
                        className="px-3 py-2.5 text-left text-white/50 font-medium cursor-pointer hover:text-white/80 select-none whitespace-nowrap"
                      >
                        {label}
                        <SortIcon active={signalSortKey === key} dir={signalSortDir} />
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left text-white/50 font-medium">
                      Flow
                    </th>
                    <th className="px-3 py-2.5 text-left text-white/50 font-medium">
                      7D
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {signalSubnets.map((s, idx) => {
                      const ch1h = num(s.price_change_1h);
                      const ch24h = num(s.price_change_24h);
                      const ch7d = num(s.price_change_7d);
                      const buyVol = num(s.buy_volume_24h);
                      const sellVol = num(s.sell_volume_24h);
                      const buyPct =
                        buyVol + sellVol > 0
                          ? (buyVol / (buyVol + sellVol)) * 100
                          : 50;
                      const isExpanded = expandedSignalRow === s.netuid;

                      return (
                        <React.Fragment key={s.netuid}>
                          <tr
                            onClick={() => setExpandedSignalRow(isExpanded ? null : s.netuid)}
                            className={`cursor-pointer border-b border-white/[0.04] transition-colors ${
                              isExpanded
                                ? "bg-orange-500/10"
                                : "hover:bg-white/[0.04]"
                            }`}
                          >
                            <td className="px-3 py-2 text-white/40 font-mono text-xs">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-white font-medium text-xs">{s.name}</span>
                              {s.symbol && (
                                <Badge className="ml-1.5 bg-white/10 text-white/60 border-white/10 text-[9px] px-1 py-0">
                                  {s.symbol}
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3 inline ml-1 text-white/30" />
                              ) : (
                                <ChevronDown className="w-3 h-3 inline ml-1 text-white/30" />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <SignalScoreBar score={s.signal_score ?? 0} />
                            </td>
                            <td className="px-3 py-2 font-mono text-white text-xs">
                              {fmtTao(num(s.price))}
                            </td>
                            <td className={`px-3 py-2 font-mono text-xs ${pctColor(ch1h)}`}>
                              {fmtPct(ch1h)}
                            </td>
                            <td className={`px-3 py-2 font-mono text-xs ${pctColor(ch24h)}`}>
                              {fmtPct(ch24h)}
                            </td>
                            <td className={`px-3 py-2 font-mono text-xs ${pctColor(ch7d)}`}>
                              {fmtPct(ch7d)}
                            </td>
                            <td className="px-3 py-2 font-mono text-white/60 text-xs">
                              {fmtTao(num(s.volume_24h))}
                            </td>
                            <td className="px-3 py-2 font-mono text-white/60 text-xs">
                              {num(s.emission_pct).toFixed(2)}%
                            </td>
                            <td className={`px-3 py-2 font-mono text-xs ${buyPct >= 55 ? "text-emerald-400" : buyPct <= 45 ? "text-red-400" : "text-white/60"}`}>
                              {buyPct.toFixed(0)}%
                            </td>
                            <td className="px-3 py-2">
                              <Sparkline
                                data={s.seven_day_price_history}
                                positive={ch7d >= 0}
                                width={60}
                                height={20}
                              />
                            </td>
                          </tr>
                          {isExpanded && s.signal_breakdown && (
                            <tr>
                              <td colSpan={11} className="p-0">
                                <SignalBreakdownPanel
                                  breakdown={s.signal_breakdown}
                                  subnet={s}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ ALL SUBNETS TAB ════════════════════ */}
      {activeTab === "all" && (
        <div className="space-y-3">
          {/* Search & filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search subnets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-orange-500/40"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="px-2 py-1 text-[10px] rounded bg-orange-500/20 text-orange-400 border border-orange-500/30"
                >
                  Clear: {selectedTag} ✕
                </button>
              )}
              {allTags.slice(0, 10).map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setSelectedTag(selectedTag === tag ? null : tag)
                  }
                  className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                    selectedTag === tag
                      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                      : "bg-white/[0.04] text-white/40 border-white/[0.06] hover:text-white/60"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/[0.08]">
                    <tr>
                      {(
                        [
                          ["netuid", "#"],
                          ["name", "Name"],
                          ["price", "Price"],
                          ["price_change_1h", "1h"],
                          ["price_change_24h", "24h"],
                          ["price_change_7d", "7d"],
                          ["price_change_30d", "30d"],
                          ["volume_24h", "Vol 24h"],
                          ["buy_volume_24h", "Buy%"],
                          ["market_cap", "Mkt Cap"],
                          ["emission_pct", "Emiss%"],
                          ["tao_in", "TAO In"],
                        ] as [string, string][]
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          onClick={() => handleAllSort(key)}
                          className="px-2 py-2.5 text-left text-white/50 font-medium cursor-pointer hover:text-white/80 select-none whitespace-nowrap"
                        >
                          {label}
                          <SortIcon
                            active={allSortKey === key}
                            dir={allSortDir}
                          />
                        </th>
                      ))}
                      <th className="px-2 py-2.5 text-left text-white/50 font-medium whitespace-nowrap">
                        60d Range
                      </th>
                      <th className="px-2 py-2.5 text-left text-white/50 font-medium whitespace-nowrap">
                        Links
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubnets.map((s) => {
                      const ch1h = num(s.price_change_1h);
                      const ch24h = num(s.price_change_24h);
                      const ch7d = num(s.price_change_7d);
                      const ch30d = num(s.price_change_30d);
                      const buyVol = num(s.buy_volume_24h);
                      const sellVol = num(s.sell_volume_24h);
                      const buyPct =
                        buyVol + sellVol > 0
                          ? (buyVol / (buyVol + sellVol)) * 100
                          : 50;
                      const isSelected = selectedNetuid === s.netuid;

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
                          <td className="px-2 py-2 text-white/60 font-mono">
                            {s.netuid}
                          </td>
                          <td className="px-2 py-2 text-white font-medium whitespace-nowrap max-w-[10rem] truncate">
                            <span title={s.name}>{s.name}</span>
                            {s.tags?.length > 0 && (
                              <span className="ml-1 text-[9px] text-white/20">
                                {s.tags[0]}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-white font-mono">
                            {fmtTao(num(s.price))}
                          </td>
                          <td
                            className={`px-2 py-2 font-mono ${pctColor(ch1h)}`}
                          >
                            {fmtPct(ch1h)}
                          </td>
                          <td
                            className={`px-2 py-2 font-mono ${pctColor(ch24h)}`}
                          >
                            {fmtPct(ch24h)}
                          </td>
                          <td
                            className={`px-2 py-2 font-mono ${pctColor(ch7d)}`}
                          >
                            {fmtPct(ch7d)}
                          </td>
                          <td
                            className={`px-2 py-2 font-mono ${pctColor(ch30d)}`}
                          >
                            {fmtPct(ch30d)}
                          </td>
                          <td className="px-2 py-2 text-white/70 font-mono">
                            {fmtTao(num(s.volume_24h))}
                          </td>
                          <td
                            className={`px-2 py-2 font-mono ${buyPct >= 55 ? "text-emerald-400" : buyPct <= 45 ? "text-red-400" : "text-white/60"}`}
                          >
                            {buyPct.toFixed(0)}%
                          </td>
                          <td className="px-2 py-2 text-white/80 font-mono">
                            {fmtTao(num(s.market_cap))}
                          </td>
                          <td className="px-2 py-2 text-white/70 font-mono">
                            {num(s.emission_pct).toFixed(2)}%
                          </td>
                          <td className="px-2 py-2 text-white/70 font-mono">
                            {fmtTao(num(s.tao_in))}
                          </td>
                          <td className="px-2 py-2">
                            <PriceRangeBar pct={s.price_vs_ath_60d_pct ?? 50} />
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              {s.discord && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSecureLink(s.discord!);
                                  }}
                                  className="text-white/30 hover:text-indigo-400"
                                  title="Discord"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                </button>
                              )}
                              {s.github && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSecureLink(s.github!);
                                  }}
                                  className="text-white/30 hover:text-white"
                                  title="GitHub"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                              {s.website && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openSecureLink(s.website!);
                                  }}
                                  className="text-white/30 hover:text-sky-400"
                                  title="Website"
                                >
                                  <Globe className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ SOCIAL PULSE TAB ════════════════════ */}
      {activeTab === "social" && (
        <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/[0.08]">
                  <tr>
                    <th className="px-3 py-2.5 text-left text-white/50 font-medium w-10">
                      #
                    </th>
                    {([
                      ["name", "Subnet"],
                      ["latest_total_messages", "Total Messages"],
                      ["latest_unique_authors", "Unique Authors"],
                      ["total_analyses_24h", "Analyses (24h)"],
                    ] as [string, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => handleSocialSort(key)}
                        className="px-3 py-2.5 text-left text-white/50 font-medium cursor-pointer hover:text-white/80 select-none whitespace-nowrap"
                      >
                        {label}
                        <SortIcon
                          active={socialSortKey === key}
                          dir={socialSortDir}
                        />
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-left text-white/50 font-medium">
                      Last Analysis
                    </th>
                    <th className="px-3 py-2.5 text-left text-white/50 font-medium">
                      Signal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {socialSubnets.map((s, idx) => (
                      <tr
                        key={s.netuid}
                        className="border-b border-white/[0.04] hover:bg-white/[0.04]"
                      >
                        <td className="px-3 py-2 text-white/40 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 text-white font-medium whitespace-nowrap">
                          <span className="text-white/40 font-mono mr-1.5">
                            {s.netuid}
                          </span>
                          {s.name}
                          {s.symbol && (
                            <span className="text-white/30 ml-1 text-[10px]">
                              {s.symbol}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-white/70 font-mono">
                          {fmtNumber(s.latest_total_messages ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-white/70 font-mono">
                          {fmtNumber(s.latest_unique_authors ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-white/70 font-mono">
                          {fmtNumber(s.total_analyses_24h ?? 0)}
                        </td>
                        <td className="px-3 py-2 text-white/50 font-mono text-[10px]">
                          {s.last_analysis_timestamp
                            ? new Date(s.last_analysis_timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <SignalScoreBar score={s.signal_score ?? 0} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ SUSTAINABILITY TAB ════════════════════ */}
      {activeTab === "sustainability" && (
        <div className="space-y-3">
          <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] px-4 py-3">
            <p className="text-white/50 text-xs">
              TAO needed to sustain current alpha prices. High values indicate
              the subnet may be overvalued relative to inflow.
            </p>
          </div>
          <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-[#0a0a0f] border-b border-white/[0.08]">
                    <tr>
                      {(
                        [
                          ["name", "Subnet"],
                          ["price", "Price (τ)"],
                          ["tao_needed_to_sustain", "TAO Needed"],
                          ["tao_needed_to_sustain", "Risk"],
                          ["gini_coeff_top_100", "Gini"],
                          ["hhi", "HHI"],
                          ["realized_pnl_tao", "Realized PnL"],
                          ["unrealized_pnl_tao", "Unrealized PnL"],
                        ] as [string, string][]
                      ).map(([key, label], idx) => (
                        <th
                          key={`${key}-${idx}`}
                          onClick={() => handleSustainSort(key)}
                          className="px-3 py-2.5 text-left text-white/50 font-medium cursor-pointer hover:text-white/80 select-none whitespace-nowrap"
                        >
                          {label}
                          <SortIcon
                            active={sustainSortKey === key}
                            dir={sustainSortDir}
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sustainSubnets.map((s) => {
                      const taoNeeded = s.tao_needed_to_sustain ?? 0;
                      return (
                        <tr
                          key={s.netuid}
                          className="border-b border-white/[0.04] hover:bg-white/[0.04]"
                        >
                          <td className="px-3 py-2 text-white font-medium whitespace-nowrap">
                            <span className="text-white/40 font-mono mr-1.5">
                              {s.netuid}
                            </span>
                            {s.name}
                          </td>
                          <td className="px-3 py-2 text-white font-mono">
                            {fmtTao(num(s.price))}
                          </td>
                          <td className={`px-3 py-2 font-mono ${riskColor(taoNeeded)}`}>
                            {fmtTao(taoNeeded)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              className={`text-[10px] px-1.5 py-0 border ${
                                taoNeeded < 50
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : taoNeeded < 200
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                              }`}
                            >
                              {riskLabel(taoNeeded)}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-white/70 font-mono">
                            {(s.gini_coeff_top_100 ?? 0).toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-white/70 font-mono">
                            {(s.hhi ?? 0).toFixed(1)}
                          </td>
                          <td
                            className={`px-3 py-2 font-mono ${pctColor(num(s.realized_pnl_tao))}`}
                          >
                            {fmtTao(num(s.realized_pnl_tao))}
                          </td>
                          <td
                            className={`px-3 py-2 font-mono ${pctColor(num(s.unrealized_pnl_tao))}`}
                          >
                            {fmtTao(num(s.unrealized_pnl_tao))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════ SUBNET DETAIL PANEL ════════════════════ */}
      {selectedSubnet && (
        <div className="rounded-lg bg-white/[0.04] border border-orange-500/20 p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                SN{selectedSubnet.netuid} — {selectedSubnet.name || "Unknown"}
                {selectedSubnet.symbol && (
                  <Badge className="ml-2 bg-white/10 text-white/60 border-white/10 text-[10px]">
                    {selectedSubnet.symbol}
                  </Badge>
                )}
              </h3>
              {selectedSubnet.description && (
                <p className="text-white/40 text-sm mt-1 max-w-2xl">
                  {selectedSubnet.description}
                </p>
              )}
              {selectedSubnet.tags?.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {selectedSubnet.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="bg-white/[0.06] text-white/50 border-white/10 text-[10px]"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
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
              ["Market Cap", fmtTao(num(selectedSubnet.market_cap))],
              [
                "Emission",
                num(selectedSubnet.emission_pct).toFixed(2) + "%",
              ],
              ["TAO Pool", fmtTao(num(selectedSubnet.tao_in))],
              ["Signal", selectedSubnet.signal_score?.toFixed(0) ?? "N/A"],
              ["Vol 24h", fmtTao(num(selectedSubnet.volume_24h))],
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

          {/* Signal Breakdown */}
          {selectedSubnet.signal_breakdown && (
            <SignalBreakdownPanel
              breakdown={selectedSubnet.signal_breakdown}
              subnet={selectedSubnet}
            />
          )}

          {/* Metagraph */}
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

      {/* ════════════════════ CHARTS (collapsible) ════════════════════ */}
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
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

      {/* Blocks chart */}
      <div className="rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setShowBlocksChart((v) => !v)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-white/70 text-sm font-medium font-mono">
              BLOCKS EMITTED / {blockScale === "days" ? "DAY" : "HOUR"}{" "}
              &nbsp;|&nbsp; Target: {fmtNumber(blockTarget)}
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
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
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
                    label={{
                      value: "Target",
                      fill: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                      position: "right",
                    }}
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

      {/* ════════════════════ EXTERNAL RESOURCES ════════════════════ */}
      <details className="mt-6 rounded-lg bg-white/[0.04] border border-white/[0.08] overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors text-white/50 text-sm font-medium select-none list-none flex items-center justify-between">
          <span>External Resources & Tools</span>
          <ChevronDown className="w-4 h-4" />
        </summary>

        <div className="p-4 space-y-6">
          <ResourceEmbed
            title="TaoBot"
            url="https://www.tao.bot/explore"
            color="text-blue-400"
          />

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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResourceEmbed
              title="TaoTensorLaw"
              url="https://taotensorlaw.com/"
              color="text-blue-400"
            />
            <ResourceEmbed
              title="TaoMarketCap"
              url="https://taomarketcap.com/blockchain/accounts"
              color="text-orange-400"
            />
          </div>

          <ResourceEmbed
            title="TaoYield"
            url="https://www.taoyield.com/"
            color="text-emerald-400"
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResourceEmbed
              title="TaoRevenue"
              url="https://taorevenue.com/"
              color="text-purple-400"
            />
            <ResourceEmbed
              title="Backprop Finance"
              url="https://backprop.finance/screener/bubbles"
              color="text-green-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResourceEmbed
              title="TaoTrack Simulator"
              url="https://taotrack.com/simulator"
              color="text-cyan-400"
            />
            <ResourceEmbed
              title="TaoCagr"
              url="https://taocagr.com/"
              color="text-amber-400"
            />
          </div>

          <ResourceEmbed
            title="TaoGalaxy"
            url="https://taogalaxy.com/app"
            color="text-pink-400"
          />
          <ResourceEmbed
            title="SubnetAlpha"
            url="https://subnetalpha.ai/"
            color="text-indigo-400"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ResourceEmbed
              title="TaoBridge"
              url="https://taobridge.xyz/"
              color="text-purple-400"
            />
            <ResourceEmbed
              title="TaoFi Swap"
              url="https://www.taofi.com/swap"
              color="text-teal-400"
            />
            <ResourceEmbed
              title="VoidAI Bridge"
              url="https://bridge.voidai.com/bridge-chains"
              color="text-violet-400"
            />
          </div>

          <ResourceEmbed
            title="TaoHub Portfolio"
            url="https://www.taohub.info/"
            color="text-white/50"
          />
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
  const colors: Record<
    string,
    { bg: string; border: string; text: string; icon: string }
  > = {
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
