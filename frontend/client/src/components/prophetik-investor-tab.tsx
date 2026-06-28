import { useState, useEffect, useCallback, memo, useRef } from "react";
import { createPortal } from "react-dom";
import { GlassCard } from "@/components/ui/glass-card";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
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
  X,
  Activity,
  Terminal,
  FlaskConical,
  Eye,
  EyeOff,
} from "lucide-react";

// ─── Backend types (/api/predict/investor/overview compat) ───────────────────

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
  event_family_key?: string;
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
  // Intelligence-specific fields
  ticker_impacts?: TickerImpact[];
  theme_impacts?: ThemeImpact[];
  bullish_watchlist?: TickerImpact[];
  bearish_watchlist?: TickerImpact[];
  conditional_watchlist?: TickerImpact[];
  bullish_fallback?: TickerImpact[];
  bearish_fallback?: TickerImpact[];
  conflicts?: string[];
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

interface TrackedOddsItem {
  label?: string;
  question?: string;
  category?: string;
  yes_pct?: number;
  current_odds?: number;
  current_probability_pct?: number;
  current_probability?: number;
  delta_24h_pp?: number;
  delta_7d_pp?: number;
  volume_24h?: number;
  liquidity?: number;
  priority?: string | number;
  direction?: string;
}

interface TickerImpact {
  ticker: string;
  direction?: "bullish" | "bearish" | "conditional" | string;
  source?: "watchlist" | "fallback" | "canonical" | string;
  note?: string;
  themes?: string[];
  sectors?: string[];
  is_fallback?: boolean;
}

interface ThemeImpact {
  theme?: string;
  theme_name?: string;
  direction?: string;
  confidence?: number | string;
  sectors?: string[];
  driver_count?: number;
}

interface IntelligenceDiagnostics {
  ticker_impact_source?: string;
  hardcoded_sector_stocks_used?: boolean;
  watchlist_symbols_count?: number;
  watchlist_ticker_hits?: number;
  canonical_theme_fallback_hits?: number;
  unmapped_theme_impacts?: string[];
  theme_universe_theme_count?: number;
  duplicate_markets_collapsed?: number;
  grouped_event_families?: number;
  cache_age_seconds?: number;
}

