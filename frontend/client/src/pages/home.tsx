import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { useSetPageContext } from "@/hooks/useSetPageContext";
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
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";
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
interface HLAdvSigs   { relative_strength_leaders: HLRSLeader[]; oi_regime_shift: HLOIRegime[]; as_of?: string; }

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

function resolveTVSymbol(symbol: string): string {
  // For stocks/ETFs the bare symbol works on TradingView
  return symbol;
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
             style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(56,189,248,0.14))" }}>
          <Icon className="w-3.5 h-3.5 text-white/80" />
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
function SubThemeRow({ item }: { item: HomeSubThemeItem }) {
  const chg = item.avg_change_1d;
  const breadth = item.breadth_score ?? 0;
  const breadthColor =
    breadth >= 80 ? "text-emerald-300" :
    breadth >= 50 ? "text-amber-300"   : "text-rose-300";
  return (
    <div className="flex items-start gap-3 px-2 py-2.5 rounded-md hover:bg-white/[0.03] transition-colors border-b border-white/[0.04] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white/90">{item.sub_theme}</span>
          {(item.leader_symbols || []).slice(0, 4).map(sym => (
            <span key={sym} className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.04] text-white/70 font-mono">{sym}</span>
          ))}
          {item.leader_count > 4 && (
            <span className="text-[10px] text-white/35">+{item.leader_count - 4}</span>
          )}
        </div>
        {item.pattern_summary && (
          <div className="text-[11px] text-white/45 mt-0.5 truncate">{item.pattern_summary}</div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 text-right">
        <div className="hidden sm:block">
          <div className="text-[9px] uppercase tracking-wide text-white/30">breadth</div>
          <div className={`text-xs font-medium ${breadthColor}`}>{breadth.toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wide text-white/30">1D</div>
          <div className={`text-sm font-semibold tabular-nums ${pctColor(chg)}`}>{fmtPct(chg)}</div>
        </div>
      </div>
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
  items, loading, title, icon: Icon, accent, status, limit = 999, scrollable = false, viewMore,
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
            <div key={row.symbol} className="grid grid-cols-12 gap-1 items-center px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors">
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

function HLTopSignals({ signals, loading, viewMore }: { signals: HLAdvSigs | undefined; loading: boolean; viewMore?: string }) {
  const rsLeaders = (signals?.relative_strength_leaders || []).slice(0, 5);
  const oiShifts  = (signals?.oi_regime_shift || []).slice(0, 5);

  const colHdr  = "text-[9px] uppercase tracking-widest text-white/30 font-medium select-none";
  const numCell = "text-xs font-mono tabular-nums text-right";

  return (
    <GlassCard className="p-4">
      <SectionHeader icon={Activity} title="Hyperliquid Top Signals" accent="Perps · live" viewMore={viewMore} />

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
            <div key={r.symbol} className="grid grid-cols-[72px_1fr_1fr_1fr_48px] gap-x-2 px-2 py-1.5 items-center rounded hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0">
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
            <div key={r.symbol} className="grid grid-cols-[72px_1fr_60px_60px] gap-x-2 px-2 py-1.5 items-center rounded hover:bg-white/[0.03] border-b border-white/[0.03] last:border-0">
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

  const tvSymbol = resolveTVSymbol(symbol);
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

// ───────────────────────────────────────────────────────────────────────────
// Main page
// ───────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [tickerPopup, setTickerPopup] = useState<{ symbol: string; assetType?: string; price?: number | null; changePct?: number | null } | null>(null);
  const openTicker = (symbol: string, assetType?: string, price?: number | null, changePct?: number | null) =>
    setTickerPopup({ symbol, assetType, price, changePct });
  const [moverCategory, setMoverCategory] = useState<"all" | "stocks" | "commodities" | "crypto" | "etfs">("stocks");
  const moverViewMore =
    moverCategory === "crypto"      ? "/app/crypto-stocks" :
    moverCategory === "commodities" ? "/app/commodities"   :
    "/app/stocks/screening";
  const [macroChartCard, setMacroChartCard] = useState<HomeMacroCard | null>(null);

  // Home aggregator — primary query. The Express proxy composes:
  // backend /api/home/dashboard + news (NEWS_CACHE) + crypto FG (CMC cache).
  const { data, isLoading, isError } = useQuery<HomeDashboardPayload>({
    queryKey: ["/api/home/dashboard"],
    staleTime: 60_000,
    // Poll every 30 s while options flows haven't appeared yet
    refetchInterval: (query) => {
      const d = query.state.data as HomeDashboardPayload | undefined;
      const flowStatus = d?.section_status?.unusual_options_flows;
      const dataState  = d?.unusual_options_meta?.data_state;
      // Poll every 30s while the home fast cache hasn't produced results yet.
      const notReady = !d?.unusual_options_flows?.length ||
        flowStatus === "precompute_pending" || flowStatus === "no_data_yet" ||
        dataState === "no_data_yet" || dataState === "none";
      return notReady && !query.state.error ? 30_000 : false;
    },
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

  // Should I Be Trading? — trading dashboard (swing mode)
  const { data: tradingData } = useQuery<any>({
    queryKey: ["/api/trading-dashboard-home"],
    queryFn: async () => {
      const r = await fetch("/api/trading-dashboard?mode=swing");
      if (!r.ok) throw new Error(`Trading dashboard ${r.status}`);
      return r.json();
    },
    staleTime: 5 * 60_000,
    retry: false,
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

  const greeting = data?.greeting?.text || "Welcome back";
  const marketLabel = data?.greeting?.market?.label || "Markets";
  const nowET = data?.greeting?.market?.now_et;

  return (
    <div className="relative min-h-screen text-white" style={{ background: "#050608" }}>
      {/* ambient background, matches app aesthetic */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 20% 20%, rgba(30,120,200,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 85% 10%, rgba(120,60,220,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 60% 90%, rgba(50,160,230,0.05) 0%, transparent 50%),
            linear-gradient(180deg, #050608 0%, #060810 30%, #070910 60%, #050608 100%)
          `,
        }}
      />
      <div
        className="fixed inset-0 z-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100,180,255,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100,180,255,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-[1540px] mx-auto px-5 lg:px-8 pt-10 pb-6">
        {/* ── Header row: Greeting · Market Snapshot strip · Should I Trade ── */}
        <div className="flex items-center gap-4 mb-6 min-h-[64px]">

          {/* Left: greeting */}
          <div className="shrink-0">
            <div className="text-[9px] uppercase tracking-[0.2em] text-white/35 mb-0.5">
              Caelyn Home
            </div>
            <h1 className="text-xl font-semibold text-white leading-tight">
              {greeting}.
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
              {marketLabel}{nowET ? ` · ${nowET}` : ""}
              {data?.from_cache && (
                <span className="text-[9px] text-white/25">cached</span>
              )}
            </div>
          </div>

          {/* Thin divider */}
          <div className="self-stretch w-px bg-white/[0.07] shrink-0" />

          {/* Center: compact Market Snapshot strip */}
          <div className="flex-1 min-w-0">
            <div className="text-[8.5px] uppercase tracking-[0.18em] text-white/30 mb-1.5 px-0.5">Market Snapshot</div>
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

          {/* Right: Should I Trade? */}
          {(() => {
            const td = tradingData;
            const decision: string | undefined = td?.decision;
            const score: number | undefined = td?.market_quality_score;
            const decisionColor = decision === 'YES' ? 'text-emerald-400' : decision === 'CAUTION' ? 'text-amber-400' : decision === 'NO' ? 'text-rose-400' : 'text-white/40';
            const borderColor = decision === 'YES' ? 'border-emerald-500/20' : decision === 'CAUTION' ? 'border-amber-500/20' : decision === 'NO' ? 'border-rose-500/20' : 'border-white/10';
            const scoreColor = score == null ? 'text-white/30' : score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : score >= 30 ? 'text-orange-400' : 'text-rose-400';
            return (
              <button
                onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); setLocation('/app/macro-terminal?tab=trade'); }}
                className={`flex flex-col items-center justify-center rounded-xl border bg-white/[0.02] hover:bg-white/[0.04] transition-all px-4 py-2.5 shrink-0 text-center ${borderColor}`}
              >
                <div className="text-[8.5px] uppercase tracking-widest text-white/30 mb-0.5">Should I Trade?</div>
                {!td ? (
                  <div className="text-base font-bold text-white/20">—</div>
                ) : (
                  <>
                    <div className={`text-xl font-bold tabular-nums leading-none ${decisionColor}`}>{decision ?? '—'}</div>
                    {score != null && (
                      <div className={`text-[10px] font-semibold mt-0.5 tabular-nums ${scoreColor}`}>{score}/100</div>
                    )}
                  </>
                )}
                <div className="text-[8.5px] text-white/20 mt-0.5 flex items-center gap-0.5">swing <ChevronRight className="w-2.5 h-2.5" /></div>
              </button>
            );
          })()}
        </div>

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

        {/* F + G + G2. Three-column row: Theme Performance | Top Equity Signals | Latest News */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Theme Performance — 1/3 width */}
          <div className="lg:col-span-1">
            <GlassCard className="flex flex-col h-[480px]">
              <div className="px-4 pt-4 pb-2 shrink-0">
                {(() => {
                  const subThemes = data?.sub_theme_performance;
                  const hasSubThemes = subThemes && subThemes.length > 0;
                  return (
                    <SectionHeader
                      icon={BarChart3}
                      title="Theme Performance"
                      accent={hasSubThemes ? "sub-theme leaders" : "sector rotation"}
                      viewMore="/app/stocks/sectors"
                    />
                  );
                })()}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                {(() => {
                  const subThemes = data?.sub_theme_performance;
                  const hasSubThemes = subThemes && subThemes.length > 0;
                  return (
                    <>
                      {isLoading && Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 my-1 rounded bg-white/[0.04]" />
                      ))}
                      {!isLoading && hasSubThemes && (
                        <div>
                          <div className="flex justify-between text-[9px] uppercase tracking-wider text-white/30 px-2 mb-1">
                            <span>Sub-theme · leaders</span>
                            <span className="flex gap-6 mr-1"><span>breadth</span><span>1D</span></span>
                          </div>
                          {subThemes.map((item, i) => (
                            <SubThemeRow key={item.sub_theme || i} item={item} />
                          ))}
                        </div>
                      )}
                      {!isLoading && !hasSubThemes && (data?.theme_performance?.themes || []).length > 0 && (
                        <>
                          <div className="grid grid-cols-12 gap-2 text-[10px] uppercase tracking-wider text-white/40 px-2 mb-1">
                            <div className="col-span-4">Sector</div>
                            <div className="col-span-5 text-center">30D relative</div>
                            <div className="col-span-1 text-right">1D</div>
                            <div className="col-span-1 text-right">7D</div>
                            <div className="col-span-1 text-right">30D</div>
                          </div>
                          {(data?.theme_performance?.themes || []).map((t, i) => (
                            <ThemeRow key={i} theme={t} />
                          ))}
                        </>
                      )}
                      {!isLoading && !hasSubThemes && (!data?.theme_performance?.themes || data.theme_performance.themes.length === 0) && (
                        <div className="text-sm text-white/40 py-8 text-center">Theme data temporarily unavailable.</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </GlassCard>
          </div>

          {/* Top Equity Signals — 1/3 width */}
          <div className="lg:col-span-1">
            <GlassCard className="flex flex-col h-[480px]">
              <div className="px-4 pt-4 pb-2 shrink-0">
                <SectionHeader icon={Signal} title="Top Equity Signals" accent="Prophetik" viewMore="/app/predict" />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                {!equityOverview && (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded bg-white/[0.04]" />
                    ))}
                  </div>
                )}
                {equityOverview && topEquitySignals.length === 0 && (
                  <div className="text-sm text-white/40 py-8 text-center">No equity signals available.</div>
                )}
                {topEquitySignals.length > 0 && (
                  <div className="space-y-2.5">
                    {topEquitySignals.map((sig: any, i: number) => {
                      const dir = (() => {
                        const s = (sig.summary_direction || '').toLowerCase();
                        if (s.includes('bull') || s === 'up') return 'bullish';
                        if (s.includes('bear') || s === 'down') return 'bearish';
                        return 'neutral';
                      })();
                      const dirColor  = dir === 'bullish' ? 'text-emerald-400' : dir === 'bearish' ? 'text-rose-400' : 'text-amber-400';
                      const dirBg     = dir === 'bullish' ? 'border-emerald-500/15' : dir === 'bearish' ? 'border-rose-500/15' : 'border-amber-500/15';
                      const bullSectors: string[] = sig.bullish_sectors ?? [];
                      const bearSectors: string[] = sig.bearish_sectors ?? [];
                      const bullStocks:  string[] = sig.bullish_stocks  ?? [];
                      const bearStocks:  string[] = sig.bearish_stocks  ?? [];
                      return (
                        <div key={i} className={`rounded-lg border bg-white/[0.02] p-2.5 ${dirBg}`}>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${dirColor}`}>{dir}</span>
                            {sig.confidence && (
                              <span className="text-[9px] text-white/25 capitalize">{sig.confidence}</span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/85 font-semibold leading-snug mb-1">{sig.title}</p>
                          {sig.summary && (
                            <p className="text-[10px] text-white/45 leading-relaxed mb-2 line-clamp-2">{sig.summary}</p>
                          )}
                          {sig.odds_move_summary && (
                            <p className="text-[10px] text-blue-300/70 mb-2 leading-snug">↻ {sig.odds_move_summary}</p>
                          )}
                          {(bullSectors.length > 0 || bearSectors.length > 0) && (
                            <div className="flex gap-2 mb-2">
                              {bullSectors.length > 0 && (
                                <div className="flex-1 min-w-0">
                                  <p className="text-[7px] font-bold uppercase tracking-widest text-emerald-400/50 mb-1">↑ Sectors</p>
                                  {bullSectors.slice(0, 3).map(s => (
                                    <p key={s} className="text-[9px] text-emerald-300/80 font-medium truncate">{s}</p>
                                  ))}
                                </div>
                              )}
                              {bearSectors.length > 0 && (
                                <div className="flex-1 min-w-0">
                                  <p className="text-[7px] font-bold uppercase tracking-widest text-rose-400/50 mb-1">↓ Sectors</p>
                                  {bearSectors.slice(0, 3).map(s => (
                                    <p key={s} className="text-[9px] text-rose-300/80 font-medium truncate">{s}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {(bullStocks.length > 0 || bearStocks.length > 0) && (
                            <div className="flex gap-2">
                              {bullStocks.length > 0 && (
                                <div className="flex-1 min-w-0">
                                  <p className="text-[7px] font-bold uppercase tracking-widest text-emerald-400/50 mb-1">Bullish</p>
                                  <div className="flex flex-wrap gap-1">
                                    {bullStocks.slice(0, 4).map(t => (
                                      <span key={t} className="text-[8px] font-bold font-mono px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{t}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {bearStocks.length > 0 && (
                                <div className="flex-1 min-w-0">
                                  <p className="text-[7px] font-bold uppercase tracking-widest text-rose-400/50 mb-1">Bearish</p>
                                  <div className="flex flex-wrap gap-1">
                                    {bearStocks.slice(0, 4).map(t => (
                                      <span key={t} className="text-[8px] font-bold font-mono px-1 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">{t}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
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
                  <a
                    key={i}
                    href={a.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-start gap-2.5 py-2.5 hover:bg-white/[0.03] rounded-md transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-white/90 line-clamp-2">{a.title}</div>
                      <div className="text-[10px] text-white/40 mt-0.5 flex items-center gap-1.5">
                        <span className="truncate">{a.source}</span>
                        {a.published && (
                          <span className="text-white/25">· {new Date(a.published).toLocaleDateString()}</span>
                        )}
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

        {/* Category toggle — above social + movers 4-across row */}
        <div className="flex justify-end mb-2">
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-lg px-2 py-1">
            {(["all", "stocks", "commodities", "crypto", "etfs"] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setMoverCategory(cat)}
                className={`text-[10px] uppercase tracking-wide px-2.5 py-1 rounded-md transition-colors ${
                  moverCategory === cat
                    ? "bg-white/[0.10] text-white font-medium"
                    : "text-white/40 hover:text-white/65"
                }`}
              >
                {cat === "commodities" ? "Commod." : cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Social + Movers: 4-across on xl screens (2-across on smaller) */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-6" style={{ gridAutoRows: "460px" }}>
          {/* Trending on X */}
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
                <SectionHeader
                  icon={LineChart}
                  title="Trending on X"
                  accent={relativeUpdated}
                  viewMore="/app/onchain/social"
                  action={
                    <div className="flex items-center gap-1">
                      {isStale && <span className="text-[9px] px-1 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/10">stale</span>}
                      {isRefreshing && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />}
                    </div>
                  }
                />
              );
            })()}
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
              {(data?.trending_on_x?.top_tickers || []).map((t, i) => (
                <div key={t.symbol || i} className="px-2 py-2 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:border-white/12 transition-colors cursor-pointer" onClick={() => openTicker(t.symbol)}>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-white/90 truncate">${t.symbol}</span>
                    {t.sentiment && (
                      <Badge variant="outline" className={`h-4 text-[9px] px-1 shrink-0 ${/bull/i.test(t.sentiment) ? "border-emerald-500/25 text-emerald-300" : /bear/i.test(t.sentiment) ? "border-rose-500/25 text-rose-300" : "border-white/10 text-white/55"}`}>{t.sentiment}</Badge>
                    )}
                  </div>
                  {t.rationale && <div className="text-[10px] text-white/45 mt-0.5 line-clamp-1">{t.rationale}</div>}
                </div>
              ))}
              {(!data?.trending_on_x?.top_tickers || data.trending_on_x.top_tickers.length === 0) && (
                <div className="text-xs text-white/40 py-4 text-center">No snapshot yet.</div>
              )}
            </div>
          </GlassCard>

          {/* Trending on Stocktwits */}
          <GlassCard className="p-4 flex flex-col overflow-hidden">
            <SectionHeader icon={Sparkles} title="Trending on Stocktwits" accent="Stocktwits" viewMore="/app/onchain/social" />
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
              {isLoading && Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded bg-white/[0.04]" />
              ))}
              {!isLoading && (data?.trending_ideas || []).map((d, i) => (
                <div key={d.ticker || i} className="px-2 py-2 rounded-lg border border-white/[0.05] bg-white/[0.02] hover:border-white/12 transition-colors cursor-pointer" onClick={() => openTicker(d.ticker)}>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-xs font-semibold text-white/90 truncate">${d.ticker}</span>
                    {typeof d.watchlist_count === "number" && d.watchlist_count > 0 && (
                      <Badge variant="outline" className="h-4 text-[9px] px-1 border-white/10 text-white/55 shrink-0">{d.watchlist_count.toLocaleString()}</Badge>
                    )}
                  </div>
                  {d.title && <div className="text-[10px] text-white/45 mt-0.5 line-clamp-1">{d.title}</div>}
                </div>
              ))}
              {!isLoading && (!data?.trending_ideas || data.trending_ideas.length === 0) && (
                <div className="text-xs text-white/40 py-4 text-center">No trending ideas right now.</div>
              )}
            </div>
          </GlassCard>

          {/* Top Movers */}
          <GlassCard className="p-4 flex flex-col overflow-hidden">
            <SectionHeader icon={TrendingUp} title="Top Movers" accent="today" viewMore={moverViewMore} />
            <div className="divide-y divide-white/[0.04] overflow-y-auto flex-1 min-h-0">
              {categoryMoversLoading && Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 my-0.5 rounded bg-white/[0.04]" />
              ))}
              {!categoryMoversLoading && (categoryMovers?.gainers || []).slice(0, 8).map((row, i) => {
                const externalUrl = row.ticker ? getMoverExternalUrl(row.ticker, row.asset_type || moverCategory, row.company) : null;
                return (
                  <MoverRow key={i} row={row} onClick={row.ticker ? () => {
                    if (externalUrl) { window.open(externalUrl, "_blank", "noopener,noreferrer"); }
                    else { openTicker(row.ticker!, moverCategory, typeof row.price === "number" ? row.price : null, row.change_pct); }
                  } : undefined} />
                );
              })}
              {!categoryMoversLoading && (!categoryMovers?.gainers || categoryMovers.gainers.length === 0) && (
                <div className="text-sm text-white/40 py-6 text-center">No data</div>
              )}
            </div>
          </GlassCard>

          {/* Top Losers */}
          <GlassCard className="p-4 flex flex-col overflow-hidden">
            <SectionHeader
              icon={TrendingDown}
              title="Top Losers"
              accent="today"
              viewMore={moverViewMore}
            />
            <div className="divide-y divide-white/[0.04] overflow-y-auto flex-1 min-h-0">
              {categoryMoversLoading && Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 my-0.5 rounded bg-white/[0.04]" />
              ))}
              {!categoryMoversLoading && (categoryMovers?.losers || []).slice(0, 8).map((row, i) => {
                const externalUrl = row.ticker ? getMoverExternalUrl(row.ticker, row.asset_type || moverCategory, row.company) : null;
                return (
                  <MoverRow key={i} row={row} onClick={row.ticker ? () => {
                    if (externalUrl) { window.open(externalUrl, "_blank", "noopener,noreferrer"); }
                    else { openTicker(row.ticker!, moverCategory, typeof row.price === "number" ? row.price : null, row.change_pct); }
                  } : undefined} />
                );
              })}
              {!categoryMoversLoading && (!categoryMovers?.losers || categoryMovers.losers.length === 0) && (
                <div className="text-sm text-white/40 py-6 text-center">No data</div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* H2. Portfolio Snapshot + Watchlist Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <SnapshotTable
            items={data?.portfolio_snapshot}
            loading={isLoading}
            title="Portfolio Snapshot"
            icon={Briefcase}
            accent="tracked positions"
            status={data?.section_status?.portfolio_snapshot}
            scrollable
            viewMore="/app/caelyn-terminal"
          />
          <SnapshotTable
            items={data?.watchlist_snapshot}
            loading={isLoading}
            title="Watchlist Snapshot"
            icon={Wallet}
            accent="top movers from watchlist"
            status={data?.section_status?.watchlist_snapshot}
            scrollable
            viewMore="/app/watchlist"
          />
        </div>

        {/* H3. Unusual Options Flows + Hyperliquid Top Signals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <UnusualFlowsSection
            flows={data?.unusual_options_flows}
            status={
              data?.unusual_options_meta?.data_state ||
              data?.section_status?.unusual_options_flows
            }
            loading={isLoading}
            onTickerClick={openTicker}
            viewMore="/app/options"
          />
          <HLTopSignals signals={hlSignals} loading={hlLoading} viewMore="/app/hyperliquid-screener" />
        </div>

        {/* K. Fear & Greed — equities + crypto */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <FearGreedGauge
            title="Equities Fear & Greed"
            side={data?.fear_greed?.equities}
            tint="#93c5fd"
          />
          <FearGreedGauge
            title="Crypto Fear & Greed"
            side={cryptoFG}
            tint="#f0abfc"
          />
        </div>

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
