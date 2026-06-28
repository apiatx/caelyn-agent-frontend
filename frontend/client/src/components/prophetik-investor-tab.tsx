import { useState, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/ui/glass-card";
import {
  TrendingUp, TrendingDown, AlertTriangle, RefreshCw,
  Building2, BarChart3, Globe2, Layers, Zap, ChevronDown,
  ChevronRight, CircleDot, ArrowUpRight, ArrowDownRight,
  Minus, Activity, X, Radio,
} from "lucide-react";

// ─── Overview backend types ───────────────────────────────────────────────────

interface BackendDriverMarket {
  condition_id?: string; question?: string; title?: string; outcome_label?: string;
  current_odds?: number; current_probability?: number; current_probability_pct?: number;
  current_odds_label?: string | number; yes_pct?: number; probability?: number;
  delta_24h_pp?: number; delta_7d_pp?: number; direction?: string;
  semantic_event_type?: string; event_type?: string; equity_regime_read?: string;
  polarity?: string; contribution_score?: number;
}
interface BackendSignalIntegrity {
  has_polarity_conflict?: boolean; has_mixed_semantics?: boolean;
  warning?: string; user_warning?: string;
}
interface BackendSupportingMarket {
  condition_id?: string; question?: string; yes_pct?: number;
  price_change_1d?: number; price_change_1wk?: number;
  volume_24h?: number; composite_score?: number; equity_relevance_score?: number;
}
interface BackendEquitySignal {
  theme_id?: string; title: string; summary?: string; why_it_matters?: string;
  supporting_markets?: BackendSupportingMarket[]; market_count?: number;
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
  label?: string; score?: number; direction?: string;
  confidence?: string; supporting_themes?: string[];
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
  watchlist_notes?: string[];
}
interface BackendThemeCluster {
  theme_id?: string; theme_name: string; theme_emoji?: string;
  description?: string; supporting_markets?: BackendSupportingMarket[];
  market_count?: number; weighted_odds_shift_24h?: number;
  weighted_odds_shift_7d?: number; weighted_volume?: number;
  confidence_score?: number; consistency_score?: number;
  contradiction_score?: number; freshness_score?: number;
  regime_signal_strength?: number; summary_direction?: string;
  avg_equity_relevance?: number; bullish_stocks?: string[]; bearish_stocks?: string[];
  asset_baskets?: string[]; regime_implications?: string; narrative?: string;
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

// ─── Odds/live backend types ──────────────────────────────────────────────────

interface LiveOddsItem {
  family_key: string; label: string; category?: string;
  yes_probability?: number;  // 0-1
  delta_24h_pp?: number; delta_7d_pp?: number;
  volume_24h?: number; dashboard_enabled?: boolean;
  priority?: number; source?: string; status?: string;
  market_question?: string; candidate_count?: number;
}
interface LiveOddsResponse {
  updated_at?: string; scanned_at?: string;
  cache_age_seconds?: number; live_count?: number;
  tracked_count?: number; total_families?: number;
  matched_families?: number; status?: string;
  odds?: LiveOddsItem[];
  missing_families?: unknown[];
  diagnostics?: Record<string, unknown>;
}
interface OddsHistoryPoint { timestamp?: string; yes_probability?: number; volume_24h?: number; }
interface OddsHistoryResponse {
  family_key?: string; label?: string; category?: string;
  days?: number; point_count?: number; points?: OddsHistoryPoint[];
}

// ─── Intelligence types ───────────────────────────────────────────────────────

interface IntelTickerImpacts {
  bullish_watchlist?: string[]; bearish_watchlist?: string[];
  conditional_watchlist?: string[]; bullish_fallback?: string[]; bearish_fallback?: string[];
}
interface IntelDriverMarket { question?: string; yes_pct?: number; delta_24h_pp?: number; delta_7d_pp?: number; }
interface IntelThemeImpact { sector?: string; theme?: string; direction?: string; confidence?: string; }
interface IntelEquitySignal {
  event_family_key?: string; title: string; primary_category?: string;
  yes_probability?: number; delta_24h_pp?: number; delta_7d_pp?: number;
  direction?: string; signal_quality?: string; why_it_matters?: string;
  driver_markets?: IntelDriverMarket[]; theme_impacts?: IntelThemeImpact[];
  ticker_impacts?: IntelTickerImpacts; conflicts?: string[]; market_count?: number;
}
interface IntelligenceResponse { updated_at?: string; equity_signals?: IntelEquitySignal[]; tracked_odds?: unknown[]; }

// ─── Unified ledger row ───────────────────────────────────────────────────────

interface LedgerRow {
  source: "odds" | "intel";
  family_key: string;
  label: string;
  category?: string;
  yes_probability?: number;
  delta_24h_pp?: number;
  delta_7d_pp?: number;
  direction?: string;
  signal_quality?: string;
  ticker_impacts?: IntelTickerImpacts;
  theme_impacts?: IntelThemeImpact[];
  driver_markets?: IntelDriverMarket[];
  volume_24h?: number;
  market_question?: string;
  conflicts?: string[];
  priority?: number;
}

// ─── View-model types ─────────────────────────────────────────────────────────

interface RegimeRow { key: string; displayName: string; label?: string; score?: number; direction?: string; confidenceStr?: string; }
interface SectorSignal { sector: string; type: "positive" | "negative" | "emerging" | "fading"; stocks?: string[]; mentions?: number; }
interface WatchlistEntry { ticker: string; themes?: string[]; sectors?: string[]; direction: "bullish" | "bearish" | "conditional"; note?: string; }

// ─── Transforms ──────────────────────────────────────────────────────────────

const REGIME_NAMES: Record<string, string> = {
  risk_on_vs_risk_off: "Risk On / Risk Off",
  inflationary_vs_disinflationary: "Inflation / Disinflation",
  growth_vs_slowdown: "Growth / Slowdown",
  geopolitical_stress_vs_easing: "Geopolitical Stress",
  higher_for_longer_vs_easing: "Higher-for-Longer",
  commodity_pressure_vs_relief: "Commodity Pressure",
  ai_capex_supportive_vs_restrictive: "AI Capex / Restrictive",
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
  (sr.strongest_positive_sectors ?? []).forEach(e => out.push({ sector: e.sector, type: "positive", stocks: e.stocks, mentions: e.mentions }));
  (sr.strongest_negative_sectors ?? []).forEach(e => out.push({ sector: e.sector, type: "negative", stocks: e.stocks, mentions: e.mentions }));
  (sr.emerging_leadership ?? []).forEach(e => out.push({ sector: e.sector, type: "emerging", stocks: e.stocks }));
  (sr.fading_leadership ?? []).forEach(e => out.push({ sector: e.sector, type: "fading", stocks: e.stocks }));
  return out;
}
function transformWatchlists(wl?: BackendWatchlists) {
  const mapItem = (item: BackendWatchlistItem, dir: "bullish" | "bearish" | "conditional"): WatchlistEntry => ({
    ticker: item.ticker, themes: item.themes ?? item.bullish_themes ?? item.bearish_themes,
    sectors: item.sectors, direction: dir, note: item.note,
  });
  return {
    bullish:     (wl?.bullish_watchlist     ?? []).map(i => mapItem(i, "bullish")),
    bearish:     (wl?.bearish_watchlist     ?? []).map(i => mapItem(i, "bearish")),
    conditional: (wl?.conditional_watchlist ?? []).map(i => mapItem(i, "conditional")),
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtPP(v?: number | null): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}pp`;
}
function fmtPPColor(v?: number | null): string {
  if (v == null) return "text-white/25";
  return v >= 0 ? "text-emerald-400" : "text-red-400";
}
function fmtPct(v: number): string { return `${v.toFixed(1)}%`; }
function fmtVol(v?: number | null): string {
  if (v == null) return "—";
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function dirFrom(dir?: string, summaryDir?: string): "bullish" | "bearish" | "neutral" {
  const d = (dir ?? summaryDir ?? "").toLowerCase();
  if (d.includes("bull") || d === "rising" || d.includes("support") || d.includes("easing") || d.includes("growth") || d.includes("disinflat")) return "bullish";
  if (d.includes("bear") || d === "falling" || d.includes("stress") || d.includes("slowdown") || d.includes("pressure") || d.includes("longer")) return "bearish";
  return "neutral";
}
function dirColors(dir: "bullish" | "bearish" | "neutral") {
  if (dir === "bullish") return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (dir === "bearish") return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
  return { text: "text-white/40", bg: "bg-white/[0.04]", border: "border-white/[0.08]" };
}
function dirIcon(dir: "bullish" | "bearish" | "neutral", cls = "w-3.5 h-3.5") {
  if (dir === "bullish") return <TrendingUp className={`${cls} text-emerald-400`} />;
  if (dir === "bearish") return <TrendingDown className={`${cls} text-red-400`} />;
  return <Minus className={`${cls} text-white/30`} />;
}
function confidenceLabel(score?: number, str?: string): string {
  if (str === "high"   || (score != null && score >= 75)) return "High";
  if (str === "medium" || (score != null && score >= 50)) return "Moderate";
  if (str === "low"    || (score != null && score < 50))  return "Low";
  return "";
}
function confidenceColor(score?: number, str?: string): string {
  const l = confidenceLabel(score, str);
  if (l === "High") return "text-emerald-400";
  if (l === "Moderate") return "text-blue-400";
  if (l === "Low") return "text-amber-400";
  return "text-white/30";
}
function resolveOddsNum(m: BackendDriverMarket): number | null {
  const raw = m.current_probability_pct ?? m.current_odds ?? m.current_probability ?? m.yes_pct ?? m.probability;
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : parseFloat(raw as string);
  if (isNaN(n)) return null;
  return n >= 0 && n <= 1 ? n * 100 : n;
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Skel({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.05] ${className}`} />;
}
function SecHeader({ icon, title, subtitle, right }: { icon: React.ReactNode; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">{icon}</div>
      <div className="flex-1"><h2 className="text-sm font-bold text-white">{title}</h2>{subtitle && <p className="text-[10px] text-white/30">{subtitle}</p>}</div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="flex items-center justify-center py-8"><p className="text-[11px] text-white/20 italic">{text}</p></div>;
}

// ─── SECTION 1: Market Impact Command Center ──────────────────────────────────

function OddsCard({ item }: { item: LiveOddsItem }) {
  const pct = item.yes_probability != null ? item.yes_probability * 100 : null;
  const d24 = item.delta_24h_pp;
  const d7  = item.delta_7d_pp;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-white/85 leading-tight">{item.label}</p>
        {item.category && <p className="text-[9px] text-white/30 mt-0.5">{item.category}</p>}
      </div>
      <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
        <span className="text-[17px] font-bold tabular-nums text-white/90">
          {pct != null ? fmtPct(pct) : "—"}
        </span>
        <div className="flex items-center gap-2">
          {d24 != null && <span className={`text-[9px] font-mono ${fmtPPColor(d24)}`}>{fmtPP(d24)} 24h</span>}
          {d7  != null && <span className={`text-[9px] font-mono ${fmtPPColor(d7)}`}>{fmtPP(d7)} 7d</span>}
        </div>
      </div>
      {item.volume_24h != null && (
        <span className="text-[8px] text-white/20 flex-shrink-0 w-12 text-right">{fmtVol(item.volume_24h)}</span>
      )}
    </div>
  );
}

function MarketImpactCommandCenter({ oddsData }: { oddsData: LiveOddsResponse | null | undefined }) {
  const isWarming = !oddsData || oddsData.status === "warming";
  const liveCount = oddsData?.live_count ?? 0;
  const trackedCount = oddsData?.tracked_count ?? 0;

  const liveOdds: LiveOddsItem[] = (() => {
    if (!oddsData?.odds?.length) return [];
    return [...oddsData.odds]
      .sort((a, b) => {
        const pa = a.priority ?? 99, pb = b.priority ?? 99;
        if (pa !== pb) return pa - pb;
        return Math.abs(b.delta_24h_pp ?? 0) - Math.abs(a.delta_24h_pp ?? 0);
      })
      .slice(0, 8);
  })();

  return (
    <GlassCard className="p-5 mb-5">
      <SecHeader
        icon={<Radio className="w-4 h-4" />}
        title="Market Impact Command Center"
        subtitle="Live prediction market odds — macro, political, economic themes"
        right={
          <div className="flex items-center gap-2 text-[9px]">
            {isWarming ? (
              <span className="flex items-center gap-1 text-amber-400/60">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse" />
                Warming
              </span>
            ) : liveCount > 0 ? (
              <span className="flex items-center gap-1 text-emerald-400/60">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                {liveCount} live
              </span>
            ) : null}
            <span className="text-white/20">{trackedCount} tracked</span>
          </div>
        }
      />

      {isWarming && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-blue-400/20 border-t-blue-400/60 animate-spin" />
          <div>
            <p className="text-[12px] font-semibold text-white/35">Prediction odds warming…</p>
            <p className="text-[10px] text-white/20 mt-1">{trackedCount} families tracked · cache initializing</p>
          </div>
        </div>
      )}

      {!isWarming && liveOdds.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <CircleDot className="w-5 h-5 text-white/15" />
          <p className="text-[11px] text-white/30">No live market-relevant odds found</p>
          <p className="text-[9px] text-white/20">{trackedCount} families tracked · no live markets matched yet</p>
        </div>
      )}

      {liveOdds.length > 0 && (
        <div>
          {liveOdds.map(o => <OddsCard key={o.family_key} item={o} />)}
          {oddsData?.updated_at && (
            <p className="text-[8px] text-white/15 mt-3">
              Updated {new Date(oddsData.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              {oddsData.cache_age_seconds != null && ` · ${Math.round(oddsData.cache_age_seconds / 60)}m cache`}
            </p>
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

function DetailDrawer({ row, onClose }: { row: LedgerRow | null; onClose: () => void }) {
  const { data: history } = useQuery<OddsHistoryResponse>({
    queryKey: ["odds-history", row?.family_key],
    queryFn: () => fetchOddsHistory(row!.family_key, 7),
    enabled: !!row?.family_key && row?.source === "odds",
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!row) return null;

  const pct = row.yes_probability != null ? row.yes_probability * 100 : null;
  const dir = dirFrom(row.direction);
  const dc  = dirColors(dir);
  const bullTickers = [...(row.ticker_impacts?.bullish_watchlist ?? []), ...(row.ticker_impacts?.bullish_fallback ?? [])].slice(0, 6);
  const bearTickers = [...(row.ticker_impacts?.bearish_watchlist ?? []), ...(row.ticker_impacts?.bearish_fallback ?? [])].slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="relative w-full max-w-md h-full bg-[#0c0e14] border-l border-white/[0.08] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0c0e14] border-b border-white/[0.06] px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {dirIcon(dir, "w-3.5 h-3.5")}
              <span className={`text-[9px] font-bold uppercase tracking-widest ${dc.text}`}>{dir}</span>
              {row.category && <span className="text-[9px] text-white/30">{row.category}</span>}
            </div>
            <h3 className="text-sm font-bold text-white/90 leading-snug">{row.label}</h3>
            {row.family_key && (
              <p className="text-[9px] text-white/20 font-mono mt-0.5">{row.family_key}</p>
            )}
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Odds strip */}
          <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex-1 text-center">
              <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Odds (YES)</p>
              <p className="text-2xl font-bold text-white/90">{pct != null ? fmtPct(pct) : "—"}</p>
            </div>
            {row.delta_24h_pp != null && (
              <div className="flex-1 text-center border-l border-white/[0.06]">
                <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">24h Δ</p>
                <p className={`text-lg font-bold ${fmtPPColor(row.delta_24h_pp)}`}>{fmtPP(row.delta_24h_pp)}</p>
              </div>
            )}
            {row.delta_7d_pp != null && (
              <div className="flex-1 text-center border-l border-white/[0.06]">
                <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">7d Δ</p>
                <p className={`text-lg font-bold ${fmtPPColor(row.delta_7d_pp)}`}>{fmtPP(row.delta_7d_pp)}</p>
              </div>
            )}
            {row.volume_24h != null && (
              <div className="flex-1 text-center border-l border-white/[0.06]">
                <p className="text-[9px] text-white/25 uppercase tracking-wider mb-0.5">Volume</p>
                <p className="text-sm font-bold text-white/60">{fmtVol(row.volume_24h)}</p>
              </div>
            )}
          </div>

          {/* History */}
          {row.source === "odds" && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-2">7-Day History</p>
              {!history && (
                <div className="space-y-1">
                  {[...Array(3)].map((_, i) => <Skel key={i} className="h-5 rounded" />)}
                </div>
              )}
              {history && (!history.points?.length) && (
                <p className="text-[10px] text-white/20 italic">No history data yet — spine is initializing</p>
              )}
              {(history?.points?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  {history!.points!.slice(-7).reverse().map((pt, i) => {
                    const ts = pt.timestamp ? new Date(pt.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `Day ${i + 1}`;
                    const p = pt.yes_probability != null ? pt.yes_probability * 100 : null;
                    return (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <span className="text-white/30 w-14 flex-shrink-0">{ts}</span>
                        <div className="flex-1 h-1 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400/60 rounded-full" style={{ width: `${p ?? 0}%` }} />
                        </div>
                        <span className="text-white/50 font-mono w-10 text-right flex-shrink-0">
                          {p != null ? fmtPct(p) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Driver markets */}
          {(row.driver_markets?.length ?? 0) > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-2">Driver Markets</p>
              <div className="space-y-1.5">
                {row.driver_markets!.slice(0, 4).map((dm, i) => {
                  const dp = dm.yes_pct;
                  return (
                    <div key={i} className="flex items-start gap-2 text-[10px]">
                      <CircleDot className="w-2.5 h-2.5 text-white/15 flex-shrink-0 mt-0.5" />
                      <span className="text-white/45 flex-1 leading-snug">{dm.question ?? "—"}</span>
                      {dp != null && <span className="text-white/50 font-mono flex-shrink-0">{dp.toFixed(1)}%</span>}
                      {dm.delta_24h_pp != null && <span className={`font-mono flex-shrink-0 ${fmtPPColor(dm.delta_24h_pp)}`}>{fmtPP(dm.delta_24h_pp)}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sector/Theme impacts */}
          {(row.theme_impacts?.length ?? 0) > 0 && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-2">Sector / Theme Exposure</p>
              <div className="flex flex-wrap gap-1.5">
                {row.theme_impacts!.map((t, i) => {
                  const td = dirColors(dirFrom(t.direction));
                  return (
                    <span key={i} className={`text-[9px] px-2 py-0.5 rounded-lg border ${td.border} ${td.bg} ${td.text}`}>
                      {t.sector ?? t.theme}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tickers */}
          {(bullTickers.length > 0 || bearTickers.length > 0) && (
            <div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-white/25 mb-2">Watchlist Exposure</p>
              <div className="flex gap-4">
                {bullTickers.length > 0 && (
                  <div>
                    <p className="text-[8px] text-emerald-400/50 font-semibold mb-1">Bullish</p>
                    <div className="flex flex-wrap gap-1">
                      {bullTickers.map(t => <span key={t} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>)}
                    </div>
                  </div>
                )}
                {bearTickers.length > 0 && (
                  <div>
                    <p className="text-[8px] text-red-400/50 font-semibold mb-1">Bearish</p>
                    <div className="flex flex-wrap gap-1">
                      {bearTickers.map(t => <span key={t} className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Conflicts */}
          {(row.conflicts?.length ?? 0) > 0 && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
              <p className="text-[8px] font-bold uppercase tracking-widest text-amber-400/60 mb-1">Conflicts</p>
              {row.conflicts!.map((c, i) => <p key={i} className="text-[10px] text-amber-300/60">{c}</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function qualityBadge(q?: string) {
  if (!q) return null;
  const cls = q.toLowerCase() === "high" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
    : q.toLowerCase() === "moderate" ? "text-blue-400 bg-blue-500/10 border-blue-500/25"
    : "text-amber-400 bg-amber-500/10 border-amber-500/25";
  return <span className={`text-[8px] font-bold px-1 py-0.5 rounded border ${cls}`}>{q.charAt(0).toUpperCase() + q.slice(1)}</span>;
}

function EventImpactLedger({
  oddsData,
  intelSignals,
}: {
  oddsData: LiveOddsResponse | null | undefined;
  intelSignals: IntelEquitySignal[];
}) {
  const [selected, setSelected] = useState<LedgerRow | null>(null);

  const rows: LedgerRow[] = (() => {
    const out: LedgerRow[] = [];
    const seenKeys = new Set<string>();

    // Primary: live odds
    const liveOdds = oddsData?.odds ?? [];
    for (const o of liveOdds) {
      if (!o.family_key) continue;
      seenKeys.add(o.family_key);
      out.push({
        source: "odds",
        family_key: o.family_key,
        label: o.label,
        category: o.category,
        yes_probability: o.yes_probability,
        delta_24h_pp: o.delta_24h_pp,
        delta_7d_pp: o.delta_7d_pp,
        volume_24h: o.volume_24h,
        market_question: o.market_question,
        priority: o.priority,
      });
    }

    // Additive: intelligence signals not already in odds
    for (const s of intelSignals) {
      const key = s.event_family_key ?? s.title;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      out.push({
        source: "intel",
        family_key: key,
        label: s.title,
        category: s.primary_category,
        yes_probability: s.yes_probability,
        delta_24h_pp: s.delta_24h_pp,
        delta_7d_pp: s.delta_7d_pp,
        direction: s.direction,
        signal_quality: s.signal_quality,
        ticker_impacts: s.ticker_impacts,
        theme_impacts: s.theme_impacts,
        driver_markets: s.driver_markets,
        conflicts: s.conflicts,
      });
    }

    return out.sort((a, b) => {
      const pa = a.priority ?? 99, pb = b.priority ?? 99;
      if (pa !== pb) return pa - pb;
      return Math.abs(b.delta_24h_pp ?? 0) - Math.abs(a.delta_24h_pp ?? 0);
    });
  })();

  const isWarming = !oddsData || oddsData.status === "warming";

  return (
    <>
      <GlassCard className="p-5 mb-5">
        <SecHeader
          icon={<Activity className="w-4 h-4" />}
          title="Event Impact Ledger"
          subtitle="Prediction market events with equity implications — click row for detail"
        />

        {isWarming && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <div className="w-6 h-6 rounded-full border-2 border-blue-400/20 border-t-blue-400/50 animate-spin" />
            <p className="text-[11px] text-white/30">Odds warming — showing available intelligence signals</p>
          </div>
        )}

        {rows.length === 0 && !isWarming && (
          <Empty text="No events available. Check back as the odds spine initializes." />
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Event / Family", "Cat", "Odds", "24h Δ", "7d Δ", "Dir", "Tickers", "Quality"].map(h => (
                    <th key={h} className="text-left text-[8px] font-bold uppercase tracking-wider text-white/20 pb-2 pr-3 last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const pct = row.yes_probability != null ? row.yes_probability * 100 : null;
                  const dir = dirFrom(row.direction);
                  const dc  = dirColors(dir);
                  const bullT = [...(row.ticker_impacts?.bullish_watchlist ?? []), ...(row.ticker_impacts?.bullish_fallback ?? [])].slice(0, 3);
                  const bearT = [...(row.ticker_impacts?.bearish_watchlist ?? []), ...(row.ticker_impacts?.bearish_fallback ?? [])].slice(0, 3);
                  return (
                    <tr
                      key={row.family_key}
                      className="border-b border-white/[0.03] hover:bg-white/[0.025] transition-colors cursor-pointer"
                      onClick={() => setSelected(row)}
                    >
                      <td className="py-2 pr-3 max-w-[200px]">
                        <p className="text-[11px] font-semibold text-white/80 leading-tight truncate">{row.label}</p>
                        {row.source === "intel" && (
                          <span className="text-[7px] text-blue-400/50 font-mono">intel</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="text-[8px] text-white/35 leading-tight">{row.category ?? "—"}</span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="text-[14px] font-bold tabular-nums text-white/90">
                          {pct != null ? fmtPct(pct) : "—"}
                        </span>
                      </td>
                      <td className={`py-2 pr-3 font-mono text-[10px] ${fmtPPColor(row.delta_24h_pp)}`}>{fmtPP(row.delta_24h_pp)}</td>
                      <td className={`py-2 pr-3 font-mono text-[10px] ${fmtPPColor(row.delta_7d_pp)}`}>{fmtPP(row.delta_7d_pp)}</td>
                      <td className="py-2 pr-3">
                        {row.direction ? (
                          <span className={`text-[9px] font-bold uppercase ${dc.text}`}>{dir}</span>
                        ) : <span className="text-white/15">—</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap gap-0.5">
                          {bullT.map(t => <span key={t} className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>)}
                          {bearT.map(t => <span key={t} className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{t}</span>)}
                          {bullT.length === 0 && bearT.length === 0 && <span className="text-white/15">—</span>}
                        </div>
                      </td>
                      <td className="py-2">{qualityBadge(row.signal_quality)}</td>
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

// ─── Raw Legacy sub-components (for Raw Legacy panel) ─────────────────────────

const EquitySignalCard = memo(function EquitySignalCard({ signal, hero = false }: { signal: BackendEquitySignal; hero?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const pdm = signal.primary_driver_market;
  const si  = signal.signal_integrity;
  const dir = dirFrom(signal.summary_direction);
  const dc  = dirColors(dir);
  const isMixed = !!(si?.has_polarity_conflict || si?.has_mixed_semantics) || signal.display_impact_mode === "mixed";
  const isMixedMode = isMixed && !signal.headline_bullish_sectors?.length && !signal.headline_bearish_sectors?.length;
  const sqLabel = signal.signal_quality_label ?? confidenceLabel(signal.confidence_score, signal.confidence);
  const bullSectors = signal.headline_bullish_sectors?.length ? signal.headline_bullish_sectors : (isMixedMode ? [] : (signal.bullish_sectors ?? []));
  const bearSectors = signal.headline_bearish_sectors?.length ? signal.headline_bearish_sectors : (isMixedMode ? [] : (signal.bearish_sectors ?? []));
  const bullTickers = signal.headline_bullish_tickers?.length  ? signal.headline_bullish_tickers  : (isMixedMode ? [] : (signal.bullish_stocks ?? []));
  const bearTickers = signal.headline_bearish_tickers?.length  ? signal.headline_bearish_tickers  : (isMixedMode ? [] : (signal.bearish_stocks ?? []));
  const sectorOpacity = (isMixed && !signal.headline_bullish_sectors?.length) ? "opacity-40" : "";
  const hasExpanded = !!(signal.why_it_matters || (signal.driver_markets?.length ?? 0) > 0);
  let oddsLine: string | undefined;
  if (pdm) {
    const n = resolveOddsNum(pdm);
    if (n != null) oddsLine = `${n.toFixed(1)}% ${pdm.outcome_label ?? ""} — ${fmtPP(pdm.delta_24h_pp)} today`;
  }

  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.02] hover:border-white/[0.12] transition-all p-4 ${hero ? "col-span-full border-blue-500/20" : ""}`}>
      {isMixed && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg bg-amber-500/[0.07] border border-amber-500/20">
          <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="text-[9px] font-bold text-amber-300">Mixed drivers</span>
          {si?.user_warning && <span className="text-[9px] text-amber-300/50 truncate">· {si.user_warning}</span>}
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">{dirIcon(dir, "w-3 h-3")}<span className={`text-[8px] font-bold uppercase tracking-widest ${dc.text}`}>{isMixed ? "Mixed" : dir}</span></div>
          {pdm ? (<><p className="text-[8px] text-white/25 mb-0.5">Driver</p><h3 className={`font-semibold text-white/90 leading-snug mb-0.5 ${hero ? "text-sm" : "text-[12px]"}`}>{pdm.question ?? pdm.title}</h3><p className="text-[9px] text-white/35">{signal.title}</p></>) : (<h3 className={`font-semibold text-white/90 leading-snug ${hero ? "text-sm" : "text-[12px]"}`}>{signal.title}</h3>)}
        </div>
        {sqLabel && <span className="text-[9px] text-white/40 flex-shrink-0">SQ: {sqLabel}</span>}
      </div>
      {(oddsLine ?? signal.odds_move_summary) && <p className="text-[10px] text-blue-300/80 font-medium mb-2">{oddsLine ?? signal.odds_move_summary}</p>}
      {signal.summary && <p className="text-[10px] text-white/50 leading-relaxed mb-2">{signal.summary}</p>}
      {(bullSectors.length > 0 || bearSectors.length > 0) && (
        <div className={`grid grid-cols-2 gap-2 mb-2 ${sectorOpacity}`}>
          {bullSectors.length > 0 && <div className="rounded bg-emerald-500/[0.06] border border-emerald-500/15 p-2">{bullSectors.map(s => <p key={s} className="text-[9px] text-emerald-300/80">{s}</p>)}</div>}
          {bearSectors.length > 0 && <div className="rounded bg-red-500/[0.06] border border-red-500/15 p-2">{bearSectors.map(s => <p key={s} className="text-[9px] text-red-300/80">{s}</p>)}</div>}
        </div>
      )}
      {(bullTickers.length > 0 || bearTickers.length > 0) && (
        <div className={`flex gap-3 mb-2 ${sectorOpacity}`}>
          {bullTickers.length > 0 && <div className="flex-1"><div className="flex flex-wrap gap-1">{bullTickers.map(t => <span key={t} className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>)}</div></div>}
          {bearTickers.length > 0 && <div className="flex-1"><div className="flex flex-wrap gap-1">{bearTickers.map(t => <span key={t} className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">{t}</span>)}</div></div>}
        </div>
      )}
      {hasExpanded && (
        <>
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors mt-1">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {expanded ? "Less" : "Supporting markets"}
          </button>
          {expanded && signal.why_it_matters && <p className="text-[10px] text-white/40 mt-2 leading-relaxed">{signal.why_it_matters}</p>}
        </>
      )}
    </div>
  );
});

function RawLegacyPanel({ overview }: { overview: BackendOverview | null | undefined }) {
  const [open, setOpen] = useState(false);

  const signals    = overview?.top_equity_signals ?? [];
  const regime     = transformRegime(overview?.regime_scoreboard);
  const sectors    = transformSectors(overview?.sector_rotation);
  const watchlists = overview?.watchlists ? transformWatchlists(overview.watchlists) : null;
  const themes     = overview?.theme_clusters ?? [];

  const SECTOR_CFG = {
    positive: { label: "Positive", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    negative: { label: "Negative", text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
    emerging: { label: "Emerging", text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    fading:   { label: "Fading",   text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  } as const;

  return (
    <GlassCard className="mb-5">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between gap-3 p-5 group">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/[0.04] text-white/30 flex-shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h2 className="text-sm font-bold text-white/60">Raw Legacy Signals / Debug</h2>
            <p className="text-[10px] text-white/25">
              Overview signals — {signals.length} equity, {regime.length} regime, {sectors.length} sector, {themes.length} theme
            </p>
          </div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors" /> : <ChevronRight className="w-4 h-4 text-white/25 group-hover:text-white/50 transition-colors" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-white/[0.04] pt-4">
          {/* Top Equity Signals */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <h3 className="text-[11px] font-bold text-white/60">Top Equity Signals</h3>
            </div>
            {signals.length === 0 ? <Empty text="No equity signals." /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {signals.slice(0, 6).map((s, i) => <EquitySignalCard key={s.theme_id ?? i} signal={s} hero={i === 0} />)}
              </div>
            )}
          </div>

          {/* Regime Scoreboard */}
          <div>
            <div className="flex items-center gap-2 mb-3"><Globe2 className="w-3.5 h-3.5 text-blue-400" /><h3 className="text-[11px] font-bold text-white/60">Regime Scoreboard</h3></div>
            {regime.length === 0 ? <Empty text="No regime data." /> : (
              <div className="space-y-0">
                {regime.map(r => {
                  const rd = dirFrom(r.direction, r.label);
                  const rdc = dirColors(rd);
                  const pct = Math.min(100, Math.max(0, r.score ?? 50));
                  return (
                    <div key={r.key} className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0">
                      <div className="w-36 flex-shrink-0"><p className="text-[10px] font-semibold text-white/60">{r.displayName}</p>{r.label && <p className={`text-[9px] ${rdc.text}`}>{r.label.replace(/_/g, " ")}</p>}</div>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rd === "bullish" ? "bg-emerald-400" : rd === "bearish" ? "bg-red-400" : "bg-blue-400"}`} style={{ width: `${pct}%` }} />
                        </div>
                        {r.score != null && <span className="text-[9px] text-white/25 w-7 text-right">{Math.round(r.score)}</span>}
                      </div>
                      <div className="flex items-center gap-1 w-24 justify-end flex-shrink-0">
                        {dirIcon(rd, "w-3 h-3")}
                        <span className={`text-[9px] font-semibold ${rdc.text}`}>{r.direction ?? "—"}</span>
                        {r.confidenceStr && <span className={`text-[8px] font-bold ${confidenceColor(undefined, r.confidenceStr)}`}>{confidenceLabel(undefined, r.confidenceStr)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sector Rotation */}
          <div>
            <div className="flex items-center gap-2 mb-3"><Layers className="w-3.5 h-3.5 text-blue-400" /><h3 className="text-[11px] font-bold text-white/60">Sector Rotation Signals</h3></div>
            {sectors.length === 0 ? <Empty text="No sector data." /> : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {sectors.map((s, i) => {
                  const cfg = SECTOR_CFG[s.type];
                  return (
                    <div key={s.sector + i} className={`rounded-xl p-3 border ${cfg.border} ${cfg.bg}`}>
                      <span className={`text-[7px] font-bold uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
                      <p className="text-[11px] font-bold text-white/80 mt-1 mb-2">{s.sector}</p>
                      {(s.stocks?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {s.stocks!.map(t => <span key={t} className={`text-[7px] font-mono font-bold px-1 rounded border ${cfg.border} ${cfg.text} bg-black/20`}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stock Watchlists */}
          <div>
            <div className="flex items-center gap-2 mb-3"><Building2 className="w-3.5 h-3.5 text-blue-400" /><h3 className="text-[11px] font-bold text-white/60">Stock Watchlists</h3></div>
            {!watchlists || (watchlists.bullish.length + watchlists.bearish.length + watchlists.conditional.length === 0) ? <Empty text="No watchlist data." /> : (
              <div className="grid grid-cols-3 gap-3">
                {([
                  { title: "Bullish", entries: watchlists.bullish, color: "text-emerald-400" },
                  { title: "Bearish", entries: watchlists.bearish, color: "text-red-400" },
                  { title: "Conditional", entries: watchlists.conditional, color: "text-amber-400" },
                ] as const).map(col => (
                  <div key={col.title} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-[10px] font-bold uppercase tracking-wider ${col.color}`}>{col.title}</h4>
                      <span className="text-[8px] text-white/20">{col.entries.length}</span>
                    </div>
                    {col.entries.slice(0, 10).map((e, i) => (
                      <div key={e.ticker + i} className="flex items-center gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                        <span className={`text-[10px] font-bold font-mono ${col.color}`}>{e.ticker}</span>
                        {(e.sectors?.length ?? 0) > 0 && <span className="text-[8px] text-white/25 truncate">{e.sectors![0]}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Theme Clusters */}
          <div>
            <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-3.5 h-3.5 text-blue-400" /><h3 className="text-[11px] font-bold text-white/60">Theme Clusters</h3></div>
            {themes.length === 0 ? <Empty text="No theme data." /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {themes.map((c, i) => {
                  const td = dirColors(dirFrom(c.summary_direction));
                  return (
                    <div key={c.theme_id ?? i} className={`rounded-xl border p-3 ${td.border} ${td.bg}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        {c.theme_emoji && <span>{c.theme_emoji}</span>}
                        <h4 className="text-[11px] font-bold text-white/80">{c.theme_name}</h4>
                        {c.confidence_score != null && <span className={`text-[8px] ml-auto ${confidenceColor(c.confidence_score)}`}>{confidenceLabel(c.confidence_score)}</span>}
                      </div>
                      {c.description && <p className="text-[9px] text-white/40 leading-relaxed line-clamp-2 mb-1">{c.description}</p>}
                      {(c.bullish_stocks?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.bullish_stocks!.slice(0, 4).map(t => <span key={t} className="text-[7px] font-mono font-bold px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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

  const intelSignals: IntelEquitySignal[] = intel?.equity_signals ?? [];

  return (
    <div className="pb-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] text-white/30">
          Live prediction market odds → macro regime reads → equity signal ledger
        </p>
        <div className="flex items-center gap-2">
          {overview?.generated_at && (
            <span className="text-[9px] text-white/20">
              Overview {new Date(overview.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => refetchOdds()}
            disabled={oddsFetching}
            className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${oddsFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Section 1: Market Impact Command Center ── */}
      <MarketImpactCommandCenter oddsData={oddsData} />

      {/* ── Section 2: Event Impact Ledger ── */}
      <EventImpactLedger oddsData={oddsData} intelSignals={intelSignals} />

      {/* ── Section 3: Raw Legacy Signals (collapsed) ── */}
      <RawLegacyPanel overview={overview} />
    </div>
  );
}
