import { useState, memo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import {
  TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  Building2, BarChart3, Globe2, Layers, Zap, ChevronDown,
  ChevronRight, CircleDot, ArrowUpRight, ArrowDownRight,
  Minus, Activity, X, Radio, ExternalLink,
} from "lucide-react";

// ─── Overview types ───────────────────────────────────────────────────────────
interface BackendDriverMarket {
  condition_id?: string; question?: string; title?: string; outcome_label?: string;
  current_odds?: number; current_probability?: number; current_probability_pct?: number;
  current_odds_label?: string | number; yes_pct?: number; probability?: number;
  delta_24h_pp?: number; delta_7d_pp?: number; direction?: string;
  semantic_event_type?: string; event_type?: string; equity_regime_read?: string;
  polarity?: string; contribution_score?: number; slug?: string;
  mapped_bullish_sectors?: string[]; mapped_bearish_sectors?: string[];
  mapped_bullish_tickers?: string[]; mapped_bearish_tickers?: string[];
}
interface BackendSignalIntegrity {
  has_polarity_conflict?: boolean; has_mixed_semantics?: boolean;
  warning?: string; user_warning?: string;
}
interface BackendEquitySignal {
  theme_id?: string; title: string; summary?: string; why_it_matters?: string;
  supporting_markets?: unknown[]; market_count?: number;
  odds_move_summary?: string; summary_direction?: string;
  bullish_sectors?: string[]; bearish_sectors?: string[];
  bullish_stocks?: string[]; bearish_stocks?: string[];
  asset_baskets?: string[]; regime_impact?: string;
  confidence?: string; confidence_score?: number; narrative?: string;
  watchlist_priority?: string; primary_driver_market?: BackendDriverMarket;
  driver_markets?: BackendDriverMarket[]; confidence_explanation?: string;
  signal_integrity?: BackendSignalIntegrity; signal_quality_label?: string;
  signal_quality_explanation?: string; display_impact_mode?: string;
  headline_bullish_sectors?: string[]; headline_bearish_sectors?: string[];
  headline_bullish_tickers?: string[]; headline_bearish_tickers?: string[];
  headline_impact_note?: string;
}
interface BackendRegimeValue {
  label?: string; score?: number; direction?: string; confidence?: string;
}
interface BackendSectorEntry { sector: string; mentions?: number; stocks?: string[]; }
interface BackendSectorRotation {
  strongest_positive_sectors?: BackendSectorEntry[];
  strongest_negative_sectors?: BackendSectorEntry[];
  emerging_leadership?: BackendSectorEntry[];
  fading_leadership?: BackendSectorEntry[];
  regime_context_notes?: string[];
}
interface BackendWatchlistItem {
  ticker: string; themes?: string[]; sectors?: string[];
  type?: string; note?: string; bullish_themes?: string[]; bearish_themes?: string[];
}
interface BackendWatchlists {
  bullish_watchlist?: BackendWatchlistItem[];
  bearish_watchlist?: BackendWatchlistItem[];
  conditional_watchlist?: BackendWatchlistItem[];
}
interface BackendThemeCluster {
  theme_id?: string; theme_name: string; theme_emoji?: string;
  description?: string; market_count?: number;
  weighted_odds_shift_24h?: number; weighted_odds_shift_7d?: number;
  confidence_score?: number; summary_direction?: string;
  bullish_stocks?: string[]; bearish_stocks?: string[];
  regime_implications?: string; narrative?: string;
}
interface BackendOverview {
  generated_at?: string;
  equity_relevant_market_count?: number;
  top_equity_signals?: BackendEquitySignal[];
  sector_rotation?: BackendSectorRotation;
  watchlists?: BackendWatchlists;
  bullish_watchlist?: BackendWatchlistItem[];
  bearish_watchlist?: BackendWatchlistItem[];
  conditional_watchlist?: BackendWatchlistItem[];
  regime_scoreboard?: Record<string, BackendRegimeValue>;
  theme_clusters?: BackendThemeCluster[];
}

// ─── Odds/live types ──────────────────────────────────────────────────────────
interface OddsDriverMarket {
  question?: string; yes_pct?: number | null; volume_24h?: number | null;
  delta_24h_pp?: number | null; condition_id?: string; slug?: string;
}
interface LiveOddsItem {
  family_key: string; label: string; category?: string;
  priority?: number; dashboard_enabled?: boolean; preferred_outcome?: string;
  yes_probability?: number; yes_pct?: number;
  market_question?: string; condition_id?: string; slug?: string;
  volume_24h?: number; liquidity?: number; candidate_count?: number;
  driver_markets?: OddsDriverMarket[];
  delta_1h_pp?: number; delta_24h_pp?: number; delta_7d_pp?: number;
}
interface LiveOddsResponse {
  updated_at?: string; cache_age_seconds?: number;
  live_count?: number; tracked_count?: number;
  status?: string; odds?: LiveOddsItem[];
}
interface OddsHistoryPoint { timestamp?: string; yes_probability?: number; }
interface OddsHistoryResponse {
  family_key?: string; label?: string; category?: string;
  days?: number; point_count?: number; points?: OddsHistoryPoint[];
}

// ─── Intelligence types ───────────────────────────────────────────────────────
interface IntelDriverMarket {
  question?: string; yes_pct?: number; delta_24h_pp?: number;
  delta_7d_pp?: number; volume_24h?: number; condition_id?: string; slug?: string;
}
interface IntelThemeImpact {
  sector?: string; theme?: string; direction?: string;
  confidence?: string; rationale?: string;
}
interface IntelTickerImpacts {
  bullish_watchlist?: string[]; bearish_watchlist?: string[];
  conditional_watchlist?: string[];
  bullish_fallback?: string[]; bearish_fallback?: string[];
}
// Backend-provided exposure object (from tracked_odds and equity_signals)
interface BackendExposure {
  bullish_watchlist?: string[];
  bearish_watchlist?: string[];
  conditional_watchlist?: string[];
  bullish_fallback?: string[];
  bearish_fallback?: string[];
  conditional_fallback?: string[];
  bullish_themes?: string[];
  bearish_themes?: string[];
  conditional_themes?: string[];
  no_direct_exposure?: boolean;
  exposure_source?: string;
}
interface OddsOutcome {
  label?: string;
  display_label?: string;
  probability?: number;
  clob_token_id?: string;
  side?: string;
}
interface TrackedOddsItem extends LiveOddsItem {
  market_read?: string;
  exposure?: BackendExposure;
  dashboard_priority?: number;
  // Enriched Polymarket contract context
  display_title?: string;
  display_subtitle?: string;
  contract_context?: string;
  event_title?: string;
  question?: string;
  url?: string;
  end_date?: string;
  priced_outcome?: string;
  priced_outcome_label?: string;
  priced_probability?: number;
  outcomes?: OddsOutcome[];
  outcome_summary?: string;
  neg_risk?: boolean;
}
interface IntelEquitySignal {
  event_family_key?: string; title: string; primary_category?: string;
  yes_probability?: number; delta_24h_pp?: number; delta_7d_pp?: number;
  direction?: string; signal_quality?: string; why_it_matters?: string;
  driver_markets?: IntelDriverMarket[]; theme_impacts?: IntelThemeImpact[];
  ticker_impacts?: IntelTickerImpacts;
  market_read?: string; exposure?: BackendExposure;
  conflicts?: string[];
  market_count?: number; total_volume_24h?: number;
}
interface IntelligenceResponse {
  updated_at?: string; equity_signals?: IntelEquitySignal[];
  tracked_odds?: TrackedOddsItem[];
}

// ─── Unified ledger row ───────────────────────────────────────────────────────
interface LedgerRow {
  source: "odds" | "intel";
  family_key: string; label: string; category?: string;
  yes_pct?: number | null;
  preferred_outcome?: string;
  market_question?: string;
  slug?: string;
  delta_1h_pp?: number | null;
  delta_24h_pp?: number | null;
  delta_7d_pp?: number | null;
  volume_24h?: number | null;
  liquidity?: number | null;
  direction?: string;
  signal_quality?: string;
  ticker_impacts?: IntelTickerImpacts;
  theme_impacts?: IntelThemeImpact[];
  driver_markets?: (IntelDriverMarket | OddsDriverMarket)[];
  conflicts?: string[];
  marketRead: string;
  exposure?: BackendExposure;
  priority?: number;
  // Enriched display fields from TrackedOddsItem
  display_title?: string;
  display_subtitle?: string;
  priced_outcome_label?: string;
  priced_probability?: number;
  outcome_summary?: string;
  end_date?: string;
  url?: string;
  event_title?: string;
  outcomes?: OddsOutcome[];
  neg_risk?: boolean;
  question?: string;
}

// ─── View-model types ─────────────────────────────────────────────────────────
interface RegimeRow {
  key: string; displayName: string;
  label?: string; score?: number; direction?: string; confidenceStr?: string;
}
interface SectorSignal {
  sector: string; type: "positive" | "negative" | "emerging" | "fading";
  stocks?: string[]; mentions?: number;
}
interface WatchlistEntry {
  ticker: string; themes?: string[]; sectors?: string[];
  direction: "bullish" | "bearish" | "conditional";
}

// ─── Transforms ───────────────────────────────────────────────────────────────
const REGIME_NAMES: Record<string, string> = {
  risk_on_vs_risk_off: "Risk On / Risk Off",
  inflationary_vs_disinflationary: "Inflation / Disinflation",
  growth_vs_slowdown: "Growth / Slowdown",
  geopolitical_stress_vs_easing: "Geopolitical Stress",
  higher_for_longer_vs_easing: "Higher-for-Longer",
  commodity_pressure_vs_relief: "Commodity Pressure",
  ai_capex_supportive_vs_restrictive: "AI Capex",
};

function transformRegime(rs?: Record<string, BackendRegimeValue>): RegimeRow[] {
  if (!rs) return [];
  return Object.entries(rs).map(([key, v]) => ({
    key, displayName: REGIME_NAMES[key] ?? key.replace(/_/g, " "),
    label: v.label, score: v.score, direction: v.direction, confidenceStr: v.confidence,
  }));
}
function transformSectors(sr?: BackendSectorRotation): SectorSignal[] {
  if (!sr) return [];
  const out: SectorSignal[] = [];
  (sr.strongest_positive_sectors ?? []).forEach(e => out.push({ sector: e.sector, type: "positive", stocks: e.stocks }));
  (sr.strongest_negative_sectors ?? []).forEach(e => out.push({ sector: e.sector, type: "negative", stocks: e.stocks }));
  (sr.emerging_leadership ?? []).forEach(e => out.push({ sector: e.sector, type: "emerging", stocks: e.stocks }));
  (sr.fading_leadership ?? []).forEach(e => out.push({ sector: e.sector, type: "fading", stocks: e.stocks }));
  return out;
}
function transformWatchlists(ov: BackendOverview) {
  const mapItem = (item: BackendWatchlistItem, dir: "bullish" | "bearish" | "conditional"): WatchlistEntry => ({
    ticker: item.ticker, themes: item.themes ?? item.bullish_themes ?? item.bearish_themes,
    sectors: item.sectors, direction: dir,
  });
  const bullList = ov.bullish_watchlist ?? ov.watchlists?.bullish_watchlist ?? [];
  const bearList = ov.bearish_watchlist ?? ov.watchlists?.bearish_watchlist ?? [];
  const condList = ov.conditional_watchlist ?? ov.watchlists?.conditional_watchlist ?? [];
  return {
    bullish: bullList.map(i => mapItem(i, "bullish")),
    bearish: bearList.map(i => mapItem(i, "bearish")),
    conditional: condList.map(i => mapItem(i, "conditional")),
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtPP(v?: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}pp`;
}
function ppColor(v?: number | null): string {
  if (v == null) return "text-white/25";
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}
function fmtPct(v: number): string { return `${v.toFixed(1)}%`; }
function fmtVol(v?: number | null): string {
  if (v == null || v === 0) return "";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}
function preferredSideLabel(p?: string): string {
  if (!p) return "YES";
  if (p === "yes") return "YES";
  if (p === "no") return "NO";
  return p.charAt(0).toUpperCase() + p.slice(1);
}
function dirFrom(dir?: string): "bullish" | "bearish" | "neutral" {
  const d = (dir ?? "").toLowerCase();
  if (d === "bullish" || d.includes("bull") || d === "rising" || d.includes("growth") || d.includes("easing") || d.includes("support")) return "bullish";
  if (d === "bearish" || d.includes("bear") || d === "falling" || d.includes("stress") || d.includes("restrict") || d.includes("pressure")) return "bearish";
  return "neutral";
}
function dirColors(dir: "bullish" | "bearish" | "neutral") {
  if (dir === "bullish") return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (dir === "bearish") return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
  return { text: "text-white/35", bg: "bg-white/[0.04]", border: "border-white/[0.07]" };
}
function dirIcon(dir: "bullish" | "bearish" | "neutral", cls = "w-3.5 h-3.5") {
  if (dir === "bullish") return <TrendingUp className={`${cls} text-emerald-400`} />;
  if (dir === "bearish") return <TrendingDown className={`${cls} text-red-400`} />;
  return <Minus className={`${cls} text-white/25`} />;
}
function confidenceLabel(score?: number, str?: string): string {
  if (str === "high"   || (score != null && score >= 75)) return "High";
  if (str === "medium" || (score != null && score >= 50)) return "Med";
  if (str === "low"    || (score != null && score <  50)) return "Low";
  return "";
}
function confidenceColor(score?: number, str?: string): string {
  const l = confidenceLabel(score, str);
  if (l === "High") return "text-emerald-400";
  if (l === "Med")  return "text-blue-400";
  if (l === "Low")  return "text-amber-400";
  return "text-white/25";
}
function resolveOddsNum(m: BackendDriverMarket): number | null {
  const raw = m.current_probability_pct ?? m.current_odds ?? m.current_probability ?? m.yes_pct ?? m.probability;
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw as string);
  if (isNaN(n)) return null;
  return n >= 0 && n <= 1 ? n * 100 : n;
}

// Derive a display-only market read label from backend fields (direction + category)
function marketReadLabel(direction?: string, category?: string): string {
  const cat = (category ?? "").toLowerCase();
  const dir = (direction ?? "").toLowerCase();

  if (cat.includes("geopolit") || cat.includes("war") || cat.includes("shipping") || cat.includes("nuclear") || cat.includes("hormuz") || cat.includes("iran") || cat.includes("russia") || cat.includes("ukraine") || cat.includes("china") || cat.includes("taiwan") || cat.includes("israel") || cat.includes("middle east")) {
    if (dir === "falling") return "Geopolitical easing";
    if (dir === "rising")  return "Geopolitical stress rising";
    return "Geopolitical";
  }
  if (cat.includes("fed") || cat.includes("rate")) {
    if (dir === "rising")  return "Rates easing";
    if (dir === "falling") return "Rates restrictive";
    return "Rates watch";
  }
  if (cat.includes("inflat") || cat.includes("cpi") || cat.includes("ppi")) {
    if (dir === "rising")  return "Inflationary";
    if (dir === "falling") return "Disinflationary";
    return "Inflation watch";
  }
  if (cat.includes("labor") || cat.includes("job") || cat.includes("employ") || cat.includes("unempl")) {
    return "Labor market";
  }
  if (cat.includes("energy") || cat.includes("oil") || cat.includes("commodit") || cat.includes("gold") || cat.includes("safe haven")) {
    if (dir === "rising")  return "Commodity pressure";
    if (dir === "falling") return "Commodity easing";
    return "Commodities";
  }
  if (cat.includes("equit") || cat.includes("tech") || cat.includes("supply chain")) {
    if (dir === "rising")  return "Tech bullish";
    if (dir === "falling") return "Tech headwind";
    return "Equity watch";
  }
  if (cat.includes("trade") || cat.includes("tariff")) {
    if (dir === "rising")  return "Trade risk rising";
    if (dir === "falling") return "Trade risk easing";
    return "Trade policy";
  }
  if (cat.includes("crypto") || cat.includes("bitcoin") || cat.includes("risk proxy")) {
    if (dir === "rising")  return "Crypto bullish";
    if (dir === "falling") return "Crypto risk";
    return "Crypto";
  }
  if (cat.includes("macro")) {
    if (dir === "rising")  return "Growth positive";
    if (dir === "falling") return "Growth slowing";
    return "Macro";
  }
  if (dir === "rising")  return "Risk-on signal";
  if (dir === "falling") return "Risk-off signal";
  return "Macro";
}

// ─── Shared primitives ────────────────────────────────────────────────────────
function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.05] ${className}`} />;
}
function SecHeader({ icon, title, subtitle, right }: { icon: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        {subtitle && <p className="text-[9px] text-white/25 mt-0.5">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center py-6"><p className="text-[11px] text-white/20 italic">{text}</p></div>;
}

// ─── SECTION 1: Market Impact Command Center ──────────────────────────────────

// Return the most useful contract context string — prioritise question, then subtitle if not redundant
function contractContextLine(t: {
  question?: string; display_subtitle?: string; priced_outcome_label?: string; event_title?: string;
}): string | null {
  const q = t.question;
  if (q && q.length > 10) return q;
  const sub = t.display_subtitle;
  if (sub && sub !== t.priced_outcome_label && sub.length > 5) return sub;
  const et = t.event_title;
  if (et && et.length > 5) return et;
  return null;
}

// Vertical outcome list — renders outcomes[] as rows, or splits outcome_summary as fallback
function OutcomeList({
  outcomes, pricedLabel, outcomeSummary, maxVisible = 4, className = "",
}: {
  outcomes?: OddsOutcome[];
  pricedLabel?: string;
  outcomeSummary?: string;
  maxVisible?: number;
  className?: string;
}) {
  const [showAll, setShowAll] = useState(false);

  type OItem = { label: string; prob: number | null; isSelected: boolean };
  let items: OItem[] = [];

  if (outcomes && outcomes.length > 0) {
    items = outcomes.map(o => {
      const oLabel = o.display_label ?? o.label ?? "";
      return {
        label: oLabel,
        prob: o.probability != null ? o.probability * 100 : null,
        isSelected: oLabel === pricedLabel || o.label === pricedLabel,
      };
    });
  } else if (outcomeSummary) {
    items = outcomeSummary.split(" · ").map(part => {
      const m = part.match(/^(.+?)\s+([\d.]+)%$/);
      if (m) return { label: m[1], prob: parseFloat(m[2]), isSelected: m[1] === pricedLabel };
      return { label: part, prob: null, isSelected: false };
    });
  }

  if (items.length === 0) return null;

  const visible = showAll ? items : items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div className={`space-y-0.5 ${className}`}>
      {visible.map((item, i) => (
        <div key={i} className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded ${item.isSelected ? "bg-blue-500/[0.08]" : ""}`}>
          <span className={`flex-1 text-[8px] leading-tight ${item.isSelected ? "text-white/75 font-semibold" : "text-white/35"}`}>
            {item.label}
          </span>
          {item.prob != null && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-10 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${item.isSelected ? "bg-blue-400/60" : "bg-white/12"}`} style={{ width: `${Math.min(item.prob, 100)}%` }} />
              </div>
              <span className={`text-[8px] font-bold tabular-nums w-8 text-right ${item.isSelected ? "text-white/80" : "text-white/30"}`}>
                {fmtPct(item.prob)}
              </span>
            </div>
          )}
        </div>
      ))}
      {!showAll && remaining > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setShowAll(true); }}
          className="text-[7px] text-white/25 hover:text-white/50 transition-colors pl-1.5 pt-0.5"
        >
          +{remaining} more
        </button>
      )}
    </div>
  );
}

