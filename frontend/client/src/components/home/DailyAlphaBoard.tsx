import { useState, useCallback, useEffect, useRef } from "react";
import { resolveTVSymbol } from "@/utils/tvSymbol";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Clock, Zap, Shield,
  AlertTriangle, X, Sparkles,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { GlassCard } from "@/components/glass-card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyAlphaSignals {
  ta: number | null; fundamentals: number | null; catalysts: number | null;
  social: number | null; news: number | null; options: number | null;
  theme: number | null; macro: number | null; hyperliquid: number | null;
  momentum: number | null; rel_volume: number | null;
}
export interface DailyAlphaIdea {
  symbol: string; name: string | null; asset_type: string; direction: string;
  timeframe: string | null; score: number; score_raw: number; confidence: string;
  status: string; setup_type: string | null; theme: string | null; sector: string | null;
  summary: string; trigger: string | null; invalidation: string | null;
  signals: DailyAlphaSignals; evidence: string[]; risks: string[];
  source_pages: string[]; updated_at: string | null; has_timing_signal: boolean;
  tradingview_symbol?: string; exchange?: string;
}
export interface DailyAlphaRegime {
  label: string; summary: string; drivers: string[]; confidence: number;
}
export interface SourceHealth { [key: string]: any; }
export interface CacheInfo { hit: boolean; age_seconds: number | null; ttl_seconds: number | null; }
export interface Counts {
  candidates_seen: number; candidates_qualified: number;
  stocks_scored: number; crypto_scored: number; watch_only_in_top?: number;
}
export interface DailyAlphaBoardResponse {
  ok: boolean; generated_at: string; mode: string; external_api_calls: number;
  provider_calls_blocked: boolean; limit: number; regime: DailyAlphaRegime;
  ideas: DailyAlphaIdea[]; counts: Counts; cache: CacheInfo;
  source_health: SourceHealth; stale_served?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEEN_KEY = "caelyn_alpha_board_seen_v2";
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
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (d < 1) return "just now";
    if (d < 60) return `${d}m ago`;
    const h = Math.floor(d / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  } catch { return "—"; }
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}

function isBoardFresh(generatedAt: string | undefined): boolean {
  if (!generatedAt) return false;
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    if (!seen) return true;
    return new Date(generatedAt).getTime() > new Date(seen).getTime();
  } catch { return false; }
}

function markSeen(generatedAt: string) {
  try { localStorage.setItem(SEEN_KEY, generatedAt); } catch {}
}

function scoreStyle(score: number) {
  if (score >= 85) return {
    border: "border-emerald-500/30", glow: "shadow-emerald-900/30",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    bar: "bg-emerald-500/60", rank: "bg-emerald-500/15 text-emerald-400", label: "High",
  };
  if (score >= 70) return {
    border: "border-amber-500/25", glow: "shadow-amber-900/20",
    badge: "bg-amber-500/12 text-amber-300 border-amber-500/20",
    bar: "bg-amber-500/50", rank: "bg-amber-500/12 text-amber-400", label: "Med",
  };
  return {
    border: "border-white/8", glow: "",
    badge: "bg-white/6 text-white/50 border-white/10",
    bar: "bg-white/15", rank: "bg-white/6 text-white/35", label: "Watch",
  };
}

