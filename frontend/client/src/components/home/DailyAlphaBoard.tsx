import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Clock, Zap, Shield, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/glass-card";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyAlphaSignals {
  ta: number | null;
  fundamentals: number | null;
  catalysts: number | null;
  social: number | null;
  news: number | null;
  options: number | null;
  theme: number | null;
  macro: number | null;
  hyperliquid: number | null;
  momentum: number | null;
  rel_volume: number | null;
}

export interface DailyAlphaIdea {
  symbol: string;
  name: string | null;
  asset_type: string;
  direction: string;
  timeframe: string | null;
  score: number;
  score_raw: number;
  confidence: string;
  status: string;
  setup_type: string | null;
  theme: string | null;
  sector: string | null;
  summary: string;
  trigger: string | null;
  invalidation: string | null;
  signals: DailyAlphaSignals;
  evidence: string[];
  risks: string[];
  source_pages: string[];
  updated_at: string | null;
  has_timing_signal: boolean;
}

export interface DailyAlphaRegime {
  label: string;
  summary: string;
  drivers: string[];
  confidence: number;
}

export interface SourceHealth {
  [key: string]: any;
}

export interface CacheInfo {
  hit: boolean;
  age_seconds: number | null;
  ttl_seconds: number | null;
}

export interface Counts {
  candidates_seen: number;
  candidates_qualified: number;
  stocks_scored: number;
  crypto_scored: number;
  watch_only_in_top?: number;
}

export interface DailyAlphaBoardResponse {
  ok: boolean;
  generated_at: string;
  mode: string;
  external_api_calls: number;
  provider_calls_blocked: boolean;
  limit: number;
  regime: DailyAlphaRegime;
  ideas: DailyAlphaIdea[];
  counts: Counts;
  cache: CacheInfo;
  source_health: SourceHealth;
  stale_served?: boolean;
}

// ── Filter config ─────────────────────────────────────────────────────────────

type FilterKey = "all" | "stocks" | "crypto" | "watchlist" | "portfolio";

