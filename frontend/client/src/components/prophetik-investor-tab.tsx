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

// ─── Backend types (exact field names from /api/predict/investor/overview) ────

interface BackendSupportingMarket {
  condition_id?: string;
  question?: string;
  yes_pct?: number;
  price_change_1d?: number;
  price_change_1wk?: number;
  volume_24h?: number;
  composite_score?: number;
  equity_relevance_score?: number;
}

interface BackendDriverMarket {
  condition_id?: string;
  question?: string;
  title?: string;
  outcome_label?: string;
  current_odds?: number;
  delta_24h_pp?: number;
  delta_7d_pp?: number;
  direction?: string;
  semantic_event_type?: string;
  event_type?: string;
  equity_regime_read?: string;
  polarity?: string;
  contribution_score?: number;
}

interface BackendSignalIntegrity {
  has_polarity_conflict?: boolean;
  has_mixed_semantics?: boolean;
  warning?: string;
}

interface BackendEquitySignal {
  theme_id?: string;
  title: string;
  summary?: string;
  why_it_matters?: string;
  supporting_markets?: BackendSupportingMarket[];
  market_count?: number;
  odds_move_summary?: string;        // backend key (not odds_move)
  summary_direction?: string;
  bullish_sectors?: string[];
  bearish_sectors?: string[];
  bullish_stocks?: string[];
  bearish_stocks?: string[];
  asset_baskets?: string[];
  regime_impact?: string;            // backend key (not regime_implication)
  confidence?: string;               // e.g. "high", "medium"
  confidence_score?: number;         // 0-100 number
  narrative?: string;
  watchlist_priority?: string;
  // new diagnostic fields
  primary_driver_market?: BackendDriverMarket;
  driver_markets?: BackendDriverMarket[];
  confidence_explanation?: string;
  signal_integrity?: BackendSignalIntegrity;
}

interface BackendRegimeValue {
  label?: string;
  score?: number;
  direction?: string;
  confidence?: string;              // "high", "medium", "low"
  supporting_themes?: string[];
}

interface BackendSectorEntry {
  sector: string;
  mentions?: number;
  stocks?: string[];
}

interface BackendSectorRotation {
  strongest_positive_sectors?: BackendSectorEntry[];
  strongest_negative_sectors?: BackendSectorEntry[];
  emerging_leadership?: BackendSectorEntry[];
  fading_leadership?: BackendSectorEntry[];
  regime_context_notes?: string[];
}

interface BackendWatchlistItem {
  ticker: string;
  themes?: string[];
  sectors?: string[];
  type?: string;
  note?: string;
  bullish_themes?: string[];
  bearish_themes?: string[];
}

interface BackendWatchlists {
  bullish_watchlist?: BackendWatchlistItem[];
  bearish_watchlist?: BackendWatchlistItem[];
  conditional_watchlist?: BackendWatchlistItem[];
  watchlist_notes?: string[];
}

interface BackendThemeCluster {
  theme_id?: string;
  theme_name: string;               // backend key (not "theme")
  theme_emoji?: string;
  description?: string;
  supporting_markets?: BackendSupportingMarket[];
  market_count?: number;
  weighted_odds_shift_24h?: number;
  weighted_odds_shift_7d?: number;
  weighted_volume?: number;
  confidence_score?: number;        // 0-100 (not "confidence")
  consistency_score?: number;
  contradiction_score?: number;     // > 0 means contradictory signals
  freshness_score?: number;
  regime_signal_strength?: number;
  summary_direction?: string;       // backend key (not "direction")
  avg_equity_relevance?: number;
  bullish_sectors?: string[];
  bearish_sectors?: string[];
  bullish_stocks?: string[];
  bearish_stocks?: string[];
  asset_baskets?: string[];
  regime_implications?: string;
  narrative?: string;
}

interface BackendOverview {
  generated_at?: string;
  equity_relevant_market_count?: number;
  total_market_count?: number;
  top_equity_signals?: BackendEquitySignal[];     // key: top_equity_signals
  sector_rotation?: BackendSectorRotation;        // key: sector_rotation (object)
  watchlists?: BackendWatchlists;                 // key: watchlists
  regime_scoreboard?: Record<string, BackendRegimeValue>; // key: regime_scoreboard (object)
  theme_clusters?: BackendThemeCluster[];         // key: theme_clusters
}