function directionStyle(dir: string): { bg: string; icon: React.ReactNode } {
  if (dir === "long")  return { bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", icon: <TrendingUp  className="w-3 h-3" /> };
  if (dir === "short") return { bg: "bg-rose-500/15 text-rose-300 border-rose-500/25",          icon: <TrendingDown className="w-3 h-3" /> };
  return                      { bg: "bg-white/8 text-white/50 border-white/12",                 icon: <Minus        className="w-3 h-3" /> };
}

function confColor(c: string) {
  return c === "high" ? "text-emerald-400" : c === "medium" ? "text-amber-400" : "text-white/40";
}
function assetBadge(at: string) {
  if (at === "stock")  return "bg-blue-500/12 text-blue-300 border-blue-500/20";
  if (at === "crypto") return "bg-purple-500/12 text-purple-300 border-purple-500/20";
  return "bg-white/6 text-white/45 border-white/10";
}
function srcBadge(src: string) {
  const m: Record<string, string> = {
    watchlist: "bg-cyan-500/10 text-cyan-300/80 border-cyan-500/15",
    themes:    "bg-violet-500/10 text-violet-300/80 border-violet-500/15",
    hyperliquid: "bg-orange-500/10 text-orange-300/80 border-orange-500/15",
    options:   "bg-pink-500/10 text-pink-300/80 border-pink-500/15",
    prophetik: "bg-sky-500/10 text-sky-300/80 border-sky-500/15",
    screener:  "bg-lime-500/10 text-lime-300/80 border-lime-500/15",
  };
  return m[src.toLowerCase()] ?? "bg-white/5 text-white/40 border-white/10";
}

function regimeColor(label: string) {
  if (label === "bullish" || label === "risk_on")  return { text: "text-emerald-400", bg: "bg-emerald-500/10 text-emerald-300/70 border-emerald-500/20" };
  if (label === "bearish" || label === "risk_off") return { text: "text-rose-400",    bg: "bg-rose-500/10 text-rose-300/70 border-rose-500/20" };
  return { text: "text-white/50", bg: "bg-white/5 text-white/35 border-white/10" };
}

// ── Gold glow animation ───────────────────────────────────────────────────────

const GOLD_STYLE = `
@keyframes alpha-gold-pulse {
  0%, 100% { box-shadow: 0 0 0px 0px rgba(234,179,8,0), 0 0 18px 3px rgba(234,179,8,0.18), inset 0 0 0px 0px rgba(234,179,8,0); }
  50%       { box-shadow: 0 0 0px 0px rgba(234,179,8,0), 0 0 32px 8px rgba(234,179,8,0.32), inset 0 0 0px 0px rgba(234,179,8,0); }
}
.alpha-gold-glow {
  animation: alpha-gold-pulse 2.4s ease-in-out infinite;
  border-color: rgba(234,179,8,0.45) !important;
}
@keyframes alpha-gold-shimmer {
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.alpha-gold-shimmer-text {
  background: linear-gradient(90deg, #ca8a04 0%, #fde68a 40%, #f59e0b 60%, #ca8a04 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: alpha-gold-shimmer 3s linear infinite;
}
`;

function GoldStyleTag() {
  const injected = useRef(false);
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;
    const el = document.createElement("style");
    el.textContent = GOLD_STYLE;
    document.head.appendChild(el);
    return () => { try { document.head.removeChild(el); } catch {} };
  }, []);
  return null;
}

// ── TradingView chart modal ────────────────────────────────────────────────────

