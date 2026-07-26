import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
import { useTheme, DARK_C } from '@/contexts/ThemeContext';
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { useSetPageContext } from "@/hooks/useSetPageContext";
import { useSetScreenContext } from "@/hooks/useSetScreenContext";
import type { ReactNode } from "react";
import {
  RefreshCw,
  Send,
  Loader2,
  Zap,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  Database,
  CircleAlert,
  Save,
  RotateCcw,
  X,
  Clock,
  Eye,
  BookOpen,
  Search,
  Info,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Area,
  ReferenceLine,
} from "recharts";
import { TickerThematicBadge, ThematicSection, RegimeContextStrip } from "@/components/ui/ticker-thematic";
import type { RegimeContextData } from "@/components/ui/ticker-thematic";
import { resolveTVSymbol } from "@/utils/tvSymbol";

const API_BASE = "/api/options";

function getToken(): string | null {
  return localStorage.getItem("caelyn_jwt") || sessionStorage.getItem("caelyn_jwt");
}
function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

let C = DARK_C;
const font = "'JetBrains Mono', 'Fira Code', monospace";
const sans = "'Outfit', 'Inter', sans-serif";

type SortDir = "asc" | "desc";
type CatFilter = "all" | "stock" | "etf";
type SideFilter = "all" | "call" | "put";
type MainTab = "tickers" | "flow";

interface ScoreWeights {
  flow_score?: number | null;
  gamma_score?: number | null;
  asymmetry_score?: number | null;
  volatility_score?: number | null;
  sentiment_score?: number | null;
  stock_context_score?: number | null;
  [key: string]: string | number | null | undefined;
}

interface ModularScores {
  flow_score?: number | null;
  gamma_score?: number | null;
  asymmetry_score?: number | null;
  volatility_score?: number | null;
  sentiment_score?: number | null;
  stock_context_score?: number | null;
}

interface StockContext {
  stock_relative_volume?: number | null;
  stock_intraday_move_pct?: number | null;
  breakout_context?: string | null;
  compression_context?: string | null;
  reversal_context?: string | null;
  catalyst_context?: string | null;
  liquidity_context?: string | null;
  short_squeeze_context?: string | null;
  macro_context?: string | null;
}

interface OptionsContext {
  call_put_volume_ratio?: number | null;
  call_put_oi_ratio?: number | null;
  near_spot_oi_density?: number | null;
  near_spot_gamma_density?: number | null;
  iv_current?: number | null;
  expected_move_from_atm_straddle?: number | null;
  gamma_score_is_approximation?: boolean | null;
}

interface DataQuality {
  confidence?: string | null;
  confidence_score?: number | null;
  flags?: string[] | null;
  missing_data_flags?: string[] | null;
  approximate_metrics?: string[] | null;
  history_metrics_ready?: boolean | null;
}

interface OptionGreeks {
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
}

interface OptionContract {
  contract_symbol?: string | null;
  symbol?: string | null;
  type?: string | null;
  side?: string | null;
  strike?: number | string | null;
  expiration?: string | null;
  dte?: number | null;
  bid?: number | null;
  ask?: number | null;
  last?: number | null;
  mid?: number | null;
  volume?: number | null;
  open_interest?: number | null;
  openInterest?: number | null;
  implied_volatility?: number | null;
  iv?: number | null;
  greeks?: OptionGreeks | null;
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  option_volume_to_oi_ratio?: number | null;
  vol_oi_ratio?: number | null;
  spread_pct?: number | null;
  premium_traded_estimate?: number | null;
  break_even?: number | null;
  break_even_distance_pct?: number | null;
  contract_liquidity_quality?: string | null;
  repeated_flow_score?: number | null;
  iv_rank?: number | null;
  iv_percentile?: number | null;
  contract_score?: number | null;
  flow_score?: number | null;
  asymmetry_score?: number | null;
  short_thesis?: string | null;
  underlying?: string | null;
  category?: string | null;
  confidence?: string | null;
  primary_signal?: string | null;
}

interface TickerResult {
  ticker: string;
  category?: string | null;
  asset_type?: string | null;
  market_cap_bucket?: string | null;
  underlying_price?: number | null;
  price_change_pct?: number | null;
  expiration_focus?: Array<string | number> | null;
  call_volume?: number | null;
  put_volume?: number | null;
  total_volume?: number | null;
  pc_ratio?: number | null;
  call_oi?: number | null;
  put_oi?: number | null;
  total_oi?: number | null;
  avg_call_iv?: number | null;
  avg_put_iv?: number | null;
  iv_skew?: number | null;
  max_pain?: number | null;
  primary_signal?: string | null;
  confidence?: string | null;
  confidence_score?: number | null;
  composite_score?: number | null;
  modular_scores?: ModularScores | null;
  stock_context_summary?: string | null;
  options_context_summary?: string | null;
  stock_context?: StockContext | null;
  options_context?: OptionsContext | null;
  top_contracts?: OptionContract[] | null;
  top_calls?: OptionContract[] | null;
  top_puts?: OptionContract[] | null;
  thesis?: string | string[] | null;
  risks?: string | string[] | null;
  data_quality?: DataQuality | null;
  technicals?: any;
  historic_volume?: any;
  // Screener-specific fields — gracefully null if backend hasn't deployed them yet
  heat_score?: number | null;
  premium?: number | null;
  premium_change_pct?: number | null;
  oi_change_pct?: number | null;
  unusual_otm?: boolean | null;
  // Thematic context — optional, backend may not yet return these
  theme_name?: string | null;
  theme_state?: string | null;
  regime_alignment_score?: number | null;
  regime_alignment_label?: string | null;
  thematic_badges?: string[] | null;
  dead_zone_warning?: boolean | null;
  base_score?: number | null;
  final_composite_score?: number | null;
  sector_alignment?: string | null;
  macro_fit?: string | null;
  theme_score?: number | null;
}

interface OptionsDashboardResponse {
  display_type?: string | null;
  scan_type?: string | null;
  filter_defaults?: Record<string, unknown> | null;
  score_weights?: ScoreWeights | null;
  pipeline_stats?: Record<string, unknown> | null;
  market_summary?: Record<string, unknown> | null;
  tickers?: TickerResult[] | null;
  all_contracts?: OptionContract[] | null;
}

const sideColor = (s?: string | null) => s?.toLowerCase() === "call" ? C.green : C.red;
const pcColor = (r: number | null) => r == null ? C.dim : r > 1.2 ? C.red : r < 0.8 ? C.green : C.yellow;
const voiColor = (r: number | null) => r == null ? C.dim : r > 10 ? C.red : r > 5 ? C.orange : r > 3 ? C.yellow : C.dim;
const skewColor = (s: number | null) => s == null ? C.dim : s > 0.05 ? C.red : s < -0.05 ? C.green : C.dim;
const rsiColor = (v: number | null | undefined) => v == null ? C.dim : v > 70 ? C.red : v < 30 ? C.green : C.text;
const macdColor = (v: number | null | undefined) => v == null ? C.dim : v > 0 ? C.green : C.red;
const scoreColor = (score: number | null) => {
  if (score == null) return C.dim;
  if (score >= 80) return C.green;
  if (score >= 65) return C.blue;
  if (score >= 50) return C.yellow;
  return C.dim;
};
const trendSignal = (sma20?: number | null, sma50?: number | null): { label: string; color: string } | null => {
  if (sma20 == null || sma50 == null) return null;
  return sma20 > sma50 ? { label: "Bullish", color: C.green } : { label: "Bearish", color: C.red };
};

const safeNum = (n: unknown): number | null => {
  if (n == null) return null;
  const v = typeof n === "string" ? parseFloat(n) : Number(n);
  return Number.isFinite(v) ? v : null;
};
const fmtVol = (n: unknown) => {
  const v = safeNum(n);
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
};
const fmtNum = (n: unknown, d = 2) => { const v = safeNum(n); return v == null ? "—" : v.toFixed(d); };
const fmtMoney = (n: unknown, d = 2) => { const v = safeNum(n); return v == null ? "—" : `$${v.toFixed(d)}`; };
const fmtSmartPct = (n: unknown, d = 1) => {
  const v = safeNum(n);
  if (v == null) return "—";
  const value = Math.abs(v) <= 1 ? v * 100 : v;
  return `${value >= 0 ? "+" : ""}${value.toFixed(d)}%`;
};
const fmtRatioPct = (n: unknown, d = 1) => {
  const v = safeNum(n);
  if (v == null) return "—";
  return `${(v * 100).toFixed(d)}%`;
};
const fmtPlainPct = (n: unknown, d = 1) => { const v = safeNum(n); return v == null ? "—" : `${v.toFixed(d)}%`; };
const fmtIV = (n: unknown): string => {
  const v = safeNum(n);
  if (v == null) return "—";
  if (v >= 0 && v <= 3) return `${(v * 100).toFixed(0)}%`;
  return `${v.toFixed(0)}%`;
};
const fmtCurrencyShort = (n: unknown): string => {
  const v = safeNum(n);
  if (v == null) return "—";
  const a = Math.abs(v);
  if (a >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};
const fmtMaybeText = (value: unknown) => {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value);
};
const ensureArray = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [String(value)];
};
const normalizeScore = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null;
  if (Math.abs(value) <= 1) return Math.max(0, Math.min(100, value * 100));
  return Math.max(0, Math.min(100, value));
};
const getConfidence = (confidence?: string | null, confidenceScore?: number | null) => {
  const label = confidence?.toLowerCase() || (confidenceScore != null ? (normalizeScore(confidenceScore) ?? 0) >= 75 ? "high" : (normalizeScore(confidenceScore) ?? 0) >= 45 ? "medium" : "low" : "unknown");
  if (label.includes("high")) return { label: "High", color: C.green };
  if (label.includes("medium")) return { label: "Medium", color: C.yellow };
  if (label.includes("low")) return { label: "Low", color: C.red };
  return { label: confidence || "Unknown", color: C.dim };
};
const getSignalColor = (signal?: string | null) => {
  const s = (signal || "").toLowerCase();
  if (s.includes("gamma")) return C.purple;
  if (s.includes("breakout") || s.includes("bull")) return C.green;
  if (s.includes("sentiment") || s.includes("earnings")) return C.orange;
  if (s.includes("asym")) return C.blue;
  if (s.includes("vol")) return C.yellow;
  if (s.includes("put") || s.includes("bear")) return C.red;
  return C.blue;
};
const toTitleCase = (value: string) => value.split(/[_\s-]+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const compactDate = (value?: string | null) => value ? String(value).slice(5, 10) : "—";
const normalizeContract = (contract: OptionContract) => {
  const side = (contract.type || contract.side || "").toLowerCase() || "call";
  const openInterest = safeNum(contract.open_interest ?? contract.openInterest);
  const iv = safeNum(contract.iv ?? contract.implied_volatility);
  const delta = safeNum(contract.greeks?.delta ?? contract.delta);
  const gamma = safeNum(contract.greeks?.gamma ?? contract.gamma);
  const theta = safeNum(contract.greeks?.theta ?? contract.theta);
  const vega = safeNum(contract.greeks?.vega ?? contract.vega);
  const volumeToOi = safeNum(contract.option_volume_to_oi_ratio ?? contract.vol_oi_ratio);
  return { ...contract, side, openInterest, iv, delta, gamma, theta, vega, volumeToOi };
};
const signalTagsForTicker = (ticker: TickerResult) => {
  const tags: Array<{ label: string; color: string }> = [];
  const primary = ticker.primary_signal?.toLowerCase() || "";
  const stockSummary = (ticker.stock_context_summary || "").toLowerCase();
  const optionsSummary = (ticker.options_context_summary || "").toLowerCase();
  const breakout = (ticker.stock_context?.breakout_context || "").toLowerCase();
  const catalyst = (ticker.stock_context?.catalyst_context || "").toLowerCase();
  const gammaApprox = !!ticker.options_context?.gamma_score_is_approximation;

  if (primary.includes("unusual") || optionsSummary.includes("unusual")) tags.push({ label: "Unusual Flow", color: C.blue });
  if (primary.includes("gamma") || optionsSummary.includes("gamma")) tags.push({ label: gammaApprox ? "Gamma Setup ~" : "Gamma Setup", color: C.purple });
  if (primary.includes("asym") || optionsSummary.includes("asym")) tags.push({ label: "Asymmetric R/R", color: C.green });
  if (primary.includes("sentiment") || optionsSummary.includes("sentiment")) tags.push({ label: "Sentiment Extreme", color: C.orange });
  if (primary.includes("vol") || optionsSummary.includes("volatility")) tags.push({ label: "Vol Expansion", color: C.yellow });
  if (catalyst.includes("earnings") || optionsSummary.includes("earnings")) tags.push({ label: "Earnings Move", color: C.orange });
  if (breakout.includes("breakout") || primary.includes("breakout") || stockSummary.includes("breakout")) tags.push({ label: "Breakout Confirm", color: C.green });

  return tags.slice(0, 4);
};

function Badge({ color, children, sm }: { color: string; children: ReactNode; sm?: boolean }) {
  return (
    <span
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}35`,
        borderRadius: 999,
        padding: sm ? "1px 7px" : "3px 9px",
        fontSize: sm ? 9 : 10,
        fontWeight: 700,
        fontFamily: font,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
    </span>
  );
}

function SectionCard({ children }: { children: ReactNode }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10 }}>{children}</div>;
}

function MetricBlock({ label, value, color = C.bright, subtext }: { label: string; value: ReactNode; color?: string; subtext?: ReactNode }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 8, background: `${color}08`, border: `1px solid ${color}18`, minWidth: 0, transition: "opacity 0.15s ease, transform 0.2s ease" }}>
      <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 14, fontFamily: font, fontWeight: 700, transition: "color 0.15s ease" }}>{value}</div>
      {subtext ? <div style={{ color: C.text, fontSize: 10, marginTop: 4 }}>{subtext}</div> : null}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value?: number | null }) {
  const normalized = normalizeScore(value);
  const color = scoreColor(normalized);
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase" }}>{label}</span>
        <span style={{ color, fontSize: 10, fontFamily: font, fontWeight: 700 }}>{normalized != null ? fmtNum(normalized, 0) : "—"}</span>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: C.border, overflow: "hidden" }}>
        <div style={{ width: `${normalized ?? 0}%`, height: "100%", background: `linear-gradient(90deg, ${color}66, ${color})` }} />
      </div>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: Array<{ label: string; value: ReactNode; color?: string }> }) {
  const visible = items.filter(item => item.value !== null && item.value !== undefined && item.value !== "—" && item.value !== "");
  if (!visible.length) return null;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, minWidth: 0 }}>
      <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {visible.map(item => (
          <div key={item.label} style={{ minWidth: 0 }}>
            <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>{item.label}</div>
            <div style={{ color: item.color || C.text, fontSize: 12, lineHeight: 1.5, wordBreak: "break-word" }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArrayFlagGroup({ title, values, color }: { title: string; values?: string[] | null; color: string }) {
  const items = ensureArray(values);
  if (!items.length) return null;
  return (
    <div>
      <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {items.map(item => (
          <Badge key={item} color={color} sm>{item}</Badge>
        ))}
      </div>
    </div>
  );
}

function TVChart({ symbol }: { symbol: string }) {
  const [ivl, setIvl] = useState("D");
  const ivls = [{ l: "1H", v: "60" }, { l: "4H", v: "240" }, { l: "1D", v: "D" }, { l: "1W", v: "W" }, { l: "1M", v: "M" }];
  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
        {ivls.map(iv => (
          <button
            key={iv.v}
            onClick={e => {
              e.stopPropagation();
              setIvl(iv.v);
            }}
            style={{
              padding: "2px 8px",
              fontSize: 9,
              fontWeight: 600,
              fontFamily: font,
              background: ivl === iv.v ? `${C.blue}20` : "transparent",
              color: ivl === iv.v ? C.blue : C.dim,
              border: `1px solid ${ivl === iv.v ? `${C.blue}40` : C.border}`,
              borderRadius: 3,
              cursor: "pointer",
            }}
          >
            {iv.l}
          </button>
        ))}
      </div>
      <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
        <iframe
          src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(symbol)}&interval=${ivl}&theme=dark&style=1&locale=en&hide_top_toolbar=1&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=220`}
          style={{ width: "100%", height: 220, border: "none", display: "block" }}
          title={`${symbol} chart`}
        />
      </div>
    </div>
  );
}

function Skeleton({ h = 16, mb = 8 }: { h?: number; mb?: number }) {
  return <div style={{ height: h, background: `${C.border}80`, borderRadius: 4, marginBottom: mb, animation: "pulse 1.5s ease-in-out infinite" }} />;
}

function SortIcon({ col, active, dir }: { col: string; active: string; dir: SortDir }) {
  if (col !== active) return <ArrowUpDown className="w-3 h-3" style={{ color: C.dim, opacity: 0.5 }} />;
  return dir === "asc" ? <ArrowUp className="w-3 h-3" style={{ color: C.blue }} /> : <ArrowDown className="w-3 h-3" style={{ color: C.blue }} />;
}