const FILTERS: { key: FilterKey; label: string; params: string }[] = [
  { key: "all",       label: "All",       params: "asset_type=all&scope=all"       },
  { key: "stocks",    label: "Stocks",    params: "asset_type=stocks&scope=all"    },
  { key: "crypto",    label: "Crypto",    params: "asset_type=crypto&scope=all"    },
  { key: "watchlist", label: "Watchlist", params: "asset_type=all&scope=watchlist" },
  { key: "portfolio", label: "Portfolio", params: "asset_type=all&scope=portfolio" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtAgo(iso: string | null): string {
  if (!iso) return "—";
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffM = Math.floor(diffMs / 60_000);
    if (diffM < 1) return "just now";
    if (diffM < 60) return `${diffM}m ago`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  } catch { return "—"; }
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function scoreStyle(score: number): { border: string; glow: string; badge: string; label: string } {
  if (score >= 85) return {
    border: "border-emerald-500/30",
    glow: "shadow-emerald-900/30",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    label: "High",
  };
  if (score >= 70) return {
    border: "border-amber-500/25",
    glow: "shadow-amber-900/20",
    badge: "bg-amber-500/12 text-amber-300 border-amber-500/20",
    label: "Medium",
  };
  return {
    border: "border-white/8",
    glow: "",
    badge: "bg-white/6 text-white/50 border-white/10",
    label: "Watch",
  };
}

function directionStyle(dir: string): { bg: string; icon: React.ReactNode } {
  if (dir === "long") return {
    bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    icon: <TrendingUp className="w-3 h-3" />,
  };
  if (dir === "short") return {
    bg: "bg-rose-500/15 text-rose-300 border-rose-500/25",
    icon: <TrendingDown className="w-3 h-3" />,
  };
  return {
    bg: "bg-white/8 text-white/50 border-white/12",
    icon: <Minus className="w-3 h-3" />,
  };
}

function confidenceColor(c: string): string {
  if (c === "high") return "text-emerald-400";
  if (c === "medium") return "text-amber-400";
  return "text-white/40";
}

function assetTypeBadge(at: string): string {
  if (at === "stock") return "bg-blue-500/12 text-blue-300 border-blue-500/20";
  if (at === "crypto") return "bg-purple-500/12 text-purple-300 border-purple-500/20";
  return "bg-white/6 text-white/45 border-white/10";
}

function sourceBadge(src: string): string {
  const map: Record<string, string> = {
    watchlist: "bg-cyan-500/10 text-cyan-300/80 border-cyan-500/15",
    themes:    "bg-violet-500/10 text-violet-300/80 border-violet-500/15",
    hyperliquid: "bg-orange-500/10 text-orange-300/80 border-orange-500/15",
    options:   "bg-pink-500/10 text-pink-300/80 border-pink-500/15",
    prophetik: "bg-sky-500/10 text-sky-300/80 border-sky-500/15",
    screener:  "bg-lime-500/10 text-lime-300/80 border-lime-500/15",
  };
  return map[src.toLowerCase()] ?? "bg-white/5 text-white/40 border-white/10";
}

// ── Idea Card ─────────────────────────────────────────────────────────────────

function IdeaCard({ idea, rank }: { idea: DailyAlphaIdea; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const ss = scoreStyle(idea.score);
  const ds = directionStyle(idea.direction);
  const topEvidence = idea.evidence.slice(0, expanded ? idea.evidence.length : 3);
  const topRisks = idea.risks.slice(0, expanded ? idea.risks.length : 2);
  const hasExtra = idea.evidence.length > 3 || idea.risks.length > 2 || !!idea.trigger || !!idea.invalidation;

  return (
    <div className={`relative rounded-xl border bg-white/[0.02] ${ss.border} ${ss.glow ? `shadow-lg ${ss.glow}` : ""} transition-all duration-200 hover:bg-white/[0.035]`}>
      {/* Score accent bar */}
      <div
        className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${idea.score >= 85 ? "bg-emerald-500/60" : idea.score >= 70 ? "bg-amber-500/50" : "bg-white/15"}`}
      />

      <div className="px-4 py-3 pl-5">
        {/* Top row */}
        <div className="flex items-start gap-3">
          {/* Rank */}
          <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${idea.score >= 85 ? "bg-emerald-500/15 text-emerald-400" : idea.score >= 70 ? "bg-amber-500/12 text-amber-400" : "bg-white/6 text-white/35"}`}>
            {rank}
          </div>

          {/* Symbol + name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-white/95 tracking-wide">{idea.symbol}</span>
              {idea.name && (
                <span className="text-[11px] text-white/40 truncate max-w-[140px]">{idea.name}</span>
              )}

              {/* Asset type */}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${assetTypeBadge(idea.asset_type)}`}>
                {idea.asset_type}
              </span>

              {/* Direction */}
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${ds.bg}`}>
                {ds.icon}
                {idea.direction}
              </span>

              {/* Timing */}
              {idea.has_timing_signal ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border bg-emerald-500/8 text-emerald-400/70 border-emerald-500/15">
                  <Zap className="w-2.5 h-2.5" />
                  Timing confirmed
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border bg-white/4 text-white/30 border-white/8">
                  Watch only
                </span>
              )}
            </div>

            {/* Score + confidence + setup row */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {/* Score pill */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${ss.badge}`}>
                {Math.round(idea.score)}/100 · {ss.label}
              </span>

              {/* Confidence */}
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${confidenceColor(idea.confidence)}`}>
                {idea.confidence} conf
              </span>

              {/* Setup type */}
              {idea.setup_type && (
                <span className="text-[10px] text-white/35">{idea.setup_type}</span>
              )}

              {/* Timeframe */}
              {idea.timeframe && (
                <span className="text-[10px] text-white/30">{idea.timeframe}</span>
              )}

              {/* Status */}
              <span className={`text-[10px] font-medium ${idea.status === "active" ? "text-emerald-400/70" : "text-amber-400/60"}`}>
                {idea.status?.replace(/_/g, " ")}
              </span>
            </div>

            {/* Theme / sector */}
            {(idea.theme || idea.sector) && (
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {idea.theme && (
                  <span className="text-[10px] text-violet-300/60 bg-violet-500/8 border border-violet-500/12 px-1.5 py-0.5 rounded">{idea.theme}</span>
                )}
                {idea.sector && idea.sector !== idea.theme && (
                  <span className="text-[10px] text-white/30 bg-white/4 border border-white/8 px-1.5 py-0.5 rounded">{idea.sector}</span>
                )}
              </div>
            )}
          </div>

          {/* Expand toggle */}
          {hasExtra && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="shrink-0 p-1 rounded-md hover:bg-white/6 text-white/25 hover:text-white/60 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Summary */}
        <p className="text-[12px] text-white/65 leading-relaxed mt-2.5">{idea.summary}</p>

        {/* Evidence bullets */}
        {topEvidence.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {topEvidence.map((ev, i) => (
              <li key={i} className="text-[11px] text-white/45 flex gap-1.5 leading-snug">
                <span className="text-white/20 shrink-0 mt-0.5">›</span>
                <span>{ev}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Expandable: trigger / invalidation / risks / sources */}
        {expanded && (
          <div className="mt-3 space-y-2 pt-2.5 border-t border-white/[0.05]">
            {idea.trigger && (
              <div className="flex gap-1.5">
                <span className="text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider shrink-0 mt-0.5">Trigger</span>
                <span className="text-[11px] text-white/55">{idea.trigger}</span>
              </div>
            )}
            {idea.invalidation && (
              <div className="flex gap-1.5">
                <span className="text-[10px] font-semibold text-rose-400/60 uppercase tracking-wider shrink-0 mt-0.5">Invalidation</span>
                <span className="text-[11px] text-white/55">{idea.invalidation}</span>
              </div>
            )}
            {topRisks.length > 0 && (
              <div className="flex gap-1.5">
                <span className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-wider shrink-0 mt-0.5">Risks</span>
                <div className="space-y-0.5">
                  {topRisks.map((r, i) => (
                    <div key={i} className="text-[11px] text-white/45">{r}</div>
                  ))}
                </div>
              </div>
            )}
            {idea.source_pages.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-white/25">Sources:</span>
                {idea.source_pages.map(src => (
                  <span key={src} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium border ${sourceBadge(src)}`}>
                    {src}
                  </span>
                ))}
              </div>
            )}
            {idea.updated_at && (
              <div className="text-[10px] text-white/20 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Updated {fmtAgo(idea.updated_at)}
              </div>
            )}
          </div>
        )}

        {/* Source badges (always visible when not expanded) */}
        {!expanded && idea.source_pages.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-2">
            {idea.source_pages.map(src => (
              <span key={src} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium border ${sourceBadge(src)}`}>
                {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function IdeaCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 pl-5">
      <div className="flex gap-3">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 items-center">
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-3.5 w-12 rounded" />
          </div>
          <Skeleton className="h-3 w-32 rounded" />
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3 w-4/5 rounded" />
          <Skeleton className="h-3 w-3/5 rounded" />
        </div>
      </div>
    </div>
  );
}

// ── Regime panel ──────────────────────────────────────────────────────────────

function RegimePanel({ regime, counts, sourceHealth }: {
  regime: DailyAlphaRegime;
  counts: Counts;
  sourceHealth: SourceHealth;
}) {
  const [open, setOpen] = useState(false);

  const regimeColor =
    regime.label === "bullish" || regime.label === "risk_on" ? "text-emerald-400" :
    regime.label === "bearish" || regime.label === "risk_off" ? "text-rose-400" :
    "text-white/60";

  const healthEntries = Object.entries(sourceHealth ?? {}).slice(0, 6);

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.02] rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Regime Context</span>
          <span className={`text-[11px] font-semibold capitalize ${regimeColor}`}>{regime.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30">
            {counts.candidates_seen ?? 0} candidates · {counts.candidates_qualified ?? 0} qualified
          </span>
          {open ? <ChevronUp className="w-3 h-3 text-white/20" /> : <ChevronDown className="w-3 h-3 text-white/20" />}
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/[0.05] mt-0 pt-2.5">
          {regime.summary && (
            <p className="text-[11px] text-white/50 leading-relaxed">{regime.summary}</p>
          )}
          {regime.drivers?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {regime.drivers.map((d, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[10px] text-white/45 bg-white/5 border border-white/8">{d}</span>
              ))}
            </div>
          )}

          {/* Counts grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { label: "Stocks scored",   val: counts.stocks_scored ?? 0 },
              { label: "Crypto scored",   val: counts.crypto_scored ?? 0 },
              { label: "Watch-only top",  val: counts.watch_only_in_top ?? 0 },
              { label: "Regime conf",     val: regime.confidence ? `${Math.round(regime.confidence * 100)}%` : "—" },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-md bg-white/[0.02] border border-white/[0.05] px-2 py-1.5 text-center">
                <div className="text-sm font-semibold text-white/70 tabular-nums">{val}</div>
                <div className="text-[9px] text-white/25 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Source health */}
          {healthEntries.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-widest text-white/20 mb-1.5">Source Health</div>
              <div className="flex flex-wrap gap-1.5">
                {healthEntries.map(([k, v]) => {
                  const ok = v === true || v === "ok" || v === "healthy" || (typeof v === "number" && v > 0);
                  return (
                    <span key={k} className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${ok ? "bg-emerald-500/8 text-emerald-400/60 border-emerald-500/15" : "bg-rose-500/8 text-rose-400/60 border-rose-500/15"}`}>
                      {k.replace(/_/g, " ")}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Cache / diagnostic footer ─────────────────────────────────────────────────

function CacheDiagStrip({ data }: { data: DailyAlphaBoardResponse }) {
  const { mode, external_api_calls, provider_calls_blocked, cache } = data;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 py-1.5">
      <span className="text-[9.5px] text-white/20 font-medium uppercase tracking-widest">{mode}</span>

      <span className="text-[9.5px] text-white/20">
        ext API calls: <span className={external_api_calls === 0 ? "text-emerald-400/50" : "text-amber-400/50"}>{external_api_calls}</span>
      </span>

      {provider_calls_blocked && (
        <span className="text-[9.5px] text-emerald-400/40">providers blocked ✓</span>
      )}

      {cache?.hit !== undefined && (
        <span className="text-[9.5px] text-white/20">
          cache: <span className={cache.hit ? "text-emerald-400/50" : "text-white/35"}>{cache.hit ? "hit" : "miss"}</span>
          {cache.age_seconds != null && ` · ${Math.round(cache.age_seconds)}s old`}
          {cache.ttl_seconds != null && ` · ttl ${cache.ttl_seconds}s`}
        </span>
      )}

      {data.stale_served && (
        <span className="text-[9.5px] text-amber-400/60 flex items-center gap-0.5">
          <AlertTriangle className="w-2.5 h-2.5" />
          stale served
        </span>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DailyAlphaBoard() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const filterParams = FILTERS.find(f => f.key === filter)?.params ?? FILTERS[0].params;

  const { data, isLoading, isFetching, isError, dataUpdatedAt } = useQuery<DailyAlphaBoardResponse>({
    queryKey: ["/api/home/daily-alpha-board", filter, refreshKey],
    queryFn: async () => {
      const qs = refreshKey > 0 ? `${filterParams}&refresh=true` : filterParams;
      const r = await fetch(`/api/home/daily-alpha-board?limit=10&${qs}`);
      if (!r.ok) throw new Error(`Alpha board ${r.status}`);
      return r.json();
    },
    staleTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const ideas = data?.ideas ?? [];
  const isEmpty = !isLoading && ideas.length === 0;

  return (
    <GlassCard className="flex flex-col gap-4 p-4 sm:p-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-white/90 tracking-tight">Daily Alpha Board</h2>

            {/* Regime badge */}
            {data?.regime?.label && (
              <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                data.regime.label === "bullish" || data.regime.label === "risk_on"
                  ? "bg-emerald-500/10 text-emerald-300/70 border-emerald-500/20"
                  : data.regime.label === "bearish" || data.regime.label === "risk_off"
                  ? "bg-rose-500/10 text-rose-300/70 border-rose-500/20"
                  : "bg-white/5 text-white/35 border-white/10"
              }`}>
                {data.regime.label}
              </span>
            )}

            {/* Cache-only badge */}
            {data?.mode === "cache_only" && (
              <span className="text-[9px] text-white/20 border border-white/8 px-1.5 py-0.5 rounded bg-white/[0.02]">cache only</span>
            )}

            {/* Stale warning */}
            {data?.stale_served && (
              <span className="text-[10px] text-amber-400/60 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Showing last known board
              </span>
            )}
          </div>

          <p className="text-[11px] text-white/35 mt-0.5">
            The 10 best cross-market trade ideas today
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {data?.generated_at && (
              <span className="text-[10px] text-white/25 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                Generated {fmtAgo(data.generated_at)} · {fmtTime(data.generated_at)}
              </span>
            )}
            {data?.external_api_calls === 0 && (
              <span className="text-[10px] text-emerald-400/40">0 live API calls</span>
            )}
            {data?.counts && (
              <span className="text-[10px] text-white/20">
                {data.counts.candidates_seen ?? 0} candidates screened
              </span>
            )}
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white/80 text-[11px] font-medium transition-all disabled:opacity-40 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex items-center gap-1 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              filter === f.key
                ? "bg-white/10 text-white/90 border border-white/15"
                : "text-white/40 hover:text-white/65 hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Ideas list ── */}
      <div className="space-y-2.5">
        {isLoading && !data ? (
          Array.from({ length: 5 }).map((_, i) => <IdeaCardSkeleton key={i} />)
        ) : isError && !data ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-8 text-center">
            <p className="text-[12px] text-white/30">Unable to load trade ideas. Please try refreshing.</p>
          </div>
        ) : isEmpty ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-10 text-center">
            <p className="text-sm text-white/35 font-medium">No high-quality setups found yet.</p>
            <p className="text-[11px] text-white/20 mt-1">Waiting for stronger signal confirmation.</p>
          </div>
        ) : (
          ideas.map((idea, i) => (
            <IdeaCard key={`${idea.symbol}-${i}`} idea={idea} rank={i + 1} />
          ))
        )}

        {/* Overlay spinner on re-fetch with cached data showing */}
        {isFetching && !!data && (
          <div className="text-center py-1">
            <span className="text-[10px] text-white/20 flex items-center justify-center gap-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              Updating board…
            </span>
          </div>
        )}
      </div>

      {/* ── Regime context panel ── */}
      {data && (
        <RegimePanel
          regime={data.regime}
          counts={data.counts}
          sourceHealth={data.source_health}
        />
      )}

      {/* ── Cache / diagnostic strip ── */}
      {data && <CacheDiagStrip data={data} />}
    </GlassCard>
  );
}