function TradingViewChartModal({ symbol, assetType, tvSym, onClose }: {
  symbol: string | null; assetType?: string; tvSym?: string; onClose: () => void;
}) {
  const tvSymbol = (() => {
    if (!symbol) return '';
    // Use backend-provided symbol or resolve with exchange mapping
    return resolveTVSymbol(symbol, {
      tradingview_symbol: tvSym,
      asset_type: assetType,
    });
  })();

  const iframeSrc = tvSymbol
    ? `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=D&theme=dark&style=1&locale=en&timezone=exchange&allow_symbol_change=1&hide_side_toolbar=0&withdateranges=1`
    : '';

  return (
    <Dialog open={!!symbol} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent hideClose className="max-w-4xl w-[96vw] h-[82vh] p-0 bg-[#0d0e11] border-white/10 overflow-hidden flex flex-col" aria-describedby={undefined}>
        <VisuallyHidden.Root><DialogTitle>Chart — {symbol}</DialogTitle></VisuallyHidden.Root>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white/90 tracking-wide">{symbol}</span>
            {assetType && (
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${assetBadge(assetType)}`}>{assetType}</span>
            )}
            <span className="text-[10px] text-white/25">TradingView</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-white/[0.08] text-white/30 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {iframeSrc && (
          <iframe
            key={tvSymbol}
            src={iframeSrc}
            className="flex-1 w-full border-0"
            title={`${symbol} TradingView chart`}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Mini idea row (teaser) ────────────────────────────────────────────────────

function MiniIdeaRow({ idea, rank, onChartOpen }: { idea: DailyAlphaIdea; rank: number; onChartOpen: (sym: string, at?: string) => void }) {
  const ss = scoreStyle(idea.score);
  const ds = directionStyle(idea.direction);
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
      <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${ss.rank}`}>{rank}</span>
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          role="button"
          tabIndex={0}
          onClick={e => { e.stopPropagation(); onChartOpen(idea.symbol, idea.asset_type); }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChartOpen(idea.symbol, idea.asset_type); } }}
          className="text-[12px] font-bold text-white/90 tracking-wide hover:text-white hover:underline underline-offset-2 transition-colors cursor-pointer"
        >
          {idea.symbol}
        </span>
        {idea.name && <span className="text-[10px] text-white/35 truncate hidden sm:block">{idea.name}</span>}
      </div>
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold border ${ds.bg}`}>
        {ds.icon}
        {idea.direction}
      </span>
      <span className={`text-[11px] font-bold tabular-nums ${idea.score >= 85 ? "text-emerald-400" : idea.score >= 70 ? "text-amber-400" : "text-white/45"}`}>
        {Math.round(idea.score)}
      </span>
    </div>
  );
}

// ── Full idea card (modal) ────────────────────────────────────────────────────

function IdeaCard({ idea, rank, onChartOpen }: { idea: DailyAlphaIdea; rank: number; onChartOpen: (sym: string, at?: string, tvSym?: string) => void }) {
  const ss = scoreStyle(idea.score);
  const ds = directionStyle(idea.direction);

  return (
    <div className={`relative rounded-xl border bg-white/[0.02] ${ss.border} ${ss.glow ? `shadow-lg ${ss.glow}` : ""} transition-all duration-200 hover:bg-white/[0.035]`}>
      <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${ss.bar}`} />
      <div className="px-4 py-3 pl-5">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${ss.rank}`}>{rank}</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => onChartOpen(idea.symbol, idea.asset_type, idea.tradingview_symbol)}
                className="text-sm font-bold text-white/95 tracking-wide hover:text-white hover:underline underline-offset-2 transition-colors bg-transparent border-0 p-0 cursor-pointer"
              >
                {idea.symbol}
              </button>
              {idea.name && <span className="text-[11px] text-white/40 truncate max-w-[140px]">{idea.name}</span>}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${assetBadge(idea.asset_type)}`}>{idea.asset_type}</span>
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${ds.bg}`}>{ds.icon}{idea.direction}</span>
              {idea.has_timing_signal
                ? <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border bg-emerald-500/8 text-emerald-400/70 border-emerald-500/15"><Zap className="w-2.5 h-2.5" />Timing confirmed</span>
                : <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border bg-white/4 text-white/30 border-white/8">Watch only</span>
              }
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${ss.badge}`}>{Math.round(idea.score)}/100 · {ss.label}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${confColor(idea.confidence)}`}>{idea.confidence} conf</span>
              {idea.setup_type && <span className="text-[10px] text-white/35">{idea.setup_type}</span>}
              {idea.timeframe && <span className="text-[10px] text-white/30">{idea.timeframe}</span>}
              <span className={`text-[10px] font-medium ${idea.status === "active" ? "text-emerald-400/70" : "text-amber-400/60"}`}>{idea.status?.replace(/_/g, " ")}</span>
            </div>
            {(idea.theme || idea.sector) && (
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {idea.theme && <span className="text-[10px] text-violet-300/60 bg-violet-500/8 border border-violet-500/12 px-1.5 py-0.5 rounded">{idea.theme}</span>}
                {idea.sector && idea.sector !== idea.theme && <span className="text-[10px] text-white/30 bg-white/4 border border-white/8 px-1.5 py-0.5 rounded">{idea.sector}</span>}
              </div>
            )}
          </div>
        </div>

        <p className="text-[12px] text-white/65 leading-relaxed mt-2.5">{idea.summary}</p>

        {idea.evidence.length > 0 && (
          <ul className="mt-2 space-y-0.5">
            {idea.evidence.map((ev, i) => (
              <li key={i} className="text-[11px] text-white/45 flex gap-1.5 leading-snug">
                <span className="text-white/20 shrink-0 mt-0.5">›</span><span>{ev}</span>
              </li>
            ))}
          </ul>
        )}

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
          {idea.risks.length > 0 && (
            <div className="flex gap-1.5">
              <span className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-wider shrink-0 mt-0.5">Risks</span>
              <div className="space-y-0.5">{idea.risks.map((r, i) => <div key={i} className="text-[11px] text-white/45">{r}</div>)}</div>
            </div>
          )}
          {idea.source_pages.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-white/25">Sources:</span>
              {idea.source_pages.map(src => (
                <span key={src} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium border ${srcBadge(src)}`}>{src}</span>
              ))}
            </div>
          )}
          {idea.updated_at && (
            <div className="text-[10px] text-white/20 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />Updated {fmtAgo(idea.updated_at)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function IdeaCardSkeleton() {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 pl-5">
      <div className="flex gap-3">
        <Skeleton className="w-6 h-6 rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2 items-center"><Skeleton className="h-4 w-14 rounded" /><Skeleton className="h-3.5 w-20 rounded" /><Skeleton className="h-3.5 w-12 rounded" /></div>
          <Skeleton className="h-3 w-32 rounded" /><Skeleton className="h-3.5 w-full rounded" /><Skeleton className="h-3 w-4/5 rounded" />
        </div>
      </div>
    </div>
  );
}

