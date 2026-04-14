import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, TrendingDown, ExternalLink, Activity, BarChart3, RefreshCw, Users, DollarSign,
  MessageSquare, Send, Loader2, Sparkles, ChevronDown, ChevronRight,
  Zap, Eye, Target, AlertTriangle, CheckCircle, Brain, Star, Waves, Layers,
} from "lucide-react";
import { openSecureLink } from "@/utils/security";
import diceImage from "@assets/istockphoto-1252690598-612x612_1756665072306.jpg";

// ─── Constants ────────────────────────────────────────────────────
const AGENT_BACKEND_URL = "https://fast-api-server-trading-agent-aidanpilon.replit.app";
const AGENT_API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";

function getToken(): string | null {
  return localStorage.getItem('caelyn_token') || sessionStorage.getItem('caelyn_token');
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY, ...extra };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}
const POLYMARKET_PROXY = `${AGENT_BACKEND_URL}/api/polymarket/events`;
const GAMMA_API = "https://gamma-api.polymarket.com/events";

const MACRO_INCLUDE = [
  "fed", "rate", "rates", "inflation", "gdp", "recession", "bitcoin", "btc",
  "ethereum", "eth", "crypto", "stock", "s&p", "nasdaq", "tariff", "trade war",
  "election", "president", "congress", "treasury", "employment", "jobs", "cpi",
  "ppi", "oil", "gold", "commodities", "economy", "economic", "debt", "deficit",
  "housing", "interest", "monetary", "fiscal", "central bank", "dollar", "yen",
  "euro", "currency", "bond", "yield", "market", "dow", "default", "shutdown",
  "geopolitical", "war", "sanctions", "china", "iran", "russia", "ukraine",
  "opec", "regulation", "sec", "etf", "ipo", "ai ", "artificial intelligence",
  "semiconductor", "solana", "xrp", "dogecoin",
  // Finance
  "bank", "banking", "jpmorgan", "goldman", "morgan stanley", "credit", "loan",
  "mortgage", "fintech", "insurance", "hedge fund", "private equity", "venture capital",
  "ipo", "merger", "acquisition", "m&a", "bankruptcy", "bailout",
  // Tech
  "apple", "google", "meta", "microsoft", "amazon", "nvidia", "tesla", "openai",
  "chatgpt", "tech", "technology", "software", "hardware", "chip", "semiconductor",
  "cloud", "saas", "startup", "silicon valley", "antitrust",
  // Earnings
  "earnings", "revenue", "profit", "eps", "quarterly", "guidance", "forecast",
  "beat", "miss", "report", "q1", "q2", "q3", "q4", "annual",
];

const MACRO_EXCLUDE = [
  "nfl", "nba", "mlb", "nhl", "soccer", "football", "basketball", "baseball",
  "hockey", "tennis", "golf", "cricket", "ufc", "mma", "boxing", "f1",
  "formula 1", "oscar", "grammy", "emmy", "tony", "bachelor", "bachelorette",
  "love island", "survivor", "big brother", "celebrity", "kardashian", "swift",
  "drake", "beyonce", "tiktok", "youtube", "twitch", "streamer", "influencer",
  "weather", "hurricane", "tornado", "earthquake", "super bowl", "world series",
  "stanley cup", "premier league", "champions league", "fifa", "olympics",
  "paralympics",
];

type CategoryTab = "all" | "crypto" | "fed" | "elections" | "economy" | "geopolitics" | "finance" | "tech";

// Categories that use Polymarket tag_slug API for direct fetching
const TAG_SLUG_CATEGORIES: Partial<Record<CategoryTab, string>> = {
  finance: "finance",
  tech: "tech",
};

const CATEGORY_KEYWORDS: Record<Exclude<CategoryTab, "all" | "finance" | "tech">, string[]> = {
  crypto: ["bitcoin", "btc", "ethereum", "eth", "crypto", "solana", "xrp", "dogecoin", "defi", "nft", "blockchain"],
  fed: ["fed", "rate", "rates", "interest", "monetary", "central bank", "fomc", "powell", "inflation", "cpi", "ppi", "yield", "bond"],
  elections: ["election", "president", "congress", "senate", "house", "vote", "governor", "democrat", "republican", "trump", "biden"],
  economy: ["gdp", "recession", "economy", "economic", "jobs", "employment", "housing", "debt", "deficit", "fiscal", "stock", "s&p", "nasdaq", "dow", "market", "tariff", "trade war", "commodity", "commodities", "oil", "gold"],
  geopolitics: ["war", "ukraine", "russia", "china", "iran", "sanctions", "geopolitical", "nato", "opec", "nuclear", "taiwan", "middle east"],
};

// ─── Types ────────────────────────────────────────────────────────
interface PolyMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string;
  outcomePrices: string;
  volume24hr: number;
  liquidity: string;
  active: boolean;
  closed: boolean;
}

interface PolyEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  active: boolean;
  closed: boolean;
  volume24hr: number;
  volume: number;
  liquidity: number;
  competitive: number;
  commentCount: number;
  endDate?: string;
  tags: Array<{ id: string; label: string; slug: string }>;
  markets: PolyMarket[];
}

interface ParsedMarket {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  marketId: string;
  question: string;
  description: string;
  yesPrice: number;
  noPrice: number;
  volume24hr: number;
  totalVolume: number;
  liquidity: number;
  tags: string[];
  endDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────
function parsePriceArray(raw: string): number[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(Number) : [];
  } catch {
    return [];
  }
}

// All unique category keywords flattened — events matching ANY category pass the gate
const ALL_CATEGORY_KEYWORDS = Array.from(
  new Set(Object.values(CATEGORY_KEYWORDS).flat())
);

function isMacroEvent(ev: PolyEvent): boolean {
  const text = `${ev.title} ${ev.description || ""}`.toLowerCase();
  const tagLabels = (ev.tags || []).map((t) => t.label.toLowerCase()).join(" ");
  const combined = `${text} ${tagLabels}`;
  const excluded = MACRO_EXCLUDE.some((kw) => combined.includes(kw));
  if (excluded) return false;
  // Pass if it matches any MACRO_INCLUDE keyword OR any category keyword
  if (MACRO_INCLUDE.some((kw) => combined.includes(kw))) return true;
  return ALL_CATEGORY_KEYWORDS.some((kw) => combined.includes(kw));
}

