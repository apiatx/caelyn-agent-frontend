import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSetPageContext } from "@/hooks/useSetPageContext";
import { resolveTVSymbol as resolveTVSymbolUtil } from "@/utils/tvSymbol";
import { AreaChart, Area, LineChart as RLineChart, Line, ResponsiveContainer } from "recharts";
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
  ChevronRight,
  X,
  Signal,
  GripVertical,
  AlertTriangle,
  CalendarDays,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { DailyAlphaBoard } from "@/components/home/DailyAlphaBoard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
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
  HomeUnusualOptionsMeta,
} from "@/types/home";

// ── Lightweight HL signal types (mirrors hl-advanced-signals shape) ──────────
interface HLRSLeader  { symbol: string; rs_score: number; return_1h: number; return_4h: number; return_24h: number; }
interface HLOIRegime  { symbol: string; regime: string; price_change_24h_pct?: number; oi_change_1h_pct: number; regime_score: number; }
interface HLAdvSigs   { relative_strength_leaders: HLRSLeader[]; oi_regime_shift: HLOIRegime[]; as_of?: string; market_regime?: string | null; }

// ───────────────────────────────────────────────────────────────────────────
// External chart URL resolution for movers
// Commodities → TradingView chart links (same chart ID used by Commodities page)
// Crypto      → CoinMarketCap currency page
// ───────────────────────────────────────────────────────────────────────────

const TV_CHART = "https://www.tradingview.com/chart/e5l95XgZ/?symbol=";

// FMP commodity ticker → full TradingView chart URL (mirrors Commodities page links)
const COMMODITY_TV_URLS: Record<string, string> = {
  // Energy
  BRENTOIL:   TV_CHART + "TVC%3AUKOIL",
  BRENT:      TV_CHART + "TVC%3AUKOIL",
  UKOIL:      TV_CHART + "TVC%3AUKOIL",
  WTIOIL:     TV_CHART + "TVC%3AUSOIL",
  CRUDEOIL:   TV_CHART + "TVC%3AUSOIL",
  OIL:        TV_CHART + "TVC%3AUSOIL",
  USOIL:      TV_CHART + "TVC%3AUSOIL",
  GAS:        TV_CHART + "FXOPEN%3AXNGUSD",
  NATGAS:     TV_CHART + "FXOPEN%3AXNGUSD",
  NATURALGAS: TV_CHART + "FXOPEN%3AXNGUSD",
  XNGUSD:     TV_CHART + "FXOPEN%3AXNGUSD",
  // Metals
  GOLD:      TV_CHART + "OANDA%3AXAUUSD",
  XAUUSD:    TV_CHART + "OANDA%3AXAUUSD",
  SILVER:    TV_CHART + "TVC%3ASILVER",
  XAGUSD:    TV_CHART + "TVC%3ASILVER",
  COPPER:    TV_CHART + "CAPITALCOM%3ACOPPER",
  PLATINUM:  TV_CHART + "CAPITALCOM%3APLATINUM",
  XPTUSD:    TV_CHART + "CAPITALCOM%3APLATINUM",
  PALLADIUM: TV_CHART + "OANDA%3AXPDUSD",
  XPDUSD:    TV_CHART + "OANDA%3AXPDUSD",
  ALUMINUM:  TV_CHART + "PEPPERSTONE%3AALUMINIUM",
  ALUMINIUM: TV_CHART + "PEPPERSTONE%3AALUMINIUM",
  NICKEL:    TV_CHART + "CAPITALCOM%3ANICKEL",
  URANIUM:   TV_CHART + "COMEX%3AUX1%21",
  COAL:      TV_CHART + "ICEEUR%3ANCF1%21",
  IRON:      TV_CHART + "COMEX%3ATIO1%21",
  // Grains / Softs
  WHEAT:     TV_CHART + "OANDA%3AWHEATUSD",
  WHEATUSD:  TV_CHART + "OANDA%3AWHEATUSD",
  CORN:      TV_CHART + "OANDA%3ACORNUSD",
  CORNUSD:   TV_CHART + "OANDA%3ACORNUSD",
  SOYBEAN:   TV_CHART + "OANDA%3ASOYBNUSD",
  SOYBEANS:  TV_CHART + "OANDA%3ASOYBNUSD",
  SOYBNUSD:  TV_CHART + "OANDA%3ASOYBNUSD",
  COFFEE:    TV_CHART + "ICEEUR%3AKC1%21",
  COCOA:     TV_CHART + "ICEEUR%3AC1%21",
  SUGAR:     TV_CHART + "ICEEUR%3ASB1%21",
  COTTON:    TV_CHART + "CMCMARKETS%3ACOTTON",
  LUMBER:    TV_CHART + "CME%3ALB1%21",
  ORANGEJUICE: TV_CHART + "ICEEUR%3AOJ1%21",
};

// Returns a TradingView chart URL for a commodity ticker, or null if unknown
function getCommodityUrl(ticker: string): string {
  const upper = ticker.toUpperCase().replace(/\s+/g, "");
  return COMMODITY_TV_URLS[upper] ?? (TV_CHART + "TVC%3A" + encodeURIComponent(upper));
}

// Returns a CoinMarketCap URL for a crypto ticker using the company/name for the slug
function getCryptoUrl(ticker: string, company?: string): string {
  const slug = (company || ticker)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `https://coinmarketcap.com/currencies/${slug}/`;
}

// Returns an external URL for commodities/crypto mover rows, or null for stocks/ETFs (use popup instead)
function getMoverExternalUrl(ticker: string, assetType: string | null | undefined, company?: string): string | null {
  const at = (assetType || "").toLowerCase();
  if (at === "commodities" || at === "commodity") return getCommodityUrl(ticker);
  if (at === "crypto" || at === "cryptocurrency") return getCryptoUrl(ticker, company);
  return null;
}


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
  viewMore,
}: {
  icon: React.ElementType;
  title: string;
  accent?: string;
  action?: React.ReactNode;
  viewMore?: string;
}) {
  const [, setLocation] = useLocation();
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md flex items-center justify-center"
             style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: "#a9aaa6" }} />
        </div>
        <h2 className="text-sm font-semibold text-white/90 tracking-wide uppercase">
          {title}
        </h2>
        {accent && (
          <span className="text-[11px] text-white/40 ml-1">{accent}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {action}
        {viewMore && (
          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); setLocation(viewMore); }}
            className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-0.5 transition-colors"
          >
            View more <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Home section drag-and-drop ────────────────────────────────────────────────
const HOME_SECTIONS_KEY = 'caelyn_home_section_order_v1';
const HOME_DEFAULT_SECTIONS = ['themes_signals_news', 'social_movers', 'snapshots', 'flows_hl', 'fear_greed'];

function SortableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 20 : 'auto',
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style} className="group/section relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-3 z-20 opacity-0 group-hover/section:opacity-100 transition-opacity cursor-grab active:cursor-grabbing select-none touch-none"
        title="Drag to reorder"
      >
        <div className="w-6 h-6 rounded flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <GripVertical className="w-4 h-4 text-white/40" />
        </div>
      </div>
      {children}
    </div>
  );
}

// ── TradingView symbol mapping ────────────────────────────────────────────────
function tvSymbolFor(card: HomeMacroCard): string {
  const s = (card.symbol || "").toUpperCase();
  const l = (card.label || "").toUpperCase();
  if (s === "SPX" || s === "SPY" || l.includes("S&P")) return "FOREXCOM:SPXUSD";
  if (s === "DJI" || l.includes("DOW")) return "FOREXCOM:DJI";
  // QQQ ETF — more reliably available in embedded widget than NASDAQ:NDX (requires data sub)
  if (s === "NDX" || s === "QQQ" || l.includes("NASDAQ")) return "NASDAQ:QQQ";
  if (s === "BTC" || l.includes("BITCOIN")) return "BITSTAMP:BTCUSD";
  // TVC:US10Y = TradingView's own US 10-year yield feed
  if (s === "TNX" || s === "US10Y" || l.includes("10Y") || l.includes("YIELD")) return "TVC:US10Y";
  // TVC:VIX = TradingView's own VIX feed (CBOE:VIX unavailable in free embed)
  if (s === "VIX" || l.includes("VIX")) return "TVC:VIX";
  // TVC:DXY = TradingView's own DXY index feed
  if (s === "DXY" || l.includes("DXY") || l.includes("DOLLAR")) return "TVC:DXY";
  return s;
}

// ── TradingView Advanced Chart Widget (injected via script) ───────────────────
function TVChartWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    // TradingView requires an inner widget div for the chart to render into
    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "America/New_York",
      theme: "dark",
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      enabled_features: ["use_localstorage_for_settings","study_templates","header_indicators","header_compare","header_undo_redo","header_screenshot","header_chart_type","header_settings","header_resolutions","header_fullscreen_button","left_toolbar","drawing_templates"],
      disabled_features: ["volume_force_overlay","create_volume_indicator_by_default"],
      timeframes: [
        {text:"1m",resolution:"1"},{text:"15m",resolution:"15"},{text:"30m",resolution:"30"},
        {text:"1h",resolution:"60"},{text:"4h",resolution:"240"},{text:"1d",resolution:"D"},{text:"1w",resolution:"W"},
      ],
    });
    container.appendChild(script);
    return () => { container.innerHTML = ""; };
  }, [symbol]);
  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

