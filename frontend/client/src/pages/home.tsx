import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Newspaper,
  Sparkles,
  Activity,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  LineChart,
  Star,
  BarChart3,
  Briefcase,
  Wallet,
  Zap,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
} from "lucide-react";
import TickerTapeWidget from "@/components/TickerTapeWidget";
import { GlassCard } from "@/components/glass-card";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type {
  HomeDashboardPayload,
  HomeFearGreedSide,
  HomeMacroCard,
  HomeMoverRow,
  HomeThemePerformanceItem,
  HomeSnapshotItem,
  HomeUnusualOptionsFlowItem,
  HomeSubThemeItem,
  HomeHighlightedCompany,
} from "@/types/home";

// ── Lightweight HL signal types (mirrors hl-advanced-signals shape) ──────────
interface HLRSLeader  { symbol: string; rs_score: number; return_1h: number; return_4h: number; return_24h: number; }
interface HLOIRegime  { symbol: string; regime: string; price_change_24h_pct?: number; oi_change_1h_pct: number; regime_score: number; }
interface HLAdvSigs   { relative_strength_leaders: HLRSLeader[]; oi_regime_shift: HLOIRegime[]; as_of?: string; }

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────
function fmtNum(v: number | string | null | undefined, digits = 2): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n as number)) return "—";
  return (n as number).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(v: number | null | undefined, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(digits)}%`;
}

function pctColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return "text-white/60";
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-rose-400";
  return "text-white/70";
}

function fgBucket(score: number | null | undefined): {
  label: string;
  color: string;
  ringColor: string;
} {
  if (score === null || score === undefined)
    return { label: "—", color: "text-white/60", ringColor: "stroke-white/20" };
  if (score <= 25)
    return { label: "Extreme Fear", color: "text-rose-400", ringColor: "stroke-rose-500" };
  if (score < 45)
    return { label: "Fear", color: "text-amber-300", ringColor: "stroke-amber-400" };
  if (score <= 55)
    return { label: "Neutral", color: "text-white/80", ringColor: "stroke-white/40" };
  if (score <= 75)
    return { label: "Greed", color: "text-lime-300", ringColor: "stroke-lime-400" };
  return { label: "Extreme Greed", color: "text-emerald-400", ringColor: "stroke-emerald-400" };
}

// ───────────────────────────────────────────────────────────────────────────
// Small components
// ───────────────────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  accent,
  action,
}: {
  icon: React.ElementType;
  title: string;
  accent?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
             style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(56,189,248,0.14))" }}>
          <Icon className="w-3.5 h-3.5 text-white/80" />
        </div>
        <h2 className="text-sm font-semibold text-white/90 tracking-wide uppercase">
          {title}
        </h2>
        {accent && (
          <span className="text-[11px] text-white/40 ml-1">{accent}</span>
        )}
      </div>
      {action}
    </div>
  );
}

function MacroCard({ card }: { card: HomeMacroCard }) {
  const up = (card.change_pct ?? 0) >= 0;
  return (
    <GlassCard className="p-3 min-h-[92px] flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-white/50">
          {card.label}
        </div>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-white/10 text-white/60">
          {card.symbol}
        </Badge>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-xl font-semibold text-white/95">
          {fmtNum(card.price, card.kind === "rate" ? 2 : 2)}
        </div>
        <div className={`text-sm flex items-center gap-0.5 font-medium ${pctColor(card.change_pct)}`}>
          {card.change_pct !== null && (up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />)}
          {fmtPct(card.change_pct)}
        </div>
      </div>
    </GlassCard>
  );
}

function MoverRow({ row, onClick }: { row: HomeMoverRow; onClick?: () => void }) {
  const up = row.direction === "up";
  return (
    <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={onClick}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${
          up ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
        }`}>
          {up ? "▲" : "▼"}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white/90 truncate">{row.ticker}</div>
          <div className="text-[11px] text-white/45 truncate">{row.company || "—"}</div>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm text-white/85">{fmtNum(row.price as any)}</div>
        <div className={`text-xs font-medium ${pctColor(row.change_pct)}`}>
          {row.change_label || fmtPct(row.change_pct)}
        </div>
      </div>
    </div>
  );
}