function TeaserSkeleton() {
  return (
    <div className="space-y-2 mt-3">
      {[1,2,3].map(i => (
        <div key={i} className="flex items-center gap-2.5 py-1.5 border-b border-white/[0.04] last:border-0">
          <Skeleton className="w-5 h-5 rounded shrink-0" />
          <Skeleton className="h-3.5 w-16 rounded" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-10 rounded" />
          <Skeleton className="h-3.5 w-6 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Regime panel ──────────────────────────────────────────────────────────────

function RegimePanel({ regime, counts, sourceHealth }: { regime: DailyAlphaRegime; counts: Counts; sourceHealth: SourceHealth }) {
  const [open, setOpen] = useState(false);
  const rc = regimeColor(regime.label);
  const healthEntries = Object.entries(sourceHealth ?? {}).slice(0, 6);
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.015]">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.02] rounded-lg transition-colors">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-white/30" />
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Regime Context</span>
          <span className={`text-[11px] font-semibold capitalize ${rc.text}`}>{regime.label}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30">{counts.candidates_seen ?? 0} candidates · {counts.candidates_qualified ?? 0} qualified</span>
          {open ? <ChevronUp className="w-3 h-3 text-white/20" /> : <ChevronDown className="w-3 h-3 text-white/20" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-white/[0.05] pt-2.5">
          {regime.summary && <p className="text-[11px] text-white/50 leading-relaxed">{regime.summary}</p>}
          {regime.drivers?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {regime.drivers.map((d, i) => <span key={i} className="px-2 py-0.5 rounded text-[10px] text-white/45 bg-white/5 border border-white/8">{d}</span>)}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { label: "Stocks scored", val: counts.stocks_scored ?? 0 },
              { label: "Crypto scored", val: counts.crypto_scored ?? 0 },
              { label: "Watch-only top", val: counts.watch_only_in_top ?? 0 },
              { label: "Regime conf", val: regime.confidence ? `${Math.round(regime.confidence * 100)}%` : "—" },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-md bg-white/[0.02] border border-white/[0.05] px-2 py-1.5 text-center">
                <div className="text-sm font-semibold text-white/70 tabular-nums">{val}</div>
                <div className="text-[9px] text-white/25 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          {healthEntries.length > 0 && (
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-widest text-white/20 mb-1.5">Source Health</div>
              <div className="flex flex-wrap gap-1.5">
                {healthEntries.map(([k, v]) => {
                  const ok = v === true || v === "ok" || v === "healthy" || (typeof v === "number" && v > 0);
                  return <span key={k} className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${ok ? "bg-emerald-500/8 text-emerald-400/60 border-emerald-500/15" : "bg-rose-500/8 text-rose-400/60 border-rose-500/15"}`}>{k.replace(/_/g, " ")}</span>;
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
      <span className="text-[9.5px] text-white/20">ext API calls: <span className={external_api_calls === 0 ? "text-emerald-400/50" : "text-amber-400/50"}>{external_api_calls}</span></span>
      {provider_calls_blocked && <span className="text-[9.5px] text-emerald-400/40">providers blocked ✓</span>}
      {cache?.hit !== undefined && (
        <span className="text-[9.5px] text-white/20">
          cache: <span className={cache.hit ? "text-emerald-400/50" : "text-white/35"}>{cache.hit ? "hit" : "miss"}</span>
          {cache.age_seconds != null && ` · ${Math.round(cache.age_seconds)}s old`}
          {cache.ttl_seconds != null && ` · ttl ${cache.ttl_seconds}s`}
        </span>
      )}
      {data.stale_served && (
        <span className="text-[9.5px] text-amber-400/60 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />stale served</span>
      )}
    </div>
  );
}

// ── Full modal content ────────────────────────────────────────────────────────

function AlphaBoardModalContent({
  data, isLoading, isFetching, isError, filter, setFilter, onRefresh, onChartOpen,
}: {
  data: DailyAlphaBoardResponse | undefined;
  isLoading: boolean; isFetching: boolean; isError: boolean;
  filter: FilterKey; setFilter: (f: FilterKey) => void; onRefresh: () => void;
  onChartOpen: (sym: string, at?: string, tvSym?: string) => void;
}) {
  const ideas = data?.ideas ?? [];
  const isEmpty = !isLoading && ideas.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Modal header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-white/[0.07] shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400/80 shrink-0" />
            <h2 className="text-[15px] font-bold text-white/95 tracking-tight">Daily Alpha Board</h2>
            {data?.regime?.label && (
              <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${regimeColor(data.regime.label).bg}`}>{data.regime.label}</span>
            )}
            {data?.mode === "cache_only" && (
              <span className="text-[9px] text-white/20 border border-white/8 px-1.5 py-0.5 rounded bg-white/[0.02]">cache only</span>
            )}
            {data?.stale_served && (
              <span className="text-[10px] text-amber-400/60 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Showing last known board</span>
            )}
          </div>
          <p className="text-[11px] text-white/35 mt-0.5">The 10 best cross-market trade ideas today</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {data?.generated_at && (
              <span className="text-[10px] text-white/25 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />Generated {fmtAgo(data.generated_at)} · {fmtTime(data.generated_at)}
              </span>
            )}
            {data?.external_api_calls === 0 && <span className="text-[10px] text-emerald-400/40">0 live API calls</span>}
            {data?.counts && <span className="text-[10px] text-white/20">{data.counts.candidates_seen ?? 0} candidates screened</span>}
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/50 hover:text-white/80 text-[11px] font-medium transition-all disabled:opacity-40 shrink-0"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 px-5 py-2.5 border-b border-white/[0.05] shrink-0 flex-wrap">
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

      {/* Scrollable idea list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
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
          ideas.map((idea, i) => <IdeaCard key={`${idea.symbol}-${i}`} idea={idea} rank={i + 1} onChartOpen={onChartOpen} />)
        )}
        {isFetching && !!data && (
          <div className="text-center py-1">
            <span className="text-[10px] text-white/20 flex items-center justify-center gap-1">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />Updating board…
            </span>
          </div>
        )}
      </div>

      {/* Regime + cache strip */}
      {data && (
        <div className="shrink-0 px-5 pb-4 pt-2 space-y-2 border-t border-white/[0.05]">
          <RegimePanel regime={data.regime} counts={data.counts} sourceHealth={data.source_health} />
          <CacheDiagStrip data={data} />
        </div>
      )}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

export function DailyAlphaBoard() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [fresh, setFresh] = useState(false);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [chartAssetType, setChartAssetType] = useState<string | undefined>(undefined);
  const [chartTvSymbol, setChartTvSymbol] = useState<string | undefined>(undefined);

  const handleChartOpen = useCallback((sym: string, at?: string, tvSym?: string) => {
    setChartSymbol(sym);
    setChartAssetType(at);
    setChartTvSymbol(tvSym);
  }, []);
  const handleChartClose = useCallback(() => setChartSymbol(null), []);

  const filterParams = FILTERS.find(f => f.key === filter)?.params ?? FILTERS[0].params;

  const { data, isLoading, isFetching, isError } = useQuery<DailyAlphaBoardResponse>({
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

  // Determine fresh state whenever data arrives
  useEffect(() => {
    if (data?.generated_at) {
      setFresh(isBoardFresh(data.generated_at));
    }
  }, [data?.generated_at]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    if (data?.generated_at) {
      markSeen(data.generated_at);
      setFresh(false);
    }
  }, [data?.generated_at]);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const preview = data?.ideas?.slice(0, 10) ?? [];
  const topIdea = data?.ideas?.[0];
  const rc = data?.regime?.label ? regimeColor(data.regime.label) : null;

  return (
    <>
      <GoldStyleTag />

      {/* ── Compact teaser card ── */}
      <button
        onClick={handleOpen}
        className={`w-full text-left rounded-2xl border bg-white/[0.025] overflow-hidden transition-all duration-300 hover:bg-white/[0.04] hover:scale-[1.002] active:scale-[0.999] focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500/50 ${
          fresh
            ? "alpha-gold-glow border-yellow-500/40"
            : "border-white/[0.08] hover:border-white/[0.14]"
        }`}
      >
        <div className="p-4 sm:p-5 flex flex-col h-full overflow-hidden">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className={`w-4 h-4 shrink-0 ${fresh ? "text-amber-400" : "text-white/30"}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[13px] font-bold tracking-tight ${fresh ? "alpha-gold-shimmer-text" : "text-white/85"}`}>
                    Daily Alpha Board
                  </span>
                  {fresh && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border bg-yellow-500/12 text-yellow-300/80 border-yellow-500/25 uppercase tracking-wider">
                      New
                    </span>
                  )}
                  {rc && data?.regime?.label && (
                    <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${rc.bg}`}>{data.regime.label}</span>
                  )}
                </div>
                <p className="text-[10px] text-white/35 mt-0.5">The 10 best cross-market trade ideas today</p>
              </div>
            </div>

            {/* CTA chip */}
            <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
              fresh
                ? "bg-yellow-500/15 border-yellow-500/30 text-yellow-300/90 hover:bg-yellow-500/22"
                : "bg-white/[0.04] border-white/10 text-white/50 hover:text-white/80"
            }`}>
              View Board
              <ChevronDown className={`w-3 h-3 -rotate-90 ${fresh ? "text-yellow-400/70" : "text-white/30"}`} />
            </div>
          </div>

          {/* Preview rows */}
          {isLoading && !data ? (
            <TeaserSkeleton />
          ) : preview.length > 0 ? (
            <div className="flex-1 min-h-0 overflow-y-auto mt-1">
              {preview.map((idea, i) => <MiniIdeaRow key={idea.symbol} idea={idea} rank={i + 1} onChartOpen={handleChartOpen} />)}
            </div>
          ) : isError ? (
            <p className="text-[11px] text-white/25 py-2">Unable to load — tap to retry.</p>
          ) : null}

          {/* Footer meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-2.5 border-t border-white/[0.05] shrink-0">
            {data?.generated_at && (
              <span className="text-[10px] text-white/25 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />{fmtAgo(data.generated_at)}
              </span>
            )}
            {data?.counts && (
              <span className="text-[10px] text-white/20">{data.counts.candidates_seen ?? 0} screened · {data.counts.candidates_qualified ?? 0} qualified</span>
            )}
            {data?.ideas?.length != null && (
              <span className="text-[10px] text-white/20">{data.ideas.length} ideas</span>
            )}
            {isFetching && (
              <span className="text-[10px] text-white/20 flex items-center gap-1 ml-auto"><RefreshCw className="w-2.5 h-2.5 animate-spin" />updating</span>
            )}
          </div>
        </div>
      </button>

      {/* ── TradingView chart popup ── */}
      <TradingViewChartModal symbol={chartSymbol} assetType={chartAssetType} tvSym={chartTvSymbol} onClose={handleChartClose} />

      {/* ── Full board modal ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] h-[88vh] p-0 bg-[#0d0e11] border-white/10 overflow-hidden flex flex-col" aria-describedby={undefined}>
          <VisuallyHidden.Root><DialogTitle>Daily Alpha Board</DialogTitle></VisuallyHidden.Root>
          <AlphaBoardModalContent
            data={data}
            isLoading={isLoading}
            isFetching={isFetching}
            isError={isError}
            filter={filter}
            setFilter={setFilter}
            onRefresh={handleRefresh}
            onChartOpen={handleChartOpen}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
