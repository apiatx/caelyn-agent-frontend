import { useState, useEffect, useCallback, useRef, memo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Activity,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Waves,
  Users,
  ShieldAlert,
  Target,
  ArrowRightLeft,
  Clock,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
interface SignalChange {
  timestamp: string;
  market_id?: string;
  market_title?: string;
  change_type: string;
  severity: "high" | "medium" | "low";
  description: string;
  old_value?: any;
  new_value?: any;
  market_slug?: string;
  direction?: string;
  previous_direction?: string;
  previous_title?: string;
}

interface SignalChangesResponse {
  changes: SignalChange[];
  change_count?: number;
  last_updated?: string;
  snapshot_age_seconds?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────

function getRelativeTime(ts: string): string {
  const now = Date.now();
  const then = new Date(ts).getTime();
  if (isNaN(then)) return "";
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

// Classifies whether a change_type is a recommendation-level event
function isRecommendationEvent(changeType: string): boolean {
  return [
    "new_best_bet",
    "best_bet_changed",
    "best_bet_direction_changed",
    "direction_changed",
    "best_bet_score_changed",
    "bucket_entry",
  ].includes(changeType);
}

function getChangeIcon(changeType: string) {
  switch (changeType) {
    case "new_best_bet":
    case "best_bet_changed":
      return <Target className="w-3 h-3" />;
    case "best_bet_direction_changed":
    case "direction_changed":
      return <ArrowRightLeft className="w-3 h-3" />;
    case "bucket_entry":
      return <ArrowUpRight className="w-3 h-3" />;
    case "score_jump":
    case "best_bet_score_changed":
      return <TrendingUp className="w-3 h-3" />;
    case "score_drop":
    case "bucket_exit":
      return <TrendingDown className="w-3 h-3" />;
    case "trap_risk_spike":
      return <ShieldAlert className="w-3 h-3" />;
    case "momentum_shift":
      return <Zap className="w-3 h-3" />;
    case "execution_improved":
      return <Activity className="w-3 h-3" />;
    case "spread_change":
      return <BarChart3 className="w-3 h-3" />;
    case "flow_spike":
      return <Users className="w-3 h-3" />;
    case "repricing":
      return <Waves className="w-3 h-3" />;
    default:
      return <AlertTriangle className="w-3 h-3" />;
  }
}

function getSeverityColors(severity: string): { text: string; bg: string; border: string; dot: string } {
  switch (severity) {
    case "high":
      return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", dot: "bg-red-400" };
    case "medium":
      return { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", dot: "bg-blue-400" };
    case "low":
    default:
      return { text: "text-white/40", bg: "bg-white/[0.04]", border: "border-white/[0.08]", dot: "bg-white/30" };
  }
}

// ─── Featured Change (recommendation-level events) ────────────────
const FeaturedChangeRow = memo(function FeaturedChangeRow({ change }: { change: SignalChange }) {
  const relTime = getRelativeTime(change.timestamp);
  const polyUrl = change.market_slug ? `https://polymarket.com/event/${change.market_slug}` : null;
  const isDirectionFlip = change.change_type === "best_bet_direction_changed" || change.change_type === "direction_changed";
  const isBestBetChange = change.change_type === "new_best_bet" || change.change_type === "best_bet_changed";

  return (
    <div className="mx-3 mb-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-2.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center justify-center w-5 h-5 rounded-md ${isBestBetChange ? "bg-amber-500/15 text-amber-400" : isDirectionFlip ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}>
            {getChangeIcon(change.change_type)}
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${isBestBetChange ? "text-amber-400" : isDirectionFlip ? "text-red-400" : "text-blue-400"}`}>
            {isBestBetChange ? "Best Bet Changed" : isDirectionFlip ? "Direction Flipped" : "Recommendation Update"}
          </span>
        </div>
        <span className="text-[9px] text-white/25 tabular-nums flex-shrink-0">{relTime}</span>
      </div>

      {change.market_title && (
        <p className="text-[10px] font-semibold text-white/75 leading-snug mb-0.5">
          {polyUrl ? (
            <a href={polyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white/90 transition-colors">
              {change.market_title}
            </a>
          ) : (
            change.market_title
          )}
        </p>
      )}

      <p className="text-[10px] text-white/40 leading-snug">{change.description}</p>

      {/* Previous pick note */}
      {change.previous_title && (
        <p className="mt-1 text-[9px] text-white/25 leading-snug">
          Replaced:{" "}
          <span className={`font-semibold ${change.previous_direction === "NO" ? "text-red-400/60" : "text-emerald-400/60"}`}>
            {change.previous_direction ?? "YES"}
          </span>{" "}
          {change.previous_title}
        </p>
      )}
    </div>
  );
});

// ─── Standard Change Row ───────────────────────────────────────────
const ChangeRow = memo(function ChangeRow({ change }: { change: SignalChange }) {
  const severity = getSeverityColors(change.severity);
  const relTime = getRelativeTime(change.timestamp);
  const icon = getChangeIcon(change.change_type);
  const polyUrl = change.market_slug ? `https://polymarket.com/event/${change.market_slug}` : null;

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] last:border-b-0">
      <span className="text-[9px] text-white/25 tabular-nums w-10 flex-shrink-0 pt-0.5 text-right">
        {relTime}
      </span>

      <div className={`flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0 ${severity.bg} ${severity.text}`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        {change.market_title && (
          <p className="text-[10px] font-semibold text-white/70 truncate leading-snug">
            {polyUrl ? (
              <a href={polyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white/90 transition-colors">
                {change.market_title}
              </a>
            ) : (
              change.market_title
            )}
          </p>
        )}
        <p className="text-[10px] text-white/40 leading-snug line-clamp-2">{change.description}</p>
      </div>

      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${severity.bg} ${severity.text} border ${severity.border} flex-shrink-0`}>
        {change.severity}
      </span>
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────
const POLL_INTERVAL_MS = 60_000;
const MAX_CHANGES = 20;

export const RecentSignalChanges = memo(function RecentSignalChanges() {
  const [changes, setChanges] = useState<SignalChange[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [visible, setVisible] = useState(true);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const fetchingRef = useRef(false);

  const fetchChanges = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch("/api/predict/signal-changes");
      if (!res.ok) {
        if (res.status === 404) {
          setVisible(false);
          return;
        }
        throw new Error(`${res.status}`);
      }
      const json: SignalChangesResponse = await res.json();
      const list = Array.isArray(json.changes) ? json.changes : [];
      setChanges(list.slice(0, MAX_CHANGES));
      // Backend returns empty on cold boot for ~5-15 min — show warming state
      setIsWarmingUp(list.length === 0);
      setVisible(true);
    } catch {
      setVisible(false);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchChanges();
    const iv = setInterval(fetchChanges, POLL_INTERVAL_MS);
    return () => clearInterval(iv);
  }, [fetchChanges]);

  if (!visible) return null;

  // Separate recommendation-level events from standard signal changes
  const featuredChanges = changes.filter(c => isRecommendationEvent(c.change_type));
  const standardChanges = changes.filter(c => !isRecommendationEvent(c.change_type));
  const recCount = featuredChanges.length;

  return (
    <GlassCard className="mb-5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Recent Signal Changes</span>

          {/* Recommendation-level event badge */}
          {recCount > 0 && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full tabular-nums">
              {recCount} rec
            </span>
          )}

          {/* Total count */}
          {changes.length > 0 && (
            <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-full tabular-nums">
              {changes.length}
            </span>
          )}

          {/* Warming up indicator */}
          {isWarmingUp && (
            <span className="inline-flex items-center gap-1 text-[9px] text-white/25">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              warming up
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-white/25" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-white/25" />
        )}
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="max-h-[360px] overflow-y-auto">
          {changes.length === 0 ? (
            // Empty — either warming up or genuinely no changes
            <div className="px-4 py-5 text-center">
              {isWarmingUp ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04]">
                    <Clock className="w-4 h-4 text-white/20" />
                  </div>
                  <p className="text-[11px] font-semibold text-white/30">Signal engine warming up</p>
                  <p className="text-[10px] text-white/20 max-w-[200px] leading-relaxed">
                    Change detection accumulates snapshots over time. Check back in 5–15 minutes.
                  </p>
                </div>
              ) : (
                <p className="text-[10px] text-white/20">No recent changes detected</p>
              )}
            </div>
          ) : (
            <>
              {/* Featured: recommendation-level events first */}
              {featuredChanges.length > 0 && (
                <div className="pt-2 pb-1">
                  {featuredChanges.map((c, i) => (
                    <FeaturedChangeRow key={`feat-${c.timestamp}-${c.market_id}-${i}`} change={c} />
                  ))}
                </div>
              )}

              {/* Standard signal changes */}
              {standardChanges.length > 0 && (
                <div className={featuredChanges.length > 0 ? "border-t border-white/[0.04]" : ""}>
                  {standardChanges.map((c, i) => (
                    <ChangeRow key={`std-${c.timestamp}-${c.market_id}-${i}`} change={c} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </GlassCard>
  );
});