interface BackendIntelligence extends BackendOverview {
  tracked_odds?: TrackedOddsItem[];
  equity_signals?: BackendEquitySignal[];
  diagnostics?: IntelligenceDiagnostics;
  cache_age_seconds?: number;
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

function resolveOdds(m: BackendDriverMarket | TrackedOddsItem): string {
  const raw = (m as BackendDriverMarket).current_odds_label
    ?? (m as BackendDriverMarket).current_probability_pct
    ?? m.current_odds
    ?? (m as BackendDriverMarket).current_probability
    ?? (m as BackendDriverMarket).yes_pct
    ?? (m as TrackedOddsItem).yes_pct
    ?? (m as BackendDriverMarket).probability;
  if (raw == null) return "—";
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (isNaN(n)) return String(raw);
  const pct = n >= 0 && n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function resolveOddsNum(m: BackendDriverMarket | TrackedOddsItem): number | null {
  const raw = (m as BackendDriverMarket).current_probability_pct
    ?? (m as BackendDriverMarket).current_odds
    ?? (m as BackendDriverMarket).current_probability
    ?? (m as BackendDriverMarket).yes_pct
    ?? (m as TrackedOddsItem).yes_pct
    ?? (m as BackendDriverMarket).probability;
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
      {right}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-4 text-center">
      <p className="text-[11px] text-white/25">{text}</p>
    </div>
  );
}

function TickerChip({ ticker, dir, fallback }: { ticker: string; dir: "bullish" | "bearish" | "conditional"; fallback?: boolean }) {
  const clr = dir === "bullish" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : dir === "bearish" ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400";
  return (
    <span
      className={`inline-block text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${clr} ${fallback ? "opacity-50" : ""}`}
      title={fallback ? "Theme Universe Fallback" : undefined}
    >
      {ticker}
    </span>
  );
}

// ─── DriverMarketsTable (reused in drawer) ────────────────────────────────────

function DriverMarketsTable({ markets }: { markets: BackendDriverMarket[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-white/[0.06] mt-2">
      <table className="w-full text-[9px] min-w-[560px]">
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
                <td className="px-2 py-1.5 text-white/50 font-mono whitespace-nowrap">{resolveOdds(m)}</td>
                <td className={`px-2 py-1.5 font-mono whitespace-nowrap ${d24 >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtPP(m.delta_24h_pp)}</td>
                <td className={`px-2 py-1.5 font-mono whitespace-nowrap ${d7 >= 0 ? "text-emerald-400" : "text-red-400"}`}>{fmtPP(m.delta_7d_pp)}</td>
                <td className="px-2 py-1.5 text-white/40 whitespace-nowrap">{m.semantic_event_type ?? m.event_type ?? "—"}</td>
                <td className="px-2 py-1.5 text-white/50 whitespace-nowrap">{m.equity_regime_read ?? "—"}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {isInverted ? (
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-500/15 border border-amber-500/25 text-amber-400" title="YES rising means the opposite of the broad category framing.">
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

// ─── A. Macro Odds Board ──────────────────────────────────────────────────────

function OddsBar({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  const isHigh = pct >= 60;
  const isLow  = pct <= 40;
  const color  = isHigh ? "#22c55e" : isLow ? "#ef4444" : "#3b82f6";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 rounded-full bg-white/[0.07] overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span
        className={`text-sm font-black font-mono tabular-nums ${isHigh ? "text-emerald-400" : isLow ? "text-red-400" : "text-blue-400"}`}
        style={{ minWidth: "3.2rem", textAlign: "right" }}
      >
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function MacroOddsBoard({ items, loading }: { items: TrackedOddsItem[]; loading: boolean }) {
  return (
    <div className="mb-5">
      <SectionHeader
        icon={<Activity className="w-4 h-4" />}
        title="Macro Odds Board"
        subtitle="Real-time prediction market odds for macro-relevant events"
      />
      {loading ? (
        <div className="space-y-1.5">
          {[...Array(5)].map((_, i) => <Skel key={i} className="h-9 w-full rounded-lg" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState text="No tracked odds available." />
      ) : (
        <div className="rounded-lg border border-white/[0.07] overflow-hidden">
          <div className="grid grid-cols-[1fr_9rem_6rem_6rem_6rem] gap-0 px-3 py-1.5 bg-white/[0.025] border-b border-white/[0.06]">
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Event</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold text-right">Odds</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold text-right">24h Δ</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold text-right">7d Δ</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold text-right">Vol</span>
          </div>
          {items.map((item, i) => {
            const oddsNum = resolveOddsNum(item);
            const catDir = directionFromSummary(item.direction);
            const dc = dirColors(catDir);
            const vol = item.volume_24h;
            const volStr = vol == null ? "—" : vol >= 1_000_000 ? `$${(vol / 1_000_000).toFixed(1)}M` : vol >= 1_000 ? `$${(vol / 1_000).toFixed(0)}K` : `$${vol.toFixed(0)}`;
            return (
              <div
                key={i}
                className="grid grid-cols-[1fr_9rem_6rem_6rem_6rem] gap-0 px-3 py-2.5 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 pr-3">
                  {item.category && (
                    <span className={`flex-shrink-0 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${dc.bg} ${dc.border} border ${dc.text}`}>
                      {item.category}
                    </span>
                  )}
                  <span className="text-[11px] text-white/75 truncate font-medium">{item.label ?? item.question ?? "—"}</span>
                </div>
                <div className="flex justify-end items-center">
                  <OddsBar pct={oddsNum} />
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-mono font-semibold ${fmtPPColor(item.delta_24h_pp)}`}>{fmtPP(item.delta_24h_pp)}</span>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] font-mono font-semibold ${fmtPPColor(item.delta_7d_pp)}`}>{fmtPP(item.delta_7d_pp)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-white/35">{volStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── C. Event Detail Drawer ───────────────────────────────────────────────────

function WatchlistGroup({
  title,
  items,
  fallbackItems,
  dir,
}: {
  title: string;
  items: TickerImpact[];
  fallbackItems?: TickerImpact[];
  dir: "bullish" | "bearish" | "conditional";
}) {
  const hasItems = items.length > 0 || (fallbackItems?.length ?? 0) > 0;
  if (!hasItems) return null;
  return (
    <div>
      <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map(t => <TickerChip key={t.ticker} ticker={t.ticker} dir={dir} />)}
        {(fallbackItems ?? []).map(t => <TickerChip key={t.ticker} ticker={t.ticker} dir={dir} fallback />)}
      </div>
      {(fallbackItems?.length ?? 0) > 0 && (
        <p className="text-[8px] text-white/20 mt-1 italic">Faded = Theme Universe Fallback (not user watchlist)</p>
      )}
    </div>
  );
}

function EventDetailDrawer({ signal, onClose }: { signal: BackendEquitySignal; onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const pdm  = signal.primary_driver_market;
  const si   = signal.signal_integrity;
  const isMixed = !!(si?.has_polarity_conflict || si?.has_mixed_semantics);
  const dir  = isMixed ? "neutral" : directionFromSummary(signal.summary_direction);
  const dc   = dirColors(dir);
  const oddsStr = pdm ? resolveOdds(pdm) : "—";
  const oddsNum = pdm ? resolveOddsNum(pdm) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const bullishWl   = signal.bullish_watchlist   ?? signal.headline_bullish_tickers?.map(t => ({ ticker: t })) ?? [];
  const bearishWl   = signal.bearish_watchlist   ?? signal.headline_bearish_tickers?.map(t => ({ ticker: t })) ?? [];
  const conditionalWl = signal.conditional_watchlist ?? [];
  const bullFb      = signal.bullish_fallback  ?? [];
  const bearFb      = signal.bearish_fallback  ?? [];

  return createPortal(
    <div
      className="fixed inset-0 z-[9000] flex"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={drawerRef}
        className="w-full max-w-xl bg-[#080d14] border-l border-white/[0.08] overflow-y-auto flex flex-col"
        style={{ maxHeight: "100vh" }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#080d14] border-b border-white/[0.07] px-5 py-4 flex items-start gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {dirIcon(dir, "w-3.5 h-3.5")}
              <span className={`text-[9px] font-bold uppercase tracking-widest ${dc.text}`}>
                {isMixed ? "Mixed Signal" : dir}
              </span>
              {signal.signal_quality_label && (
                <span className={`text-[8px] font-bold ml-auto ${confidenceColor(signal.confidence_score, signal.confidence)}`}>
                  {signal.signal_quality_label}
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-white leading-snug">
              {pdm?.question ?? pdm?.title ?? signal.title}
            </h2>
            {pdm && <p className="text-[10px] text-white/40 mt-0.5">{signal.title}</p>}
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 flex-1">

          {/* Odds highlight */}
          <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <p className="text-[8px] text-white/30 uppercase tracking-widest mb-0.5">Current Odds</p>
              <p className="text-3xl font-black font-mono text-white">{oddsStr}</p>
            </div>
            {pdm && (
              <div className="flex gap-4 ml-4">
                <div>
                  <p className="text-[8px] text-white/30 uppercase tracking-widest mb-0.5">24h Δ</p>
                  <p className={`text-base font-bold font-mono ${fmtPPColor(pdm.delta_24h_pp)}`}>{fmtPP(pdm.delta_24h_pp)}</p>
                </div>
                <div>
                  <p className="text-[8px] text-white/30 uppercase tracking-widest mb-0.5">7d Δ</p>
                  <p className={`text-base font-bold font-mono ${fmtPPColor(pdm.delta_7d_pp)}`}>{fmtPP(pdm.delta_7d_pp)}</p>
                </div>
              </div>
            )}
            {oddsNum != null && (
              <div className="ml-auto">
                <div className="w-16 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${oddsNum}%`, background: oddsNum >= 60 ? "#22c55e" : oddsNum <= 40 ? "#ef4444" : "#3b82f6" }} />
                </div>
              </div>
            )}
          </div>

          {/* Mixed warning */}
          {isMixed && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/[0.07] border border-amber-500/20">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                <span className="text-[9px] font-bold text-amber-300">Mixed drivers — not one clean sector signal</span>
              </div>
              {si?.user_warning && <p className="text-[9px] text-amber-300/60 pl-4 leading-snug">{si.user_warning}</p>}
            </div>
          )}

          {/* Summary */}
          {signal.summary && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Summary</p>
              <p className="text-[11px] text-white/60 leading-relaxed">{signal.summary}</p>
            </div>
          )}

          {/* Why it matters */}
          {signal.why_it_matters && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Why it matters</p>
              <p className="text-[11px] text-white/55 leading-relaxed">{signal.why_it_matters}</p>
            </div>
          )}

          {/* Headline impact note */}
          {signal.headline_impact_note && (
            <div className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <p className="text-[10px] text-white/40 italic leading-snug">{signal.headline_impact_note}</p>
            </div>
          )}

          {/* Watchlists */}
          {(bullishWl.length > 0 || bearishWl.length > 0 || conditionalWl.length > 0 || bullFb.length > 0 || bearFb.length > 0) && (
            <div className="space-y-3">
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25">Watchlist Impact</p>
              <WatchlistGroup title="Bullish" items={bullishWl} fallbackItems={bullFb} dir="bullish" />
              <WatchlistGroup title="Bearish" items={bearishWl} fallbackItems={bearFb} dir="bearish" />
              <WatchlistGroup title="Conditional" items={conditionalWl} dir="conditional" />
            </div>
          )}

          {/* Theme impacts */}
          {(signal.theme_impacts?.length ?? 0) > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-2">Theme Impacts</p>
              <div className="space-y-1">
                {signal.theme_impacts!.map((ti, i) => {
                  const thDir = directionFromSummary(ti.direction);
                  const dc2   = dirColors(thDir);
                  return (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      {dirIcon(thDir, "w-3 h-3")}
                      <span className="text-white/60 flex-1">{ti.theme_name ?? ti.theme ?? "—"}</span>
                      {ti.sectors && ti.sectors.length > 0 && (
                        <span className={`text-[9px] ${dc2.text}`}>{ti.sectors.slice(0, 2).join(", ")}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Regime impact */}
          {signal.regime_impact && (
            <div className="px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-start gap-1.5">
              <Globe2 className="w-3 h-3 text-white/25 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-white/40 leading-snug">{signal.regime_impact}</p>
            </div>
          )}

          {/* Conflicts */}
          {(signal.conflicts?.length ?? 0) > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-amber-400/60 mb-1.5">Conflicts</p>
              <div className="space-y-1">
                {signal.conflicts!.map((c, i) => (
                  <p key={i} className="text-[10px] text-amber-300/60">{c}</p>
                ))}
              </div>
            </div>
          )}

          {/* Driver markets table */}
          {(signal.driver_markets?.length ?? 0) > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Driver Markets</p>
              <DriverMarketsTable markets={signal.driver_markets!} />
            </div>
          )}

          {/* Supporting markets fallback */}
          {(signal.driver_markets?.length ?? 0) === 0 && (signal.supporting_markets?.length ?? 0) > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Supporting Markets</p>
              <div className="space-y-1">
                {signal.supporting_markets!.slice(0, 6).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <CircleDot className="w-2.5 h-2.5 text-white/15 flex-shrink-0" />
                    <span className="text-white/40 truncate flex-1">{m.question ?? ""}</span>
                    {m.yes_pct != null && <span className="text-white/40 font-mono flex-shrink-0">{m.yes_pct}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── B. Market-Moving Event Tape ─────────────────────────────────────────────

function EventTape({ signals, loading }: { signals: BackendEquitySignal[]; loading: boolean }) {
  const [selected, setSelected] = useState<BackendEquitySignal | null>(null);

  // Deduplicate by event_family_key
  const deduped = (() => {
    const seen = new Set<string>();
    const out: BackendEquitySignal[] = [];
    for (const s of signals) {
      const key = s.event_family_key ?? s.theme_id ?? s.title;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  })();

  return (
    <div className="mb-5">
      <SectionHeader
        icon={<Terminal className="w-4 h-4" />}
        title="Market-Moving Event Tape"
        subtitle="Equity signals derived from prediction market repricing — click any row for detail"
      />
      {loading ? (
        <div className="space-y-1.5">
          {[...Array(6)].map((_, i) => <Skel key={i} className="h-9 w-full rounded-lg" />)}
        </div>
      ) : deduped.length === 0 ? (
        <EmptyState text="No qualified equity signals available." />
      ) : (
        <div className="rounded-lg border border-white/[0.07] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_8rem_5rem_5rem_5rem_7rem_7rem_5rem] gap-0 px-3 py-1.5 bg-white/[0.025] border-b border-white/[0.06]">
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Event</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold text-right pr-2">Odds</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold text-right">24h Δ</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold text-right">7d Δ</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold text-right">Dir</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Sector</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Watchlist</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Quality</span>
          </div>

          {/* Rows */}
          {deduped.map((s, i) => {
            const pdm  = s.primary_driver_market;
            const si   = s.signal_integrity;
            const isMixed = !!(si?.has_polarity_conflict || si?.has_mixed_semantics);
            const dir  = isMixed ? "neutral" : directionFromSummary(s.summary_direction);
            const dc   = dirColors(dir);
            const oddsNum = pdm ? resolveOddsNum(pdm) : null;
            const oddsStr = pdm ? resolveOdds(pdm) : (s.odds_move_summary ? s.odds_move_summary.slice(0, 10) : "—");

            const d24 = pdm?.delta_24h_pp;
            const d7  = pdm?.delta_7d_pp;

            const bullTickers = [
              ...(s.bullish_watchlist ?? []).map(t => t.ticker),
              ...(s.bullish_fallback  ?? []).map(t => t.ticker),
            ].slice(0, 3);
            const bearTickers = [
              ...(s.bearish_watchlist ?? []).map(t => t.ticker),
              ...(s.bearish_fallback  ?? []).map(t => t.ticker),
            ].slice(0, 2);
            const wlHits = [...(s.bullish_watchlist ?? []), ...(s.bearish_watchlist ?? []), ...(s.conditional_watchlist ?? [])].length;
            const tickersFromHeadline = [...(s.headline_bullish_tickers ?? []).slice(0, 2), ...(s.headline_bearish_tickers ?? []).slice(0, 1)];

            const sector = (s.headline_bullish_sectors ?? s.bullish_sectors ?? []).slice(0, 1)[0]
              ?? (s.headline_bearish_sectors ?? s.bearish_sectors ?? []).slice(0, 1)[0]
              ?? "—";

            const sqLabel = s.signal_quality_label;

            const isEven = i % 2 === 0;

            return (
              <div
                key={s.event_family_key ?? s.theme_id ?? i}
                onClick={() => setSelected(s)}
                className={`grid grid-cols-[1fr_8rem_5rem_5rem_5rem_7rem_7rem_5rem] gap-0 px-3 py-2.5 border-b border-white/[0.04] last:border-b-0 cursor-pointer hover:bg-white/[0.04] transition-colors group ${isEven ? "bg-white/[0.01]" : ""}`}
              >
                {/* Event */}
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {isMixed && <span title="Mixed drivers"><AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" /></span>}
                  <span className="text-[11px] text-white/75 truncate group-hover:text-white/90 transition-colors font-medium leading-tight">
                    {pdm?.question ?? pdm?.title ?? s.title}
                  </span>
                </div>

                {/* Odds */}
                <div className="flex items-center justify-end pr-2">
                  {oddsNum != null ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-1 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0">
                        <div className="h-full rounded-full" style={{ width: `${oddsNum}%`, background: oddsNum >= 60 ? "#22c55e" : oddsNum <= 40 ? "#ef4444" : "#3b82f6" }} />
                      </div>
                      <span className={`text-xs font-black font-mono tabular-nums ${oddsNum >= 60 ? "text-emerald-400" : oddsNum <= 40 ? "text-red-400" : "text-blue-400"}`}>
                        {oddsNum.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/30">{oddsStr}</span>
                  )}
                </div>

                {/* 24h */}
                <div className="text-right">
                  <span className={`text-[10px] font-mono font-semibold ${fmtPPColor(d24)}`}>{fmtPP(d24)}</span>
                </div>

                {/* 7d */}
                <div className="text-right">
                  <span className={`text-[10px] font-mono font-semibold ${fmtPPColor(d7)}`}>{fmtPP(d7)}</span>
                </div>

                {/* Direction */}
                <div className="flex items-center justify-end">
                  <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${dc.bg} border ${dc.border}`}>
                    {dirIcon(dir, "w-2.5 h-2.5")}
                  </div>
                </div>

                {/* Sector */}
                <div className="flex items-center">
                  <span className="text-[10px] text-white/45 truncate">{sector}</span>
                </div>

                {/* Watchlist hits */}
                <div className="flex items-center gap-0.5 overflow-hidden">
                  {wlHits > 0 ? (
                    <>
                      {bullTickers.slice(0, 2).map(t => <TickerChip key={t} ticker={t} dir="bullish" />)}
                      {bearTickers.slice(0, 1).map(t => <TickerChip key={t} ticker={t} dir="bearish" />)}
                      {wlHits > 3 && <span className="text-[9px] text-white/30">+{wlHits - 3}</span>}
                    </>
                  ) : tickersFromHeadline.length > 0 ? (
                    <>
                      {tickersFromHeadline.map((t, ti) => (
                        <TickerChip key={t + ti} ticker={t} dir={ti < (s.headline_bullish_tickers?.length ?? 0) ? "bullish" : "bearish"} />
                      ))}
                    </>
                  ) : (
                    <span className="text-[9px] text-white/20">—</span>
                  )}
                </div>

                {/* Quality */}
                <div className="flex items-center">
                  {sqLabel ? (
                    <span className={`text-[9px] font-semibold ${confidenceColor(s.confidence_score, s.confidence)}`}>{sqLabel}</span>
                  ) : s.confidence ? (
                    <span className={`text-[9px] font-semibold ${confidenceColor(undefined, s.confidence)}`}>
                      {confidenceLabel(undefined, s.confidence)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-white/20">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <EventDetailDrawer signal={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── D. Watchlist Impact Matrix ───────────────────────────────────────────────

function WatchlistImpactMatrix({ signals, overviewWl, loading }: {
  signals: BackendEquitySignal[];
  overviewWl?: BackendWatchlists;
  loading: boolean;
}) {
  // Aggregate ticker_impacts from all signals, deduped per ticker per direction
  const agg = (() => {
    const bullMap = new Map<string, { source: string; note?: string }>();
    const bearMap = new Map<string, { source: string; note?: string }>();
    const condMap = new Map<string, { source: string; note?: string }>();
    const bullFbMap = new Map<string, { source: string }>();
    const bearFbMap = new Map<string, { source: string }>();

    for (const s of signals) {
      const classify = (items: TickerImpact[], dir: "bullish" | "bearish" | "conditional", isFallback = false) => {
        for (const t of items) {
          const ticker = typeof t === "string" ? t : t.ticker;
          if (!ticker) continue;
          const isFb = isFallback || t.is_fallback || t.source === "fallback" || t.source === "canonical";
          const meta = { source: t.source ?? (isFb ? "fallback" : "watchlist"), note: t.note };
          if (dir === "bullish") { isFb ? bullFbMap.set(ticker, meta) : bullMap.set(ticker, meta); }
          else if (dir === "bearish") { isFb ? bearFbMap.set(ticker, meta) : bearMap.set(ticker, meta); }
          else { condMap.set(ticker, meta); }
        }
      };

      classify(s.ticker_impacts?.filter(t => t.direction === "bullish") ?? s.bullish_watchlist ?? [], "bullish");
      classify(s.ticker_impacts?.filter(t => t.direction === "bearish") ?? s.bearish_watchlist ?? [], "bearish");
      classify(s.ticker_impacts?.filter(t => t.direction === "conditional") ?? s.conditional_watchlist ?? [], "conditional");
      classify(s.bullish_fallback ?? [], "bullish", true);
      classify(s.bearish_fallback ?? [], "bearish", true);
    }

    // Also pull from overview watchlists if intelligence didn't have any
    if (bullMap.size === 0 && bearMap.size === 0) {
      (overviewWl?.bullish_watchlist ?? []).forEach(i => bullMap.set(i.ticker, { source: "watchlist" }));
      (overviewWl?.bearish_watchlist ?? []).forEach(i => bearMap.set(i.ticker, { source: "watchlist" }));
      (overviewWl?.conditional_watchlist ?? []).forEach(i => condMap.set(i.ticker, { source: "watchlist" }));
    }

    return {
      bullish:     Array.from(bullMap.entries()).map(([ticker, m]) => ({ ticker, ...m, fallback: false })),
      bearish:     Array.from(bearMap.entries()).map(([ticker, m]) => ({ ticker, ...m, fallback: false })),
      conditional: Array.from(condMap.entries()).map(([ticker, m]) => ({ ticker, ...m, fallback: false })),
      bullFallback: Array.from(bullFbMap.entries()).map(([ticker, m]) => ({ ticker, ...m, fallback: true })),
      bearFallback: Array.from(bearFbMap.entries()).map(([ticker, m]) => ({ ticker, ...m, fallback: true })),
    };
  })();

  const noData = agg.bullish.length + agg.bearish.length + agg.conditional.length + agg.bullFallback.length + agg.bearFallback.length === 0;

  return (
    <div className="mb-5">
      <SectionHeader
        icon={<Building2 className="w-4 h-4" />}
        title="Watchlist Impact Matrix"
        subtitle="Tickers most exposed to active prediction market themes — aggregated across all signals"
      />
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => <Skel key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : noData ? (
        <EmptyState text="No watchlist ticker data available." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Bullish */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <h3 className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Bullish</h3>
              <span className="ml-auto text-[9px] text-white/20">{agg.bullish.length + agg.bullFallback.length}</span>
            </div>
            {agg.bullish.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {agg.bullish.map(t => <TickerChip key={t.ticker} ticker={t.ticker} dir="bullish" />)}
              </div>
            )}
            {agg.bullFallback.length > 0 && (
              <>
                <p className="text-[8px] text-white/20 italic mb-1">Theme Universe Fallback</p>
                <div className="flex flex-wrap gap-1">
                  {agg.bullFallback.map(t => <TickerChip key={t.ticker} ticker={t.ticker} dir="bullish" fallback />)}
                </div>
              </>
            )}
            {agg.bullish.length === 0 && agg.bullFallback.length === 0 && (
              <p className="text-[10px] text-white/20">None</p>
            )}
          </div>

          {/* Bearish */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <h3 className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Bearish</h3>
              <span className="ml-auto text-[9px] text-white/20">{agg.bearish.length + agg.bearFallback.length}</span>
            </div>
            {agg.bearish.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {agg.bearish.map(t => <TickerChip key={t.ticker} ticker={t.ticker} dir="bearish" />)}
              </div>
            )}
            {agg.bearFallback.length > 0 && (
              <>
                <p className="text-[8px] text-white/20 italic mb-1">Theme Universe Fallback</p>
                <div className="flex flex-wrap gap-1">
                  {agg.bearFallback.map(t => <TickerChip key={t.ticker} ticker={t.ticker} dir="bearish" fallback />)}
                </div>
              </>
            )}
            {agg.bearish.length === 0 && agg.bearFallback.length === 0 && (
              <p className="text-[10px] text-white/20">None</p>
            )}
          </div>

          {/* Conditional */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Minus className="w-3.5 h-3.5 text-amber-400" />
              <h3 className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Conditional</h3>
              <span className="ml-auto text-[9px] text-white/20">{agg.conditional.length}</span>
            </div>
            {agg.conditional.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {agg.conditional.map(t => <TickerChip key={t.ticker} ticker={t.ticker} dir="conditional" />)}
              </div>
            ) : (
              <p className="text-[10px] text-white/20">None</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── E. Sector / Theme Rotation Matrix ───────────────────────────────────────

function SectorThemeMatrix({
  sectors,
  themes,
  loading,
}: {
  sectors: SectorSignal[];
  themes: BackendThemeCluster[];
  loading: boolean;
}) {
  const TYPE_CONFIG = {
    positive: { label: "Positive",        text: "text-emerald-400", dot: "bg-emerald-400" },
    negative: { label: "Negative",        text: "text-red-400",     dot: "bg-red-400"     },
    emerging: { label: "Emerging",        text: "text-blue-400",    dot: "bg-blue-400"    },
    fading:   { label: "Fading",          text: "text-amber-400",   dot: "bg-amber-400"   },
  } as const;

  const noData = sectors.length === 0 && themes.length === 0;

  return (
    <div className="mb-5">
      <SectionHeader
        icon={<Layers className="w-4 h-4" />}
        title="Sector / Theme Rotation"
        subtitle="Which sectors and themes are implied in or out by prediction market positioning"
      />
      {loading ? (
        <div className="space-y-1.5">
          {[...Array(6)].map((_, i) => <Skel key={i} className="h-7 w-full rounded" />)}
        </div>
      ) : noData ? (
        <EmptyState text="No sector or theme rotation data available." />
      ) : (
        <div className="rounded-lg border border-white/[0.07] overflow-hidden">
          <div className="grid grid-cols-[1fr_5rem_5rem_8rem] gap-0 px-3 py-1.5 bg-white/[0.025] border-b border-white/[0.06]">
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Sector / Theme</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Signal</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Confidence</span>
            <span className="text-[9px] text-white/25 uppercase tracking-wider font-semibold">Key Tickers</span>
          </div>

          {/* Sector rows */}
          {sectors.map((s, i) => {
            const cfg = TYPE_CONFIG[s.type];
            return (
              <div key={`sector-${s.sector}-${i}`} className="grid grid-cols-[1fr_5rem_5rem_8rem] gap-0 px-3 py-2 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[8px] font-bold uppercase text-white/20">SECT</span>
                  <span className="text-[11px] text-white/70 font-medium truncate">{s.sector}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                  <span className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.label}</span>
                </div>
                <div className="flex items-center">
                  {s.mentions != null ? (
                    <span className="text-[10px] text-white/40">{s.mentions} mkt{s.mentions !== 1 ? "s" : ""}</span>
                  ) : <span className="text-[9px] text-white/20">—</span>}
                </div>
                <div className="flex flex-wrap items-center gap-0.5">
                  {(s.stocks ?? []).slice(0, 3).map(t => (
                    <TickerChip key={t} ticker={t} dir={s.type === "negative" || s.type === "fading" ? "bearish" : "bullish"} />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Theme rows */}
          {themes.map((c, i) => {
            const tDir = directionFromSummary(c.summary_direction);
            const dc   = dirColors(tDir);
            const hasContradiction = (c.contradiction_score ?? 0) > 0.3;
            return (
              <div key={`theme-${c.theme_id ?? c.theme_name}-${i}`} className="grid grid-cols-[1fr_5rem_5rem_8rem] gap-0 px-3 py-2 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.025] transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[8px] font-bold uppercase text-blue-400/30">THME</span>
                  <span className="text-sm mr-1">{c.theme_emoji ?? ""}</span>
                  <span className="text-[11px] text-white/70 truncate">{c.theme_name}</span>
                  {hasContradiction && <span title="Mixed signals"><AlertTriangle className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" /></span>}
                </div>
                <div className="flex items-center gap-1">
                  {dirIcon(tDir, "w-2.5 h-2.5")}
                  <span className={`text-[10px] font-semibold ${dc.text}`}>
                    {tDir === "neutral" ? "Neutral" : tDir === "bullish" ? "Bull" : "Bear"}
                  </span>
                </div>
                <div className="flex items-center">
                  {c.confidence_score != null ? (
                    <span className={`text-[10px] font-semibold ${confidenceColor(c.confidence_score)}`}>
                      {confidenceLabel(c.confidence_score)}
                    </span>
                  ) : <span className="text-[9px] text-white/20">—</span>}
                </div>
                <div className="flex flex-wrap items-center gap-0.5">
                  {(c.bullish_stocks ?? []).slice(0, 2).map(t => <TickerChip key={t} ticker={t} dir="bullish" />)}
                  {(c.bearish_stocks ?? []).slice(0, 1).map(t => <TickerChip key={t} ticker={t} dir="bearish" />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Regime Scoreboard (legacy, used inside collapse) ────────────────────────

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

// ─── F. Legacy / Raw Signals Section ─────────────────────────────────────────

const LegacySignalsSection = memo(function LegacySignalsSection({
  regime,
  sectors,
  themes,
  wl,
  loading,
}: {
  regime: RegimeRow[];
  sectors: SectorSignal[];
  themes: BackendThemeCluster[];
  wl: { bullish: WatchlistEntry[]; bearish: WatchlistEntry[]; conditional: WatchlistEntry[] } | null;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);

  const hasData = regime.length > 0 || sectors.length > 0 || themes.length > 0 ||
    (wl && (wl.bullish.length + wl.bearish.length + wl.conditional.length) > 0);

  if (!hasData && !loading) return null;

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[11px] text-white/30 hover:text-white/55 transition-colors py-1 w-full text-left"
      >
        {open ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        <span className="font-semibold">Raw / Legacy Signals</span>
        <span className="text-[10px] text-white/20">(Regime Scoreboard, Sector Rotation, Theme Clusters, Watchlists)</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 ml-auto" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
      </button>

      {open && (
        <div className="mt-3 space-y-5">
          {/* Regime Scoreboard */}
          {(regime.length > 0 || loading) && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <SectionHeader icon={<Globe2 className="w-3.5 h-3.5" />} title="Regime Scoreboard" subtitle="Macro environment implied by prediction market positioning" />
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skel key={i} className="h-9 rounded" />)}</div>
              ) : (
                <div>{regime.map(r => <RegimeRowCard key={r.key} row={r} />)}</div>
              )}
            </div>
          )}

          {/* Sector overview */}
          {sectors.length > 0 && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <SectionHeader icon={<Layers className="w-3.5 h-3.5" />} title="Sector Rotation (Raw)" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {sectors.map((s, i) => {
                  const TYPE_CFG = {
                    positive: { label: "Positive", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
                    negative: { label: "Negative", text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20"     },
                    emerging: { label: "Emerging", text: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
                    fading:   { label: "Fading",   text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
                  } as const;
                  const cfg = TYPE_CFG[s.type];
                  return (
                    <div key={s.sector + s.type + i} className={`rounded-lg p-3 border ${cfg.border} ${cfg.bg}`}>
                      <p className={`text-[8px] font-bold uppercase tracking-widest ${cfg.text} mb-1`}>{cfg.label}</p>
                      <p className="text-[11px] font-bold text-white/80">{s.sector}</p>
                      {(s.stocks?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1.5">
                          {s.stocks!.slice(0, 3).map(t => <TickerChip key={t} ticker={t} dir={s.type === "negative" || s.type === "fading" ? "bearish" : "bullish"} />)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Watchlists */}
          {wl && (wl.bullish.length + wl.bearish.length + wl.conditional.length) > 0 && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <SectionHeader icon={<Building2 className="w-3.5 h-3.5" />} title="Stock Watchlists (Raw)" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["bullish", "bearish", "conditional"] as const).map(dir => {
                  const entries = wl[dir];
                  return (
                    <div key={dir} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-2 capitalize">{dir}</p>
                      {entries.length === 0 ? (
                        <p className="text-[10px] text-white/20">None</p>
                      ) : (
                        <div className="space-y-1.5">
                          {entries.map((e, i) => (
                            <div key={e.ticker + i} className="flex items-start gap-2">
                              <span className={`text-[10px] font-bold font-mono ${dir === "bullish" ? "text-emerald-400" : dir === "bearish" ? "text-red-400" : "text-amber-400"}`}>{e.ticker}</span>
                              {e.note && <p className="text-[9px] text-white/30 leading-tight">{e.note}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Theme clusters */}
          {themes.length > 0 && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <SectionHeader icon={<BarChart3 className="w-3.5 h-3.5" />} title="Theme Clusters (Raw)" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {themes.map((c, i) => {
                  const dir = directionFromSummary(c.summary_direction);
                  const dc  = dirColors(dir);
                  return (
                    <div key={c.theme_id ?? c.theme_name + i} className={`rounded-lg border ${dc.border} ${dc.bg} p-3`}>
                      <div className="flex items-center gap-1 mb-1">
                        {c.theme_emoji && <span className="text-xs">{c.theme_emoji}</span>}
                        <h3 className="text-[10px] font-bold text-white/75">{c.theme_name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        {dirIcon(dir, "w-2.5 h-2.5")}
                        <span className={`text-[9px] font-semibold uppercase ${dc.text}`}>{dir}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ─── G. Diagnostics Panel ────────────────────────────────────────────────────

function DiagnosticsPanel({ diag }: { diag: IntelligenceDiagnostics }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-[10px] text-white/20 hover:text-white/40 transition-colors py-1"
      >
        <FlaskConical className="w-3 h-3" />
        <span>Diagnostics</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[9px] font-mono space-y-1 text-white/35">
          {Object.entries(diag).map(([k, v]) => (
            <div key={k} className="flex items-start gap-2">
              <span className="text-white/20 flex-shrink-0 w-52 truncate">{k}</span>
              <span className={typeof v === "boolean" ? (v ? "text-amber-400" : "text-emerald-400") : ""}>
                {v === null || v === undefined ? "—" : Array.isArray(v) ? (v.length === 0 ? "[]" : v.join(", ")) : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

type DataMode = "intelligence" | "overview" | "none";

interface LoadedData {
  intel: BackendIntelligence | null;
  overview: BackendOverview | null;
  mode: DataMode;
}

async function fetchIntelligence(): Promise<BackendIntelligence | null> {
  try {
    const r = await fetch("/api/predict/investor/intelligence");
    if (!r.ok) return null;
    const json: BackendIntelligence = await r.json();
    // Validate it has useful intelligence-specific content OR regular overview content
    const hasIntel = (json.equity_signals?.length ?? 0) > 0 || (json.tracked_odds?.length ?? 0) > 0;
    const hasOverview = (json.top_equity_signals?.length ?? 0) > 0 || json.regime_scoreboard != null;
    if (!hasIntel && !hasOverview) return null;
    return json;
  } catch {
    return null;
  }
}

async function fetchOverview(): Promise<BackendOverview | null> {
  try {
    const r = await fetch("/api/predict/investor/overview");
    if (!r.ok) return null;
    const json: BackendOverview = await r.json();
    const hasData = (json.top_equity_signals?.length ?? 0) > 0 || json.regime_scoreboard != null;
    if (!hasData) return null;
    return json;
  } catch {
    return null;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProphetikInvestorTab() {
  const [data, setData]       = useState<LoadedData>({ intel: null, overview: null, mode: "none" });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try intelligence endpoint first
      const intel = await fetchIntelligence();
      if (intel) {
        setData({ intel, overview: null, mode: "intelligence" });
        return;
      }
      // Fall back to overview
      const overview = await fetchOverview();
      if (overview) {
        setData({ intel: null, overview, mode: "overview" });
        return;
      }
      throw new Error("Both /intelligence and /overview returned empty or failed");
    } catch (e: any) {
      console.error("[Investor] fetch error:", e?.message);
      setError(e?.message ?? "Failed to load investor data");
      setData({ intel: null, overview: null, mode: "none" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 5 * 60_000);
    return () => clearInterval(iv);
  }, [loadData]);

  // ── Resolve data from whichever source responded ──
  const { intel, overview, mode } = data;
  const source = intel ?? overview;

  // Intelligence-specific fields
  const trackedOdds   : TrackedOddsItem[]     = intel?.tracked_odds ?? [];
  const equitySignals : BackendEquitySignal[] = intel?.equity_signals ?? [];
  const diagnostics   : IntelligenceDiagnostics | undefined = intel?.diagnostics;

  // Overview-compatible fields (from intel or overview)
  const overviewSignals = source?.top_equity_signals ?? [];
  const overviewWl      = source?.watchlists;
  const regime          = transformRegime(source?.regime_scoreboard);
  const sectors         = transformSectors(source?.sector_rotation);
  const themes          = source?.theme_clusters ?? [];
  const wl              = overviewWl ? transformWatchlists(overviewWl) : null;

  // For the event tape: prefer intelligence equity_signals, fall back to overview top_equity_signals
  const tapeSignals  = equitySignals.length > 0 ? equitySignals : overviewSignals;

  const isLoading = loading && !source;
  const noData    = !loading && !source && !!error;
  const generatedAt = source?.generated_at ?? intel?.generated_at;
  const cacheAge    = intel?.cache_age_seconds ?? intel?.diagnostics?.cache_age_seconds;

  return (
    <div className="pb-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-white/30">
            Prediction markets translated into equity signals, regime reads, and stock watchlists.
          </p>
          {mode !== "none" && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${mode === "intelligence" ? "border-blue-500/20 bg-blue-500/[0.07] text-blue-400/70" : "border-white/[0.08] bg-white/[0.03] text-white/25"}`}>
              {mode === "intelligence" ? "intelligence" : "overview fallback"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {generatedAt && (
            <span className="text-[9px] text-white/20">
              Updated {new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {cacheAge != null && (
            <span className="text-[9px] text-white/15">cache {cacheAge}s</span>
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

      {/* Error state */}
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

      {/* Main content */}
      {!noData && (
        <div className="space-y-0">
          {/* A. Macro Odds Board — only if intelligence has tracked_odds */}
          {(trackedOdds.length > 0 || (isLoading && mode !== "overview")) && (
            <MacroOddsBoard items={trackedOdds} loading={isLoading && trackedOdds.length === 0} />
          )}

          {/* B. Market-Moving Event Tape — primary section */}
          <EventTape signals={tapeSignals} loading={isLoading} />

          {/* D. Watchlist Impact Matrix */}
          <WatchlistImpactMatrix signals={tapeSignals} overviewWl={overviewWl} loading={isLoading} />

          {/* E. Sector / Theme Rotation Matrix */}
          <SectorThemeMatrix sectors={sectors} themes={themes} loading={isLoading} />

          {/* F. Raw / Legacy signals (collapsed by default) */}
          <LegacySignalsSection
            regime={regime}
            sectors={sectors}
            themes={themes}
            wl={wl}
            loading={isLoading}
          />

          {/* G. Diagnostics (collapsed by default) */}
          {diagnostics && <DiagnosticsPanel diag={diagnostics} />}
        </div>
      )}
    </div>
  );
}