// Helper: check if family_key contains any of the group substrings
function matchesGroup(familyKey: string, subs: readonly string[]): boolean {
  const k = familyKey.toLowerCase();
  return subs.some(s => k.includes(s));
}

// Compact executive-summary card for one category
function CmdCard({
  icon, label, rows,
}: {
  icon: React.ReactNode;
  label: string;
  rows: (LiveOddsItem | TrackedOddsItem)[];
}) {
  if (!rows.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-blue-400/45">{icon}</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-white/25">{label}</span>
      </div>
      {rows.slice(0, 2).map(row => {
        const t = row as TrackedOddsItem;
        const familyLabel = t.display_title ?? row.label;
        const pricedPct = t.priced_probability != null ? t.priced_probability * 100
                        : row.yes_pct ?? (row.yes_probability != null ? row.yes_probability * 100 : null);
        const outcomeLabel = t.priced_outcome_label;
        const ctx = contractContextLine(t);
        const primaryTitle = ctx ?? familyLabel;
        const mr = t.market_read;
        return (
          <div key={row.family_key} className="flex flex-col gap-1.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-white/72 leading-tight line-clamp-3">{primaryTitle}</p>
                {ctx && <p className="text-[7px] text-white/22 leading-tight mt-0.5 truncate">{familyLabel}</p>}
                {mr && <MarketReadCell read={mr} />}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[14px] font-bold tabular-nums text-white/85 leading-none">
                  {pricedPct != null ? fmtPct(pricedPct) : "—"}
                </p>
                {outcomeLabel && (
                  <p className="text-[8px] text-white/45 leading-tight mt-0.5">{outcomeLabel}</p>
                )}
              </div>
            </div>
            <OutcomeList
              outcomes={t.outcomes}
              pricedLabel={outcomeLabel ?? undefined}
              outcomeSummary={t.outcome_summary ?? undefined}
              maxVisible={3}
            />
            <div className="flex gap-1 flex-wrap">
              <span className={`text-[7px] font-mono ${ppColor(row.delta_24h_pp)}`}>{fmtPP(row.delta_24h_pp)} 24h</span>
              {row.delta_7d_pp != null && (
                <span className={`text-[7px] font-mono ${ppColor(row.delta_7d_pp)}`}>{fmtPP(row.delta_7d_pp)} 7d</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type OddsSourceType = "live" | "intelligence" | "none";

function MarketImpactCommandCenter({
  oddsRows,
  oddsSource,
  oddsStale,
  trackedCount,
  liveCount,
  cacheAgeSec,
}: {
  oddsRows: (LiveOddsItem | TrackedOddsItem)[];
  oddsSource: OddsSourceType;
  oddsStale: boolean;
  trackedCount: number;
  liveCount: number;
  cacheAgeSec?: number;
}) {
  const isWarming = oddsRows.length === 0;

  const GROUPS = [
    { id: "rates",       label: "Rates / Fed",       icon: <Building2 className="w-3 h-3" />, keys: ["fed_","rate_","fomc"] as const },
    { id: "growth",      label: "Growth / Recession", icon: <BarChart3 className="w-3 h-3" />, keys: ["recession","spx_daily","cpi_","inflation","jobs_","unemployment","gdp","tariff"] as const },
    { id: "geo",         label: "Geopolitical Risk",  icon: <Globe2 className="w-3 h-3" />,    keys: ["hormuz","iran","russia","ukraine","china_","taiwan","israel","gaza"] as const },
    { id: "tech",        label: "Tech / Mega-cap",    icon: <Zap className="w-3 h-3" />,       keys: ["nvda_","tsla_","aapl_","msft_","googl_","amd_","ai_export","mega_cap"] as const },
    { id: "commodities", label: "Commodities",        icon: <Layers className="w-3 h-3" />,    keys: ["bitcoin","oil_","gold_","crude","commodity","crypto"] as const },
  ];

  const grouped = GROUPS.map(g => ({
    ...g,
    rows: oddsRows
      .filter(r => matchesGroup(r.family_key, g.keys))
      .sort((a, b) =>
        (a.priority ?? (a as TrackedOddsItem).dashboard_priority ?? 99) -
        (b.priority ?? (b as TrackedOddsItem).dashboard_priority ?? 99)
      ),
  }));

  // Top Movers: biggest absolute 24h and 7d movers
  const byAbs24 = [...oddsRows].sort((a, b) => Math.abs(b.delta_24h_pp ?? 0) - Math.abs(a.delta_24h_pp ?? 0));
  const byAbs7d = [...oddsRows].sort((a, b) => Math.abs(b.delta_7d_pp ?? 0) - Math.abs(a.delta_7d_pp ?? 0));
  const top24   = byAbs24[0];
  const top7d   = byAbs7d.find(r => r.family_key !== top24?.family_key) ?? byAbs7d[0];
  const hasMovers = (top24?.delta_24h_pp ?? 0) !== 0 || (top7d?.delta_7d_pp ?? 0) !== 0;

  const activeGroups = grouped.filter(g => g.rows.length > 0);

  return (
    <GlassCard className="p-4 mb-4">
      <SecHeader
        icon={<Radio className="w-4 h-4" />}
        title="Market Impact Command Center"
        subtitle="Executive summary of tracked prediction market signals by category"
        right={
          <div className="flex items-center gap-2 text-[9px]">
            {isWarming ? (
              <span className="flex items-center gap-1 text-amber-400/60">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" />Warming
              </span>
            ) : oddsSource === "intelligence" ? (
              <span className="flex items-center gap-1 text-blue-400/50">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/50 animate-pulse" />Intel cache
              </span>
            ) : oddsStale ? (
              <span className="flex items-center gap-1 text-amber-400/45">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/45 animate-pulse" />Refreshing
              </span>
            ) : liveCount > 0 ? (
              <span className="flex items-center gap-1 text-emerald-400/60">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />{liveCount} live
              </span>
            ) : null}
            <span className="text-white/20">{trackedCount} tracked</span>
          </div>
        }
      />

      {/* Source banners */}
      {!isWarming && oddsSource === "intelligence" && (
        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-blue-500/[0.06] border border-blue-500/10">
          <div className="w-1 h-1 rounded-full bg-blue-400/50 flex-shrink-0" />
          <p className="text-[8px] text-blue-400/55">Intelligence cache · refreshing odds</p>
        </div>
      )}
      {!isWarming && oddsStale && (
        <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/10">
          <div className="w-1 h-1 rounded-full bg-amber-400/50 animate-pulse flex-shrink-0" />
          <p className="text-[8px] text-amber-400/55">
            Last known odds · refreshing{cacheAgeSec != null ? ` · ${Math.round(cacheAgeSec / 60)}m old` : ""}
          </p>
        </div>
      )}

      {/* Full warming spinner — only when both sources are empty */}
      {isWarming && (
        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
          <div className="w-7 h-7 rounded-full border-2 border-blue-400/20 border-t-blue-400/60 animate-spin" />
          <div>
            <p className="text-[11px] font-semibold text-white/35">Prediction odds warming…</p>
            <p className="text-[9px] text-white/20 mt-0.5">{trackedCount} families tracked · cache initializing</p>
          </div>
        </div>
      )}

      {/* Executive summary grid */}
      {!isWarming && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {activeGroups.map(g => (
            <CmdCard key={g.id} icon={g.icon} label={g.label} rows={g.rows} />
          ))}

          {/* Top Movers card */}
          {hasMovers && (
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-blue-400/45" />
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/25">Top Movers</span>
              </div>
              {([
                { row: top24, badge: "24h", val: top24?.delta_24h_pp },
                { row: top7d?.family_key !== top24?.family_key ? top7d : undefined, badge: "7d", val: top7d?.family_key !== top24?.family_key ? top7d?.delta_7d_pp : undefined },
              ] as { row?: LiveOddsItem | TrackedOddsItem; badge: string; val?: number | null }[])
                .filter(x => x.row && x.val != null && x.val !== 0)
                .map(({ row, badge, val }) => {
                  const tm = row as TrackedOddsItem;
                  const tmCtx = contractContextLine(tm);
                  return (
                    <div key={row!.family_key + badge} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-semibold text-white/65 leading-tight line-clamp-3">{tmCtx ?? tm.display_title ?? row!.label}</p>
                        {tmCtx && <p className="text-[7px] text-white/22 leading-tight mt-0.5 truncate">{tm.display_title ?? row!.label}</p>}
                        <span className="text-[7px] text-white/20">Biggest {badge} move</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[12px] font-bold tabular-nums ${ppColor(val)}`}>{fmtPP(val)}</span>
                        {tm.priced_probability != null && (
                          <p className="text-[7px] text-white/28 font-mono">{fmtPct(tm.priced_probability * 100)}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* Fallback when no groups matched */}
          {activeGroups.length === 0 && (
            <div className="col-span-full">
              <Empty text="No categorized signals in current odds set" />
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ─── SECTION 2: Event Impact Ledger ──────────────────────────────────────────

async function fetchOddsHistory(familyKey: string, days = 7): Promise<OddsHistoryResponse> {
  const res = await fetch(`/api/predict/odds/history?family_key=${encodeURIComponent(familyKey)}&days=${days}`);
  if (!res.ok) throw new Error(`History ${res.status}`);
  return res.json();
}

function ExposureCell({ exposure }: { exposure?: BackendExposure }) {
  if (!exposure) return <span className="text-[8px] text-white/15">—</span>;
  if (exposure.no_direct_exposure) return <span className="text-[8px] text-white/20 italic">No direct exposure</span>;

  const bullW = exposure.bullish_watchlist ?? [];
  const bearW = exposure.bearish_watchlist ?? [];
  const bullF = exposure.bullish_fallback ?? [];
  const bearF = exposure.bearish_fallback ?? [];
  const bullT = exposure.bullish_themes ?? [];
  const bearT = exposure.bearish_themes ?? [];

  const hasWatchlist = bullW.length > 0 || bearW.length > 0;
  const hasFallback  = bullF.length > 0 || bearF.length > 0;
  const hasThemes    = bullT.length > 0 || bearT.length > 0;

  if (!hasWatchlist && !hasFallback && !hasThemes) return <span className="text-[8px] text-white/15">—</span>;

  // Level 1: watchlist tickers (solid chips, visually primary)
  if (hasWatchlist) {
    return (
      <div className="flex flex-col gap-0.5">
        {bullW.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {bullW.slice(0, 3).map(t => <span key={t} className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>)}
            {bullW.length > 3 && <span className="text-[7px] text-white/20">+{bullW.length - 3}</span>}
          </div>
        )}
        {bearW.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {bearW.slice(0, 3).map(t => <span key={t} className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{t}</span>)}
            {bearW.length > 3 && <span className="text-[7px] text-white/20">+{bearW.length - 3}</span>}
          </div>
        )}
      </div>
    );
  }

  // Level 2: fallback tickers (theme universe, muted style)
  if (hasFallback) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] text-white/18 uppercase tracking-wider leading-none">Theme Universe</span>
        {bullF.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {bullF.slice(0, 3).map(t => <span key={t} className="text-[7px] font-mono px-1 py-0.5 rounded bg-emerald-500/[0.06] border border-emerald-500/15 text-emerald-400/65">{t}</span>)}
            {bullF.length > 3 && <span className="text-[7px] text-white/18">+{bullF.length - 3}</span>}
          </div>
        )}
        {bearF.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {bearF.slice(0, 3).map(t => <span key={t} className="text-[7px] font-mono px-1 py-0.5 rounded bg-red-500/[0.06] border border-red-500/15 text-red-400/65">{t}</span>)}
            {bearF.length > 3 && <span className="text-[7px] text-white/18">+{bearF.length - 3}</span>}
          </div>
        )}
      </div>
    );
  }

  // Level 3: theme chips only
  return (
    <div className="flex flex-col gap-0.5">
      {bullT.slice(0, 2).map(t => <span key={t} className="text-[7px] text-emerald-400/55 leading-tight truncate max-w-[120px]">{t}</span>)}
      {bearT.slice(0, 2).map(t => <span key={t} className="text-[7px] text-red-400/55 leading-tight truncate max-w-[120px]">{t}</span>)}
    </div>
  );
}

function MarketReadCell({ read }: { read: string }) {
  const isEasing  = read.toLowerCase().includes("eas");
  const isStress  = read.toLowerCase().includes("stress") || read.toLowerCase().includes("rising") || read.toLowerCase().includes("pressure") || read.toLowerCase().includes("restrictive") || read.toLowerCase().includes("headwind");
  const cls = isEasing ? "text-emerald-400/80" : isStress ? "text-red-400/80" : "text-white/40";
  return <span className={`text-[9px] ${cls} leading-tight`}>{read}</span>;
}

function QualityBadge({ q }: { q?: string }) {
  if (!q) return null;
  const cls = q === "high" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
    : q === "moderate" || q === "medium" ? "text-blue-400 bg-blue-500/10 border-blue-500/25"
    : "text-amber-400 bg-amber-500/10 border-amber-500/25";
  return <span className={`text-[7px] font-bold px-1 py-0.5 rounded border ${cls} capitalize`}>{q}</span>;
}

function DetailDrawer({ row, onClose }: { row: LedgerRow | null; onClose: () => void }) {
  const { data: history } = useQuery<OddsHistoryResponse>({
    queryKey: ["odds-history", row?.family_key],
    queryFn: () => fetchOddsHistory(row!.family_key, 7),
    enabled: !!row?.family_key && row?.source === "odds",
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!row) return null;

  const pct  = row.priced_probability != null ? row.priced_probability * 100 : row.yes_pct;
  const side = row.priced_outcome_label ?? preferredSideLabel(row.preferred_outcome);
  const polyUrl = row.url ?? (row.slug ? `https://polymarket.com/event/${row.slug}` : null);
  const volStr = fmtVol(row.volume_24h);
  const liqStr = fmtVol(row.liquidity);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-md h-full bg-[#0b0d13] border-l border-white/[0.08] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0b0d13] border-b border-white/[0.06] px-4 py-3 flex items-start justify-between gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {row.category && <span className="text-[8px] text-white/30">{row.category}</span>}
              {row.signal_quality && <QualityBadge q={row.signal_quality} />}
              {row.source === "intel" && <span className="text-[7px] text-blue-400/50 font-mono border border-blue-400/20 px-1 rounded">intel</span>}
            </div>
            <h3 className="text-[13px] font-bold text-white/90 leading-snug">{contractContextLine(row) ?? row.display_title ?? row.label}</h3>
            {contractContextLine(row) && <p className="text-[8px] text-white/28 leading-tight mt-0.5">{row.display_title ?? row.label}</p>}
            <p className="text-[8px] text-white/20 font-mono mt-0.5">{row.family_key}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Priced outcome + contract context */}
          <div className="px-3 py-2.5 rounded-lg bg-blue-500/[0.05] border border-blue-500/15 space-y-1.5">
            <p className="text-[7px] font-bold uppercase tracking-wider text-blue-400/40">Contract</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-bold tabular-nums text-white/90 leading-none">{pct != null ? fmtPct(pct) : "—"}</span>
              {side && <span className="text-[11px] text-white/55 font-semibold">{side}</span>}
            </div>
            {contractContextLine(row) && (
              <p className="text-[9px] text-blue-300/55 leading-relaxed">{contractContextLine(row)}</p>
            )}
            {row.end_date && (
              <p className="text-[8px] text-white/20">
                Expires {new Date(row.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Odds strip */}
          <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden bg-white/[0.04]">
            {[
              { label: "Odds", val: pct != null ? `${pct.toFixed(1)}%` : "—", large: true, sub: side },
              { label: "1h Δ",  val: fmtPP(row.delta_1h_pp),  col: ppColor(row.delta_1h_pp)  },
              { label: "24h Δ", val: fmtPP(row.delta_24h_pp), col: ppColor(row.delta_24h_pp) },
              { label: "7d Δ",  val: fmtPP(row.delta_7d_pp),  col: ppColor(row.delta_7d_pp)  },
            ].map(({ label, val, large, sub, col }) => (
              <div key={label} className="bg-[#0f111a] px-2 py-2 text-center">
                <p className="text-[7px] text-white/25 mb-0.5">{label}</p>
                <p className={`${large ? "text-[15px]" : "text-[12px]"} font-bold tabular-nums ${col ?? "text-white/80"}`}>{val}</p>
                {sub && <p className="text-[8px] text-white/35 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Volume / liquidity / link */}
          {(volStr || liqStr || polyUrl) && (
            <div className="flex items-center gap-3 flex-wrap text-[9px]">
              {volStr && <span className="text-white/30">{volStr} vol</span>}
              {liqStr && <span className="text-white/30">{liqStr} liq</span>}
              {polyUrl && (
                <a href={polyUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-400/60 hover:text-blue-400 transition-colors ml-auto">
                  <ExternalLink className="w-3 h-3" />Open on Polymarket
                </a>
              )}
            </div>
          )}

          {/* Outcomes breakdown */}
          {(row.outcomes?.length ?? 0) > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/20 mb-1.5">
                All Outcomes{row.neg_risk ? " · negRisk" : ""}
              </p>
              <OutcomeList
                outcomes={row.outcomes}
                pricedLabel={row.priced_outcome_label ?? undefined}
                outcomeSummary={row.outcome_summary ?? undefined}
                maxVisible={99}
              />
            </div>
          )}

          {/* Market Read + Market Read rationale */}
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-white/20 mb-1.5">Market Read</p>
            <MarketReadCell read={row.marketRead} />
            {(row.theme_impacts?.length ?? 0) > 0 && (
              <div className="mt-2 space-y-1">
                {row.theme_impacts!.slice(0, 4).map((t, i) => {
                  const td = dirColors(dirFrom(t.direction));
                  return (
                    <div key={i} className="flex items-start gap-2 text-[9px]">
                      <span className={`flex-shrink-0 font-semibold ${td.text}`}>{t.sector ?? t.theme ?? "—"}</span>
                      <span className="text-white/30 capitalize">{t.direction}</span>
                      {t.rationale && <span className="text-white/20 line-clamp-1 flex-1">{t.rationale}</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Exposure */}
          {row.exposure && !row.exposure.no_direct_exposure && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/20 mb-1.5">
                Exposure
                {row.exposure.exposure_source && <span className="text-white/15 ml-1 font-normal normal-case">{row.exposure.exposure_source}</span>}
              </p>
              <div className="space-y-1.5">
                {/* Watchlist tickers — primary */}
                {((row.exposure.bullish_watchlist?.length ?? 0) > 0 || (row.exposure.bearish_watchlist?.length ?? 0) > 0) && (
                  <>
                    {(row.exposure.bullish_watchlist?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[7px] text-emerald-400/50 font-bold uppercase mb-1">Bullish</p>
                        <div className="flex flex-wrap gap-1">
                          {row.exposure.bullish_watchlist!.map(t => <span key={t} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>)}
                        </div>
                      </div>
                    )}
                    {(row.exposure.bearish_watchlist?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[7px] text-red-400/50 font-bold uppercase mb-1">Bearish</p>
                        <div className="flex flex-wrap gap-1">
                          {row.exposure.bearish_watchlist!.map(t => <span key={t} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{t}</span>)}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* Fallback tickers — theme universe */}
                {((row.exposure.bullish_fallback?.length ?? 0) > 0 || (row.exposure.bearish_fallback?.length ?? 0) > 0) && (
                  <>
                    <p className="text-[7px] text-white/20 font-bold uppercase">Theme Universe</p>
                    {(row.exposure.bullish_fallback?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {row.exposure.bullish_fallback!.map(t => <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/[0.07] border border-emerald-500/15 text-emerald-400/70">{t}</span>)}
                      </div>
                    )}
                    {(row.exposure.bearish_fallback?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {row.exposure.bearish_fallback!.map(t => <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/[0.07] border border-red-500/15 text-red-400/70">{t}</span>)}
                      </div>
                    )}
                  </>
                )}
                {/* Theme labels */}
                {((row.exposure.bullish_themes?.length ?? 0) > 0 || (row.exposure.bearish_themes?.length ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {row.exposure.bullish_themes?.map(t => <span key={t} className="text-[8px] text-emerald-400/55 border border-emerald-500/15 px-1.5 py-0.5 rounded-full">{t}</span>)}
                    {row.exposure.bearish_themes?.map(t => <span key={t} className="text-[8px] text-red-400/55 border border-red-500/15 px-1.5 py-0.5 rounded-full">{t}</span>)}
                  </div>
                )}
              </div>
            </div>
          )}
          {row.exposure?.no_direct_exposure && (
            <p className="text-[9px] text-white/20 italic">No direct exposure mapped for this event.</p>
          )}

          {/* Driver markets */}
          {(row.driver_markets?.length ?? 0) > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/20 mb-1.5">Driver Markets</p>
              <div className="space-y-1.5">
                {(row.driver_markets as Array<IntelDriverMarket | OddsDriverMarket>)!.slice(0, 5).map((dm, i) => {
                  const dp = (dm as IntelDriverMarket).yes_pct;
                  const ddelta = dm.delta_24h_pp;
                  return (
                    <div key={i} className="flex items-start gap-2 text-[9px]">
                      <CircleDot className="w-2.5 h-2.5 text-white/12 flex-shrink-0 mt-0.5" />
                      <span className="text-white/45 flex-1 leading-snug">{dm.question ?? "—"}</span>
                      {dp != null && <span className="text-white/50 font-mono flex-shrink-0">{dp.toFixed(1)}%</span>}
                      {ddelta != null && <span className={`font-mono flex-shrink-0 ${ppColor(ddelta)}`}>{fmtPP(ddelta)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History */}
          {row.source === "odds" && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/20 mb-1.5">7-Day History</p>
              {!history && <div className="space-y-1">{[...Array(4)].map((_, i) => <Skel key={i} className="h-4" />)}</div>}
              {history && !history.points?.length && (
                <p className="text-[9px] text-white/20 italic">No history data yet</p>
              )}
              {(history?.points?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  {history!.points!.slice(-7).reverse().map((pt, i) => {
                    const ts = pt.timestamp ? new Date(pt.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `D-${i}`;
                    const p  = pt.yes_probability != null ? pt.yes_probability * 100 : null;
                    return (
                      <div key={i} className="flex items-center gap-2 text-[9px]">
                        <span className="text-white/25 w-12 flex-shrink-0">{ts}</span>
                        <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400/50 rounded-full" style={{ width: `${p ?? 0}%` }} />
                        </div>
                        <span className="text-white/40 font-mono w-10 text-right flex-shrink-0">{p != null ? fmtPct(p) : "—"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Conflicts */}
          {(row.conflicts?.length ?? 0) > 0 && (
            <div className="px-2.5 py-2 rounded-lg bg-amber-500/[0.05] border border-amber-500/15">
              <p className="text-[7px] font-bold uppercase tracking-wider text-amber-400/50 mb-1">Conflicts</p>
              {row.conflicts!.map((c, i) => <p key={i} className="text-[9px] text-amber-300/60">{c}</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventImpactLedger({
  oddsRows,
  oddsSource,
  intel,
}: {
  oddsRows: (LiveOddsItem | TrackedOddsItem)[];
  oddsSource: OddsSourceType;
  intel: IntelligenceResponse | null | undefined;
}) {
  const [selected, setSelected] = useState<LedgerRow | null>(null);

  const rows: LedgerRow[] = (() => {
    // equity_signals provide richer qualitative fields (direction, signal_quality, etc.)
    const intelSigMap = new Map<string, IntelEquitySignal>();
    for (const s of intel?.equity_signals ?? []) {
      const key = s.event_family_key ?? s.title;
      intelSigMap.set(key, s);
    }

    const out: LedgerRow[] = [];
    const seen = new Set<string>();

    // Primary source: normalized oddsRows (live odds OR tracked_odds fallback)
    // TrackedOddsItem already carries market_read + exposure — use them directly
    for (const o of oddsRows) {
      const key     = o.family_key;
      seen.add(key);
      const tracked = o as TrackedOddsItem; // may have market_read + exposure
      const sig     = intelSigMap.get(key);
      out.push({
        // "odds" enables 7d history fetch; use only when we have live polymarket data
        source: oddsSource === "live" ? "odds" : "intel",
        family_key: key,
        label: o.label,
        category: o.category,
        yes_pct: o.yes_pct ?? (o.yes_probability != null ? o.yes_probability * 100 : null),
        preferred_outcome: o.preferred_outcome,
        market_question: o.market_question,
        slug: o.slug,
        delta_1h_pp: o.delta_1h_pp,
        delta_24h_pp: o.delta_24h_pp,
        delta_7d_pp: o.delta_7d_pp,
        volume_24h: o.volume_24h,
        liquidity: o.liquidity,
        direction: sig?.direction,
        signal_quality: sig?.signal_quality,
        ticker_impacts: sig?.ticker_impacts,
        theme_impacts: sig?.theme_impacts,
        driver_markets: o.driver_markets,
        conflicts: sig?.conflicts,
        // market_read: backend tracked_odds field preferred, then equity_signal field, then derived
        marketRead: tracked.market_read ?? sig?.market_read ?? marketReadLabel(sig?.direction, o.category),
        // exposure: backend tracked_odds field preferred, then equity_signal field
        exposure: tracked.exposure ?? sig?.exposure,
        priority: o.priority ?? tracked.dashboard_priority ?? 99,
        display_title: tracked.display_title,
        display_subtitle: tracked.display_subtitle,
        priced_outcome_label: tracked.priced_outcome_label,
        priced_probability: tracked.priced_probability,
        outcome_summary: tracked.outcome_summary,
        end_date: tracked.end_date,
        url: tracked.url,
        event_title: tracked.event_title,
        outcomes: tracked.outcomes,
        neg_risk: tracked.neg_risk,
        question: tracked.question,
      });
    }

    // Supplementary: equity_signals not already covered by oddsRows
    for (const s of intel?.equity_signals ?? []) {
      const key = s.event_family_key ?? s.title;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        source: "intel",
        family_key: key,
        label: s.title,
        category: s.primary_category,
        yes_pct: s.yes_probability != null ? s.yes_probability * 100 : null,
        preferred_outcome: "yes",
        delta_24h_pp: s.delta_24h_pp,
        delta_7d_pp: s.delta_7d_pp,
        direction: s.direction,
        signal_quality: s.signal_quality,
        ticker_impacts: s.ticker_impacts,
        theme_impacts: s.theme_impacts,
        driver_markets: s.driver_markets,
        conflicts: s.conflicts,
        marketRead: s.market_read ?? marketReadLabel(s.direction, s.primary_category),
        exposure: s.exposure,
      });
    }

    return out.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  })();

  return (
    <>
      <GlassCard className="p-4 mb-4">
        <SecHeader
          icon={<Activity className="w-4 h-4" />}
          title="Event Impact Ledger"
          subtitle="Click any row to open contract detail, history, and exposure"
        />

        {rows.length === 0 && (
          <Empty text="No events available — odds spine initializing" />
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto" style={{ maxHeight: "520px", overflowY: "auto" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead className="sticky top-0 z-10 bg-[#0c0e14]">
                <tr className="border-b border-white/[0.06]">
                  {[
                    { h: "Event / Contract", w: "min-w-[160px]" },
                    { h: "Category", w: "min-w-[80px]" },
                    { h: "Odds", w: "w-20" },
                    { h: "24h Δ", w: "w-14" },
                    { h: "7d Δ", w: "w-14" },
                    { h: "Market Read", w: "min-w-[110px]" },
                    { h: "Exposure", w: "min-w-[100px]" },
                    { h: "Quality", w: "w-14" },
                  ].map(({ h, w }) => (
                    <th key={h} className={`text-left text-[8px] font-bold uppercase tracking-wider text-white/20 pb-2 pr-3 last:pr-0 ${w}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const side = preferredSideLabel(row.preferred_outcome);
                  return (
                    <tr
                      key={row.family_key}
                      className="border-b border-white/[0.025] hover:bg-white/[0.025] transition-colors cursor-pointer"
                      onClick={() => setSelected(row)}
                    >
                      <td className="py-1.5 pr-3">
                        <p className="text-[11px] font-semibold text-white/80 leading-tight line-clamp-3">{contractContextLine(row) ?? row.display_title ?? row.label}</p>
                        {contractContextLine(row) && (
                          <p className="text-[7px] text-white/22 leading-tight mt-0.5 truncate">{row.display_title ?? row.label}</p>
                        )}
                        {row.end_date && (
                          <span className="text-[7px] text-white/15 font-mono">{new Date(row.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className="text-[8px] text-white/30 leading-tight">{row.category ?? "—"}</span>
                      </td>
                      <td className="py-1.5 pr-3">
                        <p className="text-[13px] font-bold tabular-nums text-white/85 leading-none">
                          {row.priced_probability != null ? fmtPct(row.priced_probability * 100) : (row.yes_pct != null ? fmtPct(row.yes_pct) : "—")}
                        </p>
                        {row.priced_outcome_label && (
                          <p className="text-[8px] text-white/35 leading-tight mt-0.5">{row.priced_outcome_label}</p>
                        )}
                      </td>
                      <td className={`py-1.5 pr-3 font-mono text-[9px] ${ppColor(row.delta_24h_pp)}`}>{fmtPP(row.delta_24h_pp)}</td>
                      <td className={`py-1.5 pr-3 font-mono text-[9px] ${ppColor(row.delta_7d_pp)}`}>{fmtPP(row.delta_7d_pp)}</td>
                      <td className="py-1.5 pr-3">
                        <MarketReadCell read={row.marketRead} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <ExposureCell exposure={row.exposure} />
                      </td>
                      <td className="py-1.5">
                        <QualityBadge q={row.signal_quality} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <DetailDrawer row={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ─── SECTION 3: Signal Breakdown (formerly Raw Legacy) ────────────────────────

const EquitySignalCard = memo(function EquitySignalCard({ signal, hero = false }: { signal: BackendEquitySignal; hero?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const pdm = signal.primary_driver_market;
  const si  = signal.signal_integrity;
  const dir = dirFrom(signal.summary_direction);
  const dc  = dirColors(dir);
  const isMixed = !!(si?.has_polarity_conflict || si?.has_mixed_semantics) || signal.display_impact_mode === "mixed";
  const isMixedMode = isMixed && !signal.headline_bullish_sectors?.length;
  const sqLabel = signal.signal_quality_label ?? confidenceLabel(signal.confidence_score, signal.confidence);
  const bullSectors = signal.headline_bullish_sectors?.length ? signal.headline_bullish_sectors : (isMixedMode ? [] : (signal.bullish_sectors ?? []));
  const bearSectors = signal.headline_bearish_sectors?.length ? signal.headline_bearish_sectors : (isMixedMode ? [] : (signal.bearish_sectors ?? []));
  const bullTickers = signal.headline_bullish_tickers?.length  ? signal.headline_bullish_tickers  : (isMixedMode ? [] : (signal.bullish_stocks ?? []));
  const bearTickers = signal.headline_bearish_tickers?.length  ? signal.headline_bearish_tickers  : (isMixedMode ? [] : (signal.bearish_stocks ?? []));
  const sOp = (isMixed && !signal.headline_bullish_sectors?.length) ? "opacity-40" : "";
  let oddsLine: string | undefined;
  if (pdm) { const n = resolveOddsNum(pdm); if (n != null) oddsLine = `${n.toFixed(1)}% ${pdm.outcome_label ?? ""} — ${fmtPP(pdm.delta_24h_pp)} 24h`; }

  return (
    <div className={`rounded-lg border border-white/[0.06] bg-white/[0.015] p-3 ${hero ? "col-span-full border-blue-500/15" : ""}`}>
      {isMixed && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded bg-amber-500/[0.06] border border-amber-500/15">
          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="text-[8px] font-bold text-amber-300">Mixed drivers</span>
          {si?.user_warning && <span className="text-[8px] text-amber-300/50 truncate">· {si.user_warning}</span>}
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">{dirIcon(dir, "w-3 h-3")}<span className={`text-[7px] font-bold uppercase tracking-widest ${dc.text}`}>{isMixed ? "Mixed" : dir}</span></div>
          {pdm ? (<><p className="text-[7px] text-white/20 mb-0.5">Driver</p><h3 className={`font-semibold text-white/88 leading-snug mb-0.5 ${hero ? "text-[12px]" : "text-[11px]"}`}>{pdm.question ?? pdm.title}</h3><p className="text-[9px] text-white/30">{signal.title}</p></>) : (<h3 className={`font-semibold text-white/88 leading-snug ${hero ? "text-[12px]" : "text-[11px]"}`}>{signal.title}</h3>)}
        </div>
        {sqLabel && <span className="text-[8px] text-white/30 flex-shrink-0">SQ: {sqLabel}</span>}
      </div>
      {(oddsLine ?? signal.odds_move_summary) && <p className="text-[9px] text-blue-300/75 font-medium mb-1.5">{oddsLine ?? signal.odds_move_summary}</p>}
      {signal.summary && <p className="text-[9px] text-white/45 leading-relaxed mb-1.5">{signal.summary}</p>}
      {(bullSectors.length > 0 || bearSectors.length > 0) && (
        <div className={`grid grid-cols-2 gap-1.5 mb-1.5 ${sOp}`}>
          {bullSectors.length > 0 && <div className="rounded bg-emerald-500/[0.05] border border-emerald-500/12 p-1.5">{bullSectors.map(s => <p key={s} className="text-[8px] text-emerald-300/75">{s}</p>)}</div>}
          {bearSectors.length > 0 && <div className="rounded bg-red-500/[0.05] border border-red-500/12 p-1.5">{bearSectors.map(s => <p key={s} className="text-[8px] text-red-300/75">{s}</p>)}</div>}
        </div>
      )}
      {(bullTickers.length > 0 || bearTickers.length > 0) && (
        <div className={`flex gap-2 ${sOp}`}>
          {bullTickers.length > 0 && <div className="flex flex-wrap gap-0.5">{bullTickers.slice(0, 4).map(t => <span key={t} className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/18 text-emerald-400">{t}</span>)}</div>}
          {bearTickers.length > 0 && <div className="flex flex-wrap gap-0.5">{bearTickers.slice(0, 4).map(t => <span key={t} className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-red-500/10 border border-red-500/18 text-red-400">{t}</span>)}</div>}
        </div>
      )}
      {signal.why_it_matters && (
        <>
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-[8px] text-white/20 hover:text-white/45 transition-colors mt-2">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expanded ? "Less" : "Why it matters"}
          </button>
          {expanded && <p className="text-[9px] text-white/35 mt-1.5 leading-relaxed">{signal.why_it_matters}</p>}
        </>
      )}
    </div>
  );
});

type SignalBreakdownTab = "equity" | "regime" | "sectors" | "watchlist" | "themes";

function SignalBreakdown({ overview }: { overview: BackendOverview | null | undefined }) {
  const [open, setOpen]   = useState(false);
  const [tab, setTab]     = useState<SignalBreakdownTab>("equity");

  const signals    = overview?.top_equity_signals ?? [];
  const regime     = transformRegime(overview?.regime_scoreboard);
  const sectors    = transformSectors(overview?.sector_rotation);
  const watchlists = overview ? transformWatchlists(overview) : null;
  const themes     = overview?.theme_clusters ?? [];

  const TABS: { id: SignalBreakdownTab; label: string; count: number }[] = [
    { id: "equity",    label: "Equity",   count: signals.length },
    { id: "regime",    label: "Regime",   count: regime.length  },
    { id: "sectors",   label: "Sectors",  count: sectors.length },
    { id: "watchlist", label: "Watchlist", count: (watchlists?.bullish.length ?? 0) + (watchlists?.bearish.length ?? 0) },
    { id: "themes",    label: "Themes",   count: themes.length  },
  ];

  const SECTOR_CFG = {
    positive: { label: "Positive", text: "text-emerald-400", border: "border-emerald-500/18", bg: "bg-emerald-500/[0.05]" },
    negative: { label: "Negative", text: "text-red-400",     border: "border-red-500/18",     bg: "bg-red-500/[0.05]"     },
    emerging: { label: "Emerging", text: "text-blue-400",    border: "border-blue-500/18",    bg: "bg-blue-500/[0.05]"    },
    fading:   { label: "Fading",   text: "text-amber-400",   border: "border-amber-500/18",   bg: "bg-amber-500/[0.05]"   },
  } as const;

  return (
    <GlassCard className="mb-4">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-3 p-4 group">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] text-white/30 flex-shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-bold text-white/60">Signal Breakdown</h2>
            <p className="text-[9px] text-white/25">Underlying equity, regime, sector, watchlist, and theme evidence</p>
          </div>
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-white/45 transition-colors" />
          : <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/45 transition-colors" />}
      </button>

      {open && (
        <div className="border-t border-white/[0.04]">
          {/* Tab bar */}
          <div className="flex items-center gap-0.5 px-4 pt-3 pb-0 border-b border-white/[0.04] overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[9px] font-bold uppercase tracking-wide transition-colors flex-shrink-0 ${
                  tab === t.id
                    ? "bg-white/[0.06] text-white/80 border border-white/[0.08] border-b-0"
                    : "text-white/25 hover:text-white/50"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[7px] ${tab === t.id ? "text-white/40" : "text-white/15"}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="px-4 py-3">
            {/* Equity Signals */}
            {tab === "equity" && (
              signals.length === 0 ? <Empty text="No equity signals." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {signals.slice(0, 6).map((s, i) => <EquitySignalCard key={s.theme_id ?? i} signal={s} hero={i === 0} />)}
                </div>
              )
            )}

            {/* Regime */}
            {tab === "regime" && (
              regime.length === 0 ? <Empty text="No regime data." /> : (
                <div className="space-y-0">
                  {regime.map(r => {
                    const rd = dirFrom(r.direction ?? r.label);
                    const rdc = dirColors(rd);
                    const pct = Math.min(100, Math.max(0, r.score ?? 50));
                    return (
                      <div key={r.key} className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
                        <div className="w-36 flex-shrink-0">
                          <p className="text-[10px] font-semibold text-white/55">{r.displayName}</p>
                          {r.label && <p className={`text-[8px] ${rdc.text}`}>{r.label.replace(/_/g, " ")}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${rd === "bullish" ? "bg-emerald-400" : rd === "bearish" ? "bg-red-400" : "bg-blue-400"}`} style={{ width: `${pct}%` }} />
                          </div>
                          {r.score != null && <span className="text-[8px] text-white/20 w-6 text-right">{Math.round(r.score)}</span>}
                        </div>
                        <div className="flex items-center gap-1 w-24 justify-end flex-shrink-0">
                          {dirIcon(rd, "w-3 h-3")}
                          <span className={`text-[8px] font-semibold ${rdc.text}`}>{r.direction ?? "—"}</span>
                          {r.confidenceStr && <span className={`text-[7px] ${confidenceColor(undefined, r.confidenceStr)}`}>{confidenceLabel(undefined, r.confidenceStr)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Sectors */}
            {tab === "sectors" && (
              sectors.length === 0 ? <Empty text="No sector data." /> : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  {sectors.map((s, i) => {
                    const cfg = SECTOR_CFG[s.type];
                    return (
                      <div key={s.sector + i} className={`rounded-lg p-2.5 border ${cfg.border} ${cfg.bg}`}>
                        <span className={`text-[7px] font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
                        <p className="text-[10px] font-bold text-white/75 mt-0.5 mb-1">{s.sector}</p>
                        {(s.stocks?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {s.stocks!.map(t => <span key={t} className={`text-[6px] font-mono font-bold px-1 rounded border ${cfg.border} ${cfg.text} bg-black/20`}>{t}</span>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* Watchlist */}
            {tab === "watchlist" && (
              !watchlists || (watchlists.bullish.length + watchlists.bearish.length + watchlists.conditional.length === 0)
                ? <Empty text="No watchlist data." />
                : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {([
                      { title: "Bullish", entries: watchlists.bullish, color: "text-emerald-400" },
                      { title: "Bearish", entries: watchlists.bearish, color: "text-red-400"     },
                      { title: "Conditional", entries: watchlists.conditional, color: "text-amber-400" },
                    ] as const).map(col => (
                      <div key={col.title} className="rounded-xl border border-white/[0.05] bg-white/[0.015] p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className={`text-[9px] font-bold uppercase tracking-wider ${col.color}`}>{col.title}</h4>
                          <span className="text-[7px] text-white/18">{col.entries.length}</span>
                        </div>
                        {col.entries.slice(0, 12).map((e, i) => (
                          <div key={e.ticker + i} className="flex items-center gap-1.5 py-1 border-b border-white/[0.025] last:border-0">
                            <span className={`text-[9px] font-bold font-mono ${col.color}`}>{e.ticker}</span>
                            {(e.sectors?.length ?? 0) > 0 && <span className="text-[7px] text-white/20 truncate">{e.sectors![0]}</span>}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
            )}

            {/* Themes */}
            {tab === "themes" && (
              themes.length === 0 ? <Empty text="No theme data." /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {themes.map((c, i) => {
                    const td = dirColors(dirFrom(c.summary_direction));
                    return (
                      <div key={c.theme_id ?? i} className={`rounded-lg border p-2.5 ${td.border} ${td.bg}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {c.theme_emoji && <span>{c.theme_emoji}</span>}
                          <h4 className="text-[10px] font-bold text-white/78">{c.theme_name}</h4>
                          {c.confidence_score != null && (
                            <span className={`text-[7px] ml-auto ${confidenceColor(c.confidence_score)}`}>
                              {confidenceLabel(c.confidence_score)}
                            </span>
                          )}
                        </div>
                        {c.description && <p className="text-[8px] text-white/38 leading-relaxed line-clamp-2 mb-1">{c.description}</p>}
                        {(c.bullish_stocks?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-0.5">
                            {c.bullish_stocks!.slice(0, 4).map(t => <span key={t} className="text-[7px] font-mono font-bold px-1 rounded bg-emerald-500/10 border border-emerald-500/18 text-emerald-400">{t}</span>)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ProphetikInvestorTab() {
  const { data: overview } = useQuery<BackendOverview>({
    queryKey: ["/api/predict/investor/overview"],
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: intel } = useQuery<IntelligenceResponse>({
    queryKey: ["/api/predict/investor/intelligence"],
    staleTime: 5 * 60_000,
    retry: false,
  });

  const { data: oddsData, refetch: refetchOdds, isFetching: oddsFetching } = useQuery<LiveOddsResponse>({
    queryKey: ["/api/predict/odds/live"],
    staleTime: 2 * 60_000,
    retry: false,
    refetchInterval: 5 * 60_000,
  });

  // ── Normalized odds source ──────────────────────────────────────────────────
  // Priority: intelligence.tracked_odds FIRST (has market_read + exposure)
  //           → live odds (polymarket, no exposure) → empty
  // odds/live returning {} or odds:[] must NEVER block rendering when
  // intelligence.tracked_odds has rows.
  const trackedRows: TrackedOddsItem[] = intel?.tracked_odds ?? [];
  const liveRows: LiveOddsItem[]       = oddsData?.odds ?? [];

  const oddsRows: (LiveOddsItem | TrackedOddsItem)[] =
    trackedRows.length > 0 ? trackedRows :
    liveRows.length > 0    ? liveRows :
    [];

  const oddsSource: OddsSourceType =
    trackedRows.length > 0 ? "intelligence" :
    liveRows.length > 0    ? "live" :
    "none";

  const STALE_STATUSES = ["lkg", "stale_db", "stale"] as const;
  const oddsStale = oddsSource === "live" &&
    STALE_STATUSES.includes((oddsData?.status ?? "") as typeof STALE_STATUSES[number]);

  const trackedCount = intel?.tracked_odds?.length ?? oddsData?.tracked_count ?? 0;
  const liveCount    = oddsData?.live_count ?? 0;

  // ── Debug log (validation per spec) ─────────────────────────────────────────
  useEffect(() => {
    console.log("[ProphetikInvestor] odds diagnostics", {
      "oddsLive.status":              oddsData?.status ?? "pending",
      "oddsLive.odds.length":         liveRows.length,
      "intelligence.tracked_odds.length": trackedRows.length,
      "oddsRows.length":              oddsRows.length,
      "oddsSource":                   oddsSource,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oddsData, intel]);

  return (
    <div className="pb-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] text-white/25">
          Live prediction market odds → market reads → equity signal breakdown
        </p>
        <div className="flex items-center gap-2">
          {overview?.generated_at && (
            <span className="text-[8px] text-white/18">
              Overview {new Date(overview.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => refetchOdds()}
            disabled={oddsFetching}
            className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] transition-colors disabled:opacity-40"
            title="Refresh odds"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/35 ${oddsFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <MarketImpactCommandCenter
        oddsRows={oddsRows}
        oddsSource={oddsSource}
        oddsStale={oddsStale}
        trackedCount={trackedCount}
        liveCount={liveCount}
        cacheAgeSec={oddsData?.cache_age_seconds}
      />
      <EventImpactLedger oddsRows={oddsRows} oddsSource={oddsSource} intel={intel} />
      <SignalBreakdown overview={overview} />
    </div>
  );
}