function ThemeRow({ theme }: { theme: HomeThemePerformanceItem }) {
  // Use the 30D change for the bar (most meaningful signal from sector rotation)
  const chg30 = theme.change_30d ?? theme.change_7d ?? theme.change_1d ?? 0;
  // Scale: 30D changes are typically -10% to +10%, so 5x gives a readable bar
  const bar = Math.max(-100, Math.min(100, (chg30 || 0) * 5));
  const tagColor =
    theme.regime_tag === "Leading"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
      : theme.regime_tag === "Lagging"
      ? "bg-rose-500/15 text-rose-300 border-rose-500/20"
      : "bg-white/5 text-white/60 border-white/10";
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 px-2 rounded-md hover:bg-white/[0.03]">
      <div className="col-span-4 flex items-center gap-2 min-w-0">
        <div className="text-sm font-medium text-white/90 truncate">{theme.name || theme.ticker}</div>
        <Badge variant="outline" className={`h-5 px-1.5 text-[10px] border ${tagColor}`}>
          {theme.ticker}
        </Badge>
      </div>
      <div className="col-span-5 flex items-center">
        <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full relative overflow-hidden">
          <div
            className={`absolute top-0 h-full rounded-full ${bar >= 0 ? "bg-emerald-400/60" : "bg-rose-400/60"}`}
            style={{
              left: bar >= 0 ? "50%" : `${50 + bar / 2}%`,
              width: `${Math.abs(bar) / 2}%`,
            }}
          />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
        </div>
      </div>
      <div className={`col-span-1 text-right text-xs font-medium ${pctColor(theme.change_1d)}`}>
        {fmtPct(theme.change_1d, 2)}
      </div>
      <div className={`col-span-1 text-right text-xs ${pctColor(theme.change_7d)}`}>
        {fmtPct(theme.change_7d, 1)}
      </div>
      <div className={`col-span-1 text-right text-xs ${pctColor(theme.change_30d)}`}>
        {fmtPct(theme.change_30d, 1)}
      </div>
      <div className="col-span-12 h-px bg-white/[0.04] mt-1" />
    </div>
  );
}