// ─── Normalised view-model types ─────────────────────────────────────────────

interface RegimeRow {
  key: string;
  displayName: string;
  label?: string;
  score?: number;
  direction?: string;
  confidenceStr?: string;
  supportingThemes?: string[];
}

interface SectorSignal {
  sector: string;
  type: "positive" | "negative" | "emerging" | "fading";
  stocks?: string[];
  mentions?: number;
}

interface WatchlistEntry {
  ticker: string;
  themes?: string[];
  sectors?: string[];
  direction: "bullish" | "bearish" | "conditional";
  note?: string;
}

// ─── Transform helpers ────────────────────────────────────────────────────────

const REGIME_DISPLAY_NAMES: Record<string, string> = {
  risk_on_vs_risk_off:                   "Risk On / Risk Off",
  inflationary_vs_disinflationary:       "Inflation / Disinflation",
  growth_vs_slowdown:                    "Growth / Slowdown",
  geopolitical_stress_vs_easing:         "Geopolitical Stress",
  higher_for_longer_vs_easing:           "Higher-for-Longer",
  commodity_pressure_vs_relief:          "Commodity Pressure",
  ai_capex_supportive_vs_restrictive:    "AI Capex / Restrictive",
};

function transformRegime(rs?: Record<string, BackendRegimeValue>): RegimeRow[] {
  if (!rs) return [];
  return Object.entries(rs).map(([key, v]) => ({
    key,
    displayName: REGIME_DISPLAY_NAMES[key] ?? key.replace(/_/g, " "),
    label: v.label,
    score: v.score,
    direction: v.direction,
    confidenceStr: v.confidence,
    supportingThemes: v.supporting_themes,
  }));
}

function transformSectors(sr?: BackendSectorRotation): SectorSignal[] {
  if (!sr) return [];
  const out: SectorSignal[] = [];
  (sr.strongest_positive_sectors ?? []).forEach(e => out.push({ sector: e.sector, type: "positive", stocks: e.stocks, mentions: e.mentions }));
  (sr.strongest_negative_sectors ?? []).forEach(e => out.push({ sector: e.sector, type: "negative", stocks: e.stocks, mentions: e.mentions }));
  (sr.emerging_leadership ?? []).forEach(e => out.push({ sector: e.sector, type: "emerging", stocks: e.stocks }));
  (sr.fading_leadership ?? []).forEach(e => out.push({ sector: e.sector, type: "fading", stocks: e.stocks }));
  return out;
}

