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
  Activity,
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
  current_probability?: number;
  current_probability_pct?: number;
  current_odds_label?: string | number;
  yes_pct?: number;
  probability?: number;
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
  user_warning?: string;
}

interface BackendEquitySignal {
  theme_id?: string;
  title: string;
  summary?: string;
  why_it_matters?: string;
  supporting_markets?: BackendSupportingMarket[];
  market_count?: number;
  odds_move_summary?: string;
  summary_direction?: string;
  bullish_sectors?: string[];
  bearish_sectors?: string[];
  bullish_stocks?: string[];
  bearish_stocks?: string[];
  asset_baskets?: string[];
  regime_impact?: string;
  confidence?: string;
  confidence_score?: number;
  narrative?: string;
  watchlist_priority?: string;
  primary_driver_market?: BackendDriverMarket;
  driver_markets?: BackendDriverMarket[];
  confidence_explanation?: string;
  signal_integrity?: BackendSignalIntegrity;
  signal_quality_label?: string;
  signal_quality_explanation?: string;
  display_impact_mode?: string;
  headline_bullish_sectors?: string[];
  headline_bearish_sectors?: string[];
  headline_bullish_tickers?: string[];
  headline_bearish_tickers?: string[];
  headline_impact_note?: string;
}

interface BackendRegimeValue {
  label?: string;
  score?: number;
  direction?: string;
  confidence?: string;
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
  theme_name: string;
  theme_emoji?: string;
  description?: string;
  supporting_markets?: BackendSupportingMarket[];
  market_count?: number;
  weighted_odds_shift_24h?: number;
  weighted_odds_shift_7d?: number;
  weighted_volume?: number;
  confidence_score?: number;
  consistency_score?: number;
  contradiction_score?: number;
  freshness_score?: number;
  regime_signal_strength?: number;
  summary_direction?: string;
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
  top_equity_signals?: BackendEquitySignal[];
  sector_rotation?: BackendSectorRotation;
  watchlists?: BackendWatchlists;
  regime_scoreboard?: Record<string, BackendRegimeValue>;
  theme_clusters?: BackendThemeCluster[];
}

// ─── Intelligence endpoint types ──────────────────────────────────────────────

interface IntelTickerImpacts {
  bullish_watchlist?: string[];
  bearish_watchlist?: string[];
  conditional_watchlist?: string[];
  bullish_fallback?: string[];
  bearish_fallback?: string[];
}

interface IntelDriverMarket {
  question?: string;
  yes_pct?: number;
  delta_24h_pp?: number;
  delta_7d_pp?: number;
  volume_24h?: number;
}

interface IntelThemeImpact {
  sector?: string;
  theme?: string;
  direction?: string;
  confidence?: string;
  rationale?: string;
}

interface IntelEquitySignal {
  event_family_key?: string;
  title: string;
  primary_category?: string;
  yes_probability?: number;     // 0-1 scale
  delta_24h_pp?: number;
  delta_7d_pp?: number;
  direction?: string;           // "rising" | "falling"
  signal_quality?: string;      // "low" | "moderate" | "high"
  why_it_matters?: string;
  driver_markets?: IntelDriverMarket[];
  theme_impacts?: IntelThemeImpact[];
  ticker_impacts?: IntelTickerImpacts;
  conflicts?: string[];
  market_count?: number;
}

interface TrackedOddsItem {
  family_key?: string;
  label?: string;
  category?: string;
  market_question?: string;
  yes_probability?: number;     // 0-1 scale, null if no live market
  delta_24h_pp?: number;
  delta_7d_pp?: number;
  volume_24h?: number;
  dashboard_priority?: number;
  candidate_count?: number;
  driver_markets?: unknown[];
}

interface BackendIntelligence {
  updated_at?: string;
  equity_signals?: IntelEquitySignal[];
  tracked_odds?: TrackedOddsItem[];
  cache_age_seconds?: number;
}

// ─── View-model types ─────────────────────────────────────────────────────────

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

// ─── API helpers ──────────────────────────────────────────────────────────────

const AGENT_API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";

async function fetchOverview(): Promise<BackendOverview | null> {
  const res = await fetch("/api/predict/investor/overview", {
    headers: { "X-API-Key": AGENT_API_KEY },
  });
  if (!res.ok) throw new Error(`Overview ${res.status}`);
  return res.json();
}

