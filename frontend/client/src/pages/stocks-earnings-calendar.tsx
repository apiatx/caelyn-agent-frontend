import { useState, useEffect, useCallback, useRef } from "react";
import { useSetPageContext } from "@/hooks/useSetPageContext";
import { useSetScreenContext } from "@/hooks/useSetScreenContext";
import { usePageContext } from "@/contexts/PageContextContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Sparkles, Calendar, ChevronLeft, ChevronRight, CalendarDays, X, Clock, Send, MessageSquare, TrendingUp, TrendingDown, DollarSign, Scissors, BarChart2, Landmark, RefreshCw, Search, ChevronDown, ChevronUp, AlertCircle, Crown, Gem, Flame, Eye, Minus, Star, LayoutGrid, List } from "lucide-react";

// ─── DATA FLOW (Catalyst Calendar) ────────────────────────────
//
// Earnings Dates > Upcoming:
//   1. On mount: GET /api/catalysts/earnings/upcoming-clean?from=...&to=...&limit=10000
//      → populates fmpDateMap (calendar day-chip counts)
//   2. On day select: GET /api/catalysts/earnings/day-clean?date={date}&limit=1000
//      → populates dayCleanEntries (enriched selected-day cards)
//
// API CALLS ON TAB CHANGE (non-upcoming tabs):
//   /api/catalysts/events?tab={tab}&... — all non-upcoming tabs
//
// API CALLS ON CLICK (popup detail):
//   /api/earnings/detail?ticker={ticker} — enriched popup detail
//
// No Finnhub. No Polymarket. No beat odds. No Smart view.
// ───────────────────────────────────────────────────────────────

// ─── Constants ────────────────────────────────────────────────────
const AGENT_BACKEND_URL = "https://fast-api-server-aidanpilon.replit.app";
const AGENT_API_KEY = "hippo_ak_7f3x9k2m4p8q1w5t";
const POLYMARKET_PROXY = `${AGENT_BACKEND_URL}/api/polymarket/events`;

function getToken(): string | null {
  return localStorage.getItem('caelyn_jwt') || sessionStorage.getItem('caelyn_jwt');
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-API-Key': AGENT_API_KEY, ...extra };
  const t = getToken();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}
const GAMMA_API = "https://gamma-api.polymarket.com/events";
const REFRESH_INTERVAL = 60_000;

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

interface EarningsEntry {
  market: ParsedMarket | null;
  ticker: string;
  company: string;
  companyName?: string;
  logo?: string;
  eps: string | null;
  quarter: string | null;
  time: string | null;
  exchange: string | null;
  beatPct: number;
  revenueEstimate: string | null;
  source: "polymarket" | "fmp" | "both";
  earningsDate: string | null;
}

interface WeekCleanEntry {
  id?: string;
  date?: string;
  session?: string;
  symbol: string;
  companyName?: string | null;
  logo?: string | null;
  image?: string | null;
  price?: number | null;
  priceChangePct?: number | null;
  marketCap?: number | null;
  marketCapBucket?: string | null;
  sector?: string | null;
  industry?: string | null;
  time?: string | null;
  period?: string | null;
  epsEstimated?: number | null;
  revenueEstimated?: number | null;
  themeTags?: string[];
  isThemeAnchor?: boolean;
  isBottleneck?: boolean;
  isFocus?: boolean;
  importanceScore?: number | null;
  source?: string;
  snapshot_source?: string;
}

interface WeekCleanDay {
  date: string;
  label: string;
  weekday: string;
  count: number;
  preMarket: WeekCleanEntry[];
  afterHours: WeekCleanEntry[];
  duringMarket: WeekCleanEntry[];
  unknown: WeekCleanEntry[];
  entries: WeekCleanEntry[];
}

interface WeekCleanResponse {
  asOf?: string;
  source?: string;
  weekStart: string;
  weekEnd: string;
  days: WeekCleanDay[];
  topEvents?: WeekCleanEntry[];
  status?: string;
  errors?: string[];
}

interface WeekAllEntry {
  symbol: string;
  companyName?: string | null;
  date?: string;
  time?: string | null;
  period?: string | null;
  epsEstimated?: number | null;
  revenueEstimated?: number | null;
}
interface WeekAllDay {
  date: string;
  label?: string;
  weekday?: string;
  count?: number;
  entries?: WeekAllEntry[];
  stocks?: WeekAllEntry[];
  events?: WeekAllEntry[];
}
interface WeekAllResponse {
  weekStart: string;
  weekEnd: string;
  days: WeekAllDay[];
}

interface MonthCuratedDay {
  date: string;
  count: number;
  topEvents: WeekCleanEntry[];
}
interface MonthCuratedResponse {
  year: number;
  month: number;
  days: MonthCuratedDay[];
}

interface MonthAllDay {
  date: string;
  dayOfMonth?: number;
  isCurrentMonth?: boolean;
  count: number;
  entries: WeekAllEntry[];
}
interface MonthAllResponse {
  year: number;
  month: number;
  days: MonthAllDay[];
}

interface EarningsDetailData {
  ticker: string;
  company_name?: string;
  sector?: string;
  industry?: string;
  description?: string;
  market_cap?: number;
  current_price?: number;
  price_change_pct?: number;
  logo?: string;
  beat_rate?: string;
  beat_pct?: number;
  avg_surprise_pct?: number;
  earnings_history?: { period: string; actual_eps: number | null; estimate_eps: number | null; surprise_percent: number | null; beat: boolean | null }[];
  analyst_consensus?: { buy: number; hold: number; sell: number; total: number; rating: string };
  news_articles?: { title: string; source: string; content: string; url: string }[];
  news_summary?: string;
  news_sentiment?: string;
}

interface SmartTicker {
  ticker: string;
  date: string;
  eps_estimate: number | null;
  revenue_estimate: number | null;
  hour: string;
  quarter: number | null;
  year: number | null;
  buzz_level: number;
  sentiment: string;
  news_signal: string;
  analyst_focus: boolean;
  one_line: string;
  score: number;
}

interface SmartDayData {
  tickers: SmartTicker[];
  count: number;
  cached_at: number;
  fallback?: boolean;
  scanning?: boolean;
  cache_status?: { status: string; last_updated: string | null; age_hours?: number };
}