function matchesCategory(m: ParsedMarket, cat: CategoryTab): boolean {
  if (cat === "all") return true;
  // Tag-slug categories are fetched separately; don't keyword-filter them
  if (cat in TAG_SLUG_CATEGORIES) return true;
  const keywords = CATEGORY_KEYWORDS[cat as keyof typeof CATEGORY_KEYWORDS];
  if (!keywords) return true;
  const text = `${m.eventTitle} ${m.question} ${m.tags.join(" ")}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function parseEventsCore(events: PolyEvent[], applyMacroFilter: boolean): ParsedMarket[] {
  const results: ParsedMarket[] = [];
  for (const ev of events) {
    if (!ev.active || ev.closed) continue;
    if (applyMacroFilter && !isMacroEvent(ev)) continue;
    for (const m of ev.markets || []) {
      if (!m.active || m.closed) continue;
      const prices = parsePriceArray(m.outcomePrices || "[]");
      const yesPrice = prices[0] ?? 0;
      const noPrice = prices[1] ?? 1 - yesPrice;
      results.push({
        eventId: ev.id,
        eventTitle: ev.title,
        eventSlug: ev.slug,
        marketId: m.id,
        question: m.question || ev.title,
        description: ev.description || "",
        yesPrice,
        noPrice,
        volume24hr: m.volume24hr || ev.volume24hr || 0,
        totalVolume: ev.volume || 0,
        liquidity: parseFloat(m.liquidity || "0") || ev.liquidity || 0,
        tags: (ev.tags || []).map((t) => t.label),
        endDate: ev.endDate,
      });
    }
  }
  results.sort((a, b) => b.volume24hr - a.volume24hr);
  return results;
}

function parseEvents(events: PolyEvent[]): ParsedMarket[] {
  return parseEventsCore(events, true);
}

/** Parse events from a tag-specific API call (no macro keyword filter needed) */
function parseTagEvents(events: PolyEvent[]): ParsedMarket[] {
  return parseEventsCore(events, false);
}

// ─── Skeleton Loader ──────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />;
}

function CardSkeleton() {
  return (
    <GlassCard className="p-4">
      <Skeleton className="h-4 w-3/4 mb-3" />
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-6 w-full mb-3 rounded-full" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </GlassCard>
  );
}

function TickerSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-56 flex-shrink-0 rounded-lg" />
      ))}
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-emerald-400">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
      </span>
      LIVE
    </span>
  );
}

function PriceBar({ yesPrice }: { yesPrice: number }) {
  const pct = Math.round(yesPrice * 100);
  const isHigh = pct >= 70;
  const isLow = pct <= 30;
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-bold mb-1">
        <span className={isHigh ? "text-emerald-400" : isLow ? "text-red-400" : "text-blue-400"}>
          YES {pct}%
        </span>
        <span className="text-white/40">NO {100 - pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isHigh
              ? "linear-gradient(90deg, #22c55e, #4ade80)"
              : isLow
              ? "linear-gradient(90deg, #ef4444, #f87171)"
              : "linear-gradient(90deg, #3b82f6, #60a5fa)",
          }}
        />
      </div>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <span className="inline-flex flex-shrink-0">
      <button
        ref={btnRef}
        onClick={toggle}
        className={`w-[15px] h-[15px] rounded-full border text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer ${open ? "bg-blue-500/20 border-blue-500/40 text-blue-400" : "bg-white/[0.07] border-white/[0.12] text-white/40 hover:bg-white/[0.14] hover:text-white/70"}`}
        aria-label="More info"
      >
        i
      </button>
      {open && createPortal(
        <div
          className="fixed w-72 bg-[#0d1520] border border-white/[0.12] rounded-xl p-3.5 shadow-2xl"
          style={{ zIndex: 99999, top: pos.top, left: pos.left, transform: 'translate(-50%, calc(-100% - 8px))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[11px] text-white/70 leading-relaxed">{text}</p>
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-[#0d1520] border-b border-r border-white/[0.12] rotate-45 -mt-[5px]" />
        </div>,
        document.body
      )}
    </span>
  );
}

function MarketPulseBar({ markets }: { markets: ParsedMarket[] }) {
  const top = markets.slice(0, 5);
  if (top.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-emerald-400" />
        <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase">Market Pulse</h3>
        <InfoTooltip text="Where is the most money flowing right now? The top 5 markets by raw dollar trading volume in the last 24 hours. If $13.7M traded on 'Military action against Iran,' it's #1. It tells you what the crowd is most interested in, but nothing about whether odds changed or whether bets are confident. It's a volume leaderboard, nothing more." />
        <LiveBadge />
      </div>
      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.06]">
          <span className="w-4 shrink-0" />
          <span className="flex-1 text-[9px] text-white/25 uppercase tracking-wider font-semibold">Market</span>
          <span className="w-[100px] text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">YES %</span>
          <span className="w-16 text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">24h Vol</span>
        </div>
        {top.map((m, i) => {
          const pct = Math.round(m.yesPrice * 100);
          const isHigh = pct >= 60;
          return (
            <a
              key={m.marketId}
              href={`https://polymarket.com/event/${m.eventSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors group border-t border-white/[0.04] first:border-t-0"
            >
              <span className="w-4 shrink-0 text-[9px] text-white/20 font-mono text-right">{i + 1}</span>
              <p className="flex-1 min-w-0 text-[11px] text-white/70 truncate group-hover:text-white/90 transition-colors">{m.question}</p>
              <div className="flex items-center gap-1.5 w-[100px] justify-end shrink-0">
                <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isHigh ? '#22c55e' : '#ef4444' }} />
                </div>
                <span className={`text-[11px] font-bold font-mono w-8 text-right ${isHigh ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</span>
              </div>
              <span className="w-16 text-right text-[10px] font-mono text-white/40 shrink-0">{formatVolume(m.volume24hr)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function MarketCard({ market }: { market: ParsedMarket }) {
  return (
    <a
      href={`https://polymarket.com/event/${market.eventSlug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <GlassCard className="p-4 hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer h-full">
        <p className="text-xs font-semibold text-white/90 leading-tight mb-3 line-clamp-3 min-h-[3rem]">
          {market.question}
        </p>
        <PriceBar yesPrice={market.yesPrice} />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] text-white/40">
          <span className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3" />
            24h: {formatVolume(market.volume24hr)}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Liq: {formatVolume(market.liquidity)}
          </span>
          {market.totalVolume > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Vol: {formatVolume(market.totalVolume)}
            </span>
          )}
        </div>
        {market.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {market.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/30 border border-white/[0.04]">
                {t}
              </span>
            ))}
          </div>
        )}
      </GlassCard>
    </a>
  );
}