async function fetchIntelligence(): Promise<BackendIntelligence | null> {
  try {
    const res = await fetch("/api/predict/investor/intelligence", {
      headers: { "X-API-Key": AGENT_API_KEY },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Transform helpers ────────────────────────────────────────────────────────

const REGIME_DISPLAY_NAMES: Record<string, string> = {
  risk_on_vs_risk_off:                "Risk On / Risk Off",
  inflationary_vs_disinflationary:    "Inflation / Disinflation",
  growth_vs_slowdown:                 "Growth / Slowdown",
  geopolitical_stress_vs_easing:      "Geopolitical Stress",
  higher_for_longer_vs_easing:        "Higher-for-Longer",
  commodity_pressure_vs_relief:       "Commodity Pressure",
  ai_capex_supportive_vs_restrictive: "AI Capex / Restrictive",
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

// ─── Utility helpers ──────────────────────────────────────────────────────────

function fmtPP(v?: number | null): string {
  if (v == null) return "—";
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}pp`;
}

function fmtPPColor(v?: number | null): string {
  if (v == null) return "text-white/30";
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}

function resolveOdds(m: BackendDriverMarket): string {
  const raw = m.current_odds_label ?? m.current_probability_pct ?? m.current_odds
    ?? m.current_probability ?? m.yes_pct ?? m.probability;
  if (raw == null) return "—";
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (isNaN(n)) return String(raw);
  const pct = n >= 0 && n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function resolveOddsNum(m: BackendDriverMarket): number | null {
  const raw = m.current_probability_pct ?? m.current_odds ?? m.current_probability
    ?? m.yes_pct ?? m.probability;
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw as string);
  if (isNaN(n)) return null;
  return n >= 0 && n <= 1 ? n * 100 : n;
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
  if (d.includes("risk_on") || d.includes("bullish") || d.includes("positive") || d.includes("growth") || d.includes("easing") || d.includes("disinflation") || d.includes("relief") || d.includes("support") || d === "rising") return "bullish";
  if (d.includes("risk_off") || d.includes("bearish") || d.includes("negative") || d.includes("slowdown") || d.includes("stress") || d.includes("pressure") || d.includes("restrict") || d.includes("inflation") || d.includes("longer") || d === "falling") return "bearish";
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

// ─── Skeleton / shared UI ─────────────────────────────────────────────────────

function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.05] ${className}`} />;
}

function SectionHeader({ icon, title, subtitle, right }: { icon: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {subtitle && <p className="text-[10px] text-white/30">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="text-[11px] text-white/20 italic">{text}</p>
    </div>
  );
}

// ─── Driver Markets Table ─────────────────────────────────────────────────────

function DriverMarketsTable({ markets }: { markets: BackendDriverMarket[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-white/[0.06]">
            <th className="text-left text-white/25 font-semibold pb-1.5 pr-3">Market question</th>
            <th className="text-right text-white/25 font-semibold pb-1.5 px-2 w-16">Odds</th>
            <th className="text-right text-white/25 font-semibold pb-1.5 px-2 w-14">24h Δ</th>
            <th className="text-right text-white/25 font-semibold pb-1.5 pl-2 w-14">7d Δ</th>
          </tr>
        </thead>
        <tbody>
          {markets.slice(0, 5).map((m, i) => {
            const oddsNum = resolveOddsNum(m);
            return (
              <tr key={i} className="border-b border-white/[0.03] last:border-0">
                <td className="py-1.5 pr-3 text-white/50 leading-snug">{m.question ?? m.title ?? "—"}</td>
                <td className="py-1.5 px-2 text-right font-mono text-white/70 font-semibold">
                  {oddsNum != null ? `${oddsNum.toFixed(1)}%` : resolveOdds(m)}
                </td>
                <td className={`py-1.5 px-2 text-right font-mono ${fmtPPColor(m.delta_24h_pp)}`}>
                  {fmtPP(m.delta_24h_pp)}
                </td>
                <td className={`py-1.5 pl-2 text-right font-mono ${fmtPPColor(m.delta_7d_pp)}`}>
                  {fmtPP(m.delta_7d_pp)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Equity Signal Card ───────────────────────────────────────────────────────

const EquitySignalCard = memo(function EquitySignalCard({
  signal,
  hero = false,
}: {
  signal: BackendEquitySignal;
  hero?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const pdm = signal.primary_driver_market;
  const si = signal.signal_integrity;
  const dir = directionFromSummary(signal.summary_direction);
  const dc = dirColors(dir);
  const isMixed = si?.has_polarity_conflict || si?.has_mixed_semantics || signal.display_impact_mode === "mixed";
  const isMixedMode = isMixed && !signal.headline_bullish_sectors?.length && !signal.headline_bearish_sectors?.length;

  const sqLabel = signal.signal_quality_label ?? confidenceLabel(signal.confidence_score, signal.confidence);
  const sqTooltip = signal.signal_quality_explanation ?? signal.confidence_explanation ?? "";

  let oddsLine: string | undefined;
  if (pdm) {
    const pct = resolveOddsNum(pdm);
    if (pct != null) {
      const dir24 = (pdm.delta_24h_pp ?? 0) >= 0 ? "▲" : "▼";
      oddsLine = `${pct.toFixed(1)}% ${pdm.outcome_label ?? ""} — ${dir24} ${fmtPP(pdm.delta_24h_pp)} today`;
    }
  }

  const bullSectors = signal.headline_bullish_sectors?.length
    ? signal.headline_bullish_sectors
    : (isMixedMode ? [] : (signal.bullish_sectors ?? []));
  const bearSectors = signal.headline_bearish_sectors?.length
    ? signal.headline_bearish_sectors
    : (isMixedMode ? [] : (signal.bearish_sectors ?? []));
  const bullTickers = signal.headline_bullish_tickers?.length
    ? signal.headline_bullish_tickers
    : (isMixedMode ? [] : (signal.bullish_stocks ?? []));
  const bearTickers = signal.headline_bearish_tickers?.length
    ? signal.headline_bearish_tickers
    : (isMixedMode ? [] : (signal.bearish_stocks ?? []));

  const bullSectorLabel = isMixedMode ? "↑ Primary driver bullish" : "↑ Bullish Sectors";
  const bearSectorLabel = isMixedMode ? "↓ Primary driver bearish" : "↓ Bearish Sectors";
  const sectorOpacity = (isMixed && !signal.headline_bullish_sectors?.length && !signal.headline_bearish_sectors?.length) ? "opacity-40" : "";
  const hasExpanded = !!(signal.why_it_matters || (signal.driver_markets?.length ?? 0) > 0 || (signal.supporting_markets?.length ?? 0) > 0);

  return (
    <div
      className={`rounded-xl border border-white/[0.07] bg-white/[0.02] transition-all duration-200
        hover:border-white/[0.12] hover:bg-white/[0.03] p-5
        ${hero ? "col-span-full border-blue-500/20 bg-gradient-to-br from-blue-500/[0.04] to-transparent" : ""}
      `}
    >
      {isMixed && (
        <div className="flex flex-col gap-0.5 mb-3 px-2 py-1.5 rounded-lg bg-amber-500/[0.07] border border-amber-500/20">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="text-[9px] font-bold text-amber-300">Mixed drivers — not one clean sector signal</span>
          </div>
          {si?.user_warning && (
            <p className="text-[9px] text-amber-300/60 pl-4.5 leading-snug">{si.user_warning}</p>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            {dirIcon(dir, "w-3 h-3")}
            <span className={`text-[8px] font-bold uppercase tracking-widest ${dc.text}`}>
              {isMixed ? "Mixed" : dir}
            </span>
          </div>
          {pdm ? (
            <>
              <p className="text-[8px] font-semibold uppercase tracking-widest text-white/25 mb-0.5">Driver</p>
              <h3 className={`font-semibold text-white/90 leading-snug mb-1 ${hero ? "text-sm" : "text-[12px]"}`}>
                {pdm.question ?? pdm.title ?? "Driver unavailable — backend attribution missing"}
              </h3>
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
        {sqLabel && (
          <div
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] cursor-help"
            title={sqTooltip}
          >
            <span className="text-[9px] text-white/30">Signal Quality:</span>
            <span className="text-[11px] font-bold text-white/70">{sqLabel}</span>
          </div>
        )}
      </div>

      {(oddsLine ?? signal.odds_move_summary) && (
        <div className="flex items-center gap-1.5 mb-2 text-[10px]">
          <BarChart3 className="w-3 h-3 text-blue-400/60 flex-shrink-0" />
          <span className="text-blue-300/80 font-medium">
            {oddsLine ?? signal.odds_move_summary}
          </span>
        </div>
      )}

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
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 cursor-help"
              title="YES rising means the opposite of the broad category framing.">
              Inverted
            </span>
          )}
          {si?.has_mixed_semantics && (
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-400 cursor-help"
              title="This cluster contains markets pointing to different equity regimes.">
              Mixed semantics
            </span>
          )}
        </div>
      )}

      {!pdm && !oddsLine && signal.odds_move_summary && (
        <div className="flex items-center gap-1.5 mb-3 text-[10px] px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05]">
          <CircleDot className="w-2.5 h-2.5 text-white/20 flex-shrink-0" />
          <span className="text-white/30 italic text-[9px]">Market-level attribution unavailable — odds move may be aggregated.</span>
        </div>
      )}

      {signal.summary && (
        <p className="text-[11px] text-white/55 leading-relaxed mb-3">{signal.summary}</p>
      )}

      {(bullSectors.length > 0 || bearSectors.length > 0) && (
        <div className={`grid grid-cols-2 gap-2 mb-3 ${sectorOpacity}`}>
          {bullSectors.length > 0 && (
            <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 p-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/60 mb-1.5">{bullSectorLabel}</p>
              {bullSectors.map(s => <p key={s} className="text-[10px] text-emerald-300/80 font-medium">{s}</p>)}
            </div>
          )}
          {bearSectors.length > 0 && (
            <div className="rounded-lg bg-red-500/[0.06] border border-red-500/15 p-2">
              <p className="text-[8px] font-bold uppercase tracking-widest text-red-400/60 mb-1.5">{bearSectorLabel}</p>
              {bearSectors.map(s => <p key={s} className="text-[10px] text-red-300/80 font-medium">{s}</p>)}
            </div>
          )}
        </div>
      )}

      {(bullTickers.length > 0 || bearTickers.length > 0) && (
        <div className={`flex items-start gap-3 mb-3 ${sectorOpacity}`}>
          {bullTickers.length > 0 && (
            <div className="flex-1">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-emerald-400/50 mb-1">Bullish</p>
              <div className="flex flex-wrap gap-1">
                {bullTickers.map(t => (
                  <span key={t} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>
                ))}
              </div>
            </div>
          )}
          {bearTickers.length > 0 && (
            <div className="flex-1">
              <p className="text-[8px] font-semibold uppercase tracking-wider text-red-400/50 mb-1">Bearish</p>
              <div className="flex flex-wrap gap-1">
                {bearTickers.map(t => (
                  <span key={t} className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {signal.headline_impact_note && (
        <p className="text-[9px] text-white/35 italic mb-3 leading-snug">{signal.headline_impact_note}</p>
      )}

      {signal.regime_impact && (
        <div className="mb-3 flex items-start gap-1.5 text-[10px] px-2 py-1.5 rounded bg-white/[0.03] border border-white/[0.05]">
          <Globe2 className="w-3 h-3 text-white/25 mt-0.5 flex-shrink-0" />
          <span className="text-white/40 leading-snug">{signal.regime_impact}</span>
        </div>
      )}

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
                        {m.yes_pct != null && <span className="text-white/40 font-mono flex-shrink-0">{m.yes_pct}%</span>}
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
          {signals.slice(0, 7).map((s, i) => (
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
        {row.label && <p className={`text-[9px] font-medium mt-0.5 ${dc.text}`}>{row.label.replace(/_/g, " ")}</p>}
      </div>
      <div className="flex items-center gap-2 flex-1">
        <RegimeBar score={row.score} dir={dir} />
        {row.score != null && <span className="text-[9px] text-white/30 tabular-nums w-8 text-right flex-shrink-0">{Math.round(row.score)}</span>}
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
        {signal.mentions != null && <span className="text-[8px] text-white/25">{signal.mentions} mentions</span>}
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
        {entry.note && <p className="text-[10px] text-white/35 leading-snug">{entry.note}</p>}
        {(entry.sectors?.length ?? 0) > 0 && (
          <p className="text-[9px] text-white/25 leading-tight">{entry.sectors!.slice(0, 2).join(", ")}</p>
        )}
      </div>
    </div>
  );
}

function WatchlistCol({ title, entries, textColor, icon }: { title: string; entries: WatchlistEntry[]; textColor: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex items-center justify-center w-6 h-6 rounded-md ${textColor} bg-white/[0.06]`}>{icon}</div>
        <h3 className="text-[11px] font-bold text-white/70 uppercase tracking-wider">{title}</h3>
        {entries.length > 0 && <span className="ml-auto text-[9px] text-white/20 tabular-nums">{entries.length}</span>}
      </div>
      {entries.length === 0 ? (
        <p className="text-[10px] text-white/20 py-2">No stocks in this list.</p>
      ) : (
        <div>{entries.map((e, i) => <WatchlistRow key={e.ticker + i} entry={e} />)}</div>
      )}
    </div>
  );
}

function StockWatchlistsSection({ wl, loading }: { wl: { bullish: WatchlistEntry[]; bearish: WatchlistEntry[]; conditional: WatchlistEntry[] } | null; loading: boolean }) {
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
  const dir = directionFromSummary(cluster.summary_direction);
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
          <span className="text-[8px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/15 px-1 py-0.5 rounded">⚠ Mixed</span>
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
        subtitle="Grouped prediction market themes with equity implications"
      />
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => <Skel key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : clusters.length === 0 ? (
        <EmptyState text="No theme clusters available yet." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clusters.map((c, i) => <ThemeCard key={c.theme_id ?? c.theme_name ?? i} cluster={c} />)}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Intelligence: Market-Moving Event Tape ───────────────────────────────────

const DIRECTION_MAP: Record<string, string> = {
  rising: "bullish", falling: "bearish", bullish: "bullish", bearish: "bearish",
};

function qualityBadge(quality?: string) {
  if (!quality) return null;
  const q = quality.toLowerCase();
  const cls = q === "high" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
    : q === "moderate" ? "text-blue-400 bg-blue-500/10 border-blue-500/25"
    : "text-amber-400 bg-amber-500/10 border-amber-500/25";
  return (
    <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${cls}`}>
      {quality.charAt(0).toUpperCase() + quality.slice(1)}
    </span>
  );
}

function EventTapeRow({ sig }: { sig: IntelEquitySignal }) {
  const [open, setOpen] = useState(false);
  const yesPct = sig.yes_probability != null ? sig.yes_probability * 100 : null;
  const dir = DIRECTION_MAP[(sig.direction ?? "").toLowerCase()] as "bullish" | "bearish" | undefined;
  const dc = dir ? dirColors(dir) : dirColors("neutral");
  const ti = sig.ticker_impacts;
  const bullTickers = [...(ti?.bullish_watchlist ?? []), ...(ti?.bullish_fallback ?? [])].slice(0, 4);
  const bearTickers = [...(ti?.bearish_watchlist ?? []), ...(ti?.bearish_fallback ?? [])].slice(0, 4);

  return (
    <>
      <tr
        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <td className="py-2.5 pr-3">
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="w-3 h-3 text-white/30 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />}
            <span className="text-[11px] font-semibold text-white/80">{sig.title}</span>
          </div>
        </td>
        <td className="py-2.5 px-3 text-right">
          {yesPct != null
            ? <span className="text-[13px] font-bold tabular-nums text-white/90">{yesPct.toFixed(1)}%</span>
            : <span className="text-[11px] text-white/20">—</span>
          }
        </td>
        <td className={`py-2.5 px-3 text-right font-mono text-[10px] tabular-nums ${fmtPPColor(sig.delta_24h_pp)}`}>
          {fmtPP(sig.delta_24h_pp)}
        </td>
        <td className={`py-2.5 px-3 text-right font-mono text-[10px] tabular-nums ${fmtPPColor(sig.delta_7d_pp)}`}>
          {fmtPP(sig.delta_7d_pp)}
        </td>
        <td className="py-2.5 px-3 text-center">
          {dir && (
            <span className={`text-[9px] font-bold uppercase ${dc.text}`}>
              {dir}
            </span>
          )}
        </td>
        <td className="py-2.5 px-3">
          <span className="text-[9px] text-white/40">{sig.primary_category ?? "—"}</span>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex flex-wrap gap-0.5">
            {bullTickers.map(t => (
              <span key={t} className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>
            ))}
            {bearTickers.map(t => (
              <span key={t} className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{t}</span>
            ))}
            {bullTickers.length === 0 && bearTickers.length === 0 && (
              <span className="text-[9px] text-white/20">—</span>
            )}
          </div>
        </td>
        <td className="py-2.5 pl-3">
          {qualityBadge(sig.signal_quality)}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-white/[0.04]">
          <td colSpan={8} className="py-3 px-4">
            <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3 space-y-2">
              {sig.why_it_matters && (
                <p className="text-[10px] text-white/50 leading-relaxed">{sig.why_it_matters}</p>
              )}
              {(sig.driver_markets?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-wider text-white/25 mb-1.5">Driver markets</p>
                  <div className="space-y-1">
                    {sig.driver_markets!.slice(0, 3).map((dm, i) => {
                      const pct = dm.yes_pct;
                      return (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <CircleDot className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
                          <span className="text-white/40 truncate flex-1">{dm.question ?? "—"}</span>
                          {pct != null && <span className="text-white/50 font-mono flex-shrink-0">{pct.toFixed(1)}%</span>}
                          {dm.delta_24h_pp != null && (
                            <span className={`font-mono flex-shrink-0 ${fmtPPColor(dm.delta_24h_pp)}`}>{fmtPP(dm.delta_24h_pp)}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {(sig.theme_impacts?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sig.theme_impacts!.map((t, i) => {
                    const tdc = dirColors(directionFromSummary(t.direction));
                    return (
                      <span key={i} className={`text-[8px] px-1.5 py-0.5 rounded border ${tdc.border} ${tdc.bg} ${tdc.text}`}>
                        {t.sector ?? t.theme}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function EventTapeSection({ signals }: { signals: IntelEquitySignal[] }) {
  const [showAll, setShowAll] = useState(false);
  const DEFAULT_ROWS = 5;

  if (signals.length === 0) return null;

  const deduped = Array.from(
    new Map(signals.map(s => [s.event_family_key ?? s.title, s])).values()
  );
  const visible = showAll ? deduped : deduped.slice(0, DEFAULT_ROWS);

  return (
    <GlassCard className="p-5 mb-5">
      <SectionHeader
        icon={<Activity className="w-4 h-4" />}
        title="Market-Moving Event Tape"
        subtitle="Prediction market events with active equity implications — click row to expand"
        right={
          <span className="text-[9px] px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/[0.07] text-blue-400/70 font-mono">
            intelligence
          </span>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left text-white/25 font-semibold pb-2 pr-3 text-[9px] uppercase tracking-wider">Event</th>
              <th className="text-right text-white/25 font-semibold pb-2 px-3 text-[9px] uppercase tracking-wider w-16">Odds</th>
              <th className="text-right text-white/25 font-semibold pb-2 px-3 text-[9px] uppercase tracking-wider w-16">24h Δ</th>
              <th className="text-right text-white/25 font-semibold pb-2 px-3 text-[9px] uppercase tracking-wider w-16">7d Δ</th>
              <th className="text-center text-white/25 font-semibold pb-2 px-3 text-[9px] uppercase tracking-wider w-18">Direction</th>
              <th className="text-left text-white/25 font-semibold pb-2 px-3 text-[9px] uppercase tracking-wider">Sector / Theme</th>
              <th className="text-left text-white/25 font-semibold pb-2 px-3 text-[9px] uppercase tracking-wider">Tickers</th>
              <th className="text-left text-white/25 font-semibold pb-2 pl-3 text-[9px] uppercase tracking-wider w-16">Quality</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s, i) => (
              <EventTapeRow key={s.event_family_key ?? s.title ?? i} sig={s} />
            ))}
          </tbody>
        </table>
      </div>
      {deduped.length > DEFAULT_ROWS && (
        <button
          onClick={() => setShowAll(v => !v)}
          className="mt-3 text-[10px] text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
        >
          {showAll ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {showAll ? "Show fewer" : `Show all ${deduped.length} events`}
        </button>
      )}
    </GlassCard>
  );
}

// ─── Intelligence: Macro Odds Board ──────────────────────────────────────────

function MacroOddsBoard({ odds }: { odds: TrackedOddsItem[] }) {
  const [open, setOpen] = useState(false);

  const live = odds.filter(o => o.yes_probability != null);
  const stub = odds.filter(o => o.yes_probability == null);

  if (odds.length === 0) return null;

  return (
    <GlassCard className="p-5 mb-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-bold text-white">Macro Odds Board</h2>
            <p className="text-[10px] text-white/30">
              {live.length} live / {odds.length} tracked families
              {live.length > 0 && (
                <span className="ml-1 text-emerald-400/60">— {live[0].label ?? "1 active"}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[9px] px-1.5 py-0.5 rounded border border-blue-500/20 bg-blue-500/[0.07] text-blue-400/70 font-mono">intelligence</span>
          {open
            ? <ChevronDown className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors" />
            : <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/50 transition-colors" />
          }
        </div>
      </button>

      {open && (
        <div className="mt-4">
          {/* Live rows first */}
          {live.length > 0 && (
            <div className="mb-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-400/60 mb-2">Live markets</p>
              <div className="space-y-0">
                {live.map((o, i) => {
                  const pct = o.yes_probability! * 100;
                  return (
                    <div key={o.family_key ?? i} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-white/80">{o.label}</p>
                        {o.category && <p className="text-[9px] text-white/30">{o.category}</p>}
                      </div>
                      <span className="text-[16px] font-bold tabular-nums text-white/90 flex-shrink-0">{pct.toFixed(1)}%</span>
                      <div className="flex flex-col items-end w-16 flex-shrink-0">
                        <span className={`text-[9px] font-mono ${fmtPPColor(o.delta_24h_pp)}`}>{fmtPP(o.delta_24h_pp)} 24h</span>
                        <span className={`text-[9px] font-mono ${fmtPPColor(o.delta_7d_pp)}`}>{fmtPP(o.delta_7d_pp)} 7d</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stub rows (no live market yet) */}
          {stub.length > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/20 mb-2">Tracked families — no live market</p>
              <div className="grid grid-cols-2 gap-1">
                {stub.map((o, i) => (
                  <div key={o.family_key ?? i} className="flex items-center gap-2 py-1.5">
                    <CircleDot className="w-2.5 h-2.5 text-white/10 flex-shrink-0" />
                    <span className="text-[9px] text-white/25 truncate">{o.label}</span>
                    {o.category && <span className="text-[8px] text-white/15 flex-shrink-0">· {o.category}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProphetikInvestorTab() {
  const [overview, setOverview] = useState<BackendOverview | null>(null);
  const [intel, setIntel]       = useState<BackendIntelligence | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch both in parallel; intelligence is best-effort
      const [ov, intelData] = await Promise.allSettled([fetchOverview(), fetchIntelligence()]);
      if (ov.status === "fulfilled" && ov.value) {
        setOverview(ov.value);
      } else {
        throw new Error("Overview endpoint unavailable");
      }
      if (intelData.status === "fulfilled" && intelData.value) {
        setIntel(intelData.value);
      }
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
  const signals    = overview?.top_equity_signals ?? [];
  const regime     = transformRegime(overview?.regime_scoreboard);
  const sectors    = transformSectors(overview?.sector_rotation);
  const watchlists = overview?.watchlists ? transformWatchlists(overview.watchlists) : null;
  const themes     = overview?.theme_clusters ?? [];

  // ── Intelligence additive sections ──
  const intelSignals : IntelEquitySignal[] = intel?.equity_signals ?? [];
  const trackedOdds  : TrackedOddsItem[]  = intel?.tracked_odds ?? [];

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
          {overview && (
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
          {/* ── Intelligence: compact additive sections ── */}
          {intelSignals.length > 0 && <EventTapeSection signals={intelSignals} />}
          {trackedOdds.length > 0 && <MacroOddsBoard odds={trackedOdds} />}

          {/* ── Original sections (primary content from overview) ── */}
          <TopEquitySignals       signals={signals}     loading={isLoading} />
          <RegimeScoreboard       rows={regime}         loading={isLoading} />
          <SectorRotationSignals  sectors={sectors}     loading={isLoading} />
          <StockWatchlistsSection wl={watchlists}       loading={isLoading} />
          <ThemeClusters          clusters={themes}     loading={isLoading} />
        </>
      )}
    </div>
  );
}
