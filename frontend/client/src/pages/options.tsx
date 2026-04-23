import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";
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

const API_BASE = "/api/options";

function getToken(): string | null {
  return localStorage.getItem("caelyn_token") || sessionStorage.getItem("caelyn_token");
}
function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) h["Authorization"] = `Bearer ${t}`;
  return h;
}

const C = {
  bg: "#050510",
  card: "#08080f",
  cardAlt: "#0c0c1a",
  border: "#1a1a30",
  bright: "#e2e8f0",
  text: "#94a3b8",
  dim: "#475569",
  blue: "#38bdf8",
  green: "#4ade80",
  red: "#ef4444",
  yellow: "#fbbf24",
  orange: "#f97316",
  purple: "#a855f7",
  gold: "#f59e0b",
};
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
  const [technicals, setTechnicals] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [volumeSummary, setVolumeSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/technicals/${encodeURIComponent(symbol)}`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/history/${encodeURIComponent(symbol)}?limit=60`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/volume-summary/${encodeURIComponent(symbol)}?days=30`, { headers: authHeaders() }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([tech, hist, vol]) => {
      if (cancelled) return;
      setTechnicals(tech);
      setHistory(Array.isArray(hist?.bars || hist) ? (hist?.bars || hist) : []);
      setVolumeSummary(vol);
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

// ─── Master Screener — single endpoint, client-side filter + sort ──────────
type FilterChip = "all" | "etf" | "stock" | "megacap" | "large" | "small";
type SortField  = "score" | "symbol" | "move" | "vol" | "oi" | "pc" | "confidence" | "ivskew";

const FILTER_CHIPS: Array<{ key: FilterChip; label: string }> = [
  { key: "all",     label: "All" },
  { key: "etf",     label: "ETFs" },
  { key: "stock",   label: "Stocks" },
  { key: "megacap", label: "Megacap" },
  { key: "large",   label: "Large Cap" },
  { key: "small",   label: "Small Cap" },
];

const confColor = (c?: string | null) => {
  const s = (c || "").toLowerCase();
  if (s === "high")   return C.green;
  if (s === "medium") return C.yellow;
  if (s === "low")    return C.red;
  return C.dim;
};

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

  // Apply filter chip — uses asset_type and market_cap_bucket from screener payload
  const filtered = useMemo(() => {
    if (filter === "all") return rawTickers;
    return rawTickers.filter(t => {
      const at  = (t.asset_type        || "stock").toLowerCase();
      const cap = (t.market_cap_bucket || "").toLowerCase();
      if (filter === "etf")     return at === "etf";
      if (filter === "stock")   return at !== "etf";
      if (filter === "megacap") return cap === "megacap";
      if (filter === "large")   return cap === "large" || cap === "large_cap";
      if (filter === "small")   return cap === "small" || cap === "small_cap";
      return true;
    });
  }, [rawTickers, filter]);

  // Apply sort
  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case "score":      return dir * ((normalizeScore(b.composite_score) ?? -1) - (normalizeScore(a.composite_score) ?? -1));
        case "symbol":     return dir * a.ticker.localeCompare(b.ticker);
        case "move":       return dir * ((safeNum(b.price_change_pct) ?? 0) - (safeNum(a.price_change_pct) ?? 0));
        case "vol":        return dir * ((b.total_volume ?? 0) - (a.total_volume ?? 0));
        case "oi":         return dir * ((b.total_oi ?? 0) - (a.total_oi ?? 0));
        case "pc":         return dir * ((b.pc_ratio ?? 0) - (a.pc_ratio ?? 0));
        case "confidence": return dir * ((b.confidence_score ?? 0) - (a.confidence_score ?? 0));
        case "ivskew":     return dir * ((safeNum(b.iv_skew) ?? 0) - (safeNum(a.iv_skew) ?? 0));
        default:           return 0;
      }
    });
  }, [filtered, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const ColHdr = ({ field, label }: { field: SortField; label: string }) => (
    <span
      onClick={() => toggleSort(field)}
      style={{
        cursor: "pointer",
        color: sortField === field ? C.blue : C.dim,
        fontSize: 9, fontFamily: font,
        textTransform: "uppercase" as const,
        letterSpacing: "0.06em",
        userSelect: "none" as const,
        display: "inline-flex", alignItems: "center", gap: 2,
      }}
    >
      {label}{sortField === field ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
    </span>
  );

  const StatusEl = () => {
    if (pageLoading && !hasData) return null;
    const dot = (color: string, anim = false) => (
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block", ...(anim ? { animation: "pulse 1.4s ease-in-out infinite" } : {}) }} />
    );
    if (overallState === "live_ok")
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.green, fontSize: 10, fontFamily: font }}>{dot(C.green)} live</span>;
    if (overallState === "refresh_in_progress")
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.blue, fontSize: 10, fontFamily: font }}>{dot(C.blue, true)} refreshing{nextRefresh != null ? ` · next in ${nextRefresh}s` : ""}</span>;
    if (overallState === "stale_but_available")
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.yellow, fontSize: 10, fontFamily: font }}>{dot(C.yellow, true)} stale{cacheAge != null ? ` · ${cacheAge}s old` : ""}</span>;
    if (overallState === "no_data_yet")
      return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.blue, fontSize: 10, fontFamily: font }}>{dot(C.blue, true)} scanning…</span>;
    return null;
  };

  // rank | ticker | score | signal+conf | move% | vol | OI | P/C | thesis
  const ROW_GRID = "24px 152px 82px 120px 65px 62px 62px 50px 1fr";

  if (pageLoading && !hasData) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 40 }}>
        <div style={{ width: 16, height: 16, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.blue}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <div style={{ color: C.dim, fontSize: 11, fontFamily: font }}>Loading master screener…</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>

      {/* ── Controls bar ── */}
      <div style={{ padding: "8px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0, background: C.bg }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {FILTER_CHIPS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "3px 11px", borderRadius: 999,
                border: `1px solid ${filter === f.key ? C.blue : C.border}`,
                background: filter === f.key ? `${C.blue}15` : "transparent",
                color: filter === f.key ? C.blue : C.dim,
                fontSize: 10, fontFamily: font, cursor: "pointer", transition: "all 0.12s",
              }}
            >{f.label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        {sorted.length > 0 && <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>{sorted.length} signals</span>}
        <StatusEl />
        <button
          onClick={onRefresh} disabled={pageLoading} title="Refresh"
          style={{ background: "none", border: "none", cursor: pageLoading ? "not-allowed" : "pointer", color: pageLoading ? C.border : C.dim, padding: 2, display: "flex", alignItems: "center" }}
        >
          <RefreshCw className={`w-3 h-3 ${pageRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── Stale / refresh notice ── */}
      {hasData && (isStale || pageRefreshing || refreshInProgress) && (
        <div style={{ padding: "5px 16px", background: `${C.yellow}08`, borderBottom: `1px solid ${C.yellow}15`, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.yellow, display: "inline-block", animation: "pulse 1.4s ease-in-out infinite" }} />
          <span style={{ color: C.yellow, fontSize: 10, fontFamily: font }}>
            {refreshInProgress || pageRefreshing ? "Refresh in progress — showing last snapshot" : `Stale snapshot${cacheAge != null ? ` · ${cacheAge}s old` : ""}`}
          </span>
        </div>
      )}

      {/* ── Column headers ── */}
      <div style={{ display: "grid", gridTemplateColumns: ROW_GRID, gap: 0, padding: "5px 16px", borderBottom: `1px solid ${C.border}`, background: C.cardAlt, flexShrink: 0 }}>
        <span style={{ color: C.dim, fontSize: 9, fontFamily: font }}>#</span>
        <ColHdr field="symbol"     label="Ticker" />
        <ColHdr field="score"      label="Score" />
        <ColHdr field="confidence" label="Signal / Conf" />
        <ColHdr field="move"       label="Move %" />
        <ColHdr field="vol"        label="Vol" />
        <ColHdr field="oi"         label="OI" />
        <ColHdr field="pc"         label="P/C" />
        <span style={{ color: C.dim, fontSize: 9, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.06em" }}>Thesis</span>
      </div>

      {/* ── Rows ── */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

        {!hasData && overallState === "no_data_yet" && (
          <div style={{ padding: "52px 20px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 8, color: C.blue, fontSize: 12, fontFamily: font }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.blue, display: "inline-block", animation: "pulse 1.4s ease-in-out infinite" }} />
              Warming scanner…
            </div>
            <div style={{ color: C.dim, fontSize: 11 }}>First results are building — will appear automatically</div>
          </div>
        )}
        {!hasData && overallState === "true_zero_results" && (
          <div style={{ padding: "52px 20px", textAlign: "center", color: C.dim, fontSize: 12 }}>
            Scan complete — no unusual options signals above threshold
          </div>
        )}
        {hasData && sorted.length === 0 && (
          <div style={{ padding: "36px 20px", textAlign: "center", color: C.dim, fontSize: 11 }}>
            No signals match the current filter
          </div>
        )}

        {sorted.map((t, i) => {
          const score   = normalizeScore(t.composite_score);
          const sigClr  = getSignalColor(t.primary_signal);
          const confClr = confColor(t.confidence);
          const pchg    = safeNum(t.price_change_pct);
          const pchgPct = pchg != null ? (Math.abs(pchg) <= 1 ? pchg * 100 : pchg) : null;
          const assetLbl = (t.asset_type || "").toUpperCase();
          const capLbl   = t.market_cap_bucket || "";
          // Thesis: prefer explicit thesis string, fall back to context summary
          const thesisArr = Array.isArray(t.thesis) ? t.thesis : (t.thesis ? [t.thesis] : []);
          const thesisText = (thesisArr[0] || t.stock_context_summary || t.options_context_summary || "").slice(0, 140);
          return (
            <div
              key={t.ticker}
              onClick={() => onTickerSelect(t)}
              style={{
                display: "grid", gridTemplateColumns: ROW_GRID, gap: 0,
                padding: "9px 16px", borderBottom: `1px solid ${C.border}`,
                cursor: "pointer", alignItems: "center", transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = `${C.blue}07`)}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              {/* Rank */}
              <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>{i + 1}</span>

              {/* Ticker + price + badges */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ color: C.bright, fontFamily: font, fontWeight: 800, fontSize: 12 }}>{t.ticker}</span>
                  {t.underlying_price != null && (
                    <span style={{ color: C.dim, fontFamily: font, fontSize: 10 }}>{fmtMoney(t.underlying_price)}</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 2, flexWrap: "wrap" }}>
                  {assetLbl && <Badge color={C.dim} sm>{assetLbl}</Badge>}
                  {capLbl && assetLbl !== "ETF" && <Badge color={C.dim} sm>{capLbl}</Badge>}
                </div>
              </div>

              {/* Score bar + number */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {score != null ? (
                  <>
                    <div style={{ width: 32, height: 3, background: C.border, borderRadius: 999, flexShrink: 0 }}>
                      <div style={{ width: `${score}%`, height: "100%", background: scoreColor(score), borderRadius: 999 }} />
                    </div>
                    <span style={{ color: scoreColor(score), fontSize: 11, fontFamily: font, fontWeight: 700 }}>{fmtNum(score, 0)}</span>
                  </>
                ) : <span style={{ color: C.dim, fontSize: 10 }}>—</span>}
              </div>

              {/* Signal + confidence badge stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {t.primary_signal
                  ? <Badge color={sigClr}>{t.primary_signal}</Badge>
                  : <span style={{ color: C.dim, fontSize: 10, fontFamily: font }}>—</span>
                }
                {t.confidence && (
                  <span style={{ color: confClr, fontSize: 9, fontFamily: font, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {t.confidence} conf
                  </span>
                )}
              </div>

              {/* Move % */}
              <span style={{ color: pchgPct == null ? C.dim : pchgPct >= 0 ? C.green : C.red, fontFamily: font, fontSize: 11 }}>
                {pchgPct != null ? `${pchgPct >= 0 ? "+" : ""}${pchgPct.toFixed(1)}%` : "—"}
              </span>

              {/* Vol */}
              <span style={{ color: C.text, fontFamily: font, fontSize: 11 }}>
                {t.total_volume != null ? fmtVol(t.total_volume) : "—"}
              </span>

              {/* OI */}
              <span style={{ color: C.text, fontFamily: font, fontSize: 11 }}>
                {t.total_oi != null ? fmtVol(t.total_oi) : "—"}
              </span>

              {/* P/C */}
              <span style={{ color: t.pc_ratio != null ? pcColor(t.pc_ratio) : C.dim, fontFamily: font, fontSize: 11 }}>
                {t.pc_ratio != null ? fmtNum(t.pc_ratio, 2) : "—"}
              </span>

              {/* Thesis / context excerpt */}
              <span style={{ color: C.dim, fontSize: 10, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {thesisText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Options Flow page (master screener — single /api/options/screener fetch) ──
export default function OptionsPage() {
  // ── Screener data (single fetch, all categories merged by backend) ────────
  const [screenerData, setScreenerData] = useState<any>(null);
  const [pageLoading, setPageLoading]   = useState(true);
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
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: sans, display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes pulse  { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Page header */}
      <div style={{ padding: "13px 20px 11px", borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Zap className="w-5 h-5" style={{ color: C.green }} />
          <span style={{ color: C.bright, fontSize: 17, fontWeight: 800, fontFamily: font, letterSpacing: "-0.02em" }}>OPTIONS FLOW</span>
          <span style={{ color: C.dim, fontSize: 11, fontFamily: font }}>· unusual options flow · master screener</span>
          <div style={{ marginLeft: "auto" }}>
            <DataIngestionWidget />
          </div>
        </div>
      </div>

      {/* Page-level fetch error */}
      {fetchError && !pageLoading && (
        <div style={{ margin: "10px 16px 0", padding: "10px 14px", background: `${C.red}10`, border: `1px solid ${C.red}25`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: C.red, fontSize: 11, fontFamily: font }}>⚠ {fetchError}</span>
          <button onClick={() => fetchScreener(false)} style={{ padding: "4px 12px", background: `${C.blue}14`, border: `1px solid ${C.blue}35`, borderRadius: 6, color: C.blue, fontSize: 11, fontFamily: font, cursor: "pointer" }}>Retry</button>
        </div>
      )}

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

      {/* Ticker detail modal */}
      {selectedTicker && (
        <TickerDetailModal ticker={selectedTicker} onClose={() => setSelectedTicker(null)} />
      )}

      {/* Contract detail modal (for inline contract drill-down) */}
      {contractDetailSymbol && (
        <ContractDetailModal occSymbol={contractDetailSymbol} onClose={() => setContractDetailSymbol(null)} />
      )}
    </div>
  );
}