// ── Sub-theme leaders row (replaces sector ThemeRow on Home) ─────────────
function SubThemeRow({ item }: { item: HomeSubThemeItem }) {
  const chg = item.avg_change_1d;
  const breadth = item.breadth_score ?? 0;
  const breadthColor =
    breadth >= 80 ? "text-emerald-300" :
    breadth >= 50 ? "text-amber-300"   : "text-rose-300";
  return (
    <div className="flex items-start gap-3 px-2 py-2.5 rounded-md hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white/90">{item.sub_theme}</span>
          {(item.leader_symbols || []).slice(0, 4).map(sym => (
            <span key={sym} className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-white/70 font-mono">{sym}</span>
          ))}
          {item.leader_count > 4 && (
            <span className="text-[10px] text-white/35">+{item.leader_count - 4}</span>
          )}
        </div>
        {item.pattern_summary && (
          <div className="text-[11px] text-white/45 mt-0.5 truncate">{item.pattern_summary}</div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 text-right">
        <div className="hidden sm:block">
          <div className="text-[9px] uppercase tracking-wide text-white/30">breadth</div>
          <div className={`text-xs font-medium ${breadthColor}`}>{breadth.toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-white/30">1D</div>
          <div className={`text-sm font-semibold tabular-nums ${pctColor(chg)}`}>{fmtPct(chg)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Highlighted Company card (watchlist-driven, rich fields) ──────────────
function HighlightedCompanyCard({ c, onClick }: { c: HomeHighlightedCompany; onClick?: () => void }) {
  const up = (c.change_1d_pct ?? 0) >= 0;
  return (
    <div
      className="p-3 rounded-lg border border-white/[0.07] bg-white/[0.02] hover:border-white/20 transition-colors cursor-pointer min-w-[130px]"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <span className="text-sm font-bold text-white/95">{c.symbol}</span>
        {c.signal_label && (
          <Badge variant="outline" className="h-4 px-1 text-[9px] border-indigo-500/25 text-indigo-300 shrink-0 truncate max-w-[80px]">
            {c.signal_label}
          </Badge>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-xs text-white/60">
          {c.current_price != null ? `$${fmtNum(c.current_price)}` : "—"}
        </div>
        <div className={`text-xs font-semibold tabular-nums flex items-center gap-0.5 ${pctColor(c.change_1d_pct)}`}>
          {c.change_1d_pct !== null && (up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
          {fmtPct(c.change_1d_pct)}
        </div>
      </div>
      {c.volume_vs_avg != null && c.volume_vs_avg > 1.5 && (
        <div className="text-[9px] text-amber-400/70 mt-0.5">vol {fmtNum(c.volume_vs_avg, 1)}×</div>
      )}
    </div>
  );
}

function FearGreedGauge({
  title,
  side,
  tint,
}: {
  title: string;
  side: HomeFearGreedSide | null | undefined;
  tint: string;
}) {
  const score = side?.score ?? null;
  const { label, color, ringColor } = fgBucket(score);
  const pct = score !== null && score !== undefined ? Math.max(0, Math.min(100, score)) : 0;
  const C = 2 * Math.PI * 42;
  const offset = C - (pct / 100) * C;

  return (
    <GlassCard className="p-4">
      <SectionHeader icon={Gauge} title={title} accent={side?.rating || ""} />
      <div className="flex items-center gap-4">
        <div className="relative w-[110px] h-[110px] shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" className="stroke-white/[0.06]" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              className={ringColor}
              strokeWidth="7"
              strokeDasharray={C}
              strokeDashoffset={score === null ? C : offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 600ms ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-2xl font-semibold ${color}`}>{score !== null && score !== undefined ? Math.round(score) : "—"}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">index</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${color}`}>{label}</div>
          <div className="text-xs text-white/50 mt-0.5">{side?.signal || "—"}</div>
          <div className="mt-3 grid grid-cols-5 gap-0.5 h-1.5 rounded-full overflow-hidden"
               style={{ background: "rgba(255,255,255,0.05)" }}>
            <div className="bg-rose-500/60" />
            <div className="bg-amber-400/50" />
            <div className="bg-white/20" />
            <div className="bg-lime-400/50" />
            <div className="bg-emerald-500/60" />
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-wider" style={{ color: tint }}>
            {title.includes("Crypto") ? "Crypto market" : "US equities"}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ── Snapshot table (portfolio / watchlist) ────────────────────────────────
type SnapSort = "symbol" | "current_price" | "change_1d_pct" | "volume_vs_avg";

function SnapshotTable({
  items, loading, title, icon: Icon, accent, status, limit = 999, scrollable = false,
}: {
  items: HomeSnapshotItem[] | undefined;
  loading: boolean;
  title: string;
  icon: React.ElementType;
  accent: string;
  status?: string;
  limit?: number;
  scrollable?: boolean;
}) {
  const [sortKey, setSortKey]   = useState<SnapSort>("change_1d_pct");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");

  const toggle = (k: SnapSort) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };
  // Plain function (not a JSX component) to avoid "invalid hook call" from inline components
  const sortIcon = (k: SnapSort) =>
    sortKey !== k
      ? <ChevronsUpDown className="w-2.5 h-2.5 opacity-30" />
      : sortDir === "asc" ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />;

  const sorted = [...(items || [])].sort((a, b) => {
    const av = a[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
    const bv = b[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
    if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const isEmpty = !loading && (!items || items.length === 0);
  const isUnavailable = status === "unavailable" || status === "error";

  return (
    <GlassCard className="p-4">
      <SectionHeader icon={Icon} title={title} accent={accent} />
      {loading && Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-8 my-1 rounded bg-white/[0.04]" />
      ))}
      {!loading && isEmpty && (
        <div className="text-xs text-white/40 py-4 text-center">
          {isUnavailable ? "No data available." : "No positions to display."}
        </div>
      )}
      {!loading && sorted.length > 0 && (
        <>
          {/* Column headers — always visible above the scroll area */}
          <div className="grid grid-cols-12 gap-1 text-[10px] uppercase tracking-wider text-white/35 px-2 mb-1">
            <button className="col-span-3 text-left flex items-center gap-0.5" onClick={() => toggle("symbol")}>Symbol {sortIcon("symbol")}</button>
            <button className="col-span-3 text-right flex items-center justify-end gap-0.5" onClick={() => toggle("current_price")}>Price {sortIcon("current_price")}</button>
            <button className="col-span-2 text-right flex items-center justify-end gap-0.5" onClick={() => toggle("change_1d_pct")}>1D% {sortIcon("change_1d_pct")}</button>
            <button className="col-span-2 text-right flex items-center justify-end gap-0.5" onClick={() => toggle("volume_vs_avg")}>Vol× {sortIcon("volume_vs_avg")}</button>
            <div className="col-span-2 text-right">Signal</div>
          </div>
          {/* Rows — scrollable when scrollable=true, all items shown */}
          <div className={scrollable ? "overflow-y-auto max-h-[320px] pr-0.5" : ""}>
          {sorted.slice(0, scrollable ? sorted.length : limit).map((row) => (
            <div key={row.symbol} className="grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors">
              <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-white/90 truncate">{row.symbol}</span>
                {row.asset_type && (
                  <Badge variant="outline" className="h-4 px-1 text-[9px] border-white/10 text-white/40 hidden sm:inline-flex">
                    {row.asset_type}
                  </Badge>
                )}
              </div>
              <div className="col-span-3 text-right text-xs text-white/80 tabular-nums">
                {row.current_price != null ? `$${fmtNum(row.current_price)}` : "—"}
              </div>
              <div className={`col-span-2 text-right text-xs font-medium tabular-nums ${pctColor(row.change_1d_pct)}`}>
                {fmtPct(row.change_1d_pct)}
              </div>
              <div className="col-span-2 text-right text-xs text-white/60 tabular-nums">
                {row.volume_vs_avg != null ? `${fmtNum(row.volume_vs_avg, 1)}×` : "—"}
              </div>
              <div className="col-span-2 text-right">
                {(row.signal_label || row.options_signal) ? (
                  <Badge variant="outline" className="text-[9px] px-1 h-4 border-indigo-500/30 text-indigo-300 truncate max-w-full">
                    {row.signal_label || row.options_signal}
                  </Badge>
                ) : <span className="text-[10px] text-white/25">—</span>}
              </div>
            </div>
          ))}
          </div>{/* end scroll container */}
        </>
      )}
    </GlassCard>
  );
}

// ── Unusual Options Flows ─────────────────────────────────────────────────
function UnusualFlowsSection({
  flows, status, loading, onTickerClick,
}: {
  flows: HomeUnusualOptionsFlowItem[] | undefined;
  status?: string;
  loading: boolean;
  onTickerClick?: (symbol: string) => void;
}) {
  const hasResults     = (flows?.length ?? 0) > 0;
  // Statuses that mean the scanner hasn't completed a valid scan yet
  const NOT_READY_STATUSES = new Set(["precompute_pending", "unavailable", "warming", "warmup", "error", ""]);
  const isNotReady     = !hasResults && (!status || NOT_READY_STATUSES.has(status));
  const isBgRefreshing = status === "refresh_in_progress";
  const isFastCache    = status === "ok_fast_cache";
  const isOk           = status === "ok" || isFastCache;
  // Only show true-zero message when a completed scan found nothing
  const isTrueZero     = !loading && isOk && !hasResults && !isBgRefreshing;

  return (
    <GlassCard className="p-4">
      <SectionHeader
        icon={Zap}
        title="Unusual Options Flows"
        accent={hasResults ? `${flows!.length} signals` : isNotReady ? "live screening" : "options screening"}
        action={
          isFastCache && hasResults ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/25 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              live
            </span>
          ) : isBgRefreshing ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/40 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
              refreshing
            </span>
          ) : isNotReady ? (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/35 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/25 animate-pulse" />
              scanning
            </span>
          ) : undefined
        }
      />
      {(loading || isNotReady) && Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 my-1 rounded bg-white/[0.04]" />
      ))}
      {!loading && isNotReady && (
        <div className="text-xs text-white/35 py-2 px-1 text-center">Warming live options scanner…</div>
      )}
      {!loading && isTrueZero && (
        <div className="text-xs text-white/40 py-4 text-center">No unusual options activity detected.</div>
      )}
      {/* Always render results if they exist — even stale / refreshing */}
      {hasResults && (flows || []).map((f, i) => (
        <div
          key={f.symbol || i}
          className="px-2 py-2.5 rounded hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0 cursor-pointer"
          onClick={() => onTickerClick?.(f.symbol)}
        >
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-white/90 shrink-0">{f.symbol}</span>
              {f.signal && <Badge variant="outline" className="h-4 px-1 text-[9px] border-indigo-500/30 text-indigo-300 shrink-0">{f.signal}</Badge>}
            </div>
            {f.composite_score != null && (
              <span className="text-xs font-mono text-white/55 shrink-0">score {f.composite_score.toFixed(1)}</span>
            )}
          </div>
          {f.rationale && (
            <div className="text-[11px] text-white/45 leading-snug">{f.rationale}</div>
          )}
        </div>
      ))}
    </GlassCard>
  );
}

// ── Hyperliquid Top Signals (compact) ─────────────────────────────────────
function HLTopSignals({ signals, loading }: { signals: HLAdvSigs | undefined; loading: boolean }) {
  const rsLeaders = (signals?.relative_strength_leaders || []).slice(0, 5);
  const oiShifts  = (signals?.oi_regime_shift || []).slice(0, 4);

  const OI_REGIME_CLR: Record<string, string> = {
    "Fresh Longs":      "text-emerald-300 border-emerald-500/25",
    "Fresh Shorts":     "text-rose-300 border-rose-500/25",
    "Short Covering":   "text-amber-300 border-amber-500/25",
    "Long Liquidation": "text-orange-300 border-orange-500/25",
  };

  return (
    <GlassCard className="p-4">
      <SectionHeader icon={Activity} title="Hyperliquid Top Signals" accent="Perps · live" />
      {loading && Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 my-1 rounded bg-white/[0.04]" />
      ))}
      {!loading && !signals && (
        <div className="text-xs text-white/40 py-4 text-center">Signals unavailable.</div>
      )}
      {!loading && rsLeaders.length > 0 && (
        <>
          <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1.5 px-1">RS Leaders</div>
          {rsLeaders.map((r) => (
            <div key={r.symbol} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0">
              <span className="text-xs font-semibold text-white/90 w-20 shrink-0">{r.symbol}</span>
              <div className="flex gap-3 text-xs font-mono">
                <span className={pctColor(r.return_1h)}>{fmtPct(r.return_1h, 2)} 1h</span>
                <span className={pctColor(r.return_4h)}>{fmtPct(r.return_4h, 2)} 4h</span>
                <span className={pctColor(r.return_24h)}>{fmtPct(r.return_24h, 2)} 24h</span>
              </div>
              <span className="text-[10px] text-white/40 tabular-nums ml-2 hidden sm:block">RS {r.rs_score.toFixed(1)}</span>
            </div>
          ))}
        </>
      )}
      {!loading && oiShifts.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-white/35 mb-1.5 px-1">OI Regime Shifts</div>
          {oiShifts.map((r) => (
            <div key={r.symbol} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0">
              <span className="text-xs font-semibold text-white/90 w-20 shrink-0">{r.symbol}</span>
              <Badge variant="outline" className={`h-5 text-[9px] px-1.5 ${OI_REGIME_CLR[r.regime] || "text-white/60 border-white/10"}`}>
                {r.regime}
              </Badge>
              <div className="flex gap-2 text-xs font-mono ml-2">
                {r.oi_change_1h_pct != null && (
                  <span className={pctColor(r.oi_change_1h_pct)}>{fmtPct(r.oi_change_1h_pct, 1)} OI</span>
                )}
                {r.price_change_24h_pct != null && (
                  <span className={pctColor(r.price_change_24h_pct)}>{fmtPct(r.price_change_24h_pct, 1)} 24h</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ── Ticker info popup ─────────────────────────────────────────────────────
function TickerInfoPopup({
  symbol, onClose, data,
}: {
  symbol: string;
  onClose: () => void;
  data: HomeDashboardPayload | undefined;
}) {
  const snapshot = [
    ...(data?.portfolio_snapshot || []),
    ...(data?.watchlist_snapshot || []),
  ].find(s => s.symbol === symbol);

  const flow = (data?.unusual_options_flows || []).find(f => f.symbol === symbol);

  const xTicker = (data?.trending_on_x?.top_tickers || []).find(t => t.symbol === symbol);

  const mover = [
    ...(data?.movers?.gainers || []),
    ...(data?.movers?.losers || []),
  ].find(m => m.ticker === symbol);

  const price     = snapshot?.current_price ?? (mover?.price as number | undefined) ?? null;
  const changePct = snapshot?.change_1d_pct  ?? mover?.change_pct ?? null;
  const signal    = snapshot?.signal_label   || flow?.signal || null;

  const tvSrc = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=D&theme=dark&style=1&locale=en&hide_top_toolbar=0&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=100%25`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4 rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
        style={{ background: "#0b0d12" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl font-bold text-white tracking-tight">{symbol}</span>
            {price != null && (
              <span className="text-sm text-white/65">
                ${typeof price === "number"
                  ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : price}
              </span>
            )}
            {changePct != null && (
              <span className={`text-sm font-semibold ${changePct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
              </span>
            )}
            {signal && (
              <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-300">{signal}</Badge>
            )}
          </div>
          <button
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TradingView chart */}
        <div style={{ height: 400 }}>
          <iframe
            src={tvSrc}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            title={`${symbol} chart`}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>

        {/* Extra data strip */}
        {(flow || snapshot || xTicker) && (
          <div className="px-5 py-3 border-t border-white/[0.06] space-y-2">
            <div className="flex flex-wrap gap-x-6 gap-y-1.5">
              {snapshot?.rsi != null && (
                <div className="text-xs text-white/45">RSI <span className="text-white/80 font-medium ml-1">{snapshot.rsi.toFixed(1)}</span></div>
              )}
              {snapshot?.volume_vs_avg != null && (
                <div className="text-xs text-white/45">Vol× <span className="text-white/80 font-medium ml-1">{snapshot.volume_vs_avg.toFixed(2)}x</span></div>
              )}
              {flow?.composite_score != null && (
                <div className="text-xs text-white/45">Flow score <span className="text-white/80 font-medium ml-1">{flow.composite_score.toFixed(1)}</span></div>
              )}
            </div>
            {xTicker?.rationale && (
              <div className="text-xs text-white/65 leading-relaxed border-l-2 border-indigo-500/40 pl-3">
                <div className="text-[10px] uppercase tracking-wider text-indigo-400/70 mb-0.5">Trending on X</div>
                {xTicker.rationale}
              </div>
            )}
            {flow?.rationale && (
              <div className="text-xs text-white/55 leading-relaxed">{flow.rationale}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [tickerPopup, setTickerPopup] = useState<string | null>(null);
  const openTicker = (symbol: string) => setTickerPopup(symbol);

  // Home aggregator — primary query. The Express proxy composes:
  // backend /api/home/dashboard + news (NEWS_CACHE) + crypto FG (CMC cache).
  const { data, isLoading, isError } = useQuery<HomeDashboardPayload>({
    queryKey: ["/api/home/dashboard"],
    staleTime: 60_000,
    // Poll every 30 s while options flows haven't appeared yet
    refetchInterval: (query) => {
      const d = query.state.data as HomeDashboardPayload | undefined;
      const pending = d?.section_status?.unusual_options_flows === "precompute_pending";
      const empty   = !d?.unusual_options_flows?.length;
      return (pending || empty) && !query.state.error ? 30_000 : false;
    },
  });

  // Hyperliquid top signals — secondary query using the same cache key as the
  // HL page. If the user visited /app/hyperliquid-screener, this is free from
  // React Query cache. No polling on Home (HL page owns that 30s interval).
  const { data: hlSignals, isLoading: hlLoading } = useQuery<HLAdvSigs>({
    queryKey: ["hl-advanced-signals"],
    queryFn: async () => {
      const r = await fetch("/api/hyperliquid/signals");
      if (!r.ok) throw new Error(`HL signals ${r.status}`);
      return r.json();
    },
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Prefer backend-provided latest_news (FMP). Fall back to proxy-composed
  // news.articles (RSS, may have images) when latest_news is absent or empty.
  const newsArticles = (() => {
    const backend = data?.latest_news;
    if (backend && backend.length > 0) {
      return backend.map(n => ({
        title:       n.headline,
        description: n.summary || "",
        url:         n.url,
        source:      n.source || "Market News",
        published:   n.published_at || "",
        image:       null as string | null,
      }));
    }
    return (data?.news?.articles || []) as Array<{
      title: string; description: string; url: string;
      source: string; published: string; image?: string | null;
    }>;
  })();

  const cryptoFG = data?.fear_greed?.crypto || null;

  const greeting = data?.greeting?.text || "Welcome back";
  const marketLabel = data?.greeting?.market?.label || "Markets";
  const nowET = data?.greeting?.market?.now_et;

  return (
    <div className="relative min-h-screen text-white" style={{ background: "#050608" }}>
      {/* ambient background, matches app aesthetic */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(30,120,200,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 85% 10%, rgba(120,60,220,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 60% 90%, rgba(50,160,230,0.05) 0%, transparent 50%),
            linear-gradient(180deg, #050608 0%, #060810 30%, #070910 60%, #050608 100%)
          `,
        }}
      />
      <div
        className="fixed inset-0 z-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100,180,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,180,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* A. Top live ticker strip */}
      <div
        className="relative z-10 w-full border-b border-white/5 backdrop-blur-lg"
        style={{ height: 90, overflow: "hidden", background: "rgba(5,6,8,0.92)" }}
      >
        <div style={{ height: 90 }}>
          <TickerTapeWidget />
        </div>
      </div>

      <div className="relative z-10 max-w-[1540px] mx-auto px-5 lg:px-8 pt-10 pb-6">
        {/* C. Greeting & market status */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">
              Caelyn Home
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-white">
              {greeting}.
            </h1>
            <div className="text-sm text-white/55 mt-1 flex items-center gap-2">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  data?.greeting?.market?.status === "open"
                    ? "bg-emerald-400"
                    : data?.greeting?.market?.status === "pre_market" ||
                      data?.greeting?.market?.status === "after_hours"
                    ? "bg-amber-400"
                    : "bg-white/30"
                }`}
              />
              {marketLabel}{nowET ? ` · ${nowET}` : ""}
              {data?.from_cache && (
                <span className="ml-1 text-[10px] text-white/30">cached</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data?.section_status && Object.entries(data.section_status).map(([k, v]) => (
              <span
                key={k}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  v === "ok"
                    ? "border-emerald-500/20 text-emerald-300/80"
                    : "border-white/10 text-white/40"
                }`}
              >
                {k}
              </span>
            ))}
          </div>
        </div>

        {/* D. Top macro cards */}
        <SectionHeader icon={Activity} title="Market Snapshot" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[92px] rounded-xl bg-white/[0.04]" />
            ))}
          {!isLoading &&
            (data?.macro_cards || []).map((c, i) => <MacroCard key={i} card={c} />)}
          {!isLoading && (!data?.macro_cards || data.macro_cards.length === 0) && (
            <div className="col-span-full text-sm text-white/40">
              Macro data temporarily unavailable.
            </div>
          )}
        </div>

        {/* F + G. Two-column row: Theme Performance (2/3) | Latest News (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Theme Performance — 2/3 width */}
          <div className="lg:col-span-2">
            <GlassCard className="p-4">
              {(() => {
                const subThemes = data?.sub_theme_performance;
                const hasSubThemes = subThemes && subThemes.length > 0;
                return (
                  <>
                    <SectionHeader
                      icon={BarChart3}
                      title="Theme Performance"
                      accent={hasSubThemes ? "sub-theme leaders" : "sector rotation"}
                    />
                    {isLoading && Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 my-1 rounded bg-white/[0.04]" />
                    ))}
                    {!isLoading && hasSubThemes && (
                      <div>
                        <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/30 px-2 mb-1">
                          <span>Sub-theme · leaders</span>
                          <span className="flex gap-6 mr-1"><span>breadth</span><span>1D</span></span>
                        </div>
                        {subThemes.map((item, i) => (
                          <SubThemeRow key={item.sub_theme || i} item={item} />
                        ))}
                      </div>
                    )}
                    {!isLoading && !hasSubThemes && (data?.theme_performance?.themes || []).length > 0 && (
                      <>
                        <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-white/40 px-2 mb-1">
                          <div className="col-span-4">Sector</div>
                          <div className="col-span-5 text-center">30D relative</div>
                          <div className="col-span-1 text-right">1D</div>
                          <div className="col-span-1 text-right">7D</div>
                          <div className="col-span-1 text-right">30D</div>
                        </div>
                        {(data?.theme_performance?.themes || []).map((t, i) => (
                          <ThemeRow key={i} theme={t} />
                        ))}
                      </>
                    )}
                    {!isLoading && !hasSubThemes && (!data?.theme_performance?.themes || data.theme_performance.themes.length === 0) && (
                      <div className="text-sm text-white/40 py-8 text-center">Theme data temporarily unavailable.</div>
                    )}
                  </>
                );
              })()}
            </GlassCard>
          </div>

          {/* Right: Latest News — 1/3 width */}
          <div className="lg:col-span-1">
            <GlassCard className="p-4 h-full">
              <SectionHeader icon={Newspaper} title="Latest News" accent="Cross-market" />
              <div className="divide-y divide-white/[0.04]">
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 my-1 rounded bg-white/[0.04]" />
                ))}
                {newsArticles.slice(0, 8).map((a: any, i: number) => (
                  <a
                    key={i}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-start gap-2.5 p-2.5 hover:bg-white/[0.03] rounded-md transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-white/90 line-clamp-2">{a.title}</div>
                      <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1.5">
                        <span className="truncate">{a.source}</span>
                        {a.published && (
                          <span className="text-white/25">· {new Date(a.published).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
                {newsArticles.length === 0 && !isLoading && (
                  <div className="text-sm text-white/40 py-6 text-center">News feed loading…</div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* H2. Portfolio Snapshot + Watchlist Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <SnapshotTable
            items={data?.portfolio_snapshot}
            loading={isLoading}
            title="Portfolio Snapshot"
            icon={Briefcase}
            accent="tracked positions"
            status={data?.section_status?.portfolio_snapshot}
            scrollable
          />
          <SnapshotTable
            items={data?.watchlist_snapshot}
            loading={isLoading}
            title="Watchlist Snapshot"
            icon={Wallet}
            accent="top movers from watchlist"
            status={data?.section_status?.watchlist_snapshot}
            scrollable
          />
        </div>

        {/* H3. Unusual Options Flows + Hyperliquid Top Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <UnusualFlowsSection
            flows={data?.unusual_options_flows}
            status={data?.section_status?.unusual_options_flows}
            loading={isLoading}
            onTickerClick={openTicker}
          />
          <HLTopSignals signals={hlSignals} loading={hlLoading} />
        </div>

        {/* I + J + H. Four-across: Trending on X | Trending on Stocktwits | Top Movers | Top Losers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6" style={{ gridAutoRows: "460px" }}>
          {/* Trending on X */}
          <GlassCard className="p-4 flex flex-col overflow-hidden">
            {(() => {
              const tx = data?.trending_on_x;
              const generatedAt = tx?.generated_at ? new Date(tx.generated_at) : null;
              const relativeUpdated = (() => {
                if (!generatedAt) return "Weekly";
                const ageMs = Date.now() - generatedAt.getTime();
                const ageSec = Math.max(0, Math.floor(ageMs / 1000));
                if (ageSec < 60) return `${ageSec}s ago`;
                const ageMin = Math.floor(ageSec / 60);
                if (ageMin < 60) return `${ageMin}m ago`;
                const ageHr = Math.floor(ageMin / 60);
                if (ageHr < 24) return `${ageHr}h ago`;
                return `${Math.floor(ageHr / 24)}d ago`;
              })();
              const ageSeconds = typeof tx?.age_seconds === "number" ? tx.age_seconds : null;
              const isStale = tx?.is_stale === true || (ageSeconds !== null && ageSeconds > 7 * 86400);
              const isRefreshing = tx?.refresh_in_progress === true;
              return (
                <SectionHeader
                  icon={LineChart}
                  title="Trending on X"
                  accent={relativeUpdated}
                  action={
                    <div className="flex items-center gap-1">
                      {isStale && <span className="text-[9px] px-1 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/10">stale</span>}
                      {isRefreshing && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />}
                    </div>
                  }
                />
              );
            })()}
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
              {(data?.trending_on_x?.top_tickers || []).map((t, i) => (
                <div key={t.symbol || i} className="px-2 py-2 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:border-white/12 transition-colors cursor-pointer" onClick={() => openTicker(t.symbol)}>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-white/90 truncate">${t.symbol}</span>
                    {t.sentiment && (
                      <Badge variant="outline" className={`h-4 text-[9px] px-1 shrink-0 ${/bull/i.test(t.sentiment) ? "border-emerald-500/25 text-emerald-300" : /bear/i.test(t.sentiment) ? "border-rose-500/25 text-rose-300" : "border-white/10 text-white/55"}`}>{t.sentiment}</Badge>
                    )}
                  </div>
                  {t.rationale && <div className="text-[10px] text-white/45 mt-0.5 line-clamp-1">{t.rationale}</div>}
                </div>
              ))}
              {(!data?.trending_on_x?.top_tickers || data.trending_on_x.top_tickers.length === 0) && (
                <div className="text-xs text-white/40 py-4 text-center">No snapshot yet.</div>
              )}
            </div>
          </GlassCard>

          {/* Trending on Stocktwits */}
          <GlassCard className="p-4 flex flex-col overflow-hidden">
            <SectionHeader icon={Sparkles} title="Trending on Stocktwits" accent="Stocktwits" />
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded bg-white/[0.04]" />
              ))}
              {!isLoading && (data?.trending_ideas || []).map((d, i) => (
                <div key={d.ticker || i} className="px-2 py-2 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:border-white/12 transition-colors cursor-pointer" onClick={() => openTicker(d.ticker)}>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-white/90 truncate">${d.ticker}</span>
                    {typeof d.watchlist_count === "number" && d.watchlist_count > 0 && (
                      <Badge variant="outline" className="h-4 text-[9px] px-1 border-white/10 text-white/55 shrink-0">{d.watchlist_count.toLocaleString()}</Badge>
                    )}
                  </div>
                  {d.title && <div className="text-[10px] text-white/45 mt-0.5 line-clamp-1">{d.title}</div>}
                </div>
              ))}
              {!isLoading && (!data?.trending_ideas || data.trending_ideas.length === 0) && (
                <div className="text-xs text-white/40 py-4 text-center">No trending ideas right now.</div>
              )}
            </div>
          </GlassCard>

          {/* Top Movers */}
          <GlassCard className="p-4 flex flex-col overflow-hidden">
            <SectionHeader icon={TrendingUp} title="Top Movers" accent="today" />
            <div className="divide-y divide-white/[0.04] overflow-y-auto flex-1 min-h-0">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 my-0.5 rounded bg-white/[0.04]" />
              ))}
              {!isLoading && (data?.movers?.gainers || []).slice(0, 8).map((row, i) => (
                <MoverRow key={i} row={row} onClick={row.ticker ? () => openTicker(row.ticker!) : undefined} />
              ))}
              {!isLoading && (!data?.movers?.gainers || data.movers.gainers.length === 0) && (
                <div className="text-sm text-white/40 py-6 text-center">No data</div>
              )}
            </div>
          </GlassCard>

          {/* Top Losers */}
          <GlassCard className="p-4 flex flex-col overflow-hidden">
            <SectionHeader icon={TrendingDown} title="Top Losers" accent="today" />
            <div className="divide-y divide-white/[0.04] overflow-y-auto flex-1 min-h-0">
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 my-0.5 rounded bg-white/[0.04]" />
              ))}
              {!isLoading && (data?.movers?.losers || []).slice(0, 8).map((row, i) => (
                <MoverRow key={i} row={row} onClick={row.ticker ? () => openTicker(row.ticker!) : undefined} />
              ))}
              {!isLoading && (!data?.movers?.losers || data.movers.losers.length === 0) && (
                <div className="text-sm text-white/40 py-6 text-center">No data</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* K. Fear & Greed — equities + crypto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <FearGreedGauge
            title="Equities Fear & Greed"
            side={data?.fear_greed?.equities}
            tint="#93c5fd"
          />
          <FearGreedGauge
            title="Crypto Fear & Greed"
            side={cryptoFG}
            tint="#f0abfc"
          />
        </div>

        {isError && (
          <Card className="p-4 border border-rose-500/20 bg-rose-500/5 text-rose-200 text-sm mb-6">
            Home dashboard unavailable right now. Individual sections that can
            load from other cached endpoints will still render.
          </Card>
        )}

        <div className="text-center text-[10px] text-white/25 py-4">
          Caelyn Home · composed from cached services · generated
          {data?.generated_at ? ` ${new Date(data.generated_at).toLocaleTimeString()}` : ""}
        </div>
      </div>

      {/* Ticker info popup */}
      {tickerPopup && (
        <TickerInfoPopup
          symbol={tickerPopup}
          onClose={() => setTickerPopup(null)}
          data={data}
        />
      )}
    </div>
  );
}