function MoversSection({ markets }: { markets: ParsedMarket[] }) {
  // Show markets with extreme probabilities (strong conviction) or near-50/50 (contested)
  const movers = [...markets]
    .filter((m) => m.volume24hr > 0)
    .sort((a, b) => {
      // Prioritize markets with highest volume (proxy for biggest activity/moves)
      // and extreme or highly contested probabilities
      const aScore = Math.abs(a.yesPrice - 0.5) * a.volume24hr;
      const bScore = Math.abs(b.yesPrice - 0.5) * b.volume24hr;
      return bScore - aScore;
    })
    .slice(0, 6);

  if (movers.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <LiveBadge />
        <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase">Movers & Shakers</h3>
        <InfoTooltip text="Where is the crowd most confident AND putting money behind it? Ranks markets by multiplying conviction (how far the price is from 50/50) by volume. A market at 100% YES with high volume scores highest. A market at 51% YES even with high volume barely shows up. This answers: 'Where has the crowd made up its mind and put real money on it?' — not about recent movement, just current conviction." />
        <span className="text-[10px] text-white/30">Highest conviction bets</span>
      </div>
      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.06]">
          <span className="w-4 shrink-0" />
          <span className="flex-1 text-[9px] text-white/25 uppercase tracking-wider font-semibold">Market</span>
          <span className="w-[100px] text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">YES %</span>
          <span className="w-16 text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">Conv.</span>
          <span className="w-16 text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">24h Vol</span>
        </div>
        {movers.map((m, i) => {
          const pct = Math.round(m.yesPrice * 100);
          const deviation = pct - 50;
          const isYesFavored = deviation > 0;
          return (
            <a
              key={m.marketId}
              href={`https://polymarket.com/event/${m.eventSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors group border-t border-white/[0.04] first:border-t-0"
            >
              <span className="w-4 shrink-0 text-[9px] text-white/20 font-mono text-right">{i + 1}</span>
              <p className="flex-1 min-w-0 text-[11px] text-white/70 truncate group-hover:text-white/90 transition-colors">{m.question}</p>
              <div className="flex items-center gap-1.5 w-[100px] justify-end shrink-0">
                <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 60 ? '#22c55e' : '#ef4444' }} />
                </div>
                <span className={`text-[11px] font-bold font-mono w-8 text-right ${pct >= 60 ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</span>
              </div>
              <span className={`w-16 text-right text-[11px] font-bold font-mono shrink-0 ${isYesFavored ? 'text-emerald-400' : 'text-red-400'}`}>
                {isYesFavored ? '+' : ''}{deviation}%
              </span>
              <span className="w-16 text-right text-[10px] font-mono text-white/40 shrink-0">{formatVolume(m.volume24hr)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Fetch helper for tag-specific Polymarket data ────────────────

async function fetchPolymarketByTag(tagSlug: string): Promise<PolyEvent[] | null> {
  // Attempt 1: Backend proxy with tag_slug
  try {
    const proxyRes = await fetch(
      `${POLYMARKET_PROXY}?limit=50&tag_slug=${encodeURIComponent(tagSlug)}`
    );
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (Array.isArray(json)) return json;
    }
  } catch { /* fall through */ }

  // Attempt 2: Direct Gamma API
  try {
    const directRes = await fetch(
      `${GAMMA_API}?limit=50&active=true&closed=false&order=volume24hr&ascending=false&tag_slug=${encodeURIComponent(tagSlug)}`
    );
    if (directRes.ok) {
      const json = await directRes.json();
      if (Array.isArray(json)) return json;
    }
  } catch { /* fall through */ }

  return null;
}

// ─── Surging Movers View ──────────────────────────────────────────

function SurgingMoversView({ signals }: { signals: SignalsData | null }) {
  const movers = signals?.top_movers ?? [];
  if (!signals) {
    return (
      <div className="flex items-center justify-center py-10 text-xs text-white/20">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading market movers…
      </div>
    );
  }
  if (movers.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-white/30">
        No significant movers in the last 24h.
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase">
          Biggest 24H Odds Movers
        </h3>
        <InfoTooltip text="What just changed dramatically? Shows markets whose probability shifted the most in the last 24 hours, in either direction. A market that went from 60% to 0.1% (−59.5%) shows up. One that jumped from 33% to 89.5% (+56.5%) shows up. This is the 'breaking news' feed — something happened to move these odds." />
        <span className="text-[10px] text-white/30">Largest probability shifts — either direction</span>
      </div>
      <div className="rounded-lg border border-white/[0.06] overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.06]">
          <span className="w-4 shrink-0" />
          <span className="flex-1 text-[9px] text-white/25 uppercase tracking-wider font-semibold">Market</span>
          <span className="w-16 text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">24h Δ</span>
          <span className="w-[100px] text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">YES %</span>
          <span className="w-16 text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">24h Vol</span>
        </div>
        {movers.slice(0, 12).map((m, i) => {
          const chg = m.price_change_1d;
          const isUp = chg != null && chg > 0;
          const isDown = chg != null && chg < 0;
          const chgStr = chg == null ? '—' : `${isUp ? '+' : ''}${chg.toFixed(1)}%`;
          const chgCls = isUp ? 'text-emerald-400' : isDown ? 'text-red-400' : 'text-white/25';
          const pct = m.yes_pct;
          return (
            <a
              key={i}
              href={m.slug ? `https://polymarket.com/event/${m.slug}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors group border-t border-white/[0.04] first:border-t-0"
            >
              <span className="w-4 shrink-0 text-[9px] text-white/20 font-mono text-right">{i + 1}</span>
              <p className="flex-1 min-w-0 text-[11px] text-white/70 truncate group-hover:text-white/90 transition-colors">{m.question}</p>
              <span className={`w-16 text-right text-[11px] font-bold font-mono shrink-0 ${chgCls}`}>{chgStr}</span>
              <div className="flex items-center gap-1.5 w-[100px] justify-end shrink-0">
                {pct != null ? (
                  <>
                    <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 60 ? '#22c55e' : pct <= 40 ? '#ef4444' : '#3b82f6' }} />
                    </div>
                    <span className={`text-[11px] font-bold font-mono w-8 text-right ${pct >= 60 ? 'text-emerald-400' : pct <= 40 ? 'text-red-400' : 'text-blue-400'}`}>{pct}%</span>
                  </>
                ) : <span className="text-[10px] text-white/25 w-full text-right">—</span>}
              </div>
              <span className="w-16 text-right text-[10px] font-mono text-white/40 shrink-0">
                {m.volume_24h != null ? formatVolume(m.volume_24h) : '—'}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard Component ──────────────────────────────────────────

function PolymarketDashboard({ signals, children }: { signals: SignalsData | null; children?: React.ReactNode }) {
  const [markets, setMarkets] = useState<ParsedMarket[]>([]);
  const [tagCache, setTagCache] = useState<Record<string, ParsedMarket[]>>({});
  const [loading, setLoading] = useState(true);
  const [tagLoading, setTagLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CategoryTab>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch the main macro markets (for all/crypto/fed/elections/economy/geopolitics)
  const fetchData = useCallback(async () => {
    try {
      let data: PolyEvent[] | null = null;

      try {
        const proxyRes = await fetch(`${POLYMARKET_PROXY}?limit=100`);
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (Array.isArray(json)) data = json;
        }
      } catch { /* fall through */ }

      if (!data) {
        try {
          const directRes = await fetch(
            `${GAMMA_API}?limit=100&active=true&closed=false&order=volume24hr&ascending=false`
          );
          if (directRes.ok) {
            const json = await directRes.json();
            if (Array.isArray(json)) data = json;
          }
        } catch { /* fall through */ }
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        setError("Unable to fetch Polymarket data. Markets may be unavailable.");
        return;
      }
      const parsed = parseEvents(data);
      setMarkets(parsed);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[POLYMARKET] Unexpected error:", err);
      setError("Failed to load prediction markets.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch tag-specific markets — caches results so switching tabs is instant
  const fetchTagData = useCallback(async (tab: CategoryTab) => {
    const tagSlug = TAG_SLUG_CATEGORIES[tab];
    if (!tagSlug) return;
    // If already cached, don't show loading
    if (!tagCache[tagSlug]) setTagLoading(true);
    try {
      const data = await fetchPolymarketByTag(tagSlug);
      if (data && data.length > 0) {
        const parsed = parseTagEvents(data);
        setTagCache((prev) => ({ ...prev, [tagSlug]: parsed }));
      }
    } catch { /* keep cached data */ }
    finally {
      setTagLoading(false);
    }
  }, [tagCache]);

  useEffect(() => {
    fetchData(); // initial load — shows spinner
    const iv = setInterval(fetchData, 90_000); // silent refresh every 90s
    return () => clearInterval(iv);
  }, [fetchData]);

  // When switching to a tag-slug category, fetch if not cached
  useEffect(() => {
    const tagSlug = TAG_SLUG_CATEGORIES[activeTab];
    if (tagSlug) {
      fetchTagData(activeTab);
    }
  }, [activeTab, fetchTagData]);

  // For tag-slug categories, use cached tag data; for others, filter the main markets
  const isTagCategory = activeTab in TAG_SLUG_CATEGORIES;
  const tagSlug = TAG_SLUG_CATEGORIES[activeTab];
  const filtered =
    isTagCategory
      ? (tagSlug ? tagCache[tagSlug] || [] : [])
      : markets.filter((m) => matchesCategory(m, activeTab));

  const tabs: { key: CategoryTab; label: string }[] = [
    { key: "all", label: "All Macro" },
    { key: "crypto", label: "Crypto" },
    { key: "fed", label: "Fed & Rates" },
    { key: "elections", label: "Elections" },
    { key: "economy", label: "Economy" },
    { key: "geopolitics", label: "Geopolitics" },
    { key: "finance", label: "Finance" },
    { key: "tech", label: "Tech" },
  ];

  return (
    <>
    <GlassCard className="p-5 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-white">Market Intelligence</h2>
          {lastUpdated && (
            <span className="flex items-center gap-1 text-[10px] text-white/25">
              Updated {lastUpdated.toLocaleTimeString()}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 ml-1">
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-widest">Live</span>
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://polymarket.com/crypto"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-xs text-white/50 hover:text-white/80"
          >
            <ExternalLink className="w-3 h-3" />
            Open Polymarket
          </a>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-xs text-red-400 flex items-center gap-2">
          <span>Data unavailable — {error}</span>
          <button onClick={fetchData} className="text-red-300 underline hover:text-red-200">
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && markets.length === 0 ? (
        <div>
          <TickerSkeleton />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Movers & Shakers — always uses main markets */}
          <MoversSection markets={markets} />

          {/* 24H Movers — always visible permanent section */}
          <div className="mb-6">
            <SurgingMoversView signals={signals} />
          </div>

          {/* Top Edges — full width */}
          {signals && (signals.top_edges?.length ?? 0) > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase">Top Edges</h3>
                <InfoTooltip text="Spread as a % of the YES price — higher means a wider bid-ask gap relative to the current price. A wide spread signals a pricing inefficiency or market-making opportunity: the market maker is uncertain, leaving room for a sharper bet." />
              </div>
              <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.06]">
                  <span className="w-4 shrink-0" />
                  <span className="flex-1 text-[9px] text-white/25 uppercase tracking-wider font-semibold">Market</span>
                  <span className="w-[100px] text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">YES %</span>
                  <span className="w-20 text-right text-[9px] text-white/25 uppercase tracking-wider font-semibold">Spread</span>
                </div>
                {(signals.top_edges ?? []).slice(0, 6).map((e, i) => {
                  const spread = e.edge_pct ?? e.spread_pct_of_price;
                  return (
                    <a key={i} href={e.slug ? `https://polymarket.com/event/${e.slug}` : "#"} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/[0.04] transition-colors group border-t border-white/[0.04] first:border-t-0">
                      <span className="w-4 shrink-0 text-[9px] text-white/20 font-mono text-right">{i + 1}</span>
                      <p className="flex-1 min-w-0 text-[11px] text-white/70 truncate group-hover:text-white/90 transition-colors">{e.question || "—"}</p>
                      <div className="flex items-center gap-1.5 w-[100px] justify-end shrink-0">
                        {e.yes_pct != null ? (
                          <>
                            <div className="w-12 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${e.yes_pct}%`, background: e.yes_pct >= 60 ? '#22c55e' : e.yes_pct <= 40 ? '#ef4444' : '#3b82f6' }} />
                            </div>
                            <span className={`text-[11px] font-bold font-mono w-8 text-right ${e.yes_pct >= 60 ? 'text-emerald-400' : e.yes_pct <= 40 ? 'text-red-400' : 'text-blue-400'}`}>{e.yes_pct}%</span>
                          </>
                        ) : <span className="text-[10px] text-white/25 w-full text-right">—</span>}
                      </div>
                      <span className="w-20 text-right text-[11px] font-bold font-mono text-amber-400 shrink-0">
                        {spread != null ? `${spread.toFixed(1)}%` : '—'}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Order Book Divergence */}
          {signals && (signals.top_mispricings?.length ?? 0) > 0 && (
            <div className="mb-6">
              {(signals.top_mispricings?.length ?? 0) > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase">Order Book Divergence</h3>
                    <InfoTooltip text="CLOB order book mid price differs from displayed YES price — signals professional traders are positioned at different odds than the displayed price." />
                  </div>
                  <div className="space-y-1.5">
                    {(signals.top_mispricings ?? []).slice(0, 6).map((m, i) => (
                      <a key={i} href={m.slug ? `https://polymarket.com/event/${m.slug}` : "#"} target="_blank" rel="noopener noreferrer"
                        className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-2.5 py-2 flex items-start gap-2 hover:bg-white/[0.05] transition-colors">
                        <p className="flex-1 text-[10px] text-white/70 leading-snug">{m.question || "—"}</p>
                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                          <span className="text-[10px] font-mono text-blue-400">{m.yes_pct != null ? `${m.yes_pct}%` : "—"}</span>
                          {m.mispricing_score != null && (
                            <span className="text-[10px] font-bold font-mono text-orange-400 whitespace-nowrap">
                              Δ {m.mispricing_score.toFixed(3)}
                            </span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Injected slot — e.g. Caelyn Analyzes */}
          {children}

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap border ${
                  activeTab === tab.key
                    ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                    : "bg-transparent text-white/40 border-white/[0.06] hover:text-white/60 hover:border-white/10"
                }`}
              >
                {tab.label}
                {activeTab === tab.key && filtered.length > 0 && (
                  <span className="ml-1.5 text-[9px] text-blue-400/60">
                    {filtered.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tag category: show skeleton only on first load (no cache yet) */}
          {isTagCategory && tagLoading && filtered.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase">
                  {isTagCategory ? `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Markets` : "Top Macro Markets"}
                </h3>
                <span className="text-[10px] text-white/30">By 24h volume</span>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-white/30">
                  No markets found for this category.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.slice(0, 15).map((m) => (
                    <MarketCard key={m.marketId} market={m} />
                  ))}
                </div>
              )}

              {filtered.length > 15 && (
                <p className="text-center text-[10px] text-white/20 mt-3">
                  Showing top 15 of {filtered.length} markets
                </p>
              )}
            </>
          )}
        </>
      )}
    </GlassCard>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE — Types
// ═══════════════════════════════════════════════════════════════════
interface SignalsData {
  summary?: {
    total_volume_24h?: number;
    market_count?: number;
    surging_count?: number;
    fading_count?: number;
    whale_active_count?: number;
    avg_spread_pct?: number;
  };
  top_edges?: Array<{ question: string; yes_pct?: number; edge_pct?: number; spread_pct_of_price?: number; slug?: string; }>;
  top_mispricings?: Array<{ question: string; yes_pct?: number; mispricing_score?: number; slug?: string; }>;
  surging_markets?: Array<{ question: string; volume_24h?: number; volume_momentum?: string; slug?: string; }>;
  fading_markets?: Array<{ question: string; volume_24h?: number; volume_momentum?: string; slug?: string; }>;
  whale_markets?: Array<{ question: string; vol_liq_ratio?: number; volume_24h?: number; yes_pct?: number; slug?: string; }>;
  top_movers?: Array<{ question: string; price_change_1d?: number; yes_pct?: number; volume_24h?: number; slug?: string; }>;
}
interface EnhancedMarket {
  id?: string;
  question: string;
  slug?: string;
  yes_pct?: number;
  price_change_1h?: number;
  price_change_1d?: number;
  price_change_1wk?: number;
  volume_24h?: number;
  volume_momentum?: string;
  whale_activity?: boolean;
  market_efficiency_score?: number;
  edge_pct?: number;
  liquidity?: number;
  days_to_expiry?: number;
  is_expired?: boolean;
  tags?: string[];
}
interface CategoryItem {
  tag: string;
  count?: number;
  volume_24h?: number;
  liquidity?: number;
}
interface WhaleWatchItem {
  question: string;
  vol_liq_ratio?: number;
  volume_24h?: number;
  yes_pct?: number;
  market_efficiency_score?: number;
  price_change_1d?: number;
  slug?: string;
}
// Analysis types
interface AgentResult {
  summary?: string;
  base_rate_estimate?: string;
  confidence?: string;
  media_sentiment?: string;
  crowd_wisdom?: string;
  trend?: string;
  smart_money_signal?: string;
  primary_argument?: string;
  key_catalyst?: string;
  key_risk?: string;
  supporting_evidence?: string[];
  bull_points_adopted?: string[];
  bear_points_adopted?: string[];
}
interface AnalysisFinal {
  recommendation?: string;
  conviction?: string;
  final_yes_probability_pct?: number;
  market_price_pct?: number;
  edge_pct?: number;
  debate_winner?: string;
  thesis?: string;
  key_risk?: string;
  position_sizing?: string;
  entry_note?: string;
  exit_note?: string;
}
interface AnalysisResponse {
  final?: AnalysisFinal;
  agents?: Record<string, AgentResult>;
  relevant_markets?: Array<{ question: string; yes_pct?: number; volume_24h?: number; market_efficiency_score?: number; slug?: string }>;
}

// ─── Intelligence Helpers ──────────────────────────────────────────
function effBadge(score: number | undefined) {
  if (score == null) return null;
  const cls = score >= 85 ? "bg-emerald-500/20 text-emerald-400" : score >= 70 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400";
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>{score}</span>;
}
function momentumBadge(m: string | undefined) {
  if (!m) return null;
  const u = m.toUpperCase();
  const cls = u === "SURGING" ? "bg-emerald-500/20 text-emerald-400" : u === "ACCELERATING" ? "bg-teal-500/20 text-teal-400" : u === "FADING" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400";
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>{u}</span>;
}
function recoBadge(r: string | undefined) {
  if (!r) return null;
  const u = r.toUpperCase();
  if (u.includes("LONG_YES") || u === "LONG YES") return <span className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-base font-bold">{u}</span>;
  if (u.includes("LONG_NO") || u === "LONG NO") return <span className="inline-flex items-center px-3 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-base font-bold">{u}</span>;
  return <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-500/20 text-gray-400 border border-gray-500/30 text-base font-bold">{u}</span>;
}

// ─── Enhanced Markets Table ────────────────────────────────────────
type ScreenerSortCol = "yes_pct" | "change_1h" | "change_24h" | "change_1wk" | "volume" | "momentum" | "whale" | "efficiency" | "expires";
type SortDir = "asc" | "desc";

const SPORTS_TAGS = new Set([
  "sports","nba","nfl","mlb","nhl","soccer","baseball","basketball","football",
  "tennis","golf","boxing","mma","ufc","olympics","cricket","rugby","f1","nascar",
  "racing","esports","ncaa","college football","college basketball","college sports",
  "pga","wta","atp","champions league","premier league","la liga","bundesliga",
  "serie a","march madness","super bowl","world cup","nba finals","stanley cup",
  "world series","volleyball","swimming","track","cycling","skiing","hockey",
]);

function isSportsMarket(m: EnhancedMarket): boolean {
  return (m.tags ?? []).some((t) => SPORTS_TAGS.has(t.toLowerCase()));
}

function EnhancedMarketsTable() {
  const [allMarkets, setAllMarkets]   = useState<EnhancedMarket[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tagFilter, setTagFilter]     = useState("");
  const [minVol, setMinVol]           = useState("");
  const [includeSports, setIncludeSports] = useState(false);
  const [sortCol, setSortCol]         = useState<ScreenerSortCol>("volume");
  const [sortDir, setSortDir]         = useState<SortDir>("desc");

  const fetchMarkets = useCallback(async (tag?: string) => {
    setLoading(true);
    try {
      if (tag) {
        // Tag-filtered queries: hit Polymarket Gamma API directly via fetchPolymarketByTag
        // (backend enrichment doesn't reliably filter by tag slug)
        const events = await fetchPolymarketByTag(tag.toLowerCase());
        if (events && events.length > 0) {
          const enhanced: EnhancedMarket[] = [];
          for (const ev of events) {
            for (const m of (ev.markets ?? [])) {
              if (!m.active || m.closed) continue;
              let yesPrice = 0.5;
              try {
                const prices = JSON.parse(m.outcomePrices || "[0.5]");
                yesPrice = parseFloat(prices[0] ?? "0.5");
              } catch {}
              enhanced.push({
                id: m.id,
                question: m.question || ev.title,
                slug: ev.slug,
                yes_pct: Math.round(yesPrice * 100),
                volume_24h: m.volume24hr ?? ev.volume24hr,
                liquidity: parseFloat(m.liquidity ?? "0") || ev.liquidity,
                tags: ev.tags?.map((t) => t.slug) ?? [],
              });
            }
          }
          if (enhanced.length > 0) {
            setAllMarkets(enhanced);
            return;
          }
        }
        // Fallback if Gamma returns nothing — backend proxy
        const params = new URLSearchParams({ limit: "200", tag });
        const r = await fetch(`/api/predict/markets?${params}`);
        if (r.ok) {
          const d = await r.json();
          setAllMarkets(Array.isArray(d) ? d : (d.markets ?? []));
        }
        return;
      }
      // No tag — fetch enriched markets from backend
      const r = await fetch(`/api/predict/markets?limit=200`);
      if (r.ok) {
        const d = await r.json();
        setAllMarkets(Array.isArray(d) ? d : (d.markets ?? []));
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMarkets(tagFilter || undefined); }, [fetchMarkets, tagFilter]);

  const handleColClick = (col: ScreenerSortCol) => {
    if (sortCol === col) {
      setSortDir((d) => d === "desc" ? "asc" : "desc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const minVolNum = minVol ? Number(minVol) : 0;

  const markets = useMemo(() => {
    let rows = allMarkets.filter((m) => {
      if (!includeSports && isSportsMarket(m)) return false;
      // Tag filtering is handled at fetch time (Gamma API tag_slug param) — no local double-filter
      if (minVolNum > 0 && (m.volume_24h ?? 0) < minVolNum) return false;
      return true;
    });

    rows = [...rows].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortCol === "yes_pct")     { av = a.yes_pct ?? 0;                  bv = b.yes_pct ?? 0; }
      if (sortCol === "change_1h")   { av = a.price_change_1h ?? 0;          bv = b.price_change_1h ?? 0; }
      if (sortCol === "change_24h")  { av = a.price_change_1d ?? 0;          bv = b.price_change_1d ?? 0; }
      if (sortCol === "change_1wk")  { av = a.price_change_1wk ?? 0;         bv = b.price_change_1wk ?? 0; }
      if (sortCol === "volume")      { av = a.volume_24h ?? 0;               bv = b.volume_24h ?? 0; }
      if (sortCol === "momentum")    { av = a.volume_momentum === "SURGING" ? 2 : a.volume_momentum === "ACCELERATING" ? 1 : 0; bv = b.volume_momentum === "SURGING" ? 2 : b.volume_momentum === "ACCELERATING" ? 1 : 0; }
      if (sortCol === "whale")       { av = a.whale_activity ? 1 : 0;        bv = b.whale_activity ? 1 : 0; }
      if (sortCol === "efficiency")  { av = a.market_efficiency_score ?? 0;  bv = b.market_efficiency_score ?? 0; }
      if (sortCol === "expires")     { av = a.days_to_expiry ?? 9999;        bv = b.days_to_expiry ?? 9999; }
      return sortDir === "desc" ? bv - av : av - bv;
    });

    return rows;
  }, [allMarkets, tagFilter, minVolNum, includeSports, sortCol, sortDir]);

  const ColHeader = ({ col, label, align = "left" }: { col: ScreenerSortCol; label: string; align?: "left" | "right" | "center" }) => {
    const active = sortCol === col;
    const arrow = sortDir === "desc" ? "↓" : "↑";
    return (
      <th
        onClick={() => handleColClick(col)}
        className={`px-2 py-2 text-${align} text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors ${active ? "text-blue-400" : "text-white/30 hover:text-white/60"}`}
      >
        {label}{active && <span className="ml-0.5 text-[9px]">{arrow}</span>}
      </th>
    );
  };

  return (
    <GlassCard className="p-5 mb-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">Polymarket Screener</h2>
          <LiveBadge />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIncludeSports((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${
              includeSports
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-white/[0.04] border-white/[0.08] text-white/35 hover:text-white/55"
            }`}
            title={includeSports ? "Sports bets are shown — click to hide" : "Sports bets are hidden — click to show"}
          >
            🏆 <span>{includeSports ? "Sports: On" : "Sports: Off"}</span>
          </button>
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 focus:outline-none">
            <option value="">All Categories</option>
            {["Trending","Breaking","New","Politics","Sports","Crypto","Finance","Geopolitics","Tech","Culture","Economy","Weather","Mentions","Election"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={minVol} onChange={(e) => setMinVol(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/60 focus:outline-none">
            <option value="">Any Volume</option>
            <option value="100000">$100K+</option>
            <option value="500000">$500K+</option>
            <option value="1000000">$1M+</option>
            <option value="10000000">$10M+</option>
          </select>
          <button onClick={() => fetchMarkets(tagFilter || undefined)} className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 text-white/40 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      {(tagFilter || !includeSports) && (
        <div className="mb-3 flex items-center gap-3 flex-wrap text-[11px] text-white/40">
          {tagFilter && (
            <span>
              <span className="text-white/70 font-semibold">{markets.length}</span> market{markets.length !== 1 ? "s" : ""} in <span className="text-blue-400 font-semibold">{tagFilter}</span>
              <button onClick={() => setTagFilter("")} className="ml-1.5 text-white/30 hover:text-white/60 transition-colors">✕</button>
            </span>
          )}
          {!includeSports && (
            <span className="text-amber-400/60">
              🏆 Sports bets hidden
              <button onClick={() => setIncludeSports(true)} className="ml-1.5 text-white/30 hover:text-amber-400/60 transition-colors">show</button>
            </span>
          )}
        </div>
      )}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
      ) : markets.length === 0 ? (
        <div className="text-center py-8 text-sm text-white/30">No markets match the selected filters</div>
      ) : (
        <div className="overflow-auto max-h-[460px]">
          <table className="w-full min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-[#080d16]">
              <tr className="border-b border-white/[0.06]">
                <th className="px-2 py-2 text-left text-[10px] font-semibold text-white/30 uppercase tracking-wider">Market</th>
                <ColHeader col="yes_pct"    label="YES%" />
                <ColHeader col="change_1h"  label="1H Δ" />
                <ColHeader col="change_24h" label="24H Δ" />
                <ColHeader col="change_1wk" label="1W Δ" />
                <ColHeader col="volume"     label="Vol 24h" />
                <ColHeader col="momentum"   label="Momentum" />
                <ColHeader col="whale"      label="Whale" align="center" />
                <ColHeader col="efficiency" label="Efficiency" />
                <ColHeader col="expires"    label="Expires" />
              </tr>
            </thead>
            <tbody>
              {markets.map((m, i) => (
                <tr key={m.id ?? i} className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                  <td className="px-2 py-2.5 max-w-[260px]">
                    <a href={m.slug ? `https://polymarket.com/event/${m.slug}` : "#"} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-white/75 hover:text-white transition-colors leading-tight line-clamp-2 block">
                      {m.question}
                    </a>
                  </td>
                  <td className="px-2 py-2.5">
                    {m.yes_pct != null && <span className={`text-sm font-bold ${m.yes_pct >= 60 ? "text-emerald-400" : m.yes_pct <= 40 ? "text-red-400" : "text-blue-400"}`}>{m.yes_pct}%</span>}
                  </td>
                  <td className="px-2 py-2.5">
                    {m.price_change_1h == null ? <span className="text-[11px] text-white/20">—</span>
                    : <span className={`text-[11px] font-bold font-mono ${m.price_change_1h > 0 ? "text-emerald-400" : m.price_change_1h < 0 ? "text-red-400" : "text-white/25"}`}>
                        {m.price_change_1h > 0 ? "+" : ""}{m.price_change_1h.toFixed(1)}%
                      </span>}
                  </td>
                  <td className="px-2 py-2.5">
                    {m.is_expired ? <span className="text-[11px] text-white/20">—</span>
                    : m.price_change_1d == null ? <span className="text-[11px] text-white/20">—</span>
                    : <span className={`text-[11px] font-bold font-mono ${m.price_change_1d > 0 ? "text-emerald-400" : m.price_change_1d < 0 ? "text-red-400" : "text-white/25"}`}>
                        {m.price_change_1d > 0 ? "+" : ""}{m.price_change_1d.toFixed(1)}%
                      </span>}
                  </td>
                  <td className="px-2 py-2.5">
                    {m.price_change_1wk == null ? <span className="text-[11px] text-white/20">—</span>
                    : <span className={`text-[11px] font-bold font-mono ${m.price_change_1wk > 0 ? "text-emerald-400" : m.price_change_1wk < 0 ? "text-red-400" : "text-white/25"}`}>
                        {m.price_change_1wk > 0 ? "+" : ""}{m.price_change_1wk.toFixed(1)}%
                      </span>}
                  </td>
                  <td className="px-2 py-2.5 text-[11px] text-white/40 font-mono">{m.volume_24h != null ? formatVolume(m.volume_24h) : "—"}</td>
                  <td className="px-2 py-2.5">{momentumBadge(m.volume_momentum)}</td>
                  <td className="px-2 py-2.5 text-center">{m.whale_activity && <span title="Whale active" className="text-base">🐋</span>}</td>
                  <td className="px-2 py-2.5">{effBadge(m.market_efficiency_score)}</td>
                  <td className="px-2 py-2.5 text-[11px] text-white/40">{m.days_to_expiry != null ? `${m.days_to_expiry}d` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Category Breakdown Chart ──────────────────────────────────────
function CategoryChart() {
  const [cats, setCats] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/predict/categories")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.categories) setCats(d.categories.slice(0, 15)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const maxVol = Math.max(...cats.map((c) => c.volume_24h ?? 0), 1);
  return (
    <GlassCard className="p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-teal-400" />
        <h2 className="text-sm font-bold text-white">Category Volume</h2>
        <span className="text-[10px] text-white/30">24h trading volume by category</span>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-7 rounded bg-white/[0.03] animate-pulse" />)}</div>
      ) : cats.length === 0 ? (
        <div className="text-center py-6 text-sm text-white/30">No category data</div>
      ) : (
        <div className="space-y-2">
          {cats.map((c) => {
            const pct = maxVol > 0 ? ((c.volume_24h ?? 0) / maxVol) * 100 : 0;
            return (
              <div key={c.tag} className="flex items-center gap-3">
                <div className="w-[110px] text-[11px] text-white/60 truncate flex-shrink-0 text-right">{c.tag}</div>
                <div className="flex-1 h-5 bg-white/[0.04] rounded overflow-hidden">
                  <div className="h-full rounded bg-gradient-to-r from-blue-500/60 to-purple-500/60 transition-all duration-500 flex items-center pl-2"
                    style={{ width: `${Math.max(pct, 2)}%` }}>
                    {pct > 15 && <span className="text-[9px] text-white/70 font-mono">{formatVolume(c.volume_24h ?? 0)}</span>}
                  </div>
                </div>
                <div className="w-[52px] text-[10px] text-white/30 font-mono flex-shrink-0">{formatVolume(c.volume_24h ?? 0)}</div>
                <div className="w-[28px] text-[10px] text-white/20 flex-shrink-0">{c.count != null ? `×${c.count}` : ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}

// ─── Whale Watch Panel ────────────────────────────────────────────
function WhaleWatchPanel() {
  const [items, setItems] = useState<WhaleWatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/predict/whale-watch?limit=20")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setItems(Array.isArray(d) ? d : (d?.markets ?? d?.results ?? [])); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return (
    <GlassCard className="p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Waves className="w-4 h-4 text-purple-400" />
        <h2 className="text-sm font-bold text-white">Whale Watch</h2>
        <span className="text-[10px] text-white/30">Volume/liquidity ratio — signals large coordinated positions</span>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-sm text-white/30">No whale activity detected</div>
      ) : (
        <div>
          {/* Column headers */}
          <div className="flex items-center gap-3 px-3 pb-2 mb-1 border-b border-white/[0.05]">
            <span className="flex-1 text-[9px] font-semibold text-white/25 uppercase tracking-wider">Market</span>
            <span className="w-[118px] text-right text-[9px] font-semibold text-white/25 uppercase tracking-wider">Vol/Liq</span>
            <span className="w-14 text-right text-[9px] font-semibold text-white/25 uppercase tracking-wider">24h Vol</span>
            <span className="w-9 text-right text-[9px] font-semibold text-white/25 uppercase tracking-wider">YES</span>
            <span className="w-8 text-center text-[9px] font-semibold text-white/25 uppercase tracking-wider">Eff</span>
            <span className="w-10 text-right text-[9px] font-semibold text-white/25 uppercase tracking-wider">1d Δ</span>
          </div>
          <div className="space-y-2">
          {items.map((w, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-3 py-2.5 flex items-center gap-3 group"
              title={`Volume is ${w.vol_liq_ratio?.toFixed(1)}× the available liquidity — signals large coordinated position`}>
              <div className="flex-1 min-w-0">
                <a href={w.slug ? `https://polymarket.com/event/${w.slug}` : "#"} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-white/70 hover:text-white transition-colors leading-tight block truncate">
                  {w.question?.slice(0, 65) || "—"}
                </a>
              </div>
              <span className="w-[118px] text-right text-xs font-bold text-purple-400 font-mono flex-shrink-0 whitespace-nowrap">
                {w.vol_liq_ratio != null ? `${w.vol_liq_ratio.toFixed(1)}× liquidity` : "—"}
              </span>
              <span className="w-14 text-right text-[11px] font-mono text-white/40 flex-shrink-0">{w.volume_24h != null ? formatVolume(w.volume_24h) : "—"}</span>
              <span className={`w-9 text-right text-xs font-bold font-mono flex-shrink-0 ${w.yes_pct != null ? (w.yes_pct >= 60 ? "text-emerald-400" : w.yes_pct <= 40 ? "text-red-400" : "text-blue-400") : "text-white/20"}`}>
                {w.yes_pct != null ? `${w.yes_pct}%` : "—"}
              </span>
              <span className="w-8 flex justify-center flex-shrink-0">
                {w.market_efficiency_score != null ? effBadge(w.market_efficiency_score) : <span className="text-white/20 text-[10px]">—</span>}
              </span>
              <span className={`w-10 text-right text-[10px] font-bold font-mono flex-shrink-0 ${w.price_change_1d != null ? (w.price_change_1d > 0 ? "text-emerald-400" : w.price_change_1d < 0 ? "text-red-400" : "text-white/25") : "text-white/20"}`}>
                {w.price_change_1d != null ? `${w.price_change_1d > 0 ? "+" : ""}${w.price_change_1d.toFixed(1)}%` : "—"}
              </span>
            </div>
          ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── TradingAgents Analysis Panel ────────────────────────────────
const ANALYSIS_STEPS = [
  { label: "Fundamentals agent analyzing…",   ms: 0     },
  { label: "Sentiment agent analyzing…",      ms: 12000 },
  { label: "Bull & Bear debating…",           ms: 28000 },
  { label: "Risk Manager deciding…",          ms: 50000 },
];

function AnalysisPanel({ noCard = false }: { noCard?: boolean }) {
  const { authFetch } = useAuth();
  const [question, setQuestion] = useState("");
  const [status, setStatus]     = useState<"idle" | "context" | "analyzing" | "done" | "error">("idle");
  const [stepIdx, setStepIdx]   = useState(0);
  const [contextMkts, setContextMkts] = useState<EnhancedMarket[]>([]);
  const [result, setResult]     = useState<AnalysisResponse | null>(null);
  const [errMsg, setErrMsg]     = useState("");
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const timerRefs               = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timerRefs.current.forEach(clearTimeout); timerRefs.current = []; };

  const runAnalysis = async () => {
    if (!question.trim() || status === "analyzing") return;
    clearTimers();
    setStatus("context"); setStepIdx(0); setResult(null); setErrMsg(""); setContextMkts([]); setOpenAgent(null);

    // Fetch context first
    try {
      const ctx = await fetch(`/api/predict/context?question=${encodeURIComponent(question.trim())}`);
      if (ctx.ok) {
        const d = await ctx.json();
        setContextMkts(Array.isArray(d) ? d : (d.markets ?? d.relevant_markets ?? []));
      }
    } catch {}

    setStatus("analyzing"); setStepIdx(0);
    ANALYSIS_STEPS.forEach((step, idx) => {
      if (idx === 0) return;
      const id = setTimeout(() => setStepIdx(idx), step.ms);
      timerRefs.current.push(id);
    });

    try {
      const r = await authFetch("/api/predict/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      clearTimers();
      if (!r.ok) throw new Error(`Backend ${r.status}`);
      const d: AnalysisResponse = await r.json();
      setResult(d); setStatus("done");
    } catch (e: any) {
      clearTimers();
      setErrMsg(e?.message ?? "Analysis failed"); setStatus("error");
    }
  };

  const reset = () => { clearTimers(); setStatus("idle"); setResult(null); setContextMkts([]); setOpenAgent(null); };

  const f = result?.final;
  const agentEntries = Object.entries(result?.agents ?? {});

  const inner = (
    <>
      {/* Header — only shown in card mode */}
      {!noCard && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Caelyn Analyzes <Star className="w-3.5 h-3.5 text-amber-400" />
            </h2>
            <p className="text-[10px] text-white/30">Multi-agent prediction market analysis — 30-90 seconds</p>
          </div>
          {status !== "idle" && (
            <button onClick={reset} className="ml-auto text-[10px] text-white/30 hover:text-white/60 transition-colors border border-white/[0.06] rounded px-2 py-1">Reset</button>
          )}
        </div>
      )}
      {noCard && status !== "idle" && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] text-white/30">Multi-agent prediction market analysis — 30-90 seconds</p>
          <button onClick={reset} className="text-[10px] text-white/30 hover:text-white/60 transition-colors border border-white/[0.06] rounded px-2 py-1">Reset</button>
        </div>
      )}

      {/* Input */}
      {(status === "idle" || status === "error") && (
        <div className="space-y-3">
          <div className="relative">
            <input
              value={question} onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runAnalysis(); }}
              placeholder="Will the Fed cut rates in June? | Will Bitcoin hit $100K by end of year?"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 pr-[90px]"
            />
            <button onClick={runAnalysis} disabled={!question.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-[11px] font-semibold transition-all disabled:opacity-40">
              Analyze
            </button>
          </div>
          {status === "error" && <p className="text-xs text-red-400 bg-red-500/[0.07] border border-red-500/20 rounded-lg px-3 py-2">Error: {errMsg}</p>}
          <div className="flex flex-wrap gap-2">
            {["Will the Fed cut rates in June?", "Will Bitcoin hit $100K?", "Will there be a US recession in 2025?"].map((p) => (
              <button key={p} onClick={() => setQuestion(p)}
                className="text-[10px] text-white/35 hover:text-white/60 border border-white/[0.06] rounded-full px-2.5 py-1 hover:border-white/10 transition-all">
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Context markets (shown while analysis runs) */}
      {(status === "context" || status === "analyzing") && (
        <div className="space-y-3">
          {/* Loading steps */}
          <div className="bg-black/20 border border-white/[0.06] rounded-xl p-4 space-y-2.5">
            {ANALYSIS_STEPS.map((step, idx) => (
              <div key={idx} className={`flex items-center gap-2.5 transition-opacity ${idx <= stepIdx ? "opacity-100" : "opacity-20"}`}>
                {idx < stepIdx ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  : idx === stepIdx ? <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                  : <div className="w-4 h-4 rounded-full border border-white/20 flex-shrink-0" />}
                <span className={`text-xs ${idx === stepIdx ? "text-amber-300 font-semibold" : idx < stepIdx ? "text-white/50" : "text-white/25"}`}>{step.label}</span>
              </div>
            ))}
          </div>

          {contextMkts.length > 0 && (
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Relevant markets Caelyn is looking at</div>
              <div className="space-y-1.5">
                {contextMkts.slice(0, 4).map((m, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2 flex items-center gap-2">
                    <p className="flex-1 text-[11px] text-white/60 truncate">{m.question}</p>
                    {m.yes_pct != null && <span className="text-xs font-bold font-mono text-blue-400">{m.yes_pct}%</span>}
                    {m.volume_24h != null && <span className="text-[10px] text-white/25 font-mono">{formatVolume(m.volume_24h)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {status === "done" && f && (
        <div className="space-y-4">
          {/* Main verdict */}
          <div className="bg-black/25 border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                {recoBadge(f.recommendation)}
                {f.conviction && <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">{f.conviction}</div>}
              </div>
              <div className="text-right">
                {f.final_yes_probability_pct != null && <div className="text-lg font-bold text-white">Caelyn says: <span className="text-blue-400">{f.final_yes_probability_pct}% YES</span></div>}
                {f.market_price_pct != null && <div className="text-sm text-white/40">Market says: {f.market_price_pct}% YES</div>}
                {f.edge_pct != null && <div className={`text-sm font-bold ${f.edge_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>{f.edge_pct >= 0 ? "+" : ""}{f.edge_pct.toFixed(1)}% edge</div>}
              </div>
            </div>
            {f.debate_winner && <div className="text-[11px] text-white/40 mt-2 border-t border-white/[0.06] pt-2">{f.debate_winner}</div>}
          </div>

          {/* Thesis */}
          {f.thesis && <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4"><p className="text-sm text-white/80 leading-relaxed">{f.thesis}</p></div>}

          {/* Risk */}
          {f.key_risk && (
            <div className="flex items-start gap-2 bg-red-500/[0.05] border border-red-500/20 rounded-xl p-3">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300/80">{f.key_risk}</p>
            </div>
          )}

          {/* Position/entry/exit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[["Sizing", f.position_sizing], ["Entry", f.entry_note], ["Exit", f.exit_note]].map(([k, v]) => v && (
              <div key={k} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                <div className="text-[9px] text-white/30 uppercase tracking-widest mb-1 font-semibold">{k}</div>
                <p className="text-[11px] text-white/70">{v}</p>
              </div>
            ))}
          </div>

          {/* Agent accordion */}
          {agentEntries.length > 0 && (
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Agent Reasoning</div>
              <div className="space-y-1.5">
                {agentEntries.map(([name, ag]) => (
                  <div key={name} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                    <button onClick={() => setOpenAgent(openAgent === name ? null : name)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors">
                      <span className="text-[11px] font-semibold text-white/70 capitalize">{name.replace(/_/g, " ")}</span>
                      {openAgent === name ? <ChevronDown className="w-3.5 h-3.5 text-white/30" /> : <ChevronRight className="w-3.5 h-3.5 text-white/30" />}
                    </button>
                    {openAgent === name && (
                      <div className="px-4 pb-3 text-[11px] text-white/60 space-y-1.5 border-t border-white/[0.05]">
                        {ag.summary && <p className="mt-2 leading-relaxed">{ag.summary}</p>}
                        {ag.base_rate_estimate && <p><span className="text-white/30 font-semibold">Base rate: </span>{ag.base_rate_estimate}</p>}
                        {ag.confidence && <p><span className="text-white/30 font-semibold">Confidence: </span>{ag.confidence}</p>}
                        {ag.media_sentiment && <p><span className="text-white/30 font-semibold">Media sentiment: </span>{ag.media_sentiment}</p>}
                        {ag.crowd_wisdom && <p><span className="text-white/30 font-semibold">Crowd wisdom: </span>{ag.crowd_wisdom}</p>}
                        {ag.trend && <p><span className="text-white/30 font-semibold">Trend: </span>{ag.trend}</p>}
                        {ag.smart_money_signal && <p><span className="text-white/30 font-semibold">Smart money: </span>{ag.smart_money_signal}</p>}
                        {ag.primary_argument && <p><span className="text-white/30 font-semibold">Argument: </span>{ag.primary_argument}</p>}
                        {ag.key_catalyst && <p><span className="text-white/30 font-semibold">Catalyst: </span>{ag.key_catalyst}</p>}
                        {ag.key_risk && <p><span className="text-white/30 font-semibold">Risk: </span>{ag.key_risk}</p>}
                        {(ag.supporting_evidence ?? []).length > 0 && (
                          <ul className="list-disc list-inside space-y-0.5">{ag.supporting_evidence!.map((e, i) => <li key={i}>{e}</li>)}</ul>
                        )}
                        {(ag.bull_points_adopted ?? []).length > 0 && (
                          <div><span className="text-emerald-400/70 font-semibold">Bull points: </span>{ag.bull_points_adopted!.join(" · ")}</div>
                        )}
                        {(ag.bear_points_adopted ?? []).length > 0 && (
                          <div><span className="text-red-400/70 font-semibold">Bear points: </span>{ag.bear_points_adopted!.join(" · ")}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relevant markets */}
          {(result?.relevant_markets ?? []).length > 0 && (
            <div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Markets Used in Analysis</div>
              <div className="space-y-1.5">
                {result!.relevant_markets!.slice(0, 5).map((m, i) => (
                  <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2 flex items-center gap-2">
                    <p className="flex-1 text-[11px] text-white/60 truncate">{m.question}</p>
                    {m.yes_pct != null && <span className="text-xs font-bold font-mono text-blue-400">{m.yes_pct}%</span>}
                    {m.volume_24h != null && <span className="text-[10px] text-white/25 font-mono">{formatVolume(m.volume_24h)}</span>}
                    {effBadge(m.market_efficiency_score)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
  return noCard ? inner : <GlassCard className="p-5 mb-5">{inner}</GlassCard>;
}

// ─── Prediction Markets Agent ─────────────────────────────────────

interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const SUGGESTED_PROMPT_GROUPS = [
  {
    label: "Markets",
    prompts: [
      "How do the current Fed rate cut odds affect equity sectors?",
      "If the top crypto events play out, what's the best positioning?",
      "Which prediction market events have the biggest cross-asset implications?",
      "What are the most mispriced prediction markets right now?",
    ],
  },
  {
    label: "Analysis",
    prompts: [
      "Will the Fed cut rates this year? Analyze the current odds.",
      "Will Bitcoin hit $100K? What do the markets imply?",
      "Will there be a US recession in 2025? Break down the signals.",
      "Which surging markets have the best risk/reward right now?",
      "What is whale activity signaling about near-term crypto direction?",
    ],
  },
];

function buildSignalsContext(signals: SignalsData | null): string {
  if (!signals) return "";
  const s = signals.summary;
  const lines: string[] = [];
  if (s) {
    lines.push("=== LIVE POLYMARKET SNAPSHOT ===");
    if (s.total_volume_24h   != null) lines.push(`Total 24h Volume: ${formatVolume(s.total_volume_24h)}`);
    if (s.market_count       != null) lines.push(`Active Markets: ${s.market_count}`);
    if (s.surging_count      != null) lines.push(`Surging Markets: ${s.surging_count}`);
    if (s.fading_count       != null) lines.push(`Fading Markets: ${s.fading_count}`);
    if (s.whale_active_count != null) lines.push(`Whale-Active Markets: ${s.whale_active_count}`);
    if (s.avg_spread_pct     != null) lines.push(`Avg Spread: ${s.avg_spread_pct.toFixed(2)}%`);
  }
  if (signals.top_edges?.length) {
    lines.push("\n--- TOP EDGES (widest bid-ask spread vs YES price) ---");
    signals.top_edges.slice(0, 5).forEach((e) => {
      lines.push(`• ${e.question} | YES: ${e.yes_pct ?? "?"}% | Spread: ${(e.edge_pct ?? e.spread_pct_of_price ?? 0).toFixed(1)}%`);
    });
  }
  if (signals.top_mispricings?.length) {
    lines.push("\n--- ORDER BOOK DIVERGENCE (CLOB mid ≠ displayed price) ---");
    signals.top_mispricings.slice(0, 5).forEach((m) => {
      lines.push(`• ${m.question} | YES: ${m.yes_pct ?? "?"}% | Δ ${m.mispricing_score?.toFixed(3) ?? "?"}`);
    });
  }
  if (signals.surging_markets?.length) {
    lines.push("\n--- SURGING MARKETS (24h vol > 3× 7-day average) ---");
    signals.surging_markets.slice(0, 5).forEach((m) => {
      lines.push(`• ${m.question} | Vol: ${m.volume_24h != null ? formatVolume(m.volume_24h) : "?"} | ${m.volume_momentum?.toUpperCase() ?? ""}`);
    });
  }
  if (signals.whale_markets?.length) {
    lines.push("\n--- WHALE ACTIVITY (high vol/liquidity ratio = large coordinated positions) ---");
    signals.whale_markets.slice(0, 5).forEach((w) => {
      lines.push(`• ${w.question} | YES: ${w.yes_pct ?? "?"}% | ${w.vol_liq_ratio?.toFixed(1) ?? "?"}× liquidity`);
    });
  }
  return lines.join("\n");
}

function PredictionAgent({ signals }: { signals: SignalsData | null }) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: AgentMessage = { role: "user", content: text.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const signalsContext = buildSignalsContext(signals);
      const payload: Record<string, unknown> = {
        query: text.trim(),
        preset_intent: "prediction_markets",
        history: history.length > 0 ? history : undefined,
        conversation_id: conversationId,
        context: signalsContext || undefined,
        market_context: signalsContext ? {
          summary: signals?.summary,
          top_edges: signals?.top_edges?.slice(0, 5),
          top_mispricings: signals?.top_mispricings?.slice(0, 5),
          surging_markets: signals?.surging_markets?.slice(0, 5),
          whale_markets: signals?.whale_markets?.slice(0, 5),
        } : undefined,
      };

      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Backend returned ${res.status}: ${errText.slice(0, 200)}`);
      }

      const raw = await res.text();
      const data = JSON.parse(raw.trim());
      const convId = data.conversation_id || conversationId;
      if (convId) setConversationId(convId);

      // Extract the analysis text from the response
      let analysisText = "";
      if (data.analysis && data.analysis.trim().length > 10) {
        analysisText = data.analysis;
      } else if (data.structured?.message) {
        analysisText = data.structured.message;
      } else if (data.structured?.analysis) {
        analysisText = data.structured.analysis;
      } else if (typeof data.message === "string") {
        analysisText = data.message;
      } else {
        analysisText = "Received response but couldn't extract analysis. Raw: " + JSON.stringify(data).slice(0, 500);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: analysisText, timestamp: Date.now() },
      ]);
      // Auto-save to history (fire-and-forget)
      fetch(`${AGENT_BACKEND_URL}/api/history`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ category: "prediction_markets", intent: "prediction_markets", content: analysisText }),
      }).catch(() => {});
    } catch (err) {
      console.error("[PREDICT_AGENT]", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Failed to reach agent. Please try again."}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, conversationId, signals]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header inside panel */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2090d0 0%, #3b82f6 50%, #80d8f8 100%)' }}>
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
            Caelyn Predicts
            {signals && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-semibold uppercase tracking-widest">Live data</span>
              </span>
            )}
          </h2>
          <p className="text-[10px] text-white/25">Prediction market odds &amp; investment implications</p>
        </div>
      </div>

      {/* Suggested prompts (only show when no messages) */}
      {messages.length === 0 && (
        <div className="flex flex-col gap-3 mb-4 max-h-[340px] overflow-y-auto scrollbar-hide">
          {SUGGESTED_PROMPT_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="text-[9px] text-white/20 uppercase tracking-widest font-semibold mb-1.5 px-0.5">{group.label}</div>
              <div className="flex flex-col gap-1.5">
                {group.prompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    disabled={loading}
                    className="text-left text-[11px] text-white/45 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 hover:bg-white/[0.06] hover:text-white/65 hover:border-white/10 transition-all disabled:opacity-40"
                  >
                    <MessageSquare className="w-3 h-3 inline mr-1.5 opacity-40" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="mb-4 max-h-[500px] overflow-y-auto space-y-3 scrollbar-hide">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg px-4 py-3 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-100"
                  : "bg-white/[0.03] border border-white/[0.06] text-white/80"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  msg.role === "user" ? "text-blue-400" : "text-orange-400"
                }`}>
                  {msg.role === "user" ? "You" : "Agent"}
                </span>
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="rounded-lg px-4 py-3 bg-white/[0.03] border border-white/[0.06] text-xs text-white/40">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing prediction markets data with macro context...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about prediction market implications... (e.g., &quot;How do rate cut odds affect tech stocks?&quot;)"
          disabled={loading}
          rows={1}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/25 resize-none focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 disabled:opacity-40 transition-all"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="text-white px-3 py-2 rounded-lg transition-all disabled:opacity-30 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #2090d0, #3b82f6, #80d8f8)' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>

      {/* Clear conversation */}
      {messages.length > 0 && (
        <button
          onClick={() => { setMessages([]); setConversationId(null); }}
          className="mt-2 text-[9px] text-white/20 hover:text-white/40 transition-colors"
        >
          Clear conversation
        </button>
      )}
    </div>
  );
}

// ─── Caelyn Predicts Dropdown ─────────────────────────────────────

function CaelynPredictsDropdown({ signals }: { signals: SignalsData | null }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex flex-col items-center justify-center gap-1 w-[76px] h-[64px] rounded-xl text-[10px] font-semibold transition-all"
        style={{
          background: open ? 'rgba(32,144,208,0.18)' : 'rgba(32,144,208,0.08)',
          border: `1px solid ${open ? 'rgba(32,144,208,0.5)' : 'rgba(32,144,208,0.2)'}`,
          color: '#80d8f8',
        }}
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-center leading-tight">Caelyn<br/>Predicts</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl p-5 z-50"
          style={{
            width: 420,
            background: 'rgba(5,8,16,0.97)',
            border: '1px solid rgba(32,144,208,0.2)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(32,144,208,0.05) inset',
            backdropFilter: 'blur(20px)',
          }}
        >
          <PredictionAgent signals={signals} />
        </div>
      )}
    </div>
  );
}

// ─── Caelyn Analyzes Dropdown ─────────────────────────────────────

function CaelynAnalyzesDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex flex-col items-center justify-center gap-1 w-[76px] h-[64px] rounded-xl text-[10px] font-semibold transition-all"
        style={{
          background: open ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${open ? 'rgba(245,158,11,0.5)' : 'rgba(245,158,11,0.2)'}`,
          color: '#fbbf24',
        }}
      >
        <Brain className="w-4 h-4" />
        <span className="text-center leading-tight">Caelyn<br/>Analyzes</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl p-5 z-50 overflow-y-auto"
          style={{
            width: 460,
            maxHeight: '80vh',
            background: 'rgba(5,8,16,0.97)',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.05) inset',
            backdropFilter: 'blur(20px)',
          }}
        >
          <AnalysisPanel noCard />
        </div>
      )}
    </div>
  );
}

// ─── Betting Platforms Dropdown ───────────────────────────────────

const BETTING_PLATFORMS = [
  { name: "Predict Base",       sub: "Analytics & Trading",      url: "https://predictbase.app/" },
  { name: "Bet Base",           sub: "Aggregated Odds",          url: "https://betbase.xyz/" },
  { name: "PMX",                sub: "Pro Exchange",             url: "https://pmx.trade/markets" },
  { name: "Kalshi",             sub: "CFTC-Regulated",           url: "https://kalshi.com/" },
  { name: "TrueMarkets",        sub: "Decentralized",            url: "https://app.truemarkets.org/en/markets" },
  { name: "Cloudbet",           sub: "Crypto Sports Betting",    url: "https://www.cloudbet.com/en/sports" },
  { name: "Betly.trade",        sub: "Social Betting",           url: "https://www.betly.trade/categories" },
  { name: "Limitless Exchange", sub: "Crypto Predictions",       url: "https://limitless.exchange/advanced" },
  { name: "Overtime Markets",   sub: "Sports — Decentralized",   url: "https://www.overtimemarkets.xyz/markets?status=OpenMarkets&sport=Live" },
];

function BettingPlatformsDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex flex-col items-center justify-center gap-1 w-[76px] h-[64px] rounded-xl text-[10px] font-semibold transition-all"
        style={{
          background: open ? 'rgba(120,100,200,0.18)' : 'rgba(120,100,200,0.08)',
          border: `1px solid ${open ? 'rgba(160,130,240,0.4)' : 'rgba(160,130,240,0.15)'}`,
          color: 'rgba(180,160,240,0.85)',
        }}
      >
        <Layers className="w-4 h-4" />
        <span className="text-center leading-tight">Other<br/>Platforms</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl z-50 overflow-hidden"
          style={{
            width: 300,
            background: 'rgba(5,8,16,0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Betting Platforms</p>
          </div>
          <div className="py-1.5">
            {BETTING_PLATFORMS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.04] transition-colors group"
              >
                <div>
                  <p className="text-[12px] text-white/75 font-medium group-hover:text-white transition-colors">{p.name}</p>
                  <p className="text-[10px] text-white/30">{p.sub}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lazy Iframe (kept for backward compat) ───────────────────────

function LazyIframe({ src, title, sandbox, referrerPolicy, scrolling }: {
  src: string;
  title: string;
  sandbox?: string;
  referrerPolicy?: string;
  scrolling?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    return (
      <div
        className="w-full h-[600px] rounded-lg border border-white/10 flex flex-col items-center justify-center gap-3 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
        onClick={() => setLoaded(true)}
      >
        <ExternalLink className="w-6 h-6 text-white/20" />
        <p className="text-xs text-white/30">Click to load {title}</p>
        <p className="text-[10px] text-white/15">Loads on demand to avoid auto-popups</p>
      </div>
    );
  }
  return (
    <iframe
      src={src}
      className="w-full h-[600px] rounded-lg border border-white/[0.06]"
      title={title}
      frameBorder="0"
      sandbox={sandbox}
      referrerPolicy={referrerPolicy as React.IframeHTMLAttributes<HTMLIFrameElement>["referrerPolicy"]}
      scrolling={scrolling}
    />
  );
}

// ─── Existing Components ──────────────────────────────────────────

const SmallLink = ({ href, label }: { href: string; label: string }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
  >
    {label} <ExternalLink className="w-3 h-3" />
  </a>
);

const openInNewTab = (url: string) => {
  openSecureLink(url);
};

// ─── Main Page ────────────────────────────────────────────────────

export default function PredictPage() {
  const [pageSignals, setPageSignals] = useState<SignalsData | null>(null);

  useEffect(() => {
    fetch("/api/predict/signals")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPageSignals(d); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen text-white relative" style={{ background: '#050608', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
      `}</style>
      {/* Blue radial gradient background — same as Social page */}
      <div style={{
        position: 'fixed', top: '-40%', left: '-20%', width: '140%', height: '140%',
        background: 'radial-gradient(ellipse 800px 600px at 20% 15%, rgba(32,144,208,0.06) 0%, transparent 70%), radial-gradient(ellipse 600px 500px at 80% 70%, rgba(92,200,240,0.04) 0%, transparent 70%), radial-gradient(ellipse 900px 400px at 50% 50%, rgba(59,130,246,0.03) 0%, transparent 60%)',
        pointerEvents: 'none', zIndex: 0
      }} />
      {/* Header */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 relative" style={{ zIndex: 200 }}>
        <div className="flex items-center gap-4 mb-1">
          <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-2xl overflow-hidden flex-shrink-0" style={{ borderColor: '#5cc8f0' }}>
            <img
              src={diceImage}
              alt="Prediction Markets"
              className="w-14 h-14 object-cover"
            />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" style={{
              background: 'linear-gradient(135deg, #2090d0 0%, #3b82f6 40%, #80d8f8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Prophetik Markets
            </h1>
            <p className="text-xs text-white/30">Prediction Markets Intelligence Dashboard</p>
          </div>
          {/* Header action buttons — 4 square tiles, side by side */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <CaelynPredictsDropdown signals={pageSignals} />
            <CaelynAnalyzesDropdown />
            <a
              href="https://polymarket.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1 w-[76px] h-[64px] rounded-xl text-[10px] font-semibold transition-all"
              style={{
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.2)',
                color: 'rgba(74,222,128,0.85)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(34,197,94,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(34,197,94,0.08)'; }}
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-center leading-tight">Open<br/>Polymarket</span>
            </a>
            <BettingPlatformsDropdown />
          </div>
        </div>

        <div className="w-32 h-0.5 rounded-full mt-3 mb-4" style={{ background: 'linear-gradient(135deg, #2090d0, #3b82f6, #80d8f8)' }} />
      </div>

      {/* Main Content — full-width (agent moved to header dropdown) */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-8 relative" style={{ zIndex: 1 }}>
        <div className="flex flex-col gap-6">

          <div className="flex-1 min-w-0">

            {/* ═══ Enhanced Markets Table ═══ */}
            <EnhancedMarketsTable />

            {/* ═══ Prediction Markets Dashboard ═══ */}
            <PolymarketDashboard signals={pageSignals}>
              <WhaleWatchPanel />
            </PolymarketDashboard>

            {/* ═══ Category Volume — full width, bottom of page ═══ */}
            <CategoryChart />

          </div>

        </div>
      </main>
    </div>
  );
}