function transformWatchlists(wl?: BackendWatchlists): { bullish: WatchlistEntry[]; bearish: WatchlistEntry[]; conditional: WatchlistEntry[] } {
  const mapItem = (item: BackendWatchlistItem, dir: "bullish" | "bearish" | "conditional"): WatchlistEntry => ({
    ticker: item.ticker,
    themes: item.themes ?? item.bullish_themes ?? item.bearish_themes,
    sectors: item.sectors,
    direction: dir,
    note: item.note,
  });
  return {
    bullish:     (wl?.bullish_watchlist    ?? []).map(i => mapItem(i, "bullish")),
    bearish:     (wl?.bearish_watchlist    ?? []).map(i => mapItem(i, "bearish")),
    conditional: (wl?.conditional_watchlist ?? []).map(i => mapItem(i, "conditional")),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceScore(s?: BackendEquitySignal): number | undefined {
  if (s?.confidence_score != null) return s.confidence_score;
  if (s?.confidence === "high") return 85;
  if (s?.confidence === "medium") return 60;
  if (s?.confidence === "low") return 35;
  return undefined;
}

function confidenceLabel(score?: number, str?: string): string {
  if (str === "high" || (score != null && score >= 75)) return "High";
  if (str === "medium" || (score != null && score >= 50)) return "Moderate";
  if (str === "low" || (score != null && score < 50)) return "Low";
  return "";
}

function confidenceColor(score?: number, str?: string): string {
  const label = confidenceLabel(score, str);
  if (label === "High") return "text-emerald-400";
  if (label === "Moderate") return "text-blue-400";
  if (label === "Low") return "text-amber-400";
  return "text-white/30";
}

function directionFromSummary(dir?: string): "bullish" | "bearish" | "neutral" {
  const d = (dir ?? "").toLowerCase();
  if (d.includes("risk_on") || d.includes("bullish") || d.includes("positive") || d.includes("growth") || d.includes("easing") || d.includes("disinflation") || d.includes("relief") || d.includes("support")) return "bullish";
  if (d.includes("risk_off") || d.includes("bearish") || d.includes("negative") || d.includes("slowdown") || d.includes("stress") || d.includes("pressure") || d.includes("restrict") || d.includes("inflation") || d.includes("longer")) return "bearish";
  return "neutral";
}

function directionFromRegime(dir?: string, label?: string): "bullish" | "bearish" | "neutral" {
  const d = (dir ?? label ?? "").toLowerCase();
  if (d.includes("rising") || d.includes("risk_on") || d.includes("growth") || d.includes("easing") || d.includes("disinflation") || d.includes("relief") || d.includes("support")) return "bullish";
  if (d.includes("falling") || d.includes("risk_off") || d.includes("slowdown") || d.includes("stress") || d.includes("pressure") || d.includes("restrict") || d.includes("inflation") || d.includes("longer")) return "bearish";
  return "neutral";
}

function dirIcon(dir: "bullish" | "bearish" | "neutral", cls = "w-3.5 h-3.5") {
  if (dir === "bullish") return <TrendingUp className={`${cls} text-emerald-400`} />;
  if (dir === "bearish") return <TrendingDown className={`${cls} text-red-400`} />;
  return <Minus className={`${cls} text-white/30`} />;
}

function dirColors(dir: "bullish" | "bearish" | "neutral") {
  if (dir === "bullish") return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (dir === "bearish") return { text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20"     };
  return                         { text: "text-white/40",   bg: "bg-white/[0.04]",   border: "border-white/[0.08]"   };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.05] ${className}`} />;
}

// ─── Section Header ───────────────────────────────────────────────────────────

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

// ─── Top Equity Signals ───────────────────────────────────────────────────────

function fmtPP(v?: number | null): string {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}pp`;
}

function fmtOdds(v?: number | null): string {
  if (v == null) return "—";
  return `${v.toFixed(1)}%`;
}

function DriverMarketsTable({ markets }: { markets: BackendDriverMarket[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.06] mt-2">
      <table className="w-full text-[9px] min-w-[520px]">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {["Market", "Outcome", "Odds", "24h Δ", "7d Δ", "Event type", "Equity read", "Polarity", "Score"].map(h => (
              <th key={h} className="text-left px-2 py-1.5 text-white/25 font-semibold uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {markets.map((m, i) => {
            const isInverted = m.polarity === "inverted";
            const d24 = m.delta_24h_pp ?? 0;
            const d7  = m.delta_7d_pp  ?? 0;
            return (
              <tr key={m.condition_id ?? i} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                <td className="px-2 py-1.5 text-white/55 max-w-[180px]">
                  <span className="line-clamp-2 leading-snug">{m.question ?? m.title ?? "—"}</span>
                </td>
                <td className="px-2 py-1.5 text-white/60 font-semibold whitespace-nowrap">{m.outcome_label ?? "YES"}</td>
                <td className="px-2 py-1.5 text-white/50 font-mono whitespace-nowrap">{fmtOdds(m.current_odds)}</td>
                <td className={`px-2 py-1.5 font-mono whitespace-nowrap ${d24 >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtPP(m.delta_24h_pp)}
                </td>
                <td className={`px-2 py-1.5 font-mono whitespace-nowrap ${d7 >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtPP(m.delta_7d_pp)}
                </td>
                <td className="px-2 py-1.5 text-white/40 whitespace-nowrap">
                  {m.semantic_event_type ?? m.event_type ?? "—"}
                </td>
                <td className="px-2 py-1.5 text-white/50 whitespace-nowrap">{m.equity_regime_read ?? "—"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {isInverted ? (
                    <span
                      className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400"
                      title="YES rising means the opposite of the broad category framing."
                    >
                      Inverted
                    </span>
                  ) : (
                    <span className="text-white/25">Direct</span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-white/35 font-mono whitespace-nowrap">
                  {m.contribution_score != null ? m.contribution_score.toFixed(2) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const EquitySignalCard = memo(function EquitySignalCard({
  signal,
  hero = false,
}: {
  signal: BackendEquitySignal;
  hero?: boolean;
}) {
  const [expanded, setExpanded] = useState(hero);

  const pdm  = signal.primary_driver_market;
  const si   = signal.signal_integrity;
  const isMixed = si?.has_polarity_conflict || si?.has_mixed_semantics;

  const score = confidenceScore(signal);
  const confLabel = confidenceLabel(score, signal.confidence);
  const confColor = confidenceColor(score, signal.confidence);

  // Direction: if mixed, override display
  const baseDir = directionFromSummary(signal.summary_direction);
  const dir: "bullish" | "bearish" | "neutral" = isMixed ? "neutral" : baseDir;
  const dc = dirColors(dir);

  // Explicit odds text from primary driver market
  const oddsLine = (() => {
    if (!pdm) return null;
    const outcome   = pdm.outcome_label ?? "YES";
    const direction = (pdm.direction ?? "moving").toLowerCase();
    const d24 = fmtPP(pdm.delta_24h_pp);
    const d7  = fmtPP(pdm.delta_7d_pp);
    return `${outcome} odds ${direction}: 24h ${d24}, 7d ${d7}`;
  })();

  // Sector box opacity — tone down when mixed
  const sectorOpacity = isMixed ? "opacity-40" : "";

  // Has expanded content
  const hasExpanded = !!(signal.why_it_matters || (signal.driver_markets?.length ?? 0) > 0 || (signal.supporting_markets?.length ?? 0) > 0);

  return (
    <div
      className={`rounded-xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200
        hover:border-white/[0.12] hover:bg-white/[0.03] p-5
        ${hero ? "col-span-full border-blue-500/20 bg-gradient-to-br from-blue-500/[0.04] to-transparent" : ""}
      `}
    >
      {/* ── Mixed / polarity warning ── */}
      {isMixed && (
        <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-amber-500/[0.07] border border-amber-500/20">
          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="text-[9px] font-bold text-amber-300">Mixed drivers — not one clean sector signal</span>
          {si?.warning && (
            <span className="text-[9px] text-amber-300/60 ml-1">· {si.warning}</span>
          )}
        </div>
      )}

      {/* ── Header row: driver question + mapping label ── */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {/* Direction badge */}
          <div className="flex items-center gap-1.5 mb-1.5">
            {dirIcon(dir, "w-3 h-3")}
            <span className={`text-[8px] font-bold uppercase tracking-widest ${dc.text}`}>
              {isMixed ? "Mixed" : dir}
            </span>
          </div>

          {/* Primary driver question (driver-first) */}
          {pdm ? (
            <>
              <p className="text-[8px] font-semibold uppercase tracking-widest text-white/25 mb-0.5">Driver</p>
              <h3 className={`font-semibold text-white/90 leading-snug mb-1 ${hero ? "text-sm" : "text-[12px]"}`}>
                {pdm.question ?? pdm.title ?? "Driver unavailable — backend attribution missing"}
              </h3>
              {/* Category label below */}
              <p className="text-[10px] text-white/40">{signal.title}</p>
            </>
          ) : (
            <>
              <p className="text-[8px] font-semibold uppercase tracking-widest text-amber-400/60 mb-0.5">
                Driver unavailable — backend attribution missing
              </p>
              <h3 className={`font-semibold text-white/90 leading-snug ${hero ? "text-base" : "text-sm"}`}>
                {signal.title}
              </h3>
            </>
          )}
        </div>

        {/* Mapping / data agreement label */}
        {confLabel && (
          <div
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-help"
            title={signal.confidence_explanation ?? "This measures prediction-market/sector mapping agreement, not guaranteed trade outcome."}
          >
            <span className="text-[9px] text-white/30">Mapping:</span>
            <span className={`text-[11px] font-bold ${confColor}`}>{confLabel}</span>
          </div>
        )}
      </div>

      {/* ── Odds line — explicit outcome text ── */}
      {(oddsLine ?? signal.odds_move_summary) && (
        <div className="flex items-center gap-1.5 mb-2 text-[10px]">
          <BarChart3 className="w-3 h-3 text-blue-400/60 flex-shrink-0" />
          <span className="text-blue-300/80 font-medium">
            {oddsLine ?? signal.odds_move_summary}
          </span>
        </div>
      )}

      {/* ── Equity read + event type pills ── */}
      {pdm && (pdm.equity_regime_read || pdm.semantic_event_type || pdm.event_type) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {pdm.equity_regime_read && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/[0.08] border border-blue-500/20 text-[9px] text-blue-300/80 font-medium">
              <Globe2 className="w-2.5 h-2.5" />
              {pdm.equity_regime_read}
            </span>
          )}
          {(pdm.semantic_event_type ?? pdm.event_type) && (
            <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] text-white/40">
              {pdm.semantic_event_type ?? pdm.event_type}
            </span>
          )}
          {pdm.polarity === "inverted" && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 cursor-help"
              title="YES rising means the opposite of the broad category framing."
            >
              Inverted
            </span>
          )}
          {si?.has_mixed_semantics && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-400 cursor-help"
              title="This cluster contains markets pointing to different equity regimes."
            >
              Mixed semantics
            </span>
          )}
        </div>
      )}

      {/* ── Fallback odds when no primary_driver_market ── */}
      {!pdm && !oddsLine && signal.odds_move_summary && (
        <div className="flex items-center gap-1.5 mb-3 text-[10px] px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05]">
          <CircleDot className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
          <span className="text-white/30 italic text-[9px]">Market-level attribution unavailable — odds move may be aggregated.</span>
        </div>
      )}

      {/* ── Summary ── */}
      {signal.summary && (
        <p className="text-[11px] text-white/55 leading-relaxed mb-3">{signal.summary}</p>
      )}

      {/* ── Sector implications (toned down when mixed) ── */}
      {((signal.bullish_sectors?.length ?? 0) > 0 || (signal.bearish_sectors?.length ?? 0) > 0) && (
        <div className={`grid grid-cols-2 gap-2 mb-3 ${sectorOpacity}`}>
          {(signal.bullish_sectors?.length ?? 0) > 0 && (
            <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 p-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/60 mb-1.5">↑ Bullish Sectors</p>
              {signal.bullish_sectors!.map(s => (
                <p key={s} className="text-[10px] text-emerald-300/80 font-medium">{s}</p>
              ))}
            </div>
          )}
          {(signal.bearish_sectors?.length ?? 0) > 0 && (
            <div className="rounded-lg bg-red-500/[0.06] border border-red-500/15 p-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-red-400/60 mb-1.5">↓ Bearish Sectors</p>
              {signal.bearish_sectors!.map(s => (
                <p key={s} className="text-[10px] text-red-300/80 font-medium">{s}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Stock tickers (toned down when mixed) ── */}
      {((signal.bullish_stocks?.length ?? 0) > 0 || (signal.bearish_stocks?.length ?? 0) > 0) && (
        <div className={`flex items-start gap-3 mb-3 ${sectorOpacity}`}>
          {(signal.bullish_stocks?.length ?? 0) > 0 && (
            <div className="flex-1">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-emerald-400/50 mb-1">Bullish</p>
              <div className="flex flex-wrap gap-1">
                {signal.bullish_stocks!.map(t => (
                  <span key={t} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>
                ))}
              </div>
            </div>
          )}
          {(signal.bearish_stocks?.length ?? 0) > 0 && (
            <div className="flex-1">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-red-400/50 mb-1">Bearish</p>
              <div className="flex flex-wrap gap-1">
                {signal.bearish_stocks!.map(t => (
                  <span key={t} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Regime impact ── */}
      {signal.regime_impact && (
        <div className="mb-3 flex items-start gap-1.5 text-[10px] px-2 py-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
          <Globe2 className="w-3 h-3 text-white/25 mt-0.5 flex-shrink-0" />
          <span className="text-white/40 leading-snug">{signal.regime_impact}</span>
        </div>
      )}

      {/* ── Expandable: why it matters + driver markets table ── */}
      {hasExpanded && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors mt-1"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expanded ? "Less detail" : "Supporting markets"}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2">
              {signal.why_it_matters && (
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-white/25 mb-1">Why it matters</p>
                  <p className="text-[10px] text-white/45 leading-relaxed">{signal.why_it_matters}</p>
                </div>
              )}

              {/* Driver markets table (preferred over old supporting_markets list) */}
              {(signal.driver_markets?.length ?? 0) > 0 ? (
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-white/25 mb-1.5">Driver markets</p>
                  <DriverMarketsTable markets={signal.driver_markets!} />
                </div>
              ) : (signal.supporting_markets?.length ?? 0) > 0 ? (
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-white/25 mb-1.5">Supporting markets</p>
                  <div className="space-y-1">
                    {signal.supporting_markets!.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <CircleDot className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
                        <span className="text-white/40 truncate flex-1">{m.question ?? ""}</span>
                        {m.yes_pct != null && (
                          <span className="text-white/40 font-mono flex-shrink-0">{m.yes_pct}%</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
});

function TopEquitySignals({ signals, loading }: { signals: BackendEquitySignal[]; loading: boolean }) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<Zap className="w-4 h-4" />}
        title="Top Equity Signals"
        subtitle="What Polymarket repricing implies for stocks right now"
      />
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Skel className="h-48 rounded-xl col-span-full md:col-span-2 lg:col-span-3" />
          <Skel className="h-36 rounded-xl" />
          <Skel className="h-36 rounded-xl" />
        </div>
      ) : signals.length === 0 ? (
        <EmptyState text="No equity signals available yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {signals.map((s, i) => (
            <EquitySignalCard key={s.theme_id ?? i} signal={s} hero={i === 0} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Regime Scoreboard ────────────────────────────────────────────────────────

function RegimeBar({ score, dir }: { score?: number; dir: "bullish" | "bearish" | "neutral" }) {
  const pct = Math.min(100, Math.max(0, score ?? 50));
  const color = dir === "bullish" ? "bg-emerald-400" : dir === "bearish" ? "bg-red-400" : "bg-blue-400";
  return (
    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function RegimeRowCard({ row }: { row: RegimeRow }) {
  const dir = directionFromRegime(row.direction, row.label);
  const dc = dirColors(dir);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-b-0">
      <div className="w-40 flex-shrink-0">
        <p className="text-[10px] font-semibold text-white/70">{row.displayName}</p>
        {row.label && (
          <p className={`text-[9px] font-medium mt-0.5 ${dc.text}`}>{row.label.replace(/_/g, " ")}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-1">
        <RegimeBar score={row.score} dir={dir} />
        {row.score != null && (
          <span className="text-[9px] text-white/30 tabular-nums w-8 text-right flex-shrink-0">{Math.round(row.score)}</span>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 w-28 justify-end">
        {dirIcon(dir, "w-3 h-3")}
        <span className={`text-[9px] font-semibold ${dc.text}`}>{row.direction ?? "—"}</span>
        {row.confidenceStr && (
          <span className={`text-[8px] font-bold ${confidenceColor(undefined, row.confidenceStr)}`}>
            {confidenceLabel(undefined, row.confidenceStr)}
          </span>
        )}
      </div>
    </div>
  );
}

function RegimeScoreboard({ rows, loading }: { rows: RegimeRow[]; loading: boolean }) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<Globe2 className="w-4 h-4" />}
        title="Regime Scoreboard"
        subtitle="Macro environment implied by prediction market positioning"
      />
      {loading ? (
        <div className="space-y-2">
          {[...Array(7)].map((_, i) => <Skel key={i} className="h-9 w-full rounded" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text="Regime indicators not yet available." />
      ) : (
        <div>{rows.map(r => <RegimeRowCard key={r.key} row={r} />)}</div>
      )}
    </GlassCard>
  );
}

// ─── Sector Rotation Signals ──────────────────────────────────────────────────

const TYPE_CONFIG = {
  positive: { label: "Positive",        text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  negative: { label: "Negative",        text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20"     },
  emerging: { label: "Emerging Leader", text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
  fading:   { label: "Fading",          text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
} as const;

function SectorCard({ signal }: { signal: SectorSignal }) {
  const cfg = TYPE_CONFIG[signal.type];
  return (
    <div className={`rounded-xl p-4 border ${cfg.border} ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[8px] font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
        {signal.mentions != null && (
          <span className="text-[8px] text-white/25">{signal.mentions} mentions</span>
        )}
      </div>
      <p className="text-sm font-bold text-white/90 mb-3">{signal.sector}</p>
      {(signal.stocks?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1">
          {signal.stocks!.map(t => (
            <span key={t} className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border ${cfg.border} ${cfg.text} bg-black/20`}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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
          {[...Array(4)].map((_, i) => <Skel key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : sectors.length === 0 ? (
        <EmptyState text="Sector signals not yet available." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sectors.map((s, i) => <SectorCard key={s.sector + s.type + i} signal={s} />)}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Stock Watchlists ─────────────────────────────────────────────────────────

function WatchlistRow({ entry }: { entry: WatchlistEntry }) {
  const isBull = entry.direction === "bullish";
  const isBear = entry.direction === "bearish";
  return (
    <div className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-b-0">
      <div className="pt-0.5 flex-shrink-0">
        {isBull ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : isBear ? <ArrowDownRight className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5 text-amber-400" />}
      </div>
      <div className="w-14 flex-shrink-0">
        <span className={`text-[11px] font-bold font-mono ${isBull ? "text-emerald-400" : isBear ? "text-red-400" : "text-amber-400"}`}>
          {entry.ticker}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        {entry.note && (
          <p className="text-[10px] text-white/35 leading-snug">{entry.note}</p>
        )}
        {(entry.sectors?.length ?? 0) > 0 && (
          <p className="text-[9px] text-white/25 leading-tight">{entry.sectors!.slice(0, 2).join(", ")}</p>
        )}
      </div>
    </div>
  );
}

function WatchlistCol({
  title,
  entries,
  textColor,
  icon,
}: {
  title: string;
  entries: WatchlistEntry[];
  textColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center justify-center w-6 h-6 rounded-md ${textColor} bg-white/[0.06]`}>{icon}</div>
        <h3 className="text-[11px] font-bold text-white/70 uppercase tracking-wider">{title}</h3>
        {entries.length > 0 && (
          <span className="ml-auto text-[9px] text-white/20 tabular-nums">{entries.length}</span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-[10px] text-white/20 py-2">No stocks in this list.</p>
      ) : (
        <div>{entries.map((e, i) => <WatchlistRow key={e.ticker + i} entry={e} />)}</div>
      )}
    </div>
  );
}

function StockWatchlistsSection({
  wl,
  loading,
}: {
  wl: { bullish: WatchlistEntry[]; bearish: WatchlistEntry[]; conditional: WatchlistEntry[] } | null;
  loading: boolean;
}) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<Building2 className="w-4 h-4" />}
        title="Stock Watchlists"
        subtitle="Tickers most exposed to prediction market themes, grouped by direction"
      />
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skel key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : !wl || (wl.bullish.length + wl.bearish.length + wl.conditional.length === 0) ? (
        <EmptyState text="Watchlist data not yet available." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <WatchlistCol title="Bullish" entries={wl.bullish} textColor="text-emerald-400" icon={<TrendingUp className="w-3.5 h-3.5" />} />
          <WatchlistCol title="Bearish" entries={wl.bearish} textColor="text-red-400" icon={<TrendingDown className="w-3.5 h-3.5" />} />
          <WatchlistCol title="Conditional" entries={wl.conditional} textColor="text-amber-400" icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        </div>
      )}
    </GlassCard>
  );
}

// ─── Theme Clusters ───────────────────────────────────────────────────────────

const ThemeCard = memo(function ThemeCard({ cluster }: { cluster: BackendThemeCluster }) {
  const [expanded, setExpanded] = useState(false);
  const dir = directionFromSummary(cluster.summary_direction);  // backend: summary_direction
  const dc = dirColors(dir);
  const hasContradiction = (cluster.contradiction_score ?? 0) > 0.3;

  return (
    <div className={`rounded-xl border ${dc.border} ${dc.bg} p-4`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {cluster.theme_emoji && <span className="text-sm">{cluster.theme_emoji}</span>}
          <h3 className="text-[11px] font-bold text-white/80">{cluster.theme_name}</h3>
        </div>
        {cluster.confidence_score != null && (
          <span className={`text-[9px] font-semibold flex-shrink-0 ${confidenceColor(cluster.confidence_score)}`}>
            {confidenceLabel(cluster.confidence_score)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1">
          {dirIcon(dir, "w-3 h-3")}
          <span className={`text-[9px] font-semibold uppercase tracking-wide ${dc.text}`}>{dir}</span>
        </div>
        {hasContradiction && (
          <span className="text-[8px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/15 px-1 py-0.5 rounded">
            ⚠ Mixed
          </span>
        )}
      </div>

      {cluster.description && (
        <p className="text-[10px] text-white/40 leading-relaxed mb-2 line-clamp-2">{cluster.description}</p>
      )}

      {(cluster.bullish_stocks?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {cluster.bullish_stocks!.slice(0, 4).map(t => (
            <span key={t} className="text-[8px] font-bold font-mono px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>
          ))}
        </div>
      )}

      {(cluster.supporting_markets?.length ?? 0) > 0 && (
        <>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {cluster.supporting_markets!.length} market{cluster.supporting_markets!.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {cluster.supporting_markets!.slice(0, 4).map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <CircleDot className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
                  <span className="text-white/35 truncate flex-1">{m.question ?? ""}</span>
                  {m.yes_pct != null && <span className="text-white/30 font-mono flex-shrink-0">{m.yes_pct}%</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
});

function ThemeClusters({ clusters, loading }: { clusters: BackendThemeCluster[]; loading: boolean }) {
  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<BarChart3 className="w-4 h-4" />}
        title="Theme Clusters"
        subtitle="Underlying Polymarket themes with equity interpretation"
      />
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skel key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : clusters.length === 0 ? (
        <EmptyState text="Theme cluster data not yet available." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clusters.map((c, i) => <ThemeCard key={c.theme_id ?? c.theme_name + i} cluster={c} />)}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchOverview(): Promise<BackendOverview> {
  // Primary: /overview (the only working comprehensive endpoint)
  const r = await fetch("/api/predict/investor/overview");
  if (!r.ok) throw new Error(`/investor/overview returned ${r.status}`);
  const json: BackendOverview = await r.json();

  // Validate we got real data (not just an empty shell)
  const hasData = (json.top_equity_signals?.length ?? 0) > 0
    || json.regime_scoreboard != null
    || json.theme_clusters != null;
  if (!hasData) throw new Error("Overview returned empty payload");

  return json;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProphetikInvestorTab() {
  const [overview, setOverview]     = useState<BackendOverview | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOverview();
      setOverview(data);
    } catch (e: any) {
      console.error("[Investor] fetch error:", e?.message);
      setError(e?.message ?? "Failed to load investor data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 5 * 60_000);
    return () => clearInterval(iv);
  }, [loadData]);

  // ── Normalise all sections from the overview payload ──
  const signals  = overview?.top_equity_signals ?? [];
  const regime   = transformRegime(overview?.regime_scoreboard);
  const sectors  = transformSectors(overview?.sector_rotation);
  const watchlists = overview?.watchlists
    ? transformWatchlists(overview.watchlists)
    : null;
  const themes   = overview?.theme_clusters ?? [];

  const isLoading = loading && !overview;
  const noData    = !loading && !overview && !!error;

  return (
    <div className="pb-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] text-white/30">
          Prediction markets translated into equity signals, regime reads, and stock watchlists.
        </p>
        <div className="flex items-center gap-2">
          {overview?.generated_at && (
            <span className="text-[9px] text-white/20">
              Updated {new Date(overview.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {overview?.equity_relevant_market_count != null && (
            <span className="text-[9px] text-white/20">
              {overview.equity_relevant_market_count}/{overview.total_market_count} markets equity-relevant
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

      {/* Error / unavailable state */}
      {noData && (
        <GlassCard className="p-8 mb-5 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-white/20" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/40 mb-1">Investor data unavailable</p>
              <p className="text-[11px] text-white/20 max-w-xs mx-auto leading-relaxed">
                {error ?? "Backend investor endpoints are not yet responding."}
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

      {/* Content — all sections render independently */}
      {!noData && (
        <>
          <TopEquitySignals     signals={signals}     loading={isLoading} />
          <RegimeScoreboard     rows={regime}         loading={isLoading} />
          <SectorRotationSignals sectors={sectors}    loading={isLoading} />
          <StockWatchlistsSection wl={watchlists}     loading={isLoading} />
          <ThemeClusters        clusters={themes}     loading={isLoading} />
        </>
      )}
    </div>
  );
}
