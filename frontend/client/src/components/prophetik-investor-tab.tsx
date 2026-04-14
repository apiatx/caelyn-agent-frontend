import { useState, useEffect, useCallback, memo } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Building2,
  BarChart3,
  Globe2,
  Layers,
  Zap,
  ChevronDown,
  ChevronRight,
  CircleDot,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────

interface SupportingMarket {
  title?: string;
  question?: string;
  slug?: string;
  yes_pct?: number;
}

interface EquitySignal {
  id?: string;
  title: string;
  summary?: string;
  why_it_matters?: string;
  odds_move?: string;
  confidence?: number;
  regime_implication?: string;
  bullish_sectors?: string[];
  bearish_sectors?: string[];
  bullish_stocks?: string[];
  bearish_stocks?: string[];
  supporting_markets?: SupportingMarket[];
  tags?: string[];
  updated_at?: string;
}

interface RegimeIndicator {
  label: string;
  score?: number;
  direction?: string;
  confidence?: number;
  theme_count?: number;
  description?: string;
  left_label?: string;
  right_label?: string;
}

interface SectorSignal {
  sector: string;
  direction?: string;
  reason?: string;
  confidence?: number;
  themes?: string[];
  type?: string;
}

interface StockEntry {
  ticker: string;
  name?: string;
  reason?: string;
  themes?: string[];
  direction?: string;
}

interface StockWatchlists {
  bullish?: StockEntry[];
  bearish?: StockEntry[];
  conditional?: StockEntry[];
}

interface ThemeCluster {
  theme: string;
  direction?: string;
  confidence?: number;
  consistency?: string;
  contradiction?: boolean;
  supporting_markets?: SupportingMarket[];
  equity_impact?: string;
}

interface InvestorData {
  equity_signals?: EquitySignal[];
  regime?: RegimeIndicator[];
  sectors?: SectorSignal[];
  watchlists?: StockWatchlists;
  themes?: ThemeCluster[];
  generated_at?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatConfidence(c?: number): string {
  if (c == null) return "";
  if (c >= 80) return "High";
  if (c >= 55) return "Moderate";
  return "Low";
}

function confidenceColor(c?: number): string {
  if (c == null) return "text-white/30";
  if (c >= 80) return "text-emerald-400";
  if (c >= 55) return "text-blue-400";
  return "text-amber-400";
}

function directionIcon(dir?: string, size = "w-3.5 h-3.5") {
  const d = (dir ?? "").toLowerCase();
  if (d.includes("bull") || d.includes("up") || d.includes("positive") || d.includes("risk_on") || d.includes("growth"))
    return <TrendingUp className={`${size} text-emerald-400`} />;
  if (d.includes("bear") || d.includes("down") || d.includes("negative") || d.includes("risk_off") || d.includes("slow"))
    return <TrendingDown className={`${size} text-red-400`} />;
  return <Minus className={`${size} text-white/30`} />;
}

function directionColor(dir?: string): { text: string; bg: string; border: string } {
  const d = (dir ?? "").toLowerCase();
  if (d.includes("bull") || d.includes("up") || d.includes("positive") || d.includes("risk_on") || d.includes("growth"))
    return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (d.includes("bear") || d.includes("down") || d.includes("negative") || d.includes("risk_off") || d.includes("slow"))
    return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
  return { text: "text-white/40", bg: "bg-white/[0.04]", border: "border-white/[0.08]" };
}

function directionLabel(dir?: string): string {
  const d = (dir ?? "").toLowerCase();
  if (d.includes("bull") || d.includes("up") || d.includes("positive") || d.includes("risk_on")) return "Bullish";
  if (d.includes("bear") || d.includes("down") || d.includes("negative") || d.includes("risk_off")) return "Bearish";
  return "Neutral";
}

// ─── Skeleton ─────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.05] ${className}`} />;
}

function SignalSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 ${hero ? "col-span-full" : ""}`}>
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className={`h-5 w-3/4 mb-2 ${hero ? "h-6" : ""}`} />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-2/3 mb-4" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {subtitle && <p className="text-[10px] text-white/30">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Top Equity Signals ───────────────────────────────────────────

const EquitySignalCard = memo(function EquitySignalCard({
  signal,
  hero = false,
}: {
  signal: EquitySignal;
  hero?: boolean;
}) {
  const [expanded, setExpanded] = useState(hero);
  const conf = signal.confidence;
  const confLabel = formatConfidence(conf);
  const confColor = confidenceColor(conf);

  return (
    <div
      className={`rounded-xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200
        hover:border-white/[0.12] hover:bg-white/[0.03] p-5
        ${hero ? "col-span-full border-blue-500/20 bg-gradient-to-br from-blue-500/[0.04] to-transparent" : ""}
      `}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {signal.tags && signal.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-1.5">
              {signal.tags.slice(0, 3).map(t => (
                <span key={t} className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-white/35 border border-white/[0.06]">
                  {t}
                </span>
              ))}
            </div>
          )}
          <h3 className={`font-semibold text-white/90 leading-snug ${hero ? "text-base" : "text-sm"}`}>
            {signal.title}
          </h3>
        </div>
        {conf != null && (
          <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <span className="text-[9px] text-white/30">Confidence</span>
            <span className={`text-[11px] font-bold ${confColor}`}>{confLabel}</span>
          </div>
        )}
      </div>

      {/* Summary */}
      {signal.summary && (
        <p className="text-[11px] text-white/55 leading-relaxed mb-3">{signal.summary}</p>
      )}

      {/* Odds move */}
      {signal.odds_move && (
        <div className="flex items-center gap-1.5 mb-3 text-[10px]">
          <BarChart3 className="w-3 h-3 text-blue-400/60" />
          <span className="text-white/35">Odds:</span>
          <span className="text-blue-300/80 font-medium">{signal.odds_move}</span>
        </div>
      )}

      {/* Sector implications */}
      {((signal.bullish_sectors?.length ?? 0) > 0 || (signal.bearish_sectors?.length ?? 0) > 0) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(signal.bullish_sectors?.length ?? 0) > 0 && (
            <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 p-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/60 mb-1.5">↑ Bullish Sectors</p>
              <div className="space-y-0.5">
                {signal.bullish_sectors!.map(s => (
                  <p key={s} className="text-[10px] text-emerald-300/80 font-medium">{s}</p>
                ))}
              </div>
            </div>
          )}
          {(signal.bearish_sectors?.length ?? 0) > 0 && (
            <div className="rounded-lg bg-red-500/[0.06] border border-red-500/15 p-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-red-400/60 mb-1.5">↓ Bearish Sectors</p>
              <div className="space-y-0.5">
                {signal.bearish_sectors!.map(s => (
                  <p key={s} className="text-[10px] text-red-300/80 font-medium">{s}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stock implications */}
      {((signal.bullish_stocks?.length ?? 0) > 0 || (signal.bearish_stocks?.length ?? 0) > 0) && (
        <div className="flex items-start gap-3 mb-3">
          {(signal.bullish_stocks?.length ?? 0) > 0 && (
            <div className="flex-1">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-emerald-400/50 mb-1">Bullish tickers</p>
              <div className="flex flex-wrap gap-1">
                {signal.bullish_stocks!.map(t => (
                  <span key={t} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(signal.bearish_stocks?.length ?? 0) > 0 && (
            <div className="flex-1">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-red-400/50 mb-1">Bearish tickers</p>
              <div className="flex flex-wrap gap-1">
                {signal.bearish_stocks!.map(t => (
                  <span key={t} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regime implication */}
      {signal.regime_implication && (
        <div className="mb-3 flex items-start gap-1.5 text-[10px] px-2 py-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
          <Globe2 className="w-3 h-3 text-white/25 mt-0.5 flex-shrink-0" />
          <span className="text-white/40 leading-snug">{signal.regime_implication}</span>
        </div>
      )}

      {/* Expandable: Why it matters + supporting markets */}
      {(signal.why_it_matters || (signal.supporting_markets?.length ?? 0) > 0) && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors mt-1"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expanded ? "Less detail" : "More detail"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {signal.why_it_matters && (
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-white/25 mb-1">Why it matters</p>
                  <p className="text-[10px] text-white/45 leading-relaxed">{signal.why_it_matters}</p>
                </div>
              )}
              {(signal.supporting_markets?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-white/25 mb-1.5">Supporting markets</p>
                  <div className="space-y-1">
                    {signal.supporting_markets!.slice(0, 4).map((m, i) => {
                      const title = m.title ?? m.question ?? "";
                      const url = m.slug ? `https://polymarket.com/event/${m.slug}` : null;
                      return (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <CircleDot className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
                          {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-white/45 hover:text-white/70 truncate transition-colors flex-1">
                              {title}
                            </a>
                          ) : (
                            <span className="text-white/40 truncate flex-1">{title}</span>
                          )}
                          {m.yes_pct != null && (
                            <span className="text-white/40 font-mono flex-shrink-0">{m.yes_pct}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

function TopEquitySignals({ signals, loading }: { signals: EquitySignal[]; loading: boolean }) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<Zap className="w-4 h-4" />}
        title="Top Equity Signals"
        subtitle="What Polymarket repricing implies for stocks right now"
      />
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SignalSkeleton hero />
          <SignalSkeleton />
          <SignalSkeleton />
        </div>
      ) : signals.length === 0 ? (
        <EmptyState text="No equity signals available yet. Backend is still analyzing markets." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {signals.map((s, i) => (
            <EquitySignalCard key={s.id ?? i} signal={s} hero={i === 0} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Regime Scoreboard ────────────────────────────────────────────

function RegimeBar({ score }: { score?: number }) {
  const pct = Math.min(100, Math.max(0, score ?? 50));
  const color = pct >= 65 ? "bg-emerald-400" : pct <= 35 ? "bg-red-400" : "bg-blue-400";
  return (
    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

const RegimeRow = memo(function RegimeRow({ indicator }: { indicator: RegimeIndicator }) {
  const dir = (indicator.direction ?? "").toLowerCase();
  const isBullish = dir.includes("on") || dir.includes("bull") || dir.includes("lower") || dir.includes("growth") || dir.includes("easing") || dir.includes("dis") || dir.includes("relief") || dir.includes("support");
  const isBearish = dir.includes("off") || dir.includes("bear") || dir.includes("higher") || dir.includes("slow") || dir.includes("stress") || dir.includes("pressure") || dir.includes("restrict");
  const textColor = isBullish ? "text-emerald-400" : isBearish ? "text-red-400" : "text-white/40";

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-b-0">
      {/* Label */}
      <div className="w-36 flex-shrink-0">
        <p className="text-[10px] font-semibold text-white/70 leading-tight">{indicator.label}</p>
        {indicator.description && (
          <p className="text-[9px] text-white/25 leading-tight mt-0.5 line-clamp-1">{indicator.description}</p>
        )}
      </div>

      {/* Left label (optional) */}
      <span className="text-[8px] text-white/20 w-16 text-right flex-shrink-0 hidden sm:block">
        {indicator.left_label ?? ""}
      </span>

      {/* Bar */}
      <div className="flex items-center gap-2 flex-1">
        <RegimeBar score={indicator.score} />
      </div>

      {/* Right label (optional) */}
      <span className="text-[8px] text-white/20 w-16 flex-shrink-0 hidden sm:block">
        {indicator.right_label ?? ""}
      </span>

      {/* Direction + confidence */}
      <div className="flex items-center gap-2 flex-shrink-0 w-32 justify-end">
        <span className={`text-[10px] font-semibold ${textColor}`}>
          {indicator.direction ?? "—"}
        </span>
        {indicator.confidence != null && (
          <span className={`text-[8px] font-bold ${confidenceColor(indicator.confidence)}`}>
            {formatConfidence(indicator.confidence)}
          </span>
        )}
        {indicator.theme_count != null && (
          <span className="text-[8px] text-white/20">{indicator.theme_count}m</span>
        )}
      </div>
    </div>
  );
});

function RegimeScoreboard({ regime, loading }: { regime: RegimeIndicator[]; loading: boolean }) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<Globe2 className="w-4 h-4" />}
        title="Regime Scoreboard"
        subtitle="Macro environment implied by prediction market positioning"
      />
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : regime.length === 0 ? (
        <EmptyState text="Regime indicators not yet available." />
      ) : (
        <div>
          {regime.map((ind, i) => <RegimeRow key={ind.label + i} indicator={ind} />)}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Sector Rotation Signals ──────────────────────────────────────

const SECTOR_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  positive:  { label: "Positive",          color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  negative:  { label: "Negative",          color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20" },
  emerging:  { label: "Emerging Leader",   color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  fader:     { label: "Fading",            color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
  leader:    { label: "Leader",            color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

const SectorCard = memo(function SectorCard({ signal }: { signal: SectorSignal }) {
  const type = (signal.type ?? "").toLowerCase();
  const style = SECTOR_TYPE_CONFIG[type] ?? SECTOR_TYPE_CONFIG[directionLabel(signal.direction).toLowerCase()] ?? { label: "Signal", color: "text-white/40", bg: "bg-white/[0.04]", border: "border-white/[0.08]" };
  const dc = directionColor(signal.direction);

  return (
    <div className={`rounded-xl p-4 border ${style.border} ${style.bg}`}>
      {/* Type badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-[8px] font-bold uppercase tracking-widest ${style.color}`}>{style.label}</span>
        {signal.confidence != null && (
          <span className={`text-[9px] font-semibold ${confidenceColor(signal.confidence)}`}>
            {formatConfidence(signal.confidence)} confidence
          </span>
        )}
      </div>

      {/* Sector name */}
      <p className="text-sm font-bold text-white/90 mb-2">{signal.sector}</p>

      {/* Direction */}
      <div className="flex items-center gap-1.5 mb-2">
        {directionIcon(signal.direction, "w-3.5 h-3.5")}
        <span className={`text-[10px] font-semibold ${dc.text}`}>{directionLabel(signal.direction)}</span>
      </div>

      {/* Reason */}
      {signal.reason && (
        <p className="text-[10px] text-white/45 leading-relaxed mb-2">{signal.reason}</p>
      )}

      {/* Linked themes */}
      {(signal.themes?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {signal.themes!.map(t => (
            <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/30">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
});

function SectorRotationSignals({ sectors, loading }: { sectors: SectorSignal[]; loading: boolean }) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<Layers className="w-4 h-4" />}
        title="Sector Rotation Signals"
        subtitle="Which sectors are implied to be in or out by prediction market flows"
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : sectors.length === 0 ? (
        <EmptyState text="Sector signals not yet available." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sectors.map((s, i) => <SectorCard key={s.sector + i} signal={s} />)}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Stock Watchlists ─────────────────────────────────────────────

function StockRow({ entry }: { entry: StockEntry }) {
  const dir = (entry.direction ?? "bullish").toLowerCase();
  const isBull = dir.includes("bull");
  const isBear = dir.includes("bear");

  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-b-0">
      {/* Direction indicator */}
      <div className="pt-0.5">
        {isBull ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : isBear ? <ArrowDownRight className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5 text-white/30" />}
      </div>

      {/* Ticker */}
      <div className="flex-shrink-0 w-14">
        <span className={`text-[11px] font-bold font-mono ${isBull ? "text-emerald-400" : isBear ? "text-red-400" : "text-white/60"}`}>
          {entry.ticker}
        </span>
      </div>

      {/* Name + reason */}
      <div className="flex-1 min-w-0">
        {entry.name && (
          <p className="text-[10px] text-white/50 leading-tight mb-0.5">{entry.name}</p>
        )}
        {entry.reason && (
          <p className="text-[10px] text-white/35 leading-snug">{entry.reason}</p>
        )}
      </div>

      {/* Themes */}
      {(entry.themes?.length ?? 0) > 0 && (
        <div className="flex-shrink-0 hidden sm:flex gap-1 flex-wrap max-w-[120px] justify-end">
          {entry.themes!.slice(0, 2).map(t => (
            <span key={t} className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-white/25">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function WatchlistCard({
  title,
  stocks,
  colorClass,
  icon,
}: {
  title: string;
  stocks?: StockEntry[];
  colorClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center justify-center w-6 h-6 rounded-md ${colorClass}`}>{icon}</div>
        <h3 className="text-[11px] font-bold text-white/70 uppercase tracking-wider">{title}</h3>
        {(stocks?.length ?? 0) > 0 && (
          <span className="ml-auto text-[9px] text-white/25 tabular-nums">{stocks!.length} stocks</span>
        )}
      </div>
      {(stocks?.length ?? 0) === 0 ? (
        <p className="text-[10px] text-white/20 py-2">No stocks in this list yet.</p>
      ) : (
        <div>
          {stocks!.map((s, i) => <StockRow key={s.ticker + i} entry={s} />)}
        </div>
      )}
    </div>
  );
}

function StockWatchlistsSection({ watchlists, loading }: { watchlists: StockWatchlists | null; loading: boolean }) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<Building2 className="w-4 h-4" />}
        title="Stock Watchlists"
        subtitle="Tickers most exposed to prediction market themes, grouped by direction"
      />
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : !watchlists ? (
        <EmptyState text="Watchlist data not yet available." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <WatchlistCard
            title="Bullish Watchlist"
            stocks={watchlists.bullish}
            colorClass="bg-emerald-500/15 text-emerald-400"
            icon={<TrendingUp className="w-3.5 h-3.5" />}
          />
          <WatchlistCard
            title="Bearish Watchlist"
            stocks={watchlists.bearish}
            colorClass="bg-red-500/15 text-red-400"
            icon={<TrendingDown className="w-3.5 h-3.5" />}
          />
          <WatchlistCard
            title="Conditional Watch"
            stocks={watchlists.conditional}
            colorClass="bg-amber-500/15 text-amber-400"
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
          />
        </div>
      )}
    </GlassCard>
  );
}

// ─── Theme Clusters ───────────────────────────────────────────────

const ThemeClusterCard = memo(function ThemeClusterCard({ cluster }: { cluster: ThemeCluster }) {
  const [expanded, setExpanded] = useState(false);
  const dc = directionColor(cluster.direction);

  return (
    <div className={`rounded-xl border ${dc.border} ${dc.bg} p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {directionIcon(cluster.direction, "w-3.5 h-3.5")}
          <h3 className="text-[11px] font-bold text-white/80">{cluster.theme}</h3>
        </div>
        {cluster.confidence != null && (
          <span className={`text-[9px] font-semibold flex-shrink-0 ${confidenceColor(cluster.confidence)}`}>
            {formatConfidence(cluster.confidence)}
          </span>
        )}
      </div>

      {/* Direction */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[9px] font-semibold uppercase tracking-wide ${dc.text}`}>
          {directionLabel(cluster.direction)}
        </span>
        {cluster.consistency && (
          <span className="text-[9px] text-white/25">{cluster.consistency}</span>
        )}
        {cluster.contradiction && (
          <span className="text-[8px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/15 px-1 py-0.5 rounded">
            ⚠ Mixed signals
          </span>
        )}
      </div>

      {/* Equity impact */}
      {cluster.equity_impact && (
        <p className="text-[10px] text-white/45 leading-relaxed mb-2">{cluster.equity_impact}</p>
      )}

      {/* Supporting markets (expandable) */}
      {(cluster.supporting_markets?.length ?? 0) > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {cluster.supporting_markets!.length} supporting market{cluster.supporting_markets!.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {cluster.supporting_markets!.slice(0, 5).map((m, i) => {
                const title = m.title ?? m.question ?? "";
                const url = m.slug ? `https://polymarket.com/event/${m.slug}` : null;
                return (
                  <div key={i} className="flex items-center gap-1.5 text-[10px]">
                    <CircleDot className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/65 truncate transition-colors flex-1">
                        {title}
                      </a>
                    ) : (
                      <span className="text-white/35 truncate flex-1">{title}</span>
                    )}
                    {m.yes_pct != null && (
                      <span className="text-white/35 font-mono flex-shrink-0">{m.yes_pct}%</span>
                    )}
                    {url && (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-white/15 hover:text-white/40 transition-colors">
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
});

function ThemeClusters({ themes, loading }: { themes: ThemeCluster[]; loading: boolean }) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<BarChart3 className="w-4 h-4" />}
        title="Theme Clusters"
        subtitle="Underlying Polymarket themes with equity interpretation"
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : themes.length === 0 ? (
        <EmptyState text="Theme cluster data not yet available." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {themes.map((t, i) => <ThemeClusterCard key={t.theme + i} cluster={t} />)}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Empty State ──────────────────────────────────────────────────

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center mb-2">
        <BarChart3 className="w-4 h-4 text-white/20" />
      </div>
      <p className="text-[11px] text-white/25">{text}</p>
    </div>
  );
}

// ─── Data Fetching ────────────────────────────────────────────────

// Tries the comprehensive /api/predict/investor endpoint first,
// then individual sub-endpoints as a fallback.
async function fetchInvestorData(): Promise<InvestorData> {
  // Attempt 1: comprehensive endpoint
  try {
    const r = await fetch("/api/predict/investor");
    if (r.ok) {
      const json = await r.json();
      if (json && (json.equity_signals || json.regime || json.sectors || json.watchlists || json.themes)) {
        return json as InvestorData;
      }
    }
  } catch { /* fall through */ }

  // Attempt 2: individual sub-endpoints in parallel
  const results = await Promise.allSettled([
    fetch("/api/predict/investor/signals").then(r => r.ok ? r.json() : null),
    fetch("/api/predict/investor/regime").then(r => r.ok ? r.json() : null),
    fetch("/api/predict/investor/sectors").then(r => r.ok ? r.json() : null),
    fetch("/api/predict/investor/watchlists").then(r => r.ok ? r.json() : null),
    fetch("/api/predict/investor/themes").then(r => r.ok ? r.json() : null),
  ]);

  const [signalsRes, regimeRes, sectorsRes, watchlistsRes, themesRes] = results.map(r =>
    r.status === "fulfilled" ? r.value : null
  );

  const hasAny = signalsRes || regimeRes || sectorsRes || watchlistsRes || themesRes;
  if (!hasAny) throw new Error("Investor endpoints not yet available");

  return {
    equity_signals: Array.isArray(signalsRes) ? signalsRes : (signalsRes?.signals ?? signalsRes?.equity_signals ?? []),
    regime: Array.isArray(regimeRes) ? regimeRes : (regimeRes?.regime ?? regimeRes?.indicators ?? []),
    sectors: Array.isArray(sectorsRes) ? sectorsRes : (sectorsRes?.sectors ?? sectorsRes?.sector_signals ?? []),
    watchlists: watchlistsRes?.watchlists ?? watchlistsRes ?? null,
    themes: Array.isArray(themesRes) ? themesRes : (themesRes?.themes ?? themesRes?.clusters ?? []),
  };
}

// ─── Main Component ───────────────────────────────────────────────

export function ProphetikInvestorTab() {
  const [data, setData] = useState<InvestorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchInvestorData();
      setData(d);
      setLastUpdated(d.generated_at ?? new Date().toISOString());
    } catch (e: any) {
      setError(e?.message ?? "Failed to load investor data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 5 * 60_000); // refresh every 5 min
    return () => clearInterval(iv);
  }, [loadData]);

  // Section-level data (fall through to empty arrays if unavailable)
  const signals = data?.equity_signals ?? [];
  const regime = data?.regime ?? [];
  const sectors = data?.sectors ?? [];
  const watchlists = data?.watchlists ?? null;
  const themes = data?.themes ?? [];

  const isLoading = loading && !data;
  const noData = !loading && !data && !!error;

  return (
    <div className="pb-4">
      {/* Tab sub-header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-white/30">
            Prediction markets translated into equity-relevant macro signals, regime reads, and stock implications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[9px] text-white/20 tabular-nums">
              Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error state — shown only when no data at all */}
      {noData && (
        <GlassCard className="p-8 mb-5 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-white/20" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/40 mb-1">Investor data unavailable</p>
              <p className="text-[11px] text-white/20 max-w-xs mx-auto leading-relaxed">
                The Investor backend endpoints are not yet responding. The Gambler tab continues to work normally.
              </p>
            </div>
            <button
              onClick={loadData}
              className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-[11px] text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        </GlassCard>
      )}

      {/* Content sections — render independently so partial data still shows */}
      {!noData && (
        <>
          <TopEquitySignals signals={signals} loading={isLoading} />
          <RegimeScoreboard regime={regime} loading={isLoading} />
          <SectorRotationSignals sectors={sectors} loading={isLoading} />
          <StockWatchlistsSection watchlists={watchlists} loading={isLoading} />
          <ThemeClusters themes={themes} loading={isLoading} />
        </>
      )}
    </div>
  );
}