function MacroCard({ card, history, onClick, compact }: { card: HomeMacroCard; history?: number[]; onClick?: () => void; compact?: boolean }) {
  const up = (card.change_pct ?? 0) >= 0;
  const neutral = card.change_pct === null || card.change_pct === 0;
  const chartData = (history && history.length > 1)
    ? history.map((v, i) => ({ i, v }))
    : null;
  const lineColor = neutral ? "#6b7280" : up ? "#34d399" : "#f87171";
  const fillId = `macro-fill-${card.symbol}`;
  const isRate = card.kind === "rate";

  const priceStr = card.price == null
    ? "—"
    : isRate
      ? card.price.toFixed(2)
      : fmtNum(card.price, 2);

  let changeStr = "0.00%";
  if (card.change_pct == null) {
    changeStr = isRate ? "0 bps" : "0.00%";
  } else if (isRate) {
    const bps = Math.round(card.change_pct * 100);
    changeStr = `${bps >= 0 ? "+" : ""}${bps} bps`;
  } else {
    changeStr = `${card.change_pct >= 0 ? "+" : ""}${card.change_pct.toFixed(2)}%`;
  }

  if (compact) {
    return (
      <GlassCard
        className="flex flex-col overflow-hidden cursor-pointer hover:border-white/20 transition-colors shrink-0"
        style={{ minWidth: 88 }}
        onClick={onClick}
      >
        <div className="px-2.5 pt-2 pb-0.5">
          <div className="text-[10px] font-medium text-white/70 leading-tight truncate">{card.label}</div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className="text-[11px] font-semibold text-white/90 tabular-nums">{priceStr}</span>
            <span className={`text-[10px] font-medium tabular-nums ${neutral ? "text-white/40" : up ? "text-emerald-400" : "text-rose-400"}`}>
              {changeStr}
            </span>
          </div>
        </div>
        <div className="h-[28px] w-full mt-auto">
          {chartData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 1, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={lineColor} strokeWidth={1.2}
                  fill={`url(#${fillId})`} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center px-2.5">
              <div className="w-full h-px bg-white/10" />
            </div>
          )}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      className="flex flex-col overflow-hidden cursor-pointer hover:border-white/20 transition-colors"
      onClick={onClick}
    >
      <div className="px-3 pt-3 pb-1">
        <div className="text-[13px] font-medium text-white/85 leading-tight">{card.label}</div>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[13px] font-semibold text-white/90">{priceStr}</span>
          <span className={`flex items-center gap-0.5 text-[11px] font-medium ${neutral ? "text-white/40" : up ? "text-emerald-400" : "text-rose-400"}`}>
            {!neutral && (up
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />
            )}
            {changeStr}
          </span>
          <span className="text-[10px] text-white/30">1D</span>
        </div>
      </div>
      <div className="h-[44px] w-full mt-auto">
        {chartData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={lineColor}
                strokeWidth={1.5}
                fill={`url(#${fillId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center px-3">
            <div className="w-full h-px bg-white/10" />
          </div>
        )}
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
function SubThemeRow({ item, onSymbolClick }: { item: HomeSubThemeItem; onSymbolClick?: (sym: string) => void }) {
  const chg = item.avg_change_1d;
  const breadth = item.breadth_score ?? 0;
  const breadthColor =
    breadth >= 80 ? "text-emerald-300" :
    breadth >= 50 ? "text-amber-300"   : "text-rose-300";
  const syms = item.leader_symbols || [];
  return (
    <div className="px-2 py-2.5 rounded-md hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0">
      {/* Row 1: theme name + breadth + 1D% */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-medium text-white/90 flex-1 min-w-0 truncate">{item.sub_theme}</span>
        <div className="flex items-center gap-3 shrink-0">
          {breadth > 0 && (
            <span className={`text-xs font-medium ${breadthColor}`}>{breadth.toFixed(0)}%</span>
          )}
          <span className={`text-sm font-semibold tabular-nums ${pctColor(chg)}`}>{fmtPct(chg)}</span>
        </div>
      </div>
      {/* Row 2: horizontally scrollable ticker chips */}
      {syms.length > 0 && (
        <div
          className="flex gap-1.5 overflow-x-auto pb-0.5 mb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {syms.map(sym => (
            <span
              key={sym}
              className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-white/70 font-mono cursor-pointer hover:bg-white/[0.10] hover:text-white/95 transition-colors shrink-0"
              onClick={() => onSymbolClick?.(sym)}
            >
              {sym}
            </span>
          ))}
        </div>
      )}
      {/* Row 3: description */}
      {item.pattern_summary && (
        <div className="text-[11px] text-white/45 leading-snug">{item.pattern_summary}</div>
      )}
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
  items, loading, title, icon: Icon, accent, status, limit = 999, scrollable = false, viewMore, onRowClick,
}: {
  items: HomeSnapshotItem[] | undefined;
  loading: boolean;
  title: string;
  icon: React.ElementType;
  accent: string;
  status?: string;
  limit?: number;
  scrollable?: boolean;
  viewMore?: string;
  onRowClick?: (symbol: string) => void;
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
      <SectionHeader icon={Icon} title={title} accent={accent} viewMore={viewMore} />
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
            <div key={row.symbol} className="grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => onRowClick?.(row.symbol)}>
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
  flows, status, loading, onTickerClick, viewMore,
}: {
  flows: HomeUnusualOptionsFlowItem[] | undefined;
  status?: string;
  loading: boolean;
  onTickerClick?: (symbol: string) => void;
  viewMore?: string;
}) {
  const hasResults     = (flows?.length ?? 0) > 0;
  // Statuses where the scanner hasn't produced valid data yet.
  // Covers both section_status values AND unusual_options_meta.data_state values.
  const NOT_READY_STATUSES = new Set([
    "precompute_pending",   // section_status legacy
    "unavailable",          // section_status — backend error / not configured
    "warming",              // section_status / data_state
    "warmup",               // section_status alias
    "error",                // section_status
    "no_data_yet",          // data_state — home fast cache hasn't run yet
    "none",                 // data_state source="none"
    "",                     // any unknown/empty
  ]);
  const isNotReady     = !hasResults && (!status || NOT_READY_STATUSES.has(status));
  const isBgRefreshing = status === "refresh_in_progress" || status === "stale" || status === "stale_but_available";
  // Live / ok statuses — covers both old section_status and new data_state values
  const isFastCache    = status === "ok_fast_cache" || status === "live_ok";
  const isOk           = status === "ok" || isFastCache;
  // Only show true-zero message when scan is done and explicitly found nothing.
  // true_zero_results falls through isOk, so we broaden the condition:
  // not loading + no results + not refreshing/warming = show zero message.
  const isTrueZero     = !loading && !hasResults && !isBgRefreshing && !isNotReady;

  return (
    <GlassCard className="p-4">
      <SectionHeader
        icon={Zap}
        title="Unusual Options Flows"
        accent={hasResults ? `${flows!.length} signals` : isNotReady ? "live screening" : "options screening"}
        viewMore={viewMore}
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
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="text-xs font-semibold text-white/90 shrink-0">{f.symbol}</span>
              {(f.primary_signal || f.flow_signal || f.signal) && (
                <Badge variant="outline" className="h-4 px-1 text-[9px] border-indigo-500/30 text-indigo-300 shrink-0">
                  {f.primary_signal || f.flow_signal || f.signal}
                </Badge>
              )}
              {f.asset_type && (
                <Badge variant="outline" className="h-4 px-1 text-[9px] border-white/10 text-white/40 shrink-0">
                  {f.asset_type}
                </Badge>
              )}
              {f.market_cap_bucket && (
                <Badge variant="outline" className="h-4 px-1 text-[9px] border-white/10 text-white/35 shrink-0">
                  {f.market_cap_bucket}
                </Badge>
              )}
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
// Strip prefixes like "cash:", "perp:", "xyz:" that the backend sometimes includes
const cleanHLSymbol = (s: string): string => {
  const stripped = s.includes(":") ? (s.split(":").pop() ?? s) : s;
  return stripped.replace(/-PERP$/i, "").toUpperCase();
};

const OI_REGIME_CLR: Record<string, string> = {
  "Fresh Longs":      "text-emerald-400",
  "Fresh Shorts":     "text-rose-400",
  "Short Covering":   "text-amber-400",
  "Long Liquidation": "text-orange-400",
};

function HLTopSignals({ signals, loading, viewMore, onTickerClick }: { signals: HLAdvSigs | undefined; loading: boolean; viewMore?: string; onTickerClick?: (sym: string) => void }) {
  const rsLeaders   = (signals?.relative_strength_leaders || []).slice(0, 5);
  const oiShifts    = (signals?.oi_regime_shift || []).slice(0, 5);
  const marketRegime = signals?.market_regime ?? null;

  const colHdr  = "text-[9px] uppercase tracking-widest text-white/30 font-medium select-none";
  const numCell = "text-xs font-mono tabular-nums text-right";

  return (
    <GlassCard className="p-4">
      <SectionHeader icon={Activity} title="Hyperliquid Top Signals" accent="Perps · live" viewMore={viewMore} />

      {/* ── Market Regime strip ── */}
      {!loading && marketRegime && (
        <div className="flex items-center gap-2 mt-2 mb-1 px-2 py-1.5 rounded bg-white/[0.03] border border-white/[0.06]">
          <span className="text-[9px] uppercase tracking-widest text-white/30 font-medium select-none shrink-0">Market Regime</span>
          <span className="text-xs font-bold text-white/90 tabular-nums">{marketRegime}</span>
        </div>
      )}

      {loading && Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-7 my-1 rounded bg-white/[0.04]" />
      ))}

      {!loading && !signals && (
        <div className="text-xs text-white/40 py-4 text-center">Signals unavailable.</div>
      )}

      {/* ── RS Leaders ── */}
      {!loading && rsLeaders.length > 0 && (
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wider text-white/35 mb-2 px-1">Relative Strength Leaders</div>
          {/* Header row */}
          <div className="grid grid-cols-[72px_1fr_1fr_1fr_48px] gap-x-2 px-2 pb-1.5 border-b border-white/[0.06]">
            <span className={colHdr}>Ticker</span>
            <span className={`${colHdr} text-right`}>1H</span>
            <span className={`${colHdr} text-right`}>4H</span>
            <span className={`${colHdr} text-right`}>24H</span>
            <span className={`${colHdr} text-right`}>RS</span>
          </div>
          {rsLeaders.map((r) => (
            <div key={r.symbol} className="grid grid-cols-[72px_1fr_1fr_1fr_48px] gap-x-2 px-2 py-1.5 items-center rounded hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0 cursor-pointer" onClick={() => onTickerClick?.(cleanHLSymbol(r.symbol))}>
              <span className="text-xs font-bold text-white/90 truncate">{cleanHLSymbol(r.symbol)}</span>
              <span className={`${numCell} ${pctColor(r.return_1h)}`}>{fmtPct(r.return_1h, 2)}</span>
              <span className={`${numCell} ${pctColor(r.return_4h)}`}>{fmtPct(r.return_4h, 2)}</span>
              <span className={`${numCell} ${pctColor(r.return_24h)}`}>{fmtPct(r.return_24h, 2)}</span>
              <span className={`${numCell} text-white/45`}>{r.rs_score.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── OI Regime Shifts ── */}
      {!loading && oiShifts.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-white/35 mb-2 px-1">OI Regime Shifts</div>
          {/* Header row */}
          <div className="grid grid-cols-[72px_1fr_60px_60px] gap-x-2 px-2 pb-1.5 border-b border-white/[0.06]">
            <span className={colHdr}>Ticker</span>
            <span className={colHdr}>Regime</span>
            <span className={`${colHdr} text-right`}>OI 1H</span>
            <span className={`${colHdr} text-right`}>Px 24H</span>
          </div>
          {oiShifts.map((r) => (
            <div key={r.symbol} className="grid grid-cols-[72px_1fr_60px_60px] gap-x-2 px-2 py-1.5 items-center rounded hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0 cursor-pointer" onClick={() => onTickerClick?.(cleanHLSymbol(r.symbol))}>
              <span className="text-xs font-bold text-white/90 truncate">{cleanHLSymbol(r.symbol)}</span>
              <span className={`text-[10px] font-semibold truncate ${OI_REGIME_CLR[r.regime] ?? "text-white/50"}`}>
                {r.regime}
              </span>
              <span className={`${numCell} ${r.oi_change_1h_pct != null ? pctColor(r.oi_change_1h_pct) : "text-white/25"}`}>
                {r.oi_change_1h_pct != null ? fmtPct(r.oi_change_1h_pct, 1) : "—"}
              </span>
              <span className={`${numCell} ${r.price_change_24h_pct != null ? pctColor(r.price_change_24h_pct) : "text-white/25"}`}>
                {r.price_change_24h_pct != null ? fmtPct(r.price_change_24h_pct, 1) : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ── Ticker info popup ─────────────────────────────────────────────────────
function TickerInfoPopup({
  symbol, assetType, moverPrice, moverChangePct, onClose, data,
}: {
  symbol: string;
  assetType?: string;
  moverPrice?: number | null;
  moverChangePct?: number | null;
  onClose: () => void;
  data: HomeDashboardPayload | undefined;
}) {
  const snapshot = [
    ...(data?.portfolio_snapshot || []),
    ...(data?.watchlist_snapshot || []),
  ].find(s => s.symbol === symbol);

  const flow = (data?.unusual_options_flows || []).find(f => f.symbol === symbol);

  const xTicker = (data?.trending_on_x?.top_tickers || []).find(t => t.symbol === symbol);

  const price     = snapshot?.current_price ?? moverPrice ?? null;
  const changePct = snapshot?.change_1d_pct  ?? moverChangePct ?? null;
  const signal    = snapshot?.signal_label   || flow?.signal || null;

  const tvSymbol = resolveTVSymbolUtil(symbol, snapshot);
  const tvSrc = `https://s.tradingview.com/embed-widget/advanced-chart/?locale=en&width=100%25&height=100%25&interval=D&range=3M&style=1&toolbar_bg=0a0a0a&enable_publishing=false&withdateranges=true&hide_side_toolbar=false&allow_symbol_change=false&calendar=false&studies=%5B%5D&theme=dark&timezone=America%2FNew_York&hide_top_toolbar=false&disabled_features=%5B%22volume_force_overlay%22%2C%22create_volume_indicator_by_default%22%5D&enabled_features=%5B%22use_localstorage_for_settings%22%2C%22study_templates%22%2C%22header_indicators%22%2C%22header_compare%22%2C%22header_undo_redo%22%2C%22header_screenshot%22%2C%22header_chart_type%22%2C%22header_settings%22%2C%22header_resolutions%22%2C%22header_fullscreen_button%22%2C%22left_toolbar%22%2C%22drawing_templates%22%5D&symbol=${encodeURIComponent(tvSymbol)}`;

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
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
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

// ─── Home Top Catalysts — local types and helpers ────────────────────
// Safe typed contract for the Catalyst cards returned by
// /api/home/top-catalysts.  No title‑based macro classification.

type HomeSignalTier = "critical" | "major" | "secondary" | "context";

interface HomeCatalystChild {
  title?: string;
  signal_tier?: HomeSignalTier;
  signal_reason?: string;
  date_label?: string;
  start_date?: string;
  [k: string]: unknown;
}

interface HomeCatalystCard {
  id?: string;
  type?: string;
  category?: string;
  title?: string;
  subtitle?: string;
  date_label?: string;
  start_date?: string;
  end_date?: string;
  impact?: string;
  urgency?: string;
  reason?: string;
  event_count?: number;
  hidden_count?: number;
  children?: HomeCatalystChild[];
  symbol?: string;
  options_activity_strength?: number | string;
  sector_alignment_strength?: number | string;
  watchlist_boost?: boolean;
  signal_tier?: HomeSignalTier;
  signal_reason?: string;
  event_family?: string;
  [k: string]: unknown;
}

type WeekRiskLevel = "Critical" | "Elevated" | "Normal" | "Quiet";

const WEEK_RISK_META: Record<WeekRiskLevel, { label: string; cls: string }> = {
  Critical:  { label: "Critical macro week",  cls: "text-rose-300 bg-rose-500/15 border-rose-500/30" },
  Elevated:  { label: "Elevated macro week",  cls: "text-orange-300 bg-orange-500/15 border-orange-500/30" },
  Normal:    { label: "Normal macro week",    cls: "text-white/50 bg-white/5 border-white/15" },
  Quiet:     { label: "Quiet macro week",     cls: "text-white/30 bg-white/[0.03] border-white/10" },
};

const HOME_TIER_ORDER: Record<HomeSignalTier, number> = {
  critical: 0, major: 1, secondary: 2, context: 3,
};

function homeEffectiveTier(card: HomeCatalystCard): HomeSignalTier {
  if (card.signal_tier && HOME_TIER_ORDER[card.signal_tier] !== undefined) return card.signal_tier;
  if (Array.isArray(card.children)) {
    let best: HomeSignalTier = "context";
    for (const ch of card.children) {
      if (ch.signal_tier && HOME_TIER_ORDER[ch.signal_tier] < HOME_TIER_ORDER[best]) best = ch.signal_tier;
    }
    if (best !== "context") return best;
  }
  const imp = String(card.impact ?? "").toLowerCase();
  const urg = String(card.urgency ?? "").toLowerCase();
  if (imp === "high" && urg === "high") return "major";
  if (imp === "high") return "major";
  if (urg === "important") return "secondary";
  return "context";
}

function _normStructured(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, "_")
    .replace(/_+/g, "_");
}

const MACRO_TYPES = new Set(["macro", "macro_group"]);

const MACRO_CATEGORIES = new Set([
  "fed_rates",
  "inflation",
  "labor",
  "growth",
  "treasury",
  "consumer",
  "housing",
  "macro",
  "economic_release",
  "economic_releases",
  "treasury_macro",
]);

function homeIsMacroCatalyst(card: HomeCatalystCard): boolean {
  const type = _normStructured(card.type);
  const category = _normStructured(card.category);
  return MACRO_TYPES.has(type) || MACRO_CATEGORIES.has(category);
}

function homeWeekRisk(catalysts: HomeCatalystCard[]): WeekRiskLevel {
  let hasCritical = false, hasMajor = false, hasSecondary = false;
  for (const c of catalysts) {
    if (!homeIsMacroCatalyst(c)) continue;
    const t = homeEffectiveTier(c);
    if (t === "critical") hasCritical = true;
    else if (t === "major") hasMajor = true;
    else if (t === "secondary") hasSecondary = true;
  }
  if (hasCritical) return "Critical";
  if (hasMajor) return "Elevated";
  if (hasSecondary) return "Normal";
  return "Quiet";
}

function homePickLead(catalysts: HomeCatalystCard[]): { lead: HomeCatalystCard | null; rest: HomeCatalystCard[] } {
  if (catalysts.length === 0) return { lead: null, rest: [] };
  const sorted = [...catalysts].sort((a, b) => {
    const ta = HOME_TIER_ORDER[homeEffectiveTier(a)];
    const tb = HOME_TIER_ORDER[homeEffectiveTier(b)];
    if (ta !== tb) return ta - tb;
    const sa = a.start_date ?? "";
    const sb = b.start_date ?? "";
    if (sa && sb) return sa.localeCompare(sb);
    if (sa && !sb) return -1;
    if (!sa && sb) return 1;
    return 0;
  });
  return { lead: sorted[0], rest: sorted.slice(1) };
}

function homeBestReason(card: HomeCatalystCard): string | null {
  if (card.signal_reason) return card.signal_reason;
  if (Array.isArray(card.children)) {
    let bestChild: HomeCatalystChild | null = null;
    let bestTier = 99;
    for (const ch of card.children) {
      const t = ch.signal_tier && HOME_TIER_ORDER[ch.signal_tier] !== undefined ? HOME_TIER_ORDER[ch.signal_tier] : 99;
      if (ch.signal_reason && t < bestTier) { bestChild = ch; bestTier = t; }
    }
    if (bestChild?.signal_reason) return bestChild.signal_reason;
  }
  if (card.reason) return card.reason;
  if (card.subtitle) return card.subtitle;
  return null;
}

function homeChildSummary(children: HomeCatalystChild[]): { names: string[]; extra: number } {
  const sorted = [...children].sort((a, b) => {
    const ta = a.signal_tier && HOME_TIER_ORDER[a.signal_tier] !== undefined ? HOME_TIER_ORDER[a.signal_tier] : 99;
    const tb = b.signal_tier && HOME_TIER_ORDER[b.signal_tier] !== undefined ? HOME_TIER_ORDER[b.signal_tier] : 99;
    if (ta !== tb) return ta - tb;
    const sa = a.start_date ?? "";
    const sb = b.start_date ?? "";
    if (sa && sb) return sa.localeCompare(sb);
    return 0;
  });
  const names = sorted.slice(0, 3).map(ch => String(ch.title ?? "").trim()).filter(Boolean);
  const extra = children.length - names.length;
  return { names, extra };
}

function homeTierLabelCls(tier: HomeSignalTier): string {
  switch (tier) {
    case "critical": return "text-rose-300 bg-rose-500/15 border-rose-500/30";
    case "major":    return "text-orange-300 bg-orange-500/15 border-orange-500/30";
    case "secondary": return "text-white/50 bg-white/5 border-white/15";
    case "context":  return "text-white/30 bg-white/[0.03] border-white/10";
  }
}

function homeCardBorderCls(tier: HomeSignalTier, isLead: boolean): string {
  const base = isLead && tier === "critical" ? "border-rose-500/50" :
    isLead && tier === "major" ? "border-orange-500/40" :
    tier === "critical" ? "border-rose-500/30" :
    tier === "major" ? "border-orange-500/25" :
    tier === "context" ? "border-white/[0.03]" :
    "border-white/[0.05]";
  return base;
}

function homeCardBgCls(tier: HomeSignalTier, isLead: boolean): string {
  if (isLead && tier === "critical") return "bg-rose-500/[0.06]";
  if (isLead && tier === "major") return "bg-orange-500/[0.04]";
  if (tier === "critical") return "bg-rose-500/[0.03]";
  if (tier === "context") return "bg-transparent";
  return "bg-white/[0.01]";
}

// ───────────────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [tickerPopup, setTickerPopup] = useState<{ symbol: string; assetType?: string; price?: number | null; changePct?: number | null } | null>(null);
  const openTicker = (symbol: string, assetType?: string, price?: number | null, changePct?: number | null) =>
    setTickerPopup({ symbol, assetType, price, changePct });
  const [moverCategory, setMoverCategory] = useState<"all" | "stocks" | "commodities" | "crypto" | "etfs">("stocks");

  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(HOME_SECTIONS_KEY);
      if (!saved) return [...HOME_DEFAULT_SECTIONS];
      const parsed = JSON.parse(saved) as string[];
      if (!Array.isArray(parsed) || parsed.length < HOME_DEFAULT_SECTIONS.length) return [...HOME_DEFAULT_SECTIONS];
      return parsed;
    } catch { return [...HOME_DEFAULT_SECTIONS]; }
  });
  const homeSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const handleSectionDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSectionOrder(prev => {
      const oldIdx = prev.indexOf(String(active.id));
      const newIdx = prev.indexOf(String(over.id));
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = arrayMove(prev, oldIdx, newIdx);
      try { localStorage.setItem(HOME_SECTIONS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);
  const moverViewMore =
    moverCategory === "crypto"      ? "/app/crypto-stocks" :
    moverCategory === "commodities" ? "/app/commodities"   :
    "/app/stocks/screening";
  const [macroChartCard, setMacroChartCard] = useState<HomeMacroCard | null>(null);
  const [themeSortKey, setThemeSortKey] = useState<"gain" | "breadth" | "name">("gain");

  // Live clock — updates every 30s so greeting + time stay accurate to the user's local TZ
  const [localNow, setLocalNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setLocalNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);


  // Home aggregator — primary query. The Express proxy composes:
  // backend /api/home/dashboard + news (NEWS_CACHE) + crypto FG (CMC cache).
  const { data, isLoading, isError } = useQuery<HomeDashboardPayload>({
    queryKey: ["/api/home/dashboard"],
    staleTime: 60_000,
    // Poll every 30 s while options flows haven't appeared yet.
    // Hard cap at 3 background polls to avoid hammering the slow FastAPI backend
    // indefinitely when options flows data is unavailable (no_data_yet state).
    refetchInterval: (query) => {
      const d = query.state.data as HomeDashboardPayload | undefined;
      if ((query.state.dataUpdateCount ?? 0) >= 3) return false;
      const flowStatus = d?.section_status?.unusual_options_flows;
      const dataState  = d?.unusual_options_meta?.data_state;
      const notReady = !d?.unusual_options_flows?.length ||
        flowStatus === "precompute_pending" || flowStatus === "no_data_yet" ||
        dataState === "no_data_yet" || dataState === "none";
      return notReady && !query.state.error ? 30_000 : false;
    },
  });

  // Theme Universe — same cache key as the Themes page ("themes-unified", "themes")
  // so if the user has visited /app/stocks/sectors the data is already warm.
  // Filtered client-side to proxy_type === "custom" for the Theme Performance card.
  const { data: themesRS, isLoading: themesRSLoading } = useQuery<{ themes: any[] }>({
    queryKey: ["themes-unified", "themes"],
    queryFn: () =>
      fetch("/api/themes/relative-strength?timeframe=1D&classification=all")
        .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
    staleTime: 5 * 60_000,
    retry: 1,
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

  // Category movers — shared between Top Movers + Top Losers cards.
  // Uses the new /api/home/movers?category= backend endpoint (normalized to HomeMoverRow shape).
  const { data: categoryMovers, isLoading: categoryMoversLoading } = useQuery<{
    gainers: HomeMoverRow[];
    losers:  HomeMoverRow[];
    category: string;
  }>({
    queryKey: ["/api/home/movers", moverCategory],
    queryFn: async () => {
      const r = await fetch(`/api/home/movers?category=${moverCategory}`);
      if (!r.ok) throw new Error(`Movers ${r.status}`);
      return r.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Home Risk Intelligence — single source for Should I Trade, Risk Cluster banner,
  // Upcoming Economic Events, and data freshness. No direct FMP/Calendar/Macro calls.
  const { data: riskIntel, isLoading: riskIntelLoading, isError: riskIntelError } = useQuery<any>({
    queryKey: ["/api/home/risk-intelligence"],
    queryFn: async () => {
      const r = await fetch("/api/home/risk-intelligence");
      if (!r.ok) throw new Error(`Risk intel ${r.status}`);
      return r.json();
    },
    staleTime: 90_000,
    retry: 2,
    retryDelay: 1500,
    refetchOnWindowFocus: false,
  });

  // Safe payload unwrapper: handles flat response (normal) and wrapped response (.data/.payload/.result).
  // This prevents the card from breaking if the Express proxy ever nests the FastAPI body.
  const riskIntelPayload: any =
    riskIntel?.upcoming_economic_events   ? riskIntel :
    riskIntel?.trade_decision             ? riskIntel :
    riskIntel?.data?.upcoming_economic_events   ? riskIntel.data :
    riskIntel?.data?.trade_decision             ? riskIntel.data :
    riskIntel?.payload?.upcoming_economic_events ? riskIntel.payload :
    riskIntel?.result?.upcoming_economic_events  ? riskIntel.result :
    riskIntel ?? null;

  // Top Catalysts This Week — replaces the old Economic Events section
  const { data: topCatalysts, isLoading: topCatalystsLoading, isError: topCatalystsError } = useQuery<any>({
    queryKey: ["/api/home/top-catalysts"],
    queryFn: async () => {
      const r = await fetch("/api/home/top-catalysts");
      if (!r.ok) throw new Error(`Top catalysts ${r.status}`);
      return r.json();
    },
    staleTime: 5 * 60_000,
    retry: 2,
    retryDelay: 1500,
    refetchOnWindowFocus: false,
  });

  // Top Equity Signals — from Prophetik investor overview
  const { data: equityOverview } = useQuery<any>({
    queryKey: ["/api/predict/investor/overview"],
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const topEquitySignals: any[] = equityOverview?.top_equity_signals?.slice(0, 5) ?? [];

  // Live Prediction Odds — from /api/predict/odds/live
  const { data: liveOddsData } = useQuery<any>({
    queryKey: ["/api/predict/odds/live"],
    staleTime: 2 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isOddsWarming: boolean = !liveOddsData || liveOddsData.status === "warming" || (!liveOddsData.live_count && !liveOddsData.odds?.length);
  const liveOddsRows: any[] = (() => {
    const all: any[] = liveOddsData?.odds ?? [];
    return all
      .filter((o: any) => o.dashboard_enabled !== false)
      .sort((a: any, b: any) => {
        const pa = a.priority ?? 99, pb = b.priority ?? 99;
        if (pa !== pb) return pa - pb;
        return Math.abs(b.delta_24h_pp ?? 0) - Math.abs(a.delta_24h_pp ?? 0);
      })
      .slice(0, 8);
  })();

  // Home-page compact equity signal renderer helpers
  const homeResolveOdds = (pdm: any): string => {
    const raw = pdm?.current_odds_label ?? pdm?.current_probability_pct ?? pdm?.current_odds ??
      (pdm?.current_probability != null ? pdm.current_probability : null) ??
      pdm?.yes_pct ?? pdm?.probability;
    if (raw == null) return "";
    const n = typeof raw === "string" ? parseFloat(raw) : raw;
    if (isNaN(n)) return String(raw);
    const pct = n >= 0 && n <= 1 ? n * 100 : n;
    return `${pct.toFixed(1)}%`;
  };
  const homeFmtPP = (v?: number | null): string => {
    if (v == null) return "";
    return `${v >= 0 ? "+" : ""}${v.toFixed(1)}pp`;
  };

  // Extra macro cards (Dow Jones + Bitcoin) fetched client-side
  const { data: extraCards } = useQuery<HomeMacroCard[]>({
    queryKey: ["/api/macro/extra-cards"],
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Sparkline history for all macro card symbols
  const { data: sparklines } = useQuery<Record<string, number[]>>({
    queryKey: ["/api/macro/sparklines"],
    queryFn: async () => {
      const r = await fetch("/api/macro/sparklines?symbols=SPX,DJI,NDX,BTC,TNX,VIX,DXY");
      if (!r.ok) return {};
      return r.json();
    },
    staleTime: 5 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // ── Page context for chatbot ──────────────────────────────────────────────
  const _homeCtx = (() => {
    const parts = ['[Page: Market Dashboard — Home]'];
    const hc = (data as any)?.highlighted_companies;
    if (Array.isArray(hc) && hc.length) parts.push(`Featured stocks: ${hc.slice(0,8).map((c:any)=>c.ticker||c.symbol).filter(Boolean).join(', ')}`);
    const themes = (data as any)?.theme_performance || (data as any)?.themes;
    if (Array.isArray(themes) && themes.length) parts.push(`Top themes: ${themes.slice(0,5).map((t:any)=>t.name||t.theme_name||t.theme).filter(Boolean).join(', ')}`);
    const fg = (data as any)?.fear_greed;
    if (fg) parts.push(`Market sentiment: ${fg.label||fg.value||fg.classification||''}`);
    const movers = (data as any)?.movers;
    if (movers) {
      const g = (movers.gainers||[]).slice(0,5).map((m:any)=>m.ticker||m.symbol||m.name).filter(Boolean);
      const l = (movers.losers||[]).slice(0,5).map((m:any)=>m.ticker||m.symbol||m.name).filter(Boolean);
      if (g.length) parts.push(`Top gainers: ${g.join(', ')}`);
      if (l.length) parts.push(`Top losers: ${l.join(', ')}`);
    }
    return parts.join('\n');
  })();
  useSetPageContext(_homeCtx, [data]);

  // Map a card's symbol/label to a sparkline key
  const cardSparklineKey = (card: HomeMacroCard): string | null => {
    const s = card.symbol?.toUpperCase();
    const l = (card.label || "").toUpperCase();
    if (s === "SPX" || s === "SPY" || l.includes("S&P")) return "SPX";
    if (s === "DJI" || l.includes("DOW")) return "DJI";
    if (s === "NDX" || s === "QQQ" || l.includes("NASDAQ")) return "NDX";
    if (s === "BTC" || l.includes("BITCOIN")) return "BTC";
    if (s === "TNX" || s === "^TNX" || s === "US10Y" || l.includes("10Y") || l.includes("YIELD")) return "TNX";
    if (s === "VIX" || l.includes("VIX")) return "VIX";
    if (s === "DXY" || l.includes("DXY") || l.includes("DOLLAR")) return "DXY";
    return null;
  };

  // Merged macro cards: insert DJI after S&P 500 and BTC after NASDAQ 100
  const allMacroCards: HomeMacroCard[] = (() => {
    const base: HomeMacroCard[] = data?.macro_cards ?? [];
    const dji = (extraCards ?? []).find(c => c.symbol === "DJI");
    const btc = (extraCards ?? []).find(c => c.symbol === "BTC");
    const merged: HomeMacroCard[] = [];
    let djiAdded = false;
    let btcAdded = false;
    for (const card of base) {
      merged.push(card);
      const l = (card.label || "").toUpperCase();
      const s = (card.symbol || "").toUpperCase();
      if (!djiAdded && dji && (l.includes("S&P") || s === "SPX" || s === "SPY")) {
        merged.push(dji);
        djiAdded = true;
      }
      if (!btcAdded && btc && (l.includes("NASDAQ") || s === "NDX" || s === "QQQ")) {
        merged.push(btc);
        btcAdded = true;
      }
    }
    return merged;
  })();

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

  const marketLabel = data?.greeting?.market?.label || "Markets";

  // Greeting and time derived from the user's local browser clock — never server ET
  const localHour = localNow.getHours();
  const localGreeting =
    localHour >= 5  && localHour < 12 ? "Good morning"   :
    localHour >= 12 && localHour < 17 ? "Good afternoon" :
    localHour >= 17 && localHour < 21 ? "Good evening"   :
    "Working late";
  const localDayStr  = localNow.toLocaleDateString("en-US", { weekday: "short" });
  const localTimeStr = localNow.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const localTzAbbr  = (() => {
    // Extract short timezone abbreviation, e.g. "CDT", "PST", "EST"
    const parts = Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(localNow);
    return parts.find(p => p.type === "timeZoneName")?.value ?? "";
  })();
  const localClockStr = `${localDayStr} ${localTimeStr}${localTzAbbr ? ` ${localTzAbbr}` : ""}`;

  return (
    <div className="home-page relative min-h-screen text-white" style={{ background: "#020202" }}>
      <div className="relative z-10 max-w-[1540px] mx-auto px-5 lg:px-8 pt-10 pb-6">
        {/* ── Header row: Greeting · Market Snapshot strip · Should I Trade ── */}
        <div className="flex items-center gap-4 mb-6 min-h-[64px]">

          {/* Left: greeting */}
          <div className="shrink-0">
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/35 mb-0.5">
              Caelyn Home
            </div>
            <h1 className="text-xl font-semibold text-white leading-tight">
              {localGreeting}.
            </h1>
            <div className="text-[11px] text-white/50 mt-0.5 flex items-center gap-1.5">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                  data?.greeting?.market?.status === "open"
                    ? "bg-emerald-400"
                    : data?.greeting?.market?.status === "pre_market" ||
                      data?.greeting?.market?.status === "after_hours"
                    ? "bg-amber-400"
                    : "bg-white/30"
                }`}
              />
              {marketLabel} · {localClockStr}
              {data?.from_cache && (
                <span className="text-[9px] text-white/25">cached</span>
              )}
            </div>
          </div>

          {/* Thin divider */}
          <div className="self-stretch w-px bg-white/[0.07] shrink-0" />

          {/* Center: compact Market Snapshot strip */}
          <div className="flex-1 min-w-0">
            <div className="text-[8.5px] uppercase tracking-[0.18em] text-white/30 mb-1.5 px-0.5 flex items-center gap-2">
              Market Snapshot
              {riskIntelPayload?.data_freshness && (() => {
                const df = riskIntelPayload.data_freshness;
                const status = df.market_snapshot_status as string | undefined;
                const ageSec = df.market_snapshot_age_seconds as number | undefined;
                const label = ageSec != null && ageSec < 60 ? `${ageSec}s ago` : ageSec != null && ageSec < 3600 ? `${Math.round(ageSec / 60)}m ago` : null;
                const dot = status === 'live' ? 'bg-emerald-400' : status === 'cached' ? 'bg-amber-400' : 'bg-white/30';
                const text = status === 'live' ? 'text-emerald-400/70' : status === 'cached' ? 'text-amber-400/70' : 'text-white/25';
                return (
                  <span className={`flex items-center gap-1 text-[8px] lowercase normal-case tracking-normal font-normal ${text}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                    {status}{label ? ` · ${label}` : ''}
                  </span>
                );
              })()}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {isLoading &&
                Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-[60px] rounded-xl bg-white/[0.04] shrink-0" style={{ minWidth: 88 }} />
                ))}
              {!isLoading &&
                allMacroCards.map((c, i) => {
                  const key = cardSparklineKey(c);
                  const hist = key && sparklines ? sparklines[key] : undefined;
                  return (
                    <MacroCard
                      key={`${c.symbol}-${i}`}
                      card={c}
                      history={hist}
                      compact
                      onClick={() => setMacroChartCard(c)}
                    />
                  );
                })}
              {!isLoading && allMacroCards.length === 0 && (
                <div className="text-xs text-white/40 py-2">Macro data temporarily unavailable.</div>
              )}
            </div>
          </div>

          {/* Thin divider */}
          <div className="self-stretch w-px bg-white/[0.07] shrink-0" />

          {/* Right: Should I Trade? — powered by riskIntelPayload.trade_decision */}
          {(() => {
            const td = riskIntelPayload?.trade_decision;
            const decision: string | undefined = td?.label;
            const score: number | undefined = td?.score;
            const mode: string = td?.mode ?? 'swing';
            const hint: string | undefined = td?.position_size_hint;
            const oneLine: string | undefined = td?.one_line;
            const avoids: string[] = td?.avoid ?? [];
            const decisionColor = decision === 'YES' ? 'text-emerald-400' : decision === 'CAUTION' ? 'text-amber-400' : decision === 'NO' ? 'text-rose-400' : 'text-white/40';
            const borderColor = decision === 'YES' ? 'border-emerald-500/25' : decision === 'CAUTION' ? 'border-amber-500/25' : decision === 'NO' ? 'border-rose-500/25' : 'border-white/10';
            const bgColor = decision === 'YES' ? 'bg-emerald-500/[0.03]' : decision === 'CAUTION' ? 'bg-amber-500/[0.03]' : decision === 'NO' ? 'bg-rose-500/[0.03]' : 'bg-white/[0.02]';
            const scoreColor = score == null ? 'text-white/30' : score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : score >= 30 ? 'text-orange-400' : 'text-rose-400';
            return (
              <button
                onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); setLocation('/app/macro-terminal?tab=trade'); }}
                className={`flex flex-col justify-center rounded-xl border ${bgColor} hover:bg-white/[0.05] transition-all px-4 py-2.5 shrink-0 text-left ${borderColor}`}
                style={{ minWidth: 162 }}
              >
                <div className="text-[8.5px] uppercase tracking-widest text-white/30 mb-1">Should I Trade?</div>
                {!td ? (
                  <div className="text-base font-bold text-white/20">—</div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-base font-bold tabular-nums leading-none ${decisionColor}`}>{decision ?? '—'}</span>
                      {score != null && (
                        <span className={`text-[10px] font-semibold tabular-nums ${scoreColor}`}>{score.toFixed(1)}/100</span>
                      )}
                    </div>
                    {mode && <div className="text-[9px] text-white/35 mt-0.5">Mode: {mode}</div>}
                    {hint && <div className="text-[9px] text-white/40 truncate">{hint}</div>}
                    {oneLine && <div className="text-[9px] text-white/50 mt-0.5 line-clamp-2 leading-snug">{oneLine}</div>}
                    {avoids.length > 0 && (
                      <div className="text-[9px] text-rose-400/60 mt-1 line-clamp-1">Avoid: {avoids.slice(0, 2).join(', ')}</div>
                    )}
                  </>
                )}
                <div className="text-[8px] text-white/20 mt-1.5 flex items-center gap-0.5">{mode} mode <ChevronRight className="w-2.5 h-2.5" /></div>
              </button>
            );
          })()}
        </div>

        {/* ── Risk Cluster + Why Markets Are Moving — side by side when both present ── */}
        {(() => {
          const hasRiskCluster = !!riskIntelPayload?.risk_cluster?.active;
          const whyBullets: string[] = Array.isArray(riskIntelPayload?.why_market_is_moving)
            ? riskIntelPayload.why_market_is_moving
            : typeof riskIntelPayload?.why_market_is_moving === 'string'
              ? [riskIntelPayload.why_market_is_moving]
              : [];
          const hasWhyMarkets = whyBullets.length > 0;
          if (!hasRiskCluster && !hasWhyMarkets) return null;
          const gridCls = hasRiskCluster && hasWhyMarkets
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5'
            : 'mb-5';
          return (
            <div className={gridCls}>

        {/* ── Risk Cluster Alert Banner ─────────────────────────────────── */}
        {hasRiskCluster && (() => {
          const rc = riskIntelPayload.risk_cluster;
          const sev: string = rc.severity ?? '';
          const CHIP_CLS: Record<string, string> = {
            green:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
            yellow: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
            orange: 'text-orange-300 bg-orange-500/10 border-orange-500/25',
            red:    'text-rose-400 bg-rose-500/10 border-rose-500/25',
          };
          const bannerBg =
            sev === 'EXTREME'  ? 'bg-rose-950/70 border-rose-500/50' :
            sev === 'HIGH'     ? 'bg-orange-950/60 border-orange-500/40' :
            sev === 'ELEVATED' ? 'bg-amber-950/50 border-amber-500/30' :
                                 'bg-white/[0.03] border-white/10';
          const sevText =
            sev === 'EXTREME'  ? 'text-rose-300' :
            sev === 'HIGH'     ? 'text-orange-300' :
            sev === 'ELEVATED' ? 'text-amber-300' : 'text-white/50';
          const sevBadge =
            sev === 'EXTREME'  ? 'text-rose-300 border-rose-500/40 bg-rose-500/15' :
            sev === 'HIGH'     ? 'text-orange-300 border-orange-500/40 bg-orange-500/15' :
            sev === 'ELEVATED' ? 'text-amber-300 border-amber-500/40 bg-amber-500/15' :
                                 'text-white/40 border-white/10 bg-white/5';
          const triggers: any[] = rc.triggers ?? [];
          const activeTriggers = triggers.filter(t => t.status !== 'green');
          return (
            <div className={`rounded-xl border px-4 py-3 ${bannerBg}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${sevText}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${sevText}`}>
                    ⚠ RISK CLUSTER ACTIVE — {rc.headline ?? `${rc.trigger_count ?? activeTriggers.length} risk signals active`}
                  </div>
                  {activeTriggers.length > 0 && (
                    <div className="text-[10px] text-white/55 mb-2.5 leading-relaxed">
                      {activeTriggers.slice(0, 4).map((t: any) => t.message).filter(Boolean).join(' | ')}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {triggers.map((t: any, i: number) => (
                      <span key={i} className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded border leading-none ${CHIP_CLS[t.status] ?? 'text-white/40 bg-white/5 border-white/10'}`}>
                        {t.label} · {(t.status ?? '').toUpperCase()}
                      </span>
                    ))}
                  </div>
                  {riskIntelPayload?.trade_decision?.position_size_hint && (
                    <div className="text-[10px] text-white/35 mt-2">
                      Suggested posture: <span className="text-white/55">{riskIntelPayload.trade_decision.position_size_hint}</span>
                    </div>
                  )}
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border shrink-0 self-start ${sevBadge}`}>{sev}</span>
              </div>
            </div>
          );
        })()}

        {/* ── "Why Markets Are Moving" mini-summary (if present) ─────────── */}
        {hasWhyMarkets && (
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
            <div className="text-[9px] uppercase tracking-widest text-white/30 mb-2">Why Markets Are Moving</div>
            <ol className="space-y-1">
              {whyBullets.slice(0, 3).map((b, i) => (
                <li key={i} className="text-[11px] text-white/60 leading-snug flex gap-2">
                  <span className="text-white/25 shrink-0">{i + 1}.</span>
                  <span>{b}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

            </div>
          );
        })()}

        {/* TradingView chart popup modal */}
        <Dialog open={!!macroChartCard} onOpenChange={(open) => { if (!open) setMacroChartCard(null); }}>
          <DialogContent className="max-w-5xl w-[90vw] h-[80vh] p-0 bg-[#0d0e11] border-white/10 overflow-hidden">
            <VisuallyHidden.Root><DialogTitle>Chart</DialogTitle></VisuallyHidden.Root>
            {macroChartCard && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white/90">{macroChartCard.label}</span>
                    <span className="text-[10px] text-white/30 uppercase tracking-wider">{tvSymbolFor(macroChartCard)}</span>
                  </div>
                  <div className={`text-sm font-medium ${(macroChartCard.change_pct ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {macroChartCard.price != null ? (macroChartCard.kind === "rate" ? macroChartCard.price.toFixed(2) : fmtNum(macroChartCard.price, 2)) : "—"}
                    {macroChartCard.change_pct != null && (
                      <span className="ml-2 text-xs">
                        {macroChartCard.change_pct >= 0 ? "+" : ""}{macroChartCard.change_pct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <TVChartWidget key={tvSymbolFor(macroChartCard)} symbol={tvSymbolFor(macroChartCard)} />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Daily Alpha Board + Upcoming Economic Events — equal height columns, right 360px */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 mb-6">
          <div>
            <DailyAlphaBoard />
          </div>

          {/* ── Top Catalysts This Week card ── */}
          {(() => {
            const raw: any = topCatalysts;
            const rawCards: HomeCatalystCard[] = (
              Array.isArray(raw)              ? raw :
              Array.isArray(raw?.catalysts)   ? raw.catalysts :
              Array.isArray(raw?.items)       ? raw.items :
              Array.isArray(raw?.data)        ? raw.data : []
            );

            const catalystCards: HomeCatalystCard[] = rawCards
              .map((c: Record<string, unknown>) => ({
                id: String(c.id ?? ""),
                type: String(c.type ?? c.category ?? ""),
                category: String(c.category ?? ""),
                title: String(c.title ?? ""),
                subtitle: String(c.subtitle ?? ""),
                date_label: String(c.date_label ?? ""),
                start_date: String(c.start_date ?? c.window_start ?? ""),
                end_date: String(c.end_date ?? c.window_end ?? ""),
                impact: String(c.impact ?? ""),
                urgency: String(c.urgency ?? ""),
                reason: String(c.reason ?? ""),
                event_count: c.event_count != null ? Number(c.event_count) : undefined,
                hidden_count: c.hidden_count != null ? Number(c.hidden_count) : undefined,
                children: Array.isArray(c.children) ? c.children as HomeCatalystChild[] : undefined,
                symbol: String(c.symbol ?? ""),
                options_activity_strength: c.options_activity_strength,
                sector_alignment_strength: c.sector_alignment_strength,
                watchlist_boost: Boolean(c.watchlist_boost),
                signal_tier: c.signal_tier as HomeSignalTier | undefined,
                signal_reason: String(c.signal_reason ?? ""),
                event_family: String(c.event_family ?? ""),
              } as HomeCatalystCard))
              .filter((c: HomeCatalystCard) => c.title || c.symbol);

            const { lead, rest } = homePickLead(catalystCards);
            const weekRisk = catalystCards.length > 0 ? homeWeekRisk(catalystCards) : null;
            const riskMeta = weekRisk ? WEEK_RISK_META[weekRisk] : null;

            const typeBadge2 = (type: string | undefined, category: string | undefined) => {
              const t = String(type ?? category ?? '').toLowerCase().replace(/_/g, ' ');
              if (t.includes('earn'))                                  return { label: 'Earnings',  cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
              if (t.includes('ipo'))                                   return { label: 'IPO',       cls: 'text-purple-400  bg-purple-500/10  border-purple-500/30'  };
              if (t.includes('fed') || t.includes('rate'))             return { label: 'Fed/Rates', cls: 'text-rose-400    bg-rose-500/10    border-rose-500/30'    };
              if (t.includes('inflat') || t.includes('cpi') || t.includes('ppi')) return { label: 'Inflation', cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25' };
              if (t.includes('labor') || t.includes('jobs') || t.includes('employ')) return { label: 'Labor', cls: 'text-sky-400 bg-sky-500/10 border-sky-500/30' };
              if (t.includes('treasury') || t.includes('macro'))       return { label: 'Macro',     cls: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' };
              if (t.includes('split'))                                  return { label: 'Split',     cls: 'text-teal-400   bg-teal-500/10   border-teal-500/30'   };
              if (t.includes('div'))                                    return { label: 'Dividend',  cls: 'text-green-400  bg-green-500/10  border-green-500/30'  };
              return { label: String(type ?? category ?? 'Event').replace(/_/g, ' '), cls: 'text-white/45 bg-white/5 border-white/15' };
            };

            const dateRange2 = (c: HomeCatalystCard): string => {
              if (c.date_label) return c.date_label;
              const s = c.start_date;
              const e = c.end_date;
              if (!s) return '';
              try {
                const sd = new Date(String(s) + 'T00:00:00');
                if (isNaN(sd.getTime())) return String(s);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                if (!e || e === s) {
                  if (sd.getTime() === today.getTime()) return 'Today';
                  if (sd.getTime() === tomorrow.getTime()) return 'Tomorrow';
                  return sd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
                const ed = new Date(String(e) + 'T00:00:00');
                return `${sd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${ed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              } catch { return String(s); }
            };

            const renderCard = (c: HomeCatalystCard, idx: number, isLead: boolean) => {
              const tier = homeEffectiveTier(c);
              const badge = typeBadge2(c.type, c.category);
              const dl = dateRange2(c);
              const reason = homeBestReason(c) || undefined;
              const hasChildren = Array.isArray(c.children) && c.children.length > 0;
              const childCountAll = hasChildren ? c.children!.length : 0;
              const hiddenCount = c.hidden_count ?? 0;
              const groupedCount = hiddenCount > 0 ? hiddenCount : childCountAll;
              const showCount = groupedCount;
              const { names: childNames, extra: childExtra } = hasChildren ? homeChildSummary(c.children!) : { names: [], extra: 0 };

              const borderCls = homeCardBorderCls(tier, isLead);
              const bgCls = homeCardBgCls(tier, isLead);
              const tierLabelCls = homeTierLabelCls(tier);
              const muted = tier === "context" ? "opacity-60" : "";
              const leadExtra = isLead ? "border-l-2" : "";

              return (
                <div
                  key={c.id || `tc-${idx}`}
                  className={`flex items-start gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${borderCls} ${bgCls} ${muted} ${leadExtra}`}
                >
                  <div className="flex flex-col items-start gap-1 shrink-0 min-w-0">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase border leading-none ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className={`inline-flex items-center px-1 py-0.5 rounded text-[7px] font-semibold uppercase border leading-none ${tierLabelCls}`}>
                      {tier}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] leading-snug truncate ${isLead ? "font-bold text-white" : tier === "critical" ? "font-semibold text-white/95" : tier === "major" ? "font-semibold text-white/90" : tier === "context" ? "font-normal text-white/60" : "font-medium text-white/85"}`}>
                      {c.title || 'Untitled'}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {dl && <span className="text-[9px] text-white/35">{dl}</span>}
                      {c.subtitle && !reason && <span className="text-[9px] text-white/40 truncate max-w-[160px]">{c.subtitle}</span>}
                    </div>
                    {reason && (
                      <div className={`text-[9px] mt-0.5 leading-snug truncate ${isLead ? "text-white/40" : "text-white/25"}`}>{reason}</div>
                    )}
                    {showCount > 0 && (
                      <div className="text-[8px] text-white/20 mt-0.5">
                        {childNames.length > 0
                          ? `Includes ${childNames.join(", ")}${childExtra > 0 ? ` +${childExtra} more` : ""}`
                          : `Includes ${showCount} related release${showCount !== 1 ? "s" : ""}`}
                      </div>
                    )}
                    {isLead && c.watchlist_boost && (
                      <span className="text-[7px] text-blue-400/60 mt-0.5 inline-flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" /> On your watchlist
                      </span>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <GlassCard className="p-4 flex flex-col">
                <div className="mb-3 shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <SectionHeader icon={CalendarDays} title="Top Catalysts This Week" accent="upcoming" viewMore="/app/stocks/earnings-calendar?tab=top_catalysts" />
                    {riskMeta && (
                      <span className={`text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded border leading-none shrink-0 ml-2 ${riskMeta.cls}`}>
                        {riskMeta.label}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const ws = raw?.window_start;
                    const we = raw?.window_end;
                    const wm = raw?.window_mode;
                    if (!ws) return <p className="text-[10px] text-white/30 mt-0.5 leading-snug">Earnings, IPOs, macro, treasury, splits &amp; dividends — condensed.</p>;
                    try {
                      const sd = new Date(String(ws) + 'T00:00:00');
                      if (isNaN(sd.getTime())) return null;
                      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      const prefix = wm === 'next_week_planning' ? 'Coming week' : 'This week';
                      let range: string;
                      if (we) {
                        const ed = new Date(String(we) + 'T00:00:00');
                        if (!isNaN(ed.getTime())) {
                          range = sd.getMonth() === ed.getMonth()
                            ? `${MONTHS[sd.getMonth()]} ${sd.getDate()}–${ed.getDate()}`
                            : `${MONTHS[sd.getMonth()]} ${sd.getDate()} – ${MONTHS[ed.getMonth()]} ${ed.getDate()}`;
                        } else {
                          range = `${MONTHS[sd.getMonth()]} ${sd.getDate()}`;
                        }
                      } else {
                        range = `${MONTHS[sd.getMonth()]} ${sd.getDate()}`;
                      }
                      return <p className="text-[10px] text-white/30 mt-0.5 leading-snug">{prefix}: {range}</p>;
                    } catch { return null; }
                  })()}
                </div>
                <div className="overflow-y-auto max-h-[153px] scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent space-y-1.5 pr-0.5">

                  {/* Loading */}
                  {topCatalystsLoading && Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 my-1 rounded bg-white/[0.04]" />
                  ))}

                  {/* Error */}
                  {!topCatalystsLoading && topCatalystsError && (
                    <div className="text-xs text-white/40 py-6 text-center">Could not load catalysts.</div>
                  )}

                  {/* Empty */}
                  {!topCatalystsLoading && !topCatalystsError && catalystCards.length === 0 && (
                    <div className="text-xs text-white/40 py-6 text-center">No major catalysts found for this week.</div>
                  )}

                  {/* Lead catalyst */}
                  {!topCatalystsLoading && !topCatalystsError && lead && renderCard(lead, 0, true)}

                  {/* Remaining catalysts */}
                  {!topCatalystsLoading && !topCatalystsError && rest.slice(0, 7).map((c, i) => renderCard(c, i + 1, false))}

                </div>
              </GlassCard>
            );
          })()}
        </div>

        <DndContext sensors={homeSensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>

            {sectionOrder.map(id => {
              if (id === 'themes_signals_news') return (
                <SortableSection key={id} id={id}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
                    {/* Theme Performance — 1/3 width */}
                    <div className="lg:col-span-1">
                      <GlassCard className="flex flex-col h-[480px]">
                        <div className="px-4 pt-4 pb-2 shrink-0">
                          <SectionHeader icon={BarChart3} title="Theme Performance" viewMore="/app/stocks/sectors" />
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                          {(() => {
                            const allThemes: any[] = themesRS?.themes ?? [];
                            const loading = themesRSLoading;
                            const rawItems: HomeSubThemeItem[] = allThemes.map((t: any) => ({
                              sub_theme:       t.display_name,
                              avg_change_1d:   t.performance?.["1D"] ?? t.return_pct ?? null,
                              avg_change_7d:   t.performance?.["7D"] ?? null,
                              leader_symbols:  t.proxy_type === "custom"
                                ? (t.proxy_symbols_used ?? t.proxy_symbols ?? [])
                                : (t.leaders ?? []).map((l: any) => l.symbol)
                                    .concat((t.proxy_symbols_used ?? t.proxy_symbols ?? []))
                                    .filter((s: string, idx: number, arr: string[]) => arr.indexOf(s) === idx),
                              leader_count:    (t.proxy_type === "custom"
                                ? (t.proxy_symbols_used ?? t.proxy_symbols ?? [])
                                : (t.leaders ?? t.proxy_symbols_used ?? t.proxy_symbols ?? [])).length,
                              breadth_score:   t.breadth_pct ?? null,
                              momentum_score:  t.rs_score ?? null,
                              pattern_summary: t.state_reason ?? null,
                            }));
                            const items = [...rawItems].sort((a, b) => {
                              if (themeSortKey === "gain")    return (b.avg_change_1d ?? -Infinity) - (a.avg_change_1d ?? -Infinity);
                              if (themeSortKey === "breadth") return (b.breadth_score ?? -1) - (a.breadth_score ?? -1);
                              return (a.sub_theme ?? "").localeCompare(b.sub_theme ?? "");
                            });
                            return (
                              <>
                                {loading && Array.from({ length: 8 }).map((_, i) => (
                                  <Skeleton key={i} className="h-10 my-1 rounded bg-white/[0.04]" />
                                ))}
                                {!loading && items.length > 0 && (
                                  <div>
                                    <div className="flex justify-between text-[9px] uppercase tracking-wider px-2 mb-1 select-none">
                                      <button onClick={() => setThemeSortKey("name")} className={`transition-colors hover:text-white/60 ${themeSortKey === "name" ? "text-white/70" : "text-white/30"}`}>
                                        Theme {themeSortKey === "name" ? "↑" : ""}
                                      </button>
                                      <span className="flex gap-4 mr-1">
                                        <button onClick={() => setThemeSortKey("breadth")} className={`transition-colors hover:text-white/60 ${themeSortKey === "breadth" ? "text-white/70" : "text-white/30"}`}>
                                          breadth {themeSortKey === "breadth" ? "↓" : ""}
                                        </button>
                                        <button onClick={() => setThemeSortKey("gain")} className={`transition-colors hover:text-white/60 ${themeSortKey === "gain" ? "text-white/70" : "text-white/30"}`}>
                                          1D% {themeSortKey === "gain" ? "↓" : ""}
                                        </button>
                                      </span>
                                    </div>
                                    {items.map((item, i) => (
                                      <SubThemeRow key={item.sub_theme || i} item={item} onSymbolClick={openTicker} />
                                    ))}
                                  </div>
                                )}
                                {!loading && items.length === 0 && (
                                  <div className="text-sm text-white/40 py-8 text-center">Theme data temporarily unavailable.</div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </GlassCard>
                    </div>

                    {/* Live Prediction Odds — 1/3 width */}
                    <div className="lg:col-span-1">
                      <GlassCard className="flex flex-col h-[480px]">
                        <div className="px-4 pt-4 pb-2 shrink-0">
                          <SectionHeader icon={Signal} title="Prediction Markets" accent="Prophetik" viewMore="/app/predict" />
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                          {isOddsWarming && (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                              <div className="w-7 h-7 rounded-full border-2 border-blue-400/20 border-t-blue-400/60 animate-spin" />
                              <div>
                                <p className="text-[11px] font-semibold text-white/35">Prediction odds warming…</p>
                                <p className="text-[9px] text-white/20 mt-0.5">
                                  {liveOddsData?.tracked_count ?? 0} families tracked
                                </p>
                              </div>
                            </div>
                          )}
                          {!isOddsWarming && liveOddsRows.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                              <p className="text-[11px] text-white/30">No live market-relevant odds found</p>
                              <p className="text-[9px] text-white/15">
                                {liveOddsData?.tracked_count ?? 0} families tracked
                              </p>
                            </div>
                          )}
                          {liveOddsRows.length > 0 && (
                            <div className="divide-y divide-white/[0.04]">
                              {liveOddsRows.map((o: any) => {
                                // primary_question → question → display_subtitle → display_title → label
                                const pq: string | undefined = o.primary_question;
                                const q: string | undefined = o.question;
                                const primaryTitle: string =
                                  (pq && pq.length > 5) ? pq
                                  : (q && q.length > 10) ? q
                                  : (o.display_subtitle && o.display_subtitle !== o.priced_outcome_label && o.display_subtitle.length > 5) ? o.display_subtitle
                                  : o.display_title ?? o.label;
                                const familyLabel: string = o.display_title ?? o.label;
                                const secondaryCtx: string | undefined = primaryTitle !== familyLabel ? familyLabel : o.category;
                                const pricedPct = o.priced_probability != null ? o.priced_probability * 100
                                  : o.yes_probability != null ? o.yes_probability * 100 : null;
                                const d24Color = o.delta_24h_pp == null ? 'text-white/25' : o.delta_24h_pp >= 0 ? 'text-emerald-400' : 'text-rose-400';
                                const d7Color  = o.delta_7d_pp  == null ? 'text-white/25' : o.delta_7d_pp  >= 0 ? 'text-emerald-400' : 'text-rose-400';
                                return (
                                  <div
                                    key={o.family_key}
                                    className="flex items-start gap-2.5 py-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                                    onClick={() => setLocation('/app/predict')}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-semibold text-white/85 leading-snug line-clamp-2" title={primaryTitle}>{primaryTitle}</p>
                                      {secondaryCtx && <p className="text-[8px] text-white/28 mt-0.5 truncate">{secondaryCtx}</p>}
                                      {o.priced_outcome_label && (
                                        <span className="inline-block text-[7px] text-white/30 bg-white/[0.05] rounded px-1 mt-0.5 truncate max-w-full">{o.priced_outcome_label}</span>
                                      )}
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                      <span className="text-[15px] font-bold tabular-nums text-white/90">
                                        {pricedPct != null ? `${pricedPct.toFixed(1)}%` : '\u2014'}
                                      </span>
                                      <div className="flex flex-col items-end gap-0.5">
                                        {o.delta_24h_pp != null && (
                                          <span className={`text-[8px] font-mono ${d24Color}`}>
                                            {o.delta_24h_pp >= 0 ? '+' : ''}{o.delta_24h_pp.toFixed(1)}pp 24h
                                          </span>
                                        )}
                                        {o.delta_7d_pp != null && (
                                          <span className={`text-[8px] font-mono ${d7Color}`}>
                                            {o.delta_7d_pp >= 0 ? '+' : ''}{o.delta_7d_pp.toFixed(1)}pp 7d
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </GlassCard>
                    </div>

                    {/* Latest News — 1/3 width */}
                    <div className="lg:col-span-1">
                      <GlassCard className="flex flex-col h-[480px]">
                        <div className="px-4 pt-4 pb-2 shrink-0">
                          <SectionHeader icon={Newspaper} title="Latest News" accent="Cross-market" viewMore="/app/notifai" />
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 divide-y divide-white/[0.04]">
                          {isLoading && Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 my-1 rounded bg-white/[0.04]" />
                          ))}
                          {newsArticles.slice(0, 15).map((a: any, i: number) => (
                            <a key={i} href={a.url} target="_blank" rel="noreferrer noopener"
                              className="flex items-start gap-2.5 py-2.5 hover:bg-white/[0.03] rounded-md transition-colors">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs text-white/90 line-clamp-2">{a.title}</div>
                                <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1.5">
                                  <span className="truncate">{a.source}</span>
                                  {a.published && <span className="text-white/25">· {new Date(a.published).toLocaleDateString()}</span>}
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
                </SortableSection>
              );

              if (id === 'social_movers') return (
                <SortableSection key={id} id={id}>
                  <div className="flex justify-end mb-2">
                    <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-1">
                      {(["all", "stocks", "commodities", "crypto", "etfs"] as const).map(cat => (
                        <button key={cat} onClick={() => setMoverCategory(cat)}
                          className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-md transition-colors ${moverCategory === cat ? "bg-white/[0.10] text-white font-medium" : "text-white/40 hover:text-white/65"}`}>
                          {cat === "commodities" ? "Commod." : cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6" style={{ gridAutoRows: "460px" }}>
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
                          <SectionHeader icon={LineChart} title="Trending on X" accent={relativeUpdated} viewMore="/app/onchain/social"
                            action={<div className="flex items-center gap-1">
                              {isStale && <span className="text-[9px] px-1 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/10">stale</span>}
                              {isRefreshing && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />}
                            </div>} />
                        );
                      })()}
                      <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
                        {(data?.trending_on_x?.top_tickers || []).map((t, i) => (
                          <div key={t.symbol || i} className="px-2 py-2 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:border-white/12 transition-colors cursor-pointer" onClick={() => openTicker(t.symbol)}>
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-xs font-semibold text-white/90 truncate">${t.symbol}</span>
                              {t.sentiment && <Badge variant="outline" className={`h-4 text-[9px] px-1 shrink-0 ${/bull/i.test(t.sentiment) ? "border-emerald-500/25 text-emerald-300" : /bear/i.test(t.sentiment) ? "border-rose-500/25 text-rose-300" : "border-white/10 text-white/55"}`}>{t.sentiment}</Badge>}
                            </div>
                            {t.rationale && <div className="text-[10px] text-white/45 mt-0.5 line-clamp-1">{t.rationale}</div>}
                          </div>
                        ))}
                        {(!data?.trending_on_x?.top_tickers || data.trending_on_x.top_tickers.length === 0) && <div className="text-xs text-white/40 py-4 text-center">No snapshot yet.</div>}
                      </div>
                    </GlassCard>
                    <GlassCard className="p-4 flex flex-col overflow-hidden">
                      <SectionHeader icon={Sparkles} title="Trending on Stocktwits" accent="Stocktwits" viewMore="/app/onchain/social" />
                      <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
                        {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded bg-white/[0.04]" />)}
                        {!isLoading && (data?.trending_ideas || []).map((d, i) => (
                          <div key={d.ticker || i} className="px-2 py-2 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:border-white/12 transition-colors cursor-pointer" onClick={() => openTicker(d.ticker)}>
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-xs font-semibold text-white/90 truncate">${d.ticker}</span>
                              {typeof d.watchlist_count === "number" && d.watchlist_count > 0 && <Badge variant="outline" className="h-4 text-[9px] px-1 border-white/10 text-white/55 shrink-0">{d.watchlist_count.toLocaleString()}</Badge>}
                            </div>
                            {d.title && <div className="text-[10px] text-white/45 mt-0.5 line-clamp-1">{d.title}</div>}
                          </div>
                        ))}
                        {!isLoading && (!data?.trending_ideas || data.trending_ideas.length === 0) && <div className="text-xs text-white/40 py-4 text-center">No trending ideas right now.</div>}
                      </div>
                    </GlassCard>
                    <GlassCard className="p-4 flex flex-col overflow-hidden">
                      <SectionHeader icon={TrendingUp} title="Top Movers" accent="today" viewMore={moverViewMore} />
                      <div className="divide-y divide-white/[0.04] overflow-y-auto flex-1 min-h-0">
                        {categoryMoversLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 my-0.5 rounded bg-white/[0.04]" />)}
                        {!categoryMoversLoading && (categoryMovers?.gainers || []).slice(0, 8).map((row, i) => {
                          const externalUrl = row.ticker ? getMoverExternalUrl(row.ticker, row.asset_type || moverCategory, row.company) : null;
                          return <MoverRow key={i} row={row} onClick={row.ticker ? () => { if (externalUrl) { window.open(externalUrl, "_blank", "noopener,noreferrer"); } else { openTicker(row.ticker!, moverCategory, typeof row.price === "number" ? row.price : null, row.change_pct); } } : undefined} />;
                        })}
                        {!categoryMoversLoading && (!categoryMovers?.gainers || categoryMovers.gainers.length === 0) && <div className="text-sm text-white/40 py-6 text-center">No data</div>}
                      </div>
                    </GlassCard>
                    <GlassCard className="p-4 flex flex-col overflow-hidden">
                      <SectionHeader icon={TrendingDown} title="Top Losers" accent="today" viewMore={moverViewMore} />
                      <div className="divide-y divide-white/[0.04] overflow-y-auto flex-1 min-h-0">
                        {categoryMoversLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 my-0.5 rounded bg-white/[0.04]" />)}
                        {!categoryMoversLoading && (categoryMovers?.losers || []).slice(0, 8).map((row, i) => {
                          const externalUrl = row.ticker ? getMoverExternalUrl(row.ticker, row.asset_type || moverCategory, row.company) : null;
                          return <MoverRow key={i} row={row} onClick={row.ticker ? () => { if (externalUrl) { window.open(externalUrl, "_blank", "noopener,noreferrer"); } else { openTicker(row.ticker!, moverCategory, typeof row.price === "number" ? row.price : null, row.change_pct); } } : undefined} />;
                        })}
                        {!categoryMoversLoading && (!categoryMovers?.losers || categoryMovers.losers.length === 0) && <div className="text-sm text-white/40 py-6 text-center">No data</div>}
                      </div>
                    </GlassCard>
                  </div>
                </SortableSection>
              );

              if (id === 'snapshots') return (
                <SortableSection key={id} id={id}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <SnapshotTable items={data?.portfolio_snapshot} loading={isLoading} title="Portfolio Snapshot" icon={Briefcase} accent="tracked positions" status={data?.section_status?.portfolio_snapshot} scrollable viewMore="/app/caelyn-terminal" onRowClick={openTicker} />
                    <SnapshotTable items={data?.watchlist_snapshot} loading={isLoading} title="Watchlist Snapshot" icon={Wallet} accent="top movers from watchlist" status={data?.section_status?.watchlist_snapshot} scrollable viewMore="/app/watchlist" onRowClick={openTicker} />
                  </div>
                </SortableSection>
              );

              if (id === 'flows_hl') return (
                <SortableSection key={id} id={id}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                    <UnusualFlowsSection flows={data?.unusual_options_flows} status={data?.unusual_options_meta?.data_state || data?.section_status?.unusual_options_flows} loading={isLoading} onTickerClick={openTicker} viewMore="/app/options" />
                    <HLTopSignals signals={hlSignals} loading={hlLoading} viewMore="/app/hyperliquid-screener" onTickerClick={openTicker} />
                  </div>
                </SortableSection>
              );

              if (id === 'fear_greed') return (
                <SortableSection key={id} id={id}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    <FearGreedGauge title="Equities Fear & Greed" side={data?.fear_greed?.equities} tint="#93c5fd" />
                    <FearGreedGauge title="Crypto Fear & Greed" side={cryptoFG} tint="#f0abfc" />
                  </div>
                </SortableSection>
              );

              return null;
            })}

          </SortableContext>
        </DndContext>

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
          symbol={tickerPopup.symbol}
          assetType={tickerPopup.assetType}
          moverPrice={tickerPopup.price}
          moverChangePct={tickerPopup.changePct}
          onClose={() => setTickerPopup(null)}
          data={data}
        />
      )}
    </div>
  );
}