function useSortable<T extends Record<string, any>>(rows: T[], defaultCol: keyof T, defaultDir: SortDir = "desc") {
  const [col, setCol] = useState<keyof T>(defaultCol);
  const [dir, setDir] = useState<SortDir>(defaultDir);
  const toggle = (c: keyof T) => {
    if (c === col) setDir(d => d === "asc" ? "desc" : "asc");
    else {
      setCol(c);
      setDir("desc");
    }
  };
  const sorted = [...rows].sort((a, b) => {
    const av = a[col];
    const bv = b[col];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
  return { sorted, col: col as string, dir, toggle: toggle as (c: string) => void };
}

function ContractsMini({ contracts, side }: { contracts: OptionContract[]; side: "call" | "put" }) {
  if (!contracts?.length) return null;
  const color = sideColor(side);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color, fontSize: 10, fontWeight: 700, fontFamily: font, textTransform: "uppercase", marginBottom: 6 }}>Legacy Top {side}s</div>
      <div style={{ overflowX: "auto", borderRadius: 7, border: `1px solid ${color}20` }}>
        <div style={{ minWidth: 430, background: C.cardAlt, borderRadius: 7, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "70px 60px 70px 70px 55px 55px 50px", padding: "6px 10px", background: `${color}08`, fontSize: 9, fontFamily: font, textTransform: "uppercase", color: C.dim }}>
            <span>Strike</span><span>Expiry</span><span style={{ textAlign: "right" }}>Vol</span><span style={{ textAlign: "right" }}>OI</span><span style={{ textAlign: "right" }}>V/OI</span><span style={{ textAlign: "right" }}>IV</span><span style={{ textAlign: "right" }}>Δ</span>
          </div>
          {contracts.slice(0, 6).map((raw, i) => {
            const c = normalizeContract(raw);
            return (
              <div key={`${c.contract_symbol || c.symbol || i}`} style={{ display: "grid", gridTemplateColumns: "70px 60px 70px 70px 55px 55px 50px", padding: "5px 10px", borderTop: `1px solid ${C.border}`, fontSize: 11, fontFamily: font }}>
                <span style={{ color, fontWeight: 700 }}>${c.strike}</span>
                <span style={{ color: C.dim, fontSize: 10 }}>{compactDate(c.expiration)}</span>
                <span style={{ textAlign: "right", color: C.bright }}>{fmtVol(c.volume)}</span>
                <span style={{ textAlign: "right", color: C.text }}>{fmtVol(c.openInterest)}</span>
                <span style={{ textAlign: "right", color: voiColor(c.volumeToOi) }}>{c.volumeToOi != null ? `${fmtNum(c.volumeToOi, 1)}×` : "—"}</span>
                <span style={{ textAlign: "right", color: C.yellow }}>{c.iv != null ? fmtRatioPct(c.iv) : "—"}</span>
                <span style={{ textAlign: "right", color: C.text }}>{c.delta != null ? fmtNum(c.delta, 2) : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TopContractsSection({ ticker, historyReady }: { ticker: TickerResult; historyReady: boolean | null | undefined }) {
  const primaryContracts = (ticker.top_contracts?.length ? ticker.top_contracts : [...(ticker.top_calls || []), ...(ticker.top_puts || [])]).slice(0, 6);
  if (!primaryContracts.length) {
    return (
      <div style={{ padding: 12, border: `1px dashed ${C.border}`, borderRadius: 8, color: C.dim, fontSize: 12 }}>
        No top contracts were returned for this ticker in the current scan.
      </div>
    );
  }

  const metricStyle = { color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase" as const };
  const valStyle = { fontSize: 11, fontWeight: 600, fontFamily: font };

  return (
    <div style={{ display: "grid", gap: 4 }}>
      {primaryContracts.map((raw, index) => {
        const contract = normalizeContract(raw);
        const spreadWide = contract.spread_pct != null && contract.spread_pct > 15;
        const liquidityText = String(contract.contract_liquidity_quality || (spreadWide ? "wide spread" : contract.openInterest && contract.openInterest > 500 ? "strong liquidity" : "standard liquidity"));
        return (
          <div key={`${contract.contract_symbol || contract.symbol || index}`} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", minWidth: 0 }}>
            {/* Row 1: identity badges + strike/expiry — wraps freely */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ color: C.bright, fontFamily: font, fontWeight: 700, fontSize: 12 }}>{contract.underlying || ticker.ticker}</span>
              <Badge color={sideColor(contract.side)} sm>{contract.side || "?"}</Badge>
              <Badge color={scoreColor(normalizeScore(contract.contract_score))} sm>Score {normalizeScore(contract.contract_score) != null ? fmtNum(normalizeScore(contract.contract_score), 0) : "—"}</Badge>
              {spreadWide ? <Badge color={C.red} sm>Wide Spread</Badge> : contract.contract_liquidity_quality ? <Badge color={liquidityText.toLowerCase().includes("strong") ? C.green : C.blue} sm>{contract.contract_liquidity_quality}</Badge> : null}
              {contract.repeated_flow_score != null ? <Badge color={historyReady ? C.purple : C.orange} sm>{historyReady ? `Repeated ${fmtNum(normalizeScore(contract.repeated_flow_score), 0)}` : "Rpt Limited"}</Badge> : null}
              <span style={{ color: sideColor(contract.side), fontFamily: font, fontWeight: 700, fontSize: 11 }}>${contract.strike} · {compactDate(contract.expiration)}{contract.dte != null ? ` · ${contract.dte}D` : ""}</span>
            </div>
            {/* Row 2: key metrics in a responsive grid — never overflows */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "4px 10px" }}>
              {contract.bid != null && contract.ask != null && (
                <div>
                  <div style={metricStyle}>Bid / Ask</div>
                  <div style={{ ...valStyle, color: C.text }}>{fmtMoney(contract.bid)} / {fmtMoney(contract.ask)}</div>
                </div>
              )}
              <div>
                <div style={metricStyle}>Vol / OI</div>
                <div style={{ ...valStyle, color: C.blue }}>{fmtVol(contract.volume)} / {fmtVol(contract.openInterest)}{contract.volumeToOi != null ? ` (${fmtNum(contract.volumeToOi, 1)}×)` : ""}</div>
              </div>
              {contract.iv != null && (
                <div>
                  <div style={metricStyle}>IV</div>
                  <div style={{ ...valStyle, color: C.yellow }}>{fmtRatioPct(contract.iv)}</div>
                </div>
              )}
              {contract.delta != null && (
                <div>
                  <div style={metricStyle}>Delta</div>
                  <div style={{ ...valStyle, color: C.green }}>{fmtNum(contract.delta, 2)}</div>
                </div>
              )}
              {contract.break_even != null && (
                <div>
                  <div style={metricStyle}>Break-even</div>
                  <div style={{ ...valStyle, color: C.orange }}>{fmtMoney(contract.break_even)}{contract.break_even_distance_pct != null ? ` (${fmtSmartPct(contract.break_even_distance_pct)})` : ""}</div>
                </div>
              )}
              {contract.premium_traded_estimate != null && (
                <div>
                  <div style={metricStyle}>Premium</div>
                  <div style={{ ...valStyle, color: C.purple }}>{fmtMoney(contract.premium_traded_estimate, 0)}</div>
                </div>
              )}
            </div>
            {/* Row 3 (optional): thesis + scores */}
            {(contract.short_thesis || contract.flow_score != null || contract.asymmetry_score != null) && (
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {contract.short_thesis ? <span style={{ color: C.dim, fontSize: 11, lineHeight: 1.4, flex: 1, minWidth: 160 }}>{contract.short_thesis}</span> : null}
                {contract.flow_score != null ? <Badge color={C.blue} sm>Flow {fmtNum(normalizeScore(contract.flow_score), 0)}</Badge> : null}
                {contract.asymmetry_score != null ? <Badge color={C.green} sm>Asymmetry {fmtNum(normalizeScore(contract.asymmetry_score), 0)}</Badge> : null}
                {contract.iv_rank != null && !historyReady ? <Badge color={C.orange} sm>History Limited</Badge> : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TickerDetailPanel({ symbol, ticker }: { symbol: string; ticker: TickerResult }) {
  const [technicals, setTechnicals]       = useState<any>(null);
  const [history, setHistory]             = useState<any[]>([]);
  const [volumeSummary, setVolumeSummary] = useState<any>(null);
  const [screenerDetail, setScreenerDetail] = useState<any>(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setScreenerDetail(null);
    Promise.all([
      fetch(`${API_BASE}/technicals/${encodeURIComponent(symbol)}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/history/${encodeURIComponent(symbol)}?limit=60`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/volume-summary/${encodeURIComponent(symbol)}?days=30`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/screener/${encodeURIComponent(symbol)}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([tech, hist, vol, sd]) => {
      if (cancelled) return;
      setTechnicals(tech);
      setHistory(Array.isArray(hist?.bars || hist) ? (hist?.bars || hist) : []);
      setVolumeSummary(vol);
      setScreenerDetail(sd);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [symbol]);

  const dataQuality = ticker.data_quality || {};
  const historyReady = dataQuality.history_metrics_ready;

  if (loading) {
    return (
      <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 8, color: C.dim, fontSize: 11, fontFamily: font }}>
        <Loader2 className="w-3 h-3 animate-spin" /> Loading technicals & history for {symbol}...
      </div>
    );
  }

  const smaData = technicals?.sma_20 || technicals?.sma_50 ? (() => {
    const sma20List = Array.isArray(technicals?.sma_20) ? technicals.sma_20 : technicals?.sma_20 ? [technicals.sma_20] : [];
    const sma50List = Array.isArray(technicals?.sma_50) ? technicals.sma_50 : technicals?.sma_50 ? [technicals.sma_50] : [];
    const dateMap: Record<string, any> = {};
    sma20List.forEach((d: any) => { dateMap[d.date] = { ...dateMap[d.date], date: d.date, sma20: d.value }; });
    sma50List.forEach((d: any) => { dateMap[d.date] = { ...dateMap[d.date], date: d.date, sma50: d.value }; });
    return Object.values(dateMap).sort((a: any, b: any) => a.date.localeCompare(b.date));
  })() : [];
  const rsiData = (() => {
    const rsiList = Array.isArray(technicals?.rsi_14) ? technicals.rsi_14 : technicals?.rsi_14 ? [technicals.rsi_14] : [];
    return rsiList.map((d: any) => ({ date: d.date, rsi: d.value })).sort((a: any, b: any) => a.date.localeCompare(b.date));
  })();
  const macdData = (() => {
    const macdList = Array.isArray(technicals?.macd) ? technicals.macd : technicals?.macd ? [technicals.macd] : [];
    return macdList.map((d: any) => ({ date: d.date, macd: d.value, signal: d.signal, histogram: d.histogram })).sort((a: any, b: any) => a.date.localeCompare(b.date));
  })();
  const volumeChartData = history.slice(-30).map((bar: any) => ({
    date: bar.date || bar.day,
    callVol: bar.call_volume || 0,
    putVol: bar.put_volume || 0,
    pcRatio: bar.call_volume && bar.put_volume ? bar.put_volume / bar.call_volume : null,
  }));
  const chartStyle = { background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 8px", marginBottom: 10 };
  const chartLabel = (text: string) => <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, paddingLeft: 4 }}>{text}</div>;
  const thesisItems = ensureArray(ticker.thesis);
  const riskItems = ensureArray(ticker.risks);

  return (
    <div style={{ display: "grid", gap: 12, minWidth: 0 }} onClick={e => e.stopPropagation()}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <DetailList
          title="Signal thesis"
          items={[
            { label: "Primary signal", value: ticker.primary_signal || "—", color: getSignalColor(ticker.primary_signal) },
            { label: "Thesis", value: thesisItems.length ? thesisItems.join(" · ") : "—" },
            { label: "Risks", value: riskItems.length ? riskItems.join(" · ") : "—", color: riskItems.length ? C.orange : C.text },
            { label: "Expiration focus", value: fmtMaybeText(ticker.expiration_focus) },
          ]}
        />
        <DetailList
          title="Stock context"
          items={[
            { label: "Relative volume", value: ticker.stock_context?.stock_relative_volume != null ? `${fmtNum(ticker.stock_context.stock_relative_volume, 2)}×` : "—", color: C.blue },
            { label: "Intraday move", value: fmtSmartPct(ticker.stock_context?.stock_intraday_move_pct), color: C.text },
            { label: "Breakout", value: ticker.stock_context?.breakout_context || "—" },
            { label: "Compression", value: ticker.stock_context?.compression_context || "—" },
            { label: "Reversal", value: ticker.stock_context?.reversal_context || "—" },
            { label: "Catalyst", value: ticker.stock_context?.catalyst_context || "—" },
            { label: "Liquidity", value: ticker.stock_context?.liquidity_context || "—" },
            { label: "Short squeeze", value: ticker.stock_context?.short_squeeze_context || "—" },
            { label: "Macro", value: ticker.stock_context?.macro_context || "—" },
          ]}
        />
        <DetailList
          title="Options context"
          items={[
            { label: "Call/put volume", value: ticker.options_context?.call_put_volume_ratio != null ? `${fmtNum(ticker.options_context.call_put_volume_ratio, 2)}×` : "—", color: C.green },
            { label: "Call/put OI", value: ticker.options_context?.call_put_oi_ratio != null ? `${fmtNum(ticker.options_context.call_put_oi_ratio, 2)}×` : "—", color: C.blue },
            { label: "Near-spot OI density", value: fmtNum(ticker.options_context?.near_spot_oi_density, 2) },
            { label: "Near-spot gamma density", value: fmtNum(ticker.options_context?.near_spot_gamma_density, 2) },
            { label: "Current IV", value: ticker.options_context?.iv_current != null ? fmtRatioPct(ticker.options_context.iv_current) : "—", color: C.yellow },
            { label: "Expected move", value: fmtSmartPct(ticker.options_context?.expected_move_from_atm_straddle), color: C.orange },
            { label: "Gamma label", value: ticker.options_context?.gamma_score_is_approximation ? "Approximation used" : "Direct metric", color: ticker.options_context?.gamma_score_is_approximation ? C.orange : C.green },
          ]}
        />
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
            <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase" }}>Data quality</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Badge color={getConfidence(dataQuality.confidence, dataQuality.confidence_score).color} sm>{getConfidence(dataQuality.confidence, dataQuality.confidence_score).label} confidence</Badge>
              <Badge color={historyReady ? C.green : C.orange} sm>{historyReady ? "History Ready" : "History Limited"}</Badge>
            </div>
          </div>
          <ArrayFlagGroup title="Flags" values={dataQuality.flags} color={C.blue} />
          <ArrayFlagGroup title="Missing data" values={dataQuality.missing_data_flags} color={C.red} />
          <ArrayFlagGroup title="Approximate metrics" values={dataQuality.approximate_metrics} color={C.orange} />
          {!ensureArray(dataQuality.flags).length && !ensureArray(dataQuality.missing_data_flags).length && !ensureArray(dataQuality.approximate_metrics).length ? (
            <div style={{ color: C.dim, fontSize: 12 }}>No explicit quality flags returned.</div>
          ) : null}
        </div>
      </div>

      <div>
        <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase", marginBottom: 8 }}>Top contract ideas</div>
        <TopContractsSection ticker={ticker} historyReady={historyReady} />
      </div>

      {/* ── Enriched screener breakdown (from /api/options/screener/:symbol) ── */}
      {screenerDetail && (screenerDetail.premium_breakdown || screenerDetail.call_put_breakdown || screenerDetail.otm_breakdown || screenerDetail.recent_snapshot_history) && (
        <div style={{ display: "grid", gap: 12 }}>
          {/* Premium breakdown */}
          {screenerDetail.premium_breakdown && typeof screenerDetail.premium_breakdown === "object" && Object.keys(screenerDetail.premium_breakdown).length > 0 && (
            <div>
              <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase", marginBottom: 8 }}>Premium Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                {Object.entries(screenerDetail.premium_breakdown).map(([k, v]) => (
                  <div key={k} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{k.replace(/_/g, " ")}</div>
                    <div style={{ color: k.toLowerCase().includes("call") ? C.green : k.toLowerCase().includes("put") ? C.red : C.text, fontSize: 12, fontFamily: font, fontWeight: 600 }}>
                      {typeof v === "number" ? fmtCurrencyShort(v) : String(v ?? "—")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call / Put breakdown */}
          {screenerDetail.call_put_breakdown && typeof screenerDetail.call_put_breakdown === "object" && Object.keys(screenerDetail.call_put_breakdown).length > 0 && (
            <div>
              <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase", marginBottom: 8 }}>Call / Put Breakdown</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                {Object.entries(screenerDetail.call_put_breakdown).map(([k, v]) => {
                  const isCall = k.toLowerCase().includes("call");
                  const isPut  = k.toLowerCase().includes("put");
                  const isPct  = k.toLowerCase().includes("pct") || k.toLowerCase().includes("ratio");
                  return (
                    <div key={k} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{k.replace(/_/g, " ")}</div>
                      <div style={{ color: isCall ? C.green : isPut ? C.red : C.text, fontSize: 12, fontFamily: font, fontWeight: 600 }}>
                        {typeof v === "number" ? (isPct ? fmtSmartPct(v) : fmtCurrencyShort(v)) : String(v ?? "—")}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* OTM breakdown table */}
          {Array.isArray(screenerDetail.otm_breakdown) && screenerDetail.otm_breakdown.length > 0 && (() => {
            const rows: Record<string, unknown>[] = screenerDetail.otm_breakdown;
            const cols = Object.keys(rows[0]);
            return (
              <div>
                <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase", marginBottom: 8 }}>OTM Breakdown</div>
                <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: font }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.cardAlt }}>
                        {cols.map(c => <th key={c} style={{ color: C.dim, textAlign: "right", padding: "5px 10px", fontWeight: 400, textTransform: "uppercase", fontSize: 9 }}>{c.replace(/_/g, " ")}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                          {cols.map(c => {
                            const v = row[c];
                            const isPct = c.includes("pct") || c.includes("ratio");
                            const isVol = c.includes("vol") || c.includes("oi");
                            const display = typeof v === "number" ? (isPct ? fmtSmartPct(v) : isVol ? fmtVol(v) : fmtNum(v, 2)) : String(v ?? "—");
                            return <td key={c} style={{ color: C.text, textAlign: "right", padding: "6px 10px" }}>{display}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Recent snapshot history table */}
          {Array.isArray(screenerDetail.recent_snapshot_history) && screenerDetail.recent_snapshot_history.length > 0 && (() => {
            const rows: Record<string, unknown>[] = screenerDetail.recent_snapshot_history;
            const cols = Object.keys(rows[0]);
            return (
              <div>
                <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase", marginBottom: 8 }}>Recent Snapshot History</div>
                <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: font }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.cardAlt }}>
                        {cols.map(c => <th key={c} style={{ color: C.dim, textAlign: "right", padding: "5px 10px", fontWeight: 400, textTransform: "uppercase", fontSize: 9 }}>{c.replace(/_/g, " ")}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.border}40` }}>
                          {cols.map(c => {
                            const v = row[c];
                            const isScore  = c.includes("score");
                            const isPrem   = c.includes("prem") || c.includes("premium");
                            const isPct    = c.includes("pct") || c.includes("change");
                            const isSig    = c === "signal" || c === "primary_signal";
                            const display  = typeof v === "number"
                              ? (isScore ? fmtNum(v, 0) : isPrem ? fmtCurrencyShort(v) : isPct ? fmtSmartPct(v) : fmtNum(v, 2))
                              : String(v ?? "—");
                            const color = isSig ? getSignalColor(String(v)) : C.text;
                            return <td key={c} style={{ color, textAlign: "right", padding: "6px 10px" }}>{display}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <TVChart symbol={ticker.ticker} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        {smaData.length > 1 && (
          <div style={chartStyle}>
            {chartLabel("SMA 20 / 50")}
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={smaData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: C.dim }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 8, fill: C.dim }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} />
                <Line type="monotone" dataKey="sma20" stroke={C.blue} strokeWidth={1.5} dot={false} name="SMA 20" />
                <Line type="monotone" dataKey="sma50" stroke={C.orange} strokeWidth={1.5} dot={false} name="SMA 50" />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9, fontFamily: font }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {rsiData.length > 1 && (
          <div style={chartStyle}>
            {chartLabel("RSI (14)")}
            <ResponsiveContainer width="100%" height={140}>
              <ComposedChart data={rsiData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: C.dim }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 8, fill: C.dim }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} />
                <ReferenceLine y={70} stroke={C.red} strokeDasharray="3 3" strokeOpacity={0.6} />
                <ReferenceLine y={30} stroke={C.green} strokeDasharray="3 3" strokeOpacity={0.6} />
                <Area type="monotone" dataKey="rsi" fill={`${C.purple}15`} stroke={C.purple} strokeWidth={1.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {macdData.length > 1 && (
          <div style={chartStyle}>
            {chartLabel("MACD")}
            <ResponsiveContainer width="100%" height={140}>
              <ComposedChart data={macdData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: C.dim }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 8, fill: C.dim }} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} />
                <Bar dataKey="histogram" fill={C.blue} opacity={0.5} name="Histogram" />
                <Line type="monotone" dataKey="macd" stroke={C.blue} strokeWidth={1.5} dot={false} name="MACD" />
                <Line type="monotone" dataKey="signal" stroke={C.orange} strokeWidth={1.5} dot={false} name="Signal" />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9, fontFamily: font }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {volumeChartData.length > 0 && (
          <div style={chartStyle}>
            {chartLabel("Daily Options Volume (30d)")}
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={volumeChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: C.dim }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 8, fill: C.dim }} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} />
                <Bar dataKey="callVol" fill={C.green} opacity={0.8} name="Call Vol" />
                <Bar dataKey="putVol" fill={C.red} opacity={0.8} name="Put Vol" />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9, fontFamily: font }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {volumeChartData.filter(d => d.pcRatio != null).length > 1 && (
          <div style={chartStyle}>
            {chartLabel("Put/Call Ratio Trend (30d)")}
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={volumeChartData.filter(d => d.pcRatio != null)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 8, fill: C.dim }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 8, fill: C.dim }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} />
                <ReferenceLine y={1} stroke={C.yellow} strokeDasharray="3 3" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="pcRatio" stroke={C.yellow} strokeWidth={1.5} dot={false} name="P/C Ratio" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>

      {smaData.length <= 1 && rsiData.length <= 1 && macdData.length <= 1 && volumeChartData.length === 0 && !volumeSummary && (
        <div style={{ gridColumn: "1 / -1", padding: "16px 0", color: C.dim, fontSize: 11, fontFamily: font, textAlign: "center" }}>
          <Activity className="w-4 h-4 inline-block" style={{ marginRight: 6 }} />
          Technical data not yet available — enrichment ingestion may still be in progress.
        </div>
      )}

      {/* Volume summary + Legacy top calls/puts side by side */}
      {(volumeSummary || !!ticker.top_calls?.length || !!ticker.top_puts?.length) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 4 }}>
          {volumeSummary && (
            <div style={chartStyle}>
              {chartLabel("30-Day Volume Summary")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "4px 4px" }}>
                {[
                  { label: "Call Total Vol", value: fmtVol(volumeSummary.call_total_volume), color: C.green },
                  { label: "Put Total Vol", value: fmtVol(volumeSummary.put_total_volume), color: C.red },
                  { label: "Call Avg Daily", value: fmtVol(volumeSummary.call_avg_daily_vol), color: C.green },
                  { label: "Put Avg Daily", value: fmtVol(volumeSummary.put_avg_daily_vol), color: C.red },
                  { label: "Call Contracts", value: fmtVol(volumeSummary.call_unique_contracts), color: C.blue },
                  { label: "Put Contracts", value: fmtVol(volumeSummary.put_unique_contracts), color: C.purple },
                ].map(s => (
                  <div key={s.label} style={{ padding: "5px 8px", background: `${s.color}08`, borderRadius: 5, border: `1px solid ${s.color}15` }}>
                    <div style={{ color: C.dim, fontSize: 8, fontFamily: font, textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
                    <div style={{ color: s.color, fontSize: 13, fontWeight: 700, fontFamily: font }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(!!ticker.top_calls?.length || !!ticker.top_puts?.length) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <ContractsMini contracts={ticker.top_calls || []} side="call" />
              <ContractsMini contracts={ticker.top_puts || []} side="put" />
            </div>
          )}
        </div>
      )}

      <ThematicSection fields={ticker} />

      <TimeSalesPanel symbol={symbol} />
    </div>
  );
}

function DataIngestionWidget() {
  const [summary, setSummary] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ingestion-summary`, { headers: authHeaders() });
      if (res.ok) setSummary(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !summary) fetchStatus();
  }, [open, summary, fetchStatus]);

  const tickersIngested = summary?.tickers_ingested ?? "?";
  const tickersTotal = summary?.tickers_total ?? "?";
  const barsStored = summary?.total_bars ?? "?";
  const lastUpdated = summary?.last_updated;
  const formattedTime = lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "unknown";

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", fontSize: 10, fontWeight: 600, fontFamily: font, background: open ? `${C.purple}15` : "transparent", color: open ? C.purple : C.dim, border: `1px solid ${open ? `${C.purple}40` : C.border}`, borderRadius: 6, cursor: "pointer" }}>
        <Database className="w-3 h-3" />
        Ingestion Status
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div style={{ marginTop: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px", animation: "fadeIn 0.2s ease" }}>
          {loading ? (
            <div style={{ color: C.dim, fontSize: 11, fontFamily: font, display: "flex", alignItems: "center", gap: 6 }}>
              <Loader2 className="w-3 h-3 animate-spin" /> Fetching ingestion status...
            </div>
          ) : (
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ color: C.text, fontSize: 12, fontFamily: font }}>
                <span style={{ color: C.bright, fontWeight: 700 }}>{tickersIngested}</span>
                <span style={{ color: C.dim }}> / {tickersTotal} tickers ingested</span>
              </div>
              <div style={{ color: C.text, fontSize: 12, fontFamily: font }}>
                <span style={{ color: C.blue, fontWeight: 700 }}>{typeof barsStored === "number" ? barsStored.toLocaleString() : barsStored}</span>
                <span style={{ color: C.dim }}> bars stored</span>
              </div>
              <div style={{ color: C.dim, fontSize: 11, fontFamily: font }}>
                Last updated: <span style={{ color: C.text }}>{formattedTime}</span>
              </div>
              <button onClick={fetchStatus} style={{ padding: "3px 8px", fontSize: 9, fontFamily: font, background: `${C.blue}12`, border: `1px solid ${C.blue}30`, borderRadius: 4, color: C.blue, cursor: "pointer" }}>
                <RefreshCw className="w-3 h-3 inline-block" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TickerRows({ t, index, isExp, onToggle }: { t: TickerResult; index: number; isExp: boolean; onToggle: () => void }) {
  const confidence = getConfidence(t.confidence || t.data_quality?.confidence, t.confidence_score ?? t.data_quality?.confidence_score ?? null);
  const signalColor = getSignalColor(t.primary_signal);
  const tags = signalTagsForTicker(t);
  const modular = t.modular_scores || {};
  return (
    <Fragment>
      <tr onClick={onToggle} style={{ borderTop: `1px solid ${C.border}`, cursor: "pointer", background: isExp ? `${C.blue}06` : "transparent", verticalAlign: "top", transition: "opacity 0.15s ease, transform 0.2s ease" }}>
        <td style={{ padding: "12px 10px" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>#{index + 1}</span>
              <span style={{ color: C.bright, fontFamily: font, fontWeight: 800, fontSize: 14 }}>{t.ticker}</span>
              {t.category ? <Badge color={t.category === "etf" ? C.purple : C.blue} sm>{t.category}</Badge> : null}
            </div>
            <TickerThematicBadge fields={t} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontFamily: font, fontSize: 11 }}>
              <span style={{ color: C.bright }}>{fmtMoney(t.underlying_price)}</span>
              <span style={{ color: (safeNum(t.price_change_pct) ?? 0) >= 0 ? C.green : C.red }}>{fmtSmartPct(t.price_change_pct)}</span>
            </div>
            {t.expiration_focus?.length ? <div style={{ color: C.dim, fontSize: 10 }}>Focus: {fmtMaybeText(t.expiration_focus)}</div> : null}
          </div>
        </td>
        <td style={{ padding: "12px 10px" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {t.primary_signal ? <Badge color={signalColor}>{t.primary_signal}</Badge> : <Badge color={C.dim}>No primary signal</Badge>}
              <Badge color={confidence.color}>{confidence.label} confidence</Badge>
              {t.options_context?.gamma_score_is_approximation ? <Badge color={C.orange}>Gamma Approx.</Badge> : null}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tags.length ? tags.map(tag => <Badge key={tag.label} color={tag.color} sm>{tag.label}</Badge>) : <span style={{ color: C.dim, fontSize: 11 }}>No secondary tags</span>}
            </div>
          </div>
        </td>
        <td style={{ padding: "12px 10px" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              <MetricBlock label="Total Vol" value={fmtVol(t.total_volume)} color={C.bright} />
              <MetricBlock label="P/C Ratio" value={t.pc_ratio != null ? fmtNum(t.pc_ratio, 2) : "—"} color={pcColor(t.pc_ratio ?? null)} />
              <MetricBlock label="Calls" value={fmtVol(t.call_volume)} color={C.green} />
              <MetricBlock label="Puts" value={fmtVol(t.put_volume)} color={C.red} />
            </div>
          </div>
        </td>
        <td style={{ padding: "12px 10px" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ color: scoreColor(normalizeScore(t.composite_score)), fontFamily: font, fontSize: 24, fontWeight: 800 }}>{normalizeScore(t.composite_score) != null ? fmtNum(normalizeScore(t.composite_score), 0) : "—"}</span>
              <span style={{ color: C.dim, fontSize: 10, fontFamily: font, textTransform: "uppercase" }}>Composite</span>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <ScoreBar label="Flow" value={modular.flow_score} />
              <ScoreBar label="Gamma" value={modular.gamma_score} />
              <ScoreBar label="Asymmetry" value={modular.asymmetry_score} />
              <ScoreBar label="Volatility" value={modular.volatility_score} />
              <ScoreBar label="Sentiment" value={modular.sentiment_score} />
              <ScoreBar label="Stock Context" value={modular.stock_context_score} />
            </div>
          </div>
        </td>
        <td style={{ padding: "12px 10px" }}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ color: C.text, fontSize: 12, lineHeight: 1.55 }}>{t.stock_context_summary || "No stock context summary returned."}</div>
            <div style={{ color: C.text, fontSize: 12, lineHeight: 1.55 }}>{t.options_context_summary || "No options context summary returned."}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {ensureArray(t.data_quality?.missing_data_flags).slice(0, 2).map(item => <Badge key={item} color={C.red} sm>{item}</Badge>)}
              {ensureArray(t.data_quality?.approximate_metrics).slice(0, 2).map(item => <Badge key={item} color={C.orange} sm>{item}</Badge>)}
            </div>
          </div>
        </td>
        <td style={{ padding: "12px 10px" }}>
          <div style={{ display: "grid", gap: 6, fontFamily: font, fontSize: 11 }}>
            <div style={{ color: C.text }}>Rel Vol <span style={{ color: C.blue }}>{t.stock_context?.stock_relative_volume != null ? `${fmtNum(t.stock_context.stock_relative_volume, 2)}×` : "—"}</span></div>
            <div style={{ color: C.text }}>Vol Ratio <span style={{ color: C.green }}>{t.options_context?.call_put_volume_ratio != null ? `${fmtNum(t.options_context.call_put_volume_ratio, 2)}×` : "—"}</span></div>
            <div style={{ color: C.text }}>OI Ratio <span style={{ color: C.blue }}>{t.options_context?.call_put_oi_ratio != null ? `${fmtNum(t.options_context.call_put_oi_ratio, 2)}×` : "—"}</span></div>
            <div style={{ color: C.text }}>IV <span style={{ color: C.yellow }}>{t.options_context?.iv_current != null ? fmtRatioPct(t.options_context.iv_current) : "—"}</span></div>
            <div style={{ color: C.text }}>Exp Move <span style={{ color: C.orange }}>{fmtSmartPct(t.options_context?.expected_move_from_atm_straddle)}</span></div>
          </div>
        </td>
        <td style={{ padding: "12px 10px", textAlign: "right" }}>
          {isExp ? <ChevronUp className="w-3 h-3" style={{ color: C.dim }} /> : <ChevronDown className="w-3 h-3" style={{ color: C.dim }} />}
        </td>
      </tr>
      {isExp && (
        <tr>
          <td colSpan={7} style={{ padding: "14px 16px", background: C.cardAlt, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            <TickerDetailPanel symbol={t.ticker} ticker={t} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function TickerSummaryTab({ tickers }: { tickers: TickerResult[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return tickers
      .map(t => ({
        ...t,
        _rsi: t.technicals?.rsi_14?.value ?? null,
        _trend: (() => {
          const s = trendSignal(t.technicals?.sma_20?.value, t.technicals?.sma_50?.value);
          return s ? (s.label === "Bullish" ? 1 : 0) : null;
        })(),
        _macd: t.technicals?.macd?.histogram ?? null,
        _histVol: ((t.historic_volume?.call_total_volume ?? 0) + (t.historic_volume?.put_total_volume ?? 0)) || null,
        _composite: normalizeScore(t.composite_score) ?? -1,
      }))
      .sort((a, b) => (b._composite ?? -1) - (a._composite ?? -1));
  }, [tickers]);

  const TH = ({ label, width, right }: { label: string; width?: string | number; right?: boolean }) => (
    <th style={{ padding: "8px 10px", width, textAlign: right ? "right" : "left", fontSize: 9, fontFamily: font, textTransform: "uppercase", color: C.dim, whiteSpace: "nowrap" }}>{label}</th>
  );

  return (
    <div>
      <div style={{ display: "flex", marginBottom: 10, justifyContent: "flex-end" }}>
        <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>{filtered.length} ranked tickers</span>
      </div>

      <SectionCard>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: `${C.border}50` }}>
                <TH label="# / Ticker" width={170} />
                <TH label="Signal / Confidence" width={260} />
                <TH label="Price / Flow" width={190} />
                <TH label="Composite + Modular Scores" width={300} />
                <TH label="Why It Ranks" />
                <TH label="Quick Metrics" width={220} />
                <th style={{ padding: "8px 10px", width: 30 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, index) => (
                <TickerRows
                  key={t.ticker}
                  t={t}
                  index={index}
                  isExp={expanded === t.ticker}
                  onToggle={() => setExpanded(expanded === t.ticker ? null : t.ticker)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: 13, fontFamily: sans }}>No tickers found for the selected filter.</div>}
      </SectionCard>
    </div>
  );
}

function FlowTab({ contracts, onContractClick }: { contracts: OptionContract[]; onContractClick?: (occSymbol: string) => void }) {
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [unusualOnly, setUnusualOnly] = useState(false);
  const [limit, setLimit] = useState(100);

  const normalizedContracts = useMemo(() => contracts.map(raw => {
    const c = normalizeContract(raw);
    return {
      ...c,
      category: c.category || "stock",
      contract_score_sort: normalizeScore(c.contract_score) ?? -1,
      flow_score_sort: normalizeScore(c.flow_score) ?? -1,
      asymmetry_score_sort: normalizeScore(c.asymmetry_score) ?? -1,
      premium_traded_estimate_sort: c.premium_traded_estimate ?? -1,
      option_volume_to_oi_ratio_sort: c.volumeToOi ?? -1,
      spread_pct_sort: c.spread_pct ?? -1,
      volume_sort: c.volume ?? -1,
      open_interest_sort: c.openInterest ?? -1,
      implied_volatility_sort: c.iv ?? -1,
      break_even_distance_pct_sort: c.break_even_distance_pct ?? -1,
      confidence_sort: normalizeScore(c.confidence ? ({ high: 90, medium: 60, low: 25 } as Record<string, number>)[c.confidence.toLowerCase()] : null) ?? -1,
      primary_signal_sort: c.primary_signal || "",
      underlying_sort: c.underlying || "",
    };
  }), [contracts]);

  const filtered = normalizedContracts.filter(c => {
    if (sideFilter !== "all" && c.side !== sideFilter) return false;
    if (unusualOnly && (c.volumeToOi == null || c.volumeToOi < 3)) return false;
    return true;
  });
  const { sorted, col, dir, toggle } = useSortable(filtered, "contract_score_sort");
  const visible = sorted.slice(0, limit);

  const TH = ({ c, label, right }: { c: string; label: string; right?: boolean }) => (
    <th onClick={() => toggle(c)} style={{ padding: "7px 8px", textAlign: right ? "right" : "left", fontSize: 9, fontFamily: font, textTransform: "uppercase", color: col === c ? C.blue : C.dim, cursor: "pointer", whiteSpace: "nowrap", userSelect: "none" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>{label} <SortIcon col={c} active={col} dir={dir} /></span>
    </th>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "call", "put"] as SideFilter[]).map(f => (
            <button key={f} onClick={() => setSideFilter(f)} style={{ padding: "4px 12px", fontSize: 10, fontWeight: 600, fontFamily: font, background: sideFilter === f ? `${sideColor(f === "all" ? "call" : f)}18` : "transparent", color: sideFilter === f ? sideColor(f === "all" ? "call" : f) : C.dim, border: `1px solid ${sideFilter === f ? `${sideColor(f === "all" ? "call" : f)}40` : C.border}`, borderRadius: 5, cursor: "pointer" }}>
              {f === "all" ? "Both" : f === "call" ? "Calls" : "Puts"}
            </button>
          ))}
        </div>
        <button onClick={() => setUnusualOnly(u => !u)} style={{ padding: "4px 12px", fontSize: 10, fontWeight: 600, fontFamily: font, background: unusualOnly ? `${C.orange}18` : "transparent", color: unusualOnly ? C.orange : C.dim, border: `1px solid ${unusualOnly ? `${C.orange}40` : C.border}`, borderRadius: 5, cursor: "pointer" }}>
          V/OI &gt; 3×
        </button>
        <span style={{ marginLeft: "auto", color: C.dim, fontSize: 11, fontFamily: font }}>{filtered.length} contracts</span>
      </div>

      <SectionCard>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: `${C.border}50` }}>
                <TH c="underlying_sort" label="Ticker" />
                <TH c="side" label="Side" />
                <TH c="contract_score_sort" label="Contract Score" right />
                <TH c="flow_score_sort" label="Flow" right />
                <TH c="asymmetry_score_sort" label="Asymmetry" right />
                <TH c="premium_traded_estimate_sort" label="Premium" right />
                <TH c="option_volume_to_oi_ratio_sort" label="V/OI" right />
                <TH c="spread_pct_sort" label="Spread %" right />
                <TH c="volume_sort" label="Volume" right />
                <TH c="open_interest_sort" label="OI" right />
                <TH c="implied_volatility_sort" label="IV" right />
                <TH c="break_even_distance_pct_sort" label="BE Dist" right />
                <TH c="primary_signal_sort" label="Signal" />
                <TH c="confidence_sort" label="Conf." right />
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => {
                const confidence = getConfidence(c.confidence, null);
                return (
                  <tr key={`${c.contract_symbol || c.symbol || i}`} style={{ borderTop: `1px solid ${C.border}`, cursor: onContractClick ? "pointer" : undefined }} onClick={() => { const sym = c.contract_symbol || c.symbol; if (onContractClick && sym) onContractClick(sym); }}>
                    <td style={{ padding: "8px 8px" }}>
                      <div style={{ fontFamily: font, fontWeight: 700, fontSize: 12, color: C.bright }}>{c.underlying || "—"}</div>
                      <div style={{ color: onContractClick ? C.blue : C.dim, fontSize: 10, textDecoration: onContractClick ? "underline" : "none" }}>{c.symbol || c.contract_symbol || ""}</div>
                    </td>
                    <td style={{ padding: "8px 8px" }}><Badge color={sideColor(c.side)} sm>{c.side || "—"}</Badge></td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: scoreColor(normalizeScore(c.contract_score)), fontWeight: 700 }}>{normalizeScore(c.contract_score) != null ? fmtNum(normalizeScore(c.contract_score), 0) : "—"}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: C.blue }}>{normalizeScore(c.flow_score) != null ? fmtNum(normalizeScore(c.flow_score), 0) : "—"}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: C.green }}>{normalizeScore(c.asymmetry_score) != null ? fmtNum(normalizeScore(c.asymmetry_score), 0) : "—"}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: C.purple }}>{c.premium_traded_estimate != null ? fmtMoney(c.premium_traded_estimate, 0) : "—"}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: voiColor(c.volumeToOi) }}>{c.volumeToOi != null ? `${fmtNum(c.volumeToOi, 1)}×` : "—"}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: c.spread_pct != null && c.spread_pct > 15 ? C.red : C.text }}>{c.spread_pct != null ? fmtPlainPct(c.spread_pct) : "—"}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: C.bright }}>{fmtVol(c.volume)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: C.text }}>{fmtVol(c.openInterest)}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: C.yellow }}>{c.iv != null ? fmtRatioPct(c.iv) : "—"}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: font, color: C.orange }}>{fmtSmartPct(c.break_even_distance_pct)}</td>
                    <td style={{ padding: "8px 8px" }}>{c.primary_signal ? <Badge color={getSignalColor(c.primary_signal)} sm>{c.primary_signal}</Badge> : <span style={{ color: C.dim, fontSize: 11 }}>—</span>}</td>
                    <td style={{ padding: "8px 8px", textAlign: "right" }}>{c.confidence ? <Badge color={confidence.color} sm>{confidence.label}</Badge> : <span style={{ color: C.dim, fontSize: 11 }}>—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 && <div style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: 13, fontFamily: sans }}>No contracts match your filters.</div>}
        {filtered.length > limit && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", justifyContent: "center" }}>
            <button onClick={() => setLimit(l => l + 100)} style={{ padding: "6px 18px", background: `${C.blue}12`, border: `1px solid ${C.blue}30`, borderRadius: 6, color: C.blue, fontSize: 11, fontFamily: font, cursor: "pointer" }}>
              Show more ({filtered.length - limit} remaining)
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ── Contract Detail Modal (Tradier-only) ── */
function ContractDetailModal({ occSymbol, onClose }: { occSymbol: string; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${API_BASE}/contract-detail/${encodeURIComponent(occSymbol)}`, { headers: authHeaders() })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(json => { if (!cancelled) setDetail(json); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [occSymbol]);

  const quote = detail?.quote;
  const history = detail?.history?.bars || detail?.history || [];
  const timesales = detail?.timesales?.ticks || detail?.timesales || [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)" }} />
      <div style={{ position: "relative", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, width: "90%", maxWidth: 800, maxHeight: "85vh", overflow: "auto", padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Eye className="w-4 h-4" style={{ color: C.blue }} />
            <span style={{ color: C.bright, fontSize: 14, fontWeight: 800, fontFamily: font }}>{occSymbol}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 4 }}><X className="w-4 h-4" /></button>
        </div>

        <div style={{ padding: "16px 18px" }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.dim, fontSize: 12, fontFamily: font, padding: "30px 0", justifyContent: "center" }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading contract detail...
            </div>
          )}
          {error && <div style={{ color: C.red, fontSize: 12, padding: "20px 0", textAlign: "center" }}>{error}</div>}

          {!loading && !error && detail && (
            <div style={{ display: "grid", gap: 16 }}>
              {/* Quote */}
              {quote && (
                <div>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", marginBottom: 8 }}>Live Quote</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                    <MetricBlock label="Last" value={fmtMoney(quote.last)} color={C.bright} />
                    <MetricBlock label="Bid / Ask" value={quote.bid != null && quote.ask != null ? `${fmtMoney(quote.bid)} / ${fmtMoney(quote.ask)}` : "—"} color={C.text} />
                    <MetricBlock label="Volume" value={fmtVol(quote.volume)} color={C.blue} />
                    <MetricBlock label="Open Int" value={fmtVol(quote.open_interest)} color={C.text} />
                    <MetricBlock label="Change" value={quote.change_percentage != null ? `${safeNum(quote.change_percentage)! >= 0 ? "+" : ""}${fmtNum(quote.change_percentage, 2)}%` : "—"} color={safeNum(quote.change_percentage) != null ? (safeNum(quote.change_percentage)! >= 0 ? C.green : C.red) : C.dim} />
                    {quote.greeks?.mid_iv != null && <MetricBlock label="Mid IV" value={fmtRatioPct(quote.greeks.mid_iv)} color={C.yellow} />}
                    {quote.greeks?.smv_vol != null && <MetricBlock label="SMV Vol" value={fmtRatioPct(quote.greeks.smv_vol)} color={C.orange} />}
                    {quote.greeks?.delta != null && <MetricBlock label="Greeks" value={`\u0394 ${fmtNum(quote.greeks.delta, 3)} \u00B7 \u0393 ${fmtNum(quote.greeks.gamma, 4)}`} color={C.green} subtext={`\u0398 ${fmtNum(quote.greeks.theta, 4)} \u00B7 \u03BD ${fmtNum(quote.greeks.vega, 3)}${quote.greeks.rho != null ? ` \u00B7 \u03C1 ${fmtNum(quote.greeks.rho, 4)}` : ""}`} />}
                  </div>
                </div>
              )}

              {/* Price History Chart */}
              {history.length > 1 && (
                <div>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", marginBottom: 8 }}>90-Day Price History</div>
                  <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 8px" }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <ComposedChart data={history.slice(-90)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fontSize: 8, fill: C.dim }} tickFormatter={(v: string) => v?.slice(5) || ""} />
                        <YAxis tick={{ fontSize: 8, fill: C.dim }} domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} />
                        <Area type="monotone" dataKey="close" fill={`${C.blue}15`} stroke={C.blue} strokeWidth={1.5} name="Close" />
                        <Bar dataKey="volume" fill={`${C.purple}40`} name="Volume" yAxisId="right" />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8, fill: C.dim }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Intraday Time & Sales */}
              {timesales.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Clock className="w-3 h-3" style={{ color: C.purple }} />
                    <span style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase" }}>Intraday Time & Sales ({timesales.length} ticks)</span>
                  </div>
                  <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 8px", marginBottom: 8 }}>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={timesales.slice(-120)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                        <XAxis dataKey="time" tick={{ fontSize: 7, fill: C.dim }} tickFormatter={(v: string) => v?.slice(11, 16) || ""} />
                        <YAxis tick={{ fontSize: 8, fill: C.dim }} domain={["auto", "auto"]} />
                        <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} />
                        <Line type="monotone" dataKey="price" stroke={C.green} strokeWidth={1.5} dot={false} name="Price" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ maxHeight: 200, overflowY: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: `${C.border}50` }}>
                          <th style={{ padding: "5px 8px", fontSize: 9, fontFamily: font, textAlign: "left", color: C.dim }}>TIME</th>
                          <th style={{ padding: "5px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>PRICE</th>
                          <th style={{ padding: "5px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>SIZE</th>
                          <th style={{ padding: "5px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>VWAP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timesales.slice(-50).reverse().map((tick: any, i: number) => (
                          <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                            <td style={{ padding: "4px 8px", fontSize: 10, fontFamily: font, color: C.text }}>{tick.time?.slice(11, 19) || tick.timestamp || "—"}</td>
                            <td style={{ padding: "4px 8px", fontSize: 10, fontFamily: font, color: C.bright, textAlign: "right" }}>{fmtMoney(tick.price)}</td>
                            <td style={{ padding: "4px 8px", fontSize: 10, fontFamily: font, color: C.blue, textAlign: "right" }}>{fmtVol(tick.volume || tick.size)}</td>
                            <td style={{ padding: "4px 8px", fontSize: 10, fontFamily: font, color: C.purple, textAlign: "right" }}>{tick.vwap != null ? fmtMoney(tick.vwap) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Time & Sales Panel (for ticker detail, Tradier-only) ── */
function TimeSalesPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/timesales/${encodeURIComponent(symbol)}?interval=5min`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (!cancelled) {
          const ticks = json?.ticks || json?.timesales || json?.data || [];
          setData(Array.isArray(ticks) ? ticks : []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol]);

  if (loading) return <div style={{ padding: 12, color: C.dim, fontSize: 11, fontFamily: font, display: "flex", alignItems: "center", gap: 6 }}><Loader2 className="w-3 h-3 animate-spin" /> Loading time & sales...</div>;
  if (!data.length) return <div style={{ padding: 12, color: C.dim, fontSize: 11, fontFamily: font }}>No intraday time & sales data available.</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <Clock className="w-3 h-3" style={{ color: C.purple }} />
        <span style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase" }}>Intraday Time & Sales — {symbol}</span>
      </div>
      <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 8px", marginBottom: 8 }}>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={data.slice(-120)} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="time" tick={{ fontSize: 7, fill: C.dim }} tickFormatter={(v: string) => v?.slice(11, 16) || ""} />
            <YAxis tick={{ fontSize: 8, fill: C.dim }} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10 }} />
            <Line type="monotone" dataKey="price" stroke={C.green} strokeWidth={1.5} dot={false} name="Price" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ maxHeight: 180, overflowY: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: `${C.border}50` }}>
              <th style={{ padding: "4px 8px", fontSize: 9, fontFamily: font, textAlign: "left", color: C.dim }}>TIME</th>
              <th style={{ padding: "4px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>OPEN</th>
              <th style={{ padding: "4px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>HIGH</th>
              <th style={{ padding: "4px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>LOW</th>
              <th style={{ padding: "4px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>CLOSE</th>
              <th style={{ padding: "4px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>VOL</th>
              <th style={{ padding: "4px 8px", fontSize: 9, fontFamily: font, textAlign: "right", color: C.dim }}>VWAP</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(-30).reverse().map((tick: any, i: number) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "3px 8px", fontSize: 10, fontFamily: font, color: C.text }}>{tick.time?.slice(11, 16) || tick.timestamp || "—"}</td>
                <td style={{ padding: "3px 8px", fontSize: 10, fontFamily: font, color: C.text, textAlign: "right" }}>{fmtMoney(tick.open)}</td>
                <td style={{ padding: "3px 8px", fontSize: 10, fontFamily: font, color: C.green, textAlign: "right" }}>{fmtMoney(tick.high)}</td>
                <td style={{ padding: "3px 8px", fontSize: 10, fontFamily: font, color: C.red, textAlign: "right" }}>{fmtMoney(tick.low)}</td>
                <td style={{ padding: "3px 8px", fontSize: 10, fontFamily: font, color: C.bright, textAlign: "right" }}>{fmtMoney(tick.close || tick.price)}</td>
                <td style={{ padding: "3px 8px", fontSize: 10, fontFamily: font, color: C.blue, textAlign: "right" }}>{fmtVol(tick.volume)}</td>
                <td style={{ padding: "3px 8px", fontSize: 10, fontFamily: font, color: C.purple, textAlign: "right" }}>{tick.vwap != null ? fmtMoney(tick.vwap) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ─── Scan tab definitions ─────────────────────────────────────────────────
type ScanTab = "etf" | "megacap" | "large_cap" | "small_cap";
const SCAN_TAB_LABELS: Record<ScanTab, string> = {
  etf: "ETFs",
  megacap: "Megacap ($1T+)",
  large_cap: "Large Cap ($100B–$999B)",
  small_cap: "Small Cap ($500M–$99B)",
};
const SCAN_TAB_SHORT: Record<ScanTab, string> = {
  etf: "ETFs",
  megacap: "Megacaps",
  large_cap: "Large Caps",
  small_cap: "Small Caps",
};
const SCAN_TAB_ORDER: ScanTab[] = ["etf", "megacap", "large_cap", "small_cap"];

// ─── Per-panel status badge ───────────────────────────────────────────────
function PanelStatusBadge({
  dataState, fromCache, cacheAge, isRefreshing, refreshInProgress,
}: {
  dataState?: string | null;
  fromCache?: boolean;
  cacheAge?: number | null;
  isRefreshing?: boolean;
  refreshInProgress?: boolean;
}) {
  const spinning = isRefreshing || refreshInProgress;
  if (spinning) {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.blue, fontSize: 10, fontFamily: font }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, display: "inline-block", animation: "pulse 1.2s ease-in-out infinite" }} />
        refreshing
      </span>
    );
  }
  const state = (dataState || "").toLowerCase();
  if (state === "live_ok" || state === "ok") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.green, fontSize: 10, fontFamily: font }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
        {cacheAge != null ? `live · ${cacheAge}s` : "live"}
      </span>
    );
  }
  if (state === "stale_but_available") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.yellow, fontSize: 10, fontFamily: font }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.yellow, display: "inline-block" }} />
        {fromCache && cacheAge != null ? `stale · ${cacheAge}s` : "stale"}
      </span>
    );
  }
  if (!state || state === "no_data_yet" || state === "none" || state === "warming") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.blue, fontSize: 10, fontFamily: font }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, display: "inline-block", animation: "pulse 1.4s ease-in-out infinite" }} />
        scanning
      </span>
    );
  }
  return (
    <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>{toTitleCase(state)}</span>
  );
}

// ─── Ticker detail modal ──────────────────────────────────────────────────
function TickerDetailModal({ ticker, onClose }: { ticker: TickerResult; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 24, paddingBottom: 24 }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.76)" }} />
      <div
        style={{ position: "relative", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, width: "92%", maxWidth: 920, maxHeight: "calc(100vh - 48px)", overflowY: "auto", overflowX: "hidden" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ color: C.bright, fontSize: 16, fontWeight: 800, fontFamily: font }}>{ticker.ticker}</span>
            {ticker.primary_signal && <Badge color={getSignalColor(ticker.primary_signal)}>{ticker.primary_signal}</Badge>}
            {ticker.asset_type && <Badge color={C.blue}>{ticker.asset_type}</Badge>}
            {ticker.market_cap_bucket && <Badge color={C.purple}>{ticker.market_cap_bucket}</Badge>}
            {ticker.composite_score != null && (
              <span style={{ color: scoreColor(normalizeScore(ticker.composite_score)), fontFamily: font, fontSize: 11 }}>
                score {fmtNum(normalizeScore(ticker.composite_score), 0)}
              </span>
            )}
            {ticker.underlying_price != null && (
              <span style={{ color: C.text, fontFamily: font, fontSize: 12 }}>{fmtMoney(ticker.underlying_price)}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 4 }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div style={{ padding: "16px 18px", minWidth: 0, overflow: "hidden" }}>
          <TickerDetailPanel symbol={ticker.ticker} ticker={ticker} />
        </div>
      </div>
    </div>
  );
}

// ─── Compact ticker row (per-panel card list) ─────────────────────────────
function CompactTickerRow({ t, rank, onClick }: { t: TickerResult; rank: number; onClick: () => void }) {
  const score = normalizeScore(t.composite_score);
  const signalColor = getSignalColor(t.primary_signal);
  const pchg = safeNum(t.price_change_pct);
  const pchgPct = pchg != null ? (Math.abs(pchg) <= 1 ? pchg * 100 : pchg) : null;
  const tags = signalTagsForTicker(t).slice(0, 2);
  return (
    <div
      onClick={onClick}
      style={{ display: "grid", gridTemplateColumns: "22px 1fr 20px", alignItems: "start", gap: 8, padding: "10px 12px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.1s ease" }}
      onMouseEnter={e => (e.currentTarget.style.background = `${C.blue}07`)}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Rank */}
      <span style={{ color: C.dim, fontSize: 10, fontFamily: font, textAlign: "right", paddingTop: 2 }}>#{rank}</span>
      {/* Main */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ color: C.bright, fontFamily: font, fontWeight: 800, fontSize: 13 }}>{t.ticker}</span>
          {t.primary_signal && <Badge color={signalColor} sm>{t.primary_signal}</Badge>}
          {t.asset_type && <Badge color={C.dim} sm>{t.asset_type}</Badge>}
          {t.market_cap_bucket && <Badge color={C.dim} sm>{t.market_cap_bucket}</Badge>}
          {pchgPct != null && (
            <span style={{ color: pchgPct >= 0 ? C.green : C.red, fontFamily: font, fontSize: 10 }}>
              {pchgPct >= 0 ? "+" : ""}{pchgPct.toFixed(1)}%
            </span>
          )}
          {t.underlying_price != null && (
            <span style={{ color: C.text, fontFamily: font, fontSize: 10 }}>{fmtMoney(t.underlying_price)}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {score != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: C.dim, fontSize: 9, fontFamily: font }}>score</span>
              <div style={{ width: 44, height: 4, background: C.border, borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: `${score}%`, height: "100%", background: scoreColor(score) }} />
              </div>
              <span style={{ color: scoreColor(score), fontSize: 10, fontFamily: font, fontWeight: 700 }}>{fmtNum(score, 0)}</span>
            </div>
          )}
          {t.pc_ratio != null && (
            <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>
              P/C <span style={{ color: pcColor(t.pc_ratio) }}>{fmtNum(t.pc_ratio, 2)}</span>
            </span>
          )}
          {t.total_volume != null && (
            <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>
              vol <span style={{ color: C.text }}>{fmtVol(t.total_volume)}</span>
            </span>
          )}
          {tags.map(tag => <Badge key={tag.label} color={tag.color} sm>{tag.label}</Badge>)}
        </div>
        {(t.stock_context_summary || t.options_context_summary) && (
          <div style={{ color: C.dim, fontSize: 10, lineHeight: 1.4, marginTop: 4 }}>
            {((t.stock_context_summary || t.options_context_summary) ?? "").slice(0, 90)}
            {((t.stock_context_summary || t.options_context_summary) ?? "").length > 90 ? "…" : ""}
          </div>
        )}
      </div>
      {/* Expand indicator */}
      <ChevronDown className="w-3 h-3" style={{ color: C.dim, flexShrink: 0, marginTop: 4 }} />
    </div>
  );
}

// ─── Master Screener — TradingView-style screener from /api/options/screener ─
type FilterChip =
  | "all" | "stock" | "etf" | "call" | "put" | "bullish" | "bearish"
  | "high_premium" | "unusual_otm" | "short_dte" | "high_heat" | "small" | "large";
type SortField =
  | "score" | "heat" | "symbol" | "move" | "premium" | "vol" | "oi"
  | "oi_change" | "vol_oi" | "call_pct" | "dte";

const FILTER_CHIPS: Array<{ key: FilterChip; label: string }> = [
  { key: "all",          label: "All" },
  { key: "stock",        label: "Stocks" },
  { key: "etf",          label: "ETFs" },
  { key: "call",         label: "Calls" },
  { key: "put",          label: "Puts" },
  { key: "bullish",      label: "Bullish" },
  { key: "bearish",      label: "Bearish" },
  { key: "high_premium", label: "High Premium" },
  { key: "unusual_otm",  label: "Unusual OTM" },
  { key: "short_dte",    label: "Short DTE" },
  { key: "high_heat",    label: "High Heat" },
  { key: "small",        label: "Small Cap" },
  { key: "large",        label: "Large Cap" },
];

// ── Screener derive helpers ────────────────────────────────────────────────
const COL_TIPS: Record<string, string> = {
  heat:    "Custom composite of signal score, premium, volume/OI, OI delta, premium delta, and urgency.",
  premium: "Estimated dollar value of the option flow.",
  prem_d:  "Premium change versus prior cached snapshot.",
  oi_d:    "Open interest change versus prior cached snapshot.",
  voi:     "Volume ÷ open interest. High values may indicate unusual activity.",
  callpct: "Share of total volume flowing into calls.",
  putpct:  "Share of total volume flowing into puts.",
  otm:     "Distance of the contract strike from the underlying price.",
  unusual: "OTM contract with meaningful premium and unusually high volume/OI.",
  dte:     "Days until expiration of the primary contract focus.",
  g_delta: "Estimated option price move for a $1 move in the stock.",
  g_gamma: "How quickly Delta changes.",
  g_theta: "Estimated daily time decay.",
  g_vega:  "Sensitivity to implied volatility.",
  g_iv:    "Implied volatility estimate.",
};

const getBias = (t: TickerResult): { label: string; color: string } | null => {
  const sig = (t.primary_signal || "").toLowerCase();
  if (sig.includes("bull") || sig.includes("breakout") || sig.includes("squeeze"))
    return { label: "Bullish", color: C.green };
  if (sig.includes("bear") || sig.includes("short") || sig.includes("reversal"))
    return { label: "Bearish", color: C.red };
  const pcr = safeNum(t.pc_ratio);
  if (pcr != null && pcr < 0.75) return { label: "Calls", color: C.green };
  if (pcr != null && pcr > 1.25) return { label: "Puts",  color: C.red };
  return null;
};

const getDTE = (t: TickerResult): number | null => {
  const d = safeNum(t.top_contracts?.[0]?.dte);
  if (d != null) return d;
  const ef = t.expiration_focus;
  if (Array.isArray(ef) && ef.length > 0) {
    const last = ef[ef.length - 1];
    if (typeof last === "number") return last;
  }
  return null;
};

const getOTMPct = (t: TickerResult): number | null => {
  const c = t.top_contracts?.[0];
  const bep = safeNum(c?.break_even_distance_pct);
  if (bep != null) return bep;
  const strike = safeNum(c?.strike);
  const price  = safeNum(t.underlying_price);
  if (strike != null && price != null && price > 0)
    return ((strike - price) / price) * 100;
  return null;
};

const getCallPct = (t: TickerResult): number | null => {
  const cv = safeNum(t.call_volume), tv = safeNum(t.total_volume);
  return (cv != null && tv != null && tv > 0) ? (cv / tv) * 100 : null;
};

const getPutPct = (t: TickerResult): number | null => {
  const pv = safeNum(t.put_volume), tv = safeNum(t.total_volume);
  return (pv != null && tv != null && tv > 0) ? (pv / tv) * 100 : null;
};

const getVolOI = (t: TickerResult): number | null => {
  const vol = safeNum(t.total_volume), oi = safeNum(t.total_oi);
  return (vol != null && oi != null && oi > 0) ? vol / oi : null;
};

const getTopContractGreeks = (t: TickerResult) => {
  const c = t.top_contracts?.[0];
  if (!c) return { delta: null, gamma: null, theta: null, vega: null, iv: null };
  const nc = normalizeContract(c);
  return { delta: nc.delta, gamma: nc.gamma, theta: nc.theta, vega: nc.vega, iv: nc.iv };
};

const isUnusualOTM = (t: TickerResult): boolean => {
  if (t.unusual_otm != null) return Boolean(t.unusual_otm);
  return (t.top_contracts || []).some(c =>
    ((c.vol_oi_ratio ?? c.option_volume_to_oi_ratio ?? 0) > 10) &&
    ((c.break_even_distance_pct ?? 0) > 5)
  );
};

const heatColor = (h: number | null) => {
  if (h == null) return C.dim;
  if (h >= 80)   return C.green;
  if (h >= 60)   return C.blue;
  if (h >= 40)   return C.yellow;
  return C.text;
};

const SDot = ({ color, anim = false }: { color: string; anim?: boolean }) => (
  <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0, ...(anim ? { animation: "pulse 1.4s ease-in-out infinite" } : {}) }} />
);

// Column flex weights (proportional — table fills full viewport width)
const W = {
  rank: 22, ticker: 100, type: 44, price: 68, score: 56, heat: 50,
  signal: 130, bias: 60, move: 58, premium: 80, prem_d: 60, vol: 60,
  oi: 60, oi_d: 58, voi: 48, callpct: 50, putpct: 50, dte: 38,
  strike: 62, otm: 54, unusual: 64,
  g_delta: 36, g_gamma: 36, g_theta: 40, g_vega: 36, g_iv: 44,
} as const;

function MasterScreener({
  screenerData,
  pageLoading,
  pageRefreshing,
  onRefresh,
  onTickerSelect,
}: {
  screenerData: any;
  pageLoading: boolean;
  pageRefreshing: boolean;
  onRefresh: () => void;
  onTickerSelect: (t: TickerResult) => void;
}) {
  const [filter, setFilter]      = useState<FilterChip>("all");
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir]    = useState<SortDir>("desc");
  const [showAbout, setShowAbout] = useState(false);

  // Screener payload shape — backend wraps inner data in a .response key,
  // metadata (stale, cache_age_seconds, data_state) may live at top level or inside .response
  const resp = screenerData?.response ?? screenerData;
  const rawTickers: TickerResult[] = Array.isArray(resp?.tickers) ? resp.tickers : [];
  const dataState: string          = screenerData?.data_state || resp?.data_state || "no_data_yet";
  const isStale: boolean           = screenerData?.stale ?? resp?.stale ?? false;
  const cacheAge: number | null    = screenerData?.cache_age_seconds ?? resp?.cache_age_seconds ?? null;
  const refreshInProgress: boolean = screenerData?.refresh_in_progress ?? resp?.refresh_in_progress ?? false;
  const nextRefresh: number | null = screenerData?.next_refresh_in_seconds ?? resp?.next_refresh_in_seconds ?? null;
  const hasData = rawTickers.length > 0;

  const overallState = (() => {
    if (dataState === "live_ok")              return "live_ok";
    if (dataState === "stale_but_available" || isStale) return "stale_but_available";
    if (dataState === "refresh_in_progress"  || refreshInProgress || pageRefreshing) return "refresh_in_progress";
    if (dataState === "true_zero_results")   return "true_zero_results";
    return "no_data_yet";
  })();

  // Filter
  const filtered = useMemo(() => {
    if (filter === "all") return rawTickers;
    return rawTickers.filter(t => {
      const at  = (t.asset_type || "stock").toLowerCase();
      const cap = (t.market_cap_bucket || "").toLowerCase();
      const sig = (t.primary_signal || "").toLowerCase();
      const pcr = safeNum(t.pc_ratio);
      const dte = getDTE(t);
      switch (filter) {
        case "stock":        return at !== "etf";
        case "etf":          return at === "etf";
        case "call":         return (pcr != null && pcr < 0.85) || sig.includes("call") || sig.includes("bull");
        case "put":          return (pcr != null && pcr > 1.15) || sig.includes("put") || sig.includes("bear");
        case "bullish":      return sig.includes("bull") || sig.includes("breakout") || sig.includes("squeeze");
        case "bearish":      return sig.includes("bear") || sig.includes("short");
        case "high_premium": return (t.premium ?? 0) > 500_000;
        case "unusual_otm":  return isUnusualOTM(t);
        case "short_dte":    return dte != null && dte <= 7;
        case "high_heat":    return (t.heat_score ?? 0) >= 75;
        case "small":        return cap.includes("small");
        case "large":        return cap.includes("large") || cap.includes("mega");
        default:             return true;
      }
    });
  }, [rawTickers, filter]);

  // Multi-key sort: primary field, then heat → premium → score as tie-breakers
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const scoreOf = (t: TickerResult) => normalizeScore(t.composite_score) ?? -1;
    const heatOf  = (t: TickerResult) => t.heat_score ?? -1;
    const premOf  = (t: TickerResult) => t.premium ?? -1;
    return [...filtered].sort((a, b) => {
      let d = 0;
      switch (sortField) {
        case "score":     d = scoreOf(b) - scoreOf(a); break;
        case "heat":      d = heatOf(b) - heatOf(a); break;
        case "symbol":    d = a.ticker.localeCompare(b.ticker); break;
        case "move":      d = (safeNum(b.price_change_pct) ?? 0) - (safeNum(a.price_change_pct) ?? 0); break;
        case "premium":   d = premOf(b) - premOf(a); break;
        case "vol":       d = (b.total_volume ?? 0) - (a.total_volume ?? 0); break;
        case "oi":        d = (b.total_oi ?? 0) - (a.total_oi ?? 0); break;
        case "oi_change": d = (safeNum(b.oi_change_pct) ?? 0) - (safeNum(a.oi_change_pct) ?? 0); break;
        case "vol_oi":    d = (getVolOI(b) ?? 0) - (getVolOI(a) ?? 0); break;
        case "call_pct":  d = (getCallPct(b) ?? 0) - (getCallPct(a) ?? 0); break;
        case "dte":       d = (getDTE(a) ?? 9999) - (getDTE(b) ?? 9999); break;
      }
      if (d !== 0) return dir * d;
      const hd = heatOf(b) - heatOf(a); if (hd !== 0) return hd;
      const pd = premOf(b) - premOf(a); if (pd !== 0) return pd;
      return scoreOf(b) - scoreOf(a);
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const totalW = Object.values(W).reduce((a: number, b: number) => a + b, 0);

  // Column header helper (closure over sortField/sortDir/toggleSort)
  const ch = (id: string, label: string, sort?: SortField, align: "left" | "right" = "left") => {
    const active = !!sort && sortField === sort;
    return (
      <div
        key={id}
        onClick={sort ? () => toggleSort(sort) : undefined}
        title={COL_TIPS[id]}
        style={{
          flex: W[id as keyof typeof W], minWidth: 0, overflow: "hidden",
          padding: "0 5px 5px",
          fontSize: 9, fontFamily: font,
          textTransform: "uppercase" as const, letterSpacing: "0.06em",
          color: active ? C.blue : C.dim,
          cursor: sort ? "pointer" : "default",
          userSelect: "none" as const,
          display: "flex", alignItems: "center",
          justifyContent: align === "right" ? "flex-end" : "flex-start",
          gap: 2,
          borderBottom: `1px solid ${active ? C.blue + "55" : "transparent"}`,
          boxSizing: "border-box" as const,
        }}
      >
        {label}
        {active && <span>{sortDir === "desc" ? "↓" : "↑"}</span>}
        {!!COL_TIPS[id] && !active && <span style={{ opacity: 0.35, fontSize: 8 }}>ⓘ</span>}
      </div>
    );
  };

  // Status indicator
  const statusEl = (() => {
    if (pageLoading && !hasData) return null;
    const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontFamily: font };
    if (overallState === "live_ok")
      return <span style={{ ...base, color: C.green }}><SDot color={C.green} /> live</span>;
    if (overallState === "refresh_in_progress")
      return <span style={{ ...base, color: C.blue }}><SDot color={C.blue} anim /> refreshing{nextRefresh != null ? ` · ${nextRefresh}s` : ""}</span>;
    if (overallState === "stale_but_available")
      return <span style={{ ...base, color: C.yellow }}><SDot color={C.yellow} anim /> stale{cacheAge != null ? ` · ${cacheAge}s old` : ""}</span>;
    if (overallState === "no_data_yet")
      return <span style={{ ...base, color: C.blue }}><SDot color={C.blue} anim /> scanning…</span>;
    return null;
  })();

  if (pageLoading && !hasData) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 40 }}>
        <div style={{ width: 16, height: 16, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>Loading screener…</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

      {/* ── Filter / control bar ── */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0, background: C.bg }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTER_CHIPS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "3px 10px", borderRadius: 999,
              border: `1px solid ${filter === f.key ? C.blue : C.border}`,
              background: filter === f.key ? `${C.blue}14` : "transparent",
              color: filter === f.key ? C.blue : C.dim,
              fontSize: 10, fontFamily: font, cursor: "pointer", transition: "all 0.1s",
            }}>{f.label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        {sorted.length > 0 && <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>{sorted.length} signals</span>}
        {statusEl}
        {resp?.greeks_meta && (
          <span style={{ color: C.dim, fontSize: 9, fontFamily: font, opacity: 0.55 }} title="Greeks enriched contracts / total">
            Δ {resp.greeks_meta.contracts_enriched ?? 0}/{resp.greeks_meta.total_contracts ?? "?"}
          </span>
        )}
        <button onClick={() => setShowAbout(true)}
          style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 10, fontFamily: font, cursor: "pointer", transition: "border-color 0.1s, color 0.1s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue; (e.currentTarget as HTMLButtonElement).style.color = C.blue; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.dim; }}
        >
          About
        </button>
        <button onClick={onRefresh} disabled={pageLoading} title="Refresh"
          style={{ background: "none", border: "none", cursor: pageLoading ? "not-allowed" : "pointer", color: pageLoading ? C.border : C.dim, padding: 2, display: "flex", alignItems: "center" }}>
          <RefreshCw className={`w-3 h-3 ${pageRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Stale / refresh notice ── */}
      {hasData && (isStale || pageRefreshing || refreshInProgress) && (
        <div style={{ padding: "5px 16px", background: `${C.yellow}08`, borderBottom: `1px solid ${C.yellow}15`, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <SDot color={C.yellow} anim />
          <span style={{ color: C.yellow, fontSize: 10, fontFamily: font }}>
            {refreshInProgress || pageRefreshing ? "Refresh in progress — showing last snapshot" : `Stale snapshot${cacheAge != null ? ` · ${cacheAge}s old` : ""}`}
          </span>
        </div>
      )}

      {/* ── Empty / loading states ── */}
      {!hasData && overallState === "no_data_yet" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <SDot color={C.blue} anim />
          <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>Warming scanner — first results building automatically</span>
        </div>
      )}
      {!hasData && overallState === "true_zero_results" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: C.dim, fontSize: 12, fontFamily: font }}>Scan complete — no unusual signals above threshold</span>
        </div>
      )}
      {hasData && sorted.length === 0 && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>No signals match the current filter</span>
        </div>
      )}

      {/* ── Screener table (fills viewport width) ── */}
      {sorted.length > 0 && (
        <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", minHeight: 0 }}>
          <div style={{ width: "100%", minWidth: 1050 }}>

            {/* Sticky column header row */}
            <div style={{
              display: "flex", alignItems: "stretch",
              position: "sticky", top: 0, zIndex: 10,
              background: C.cardAlt, borderBottom: `1px solid ${C.border}`,
              paddingLeft: 16, paddingTop: 6,
            }}>
              {ch("rank",    "#")}
              {ch("ticker",  "Ticker",   "symbol")}
              {ch("type",    "Type")}
              {ch("price",   "Price",    undefined, "right")}
              {ch("score",   "Score",    "score",   "right")}
              {ch("heat",    "Heat",     "heat",    "right")}
              {ch("signal",  "Signal")}
              {ch("bias",    "Bias")}
              {ch("move",    "Move %",   "move",    "right")}
              {ch("premium", "Premium",  "premium", "right")}
              {ch("prem_d",  "Prem Δ%",  undefined, "right")}
              {ch("vol",     "Vol",      "vol",     "right")}
              {ch("oi",      "OI",       "oi",      "right")}
              {ch("oi_d",    "OI Δ%",    "oi_change","right")}
              {ch("voi",     "V/OI",     "vol_oi",  "right")}
              {ch("callpct", "Call %",   "call_pct","right")}
              {ch("putpct",  "Put %",    undefined, "right")}
              {ch("dte",     "DTE",      "dte",     "right")}
              {ch("strike",  "Strike",   undefined, "right")}
              {ch("otm",     "OTM %",    undefined, "right")}
              {ch("unusual", "Unusual")}
              {ch("g_delta", "Δ",   undefined, "right")}
              {ch("g_gamma", "Γ",   undefined, "right")}
              {ch("g_theta", "Θ",   undefined, "right")}
              {ch("g_vega",  "Vega", undefined, "right")}
              {ch("g_iv",    "IV",  undefined, "right")}
            </div>

            {/* Data rows */}
            {sorted.map((t, i) => {
              const score   = normalizeScore(t.composite_score);
              const heat    = t.heat_score ?? null;
              const sigClr  = getSignalColor(t.primary_signal);
              const bias    = getBias(t);
              const pchg    = safeNum(t.price_change_pct);
              const pchgPct = pchg != null ? (Math.abs(pchg) <= 1 ? pchg * 100 : pchg) : null;
              const premium = t.premium ?? null;
              const premD   = safeNum(t.premium_change_pct);
              const oiD     = safeNum(t.oi_change_pct);
              const voi     = getVolOI(t);
              const callPct = getCallPct(t);
              const putPct  = getPutPct(t);
              const dte     = getDTE(t);
              const strike  = safeNum(t.top_contracts?.[0]?.strike);
              const otmPct  = getOTMPct(t);
              const unusual = isUnusualOTM(t);
              const assetLbl = (t.asset_type || "").toUpperCase();
              const { delta: gd, gamma: gg, theta: gt, vega: gv, iv: giv } = getTopContractGreeks(t);

              const thesisArr  = Array.isArray(t.thesis) ? t.thesis : (t.thesis ? [t.thesis] : []);
              const thesisFull = thesisArr[0] || t.stock_context_summary || t.options_context_summary || "";
              const thesisTrunc = thesisFull.length > 110 ? thesisFull.slice(0, 110) + "…" : thesisFull;

              // Cell helper — fluid flex cell
              const cell = (id: keyof typeof W, content: ReactNode, color = C.text, align: "left" | "right" = "left", bold = false) => (
                <div style={{
                  flex: W[id], minWidth: 0, padding: "0 5px", overflow: "hidden",
                  fontSize: 11, fontFamily: font, color, fontWeight: bold ? 700 : 400,
                  textAlign: align, display: "flex", alignItems: "center",
                  justifyContent: align === "right" ? "flex-end" : "flex-start",
                  boxSizing: "border-box" as const,
                }}>
                  {content ?? <span style={{ color: C.dim }}>—</span>}
                </div>
              );

              return (
                <div
                  key={t.ticker}
                  onClick={() => onTickerSelect(t)}
                  style={{
                    display: "flex", alignItems: "center",
                    paddingLeft: 16, paddingTop: 7, paddingBottom: 7,
                    borderBottom: `1px solid ${C.border}`,
                    cursor: "pointer", transition: "background 0.08s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${C.blue}07`)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {cell("rank",   i + 1, C.dim, "right")}

                  {/* Ticker */}
                  <div style={{ flex: W.ticker, minWidth: 0, padding: "0 5px", overflow: "hidden" }}>
                    <span style={{ color: C.bright, fontFamily: font, fontWeight: 700, fontSize: 12 }}>{t.ticker}</span>
                  </div>

                  {/* Type badge */}
                  <div style={{ flex: W.type, minWidth: 0, padding: "0 4px", overflow: "hidden" }}>
                    {assetLbl && <span style={{ fontSize: 9, color: C.dim, fontFamily: font, background: `${C.border}90`, borderRadius: 3, padding: "1px 4px" }}>{assetLbl}</span>}
                  </div>

                  {cell("price",   t.underlying_price != null ? fmtMoney(t.underlying_price) : null, C.text, "right")}

                  {/* Score — colored number */}
                  <div style={{ flex: W.score, minWidth: 0, padding: "0 5px", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    {score != null
                      ? <span style={{ color: scoreColor(score), fontFamily: font, fontWeight: 700, fontSize: 12 }}>{fmtNum(score, 0)}</span>
                      : <span style={{ color: C.dim }}>—</span>}
                  </div>

                  {/* Heat */}
                  <div style={{ flex: W.heat, minWidth: 0, padding: "0 5px", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    {heat != null
                      ? <span style={{ color: heatColor(heat), fontFamily: font, fontWeight: heat >= 80 ? 700 : 400, fontSize: 11 }}>{heat.toFixed(0)}</span>
                      : <span style={{ color: C.dim }}>—</span>}
                  </div>

                  {/* Signal badge — sm text, truncated */}
                  <div style={{ flex: W.signal, minWidth: 0, padding: "0 5px", overflow: "hidden", display: "flex", alignItems: "center" }}>
                    {t.primary_signal
                      ? <Badge color={sigClr} sm>{t.primary_signal}</Badge>
                      : <span style={{ color: C.dim, fontSize: 10 }}>—</span>}
                  </div>

                  {/* Bias */}
                  <div style={{ flex: W.bias, minWidth: 0, padding: "0 5px", overflow: "hidden", display: "flex", alignItems: "center" }}>
                    {bias
                      ? <span style={{ color: bias.color, fontSize: 10, fontFamily: font, fontWeight: 600 }}>{bias.label}</span>
                      : <span style={{ color: C.dim, fontSize: 10 }}>—</span>}
                  </div>

                  {cell("move",    pchgPct != null ? fmtSmartPct(pchgPct) : null, pchgPct == null ? C.dim : pchgPct >= 0 ? C.green : C.red, "right")}

                  {/* Premium — bold + gold if >$1M */}
                  <div style={{ flex: W.premium, minWidth: 0, padding: "0 5px", textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    {premium != null
                      ? <span style={{ color: premium >= 1_000_000 ? C.gold : C.text, fontFamily: font, fontWeight: premium >= 1_000_000 ? 700 : 400, fontSize: 11 }}>{fmtCurrencyShort(premium)}</span>
                      : <span style={{ color: C.dim }}>—</span>}
                  </div>

                  {cell("prem_d",  premD != null ? fmtSmartPct(premD) : null, premD == null ? C.dim : premD >= 0 ? C.green : C.red, "right")}
                  {cell("vol",     t.total_volume != null ? fmtVol(t.total_volume) : null, C.text, "right")}
                  {cell("oi",      t.total_oi != null ? fmtVol(t.total_oi) : null, C.text, "right")}
                  {cell("oi_d",    oiD != null ? fmtSmartPct(oiD) : null, oiD == null ? C.dim : oiD >= 0 ? C.green : C.red, "right")}
                  {cell("voi",     voi != null ? fmtNum(voi, 1) : null, voi == null ? C.dim : voi > 5 ? C.orange : C.text, "right")}
                  {cell("callpct", callPct != null ? `${callPct.toFixed(0)}%` : null, callPct != null ? C.green : C.dim, "right")}
                  {cell("putpct",  putPct != null ? `${putPct.toFixed(0)}%` : null, putPct != null ? C.red : C.dim, "right")}
                  {cell("dte",     dte != null ? String(dte) : null, dte == null ? C.dim : dte <= 3 ? C.red : dte <= 7 ? C.orange : C.text, "right")}
                  {cell("strike",  strike != null ? `$${strike}` : null, C.text, "right")}
                  {cell("otm",     otmPct != null ? `${otmPct > 0 ? "+" : ""}${otmPct.toFixed(1)}%` : null, C.text, "right")}

                  {/* Unusual OTM badge */}
                  <div style={{ flex: W.unusual, minWidth: 0, padding: "0 8px 0 5px", overflow: "hidden", display: "flex", alignItems: "center" }}>
                    {unusual && (
                      <span style={{ fontSize: 9, color: C.orange, fontFamily: font, background: `${C.orange}18`, border: `1px solid ${C.orange}35`, borderRadius: 3, padding: "1px 5px", fontWeight: 700, letterSpacing: "0.04em" }}>UNUSUAL</span>
                    )}
                  </div>

                  {cell("g_delta", gd != null ? fmtNum(gd, 2) : null, gd == null ? C.dim : C.text, "right")}
                  {cell("g_gamma", gg != null ? fmtNum(gg, 2) : null, gg == null ? C.dim : C.text, "right")}
                  {cell("g_theta", gt != null ? fmtNum(gt, 2) : null, gt == null ? C.dim : gt < 0 ? C.red : C.orange, "right")}
                  {cell("g_vega",  gv != null ? fmtNum(gv, 2) : null, gv == null ? C.dim : C.text, "right")}
                  {cell("g_iv",    giv != null ? fmtIV(giv) : null, giv == null ? C.dim : C.yellow, "right")}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── About modal ── */}
      {showAbout && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 32, paddingBottom: 32 }}
          onClick={() => setShowAbout(false)}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)" }} />
          <div
            style={{ position: "relative", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, width: "92%", maxWidth: 680, maxHeight: "calc(100vh - 64px)", overflowY: "auto" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 1 }}>
              <span style={{ color: C.bright, fontSize: 15, fontWeight: 800, fontFamily: font }}>How to Read the Options Flow Screener</span>
              <button onClick={() => setShowAbout(false)} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 4, display: "flex" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ padding: "18px 20px", display: "grid", gap: 20 }}>
              {/* Intro */}
              <p style={{ color: C.text, fontSize: 12, fontFamily: font, lineHeight: 1.7, margin: 0 }}>
                This screener ranks unusual options activity. Higher scores mean the flow looks more interesting, but it is not a guaranteed trade signal.
              </p>

              {/* Column definitions */}
              <div>
                <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Column Definitions</div>
                <div style={{ display: "grid", gap: 0, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                  {[
                    { col: "Ticker",   def: "The stock or ETF symbol." },
                    { col: "Type",     def: "Whether the symbol is a stock or ETF." },
                    { col: "Price",    def: "Current price of the underlying stock or ETF." },
                    { col: "Score",    def: "Main signal score from our options-flow model. Higher means stronger unusual activity." },
                    { col: "Heat",     def: "Extra momentum/intensity score using premium, volume vs open interest, urgency, and unusual contract behavior." },
                    { col: "Signal",   def: "The type of setup detected, such as unusual flow or asymmetric risk/reward." },
                    { col: "Bias",     def: "Whether the options activity leans bullish, bearish, mixed, or unclear." },
                    { col: "Move %",   def: "Recent move in the underlying stock or ETF." },
                    { col: "Premium",  def: "Estimated dollar value of the options activity. Bigger premium usually means larger money is involved." },
                    { col: "Prem Δ%", def: "Change in options premium versus the previous snapshot. Rising premium can mean interest is accelerating." },
                    { col: "Vol",      def: "Options contract volume." },
                    { col: "OI",       def: "Open interest. This is the number of existing open contracts." },
                    { col: "OI Δ%",   def: "Change in open interest versus the previous snapshot. Rising OI can suggest new positioning." },
                    { col: "V/OI",     def: "Volume divided by open interest. High V/OI can indicate unusual fresh activity." },
                    { col: "Call %",   def: "Percent of flow leaning toward calls. Calls often suggest bullish positioning." },
                    { col: "Put %",    def: "Percent of flow leaning toward puts. Puts often suggest bearish or hedging activity." },
                    { col: "DTE",      def: "Days to expiration. Lower DTE means the trade is more urgent/speculative." },
                    { col: "Strike",   def: "The option contract's strike price." },
                    { col: "OTM %",    def: "How far the contract is out-of-the-money. Far OTM contracts are higher risk, higher reward." },
                    { col: "Unusual",  def: "Flags contracts that are meaningfully out-of-the-money with strong premium and unusual volume/open-interest behavior." },
                    { col: "Δ (Delta)", def: "Estimated option price change for a $1 move in the underlying stock. Derived from the top contract." },
                    { col: "Γ (Gamma)", def: "How quickly Delta changes as the stock moves. Derived from the top contract." },
                    { col: "Θ (Theta)", def: "Estimated daily time decay. Negative means the option loses value each day. Derived from the top contract." },
                    { col: "Vega",     def: "Sensitivity to implied volatility. Higher vega means premium is more affected by IV changes." },
                    { col: "IV",       def: "Implied volatility estimate for the top contract. High IV means the premium is more expensive." },
                  ].map(({ col, def }, i) => (
                    <div key={col} style={{ display: "grid", gridTemplateColumns: "90px 1fr", borderBottom: i < 24 ? `1px solid ${C.border}` : "none", background: i % 2 === 0 ? C.cardAlt : "transparent" }}>
                      <div style={{ padding: "8px 12px", color: C.blue, fontSize: 11, fontFamily: font, fontWeight: 700, borderRight: `1px solid ${C.border}` }}>{col}</div>
                      <div style={{ padding: "8px 12px", color: C.text, fontSize: 11, fontFamily: font, lineHeight: 1.5 }}>{def}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to use */}
              <div>
                <div style={{ color: C.bright, fontSize: 11, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>How to Use This</div>
                <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px" }}>
                  {[
                    "Start with Score and Heat.",
                    "Check Premium to see if real money is involved.",
                    "Use Bias, Call %, and Put % to understand direction.",
                    "Watch V/OI and OI Δ% for signs of fresh positioning.",
                    "Treat short DTE and far OTM as higher-risk, higher-upside speculation.",
                    "Click any ticker for the full thesis and deeper details.",
                  ].map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < 5 ? 8 : 0 }}>
                      <span style={{ color: C.blue, fontSize: 10, fontFamily: font, fontWeight: 700, minWidth: 16, paddingTop: 1 }}>{i + 1}.</span>
                      <span style={{ color: C.text, fontSize: 12, fontFamily: font, lineHeight: 1.6 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Options Guide modal ─────────────────────────────────────────────────────
function OptionsGuideModal({ onClose }: { onClose: () => void }) {
  const STitle = ({ children }: { children: ReactNode }) => (
    <div style={{ color: C.bright, fontSize: 11, fontFamily: font, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginBottom: 8 }}>
      {children}
    </div>
  );
  const Bullet = ({ label, text }: { label?: string; text: string }) => (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5 }}>
      <span style={{ color: C.blue, fontFamily: font, fontSize: 11, flexShrink: 0, paddingTop: 1 }}>·</span>
      <span style={{ color: C.text, fontSize: 12, fontFamily: font, lineHeight: 1.6 }}>
        {label && <span style={{ color: C.bright, fontWeight: 700 }}>{label}: </span>}{text}
      </span>
    </div>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 32, paddingBottom: 32 }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)" }} />
      <div
        style={{ position: "relative", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, width: "92%", maxWidth: 640, maxHeight: "calc(100vh - 64px)", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen className="w-4 h-4" style={{ color: C.blue }} />
            <span style={{ color: C.bright, fontSize: 15, fontWeight: 800, fontFamily: font }}>Options Guide</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 4, display: "flex" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div style={{ padding: "18px 20px", display: "grid", gap: 20 }}>

          <div>
            <STitle>What Is an Option?</STitle>
            <Bullet text="An option is a contract that gives you the right, but not the obligation, to buy or sell an asset at a set price within a specific timeframe." />
            <Bullet text="Each standard options contract represents 100 shares." />
          </div>

          <div>
            <STitle>Main Types of Options</STitle>
            <Bullet label="Call Option" text="The right to buy shares at a set price. Used when you think the stock may go up." />
            <Bullet label="Put Option" text="The right to sell shares at a set price. Used when you think the stock may go down." />
          </div>

          <div>
            <STitle>Core Contract Terms</STitle>
            <Bullet label="Strike Price" text="The agreed-upon price where the option can buy or sell the underlying stock." />
            <Bullet label="Premium" text="The price paid for the option contract." />
            <Bullet label="Expiration Date" text="The deadline before the contract expires." />
            <Bullet label="Open Interest" text="The number of outstanding contracts that still exist." />
            <Bullet label="Volume" text="The number of contracts traded today." />
          </div>

          <div>
            <STitle>Moneyness</STitle>
            <Bullet label="ITM (In-The-Money)" text="The option has intrinsic value. Calls: strike is below current stock price. Puts: strike is above current stock price." />
            <Bullet label="OTM (Out-Of-The-Money)" text="The option has no intrinsic value. Calls: strike above stock price. Puts: strike below stock price." />
            <Bullet label="ATM (At-The-Money)" text="Strike is very close to the current stock price." />
          </div>

          <div>
            <STitle>The Greeks</STitle>
            <Bullet label="Delta / Δ" text="How much the option price may move for a $1 move in the stock. A 0.45 delta call moves roughly $0.45 for a $1 stock move." />
            <Bullet label="Gamma / Γ" text="How quickly Delta changes as the stock moves." />
            <Bullet label="Theta / Θ" text="Daily time decay. The closer expiration gets, the faster this bleeds." />
            <Bullet label="Vega" text="Sensitivity to implied volatility. Rising IV inflates option price; falling IV deflates it." />
            <Bullet label="Rho" text="Sensitivity to interest rates. Usually less important for short-term options, more relevant for LEAPS." />
          </div>

          <div>
            <STitle>IV / Implied Volatility</STitle>
            <Bullet text="IV shows how much volatility the market is pricing into the option." />
            <Bullet text="High IV means premium is expensive." />
            <Bullet text="Buying high-IV options before a catalyst can be risky — IV can collapse even if the stock moves in the right direction." />
          </div>

          <div>
            <STitle>Buyer vs Seller</STitle>
            <Bullet label="Buying / Long Options" text="You pay the premium. Risk is limited to what you paid. Calls can have large upside if the stock moves strongly." />
            <Bullet label="Selling / Writing Options" text="You collect premium but take on obligations. This can carry much higher risk than buying." />
          </div>

          <div style={{ color: C.dim, fontSize: 10, fontFamily: font, lineHeight: 1.5, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            This guide is educational only and not financial advice. Options are risky instruments and can expire worthless.
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Ticker lookup search bar + signal modal ────────────────────────────────────
// Self-contained — no parent state is read or mutated.
interface AcSuggestion { symbol: string; name?: string; score?: number | null; }

function TickerSignalModal({ symbol, data, loading, error, onClose }: {
  symbol: string;
  data: TickerResult | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const t = data;
  const conf = t ? getConfidence(t.confidence, t.confidence_score) : null;
  const signalColor = t?.primary_signal ? getSignalColor(t.primary_signal) : C.blue;

  const renderContracts = (contracts: OptionContract[] | null | undefined, side: "call" | "put") => {
    if (!contracts?.length) return null;
    const color = sideColor(side);
    return (
      <div style={{ marginBottom: 10 }}>
        <div style={{ color, fontSize: 9, fontFamily: font, textTransform: "uppercase", fontWeight: 700, marginBottom: 5 }}>
          Top {side}s
        </div>
        <div style={{ overflowX: "auto", borderRadius: 7, border: `1px solid ${color}20` }}>
          <div style={{ minWidth: 400, background: C.cardAlt, borderRadius: 7, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 55px 60px 60px 50px 50px 45px", padding: "5px 10px", background: `${color}08`, fontSize: 9, fontFamily: font, textTransform: "uppercase", color: C.dim }}>
              <span>Strike</span><span>Expiry</span><span style={{ textAlign: "right" }}>Vol</span><span style={{ textAlign: "right" }}>OI</span><span style={{ textAlign: "right" }}>V/OI</span><span style={{ textAlign: "right" }}>IV</span><span style={{ textAlign: "right" }}>Δ</span>
            </div>
            {contracts.slice(0, 5).map((raw, i) => {
              const c = normalizeContract(raw);
              return (
                <div key={`${c.contract_symbol || c.symbol || i}`} style={{ display: "grid", gridTemplateColumns: "60px 55px 60px 60px 50px 50px 45px", padding: "4px 10px", borderTop: `1px solid ${C.border}`, fontSize: 11, fontFamily: font }}>
                  <span style={{ color, fontWeight: 700 }}>${c.strike}</span>
                  <span style={{ color: C.dim, fontSize: 10 }}>{compactDate(c.expiration)}</span>
                  <span style={{ textAlign: "right", color: C.bright }}>{fmtVol(c.volume)}</span>
                  <span style={{ textAlign: "right", color: C.text }}>{fmtVol(c.openInterest)}</span>
                  <span style={{ textAlign: "right", color: C.yellow }}>{c.volumeToOi != null ? `${fmtNum(c.volumeToOi, 1)}×` : "—"}</span>
                  <span style={{ textAlign: "right", color: C.yellow }}>{c.iv != null ? fmtIV(c.iv) : "—"}</span>
                  <span style={{ textAlign: "right", color: C.text }}>{c.delta != null ? fmtNum(c.delta, 2) : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 32, paddingBottom: 32 }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.78)" }} />
      <div
        style={{ position: "relative", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, width: "94%", maxWidth: 660, maxHeight: "calc(100vh - 64px)", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Activity className="w-4 h-4" style={{ color: signalColor }} />
            <span style={{ color: C.bright, fontSize: 15, fontWeight: 800, fontFamily: font, letterSpacing: "-0.01em" }}>
              {symbol}
            </span>
            {t?.category && <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>{t.category.toUpperCase()}</span>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.dim, cursor: "pointer", padding: 4, display: "flex" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "16px 18px", display: "grid", gap: 16 }}>
          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "40px 0", color: C.dim, fontSize: 12, fontFamily: font }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading options signal for {symbol}…
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{ padding: "30px 0", textAlign: "center" }}>
              <CircleAlert className="w-5 h-5 mx-auto mb-2" style={{ color: C.red }} />
              <div style={{ color: C.red, fontSize: 12, fontFamily: font }}>{error}</div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && t && (
            <>
              {/* ── 1. Header row ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                {t.underlying_price != null && (
                  <MetricBlock label="Price" value={fmtMoney(t.underlying_price)} color={C.bright} />
                )}
                {t.price_change_pct != null && (
                  <MetricBlock
                    label="1D Change"
                    value={fmtSmartPct(t.price_change_pct)}
                    color={safeNum(t.price_change_pct) != null ? (safeNum(t.price_change_pct)! >= 0 ? C.green : C.red) : C.dim}
                  />
                )}
                {t.data_quality?.confidence_score != null && (
                  <MetricBlock label="Confidence" value={conf?.label ?? "—"} color={conf?.color ?? C.dim} />
                )}
                {t.composite_score != null && (
                  <MetricBlock label="Score" value={`${Math.round(normalizeScore(t.composite_score) ?? 0)}`} color={scoreColor(normalizeScore(t.composite_score))} />
                )}
              </div>

              {/* Meta line */}
              {(t as any).updated_at || (t as any).data_source || (t as any).data_quality?.flags?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  {(t as any).updated_at && (
                    <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>
                      Updated: {String((t as any).updated_at).slice(0, 19).replace("T", " ")}
                    </span>
                  )}
                  {(t as any).data_source && (
                    <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>· {(t as any).data_source}</span>
                  )}
                  {t.data_quality?.flags?.map((f, i) => (
                    <Badge key={i} color={C.yellow} sm>{f}</Badge>
                  ))}
                </div>
              ) : null}

              {/* ── 2. Main signal ── */}
              {(t.primary_signal || t.thesis || t.risks || t.confidence || t.side_bias) && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>Signal</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: t.thesis || t.risks ? 12 : 0 }}>
                    {t.primary_signal && (
                      <MetricBlock label="Primary Signal" value={toTitleCase(t.primary_signal)} color={signalColor} />
                    )}
                    {t.confidence && (
                      <MetricBlock label="Confidence" value={conf?.label ?? t.confidence} color={conf?.color ?? C.dim} />
                    )}
                    {(t as any).side_bias && (
                      <MetricBlock label="Side Bias" value={String((t as any).side_bias).toUpperCase()} color={sideColor((t as any).side_bias)} />
                    )}
                    {t.composite_score != null && (
                      <MetricBlock label="Composite Score" value={`${Math.round(normalizeScore(t.composite_score) ?? 0)}`} color={scoreColor(normalizeScore(t.composite_score))} />
                    )}
                  </div>
                  {t.thesis && (
                    <div style={{ marginBottom: t.risks ? 8 : 0 }}>
                      <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", marginBottom: 4 }}>Thesis</div>
                      <div style={{ color: C.text, fontSize: 12, fontFamily: sans, lineHeight: 1.6 }}>
                        {ensureArray(t.thesis).map((line, i) => <div key={i}>{line}</div>)}
                      </div>
                    </div>
                  )}
                  {t.risks && (
                    <div>
                      <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", marginBottom: 4 }}>Risks</div>
                      <div style={{ color: C.text, fontSize: 12, fontFamily: sans, lineHeight: 1.6 }}>
                        {ensureArray(t.risks).map((line, i) => <div key={i}>{line}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. Flow breakdown ── */}
              {(t.call_volume != null || t.put_volume != null || t.pc_ratio != null || t.avg_call_iv != null || (t as any).premium != null) && (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>Flow Breakdown</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                    {t.call_volume != null && <MetricBlock label="Call Vol" value={fmtVol(t.call_volume)} color={C.green} />}
                    {t.put_volume != null && <MetricBlock label="Put Vol" value={fmtVol(t.put_volume)} color={C.red} />}
                    {t.pc_ratio != null && <MetricBlock label="P/C Ratio" value={fmtNum(t.pc_ratio, 2)} color={pcColor(safeNum(t.pc_ratio))} />}
                    {t.avg_call_iv != null && <MetricBlock label="Avg Call IV" value={fmtIV(t.avg_call_iv)} color={C.yellow} />}
                    {(t as any).avg_put_iv != null && <MetricBlock label="Avg Put IV" value={fmtIV((t as any).avg_put_iv)} color={C.orange} />}
                    {(t as any).premium != null && (
                      <MetricBlock label="Premium" value={fmtCurrencyShort((t as any).premium)} color={C.gold} />
                    )}
                    {(t as any).premium_display && (
                      <MetricBlock label="Premium" value={String((t as any).premium_display)} color={C.gold} />
                    )}
                  </div>
                  {(t as any).premium_breakdown && (
                    <div style={{ marginTop: 8, color: C.dim, fontSize: 11, fontFamily: font }}>{String((t as any).premium_breakdown)}</div>
                  )}
                  {(t as any).call_put_breakdown && (
                    <div style={{ marginTop: 6, color: C.dim, fontSize: 11, fontFamily: font }}>{String((t as any).call_put_breakdown)}</div>
                  )}
                  {(t as any).otm_breakdown && (
                    <div style={{ marginTop: 6, color: C.dim, fontSize: 11, fontFamily: font }}>{String((t as any).otm_breakdown)}</div>
                  )}
                </div>
              )}

              {/* ── 4. Best / top contract ── */}
              {(() => {
                const best: OptionContract | null =
                  (t as any).best_contract ??
                  (t as any).top_contract ??
                  t.top_contracts?.[0] ??
                  t.top_calls?.[0] ??
                  t.top_puts?.[0] ??
                  null;
                if (!best) return null;
                const bc = normalizeContract(best);
                const bcColor = sideColor(bc.side);
                return (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                      Best Contract
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8 }}>
                      <MetricBlock label="Type" value={(bc.side || "—").toUpperCase()} color={bcColor} />
                      {bc.strike != null && <MetricBlock label="Strike" value={`$${bc.strike}`} color={bcColor} />}
                      {bc.expiration && <MetricBlock label="Expiry" value={compactDate(bc.expiration)} color={C.text} />}
                      {bc.dte != null && <MetricBlock label="DTE" value={String(bc.dte)} color={C.dim} />}
                      {bc.bid != null && bc.ask != null && <MetricBlock label="Bid / Ask" value={`${fmtMoney(bc.bid)} / ${fmtMoney(bc.ask)}`} color={C.text} />}
                      {bc.volume != null && <MetricBlock label="Volume" value={fmtVol(bc.volume)} color={C.blue} />}
                      {bc.openInterest != null && <MetricBlock label="Open Int" value={fmtVol(bc.openInterest)} color={C.text} />}
                      {bc.iv != null && <MetricBlock label="IV" value={fmtIV(bc.iv)} color={C.yellow} />}
                      {bc.delta != null && <MetricBlock label="Δ Delta" value={fmtNum(bc.delta, 3)} color={C.text} />}
                      {bc.gamma != null && <MetricBlock label="Γ Gamma" value={fmtNum(bc.gamma, 4)} color={C.text} />}
                      {bc.theta != null && <MetricBlock label="Θ Theta" value={fmtNum(bc.theta, 4)} color={C.red} />}
                      {bc.vega != null && <MetricBlock label="V Vega" value={fmtNum(bc.vega, 3)} color={C.text} />}
                    </div>
                  </div>
                );
              })()}

              {/* ── 5. Top contracts lists ── */}
              {(t.top_contracts?.length || t.top_calls?.length || t.top_puts?.length) ? (
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                    Top Contracts
                  </div>
                  {t.top_contracts?.length ? renderContracts(t.top_contracts, "call") : null}
                  {!t.top_contracts?.length && renderContracts(t.top_calls, "call")}
                  {!t.top_contracts?.length && renderContracts(t.top_puts, "put")}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TickerLookupBar() {
  const [query, setQuery]               = useState("");
  const [suggestions, setSuggestions]   = useState<AcSuggestion[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [acLoading, setAcLoading]       = useState(false);
  const [modalSymbol, setModalSymbol]   = useState<string | null>(null);
  const [modalData, setModalData]       = useState<TickerResult | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError]     = useState<string | null>(null);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Autocomplete fetch ────────────────────────────────────────────────────
  const fetchSuggestions = useCallback((q: string) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setAcLoading(true);
    fetch(`/api/options-flow/symbols?q=${encodeURIComponent(q)}`, { headers: authHeaders(), signal: ctrl.signal })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (ctrl.signal.aborted) return;
        const raw: any[] = Array.isArray(data) ? data
          : Array.isArray(data?.symbols)  ? data.symbols
          : Array.isArray(data?.results)  ? data.results
          : Array.isArray(data?.items)    ? data.items
          : [];
        const items: AcSuggestion[] = raw.slice(0, 10).map(item =>
          typeof item === "string"
            ? { symbol: item }
            : { symbol: String(item?.symbol ?? item?.ticker ?? item), name: item?.name ?? item?.label ?? item?.company_name ?? undefined, score: item?.score ?? null }
        ).filter(s => s.symbol && s.symbol.length > 0);
        setSuggestions(items);
        setDropdownOpen(items.length > 0);
        setHighlightIdx(-1);
        setAcLoading(false);
      })
      .catch(e => { if (e.name !== "AbortError") setAcLoading(false); });
  }, []);

  // ── Signal modal fetch ────────────────────────────────────────────────────
  const openModal = useCallback((sym: string) => {
    const upper = sym.trim().toUpperCase();
    if (!upper) return;
    setModalSymbol(upper);
    setModalData(null);
    setModalError(null);
    setModalLoading(true);
    setDropdownOpen(false);

    fetch(`${API_BASE}/screener/${encodeURIComponent(upper)}`, { headers: authHeaders() })
      .then(async r => {
        const json = await r.json().catch(() => null);
        if (r.status === 400) throw { code: 400 };
        if (r.status === 404) throw { code: 404 };
        if (!r.ok) throw { code: r.status };
        return json;
      })
      .then(json => {
        // Backend may wrap as { response: TickerResult } or { ticker: TickerResult } or return array
        let ticker: TickerResult | null = null;
        if (json?.response && typeof json.response === "object" && !Array.isArray(json.response)) {
          ticker = json.response;
        } else if (json?.ticker && typeof json.ticker === "object") {
          ticker = json.ticker;
        } else if (Array.isArray(json?.tickers) && json.tickers.length > 0) {
          ticker = json.tickers[0];
        } else if (Array.isArray(json) && json.length > 0) {
          ticker = json[0];
        } else if (json && typeof json === "object" && (json.ticker || json.symbol || json.composite_score != null)) {
          ticker = json;
        }
        if (!ticker) throw { code: 404 };
        setModalData(ticker);
        setModalLoading(false);
      })
      .catch((e: any) => {
        const code = e?.code ?? 0;
        setModalError(
          code === 400 ? "Enter a valid ticker symbol." :
          code === 404 ? `No options signal found for ${upper}.` :
          "Couldn't load options signal. Try again."
        );
        setModalLoading(false);
      });
  }, []);

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 1) { setSuggestions([]); setDropdownOpen(false); return; }
    debounceRef.current = setTimeout(() => { if (val.length >= 1) fetchSuggestions(val); }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { setDropdownOpen(false); setHighlightIdx(-1); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (dropdownOpen && highlightIdx >= 0 && suggestions[highlightIdx]) {
        const sym = suggestions[highlightIdx].symbol;
        setQuery(sym);
        openModal(sym);
      } else {
        openModal(query);
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div ref={containerRef} style={{ position: "relative", maxWidth: 380 }}>
        {/* Input */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search className="w-3.5 h-3.5" style={{ position: "absolute", left: 10, color: C.dim, pointerEvents: "none", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (query.length >= 1 && suggestions.length > 0) setDropdownOpen(true); }}
            placeholder="Search ticker options signal…"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            style={{
              width: "100%",
              padding: "7px 32px 7px 30px",
              background: C.cardAlt,
              border: `1px solid ${C.border}`,
              borderRadius: 7,
              color: C.bright,
              fontSize: 12,
              fontFamily: font,
              textTransform: "uppercase",
              outline: "none",
              letterSpacing: "0.04em",
            }}
          />
          {acLoading && (
            <Loader2 className="w-3 h-3 animate-spin" style={{ position: "absolute", right: 10, color: C.dim }} />
          )}
        </div>

        {/* Dropdown */}
        {dropdownOpen && suggestions.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 1500,
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.55)", overflow: "hidden",
          }}>
            {suggestions.map((s, i) => (
              <div
                key={s.symbol}
                onMouseDown={() => { setQuery(s.symbol); openModal(s.symbol); }}
                onMouseEnter={() => setHighlightIdx(i)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 12px", cursor: "pointer",
                  background: i === highlightIdx ? `${C.blue}14` : "transparent",
                  borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                  transition: "background 0.08s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: C.bright, fontFamily: font, fontSize: 12, fontWeight: 700, letterSpacing: "0.04em" }}>
                    {s.symbol}
                  </span>
                  {s.name && (
                    <span style={{ color: C.dim, fontFamily: sans, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                      {s.name}
                    </span>
                  )}
                </div>
                {s.score != null && (
                  <span style={{ color: scoreColor(normalizeScore(s.score)), fontSize: 10, fontFamily: font, fontWeight: 700 }}>
                    {Math.round(normalizeScore(s.score) ?? 0)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signal modal */}
      {modalSymbol && (
        <TickerSignalModal
          symbol={modalSymbol}
          data={modalData}
          loading={modalLoading}
          error={modalError}
          onClose={() => { setModalSymbol(null); setModalData(null); setModalError(null); }}
        />
      )}
    </>
  );
}

// ─── Sectors Flow Tab — drilldown: Sectors → Themes → Tickers ────────────
interface SFTicker {
  symbol: string;
  ticker?: string;
  underlying?: string;
  call_premium: number | null;
  put_premium: number | null;
  net_premium: number | null;
  put_call_ratio: number | null;          // Premium P/C  (put_premium / call_premium)
  volume_put_call_ratio?: number | null;  // Vol P/C      (put_contracts / call_contracts)
  total_volume: number | null;
  call_volume: number | null;
  put_volume: number | null;
  total_contract_volume?: number | null;
  premium_per_contract?: number | null;
  call_premium_per_contract?: number | null;
  put_premium_per_contract?: number | null;
  options_available: boolean | null;
  scan_status: string | null;
  updated_at: string | null;
  bias: string | null;
  heat_score: number | null;
  reason?: string | null;
  // Unified options fields (added from backend unified endpoint)
  opt_score?: number | null;             // options quality/conviction score (0–100)
  options_score?: number | null;         // alias for opt_score
  opt_signal?: string | null;            // e.g. "Unusual Call Flow", "Gamma Squeeze"
  options_signal?: string | null;        // alias for opt_signal
  implied_volatility?: number | null;    // current IV (0–1 or percentage — same unit rules as options_iv)
  expected_move?: number | null;         // expected move % from ATM straddle
  total_oi?: number | null;              // total open interest (calls + puts)
  call_oi?: number | null;              // call open interest
  put_oi?: number | null;               // put open interest
  snapshot_status?: string | null;       // "live" | "prior_session" | "cached"
  data_as_of?: string | null;           // ISO timestamp of the underlying data
  // Net Flow fields (ETF/Stock NF separation)
  instrument_type?: string | null;         // "stock" | "etf" | null
  display_name?: string | null;            // canonical company / fund display name from backend
  premium_scope_id?: string | null;        // "net_flow_single_expiry_7_60dte_v1" = canonical NF
  nf_snapshot_pending?: boolean | null;    // true = NF snapshot not yet computed
  raw_premium_pcr?: number | null;         // NF put/call ratio (raw, for display)
  effective_premium_pcr?: number | null;   // NF PCR clamped for color/sizing
  one_sided_flow?: string | null;          // "call_only" | "put_only" | null
  // Interval flow fields (null = first snapshot / no new volume / LKG-only)
  interval_ask_premium?: number | null;
  interval_bid_premium?: number | null;
  interval_midpoint_unknown_premium?: number | null;
  interval_total_premium?: number | null;
  interval_new_contract_volume?: number | null;
  interval_ask_premium_pct?: number | null;
  interval_bid_premium_pct?: number | null;
  interval_midpoint_unknown_premium_pct?: number | null;
  interval_classified_trade_side_pct?: number | null;
  interval_seconds?: number | null;
  interval_started_at?: string | null;
  interval_ended_at?: string | null;
  // Historical Net Premium comparison fields (null until backend has enough history)
  net_premium_1d_ago?: number | null;
  net_premium_delta_1d?: number | null;
  net_premium_trend_1d?: string | null;
  net_premium_7d_ago?: number | null;
  net_premium_delta_7d?: number | null;
  net_premium_trend_7d?: string | null;
  net_premium_30d_ago?: number | null;
  net_premium_delta_30d?: number | null;
  net_premium_trend_30d?: string | null;
}
interface SFTheme {
  theme_id: string;
  theme_name: string;
  classification?: string | null;
  parent_sector?: string | null;          // e.g. "technology", "utilities" — matches sector node theme_id
  call_premium: number | null;
  put_premium: number | null;
  net_premium: number | null;
  put_call_ratio: number | null;          // Premium P/C
  volume_put_call_ratio?: number | null;  // Vol P/C
  bias: string | null;
  ticker_count: number | null;
  contributing_ticker_count: number | null;
  total_contract_volume?: number | null;
  premium_per_contract?: number | null;
  call_premium_per_contract?: number | null;
  put_premium_per_contract?: number | null;
  aggregation_scope?: string | null;
  // Net Flow breadth P/C fields
  breadth_pcr?: number | null;
  net_flow_breadth_pcr?: number | null;
  etf_breadth_pcr?: number | null;
  tickers: SFTicker[];
  // Interval flow fields
  interval_ask_premium?: number | null;
  interval_bid_premium?: number | null;
  interval_midpoint_unknown_premium?: number | null;
  interval_total_premium?: number | null;
  interval_new_contract_volume?: number | null;
  interval_ask_premium_pct?: number | null;
  interval_bid_premium_pct?: number | null;
  interval_midpoint_unknown_premium_pct?: number | null;
  interval_classified_trade_side_pct?: number | null;
  interval_seconds?: number | null;
  interval_started_at?: string | null;
  interval_ended_at?: string | null;
  // Historical Net Premium comparison fields (null until backend has enough history)
  net_premium_1d_ago?: number | null;
  net_premium_delta_1d?: number | null;
  net_premium_trend_1d?: string | null;
  net_premium_7d_ago?: number | null;
  net_premium_delta_7d?: number | null;
  net_premium_trend_7d?: string | null;
  net_premium_30d_ago?: number | null;
  net_premium_delta_30d?: number | null;
  net_premium_trend_30d?: string | null;
}
interface SFSector {
  sector_id: string;
  sector_name: string;
  call_premium: number | null;
  put_premium: number | null;
  net_premium: number | null;
  put_call_ratio: number | null;          // Premium P/C
  volume_put_call_ratio?: number | null;  // Vol P/C
  bias: string | null;
  ticker_count: number | null;
  contributing_ticker_count: number | null;
  sector_total_method?: string | null;
  total_contract_volume?: number | null;
  premium_per_contract?: number | null;
  call_premium_per_contract?: number | null;
  put_premium_per_contract?: number | null;
  aggregation_scope?: string | null;
  // Net Flow breadth P/C fields
  breadth_pcr?: number | null;
  net_flow_breadth_pcr?: number | null;
  etf_breadth_pcr?: number | null;
  themes: SFTheme[];
  // Interval flow fields
  interval_ask_premium?: number | null;
  interval_bid_premium?: number | null;
  interval_midpoint_unknown_premium?: number | null;
  interval_total_premium?: number | null;
  interval_new_contract_volume?: number | null;
  interval_ask_premium_pct?: number | null;
  interval_bid_premium_pct?: number | null;
  interval_midpoint_unknown_premium_pct?: number | null;
  interval_classified_trade_side_pct?: number | null;
  interval_seconds?: number | null;
  interval_started_at?: string | null;
  interval_ended_at?: string | null;
  // Historical Net Premium comparison fields (null until backend has enough history)
  net_premium_1d_ago?: number | null;
  net_premium_delta_1d?: number | null;
  net_premium_trend_1d?: string | null;
  net_premium_7d_ago?: number | null;
  net_premium_delta_7d?: number | null;
  net_premium_trend_7d?: string | null;
  net_premium_30d_ago?: number | null;
  net_premium_delta_30d?: number | null;
  net_premium_trend_30d?: string | null;
}
interface SFCoverage {
  theme_universe_total?: number | null;
  master_count?: number | null;
  supplement_fresh_count?: number | null;
  supplement_lkg_count?: number | null;
  supplement_count?: number | null;
  no_options_count?: number | null;
  pending_count?: number | null;
  tickers_with_data?: number | null;
  coverage_pct?: number | null;
  estimated_full_coverage_minutes?: number | null;
  last_supplement_scan_at?: string | null;
  next_supplement_scan_at?: string | null;
}
interface SFData {
  as_of: string | null;
  source: string | null;
  net_flow_method: string | null;
  put_call_ratio_method: string | null;
  sector_total_method: string | null;
  scan_coverage: SFCoverage | null;
  sectors: SFSector[];
  themes?: SFTheme[];
  premium_metadata?: Record<string, string> | null;
}

function sfNetColor(net: number | null): string {
  if (net == null) return C.dim;
  if (net > 50_000)  return C.green;
  if (net < -50_000) return C.red;
  return C.dim;
}
function sfBiasColor(bias: string | null): string {
  if (!bias) return C.dim;
  const b = bias.toLowerCase();
  if (b.includes("bull") || b.includes("call")) return C.green;
  if (b.includes("bear") || b.includes("put"))  return C.red;
  return C.yellow;
}
function SFScanBadge({ status, available }: { status: string | null; available: boolean | null }) {
  const s = (status || "").toLowerCase();
  if (s === "live" || s === "fresh")
    return <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${C.green}15`, border: `1px solid ${C.green}30`, color: C.green, fontFamily: font }}>Live Options Data</span>;
  if (s === "supplement")
    return <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${C.blue}15`, border: `1px solid ${C.blue}30`, color: C.blue, fontFamily: font }}>Live Options Data</span>;
  if (s === "cached_data" || s === "supplement_lkg")
    return <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.30)", color: "#818cf8", fontFamily: font }}>Cached Options Data</span>;
  if (s === "pending")
    return <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${C.yellow}12`, border: `1px solid ${C.yellow}30`, color: C.yellow, fontFamily: font }}>Pending Scan</span>;
  if (s === "confirmed_no_options" || s === "no_options" || available === false)
    return <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${C.dim}12`, border: `1px solid ${C.dim}20`, color: C.dim, fontFamily: font }}>No Listed Options</span>;
  if (s === "missing_data")
    return <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${C.orange}12`, border: `1px solid ${C.orange}25`, color: C.orange, fontFamily: font }}>Missing Options Data</span>;
  if (s)
    return <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${C.dim}12`, border: `1px solid ${C.dim}20`, color: C.dim, fontFamily: font }}>{s}</span>;
  return null;
}

// ─── Sector ticker detail popup ──────────────────────────────────────────────
function SFTickerModal({ ticker, onClose }: { ticker: SFTicker; onClose: () => void }) {
  const sym = ticker.symbol || ticker.ticker || ticker.underlying || '';
  const tvSym = resolveTVSymbol(sym);
  const [screener, setScreener] = useState<any>(null);
  const [scrLoading, setScrLoading] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!sym) return;
    setScrLoading(true);
    setScreener(null);
    fetch(`/api/options/screener/${encodeURIComponent(sym)}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setScreener(d); setScrLoading(false); })
      .catch(() => setScrLoading(false));
  }, [sym]);

  const score    = screener?.composite_score != null ? Math.round(screener.composite_score) : null;
  const signal   = screener?.primary_signal ?? null;
  const conf     = screener?.confidence ?? null;
  const iv       = screener?.iv_current != null ? (screener.iv_current > 5 ? screener.iv_current : screener.iv_current * 100) : null;
  const pcr      = screener?.pc_ratio ?? ticker.put_call_ratio ?? null;
  const em       = screener?.expected_move != null ? screener.expected_move * 100 : null;
  const vol      = screener?.total_volume ?? ticker.total_volume ?? null;
  const price    = screener?.underlying_price ?? null;
  const chgPct   = screener?.price_change_pct ?? null;

  const signalLabel = signal ? signal.replace(/_/g, ' ').toUpperCase() : null;
  const signalClr   = signal?.includes('unusual') ? C.yellow : signal?.includes('gamma') ? C.purple : signal?.includes('asym') ? C.green : signal?.includes('vol') || signal?.includes('iv') ? C.orange : C.blue;
  const scoreClr    = score != null ? (score >= 70 ? C.green : score >= 50 ? C.yellow : C.dim) : C.dim;
  const biasClr     = sfBiasColor(ticker.bias);

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, width: '100%', maxWidth: 760, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: font, fontSize: 16, fontWeight: 800, color: C.bright }}>{sym}</span>
            {ticker.bias && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, border: `1px solid ${biasClr}35`, color: biasClr, fontFamily: font }}>{ticker.bias.toUpperCase()}</span>}
            {price != null && (
              <span style={{ fontFamily: font, fontSize: 12, color: C.text }}>
                ${price.toFixed(2)}
                {chgPct != null && <span style={{ marginLeft: 5, color: chgPct >= 0 ? C.green : C.red }}>{chgPct >= 0 ? '+' : ''}{chgPct.toFixed(2)}%</span>}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.dim, display: 'flex', padding: 4, borderRadius: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* TradingView chart */}
        {tvSym && (
          <div style={{ flexShrink: 0 }}>
            <iframe
              key={tvSym}
              src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSym)}&interval=D&theme=dark&style=1&locale=en&hide_top_toolbar=0&hide_side_toolbar=1&allow_symbol_change=0&save_image=0&width=100%25&height=340`}
              style={{ width: '100%', height: 340, border: 'none', display: 'block' }}
              allowTransparency
            />
          </div>
        )}

        {/* Options data */}
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 9, fontFamily: font, color: C.dim, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Options Data</div>
          {scrLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.dim, fontFamily: font, fontSize: 11 }}>
              <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading options data…
            </div>
          ) : screener == null ? (
            <div style={{ color: C.dim, fontFamily: font, fontSize: 11 }}>
              {ticker.options_available === false ? 'No options available for this ticker.' : 'Options data not available.'}
            </div>
          ) : (
            <>
              {/* Score + signal row */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {score != null && (
                  <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', textAlign: 'center', minWidth: 70 }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Score</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: font, color: scoreClr }}>{score}</div>
                  </div>
                )}
                {signalLabel && (
                  <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', textAlign: 'center', flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Signal</div>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: font, color: signalClr }}>{signalLabel}</div>
                    {conf && <div style={{ fontSize: 9, color: C.dim, fontFamily: font, marginTop: 2 }}>{conf}</div>}
                  </div>
                )}
                {ticker.heat_score != null && (
                  <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', textAlign: 'center', minWidth: 70 }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Heat</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: font, color: ticker.heat_score >= 75 ? C.red : ticker.heat_score >= 50 ? C.yellow : C.dim }}>{Math.round(ticker.heat_score)}</div>
                  </div>
                )}
              </div>

              {/* Metrics grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'IV', value: iv != null ? `${iv.toFixed(0)}%` : '—', color: iv != null && iv > 80 ? C.yellow : C.text },
                  { label: 'P/C Ratio', value: pcr != null ? pcr.toFixed(2) : '—', color: pcr != null ? (pcr < 0.7 ? C.green : pcr > 1.3 ? C.red : C.text) : C.dim },
                  { label: 'Exp Move', value: em != null ? `±${em.toFixed(1)}%` : '—', color: C.text },
                  { label: 'Volume', value: vol != null ? vol.toLocaleString() : '—', color: C.text },
                  { label: 'Net Flow', value: fmtCurrencyShort(ticker.net_premium), color: sfNetColor(ticker.net_premium) },
                  { label: 'Calls', value: fmtCurrencyShort(ticker.call_premium), color: C.green },
                  { label: 'Puts', value: fmtCurrencyShort(ticker.put_premium), color: C.red },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px' }}>
                    <div style={{ fontSize: 8, color: C.dim, fontFamily: font, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: font, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Scan status + updated_at footer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                <SFScanBadge status={ticker.scan_status} available={ticker.options_available} />
                {ticker.updated_at && (
                  <span style={{ fontSize: 9, color: C.dim, fontFamily: font }}>
                    Updated {new Date(ticker.updated_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {screener?.on_demand && (
                  <span style={{ fontSize: 9, color: C.blue, fontFamily: font, marginLeft: 'auto' }}>live scan</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Squarified treemap layout ─────────────────────────────────────────────────
// Returns rects indexed by ORIGINAL item order (not sorted order).
function computeTreemap(
  values: number[],
  W: number,
  H: number,
): Array<{ x: number; y: number; w: number; h: number }> {
  const n = values.length;
  if (n === 0 || W <= 0 || H <= 0) return [];
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return values.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));

  const area = W * H;
  const rects: Array<{ x: number; y: number; w: number; h: number }> = new Array(n);

  // Sort descending by value; preserve original index so we write back correctly
  const order = Array.from({ length: n }, (_, i) => i)
    .sort((a, b) => values[b] - values[a]);
  const scaled = order.map(i => (values[i] / total) * area);

  // Worst aspect ratio in a proposed row
  function worst(row: number[], rowLen: number): number {
    if (row.length === 0 || rowLen === 0) return Infinity;
    const s = row.reduce((a, b) => a + b, 0);
    const thick = s / rowLen;
    if (thick === 0) return Infinity;
    let w = 0;
    for (const v of row) {
      if (v <= 0) continue;
      const len = v / thick;
      const r = len > thick ? len / thick : thick / Math.max(len, 1e-9);
      if (r > w) w = r;
    }
    return w;
  }

  function layout(
    start: number, end: number,
    x: number, y: number, lw: number, lh: number,
  ): void {
    if (start >= end) return;
    if (end - start === 1) {
      rects[order[start]] = { x, y, w: lw, h: lh };
      return;
    }

    const horiz = lw >= lh;
    const rowLen = horiz ? lw : lh;

    // Greedily add items to the row while aspect ratio improves
    let rowEnd = start + 1;
    let rowItems = [scaled[start]];
    for (let i = start + 1; i < end; i++) {
      const next = [...rowItems, scaled[i]];
      if (worst(next, rowLen) > worst(rowItems, rowLen)) break;
      rowItems = next;
      rowEnd = i + 1;
    }

    const rowSum = rowItems.reduce((a, b) => a + b, 0);
    const thick = rowSum / rowLen; // thickness of this row in pixels
    let pos = horiz ? x : y;

    for (let i = 0; i < rowItems.length; i++) {
      const len = thick > 0 ? rowItems[i] / thick : 0;
      rects[order[start + i]] = horiz
        ? { x: pos, y, w: len, h: thick }
        : { x, y: pos, w: thick, h: len };
      pos += len;
    }

    if (horiz) layout(rowEnd, end, x, y + thick, lw, lh - thick);
    else        layout(rowEnd, end, x + thick, y, lw - thick, lh);
  }

  layout(0, n, 0, 0, W, H);
  return rects;
}

// ── P/C deviation score — distance from neutral in log-space ─────────────────
// abs(log(pcr)) = 0 at pcr=1 (neutral), grows as pcr moves away in either direction
// Neutral band: dev < 0.162 ≈ pcr in [0.85, 1.18]
function sfDev(pcr: number | null): number {
  if (pcr == null) return 0;
  return Math.abs(Math.log(Math.max(pcr, 0.01)));
}

// ── Tile SIZE: proportional to distance from P/C neutral ─────────────────────
// Sectors/themes farthest from 1.00 get largest tiles; near-neutral gets tiny
function sfDeviationSize(pcr: number | null): number {
  if (pcr == null) return 0.06; // null → minimum
  return Math.max(0.08, Math.min(sfDev(pcr), 3.5));
}

// ── P/C color helpers — log-space neutral band [0.85, 1.18] ─────────────────
function sfPcrBg(pcr: number | null): string {
  if (pcr == null) return "rgba(16,16,28,0.95)";
  const dev = sfDev(pcr);
  if (dev < 0.162) return "rgba(52,56,76,0.70)"; // neutral band → muted gray
  const t = Math.min((dev - 0.162) / (3.5 - 0.162), 1);
  const a = (0.18 + t * 0.57).toFixed(3);
  return pcr < 1 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
}
function sfPcrBorder(pcr: number | null): string {
  if (pcr == null) return "rgba(255,255,255,0.06)";
  const dev = sfDev(pcr);
  if (dev < 0.162) return "rgba(255,255,255,0.09)";
  const t = Math.min((dev - 0.162) / (3.5 - 0.162), 1);
  const a = (0.18 + t * 0.47).toFixed(3);
  return pcr < 1 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`;
}
function sfPcrTextCol(pcr: number | null): string {
  if (pcr == null) return "#555";
  if (sfDev(pcr) < 0.162) return "#888"; // near-neutral → dim
  return pcr < 1 ? C.green : C.red;
}
function sfSentiment(pcr: number | null): string {
  if (pcr == null) return "—";
  const dev = sfDev(pcr);
  if (dev < 0.162) return "Neutral";
  if (pcr < 1) return dev > 1.5 ? "Very Bullish" : "Bullish";
  return dev > 1.5 ? "Very Bearish" : "Bearish";
}

// ── Net Flow helpers (ETF/Stock NF separation, NF snapshot state) ─────────────
const NF_CANONICAL_SCOPE = "net_flow_single_expiry_7_60dte_v1";
/** Confirmed no-options tickers — scan_status wins over nf_snapshot_pending. */
function sfIsNoOptions(tk: SFTicker): boolean {
  const ss = (tk.scan_status || "").toLowerCase();
  return ss === "no_options" || ss === "confirmed_no_options" || tk.options_available === false;
}
function sfIsNfPending(tk: SFTicker): boolean {
  if (sfIsNoOptions(tk)) return false;   // no-options confirmed — never treat as pending
  if (tk.nf_snapshot_pending === true) return true;
  if (tk.premium_scope_id != null && tk.premium_scope_id !== NF_CANONICAL_SCOPE) return true;
  return false;
}
// Display string for NF P/C — handles one-sided flow edge cases
function sfDisplayNfPcr(tk: SFTicker): string {
  if (sfIsNfPending(tk)) return "…";
  const os = tk.one_sided_flow ?? null;
  if (os === "call_only") return "<0.01";
  if (os === "put_only")  return ">100";
  if (tk.raw_premium_pcr == null) return "—";
  return tk.raw_premium_pcr.toFixed(2);
}
// PCR to use for color/sizing on ETF tiles (effective, clamped)
function sfNfPcr(tk: SFTicker): number | null {
  if (sfIsNfPending(tk)) return null;
  const os = tk.one_sided_flow ?? null;
  if (os === "call_only") return 0.01;
  if (os === "put_only")  return 100;
  return tk.effective_premium_pcr ?? tk.raw_premium_pcr ?? null;
}
// Effective breadth PCR for sector/theme tiles (Net Flow aware, falls back gracefully)
function sfBreadthPcr(item: { net_flow_breadth_pcr?: number | null; breadth_pcr?: number | null; put_call_ratio: number | null }): number | null {
  return item.net_flow_breadth_pcr ?? item.breadth_pcr ?? item.put_call_ratio;
}

// ── Signal text (Premium P/C × Vol P/C combo) ────────────────────────────────
function sfSignalText(pcr: number | null, vpcr: number | null): string | null {
  if (pcr == null) return null;
  if (Math.abs(pcr - 1) < 0.05) return "Balanced premium flow";
  if (vpcr == null) return null;
  if (pcr < 1 && vpcr > 1) return "Large call premium despite heavier put activity";
  if (pcr < 1 && vpcr < 1) return "Call-heavy premium and activity";
  if (pcr > 1 && vpcr < 1) return "Large put premium despite heavier call activity";
  return "Put-heavy premium and activity"; // pcr > 1 && vpcr > 1
}

// ── Interval flow helpers ──────────────────────────────────────────────────────
function sfFmtIntPct(v: number | null): string {
  if (v == null) return "—";
  return Math.round(v) + "%";
}
// Returns signal text based on interval ask/bid pct — interval-only, not full session
function sfIntervalSignalText(
  askPct: number | null,
  bidPct: number | null,
  totalPremium: number | null,
): string | null {
  if (askPct == null || bidPct == null) return null;
  if (totalPremium == null || totalPremium <= 0) return null;
  if (askPct >= 70) return "Aggressive ask-side premium";
  if (bidPct >= 70) return "Heavy bid-side premium";
  if (askPct >= 55) return "Moderate ask-side pressure";
  if (bidPct >= 55) return "Moderate bid-side pressure";
  return "Balanced bid/ask premium";
}
// Tooltip section for interval flow data (shared by sector/theme/ticker tooltips)
interface SFIntervalNode {
  interval_ask_premium_pct?: number | null;
  interval_bid_premium_pct?: number | null;
  interval_midpoint_unknown_premium_pct?: number | null;
  interval_classified_trade_side_pct?: number | null;
  interval_ask_premium?: number | null;
  interval_bid_premium?: number | null;
  interval_total_premium?: number | null;
  interval_new_contract_volume?: number | null;
  interval_seconds?: number | null;
}
function sfIntervalTTSection(n: SFIntervalNode): ReactNode {
  const askPct = n.interval_ask_premium_pct ?? null;
  const bidPct = n.interval_bid_premium_pct ?? null;
  const midPct = n.interval_midpoint_unknown_premium_pct ?? null;
  const cov    = n.interval_classified_trade_side_pct ?? null;
  const total  = n.interval_total_premium ?? null;
  const newCts = n.interval_new_contract_volume ?? null;
  const secs   = n.interval_seconds ?? null;
  const hasAny = total != null || askPct != null;
  const covGe70    = cov != null && cov >= 70;
  const covPartial = cov != null && cov >= 40 && cov < 70;
  const covLow     = cov != null && cov < 40;
  const pctCol     = covLow ? "#666" : C.dim;
  const intStr     = secs != null ? (secs < 120 ? `${Math.round(secs)}s` : `${Math.round(secs / 60)}m`) : null;
  return (
    <>
      <div style={{ height: 1, background: C.border, margin: "5px 0 4px" }} />
      <div style={{ fontSize: 8, color: "#484848", fontFamily: font, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>Recent Interval Flow</div>
      <div style={{ fontSize: 8, color: "#383838", fontFamily: font, fontStyle: "italic", marginBottom: 4, lineHeight: 1.35 }}>Est. trade-side of newly observed volume since prior scan — not full-session tape.</div>
      {sfTTRow("Ask Premium", sfFmtIntPct(askPct), pctCol)}
      {sfTTRow("Bid Premium", sfFmtIntPct(bidPct), pctCol)}
      {midPct != null && sfTTRow("Mid/Unknown", sfFmtIntPct(midPct), "#444")}
      {cov != null && sfTTRow("Trade-side Coverage", sfFmtIntPct(cov), covGe70 ? C.dim : covPartial ? C.yellow : C.orange)}
      {covPartial && sfTTNote("Partial classification — interpret directional signal with caution")}
      {covLow && sfTTNote("Low trade-side coverage — ask/bid % unreliable")}
      {total != null && sfTTRow("Interval Premium", fmtCurrencyShort(total), C.dim)}
      {newCts != null && sfTTRow("New Contracts", newCts.toLocaleString(), C.dim)}
      {intStr != null && sfTTRow("Interval Length", intStr, C.dim)}
      {!hasAny && <div style={{ fontSize: 9, color: "#3a3a3a", fontFamily: font, fontStyle: "italic", marginTop: 2 }}>No interval data — first snapshot or no new volume</div>}
    </>
  );
}

// ── Tooltip row helper ────────────────────────────────────────────────────────
function sfTTRow(label: string, val: string, col: string): ReactNode {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, lineHeight: 1.4 }}>
      <span style={{ color: "#666", fontSize: 10, fontFamily: font }}>{label}</span>
      <span style={{ color: col, fontSize: 10, fontFamily: font, fontWeight: 600 }}>{val}</span>
    </div>
  );
}

// ── Tooltip content per tile type ─────────────────────────────────────────────
// ── Tooltip note ──────────────────────────────────────────────────────────────
function sfTTNote(text: string): ReactNode {
  return <div style={{ fontSize: 8, color: "#484848", fontFamily: font, marginTop: -1, marginBottom: 2, paddingLeft: 2, lineHeight: 1.3 }}>{text}</div>;
}

// ── Net premium trend helpers ──────────────────────────────────────────────────
interface SFNetDeltaNode {
  net_premium?: number | null;
  net_premium_1d_ago?: number | null;
  net_premium_delta_1d?: number | null;
  net_premium_trend_1d?: string | null;
  net_premium_7d_ago?: number | null;
  net_premium_delta_7d?: number | null;
  net_premium_trend_7d?: string | null;
  net_premium_30d_ago?: number | null;
  net_premium_delta_30d?: number | null;
  net_premium_trend_30d?: string | null;
}
interface SFTrendMeta { color: string; arrow: string; label: string; }
function sfNetTrendMeta(trend: string | null | undefined): SFTrendMeta {
  switch (trend) {
    case "more_positive":    return { color: C.green, arrow: "↑",  label: "More Positive"    };
    case "less_negative":    return { color: C.green, arrow: "↑",  label: "Less Negative"    };
    case "crossed_positive": return { color: C.green, arrow: "↗", label: "Crossed Positive" };
    case "more_negative":    return { color: C.red,   arrow: "↓",  label: "More Negative"    };
    case "less_positive":    return { color: C.red,   arrow: "↓",  label: "Less Positive"    };
    case "crossed_negative": return { color: C.red,   arrow: "↘", label: "Crossed Negative" };
    case "unchanged":        return { color: C.dim,   arrow: "→",  label: "Unchanged"        };
    default:                 return { color: "#555",  arrow: "",   label: ""                 };
  }
}
// Shared tooltip section: Net Premium Trend — used by all four entity types
function sfNetTrendTTSection(n: SFNetDeltaNode): ReactNode {
  function periodBlock(label: string, delta: number | null | undefined, trend: string | null | undefined, ago: number | null | undefined): ReactNode {
    if (delta == null) {
      return (
        <div key={label} style={{ marginBottom: 3 }}>
          {sfTTRow(label, "—", "#555")}
          <div style={{ fontSize: 8, color: "#3a3a3a", fontFamily: font, paddingLeft: 2, lineHeight: 1.3 }}>History unavailable</div>
        </div>
      );
    }
    const meta   = sfNetTrendMeta(trend);
    const sign   = delta >= 0 ? "+" : "";
    const valStr = `${sign}${fmtCurrencyShort(delta)}${meta.arrow ? " " + meta.arrow : ""}`;
    return (
      <div key={label} style={{ marginBottom: 3 }}>
        {sfTTRow(label, valStr, meta.color)}
        {meta.label && <div style={{ fontSize: 8, color: meta.color, fontFamily: font, opacity: 0.75, paddingLeft: 2, lineHeight: 1.3 }}>{meta.label}</div>}
        {ago != null && <div style={{ fontSize: 8, color: "#454545", fontFamily: font, paddingLeft: 2, lineHeight: 1.3 }}>Prior  {fmtCurrencyShort(ago)}</div>}
      </div>
    );
  }
  return (
    <>
      <div style={{ height: 1, background: C.border, margin: "5px 0 4px" }} />
      <div style={{ fontSize: 8, color: "#484848", fontFamily: font, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Net Premium Trend</div>
      {sfTTRow("Current", fmtCurrencyShort(n.net_premium ?? null), sfNetColor(n.net_premium ?? null))}
      <div style={{ marginTop: 3 }}>
        {periodBlock("1D", n.net_premium_delta_1d, n.net_premium_trend_1d, n.net_premium_1d_ago)}
        {periodBlock("7D", n.net_premium_delta_7d, n.net_premium_trend_7d, n.net_premium_7d_ago)}
        {periodBlock("30D", n.net_premium_delta_30d, n.net_premium_trend_30d, n.net_premium_30d_ago)}
      </div>
    </>
  );
}

function sfTooltipSector(s: SFSector): ReactNode {
  const pcr  = sfBreadthPcr(s);
  const vpcr = s.volume_put_call_ratio ?? null;
  const cov  = s.interval_classified_trade_side_pct ?? null;
  const intSig = sfIntervalSignalText(s.interval_ask_premium_pct ?? null, s.interval_bid_premium_pct ?? null, s.interval_total_premium ?? null);
  const sig  = (cov != null && cov >= 70 && intSig) ? intSig : sfSignalText(pcr, vpcr);
  const hasBreadth = (s.net_flow_breadth_pcr ?? s.breadth_pcr) != null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontWeight: 700, color: C.bright, fontSize: 12, fontFamily: sans, marginBottom: 2 }}>{s.sector_name}</div>
      <div style={{ color: sfPcrTextCol(pcr), fontWeight: 700, fontSize: 10, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: sig ? 1 : 3 }}>{sfSentiment(pcr)}</div>
      {sig && <div style={{ fontSize: 9, color: C.yellow, fontFamily: font, fontStyle: "italic", marginBottom: 3 }}>{sig}</div>}
      {hasBreadth && sfTTRow("Breadth P/C", pcr?.toFixed(2) ?? "—", sfPcrTextCol(pcr))}
      {hasBreadth && sfTTNote("net-flow breadth: put ÷ call across stock tickers")}
      {!hasBreadth && sfTTRow("Premium P/C", pcr?.toFixed(2) ?? "—", sfPcrTextCol(pcr))}
      {!hasBreadth && sfTTNote("put ÷ call premium — lower is more call-heavy")}
      {vpcr != null && sfTTRow("Vol P/C", vpcr.toFixed(2), sfPcrTextCol(vpcr))}
      {vpcr != null && sfTTNote("put ÷ call contracts — lower is more call-active")}
      {hasBreadth && s.put_call_ratio != null && sfTTRow("Premium P/C", s.put_call_ratio.toFixed(2), sfPcrTextCol(s.put_call_ratio))}
      {sfTTRow("Net Premium", fmtCurrencyShort(s.net_premium), sfNetColor(s.net_premium))}
      {sfTTRow("Call Premium", fmtCurrencyShort(s.call_premium ?? null), C.green)}
      {sfTTRow("Put Premium", fmtCurrencyShort(s.put_premium ?? null), C.red)}
      {s.premium_per_contract != null && sfTTRow("Prem/Contract", fmtCurrencyShort(s.premium_per_contract), C.dim)}
      {s.premium_per_contract != null && sfTTNote("est. premium per traded contract")}
      {s.total_contract_volume != null && sfTTRow("Contracts", s.total_contract_volume.toLocaleString(), C.dim)}
      {s.contributing_ticker_count != null && sfTTRow("Tickers", String(s.contributing_ticker_count), C.dim)}
      {s.themes != null && sfTTRow("Themes", String(s.themes.length), C.dim)}
      {sfNetTrendTTSection(s)}
      {sfIntervalTTSection(s)}
    </div>
  );
}
function sfTooltipTheme(t: SFTheme): ReactNode {
  const pcr  = sfBreadthPcr(t);
  const vpcr = t.volume_put_call_ratio ?? null;
  const cov  = t.interval_classified_trade_side_pct ?? null;
  const intSig = sfIntervalSignalText(t.interval_ask_premium_pct ?? null, t.interval_bid_premium_pct ?? null, t.interval_total_premium ?? null);
  const sig  = (cov != null && cov >= 70 && intSig) ? intSig : sfSignalText(pcr, vpcr);
  const hasBreadth = (t.net_flow_breadth_pcr ?? t.breadth_pcr) != null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontWeight: 700, color: C.bright, fontSize: 12, fontFamily: sans, marginBottom: 2 }}>{t.theme_name}</div>
      <div style={{ color: sfPcrTextCol(pcr), fontWeight: 700, fontSize: 10, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: sig ? 1 : 3 }}>{sfSentiment(pcr)}</div>
      {sig && <div style={{ fontSize: 9, color: C.yellow, fontFamily: font, fontStyle: "italic", marginBottom: 3 }}>{sig}</div>}
      {hasBreadth && sfTTRow("Breadth P/C", pcr?.toFixed(2) ?? "—", sfPcrTextCol(pcr))}
      {hasBreadth && sfTTNote("net-flow breadth: put ÷ call across stock tickers")}
      {!hasBreadth && sfTTRow("Premium P/C", pcr?.toFixed(2) ?? "—", sfPcrTextCol(pcr))}
      {!hasBreadth && sfTTNote("put ÷ call premium — lower is more call-heavy")}
      {vpcr != null && sfTTRow("Vol P/C", vpcr.toFixed(2), sfPcrTextCol(vpcr))}
      {vpcr != null && sfTTNote("put ÷ call contracts — lower is more call-active")}
      {hasBreadth && t.put_call_ratio != null && sfTTRow("Premium P/C", t.put_call_ratio.toFixed(2), sfPcrTextCol(t.put_call_ratio))}
      {t.etf_breadth_pcr != null && sfTTRow("ETF Breadth P/C", t.etf_breadth_pcr.toFixed(2), sfPcrTextCol(t.etf_breadth_pcr))}
      {t.etf_breadth_pcr != null && sfTTNote("net-flow breadth: put ÷ call across ETFs in theme")}
      {sfTTRow("Net Premium", fmtCurrencyShort(t.net_premium), sfNetColor(t.net_premium))}
      {sfTTRow("Call Premium", fmtCurrencyShort(t.call_premium ?? null), C.green)}
      {sfTTRow("Put Premium", fmtCurrencyShort(t.put_premium ?? null), C.red)}
      {t.premium_per_contract != null && sfTTRow("Prem/Contract", fmtCurrencyShort(t.premium_per_contract), C.dim)}
      {t.premium_per_contract != null && sfTTNote("est. premium per traded contract")}
      {t.total_contract_volume != null && sfTTRow("Contracts", t.total_contract_volume.toLocaleString(), C.dim)}
      {(t.contributing_ticker_count != null || t.ticker_count != null) && sfTTRow("Coverage", `${t.contributing_ticker_count ?? 0} / ${t.ticker_count ?? 0}`, C.dim)}
      {sfNetTrendTTSection(t)}
      {sfIntervalTTSection(t)}
    </div>
  );
}
function sfTooltipTicker(tk: SFTicker): ReactNode {
  const sym       = tk.symbol || tk.ticker || tk.underlying || "—";
  const name      = (tk.display_name && tk.display_name !== sym) ? tk.display_name : null;
  const isPending = (tk.scan_status || "").toLowerCase() === "pending";
  const pcr       = isPending ? null : tk.put_call_ratio;
  const vpcr      = isPending ? null : (tk.volume_put_call_ratio ?? null);
  const cov       = isPending ? null : (tk.interval_classified_trade_side_pct ?? null);
  const intSig    = isPending ? null : sfIntervalSignalText(tk.interval_ask_premium_pct ?? null, tk.interval_bid_premium_pct ?? null, tk.interval_total_premium ?? null);
  const sig       = (cov != null && cov >= 70 && intSig) ? intSig : sfSignalText(pcr, vpcr);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ marginBottom: 2 }}>
        <div style={{ fontWeight: 800, color: C.bright, fontSize: 13, fontFamily: font }}>{sym}</div>
        {name && <div style={{ fontSize: 10, color: C.dim, fontFamily: font, opacity: 0.75, marginTop: 1 }}>{name}</div>}
      </div>
      <div style={{ color: sfPcrTextCol(pcr), fontWeight: 700, fontSize: 10, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: sig ? 1 : 3 }}>{isPending ? "Pending" : sfSentiment(pcr)}</div>
      {sig && <div style={{ fontSize: 9, color: C.yellow, fontFamily: font, fontStyle: "italic", marginBottom: 3 }}>{sig}</div>}
      {!isPending && sfTTRow("Premium P/C", pcr?.toFixed(2) ?? "—", sfPcrTextCol(pcr))}
      {!isPending && sfTTNote("put ÷ call premium — lower is more call-heavy")}
      {!isPending && vpcr != null && sfTTRow("Vol P/C", vpcr.toFixed(2), sfPcrTextCol(vpcr))}
      {!isPending && vpcr != null && sfTTNote("put ÷ call contracts — lower is more call-active")}
      {!isPending && sfTTRow("Net Premium", fmtCurrencyShort(tk.net_premium), sfNetColor(tk.net_premium))}
      {!isPending && sfTTRow("Call Premium", fmtCurrencyShort(tk.call_premium ?? null), C.green)}
      {!isPending && sfTTRow("Put Premium", fmtCurrencyShort(tk.put_premium ?? null), C.red)}
      {!isPending && tk.premium_per_contract != null && sfTTRow("Prem/Contract", fmtCurrencyShort(tk.premium_per_contract), C.dim)}
      {!isPending && tk.premium_per_contract != null && sfTTNote("est. premium per traded contract — higher = larger contracts")}
      {tk.total_contract_volume != null && sfTTRow("Contracts", tk.total_contract_volume.toLocaleString(), C.dim)}
      {/* Unified options fields */}
      {!isPending && (tk.opt_score ?? tk.options_score) != null && (() => {
        const sc = Number(tk.opt_score ?? tk.options_score);
        const scClr = sc >= 70 ? C.green : sc >= 50 ? C.amber : C.dim;
        return sfTTRow("Opt Score", Number.isFinite(sc) ? (sc >= 10 ? Math.round(sc).toString() : sc.toFixed(1)) : "—", scClr);
      })()}
      {!isPending && (tk.opt_signal ?? tk.options_signal) && (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 1 }}>
          <span style={{ fontSize: 9, color: C.dim, fontFamily: font }}>Opt Signal</span>
          <span style={{ fontSize: 9, color: C.teal, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.05em" }}>{tk.opt_signal ?? tk.options_signal}</span>
        </div>
      )}
      {!isPending && tk.implied_volatility != null && sfTTRow("IV", (() => {
        const iv = Number(tk.implied_volatility);
        return Number.isFinite(iv) ? `${(iv > 5 ? iv : iv * 100).toFixed(0)}%` : "—";
      })(), C.amber)}
      {!isPending && tk.expected_move != null && sfTTRow("Exp. Move", `${Number(tk.expected_move).toFixed(1)}%`, '#a78bfa')}
      {!isPending && (tk.call_oi != null || tk.put_oi != null || tk.total_oi != null) && (
        <div style={{ marginTop: 2 }}>
          {tk.total_oi != null && sfTTRow("Total OI", Number(tk.total_oi).toLocaleString(), C.dim)}
          {tk.call_oi != null && sfTTRow("Call OI", Number(tk.call_oi).toLocaleString(), C.green)}
          {tk.put_oi != null && sfTTRow("Put OI", Number(tk.put_oi).toLocaleString(), C.red)}
        </div>
      )}
      {!isPending && tk.snapshot_status && (() => {
        const statusColor = tk.snapshot_status === 'live' ? C.green : tk.snapshot_status === 'prior_session' ? C.amber : C.dim;
        const statusLabel = tk.snapshot_status === 'live' ? 'Live' : tk.snapshot_status === 'prior_session' ? 'Prior session' : tk.snapshot_status === 'cached' ? 'Cached' : tk.snapshot_status;
        return (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 2, paddingTop: 3, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 9, color: C.dim, fontFamily: font }}>Data status</span>
            <span style={{ fontSize: 9, color: statusColor, fontFamily: font, fontWeight: 700 }}>{statusLabel}{tk.data_as_of ? (() => {
              try {
                const d = new Date(tk.data_as_of!);
                const isToday = new Date().toDateString() === d.toDateString();
                return isToday ? ` · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ` · ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
              } catch { return ''; }
            })() : ''}</span>
          </div>
        );
      })()}
      {!isPending && sfNetTrendTTSection(tk)}
      {!isPending && sfIntervalTTSection(tk)}
    </div>
  );
}

// ── Sort key type + sort options (used by SectorsFlowTab + render helpers) ────
type SFSortKey = "pcr" | "vpcr" | "ask_pct" | "bid_pct" | "net_premium" | "ppc" | "contracts" | "call_premium" | "put_premium";
const SF_SORT_OPTIONS: Array<{ key: SFSortKey; label: string; desc: boolean }> = [
  { key: "pcr",          label: "Premium P/C",  desc: false }, // ascending — lower is more bullish
  { key: "vpcr",         label: "Vol P/C",       desc: false },
  { key: "ask_pct",      label: "Ask Prem %",    desc: true  }, // descending — higher = more ask-side aggression
  { key: "bid_pct",      label: "Bid Prem %",    desc: true  },
  { key: "net_premium",  label: "Net Premium",   desc: true  }, // descending — largest net first
  { key: "ppc",          label: "Prem/Contract", desc: true  },
  { key: "contracts",    label: "Contracts",     desc: true  },
  { key: "call_premium", label: "Call Premium",  desc: true  },
  { key: "put_premium",  label: "Put Premium",   desc: true  },
];
function sfSortItems<T>(items: T[], key: SFSortKey, getter: (t: T) => number | null): T[] {
  const opt = SF_SORT_OPTIONS.find(o => o.key === key)!;
  return [...items].sort((a, b) => {
    const av = getter(a), bv = getter(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls last
    if (bv == null) return -1;
    return opt.desc ? bv - av : av - bv;
  });
}

// ── Tile sizing: pcrDeviation × normalizedMateriality (conviction × scale) ────
function sfBuildValue<T extends object>(
  items: T[],
  getGross: (t: T) => number,
  getPcr: (t: T) => number | null,
): Map<T, number> {
  const MIN = 0.04;
  const logs = items.map(t => Math.log1p(Math.max(0, getGross(t))));
  const maxLog = Math.max(...logs, 1);
  return new Map(items.map((t, i) => {
    const normMat = maxLog > 0 ? logs[i] / maxLog : 0;
    const safePcr = Math.max(0.01, Math.min(getPcr(t) ?? 1.0, 100));
    const dev = Math.abs(Math.log(safePcr));
    return [t, Math.max(MIN, Math.min(dev * normMat, 3.5))];
  }));
}

function sfScored<T extends object>(
  items: T[],
  getGross: (t: T) => number,
  getPcr: (t: T) => number | null,
): { sorted: T[]; valueOf: (t: T) => number } {
  const map = sfBuildValue(items, getGross, getPcr);
  const sorted = [...items].sort((a, b) => (map.get(b) ?? 0) - (map.get(a) ?? 0));
  return { sorted, valueOf: (t: T) => map.get(t) ?? 0.04 };
}

// Raw sort value accessor — same fields exist on SFSector, SFTheme, SFTicker
function sfSortRaw(
  item: {
    put_call_ratio?: number | null;
    volume_put_call_ratio?: number | null;
    net_premium?: number | null;
    premium_per_contract?: number | null;
    total_contract_volume?: number | null;
    call_premium?: number | null;
    put_premium?: number | null;
    interval_ask_premium_pct?: number | null;
    interval_bid_premium_pct?: number | null;
  },
  key: SFSortKey,
): number | null {
  switch (key) {
    case "pcr":          return item.put_call_ratio             ?? null;
    case "vpcr":         return item.volume_put_call_ratio      ?? null;
    case "ask_pct":      return item.interval_ask_premium_pct   ?? null;
    case "bid_pct":      return item.interval_bid_premium_pct   ?? null;
    case "net_premium":  return item.net_premium                ?? null;
    case "ppc":          return item.premium_per_contract       ?? null;
    case "contracts":    return item.total_contract_volume      ?? null;
    case "call_premium": return item.call_premium               ?? null;
    case "put_premium":  return item.put_premium                ?? null;
  }
}

// Builds a normalized score map for treemap sizing based on the selected sort key.
// "pcr" keeps the original deviation×materiality formula; all other keys use
// log-normalised absolute magnitude of the sort field so tile size matches sort priority.
function sfBuildSortedScore<T extends object>(
  items: T[],
  sortKey: SFSortKey,
  getGross: (t: T) => number,
  getPcr: (t: T) => number | null,
  getSortRaw: (t: T) => number | null,
): Map<T, number> {
  const MIN = 0.04;
  if (sortKey === "pcr") return sfBuildValue(items, getGross, getPcr);

  // vpcr: same deviation-from-1 semantics as pcr (extreme = most important)
  if (sortKey === "vpcr") {
    const devs = items.map(t => {
      const v = getSortRaw(t);
      if (v == null) return 0;
      return Math.abs(Math.log(Math.max(0.01, Math.min(v, 100))));
    });
    const maxDev = Math.max(...devs, 1);
    return new Map(items.map((t, i) => [t, Math.max(MIN, devs[i] / maxDev)]));
  }

  // ask_pct / bid_pct: 0-100 range — normalize directly (higher pct = bigger tile)
  if (sortKey === "ask_pct" || sortKey === "bid_pct") {
    const raws = items.map(t => {
      const v = getSortRaw(t);
      return v != null ? Math.max(0, v) : 0;
    });
    const maxRaw = Math.max(...raws, 0.01);
    return new Map(items.map((t, i) => [t, Math.max(MIN, raws[i] / maxRaw)]));
  }

  // All other keys: log-normalised absolute magnitude
  const raws = items.map(t => {
    const v = getSortRaw(t);
    return v != null ? Math.log1p(Math.abs(v)) : 0;
  });
  const maxRaw = Math.max(...raws, 1);
  return new Map(items.map((t, i) => [t, Math.max(MIN, raws[i] / maxRaw)]));
}

// Drop-in replacement for sfScored that honours the active sort key.
// Tile SIZE and visual position both reflect sortKey (largest = most prominent for the chosen metric).
function sfScoredWithSort<T extends object>(
  items: T[],
  sortKey: SFSortKey,
  getGross: (t: T) => number,
  getPcr: (t: T) => number | null,
  getSortRaw: (t: T) => number | null,
): { sorted: T[]; valueOf: (t: T) => number } {
  const map = sfBuildSortedScore(items, sortKey, getGross, getPcr, getSortRaw);
  const sorted = [...items].sort((a, b) => (map.get(b) ?? 0) - (map.get(a) ?? 0));
  return { sorted, valueOf: (t: T) => map.get(t) ?? 0.04 };
}

// ── d3-hierarchy squarified treemap — direct-DOM zoom/pan, no CSS drift ───────
// Container must have explicit width+height (ResizeObserver measures it).
function SFHeatmap<T extends object>({
  items, valueOf, getPcr, noData, onClick, renderTile, renderTooltip, keyOf,
}: {
  items: T[];
  valueOf: (item: T) => number;
  getPcr: (item: T) => number | null;
  noData?: (item: T) => boolean;
  onClick: (item: T) => void;
  renderTile: (item: T, sx: number, sy: number, sw: number, sh: number) => ReactNode;
  renderTooltip?: (item: T) => ReactNode;
  keyOf: (item: T, i: number) => string;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const zRef     = useRef({ k: 1, x: 0, y: 0 });
  const dragRef  = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);
  const isZRef   = useRef(false);
  const [dims, setDims]         = useState({ w: 0, h: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomXY, setZoomXY]     = useState({ k: 1, x: 0, y: 0 });
  const [tooltip, setTooltip]   = useState<{ item: T; cx: number; cy: number } | null>(null);

  // ResizeObserver — measures the actual rendered panel, no hardcoded math
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = r.width  > 4 ? Math.floor(r.width)  : el.clientWidth;
      const h = r.height > 4 ? Math.floor(r.height) : el.clientHeight;
      if (w > 4 && h > 4) setDims({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Apply zoom transform directly to inner div — no React re-render on every frame
  const applyT = () => {
    const el = innerRef.current; if (!el) return;
    const { k, x, y } = zRef.current;
    el.style.transform = `translate(${x}px,${y}px) scale(${k})`;
    el.style.transformOrigin = "0 0";
  };

  const setZ = (k: number, x: number, y: number) => {
    const { w, h } = dims;
    const cx = Math.min(0, Math.max(x, w - w * k));
    const cy = Math.min(0, Math.max(y, h - h * k));
    zRef.current = { k, x: cx, y: cy };
    applyT();
    const zoomed = k > 1.02;
    if (zoomed !== isZRef.current) { isZRef.current = zoomed; setIsZoomed(zoomed); }
    // Track full zoom state so SVG label overlay can compute screen-space coords
    setZoomXY({ k, x: cx, y: cy });
  };

  // Non-passive wheel zoom — zooms around cursor, never causes page scroll
  useEffect(() => {
    const el = wrapRef.current; if (!el || !dims.w) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const { k, x, y } = zRef.current;
      const f  = e.deltaY < 0 ? 1.14 : 1 / 1.14;
      const nk = Math.max(1, Math.min(k * f, 12));
      if (nk === k) return;
      const r = nk / k;
      setZ(nk, cx - (cx - x) * r, cy - (cy - y) * r);
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [dims]);

  // Drag pan — pointer capture for smooth tracking
  const onPD = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !isZRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, tx: zRef.current.x, ty: zRef.current.y };
  };
  const onPM = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { sx, sy, tx, ty } = dragRef.current;
    setZ(zRef.current.k, tx + (e.clientX - sx), ty + (e.clientY - sy));
  };
  const onPU = () => { dragRef.current = null; };

  // d3-hierarchy treemap layout — squarify for TradingView-like tile shape
  const nodes = useMemo(() => {
    if (!dims.w || !dims.h || !items.length) return [] as Array<{ item: T; x0: number; y0: number; x1: number; y1: number }>;
    const root = hierarchy<any>({ children: items })
      .sum((d: any) => Array.isArray(d.children) ? 0 : Math.max(valueOf(d as T), 0.001))
      .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));
    treemap<any>()
      .size([dims.w, dims.h])
      .tile(treemapSquarify.ratio(1))
      .paddingInner(2)
      .paddingOuter(0)
      (root);
    return (root.leaves() as any[]).map((n: any) => ({
      item: n.data as T,
      x0: n.x0 as number, y0: n.y0 as number,
      x1: n.x1 as number, y1: n.y1 as number,
    }));
  }, [items, dims, valueOf]);

  const VW = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const VH = typeof window !== "undefined" ? window.innerHeight : 800;
  const TW = 220;
  const ttX = tooltip ? Math.min(tooltip.cx + 14, VW - TW - 8) : 0;
  const ttY = tooltip ? Math.max(8, Math.min(tooltip.cy + 10, VH - 240)) : 0;

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPD}
      onPointerMove={onPM}
      onPointerUp={onPU}
      onPointerCancel={onPU}
      style={{
        position: "relative", width: "100%", height: "100%",
        overflow: "hidden", background: C.bg,
        cursor: isZoomed ? "grab" : "default",
        userSelect: "none",
      }}
    >
      {/* Inner div — zoom/pan target; transform applied directly to DOM */}
      <div
        ref={innerRef}
        style={{
          position: "absolute", top: 0, left: 0,
          width: dims.w || "100%", height: dims.h || "100%",
          willChange: "transform",
        }}
      >
        {nodes.map(({ item, x0, y0, x1, y1 }, i) => {
          const tw = x1 - x0, th = y1 - y0;
          if (tw < 2 || th < 2) return null;
          const faded = noData?.(item) ?? false;
          return (
            <div
              key={keyOf(item, i)}
              onClick={() => onClick(item)}
              onMouseEnter={e => {
                e.currentTarget.style.filter = "brightness(1.28)";
                if (renderTooltip) setTooltip({ item, cx: e.clientX, cy: e.clientY });
              }}
              onMouseMove={e => {
                if (renderTooltip) setTooltip(p => p ? { ...p, cx: e.clientX, cy: e.clientY } : null);
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = "";
                setTooltip(null);
              }}
              style={{
                position: "absolute",
                left: x0, top: y0, width: tw, height: th,
                background: sfPcrBg(getPcr(item)),
                border: `1px solid ${sfPcrBorder(getPcr(item))}`,
                borderRadius: 2, overflow: "hidden", boxSizing: "border-box",
                opacity: faded ? 0.32 : 1, cursor: "pointer",
                transition: "filter 0.07s",
              }}
            />
          );
        })}
      </div>

      {/* SVG label overlay — no transform, screen-space coords, always vector-sharp */}
      {dims.w > 0 && dims.h > 0 && (
        <svg
          width={dims.w} height={dims.h}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }}
        >
          {nodes.map(({ item, x0, y0, x1, y1 }, i) => {
            const { k, x: tx, y: ty } = zoomXY;
            const sx = x0 * k + tx, sy = y0 * k + ty;
            const sw = (x1 - x0) * k, sh = (y1 - y0) * k;
            if (sw < 20 || sh < 16) return null;
            if (sx + sw < 0 || sx > dims.w || sy + sh < 0 || sy > dims.h) return null;
            return (
              // Nested <svg> hard-clips all text to the tile rectangle
              <svg key={`lbl-${keyOf(item, i)}`} x={Math.round(sx)} y={Math.round(sy)}
                width={Math.round(sw)} height={Math.round(sh)} overflow="hidden">
                {renderTile(item, 0, 0, Math.round(sw), Math.round(sh))}
              </svg>
            );
          })}
        </svg>
      )}

      {isZoomed && (
        <button
          onClick={e => { e.stopPropagation(); setZ(1, 0, 0); }}
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 20,
            background: "rgba(13,14,28,0.90)", border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 5, color: C.dim, fontSize: 10, fontFamily: font,
            padding: "3px 9px", cursor: "pointer", userSelect: "none",
          }}
        >↺ Reset zoom</button>
      )}

      {items.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.dim, fontFamily: font, fontSize: 12 }}>
          No data
        </div>
      )}

      {tooltip && renderTooltip && (
        <div style={{
          position: "fixed", left: ttX, top: ttY, zIndex: 9999,
          background: "#0d0e1c", border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 8, padding: "10px 12px", width: TW,
          boxShadow: "0 8px 28px rgba(0,0,0,0.6)", pointerEvents: "none",
        }}>
          {renderTooltip(tooltip.item)}
        </div>
      )}
    </div>
  );
}

// ── TradingView-style hierarchical grouped heatmap ────────────────────────────────
// Two-level squarify: parent groups fill the full panel; children are nested inside.
// Shares the same zoom/pan/SVG-label-overlay architecture as SFHeatmap.
//
// Key layout note: groups are passed to d3-hierarchy as { _orig, _score } wrappers
// (not raw SFGroupDef) to prevent d3 from traversing SFGroupDef.children as hierarchy
// sub-nodes. The original group is recovered via wrapper._orig after layout.

interface SFGroupDef<T> {
  key: string;
  name: string;
  pcr: number | null;
  call_premium?: number | null;
  put_premium?: number | null;
  net_premium?: number | null;
  children: T[];
}

function SFGroupedHeatmap<T extends object>({
  groups, getGross, getPcr, getItemScore, noData, onClick, renderTile, renderTooltip, keyOf,
}: {
  groups: SFGroupDef<T>[];
  getGross: (item: T) => number;
  getPcr:   (item: T) => number | null;
  getItemScore?: (item: T) => number;
  noData?:  (item: T) => boolean;
  onClick:  (item: T) => void;
  renderTile: (item: T, sx: number, sy: number, sw: number, sh: number) => ReactNode;
  renderTooltip?: (item: T) => ReactNode;
  keyOf: (item: T, i: number) => string;
}) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const zRef     = useRef({ k: 1, x: 0, y: 0 });
  const dragRef  = useRef<{ sx: number; sy: number; tx: number; ty: number } | null>(null);
  const isZRef   = useRef(false);
  const [dims,     setDims]     = useState({ w: 0, h: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomXY,   setZoomXY]   = useState({ k: 1, x: 0, y: 0 });
  const [tooltip,  setTooltip]  = useState<{ content: ReactNode; cx: number; cy: number } | null>(null);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = r.width  > 4 ? Math.floor(r.width)  : el.clientWidth;
      const h = r.height > 4 ? Math.floor(r.height) : el.clientHeight;
      if (w > 4 && h > 4) setDims({ w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyT = () => {
    const el = innerRef.current; if (!el) return;
    const { k, x, y } = zRef.current;
    el.style.transform = `translate(${x}px,${y}px) scale(${k})`;
    el.style.transformOrigin = "0 0";
  };
  const setZ = (k: number, x: number, y: number) => {
    const { w, h } = dims;
    const cx = Math.min(0, Math.max(x, w - w * k));
    const cy = Math.min(0, Math.max(y, h - h * k));
    zRef.current = { k, x: cx, y: cy };
    applyT();
    const zoomed = k > 1.02;
    if (zoomed !== isZRef.current) { isZRef.current = zoomed; setIsZoomed(zoomed); }
    setZoomXY({ k, x: cx, y: cy });
  };

  useEffect(() => {
    const el = wrapRef.current; if (!el || !dims.w) return;
    const fn = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      const { k, x, y } = zRef.current;
      const f  = e.deltaY < 0 ? 1.14 : 1 / 1.14;
      const nk = Math.max(1, Math.min(k * f, 12));
      if (nk === k) return;
      const r = nk / k;
      setZ(nk, cx - (cx - x) * r, cy - (cy - y) * r);
    };
    el.addEventListener("wheel", fn, { passive: false });
    return () => el.removeEventListener("wheel", fn);
  }, [dims]);

  const onPD = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !isZRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { sx: e.clientX, sy: e.clientY, tx: zRef.current.x, ty: zRef.current.y };
  };
  const onPM = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { sx, sy, tx, ty } = dragRef.current;
    setZ(zRef.current.k, tx + (e.clientX - sx), ty + (e.clientY - sy));
  };
  const onPU = () => { dragRef.current = null; };

  // ── Two-level treemap layout ──────────────────────────────────────────────────
  type GNode = { group: SFGroupDef<T>; gx0: number; gy0: number; gx1: number; gy1: number; hH: number };
  type CNode = { item: T; x0: number; y0: number; x1: number; y1: number };

  const { groupNodes, childNodes } = useMemo((): { groupNodes: GNode[]; childNodes: CNode[] } => {
    if (!dims.w || !dims.h || !groups.length) return { groupNodes: [], childNodes: [] };
    const allKids = groups.flatMap(g => g.children);
    if (!allKids.length) return { groupNodes: [], childNodes: [] };

    // Global scoring so group size = Σ(child tile scores), not raw premium.
    // When getItemScore is provided (sort-aware), use it; otherwise default PCR×materiality.
    const defaultScoreMap = getItemScore ? null : sfBuildValue(allKids, getGross, getPcr);
    const sc = (c: T) => getItemScore ? getItemScore(c) : (defaultScoreMap!.get(c) ?? 0.04);

    // Wrap each group to hide its 'children' from d3-hierarchy traversal
    const wrapped = groups.map(g => ({
      _orig:  g,
      _score: Math.max(0.01, g.children.reduce((s, c) => s + sc(c), 0)),
    }));

    // Pass 1: group treemap over full panel
    const gRoot = hierarchy<any>({ children: wrapped })
      .sum((d: any) => Array.isArray(d.children) ? 0 : Math.max(d._score as number, 0.001))
      .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));
    treemap<any>()
      .size([dims.w, dims.h])
      .tile(treemapSquarify.ratio(1))
      .paddingInner(3)
      .paddingOuter(0)(gRoot);

    const groupNodes: GNode[] = [];
    const childNodes: CNode[] = [];

    (gRoot.leaves() as any[]).forEach((gl: any) => {
      const g  = (gl.data as { _orig: SFGroupDef<T> })._orig;
      const gx0 = gl.x0 as number, gy0 = gl.y0 as number;
      const gx1 = gl.x1 as number, gy1 = gl.y1 as number;
      const gw = gx1 - gx0, gh = gy1 - gy0;
      if (gw < 2 || gh < 2) return;

      // Header height: full (20px) if tall enough, reduced (14px) if squeezed, gone if tiny
      const hH = gh >= 36 ? 20 : gh >= 20 ? 14 : 0;
      groupNodes.push({ group: g, gx0, gy0, gx1, gy1, hH });
      if (!g.children.length) return;

      // Pass 2: child treemap inside this group (below the header)
      const cw = Math.max(0, gw - 4);          // 2px inner padding each side
      const ch = Math.max(0, gh - hH - 1);     // 1px bottom gap
      if (cw < 4 || ch < 4) return;

      const sortedKids = [...g.children].sort((a, b) => sc(b) - sc(a));
      const cRoot = hierarchy<any>({ children: sortedKids })
        .sum((d: any) => Array.isArray(d.children) ? 0 : Math.max(sc(d as T), 0.001))
        .sort((a: any, b: any) => (b.value ?? 0) - (a.value ?? 0));
      treemap<any>()
        .size([cw, ch])
        .tile(treemapSquarify.ratio(1))
        .paddingInner(1)
        .paddingOuter(0)(cRoot);

      (cRoot.leaves() as any[]).forEach((cl: any) => {
        childNodes.push({
          item: cl.data as T,
          x0: gx0 + 2 + (cl.x0 as number),
          y0: gy0 + hH + (cl.y0 as number),
          x1: gx0 + 2 + (cl.x1 as number),
          y1: gy0 + hH + (cl.y1 as number),
        });
      });
    });

    return { groupNodes, childNodes };
  }, [groups, dims, getGross, getPcr, getItemScore]);

  const VW = typeof window !== "undefined" ? window.innerWidth  : 1200;
  const VH = typeof window !== "undefined" ? window.innerHeight : 800;
  const TW = 220;
  const ttX = tooltip ? Math.min(tooltip.cx + 14, VW - TW - 8) : 0;
  const ttY = tooltip ? Math.max(8, Math.min(tooltip.cy + 10, VH - 240)) : 0;

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU}
      style={{
        position: "relative", width: "100%", height: "100%",
        overflow: "hidden", background: C.bg,
        cursor: isZoomed ? "grab" : "default",
        userSelect: "none",
      }}
    >
      <div
        ref={innerRef}
        style={{
          position: "absolute", top: 0, left: 0,
          width: dims.w || "100%", height: dims.h || "100%",
          willChange: "transform",
        }}
      >
        {/* Group background borders — behind children */}
        {groupNodes.map(({ group, gx0, gy0, gx1, gy1 }) => (
          <div
            key={`gbg-${group.key}`}
            style={{
              position: "absolute", left: gx0, top: gy0,
              width: gx1 - gx0, height: gy1 - gy0,
              border: `1px solid ${sfPcrBorder(group.pcr)}`,
              background: "rgba(10,11,22,0.55)",
              borderRadius: 3, boxSizing: "border-box",
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Child tiles */}
        {childNodes.map(({ item, x0, y0, x1, y1 }, i) => {
          const tw = x1 - x0, th = y1 - y0;
          if (tw < 2 || th < 2) return null;
          const faded = noData?.(item) ?? false;
          return (
            <div
              key={keyOf(item, i)}
              onClick={() => onClick(item)}
              onMouseEnter={e => {
                e.currentTarget.style.filter = "brightness(1.28)";
                if (renderTooltip) setTooltip({ content: renderTooltip(item), cx: e.clientX, cy: e.clientY });
              }}
              onMouseMove={e => {
                if (tooltip) setTooltip(p => p ? { ...p, cx: e.clientX, cy: e.clientY } : null);
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = "";
                setTooltip(null);
              }}
              style={{
                position: "absolute", left: x0, top: y0, width: tw, height: th,
                background: sfPcrBg(getPcr(item)),
                border: `1px solid ${sfPcrBorder(getPcr(item))}`,
                borderRadius: 2, overflow: "hidden", boxSizing: "border-box",
                opacity: faded ? 0.32 : 1, cursor: "pointer",
                transition: "filter 0.07s",
              }}
            />
          );
        })}

        {/* Group header hover zones — rendered after children so they sit on top in the header strip */}
        {groupNodes.map(({ group, gx0, gy0, gx1, hH }) => {
          if (hH === 0) return null;
          const hoverContent = (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div style={{ fontWeight: 700, color: C.bright, fontSize: 12, fontFamily: sans, marginBottom: 2 }}>{group.name}</div>
              <div style={{ color: sfPcrTextCol(group.pcr), fontWeight: 700, fontSize: 10, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{sfSentiment(group.pcr)}</div>
              {sfTTRow("P/C Ratio",    group.pcr?.toFixed(2) ?? "—",             sfPcrTextCol(group.pcr))}
              {group.net_premium  != null && sfTTRow("Net Premium",  fmtCurrencyShort(group.net_premium),  sfNetColor(group.net_premium))}
              {group.call_premium != null && sfTTRow("Call Premium", fmtCurrencyShort(group.call_premium), C.green)}
              {group.put_premium  != null && sfTTRow("Put Premium",  fmtCurrencyShort(group.put_premium),  C.red)}
              {sfTTRow("Children", String(group.children.length), C.dim)}
            </div>
          );
          return (
            <div
              key={`ghov-${group.key}`}
              style={{
                position: "absolute", left: gx0, top: gy0,
                width: gx1 - gx0, height: hH, cursor: "default",
              }}
              onMouseEnter={e => setTooltip({ content: hoverContent, cx: e.clientX, cy: e.clientY })}
              onMouseMove={e => setTooltip(p => p ? { ...p, cx: e.clientX, cy: e.clientY } : null)}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </div>

      {/* SVG label overlay — group headers + child labels, always screen-space crisp */}
      {dims.w > 0 && dims.h > 0 && (
        <svg
          width={dims.w} height={dims.h}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, overflow: "hidden" }}
        >
          {/* Group header text — each wrapped in a nested <svg> that clips to its header strip */}
          {groupNodes.map(({ group, gx0, gy0, gx1, gy1, hH }) => {
            const { k, x: tx, y: ty } = zoomXY;
            const sx = gx0 * k + tx, sy = gy0 * k + ty;
            const sw = (gx1 - gx0) * k, sh = (gy1 - gy0) * k;
            if (sw < 24 || sh < 12) return null;
            if (sx + sw < 0 || sx > dims.w || sy + sh < 0 || sy > dims.h) return null;
            const shH = hH > 0 ? hH * k : Math.min(14, sh * 0.22);
            const ly  = Math.max(shH * 0.6, 6);
            const fs  = Math.max(8, Math.min(11, sw / 14));
            return (
              // Nested <svg> creates an isolated viewport — text outside its width/height is hard-clipped
              <svg key={`ghlbl-${group.key}`} x={Math.round(sx)} y={Math.round(sy)}
                width={Math.round(sw)} height={Math.round(shH + 4)} overflow="hidden">
                <text x={5} y={ly} fontSize={fs} fill={C.dim} opacity={0.9}
                  fontFamily={font} fontWeight="700" letterSpacing="0.08em"
                  dominantBaseline="middle">
                  {group.name.toUpperCase()}
                </text>
                {sw >= 110 && group.pcr != null && (
                  <text x={Math.round(sw) - 5} y={ly} fontSize={Math.max(8, fs - 1)}
                    fill={sfPcrTextCol(group.pcr)} fontFamily={font} fontWeight="700"
                    textAnchor="end" dominantBaseline="middle">
                    {`P/C ${group.pcr.toFixed(2)}`}
                  </text>
                )}
              </svg>
            );
          })}

          {/* Child tile labels — each wrapped in a nested <svg> that clips to the tile bounds */}
          {childNodes.map(({ item, x0, y0, x1, y1 }, i) => {
            const { k, x: tx, y: ty } = zoomXY;
            const sx = x0 * k + tx, sy = y0 * k + ty;
            const sw = (x1 - x0) * k, sh = (y1 - y0) * k;
            if (sw < 20 || sh < 16) return null;
            if (sx + sw < 0 || sx > dims.w || sy + sh < 0 || sy > dims.h) return null;
            return (
              // Nested <svg> hard-clips all text to the tile rectangle
              <svg key={`clbl-${keyOf(item, i)}`} x={Math.round(sx)} y={Math.round(sy)}
                width={Math.round(sw)} height={Math.round(sh)} overflow="hidden">
                {renderTile(item, 0, 0, Math.round(sw), Math.round(sh))}
              </svg>
            );
          })}
        </svg>
      )}

      {isZoomed && (
        <button
          onClick={e => { e.stopPropagation(); setZ(1, 0, 0); }}
          style={{
            position: "absolute", top: 8, right: 8, zIndex: 20,
            background: "rgba(13,14,28,0.90)", border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 5, color: C.dim, fontSize: 10, fontFamily: font,
            padding: "3px 9px", cursor: "pointer", userSelect: "none",
          }}
        >↺ Reset zoom</button>
      )}

      {groups.length === 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.dim, fontFamily: font, fontSize: 12 }}>
          No data
        </div>
      )}

      {tooltip && (
        <div style={{
          position: "fixed", left: ttX, top: ttY, zIndex: 9999,
          background: "#0d0e1c", border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 8, padding: "10px 12px", width: TW,
          boxShadow: "0 8px 28px rgba(0,0,0,0.6)", pointerEvents: "none",
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

// ── Tile content renderers — SVG text in screen space, no transform, always sharp ─
// sx/sy = screen-space top-left of tile. sw/sh = screen-space px dimensions.
// Font sizes are real screen pixels — no ÷k needed (this is the unscaled overlay).

function sfRenderSector(s: SFSector, sx: number, sy: number, sw: number, sh: number): ReactNode {
  if (sw < 30 || sh < 20) return null;
  const pad  = 5;
  const pcr  = sfBreadthPcr(s);
  const vpcr = s.volume_put_call_ratio ?? null;
  const ppc  = s.premium_per_contract ?? null;
  const askPct = s.interval_ask_premium_pct ?? null;
  const bidPct = s.interval_bid_premium_pct ?? null;
  const cov    = s.interval_classified_trade_side_pct ?? null;
  const nameFs = Math.max(9,  Math.min(13, sw / 10));
  const pcrFs  = Math.max(11, Math.min(26, Math.min(sw / 4.5, sh / 2.8)));
  const subFs  = Math.max(8,  Math.min(11, sw / 14));
  const showPcr      = sh >= 36;
  const showPcrLabel = sw >= 88 && sh >= 60;
  const showVpcr     = sw >= 76 && sh >= 54;
  const showAskBid   = sw >= 88 && sh >= 72;
  const showNet        = sw >= 88 && sh >= 60;
  const showDelta1d    = sw >= 112 && sh >= 82;
  const showDelta7d30d = sw >= 162 && sh >= 114;
  const showPpc        = sw >= 120 && sh >= 80;
  const showCount      = sw >= 150 && sh >= 96;
  const intPctFill   = (cov != null && cov < 40) ? "#aaa" : "#ddd";
  const els: ReactNode[] = [];
  let y = sy + pad;
  els.push(
    <text key="n" x={Math.round(sx + pad)} y={Math.round(y)}
      fontSize={nameFs} fontFamily={sans} fontWeight={700} fill={C.bright} dominantBaseline="hanging"
    >{s.sector_name}</text>
  );
  y += nameFs + 3;
  if (showPcr && y + pcrFs < sy + sh - 2) {
    els.push(
      <text key="p" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={pcrFs} fontFamily={font} fontWeight={900} fill={sfPcrTextCol(pcr)} dominantBaseline="hanging"
      >{pcr != null ? pcr.toFixed(2) : "—"}{showPcrLabel && <tspan fontSize={pcrFs * 0.56} fill="#bbb">{" P/C"}</tspan>}</text>
    );
    y += pcrFs + 3;
  }
  if (showVpcr && vpcr != null && y + subFs < sy + sh - 2) {
    els.push(
      <text key="vp" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs} fontFamily={font} fontWeight={600} fill={sfPcrTextCol(vpcr)} dominantBaseline="hanging"
      >{vpcr.toFixed(2)}<tspan fontSize={subFs * 0.85} fill="#bbb">{" Vol P/C"}</tspan></text>
    );
    y += subFs + 2;
  }
  if (showAskBid && y + subFs < sy + sh - 2) {
    els.push(
      <text key="ab" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.9} fontFamily={font} fontWeight={600} fill={intPctFill} dominantBaseline="hanging"
      >
        <tspan>{sfFmtIntPct(askPct)}</tspan>
        <tspan fill="#bbb">{" Ask · "}</tspan>
        <tspan>{sfFmtIntPct(bidPct)}</tspan>
        <tspan fill="#bbb">{" Bid"}</tspan>
      </text>
    );
    y += subFs * 0.9 + 2;
  }
  if (showNet && y + subFs < sy + sh - 2) {
    els.push(
      <text key="net" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs} fontFamily={font} fontWeight={600} fill={sfNetColor(s.net_premium)} dominantBaseline="hanging"
      >{fmtCurrencyShort(s.net_premium)}</text>
    );
    y += subFs + 2;
  }
  if (showDelta1d && y + subFs * 0.88 < sy + sh - 2) {
    const d1 = s.net_premium_delta_1d ?? null;
    const m1 = sfNetTrendMeta(s.net_premium_trend_1d);
    els.push(
      <text key="d1" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"1D "}</tspan><tspan fill={d1 != null ? m1.color : "#aaa"}>{d1 != null ? `${d1 >= 0 ? "+" : ""}${fmtCurrencyShort(d1)}${m1.arrow ? " " + m1.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (showDelta7d30d && y + subFs * 0.88 < sy + sh - 2) {
    const d7 = s.net_premium_delta_7d ?? null;
    const m7 = sfNetTrendMeta(s.net_premium_trend_7d);
    els.push(
      <text key="d7" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"7D "}</tspan><tspan fill={d7 != null ? m7.color : "#aaa"}>{d7 != null ? `${d7 >= 0 ? "+" : ""}${fmtCurrencyShort(d7)}${m7.arrow ? " " + m7.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (showDelta7d30d && y + subFs * 0.88 < sy + sh - 2) {
    const d30 = s.net_premium_delta_30d ?? null;
    const m30 = sfNetTrendMeta(s.net_premium_trend_30d);
    els.push(
      <text key="d30" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"30D "}</tspan><tspan fill={d30 != null ? m30.color : "#aaa"}>{d30 != null ? `${d30 >= 0 ? "+" : ""}${fmtCurrencyShort(d30)}${m30.arrow ? " " + m30.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (showPpc && ppc != null && y + subFs * 0.85 < sy + sh - 2) {
    els.push(
      <text key="ppc" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.85} fontFamily={font} fill="#ccc" dominantBaseline="hanging"
      >{fmtCurrencyShort(ppc)}<tspan fill="#bbb">{"/ct"}</tspan></text>
    );
    y += subFs * 0.85 + 2;
  }
  if (showCount && y + subFs * 0.8 < sy + sh - 2) {
    els.push(
      <text key="cnt" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.8} fontFamily={font} fill="#ccc" dominantBaseline="hanging"
      >{(s.contributing_ticker_count ?? s.ticker_count ?? 0)} tickers · {s.themes?.length ?? 0} themes</text>
    );
  }
  return <>{els}</>;
}

function sfRenderTheme(t: SFTheme, sx: number, sy: number, sw: number, sh: number): ReactNode {
  if (sw < 28 || sh < 18) return null;
  const pad  = 4;
  const pcr  = sfBreadthPcr(t);
  const vpcr = t.volume_put_call_ratio ?? null;
  const ppc  = t.premium_per_contract ?? null;
  const askPct = t.interval_ask_premium_pct ?? null;
  const bidPct = t.interval_bid_premium_pct ?? null;
  const cov    = t.interval_classified_trade_side_pct ?? null;
  const nameFs = Math.max(8,  Math.min(13, sw / 10));
  const pcrFs  = Math.max(10, Math.min(24, Math.min(sw / 4.5, sh / 2.8)));
  const subFs  = Math.max(8,  Math.min(11, sw / 14));
  const showPcr      = sh >= 34;
  const showPcrLabel = sw >= 88 && sh >= 58;
  const showVpcr     = sw >= 74 && sh >= 52;
  const showAskBid   = sw >= 86 && sh >= 70;
  const showNet        = sw >= 88 && sh >= 58;
  const showDelta1d    = sw >= 110 && sh >= 80;
  const showDelta7d30d = sw >= 158 && sh >= 112;
  const showPpc        = sw >= 118 && sh >= 78;
  const showCount    = sw >= 145 && sh >= 92;
  const intPctFill   = (cov != null && cov < 40) ? "#aaa" : "#ddd";
  const els: ReactNode[] = [];
  let y = sy + pad;
  els.push(
    <text key="n" x={Math.round(sx + pad)} y={Math.round(y)}
      fontSize={nameFs} fontFamily={sans} fontWeight={700} fill={C.bright} dominantBaseline="hanging"
    >{t.theme_name}</text>
  );
  y += nameFs + 3;
  if (showPcr && y + pcrFs < sy + sh - 2) {
    els.push(
      <text key="p" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={pcrFs} fontFamily={font} fontWeight={900} fill={sfPcrTextCol(pcr)} dominantBaseline="hanging"
      >{pcr != null ? pcr.toFixed(2) : "—"}{showPcrLabel && <tspan fontSize={pcrFs * 0.56} fill="#bbb">{" P/C"}</tspan>}</text>
    );
    y += pcrFs + 3;
  }
  if (showVpcr && vpcr != null && y + subFs < sy + sh - 2) {
    els.push(
      <text key="vp" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs} fontFamily={font} fontWeight={600} fill={sfPcrTextCol(vpcr)} dominantBaseline="hanging"
      >{vpcr.toFixed(2)}<tspan fontSize={subFs * 0.85} fill="#bbb">{" Vol P/C"}</tspan></text>
    );
    y += subFs + 2;
  }
  if (showAskBid && y + subFs < sy + sh - 2) {
    els.push(
      <text key="ab" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.9} fontFamily={font} fontWeight={600} fill={intPctFill} dominantBaseline="hanging"
      >
        <tspan>{sfFmtIntPct(askPct)}</tspan>
        <tspan fill="#bbb">{" Ask · "}</tspan>
        <tspan>{sfFmtIntPct(bidPct)}</tspan>
        <tspan fill="#bbb">{" Bid"}</tspan>
      </text>
    );
    y += subFs * 0.9 + 2;
  }
  if (showNet && y + subFs < sy + sh - 2) {
    els.push(
      <text key="net" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs} fontFamily={font} fontWeight={600} fill={sfNetColor(t.net_premium)} dominantBaseline="hanging"
      >{fmtCurrencyShort(t.net_premium)}</text>
    );
    y += subFs + 2;
  }
  if (showDelta1d && y + subFs * 0.88 < sy + sh - 2) {
    const d1 = t.net_premium_delta_1d ?? null;
    const m1 = sfNetTrendMeta(t.net_premium_trend_1d);
    els.push(
      <text key="d1" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"1D "}</tspan><tspan fill={d1 != null ? m1.color : "#aaa"}>{d1 != null ? `${d1 >= 0 ? "+" : ""}${fmtCurrencyShort(d1)}${m1.arrow ? " " + m1.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (showDelta7d30d && y + subFs * 0.88 < sy + sh - 2) {
    const d7 = t.net_premium_delta_7d ?? null;
    const m7 = sfNetTrendMeta(t.net_premium_trend_7d);
    els.push(
      <text key="d7" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"7D "}</tspan><tspan fill={d7 != null ? m7.color : "#aaa"}>{d7 != null ? `${d7 >= 0 ? "+" : ""}${fmtCurrencyShort(d7)}${m7.arrow ? " " + m7.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (showDelta7d30d && y + subFs * 0.88 < sy + sh - 2) {
    const d30 = t.net_premium_delta_30d ?? null;
    const m30 = sfNetTrendMeta(t.net_premium_trend_30d);
    els.push(
      <text key="d30" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"30D "}</tspan><tspan fill={d30 != null ? m30.color : "#aaa"}>{d30 != null ? `${d30 >= 0 ? "+" : ""}${fmtCurrencyShort(d30)}${m30.arrow ? " " + m30.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (showPpc && ppc != null && y + subFs * 0.85 < sy + sh - 2) {
    els.push(
      <text key="ppc" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.85} fontFamily={font} fill="#ccc" dominantBaseline="hanging"
      >{fmtCurrencyShort(ppc)}<tspan fill="#bbb">{"/ct"}</tspan></text>
    );
    y += subFs * 0.85 + 2;
  }
  if (showCount && y + subFs * 0.8 < sy + sh - 2) {
    els.push(
      <text key="cnt" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.8} fontFamily={font} fill="#ccc" dominantBaseline="hanging"
      >{t.contributing_ticker_count ?? 0} / {t.ticker_count ?? 0} tickers</text>
    );
  }
  return <>{els}</>;
}

function sfRenderTicker(tk: SFTicker, sx: number, sy: number, sw: number, sh: number): ReactNode {
  if (sw < 30 || sh < 20) return null;
  const pad       = 4;
  const sym       = tk.symbol || tk.ticker || tk.underlying || "—";
  const name      = (tk.display_name && tk.display_name !== sym) ? tk.display_name : null;
  const isPending = (tk.scan_status || "").toLowerCase() === "pending";
  const pcr       = isPending ? null : tk.put_call_ratio;
  const vpcr      = isPending ? null : (tk.volume_put_call_ratio ?? null);
  const net       = isPending ? null : tk.net_premium;
  const ppc       = isPending ? null : (tk.premium_per_contract ?? null);
  const contracts = isPending ? null : (tk.total_contract_volume ?? null);
  const askPct    = isPending ? null : (tk.interval_ask_premium_pct ?? null);
  const bidPct    = isPending ? null : (tk.interval_bid_premium_pct ?? null);
  const cov       = isPending ? null : (tk.interval_classified_trade_side_pct ?? null);
  const symFs  = Math.max(9,  Math.min(18, sw / 5.5));
  const nameFs = Math.max(7,  Math.min(9,  sw / 14));
  const pcrFs  = Math.max(10, Math.min(28, Math.min(sw / 3.5, sh / 2.2)));
  const subFs  = Math.max(8,  Math.min(11, sw / 12));
  const showPcr      = sh >= 36;
  const showPcrLabel = sw >= 86 && sh >= 60;
  const showVpcr       = sw >= 72 && sh >= 52;
  const showAskBid     = sw >= 86 && sh >= 72;
  const showNet        = sw >= 86 && sh >= 60;
  const showDelta1d    = sw >= 108 && sh >= 80;
  const showDelta7d30d = sw >= 155 && sh >= 110;
  const showPpc        = sw >= 110 && sh >= 76;
  const showContracts  = sw >= 130 && sh >= 90;
  const intPctFill   = (cov != null && cov < 40) ? "#aaa" : "#ddd";
  const els: ReactNode[] = [];
  let y = sy + pad;
  els.push(
    <text key="sym" x={Math.round(sx + pad)} y={Math.round(y)}
      fontSize={symFs} fontFamily={font} fontWeight={800} fill={C.bright} dominantBaseline="hanging"
    >{sym}</text>
  );
  y += symFs + 2;
  // Company name — medium+ tiles only; only if vertical room before pcr
  if (name && sw >= 50 && sh >= 50 && y + nameFs < sy + sh - (showPcr ? pcrFs + 3 : 0) - 2) {
    els.push(
      <text key="name" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={nameFs} fontFamily={font} fontWeight={400} fill="#ffffff" opacity={0.85} dominantBaseline="hanging"
      >{name}</text>
    );
    y += nameFs + 2;
  }
  if (showPcr && y + pcrFs < sy + sh - 2) {
    els.push(
      <text key="pcr" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={pcrFs} fontFamily={font} fontWeight={900} fill={sfPcrTextCol(pcr)} dominantBaseline="hanging"
      >{isPending ? "…" : pcr != null ? pcr.toFixed(2) : "—"}{showPcrLabel && <tspan fontSize={pcrFs * 0.56} fill="#bbb">{" P/C"}</tspan>}</text>
    );
    y += pcrFs + 3;
  }
  if (showVpcr && vpcr != null && y + subFs < sy + sh - 2) {
    els.push(
      <text key="vpcr" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs} fontFamily={font} fontWeight={600} fill={sfPcrTextCol(vpcr)} dominantBaseline="hanging"
      >{vpcr.toFixed(2)}<tspan fontSize={subFs * 0.85} fill="#bbb">{" Vol P/C"}</tspan></text>
    );
    y += subFs + 2;
  }
  if (showAskBid && !isPending && y + subFs < sy + sh - 2) {
    els.push(
      <text key="ab" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.9} fontFamily={font} fontWeight={600} fill={intPctFill} dominantBaseline="hanging"
      >
        <tspan>{sfFmtIntPct(askPct)}</tspan>
        <tspan fill="#bbb">{" Ask · "}</tspan>
        <tspan>{sfFmtIntPct(bidPct)}</tspan>
        <tspan fill="#bbb">{" Bid"}</tspan>
      </text>
    );
    y += subFs * 0.9 + 2;
  }
  if (showNet && y + subFs < sy + sh - 2) {
    els.push(
      <text key="net" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs} fontFamily={font} fontWeight={600} fill={sfNetColor(net)} dominantBaseline="hanging"
      >{isPending ? "pending" : fmtCurrencyShort(net)}</text>
    );
    y += subFs + 2;
  }
  if (!isPending && showDelta1d && y + subFs * 0.88 < sy + sh - 2) {
    const d1 = tk.net_premium_delta_1d ?? null;
    const m1 = sfNetTrendMeta(tk.net_premium_trend_1d);
    els.push(
      <text key="d1" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"1D "}</tspan><tspan fill={d1 != null ? m1.color : "#aaa"}>{d1 != null ? `${d1 >= 0 ? "+" : ""}${fmtCurrencyShort(d1)}${m1.arrow ? " " + m1.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (!isPending && showDelta7d30d && y + subFs * 0.88 < sy + sh - 2) {
    const d7 = tk.net_premium_delta_7d ?? null;
    const m7 = sfNetTrendMeta(tk.net_premium_trend_7d);
    els.push(
      <text key="d7" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"7D "}</tspan><tspan fill={d7 != null ? m7.color : "#aaa"}>{d7 != null ? `${d7 >= 0 ? "+" : ""}${fmtCurrencyShort(d7)}${m7.arrow ? " " + m7.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (!isPending && showDelta7d30d && y + subFs * 0.88 < sy + sh - 2) {
    const d30 = tk.net_premium_delta_30d ?? null;
    const m30 = sfNetTrendMeta(tk.net_premium_trend_30d);
    els.push(
      <text key="d30" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"30D "}</tspan><tspan fill={d30 != null ? m30.color : "#aaa"}>{d30 != null ? `${d30 >= 0 ? "+" : ""}${fmtCurrencyShort(d30)}${m30.arrow ? " " + m30.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (showPpc && ppc != null && y + subFs * 0.85 < sy + sh - 2) {
    els.push(
      <text key="ppc" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.85} fontFamily={font} fill="#ccc" dominantBaseline="hanging"
      >{fmtCurrencyShort(ppc)}<tspan fill="#bbb">{"/ct"}</tspan></text>
    );
    y += subFs * 0.85 + 2;
  }
  if (showContracts && contracts != null && y + subFs * 0.8 < sy + sh - 2) {
    els.push(
      <text key="cts" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.8} fontFamily={font} fill="#ccc" dominantBaseline="hanging"
      >{contracts.toLocaleString()}<tspan fill="#bbb">{" cts"}</tspan></text>
    );
  }
  return <>{els}</>;
}

// ── ETF tile renderer ─────────────────────────────────────────────────────────
function sfRenderEtf(tk: SFTicker, sx: number, sy: number, sw: number, sh: number): ReactNode {
  if (sw < 30 || sh < 20) return null;
  const pad       = 4;
  const sym       = tk.symbol || tk.ticker || tk.underlying || "—";
  const name      = (tk.display_name && tk.display_name !== sym) ? tk.display_name : null;
  const isNoOptions = sfIsNoOptions(tk);
  const isPending = sfIsNfPending(tk);
  const pcr       = (isPending || isNoOptions) ? null : sfNfPcr(tk);
  const net       = (isPending || isNoOptions) ? null : tk.net_premium;
  const ppc       = (isPending || isNoOptions) ? null : (tk.premium_per_contract ?? null);
  const contracts = (isPending || isNoOptions) ? null : (tk.total_contract_volume ?? null);
  const symFs  = Math.max(9,  Math.min(18, sw / 5.5));
  const nameFs = Math.max(7,  Math.min(9,  sw / 14));
  const pcrFs  = Math.max(10, Math.min(28, Math.min(sw / 3.5, sh / 2.2)));
  const subFs  = Math.max(8,  Math.min(11, sw / 12));
  const showPcr      = sh >= 36;
  const showPcrLabel   = sw >= 86 && sh >= 60;
  const showNet        = sw >= 86 && sh >= 60;
  const showDelta1d    = sw >= 108 && sh >= 80;
  const showDelta7d30d = sw >= 155 && sh >= 110;
  const showPpc        = sw >= 110 && sh >= 76;
  const showContracts  = sw >= 130 && sh >= 90;
  const els: ReactNode[] = [];
  let y = sy + pad;
  els.push(
    <text key="sym" x={Math.round(sx + pad)} y={Math.round(y)}
      fontSize={symFs} fontFamily={font} fontWeight={800} fill={C.bright} dominantBaseline="hanging"
    >{sym}</text>
  );
  y += symFs + 2;
  // Fund/ETF name — medium+ tiles only; only if vertical room before pcr
  if (name && sw >= 50 && sh >= 50 && y + nameFs < sy + sh - (showPcr ? pcrFs + 3 : 0) - 2) {
    els.push(
      <text key="name" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={nameFs} fontFamily={font} fontWeight={400} fill="#ffffff" opacity={0.85} dominantBaseline="hanging"
      >{name}</text>
    );
    y += nameFs + 2;
  }
  if (showPcr && y + pcrFs < sy + sh - 2) {
    const dispStr = isPending ? "…" : sfDisplayNfPcr(tk);
    els.push(
      <text key="pcr" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={pcrFs} fontFamily={font} fontWeight={900} fill={sfPcrTextCol(pcr)} dominantBaseline="hanging"
      >{dispStr}{showPcrLabel && <tspan fontSize={pcrFs * 0.56} fill="#bbb">{" NF P/C"}</tspan>}</text>
    );
    y += pcrFs + 3;
  }
  if (showNet && y + subFs < sy + sh - 2) {
    els.push(
      <text key="net" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs} fontFamily={font} fontWeight={600} fill={sfNetColor(net)} dominantBaseline="hanging"
      >{isPending ? "pending" : fmtCurrencyShort(net)}</text>
    );
    y += subFs + 2;
  }
  if (!isPending && showDelta1d && y + subFs * 0.88 < sy + sh - 2) {
    const d1 = tk.net_premium_delta_1d ?? null;
    const m1 = sfNetTrendMeta(tk.net_premium_trend_1d);
    els.push(
      <text key="d1" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"1D "}</tspan><tspan fill={d1 != null ? m1.color : "#aaa"}>{d1 != null ? `${d1 >= 0 ? "+" : ""}${fmtCurrencyShort(d1)}${m1.arrow ? " " + m1.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (!isPending && showDelta7d30d && y + subFs * 0.88 < sy + sh - 2) {
    const d7 = tk.net_premium_delta_7d ?? null;
    const m7 = sfNetTrendMeta(tk.net_premium_trend_7d);
    els.push(
      <text key="d7" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"7D "}</tspan><tspan fill={d7 != null ? m7.color : "#aaa"}>{d7 != null ? `${d7 >= 0 ? "+" : ""}${fmtCurrencyShort(d7)}${m7.arrow ? " " + m7.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (!isPending && showDelta7d30d && y + subFs * 0.88 < sy + sh - 2) {
    const d30 = tk.net_premium_delta_30d ?? null;
    const m30 = sfNetTrendMeta(tk.net_premium_trend_30d);
    els.push(
      <text key="d30" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.88} fontFamily={font} fontWeight={600} dominantBaseline="hanging"
      ><tspan fill="#bbb">{"30D "}</tspan><tspan fill={d30 != null ? m30.color : "#aaa"}>{d30 != null ? `${d30 >= 0 ? "+" : ""}${fmtCurrencyShort(d30)}${m30.arrow ? " " + m30.arrow : ""}` : "—"}</tspan></text>
    );
    y += subFs * 0.88 + 2;
  }
  if (showPpc && ppc != null && y + subFs * 0.85 < sy + sh - 2) {
    els.push(
      <text key="ppc" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.85} fontFamily={font} fill="#ccc" dominantBaseline="hanging"
      >{fmtCurrencyShort(ppc)}<tspan fill="#bbb">{"/ct"}</tspan></text>
    );
    y += subFs * 0.85 + 2;
  }
  if (showContracts && contracts != null && y + subFs * 0.8 < sy + sh - 2) {
    els.push(
      <text key="cts" x={Math.round(sx + pad)} y={Math.round(y)}
        fontSize={subFs * 0.8} fontFamily={font} fill="#ccc" dominantBaseline="hanging"
      >{contracts.toLocaleString()}<tspan fill="#bbb">{" cts"}</tspan></text>
    );
  }
  return <>{els}</>;
}

// ── ETF tooltip ───────────────────────────────────────────────────────────────
function sfTooltipEtf(tk: SFTicker): ReactNode {
  const sym       = tk.symbol || tk.ticker || tk.underlying || "—";
  const name      = (tk.display_name && tk.display_name !== sym) ? tk.display_name : null;
  const isPending = sfIsNfPending(tk);
  const pcr       = isPending ? null : sfNfPcr(tk);
  const dispPcr   = sfDisplayNfPcr(tk);
  const os        = tk.one_sided_flow ?? null;
  const vpcr      = isPending ? null : (tk.volume_put_call_ratio ?? null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, color: C.bright, fontSize: 13, fontFamily: font }}>{sym}</span>
          <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: `${C.blue}15`, border: `1px solid ${C.blue}25`, color: C.blue, fontFamily: font }}>ETF</span>
        </div>
        {name && <div style={{ fontSize: 10, color: C.dim, fontFamily: font, opacity: 0.75, marginTop: 1 }}>{name}</div>}
      </div>
      <div style={{ color: sfPcrTextCol(pcr), fontWeight: 700, fontSize: 10, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
        {isPending ? "NF Pending" : sfSentiment(pcr)}
      </div>
      {isPending && sfTTNote("Net Flow snapshot pending — NF PCR not yet available")}
      {!isPending && sfTTRow("NF P/C", dispPcr, sfPcrTextCol(pcr))}
      {!isPending && sfTTNote("net-flow put ÷ call (7–60 DTE single expiry scope)")}
      {os === "call_only" && sfTTNote("one-sided: calls only — no put premium")}
      {os === "put_only"  && sfTTNote("one-sided: puts only — no call premium")}
      {!isPending && tk.raw_premium_pcr != null && tk.raw_premium_pcr !== tk.effective_premium_pcr && sfTTRow("Raw NF P/C", tk.raw_premium_pcr.toFixed(2), sfPcrTextCol(tk.raw_premium_pcr))}
      {!isPending && vpcr != null && sfTTRow("Vol P/C", vpcr.toFixed(2), sfPcrTextCol(vpcr))}
      {!isPending && sfTTRow("Net Premium", fmtCurrencyShort(tk.net_premium), sfNetColor(tk.net_premium))}
      {!isPending && sfTTRow("Call Premium", fmtCurrencyShort(tk.call_premium ?? null), C.green)}
      {!isPending && sfTTRow("Put Premium", fmtCurrencyShort(tk.put_premium ?? null), C.red)}
      {!isPending && tk.premium_per_contract != null && sfTTRow("Prem/Contract", fmtCurrencyShort(tk.premium_per_contract), C.dim)}
      {tk.total_contract_volume != null && sfTTRow("Contracts", tk.total_contract_volume.toLocaleString(), C.dim)}
      {!isPending && sfNetTrendTTSection(tk)}
      {!isPending && sfIntervalTTSection(tk)}
    </div>
  );
}

// ── Canonical theme leaf helper ────────────────────────────────────────────────
// Returns the same leaf universe for both grouped and ungrouped Themes views.
// Canonical = classification "theme" or "sub_theme" (never "sector").
// Grouping uses parent_sector on each leaf — value matches the sector node's theme_id.
// Sector nodes (classification="sector") live inside the same data.themes flat list
// and carry the sector-level PCR for the grouped headers.
// data.sectors is empty for ?view=themes; parent_sector is the authoritative link.
function getThemeHeatmapLeaves(data: SFData): {
  flatLeaves: SFTheme[];
  bySector: Array<{ sectorName: string; pcr: number | null; leaves: SFTheme[] }>;
} {
  const isLeaf = (t: SFTheme): boolean => {
    const cls = (t.classification ?? "theme").toLowerCase();
    return cls === "theme" || cls === "sub_theme";
  };

  const allThemes = data.themes ?? [];

  // Flat canonical list (theme + sub_theme only)
  const flatLeaves = allThemes.filter(isLeaf);

  // Build sector header map from sector-classified nodes in data.themes
  // sector node theme_id === leaf's parent_sector value (e.g. "technology")
  const sectorNodeMap = new Map<string, SFTheme>();
  const sectorOrder: string[] = [];
  allThemes.forEach(t => {
    if ((t.classification ?? "").toLowerCase() === "sector") {
      sectorNodeMap.set(t.theme_id, t);
      sectorOrder.push(t.theme_id);
    }
  });

  // Group canonical leaves by parent_sector
  const groupMap = new Map<string, { sectorName: string; pcr: number | null; leaves: SFTheme[] }>();
  const unmapped: SFTheme[] = [];

  flatLeaves.forEach(t => {
    const ps = t.parent_sector ?? null;
    if (!ps) { unmapped.push(t); return; }
    if (!groupMap.has(ps)) {
      const node = sectorNodeMap.get(ps);
      groupMap.set(ps, {
        sectorName: node?.theme_name ?? ps,
        pcr: node?.put_call_ratio ?? null,
        leaves: [],
      });
    }
    groupMap.get(ps)!.leaves.push(t);
  });

  // Emit groups in sector-node order, then any extra parent_sector values
  const bySector: Array<{ sectorName: string; pcr: number | null; leaves: SFTheme[] }> = [];
  sectorOrder.forEach(sid => {
    const g = groupMap.get(sid);
    if (g && g.leaves.length > 0) bySector.push(g);
  });
  groupMap.forEach((g, sid) => {
    if (!sectorOrder.includes(sid) && g.leaves.length > 0) bySector.push(g);
  });

  // Fallback: if parent_sector was absent, try data.sectors[].themes[] (legacy shape)
  if (bySector.length === 0) {
    (data.sectors ?? []).forEach(sector => {
      const leaves = (sector.themes ?? []).filter(isLeaf);
      if (leaves.length > 0) {
        bySector.push({ sectorName: sector.sector_name, pcr: sector.put_call_ratio, leaves });
        leaves.forEach(t => unmapped.splice(unmapped.indexOf(t), 1));
      }
    });
  }

  // Unmapped leaves (no parent_sector and not in any sector)
  if (unmapped.length > 0) {
    console.warn(`[Themes] ${unmapped.length} orphaned leaves (no parent_sector):`,
      unmapped.slice(0, 5).map(t => ({ name: t.theme_name, cls: t.classification })));
    bySector.push({ sectorName: "Unmapped", pcr: null, leaves: unmapped });
  }

  // Last resort: if still nothing, dump all leaves in one bucket
  if (bySector.length === 0 && flatLeaves.length > 0) {
    bySector.push({ sectorName: "All Themes", pcr: null, leaves: flatLeaves });
  }

  return { flatLeaves, bySector };
}

function SectorsFlowTab({ view }: { view: "sectors" | "themes" | "etfs" | "allstocks" }) {
  const [data,           setData]           = useState<SFData | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [refreshing,     setRefreshing]     = useState(false);
  const [activeSector,   setActiveSector]   = useState<SFSector | null>(null);
  const [activeTheme,    setActiveTheme]    = useState<SFTheme  | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<SFTicker | null>(null);
  const [grouped,        setGrouped]        = useState(true);
  const [sortBy,         setSortBy]         = useState<SFSortKey>("pcr");

  // Canonical payload caches.
  // canonSectors = ?view=sectors response  (deduped sector aggregates — used for Themes grouped headers)
  // canonThemes  = ?view=themes  response  (canonical theme aggregates — used for All Stocks grouped headers)
  const [canonSectors, setCanonSectors] = useState<SFData | null>(null);
  const [canonThemes,  setCanonThemes]  = useState<SFData | null>(null);

  // allstocks + themes + etfs all fetch ?view=themes; sectors fetches ?view=sectors
  const fetchView = (view === "allstocks" || view === "etfs") ? "themes" : view;

  const load = useCallback(async (bg = false) => {
    if (bg) { setRefreshing(true); } else { setLoading(true); setError(null); }
    try {
      const r = await fetch(`/api/options-flow/sectors?view=${fetchView}`, { headers: authHeaders() });
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const preview = (await r.text()).slice(0, 120);
        throw new Error(`Expected JSON but got ${ct || "unknown"} (${r.status}): ${preview}`);
      }
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || body?.detail || `HTTP ${r.status}`);
      }
      const d: SFData = await r.json();
      setData(d);
      // Cache canonical payloads so grouped headers can use authoritative metrics
      if (fetchView === "sectors") setCanonSectors(d);
      if (fetchView === "themes")  setCanonThemes(d);
    } catch (e: any) {
      if (!bg) setError(e.message || `Failed to load flow`);
    } finally {
      bg ? setRefreshing(false) : setLoading(false);
    }
  }, [fetchView]);

  useEffect(() => { load(false); }, [load]);

  // Background-fetch canonical sectors payload when user lands on Themes grouped
  // without having visited the Sectors tab first.
  useEffect(() => {
    if (view !== "themes" || !grouped || canonSectors !== null) return;
    let cancelled = false;
    fetch(`/api/options-flow/sectors?view=sectors`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then((d: SFData | null) => { if (!cancelled && d) setCanonSectors(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [view, grouped, canonSectors]);

  // ── Diagnostic: validate canonical leaf count vs grouped leaf count ──────
  useEffect(() => {
    if (view !== "themes" || !data) return;
    const all = data.themes ?? [];
    const byCls: Record<string, number> = {};
    all.forEach(t => { const c = (t.classification ?? "none").toLowerCase(); byCls[c] = (byCls[c] ?? 0) + 1; });
    const { flatLeaves, bySector } = getThemeHeatmapLeaves(data);
    const groupedCount = bySector.reduce((n, g) => n + g.leaves.length, 0);
    // Log ALL keys on the first raw leaf so we can see what sector fields the API provides
    const firstLeaf = flatLeaves[0] as any;
    const firstLeafAllFields = firstLeaf ? Object.fromEntries(
      Object.keys(firstLeaf).map(k => [k, firstLeaf[k]])
    ) : null;
    // Probe likely sector-assignment field names
    const sectorFieldProbe = flatLeaves.slice(0, 5).map(t => {
      const r = t as any;
      return {
        name: t.theme_name,
        sector_name: r.sector_name,
        sector: r.sector,
        parent_sector: r.parent_sector,
        aggregation_scope: t.aggregation_scope,
        sector_id: r.sector_id,
        parent_id: r.parent_id,
      };
    });
    console.log("[Themes diagnostic]", {
      total_raw: all.length,
      by_classification: byCls,
      canonical_leaf_count: flatLeaves.length,
      grouped_leaf_count: groupedCount,
      sector_groups: bySector.map(g => `${g.sectorName}(${g.leaves.length})`),
      sector_field_probe: sectorFieldProbe,
      first_leaf_all_keys: firstLeafAllFields ? Object.keys(firstLeafAllFields) : null,
      first_10_leaves: flatLeaves.slice(0, 10).map(t => ({ name: t.theme_name, cls: t.classification ?? "none" })),
      data_sectors_count: (data.sectors ?? []).length,
      data_sectors_names: (data.sectors ?? []).map(s => `${s.sector_name}(themes:${(s.themes??[]).length})`),
    });
    if (flatLeaves.length !== groupedCount) {
      console.warn("[Themes] MISMATCH — ungrouped:", flatLeaves.length, "grouped:", groupedCount);
    }
  }, [view, data]);

  // Totals from top-level items
  const totals = useMemo(() => {
    const src: Array<{ call_premium: number | null; put_premium: number | null; net_premium: number | null; total_contract_volume?: number | null }> =
      fetchView === "themes" ? (data?.themes ?? []) : (data?.sectors ?? []);
    if (!src.length) return null;
    let call = 0, put = 0, net = 0, contracts = 0;
    src.forEach(s => {
      call      += s.call_premium          ?? 0;
      put       += s.put_premium           ?? 0;
      net       += s.net_premium           ?? 0;
      contracts += s.total_contract_volume ?? 0;
    });
    return { call, put, net, pcr: call > 0 ? put / call : null, contracts };
  }, [data, fetchView]);

  // Sorted themes (flat) — order driven by sortBy
  const sortedThemes = useMemo(() => sfSortItems(
    data?.themes ?? [],
    sortBy,
    t => {
      switch (sortBy) {
        case "pcr":          return t.put_call_ratio;
        case "vpcr":         return t.volume_put_call_ratio ?? null;
        case "ask_pct":      return t.interval_ask_premium_pct ?? null;
        case "bid_pct":      return t.interval_bid_premium_pct ?? null;
        case "net_premium":  return t.net_premium;
        case "ppc":          return t.premium_per_contract ?? null;
        case "contracts":    return t.total_contract_volume ?? null;
        case "call_premium": return t.call_premium;
        case "put_premium":  return t.put_premium;
      }
    },
  ), [data, sortBy]);

  // Sorted sectors — order driven by sortBy
  const sortedSectors = useMemo(() => sfSortItems(
    data?.sectors ?? [],
    sortBy,
    s => {
      switch (sortBy) {
        case "pcr":          return s.put_call_ratio;
        case "vpcr":         return s.volume_put_call_ratio ?? null;
        case "ask_pct":      return s.interval_ask_premium_pct ?? null;
        case "bid_pct":      return s.interval_bid_premium_pct ?? null;
        case "net_premium":  return s.net_premium;
        case "ppc":          return s.premium_per_contract ?? null;
        case "contracts":    return s.total_contract_volume ?? null;
        case "call_premium": return s.call_premium;
        case "put_premium":  return s.put_premium;
      }
    },
  ), [data, sortBy]);

  // Shared dedup helper for both allTickers and allEtfs
  const _dedupTickers = useMemo(() => {
    const raw: SFTicker[] = [];
    (data?.themes ?? []).forEach(th => (th.tickers ?? []).forEach(tk => raw.push(tk)));
    const bySymbol = new Map<string, SFTicker>();
    raw.forEach(tk => {
      const sym = tk.symbol || tk.ticker || tk.underlying || "";
      if (!sym) { return; }
      const existing = bySymbol.get(sym);
      if (!existing) { bySymbol.set(sym, { ...tk }); return; }
      const call  = (existing.call_premium ?? 0) + (tk.call_premium ?? 0);
      const put   = (existing.put_premium  ?? 0) + (tk.put_premium  ?? 0);
      const cts   = (existing.total_contract_volume ?? 0) + (tk.total_contract_volume ?? 0);
      const existVpcr = existing.volume_put_call_ratio ?? null;
      const tkVpcr    = tk.volume_put_call_ratio ?? null;
      const vpcr = (existVpcr != null || tkVpcr != null)
        ? ((existVpcr ?? 0) * (existing.total_contract_volume ?? 0) + (tkVpcr ?? 0) * (tk.total_contract_volume ?? 0)) / Math.max(1, cts)
        : null;
      const useNewInterval = (
        existing.interval_ask_premium_pct == null &&
        tk.interval_ask_premium_pct != null
      );
      const intervalOverride: Partial<SFTicker> = useNewInterval ? {
        interval_ask_premium:                  tk.interval_ask_premium ?? null,
        interval_bid_premium:                  tk.interval_bid_premium ?? null,
        interval_midpoint_unknown_premium:     tk.interval_midpoint_unknown_premium ?? null,
        interval_total_premium:                tk.interval_total_premium ?? null,
        interval_new_contract_volume:          tk.interval_new_contract_volume ?? null,
        interval_ask_premium_pct:              tk.interval_ask_premium_pct ?? null,
        interval_bid_premium_pct:              tk.interval_bid_premium_pct ?? null,
        interval_midpoint_unknown_premium_pct: tk.interval_midpoint_unknown_premium_pct ?? null,
        interval_classified_trade_side_pct:    tk.interval_classified_trade_side_pct ?? null,
        interval_seconds:                      tk.interval_seconds ?? null,
        interval_started_at:                   tk.interval_started_at ?? null,
        interval_ended_at:                     tk.interval_ended_at ?? null,
      } : {};
      bySymbol.set(sym, {
        ...existing,
        ...intervalOverride,
        call_premium:           call,
        put_premium:            put,
        net_premium:            call - put,
        put_call_ratio:         call > 0 ? put / call : existing.put_call_ratio,
        volume_put_call_ratio:  vpcr,
        total_contract_volume:  cts,
        premium_per_contract:   cts > 0 ? Math.abs(call + put) / (cts * 100) : null,
      });
    });
    return Array.from(bySymbol.values());
  }, [data]);

  // All tickers (stocks only) — deduplicated by symbol, sorted by sortBy
  const allTickers = useMemo(() => {
    // Strict: only instrument_type === "stock". Unknown/absent types are excluded.
    const stocks: SFTicker[] = [];
    let unknownCount = 0;
    _dedupTickers.forEach(tk => {
      if (tk.instrument_type === "stock") { stocks.push(tk); }
      else if (tk.instrument_type === "etf") { /* goes to allEtfs */ }
      else { unknownCount++; }
    });
    if (unknownCount > 0) {
      console.warn(`[SectorsFlow] ${unknownCount} ticker(s) excluded from All Stocks and ETFs — unknown/absent instrument_type`);
    }
    console.debug(`[SectorsFlow] filtered: ${stocks.length} stocks | ETFs counted separately`);
    return sfSortItems(stocks, sortBy, tk => {
      switch (sortBy) {
        case "pcr":          return tk.put_call_ratio;
        case "vpcr":         return tk.volume_put_call_ratio ?? null;
        case "ask_pct":      return tk.interval_ask_premium_pct ?? null;
        case "bid_pct":      return tk.interval_bid_premium_pct ?? null;
        case "net_premium":  return tk.net_premium;
        case "ppc":          return tk.premium_per_contract ?? null;
        case "contracts":    return tk.total_contract_volume ?? null;
        case "call_premium": return tk.call_premium;
        case "put_premium":  return tk.put_premium;
      }
    });
  }, [_dedupTickers, sortBy]);

  // ETFs — deduplicated by symbol, strict instrument_type === "etf"
  const allEtfs = useMemo(() => {
    const etfs = _dedupTickers.filter(tk => tk.instrument_type === "etf");
    console.debug(`[SectorsFlow] ETF count: ${etfs.length}`);
    // For ETF tiles, color/size uses sfNfPcr (effective_premium_pcr); also set put_call_ratio
    // to effective_premium_pcr so the standard sfSortRaw("pcr") path works naturally
    const etfsMapped = etfs.map(tk => {
      const nfPcr = sfNfPcr(tk);
      return { ...tk, put_call_ratio: nfPcr ?? tk.put_call_ratio };
    });
    return sfSortItems(etfsMapped, sortBy, tk => {
      switch (sortBy) {
        case "pcr":          return tk.put_call_ratio;
        case "vpcr":         return tk.volume_put_call_ratio ?? null;
        case "ask_pct":      return tk.interval_ask_premium_pct ?? null;
        case "bid_pct":      return tk.interval_bid_premium_pct ?? null;
        case "net_premium":  return tk.net_premium;
        case "ppc":          return tk.premium_per_contract ?? null;
        case "contracts":    return tk.total_contract_volume ?? null;
        case "call_premium": return tk.call_premium;
        case "put_premium":  return tk.put_premium;
      }
    });
  }, [_dedupTickers, sortBy]);

  // Navigation level
  const level: "top" | "themes" | "tickers" =
    view === "allstocks" ? "top"
    : view === "etfs"    ? "top"
    : view === "themes"  ? (activeTheme ? "tickers" : "top")
    :                      (activeTheme ? "tickers" : activeSector ? "themes" : "top");

  const rootLabel = view === "themes" ? "Themes" : view === "allstocks" ? "Stocks" : view === "etfs" ? "ETFs" : "Sectors";

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 10, color: C.dim, fontFamily: font, fontSize: 12 }}>
      <Loader2 className="w-6 h-6" style={{ color: C.blue, animation: "spin 1s linear infinite" }} />
      {view === "sectors" ? "Loading sectors flow…" : view === "themes" ? "Loading themes flow…" : view === "etfs" ? "Loading ETF flow…" : "Loading stocks flow…"}
    </div>
  );

  if (error) return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: 8 }}>
        <CircleAlert className="w-4 h-4" style={{ color: C.red, flexShrink: 0 }} />
        <span style={{ color: C.red, fontSize: 12, fontFamily: font, flex: 1 }}>{error}</span>
        <button onClick={() => load(false)} style={{ padding: "4px 12px", background: `${C.blue}14`, border: `1px solid ${C.blue}35`, borderRadius: 6, color: C.blue, fontSize: 11, fontFamily: font, cursor: "pointer" }}>Retry</button>
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <>
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
    <div style={{ padding: "10px 16px 4px", flexShrink: 0 }}>

      {/* ── Header summary ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 14, background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 90 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: C.dim, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Net Premium
            <Info
              size={10}
              style={{ color: C.dim, opacity: 0.55, cursor: "default", flexShrink: 0 }}
              title="Premium is estimated option premium traded. Net Premium = Call Premium - Put Premium. Contracts = total option contracts traded."
            />
          </span>
          <span style={{ fontSize: 17, fontFamily: font, fontWeight: 800, color: totals ? (totals.net > 0 ? C.green : totals.net < 0 ? C.red : C.bright) : C.bright }}>
            {totals ? fmtCurrencyShort(totals.net) : "—"}
          </span>
        </div>
        <div style={{ width: 1, height: 32, background: C.border, flexShrink: 0 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {([
            { label: "Call Premium", val: totals?.call      ?? null, color: C.green, fmt: (v: number | null) => fmtCurrencyShort(v) },
            { label: "Put Premium",  val: totals?.put       ?? null, color: C.red,   fmt: (v: number | null) => fmtCurrencyShort(v) },
            { label: "Premium P/C",  val: totals?.pcr       ?? null, color: C.text,  fmt: (v: number | null) => v != null ? v.toFixed(2) : "—" },
            { label: "Contracts",    val: totals?.contracts ?? null, color: C.dim,   fmt: (v: number | null) => v != null && v > 0 ? v.toLocaleString() : "—" },
          ] as { label: string; val: number | null; color: string; fmt: (v: number | null) => string }[]).map(({ label, val, color, fmt }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span style={{ fontSize: 9, color: C.dim, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
              <span style={{ fontSize: 13, fontFamily: font, fontWeight: 600, color }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
        {data.scan_coverage && (
          <>
            <div style={{ width: 1, height: 32, background: C.border, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontFamily: font, fontWeight: 700, color: C.bright }}>
                  {data.scan_coverage.tickers_with_data ?? "—"} / {data.scan_coverage.theme_universe_total ?? "—"}
                </span>
                <span style={{ fontSize: 11, fontFamily: font, color: data.scan_coverage.coverage_pct != null && data.scan_coverage.coverage_pct >= 50 ? C.green : C.yellow }}>
                  {data.scan_coverage.coverage_pct != null ? `${data.scan_coverage.coverage_pct.toFixed(1)}% coverage` : "—"}
                </span>
                {data.scan_coverage.pending_count != null && data.scan_coverage.pending_count > 0 && (
                  <span style={{ fontSize: 10, fontFamily: font, color: C.yellow }}>· {data.scan_coverage.pending_count} pending</span>
                )}
                {data.scan_coverage.estimated_full_coverage_minutes != null && (
                  <span style={{ fontSize: 9, fontFamily: font, color: C.dim }}>ETA ~{Math.round(data.scan_coverage.estimated_full_coverage_minutes)} min</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {data.scan_coverage.master_count != null && data.scan_coverage.master_count > 0 && (
                  <span style={{ fontSize: 9, fontFamily: font, color: C.green }}>Live: {data.scan_coverage.master_count}</span>
                )}
                {data.scan_coverage.supplement_fresh_count != null && data.scan_coverage.supplement_fresh_count > 0 && (
                  <span style={{ fontSize: 9, fontFamily: font, color: C.blue }}>Supplement: {data.scan_coverage.supplement_fresh_count}</span>
                )}
                {data.scan_coverage.supplement_lkg_count != null && data.scan_coverage.supplement_lkg_count > 0 && (
                  <span style={{ fontSize: 9, fontFamily: font, color: "#818cf8" }}>LKG: {data.scan_coverage.supplement_lkg_count}</span>
                )}
                {data.scan_coverage.no_options_count != null && data.scan_coverage.no_options_count > 0 && (
                  <span style={{ fontSize: 9, fontFamily: font, color: C.dim }}>No options: {data.scan_coverage.no_options_count}</span>
                )}
                {data.scan_coverage.next_supplement_scan_at && (
                  <span style={{ fontSize: 9, fontFamily: font, color: C.dim }}>
                    Next scan: {new Date(data.scan_coverage.next_supplement_scan_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
          {data.as_of && <span style={{ fontSize: 9, color: C.dim, fontFamily: font }}>Updated {new Date(data.as_of).toLocaleTimeString()}</span>}
          {data.source && <span style={{ fontSize: 9, color: C.dim, fontFamily: font, opacity: 0.5 }}>{data.source}</span>}
          <button
            onClick={() => load(true)} disabled={refreshing}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 5, color: C.dim, fontSize: 9, fontFamily: font, cursor: refreshing ? "default" : "pointer" }}
          >
            <RefreshCw className="w-2.5 h-2.5" style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>


      {/* ── Sort + Grouped controls row ── */}
      {level === "top" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 9, color: C.dim, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.07em", flexShrink: 0 }}>
            Sort
          </span>
          {SF_SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                padding: "2px 9px", borderRadius: 20, fontSize: 9, fontFamily: font, fontWeight: 600,
                cursor: "pointer", transition: "all 0.12s",
                border: `1px solid ${sortBy === key ? C.blue : C.border}`,
                background: sortBy === key ? `${C.blue}18` : "transparent",
                color: sortBy === key ? C.blue : C.dim,
              }}
            >{label}</button>
          ))}
          {(view === "themes" || view === "allstocks" || view === "etfs") && (
            <>
              <div style={{ width: 1, height: 16, background: C.border, flexShrink: 0, marginLeft: 2 }} />
              <span style={{ fontSize: 9, color: C.dim, fontFamily: font, flexShrink: 0 }}>
                Group by {view === "themes" ? "sector" : "theme"}:
              </span>
              <button
                onClick={() => setGrouped(g => !g)}
                style={{
                  padding: "2px 10px", borderRadius: 20, fontSize: 9, fontFamily: font, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${grouped ? C.blue : C.border}`,
                  background: grouped ? `${C.blue}15` : "transparent",
                  color: grouped ? C.blue : C.dim, transition: "all 0.15s",
                }}
              >{grouped ? "Grouped" : "Ungrouped"}</button>
            </>
          )}
        </div>
      )}

      {/* ── Breadcrumb ── */}
      {level !== "top" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, fontSize: 11, fontFamily: font }}>
          <button onClick={() => { setActiveSector(null); setActiveTheme(null); }} style={{ color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>{rootLabel}</button>
          {view === "sectors" && activeSector && (
            <>
              <span style={{ color: C.dim }}>›</span>
              {level === "tickers"
                ? <button onClick={() => setActiveTheme(null)} style={{ color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}>{activeSector.sector_name}</button>
                : <span style={{ color: C.bright }}>{activeSector.sector_name}</span>
              }
            </>
          )}
          {activeTheme && (
            <>
              <span style={{ color: C.dim }}>›</span>
              <span style={{ color: C.bright }}>{activeTheme.theme_name}</span>
            </>
          )}
        </div>
      )}
    </div>{/* end header section */}

    {/* ── Heatmap panel: flex:1 fills remaining space, ResizeObserver measures exact dimensions ── */}
    <div style={{ flex: 1, minHeight: 0, padding: "0 16px 10px", overflow: "hidden", display: "flex", flexDirection: "column" }}>

      {/* ══ SECTORS — top: fills available space ══ */}
      {view === "sectors" && level === "top" && (() => {
        const { sorted, valueOf } = sfScoredWithSort(sortedSectors, sortBy, s => (s.call_premium ?? 0) + (s.put_premium ?? 0), s => s.put_call_ratio, s => sfSortRaw(s, sortBy));
        return (
          <SFHeatmap
            items={sorted}
            valueOf={valueOf}
            getPcr={s => s.put_call_ratio}
            onClick={s => setActiveSector(s)}
            renderTile={sfRenderSector}
            renderTooltip={sfTooltipSector}
            keyOf={(s, i) => s.sector_id ?? String(i)}
          />
        );
      })()}

      {/* ══ SECTORS — drill: themes inside sector ══ */}
      {view === "sectors" && level === "themes" && activeSector && (() => {
        const { sorted, valueOf } = sfScoredWithSort(activeSector.themes, sortBy, t => (t.call_premium ?? 0) + (t.put_premium ?? 0), t => t.put_call_ratio, t => sfSortRaw(t, sortBy));
        return (
          <SFHeatmap
            items={sorted}
            valueOf={valueOf}
            getPcr={t => t.put_call_ratio}
            onClick={t => setActiveTheme(t)}
            renderTile={sfRenderTheme}
            renderTooltip={sfTooltipTheme}
            keyOf={(t, i) => t.theme_id ?? t.theme_name ?? String(i)}
          />
        );
      })()}

      {/* ══ SECTORS — drill: tickers inside theme ══ */}
      {view === "sectors" && level === "tickers" && activeTheme && (() => {
        const tks  = activeTheme.tickers;
        const wd   = tks.filter(tk => tk.net_premium != null).length;
        const pend = tks.filter(tk => (tk.scan_status || "").toLowerCase() === "pending").length;
        const { sorted, valueOf } = sfScoredWithSort(tks, sortBy, tk => (tk.call_premium ?? 0) + (tk.put_premium ?? 0), tk => (sfIsNoOptions(tk) || (tk.scan_status||"").toLowerCase() === "pending") ? null : tk.put_call_ratio, tk => sfSortRaw(tk, sortBy));
        return (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flexShrink: 0, display: "flex", gap: 10, marginBottom: 6, fontSize: 10, fontFamily: font, color: C.dim, alignItems: "center", flexWrap: "wrap" }}>
              <span>{wd} / {tks.length} with flow</span>
              {pend > 0 && <span style={{ color: C.yellow }}>· {pend} pending</span>}
              {activeTheme.classification && <span style={{ opacity: 0.5 }}>· {activeTheme.classification}</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <SFHeatmap
                items={sorted}
                valueOf={valueOf}
                getPcr={tk => (sfIsNoOptions(tk) || (tk.scan_status || "").toLowerCase() === "pending") ? null : tk.put_call_ratio}
                noData={tk => sfIsNoOptions(tk)}
                onClick={tk => setSelectedTicker(tk)}
                renderTile={sfRenderTicker}
                renderTooltip={sfTooltipTicker}
                keyOf={(tk, i) => `${tk.symbol || tk.ticker || "tk"}-${i}`}
              />
            </div>
          </div>
        );
      })()}

      {/* ══ THEMES — ungrouped: canonical leaves (theme + sub_theme only, no sector nodes) ══ */}
      {view === "themes" && level === "top" && !grouped && (() => {
        const { flatLeaves } = getThemeHeatmapLeaves(data);
        const { sorted, valueOf } = sfScoredWithSort(flatLeaves, sortBy, t => (t.call_premium ?? 0) + (t.put_premium ?? 0), t => t.put_call_ratio, t => sfSortRaw(t, sortBy));
        return (
          <SFHeatmap
            items={sorted}
            valueOf={valueOf}
            getPcr={t => t.put_call_ratio}
            onClick={t => setActiveTheme(t)}
            renderTile={sfRenderTheme}
            renderTooltip={sfTooltipTheme}
            keyOf={(t, i) => t.theme_id ?? t.theme_name ?? String(i)}
          />
        );
      })()}

      {/* ══ THEMES — grouped: TradingView-style hierarchical treemap (sectors → themes) ══ */}
      {view === "themes" && level === "top" && grouped && (() => {
        const { bySector } = getThemeHeatmapLeaves(data);
        // Canonical sector aggregates — from ?view=sectors (deduped unique tickers, no overlap).
        // Do NOT use sector nodes from the themes payload here: they aggregate via overlapping
        // themes and produce inflated P/C values that don't match the Sectors tab.
        // Use a normalized key (lowercase, no whitespace) to handle name mismatches such as
        // "Health Care" (themes payload) vs "Healthcare" (sectors payload).
        const normKey = (s: string) => s.toLowerCase().replace(/\s+/g, "");
        const canonSectorByNorm = new Map(
          (canonSectors?.sectors ?? []).map(s => [normKey(s.sector_name), s])
        );
        // Themes-payload sector nodes indexed by display name — only used for stable group key.
        const themesPayloadSectorByName = new Map(
          (data.themes ?? [])
            .filter(t => (t.classification ?? "").toLowerCase() === "sector")
            .map(t => [t.theme_name, t])
        );
        // Build unsorted groups, then sort both groups and their children by sortBy
        const rawGroups: SFGroupDef<SFTheme>[] = bySector.map(({ sectorName, leaves }) => {
          const sNode = themesPayloadSectorByName.get(sectorName);
          const canon = canonSectorByNorm.get(normKey(sectorName));
          return {
            key:          sNode?.theme_id ?? sectorName,
            name:         sectorName,
            // Use canonical sector metrics (null = not loaded yet → header shows "—", no fake values)
            pcr:          canon?.put_call_ratio ?? null,
            call_premium: canon?.call_premium   ?? null,
            put_premium:  canon?.put_premium    ?? null,
            net_premium:  canon?.net_premium    ?? null,
            children:     sfSortItems(leaves, sortBy, t => sfSortRaw(t, sortBy)),
          };
        });
        // Sort sector groups by sortBy using their canonical metrics
        const sortedGroups = sfSortItems(rawGroups, sortBy, g => sfSortRaw({
          put_call_ratio: g.pcr, call_premium: g.call_premium,
          put_premium: g.put_premium, net_premium: g.net_premium,
        }, sortBy));
        // Build sort-aware score map for tile sizing within each group
        const allGroupLeaves = sortedGroups.flatMap(g => g.children);
        const groupScoreMap = sfBuildSortedScore(
          allGroupLeaves, sortBy,
          t => (t.call_premium ?? 0) + (t.put_premium ?? 0),
          t => t.put_call_ratio,
          t => sfSortRaw(t, sortBy),
        );
        return (
          <SFGroupedHeatmap
            groups={sortedGroups}
            getGross={(t: SFTheme) => (t.call_premium ?? 0) + (t.put_premium ?? 0)}
            getPcr={(t: SFTheme) => t.put_call_ratio}
            getItemScore={(t: SFTheme) => groupScoreMap.get(t) ?? 0.04}
            onClick={(t: SFTheme) => setActiveTheme(t)}
            renderTile={sfRenderTheme}
            renderTooltip={sfTooltipTheme}
            keyOf={(t: SFTheme, i) => t.theme_id ?? t.theme_name ?? String(i)}
          />
        );
      })()}

      {/* ══ THEMES — ticker drill ══ */}
      {view === "themes" && level === "tickers" && activeTheme && (() => {
        const tks  = activeTheme.tickers;
        const wd   = tks.filter(tk => tk.net_premium != null).length;
        const pend = tks.filter(tk => (tk.scan_status || "").toLowerCase() === "pending").length;
        const { sorted, valueOf } = sfScoredWithSort(tks, sortBy, tk => (tk.call_premium ?? 0) + (tk.put_premium ?? 0), tk => (sfIsNoOptions(tk) || (tk.scan_status||"").toLowerCase() === "pending") ? null : tk.put_call_ratio, tk => sfSortRaw(tk, sortBy));
        return (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flexShrink: 0, display: "flex", gap: 10, marginBottom: 6, fontSize: 10, fontFamily: font, color: C.dim, alignItems: "center", flexWrap: "wrap" }}>
              <span>{wd} / {tks.length} with flow</span>
              {pend > 0 && <span style={{ color: C.yellow }}>· {pend} pending</span>}
              {activeTheme.classification && <span style={{ opacity: 0.5 }}>· {activeTheme.classification}</span>}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <SFHeatmap
                items={sorted}
                valueOf={valueOf}
                getPcr={tk => (sfIsNoOptions(tk) || (tk.scan_status || "").toLowerCase() === "pending") ? null : tk.put_call_ratio}
                noData={tk => sfIsNoOptions(tk)}
                onClick={tk => setSelectedTicker(tk)}
                renderTile={sfRenderTicker}
                renderTooltip={sfTooltipTicker}
                keyOf={(tk, i) => `${tk.symbol || tk.ticker || "tk"}-${i}`}
              />
            </div>
          </div>
        );
      })()}

      {/* ══ ALL STOCKS — ungrouped: fills panel, zoom for small tiles ══ */}
      {view === "allstocks" && !grouped && (() => {
        const { sorted, valueOf } = sfScoredWithSort(allTickers, sortBy, tk => (tk.call_premium ?? 0) + (tk.put_premium ?? 0), tk => (sfIsNoOptions(tk) || (tk.scan_status||"").toLowerCase() === "pending") ? null : tk.put_call_ratio, tk => sfSortRaw(tk, sortBy));
        return (
          <SFHeatmap
            items={sorted}
            valueOf={valueOf}
            getPcr={tk => (sfIsNoOptions(tk) || (tk.scan_status || "").toLowerCase() === "pending") ? null : tk.put_call_ratio}
            noData={tk => sfIsNoOptions(tk)}
            onClick={tk => setSelectedTicker(tk)}
            renderTile={sfRenderTicker}
            renderTooltip={sfTooltipTicker}
            keyOf={(tk, i) => `${tk.symbol || tk.ticker || "tk"}-${i}`}
          />
        );
      })()}

      {/* ══ ALL STOCKS — grouped by theme: TradingView-style hierarchical treemap ══ */}
      {view === "allstocks" && grouped && (() => {
        // Sort theme groups by sortBy, and children within each group by sortBy
        const rawThemes = (data?.themes ?? [])
          .filter(th => (th.classification ?? "").toLowerCase() !== "sector")
          .filter(th => (th.tickers ?? []).some(tk => tk.instrument_type === "stock"));
        const sortedThemeArr = sfSortItems(rawThemes, sortBy, th => sfSortRaw(th, sortBy));
        const themeGroups: SFGroupDef<SFTicker>[] = sortedThemeArr.map(theme => {
          // Strict: stock children only — no ETFs in All Stocks grouped view
          const stockChildren = sfSortItems(
            (theme.tickers ?? []).filter(tk => tk.instrument_type === "stock"),
            sortBy, tk => sfSortRaw(tk, sortBy),
          );
          return {
            key:          theme.theme_id ?? theme.theme_name,
            name:         theme.theme_name,
            pcr:          theme.put_call_ratio,
            call_premium: theme.call_premium ?? null,
            put_premium:  theme.put_premium  ?? null,
            net_premium:  theme.net_premium  ?? null,
            children:     stockChildren,
          };
        });
        // Build sort-aware score map for tile sizing (same object refs as children arrays above)
        const allGroupTickers = themeGroups.flatMap(g => g.children);
        const groupScoreMap = sfBuildSortedScore(
          allGroupTickers, sortBy,
          tk => (tk.call_premium ?? 0) + (tk.put_premium ?? 0),
          tk => (sfIsNoOptions(tk) || (tk.scan_status || "").toLowerCase() === "pending") ? null : tk.put_call_ratio,
          tk => sfSortRaw(tk, sortBy),
        );
        return (
          <SFGroupedHeatmap
            groups={themeGroups}
            getGross={(tk: SFTicker) => (tk.call_premium ?? 0) + (tk.put_premium ?? 0)}
            getPcr={(tk: SFTicker) => (sfIsNoOptions(tk) || (tk.scan_status || "").toLowerCase() === "pending") ? null : tk.put_call_ratio}
            getItemScore={(tk: SFTicker) => groupScoreMap.get(tk) ?? 0.04}
            noData={(tk: SFTicker) => sfIsNoOptions(tk)}
            onClick={(tk: SFTicker) => setSelectedTicker(tk)}
            renderTile={sfRenderTicker}
            renderTooltip={sfTooltipTicker}
            keyOf={(tk: SFTicker, i) => `${tk.symbol || tk.ticker || "tk"}-${i}`}
          />
        );
      })()}

      {/* ══ ETFs — ungrouped ══ */}
      {view === "etfs" && !grouped && (() => {
        const { sorted, valueOf } = sfScoredWithSort(allEtfs, sortBy, tk => (tk.call_premium ?? 0) + (tk.put_premium ?? 0), tk => sfIsNfPending(tk) ? null : sfNfPcr(tk), tk => sfSortRaw(tk, sortBy));
        return (
          <SFHeatmap
            items={sorted}
            valueOf={valueOf}
            getPcr={tk => sfIsNfPending(tk) ? null : sfNfPcr(tk)}
            noData={tk => sfIsNoOptions(tk)}
            onClick={tk => setSelectedTicker(tk)}
            renderTile={sfRenderEtf}
            renderTooltip={sfTooltipEtf}
            keyOf={(tk, i) => `${tk.symbol || tk.ticker || "etf"}-${i}`}
          />
        );
      })()}

      {/* ══ ETFs — grouped by theme ══ */}
      {view === "etfs" && grouped && (() => {
        // Build per-theme groups of ETF tickers only; group P/C = etf_breadth_pcr
        const rawThemes = (data?.themes ?? [])
          .filter(th => (th.classification ?? "").toLowerCase() !== "sector")
          .filter(th => (th.tickers ?? []).some(tk => tk.instrument_type === "etf"));
        const sortedThemeArr = sfSortItems(rawThemes, sortBy, th => sfSortRaw(th, sortBy));
        const etfGroups: SFGroupDef<SFTicker>[] = sortedThemeArr.map(theme => {
          const etfChildren = (theme.tickers ?? []).filter(tk => tk.instrument_type === "etf");
          // Map each ETF child to use effective_premium_pcr as put_call_ratio for sort/sizing
          const mappedChildren = sfSortItems(
            etfChildren.map(tk => {
              const nfPcr = sfNfPcr(tk);
              return { ...tk, put_call_ratio: nfPcr ?? tk.put_call_ratio };
            }),
            sortBy, tk => sfSortRaw(tk, sortBy),
          );
          return {
            key:          theme.theme_id ?? theme.theme_name,
            name:         theme.theme_name,
            pcr:          theme.etf_breadth_pcr ?? theme.put_call_ratio,
            call_premium: theme.call_premium ?? null,
            put_premium:  theme.put_premium  ?? null,
            net_premium:  theme.net_premium  ?? null,
            children:     mappedChildren,
          };
        });
        const allGroupEtfs = etfGroups.flatMap(g => g.children);
        const groupScoreMap = sfBuildSortedScore(
          allGroupEtfs, sortBy,
          tk => (tk.call_premium ?? 0) + (tk.put_premium ?? 0),
          tk => sfIsNfPending(tk) ? null : sfNfPcr(tk),
          tk => sfSortRaw(tk, sortBy),
        );
        return (
          <SFGroupedHeatmap
            groups={etfGroups}
            getGross={(tk: SFTicker) => (tk.call_premium ?? 0) + (tk.put_premium ?? 0)}
            getPcr={(tk: SFTicker) => sfIsNfPending(tk) ? null : sfNfPcr(tk)}
            getItemScore={(tk: SFTicker) => groupScoreMap.get(tk) ?? 0.04}
            noData={(tk: SFTicker) => sfIsNoOptions(tk)}
            onClick={(tk: SFTicker) => setSelectedTicker(tk)}
            renderTile={sfRenderEtf}
            renderTooltip={sfTooltipEtf}
            keyOf={(tk: SFTicker, i) => `${tk.symbol || tk.ticker || "etf"}-${i}`}
          />
        );
      })()}

    </div>{/* end treemap section */}
    </div>{/* end outer flex column */}

    {selectedTicker && (
      <SFTickerModal ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
    )}
    </>
  );
}

// ─── Main Options Flow page (master screener — single /api/options/screener fetch) ──
export default function OptionsPage() {
  const { C: _C } = useTheme(); C = _C;
  // ── Thematic context (global macro strip) ─────────────────────────────────
  const [thematicContext, setThematicContext] = useState<RegimeContextData | null>(null);
  useEffect(() => {
    fetch('/api/thematic-context/snapshot', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.snapshot) setThematicContext(d.snapshot); })
      .catch(() => null);
  }, []);

  // ── Screener data (single fetch, all categories merged by backend) ────────
  const [screenerData, setScreenerData] = useState<any>(null);
  const [pageLoading, setPageLoading]   = useState(true);
  const [showGuide, setShowGuide]       = useState(false);

  // ── Page context for chatbot ──────────────────────────────────────────────
  useSetPageContext((() => {
    const parts = ['[Page: Options Flow — Unusual Options Activity]'];
    const resp = screenerData?.response ?? screenerData;
    const tickers: TickerResult[] = Array.isArray(resp?.tickers) ? resp.tickers : [];
    if (tickers.length) {
      const top = tickers.slice(0,15).map((t:any)=>`${t.ticker||t.symbol}${t.score!=null?`(score:${Math.round(t.score)})`:''}`.trim()).filter(Boolean);
      parts.push(`Top options flow tickers (${tickers.length} total): ${top.join(', ')}`);
      const calls = tickers.filter((t:any)=>(t.call_put_ratio||1)>1.2).slice(0,5).map((t:any)=>t.ticker||t.symbol).filter(Boolean);
      const puts  = tickers.filter((t:any)=>(t.call_put_ratio||1)<0.8).slice(0,5).map((t:any)=>t.ticker||t.symbol).filter(Boolean);
      if (calls.length) parts.push(`Bullish flow: ${calls.join(', ')}`);
      if (puts.length)  parts.push(`Bearish flow: ${puts.join(', ')}`);
    }
    parts.push('Use for unusual options activity analysis, smart money positioning, gamma exposure, and options-driven price targets.');
    return parts.join('\n');
  })(), [screenerData]);
  useSetScreenContext((() => {
    const resp = screenerData?.response ?? screenerData;
    const tickers: any[] = Array.isArray(resp?.tickers) ? resp.tickers : [];
    return {
      route: '/app/options',
      page: 'options_flow',
      row_count: tickers.length,
      visible_rows: tickers.slice(0, 20).map((t: any) => {
        const contracts: any[] = (t.top_contracts?.length
          ? t.top_contracts
          : [...(t.top_calls ?? []), ...(t.top_puts ?? [])]
        ).slice(0, 4);
        return {
          ticker: t.ticker,
          score: t.composite_score != null ? Math.round(t.composite_score) : null,
          signal: t.primary_signal ?? null,
          price: t.underlying_price ?? null,
          pc_ratio: t.pc_ratio ?? null,
          heat: t.heat_score ?? null,
          top_contracts: contracts.map((c: any) => ({
            symbol: c.contract_symbol ?? c.symbol ?? null,
            side: (c.type ?? c.side ?? '').toLowerCase() || null,
            strike: c.strike ?? null,
            dte: c.dte ?? null,
            iv: c.iv ?? c.implied_volatility ?? null,
            delta: c.delta ?? c.greeks?.delta ?? null,
            oi: c.open_interest ?? c.openInterest ?? null,
            vol_oi: c.option_volume_to_oi_ratio ?? c.vol_oi_ratio ?? null,
            premium: c.premium ?? null,
            score: c.contract_score ?? null,
          })),
        };
      }),
      freshness: new Date().toISOString(),
    };
  })(), [screenerData]);

  const [topTab, setTopTab]           = useState<"sectors" | "screener">("sectors");
  const [netFlowSubTab, setNetFlowSubTab] = useState<"sectors" | "themes" | "etfs" | "allstocks">("sectors");
  const [pageRefreshing, setPageRefreshing] = useState(false);
  const [fetchError, setFetchError]     = useState("");
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchScreener = useCallback(async (background = false) => {
    if (background) {
      setPageRefreshing(true);
    } else {
      setPageLoading(true);
      setFetchError("");
    }
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 30_000);
      const res = await window.fetch(`${API_BASE}/screener`, { headers: authHeaders(), signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setScreenerData(json);
      setFetchError("");
    } catch (e: any) {
      if (!background) setFetchError(e.name === "AbortError" ? "Timed out loading screener" : (e.message || "Failed"));
    } finally {
      if (!background) setPageLoading(false);
      setPageRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchScreener(false);
    refreshTimerRef.current = setInterval(() => fetchScreener(true), 120_000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [fetchScreener]);

  // ── Chat ─────────────────────────────────────────────────────────────────
  const [selectedTicker, setSelectedTicker] = useState<TickerResult | null>(null);
  const [contractDetailSymbol, setContractDetailSymbol] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const askAgent = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const q = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const res = await window.fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ query: q, context_data: null, conversation_id: null }),
      });
      const json = await res.json();
      const text = json.analysis || json.response?.analysis || json.structured?.summary || json.answer || json.text || "No response.";
      setChatMessages(prev => [...prev, { role: "ai", text: String(text) }]);
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: "ai", text: `Error: ${e.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ background: C.bg, height: "100vh", overflow: "auto", fontFamily: sans, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Top-level tab toggle + Options Guide ── */}
      <div style={{ padding: "6px 16px", borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0, display: "flex", alignItems: "center", gap: 2 }}>
        {(["sectors", "screener"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTopTab(t)}
            style={{
              padding: "5px 18px", borderRadius: 6, fontSize: 11, fontFamily: font, fontWeight: 600,
              cursor: "pointer", border: "none",
              background: topTab === t ? `${C.blue}18` : "transparent",
              color: topTab === t ? C.blue : C.dim,
              borderBottom: topTab === t ? `2px solid ${C.blue}` : "2px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {t === "sectors" ? "Net Flow" : "Unusual Flow"}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => setShowGuide(true)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 10, fontFamily: font, cursor: "pointer", transition: "border-color 0.1s, color 0.1s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}
          >
            <BookOpen className="w-3 h-3" />
            Options Guide
          </button>
        </div>
      </div>

      {/* ── Net Flow tab: flex:1 so heatmap fills the viewport remainder ── */}
      {topTab === "sectors" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div style={{ padding: "3px 16px 0", borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0, display: "flex", gap: 1 }}>
            {(["sectors", "themes", "etfs", "allstocks"] as const).map(t => (
              <button
                key={t}
                onClick={() => setNetFlowSubTab(t)}
                style={{
                  padding: "4px 14px", fontSize: 10, fontFamily: font, fontWeight: 600,
                  cursor: "pointer", border: "none", background: "transparent",
                  color: netFlowSubTab === t ? C.blue : C.dim,
                  borderBottom: netFlowSubTab === t ? `2px solid ${C.blue}` : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {t === "sectors" ? "Sectors" : t === "themes" ? "Themes" : t === "etfs" ? "ETFs" : "Stocks"}
              </button>
            ))}
          </div>
          <SectorsFlowTab key={netFlowSubTab} view={netFlowSubTab} />
        </div>
      )}

      {/* ── Screener tab ── */}
      {topTab === "screener" && (
        <>
          {/* Page-level fetch error */}
          {fetchError && !pageLoading && (
            <div style={{ margin: "10px 16px 0", padding: "10px 14px", background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: C.red, fontSize: 11, fontFamily: font }}>⚠ {fetchError}</span>
              <button onClick={() => fetchScreener(false)} style={{ padding: "4px 12px", background: `${C.blue}14`, border: `1px solid ${C.blue}35`, borderRadius: 6, color: C.blue, fontSize: 11, fontFamily: font, cursor: "pointer" }}>Retry</button>
            </div>
          )}

          {/* Macro regime context strip */}
          {thematicContext && (
            <div style={{ padding: "8px 16px 0" }}>
              <RegimeContextStrip context={thematicContext} />
            </div>
          )}

          {/* Ticker lookup — search any ticker's options signal */}
          <div style={{ padding: "10px 16px 0" }}>
            <TickerLookupBar />
          </div>

          {/* Master screener — /api/options/screener, client-side filter + sort */}
          <MasterScreener
            screenerData={screenerData}
            pageLoading={pageLoading}
            pageRefreshing={pageRefreshing}
            onRefresh={() => fetchScreener(true)}
            onTickerSelect={setSelectedTicker}
          />

          {/* Bottom AI chat */}
          <div style={{ borderTop: `1px solid ${C.border}`, background: C.card, padding: "10px 20px 14px", flexShrink: 0, marginTop: 14 }}>
            {chatMessages.length > 0 && (
              <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "82%", padding: "8px 12px", borderRadius: 8, fontSize: 12, fontFamily: sans, lineHeight: 1.6, background: m.role === "user" ? `${C.blue}18` : C.cardAlt, color: m.role === "user" ? C.blue : C.text, border: `1px solid ${m.role === "user" ? `${C.blue}30` : C.border}` }}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.dim, fontSize: 11, fontFamily: font }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> Analyzing…
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); askAgent(); } }}
                placeholder="Ask about signal rank, thesis, flow drivers, or any ticker across all scans…"
                disabled={chatLoading}
                style={{ flex: 1, background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 14px", color: C.bright, fontSize: 12, fontFamily: sans, outline: "none" }}
              />
              <button
                onClick={askAgent}
                disabled={chatLoading || !chatInput.trim()}
                style={{ padding: "9px 14px", background: chatLoading || !chatInput.trim() ? `${C.dim}18` : `${C.blue}20`, border: `1px solid ${chatLoading || !chatInput.trim() ? C.border : `${C.blue}40`}`, borderRadius: 8, color: chatLoading || !chatInput.trim() ? C.dim : C.blue, cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}
              >
                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Ticker detail modal */}
      {selectedTicker && (
        <TickerDetailModal ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}

      {/* Contract detail modal (for inline contract drill-down) */}
      {contractDetailSymbol && (
        <ContractDetailModal occSymbol={contractDetailSymbol} onClose={() => setContractDetailSymbol(null)} />
      )}

      {showGuide && (
        <OptionsGuideModal onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}
