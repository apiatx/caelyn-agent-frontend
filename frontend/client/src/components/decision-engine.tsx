import { useState, useEffect, useCallback, useRef, memo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  AlertTriangle,
  Activity,
  Info,
  ExternalLink,
  RefreshCw,
  Waves,
  Eye,
  Users,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Shuffle,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────
const AGENT_BACKEND_URL = "https://fast-api-server-aidanpilon.replit.app";
const AGENT_API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";
const POLL_INTERVAL_MS = 90_000;

function getToken(): string | null {
  return localStorage.getItem('caelyn_jwt') || sessionStorage.getItem('caelyn_jwt');
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

// ─── Types ────────────────────────────────────────────────────────
interface RecommendationMarket {
  condition_id?: string;
  question?: string;
  title?: string;
  slug?: string;
  yes_price?: number;
  yes_pct?: number;
  no_price?: number;
  volume_24h?: number;
  liquidity?: number;
  spread?: number;
  spread_pct?: number;
  days_to_expiry?: number;
  end_date?: string;
  price_change_1d?: number;
  price_change_24h?: number;
  conviction_score?: number;
  momentum_score?: number;
  flow_score?: number;
  execution_quality_score?: number;
  participation_quality_score?: number;
  time_quality_score?: number;
  trap_risk_score?: number;
  composite_score?: number;
  momentum_label?: string;
  reasons?: string[];
  direction?: string;
  tags?: string[];
}

interface RecommendationsResponse {
  best_bet_now?: RecommendationMarket | RecommendationMarket[];
  best_yes_setup?: RecommendationMarket | RecommendationMarket[];
  best_no_setup?: RecommendationMarket | RecommendationMarket[];
  best_momentum_continuation?: RecommendationMarket | RecommendationMarket[];
  best_mean_reversion_candidate?: RecommendationMarket | RecommendationMarket[];
  best_whale_follow?: RecommendationMarket | RecommendationMarket[];
  avoid_or_trap_markets?: RecommendationMarket | RecommendationMarket[];
  best_execution_quality?: RecommendationMarket | RecommendationMarket[];
  strongest_flow_without_confirmation?: RecommendationMarket | RecommendationMarket[];
  strongest_conviction_with_good_execution?: RecommendationMarket | RecommendationMarket[];
}

// Tracked across polls to determine Best Bet stability
interface BestBetMeta {
  streak: number;           // how many consecutive polls this same market was #1
  changedAt: number | null; // Date.now() when last flip occurred
  prevTitle: string | null; // title of the market before the last flip
  prevDirection: string | null;
  prevConditionId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractFirst(val: RecommendationMarket | RecommendationMarket[] | undefined): RecommendationMarket | null {
  if (!val) return null;
  if (Array.isArray(val)) return val[0] ?? null;
  return val;
}

function formatDollars(v: number | undefined | null): string | null {
  if (v == null) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatPercent(v: number | undefined | null): string | null {
  if (v == null) return null;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function getDirection(market: RecommendationMarket, bucketKey: string): "YES" | "NO" | "AVOID" {
  if (bucketKey === "avoid_or_trap_markets") return "AVOID";
  if (market.direction) {
    const d = market.direction.toUpperCase();
    if (d.includes("NO") || d.includes("SHORT") || d.includes("SELL")) return "NO";
    if (d.includes("AVOID") || d.includes("TRAP")) return "AVOID";
    return "YES";
  }
  if (bucketKey === "best_no_setup") return "NO";
  return "YES";
}

function getDirectionColor(dir: "YES" | "NO" | "AVOID"): { text: string; bg: string; border: string; glow: string } {
  if (dir === "YES") return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", glow: "shadow-emerald-500/10" };
  if (dir === "NO") return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", glow: "shadow-red-500/10" };
  return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", glow: "shadow-amber-500/10" };
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-blue-400";
  if (score >= 30) return "text-amber-400";
  return "text-red-400";
}

function getScoreBg(score: number): string {
  if (score >= 75) return "from-emerald-500/20 to-emerald-500/5";
  if (score >= 50) return "from-blue-500/20 to-blue-500/5";
  if (score >= 30) return "from-amber-500/20 to-amber-500/5";
  return "from-red-500/20 to-red-500/5";
}

function getMomentumLabel(label: string | undefined): { text: string; color: string } {
  if (!label) return { text: "—", color: "text-white/30" };
  const l = label.toLowerCase().replace(/_/g, " ");
  if (l.includes("strong up")) return { text: "Strong ↑", color: "text-emerald-400" };
  if (l.includes("moderate up")) return { text: "Moderate ↑", color: "text-emerald-300" };
  if (l.includes("strong down")) return { text: "Strong ↓", color: "text-red-400" };
  if (l.includes("moderate down")) return { text: "Moderate ↓", color: "text-red-300" };
  if (l.includes("neutral")) return { text: "Neutral", color: "text-white/40" };
  return { text: label.replace(/_/g, " "), color: "text-white/40" };
}

function formatSecondsAgo(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function formatTimeAgo(ts: number | null): string {
  if (!ts) return "";
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

// ─── Stability helpers ─────────────────────────────────────────────
// A recommendation is considered "stable" if the same market has held
// the top spot for ≥3 consecutive polls (~4.5 minutes at 90s intervals).
const STABLE_THRESHOLD = 3;

function getStabilityLabel(streak: number): { label: string; color: string; bg: string; border: string; icon: React.ReactNode } {
  if (streak >= STABLE_THRESHOLD) {
    return {
      label: "Stable Pick",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: <CheckCircle2 className="w-3 h-3" />,
    };
  }
  if (streak >= 2) {
    return {
      label: "Holding",
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      icon: <Clock className="w-3 h-3" />,
    };
  }
  return {
    label: "New Pick",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: <Shuffle className="w-3 h-3" />,
  };
}

// ─── Bucket config ────────────────────────────────────────────────
interface BucketConfig {
  key: keyof RecommendationsResponse;
  label: string;
  icon: React.ReactNode;
  hero?: boolean;
  danger?: boolean;
}

const PRIMARY_BUCKETS: BucketConfig[] = [
  { key: "best_bet_now", label: "Best Bet Right Now", icon: <Target className="w-4 h-4" />, hero: true },
  { key: "best_yes_setup", label: "Best YES Setup", icon: <TrendingUp className="w-4 h-4" /> },
  { key: "best_no_setup", label: "Best NO Setup", icon: <TrendingDown className="w-4 h-4" /> },
  { key: "best_momentum_continuation", label: "Best Momentum", icon: <Zap className="w-4 h-4" /> },
  { key: "best_mean_reversion_candidate", label: "Best Mean Reversion", icon: <Waves className="w-4 h-4" /> },
  { key: "avoid_or_trap_markets", label: "Avoid / Trap", icon: <ShieldAlert className="w-4 h-4" />, danger: true },
];

const SECONDARY_BUCKETS: BucketConfig[] = [
  { key: "best_whale_follow", label: "Best Whale Follow", icon: <Users className="w-4 h-4" /> },
  { key: "best_execution_quality", label: "Best Execution", icon: <Activity className="w-4 h-4" /> },
  { key: "strongest_flow_without_confirmation", label: "Strongest Flow", icon: <Eye className="w-4 h-4" /> },
  { key: "strongest_conviction_with_good_execution", label: "Strongest Conviction", icon: <Brain className="w-4 h-4" /> },
];

// ─── Skeleton Loader ──────────────────────────────────────────────
function SkeletonCard({ hero = false }: { hero?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.02] animate-pulse ${hero ? "col-span-full p-6" : "p-4"}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
        <div className="h-3 w-24 rounded bg-white/[0.06]" />
      </div>
      <div className="h-4 w-3/4 rounded bg-white/[0.06] mb-2" />
      <div className="h-3 w-1/2 rounded bg-white/[0.04] mb-4" />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
        <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
        <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
      </div>
    </div>
  );
}

// ─── Recommendation Card ──────────────────────────────────────────
const RecommendationCard = memo(function RecommendationCard({
  market,
  bucket,
  justUpdated,
  bestBetMeta,
}: {
  market: RecommendationMarket;
  bucket: BucketConfig;
  justUpdated?: boolean;
  bestBetMeta?: BestBetMeta;
}) {
  const direction = getDirection(market, bucket.key);
  const dirColors = getDirectionColor(direction);
  const score = market.composite_score ?? (market as any).score ?? 0;
  const title = market.question || market.title || (market as any).market_title || "Unknown Market";
  const reasons = market.reasons ?? [];
  const yesPct = market.yes_pct ?? (market.yes_price ? Math.round(market.yes_price * 100) : ((market as any).best_ask ? Math.round((market as any).best_ask * 100) : null));
  const priceChange = market.price_change_24h ?? market.price_change_1d;
  const momentum = getMomentumLabel(market.momentum_label);
  const trapRisk = market.trap_risk_score;
  const execScore = market.execution_quality_score;
  const isHero = bucket.hero === true;
  const isDanger = bucket.danger === true;
  const polyUrl = market.slug ? `https://polymarket.com/event/${market.slug}` : null;

  // Stability display — only for the hero Best Bet card
  const stability = (isHero && bestBetMeta) ? getStabilityLabel(bestBetMeta.streak) : null;
  const recentlyChanged = isHero && bestBetMeta && bestBetMeta.changedAt != null && bestBetMeta.streak < STABLE_THRESHOLD;
  const hadPreviousPick = isHero && bestBetMeta?.prevTitle && bestBetMeta.changedAt != null;

  return (
    <div
      className={`
        relative group rounded-xl border transition-all duration-200
        ${justUpdated ? "ring-1 ring-blue-400/30 animate-[pulse-glow_2s_ease-in-out]" : ""}
        ${isHero
          ? `col-span-full ${isDanger ? "border-amber-500/20 bg-amber-500/[0.03]" : `${dirColors.border} bg-gradient-to-br from-white/[0.04] to-white/[0.01]`} p-5 sm:p-6 shadow-lg ${dirColors.glow}`
          : isDanger
            ? "border-amber-500/20 bg-amber-500/[0.03] hover:border-amber-500/35 p-4"
            : `border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.03] p-4`
        }
      `}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${isDanger ? "bg-amber-500/15 text-amber-400" : `${dirColors.bg} ${dirColors.text}`}`}>
            {bucket.icon}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${isDanger ? "text-amber-400/70" : "text-white/35"}`}>
            {bucket.label}
          </span>

          {/* Stability badge — hero card only */}
          {stability && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${stability.bg} ${stability.color} ${stability.border}`}>
              {stability.icon}
              {stability.label}
            </span>
          )}

          {/* "Changed recently" badge */}
          {recentlyChanged && bestBetMeta?.changedAt && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ArrowRightLeft className="w-2.5 h-2.5" />
              Changed {formatTimeAgo(bestBetMeta.changedAt)}
            </span>
          )}
        </div>

        {/* Score badge */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${getScoreBg(score)} border border-white/[0.06]`}>
          <span className={`text-[10px] font-medium ${isDanger ? "text-amber-400/60" : "text-white/40"}`}>Score</span>
          <span className={`text-sm font-bold tabular-nums ${isDanger ? "text-amber-400" : getScoreColor(score)}`}>
            {score.toFixed(0)}
          </span>
        </div>
      </div>

      {/* Market title */}
      <div className="mb-3">
        <h3 className={`${isHero ? "text-base sm:text-lg" : "text-sm"} font-semibold text-white/90 leading-tight line-clamp-2`}>
          {title}
        </h3>
      </div>

      {/* Direction indicator */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${dirColors.bg} ${dirColors.text} border ${dirColors.border}`}>
          {direction === "YES" && <ArrowUpRight className="w-3 h-3" />}
          {direction === "NO" && <ArrowDownRight className="w-3 h-3" />}
          {direction === "AVOID" && <AlertTriangle className="w-3 h-3" />}
          {direction}
        </span>
        <span className={`text-[10px] font-medium ${momentum.color}`}>
          {momentum.text}
        </span>
      </div>

      {/* "Replaced prior top pick" note — hero card only, shown when pick changed */}
      {hadPreviousPick && bestBetMeta && (
        <div className="mb-3 flex items-start gap-1.5 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <ArrowRightLeft className="w-3 h-3 text-white/25 flex-shrink-0 mt-0.5" />
          <span className="text-[10px] text-white/35 leading-snug">
            Replaced prior top pick:{" "}
            <span className={`font-semibold ${bestBetMeta.prevDirection === "NO" ? "text-red-400/70" : "text-emerald-400/70"}`}>
              {bestBetMeta.prevDirection ?? "YES"}
            </span>{" "}
            <span className="text-white/50">{bestBetMeta.prevTitle}</span>
          </span>
        </div>
      )}

      {/* Reasons bullets */}
      {reasons.length > 0 && (
        <ul className="space-y-1 mb-3">
          {reasons.slice(0, isHero ? 4 : 3).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/50 leading-snug">
              <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${isDanger ? "bg-amber-400/50" : "bg-blue-400/50"}`} />
              <span className="line-clamp-1">{r}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Key metrics row — only render metrics that have real data */}
      <div className="flex items-center gap-3 flex-wrap text-[10px]">
        {yesPct != null && (
          <span className="text-white/40">
            YES <span className="text-white/70 font-semibold">{yesPct}%</span>
          </span>
        )}
        {priceChange != null && formatPercent(priceChange) && (
          <span className="text-white/40">
            24h <span className={`font-semibold ${priceChange > 0 ? "text-emerald-400" : priceChange < 0 ? "text-red-400" : "text-white/50"}`}>
              {formatPercent(priceChange)}
            </span>
          </span>
        )}
        {market.volume_24h != null && formatDollars(market.volume_24h) && (
          <span className="text-white/40">
            Vol <span className="text-white/70 font-semibold">{formatDollars(market.volume_24h)}</span>
          </span>
        )}
        {market.liquidity != null && formatDollars(market.liquidity) && (
          <span className="text-white/40">
            Liq <span className="text-white/70 font-semibold">{formatDollars(market.liquidity)}</span>
          </span>
        )}
        {market.spread != null && (
          <span className="text-white/40">
            Spread <span className="text-white/70 font-semibold">{market.spread.toFixed(1)}¢</span>
          </span>
        )}
        {market.days_to_expiry != null && (
          <span className="text-white/40">
            Exp <span className="text-white/70 font-semibold">{market.days_to_expiry}d</span>
          </span>
        )}
      </div>

      {/* Bottom badges row — only show when data is available */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {execScore != null && execScore > 0 && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
            execScore >= 70 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
            execScore >= 40 ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
            "bg-white/[0.04] border-white/[0.08] text-white/40"
          }`}>
            <Activity className="w-2.5 h-2.5" />
            Execution {execScore.toFixed(0)}
          </span>
        )}
        {trapRisk != null && (isDanger || trapRisk >= 50) && (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
            trapRisk >= 70 ? "bg-red-500/10 border-red-500/20 text-red-400" :
            "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}>
            <AlertTriangle className="w-2.5 h-2.5" />
            Trap Risk {trapRisk.toFixed(0)}
          </span>
        )}
        {polyUrl && (
          <a
            href={polyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border bg-white/[0.03] border-white/[0.08] text-white/30 hover:text-white/60 hover:border-white/[0.15] transition-colors ml-auto"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Polymarket
          </a>
        )}
      </div>
    </div>
  );
});

// ─── Main Decision Engine Component ───────────────────────────────
export function DecisionEngine() {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [justUpdated, setJustUpdated] = useState(false);
  const [bestBetMeta, setBestBetMeta] = useState<BestBetMeta>({
    streak: 0,
    changedAt: null,
    prevTitle: null,
    prevDirection: null,
    prevConditionId: null,
  });
  const fetchingRef = useRef(false);
  const prevBestBetRef = useRef<{ conditionId: string | null; title: string | null; direction: string | null }>({
    conditionId: null,
    title: null,
    direction: null,
  });

  const fetchRecommendations = useCallback(async (isManual = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (isManual) setLoading(true);
    try {
      let res = await fetch("/api/predict/recommendations", { headers: authHeaders() });
      if (!res.ok) {
        res = await fetch(`${AGENT_BACKEND_URL}/api/predict/recommendations`, { headers: authHeaders() });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json = await res.json();
      const payload = json?.recommendations ?? json?.data ?? json;
      setData(payload);
      setError(null);
      setLastFetchTime(Date.now());
      setJustUpdated(true);

      // ── Best Bet stability tracking ──────────────────────────────
      const newBestBet = extractFirst(payload?.best_bet_now);
      const newId = newBestBet?.condition_id ?? newBestBet?.slug ?? null;
      const newTitle = newBestBet?.question || newBestBet?.title || null;
      const newDir = newBestBet
        ? (newBestBet.direction?.toUpperCase().startsWith("NO") ? "NO" : "YES")
        : null;

      const prev = prevBestBetRef.current;
      if (newId && prev.conditionId && newId !== prev.conditionId) {
        // Top pick flipped — reset streak, record change
        setBestBetMeta({
          streak: 1,
          changedAt: Date.now(),
          prevTitle: prev.title,
          prevDirection: prev.direction,
          prevConditionId: prev.conditionId,
        });
      } else if (newId) {
        // Same pick holding — increment streak
        setBestBetMeta(m => ({
          ...m,
          streak: m.streak + 1,
        }));
      }

      // Always update the ref to the current pick
      if (newId || newTitle) {
        prevBestBetRef.current = { conditionId: newId, title: newTitle, direction: newDir };
      }
    } catch (e: any) {
      console.error("[DecisionEngine] Failed to fetch recommendations:", e);
      if (!data) {
        setError("Unable to load signal recommendations");
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [data]);

  useEffect(() => {
    fetchRecommendations(true);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => fetchRecommendations(false), POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchRecommendations]);

  useEffect(() => {
    if (!lastFetchTime) return;
    const tick = () => setSecondsAgo(Math.floor((Date.now() - lastFetchTime) / 1000));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [lastFetchTime]);

  useEffect(() => {
    if (!justUpdated) return;
    const t = setTimeout(() => setJustUpdated(false), 5000);
    return () => clearTimeout(t);
  }, [justUpdated]);

  const hasData = data && PRIMARY_BUCKETS.some(b => extractFirst(data[b.key]) !== null);

  if (!loading && !hasData) {
    return (
      <GlassCard className="p-5 mb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
            <Brain className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Prophetik Signal Engine</h2>
            <p className="text-[10px] text-white/30">Best setups right now, ranked by edge, flow, execution, and crowd quality</p>
          </div>
        </div>
        <div className="text-center py-6 text-sm text-white/25">
          {error || "No signal recommendations available right now. Markets are still being scored."}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5 mb-5">
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(96,165,250,0); }
          50% { box-shadow: 0 0 8px 2px rgba(96,165,250,0.15); }
        }
      `}</style>

      {/* Section header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
            <Brain className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Prophetik Signal Engine</h2>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                LIVE
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-white/20 hover:text-white/50 transition-colors">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs bg-[#0c1018] border-white/10 text-white/70 text-[11px] leading-relaxed p-3">
                    <p className="font-semibold text-white/90 mb-1">How to read these signals</p>
                    <p>This is not a popularity ranking. Markets are scored across odds momentum, conviction strength, liquidity depth, execution quality, participation breadth, and expiry timing.</p>
                    <p className="mt-1">Higher composite scores indicate stronger multi-factor edge. Trap risk flags markets that appear active but may be dangerous to enter.</p>
                    <p className="mt-1 text-white/50">
                      <span className="text-emerald-400 font-semibold">Stable Pick</span> = same #1 for ≥3 polls (~4.5 min).{" "}
                      <span className="text-amber-400 font-semibold">New Pick</span> = just ranked #1 — watch before trading.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-white/30">Best setups right now, ranked by edge, flow, execution, and crowd quality</p>
              {lastFetchTime && (
                <span className="text-[9px] text-white/20 tabular-nums">
                  Updated {formatSecondsAgo(secondsAgo)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={fetchingRef.current}
            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SkeletonCard hero />
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          {/* Primary recommendation cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRIMARY_BUCKETS.map(bucket => {
              const market = extractFirst(data?.[bucket.key]);
              if (!market) return null;
              return (
                <RecommendationCard
                  key={bucket.key}
                  market={market}
                  bucket={bucket}
                  justUpdated={justUpdated}
                  bestBetMeta={bucket.hero ? bestBetMeta : undefined}
                />
              );
            })}
          </div>

          {/* Secondary buckets toggle */}
          <div className="mt-4">
            <button
              onClick={() => setShowSecondary(v => !v)}
              className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              <Eye className="w-3 h-3" />
              {showSecondary ? "Hide" : "Show"} advanced signal buckets
            </button>
          </div>
          {showSecondary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
              {SECONDARY_BUCKETS.map(bucket => {
                const market = extractFirst(data?.[bucket.key]);
                if (!market) return null;
                return <RecommendationCard key={bucket.key} market={market} bucket={bucket} justUpdated={justUpdated} />;
              })}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