interface IdentityData {
  name: string;
  logo: string | null;
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

function parseTagEvents(events: PolyEvent[]): ParsedMarket[] {
  const results: ParsedMarket[] = [];
  for (const ev of events) {
    if (!ev.active || ev.closed) continue;
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

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatMktCap(v: number | undefined): string {
  if (!v) return "N/A";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function extractTicker(question: string): string | null {
  const match = question.match(/\(([A-Z]{1,5})\)/);
  return match ? match[1] : null;
}

function extractCompanyName(question: string): string {
  const match = question.match(/^Will\s+(.+?)\s+(?:\(|beat|miss|report)/i);
  if (match) {
    let name = match[1].trim();
    if (name.endsWith("'s")) name = name.slice(0, -2);
    return name;
  }
  const ticker = extractTicker(question);
  if (ticker) return ticker;
  return question.length > 40 ? question.slice(0, 37) + "..." : question;
}

function extractEPS(description: string): string | null {
  const m = description.match(/(?:consensus|EPS|earnings)\s+(?:estimate|forecast)\s+of\s+\$?([\-\d.]+)/i)
    || description.match(/\$?([\-\d.]+)\s+(?:EPS|per share)/i)
    || description.match(/estimate\s+of\s+\$?([\-\d.]+)/i);
  return m ? `$${m[1]}` : null;
}

function extractQuarter(text: string): string | null {
  const m = text.match(/\b(Q[1-4])\s*(?:FY|CY|)\s*['"]?(\d{4})/i)
    || text.match(/\b(Q[1-4])\s+(\d{4})/i)
    || text.match(/\b(Q[1-4])\b/i);
  if (m) return m[2] ? `${m[1].toUpperCase()} ${m[2]}` : m[1].toUpperCase();
  return null;
}

function extractTime(description: string): string | null {
  if (/before\s+(the\s+)?market\s+open/i.test(description) || /pre[\s-]?market/i.test(description) || /BMO/i.test(description))
    return "Pre-Market";
  if (/after\s+(the\s+)?market\s+close/i.test(description) || /post[\s-]?market/i.test(description) || /AMC/i.test(description))
    return "After Hours";
  const timeMatch = description.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/);
  if (timeMatch) return timeMatch[1];
  return null;
}

function extractExchange(description: string): string | null {
  const m = description.match(/\b(NASDAQ|NYSE|AMEX|TSX|LSE)\b/i);
  return m ? m[1].toUpperCase() : null;
}

function buildEntry(m: ParsedMarket): EarningsEntry {
  const combined = `${m.question} ${m.description}`;
  const revMatch = m.description.match(/revenue\s+(?:estimate|forecast|consensus)?\s*(?:of\s+)?\$?([\d.]+\s*(?:B|M|billion|million))/i);
  return {
    market: m,
    ticker: extractTicker(m.question) || "???",
    company: extractCompanyName(m.question),
    eps: extractEPS(m.description),
    quarter: extractQuarter(combined),
    time: extractTime(m.description),
    exchange: extractExchange(m.description),
    beatPct: Math.round(m.yesPrice * 100),
    revenueEstimate: revMatch ? `$${revMatch[1]}` : null,
    source: "polymarket",
    earningsDate: m.endDate || null,
  };
}

function buildFmpEntry(ev: Record<string, unknown>): EarningsEntry {
  const sym = (ev.symbol || ev.ticker || "") as string;
  const rawEps = ev.epsEstimated ?? ev.eps_estimate ?? ev.epsEstimate;
  const rawRev = ev.revenueEstimated ?? ev.revenue_estimate ?? ev.revenueEstimate;
  const epsStr = rawEps != null ? `$${Number(rawEps).toFixed(2)}` : null;
  const revNum = rawRev != null ? Number(rawRev) : null;
  const revStr = revNum != null && !isNaN(revNum)
    ? (revNum >= 1e9 ? `$${(revNum / 1e9).toFixed(1)}B` : revNum >= 1e6 ? `$${(revNum / 1e6).toFixed(0)}M` : `$${revNum.toLocaleString()}`)
    : null;
  const rawTime = (ev.time || ev.hour || "") as string;
  const timeStr = rawTime === "bmo" ? "Pre-Market" : rawTime === "amc" ? "After Hours" : null;
  const period = (ev.period || ev.quarter || null) as string | null;
  const cName = (ev.companyName || ev.company_name || ev.company || ev.name ||
    (ev.title ? (ev.title as string).replace(/\s+Earnings.*$/i, "").trim() : null) || sym) as string;
  const logoUrl = (ev.logo || ev.image || null) as string | null;
  return {
    market: null,
    ticker: sym,
    company: cName,
    companyName: cName,
    logo: logoUrl ?? undefined,
    eps: epsStr,
    quarter: period,
    time: timeStr,
    exchange: null,
    beatPct: -1,
    revenueEstimate: revStr,
    source: "fmp",
    earningsDate: (ev.date || null) as string | null,
  };
}

function formatRevenue(v: number | null | undefined): string {
  if (!v) return "N/A";
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${v.toLocaleString()}`;
}

function buildBullets(entry: EarningsEntry): string[] {
  const bullets: string[] = [];
  const desc = entry.market?.description || "";

  if (entry.eps) {
    const q = entry.quarter || "quarterly";
    bullets.push(`Wall Street consensus EPS estimate of ${entry.eps} for ${q} earnings`);
  }

  if (entry.revenueEstimate) {
    bullets.push(`Revenue estimate: ${entry.revenueEstimate}`);
  }

  if (entry.beatPct >= 0) {
    const beatLabel = entry.beatPct >= 70 ? "strongly favored to beat" : entry.beatPct >= 55 ? "favored to beat" : entry.beatPct <= 30 ? "expected to miss" : entry.beatPct <= 45 ? "at risk of missing" : "near a coin flip on beating";
    bullets.push(`Polymarket crowd: ${beatLabel} estimates (${entry.beatPct}% chance of beat)`);
  }

  const revMatch = desc.match(/revenue\s+(?:estimate|forecast|consensus)?\s*(?:of\s+)?\$?([\d.]+\s*(?:B|M|billion|million))/i);
  if (revMatch) {
    bullets.push(`Revenue estimate: $${revMatch[1]}`);
  }

  const sentences = desc.split(/[.!]\s+/).filter((s) => s.length > 20 && s.length < 200);
  for (const s of sentences) {
    if (bullets.length >= 3) break;
    const lower = s.toLowerCase();
    if (lower.includes("resolve to") || lower.includes("this market")) continue;
    if (lower.includes("reports") || lower.includes("announces") || lower.includes("expects") || lower.includes("growth") || lower.includes("decline") || lower.includes("revenue") || lower.includes("sector")) {
      const cleaned = s.trim().replace(/^\W+/, "");
      if (cleaned && !bullets.some((b) => b.includes(cleaned.slice(0, 30)))) {
        bullets.push(cleaned.endsWith(".") ? cleaned : cleaned + ".");
      }
    }
  }

  if (bullets.length < 2 && entry.market) {
    bullets.push(`Trading volume: ${formatVolume(entry.market.totalVolume)} total on Polymarket`);
  }

  return bullets.slice(0, 3);
}

const TICKER_COLORS = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-emerald-500 to-emerald-600",
  "from-orange-500 to-orange-600",
  "from-rose-500 to-rose-600",
  "from-cyan-500 to-cyan-600",
  "from-yellow-500 to-yellow-600",
  "from-indigo-500 to-indigo-600",
  "from-pink-500 to-pink-600",
  "from-teal-500 to-teal-600",
];
function tickerColor(ticker: string): string {
  let h = 0;
  for (let i = 0; i < ticker.length; i++) h = (h * 31 + ticker.charCodeAt(i)) | 0;
  return TICKER_COLORS[Math.abs(h) % TICKER_COLORS.length];
}

function getSunday(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function getMonday(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const day = dt.getDay();
  if (day === 0) dt.setDate(dt.getDate() + 1);
  else if (day === 6) dt.setDate(dt.getDate() + 2);
  else dt.setDate(dt.getDate() - (day - 1));
  return dt;
}

function addDays(d: Date, n: number): Date {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />;
}

async function fetchPolymarketByTag(tagSlug: string): Promise<PolyEvent[] | null> {
  try {
    const proxyRes = await fetch(
      `${POLYMARKET_PROXY}?limit=50&tag_slug=${encodeURIComponent(tagSlug)}`
    );
    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (Array.isArray(json)) return json;
    }
  } catch { /* fall through */ }

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


async function fetchSmartEarnings(date: string): Promise<SmartDayData | null> {
  try {
    const res = await fetch(
      `${AGENT_BACKEND_URL}/api/earnings/smart/${encodeURIComponent(date)}`,
      { headers: authHeaders() }
    );
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("[SMART_EARNINGS] fetch failed:", e);
  }
  return null;
}

// ─── TradingView Chart ────────────────────────────────────────────

function TradingViewChart({ ticker }: { ticker: string }) {
  const url =
    `https://s.tradingview.com/embed-widget/advanced-chart/` +
    `?locale=en` +
    `&width=100%25` +
    `&height=620` +
    `&interval=D` +
    `&range=3M` +
    `&style=1` +
    `&toolbar_bg=0a0a0a` +
    `&enable_publishing=true` +
    `&withdateranges=true` +
    `&hide_side_toolbar=false` +
    `&allow_symbol_change=false` +
    `&calendar=false` +
    `&studies=%5B%5D` +
    `&theme=dark` +
    `&timezone=Etc%2FUTC` +
    `&hide_top_toolbar=false` +
    `&disabled_features=[%22volume_force_overlay%22,%22create_volume_indicator_by_default%22]` +
    `&enabled_features=[%22use_localstorage_for_settings%22,%22study_templates%22,%22header_indicators%22,%22header_compare%22,%22header_undo_redo%22,%22header_screenshot%22,%22header_chart_type%22,%22header_settings%22,%22header_resolutions%22,%22header_fullscreen_button%22,%22left_toolbar%22,%22drawing_templates%22]` +
    `&symbol=${encodeURIComponent(ticker)}`;

  return (
    <div style={{ width: "100%", height: 620 }}>
      <iframe
        key={ticker}
        src={url}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allowFullScreen
      />
    </div>
  );
}

// ─── Earnings Detail Modal ────────────────────────────────────────

function EarningsModal({ entry, onClose, prefetchedDetail }: { entry: EarningsEntry; onClose: () => void; prefetchedDetail?: EarningsDetailData | null }) {
  const bullets = buildBullets(entry);
  const beatPct = entry.beatPct;
  const missPct = 100 - beatPct;
  const [detail, setDetail] = useState<EarningsDetailData | null>(prefetchedDetail || null);
  const [loading, setLoading] = useState(!prefetchedDetail);
  const [fetchError, setFetchError] = useState(false);
  const [thesis, setThesis] = useState<string | null>(null);
  const [thesisLoading, setThesisLoading] = useState(false);

  const fetchThesis = async () => {
    if (thesisLoading || thesis) return;
    setThesisLoading(true);
    try {
      const companyName = detail?.company_name || entry.company || entry.ticker;

      // Build a fully-grounded context string from data we already have,
      // so Claude never has to guess whether earnings exist or when they are.
      const parts: string[] = [
        `${companyName} (${entry.ticker}) is reporting earnings${entry.quarter ? ` for ${entry.quarter}` : ""}${entry.earningsDate ? ` on ${entry.earningsDate}` : ""}.`,
      ];
      if (entry.time === "bmo") parts.push("Reports before market open.");
      else if (entry.time === "amc") parts.push("Reports after market close.");
      if (detail?.sector) parts.push(`Sector: ${detail.sector}.`);
      if (detail?.industry) parts.push(`Industry: ${detail.industry}.`);
      if (entry.eps) parts.push(`EPS estimate: ${entry.eps}.`);
      if (entry.revenueEstimate) parts.push(`Revenue estimate: ${entry.revenueEstimate}.`);
      if (entry.beatPct >= 0) parts.push(`Polymarket beat probability: ${entry.beatPct}%.`);
      if (detail?.beat_rate) parts.push(`Historical beat rate: ${detail.beat_rate}.`);
      if (detail?.avg_surprise_pct != null) parts.push(`Average EPS surprise: ${detail.avg_surprise_pct >= 0 ? "+" : ""}${detail.avg_surprise_pct}%.`);
      if (detail?.market_cap) parts.push(`Market cap: ${formatMktCap(detail.market_cap)}.`);
      if (detail?.current_price) parts.push(`Current price: $${detail.current_price.toFixed(2)}${detail.price_change_pct != null ? ` (${detail.price_change_pct >= 0 ? "+" : ""}${detail.price_change_pct.toFixed(2)}% today)` : ""}.`);
      if (detail?.analyst_consensus && detail.analyst_consensus.total > 0) {
        const c = detail.analyst_consensus;
        parts.push(`Analyst consensus: ${c.rating} (${c.buy} buy / ${c.hold} hold / ${c.sell} sell).`);
      }
      if (detail?.earnings_history && detail.earnings_history.length > 0) {
        const recent = detail.earnings_history.slice(0, 3).map(h =>
          `${h.period}: ${h.beat === true ? "BEAT" : h.beat === false ? "MISS" : "N/A"}${h.surprise_percent != null ? ` (${h.surprise_percent >= 0 ? "+" : ""}${h.surprise_percent.toFixed(1)}%)` : ""}`
        ).join(", ");
        parts.push(`Recent earnings history: ${recent}.`);
      }
      parts.push("Based only on the data above, give a direct 3-4 sentence actionable earnings thesis: is this worth playing, how, and should I position before or after the print?");

      const res = await fetch(`${AGENT_BACKEND_URL}/api/query`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          query: parts.join(" "),
          preset_intent: "earnings_catalyst",
          screen_context: { route: '/app/stocks/earnings-calendar', page: 'calendar', tab: 'earnings_dates' },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.analysis || data.structured?.message || data.structured?.analysis || data.message || "";
        setThesis(text.trim() || "No thesis available for this ticker.");
      } else {
        setThesis("Unable to generate thesis. Please try again.");
      }
    } catch {
      setThesis("Unable to reach agent. Please try again.");
    } finally {
      setThesisLoading(false);
    }
  };

  useEffect(() => {
    if (prefetchedDetail) { setDetail(prefetchedDetail); setLoading(false); return; }
    if (!entry.ticker || entry.ticker === "???") {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${AGENT_BACKEND_URL}/api/earnings/detail?ticker=${encodeURIComponent(entry.ticker)}`,
          { headers: authHeaders() }
        );
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json();
            setDetail(data);
          } else {
            setFetchError(true);
          }
        }
      } catch (e) {
        console.warn("[EarningsModal] detail fetch failed:", e);
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [entry.ticker, prefetchedDetail]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const companyName = detail?.company_name || entry.company;
  const history = detail?.earnings_history || [];
  const consensus = detail?.analyst_consensus;
  const articles = detail?.news_articles || [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-6xl max-h-[92vh] bg-[#0c0c0f] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] sticky top-0 bg-[#0c0c0f] z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {detail?.logo ? (
                <img src={detail.logo} alt={entry.ticker} className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1" />
              ) : (
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tickerColor(entry.ticker)} flex items-center justify-center`}>
                  <span className="text-sm font-bold text-white">{entry.ticker.slice(0, 2)}</span>
                </div>
              )}
              <div>
                <h3 className="text-base font-bold text-white">{companyName}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono text-white/50">{entry.ticker}</span>
                  {entry.exchange && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30">{entry.exchange}</span>
                  )}
                  {entry.quarter && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/70">{entry.quarter}</span>
                  )}
                  {detail?.sector && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/25">{detail.sector}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {detail?.current_price && (
                <div className="text-right">
                  <p className="text-sm font-bold text-white">${detail.current_price.toFixed(2)}</p>
                  {detail.price_change_pct != null && (
                    <p className={`text-[10px] font-semibold ${detail.price_change_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {detail.price_change_pct >= 0 ? "+" : ""}{detail.price_change_pct.toFixed(2)}%
                    </p>
                  )}
                </div>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          </div>
        </div>

        {/* ─── TradingView Chart ─── */}
        <div className="border-b border-white/[0.06]">
          <div className="flex items-center gap-1.5 px-6 pt-4 pb-2">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-wider">Chart</span>
            <span className="text-[9px] text-white/20 font-mono">{entry.ticker}</span>
          </div>
          <TradingViewChart ticker={entry.ticker} />
        </div>

        {/* ─── Company Description ─── */}
        {(detail?.description || detail?.industry || detail?.sector) && (
          <div className="px-6 py-3 border-b border-white/[0.06]">
            <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-1.5">About</h4>
            {detail.description ? (
              <p className="text-xs text-white/65 leading-relaxed">{detail.description}</p>
            ) : (
              <p className="text-xs text-white/65 leading-relaxed">
                {detail.company_name || entry.company} is a
                {detail.sector ? ` ${detail.sector}` : ""} company
                {detail.industry ? ` in the ${detail.industry} industry` : ""}.
              </p>
            )}
          </div>
        )}
        {loading && !detail && (
          <div className="px-6 py-3 border-b border-white/[0.06]">
            <div className="h-3 w-3/4 rounded bg-white/5 animate-pulse mb-1.5" />
            <div className="h-3 w-1/2 rounded bg-white/5 animate-pulse" />
          </div>
        )}

        {/* ─── Claude Thesis (on-demand) ─── */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-blue-400" /> Claude Thesis
            </h4>
            {!thesis && !thesisLoading && (
              <button
                onClick={fetchThesis}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'linear-gradient(135deg, #2090d0, #3b82f6)', color: 'white' }}
              >
                <Sparkles className="w-3 h-3" />
                Get Thesis
              </button>
            )}
          </div>
          {thesisLoading && (
            <div className="flex items-center gap-2 text-xs text-white/40 py-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              Analyzing {entry.ticker} earnings setup...
            </div>
          )}
          {thesis && (
            <p className="text-xs text-white/75 leading-relaxed whitespace-pre-wrap">{thesis}</p>
          )}
          {!thesis && !thesisLoading && (
            <p className="text-[11px] text-white/25">Click "Get Thesis" for a Claude take on whether to watch this earnings and how to play it.</p>
          )}
        </div>

        {/* Polymarket Beat / Miss probability */}
        {beatPct >= 0 && (
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Polymarket: Chance of Beat</span>
            <span className={`text-lg font-bold ${beatPct >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {beatPct}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden flex">
            <div
              className="h-full rounded-l-full transition-all duration-500"
              style={{ width: `${beatPct}%`, background: "linear-gradient(90deg, #22c55e, #4ade80)" }}
            />
            <div
              className="h-full rounded-r-full transition-all duration-500"
              style={{ width: `${missPct}%`, background: "linear-gradient(90deg, #ef4444, #f87171)" }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-semibold">
            <span className="text-emerald-400/70">Beat {beatPct}%</span>
            <span className="text-red-400/70">Miss {missPct}%</span>
          </div>
        </div>
        )}

        {/* Stats grid */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {entry.eps && (
              <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">EPS Est.</p>
                <p className="text-sm font-bold text-white">{entry.eps}</p>
              </div>
            )}
            {entry.time && (
              <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Report Time</p>
                <p className="text-sm font-bold text-white">{entry.time}</p>
              </div>
            )}
            {detail?.beat_rate && (
              <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Beat Record</p>
                <p className="text-sm font-bold text-emerald-400">{detail.beat_rate}</p>
              </div>
            )}
            {detail?.avg_surprise_pct != null && (
              <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Avg Surprise</p>
                <p className={`text-sm font-bold ${detail.avg_surprise_pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {detail.avg_surprise_pct >= 0 ? "+" : ""}{detail.avg_surprise_pct}%
                </p>
              </div>
            )}
            {detail?.market_cap && (
              <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
                <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Mkt Cap</p>
                <p className="text-sm font-bold text-white">{formatMktCap(detail.market_cap)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Earnings History */}
        {history.length > 0 && (
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h4 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3">Earnings History</h4>
            <div className="grid grid-cols-4 gap-2">
              {history.slice(0, 4).map((h, i) => (
                <div key={i} className={`rounded-lg p-2.5 text-center border ${
                  h.beat === true ? "bg-emerald-500/5 border-emerald-500/15" :
                  h.beat === false ? "bg-red-500/5 border-red-500/15" :
                  "bg-white/[0.02] border-white/[0.06]"
                }`}>
                  <p className="text-[9px] text-white/40 mb-1">{h.period || `Q${4 - i}`}</p>
                  <p className={`text-xs font-bold ${h.beat === true ? "text-emerald-400" : h.beat === false ? "text-red-400" : "text-white/50"}`}>
                    {h.beat === true ? "BEAT" : h.beat === false ? "MISS" : "N/A"}
                  </p>
                  {h.actual_eps != null && h.estimate_eps != null && (
                    <p className="text-[9px] text-white/30 mt-0.5">
                      ${h.actual_eps.toFixed(2)} vs ${h.estimate_eps.toFixed(2)}
                    </p>
                  )}
                  {h.surprise_percent != null && (
                    <p className={`text-[9px] font-semibold mt-0.5 ${(h.surprise_percent || 0) >= 0 ? "text-emerald-400/60" : "text-red-400/60"}`}>
                      {h.surprise_percent >= 0 ? "+" : ""}{h.surprise_percent.toFixed(1)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analyst Consensus */}
        {consensus && consensus.total > 0 && (
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Analyst Consensus</h4>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                consensus.rating === "Buy" ? "bg-emerald-500/10 text-emerald-400" :
                consensus.rating === "Sell" ? "bg-red-500/10 text-red-400" :
                "bg-yellow-500/10 text-yellow-400"
              }`}>
                {consensus.rating}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex">
              <div className="h-full bg-emerald-500/70" style={{ width: `${(consensus.buy / consensus.total) * 100}%` }} />
              <div className="h-full bg-yellow-500/50" style={{ width: `${(consensus.hold / consensus.total) * 100}%` }} />
              <div className="h-full bg-red-500/70" style={{ width: `${(consensus.sell / consensus.total) * 100}%` }} />
            </div>
            <div className="flex justify-between mt-1.5 text-[9px]">
              <span className="text-emerald-400/70">Buy {consensus.buy}</span>
              <span className="text-yellow-400/70">Hold {consensus.hold}</span>
              <span className="text-red-400/70">Sell {consensus.sell}</span>
            </div>
          </div>
        )}

        {/* AI News Summary + Sentiment */}
        {detail?.news_summary && (
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-blue-400" /> Earnings Context
              </h4>
              {detail.news_sentiment && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                  detail.news_sentiment === "Bullish" ? "bg-emerald-500/10 text-emerald-400" :
                  detail.news_sentiment === "Bearish" ? "bg-red-500/10 text-red-400" :
                  "bg-white/[0.06] text-white/40"
                }`}>
                  {detail.news_sentiment}
                </span>
              )}
            </div>
            <p className="text-xs text-white/60 leading-relaxed">{detail.news_summary}</p>
          </div>
        )}

        {/* Recent News Articles */}
        {articles.length > 0 && (
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h4 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3">Recent News</h4>
            <div className="space-y-2.5">
              {articles.slice(0, 4).map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg p-3 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all group"
                >
                  <p className="text-xs font-semibold text-white/80 group-hover:text-blue-400 transition-colors leading-snug">
                    {a.title}
                  </p>
                  {a.content && (
                    <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">
                      {a.content.slice(0, 180)}
                    </p>
                  )}
                  {a.source && (
                    <p className="text-[9px] text-white/20 mt-1">{a.source}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Loading / Error / Polymarket fallback bullets */}
        {loading && (
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-center py-4 gap-2">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-xs text-white/40">Loading earnings data...</span>
            </div>
          </div>
        )}
        {!loading && fetchError && (
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <div className="rounded-lg p-3 bg-red-500/5 border border-red-500/15">
              <p className="text-[11px] text-red-400/80 font-semibold">Unable to load enriched data</p>
              <p className="text-[10px] text-white/30 mt-1">Make sure the backend is running with the latest code. The /api/earnings/detail endpoint is required.</p>
            </div>
            <h4 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3 mt-3">Polymarket Data</h4>
            <ul className="space-y-2">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-white/70 leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!loading && !fetchError && !detail && (
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h4 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-3">Key Details</h4>
            <ul className="space-y-2">
              {bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-white/70 leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Polymarket volume stats */}
        {entry.market && (
        <div className="px-6 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-4 text-[10px] text-white/30">
            <span><span className="text-white/50 font-semibold">24h Vol:</span> {formatVolume(entry.market.volume24hr)}</span>
            <span><span className="text-white/50 font-semibold">Total Vol:</span> {formatVolume(entry.market.totalVolume)}</span>
            <span><span className="text-white/50 font-semibold">Liquidity:</span> {formatVolume(entry.market.liquidity)}</span>
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between">
          <span className="text-[9px] text-white/20">{entry.source === "both" ? "Polymarket + FMP" : entry.source === "polymarket" ? "Polymarket" : "FMP"}</span>
          {entry.market && (
          <a
            href={`https://polymarket.com/event/${entry.market.eventSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            Trade on Polymarket <ExternalLink className="w-3 h-3" />
          </a>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Weekly Earnings Board (This Week mode) ───────────────────────

function WeeklyEarningsBoard({
  weekStart,
  weekData,
  weekLoading,
  weekError,
  identityMap,
  onNavigate,
  hideNav,
  scope,
}: {
  weekStart: Date;
  weekData: WeekCleanResponse | null;
  weekLoading: boolean;
  weekError: string | null;
  identityMap: Record<string, IdentityData>;
  onNavigate: (delta: -1 | 0 | 1) => void;
  hideNav?: boolean;
  scope?: string;
}) {
  const [modalEntry, setModalEntry] = useState<EarningsEntry | null>(null);
  const todayKey = dateKey(new Date());
  const weekEnd = addDays(weekStart, 4);
  const isCurrentWeek = dateKey(weekStart) === dateKey(getMonday(new Date()));

  function toEarningsEntry(e: WeekCleanEntry): EarningsEntry {
    const epsStr = e.epsEstimated != null ? `$${Number(e.epsEstimated).toFixed(2)}` : null;
    const revStr = e.revenueEstimated != null ? formatRevenue(e.revenueEstimated) : null;
    const timeStr =
      e.time === "bmo" || e.session === "pre_market" ? "Pre-Market"
      : e.time === "amc" || e.session === "after_hours" ? "After Hours"
      : e.time || null;
    return {
      market: null,
      ticker: (e.symbol || "").toUpperCase(),
      company: e.companyName || (e.symbol || "").toUpperCase(),
      companyName: e.companyName || (e.symbol || "").toUpperCase(),
      logo: (e.logo || e.image || undefined) as string | undefined,
      eps: epsStr,
      quarter: e.period || null,
      time: timeStr,
      exchange: null,
      beatPct: -1,
      revenueEstimate: revStr,
      source: "fmp",
      earningsDate: e.date || null,
    };
  }

  function isJunkEntry(e: WeekCleanEntry): boolean {
    const sym = (e.symbol || "").toUpperCase();
    const noName = !e.companyName || e.companyName.toUpperCase() === sym;
    const unknownBucket = (e.marketCapBucket || "").toLowerCase() === "unknown";
    const noTags = !e.themeTags || e.themeTags.length === 0;
    const noSignal = !e.isThemeAnchor && !e.isBottleneck;
    return noName && unknownBucket && noTags && noSignal;
  }

  function buildReason(e: WeekCleanEntry): string | null {
    const tag = e.themeTags && e.themeTags.length > 0 ? e.themeTags[0] : null;
    const qualifier = e.isThemeAnchor ? "Anchor" : e.isBottleneck ? "Bottleneck" : null;
    if (tag) return qualifier ? `${tag} · ${qualifier}` : tag;
    if (qualifier) return qualifier;
    if (e.marketCapBucket) {
      const b = e.marketCapBucket.toLowerCase();
      if (b === "mega") return "Mega cap";
      if (b === "large") return "Large cap";
      if (b === "mid") return "Mid cap";
      if (b === "small") return "Small cap";
    }
    return null;
  }

  function SessionSection({ label, entries, colorClass, topSymbols }: { label: string; entries: WeekCleanEntry[]; colorClass: string; topSymbols?: Set<string> }) {
    // For user-owned scopes (watchlist, portfolio) every entry is intentional — skip the curated junk filter
    const isUserScope = scope === "watchlist" || scope === "portfolio";
    const clean = isUserScope
      ? entries.filter(e => !!(e.symbol))
      : entries.filter(e => !isJunkEntry(e));
    if (clean.length === 0) return null;
    return (
      <div className="mb-2">
        <p className={`text-[8px] font-bold uppercase tracking-wider mb-1.5 ${colorClass}`}>{label}</p>
        <div className="space-y-1">
          {clean.map((e, idx) => {
            const ticker = (e.symbol || "").toUpperCase();
            const name = e.companyName || ticker;
            const logo = e.logo || e.image || null;
            const pct = e.priceChangePct != null ? Number(e.priceChangePct) : null;
            const isFocus = !!e.isFocus
              || !!e.isThemeAnchor
              || !!e.isBottleneck
              || (e.importanceScore != null && e.importanceScore >= 85)
              || (topSymbols?.has(ticker) ?? false);
            const reason = buildReason(e);
            return (
              <button
                key={`${ticker}-${e.date ?? ""}-${idx}`}
                className="w-full text-left rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group p-2 flex items-center gap-2"
                onClick={() => setModalEntry(toEarningsEntry(e))}
              >
                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden ${logo ? "bg-white/[0.06]" : `bg-gradient-to-br ${tickerColor(ticker)}`}`}>
                  {logo ? (
                    <img
                      src={logo}
                      alt={ticker}
                      className="w-full h-full object-contain p-0.5"
                      onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <span className="text-[8px] font-bold text-white">{ticker.slice(0, 2)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-white/90 truncate leading-tight group-hover:text-white">{name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-mono text-white/35">{ticker}</span>
                    {pct != null && (
                      <span className={`text-[8px] font-semibold ${pct >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  {reason && (
                    <p className="text-[8px] text-white/25 truncate mt-0.5 leading-tight">{reason}</p>
                  )}
                </div>
                {isFocus && (
                  <span className="text-[7px] font-bold text-amber-400/70 border border-amber-400/25 rounded px-1 py-0.5 flex-shrink-0">FOCUS</span>
                )}
                <span className="text-white/20 group-hover:text-white/55 transition-colors text-xs flex-shrink-0 leading-none">+</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const dayMap = new Map<string, WeekCleanDay>();
  for (const d of (weekData?.days || [])) {
    dayMap.set(d.weekday, d);
  }
  const totalCalls = (weekData?.days || []).reduce((s, d) => s + (d.count || 0), 0);

  return (
    <>
      {/* ── Week navigation header ───────────────────────────── */}
      {!hideNav && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(-1)}
              className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-all text-white/40 hover:text-white/70"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {!isCurrentWeek && (
              <button
                onClick={() => onNavigate(0)}
                className="px-2.5 py-1 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-all text-[10px] font-semibold text-white/40 hover:text-white/70"
              >
                This Week
              </button>
            )}
            <button
              onClick={() => onNavigate(1)}
              className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/[0.05] transition-all text-white/40 hover:text-white/70"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-white/60">
              {MONTH_NAMES_SHORT[weekStart.getMonth()]} {weekStart.getDate()} – {MONTH_NAMES_SHORT[weekEnd.getMonth()]} {weekEnd.getDate()}, {weekEnd.getFullYear()}
            </p>
            {weekData && totalCalls > 0 && (
              <p className="text-[9px] text-white/25 mt-0.5">{totalCalls.toLocaleString()} calls this week</p>
            )}
          </div>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {weekError && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.05] mb-4">
          <AlertCircle className="w-4 h-4 text-rose-400/60 flex-shrink-0" />
          <p className="text-[11px] text-rose-400/70">{weekError}</p>
        </div>
      )}

      {/* ── Loading state ────────────────────────────────────── */}
      {weekLoading && !weekError && (
        <div className="text-center py-12">
          <Loader2 className="w-5 h-5 text-blue-400/40 mx-auto mb-2 animate-spin" />
          <p className="text-[11px] text-white/25">Loading earnings...</p>
        </div>
      )}

      {/* ── Scope empty state ─────────────────────────────────── */}
      {!weekLoading && !weekError && totalCalls === 0 && scope && scope !== "all" && (
        <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
          <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
          <p className="text-sm text-white/25">
            {scope === "watchlist"
              ? "No upcoming earnings found for your watchlist."
              : "No upcoming earnings found for your portfolio."}
          </p>
        </div>
      )}

      {/* ── Top watches this week ───────────────────────────── */}
      {!weekLoading && !weekError && (() => {
        // For user-owned scopes: skip the curated junk filter; fall back to day entries if topEvents is empty
        const isUserScope = scope === "watchlist" || scope === "portfolio";
        const topWatches: WeekCleanEntry[] = isUserScope
          ? ((weekData?.topEvents || []).filter(e => !!(e.symbol)).length > 0
              ? (weekData!.topEvents!).filter(e => !!(e.symbol))
              : (weekData?.days ?? []).flatMap(d => d.entries || []).filter(e => !!(e.symbol)))
          : (weekData?.topEvents || []).filter(e => !isJunkEntry(e));
        if (topWatches.length === 0) return null;
        const stripLabel = scope === "watchlist"
          ? "Your watchlist this week"
          : scope === "portfolio"
          ? "Your portfolio this week"
          : "Top watches this week";
        return (
        <div className="mb-4">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/25 mb-2">{stripLabel}</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {topWatches.slice(0, 12).map((e, idx) => {
              const ticker = (e.symbol || "").toUpperCase();
              const logo = e.logo || e.image || null;
              return (
                <button
                  key={`topwatch-${ticker}-${idx}`}
                  onClick={() => setModalEntry(toEarningsEntry(e))}
                  title={e.companyName || ticker}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/[0.14] transition-all flex-shrink-0 group"
                >
                  <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden ${logo ? "bg-white/[0.06]" : `bg-gradient-to-br ${tickerColor(ticker)}`}`}>
                    {logo ? (
                      <img
                        src={logo}
                        alt={ticker}
                        className="w-full h-full object-contain p-0.5"
                        onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <span className="text-[7px] font-bold text-white">{ticker.slice(0, 2)}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-white/65 group-hover:text-white/90 transition-colors">{ticker}</span>
                </button>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* ── Loading skeletons ────────────────────────────────── */}
      {weekLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {WEEKDAYS.map(day => (
            <div key={day} className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3">
              <Skeleton className="h-4 w-16 mb-1 rounded" />
              <Skeleton className="h-3 w-10 mb-3 rounded" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full mb-1.5 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ── Weekly board ────────────────────────────────────── */}
      {!weekLoading && !weekError && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {WEEKDAYS.map(weekday => {
            const day = dayMap.get(weekday);
            const dayDate = day?.date || "";
            const isToday = !!dayDate && dayDate === todayKey;
            const allUnknown = !!day && day.unknown.length > 0
              && day.preMarket.length === 0
              && day.afterHours.length === 0
              && day.duringMarket.length === 0;
            const hasAny = !!day && (
              day.preMarket.length + day.afterHours.length + day.duringMarket.length + day.unknown.length + (day.entries?.length ?? 0) > 0
            );

            return (
              <div
                key={weekday}
                className={`rounded-xl border p-3 ${isToday ? "border-blue-500/20 bg-blue-500/[0.02]" : "border-white/[0.06] bg-white/[0.01]"}`}
              >
                {/* Day header */}
                <div className="mb-2.5">
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-blue-400" : "text-white/50"}`}>
                    {weekday.slice(0, 3)}
                  </p>
                  {dayDate && (
                    <p className={`text-[9px] ${isToday ? "text-blue-400/70" : "text-white/25"}`}>
                      {MONTH_NAMES_SHORT[new Date(`${dayDate}T12:00:00`).getMonth()]} {new Date(`${dayDate}T12:00:00`).getDate()}
                    </p>
                  )}
                  {day && day.count > 0 && (
                    <p className="text-[8px] text-white/20 mt-0.5">{day.count.toLocaleString()} calls</p>
                  )}
                </div>

                {/* Content */}
                {!hasAny ? (
                  <p className="text-[9px] text-white/15 italic">
                    {scope === "watchlist" ? "No watchlist earnings" : scope === "portfolio" ? "No portfolio earnings" : "No major calls"}
                  </p>
                ) : (() => {
                  const sessionEntries = [
                    ...(day!.preMarket), ...(day!.duringMarket),
                    ...(day!.afterHours), ...(day!.unknown),
                  ];
                  // entries[] is the flat fallback array — dedupe against session-classified ones
                  const sessionSymbols = new Set(sessionEntries.map(e => e.symbol));
                  const entriesFallback = (day!.entries || []).filter(e => !sessionSymbols.has(e.symbol));
                  const allEntries = [...sessionEntries, ...entriesFallback];
                  const top3 = new Set(
                    [...allEntries]
                      .sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0))
                      .slice(0, 3)
                      .map(e => (e.symbol || "").toUpperCase())
                  );
                  return (
                    <>
                      <SessionSection label="Pre-Market" entries={day!.preMarket} colorClass="text-sky-400/60" topSymbols={top3} />
                      <SessionSection label="Market Hours" entries={day!.duringMarket} colorClass="text-emerald-400/60" topSymbols={top3} />
                      <SessionSection label="After Hours" entries={day!.afterHours} colorClass="text-purple-400/60" topSymbols={top3} />
                      <SessionSection
                        label={allUnknown ? "Key Calls" : "TBD"}
                        entries={day!.unknown}
                        colorClass="text-white/30"
                        topSymbols={top3}
                      />
                      {entriesFallback.length > 0 && (
                        <SessionSection
                          label="Earnings"
                          entries={entriesFallback}
                          colorClass="text-amber-400/60"
                          topSymbols={top3}
                        />
                      )}
                    </>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Earnings popup ───────────────────────────────────── */}
      {modalEntry && (
        <EarningsModal
          entry={modalEntry}
          onClose={() => setModalEntry(null)}
        />
      )}
    </>
  );
}

// ─── Earnings Calendar Component ──────────────────────────────────

function EarningsCalendarWidget({ markets, identityMap, onFetchIdentity, signalMode, jumpToDate, scope }: {
  markets: ParsedMarket[];
  identityMap: Record<string, IdentityData>;
  onFetchIdentity: (tickers: string[]) => void;
  signalMode?: "curated" | "all";
  jumpToDate?: string | null;
  scope?: string;
}) {
  const [weekStart, setWeekStart] = useState<Date>(() => getSunday(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string>(dateKey(new Date()));
  const [modalEntry, setModalEntry] = useState<EarningsEntry | null>(null);
  const [enrichments, setEnrichments] = useState<Record<string, EarningsDetailData>>({});
  const [enrichLoading, setEnrichLoading] = useState<Set<string>>(new Set());
  // ── Feature flag: flip to false to disable backend /api/catalysts/earnings/* calls ──
  const EARNINGS_CLEAN_ENABLED = true;

  const [fmpDateMap, setFmpDateMap] = useState<Map<string, EarningsEntry[]>>(new Map());
  const [fmpLoading, setFmpLoading] = useState(false);
  const fmpFetchedWeeks = useRef<Set<string>>(new Set());

  // Reset calendar chips when scope changes so stale data from the previous scope is cleared
  useEffect(() => {
    setFmpDateMap(new Map());
    fmpFetchedWeeks.current.clear();
  }, [scope]);

  // Day-clean state: enriched cards for the selected day (React Query — survives mode switches)
  interface DayCleanEntry {
    symbol: string;
    companyName?: string;
    logo?: string;
    price?: number | null;
    marketCap?: number | null;
    epsEstimated?: number | null;
    epsActual?: number | null;
    revenueEstimated?: number | null;
    revenueActual?: number | null;
    time?: string | null;
    period?: string | null;
  }
  // Only fire day-clean when explicitly in "all" mode; curated mode uses day-curated exclusively.
  const dayAllEnabled = !!selectedDayKey && selectedDayKey !== "undated" && signalMode !== "curated";
  const {
    data: dayCleanRaw,
    isLoading: dayCleanLoading,
    isFetching: dayCleanFetching,
  } = useQuery<DayCleanEntry[]>({
    queryKey: ["earnings", "day", "all", scope ?? "all", selectedDayKey],
    queryFn: async () => {
      const _p = new URLSearchParams({ date: selectedDayKey, enrich: "false" });
      if (scope && scope !== "all") _p.set("scope", scope);
      const url = `/api/catalysts/earnings/day-clean?${_p}`;
      if (process.env.NODE_ENV !== "production") console.log("[day-clean request]", url);
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json();
      const arr = Array.isArray(data) ? data : (data.events || data.results || data.earnings || []);
      if (process.env.NODE_ENV !== "production") console.log("[day-clean returned]", arr.length, "for", selectedDayKey);
      return arr;
    },
    enabled: dayAllEnabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    // No placeholderData/keepPreviousData: stale previous-day data must NOT
    // be shown under a newly selected date. Empty → loading spinner instead.
  });
  const dayCleanEntries = dayCleanRaw ?? [];

  // ── Page context for chatbot ──────────────────────────────────────────────
  useSetPageContext((() => {
    const parts = ['[Page: Earnings Calendar & Catalyst Calendar]'];
    if (selectedDayKey) parts.push(`Selected date: ${selectedDayKey}`);
    if (dayCleanEntries.length) {
      const tickers = dayCleanEntries.slice(0,20).map((e:any)=>e.ticker).filter(Boolean);
      parts.push(`Earnings today (${dayCleanEntries.length} companies): ${tickers.join(', ')}`);
    } else {
      parts.push('Showing upcoming earnings calendar. Ask about earnings estimates, EPS expectations, or pre/post-market timing for any stock.');
    }
    return parts.join('\n');
  })(), [selectedDayKey, dayCleanEntries]);

  // Day-curated state (React Query — separate cache key from "all")
  const dayCuratedEnabled = signalMode === "curated" && !!selectedDayKey && selectedDayKey !== "undated";
  const {
    data: dayCuratedRaw,
    isLoading: dayCuratedLoading,
    isFetching: dayCuratedFetching,
  } = useQuery<WeekCleanEntry[]>({
    queryKey: ["earnings", "day", "curated", scope ?? "all", selectedDayKey],
    queryFn: async () => {
      if (process.env.NODE_ENV !== "production") console.log("[day-curated request]", selectedDayKey);
      const _p2 = new URLSearchParams({ date: selectedDayKey });
      if (scope && scope !== "all") _p2.set("scope", scope);
      const r = await fetch(`/api/catalysts/earnings/day-curated?${_p2}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json();
      if (process.env.NODE_ENV !== "production") console.log("[Day Curated response]", data);
      const arr: WeekCleanEntry[] = Array.isArray(data) ? data : (data.events || data.entries || data.earnings || []);
      if (process.env.NODE_ENV !== "production") console.log("[Day render]", {
        signalMode, selectedDayKey,
        queryKey: ["earnings","day","curated", selectedDayKey],
        entriesCount: arr.length,
        symbols: arr.slice(0,5).map(e => e.symbol),
      });
      return arr;
    },
    enabled: dayCuratedEnabled,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    // No placeholderData/keepPreviousData: stale previous-day data must NOT
    // be shown under a newly selected date.
  });
  const dayCuratedEntries = dayCuratedRaw ?? [];
  // Notify parent to enrich logos when curated data lands
  useEffect(() => {
    if (!dayCuratedRaw || dayCuratedRaw.length === 0) return;
    const tickers = dayCuratedRaw.map(e => e.symbol).filter(Boolean);
    if (tickers.length > 0) onFetchIdentity(tickers);
  }, [dayCuratedRaw, onFetchIdentity]);

  // Sync jumpToDate → selectedDayKey + scroll week view
  useEffect(() => {
    if (!jumpToDate) return;
    const d = new Date(jumpToDate);
    if (!isNaN(d.getTime())) {
      setSelectedDayKey(jumpToDate);
      setWeekStart(getSunday(d));
    }
  }, [jumpToDate]);

  // Build Polymarket date map
  const polyDateMap = new Map<string, EarningsEntry[]>();
  const undated: EarningsEntry[] = [];
  for (const m of markets) {
    const entry = buildEntry(m);
    if (m.endDate) {
      const d = new Date(m.endDate);
      if (!isNaN(d.getTime())) {
        const key = dateKey(d);
        if (!polyDateMap.has(key)) polyDateMap.set(key, []);
        polyDateMap.get(key)!.push(entry);
        continue;
      }
    }
    undated.push(entry);
  }

  // upcoming-clean: fetch visible week only, once per week per scope, only when backend router is enabled
  useEffect(() => {
    if (!EARNINGS_CLEAN_ENABLED) return;

    const effectiveScope = scope ?? "all";
    const weekKey = `${effectiveScope}:${dateKey(weekStart)}`;
    if (fmpFetchedWeeks.current.has(weekKey)) return;
    fmpFetchedWeeks.current.add(weekKey);
    setFmpLoading(true);

    const weekEnd = addDays(weekStart, 6);
    const params = new URLSearchParams({
      from: dateKey(weekStart),
      to: dateKey(weekEnd),
    });
    if (effectiveScope !== "all") params.set("scope", effectiveScope);
    const url = `/api/catalysts/earnings/upcoming-clean?${params}`;

    if (process.env.NODE_ENV !== "production") {
      console.log("[upcoming-clean request]", url);
    }

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((data) => {
        const arr: Record<string, unknown>[] = Array.isArray(data)
          ? data
          : (data.events || data.results || data.earnings || []);
        if (process.env.NODE_ENV !== "production") {
          console.log("[upcoming-clean returned]", arr.length, "for week", weekKey);
        }
        const weekMap = new Map<string, EarningsEntry[]>();
        for (const ev of arr) {
          const sym = (ev.symbol || ev.ticker || "") as string;
          if (!sym || sym === "???") continue;
          const d = (ev.date || "") as string;
          if (!d) continue;
          const key = d.slice(0, 10);
          if (!weekMap.has(key)) weekMap.set(key, []);
          weekMap.get(key)!.push(buildFmpEntry(ev));
        }
        setFmpDateMap(prev => {
          const merged = new Map(prev);
          for (const [k, v] of weekMap) merged.set(k, v);
          return merged;
        });
        const allTickers = arr.map(ev => (ev.symbol || ev.ticker || "") as string).filter(Boolean);
        if (allTickers.length > 0) onFetchIdentity(allTickers);
      })
      .catch(() => { fmpFetchedWeeks.current.delete(weekKey); })
      .finally(() => setFmpLoading(false));
  }, [weekStart, scope, EARNINGS_CLEAN_ENABLED]);

  // day-clean and day-curated are now handled by useQuery above

  // Calendar date map: FMP upcoming-clean data (counts for day chips)
  const dateMap = new Map<string, EarningsEntry[]>(fmpDateMap);

  // ── On-demand enrichment: detail is fetched only when user clicks a ticker ──
  // No batch prefetch on day selection — prevents rate limit exhaustion and ensures
  // click-through always has budget available. Detail endpoint is cached 10min backend-side.
  const fetchTickerDetail = useCallback(async (ticker: string): Promise<EarningsDetailData | null> => {
    if (!ticker || ticker === "???") return null;
    // Return cached if already fetched
    if (enrichments[ticker]) return enrichments[ticker];
    setEnrichLoading(prev => new Set([...prev, ticker]));
    try {
      const res = await fetch(
        `${AGENT_BACKEND_URL}/api/earnings/detail?ticker=${encodeURIComponent(ticker)}`,
        { headers: authHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        setEnrichments(prev => ({ ...prev, [ticker]: data }));
        return data;
      }
    } catch (e) {
      console.warn(`[EARNINGS] detail fetch failed for ${ticker}:`, e);
    } finally {
      setEnrichLoading(prev => { const n = new Set(prev); n.delete(ticker); return n; });
    }
    return null;
  }, [enrichments]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekMonth = MONTH_NAMES[weekStart.getMonth()];
  const weekYear = weekStart.getFullYear();

  const prevWeek = () => {
    const newStart = addDays(weekStart, -7);
    setWeekStart(newStart);
    setSelectedDayKey(dateKey(newStart));
  };
  const nextWeek = () => {
    const newStart = addDays(weekStart, 7);
    setWeekStart(newStart);
    setSelectedDayKey(dateKey(newStart));
  };
  const goToday = () => {
    setWeekStart(getSunday(new Date()));
    setSelectedDayKey(dateKey(new Date()));
  };

  const selectedEntries = dateMap.get(selectedDayKey) || [];
  const selectedDate = weekDays.find((d) => dateKey(d) === selectedDayKey) || new Date();
  const totalThisWeek = weekDays.reduce((sum, d) => sum + (dateMap.get(dateKey(d))?.length || 0), 0);

  const showUndated = selectedDayKey === "undated";
  /** Safety filter: strip any pure Polymarket question events from the main display */
  const isFMPEntry = (e: EarningsEntry) =>
    e.source !== "polymarket" &&
    e.ticker !== "???" &&
    !/^Will\s/i.test(e.company || "") &&
    !/^Will\s/i.test(e.ticker || "");
  const rawEntries = showUndated ? undated : selectedEntries;
  const displayEntries = rawEntries.filter(isFMPEntry);

  // ── Lazy rendering: paginate in batches of 15 ──
  const BATCH_SIZE = 15;
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset visible count when day changes (day card data managed by React Query cache)
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [selectedDayKey]);

  // IntersectionObserver to load more day-clean cards as user scrolls
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < dayCleanEntries.length) {
          setVisibleCount(prev => Math.min(prev + BATCH_SIZE, dayCleanEntries.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, dayCleanEntries.length]);

  const visibleDayEntries = dayCleanEntries.slice(0, visibleCount);

  // Click handler: fetch detail on demand then open modal
  const handleEntryClick = useCallback(async (entry: EarningsEntry) => {
    setModalEntry(entry);
    // Trigger on-demand fetch (non-blocking — modal will show loading state)
    fetchTickerDetail(entry.ticker);
  }, [fetchTickerDetail]);

  return (
    <div>
      {/* Calendar navigation */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-white/40">
          {weekMonth} {weekYear} &middot; {totalThisWeek} earnings call{totalThisWeek !== 1 ? "s" : ""} this week
          {fmpLoading && <Loader2 className="w-2.5 h-2.5 animate-spin inline ml-1.5 text-blue-400/50" />}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/50 border border-white/[0.08] hover:bg-white/5 hover:text-white/70 transition-all mr-1"
          >
            Today
          </button>
          <button onClick={prevWeek} className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4 text-white/50" />
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/5 transition-all">
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* Week day selector row */}
      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {weekDays.map((day, i) => {
          const key = dateKey(day);
          const entries = dateMap.get(key) || [];
          const isToday = dateKey(new Date()) === key;
          const isSelected = selectedDayKey === key;
          const callCount = entries.length;
          return (
            <button
              key={key}
              onClick={() => setSelectedDayKey(key)}
              className={`rounded-xl p-2.5 text-center transition-all border ${
                isSelected
                  ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20"
                  : isToday
                  ? "bg-white/[0.03] border-blue-500/15 hover:bg-white/[0.05]"
                  : "bg-white/[0.015] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]"
              }`}
            >
              <p className={`text-[10px] font-semibold mb-0.5 ${isSelected ? "text-blue-400" : "text-white/40"}`}>
                {DAY_NAMES_FULL[i]}
              </p>
              <p className={`text-xs font-bold ${isSelected ? "text-white" : isToday ? "text-blue-400" : "text-white/70"}`}>
                {MONTH_NAMES_SHORT[day.getMonth()]} {day.getDate()}
              </p>
              <p className={`text-[9px] mt-1 ${callCount > 0 ? (isSelected ? "text-blue-400/70" : "text-white/40") : "text-white/20"}`}>
                {callCount > 0 ? `${callCount} Call${callCount > 1 ? "s" : ""}` : "No Calls"}
              </p>
              {callCount > 0 && (
                <div className="flex justify-center gap-0.5 mt-1.5">
                  {entries.slice(0, 4).map((e) => (
                    <div key={e.market?.marketId || `fh-${e.ticker}`} className={`w-4 h-4 rounded-sm bg-gradient-to-br ${tickerColor(e.ticker)} flex items-center justify-center overflow-hidden`}>
                      {e.logo ? (
                        <img
                          src={e.logo}
                          alt={e.ticker}
                          className="w-full h-full object-contain p-[1px]"
                          onError={ev => { ev.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <span className="text-[6px] font-bold text-white">{e.ticker.slice(0, 1)}</span>
                      )}
                    </div>
                  ))}
                  {callCount > 4 && (
                    <div className="w-4 h-4 rounded-sm bg-white/[0.06] flex items-center justify-center">
                      <span className="text-[6px] font-bold text-white/40">+{callCount - 4}</span>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-white/90">
            {DAY_NAMES_FULL[selectedDate.getDay()]}, {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}
          </h4>
          {(signalMode === "curated" ? dayCuratedFetching : dayCleanFetching) ? (
            <Loader2 className="w-3 h-3 text-blue-400/50 animate-spin" />
          ) : (
            <span className="text-[10px] text-white/30">
              {signalMode === "curated"
                ? scope === "watchlist"
                  ? `${dayCuratedEntries.length} watchlist earning${dayCuratedEntries.length !== 1 ? "s" : ""}`
                  : scope === "portfolio"
                  ? `${dayCuratedEntries.length} portfolio earning${dayCuratedEntries.length !== 1 ? "s" : ""}`
                  : `${dayCuratedEntries.length} curated pick${dayCuratedEntries.length !== 1 ? "s" : ""}`
                : `${dayCleanEntries.length} earning${dayCleanEntries.length !== 1 ? "s" : ""} call${dayCleanEntries.length !== 1 ? "s" : ""}`}
            </span>
          )}
        </div>
      </div>

      {/* Day earnings list — Curated or All */}
      {signalMode === "curated" ? (
        dayCuratedLoading ? (
          <div className="text-center py-10">
            <Loader2 className="w-5 h-5 text-amber-400/40 mx-auto mb-2 animate-spin" />
            <p className="text-[11px] text-white/25">{scope === "watchlist" ? "Loading watchlist earnings..." : scope === "portfolio" ? "Loading portfolio earnings..." : "Loading curated picks..."}</p>
          </div>
        ) : dayCuratedEntries.length === 0 ? (
          <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
            <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
            <p className="text-sm text-white/25">{scope === "watchlist" ? "No watchlist earnings today." : scope === "portfolio" ? "No portfolio earnings today." : "No curated earnings for this day"}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {dayCuratedEntries.filter(e => !!(e.symbol)).map((e, idx) => {
              const ticker = (e.symbol || "").toUpperCase();
              const name = e.companyName || ticker;
              const logo = e.logo || e.image || identityMap[ticker]?.logo || null;
              const pct = e.priceChangePct != null ? Number(e.priceChangePct) : null;
              const isFocus = !!e.isFocus || !!e.isThemeAnchor || !!e.isBottleneck || (e.importanceScore != null && e.importanceScore >= 85) || idx < 3;
              const tag = e.themeTags && e.themeTags.length > 0 ? e.themeTags[0] : null;
              const qualifier = e.isThemeAnchor ? "Anchor" : e.isBottleneck ? "Bottleneck" : null;
              const reason = tag ? (qualifier ? `${tag} · ${qualifier}` : tag) : qualifier || (e.marketCapBucket && e.marketCapBucket.toLowerCase() !== "unknown" ? e.marketCapBucket.charAt(0).toUpperCase() + e.marketCapBucket.slice(1) + " cap" : null);
              const timeStr = e.time === "bmo" || e.session === "pre_market" ? "Pre-Market" : e.time === "amc" || e.session === "after_hours" ? "After Hours" : e.time || null;
              const epsEst = e.epsEstimated != null ? `$${Number(e.epsEstimated).toFixed(2)}` : null;
              const revEst = e.revenueEstimated != null ? formatRevenue(Number(e.revenueEstimated)) : null;
              const modalEntry: EarningsEntry = {
                market: null, ticker, company: name, companyName: name,
                logo: (logo || undefined) as string | undefined,
                eps: epsEst, quarter: e.period || null, time: timeStr,
                exchange: null, beatPct: -1, revenueEstimate: revEst, source: "fmp", earningsDate: e.date || selectedDayKey,
              };
              return (
                <button
                  key={`dc-${ticker}-${idx}`}
                  className="w-full text-left rounded-lg border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group p-2.5 flex items-center gap-2.5"
                  onClick={() => handleEntryClick(modalEntry)}
                >
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden ${logo ? "bg-white/[0.06]" : `bg-gradient-to-br ${tickerColor(ticker)}`}`}>
                    {logo ? (
                      <img src={logo} alt={ticker} className="w-full h-full object-contain p-0.5" onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span className="text-[9px] font-bold text-white">{ticker.slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white/90 truncate leading-tight group-hover:text-white">{name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[9px] font-mono text-white/35">{ticker}</span>
                      {pct != null && <span className={`text-[8px] font-semibold ${pct >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>{pct >= 0 ? "+" : ""}{pct.toFixed(2)}%</span>}
                      {timeStr && <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-white/30">{timeStr}</span>}
                      {e.period && <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-400/60">{e.period}</span>}
                    </div>
                    {reason && <p className="text-[8px] text-white/25 truncate mt-0.5">{reason}</p>}
                  </div>
                  {isFocus && <span className="text-[7px] font-bold text-amber-400/70 border border-amber-400/25 rounded px-1 py-0.5 flex-shrink-0">FOCUS</span>}
                  <span className="text-white/20 group-hover:text-white/55 transition-colors text-xs flex-shrink-0">+</span>
                </button>
              );
            })}
          </div>
        )
      ) : dayCleanLoading ? (
        <div className="text-center py-10">
          <Loader2 className="w-5 h-5 text-blue-400/40 mx-auto mb-2 animate-spin" />
          <p className="text-[11px] text-white/25">Loading earnings...</p>
        </div>
      ) : dayCleanEntries.length === 0 && !dayCleanLoading ? (
        <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
          <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
          <p className="text-sm text-white/25">No earnings calls scheduled</p>
          <p className="text-[10px] text-white/15 mt-1">Try another day or navigate to a different week</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleDayEntries.map((e) => {
            const ticker = (e.symbol || "").toUpperCase();
            const name = e.companyName || ticker;
            const rawTime = (e.time || "") as string;
            const timeStr = rawTime === "bmo" ? "Pre-Market" : rawTime === "amc" ? "After Hours" : rawTime || null;
            const epsEst = e.epsEstimated != null ? `$${Number(e.epsEstimated).toFixed(2)}` : null;
            const epsAct = e.epsActual != null ? `$${Number(e.epsActual).toFixed(2)}` : null;
            const revEst = e.revenueEstimated != null ? formatRevenue(Number(e.revenueEstimated)) : null;
            const revAct = e.revenueActual != null ? formatRevenue(Number(e.revenueActual)) : null;
            const price = e.price != null ? `$${Number(e.price).toFixed(2)}` : null;
            const mktCap = e.marketCap != null ? formatMktCap(Number(e.marketCap)) : null;
            const logoUrl = e.logo || identityMap[ticker]?.logo || null;
            const modalCompatEntry: EarningsEntry = {
              market: null,
              ticker,
              company: name,
              companyName: name,
              logo: e.logo,
              eps: epsEst,
              quarter: e.period || null,
              time: timeStr,
              exchange: null,
              beatPct: -1,
              revenueEstimate: revEst,
              source: "fmp",
              earningsDate: selectedDayKey,
            };
            return (
              <div
                key={`dc-${ticker}-${e.period || ""}`}
                className="rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all group cursor-pointer"
                onClick={() => handleEntryClick(modalCompatEntry)}
              >
                <div className="flex items-start gap-4 p-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt={ticker} className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 flex-shrink-0 mt-0.5" onError={ev => { ev.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tickerColor(ticker)} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <span className="text-xs font-bold text-white">{ticker.slice(0, 2)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors truncate">{name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {name !== ticker && <span className="text-[11px] font-mono text-white/40">{ticker}</span>}
                      {timeStr && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/30 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {timeStr}
                        </span>
                      )}
                      {e.period && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400/70">{e.period}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {epsEst && <span className="text-[10px] text-white/30"><span className="text-white/50 font-semibold">EPS Est:</span> {epsEst}</span>}
                      {epsAct && <span className="text-[10px] text-white/30"><span className="text-white/50 font-semibold">EPS Actual:</span> {epsAct}</span>}
                      {revEst && <span className="text-[10px] text-white/30"><span className="text-white/50 font-semibold">Rev Est:</span> {revEst}</span>}
                      {revAct && <span className="text-[10px] text-white/30"><span className="text-white/50 font-semibold">Rev Actual:</span> {revAct}</span>}
                      {price && <span className="text-[10px] text-white/30"><span className="text-white/50 font-semibold">Price:</span> {price}</span>}
                      {mktCap && <span className="text-[10px] text-white/30"><span className="text-white/50 font-semibold">Mkt Cap:</span> {mktCap}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-400/60 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1">
                    View full details
                  </span>
                </div>
              </div>
            );
          })}
          {visibleCount < dayCleanEntries.length && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-white/20 animate-spin mr-2" />
              <span className="text-[10px] text-white/20">Loading more ({visibleCount} of {dayCleanEntries.length})...</span>
            </div>
          )}
        </div>
      )}

      {/* [Dead Smart View block below — unreachable, kept to avoid removing JSX nodes] */}
      {(false as boolean) && (() => {
        const sd = smartData[selectedDayKey];
        const tier2Tickers = sd?.tickers || [];
        const tier2Loading = smartLoading && !sd;

        // Tier 1: Polymarket tickers for this day (from already-fetched data)
        const tier1Entries = displayEntries.filter(e => e.beatPct > 0);

        // Tier 2: exclude any tickers already shown in Tier 1
        const tier1TickerSet = new Set(tier1Entries.map(e => e.ticker.toUpperCase()));
        const tier2Filtered = tier2Tickers.filter(st => !tier1TickerSet.has(st.ticker.toUpperCase()));

        // Build set of all tickers shown in Tier 1 + Tier 2 for overflow
        const allShownSet = new Set([
          ...tier1Entries.map(e => e.ticker.toUpperCase()),
          ...tier2Filtered.map(st => st.ticker.toUpperCase()),
        ]);

        // If nothing at all and Tier 2 isn't loading, show empty state
        if (tier1Entries.length === 0 && tier2Filtered.length === 0 && !tier2Loading) {
          return (
            <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
              <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
              <p className="text-sm text-white/25">No high-signal earnings for this day</p>
            </div>
          );
        }

        return (
          <div className="space-y-2">
            {/* ── Tier 1: High Conviction Earnings ── */}
            {tier1Entries.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">High Conviction Earnings</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                {tier1Entries.map((e) => {
                  const enrich = enrichments[e.ticker];
                  const isHigh = e.beatPct >= 60;
                  const isLow = e.beatPct <= 40;
                  return (
                    <div
                      key={`tier1-${e.market?.marketId || `fh-${e.ticker}`}`}
                      className="rounded-xl border border-blue-500/10 bg-blue-500/[0.02] hover:bg-blue-500/[0.04] hover:border-blue-500/20 transition-all group cursor-pointer"
                      onClick={() => handleEntryClick(e)}
                    >
                      <div className="flex items-center gap-4 p-4">
                        {(enrich?.logo || e.logo || identityMap[e.ticker.toUpperCase()]?.logo) ? (
                          <img src={(enrich?.logo || e.logo || identityMap[e.ticker.toUpperCase()]?.logo)!} alt={e.ticker} className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 flex-shrink-0" onError={ev => { ev.currentTarget.style.display = "none"; }} />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tickerColor(e.ticker)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-xs font-bold text-white">{e.ticker.slice(0, 2)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                              {enrich?.company_name || e.companyName || identityMap[e.ticker.toUpperCase()]?.name || e.company}
                            </p>
                            <span className="text-[11px] font-mono text-white/40">{e.ticker}</span>
                            {e.quarter && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400/70">{e.quarter}</span>}
                            {e.time && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/30 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> {e.time}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            {e.eps && (
                              <span className="text-[10px] text-white/30">
                                <span className="text-white/50 font-semibold">EPS Est:</span> {e.eps}
                              </span>
                            )}
                            {enrich?.market_cap && (
                              <span className="text-[10px] text-white/30">
                                <span className="text-white/50 font-semibold">Mkt Cap:</span> {formatMktCap(enrich.market_cap)}
                              </span>
                            )}
                            <span className="text-[10px] text-blue-400/60 group-hover:text-blue-400 transition-colors ml-auto">
                              View full details
                            </span>
                          </div>
                        </div>
                        {/* Beat probability badge */}
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold flex-shrink-0 ${
                          isHigh ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" :
                          isLow ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                          "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                        }`}>
                          <span>{e.beatPct}%</span>
                          <span className="text-[9px] opacity-70">beat</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* ── Tier 2: Most Talked About ── */}
            {(tier2Filtered.length > 0 || tier2Loading) && (
              <>
                <div className="flex items-center gap-2 mb-1 mt-3">
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Most Talked About</span>
                  <div className="flex-1 h-px bg-white/[0.06]" />
                </div>
                {tier2Loading && tier2Filtered.length === 0 ? (
                  <div className="text-center py-6 border border-white/[0.04] rounded-xl bg-white/[0.01]">
                    <Loader2 className="w-5 h-5 text-purple-400/40 mx-auto mb-1.5 animate-spin" />
                    <p className="text-[11px] text-white/25">Scanning social buzz &amp; news...</p>
                  </div>
                ) : (
                  tier2Filtered.map((st) => {
                    const enrich = enrichments[st.ticker];
                    const isEnrichLoading = enrichLoading.has(st.ticker);
                    const epsStr = st.eps_estimate != null ? `$${st.eps_estimate.toFixed(2)}` : null;
                    const revStr = st.revenue_estimate != null
                      ? (st.revenue_estimate >= 1e9 ? `$${(st.revenue_estimate / 1e9).toFixed(1)}B` : st.revenue_estimate >= 1e6 ? `$${(st.revenue_estimate / 1e6).toFixed(0)}M` : `$${st.revenue_estimate.toLocaleString()}`)
                      : null;
                    const qtr = st.quarter && st.year ? `Q${st.quarter} ${st.year}` : st.quarter ? `Q${st.quarter}` : null;
                    const timeStr = st.hour === "bmo" ? "Pre-Market" : st.hour === "amc" ? "After Hours" : null;
                    const sentimentEmoji = st.sentiment === "bullish" ? "\uD83D\uDFE2" : st.sentiment === "bearish" ? "\uD83D\uDD34" : "\uD83D\uDFE1";
                    const buzzIcon = st.buzz_level >= 7 ? "\uD83D\uDD25" : st.buzz_level >= 4 ? "\u3030\uFE0F" : "";
                    const polyEntry = displayEntries.find(e => e.ticker.toUpperCase() === st.ticker.toUpperCase());

                    return (
                      <div
                        key={`tier2-${st.ticker}`}
                        className="rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all group cursor-pointer"
                        onClick={() => {
                          const entry: EarningsEntry = polyEntry || {
                            market: null,
                            ticker: st.ticker,
                            company: enrich?.company_name || identityMap[st.ticker.toUpperCase()]?.name || st.ticker,
                            eps: epsStr,
                            quarter: qtr,
                            time: timeStr,
                            exchange: null,
                            beatPct: -1,
                            revenueEstimate: revStr,
                            source: "fmp",
                            earningsDate: st.date,
                          };
                          setModalEntry(entry);
                          fetchTickerDetail(st.ticker);
                        }}
                      >
                        <div className="flex items-start gap-4 p-4">
                          {(enrich?.logo || identityMap[st.ticker.toUpperCase()]?.logo) ? (
                            <img src={(enrich?.logo || identityMap[st.ticker.toUpperCase()]?.logo)!} alt={st.ticker} className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 flex-shrink-0 mt-0.5" onError={ev => { ev.currentTarget.style.display = "none"; }} />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tickerColor(st.ticker)} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                              <span className="text-xs font-bold text-white">{st.ticker.slice(0, 2)}</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                  {enrich?.company_name || identityMap[st.ticker.toUpperCase()]?.name || st.ticker}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-[11px] font-mono text-white/40">{st.ticker}</span>
                                  {qtr && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400/70">{qtr}</span>}
                                  {timeStr && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/30 flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" /> {timeStr}
                                    </span>
                                  )}
                                  {enrich?.sector && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400/60">{enrich.sector}</span>}
                                </div>
                                {st.one_line && (
                                  <p className="text-[10px] text-white/40 leading-relaxed mt-1.5 line-clamp-2">
                                    <Sparkles className="w-3 h-3 text-purple-400/50 inline mr-1 -mt-0.5" />
                                    {st.one_line}
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-white/35 font-mono min-w-[48px] text-right">
                                  {enrich?.market_cap ? formatMktCap(enrich.market_cap) : ""}
                                </span>
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
                                  st.sentiment === "bullish" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" :
                                  st.sentiment === "bearish" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                                  "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                                }`}>
                                  <span>{sentimentEmoji}</span>
                                  <span className="capitalize">{st.sentiment}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {st.buzz_level > 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/8 border border-orange-500/15 text-orange-400/80 font-semibold flex items-center gap-1">
                                  {buzzIcon} Buzz: {st.buzz_level}/10
                                </span>
                              )}
                              {st.news_signal === "high" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/8 border border-purple-500/15 text-purple-400/80 font-semibold">
                                  High News Signal
                                </span>
                              )}
                              {st.analyst_focus && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/8 border border-blue-500/15 text-blue-400/80 font-semibold">
                                  Analyst Focus
                                </span>
                              )}
                              {enrich?.beat_rate && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/8 border border-emerald-500/15 text-emerald-400/80 font-semibold">
                                  Beat Record: {enrich.beat_rate}
                                </span>
                              )}
                            </div>
                            {isEnrichLoading && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <Loader2 className="w-3 h-3 text-blue-400/50 animate-spin" />
                                <span className="text-[9px] text-white/25">Loading context...</span>
                              </div>
                            )}

                            <div className="flex items-center gap-4 mt-2.5">
                              {epsStr && (
                                <span className="text-[10px] text-white/30">
                                  <span className="text-white/50 font-semibold">EPS Est:</span> {epsStr}
                                </span>
                              )}
                              {revStr && (
                                <span className="text-[10px] text-white/30">
                                  <span className="text-white/50 font-semibold">Rev Est:</span> {revStr}
                                </span>
                              )}
                              <span className="text-[10px] text-blue-400/60 group-hover:text-blue-400 transition-colors ml-auto">
                                View full details
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* ── Show more earnings — remaining tickers not in Tier 1 or Tier 2 ── */}
            {(() => {
              const overflowEntries = displayEntries.filter(e => !allShownSet.has(e.ticker.toUpperCase()));
              if (overflowEntries.length === 0) return null;
              const visibleOverflow = overflowEntries.slice(0, smartOverflowCount);
              const hasMore = smartOverflowCount < overflowEntries.length;
              return (
                <>
                  {visibleOverflow.map((e) => (
                    <div
                      key={`overflow-${e.market?.marketId || `fh-${e.ticker}`}`}
                      className="rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] hover:border-white/[0.06] transition-all group cursor-pointer opacity-60"
                      onClick={() => handleEntryClick(e)}
                    >
                      <div className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tickerColor(e.ticker)} flex items-center justify-center flex-shrink-0`}>
                          <span className="text-[9px] font-bold text-white">{e.ticker.slice(0, 2)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white/70 group-hover:text-blue-400/70 transition-colors">{e.company}</span>
                            <span className="text-[10px] font-mono text-white/30">{e.ticker}</span>
                            {e.quarter && <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400/50">{e.quarter}</span>}
                            {e.time && <span className="text-[9px] text-white/20">{e.time}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {e.eps && <span className="text-[10px] text-white/25">EPS: {e.eps}</span>}
                          {e.beatPct > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${
                              e.beatPct >= 60 ? "bg-emerald-500/8 text-emerald-400/60" :
                              e.beatPct <= 40 ? "bg-red-500/8 text-red-400/60" :
                              "bg-yellow-500/8 text-yellow-400/60"
                            }`}>
                              PM: {e.beatPct}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {smartOverflowCount > 0 && (
                    <button
                      onClick={() => setSmartOverflowCount(0)}
                      className="w-full py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all text-[11px] font-semibold text-white/40 hover:text-white/60"
                    >
                      Show less
                    </button>
                  )}
                  {hasMore && (
                    <button
                      onClick={() => setSmartOverflowCount(prev => prev + SMART_MORE_BATCH)}
                      className="w-full py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all text-[11px] font-semibold text-white/40 hover:text-white/60"
                    >
                      Show more earnings ({overflowEntries.length - smartOverflowCount} more)
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        );
      })()}

      {/* [Old All View removed — replaced by day-clean rendering above] */}
      {(false as boolean) && (
        <div className="space-y-2">
          {([] as EarningsEntry[]).map((e) => {
            const isHigh = e.beatPct >= 60;
            const isLow = e.beatPct <= 40;
            const enrich = enrichments[e.ticker];
            const isEnrichLoading = enrichLoading.has(e.ticker);
            const consensus = enrich?.analyst_consensus;
            const articles = enrich?.news_articles || [];
            const topArticle = articles[0];
            return (
              <div
                key={e.market?.marketId || `fh-${e.ticker}`}
                className="rounded-xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.03] hover:border-white/[0.1] transition-all group cursor-pointer"
                onClick={() => handleEntryClick(e)}
              >
                <div className="flex items-start gap-4 p-4">
                  {(enrich?.logo || e.logo || identityMap[e.ticker.toUpperCase()]?.logo) ? (
                    <img src={(enrich?.logo || e.logo || identityMap[e.ticker.toUpperCase()]?.logo)!} alt={e.ticker} className="w-10 h-10 rounded-xl object-contain bg-white/5 p-1 flex-shrink-0 mt-0.5" onError={ev => { ev.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tickerColor(e.ticker)} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <span className="text-xs font-bold text-white">{e.ticker.slice(0, 2)}</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {enrich?.company_name || e.companyName || identityMap[e.ticker.toUpperCase()]?.name || e.company}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] font-mono text-white/40">{e.ticker}</span>
                          {e.quarter && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400/70">{e.quarter}</span>
                          )}
                          {e.time && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/30 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {e.time}
                            </span>
                          )}
                          {enrich?.sector && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400/60">{enrich.sector}</span>
                          )}
                          {enrich?.current_price && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/40 font-semibold">
                              ${enrich.current_price.toFixed(2)}
                              {enrich.price_change_pct != null && (
                                <span className={enrich.price_change_pct >= 0 ? "text-emerald-400 ml-1" : "text-red-400 ml-1"}>
                                  {enrich.price_change_pct >= 0 ? "+" : ""}{enrich.price_change_pct.toFixed(1)}%
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right side: Market Cap + Beat % */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {/* Market Cap — always visible when enrichment loaded, "—" otherwise */}
                        <span className="text-[10px] font-semibold text-white/35 font-mono min-w-[48px] text-right">
                          {enrich ? (enrich.market_cap ? formatMktCap(enrich.market_cap) : "\u2014") : ""}
                        </span>
                        {e.beatPct >= 0 ? (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${
                          isHigh ? "bg-emerald-500/10 border border-emerald-500/20" : isLow ? "bg-red-500/10 border border-red-500/20" : "bg-yellow-500/10 border border-yellow-500/20"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isHigh ? "bg-emerald-400" : isLow ? "bg-red-400" : "bg-yellow-400"
                          }`} />
                          <span className={`text-xs font-bold ${
                            isHigh ? "text-emerald-400" : isLow ? "text-red-400" : "text-yellow-400"
                          }`}>
                            {e.beatPct}%
                          </span>
                          <span className={`text-[9px] ${
                            isHigh ? "text-emerald-400/60" : isLow ? "text-red-400/60" : "text-yellow-400/60"
                          }`}>beat</span>
                        </div>
                        ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                          <span className="text-[9px] text-white/30 font-semibold">FMP</span>
                        </div>
                        )}
                      </div>
                    </div>

                    {enrich && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {enrich.beat_rate && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/8 border border-emerald-500/15 text-emerald-400/80 font-semibold">
                            Beat Record: {enrich.beat_rate}
                          </span>
                        )}
                        {consensus && consensus.total > 0 && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            consensus.rating === "Buy" ? "bg-emerald-500/8 border border-emerald-500/15 text-emerald-400/80" :
                            consensus.rating === "Sell" ? "bg-red-500/8 border border-red-500/15 text-red-400/80" :
                            "bg-yellow-500/8 border border-yellow-500/15 text-yellow-400/80"
                          }`}>
                            Analysts: {consensus.rating} ({consensus.buy}B/{consensus.hold}H/{consensus.sell}S)
                          </span>
                        )}
                        {enrich.news_sentiment && enrich.news_sentiment !== "Neutral" && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                            enrich.news_sentiment === "Bullish" ? "bg-emerald-500/8 border border-emerald-500/15 text-emerald-400/80" :
                            "bg-red-500/8 border border-red-500/15 text-red-400/80"
                          }`}>
                            {enrich.news_sentiment}
                          </span>
                        )}
                      </div>
                    )}
                    {isEnrichLoading && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Loader2 className="w-3 h-3 text-blue-400/50 animate-spin" />
                        <span className="text-[9px] text-white/25">Loading context...</span>
                      </div>
                    )}

                    {enrich?.news_summary && (
                      <p className="text-[10px] text-white/45 leading-relaxed mt-2 line-clamp-2">
                        <Sparkles className="w-3 h-3 text-blue-400/50 inline mr-1 -mt-0.5" />
                        {enrich.news_summary}
                      </p>
                    )}

                    {topArticle && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <ExternalLink className="w-3 h-3 text-blue-400/40 flex-shrink-0 mt-0.5" />
                        <span className="text-[10px] text-blue-400/60 leading-snug line-clamp-1">{topArticle.title}</span>
                        {topArticle.source && <span className="text-[8px] text-white/20 flex-shrink-0 mt-0.5">{topArticle.source}</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-2.5">
                      {e.eps && (
                        <span className="text-[10px] text-white/30">
                          <span className="text-white/50 font-semibold">EPS Est:</span> {e.eps}
                        </span>
                      )}
                      {e.revenueEstimate && (
                        <span className="text-[10px] text-white/30">
                          <span className="text-white/50 font-semibold">Rev Est:</span> {e.revenueEstimate}
                        </span>
                      )}
                      {e.market && (
                      <span className="text-[10px] text-white/30">
                        <span className="text-white/50 font-semibold">Vol:</span> {formatVolume(e.market.totalVolume)}
                      </span>
                      )}
                      <span className="text-[10px] text-blue-400/60 group-hover:text-blue-400 transition-colors ml-auto">
                        View full details
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {/* Lazy load sentinel — triggers next batch when scrolled into view */}
          {visibleCount < displayEntries.length && (
            <div ref={loadMoreRef} className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 text-white/20 animate-spin mr-2" />
              <span className="text-[10px] text-white/20">Loading more ({visibleCount} of {displayEntries.length})...</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[10px] text-white/20">
          FMP earnings calendar
        </span>
      </div>

      {modalEntry && <EarningsModal entry={modalEntry} onClose={() => setModalEntry(null)} prefetchedDetail={enrichments[modalEntry.ticker] || null} />}
    </div>
  );
}

// ─── Earnings Agent Chatbar ───────────────────────────────────────

interface EarningsAgentMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const EARNINGS_SUGGESTED_PROMPTS = [
  "What earnings have the most social buzz and X momentum right now?",
  "Give me the best overall setup — beat history, sentiment, and technicals combined",
  "Which Polymarket earnings bets have the highest conviction odds and volume?",
  "What stocks could surprise big up or down — biggest potential movers?",
];

const CATALYST_SUGGESTED_PROMPTS = [
  "What are the most important upcoming earnings and macro events this week?",
  "Any high-impact IPOs or economic releases I should watch?",
  "Summarize dividend and stock split catalyst events for the next month.",
  "Which catalyst events pose the biggest market-moving risk right now?",
];

const CATALYST_SYSTEM_CONTEXT =
  "You are analyzing the Catalyst Calendar across earnings, dividends, IPOs, stock splits, economic releases, and treasury/macro events. Use the provided FMP catalyst data across all tabs.";

function EarningsAgent({
  onClose,
  systemContext,
  suggestedPrompts: customPrompts,
}: {
  onClose: () => void;
  systemContext?: string;
  suggestedPrompts?: string[];
}) {
  const [messages, setMessages] = useState<EarningsAgentMessage[]>([]);
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
    const userMsg: EarningsAgentMessage = { role: "user", content: text.trim(), timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      // Build week context so the backend contract can give date-aware answers.
      const today = new Date();
      const todayStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const currentWeekSunday = getSunday(today);
      const focusWeek = isWeekend ? addDays(currentWeekSunday, 7) : currentWeekSunday;
      const focusWeekSunday = focusWeek.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const focusWeekSaturday = addDays(focusWeek, 6).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      const weekContext = `[Date context: Today is ${todayStr}. ${isWeekend ? "It is the weekend — focus on NEXT week's earnings" : "Focus on this week's earnings"}. Earnings week in view: ${focusWeekSunday} – ${focusWeekSaturday}.]`;

      const systemPrefix = systemContext ? `[${systemContext}] ` : "";
      const payload: Record<string, unknown> = {
        query: `${systemPrefix}${weekContext} ${text.trim()}`,
        preset_intent: systemContext ? "catalyst_calendar" : "earnings_catalyst",
        history: history.length > 0 ? history : undefined,
        conversation_id: conversationId,
        screen_context: { route: '/app/stocks/earnings-calendar', page: 'calendar', tab: 'earnings_dates' },
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

      const rawText = (await res.text()).trim();
      const data = JSON.parse(rawText);
      const convId = data.conversation_id || conversationId;
      if (convId) setConversationId(convId);

      let analysisText = "";
      if (data.analysis) {
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
        body: JSON.stringify({ category: "earnings_agent", intent: "earnings_agent", content: analysisText }),
      }).catch(() => {});
    } catch (err) {
      console.error("[EARNINGS_AGENT]", err);
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
  }, [loading, messages, conversationId]);

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
    // Backdrop — click outside to close
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative m-4 mt-16 w-full max-w-[420px] rounded-xl p-5 flex flex-col"
        style={{
          background: '#0f1117',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
          maxHeight: 'calc(100vh - 88px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)' }}>
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-white">Ask Caelyn</h2>
          <p className="text-[10px] text-white/25">
            {systemContext ? "Catalyst Calendar — all tabs" : "Earnings intel, beat odds & trading setups"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested prompts (only show when no messages) */}
      {messages.length === 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {(customPrompts || EARNINGS_SUGGESTED_PROMPTS).map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="text-left text-[11px] text-white/50 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2.5 hover:bg-white/[0.06] hover:text-white/70 hover:border-white/10 transition-all disabled:opacity-40"
            >
              <MessageSquare className="w-3 h-3 inline mr-1.5 opacity-40" />
              {prompt}
            </button>
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
                  ? "bg-orange-500/10 border border-orange-500/20 text-orange-100"
                  : "bg-white/[0.03] border border-white/[0.06] text-white/80"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  msg.role === "user" ? "text-orange-400" : "text-yellow-400"
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
                Analyzing earnings data with sentiment and technicals...
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
          placeholder="Ask about earnings... (e.g., &quot;Which stocks have the best beat odds this week?&quot;)"
          disabled={loading}
          rows={1}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-white placeholder-white/25 resize-none focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 disabled:opacity-40 transition-all"
        />
        <Button
          type="submit"
          disabled={loading || !input.trim()}
          className="text-white px-3 py-2 rounded-lg transition-all disabled:opacity-30 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316, #ef4444)' }}
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
    </div>
  );
}

// ─── Catalyst Calendar — Types & Constants ────────────────────────

interface CatalystEvent {
  id?: string;
  date: string;
  symbol?: string;
  // display / label fields (backend may use either naming)
  display_title?: string;
  company?: string;
  companyName?: string;
  name?: string;
  event_name?: string;
  ticker?: string;
  title?: string;
  subtitle?: string;
  event_type: string;
  eventType?: string;
  eventLabel?: string;
  keyDetails?: string;
  importance?: "high" | "medium" | "low";
  signal_tier?: "critical" | "major" | "secondary" | "context";
  event_family?: string;
  signal_reason?: string;
  sector?: string;
  market_cap?: number;
  details?: Record<string, unknown>;
  // dividend — snake_case & camelCase
  dividend?: number;
  dividend_amount?: number;
  dividend_yield?: number;
  ex_date?: string;
  pay_date?: string;
  exDividendDate?: string;
  paymentDate?: string;
  recordDate?: string;
  // ipo — snake_case & camelCase
  ipo_price_range?: string;
  ipo_shares?: number;
  exchange?: string;
  priceRange?: string;
  offerPrice?: number;
  // split — snake_case & camelCase
  split_ratio?: string;
  splitRatio?: string;
  numerator?: number;
  denominator?: number;
  // macro — snake_case & camelCase
  previous?: number;
  estimate?: number;
  actual?: number;
  rate?: number;
  yield?: number;
  maturity?: string;
  indicatorName?: string;
  currency?: string;
  country?: string;
  // filing / analyst
  filing_type?: string;
  filing_url?: string;
  analyst_firm?: string;
  rating_from?: string;
  rating_to?: string;
  price_target?: number;
  // earnings recent
  eps_actual?: number;
  eps_estimate?: number;
  revenue_actual?: number;
  revenue_estimate?: number;
  surprise?: number;
  // insider
  insider_name?: string;
  transaction_type?: string;
  shares?: number;
  value?: number;
  // catch-all raw payload from backend
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: Record<string, any>;
  [key: string]: unknown;
}

const CATALYST_TABS: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "top_catalysts",      label: "Top Catalysts This Week", icon: Flame     },
  { key: "earnings_dates",     label: "Earnings",           icon: CalendarDays   },
  { key: "dividends",          label: "Dividends",          icon: DollarSign     },
  { key: "ipos",               label: "IPOs",               icon: TrendingUp     },
  { key: "splits",             label: "Stock Splits",       icon: Scissors       },
  { key: "economic_releases",  label: "Economic Releases",  icon: BarChart2      },
  { key: "treasury_macro",     label: "Treasury / Macro",   icon: Landmark       },
];

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  earnings:          { bg: "rgba(245,158,11,0.15)",  text: "#fbbf24", border: "rgba(245,158,11,0.3)"  },
  dividend:          { bg: "rgba(16,185,129,0.15)",  text: "#34d399", border: "rgba(16,185,129,0.3)"  },
  ipo:               { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa", border: "rgba(139,92,246,0.3)"  },
  split:             { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  economic_release:  { bg: "rgba(249,115,22,0.15)",  text: "#fb923c", border: "rgba(249,115,22,0.3)"  },
  macro:             { bg: "rgba(236,72,153,0.15)",  text: "#f472b6", border: "rgba(236,72,153,0.3)"  },
  sec_filing:        { bg: "rgba(239,68,68,0.15)",   text: "#f87171", border: "rgba(239,68,68,0.3)"   },
  analyst:           { bg: "rgba(14,165,233,0.15)",  text: "#38bdf8", border: "rgba(14,165,233,0.3)"  },
  insider:           { bg: "rgba(168,85,247,0.15)",  text: "#c084fc", border: "rgba(168,85,247,0.3)"  },
};

const IMPORTANCE_COLORS: Record<string, { bg: string; text: string }> = {
  high:   { bg: "rgba(239,68,68,0.15)",   text: "#f87171" },
  medium: { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
  low:    { bg: "rgba(255,255,255,0.06)", text: "rgba(255,255,255,0.4)" },
};

// ─── Signal-tier helpers ──────────────────────────────────────────────
// Effective tier precedence: signal_tier → importance fallback.
//   importance high  → major
//   importance medium → secondary
//   importance low / absent → context

type SignalTier = "critical" | "major" | "secondary" | "context";

interface TierPresentation {
  label: string;
  labelCls: string;
  cardBorder: string;
  cardBg: string;
  titleWeight: string;
  isMuted: boolean;
}

const TIER_PRESENTATION: Record<SignalTier, TierPresentation> = {
  critical: {
    label: "Critical",
    labelCls: "text-rose-300 bg-rose-500/15 border-rose-500/30",
    cardBorder: "border-rose-500/40",
    cardBg: "bg-rose-500/[0.04]",
    titleWeight: "font-bold",
    isMuted: false,
  },
  major: {
    label: "Major",
    labelCls: "text-orange-300 bg-orange-500/15 border-orange-500/30",
    cardBorder: "border-orange-500/30",
    cardBg: "bg-orange-500/[0.03]",
    titleWeight: "font-semibold",
    isMuted: false,
  },
  secondary: {
    label: "Secondary",
    labelCls: "text-white/50 bg-white/5 border-white/15",
    cardBorder: "border-white/[0.06]",
    cardBg: "bg-white/[0.01]",
    titleWeight: "font-medium",
    isMuted: false,
  },
  context: {
    label: "Context",
    labelCls: "text-white/30 bg-white/[0.03] border-white/10",
    cardBorder: "border-white/[0.03]",
    cardBg: "bg-transparent",
    titleWeight: "font-normal",
    isMuted: true,
  },
};

const TIER_ORDER: Record<SignalTier, number> = {
  critical: 0,
  major: 1,
  secondary: 2,
  context: 3,
};

function effectiveSignalTier(ev: { signal_tier?: SignalTier; importance?: string }, macroTab = false): SignalTier {
  if (ev.signal_tier) return ev.signal_tier;
  if (macroTab) {
    // Conservative fallback for macro tabs only: stale/legacy rows must not
    // render as Critical or Major without an explicit backend signal_tier.
    if (ev.importance === "low") return "context";
    if (ev.importance === "high" || ev.importance === "medium") return "secondary";
    return "context";
  }
  if (ev.importance === "high") return "major";
  if (ev.importance === "medium") return "secondary";
  return "context";
}

function tierPresentation(ev: { signal_tier?: SignalTier; importance?: string }): TierPresentation {
  const tier = effectiveSignalTier(ev);
  return TIER_PRESENTATION[tier];
}

function SignalTierBadge({ event, macroTab }: { event: { signal_tier?: SignalTier; importance?: string }; macroTab?: boolean }) {
  const tier = effectiveSignalTier(event, macroTab);
  const p = TIER_PRESENTATION[tier];
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap border ${p.labelCls}`}>
      {p.label}
    </span>
  );
}

// Sort comparator: higher-tier events first; stable for same tier.
function compareTier(a: CalendarEvent, b: CalendarEvent, macroTab = false): number {
  const ta = TIER_ORDER[effectiveSignalTier(a, macroTab)];
  const tb = TIER_ORDER[effectiveSignalTier(b, macroTab)];
  return ta - tb;
}

function EventTypeBadge({ type }: { type: string }) {
  const t = type?.toLowerCase().replace(/ /g, "_") || "macro";
  const c = EVENT_TYPE_COLORS[t] || EVENT_TYPE_COLORS.macro;
  const label = type?.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()) || "Event";
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {label}
    </span>
  );
}

function ImportanceBadge({ importance }: { importance?: string }) {
  const imp = importance || "low";
  const c = IMPORTANCE_COLORS[imp] || IMPORTANCE_COLORS.low;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}>
      {imp.charAt(0).toUpperCase() + imp.slice(1)}
    </span>
  );
}

// ─── Catalyst Detail Modal ────────────────────────────────────────

function CatalystDetailModal({ event, onClose }: { event: CatalystEvent; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const r = event.raw || {};
  const str = (v: unknown) => (v != null ? String(v).trim() : null) || null;

  const rows: [string, string][] = [];
  if (event.signal_tier) rows.push(["Signal Tier", event.signal_tier.charAt(0).toUpperCase() + event.signal_tier.slice(1)]);
  if (event.event_family) rows.push(["Event Family", event.event_family]);
  if (event.signal_reason) rows.push(["Why This Matters", event.signal_reason]);
  if (event.date)   rows.push(["Date",   event.date]);
  if (event.symbol) rows.push(["Symbol", event.symbol]);
  const compName = event.companyName || str(r.companyName) || str(r.company) || str(r.name) || event.company;
  if (compName)     rows.push(["Company", compName]);
  if (event.sector) rows.push(["Sector", event.sector]);
  if (event.exchange || str(r.exchange)) rows.push(["Exchange", (event.exchange || str(r.exchange))!]);
  if (event.market_cap) rows.push(["Market Cap", formatMktCap(event.market_cap as number)]);
  // dividends
  const exd = event.exDividendDate || event.ex_date || str(r.exDividendDate) || str(r.ex_date);
  const rec = event.recordDate || str(r.recordDate) || str(r.record_date);
  const pay = event.paymentDate || event.pay_date || str(r.paymentDate) || str(r.pay_date);
  const divAmt = event.dividend_amount ?? event.dividend ?? (r.dividend as number | undefined);
  const divYld = event.dividend_yield ?? (r.dividend_yield as number | undefined);
  if (divAmt != null) rows.push(["Dividend Amount", `$${Number(divAmt).toFixed(4)}`]);
  if (divYld != null) rows.push(["Dividend Yield", `${(Number(divYld) * 100).toFixed(2)}%`]);
  if (exd) rows.push(["Ex-Date",  exd.slice(0, 10)]);
  if (rec) rows.push(["Record Date", rec.slice(0, 10)]);
  if (pay) rows.push(["Pay Date",    pay.slice(0, 10)]);
  // ipos
  const price = event.priceRange || event.ipo_price_range || str(r.priceRange) || str(r.price_range);
  if (price) rows.push(["Price Range", price]);
  const shares = event.shares ?? event.ipo_shares ?? (r.shares as number | undefined);
  if (shares != null) rows.push(["Shares", Number(shares).toLocaleString()]);
  // splits
  const ratio = event.splitRatio || event.split_ratio || str(r.splitRatio) || str(r.split_ratio);
  if (ratio) rows.push(["Split Ratio", ratio]);
  // macro
  const yld = event.yield ?? (r.yield as number | undefined);
  const rate = event.rate ?? (r.rate as number | undefined);
  const mat = event.maturity || str(r.maturity);
  const ind = event.indicatorName || str(r.indicatorName);
  if (yld  != null) rows.push(["Yield",     `${yld}%`]);
  if (rate != null) rows.push(["Rate",      `${rate}%`]);
  if (mat)          rows.push(["Maturity",  mat]);
  if (ind)          rows.push(["Indicator", ind]);
  // economic
  if (event.actual   != null) rows.push(["Actual",   String(event.actual)]);
  if (event.estimate != null) rows.push(["Estimate", String(event.estimate)]);
  if (event.previous != null) rows.push(["Previous", String(event.previous)]);
  // analyst / insider
  if (event.analyst_firm)   rows.push(["Analyst Firm", event.analyst_firm]);
  if (event.rating_from && event.rating_to) rows.push(["Rating Change", `${event.rating_from} → ${event.rating_to}`]);
  if (event.price_target != null) rows.push(["Price Target", `$${event.price_target}`]);
  if (event.insider_name)   rows.push(["Insider",     event.insider_name]);
  if (event.transaction_type) rows.push(["Transaction", event.transaction_type]);
  if (event.value != null)  rows.push(["Value",      formatMktCap(event.value as number)]);
  if (event.country)        rows.push(["Country",    event.country]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col" style={{ background: "#0c0c0f", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <EventTypeBadge type={event.event_type} />
              <ImportanceBadge importance={event.importance} />
              {event.signal_tier && <SignalTierBadge event={event} />}
            </div>
            <h2 className="text-base font-bold text-white">
              {getEventDisplayTitle(event)}
            </h2>
            {event.symbol && event.event_name && (
              <p className="text-xs text-white/40 mt-0.5">{event.symbol} · {event.date}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all ml-3 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Details */}
        <div className="px-5 py-4 overflow-y-auto">
          <div className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-xs text-white/40">{label}</span>
                <span className="text-xs text-white/80 font-medium">{value}</span>
              </div>
            ))}
          </div>
          {event.filing_url && (
            <a href={event.filing_url} target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              <ExternalLink className="w-3 h-3" />
              View Filing
            </a>
          )}
          {event.details && Object.keys(event.details).length > 0 && (
            <details className="mt-4">
              <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50 transition-colors">View raw data</summary>
              <pre className="mt-2 text-[10px] text-white/30 bg-white/[0.02] rounded-lg p-3 overflow-x-auto">{JSON.stringify(event.details, null, 2)}</pre>
            </details>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Catalyst Calendar — Normalized event type ───────────────────

interface CalendarEvent {
  id: string;
  date: string;          // YYYY-MM-DD
  symbol?: string;
  title: string;
  subtitle?: string;
  eventType: string;
  importance?: "high" | "medium" | "low";
  signal_tier?: "critical" | "major" | "secondary" | "context";
  event_family?: string;
  signal_reason?: string;
  raw: CatalystEvent;
}

/**
 * Coerce an unknown value to a trimmed non-empty string, or null.
 * Used throughout the event normalization pipeline.
 */
/** Bare event-type strings the backend sometimes sets as placeholder titles — treat as null */
const _GENERIC_TYPE_STRS = new Set([
  "macro", "economic release", "economic_release", "economic releases", "economic_releases",
  "treasury macro", "treasury_macro", "treasury / macro",
  "stock split", "stock_split",
  "ipo", "ipos",
  "dividend", "dividends",
  "event", "unknown", "n/a", "na", "none", "-", "--", "—",
]);

function _evStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined") return null;
  // Treat bare event-type placeholder strings as null so the chain falls
  // through to the real name fields (e.g. indicatorName, event_name)
  if (_GENERIC_TYPE_STRS.has(s.toLowerCase())) return null;
  return s;
}

/**
 * Return the best human-readable display title for a catalyst event.
 * Priority chain (first non-empty wins):
 *   display_title → title → indicatorName → event_name → name →
 *   raw variants → company / companyName → symbol → fallback
 *
 * indicatorName is placed BEFORE event_name because for treasury/macro
 * events the backend may populate event_name with a generic type string
 * (e.g. "macro") while the real human-readable name lives in indicatorName
 * (e.g. "10-Year Treasury Yield", "Federal Funds Rate").
 */
function getEventDisplayTitle(ev: CatalystEvent, tab?: string): string {
  const r = ev.raw || {};
  const FALLBACKS: Record<string, string> = {
    dividends:          "Dividend",
    ipos:               "IPO",
    splits:             "Stock Split",
    economic_releases:  "Economic Release",
    treasury_macro:     "Treasury / Macro",
  };
  const fallback = (tab && FALLBACKS[tab]) ? FALLBACKS[tab] : "Unknown Event";
  return (
    _evStr(ev.display_title) ||
    _evStr(ev.title) ||
    _evStr(ev.indicatorName) ||
    _evStr(r.indicatorName as unknown) ||
    _evStr(r.indicator_name as unknown) ||
    _evStr(ev.event_name) ||
    _evStr(ev.name) ||
    _evStr(r.display_title) ||
    _evStr(r.event_name) ||
    _evStr(r.name) ||
    _evStr(r.event) ||
    _evStr(r.title) ||
    _evStr(r.category as unknown) ||
    _evStr(r.source as unknown) ||
    _evStr(r.description as unknown) ||
    _evStr(ev.company) ||
    _evStr(ev.companyName) ||
    _evStr(r.company) ||
    _evStr(r.companyName) ||
    (ev.symbol ? ev.symbol : null) ||
    fallback
  );
}

/** Normalize a raw CatalystEvent into the unified CalendarEvent shape */
function normalizeCatalystEvent(ev: CatalystEvent, tab: string, idx: number): CalendarEvent | null {
  // Pick the best available date field
  let date = ev.date || ev.ex_date || "";
  if (!date) {
    console.warn("[CatalystCalendar] event has no usable date field:", ev);
    return null;
  }
  // Ensure YYYY-MM-DD format (strip time if present)
  date = date.slice(0, 10);

  const r = ev.raw || {};
  let title = "";
  let subtitle = "";

  if (tab === "dividends") {
    date = ev.ex_date?.slice(0, 10) || ev.date?.slice(0, 10) || "";
    if (!date) return null;
    // Title: use display_title chain; default to "{SYMBOL} Dividend"
    const base = getEventDisplayTitle(ev, tab);
    title = (base !== "Dividend") ? base : (ev.symbol ? `${ev.symbol} Dividend` : "Dividend");
    // Subtitle: amount / yield / pay date
    const parts: string[] = [];
    const amt = ev.dividend_amount ?? ev.dividend ?? (_evStr(r.dividend_amount) ? Number(r.dividend_amount) : undefined) ?? (_evStr(r.dividend) ? Number(r.dividend) : undefined);
    const yld = ev.dividend_yield ?? (r.dividend_yield != null ? Number(r.dividend_yield) : undefined);
    const pay = _evStr(ev.pay_date) || _evStr(ev.paymentDate) || _evStr(r.pay_date) || _evStr(r.paymentDate);
    if (amt != null)  parts.push(`$${Number(amt).toFixed(4)}/share`);
    if (yld != null)  parts.push(`Yield ${(Number(yld) * 100).toFixed(2)}%`);
    if (pay)          parts.push(`Pay ${pay.slice(0, 10)}`);
    subtitle = parts.join(" · ");
  } else if (tab === "ipos") {
    // Title: use display_title chain; append "IPO" suffix if not already present
    const base = getEventDisplayTitle(ev, tab);
    title = /ipo/i.test(base) ? base : `${base} IPO`;
    // Subtitle: company name / exchange / price range / date
    const parts: string[] = [];
    const company = ev.company && ev.symbol && ev.company !== ev.symbol ? ev.company : null;
    const exch    = _evStr(ev.exchange) || _evStr(r.exchange) || _evStr(r.market);
    const price   = _evStr(ev.priceRange) || _evStr(ev.ipo_price_range) || _evStr(r.priceRange) || _evStr(r.price_range)
                  || (ev.offerPrice != null ? `$${ev.offerPrice}` : null);
    if (company)  parts.push(company);
    if (exch)     parts.push(exch);
    if (price)    parts.push(price);
    if (date)     parts.push(date);
    subtitle = parts.join(" · ");
  } else if (tab === "splits") {
    // Title: use display_title chain; default to "{SYMBOL} Split"
    const base = getEventDisplayTitle(ev, tab);
    title = (base !== "Stock Split") ? base : (ev.symbol ? `${ev.symbol} Split` : "Stock Split");
    // Subtitle: split ratio / date
    const ratio = _evStr(ev.split_ratio) || _evStr(ev.splitRatio) || _evStr(r.split_ratio) || _evStr(r.splitRatio);
    const n  = ev.numerator   ?? (r.numerator   != null ? Number(r.numerator)   : undefined);
    const d2 = ev.denominator ?? (r.denominator != null ? Number(r.denominator) : undefined);
    const parts: string[] = [];
    if (ratio)                    parts.push(ratio);
    else if (n != null && d2 != null) parts.push(`${n}:${d2}`);
    if (date)                     parts.push(date);
    subtitle = parts.join(" · ");
  } else if (tab === "economic_releases") {
    // Title: real event name from priority chain
    title = getEventDisplayTitle(ev, tab);
    // Subtitle: time + country + impact level
    const parts: string[] = [];
    const timeVal = _evStr((r as Record<string, unknown>).time) || _evStr((r as Record<string, unknown>).release_time);
    const country = _evStr(ev.country) || _evStr(r.country as unknown);
    const impact  = ev.importance;
    if (timeVal)                      parts.push(timeVal);
    if (country)                      parts.push(country);
    if (impact && impact !== "low")   parts.push(impact === "high" ? "High Impact" : "Medium Impact");
    if (parts.length === 0)           parts.push("Economic Release");
    subtitle = parts.join(" · ");
  } else if (tab === "treasury_macro") {
    // Title: real event name from priority chain (r.category / r.source often carry it)
    title = getEventDisplayTitle(ev, tab);
    // Subtitle: numeric data — yield, rate, maturity, prev (NOT r.category/r.source
    // since those are now used as the title above)
    const parts: string[] = [];
    const timeVal = _evStr((r as Record<string, unknown>).time) || _evStr((r as Record<string, unknown>).release_time);
    const yld     = ev.yield ?? (r.yield != null ? Number(r.yield) : undefined) ?? ev.actual ?? (r.actual != null ? Number(r.actual) : undefined);
    const rate    = ev.rate  ?? (r.rate  != null ? Number(r.rate)  : undefined);
    const mat     = _evStr(ev.maturity) || _evStr((r as Record<string, unknown>).maturity as unknown);
    const prev    = ev.previous ?? (r.previous != null ? Number(r.previous) : undefined);
    const ctry    = _evStr(ev.country) || _evStr((r as Record<string, unknown>).country as unknown);
    if (timeVal)              parts.push(timeVal);
    if (ctry)                 parts.push(ctry);
    if (yld  != null)         parts.push(`${yld}%`);
    if (rate != null && rate !== yld) parts.push(`Rate: ${rate}%`);
    if (mat)                  parts.push(mat);
    if (prev != null)         parts.push(`Prev: ${prev}%`);
    subtitle = parts.join(" · ");
  } else {
    title = getEventDisplayTitle(ev, tab);
    subtitle = _evStr(ev.subtitle as unknown) || _evStr(ev.sector as unknown) || "";
  }

  return {
    id: ev.id || `${tab}-${idx}`,
    date,
    symbol: ev.symbol,
    title,
    subtitle: subtitle || undefined,
    eventType: ev.event_type || tab,
    importance: ev.importance,
    signal_tier: ev.signal_tier,
    event_family: ev.event_family,
    signal_reason: ev.signal_reason,
    raw: ev,
  };
}

// ─── CatalystCalendarGrid — Reuses same 7-day week grid ──────────

function CatalystCalendarGrid({
  events,
  loading,
  onEventClick,
}: {
  events: CalendarEvent[];
  loading: boolean;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const [weekStart, setWeekStart] = useState<Date>(() => getSunday(new Date()));
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => dateKey(new Date()));

  // Build date map from normalized events
  const dateMap = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    if (!ev.date) continue;
    const existing = dateMap.get(ev.date) || [];
    dateMap.set(ev.date, [...existing, ev]);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekMonth = MONTH_NAMES[weekStart.getMonth()];
  const weekYear = weekStart.getFullYear();
  const totalThisWeek = weekDays.reduce((sum, d) => sum + (dateMap.get(dateKey(d))?.length || 0), 0);

  const prevWeek = () => {
    const ns = addDays(weekStart, -7);
    setWeekStart(ns);
    setSelectedDayKey(dateKey(ns));
  };
  const nextWeek = () => {
    const ns = addDays(weekStart, 7);
    setWeekStart(ns);
    setSelectedDayKey(dateKey(ns));
  };
  const goToday = () => {
    setWeekStart(getSunday(new Date()));
    setSelectedDayKey(dateKey(new Date()));
  };
  const goNextWeek = () => {
    const ns = addDays(getSunday(new Date()), 7);
    setWeekStart(ns);
    setSelectedDayKey(dateKey(ns));
  };
  const goThisMonth = () => {
    // Stay on current week but jump to first day of month with events, or today
    setWeekStart(getSunday(new Date()));
    setSelectedDayKey(dateKey(new Date()));
  };

  const selectedEntries = dateMap.get(selectedDayKey) || [];
  const selectedDate = weekDays.find((d) => dateKey(d) === selectedDayKey) || new Date();

  return (
    <div>
      {/* ── Navigation header (same style as EarningsCalendar) ──── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-white">
            {weekMonth} {weekYear}
          </p>
          <p className="text-[10px] text-white/30">
            {totalThisWeek} event{totalThisWeek !== 1 ? "s" : ""} this week
            {loading && <span className="ml-1.5 text-blue-400/50"><Loader2 className="w-2.5 h-2.5 animate-spin inline" /></span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* Quick-range navigation — moves calendar, never hides it */}
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden mr-2">
            {[
              { label: "Today",     action: goToday    },
              { label: "Next Wk",  action: goNextWeek },
              { label: "Month",    action: goThisMonth },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                className="px-2.5 py-1 text-[10px] font-semibold text-white/40 hover:text-white/70 hover:bg-white/5 transition-all border-r border-white/[0.06] last:border-r-0"
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={prevWeek} className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4 text-white/50" />
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/5 transition-all">
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* ── Week day selector grid (identical structure to EarningsCalendar) ── */}
      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {weekDays.map((day, i) => {
          const key = dateKey(day);
          const entries = (dateMap.get(key) || []).filter(
            (ev) =>
              !/^Will\s/i.test(ev.title || "") &&
              (ev.symbol || "").trim() !== "???" &&
              ev.raw?.source !== "polymarket"
          );
          const isToday = dateKey(new Date()) === key;
          const isSelected = selectedDayKey === key;
          const count = entries.length;
          return (
            <button
              key={key}
              onClick={() => setSelectedDayKey(key)}
              className={`rounded-xl p-2.5 text-center transition-all border ${
                isSelected
                  ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20"
                  : isToday
                  ? "bg-white/[0.03] border-blue-500/15 hover:bg-white/[0.05]"
                  : "bg-white/[0.015] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]"
              }`}
            >
              <p className={`text-[10px] font-semibold mb-0.5 ${isSelected ? "text-blue-400" : "text-white/40"}`}>
                {DAY_NAMES_FULL[i]}
              </p>
              <p className={`text-xs font-bold ${isSelected ? "text-white" : isToday ? "text-blue-400" : "text-white/70"}`}>
                {MONTH_NAMES_SHORT[day.getMonth()]} {day.getDate()}
              </p>
              <p className={`text-[9px] mt-1 ${count > 0 ? (isSelected ? "text-blue-400/70" : "text-white/40") : "text-white/20"}`}>
                {count > 0 ? `${count} Event${count > 1 ? "s" : ""}` : loading ? "—" : "No Events"}
              </p>
              {/* Colored event chips — mirror ticker chips in EarningsCalendar */}
              {count > 0 && (
                <div className="flex justify-center gap-0.5 mt-1.5 flex-wrap">
                  {entries.slice(0, 4).map((ev, idx) => {
                    const typeKey = (ev.eventType || "macro").toLowerCase().replace(/ /g, "_");
                    const c = EVENT_TYPE_COLORS[typeKey] || EVENT_TYPE_COLORS.macro;
                    const letter = (ev.symbol || ev.title || "?").slice(0, 1).toUpperCase();
                    return (
                      <div
                        key={ev.id || idx}
                        className="w-4 h-4 rounded-sm flex items-center justify-center"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}
                      >
                        <span className="text-[6px] font-bold" style={{ color: c.text }}>{letter}</span>
                      </div>
                    );
                  })}
                  {count > 4 && (
                    <div className="w-4 h-4 rounded-sm bg-white/[0.06] flex items-center justify-center">
                      <span className="text-[6px] font-bold text-white/40">+{count - 4}</span>
                    </div>
                  )}
                </div>
              )}
              {/* Skeleton chips while loading */}
              {loading && count === 0 && (
                <div className="flex justify-center gap-0.5 mt-1.5">
                  {Array.from({ length: 2 }).map((_, s) => (
                    <div key={s} className="w-4 h-4 rounded-sm bg-white/[0.04] animate-pulse" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Selected day header ─────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-bold text-white/90">
          {DAY_NAMES_FULL[selectedDate.getDay()]},{" "}
          {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}
        </h4>
        <span className="text-[10px] text-white/30">
          {selectedEntries.length} event{selectedEntries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Event list for selected day ─────────────────────────── */}
      {loading && selectedEntries.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      ) : selectedEntries.length === 0 ? (
        <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
          <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
          <p className="text-sm text-white/25">No events on this day</p>
          <p className="text-[10px] text-white/15 mt-1">
            {events.length === 0
              ? "No calendar-ready events found for this date range."
              : "Navigate to another day or use the quick-range buttons above."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedEntries.map((ev, i) => {
            const typeKey = (ev.eventType || "macro").toLowerCase().replace(/ /g, "_");
            const c = EVENT_TYPE_COLORS[typeKey] || EVENT_TYPE_COLORS.macro;
            const letter = (ev.symbol || ev.title || "?").slice(0, 1).toUpperCase();
            return (
              <button
                key={ev.id || i}
                onClick={() => onEventClick(ev)}
                className="w-full text-left rounded-xl border border-white/[0.06] p-3 hover:bg-white/[0.04] transition-all flex items-start gap-3"
              >
                {/* Color icon chip */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}
                >
                  <span className="text-xs font-bold" style={{ color: c.text }}>{letter}</span>
                </div>
                {/* Event info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ev.symbol && (
                      <span className="text-xs font-bold text-white/90">{ev.symbol}</span>
                    )}
                    <span className="text-xs text-white/70 truncate">{ev.title}</span>
                    <EventTypeBadge type={ev.eventType} />
                    {ev.importance && <ImportanceBadge importance={ev.importance} />}
                  </div>
                  {ev.subtitle && (
                    <p className="text-[10px] text-white/35 mt-0.5 truncate">{ev.subtitle}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CompanyIdentity — logo/avatar + company name + ticker ──────

function CompanyIdentity({
  symbol,
  companyName,
  logoUrl,
  size = "sm",
}: {
  symbol: string;
  companyName?: string;
  logoUrl?: string;
  size?: "sm" | "md";
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const avatarSz  = size === "md" ? "w-9 h-9"   : "w-7 h-7";
  const initSz    = size === "md" ? "text-[10px]" : "text-[9px]";
  const showImg   = !!logoUrl && !imgFailed;
  const hasName   = !!companyName && companyName !== symbol;

  return (
    <div className="flex items-center gap-2 min-w-0">
      {showImg ? (
        <img
          src={logoUrl}
          alt={symbol}
          loading="lazy"
          className={`${avatarSz} rounded-lg object-contain bg-white/5 p-0.5 flex-shrink-0`}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className={`${avatarSz} rounded-lg bg-gradient-to-br ${tickerColor(symbol)} flex items-center justify-center flex-shrink-0`}>
          <span className={`${initSz} font-bold text-white`}>{symbol.slice(0, 2)}</span>
        </div>
      )}
      <div className="min-w-0">
        {hasName && (
          <p className="text-xs font-semibold text-white/90 truncate max-w-[160px] leading-tight">
            {companyName}
          </p>
        )}
        <p className={`font-mono leading-tight ${hasName ? "text-[10px] text-white/40" : "text-xs font-bold text-white/90"}`}>
          {symbol}
        </p>
      </div>
    </div>
  );
}

// ─── CatalystListTab — range toggles + sortable list ────────────

const RANGE_OPTIONS = [
  { key: "recent",     label: "Recent"     },
  { key: "today",      label: "Today"      },
  { key: "this_week",  label: "This Week"  },
  { key: "next_week",  label: "Next Week"  },
  { key: "this_month", label: "This Month" },
] as const;

type DateRange = typeof RANGE_OPTIONS[number]["key"];

function CatalystListTab({
  tabKey,
  scope,
  search,
  hideRangeToggle = false,
  defaultRange,
  identityMap = {},
  onFetchIdentity = () => {},
}: {
  tabKey: string;
  scope: string;
  search: string;
  hideRangeToggle?: boolean;
  defaultRange?: DateRange;
  identityMap?: Record<string, IdentityData>;
  onFetchIdentity?: (tickers: string[]) => void;
}) {
  const [dateRange, setDateRange] = useState<DateRange>(defaultRange ?? "recent");
  const [events, setEvents]       = useState<CatalystEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CatalystEvent | null>(null);
  const [sortCol, setSortCol]     = useState<string>("date");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("desc");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ tab: tabKey, scope });
    if (dateRange === "recent") params.set("mode", "recent");
    else params.set("date_range", dateRange);
    if (search.trim()) params.set("search", search.trim());
    fetch(`/api/catalysts/events?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError("Recent data temporarily unavailable.");
          setEvents([]);
        } else {
          const arr = Array.isArray(data) ? data : (data.events || data.results || []);
          if (process.env.NODE_ENV !== "production") {
            console.debug(`[CatalystListTab] tab=${tabKey} range=${dateRange} count=${arr.length}`, arr[0] ?? "(empty)");
          }
          const filtered =
            tabKey === "earnings_dates"
              ? arr.filter(
                  (ev: CatalystEvent) =>
                    ev.source !== "polymarket" &&
                    (ev.ticker || "").trim() !== "???" &&
                    !/^Will\s/i.test(ev.title || "") &&
                    !/^Will\s/i.test(ev.company || "") &&
                    !/^Will\s/i.test(ev.ticker || "")
                )
              : arr;
          setEvents(filtered);
          const syms = filtered.map((ev: CatalystEvent) => ev.symbol || ev.ticker || "").filter(Boolean);
          if (syms.length > 0) onFetchIdentity(syms);
        }
      })
      .catch(() => { if (!cancelled) setError("Could not load recent data."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tabKey, scope, search, dateRange, refreshKey]);

  // ── Display helpers ────────────────────────────────────────────────

  const TAB_LABELS: Record<string, string> = {
    dividends:          "Dividend",
    ipos:               "IPO",
    splits:             "Stock Split",
    economic_releases:  "Economic Release",
    treasury_macro:     "Treasury / Macro",
    earnings_dates:     "Earnings",
  };

  /** Primary label for "Company / Event" column — rich fallback chain */
  function resolveDisplayName(ev: CatalystEvent, tab: string): string {
    const r = ev.raw || {};
    const fallbackLabel = TAB_LABELS[tab] || "Event";
    // For IPO tab, company name sources get " IPO" appended if not already present
    const appendSuffix = (name: string | undefined | null): string | null => {
      if (!name) return null;
      if (tab === "ipos" && !/ipo/i.test(name)) return `${name} IPO`;
      return name;
    };
    return (
      (ev.title as string | undefined) ||
      appendSuffix(ev.companyName as string | undefined) ||
      appendSuffix(r.companyName as string | undefined) ||
      appendSuffix(r.company    as string | undefined) ||
      appendSuffix(r.name       as string | undefined) ||
      (r.event      as string | undefined) ||
      (r.title      as string | undefined) ||
      appendSuffix(ev.company as string | undefined) ||
      (ev.event_name as string | undefined) ||
      (ev.indicatorName as string | undefined) ||
      (r.indicatorName as string | undefined) ||
      (ev.symbol ? `${ev.symbol} ${fallbackLabel}` : null) ||
      fallbackLabel
    );
  }

  /** Normalized event_type string for badge look-up */
  function resolveEventType(ev: CatalystEvent, tab: string): string {
    if (ev.eventLabel) return ev.eventLabel;
    const TAB_TYPES: Record<string, string> = {
      dividends:          "dividend",
      ipos:               "ipo",
      splits:             "split",
      economic_releases:  "economic_release",
      treasury_macro:     "macro",
      earnings_dates:     "earnings",
    };
    const raw = (ev.eventType as string | undefined) || ev.event_type || TAB_TYPES[tab] || "macro";
    // strip out generic "event" if backend fallback is unhelpful
    if (raw.toLowerCase() === "event") return TAB_TYPES[tab] || "macro";
    return raw;
  }

  /** Key details string — checks keyDetails, then builds from known fields */
  function resolveKeyDetails(ev: CatalystEvent, tab: string): string {
    if (ev.keyDetails) return ev.keyDetails as string;

    const r = ev.raw || {};
    const coerce = (v: unknown): string | null => {
      if (v == null) return null;
      const s = String(v).trim();
      return s.length > 0 && s !== "null" && s !== "undefined" ? s : null;
    };

    if (tab === "earnings_dates") {
      const parts: string[] = [];
      if (ev.eps_actual != null) parts.push(`EPS: $${(ev.eps_actual as number).toFixed(2)}`);
      if (ev.eps_estimate != null) parts.push(`Est: $${(ev.eps_estimate as number).toFixed(2)}`);
      if (ev.surprise != null) parts.push(`Surprise: ${(ev.surprise as number) > 0 ? "+" : ""}${(ev.surprise as number).toFixed(1)}%`);
      if (ev.revenue_actual != null) parts.push(`Rev: ${formatMktCap(ev.revenue_actual as number)}`);
      return parts.join(" · ") || (ev.subtitle as string | undefined) || "—";
    }

    if (tab === "dividends") {
      const parts: string[] = [];
      const amt  = (ev.dividend_amount ?? ev.dividend ?? (r.dividend as number | undefined) ?? (r.dividend_amount as number | undefined)) as number | undefined;
      const yld  = (ev.dividend_yield ?? (r.dividend_yield as number | undefined)) as number | undefined;
      const exd  = coerce(ev.exDividendDate) || coerce(ev.ex_date) || coerce(r.exDividendDate) || coerce(r.ex_date);
      const rec  = coerce(ev.recordDate) || coerce(r.recordDate) || coerce(r.record_date);
      const pay  = coerce(ev.paymentDate) || coerce(ev.pay_date) || coerce(r.paymentDate) || coerce(r.pay_date);
      if (amt != null)  parts.push(`Dividend: $${Number(amt).toFixed(4)}`);
      if (yld != null)  parts.push(`Yield: ${(Number(yld) * 100).toFixed(2)}%`);
      if (exd)          parts.push(`Ex-Date: ${exd.slice(0, 10)}`);
      if (rec)          parts.push(`Record: ${rec.slice(0, 10)}`);
      if (pay)          parts.push(`Payable: ${pay.slice(0, 10)}`);
      return parts.join(" · ") || (ev.subtitle as string | undefined) || "—";
    }

    if (tab === "ipos") {
      const parts: string[] = [];
      const exch  = coerce(ev.exchange) || coerce(r.exchange) || coerce(r.market);
      const price = coerce(ev.priceRange) || coerce(ev.ipo_price_range) || coerce(r.priceRange) || coerce(r.price_range)
                  || (ev.offerPrice != null ? `$${ev.offerPrice}` : null);
      const sh    = (ev.shares ?? ev.ipo_shares ?? (r.shares as number | undefined) ?? (r.ipo_shares as number | undefined)) as number | undefined;
      if (exch)       parts.push(`Exchange: ${exch}`);
      if (price)      parts.push(`Price: ${price}`);
      if (sh != null) parts.push(`Shares: ${(Number(sh) / 1e6).toFixed(1)}M`);
      return parts.join(" · ") || (ev.subtitle as string | undefined) || "—";
    }

    if (tab === "splits") {
      const ratio = coerce(ev.splitRatio) || coerce(ev.split_ratio) || coerce(r.splitRatio) || coerce(r.split_ratio);
      const n = (ev.numerator ?? (r.numerator as number | undefined)) as number | undefined;
      const d = (ev.denominator ?? (r.denominator as number | undefined)) as number | undefined;
      const parts: string[] = [];
      if (ratio)              parts.push(`Split: ${ratio}`);
      if (n != null && d != null) parts.push(`Ratio: ${n}:${d}`);
      return parts.join(" · ") || (ev.subtitle as string | undefined) || "—";
    }

    if (tab === "economic_releases") {
      const parts: string[] = [];
      const act  = (ev.actual   ?? (r.actual   as number | undefined)) as number | undefined;
      const est  = (ev.estimate ?? (r.estimate as number | undefined)) as number | undefined;
      const prev = (ev.previous ?? (r.previous as number | undefined)) as number | undefined;
      const ctry = coerce(ev.country) || coerce(r.country);
      if (act  != null) parts.push(`Actual: ${act}`);
      if (est  != null) parts.push(`Est: ${est}`);
      if (prev != null) parts.push(`Prev: ${prev}`);
      if (ctry)         parts.push(ctry);
      return parts.join(" · ") || (ev.subtitle as string | undefined) || "—";
    }

    if (tab === "treasury_macro") {
      const parts: string[] = [];
      const yld  = (ev.yield  ?? (r.yield  as number | undefined) ?? ev.actual ?? (r.actual as number | undefined)) as number | undefined;
      const rate = (ev.rate   ?? (r.rate   as number | undefined)) as number | undefined;
      const mat  = coerce(ev.maturity) || coerce(r.maturity);
      const ind  = coerce(ev.indicatorName) || coerce(r.indicatorName);
      const prev = (ev.previous ?? (r.previous as number | undefined)) as number | undefined;
      if (yld  != null)           parts.push(`Yield: ${yld}%`);
      if (rate != null && rate !== yld) parts.push(`Rate: ${rate}%`);
      if (mat)                    parts.push(`Maturity: ${mat}`);
      if (ind)                    parts.push(`Indicator: ${ind}`);
      if (prev != null)           parts.push(`Prev: ${prev}%`);
      return parts.join(" · ") || coerce(ev.actual) || (ev.subtitle as string | undefined) || "—";
    }

    return (ev.subtitle as string | undefined) || (ev.sector as string | undefined) || "—";
  }

  /** Infer importance if backend did not provide it */
  function resolveImportance(ev: CatalystEvent, tab: string): "high" | "medium" | "low" {
    if (ev.importance) return ev.importance;
    if (tab === "treasury_macro") {
      const name = resolveDisplayName(ev, tab).toUpperCase();
      if (/10Y|2Y|30Y|FED|FOMC/.test(name)) return "high";
      return "medium";
    }
    if (tab === "economic_releases") {
      const name = resolveDisplayName(ev, tab).toUpperCase();
      if (/CPI|GDP|NFP|UNEMPLOYMENT|RETAIL|FOMC|PPI/.test(name)) return "high";
      return "medium";
    }
    return "low";
  }

  // Sort
  const IMPORTANCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const sorted = [...events].sort((a, b) => {
    let va: string | number = "";
    let vb: string | number = "";
    if (sortCol === "date")       { va = a.date || ""; vb = b.date || ""; }
    if (sortCol === "symbol")     { va = a.symbol || ""; vb = b.symbol || ""; }
    if (sortCol === "event_type") { va = a.event_type || ""; vb = b.event_type || ""; }
    if (sortCol === "importance") {
      va = IMPORTANCE_RANK[a.importance || "low"] ?? 0;
      vb = IMPORTANCE_RANK[b.importance || "low"] ?? 0;
    }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIndicator = ({ col }: { col: string }) =>
    sortCol === col ? (
      <ChevronDown className={`w-3 h-3 ml-0.5 inline text-white/60 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />
    ) : (
      <ChevronDown className="w-3 h-3 ml-0.5 inline text-white/20" />
    );

  const isMacroTab = tabKey === "treasury_macro" || tabKey === "economic_releases";
  const isDividendsTab = tabKey === "dividends";

  const COLS = [
    { key: "date",       label: "Date",            sortable: true },
    ...(!isMacroTab ? [{ key: "symbol",  label: "Symbol",      sortable: true  }] : []),
    ...(!isDividendsTab ? [{ key: "company", label: isMacroTab ? "Event" : "Company / Event", sortable: false }] : []),
    { key: "event_type", label: "Event Type",       sortable: true },
    { key: "details",    label: "Key Details",      sortable: false },
    { key: "importance", label: "Importance",       sortable: true },
  ];

  return (
    <div>
      {/* ── Range toggles ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        {!hideRangeToggle && (
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[10px] font-semibold">
            {RANGE_OPTIONS.map(({ key, label }, i) => (
              <button
                key={key}
                onClick={() => setDateRange(key)}
                className="px-3 py-1.5 transition-all whitespace-nowrap"
                style={{
                  borderRight: i < RANGE_OPTIONS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                  ...(dateRange === key
                    ? { background: "rgba(59,130,246,0.18)", color: "#60a5fa" }
                    : { color: "rgba(255,255,255,0.4)" }),
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-white/40 border border-white/[0.08] hover:bg-white/5 hover:text-white/60 transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* ── Row count ─────────────────────────────────────────────── */}
      <p className="text-[10px] text-white/25 mb-2">
        {loading
          ? "Loading…"
          : `${sorted.length} event${sorted.length !== 1 ? "s" : ""}`}
      </p>

      {error && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/15 text-[11px] text-red-400/70">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 720 }}>
          <thead>
            <tr style={{ backgroundColor: "#111827" }} className="border-b border-white/10">
              {COLS.map(({ key, label, sortable }) => (
                <th
                  key={key}
                  onClick={sortable ? () => toggleSort(key) : undefined}
                  className={`text-left py-2.5 px-3 font-semibold whitespace-nowrap select-none ${sortable ? "cursor-pointer hover:text-white/70" : ""}`}
                  style={{ color: "#9ca3af" }}
                >
                  {label}
                  {sortable && <SortIndicator col={key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {COLS.map((_, j) => (
                    <td key={j} className="py-2.5 px-3">
                      <div
                        className="h-3 rounded bg-white/5 animate-pulse"
                        style={{ width: j === 2 || j === 4 ? "80%" : "50%" }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="py-10 text-center text-white/30 text-xs">
                  {tabKey === "ipos"
                    ? "No IPO catalysts found for this range."
                    : `No ${TAB_LABELS[tabKey] || "catalyst"} events found for this range.`}
                </td>
              </tr>
            )}

            {!loading &&
              sorted.map((ev, i) => {
                const displayName  = resolveDisplayName(ev, tabKey);
                const eventType    = resolveEventType(ev, tabKey);
                const keyDetails   = resolveKeyDetails(ev, tabKey);
                const importance   = resolveImportance(ev, tabKey);
                const isMacroRow   = !ev.symbol && ["economic_releases", "treasury_macro"].includes(tabKey);
                return (
                  <tr
                    key={ev.id || i}
                    onClick={() => setSelectedEvent(ev)}
                    className="border-b border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}
                  >
                    <td className="py-2.5 px-3 text-white/60 whitespace-nowrap">
                      {ev.date?.slice(0, 10) || "—"}
                    </td>
                    {!isMacroTab && (
                      <td className="py-2.5 px-3">
                        {tabKey === "earnings_dates" && ev.symbol ? (
                          <CompanyIdentity
                            symbol={ev.symbol as string}
                            companyName={
                              identityMap[(ev.symbol as string)?.toUpperCase()]?.name ||
                              (ev.companyName as string | undefined) ||
                              ((ev.raw as Record<string, unknown>)?.companyName as string | undefined) ||
                              ((ev.raw as Record<string, unknown>)?.company as string | undefined) ||
                              ((ev.raw as Record<string, unknown>)?.name as string | undefined) ||
                              undefined
                            }
                            logoUrl={
                              identityMap[(ev.symbol as string)?.toUpperCase()]?.logo ||
                              (ev.logo as string | undefined) ||
                              (ev.image as string | undefined) ||
                              ((ev.profile as Record<string, unknown>)?.image as string | undefined) ||
                              ((ev.profile as Record<string, unknown>)?.logo as string | undefined) ||
                              ((ev.raw as Record<string, unknown>)?.image as string | undefined) ||
                              ((ev.raw as Record<string, unknown>)?.logo as string | undefined) ||
                              undefined
                            }
                            size="sm"
                          />
                        ) : ev.symbol ? (
                          <span className="font-bold text-white/90">{ev.symbol as string}</span>
                        ) : isMacroRow ? (
                          <span className="text-white/30 italic text-[10px]">Macro</span>
                        ) : (
                          <span className="text-white/25 text-[10px]">—</span>
                        )}
                      </td>
                    )}
                    {!isDividendsTab && (
                      <td className="py-2.5 px-3 text-white/80 max-w-[220px] truncate font-medium">
                        {displayName}
                      </td>
                    )}
                    <td className="py-2.5 px-3">
                      <EventTypeBadge type={eventType} />
                    </td>
                    <td className="py-2.5 px-3 text-white/50 max-w-[260px] truncate">
                      {keyDetails}
                    </td>
                    <td className="py-2.5 px-3">
                      <ImportanceBadge importance={importance} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {selectedEvent && (
        <CatalystDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}


// ─── Catalyst Snapshot Tab — calendar UI for snapshot envelope ────
// Consumes /api/catalysts/events?tab=...&scope=...&search=... which
// returns { current_week, previous_week, last_updated, status } for
// the target non-earnings tabs (dividends, ipos, splits,
// economic_releases, treasury_macro). Renders Recent / Day / Week /
// Month views that mirror the Earnings tab UX. Recent uses the
// previous_week slice as a list view; Day/Week/Month use the
// current_week slice rendered as calendar layouts.

interface CatalystSnapshotEnvelope {
  current_week?: CatalystEvent[];
  previous_week?: CatalystEvent[];
  last_updated?: string | number | null;
  status?: "ready" | "stale" | "empty" | string;
  is_stale?: boolean;
  window?: { requested_from?: string; requested_to?: string };
  diagnostics?: Record<string, unknown>;
}

type SnapshotMode = "recent" | "day" | "week" | "month";

function CatalystSnapshotTab({
  tabKey,
  scope,
  search,
  identityMap = {},
  onFetchIdentity = () => {},
  rightSlot,
  defaultMode = "week",
}: {
  tabKey: string;
  scope: string;
  search: string;
  identityMap?: Record<string, IdentityData>;
  onFetchIdentity?: (tickers: string[]) => void;
  rightSlot?: React.ReactNode;
  defaultMode?: SnapshotMode;
}) {
  const [mode, setMode] = useState<SnapshotMode>(defaultMode);
  const [selectedEvent, setSelectedEvent] = useState<CatalystEvent | null>(null);

  // Snapshot fetch — long staleTime, no polling/refetch on window focus.
  // Re-keyed by tab/scope/search; stable for repeated tab clicks.
  // Include current week ID so stale-time cache is automatically busted at week boundaries
  const currentWeekId = dateKey(getMonday(new Date()));
  const queryKey = ["catalysts", "snapshot", tabKey, scope, search.trim(), currentWeekId] as const;
  const { data, isLoading, error } = useQuery<CatalystSnapshotEnvelope | CatalystEvent[]>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({ tab: tabKey, scope });
      if (search.trim()) params.set("search", search.trim());
      const r = await fetch(`/api/catalysts/events?${params}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  // Coerce envelope shape — tolerate raw arrays (legacy) or {events: [...]}
  const envelope: CatalystSnapshotEnvelope = (() => {
    if (!data) return {};
    if (Array.isArray(data)) {
      return { current_week: data, previous_week: [], status: "ready" };
    }
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.current_week) || Array.isArray(obj.previous_week)) {
      return obj as CatalystSnapshotEnvelope;
    }
    // Legacy shape { events: [...] }
    if (Array.isArray(obj.events)) {
      return { current_week: obj.events as CatalystEvent[], previous_week: [], status: "ready" };
    }
    return {};
  })();

  const currentWeek = envelope.current_week || [];
  const previousWeek = envelope.previous_week || [];
  const status = envelope.status || (currentWeek.length === 0 && previousWeek.length === 0 ? "empty" : "ready");
  const isStale = envelope.is_stale === true || status === "stale";
  const backendWindowFrom = envelope.window?.requested_from;

  // Recent → previous_week list view; Day/Week/Month use current_week.
  // If current_week is empty but previous_week has data (stale snapshot),
  // fall back to previous_week so the calendar still shows something.
  const useCurrentWeek = mode !== "recent";
  const rawEvents =
    useCurrentWeek
      ? (currentWeek.length === 0 && previousWeek.length > 0 ? previousWeek : currentWeek)
      : previousWeek;

  // Normalize once
  const normalized: CalendarEvent[] = rawEvents
    .map((ev, idx) => normalizeCatalystEvent(ev, tabKey, idx))
    .filter((ev): ev is CalendarEvent => !!ev);

  // Enrich identities for symbols seen in the snapshot
  useEffect(() => {
    if (rawEvents.length === 0) return;
    const syms = rawEvents
      .map((ev) => (ev.symbol || (ev as Record<string, unknown>).ticker || "") as string)
      .filter(Boolean);
    if (syms.length > 0) onFetchIdentity(syms);
  }, [rawEvents, onFetchIdentity]);

  const lastUpdatedLabel = (() => {
    if (!envelope.last_updated) return null;
    try {
      const d =
        typeof envelope.last_updated === "number"
          ? new Date(envelope.last_updated * (envelope.last_updated > 1e12 ? 1 : 1000))
          : new Date(envelope.last_updated);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString();
    } catch {
      return null;
    }
  })();

  const TAB_LABELS: Record<string, string> = {
    dividends: "Dividend",
    ipos: "IPO",
    splits: "Stock Split",
    economic_releases: "Economic Release",
    treasury_macro: "Treasury / Macro",
  };

  // Toggle styling mirrors Earnings tab: Recent=emerald, Day=amber,
  // Week=indigo, Month=purple. Single combined toggle replaces the
  // legacy slice + view toggles ("Current Week" is no longer exposed).
  const TOGGLE_BUTTONS: { key: SnapshotMode; label: string; activeStyle: React.CSSProperties }[] = [
    { key: "recent", label: "Recent", activeStyle: { background: "rgba(16,185,129,0.15)", color: "#34d399" } },
    { key: "day",    label: "Day",    activeStyle: { background: "rgba(245,158,11,0.18)", color: "#fbbf24" } },
    { key: "week",   label: "Week",   activeStyle: { background: "rgba(99,102,241,0.18)", color: "#a5b4fc" } },
    { key: "month",  label: "Month",  activeStyle: { background: "rgba(168,85,247,0.18)", color: "#c084fc" } },
  ];

  return (
    <div>
      {/* ── Mode toggle: Recent / Day / Week / Month ──────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[11px] font-semibold flex-shrink-0">
          {TOGGLE_BUTTONS.map((btn, i) => {
            const active = mode === btn.key;
            const baseStyle: React.CSSProperties = {
              borderRight: i < TOGGLE_BUTTONS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined,
            };
            const style: React.CSSProperties = active
              ? { ...baseStyle, ...btn.activeStyle }
              : { ...baseStyle, color: "rgba(255,255,255,0.4)" };
            return (
              <button
                key={btn.key}
                onClick={() => setMode(btn.key)}
                className="px-4 py-1.5 transition-all"
                style={style}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}

        <div className="ml-auto flex items-center gap-2 text-[10px] text-white/30 flex-shrink-0">
          {isLoading && (
            <span className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </span>
          )}
          {!isLoading && isStale && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" }}>
              Stale snapshot
            </span>
          )}
          {!isLoading && status === "empty" && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              No snapshot
            </span>
          )}
          {lastUpdatedLabel && (
            <span>Updated {lastUpdatedLabel}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/15 text-[11px] text-red-400/70">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Could not load {TAB_LABELS[tabKey] || "catalyst"} snapshot.
        </div>
      )}

      {/* ── View body ─────────────────────────────────────────────── */}
      {mode === "recent" && (
        <CatalystSnapshotRecentList
          events={normalized}
          loading={isLoading}
          tabKey={tabKey}
          tabLabel={TAB_LABELS[tabKey] || "catalyst"}
          onEventClick={(ev) => setSelectedEvent(ev.raw)}
        />
      )}

      {mode === "day" && (
        <CatalystSnapshotDayView
          events={normalized}
          loading={isLoading}
          tabKey={tabKey}
          tabLabel={TAB_LABELS[tabKey] || "catalyst"}
          onEventClick={(ev) => setSelectedEvent(ev.raw)}
        />
      )}

      {mode === "week" && (
        <CatalystSnapshotWeekBoard
          events={normalized}
          loading={isLoading}
          tabKey={tabKey}
          tabLabel={TAB_LABELS[tabKey] || "catalyst"}
          onEventClick={(ev) => setSelectedEvent(ev.raw)}
          windowFrom={backendWindowFrom}
        />
      )}

      {mode === "month" && (
        <CatalystSnapshotMonthView
          events={normalized}
          loading={isLoading}
          tabKey={tabKey}
          onEventClick={(ev) => setSelectedEvent(ev.raw)}
        />
      )}

      {selectedEvent && (
        <CatalystDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

// ─── Macro / Economic-tab card helpers ────────────────────────────
// Scoped ONLY to economic_releases and treasury_macro tab cards.
// Do NOT use these for IPOs, Dividends, Splits, or Earnings.

const MACRO_CARD_TABS = new Set(["economic_releases", "treasury_macro"]);

/** Strings that are type/category placeholders, not real event names */
const MACRO_INVALID_TITLE_SET = new Set([
  "macro", "m",
  "economic release", "economic_release", "economic releases", "economic_releases",
  "treasury / macro", "treasury/macro", "treasury_macro", "treasury macro",
  "event", "calendar event",
  "n/a", "na", "none", "-", "--", "—", "unknown",
]);

/**
 * Resolve the best human-readable card title for a macro / economic-release
 * event.  Falls through a priority chain and filters known-useless placeholders.
 * Priority (per spec):
 *   CalendarEvent.title → display_title → indicatorName → event_name →
 *   category → source → description → CalendarEvent.subtitle → "Unknown Event"
 */
function macroCardTitle(ev: CalendarEvent): string {
  const r = (ev.raw || {}) as Record<string, unknown>;
  const ok = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s && !MACRO_INVALID_TITLE_SET.has(s.toLowerCase()) ? s : null;
  };
  return (
    ok(ev.title) ||
    ok(r.display_title) ||
    ok(r.indicatorName) ||
    ok(r.indicator_name) ||
    ok(r.event_name) ||
    ok(r.eventName) ||
    ok(r.category) ||
    ok(r.source) ||
    ok(r.description) ||
    ok(ev.subtitle) ||
    "Unknown Event"
  );
}

// ─── Shared tier-based event card helpers ───────────────────────────
// These are used by the four catalyst snapshot views.

/** CSS class pairs for tier-based card styling. Applied to macro tabs only. */
function tierCardClasses(ev: CalendarEvent, isLead: boolean, macroTab = false): { outer: string; title: string } {
  const t = effectiveSignalTier(ev, macroTab);
  const p = TIER_PRESENTATION[t];
  const leadExtra = isLead && (t === "critical" || t === "major") ? " ring-1 ring-rose-500/20" : "";
  const muted = p.isMuted ? " opacity-60" : "";
  const border = p.cardBorder;
  const bg = p.cardBg;
  const extraLead = isLead && t === "critical" ? " border-l-2 border-l-rose-500" : isLead && t === "major" ? " border-l-2 border-l-orange-500" : "";
  return {
    outer: `border ${border} ${bg}${muted}${leadExtra}${extraLead}`,
    title: `${p.titleWeight} text-white/90`,
  };
}

/** Sort events by tier (critical first), stable within same tier. */
function sortByTier(events: CalendarEvent[], macroTab = false): CalendarEvent[] {
  return [...events].sort((a, b) => compareTier(a, b, macroTab));
}

/** Split events into visible and collapsed groups by tier.
 *  - critical, major: always visible.
 *  - secondary: visible (no collapse for this tier).
 *  - context: collapsed.
 */
function splitByTier(events: CalendarEvent[], macroTab = false): { visible: CalendarEvent[]; contextCount: number } {
  const visible: CalendarEvent[] = [];
  let contextCount = 0;
  for (const ev of sortByTier(events, macroTab)) {
    const t = effectiveSignalTier(ev, macroTab);
    if (t === "context") {
      contextCount++;
    } else {
      visible.push(ev);
    }
  }
  return { visible, contextCount };
}

/** For week views: show all critical/major + up to 2 secondary, collapse rest. */
function splitWeekDayEntries(events: CalendarEvent[], macroTab = false): { visible: CalendarEvent[]; hiddenCount: number } {
  const sorted = sortByTier(events, macroTab);
  const visible: CalendarEvent[] = [];
  let secondaryCount = 0;
  for (const ev of sorted) {
    const t = effectiveSignalTier(ev, macroTab);
    if (t === "critical" || t === "major") {
      visible.push(ev);
    } else if (t === "secondary" && secondaryCount < 2) {
      visible.push(ev);
      secondaryCount++;
    }
    // else context or overflow secondary = hidden
  }
  return { visible, hiddenCount: events.length - visible.length };
}

/** Render signal metadata row for macro cards */
function SignalMetaRow({ ev, tabKey }: { ev: CalendarEvent; tabKey: string }) {
  if (!MACRO_CARD_TABS.has(tabKey)) return null;
  const reason = ev.signal_reason;
  if (!reason) return null;
  return <p className="text-[9px] text-white/30 mt-0.5 truncate">{reason}</p>;
}

// ─── Snapshot Recent list — date-grouped list view ────────────────
// Mirrors the Earnings Recent list pattern (CatalystListTab) but
// reads events from the snapshot envelope (no new API calls).

function CatalystSnapshotRecentList({
  events,
  loading,
  tabKey,
  tabLabel,
  onEventClick,
}: {
  events: CalendarEvent[];
  loading: boolean;
  tabKey: string;
  tabLabel: string;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  if (loading && events.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
        <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
        <p className="text-sm text-white/25">No recent {tabLabel.toLowerCase()} events</p>
      </div>
    );
  }

  // Group by date (most-recent first) using the previous_week slice
  const dateGroups = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    if (!ev.date) continue;
    const list = dateGroups.get(ev.date) || [];
    dateGroups.set(ev.date, [...list, ev]);
  }
  const sortedDates = Array.from(dateGroups.keys()).sort().reverse();

  // Per-date context collapse state (local to each date group, not persisted)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const toggleDate = (dk: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(dk)) next.delete(dk);
      else next.add(dk);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      {sortedDates.map((dk) => {
        const [y, m, d] = dk.split("-").map((s) => parseInt(s, 10));
        const dt = (y && m && d) ? new Date(y, m - 1, d) : new Date();
        const entries = dateGroups.get(dk) || [];
        const isMacro = MACRO_CARD_TABS.has(tabKey);
        const { visible, contextCount } = isMacro ? splitByTier(entries, isMacro) : { visible: entries, contextCount: 0 };
        const isExpanded = expandedDates.has(dk);
        const showContext = isExpanded;
        return (
          <div key={dk}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
              {DAY_NAMES_FULL[dt.getDay()]}, {MONTH_NAMES_SHORT[dt.getMonth()]} {dt.getDate()}
              <span className="ml-2 text-white/15 normal-case font-normal tracking-normal">
                {entries.length} event{entries.length !== 1 ? "s" : ""}
              </span>
            </p>
            <div className="space-y-2">
              {visible.map((ev, i) => {
                const typeKey = (ev.eventType || "macro").toLowerCase().replace(/ /g, "_");
                const c = EVENT_TYPE_COLORS[typeKey] || EVENT_TYPE_COLORS.macro;
                const displayTitle = isMacro ? macroCardTitle(ev) : undefined;
                const letter = (ev.symbol || ev.title || "?").slice(0, 1).toUpperCase();
                const subtitleText = ev.subtitle && ev.subtitle !== displayTitle ? ev.subtitle : (isMacro ? "" : ev.subtitle);
                const isLead = i === 0 && isMacro;
                const tc = isMacro ? tierCardClasses(ev, isLead, isMacro) : { outer: "border border-white/[0.06]", title: "" };
                return (
                  <button
                    key={ev.id || `${dk}-${i}`}
                    onClick={() => onEventClick(ev)}
                    className={`w-full text-left rounded-xl p-3 hover:bg-white/[0.04] transition-all flex items-start gap-3 ${tc.outer}`}
                  >
                    {!isMacro && (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}
                      >
                        <span className="text-xs font-bold" style={{ color: c.text }}>{letter}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isMacro ? (
                          <span className={`text-xs ${tc.title} truncate`}>{displayTitle}</span>
                        ) : (
                          <>
                            {ev.symbol && (
                              <span className="text-xs font-bold text-white/90">{ev.symbol}</span>
                            )}
                            <span className="text-xs text-white/70 truncate">{ev.title}</span>
                            <EventTypeBadge type={ev.eventType} />
                          </>
                        )}
                        {isMacro && <SignalTierBadge event={ev} macroTab />}
                        {!isMacro && ev.importance && <ImportanceBadge importance={ev.importance} />}
                      </div>
                      {subtitleText && (
                        <p className="text-[10px] text-white/35 mt-0.5 truncate">{subtitleText}</p>
                      )}
                      {isMacro && <SignalMetaRow ev={ev} tabKey={tabKey} />}
                    </div>
                  </button>
                );
              })}
              {contextCount > 0 && !showContext && (
                <button
                  onClick={() => toggleDate(dk)}
                  className="w-full text-left rounded-xl border border-dashed border-white/[0.08] p-2.5 hover:bg-white/[0.03] transition-all text-[10px] text-white/35 hover:text-white/55"
                >
                  Show {contextCount} context event{contextCount !== 1 ? "s" : ""}
                </button>
              )}
              {contextCount > 0 && showContext && (
                <>
                  {entries.filter(ev => effectiveSignalTier(ev, isMacro) === "context").map((ev, i) => {
                    const typeKey = (ev.eventType || "macro").toLowerCase().replace(/ /g, "_");
                    const c = EVENT_TYPE_COLORS[typeKey] || EVENT_TYPE_COLORS.macro;
                    const displayTitle = isMacro ? macroCardTitle(ev) : undefined;
                    const letter = (ev.symbol || ev.title || "?").slice(0, 1).toUpperCase();
                    const subtitleText = ev.subtitle && ev.subtitle !== displayTitle ? ev.subtitle : (isMacro ? "" : ev.subtitle);
                    const tc = isMacro ? tierCardClasses(ev, false, isMacro) : { outer: "border border-white/[0.06]", title: "" };
                    return (
                      <button
                        key={ev.id || `${dk}-ctx-${i}`}
                        onClick={() => onEventClick(ev)}
                        className={`w-full text-left rounded-xl p-3 hover:bg-white/[0.04] transition-all flex items-start gap-3 ${tc.outer}`}
                      >
                        {!isMacro && (
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: c.bg, border: `1px solid ${c.border}` }}
                          >
                            <span className="text-xs font-bold" style={{ color: c.text }}>{letter}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isMacro ? (
                              <span className={`text-xs ${tc.title} truncate`}>{displayTitle}</span>
                            ) : (
                              <>
                                {ev.symbol && (
                                  <span className="text-xs font-bold text-white/90">{ev.symbol}</span>
                                )}
                                <span className="text-xs text-white/70 truncate">{ev.title}</span>
                                <EventTypeBadge type={ev.eventType} />
                              </>
                            )}
                            {isMacro && <SignalTierBadge event={ev} macroTab />}
                            {!isMacro && ev.importance && <ImportanceBadge importance={ev.importance} />}
                          </div>
                          {subtitleText && (
                            <p className="text-[10px] text-white/35 mt-0.5 truncate">{subtitleText}</p>
                          )}
                          {isMacro && <SignalMetaRow ev={ev} tabKey={tabKey} />}
                        </div>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => toggleDate(dk)}
                    className="w-full text-left rounded-xl border border-dashed border-white/[0.08] p-2 text-[10px] text-white/30 hover:text-white/50 transition-all"
                  >
                    Hide context events
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Week day column content (per-day tier splitting + expand) ──────
function WeekDayColumnContent({
  entries, dk, tabKey, tabLabel, onEventClick,
}: {
  entries: CalendarEvent[];
  dk: string;
  tabKey: string;
  tabLabel: string;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const isMacro = MACRO_CARD_TABS.has(tabKey);
  const [expanded, setExpanded] = useState(false);
  const { visible, hiddenCount } = isMacro ? splitWeekDayEntries(entries, isMacro) : { visible: entries, hiddenCount: 0 };
  const display = (isMacro && !expanded) ? visible : entries;

  return (
    <div className="space-y-1">
      {display.map((ev, i) => {
        const typeKey = (ev.eventType || "macro").toLowerCase().replace(/ /g, "_");
        const c = EVENT_TYPE_COLORS[typeKey] || EVENT_TYPE_COLORS.macro;
        const displayTitle = isMacro ? macroCardTitle(ev) : (ev.symbol || ev.title);
        const displaySubtitle = isMacro
          ? (ev.subtitle && ev.subtitle !== displayTitle ? ev.subtitle : "")
          : (ev.symbol && ev.title !== ev.symbol ? ev.title : (ev.subtitle || tabLabel));
        const letter = (ev.symbol || ev.title || "?").slice(0, 1).toUpperCase();
        const isLead = i === 0 && isMacro;
        const tc = isMacro ? tierCardClasses(ev, isLead, isMacro) : { outer: "", title: "" };
        return (
          <button
            key={ev.id || `${dk}-${i}`}
            onClick={() => onEventClick(ev)}
            className={`w-full text-left rounded-lg border bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group p-2 flex items-center gap-2 ${tc.outer || "border-white/[0.05]"}`}
          >
            {!isMacro && (
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                <span className="text-[9px] font-bold" style={{ color: c.text }}>{letter}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <p className={`text-[10px] ${tc.title || "font-semibold text-white/90"} truncate leading-tight group-hover:text-white`}>
                  {displayTitle}
                </p>
                {isMacro && <SignalTierBadge event={ev} macroTab />}
              </div>
              {displaySubtitle && (
                <p className="text-[8px] text-white/35 truncate mt-0.5 leading-tight">
                  {displaySubtitle}
                </p>
              )}
              {isMacro && <SignalMetaRow ev={ev} tabKey={tabKey} />}
            </div>
            <span className="text-white/20 group-hover:text-white/55 transition-colors text-xs flex-shrink-0 leading-none">+</span>
          </button>
        );
      })}
      {isMacro && hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-left rounded-lg border border-dashed border-white/[0.08] p-1.5 hover:bg-white/[0.03] transition-all text-[9px] text-white/30 hover:text-white/50"
        >
          {hiddenCount} additional event{hiddenCount !== 1 ? "s" : ""}
        </button>
      )}
      {isMacro && hiddenCount > 0 && expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full text-left rounded-lg border border-dashed border-white/[0.08] p-1.5 text-[9px] text-white/30 hover:text-white/50 transition-all"
        >
          Show fewer
        </button>
      )}
    </div>
  );
}

// ─── Snapshot Week Board — Mon-Fri grid mirroring Earnings ────────
// Layout parity with WeeklyEarningsBoard: 5-column grid for the
// active snapshot week. No logos / percent-move enrichment — the
// snapshot data only carries symbol + title + event metadata.

function CatalystSnapshotWeekBoard({
  events,
  loading,
  tabKey,
  tabLabel,
  onEventClick,
  windowFrom,
}: {
  events: CalendarEvent[];
  loading: boolean;
  tabKey: string;
  tabLabel: string;
  onEventClick: (ev: CalendarEvent) => void;
  windowFrom?: string;
}) {
  const dateMap = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    if (!ev.date) continue;
    const list = dateMap.get(ev.date) || [];
    dateMap.set(ev.date, [...list, ev]);
  }

  const anchorMonday = (() => {
    // Prefer the backend-provided requested_from window over the event-based heuristic.
    // This prevents the view from drifting to "last week" when the snapshot carries
    // stale events from the prior week.
    if (windowFrom) {
      try {
        const [y, m, d] = windowFrom.slice(0, 10).split("-").map((s) => parseInt(s, 10));
        if (y && m && d) return getMonday(new Date(y, m - 1, d));
      } catch { /* fall through to heuristic */ }
    }
    if (dateMap.size === 0) return getMonday(new Date());
    const counts = new Map<string, number>();
    Array.from(dateMap.entries()).forEach(([k, list]) => {
      const [y, m, d] = k.split("-").map((s) => parseInt(s, 10));
      if (!y || !m || !d) return;
      const monday = getMonday(new Date(y, m - 1, d));
      const mk = dateKey(monday);
      counts.set(mk, (counts.get(mk) || 0) + list.length);
    });
    if (counts.size === 0) return getMonday(new Date());
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
    const [y, m, d] = top.split("-").map((s) => parseInt(s, 10));
    return new Date(y, m - 1, d);
  })();

  const todayKey = dateKey(new Date());
  const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {WEEKDAYS.map((day) => (
          <div key={day} className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-3">
            <Skeleton className="h-4 w-16 mb-1 rounded" />
            <Skeleton className="h-3 w-10 mb-3 rounded" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full mb-1.5 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {WEEKDAYS.map((weekday, idx) => {
        const dayDate = addDays(anchorMonday, idx);
        const dk = dateKey(dayDate);
        const entries = dateMap.get(dk) || [];
        const isToday = dk === todayKey;

        return (
          <div
            key={weekday}
            className={`rounded-xl border p-3 ${isToday ? "border-blue-500/20 bg-blue-500/[0.02]" : "border-white/[0.06] bg-white/[0.01]"}`}
          >
            {/* Day header */}
            <div className="mb-2.5">
              <p className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-blue-400" : "text-white/50"}`}>
                {weekday.slice(0, 3)}
              </p>
              <p className={`text-[9px] ${isToday ? "text-blue-400/70" : "text-white/25"}`}>
                {MONTH_NAMES_SHORT[dayDate.getMonth()]} {dayDate.getDate()}
              </p>
              {entries.length > 0 && (
                <p className="text-[8px] text-white/20 mt-0.5">
                  {entries.length} event{entries.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Content */}
            {entries.length === 0 ? (
              <p className="text-[9px] text-white/15">—</p>
            ) : (
              <WeekDayColumnContent
                entries={entries}
                dk={dk}
                tabKey={tabKey}
                tabLabel={tabLabel}
                onEventClick={onEventClick}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Snapshot Day View — single-day list from snapshot ────────────

function CatalystSnapshotDayView({
  events,
  loading,
  tabKey,
  tabLabel,
  onEventClick,
}: {
  events: CalendarEvent[];
  loading: boolean;
  tabKey: string;
  tabLabel: string;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const [weekStart, setWeekStart] = useState<Date>(() => getSunday(new Date()));
  const [selectedKey, setSelectedKey] = useState<string>(() => dateKey(new Date()));
  const [showCtx, setShowCtx] = useState(false);

  const dateMap = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    if (!ev.date) continue;
    const list = dateMap.get(ev.date) || [];
    dateMap.set(ev.date, [...list, ev]);
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekMonth = MONTH_NAMES[weekStart.getMonth()];
  const weekYear = weekStart.getFullYear();
  const totalThisWeek = weekDays.reduce((sum, d) => sum + (dateMap.get(dateKey(d))?.length || 0), 0);

  const prevWeek = () => {
    const s = addDays(weekStart, -7);
    setWeekStart(s);
    setSelectedKey(dateKey(s));
  };
  const nextWeek = () => {
    const s = addDays(weekStart, 7);
    setWeekStart(s);
    setSelectedKey(dateKey(s));
  };
  const goToday = () => {
    setWeekStart(getSunday(new Date()));
    setSelectedKey(dateKey(new Date()));
  };

  const entries = dateMap.get(selectedKey) || [];
  const selectedDate = weekDays.find((d) => dateKey(d) === selectedKey) || (() => {
    const [y, m, d] = selectedKey.split("-").map((s) => parseInt(s, 10));
    return y && m && d ? new Date(y, m - 1, d) : new Date();
  })();

  return (
    <div>
      {/* Calendar navigation — matches EarningsCalendarWidget header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] text-white/40">
          {weekMonth} {weekYear} &middot; {totalThisWeek} {(tabLabel || "catalyst").toLowerCase()} event{totalThisWeek !== 1 ? "s" : ""} this week
          {loading && <Loader2 className="w-2.5 h-2.5 animate-spin inline ml-1.5 text-blue-400/50" />}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white/50 border border-white/[0.08] hover:bg-white/5 hover:text-white/70 transition-all mr-1"
          >
            Today
          </button>
          <button onClick={prevWeek} className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4 text-white/50" />
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg border border-white/[0.08] hover:bg-white/5 transition-all">
            <ChevronRight className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>

      {/* Week day selector grid — 7 columns, matches EarningsCalendarWidget exactly */}
      <div className="grid grid-cols-7 gap-1.5 mb-5">
        {weekDays.map((day, i) => {
          const key = dateKey(day);
          const dayEntries = dateMap.get(key) || [];
          const isToday = dateKey(new Date()) === key;
          const isSelected = selectedKey === key;
          const count = dayEntries.length;
          return (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`rounded-xl p-2.5 text-center transition-all border ${
                isSelected
                  ? "bg-blue-500/10 border-blue-500/30 ring-1 ring-blue-500/20"
                  : isToday
                  ? "bg-white/[0.03] border-blue-500/15 hover:bg-white/[0.05]"
                  : "bg-white/[0.015] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08]"
              }`}
            >
              <p className={`text-[10px] font-semibold mb-0.5 ${isSelected ? "text-blue-400" : "text-white/40"}`}>
                {DAY_NAMES_FULL[i]}
              </p>
              <p className={`text-xs font-bold ${isSelected ? "text-white" : isToday ? "text-blue-400" : "text-white/70"}`}>
                {MONTH_NAMES_SHORT[day.getMonth()]} {day.getDate()}
              </p>
              <p className={`text-[9px] mt-1 ${count > 0 ? (isSelected ? "text-blue-400/70" : "text-white/40") : "text-white/20"}`}>
                {count > 0 ? `${count} Event${count > 1 ? "s" : ""}` : "No Events"}
              </p>
              {count > 0 && (
                <div className="flex justify-center gap-0.5 mt-1.5">
                  {dayEntries.slice(0, 4).map((e, ei) => {
                    const typeKey = (e.eventType || "macro").toLowerCase().replace(/ /g, "_");
                    const c = EVENT_TYPE_COLORS[typeKey] || EVENT_TYPE_COLORS.macro;
                    const letter = (e.symbol || e.title || "?").slice(0, 1).toUpperCase();
                    return (
                      <div
                        key={e.id || ei}
                        className="w-4 h-4 rounded-sm flex items-center justify-center overflow-hidden"
                        style={{ background: c.bg, border: `1px solid ${c.border}` }}
                      >
                        <span className="text-[6px] font-bold" style={{ color: c.text }}>{letter}</span>
                      </div>
                    );
                  })}
                  {count > 4 && (
                    <div className="w-4 h-4 rounded-sm bg-white/[0.06] flex items-center justify-center">
                      <span className="text-[6px] font-bold text-white/40">+{count - 4}</span>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day header */}
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-bold text-white/90">
          {DAY_NAMES_FULL[selectedDate.getDay()]}, {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getDate()}
        </h4>
        <span className="text-[10px] text-white/30">
          {entries.length} event{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && entries.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse border border-white/[0.04]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
          <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
          <p className="text-sm text-white/25">No events on this day</p>
          <p className="text-[10px] text-white/15 mt-1">Pick another day above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(() => {
            const isMacro = MACRO_CARD_TABS.has(tabKey);
            const { visible, contextCount } = isMacro ? splitByTier(entries, isMacro) : { visible: entries, contextCount: 0 };
            const displayEntries = isMacro && !showCtx ? visible : entries;
            return (
              <>
                {displayEntries.map((ev, i) => {
                  const typeKey = (ev.eventType || "macro").toLowerCase().replace(/ /g, "_");
                  const c = EVENT_TYPE_COLORS[typeKey] || EVENT_TYPE_COLORS.macro;
                  const displayTitle = isMacro ? macroCardTitle(ev) : undefined;
                  const letter = (ev.symbol || ev.title || "?").slice(0, 1).toUpperCase();
                  const subtitleText = ev.subtitle && ev.subtitle !== displayTitle ? ev.subtitle : (isMacro ? "" : ev.subtitle);
                  const isLead = i === 0 && isMacro;
                  const tc = isMacro ? tierCardClasses(ev, isLead, isMacro) : { outer: "border border-white/[0.06]", title: "" };
                  return (
                    <button
                      key={ev.id || i}
                      onClick={() => onEventClick(ev)}
                      className={`w-full text-left rounded-xl p-3 hover:bg-white/[0.04] transition-all flex items-start gap-3 ${tc.outer}`}
                    >
                      {!isMacro && (
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: c.bg, border: `1px solid ${c.border}` }}
                        >
                          <span className="text-xs font-bold" style={{ color: c.text }}>{letter}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isMacro ? (
                            <span className={`text-xs ${tc.title} truncate`}>{displayTitle}</span>
                          ) : (
                            <>
                              {ev.symbol && (
                                <span className="text-xs font-bold text-white/90">{ev.symbol}</span>
                              )}
                              <span className="text-xs text-white/70 truncate">{ev.title}</span>
                              <EventTypeBadge type={ev.eventType} />
                            </>
                          )}
                          {isMacro && <SignalTierBadge event={ev} macroTab />}
                          {!isMacro && ev.importance && <ImportanceBadge importance={ev.importance} />}
                        </div>
                        {subtitleText && (
                          <p className="text-[10px] text-white/35 mt-0.5 truncate">{subtitleText}</p>
                        )}
                        {isMacro && <SignalMetaRow ev={ev} tabKey={tabKey} />}
                      </div>
                    </button>
                  );
                })}
                {isMacro && contextCount > 0 && !showCtx && (
                  <button
                    onClick={() => setShowCtx(true)}
                    className="w-full text-left rounded-xl border border-dashed border-white/[0.08] p-2.5 hover:bg-white/[0.03] transition-all text-[10px] text-white/35 hover:text-white/55"
                  >
                    Show {contextCount} context event{contextCount !== 1 ? "s" : ""}
                  </button>
                )}
                {isMacro && contextCount > 0 && showCtx && (
                  <button
                    onClick={() => setShowCtx(false)}
                    className="w-full text-left rounded-xl border border-dashed border-white/[0.08] p-2 text-[10px] text-white/30 hover:text-white/50 transition-all"
                  >
                    Hide context events
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ─── Snapshot Month View — Mon-Fri grid, parity with Earnings ─────
// Layout mirrors MonthCuratedGrid: weekends are skipped, days render
// as 5 across (Mon-Fri). No logos/percent moves — snapshot data only
// carries lightweight event metadata.

function CatalystSnapshotMonthView({
  events,
  loading,
  tabKey,
  onEventClick,
}: {
  events: CalendarEvent[];
  loading: boolean;
  tabKey: string;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  // Anchor: month containing the most events in the snapshot, fallback to today
  const monthKeyOf = (k: string) => k.slice(0, 7);
  const monthCounts = new Map<string, number>();
  for (const ev of events) {
    if (!ev.date) continue;
    const mk = monthKeyOf(ev.date);
    monthCounts.set(mk, (monthCounts.get(mk) || 0) + 1);
  }
  const defaultMonth = (() => {
    if (monthCounts.size === 0) {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    return Array.from(monthCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  })();
  const [anchor, setAnchor] = useState<string>(defaultMonth);

  const [year, monthNum] = anchor.split("-").map((s) => parseInt(s, 10));
  const month = monthNum || 1;
  const monthIdx = month - 1;
  const safeYear = year || new Date().getFullYear();
  const firstDay = new Date(safeYear, monthIdx, 1);
  const firstDayMonBased = (firstDay.getDay() + 6) % 7; // Mon=0…Fri=4, Sat=5, Sun=6
  const daysInMonth = new Date(safeYear, monthIdx + 1, 0).getDate();

  const dateMap = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    if (!ev.date) continue;
    if (monthKeyOf(ev.date) !== anchor) continue;
    const list = dateMap.get(ev.date) || [];
    dateMap.set(ev.date, [...list, ev]);
  }

  const totalThisMonth = Array.from(dateMap.values()).reduce((s, a) => s + a.length, 0);

  // Build Mon-Fri cells, skipping weekends (matches MonthCuratedGrid)
  const cells: (string | null)[] = [];
  const leadOffset = firstDayMonBased < 5 ? firstDayMonBased : 0;
  for (let i = 0; i < leadOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(safeYear, monthIdx, d).getDay();
    if (dow === 0 || dow === 6) continue;
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${safeYear}-${mm}-${dd}`);
  }
  while (cells.length % 5 !== 0) cells.push(null);

  const navigateMonth = (delta: -1 | 0 | 1) => {
    if (delta === 0) {
      setAnchor(defaultMonth);
      return;
    }
    const d = new Date(safeYear, monthIdx + delta, 1);
    setAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-bold text-white">
            {MONTH_NAMES[monthIdx]} {safeYear}
          </p>
          <p className="text-[10px] text-white/30">
            {totalThisMonth} event{totalThisMonth !== 1 ? "s" : ""} in snapshot for this month
            {loading && <span className="ml-1.5 text-blue-400/50"><Loader2 className="w-2.5 h-2.5 animate-spin inline" /></span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-white/35 hover:text-white/65"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => navigateMonth(0)}
            className="px-2 py-0.5 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-[10px] font-semibold text-white/35 hover:text-white/65"
          >
            {MONTH_NAMES[monthIdx]}
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-white/35 hover:text-white/65"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          {safeYear !== new Date().getFullYear() && (
            <span className="text-[11px] text-white/35 ml-1">{safeYear}</span>
          )}
        </div>
      </div>

      {/* Weekday header — Mon through Fri only */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
          <div key={d} className="text-center text-[9px] font-bold uppercase text-white/20 py-1">{d}</div>
        ))}
      </div>

      {/* Month grid (5 columns, weekends skipped) */}
      <div className="grid grid-cols-5 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) {
            return <div key={`empty-${i}`} className="rounded-xl h-[118px]" />;
          }
          const dayNum = parseInt(dateStr.split("-")[2], 10);
          const entries = dateMap.get(dateStr) || [];
          const count = entries.length;
          const todayStr = dateKey(new Date());
          const isToday = dateStr === todayStr;
          const isMacro = MACRO_CARD_TABS.has(tabKey);
          const sortedForDisplay = isMacro ? sortByTier(entries, isMacro) : entries;
          const top = sortedForDisplay.slice(0, 3);
          const extra = count - top.length;
          return (
            <div
              key={dateStr}
              className={`rounded-xl border transition-all flex flex-col h-[118px] ${
                count > 0 ? "cursor-default" : "opacity-40 cursor-default"
              } ${isToday ? "border-purple-500/30 bg-purple-500/[0.05]" : "border-white/[0.06] bg-white/[0.015]"}`}
            >
              {/* Day number + count */}
              <div className="flex items-start justify-between px-2 pt-1.5 pb-0 flex-shrink-0">
                <p className={`text-[11px] font-bold leading-none ${isToday ? "text-purple-400" : "text-white/45"}`}>{dayNum}</p>
                {count > 0 && (
                  <p className="text-[9px] text-white/25 leading-none font-medium">{count}</p>
                )}
              </div>

              {count > 0 && (
                <div className="flex-1 flex flex-col items-stretch justify-start gap-0.5 px-1.5 pb-1.5 pt-1 overflow-hidden">
                  {top.map((ev, idx) => {
                    const typeKey = (ev.eventType || "macro").toLowerCase().replace(/ /g, "_");
                    const c = EVENT_TYPE_COLORS[typeKey] || EVENT_TYPE_COLORS.macro;
                    const chipLabel = isMacro ? macroCardTitle(ev) : (ev.symbol || ev.title);
                    const tp = isMacro ? effectiveSignalTier(ev, isMacro) : null;
                    const chipBorder = tp === "critical" ? "border-rose-500/40" : tp === "major" ? "border-orange-500/30" : c.border;
                    return (
                      <button
                        key={ev.id || `${dateStr}-${idx}`}
                        onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                        className={`w-full text-left rounded px-1 py-0.5 truncate text-[9px] hover:opacity-80 transition-opacity ${tp === "context" ? "opacity-50" : ""}`}
                        style={{ background: c.bg, color: c.text, border: `1px solid ${chipBorder}` }}
                        title={chipLabel}
                      >
                        {chipLabel}
                      </button>
                    );
                  })}
                  {extra > 0 && (
                    <p className="text-[8px] text-white/30 px-1">+{extra} more</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Week All List ────────────────────────────────────────────────

function WeekAllList({
  weekData,
  weekLoading,
  identityMap,
  scope,
}: {
  weekData: WeekAllResponse | null;
  weekLoading: boolean;
  identityMap: Record<string, IdentityData>;
  scope?: string;
}) {
  const [modalEntry, setModalEntry] = useState<EarningsEntry | null>(null);

  if (weekLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-5 h-5 text-indigo-400/40 mx-auto mb-2 animate-spin" />
        <p className="text-[11px] text-white/25">Loading all earnings...</p>
      </div>
    );
  }

  const resolveEntries = (day: WeekAllDay): WeekAllEntry[] =>
    day.entries || day.stocks || day.events || [];

  if (!weekData || (weekData.days || []).every(d => resolveEntries(d).length === 0)) {
    return (
      <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
        <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
        <p className="text-sm text-white/25">
          {scope === "watchlist"
            ? "No upcoming earnings found for your watchlist."
            : scope === "portfolio"
            ? "No upcoming earnings found for your portfolio."
            : "No earnings data for this week"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {(weekData.days || []).map(day => {
          const dayEntries = resolveEntries(day);
          if (dayEntries.length === 0) return null;
          return (
            <div key={day.date}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30 mb-2">
                {day.weekday || day.label || day.date}
                <span className="ml-2 text-white/15 normal-case font-normal tracking-normal">{day.count ?? dayEntries.length} calls</span>
              </p>
              <div className="rounded-xl border border-white/[0.05] overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/[0.05]" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <th className="text-left px-3 py-2 text-white/25 font-semibold">Company</th>
                      <th className="text-left px-3 py-2 text-white/25 font-semibold hidden sm:table-cell">EPS Est</th>
                      <th className="text-left px-3 py-2 text-white/25 font-semibold hidden md:table-cell">Rev Est</th>
                      <th className="text-left px-3 py-2 text-white/25 font-semibold hidden sm:table-cell">Time</th>
                      <th className="text-left px-3 py-2 text-white/25 font-semibold hidden md:table-cell">Period</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayEntries.map((e, idx) => {
                      const ticker = (e.symbol || "").toUpperCase();
                      const name = e.companyName || ticker;
                      const logo = identityMap[ticker]?.logo || null;
                      const epsEst = e.epsEstimated != null ? `$${Number(e.epsEstimated).toFixed(2)}` : "—";
                      const revEst = e.revenueEstimated != null ? formatRevenue(Number(e.revenueEstimated)) : "—";
                      const rawTime = e.time || "";
                      const timeStr = rawTime === "bmo" ? "Pre-Market" : rawTime === "amc" ? "After Hours" : rawTime || "—";
                      const modalE: EarningsEntry = {
                        market: null, ticker, company: name, companyName: name,
                        logo: (logo || undefined) as string | undefined,
                        eps: epsEst === "—" ? null : epsEst, quarter: e.period || null, time: timeStr === "—" ? null : timeStr,
                        exchange: null, beatPct: -1, revenueEstimate: revEst === "—" ? null : revEst, source: "fmp", earningsDate: e.date || day.date,
                      };
                      return (
                        <tr
                          key={`${ticker}-${idx}`}
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer transition-colors group"
                          onClick={() => setModalEntry(modalE)}
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden text-[7px] font-bold text-white ${logo ? "bg-white/[0.05]" : `bg-gradient-to-br ${tickerColor(ticker)}`}`}>
                                {logo ? <img src={logo} alt={ticker} className="w-full h-full object-contain p-0.5" onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }} /> : ticker.slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-white/80 font-semibold group-hover:text-white transition-colors truncate max-w-[140px]">{name}</p>
                                <p className="text-white/30 text-[10px] font-mono">{ticker}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-white/40 hidden sm:table-cell">{epsEst}</td>
                          <td className="px-3 py-2 text-white/40 hidden md:table-cell">{revEst}</td>
                          <td className="px-3 py-2 text-white/40 hidden sm:table-cell">{timeStr}</td>
                          <td className="px-3 py-2 text-white/40 hidden md:table-cell">{e.period || "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-[10px] text-blue-400/40 group-hover:text-blue-400 transition-colors">View</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      {modalEntry && <EarningsModal entry={modalEntry} onClose={() => setModalEntry(null)} />}
    </>
  );
}

// ─── Month All Grid ───────────────────────────────────────────────

function MonthAllGrid({
  data,
  loading,
  year,
  month,
  identityMap,
  onNavigateMonth,
  onSelectDate,
  scope,
}: {
  data: MonthAllResponse | null;
  loading: boolean;
  year: number;
  month: number;
  identityMap: Record<string, IdentityData>;
  onNavigateMonth: (delta: number) => void;
  onSelectDate: (dateStr: string) => void;
  scope?: string;
}) {
  const [modalEntry, setModalEntry] = useState<EarningsEntry | null>(null);

  const firstDay = new Date(year, month - 1, 1);
  const firstDayMonBased = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const dayMap = new Map<string, MonthAllDay>();
  for (const d of (data?.days || [])) {
    const parts = d.date.split("-");
    const normalizedKey = parts.length === 3
      ? `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`
      : d.date;
    dayMap.set(normalizedKey, d);
  }

  const cells: (string | null)[] = [];
  const leadOffset = firstDayMonBased < 5 ? firstDayMonBased : 0;
  for (let i = 0; i < leadOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0 || dow === 6) continue;
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${mm}-${dd}`);
  }
  while (cells.length % 5 !== 0) cells.push(null);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-5 h-5 text-indigo-400/40 mx-auto mb-2 animate-spin" />
        <p className="text-[11px] text-white/25">Loading all earnings for month...</p>
      </div>
    );
  }

  const totalMonthAllCount = (data?.days || []).reduce((s: number, d: any) => s + (d.count ?? 0), 0);
  if (data && totalMonthAllCount === 0 && scope && scope !== "all") {
    return (
      <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
        <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
        <p className="text-sm text-white/25">
          {scope === "watchlist"
            ? "No upcoming earnings found for your watchlist."
            : "No upcoming earnings found for your portfolio."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-5 gap-1 mb-1">
        {["Mon","Tue","Wed","Thu","Fri"].map(d => (
          <div key={d} className="text-center text-[9px] font-bold uppercase text-white/20 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} className="rounded-xl aspect-square" />;
          const dayNum = parseInt(dateStr.split("-")[2]);
          const dayData = dayMap.get(dateStr);
          const entries = (dayData?.entries || []).slice(0, 3);
          const count = dayData ? Math.max(dayData.count ?? 0, (dayData.entries || []).length) : 0;
          const extra = count - entries.length;
          const todayStr = dateKey(new Date());
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className={`rounded-xl border transition-all flex flex-col aspect-square ${
                count > 0 ? "cursor-pointer hover:border-indigo-500/35 hover:bg-indigo-500/[0.05]" : "opacity-40 cursor-default"
              } ${isToday ? "border-indigo-500/30 bg-indigo-500/[0.05]" : "border-white/[0.06] bg-white/[0.015]"}`}
              onClick={() => count > 0 && onSelectDate(dateStr)}
            >
              <div className="flex items-start justify-between px-2 pt-2 pb-0.5 flex-shrink-0">
                <p className={`text-[11px] font-bold leading-none ${isToday ? "text-indigo-400" : "text-white/45"}`}>{dayNum}</p>
                {count > 0 && (
                  <p className="text-[9px] text-white/25 leading-none font-medium">{count}</p>
                )}
              </div>
              {count > 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-1 px-1 pb-2">
                  {entries.length > 0 ? (
                    <>
                      <div className="flex items-end justify-center gap-2">
                        {entries.map((e, idx) => {
                          const ticker = (e.symbol || "").toUpperCase();
                          const logo = identityMap[ticker]?.logo || null;
                          const modalE: EarningsEntry = {
                            market: null, ticker, company: e.companyName || ticker, companyName: e.companyName || ticker,
                            logo: (logo || undefined) as string | undefined,
                            eps: e.epsEstimated != null ? `$${Number(e.epsEstimated).toFixed(2)}` : null,
                            quarter: e.period || null,
                            time: e.time === "bmo" ? "Pre-Market" : e.time === "amc" ? "After Hours" : e.time || null,
                            exchange: null, beatPct: -1,
                            revenueEstimate: e.revenueEstimated != null ? formatRevenue(Number(e.revenueEstimated)) : null,
                            source: "fmp", earningsDate: dateStr,
                          };
                          return (
                            <button
                              key={`${ticker}-${idx}`}
                              className="flex flex-col items-center gap-1 group focus:outline-none"
                              onClick={ev => { ev.stopPropagation(); setModalEntry(modalE); }}
                            >
                              <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-[10px] font-bold text-white ring-1 ring-white/10 group-hover:ring-indigo-400/40 transition-all ${logo ? "bg-white/[0.07]" : `bg-gradient-to-br ${tickerColor(ticker)}`}`}>
                                {logo ? <img src={logo} alt={ticker} className="w-full h-full object-contain p-1" onError={ev => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }} /> : ticker.slice(0, 2)}
                              </div>
                              <p className="text-[8px] text-white/40 font-mono leading-none">{ticker}</p>
                            </button>
                          );
                        })}
                      </div>
                      {extra > 0 && (
                        <p className="text-[8px] text-white/25 mt-0.5">+{extra} more</p>
                      )}
                    </>
                  ) : (
                    <p className="text-[9px] text-white/30">{count} calls</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {modalEntry && <EarningsModal entry={modalEntry} onClose={() => setModalEntry(null)} />}
    </>
  );
}

// ─── Month Curated Grid ───────────────────────────────────────────

function MonthCuratedGrid({
  data,
  loading,
  year,
  month,
  identityMap,
  onNavigateMonth,
  onSelectDate,
  scope,
}: {
  data: MonthCuratedResponse | null;
  loading: boolean;
  year: number;
  month: number;
  identityMap: Record<string, IdentityData>;
  onNavigateMonth: (delta: number) => void;
  onSelectDate: (dateStr: string) => void;
  scope?: string;
}) {
  const [modalEntry, setModalEntry] = useState<EarningsEntry | null>(null);

  const firstDay = new Date(year, month - 1, 1);
  const firstDayMonBased = (firstDay.getDay() + 6) % 7; // Mon=0…Fri=4, Sat=5, Sun=6
  const daysInMonth = new Date(year, month, 0).getDate();

  // Normalize date keys to YYYY-MM-DD (backend may return YYYY-M-D or YYYY-MM-DD)
  const dayMap = new Map<string, MonthCuratedDay>();
  for (const d of (data?.days || [])) {
    const parts = d.date.split("-");
    const normalizedKey = parts.length === 3
      ? `${parts[0]}-${parts[1].padStart(2,"0")}-${parts[2].padStart(2,"0")}`
      : d.date;
    dayMap.set(normalizedKey, d);
  }
  if (process.env.NODE_ENV !== "production") {
    console.log("[Month Curated normalized dates]", [...dayMap.keys()].slice(0, 5));
  }

  const cells: (string | null)[] = [];
  // Leading blank Mon-based offset (only for weekdays Mon–Fri)
  const leadOffset = firstDayMonBased < 5 ? firstDayMonBased : 0;
  for (let i = 0; i < leadOffset; i++) cells.push(null);
  // All month days, weekends skipped entirely
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow === 0 || dow === 6) continue;
    const mm = String(month).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push(`${year}-${mm}-${dd}`);
  }
  while (cells.length % 5 !== 0) cells.push(null);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-5 h-5 text-purple-400/40 mx-auto mb-2 animate-spin" />
        <p className="text-[11px] text-white/25">Loading curated month...</p>
      </div>
    );
  }

  const totalMonthCuratedCount = (data?.days || []).reduce((s: number, d: any) => s + (d.count ?? 0), 0);
  if (data && totalMonthCuratedCount === 0 && scope && scope !== "all") {
    return (
      <div className="text-center py-10 border border-white/[0.04] rounded-xl bg-white/[0.01]">
        <Calendar className="w-6 h-6 text-white/10 mx-auto mb-2" />
        <p className="text-sm text-white/25">
          {scope === "watchlist"
            ? "No upcoming earnings found for your watchlist."
            : "No upcoming earnings found for your portfolio."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Day-of-week header — Mon through Fri only */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        {["Mon","Tue","Wed","Thu","Fri"].map(d => (
          <div key={d} className="text-center text-[9px] font-bold uppercase text-white/20 py-1">{d}</div>
        ))}
      </div>
      {/* Calendar grid */}
      <div className="grid grid-cols-5 gap-1">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`empty-${i}`} className="rounded-xl h-[118px]" />;
          const dayNum = parseInt(dateStr.split("-")[2]);
          const dayData = dayMap.get(dateStr);
          const topEvents = (dayData?.topEvents || []).slice(0, 3);
          const count = dayData ? Math.max(dayData.count ?? 0, (dayData.topEvents || []).length) : 0;
          const extra = count - topEvents.length;
          const todayStr = dateKey(new Date());
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className={`rounded-xl border transition-all flex flex-col h-[118px] ${
                count > 0 ? "cursor-pointer hover:border-purple-500/35 hover:bg-purple-500/[0.05]" : "opacity-40 cursor-default"
              } ${isToday ? "border-purple-500/30 bg-purple-500/[0.05]" : "border-white/[0.06] bg-white/[0.015]"}`}
              onClick={() => count > 0 && onSelectDate(dateStr)}
            >
              {/* Day number + count */}
              <div className="flex items-start justify-between px-2 pt-1.5 pb-0 flex-shrink-0">
                <p className={`text-[11px] font-bold leading-none ${isToday ? "text-purple-400" : "text-white/45"}`}>{dayNum}</p>
                {count > 0 && (
                  <p className="text-[9px] text-white/25 leading-none font-medium">{count}</p>
                )}
              </div>

              {/* Logo bubbles + tickers — centred in remaining space */}
              {count > 0 && (
                <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1 pb-1">
                  <div className="flex items-end justify-center gap-1.5">
                    {topEvents.map((e, idx) => {
                      const ticker = (e.symbol || "").toUpperCase();
                      const logo = e.logo || e.image || identityMap[ticker]?.logo || null;
                      const epsEst = e.epsEstimated != null ? `$${Number(e.epsEstimated).toFixed(2)}` : null;
                      const revEst = e.revenueEstimated != null ? formatRevenue(Number(e.revenueEstimated)) : null;
                      const timeStr = e.time === "bmo" || e.session === "pre_market" ? "Pre-Market" : e.time === "amc" || e.session === "after_hours" ? "After Hours" : e.time || null;
                      const modalE: EarningsEntry = {
                        market: null, ticker, company: e.companyName || ticker, companyName: e.companyName || ticker,
                        logo: (logo || undefined) as string | undefined,
                        eps: epsEst, quarter: e.period || null, time: timeStr, exchange: null, beatPct: -1,
                        revenueEstimate: revEst, source: "fmp", earningsDate: dateStr,
                      };
                      return (
                        <button
                          key={`${ticker}-${idx}`}
                          className="flex flex-col items-center gap-1 group focus:outline-none min-w-0"
                          onClick={ev => { ev.stopPropagation(); setModalEntry(modalE); }}
                        >
                          <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-[11px] font-bold text-white ring-1 ring-white/10 group-hover:ring-purple-400/40 transition-all ${logo ? "bg-white/[0.07]" : `bg-gradient-to-br ${tickerColor(ticker)}`}`}>
                            {logo ? (
                              <img src={logo} alt={ticker} className="w-full h-full object-contain p-1" onError={ev2 => { (ev2.currentTarget as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              ticker.slice(0, 2)
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-white/60 group-hover:text-white/90 transition-colors font-mono leading-none truncate max-w-[46px]">{ticker}</span>
                        </button>
                      );
                    })}
                  </div>
                  {extra > 0 && (
                    <p className="text-[9px] text-white/25 mt-0.5">+{extra} more</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {modalEntry && <EarningsModal entry={modalEntry} onClose={() => setModalEntry(null)} />}
    </>
  );
}

// ─── Pre-IPO Watchlist (premium private-market intelligence) ──────

interface PreIPOPolymarket {
  ipo_probability_12m?: number;
  valuation_markets?: { question: string; probability?: number; url?: string }[];
  summary?: string;
}

interface PreIPONewsItem {
  title: string;
  source?: string;
  url?: string;
  published_at?: string;
}

interface PreIPOSourceItem {
  title: string;
  url?: string;
  source?: string;
}

interface PreIPOScoreBreakdown {
  ipo_probability_score?: number;
  valuation_momentum_score?: number;
  news_recency_score?: number;
  source_quality_score?: number;
  catalyst_strength_score?: number;
}

interface PreIPOChangeTracking {
  valuation_change?: string;
  ipo_probability_change?: string;
  new_catalysts?: string[];
  previous_score?: number | null;
  score_change?: number | null;
  last_snapshot_at?: string | null;
}

type PreIPOMomentumBadge = "Heating Up" | "Watch" | "Dormant" | string;

interface PreIPOCompany {
  company: string;
  ipo_status?: string;
  estimated_valuation?: string;
  valuation_notes?: string[];
  polymarket?: PreIPOPolymarket | null;
  catalysts?: string[];
  expected_window?: { earliest?: string; likely?: string } | null;
  confidence_score?: string;
  latest_news?: PreIPONewsItem[];
  sources?: PreIPOSourceItem[];
  // ── Ranked intelligence fields (additive) ───────────────────────
  opportunity_score?: number;
  rank?: number;
  momentum_badge?: PreIPOMomentumBadge;
  score_breakdown?: PreIPOScoreBreakdown;
  change_tracking?: PreIPOChangeTracking;
}

interface PreIPODataConfidence {
  status?: string;
  label?: string;
  reason?: string;
}

interface PreIPOWatchlistResponse {
  status?: string;
  updated_at?: string;
  cached?: boolean;
  stale?: boolean;
  message?: string;
  fallback_reason?: string;
  data_confidence?: PreIPODataConfidence | null;
  companies?: PreIPOCompany[];
}

type PreIPOConfidenceLevel = "live" | "cached" | "limited";

// Fixed pre-IPO watchlist. The frontend always renders these six companies so
// that the watchlist never collapses to an empty state. If the backend cannot
// supply intelligence for one of them, we still render a dormant fallback card.
const PRE_IPO_FIXED_WATCHLIST: string[] = [
  "SpaceX",
  "OpenAI",
  "Anthropic",
  "Databricks",
  "Anduril",
  "Stripe",
];

function buildFallbackPreIPOCompany(name: string): PreIPOCompany {
  return {
    company: name,
    ipo_status: "Unknown",
    estimated_valuation: "Unknown",
    valuation_notes: [],
    polymarket: null,
    catalysts: [],
    expected_window: null,
    confidence_score: undefined,
    latest_news: [],
    sources: [],
    opportunity_score: 0,
    momentum_badge: "Dormant",
    score_breakdown: undefined,
    change_tracking: undefined,
  };
}

function mergePreIPOCompaniesWithFallback(
  companies: PreIPOCompany[],
): { merged: PreIPOCompany[]; usedFallback: boolean } {
  const byName = new Map<string, PreIPOCompany>();
  for (const c of companies) {
    if (c && typeof c.company === "string" && c.company.trim().length > 0) {
      byName.set(c.company.trim().toLowerCase(), c);
    }
  }
  let usedFallback = false;
  const merged: PreIPOCompany[] = PRE_IPO_FIXED_WATCHLIST.map((name) => {
    const existing = byName.get(name.toLowerCase());
    if (existing) return existing;
    usedFallback = true;
    return buildFallbackPreIPOCompany(name);
  });
  // Append any backend-provided companies that aren't on the fixed list, so we
  // don't drop intelligence the backend goes out of its way to surface.
  for (const c of companies) {
    const key = (c?.company || "").trim().toLowerCase();
    if (!key) continue;
    if (!PRE_IPO_FIXED_WATCHLIST.some((n) => n.toLowerCase() === key)) {
      merged.push(c);
    }
  }
  return { merged, usedFallback };
}

function resolvePreIPOConfidence(
  data: (PreIPOWatchlistResponse & { __fetchFailed?: boolean }) | undefined,
  hasCompanies: boolean,
  fetchFailed: boolean,
): { level: PreIPOConfidenceLevel; label: string; reason?: string } {
  const dc = data?.data_confidence ?? null;
  const explicit = (dc?.status || "").toLowerCase().trim();
  const reason = dc?.reason || data?.fallback_reason || data?.message || undefined;

  if (fetchFailed || explicit === "limited" || data?.fallback_reason) {
    return {
      level: "limited",
      label: dc?.label || "Limited data available",
      reason,
    };
  }
  if (explicit === "cached" || data?.cached === true || data?.stale === true) {
    return {
      level: "cached",
      label: dc?.label || "Using cached intelligence",
      reason,
    };
  }
  if (explicit === "live") {
    return {
      level: "live",
      label: dc?.label || "Live intelligence",
      reason,
    };
  }
  if (hasCompanies) {
    return { level: "live", label: dc?.label || "Live intelligence", reason };
  }
  return { level: "limited", label: dc?.label || "Limited data available", reason };
}

function PreIPOConfidenceIndicator({
  level,
  label,
  reason,
}: {
  level: PreIPOConfidenceLevel;
  label: string;
  reason?: string;
}) {
  const palette: Record<PreIPOConfidenceLevel, { dot: string; ring: string; bg: string; border: string; text: string; aria: string }> = {
    live: {
      dot: "#34d399",
      ring: "rgba(52,211,153,0.35)",
      bg: "rgba(52,211,153,0.08)",
      border: "rgba(52,211,153,0.28)",
      text: "rgba(209,250,229,0.92)",
      aria: "Data confidence: live",
    },
    cached: {
      dot: PRE_IPO_GOLD,
      ring: "rgba(244,194,91,0.35)",
      bg: "rgba(244,194,91,0.08)",
      border: "rgba(244,194,91,0.28)",
      text: "rgba(253,231,168,0.92)",
      aria: "Data confidence: using cached intelligence",
    },
    limited: {
      dot: "#f87171",
      ring: "rgba(248,113,113,0.32)",
      bg: "rgba(248,113,113,0.07)",
      border: "rgba(248,113,113,0.26)",
      text: "rgba(254,202,202,0.92)",
      aria: "Data confidence: limited data available",
    },
  };
  const c = palette[level];
  const title = reason ? `${label} — ${reason}` : label;
  return (
    <span
      role="status"
      aria-label={c.aria}
      title={title}
      data-testid={`pre-ipo-confidence-${level}`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      <span
        aria-hidden="true"
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: c.dot, boxShadow: `0 0 0 2px ${c.ring}` }}
      />
      {label}
    </span>
  );
}

const PRE_IPO_GOLD = "#f4c25b";
const PRE_IPO_GOLD_DEEP = "#d4a23c";

function PreIPOConfidenceBadge({ score }: { score?: string }) {
  if (!score) return null;
  const normalized = score.toLowerCase();
  const palette: Record<string, { bg: string; text: string; border: string }> = {
    high:   { bg: "rgba(52,211,153,0.14)", text: "#34d399", border: "rgba(52,211,153,0.32)" },
    medium: { bg: "rgba(244,194,91,0.14)", text: PRE_IPO_GOLD, border: "rgba(244,194,91,0.32)" },
    low:    { bg: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.55)", border: "rgba(255,255,255,0.12)" },
  };
  const c = palette[normalized] || palette.low;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {score}
    </span>
  );
}

function formatProbability(p: number | undefined | null): string {
  if (p == null || isNaN(Number(p))) return "—";
  return `${Math.round(Number(p) * 100)}%`;
}

type MomentumStyle = {
  label: string;
  bg: string;
  text: string;
  border: string;
  Icon: typeof Flame;
};

function momentumStyle(badge?: string): MomentumStyle {
  const norm = (badge || "").trim().toLowerCase();
  if (norm === "heating up" || norm === "heating_up") {
    return {
      label: "Heating Up",
      bg: "linear-gradient(135deg, rgba(244,194,91,0.28) 0%, rgba(212,123,40,0.18) 100%)",
      text: "#fde7a8",
      border: "rgba(244,194,91,0.55)",
      Icon: Flame,
    };
  }
  if (norm === "watch") {
    return {
      label: "Watch",
      bg: "rgba(96,165,250,0.12)",
      text: "#93c5fd",
      border: "rgba(96,165,250,0.32)",
      Icon: Eye,
    };
  }
  // Dormant or unknown → muted grey
  return {
    label: badge && badge.length > 0 ? badge : "Dormant",
    bg: "rgba(255,255,255,0.04)",
    text: "rgba(255,255,255,0.5)",
    border: "rgba(255,255,255,0.12)",
    Icon: Minus,
  };
}

function MomentumBadge({ badge }: { badge?: string }) {
  const s = momentumStyle(badge);
  const Icon = s.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
      style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
    >
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

const SCORE_BREAKDOWN_ROWS: { key: keyof PreIPOScoreBreakdown; label: string; max: number }[] = [
  { key: "ipo_probability_score",     label: "IPO Probability",     max: 30 },
  { key: "valuation_momentum_score",  label: "Valuation Momentum",  max: 25 },
  { key: "news_recency_score",        label: "News Recency",        max: 20 },
  { key: "source_quality_score",      label: "Source Quality",      max: 15 },
  { key: "catalyst_strength_score",   label: "Catalyst Strength",   max: 10 },
];

function ScoreBreakdownBars({ breakdown }: { breakdown?: PreIPOScoreBreakdown }) {
  if (!breakdown) {
    return (
      <p className="text-[11px] text-white/40 italic">Score breakdown not available.</p>
    );
  }
  return (
    <div className="space-y-2">
      {SCORE_BREAKDOWN_ROWS.map((row) => {
        const val = Number(breakdown[row.key] ?? 0);
        const pct = Math.max(0, Math.min(100, (val / row.max) * 100));
        return (
          <div key={row.key} className="flex items-center gap-2.5">
            <span className="text-[10.5px] text-white/65 w-[120px] flex-shrink-0">{row.label}</span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${PRE_IPO_GOLD_DEEP}, ${PRE_IPO_GOLD})`,
                }}
              />
            </div>
            <span
              className="text-[10.5px] font-semibold tabular-nums w-[44px] text-right flex-shrink-0"
              style={{ color: PRE_IPO_GOLD }}
            >
              {Number.isFinite(val) ? Math.round(val) : 0}/{row.max}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ChangeDeltaPill({ value }: { value?: number | null }) {
  if (value == null || !Number.isFinite(Number(value))) {
    return <span className="text-white/45">—</span>;
  }
  const v = Number(value);
  const positive = v > 0;
  const negative = v < 0;
  const color = positive ? "#34d399" : negative ? "#f87171" : "rgba(255,255,255,0.55)";
  const bg = positive
    ? "rgba(52,211,153,0.10)"
    : negative
    ? "rgba(248,113,113,0.10)"
    : "rgba(255,255,255,0.04)";
  const border = positive
    ? "rgba(52,211,153,0.28)"
    : negative
    ? "rgba(248,113,113,0.28)"
    : "rgba(255,255,255,0.10)";
  const Arrow = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const sign = positive ? "+" : "";
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10.5px] font-semibold tabular-nums"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      <Arrow className="w-2.5 h-2.5" />
      {sign}{Math.round(v)}
    </span>
  );
}

function ChangeTextPill({ value }: { value?: string }) {
  const v = (value || "").trim();
  if (!v || v.toLowerCase() === "unknown") {
    return <span className="text-white/45">Unknown</span>;
  }
  const norm = v.toLowerCase();
  const positive = /(up|increase|increased|rising|expand|higher|↑|\+)/.test(norm);
  const negative = /(down|decrease|decreased|falling|lower|↓|-)/.test(norm) && !positive;
  const color = positive ? "#34d399" : negative ? "#f87171" : "rgba(255,255,255,0.7)";
  const bg = positive
    ? "rgba(52,211,153,0.08)"
    : negative
    ? "rgba(248,113,113,0.08)"
    : "rgba(255,255,255,0.04)";
  const border = positive
    ? "rgba(52,211,153,0.24)"
    : negative
    ? "rgba(248,113,113,0.24)"
    : "rgba(255,255,255,0.10)";
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10.5px] font-medium"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {v}
    </span>
  );
}

function ChangeTrackingSection({ tracking }: { tracking?: PreIPOChangeTracking }) {
  const hasAny =
    !!tracking &&
    (
      tracking.previous_score != null ||
      tracking.score_change != null ||
      (tracking.valuation_change && tracking.valuation_change.toLowerCase() !== "unknown") ||
      (tracking.ipo_probability_change && tracking.ipo_probability_change.toLowerCase() !== "unknown") ||
      (tracking.new_catalysts && tracking.new_catalysts.length > 0) ||
      !!tracking.last_snapshot_at
    );

  if (!tracking || !hasAny) {
    return (
      <p className="text-[11px] text-white/40 italic">Not enough history yet.</p>
    );
  }

  const newCatalysts = tracking.new_catalysts || [];

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-white/55">Previous score</span>
          <span className="text-[11px] font-semibold text-white/85 tabular-nums">
            {tracking.previous_score != null ? Math.round(Number(tracking.previous_score)) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-white/55">Score change</span>
          <ChangeDeltaPill value={tracking.score_change} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-white/55">Valuation change</span>
          <ChangeTextPill value={tracking.valuation_change} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-white/55">IPO probability change</span>
          <ChangeTextPill value={tracking.ipo_probability_change} />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1">New catalysts</p>
        {newCatalysts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {newCatalysts.map((c, i) => (
              <span
                key={i}
                className="px-2 py-1 rounded-md text-[10px] font-medium inline-flex items-center gap-1"
                style={{
                  background: "rgba(244,194,91,0.08)",
                  border: "1px solid rgba(244,194,91,0.28)",
                  color: PRE_IPO_GOLD,
                }}
              >
                <Sparkles className="w-2.5 h-2.5" />
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-white/40 italic">No new catalysts since last snapshot.</p>
        )}
      </div>

      {tracking.last_snapshot_at && (
        <p className="text-[10px] text-white/35">
          Last snapshot {String(tracking.last_snapshot_at).slice(0, 19).replace("T", " ")} UTC
        </p>
      )}
    </div>
  );
}

function PreIPOCompanyCard({ company, displayRank }: { company: PreIPOCompany; displayRank: number }) {
  const [expanded, setExpanded] = useState(false);
  const probability12m = company.polymarket?.ipo_probability_12m;
  const probabilityPct = formatProbability(probability12m);
  const valuationMarkets = company.polymarket?.valuation_markets || [];
  const polyExists = !!company.polymarket && (
    probability12m != null || valuationMarkets.length > 0 || company.polymarket?.summary
  );
  const newsItems = company.latest_news || [];
  const sources = company.sources || [];
  const catalysts = company.catalysts || [];
  const valuationNotes = company.valuation_notes || [];
  const window = company.expected_window || null;

  const companyName = company.company || "Unknown";
  const testIdSafeName = companyName.replace(/[^A-Za-z0-9]/g, "-").toLowerCase();

  const rank = company.rank != null && Number.isFinite(Number(company.rank))
    ? Number(company.rank)
    : displayRank;
  const opportunityScore =
    company.opportunity_score != null && Number.isFinite(Number(company.opportunity_score))
      ? Math.round(Number(company.opportunity_score))
      : null;

  return (
    <div
      data-testid={`pre-ipo-card-${testIdSafeName}`}
      data-rank={rank}
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        background: "linear-gradient(180deg, rgba(244,194,91,0.05) 0%, rgba(255,255,255,0.015) 100%)",
        border: "1px solid rgba(244,194,91,0.18)",
        boxShadow: "0 0 0 1px rgba(244,194,91,0.04), 0 8px 30px rgba(0,0,0,0.25)",
      }}
    >
      {/* Top summary row */}
      <div className="px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative"
            style={{
              background: "linear-gradient(135deg, rgba(244,194,91,0.22), rgba(212,162,60,0.12))",
              border: "1px solid rgba(244,194,91,0.32)",
            }}
            data-testid={`pre-ipo-rank-${testIdSafeName}`}
          >
            <span
              className="text-[13px] font-extrabold tabular-nums"
              style={{ color: PRE_IPO_GOLD }}
            >
              #{rank}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white truncate" data-testid={`pre-ipo-company-${testIdSafeName}`}>
                {companyName}
              </h3>
              {company.momentum_badge && (
                <span data-testid={`pre-ipo-momentum-${testIdSafeName}`}>
                  <MomentumBadge badge={company.momentum_badge} />
                </span>
              )}
            </div>
            {company.ipo_status && (
              <p className="text-[11px] text-white/45 truncate mt-0.5">{company.ipo_status}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] flex-shrink-0">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/35">Opportunity</span>
            <span
              className="font-extrabold tabular-nums text-[13px] leading-tight"
              style={{ color: opportunityScore != null ? PRE_IPO_GOLD : "rgba(255,255,255,0.5)" }}
              data-testid={`pre-ipo-score-${testIdSafeName}`}
            >
              {opportunityScore != null ? `${opportunityScore}/100` : "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/35">Est. Valuation</span>
            <span className="font-semibold text-white/85">{company.estimated_valuation || "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/35">12M IPO Odds</span>
            <span className="font-semibold" style={{ color: probability12m != null ? PRE_IPO_GOLD : "rgba(255,255,255,0.5)" }}>
              {probabilityPct}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/35">Window</span>
            <span className="font-semibold text-white/85">
              {window?.likely || window?.earliest || "—"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-wider text-white/35">Confidence</span>
            <PreIPOConfidenceBadge score={company.confidence_score} />
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
            style={{
              background: "rgba(244,194,91,0.08)",
              border: "1px solid rgba(244,194,91,0.22)",
              color: PRE_IPO_GOLD,
            }}
            data-testid={`pre-ipo-toggle-${testIdSafeName}`}
          >
            {expanded ? "Hide" : "Details"}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] space-y-4">
          {/* Score breakdown */}
          <div data-testid={`pre-ipo-score-breakdown-${testIdSafeName}`}>
            <h4 className="text-[10px] uppercase tracking-wider text-white/45 mb-2">Score Breakdown</h4>
            <ScoreBreakdownBars breakdown={company.score_breakdown} />
          </div>

          {/* Change tracking */}
          <div data-testid={`pre-ipo-change-tracking-${testIdSafeName}`}>
            <h4 className="text-[10px] uppercase tracking-wider text-white/45 mb-2">Change Tracking</h4>
            <ChangeTrackingSection tracking={company.change_tracking} />
          </div>

          {/* Expected window */}
          {window && (window.earliest || window.likely) && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Expected IPO Window</h4>
              <div className="flex flex-wrap gap-2 text-[11px]">
                {window.earliest && (
                  <span
                    className="px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <span className="text-white/45 mr-1">Earliest:</span>
                    <span className="text-white/85 font-medium">{window.earliest}</span>
                  </span>
                )}
                {window.likely && (
                  <span
                    className="px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(244,194,91,0.08)", border: "1px solid rgba(244,194,91,0.22)" }}
                  >
                    <span className="text-white/45 mr-1">Likely:</span>
                    <span className="font-medium" style={{ color: PRE_IPO_GOLD }}>{window.likely}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Valuation notes */}
          {valuationNotes.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Valuation Notes</h4>
              <ul className="space-y-1 text-[11px] text-white/70">
                {valuationNotes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-white/30">•</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Catalysts */}
          {catalysts.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Catalysts</h4>
              <div className="flex flex-wrap gap-1.5">
                {catalysts.map((c, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-md text-[10px] font-medium"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.78)" }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Polymarket */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Polymarket</h4>
            {polyExists ? (
              <div className="space-y-2">
                {company.polymarket?.summary && (
                  <p className="text-[11px] text-white/65 leading-relaxed">{company.polymarket.summary}</p>
                )}
                {valuationMarkets.length > 0 && (
                  <div className="space-y-1.5">
                    {valuationMarkets.map((m, i) => (
                      <a
                        key={i}
                        href={m.url || undefined}
                        target={m.url ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="flex items-start justify-between gap-3 px-2.5 py-1.5 rounded-md transition-all group"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <span className="text-[11px] text-white/75 group-hover:text-white">
                          {m.question}
                        </span>
                        <span className="text-[11px] font-semibold flex-shrink-0" style={{ color: PRE_IPO_GOLD }}>
                          {formatProbability(m.probability)}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-white/40 italic">No direct prediction market found.</p>
            )}
          </div>

          {/* Latest News */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Latest News / Confirmations</h4>
            {newsItems.length > 0 ? (
              <ul className="space-y-1.5">
                {newsItems.map((n, i) => (
                  <li key={i} className="text-[11px]">
                    {n.url ? (
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/80 hover:text-white inline-flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0 text-white/35" />
                        <span>{n.title}</span>
                      </a>
                    ) : (
                      <span className="text-white/80">{n.title}</span>
                    )}
                    {(n.source || n.published_at) && (
                      <span className="text-white/35 ml-1.5">
                        {n.source ? `· ${n.source}` : ""}
                        {n.published_at ? ` · ${String(n.published_at).slice(0, 10)}` : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-white/40 italic">No recent confirmation news found.</p>
            )}
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Sources</h4>
              <div className="flex flex-wrap gap-1.5">
                {sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url || undefined}
                    target={s.url ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="px-2 py-1 rounded-md text-[10px] font-medium inline-flex items-center gap-1 transition-all"
                    style={{ background: "rgba(244,194,91,0.06)", border: "1px solid rgba(244,194,91,0.18)", color: PRE_IPO_GOLD }}
                  >
                    {s.url && <ExternalLink className="w-2.5 h-2.5" />}
                    <span>{s.title}{s.source ? ` (${s.source})` : ""}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreIPOWatchlistView({ headerRight }: { headerRight?: React.ReactNode }) {
  const { data, isLoading, error } = useQuery<PreIPOWatchlistResponse & { __fetchFailed?: boolean }>({
    queryKey: ["pre-ipo-watchlist"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/calendar/pre-ipo-watchlist");
        // Tolerate non-2xx responses that still carry a JSON body
        let body: PreIPOWatchlistResponse | null = null;
        try {
          body = await r.json();
        } catch {
          body = null;
        }
        if (!r.ok) {
          return {
            status: body?.status || "error",
            companies: Array.isArray(body?.companies) ? body!.companies : [],
            updated_at: body?.updated_at,
            cached: body?.cached,
            stale: body?.stale,
            message: body?.message,
            fallback_reason: body?.fallback_reason,
            data_confidence: body?.data_confidence ?? null,
            __fetchFailed: true,
          };
        }
        return {
          status: body?.status || "ok",
          companies: Array.isArray(body?.companies) ? body!.companies : [],
          updated_at: body?.updated_at,
          cached: body?.cached,
          stale: body?.stale,
          message: body?.message,
          fallback_reason: body?.fallback_reason,
          data_confidence: body?.data_confidence ?? null,
        };
      } catch {
        return { status: "error", companies: [], __fetchFailed: true };
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const rawCompanies = Array.isArray(data?.companies) ? data!.companies : [];
  const fetchFailed = !!data?.__fetchFailed || !!error;
  const backendOkButEmpty = !fetchFailed && !isLoading && rawCompanies.length === 0;
  // The watchlist is fixed (SpaceX, OpenAI, Anthropic, Databricks, Anduril,
  // Stripe). When the backend returns an empty list — or the fetch fails
  // entirely — we render dormant fallback cards so the UI never collapses to
  // an empty state for this fixed set.
  const { merged: companiesWithFallback, usedFallback } =
    mergePreIPOCompaniesWithFallback(rawCompanies);
  // Sort by rank ascending (with explicit rank winning), then by opportunity_score desc
  const companies = [...companiesWithFallback].sort((a, b) => {
    const ra = a?.rank;
    const rb = b?.rank;
    if (ra != null && rb != null) return Number(ra) - Number(rb);
    if (ra != null) return -1;
    if (rb != null) return 1;
    const sa = a?.opportunity_score ?? -Infinity;
    const sb = b?.opportunity_score ?? -Infinity;
    return Number(sb) - Number(sa);
  });
  const isStaleCache = !fetchFailed && data?.status && data.status !== "ok";
  const baseConfidence = resolvePreIPOConfidence(data, rawCompanies.length > 0, fetchFailed);
  // If we had to substitute any fallback cards, force the confidence pill into
  // "limited" so users know the data isn't fully live.
  const confidence = usedFallback
    ? {
        level: "limited" as PreIPOConfidenceLevel,
        label: baseConfidence.label && baseConfidence.level === "limited"
          ? baseConfidence.label
          : "Limited data available",
        reason: baseConfidence.reason,
      }
    : baseConfidence;

  return (
    <div data-testid="pre-ipo-watchlist-view">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(244,194,91,0.22), rgba(212,162,60,0.12))",
              border: "1px solid rgba(244,194,91,0.32)",
            }}
          >
            <Gem className="w-3.5 h-3.5" style={{ color: PRE_IPO_GOLD }} />
          </div>
          <h2 className="text-base font-bold text-white">IPO Opportunities</h2>
          {headerRight && <div className="flex-shrink-0">{headerRight}</div>}
          {!isLoading && (
            <div className="ml-auto flex-shrink-0">
              <PreIPOConfidenceIndicator
                level={confidence.level}
                label={confidence.label}
                reason={confidence.reason}
              />
            </div>
          )}
        </div>
        <p className="text-[12px] text-white/65 mb-1">
          Ranked private-market IPO intelligence across SpaceX, OpenAI, Anthropic, Databricks, Anduril, and Stripe.
        </p>
        <p className="text-[10.5px] text-white/40 leading-relaxed">
          Tracks IPO rumors, valuation estimates, prediction-market odds, and recent news confirmations.
          This is signal intelligence, not an official IPO calendar.
        </p>
        {!isLoading && confidence.level === "limited" && (
          <p
            className="text-[10.5px] mt-1.5 italic"
            style={{ color: "rgba(244,194,91,0.7)" }}
            data-testid="pre-ipo-limited-data-note"
          >
            Using conservative baseline estimates until live sources refresh.
          </p>
        )}
        {data?.updated_at && (
          <p className="text-[10px] text-white/30 mt-1.5">
            Updated {String(data.updated_at).slice(0, 19).replace("T", " ")} UTC
          </p>
        )}
      </div>

      {/* Stale-cache banner */}
      {isStaleCache && (
        <div
          className="mb-4 px-3 py-2 rounded-lg flex items-start gap-2"
          style={{ background: "rgba(244,194,91,0.06)", border: "1px solid rgba(244,194,91,0.2)" }}
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: PRE_IPO_GOLD }} />
          <p className="text-[11px]" style={{ color: PRE_IPO_GOLD }}>
            Latest intelligence unavailable — showing cached data.
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl h-[88px] animate-pulse"
              style={{
                background: "linear-gradient(180deg, rgba(244,194,91,0.04) 0%, rgba(255,255,255,0.015) 100%)",
                border: "1px solid rgba(244,194,91,0.12)",
              }}
            />
          ))}
        </div>
      )}

      {/* Fetch-failed banner (cards still render below from the fixed watchlist) */}
      {!isLoading && fetchFailed && (
        <div
          className="mb-4 px-3 py-2 rounded-lg flex items-start gap-2"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#f87171" }} />
          <p className="text-[11px]" style={{ color: "rgba(254,202,202,0.92)" }}>
            Could not load live Pre-IPO intelligence. Showing tracked companies in limited-data mode.
          </p>
        </div>
      )}

      {/* Backend-ok-but-empty banner (cards still render below from the fixed watchlist) */}
      {!isLoading && !fetchFailed && backendOkButEmpty && (
        <div
          className="mb-4 px-3 py-2 rounded-lg flex items-start gap-2"
          style={{ background: "rgba(244,194,91,0.06)", border: "1px solid rgba(244,194,91,0.2)" }}
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: PRE_IPO_GOLD }} />
          <p className="text-[11px]" style={{ color: PRE_IPO_GOLD }}>
            Tracked pre-IPO companies are loading in limited-data mode.
          </p>
        </div>
      )}

      {/* Cards (fixed watchlist always renders, with fallback dormant cards when needed) */}
      {!isLoading && companies.length > 0 && (
        <div className="space-y-3">
          {companies.map((c, i) => (
            <PreIPOCompanyCard key={`${c?.company ?? "unknown"}-${i}`} company={c} displayRank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top Catalysts This Week ───────────────────────────────────────
// Consumes /api/catalysts/top — returns weekly grouped payload:
//   { tab: "top_catalysts", mode: "weekly", week: "...",
//     days: [ { date, earnings:[...], macro:[...], other:[...] } ],
//     previous_week: [], last_updated: "...",
//     status: "ready"|"stale"|"empty" }
//
// Two views:
//   • Calendar View (default)  — day-column buckets mirroring Earnings tab
//   • Event Type View          — sectioned (Earnings / Macro / Other)
//
// Always signal-only (no All toggle, no Signal toggle). Fetches once when
// the tab mounts; no polling and no fetch loops.

interface TopCatalystEntry extends CatalystEvent {
  score?: number;
  rank?: number;
  reasons?: string[];
  source_tab?: string;
  watchlist_boost?: boolean;
  options_activity?: boolean;
  unusual_options?: boolean;
  sector_momentum?: string | boolean;
  why?: string | string[];
}

interface TopCatalystDay {
  date: string;
  earnings?: TopCatalystEntry[];
  macro?: TopCatalystEntry[];
  other?: TopCatalystEntry[];
}

interface TopCatalystsResponse {
  tab?: string;
  mode?: string;
  week?: string;
  days?: TopCatalystDay[];
  // Backwards-compat (legacy flat list during rollout)
  current_week?: TopCatalystEntry[];
  previous_week?: TopCatalystEntry[];
  last_updated?: string | null;
  status?: "ready" | "stale" | "empty" | string;
}

const TC_TAB_LABELS: Record<string, string> = {
  dividends:          "Dividend",
  ipos:               "IPO",
  splits:             "Stock Split",
  economic_releases:  "Economic Release",
  treasury_macro:     "Treasury / Macro",
  earnings_dates:     "Earnings",
};

const TC_TAB_TYPES: Record<string, string> = {
  dividends:          "dividend",
  ipos:               "ipo",
  splits:             "split",
  economic_releases:  "economic_release",
  treasury_macro:     "macro",
  earnings_dates:     "earnings",
};

function tcResolveDisplayName(ev: TopCatalystEntry): string {
  const r = ev.raw || {};
  return (
    (ev.title as string | undefined) ||
    (ev.companyName as string | undefined) ||
    (r.companyName as string | undefined) ||
    (r.company as string | undefined) ||
    (r.name as string | undefined) ||
    (ev.event_name as string | undefined) ||
    (ev.indicatorName as string | undefined) ||
    (ev.company as string | undefined) ||
    (ev.symbol ? `${ev.symbol}` : "—")
  );
}

function tcResolveEventType(ev: TopCatalystEntry): string {
  if (ev.eventLabel) return ev.eventLabel;
  const sourceTab = (ev.source_tab as string | undefined) || (ev.raw?.source_tab as string | undefined);
  if (sourceTab && TC_TAB_LABELS[sourceTab]) return TC_TAB_LABELS[sourceTab];
  if (sourceTab && TC_TAB_TYPES[sourceTab]) return TC_TAB_TYPES[sourceTab];
  const raw = (ev.eventType as string | undefined) || ev.event_type;
  if (raw) return raw;
  return "macro";
}

function tcIsEarnings(ev: TopCatalystEntry): boolean {
  const t = tcResolveEventType(ev).toLowerCase();
  return t === "earnings" || t.includes("earning");
}

function tcIsMacro(ev: TopCatalystEntry): boolean {
  const t = tcResolveEventType(ev).toLowerCase();
  return t === "macro" || t.includes("treasury") || t.includes("economic") || t.includes("fed") || t.includes("fomc");
}

function tcIsWatchlist(ev: TopCatalystEntry): boolean {
  const r = (ev.raw || {}) as Record<string, unknown>;
  return Boolean(
    ev.watchlist_boost ||
    (r.watchlist_boost as boolean | undefined) ||
    (r.in_watchlist as boolean | undefined) ||
    (r.portfolio_relevant as boolean | undefined),
  );
}

function tcWhyReasons(ev: TopCatalystEntry): string[] {
  const r = (ev.raw || {}) as Record<string, unknown>;
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s?: string | null) => {
    if (!s) return;
    const k = s.trim();
    if (!k) return;
    const key = k.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(k);
  };

  // Backend-provided reasons array(s)
  if (Array.isArray(ev.reasons)) ev.reasons.forEach((s) => push(String(s)));
  if (Array.isArray((r.reasons as unknown))) (r.reasons as unknown[]).forEach((s) => push(String(s)));
  if (Array.isArray(ev.why)) (ev.why as string[]).forEach((s) => push(String(s)));
  if (typeof ev.why === "string") push(ev.why);

  // Structured signals
  const optionsActivity = ev.options_activity || ev.unusual_options || (r.options_activity as boolean | undefined) || (r.unusual_options as boolean | undefined);
  if (optionsActivity) push("Unusual options activity");

  const sectorMom = ev.sector_momentum ?? (r.sector_momentum as unknown);
  if (sectorMom) {
    if (typeof sectorMom === "string" && sectorMom.length > 0) push(`${sectorMom} sector momentum`);
    else push("Sector momentum");
  }

  if (tcIsWatchlist(ev)) push("Watchlist Boost");

  return out;
}

function tcKeyDetails(ev: TopCatalystEntry): string {
  if (ev.keyDetails) return ev.keyDetails as string;
  const reasons = tcWhyReasons(ev);
  if (reasons.length > 0) return reasons.join(" + ");
  return (ev.subtitle as string | undefined) || "";
}

function tcEventTime(ev: TopCatalystEntry): string | null {
  const r = (ev.raw || {}) as Record<string, unknown>;
  const t = (ev.time as string | undefined) || (r.time as string | undefined) || (r.session as string | undefined);
  if (!t) return null;
  if (t === "bmo" || t === "pre_market") return "Pre-Market";
  if (t === "amc" || t === "after_hours") return "After Hours";
  return t;
}

function CatalystTypeBadge({ type, category }: { type?: string; category?: string }) {
  const t = String(type ?? category ?? "").toLowerCase().replace(/_/g, " ");
  let label: string;
  let cls: string;
  if (t.includes("earn"))                                                   { label = "Earnings";  cls = "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"; }
  else if (t.includes("ipo"))                                               { label = "IPO";       cls = "text-purple-400 bg-purple-500/10 border-purple-500/30"; }
  else if (t.includes("fed") || t.includes("rate"))                         { label = "Fed/Rates"; cls = "text-rose-400 bg-rose-500/10 border-rose-500/30"; }
  else if (t.includes("inflat") || t.includes("cpi") || t.includes("ppi")) { label = "Inflation"; cls = "text-amber-300 bg-amber-500/10 border-amber-500/25"; }
  else if (t.includes("labor") || t.includes("jobs") || t.includes("employ")) { label = "Labor"; cls = "text-sky-400 bg-sky-500/10 border-sky-500/30"; }
  else if (t.includes("treasury") || t.includes("macro"))                  { label = "Macro";     cls = "text-indigo-400 bg-indigo-500/10 border-indigo-500/30"; }
  else if (t.includes("split"))                                             { label = "Split";     cls = "text-teal-400 bg-teal-500/10 border-teal-500/30"; }
  else if (t.includes("div"))                                               { label = "Dividend";  cls = "text-green-400 bg-green-500/10 border-green-500/30"; }
  else { label = String(type ?? category ?? "Event").replace(/_/g, " "); cls = "text-white/45 bg-white/5 border-white/15"; }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border ${cls}`}>
      {label}
    </span>
  );
}

// Compact event row used inside calendar day columns and in event-type sections.
function TopCatalystEventRow({
  ev,
  identityMap,
  variant,
  onClick,
}: {
  ev: TopCatalystEntry;
  identityMap: Record<string, IdentityData>;
  variant: "earnings" | "macro" | "other";
  onClick: () => void;
}) {
  const symbol = (ev.symbol || "").toUpperCase();
  const ident  = symbol ? identityMap[symbol] : undefined;
  const name   = tcResolveDisplayName(ev);
  const eventType = tcResolveEventType(ev);
  const reasons = tcWhyReasons(ev);
  const why = reasons.length > 0 ? reasons.join(" + ") : (ev.subtitle as string | undefined) || "";
  const watchlist = tcIsWatchlist(ev);
  const time = tcEventTime(ev);
  const score = typeof ev.score === "number" ? ev.score : null;
  const logo = ident?.logo || (ev.logo as string | undefined) || (ev.image as string | undefined);

  const variantStyle = variant === "earnings"
    ? { bg: "bg-amber-500/[0.06] hover:bg-amber-500/[0.12]", border: "border-amber-500/20 hover:border-amber-500/40" }
    : variant === "macro"
    ? { bg: "bg-pink-500/[0.05] hover:bg-pink-500/[0.10]", border: "border-pink-500/20 hover:border-pink-500/40" }
    : { bg: "bg-white/[0.02] hover:bg-white/[0.05]", border: "border-white/[0.06] hover:border-white/[0.12]" };

  const tooltip = why
    ? `Why this matters: ${why}`
    : `${eventType}${time ? ` · ${time}` : ""}`;

  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`group w-full text-left rounded-lg border ${variantStyle.border} ${variantStyle.bg} transition-all p-2 flex items-center gap-2`}
    >
      {/* Symbol bubble (earnings) or icon-style label (macro/other) */}
      {variant === "earnings" && symbol ? (
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${logo ? "bg-white/[0.06]" : `bg-gradient-to-br ${tickerColor(symbol)}`}`}>
            {logo ? (
              <img
                src={logo}
                alt={symbol}
                loading="lazy"
                className="w-full h-full object-contain p-0.5"
                onError={(ev2) => { (ev2.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <span className="text-[9px] font-bold text-white">{symbol.slice(0, 2)}</span>
            )}
          </div>
          {watchlist && (
            <span
              title="On your watchlist"
              className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-500 border border-[#0b0f1a] flex items-center justify-center"
            >
              <Star className="w-2 h-2 text-white" fill="white" />
            </span>
          )}
        </div>
      ) : (
        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${variant === "macro" ? "bg-pink-500/15 text-pink-300" : "bg-white/5 text-white/50"}`}>
          {variant === "macro" ? <Landmark className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          {variant === "earnings" && symbol && (
            <span className="text-[10px] font-mono font-bold text-white/85 flex-shrink-0">{symbol}</span>
          )}
          <p className={`truncate leading-tight ${variant === "earnings" ? "text-[11px] font-semibold text-white/90 group-hover:text-white" : "text-[11px] font-medium text-white/75 group-hover:text-white/95"}`}>
            {name}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <CatalystTypeBadge type={eventType} />
          {time && <span className="text-[8px] px-1 py-0.5 rounded bg-white/[0.04] text-white/35">{time}</span>}
          {variant === "earnings" && score != null && (
            <span className="text-[8px] font-semibold text-amber-300/80">{score.toFixed(1)}</span>
          )}
        </div>
        {why && (
          <p className="text-[9px] text-white/35 truncate mt-0.5">{why}</p>
        )}
      </div>
    </button>
  );
}

function TopCatalystsTab({
  identityMap = {},
  onFetchIdentity = () => {},
}: {
  identityMap?: Record<string, IdentityData>;
  onFetchIdentity?: (tickers: string[]) => void;
}) {
  const [data, setData] = useState<TopCatalystsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CatalystEvent | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [view, setView] = useState<"calendar" | "type">("calendar");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${AGENT_BACKEND_URL}/api/catalysts/top`, {
      headers: authHeaders(),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((payload: TopCatalystsResponse) => {
        if (cancelled) return;
        setData(payload || null);
        // Collect symbols from days[] (preferred) or current_week[] (legacy)
        const collected: string[] = [];
        if (Array.isArray(payload?.days)) {
          for (const d of payload!.days!) {
            for (const ev of [...(d.earnings || []), ...(d.macro || []), ...(d.other || [])]) {
              if (ev.symbol) collected.push(String(ev.symbol));
            }
          }
        } else if (Array.isArray(payload?.current_week)) {
          for (const ev of payload!.current_week!) {
            if (ev.symbol) collected.push(String(ev.symbol));
          }
        }
        if (collected.length > 0) onFetchIdentity(collected);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load top catalysts.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, onFetchIdentity]);

  const status = data?.status;
  const lastUpdated = data?.last_updated;

  // Normalize backend payload into days[] regardless of which shape it sent.
  const normalizedDays: TopCatalystDay[] = (() => {
    if (Array.isArray(data?.days) && data!.days!.length > 0) {
      return data!.days!.map((d) => ({
        date: d.date,
        earnings: Array.isArray(d.earnings) ? d.earnings : [],
        macro: Array.isArray(d.macro) ? d.macro : [],
        other: Array.isArray(d.other) ? d.other : [],
      }));
    }
    // Legacy fallback: bucket flat current_week[] into days by event.date and type.
    if (Array.isArray(data?.current_week)) {
      const map = new Map<string, TopCatalystDay>();
      for (const ev of data!.current_week!) {
        const key = (ev.date || "").slice(0, 10) || "undated";
        if (!map.has(key)) map.set(key, { date: key, earnings: [], macro: [], other: [] });
        const bucket = map.get(key)!;
        if (tcIsEarnings(ev)) bucket.earnings!.push(ev);
        else if (tcIsMacro(ev)) bucket.macro!.push(ev);
        else bucket.other!.push(ev);
      }
      return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    return [];
  })();

  // Flat collections for Event Type view + counts.
  const allEarnings: TopCatalystEntry[] = [];
  const allMacro:    TopCatalystEntry[] = [];
  const allOther:    TopCatalystEntry[] = [];
  for (const d of normalizedDays) {
    if (d.earnings) allEarnings.push(...d.earnings);
    if (d.macro)    allMacro.push(...d.macro);
    if (d.other)    allOther.push(...d.other);
  }
  // Earnings: sort by score desc when present
  allEarnings.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const totalCount = allEarnings.length + allMacro.length + allOther.length;

  // Calendar day-columns: prefer Mon–Fri layout; if backend returned non-weekday
  // dates we still render whatever the backend gave us in order.
  const dayColumns: TopCatalystDay[] = (() => {
    if (normalizedDays.length === 0) return [];
    // If the backend gave us 5 Mon–Fri dates, just use them.
    if (normalizedDays.length <= 7) return normalizedDays;
    return normalizedDays.slice(0, 7);
  })();

  return (
    <div>
      {/* ── Header row ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold"
            style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Flame className="w-3 h-3" />
            Top Catalysts · This Week
          </span>
          <span className="text-[10px] text-white/40">
            What actually matters this week to trade
          </span>
          {status && (
            <span className="text-[10px] text-white/30">· status: {status}</span>
          )}
          {lastUpdated && (
            <span className="text-[10px] text-white/25">
              · updated {String(lastUpdated).slice(0, 16).replace("T", " ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[10px] font-semibold">
            <button
              onClick={() => setView("calendar")}
              className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
              style={view === "calendar"
                ? { background: "rgba(245,158,11,0.18)", color: "#fbbf24" }
                : { color: "rgba(255,255,255,0.4)" }}
            >
              <LayoutGrid className="w-3 h-3" />
              Calendar View
            </button>
            <button
              onClick={() => setView("type")}
              className="flex items-center gap-1.5 px-3 py-1.5 transition-all"
              style={view === "type"
                ? { background: "rgba(245,158,11,0.18)", color: "#fbbf24" }
                : { color: "rgba(255,255,255,0.4)" }}
            >
              <List className="w-3 h-3" />
              Event Type View
            </button>
          </div>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-white/40 border border-white/[0.08] hover:bg-white/5 hover:text-white/60 transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      <p className="text-[10px] text-white/25 mb-3">
        {loading
          ? "Loading…"
          : `${totalCount} catalyst${totalCount !== 1 ? "s" : ""} · ${allEarnings.length} earnings · ${allMacro.length} macro${allOther.length > 0 ? ` · ${allOther.length} other` : ""}`}
      </p>

      {error && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-lg bg-red-500/5 border border-red-500/15 text-[11px] text-red-400/70">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 min-h-[180px]">
              <div className="h-3 w-12 rounded bg-white/5 animate-pulse mb-2" />
              <div className="h-2.5 w-16 rounded bg-white/5 animate-pulse mb-3" />
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((__, j) => (
                  <div key={j} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────── */}
      {!loading && totalCount === 0 && !error && (
        <div className="text-center py-14 border border-white/[0.04] rounded-xl bg-white/[0.01]">
          <Flame className="w-7 h-7 text-amber-400/20 mx-auto mb-2" />
          <p className="text-sm text-white/30">No top catalysts available for this week.</p>
          <p className="text-[10px] text-white/20 mt-1">Check back after the next signal sweep.</p>
        </div>
      )}

      {/* ── Calendar View (default) ──────────────────────────────── */}
      {!loading && totalCount > 0 && view === "calendar" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {dayColumns.map((d) => {
            const dt = new Date(`${d.date}T12:00:00`);
            const valid = !isNaN(dt.getTime());
            const dayName = valid ? DAY_NAMES_FULL[dt.getDay()] : "—";
            const dateLabel = valid
              ? `${MONTH_NAMES_SHORT[dt.getMonth()]} ${dt.getDate()}`
              : d.date;
            const isToday = valid && dateKey(new Date()) === d.date;
            const earnings = (d.earnings || []).slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
            const macro = d.macro || [];
            const other = d.other || [];
            const dayCount = earnings.length + macro.length + other.length;

            return (
              <div
                key={d.date}
                className={`rounded-xl border p-2.5 min-h-[180px] flex flex-col ${
                  isToday
                    ? "bg-amber-500/[0.04] border-amber-500/25"
                    : "bg-white/[0.015] border-white/[0.05]"
                }`}
              >
                {/* Day header */}
                <div className="flex items-baseline justify-between mb-2 pb-1.5 border-b border-white/[0.05]">
                  <div>
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${isToday ? "text-amber-400" : "text-white/40"}`}>
                      {dayName}
                    </p>
                    <p className={`text-xs font-bold ${isToday ? "text-amber-300" : "text-white/80"}`}>
                      {dateLabel}
                    </p>
                  </div>
                  <span className="text-[9px] text-white/30">
                    {dayCount > 0 ? `${dayCount}` : "—"}
                  </span>
                </div>

                {dayCount === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-[10px] text-white/20">
                    No catalysts
                  </div>
                ) : (
                  <div className="space-y-1.5 flex-1">
                    {/* Earnings — primary, visually dominant */}
                    {earnings.map((ev, i) => (
                      <TopCatalystEventRow
                        key={ev.id || `e-${ev.symbol || i}-${i}`}
                        ev={ev}
                        identityMap={identityMap}
                        variant="earnings"
                        onClick={() => setSelectedEvent(ev)}
                      />
                    ))}
                    {/* Macro — secondary, clearly labeled */}
                    {macro.length > 0 && (
                      <>
                        {earnings.length > 0 && (
                          <p className="text-[8px] uppercase tracking-wider text-pink-400/50 font-semibold pt-1">
                            Macro
                          </p>
                        )}
                        {macro.map((ev, i) => (
                          <TopCatalystEventRow
                            key={ev.id || `m-${i}`}
                            ev={ev}
                            identityMap={identityMap}
                            variant="macro"
                            onClick={() => setSelectedEvent(ev)}
                          />
                        ))}
                      </>
                    )}
                    {/* Other — tertiary if present */}
                    {other.length > 0 && (
                      <>
                        <p className="text-[8px] uppercase tracking-wider text-white/35 font-semibold pt-1">
                          Other
                        </p>
                        {other.map((ev, i) => (
                          <TopCatalystEventRow
                            key={ev.id || `o-${i}`}
                            ev={ev}
                            identityMap={identityMap}
                            variant="other"
                            onClick={() => setSelectedEvent(ev)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Event Type View ──────────────────────────────────────── */}
      {!loading && totalCount > 0 && view === "type" && (
        <div className="space-y-5">
          {/* === EARNINGS === */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">=== Earnings ===</span>
              <span className="text-[10px] text-white/30">
                {allEarnings.length} top ranked earning{allEarnings.length !== 1 ? "s" : ""} across week
              </span>
            </div>
            {allEarnings.length === 0 ? (
              <p className="text-[11px] text-white/25 px-2 py-3 border border-white/[0.04] rounded-lg bg-white/[0.01]">
                No earnings catalysts ranked this week.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {allEarnings.map((ev, i) => (
                  <TopCatalystEventRow
                    key={ev.id || `te-${ev.symbol || i}-${i}`}
                    ev={ev}
                    identityMap={identityMap}
                    variant="earnings"
                    onClick={() => setSelectedEvent(ev)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* === MACRO === */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-300">=== Macro ===</span>
              <span className="text-[10px] text-white/30">
                {allMacro.length} CPI/PPI/NFP/FOMC/GDP/Treasury event{allMacro.length !== 1 ? "s" : ""}
              </span>
            </div>
            {allMacro.length === 0 ? (
              <p className="text-[11px] text-white/25 px-2 py-3 border border-white/[0.04] rounded-lg bg-white/[0.01]">
                No macro events this week.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {allMacro.map((ev, i) => (
                  <TopCatalystEventRow
                    key={ev.id || `tm-${i}`}
                    ev={ev}
                    identityMap={identityMap}
                    variant="macro"
                    onClick={() => setSelectedEvent(ev)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* === OTHER (RARE) === */}
          {allOther.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">=== Other (Rare) ===</span>
                <span className="text-[10px] text-white/30">{allOther.length} event{allOther.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {allOther.map((ev, i) => (
                  <TopCatalystEventRow
                    key={ev.id || `to-${i}`}
                    ev={ev}
                    identityMap={identityMap}
                    variant="other"
                    onClick={() => setSelectedEvent(ev)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {selectedEvent && (
        <CatalystDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────

export default function StocksEarningsCalendarPage() {
  const queryClient = useQueryClient();

  // ── Tab + mode state ─────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const valid = CATALYST_TABS.map((t) => t.key);
    return tab && valid.includes(tab) ? tab : "earnings_dates";
  });
  const [earningsMode, setEarningsMode] = useState<"upcoming" | "thisweek" | "recent" | "month">("thisweek");
  const [earningsSignalMode, setEarningsSignalMode] = useState<"curated" | "all">("curated");
  const [earningsJumpDate, setEarningsJumpDate] = useState<string | null>(null);
  // Pre-IPO Watchlist (premium private-market intelligence) toggle within IPO tab
  const [ipoView, setIpoView] = useState<"calendar" | "pre_ipo_watchlist">("calendar");
  useEffect(() => { console.log("[Earnings mode]", earningsMode, earningsSignalMode); }, [earningsMode, earningsSignalMode]);
  const switchTab = (key: string) => {
    setActiveTab(key);
    if (key === "earnings_dates") { setEarningsMode("thisweek"); setEarningsSignalMode("curated"); }
  };

  // ── Ask Caelyn global state ───────────────────────────────────────
  const [askCaelynOpen,    setAskCaelynOpen]    = useState(false);
  const [catalystContext,  setCatalystContext]   = useState<string>("");

  const openAskCaelyn = useCallback(async () => {
    try {
      const res = await fetch("/api/catalysts/ask-context");
      if (res.ok) {
        const data = await res.json();
        setCatalystContext(data.context || "");
      }
    } catch { /* fallback: no extra context */ }
    setAskCaelynOpen(true);
  }, []);


  // ── Shared filter state ──────────────────────────────────────────
  const [scope,  setScope]  = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // ── Company identity cache (shared by EarningsCalendarWidget + CatalystListTab) ──────
  const [identityMap, setIdentityMap] = useState<Record<string, IdentityData>>({});
  const identityFetchedRef = useRef<Set<string>>(new Set());
  const fetchIdentity = useCallback((tickers: string[]) => {
    const fresh = tickers.filter(t => t && t.length > 0 && !identityFetchedRef.current.has(t.toUpperCase()));
    if (fresh.length === 0) return;
    fresh.forEach(t => identityFetchedRef.current.add(t.toUpperCase()));
    for (let i = 0; i < fresh.length; i += 50) {
      const batch = fresh.slice(i, i + 50);
      fetch(`/api/fmp/company-identity?symbols=${encodeURIComponent(batch.join(","))}`)
        .then(r => r.ok ? r.json() : {})
        .then((data: Record<string, IdentityData>) => {
          setIdentityMap(prev => ({ ...prev, ...data }));
        })
        .catch(() => {});
    }
  }, []);

  // ── This Week state ──────────────────────────────────────────────
  const [weekCleanStart, setWeekCleanStart] = useState<Date>(() => getMonday(new Date()));

  const navigateWeekClean = useCallback((delta: -1 | 0 | 1) => {
    if (delta === 0) {
      setWeekCleanStart(getMonday(new Date()));
    } else {
      setWeekCleanStart(prev => addDays(prev, delta * 7));
    }
  }, []);

  // Week Curated — React Query (stable key, 15 min stale, 60 min cache)
  const weekCleanQueryKey = ["earnings", "week", "curated", scope, dateKey(weekCleanStart)] as const;
  const { data: weekCleanData, isLoading: weekCleanLoading, error: _weekCleanErr } = useQuery<WeekCleanResponse>({
    queryKey: weekCleanQueryKey,
    queryFn: async () => {
      if (process.env.NODE_ENV !== "production") console.log("[Earnings cache key]", weekCleanQueryKey);
      const weekEnd = addDays(weekCleanStart, 4);
      const params = new URLSearchParams({
        weekStart: dateKey(weekCleanStart),
        weekEnd: dateKey(weekEnd),
        limit_per_session: "8",
        max_total: "60",
      });
      if (scope !== "all") params.set("scope", scope);
      const r = await fetch(`/api/catalysts/earnings/week-clean?${params}`);
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    // Don't fire alongside week-all when signalMode is "all"
    enabled: activeTab === "earnings_dates" && earningsMode === "thisweek" && earningsSignalMode !== "all",
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: (prev: any, prevQuery: any) =>
      prevQuery?.queryKey?.[3] === scope ? prev : undefined,
  });
  const weekCleanError = _weekCleanErr ? "Could not load curated earnings for this week." : null;
  // Enrich tickers when week-clean data arrives
  useEffect(() => {
    if (!weekCleanData) return;
    const tickers = (weekCleanData.days || []).flatMap(d => d.entries || []).map(e => e.symbol).filter(Boolean);
    if (tickers.length > 0) fetchIdentity(tickers);
  }, [weekCleanData, fetchIdentity]);

  // Week All — React Query (separate key from curated)
  const weekAllQueryKey = ["earnings", "week", "all", scope, dateKey(weekCleanStart)] as const;
  const { data: weekAllData, isLoading: weekAllLoading } = useQuery<WeekAllResponse>({
    queryKey: weekAllQueryKey,
    queryFn: async () => {
      if (process.env.NODE_ENV !== "production") console.log("[Earnings cache key]", weekAllQueryKey);
      const weekEnd = addDays(weekCleanStart, 4);
      const waParams = new URLSearchParams({ weekStart: dateKey(weekCleanStart), weekEnd: dateKey(weekEnd) });
      if (scope !== "all") waParams.set("scope", scope);
      const r = await fetch(`/api/catalysts/earnings/week-all?${waParams}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json();
      if (process.env.NODE_ENV !== "production") console.log("[Week All response]", data);
      return data;
    },
    enabled: activeTab === "earnings_dates" && earningsMode === "thisweek" && earningsSignalMode === "all",
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: (prev: any, prevQuery: any) =>
      prevQuery?.queryKey?.[3] === scope ? prev : undefined,
  });

  // ── Month Curated state ───────────────────────────────────────────
  const [monthCuratedYear, setMonthCuratedYear] = useState<number>(() => new Date().getFullYear());
  const [monthCuratedMonth, setMonthCuratedMonth] = useState<number>(() => new Date().getMonth() + 1);

  // Month Curated — React Query (Apr→May→Apr restores from cache instantly)
  const monthCuratedQueryKey = ["earnings", "month", "curated", scope, monthCuratedYear, monthCuratedMonth] as const;
  const { data: monthCuratedData, isLoading: monthCuratedLoading } = useQuery<MonthCuratedResponse>({
    queryKey: monthCuratedQueryKey,
    queryFn: async () => {
      if (process.env.NODE_ENV !== "production") console.log("[Earnings cache key]", monthCuratedQueryKey);
      const mcParams = new URLSearchParams({ year: String(monthCuratedYear), month: String(monthCuratedMonth) });
      if (scope !== "all") mcParams.set("scope", scope);
      const r = await fetch(`/api/catalysts/earnings/month-curated?${mcParams}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json();
      if (process.env.NODE_ENV !== "production") console.log("[Month Curated response]", data);
      return data;
    },
    enabled: activeTab === "earnings_dates" && earningsMode === "month" && earningsSignalMode === "curated",
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: (prev: any, prevQuery: any) =>
      prevQuery?.queryKey?.[3] === scope ? prev : undefined,
  });

  const navigateMonthCurated = useCallback((delta: number) => {
    if (delta === 0) {
      const n = new Date();
      setMonthCuratedYear(n.getFullYear());
      setMonthCuratedMonth(n.getMonth() + 1);
    } else {
      setMonthCuratedYear(prev => {
        const d = new Date(prev, monthCuratedMonth - 1 + delta, 1);
        setMonthCuratedMonth(d.getMonth() + 1);
        return d.getFullYear();
      });
    }
  }, [monthCuratedMonth]);

  // Month All — React Query (same year/month state as Month Curated)
  const monthAllQueryKey = ["earnings", "month", "all", scope, monthCuratedYear, monthCuratedMonth] as const;
  const { data: monthAllData, isLoading: monthAllLoading } = useQuery<MonthAllResponse>({
    queryKey: monthAllQueryKey,
    queryFn: async () => {
      if (process.env.NODE_ENV !== "production") console.log("[Earnings cache key]", monthAllQueryKey);
      const maParams = new URLSearchParams({ year: String(monthCuratedYear), month: String(monthCuratedMonth) });
      if (scope !== "all") maParams.set("scope", scope);
      const r = await fetch(`/api/catalysts/earnings/month-all?${maParams}`);
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json();
      if (process.env.NODE_ENV !== "production") console.log("[Month All response]", data);
      return data;
    },
    enabled: activeTab === "earnings_dates" && earningsMode === "month" && earningsSignalMode === "all",
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    placeholderData: (prev: any, prevQuery: any) =>
      prevQuery?.queryKey?.[3] === scope ? prev : undefined,
  });

  // ── Earnings tab state ───────────────────────────────────────────
  const [earningsMarkets, setEarningsMarkets] = useState<ParsedMarket[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const data = await fetchPolymarketByTag("earnings");
      if (data && data.length > 0) setEarningsMarkets(parseTagEvents(data));
    } catch { /* silent */ }
    finally { setEarningsLoading(false); }
  }, []);

  useEffect(() => {
    fetchEarnings();
    const iv = setInterval(fetchEarnings, REFRESH_INTERVAL);
    return () => clearInterval(iv);
  }, [fetchEarnings]);

  // ── Prefetch on mount: Day Curated (today), Week Curated, Month Curated ──
  // Keys MUST match the live query keys (which include scope as element [3]).
  // Default scope on mount is "all" — prefetch with scope="all" so the cache
  // hit lands correctly when the user first views the page.
  useEffect(() => {
    const now = new Date();
    const today = dateKey(now);
    const thisMonday = getMonday(now);
    const thisWeekEnd = addDays(thisMonday, 4);
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth() + 1;
    const defaultScope = "all";

    queryClient.prefetchQuery({
      queryKey: ["earnings", "day", "curated", defaultScope, today],
      queryFn: async () => {
        const r = await fetch(`/api/catalysts/earnings/day-curated?date=${today}`);
        if (!r.ok) throw new Error(`${r.status}`);
        const data = await r.json();
        return Array.isArray(data) ? data : (data.events || data.entries || data.earnings || []);
      },
      staleTime: 15 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ["earnings", "week", "curated", defaultScope, dateKey(thisMonday)],
      queryFn: async () => {
        const params = new URLSearchParams({
          weekStart: dateKey(thisMonday),
          weekEnd: dateKey(thisWeekEnd),
          limit_per_session: "8",
          max_total: "60",
        });
        const r = await fetch(`/api/catalysts/earnings/week-clean?${params}`);
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      },
      staleTime: 15 * 60 * 1000,
    });

    queryClient.prefetchQuery({
      queryKey: ["earnings", "month", "curated", defaultScope, thisYear, thisMonth],
      queryFn: async () => {
        const r = await fetch(`/api/catalysts/earnings/month-curated?year=${thisYear}&month=${thisMonth}`);
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      },
      staleTime: 15 * 60 * 1000,
    });
  }, [queryClient]);

  const isEarningsTab   = activeTab === "earnings_dates";
  const isIpoTab        = activeTab === "ipos";
  const showFilterBar   = isEarningsTab;

  // ── Diagnostic: confirm scope/queryKey/response/symbols alignment ──
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const activeData: any =
      earningsMode === "thisweek" ? weekCleanData :
      earningsMode === "month"    ? monthCuratedData : null;
    const activeKey =
      earningsMode === "thisweek" ? weekCleanQueryKey :
      earningsMode === "month"    ? monthCuratedQueryKey : null;
    const symbols: string[] =
      earningsMode === "thisweek"
        ? (weekCleanData?.days ?? []).flatMap(d => (d.entries ?? []).map((e: any) => e.symbol)).filter(Boolean)
        : earningsMode === "month"
        ? (monthCuratedData?.days ?? []).flatMap(d => (d.topEvents ?? []).map((e: any) => e.symbol)).filter(Boolean)
        : [];
    console.log("[earnings-ui]", {
      selectedScope: scope,
      view: earningsMode,
      queryKey: activeKey,
      responseScope: activeData?.scope ?? "(not in response)",
      symbols: symbols.slice(0, 20),
      count: symbols.length,
    });
  }, [scope, earningsMode, weekCleanData, monthCuratedData, weekCleanQueryKey, monthCuratedQueryKey]);

  // ── Screen context — placed here so all data variables are in scope ──
  useSetScreenContext((() => {
    const weekEntries: any[] = earningsMode === 'thisweek'
      ? (weekCleanData?.days ?? []).flatMap((d: any) => (d.entries ?? []).map((e: any) => ({
          ticker: e.symbol ?? e.ticker,
          company: e.company ?? identityMap[e.symbol]?.name ?? null,
          report_date: e.report_date ?? d.date ?? null,
          time: e.time ?? null,
          eps_estimate: e.eps_estimate ?? null,
          eps_actual: e.eps_actual ?? null,
          eps_surprise_pct: e.eps_surprise_pct ?? null,
          revenue_estimate: e.revenue_estimate ?? null,
          revenue_actual: e.revenue_actual ?? null,
          beat: e.beat ?? null,
        })))
      : [];
    return {
      route: '/app/stocks/earnings-calendar',
      page: 'calendar',
      tab: activeTab,
      sub_tab: activeTab === 'earnings_dates' ? earningsMode : undefined,
      filters: { scope, search: search || null },
      row_count: weekEntries.length || undefined,
      visible_rows: weekEntries.slice(0, 30),
      extra: {
        ipoView: activeTab === 'ipo' ? ipoView : undefined,
        week_start: earningsMode === 'thisweek' ? dateKey(weekCleanStart) : undefined,
        week_end: earningsMode === 'thisweek' ? dateKey(addDays(weekCleanStart, 4)) : undefined,
        signal_mode: earningsSignalMode,
        freshness: weekCleanData?.meta?.updated_at ?? weekAllData?.meta?.updated_at ?? undefined,
      },
    };
  })(), [activeTab, earningsMode, ipoView, scope, search, weekCleanData, weekAllData, weekCleanStart, earningsSignalMode, identityMap]);

  return (
    <>
    <div className="min-h-screen text-white" style={{ background: '#050608' }}>
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlassCard className="p-5 w-full">

          {/* ── Tab bar + Ask Caelyn ─────────────────────────────── */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 pb-1">
              {CATALYST_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => switchTab(tab.key)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                    style={active ? {
                      background: "rgba(245,158,11,0.15)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#fbbf24",
                    } : {
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {/* ── Ask Caelyn — global, all tabs ─────────────────── */}
            <button
              onClick={openAskCaelyn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.15))",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "#fbbf24",
              }}
            >
              <Sparkles className="w-3 h-3" />
              Ask Caelyn
            </button>
          </div>

          {/* ── Filter bar ───────────────────────────────────────── */}
          {showFilterBar && (
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {/* Scope */}
              <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[10px] font-semibold">
                {["all", "watchlist", "portfolio"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScope(s)}
                    className="px-3 py-1.5 transition-all capitalize"
                    style={scope === s ? { background: "rgba(245,158,11,0.2)", color: "#fbbf24" } : { color: "rgba(255,255,255,0.4)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Ticker search */}
              <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-[240px] bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5">
                <Search className="w-3 h-3 text-white/30 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search ticker..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-[11px] text-white placeholder-white/25 outline-none w-full"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-white/30 hover:text-white/60 flex-shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Earnings Recent / Day / Week / Month toggle ──────── */}
          {isEarningsTab && (
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[11px] font-semibold flex-shrink-0">
                <button
                  onClick={() => setEarningsMode("recent")}
                  className="px-4 py-1.5 transition-all"
                  style={earningsMode === "recent"
                    ? { background: "rgba(16,185,129,0.15)", color: "#34d399", borderRight: "1px solid rgba(255,255,255,0.06)" }
                    : { color: "rgba(255,255,255,0.4)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
                >
                  Recent
                </button>
                <button
                  onClick={() => { setEarningsMode("upcoming"); setEarningsSignalMode("curated"); }}
                  className="px-4 py-1.5 transition-all"
                  style={earningsMode === "upcoming"
                    ? { background: "rgba(245,158,11,0.18)", color: "#fbbf24", borderRight: "1px solid rgba(255,255,255,0.06)" }
                    : { color: "rgba(255,255,255,0.4)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
                >
                  Day
                </button>
                <button
                  onClick={() => { setEarningsMode("thisweek"); setEarningsSignalMode("curated"); }}
                  className="px-4 py-1.5 transition-all"
                  style={earningsMode === "thisweek"
                    ? { background: "rgba(99,102,241,0.18)", color: "#a5b4fc", borderRight: "1px solid rgba(255,255,255,0.06)" }
                    : { color: "rgba(255,255,255,0.4)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
                >
                  Week
                </button>
                <button
                  onClick={() => { setEarningsMode("month"); setEarningsSignalMode("curated"); }}
                  className="px-4 py-1.5 transition-all"
                  style={earningsMode === "month"
                    ? { background: "rgba(168,85,247,0.18)", color: "#c084fc" }
                    : { color: "rgba(255,255,255,0.4)" }}
                >
                  Month
                </button>
              </div>
              {/* Curated / All sub-toggle hidden from normal UI — Curated is the default and only user-facing mode. */}
              {earningsMode === "thisweek" ? (
                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigateWeekClean(-1)}
                      className="p-1 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-white/35 hover:text-white/65"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    {dateKey(weekCleanStart) !== dateKey(getMonday(new Date())) && (
                      <button
                        onClick={() => navigateWeekClean(0)}
                        className="px-2 py-0.5 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-[10px] font-semibold text-white/35 hover:text-white/65"
                      >
                        Now
                      </button>
                    )}
                    <button
                      onClick={() => navigateWeekClean(1)}
                      className="p-1 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-white/35 hover:text-white/65"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[11px] font-semibold text-white/50">
                    {MONTH_NAMES_SHORT[weekCleanStart.getMonth()]} {weekCleanStart.getDate()} – {MONTH_NAMES_SHORT[addDays(weekCleanStart, 4).getMonth()]} {addDays(weekCleanStart, 4).getDate()}, {addDays(weekCleanStart, 4).getFullYear()}
                  </span>
                  {weekCleanData && (weekCleanData.days || []).reduce((s, d) => s + (d.count || 0), 0) > 0 && (
                    <span className="text-[9px] text-white/25">
                      {(weekCleanData.days || []).reduce((s, d) => s + (d.count || 0), 0).toLocaleString()} calls this week
                    </span>
                  )}
                </div>
              ) : earningsMode === "month" ? (
                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => navigateMonthCurated(-1)}
                    className="p-1 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-white/35 hover:text-white/65"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => navigateMonthCurated(0)}
                    className="px-2 py-0.5 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-[10px] font-semibold text-white/35 hover:text-white/65"
                  >
                    {MONTH_NAMES[monthCuratedMonth - 1]}
                  </button>
                  <button
                    onClick={() => navigateMonthCurated(1)}
                    className="p-1 rounded border border-white/[0.08] hover:bg-white/[0.05] transition-all text-white/35 hover:text-white/65"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                  {monthCuratedYear !== new Date().getFullYear() && (
                    <span className="text-[11px] text-white/35 ml-1">{monthCuratedYear}</span>
                  )}
                </div>
              ) : (
                <span className="ml-auto text-[10px] text-white/25 flex-shrink-0">
                  {earningsMode === "upcoming" ? "Selected day's earnings calls" : "List — recent earnings reports"}
                </span>
              )}
            </div>
          )}


          {/* ── Tab content ─────────────────────────────────────── */}
          {activeTab === "top_catalysts" ? (
            /* ── Top Catalysts This Week — ranked list ─────────── */
            <TopCatalystsTab
              identityMap={identityMap}
              onFetchIdentity={fetchIdentity}
            />
          ) : isIpoTab && ipoView === "pre_ipo_watchlist" ? (
            <PreIPOWatchlistView
              headerRight={
                <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[11px] font-semibold">
                  <button
                    onClick={() => setIpoView("calendar")}
                    className="flex items-center gap-1.5 px-4 py-1.5 transition-all"
                    style={{ color: "rgba(255,255,255,0.4)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <TrendingUp className="w-3 h-3" />
                    IPO Calendar
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-4 py-1.5 transition-all"
                    style={{ background: "rgba(244,194,91,0.18)", color: "#f4c25b" }}
                  >
                    <Crown className="w-3 h-3" />
                    Pre-IPO Watchlist
                  </button>
                </div>
              }
            />
          ) : isEarningsTab && earningsMode === "thisweek" && earningsSignalMode === "curated" ? (
            /* ── Week · Curated — curated board ────────────────── */
            <WeeklyEarningsBoard
              weekStart={weekCleanStart}
              weekData={weekCleanData}
              weekLoading={weekCleanLoading}
              weekError={weekCleanError}
              identityMap={identityMap}
              onNavigate={navigateWeekClean}
              hideNav
              scope={scope}
            />
          ) : isEarningsTab && earningsMode === "thisweek" && earningsSignalMode === "all" ? (
            /* ── Week · All — full grouped list ────────────────── */
            <WeekAllList
              weekData={weekAllData}
              weekLoading={weekAllLoading}
              identityMap={identityMap}
              scope={scope}
            />
          ) : isEarningsTab && earningsMode === "upcoming" ? (
            /* ── Day — calendar widget (Curated or All via prop) ── */
            earningsLoading && earningsMarkets.length === 0 ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Earnings
                      <span className="text-white/30 font-normal text-xs ml-2">/ Loading...</span>
                    </h3>
                    <p className="text-[10px] text-white/30">FMP earnings data</p>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-[200px] rounded-xl" />
                  ))}
                </div>
              </div>
            ) : (
              <EarningsCalendarWidget
                markets={earningsMarkets}
                identityMap={identityMap}
                onFetchIdentity={fetchIdentity}
                signalMode={earningsSignalMode}
                jumpToDate={earningsJumpDate}
                scope={scope}
              />
            )
          ) : isEarningsTab && earningsMode === "recent" ? (
            /* ── Earnings Recent — unchanged ────────────────────── */
            <CatalystListTab
              key="earnings_dates-recent"
              tabKey="earnings_dates"
              scope={scope}
              search={search}
              hideRangeToggle
              identityMap={identityMap}
              onFetchIdentity={fetchIdentity}
            />
          ) : isEarningsTab && earningsMode === "month" && earningsSignalMode === "curated" ? (
            /* ── Month · Curated — calendar grid ───────────────── */
            <MonthCuratedGrid
              data={monthCuratedData}
              loading={monthCuratedLoading}
              year={monthCuratedYear}
              month={monthCuratedMonth}
              identityMap={identityMap}
              onNavigateMonth={navigateMonthCurated}
              onSelectDate={(dateStr) => {
                setEarningsMode("upcoming");
                setEarningsSignalMode("curated");
                setEarningsJumpDate(dateStr);
              }}
              scope={scope}
            />
          ) : isEarningsTab && earningsMode === "month" && earningsSignalMode === "all" ? (
            /* ── Month · All — month-all endpoint ───────────────── */
            <MonthAllGrid
              key="earnings_dates-month-all"
              data={monthAllData ?? null}
              loading={monthAllLoading}
              year={monthCuratedYear}
              month={monthCuratedMonth}
              identityMap={identityMap}
              onNavigateMonth={navigateMonthCurated}
              onSelectDate={(dateStr) => {
                setEarningsMode("upcoming");
                setEarningsSignalMode("curated");
                setEarningsJumpDate(dateStr);
              }}
              scope={scope}
            />
          ) : (
            /* ── All other tabs — snapshot calendar (Day/Week/Month +
                 Current Week / Recent toggle). Earnings is handled by
                 the branches above and is not affected. ─────────── */
            <CatalystSnapshotTab
              key={activeTab}
              tabKey={activeTab}
              scope={scope}
              search={search}
              identityMap={identityMap}
              onFetchIdentity={fetchIdentity}
              defaultMode={isIpoTab ? "recent" : "week"}
              rightSlot={isIpoTab ? (
                <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[11px] font-semibold">
                  <button
                    onClick={() => setIpoView("calendar")}
                    className="flex items-center gap-1.5 px-4 py-1.5 transition-all"
                    style={{ background: "rgba(139,92,246,0.18)", color: "#a5b4fc", borderRight: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <TrendingUp className="w-3 h-3" />
                    IPO Calendar
                  </button>
                  <button
                    onClick={() => setIpoView("pre_ipo_watchlist")}
                    className="flex items-center gap-1.5 px-4 py-1.5 transition-all"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    <Crown className="w-3 h-3" />
                    Pre-IPO Watchlist
                  </button>
                </div>
              ) : undefined}
            />
          )}

        </GlassCard>
      </main>
    </div>

    {/* ── Global Ask Caelyn popup ──────────────────────────────── */}
    {askCaelynOpen && (
      <EarningsAgent
        onClose={() => setAskCaelynOpen(false)}
        systemContext={catalystContext ? `${CATALYST_SYSTEM_CONTEXT}\n\n${catalystContext}` : CATALYST_SYSTEM_CONTEXT}
        suggestedPrompts={CATALYST_SUGGESTED_PROMPTS}
      />
    )}
    </>
  );
}
