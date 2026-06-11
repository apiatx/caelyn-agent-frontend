import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Copy, Check, Loader2, ArrowUpDown, ArrowUp, ArrowDown, BarChart2, X, Save, BookOpen, Trash2, ChevronDown, TrendingUp, TrendingDown, Lightbulb, RefreshCw } from "lucide-react";

// Tracks tab/theme/date combos already auto-saved this browser session — never resets across re-renders.
const dailyAutoSavedKeys = new Set<string>();

type TabKey = "thematic" | "social" | "bottlenecks" | "watchlist_portfolio" | "fundamentals";

const TAB_LABELS: Record<TabKey, string> = {
  thematic: "Thematic",
  social: "Social",
  bottlenecks: "Bottlenecks",
  watchlist_portfolio: "Watchlist + Portfolio",
  fundamentals: "Fundamentals",
};

// ── Column definitions ─────────────────────────────────────────────────────────
// Single unified column set used by ALL four tabs.

type ColDef = { key: string; label: string; numeric?: boolean; aliases?: string[]; tabs?: TabKey[]; tooltip?: string };

const ALL_COLUMNS: ColDef[] = [
  { key: "symbol",                 label: "Symbol",       aliases: ["ticker", "stock"] },
  { key: "company_name",           label: "Company",      aliases: ["companyName", "name", "company"] },
  { key: "sector",                 label: "Sector" },
  { key: "industry",               label: "Industry" },
  { key: "market_cap",             label: "Market Cap",   numeric: true,  aliases: ["marketCap", "mcap"] },
  { key: "price",                  label: "Price",        numeric: true,  aliases: ["last", "lastPrice"] },
  { key: "change_1d",              label: "1D %",         numeric: true,  aliases: ["change_percent_1d", "changePercent1d", "oneDayChange", "pct_1d", "change_pct_1d", "day_change_pct", "1D", "1d"] },
  { key: "change_7d",              label: "7D %",         numeric: true,  tabs: ["social", "fundamentals"], aliases: ["7d", "7D", "5D", "5d", "price_change_7d", "change_5d", "week_change", "fiveday"] },
  { key: "change_30d",             label: "30D %",        numeric: true,  tabs: ["social", "fundamentals"], aliases: ["30d", "30D", "1M", "1m", "price_change_30d", "change_1m", "month_change"] },
  { key: "change_ytd",             label: "YTD %",        numeric: true,  tabs: ["social", "fundamentals"], aliases: ["ytd", "YTD", "price_change_ytd", "ytd_change", "ytdchange"] },
  { key: "change_1y",              label: "1Y %",         numeric: true,  tabs: ["social", "fundamentals"], aliases: ["1y", "1Y", "price_change_1y", "year_change", "change_1year", "oneYearChange"] },
  { key: "volume",                 label: "Options Volume", numeric: true,  aliases: ["vol"] },
  { key: "dollar_volume",          label: "$ Volume",     numeric: true,  aliases: ["dollarVolume", "dv"] },
  { key: "volume_to_market_cap",   label: "Vol/MCap",     numeric: true,  aliases: ["volumeToMarketCap", "vol_to_mcap"],     tooltip: "Trading volume divided by market cap. Higher values can signal unusual activity relative to company size." },
  { key: "volume_surge",           label: "Vol Surge",    numeric: true,  aliases: ["vol_surge", "volSurge"],                tooltip: "Current volume versus recent average volume. Example: 3.0x means roughly 3 times normal volume." },
  { key: "accumulation",           label: "Accum",                        aliases: ["accum"],                                tooltip: "Accumulation signal from cached price/volume behavior. A check means the stock is showing accumulation-like behavior." },
  { key: "beta",                   label: "Beta",         numeric: true, tooltip: "Measures how volatile the stock is relative to the market. Beta above 1 means more volatile than the market; below 1 means less volatile." },
  { key: "options_oi",             label: "OI Contracts", numeric: true,  aliases: ["optionsOi", "options_open_interest", "previous_options_oi", "previousOptionsOi"], tooltip: "Open interest contracts from cached Tradier options data. Higher OI means more outstanding option contracts for this ticker." },
  { key: "options_oi_change",      label: "OI Chg",       numeric: true,  aliases: ["optionsOiChange", "oi_change", "options_oi_change_pct", "optionsOiChangePct"],     tooltip: "Percent change in open interest versus the previous cached options snapshot." },
  { key: "options_activity_score", label: "Opt Activity", numeric: true,  aliases: ["optionsActivityScore", "options_activity", "options_activity"],                   tooltip: "Internal options activity score based on cached options signals like open interest, change, and volume where available." },
  { key: "role",                   label: "Role",                         aliases: ["supply_chain_role", "supplyChainRole"], tooltip: "Why the ticker appears in this screen, such as hidden gem, supply chain player, options confirmed, or social confirmed." },
  { key: "score",                  label: "Score",        numeric: true,  aliases: ["hidden_gem_score", "hiddenGemScore"],   tooltip: "Composite screener score for the selected tab. Higher is better within this screen." },
  { key: "exchange",               label: "Exchange" },
  // Fundamentals-only columns
  { key: "pe_ratio",        label: "P/E",        numeric: true, tabs: ["fundamentals"], aliases: ["pe", "priceEarnings", "price_to_earnings", "priceToEarningsRatio", "pe_ttm"] },
  { key: "eps",             label: "EPS",        numeric: true, tabs: ["fundamentals"], aliases: ["eps_ttm", "earningsPerShare", "eps_diluted"] },
  { key: "revenue",         label: "Revenue",    numeric: true, tabs: ["fundamentals"], aliases: ["revenue_ttm", "total_revenue", "totalRevenue", "annualRevenue"] },
  { key: "gross_margin",    label: "Gross Mgn",  numeric: true, tabs: ["fundamentals"], aliases: ["grossMargin", "gross_profit_margin", "grossProfitMargin"] },
  { key: "net_margin",      label: "Net Mgn",    numeric: true, tabs: ["fundamentals"], aliases: ["netProfitMargin", "profit_margin", "netMargin", "profitMargin", "net_profit_margin"] },
  { key: "roe",             label: "ROE",        numeric: true, tabs: ["fundamentals"], aliases: ["returnOnEquity", "return_on_equity", "roeTTM"] },
  { key: "debt_to_equity",  label: "D/E",        numeric: true, tabs: ["fundamentals"], aliases: ["debtToEquity", "de_ratio", "debtEquityRatio", "totalDebtToEquity"] },
  { key: "revenue_growth",  label: "Rev Grwth",  numeric: true, tabs: ["fundamentals"], aliases: ["revenueGrowth", "revenue_growth_yoy", "revenue_growth_rate", "revenueGrowthYoy"] },
];

// Signal toggles — identical set for every tab; gate the three optional columns.
const SIGNALS = [
  { key: "volume_surge",     label: "Vol Surge",        col: "volume_surge" },
  { key: "accumulation",    label: "Accumulation",     col: "accumulation" },
  { key: "options_activity", label: "Options Activity", col: "options_activity_score" },
] as const;
type SignalKey = (typeof SIGNALS)[number]["key"];

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface ThemeOption {
  id: string;
  label: string;
  rs_score?: number;
  momentum_rank?: number;
  state?: string;
  state_reason?: string;
  stage?: string;
  stage_label?: string;
  return_pct?: number;
  breadth_pct?: number;
  trend_accel_20d?: number;
  snapshot_row_count?: number;
}
interface RowData { [k: string]: any; }
interface HubResponse {
  status?: string; tab?: string; theme?: string;
  generated_at?: string; served_at?: string; universe_built_at?: string;
  universe_age_hours?: number; universe_db_source?: string;
  universe_expires_at?: string; next_rebuild_at?: string;
  filters_applied?: Record<string, any>;
  rows_before_filters?: number; rows_after_filters?: number;
  quote_cache_status?: string; quote_refresh_mode?: string; quote_refresh_started?: boolean;
  fundamentals_cache_status?: string;
  low_metadata_coverage?: boolean; metadata_coverage_warning?: string;
  fund_coverage_pct?: number; eligible_fund_coverage_pct?: number;
  message?: string; error_code?: string; theme_state?: string; theme_state_reason?: string;
  rows?: any; data?: any; items?: any; results?: any;
}

interface SavedScreen {
  id: string;
  name: string;
  created_at: string;
  tab?: string;
  theme_key?: string;
  theme_label?: string;
  row_count?: number;
  top_symbols?: string[];
}
interface SavedScreenDetail extends SavedScreen {
  rows: RowData[];
  metadata?: Record<string, any>;
  filters?: Record<string, any>;
}
interface InsightsData {
  recurring_tickers?:      Array<{ symbol: string; count?: number }>;
  week_over_week_tickers?: Array<{ symbol: string }>;
  newly_appearing_tickers?: Array<{ symbol: string; first_seen?: string }>;
  biggest_gainers?:        Array<{ symbol: string; gain_pct?: number; price_change_pct?: number }>;
  biggest_decliners?:      Array<{ symbol: string; decline_pct?: number; price_change_pct?: number }>;
  recurring_themes?:       Array<{ theme: string; count?: number }>;
  emerging_themes?:        Array<{ theme: string }>;
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function pickArray(payload: any, keys: string[]): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const k of keys) {
    const v = payload?.[k];
    if (Array.isArray(v)) return v;
  }
  if (typeof payload === "object") {
    for (const k of Object.keys(payload)) {
      const v = (payload as any)[k];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function getField(row: RowData, primary: string, aliases: string[] = []): any {
  if (row == null) return undefined;
  if (row[primary] !== undefined && row[primary] !== null) return row[primary];
  for (const a of aliases) {
    if (row[a] !== undefined && row[a] !== null) return row[a];
  }
  const want = [primary, ...aliases].map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const k of Object.keys(row)) {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (want.includes(norm)) return row[k];
  }
  return undefined;
}

function classNames(...xs: Array<string | false | undefined | null>): string {
  return xs.filter(Boolean).join(" ");
}

async function fetchJson<T = any>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { credentials: "include", signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${url} failed: ${res.status} ${txt.slice(0, 120)}`);
  }
  return res.json();
}

async function fetchJsonAuth<T = any>(url: string, opts: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("caelyn_jwt") ?? sessionStorage.getItem("caelyn_jwt") ?? "";
  const authHdr: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, {
    credentials: "include",
    ...opts,
    headers: { "Content-Type": "application/json", ...authHdr, ...(opts.headers as Record<string, string> | undefined) },
  });
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) {
    throw new Error(`Saved screen endpoint returned HTML instead of JSON — the frontend proxy route may not be active yet. Try refreshing.`);
  }
  const txt = await res.text();
  if (txt.trimStart().startsWith("<!DOCTYPE") || txt.trimStart().startsWith("<html")) {
    throw new Error(`Saved screen endpoint returned an HTML page — check that the frontend proxy route is registered and the server was restarted.`);
  }
  if (!res.ok) {
    throw new Error(`${url} failed: ${res.status} ${txt.slice(0, 120)}`);
  }
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(`${url} returned non-JSON: ${txt.slice(0, 80)}`);
  }
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatCompactCurrency(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(abs >= 100e9 ? 1 : 2)}B`;
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(abs >= 100e6 ? 1 : 2)}M`;
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatCurrency(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  return `$${n.toFixed(2)}`;
}

function formatCompactNumber(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(abs >= 100e6 ? 1 : 2)}M`;
  if (abs >= 1e3)  return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

function formatChangePercent(v: any): { text: string; positive: boolean; negative: boolean } {
  const n = toNum(v);
  if (n === null) return { text: "—", positive: false, negative: false };
  // Backend sends percentage points directly (e.g. -1.35 = -1.35%). Do not multiply.
  const sign = n > 0 ? "+" : "";
  return { text: `${sign}${n.toFixed(2)}%`, positive: n > 0, negative: n < 0 };
}

function formatSmallPercent(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  const pct = Math.abs(n) < 1 ? n * 100 : n;
  return `${pct.toFixed(3)}%`;
}

function formatVolSurge(v: any): string {
  const n = toNum(v);
  if (n === null) return "—";
  return `${n.toFixed(1)}x`;
}

// ── TradingView chart modal ────────────────────────────────────────────────────

function TvChartModal({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const params = new URLSearchParams({
      locale: "en", width: "100%", height: "100%", interval: "D", range: "3M",
      style: "1", toolbar_bg: "%23070310", enable_publishing: "false",
      withdateranges: "true", hide_side_toolbar: "false", allow_symbol_change: "false",
      calendar: "false", theme: "dark", timezone: "exchange",
      hide_top_toolbar: "false", symbol,
    });
    iframe.src = `https://s.tradingview.com/embed-widget/advanced-chart/?${params.toString()}`;
  }, [symbol]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000, display: "flex",
        alignItems: "center", justifyContent: "center", padding: "24px",
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 1100, height: "min(680px, calc(100vh - 80px))",
          background: "#070310", borderRadius: 12,
          border: "1px solid rgba(168,85,247,0.35)",
          boxShadow: "0 8px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(168,85,247,0.15)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px", borderBottom: "1px solid rgba(168,85,247,0.2)", flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#e2d9f3", letterSpacing: "0.02em" }}>
            {symbol}
          </span>
          <button
            onClick={onClose}
            title="Close chart"
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, color: "rgba(255,255,255,0.7)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, padding: 0,
            }}
          >
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <iframe
            ref={iframeRef}
            title={`Chart ${symbol}`}
            style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
          />
        </div>
      </div>
    </div>
  );
}

// ── Market cap presets ─────────────────────────────────────────────────────────

type McapPreset = "all" | "under10b" | "50m_1b" | "1b_10b" | "over10b" | "custom";

const MCAP_PRESETS: { id: McapPreset; label: string; min?: number; max?: number }[] = [
  { id: "all",      label: "All cached" },
  { id: "under10b", label: "Under $10B",  max: 10_000_000_000 },
  { id: "50m_1b",   label: "$50M–$1B",    min: 50_000_000,    max: 1_000_000_000 },
  { id: "1b_10b",   label: "$1B–$10B",    min: 1_000_000_000, max: 10_000_000_000 },
  { id: "over10b",  label: "$10B+",       min: 10_000_000_000 },
  { id: "custom",   label: "Custom" },
];

function mcapBounds(preset: McapPreset, customMin: string, customMax: string) {
  if (preset === "all") return { min: null, max: null };
  if (preset === "custom") {
    const min = customMin !== "" ? Number(customMin) : null;
    const max = customMax !== "" ? Number(customMax) : null;
    return {
      min: min !== null && Number.isFinite(min) ? min : null,
      max: max !== null && Number.isFinite(max) ? max : null,
    };
  }
  const p = MCAP_PRESETS.find((x) => x.id === preset);
  return { min: p?.min ?? null, max: p?.max ?? null };
}

const LS_THEME_KEY = "screener-hub-theme";

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScreenerHub() {
  const [tab, setTab] = useState<TabKey>("thematic");

  // Themes + backend defaults
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [defaultThemeId, setDefaultThemeId] = useState<string>("");
  const [defaultThemeReason, setDefaultThemeReason] = useState<string>("");
  const [themeRsUpdatedAt, setThemeRsUpdatedAt] = useState<string>("");

  // ── Pending state — user edits freely; does NOT trigger fetches ───────────────
  const [pendingTheme, setPendingTheme] = useState<string>("");
  const [pendingScoreMode, setPendingScoreMode] = useState<boolean>(true);
  const [pendingMcapPreset, setPendingMcapPreset] = useState<McapPreset>("under10b");
  const [pendingMcapCustomMin, setPendingMcapCustomMin] = useState<string>("");
  const [pendingMcapCustomMax, setPendingMcapCustomMax] = useState<string>("");
  const [pendingMinVolume, setPendingMinVolume] = useState<string>("");
  const [pendingExchange, setPendingExchange] = useState<string>("");

  // ── Applied state — what the last Apply committed; drives buildUrl + fetch ────
  const [appliedTheme, setAppliedTheme] = useState<string>("");
  const [appliedScoreMode, setAppliedScoreMode] = useState<boolean>(true);
  const [appliedMcapPreset, setAppliedMcapPreset] = useState<McapPreset>("under10b");
  const [appliedMcapCustomMin, setAppliedMcapCustomMin] = useState<string>("");
  const [appliedMcapCustomMax, setAppliedMcapCustomMax] = useState<string>("");
  const [appliedMinVolume, setAppliedMinVolume] = useState<string>("");
  const [appliedExchange, setAppliedExchange] = useState<string>("");

  // Unified signal toggles — client-only column visibility, no refetch
  const [signals, setSignals] = useState<Record<SignalKey, boolean>>({
    volume_surge: true,
    accumulation: true,
    options_activity: true,
  });

  const [rows, setRows] = useState<RowData[]>([]);
  const [meta, setMeta] = useState<{
    generated_at?: string; served_at?: string; universe_built_at?: string;
    universe_age_hours?: number; universe_db_source?: string;
    next_rebuild_at?: string; rows_before_filters?: number; rows_after_filters?: number;
    quote_cache_status?: string; quote_refresh_mode?: string; quote_refresh_started?: boolean;
    fundamentals_cache_status?: string; message?: string; error_code?: string;
    low_metadata_coverage?: boolean; metadata_coverage_warning?: string;
    fund_coverage_pct?: number; eligible_fund_coverage_pct?: number;
  }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  // ── Saved Screens ─────────────────────────────────────────────────────────────
  const [savedMode, setSavedMode]               = useState(false);
  const [currentSavedId, setCurrentSavedId]     = useState<string | null>(null);
  const [savedRows, setSavedRows]               = useState<RowData[]>([]);
  const [savedScreenName, setSavedScreenName]   = useState("");
  const [savedScreenCreatedAt, setSavedScreenCreatedAt] = useState("");
  const [savedMetaObj, setSavedMetaObj]         = useState<Record<string, any>>({});
  // Save modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName]           = useState("");
  const [saving, setSaving]               = useState(false);
  const [saveError, setSaveError]         = useState<string | null>(null);
  // Saved list dropdown
  const [showSavedList, setShowSavedList]     = useState(false);
  const [savedList, setSavedList]             = useState<SavedScreen[]>([]);
  const [savedListLoading, setSavedListLoading] = useState(false);
  const savedListRef                          = useRef<HTMLDivElement>(null);
  // Insights
  const [showInsights, setShowInsights]   = useState(false);
  const [insightsData, setInsightsData]   = useState<InsightsData | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Prevents the initial auto-apply from running more than once
  const initialAppliedRef = useRef<boolean>(false);

  // Close saved list dropdown on outside click
  useEffect(() => {
    if (!showSavedList) return;
    const handler = (e: MouseEvent) => {
      if (savedListRef.current && !savedListRef.current.contains(e.target as Node))
        setShowSavedList(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSavedList]);

  // ── Load themes list ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson<any>("/api/screener-hub/themes");
        if (cancelled) return;

        // Support both legacy array response and new object response
        const arr: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.themes)
            ? data.themes
            : pickArray(data, ["themes", "items", "rows", "results", "data"]);

        const opts: ThemeOption[] = arr
          .map((t: any) => {
            if (typeof t === "string") return { id: t, label: t };
            const id    = t?.id ?? t?.slug ?? t?.value ?? t?.key ?? t?.name ?? t?.label;
            const label = t?.label ?? t?.name ?? t?.title ?? id;
            if (!id) return null;
            return {
              id: String(id), label: String(label ?? id),
              rs_score:           t?.rs_score,
              momentum_rank:      t?.momentum_rank,
              state:              t?.state,
              state_reason:       t?.state_reason,
              stage:              t?.stage,
              stage_label:        t?.stage_label,
              return_pct:         t?.return_pct,
              breadth_pct:        t?.breadth_pct,
              trend_accel_20d:    t?.trend_accel_20d,
              snapshot_row_count: t?.snapshot_row_count,
            };
          })
          .filter(Boolean) as ThemeOption[];

        // Sort by momentum_rank first, then rs_score descending
        opts.sort((a, b) => {
          if (a.momentum_rank != null && b.momentum_rank != null) return a.momentum_rank - b.momentum_rank;
          if (a.momentum_rank != null) return -1;
          if (b.momentum_rank != null) return  1;
          if (a.rs_score != null && b.rs_score != null) return b.rs_score - a.rs_score;
          return 0;
        });

        const backendDefault = typeof data?.default_theme === "string" ? data.default_theme : "";
        const backendReason  = typeof data?.default_theme_reason === "string" ? data.default_theme_reason : "";
        const rsUpdatedAt    = typeof data?.theme_rs_updated_at === "string" ? data.theme_rs_updated_at : "";

        setThemes(opts);
        if (backendDefault) setDefaultThemeId(backendDefault);
        if (backendReason)  setDefaultThemeReason(backendReason);
        if (rsUpdatedAt)    setThemeRsUpdatedAt(rsUpdatedAt);

        if (!initialAppliedRef.current && opts.length > 0) {
          // Default priority:
          // 1. URL ?theme= if present and valid
          // 2. localStorage last applied theme if still valid
          // 3. backend default_theme if valid
          // 4. first theme in list
          const isValid = (id: string) => !!opts.find((t) => t.id === id);
          const urlTheme = new URLSearchParams(window.location.search).get("theme") ?? "";
          const lsTheme  = localStorage.getItem(LS_THEME_KEY) ?? "";
          const chosenTheme =
            (urlTheme && isValid(urlTheme) ? urlTheme : null) ??
            (lsTheme  && isValid(lsTheme)  ? lsTheme  : null) ??
            (backendDefault && isValid(backendDefault) ? backendDefault : null) ??
            opts[0].id;

          setPendingTheme(chosenTheme);
          setAppliedTheme(chosenTheme);
          initialAppliedRef.current = true;
        }
      } catch (e) {
        if (!cancelled) console.warn("[ScreenerHub] themes load failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Build URL from applied state only ────────────────────────────────────────
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    params.set("scoreMode", appliedScoreMode ? "true" : "false");
    if (tab === "thematic") {
      if (appliedTheme) params.set("theme", appliedTheme);
      const { min, max } = mcapBounds(appliedMcapPreset, appliedMcapCustomMin, appliedMcapCustomMax);
      if (min != null) params.set("marketCapMin", String(min));
      if (max != null) params.set("marketCapMax", String(max));
      if (appliedMinVolume) params.set("minVolume", appliedMinVolume);
      if (appliedExchange)  params.set("exchange",  appliedExchange);
    }
    return `/api/screener-hub?${params.toString()}`;
  }, [tab, appliedTheme, appliedScoreMode, appliedMcapPreset, appliedMcapCustomMin, appliedMcapCustomMax, appliedMinVolume, appliedExchange]);

  // ── Fetch rows whenever applied state or tab changes ─────────────────────────
  // Uses AbortController to cancel in-flight requests cleanly.
  // setLoading(false) is only suppressed for aborted requests to avoid
  // clearing the loading state that the newer request set.
  useEffect(() => {
    if (savedMode) return;
    if (tab === "thematic" && !appliedTheme) return;
    const url = buildUrl();
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setRows([]);
    (async () => {
      try {
        const data = await fetchJson<HubResponse>(url, ctrl.signal);
        if (ctrl.signal.aborted) return;
        const arr = pickArray(data, ["rows", "data", "items", "results"]);
        setRows(arr);
        setMeta({
          generated_at:           data?.generated_at,
          served_at:              data?.served_at,
          universe_built_at:      data?.universe_built_at,
          universe_age_hours:     data?.universe_age_hours,
          universe_db_source:     data?.universe_db_source,
          next_rebuild_at:        data?.next_rebuild_at,
          rows_before_filters:    data?.rows_before_filters,
          rows_after_filters:     data?.rows_after_filters,
          quote_cache_status:     data?.quote_cache_status,
          quote_refresh_mode:     data?.quote_refresh_mode,
          quote_refresh_started:  data?.quote_refresh_started,
          fundamentals_cache_status:    data?.fundamentals_cache_status,
          low_metadata_coverage:         data?.low_metadata_coverage,
          metadata_coverage_warning:     data?.metadata_coverage_warning,
          fund_coverage_pct:             data?.fund_coverage_pct,
          eligible_fund_coverage_pct:    data?.eligible_fund_coverage_pct,
          message:                       data?.message ?? undefined,
          error_code:                    data?.error_code ?? undefined,
        });

        // ── Daily auto-save — default screen only, once per tab/theme/date per session ──
        // isDefaultScreen (useMemo) gates this: only fires when viewing the backend's
        // recommended daily theme with no custom filters applied.
        if (isDefaultScreen && arr.length > 0 && !ctrl.signal.aborted) {
          const today   = new Date().toISOString().slice(0, 10);
          const autoKey = `${tab}::${appliedTheme ?? ""}::${today}`;
          if (!dailyAutoSavedKeys.has(autoKey)) {
            dailyAutoSavedKeys.add(autoKey); // mark immediately — prevents spam even on failure
            const themeObj = themes.find((t) => t.id === appliedTheme);
            fetchJsonAuth("/api/screener-hub/saved-screens/daily-auto", {
              method: "POST",
              body: JSON.stringify({
                tab,
                theme_key:    appliedTheme || null,
                theme_label:  themeObj?.label ?? appliedTheme ?? null,
                score_mode:   appliedScoreMode,
                filters: {
                  mcap_preset:     appliedMcapPreset,
                  mcap_custom_min: appliedMcapCustomMin || null,
                  mcap_custom_max: appliedMcapCustomMax || null,
                  min_volume:      appliedMinVolume || null,
                  exchange:        appliedExchange  || null,
                },
                query_params: Object.fromEntries(
                  new URLSearchParams(url.split("?")[1] ?? "").entries()
                ),
                rows: arr,
                metadata: {
                  universe_built_at:          data?.universe_built_at,
                  served_at:                  data?.served_at,
                  universe_age_hours:         data?.universe_age_hours,
                  universe_db_source:         data?.universe_db_source,
                  quote_cache_status:         data?.quote_cache_status,
                  low_metadata_coverage:      data?.low_metadata_coverage,
                  metadata_coverage_warning:  data?.metadata_coverage_warning,
                  fund_coverage_pct:          data?.fund_coverage_pct,
                  eligible_fund_coverage_pct: data?.eligible_fund_coverage_pct,
                  rows_before_filters:        data?.rows_before_filters,
                  rows_after_filters:         data?.rows_after_filters,
                },
                snapshot_date: today,
              }),
            }).catch((e: any) => {
              console.warn("[ScreenerHub] daily auto-save failed (non-blocking):", e?.message);
            });
          }
        }
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        setError(e?.message ?? String(e));
        setRows([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => { ctrl.abort(); };
  }, [buildUrl, savedMode]);

  // ── Visible columns ───────────────────────────────────────────────────────────
  const visibleColumns = useMemo(() => {
    return ALL_COLUMNS.filter((c) => {
      if (c.tabs && !c.tabs.includes(tab)) return false;
      const sig = SIGNALS.find((s) => s.col === c.key);
      if (sig) return signals[sig.key];
      return true;
    });
  }, [signals, tab]);

  const activeRows = useMemo(
    () => (savedMode ? savedRows : rows),
    [savedMode, savedRows, rows],
  );

  const sortedRows = useMemo(() => {
    if (!activeRows.length) return activeRows;
    const col = ALL_COLUMNS.find((c) => c.key === sortKey);
    const aliases = col?.aliases ?? [];
    const numeric = !!col?.numeric;
    const dir = sortDir === "asc" ? 1 : -1;
    const out = [...activeRows];
    out.sort((a, b) => {
      const va = getField(a, sortKey, aliases);
      const vb = getField(b, sortKey, aliases);
      if (va === undefined && vb === undefined) return 0;
      if (va === undefined) return 1;
      if (vb === undefined) return -1;
      if (numeric) {
        const na = typeof va === "number" ? va : Number(va);
        const nb = typeof vb === "number" ? vb : Number(vb);
        if (!Number.isFinite(na) && !Number.isFinite(nb)) return 0;
        if (!Number.isFinite(na)) return 1;
        if (!Number.isFinite(nb)) return -1;
        return (na - nb) * dir;
      }
      return String(va).localeCompare(String(vb)) * dir;
    });
    return out;
  }, [activeRows, sortKey, sortDir]);

  // Whether the current live view is showing the app's recommended default screen
  // (backend default_theme, no custom filters). Used to gate auto-save and the
  // "Daily default" / "Custom screen" badge in the filter summary.
  const isDefaultScreen = useMemo(() =>
    tab === "thematic" &&
    defaultThemeId !== "" &&
    appliedTheme === defaultThemeId &&
    appliedScoreMode === true &&
    appliedMcapPreset === "under10b" &&
    appliedMcapCustomMin === "" &&
    appliedMcapCustomMax === "" &&
    appliedMinVolume === "" &&
    appliedExchange === "",
  [tab, defaultThemeId, appliedTheme, appliedScoreMode, appliedMcapPreset, appliedMcapCustomMin, appliedMcapCustomMax, appliedMinVolume, appliedExchange]);

  const onSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      const col = ALL_COLUMNS.find((c) => c.key === key);
      setSortDir(col?.numeric ? "desc" : "asc");
    }
  };

  const switchTab = (k: TabKey) => {
    setTab(k);
    setSortKey("score");
    setSortDir("desc");
    setExpandedSymbol(null);
  };

  // ── Apply — commit pending → applied (triggers one fetch via buildUrl change) ─
  // If in savedMode, clears it first in the same React batch so the live fetch
  // gate (if savedMode) return) is lifted before the effect fires.
  const handleApply = () => {
    if (savedMode) {
      setSavedMode(false);
      setCurrentSavedId(null);
      setSavedRows([]);
      setSavedScreenName("");
      setSavedScreenCreatedAt("");
      setSavedMetaObj({});
    }
    setAppliedTheme(pendingTheme);
    setAppliedScoreMode(pendingScoreMode);
    setAppliedMcapPreset(pendingMcapPreset);
    setAppliedMcapCustomMin(pendingMcapCustomMin);
    setAppliedMcapCustomMax(pendingMcapCustomMax);
    setAppliedMinVolume(pendingMinVolume);
    setAppliedExchange(pendingExchange);
    if (pendingTheme) localStorage.setItem(LS_THEME_KEY, pendingTheme);
  };

  const copyTable = async () => {
    const headers = visibleColumns.map((c) => c.label).join("\t");
    const lines = sortedRows.map((row) =>
      visibleColumns.map((c) => {
        const v = getField(row, c.key, c.aliases);
        if (v === undefined || v === null) return "";
        return typeof v === "object" ? JSON.stringify(v) : String(v);
      }).join("\t"),
    );
    try {
      await navigator.clipboard.writeText([headers, ...lines].join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn("[ScreenerHub] clipboard write failed", e);
    }
  };

  // ── Saved Screens handlers ────────────────────────────────────────────────────

  const loadSavedList = useCallback(async () => {
    setSavedListLoading(true);
    try {
      const data = await fetchJsonAuth<any>(
        "/api/screener-hub/saved-screens?save_type=daily_auto&lookback_days=60"
      );
      const list: SavedScreen[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.saved_screens) ? data.saved_screens
        : Array.isArray(data?.screens)        ? data.screens
        : Array.isArray(data?.items)          ? data.items
        : [];
      setSavedList(list);
    } catch (e) {
      console.warn("[ScreenerHub] daily screens load failed", e);
      setSavedList([]);
    } finally {
      setSavedListLoading(false);
    }
  }, []);

  const toggleSavedList = () => {
    const next = !showSavedList;
    setShowSavedList(next);
    if (next) loadSavedList();
  };

  const openSaveModal = () => {
    const themeObj   = themes.find((t) => t.id === appliedTheme);
    const tabLabel   = TAB_LABELS[tab] ?? tab;
    const themeLabel = themeObj?.label ?? appliedTheme;
    const dateStr    = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    setSaveName(tab === "thematic" && themeLabel ? `${themeLabel} — ${dateStr}` : `${tabLabel} — ${dateStr}`);
    setSaveError(null);
    setShowSaveModal(true);
  };

  const doSave = async () => {
    if (!saveName.trim()) { setSaveError("Name is required"); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const themeObj = themes.find((t) => t.id === appliedTheme);
      await fetchJsonAuth("/api/screener-hub/saved-screens", {
        method: "POST",
        body: JSON.stringify({
          name:        saveName.trim(),
          tab,
          theme_key:   appliedTheme  || null,
          theme_label: themeObj?.label ?? appliedTheme ?? null,
          score_mode:  appliedScoreMode,
          filters: {
            mcap_preset:     appliedMcapPreset,
            mcap_custom_min: appliedMcapCustomMin || null,
            mcap_custom_max: appliedMcapCustomMax || null,
            min_volume:      appliedMinVolume      || null,
            exchange:        appliedExchange       || null,
          },
          metadata: {
            universe_built_at:          meta.universe_built_at,
            served_at:                  meta.served_at,
            universe_age_hours:         meta.universe_age_hours,
            universe_db_source:         meta.universe_db_source,
            quote_cache_status:         meta.quote_cache_status,
            low_metadata_coverage:      meta.low_metadata_coverage,
            metadata_coverage_warning:  meta.metadata_coverage_warning,
            fund_coverage_pct:          meta.fund_coverage_pct,
            eligible_fund_coverage_pct: meta.eligible_fund_coverage_pct,
            theme_rs_updated_at:        themeRsUpdatedAt   || null,
            default_theme_reason:       defaultThemeReason || null,
            rows_before_filters:        meta.rows_before_filters,
            rows_after_filters:         meta.rows_after_filters,
          },
          rows: sortedRows,
        }),
      });
      setShowSaveModal(false);
      if (showSavedList) loadSavedList();
    } catch (e: any) {
      setSaveError(e?.message ?? "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const openSavedScreen = async (id: string) => {
    setShowSavedList(false);
    try {
      const data   = await fetchJsonAuth<any>(`/api/screener-hub/saved-screens/${id}`);
      const detail = data?.screen ?? data?.saved_screen ?? data;
      const arr: RowData[] = Array.isArray(detail?.rows) ? detail.rows : [];
      setSavedRows(arr);
      setCurrentSavedId(id);
      setSavedScreenName(detail?.name ?? "Saved screen");
      setSavedScreenCreatedAt(detail?.created_at ?? "");
      setSavedMetaObj(detail?.metadata ?? {});
      setSavedMode(true);
    } catch (e: any) {
      console.warn("[ScreenerHub] open saved screen failed:", e);
    }
  };

  const backToLive = () => {
    setSavedMode(false);
    setCurrentSavedId(null);
    setSavedRows([]);
    setSavedScreenName("");
    setSavedScreenCreatedAt("");
    setSavedMetaObj({});
  };

  const confirmDelete = (id: string) => setConfirmDeleteId(id);
  const cancelDelete  = ()           => setConfirmDeleteId(null);

  const doDelete = async (id: string) => {
    try {
      await fetchJsonAuth(`/api/screener-hub/saved-screens/${id}`, { method: "DELETE" });
      setConfirmDeleteId(null);
      if (savedMode && currentSavedId === id) backToLive();
      await loadSavedList();
      setShowSavedList(true);
    } catch (e) {
      console.warn("[ScreenerHub] delete failed:", e);
    }
  };

  const loadInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const data = await fetchJsonAuth<InsightsData>(
        "/api/screener-hub/saved-screens/insights?save_type=daily_auto&lookback_days=60"
      );
      setInsightsData(data);
    } catch (e) {
      console.warn("[ScreenerHub] daily insights load failed:", e);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const toggleInsights = () => {
    const next = !showInsights;
    setShowInsights(next);
    if (next && !insightsData) loadInsights();
    setShowSavedList(false);
  };

  // ── Cell renderers ───────────────────────────────────────────────────────────

  const renderCell = (row: RowData, c: ColDef, onOpenChart?: () => void) => {
    const v = getField(row, c.key, c.aliases);

    if (c.key === "symbol") {
      const sym = String(v ?? "—");
      return (
        <button
          onClick={onOpenChart}
          className="flex items-center gap-1.5 font-semibold text-white hover:text-purple-300 transition-colors group"
          title={`Open chart for ${sym}`}
        >
          {sym}
          <BarChart2 className="w-3 h-3 text-purple-400/50 group-hover:text-purple-300 flex-shrink-0" />
        </button>
      );
    }

    if (c.key === "company_name") {
      if (!v) return <span className="text-white/40">—</span>;
      return (
        <span className="text-white/80 max-w-[180px] truncate block" title={String(v)}>
          {String(v)}
        </span>
      );
    }

    if (c.key === "market_cap") {
      return <span>{formatCompactCurrency(v)}</span>;
    }

    if (c.key === "beta") {
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      return <span>{n.toFixed(2)}</span>;
    }

    if (c.key === "price") {
      return <span>{formatCurrency(v)}</span>;
    }

    if (["change_1d", "change_7d", "change_30d", "change_ytd", "change_1y"].includes(c.key)) {
      const { text, positive, negative } = formatChangePercent(v);
      return (
        <span className={classNames(
          positive && "text-emerald-300",
          negative && "text-rose-300",
          !positive && !negative && "text-white/40",
        )}>
          {text}
        </span>
      );
    }

    if (c.key === "volume") {
      return <span>{formatCompactNumber(v)}</span>;
    }

    if (c.key === "dollar_volume") {
      return <span>{formatCompactCurrency(v)}</span>;
    }

    if (c.key === "volume_to_market_cap") {
      return <span>{formatSmallPercent(v)}</span>;
    }

    if (c.key === "volume_surge") {
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      const high = n >= 3;
      return (
        <span className={classNames(high ? "text-amber-300 font-medium" : "text-white/80")}>
          {formatVolSurge(v)}
        </span>
      );
    }

    if (c.key === "accumulation") {
      if (v === null || v === undefined || v === "") return <span className="text-white/40">—</span>;
      const s = String(v).trim().toLowerCase();
      const n = toNum(v);
      const isTrue  = s === "true" || s === "yes" || s === "1" || n === 1;
      const isFalse = s === "false" || s === "no" || s === "0" || n === 0;
      if (isTrue) {
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            ✓
          </span>
        );
      }
      if (isFalse) return <span className="text-white/30">—</span>;
      if (n !== null) {
        const pct = Math.abs(n) <= 1 ? n * 100 : n;
        return <span className={classNames(pct > 0 ? "text-emerald-300" : "text-rose-300")}>{pct.toFixed(1)}%</span>;
      }
      return <span className="text-white/70">{String(v)}</span>;
    }

    if (c.key === "options_oi") {
      if (v === null || v === undefined) return <span className="text-white/40">—</span>;
      const formatted = formatCompactNumber(v);
      if (formatted === "—") return <span className="text-white/40">—</span>;
      const updatedAt = getField(row, "options_updated_at", ["optionsUpdatedAt"]);
      const source    = getField(row, "options_source",     ["optionsSource"]);
      const freshLabel = updatedAt
        ? (() => {
            try {
              const d = new Date(updatedAt);
              const diffMin = Math.round((Date.now() - d.getTime()) / 60_000);
              if (diffMin < 1)   return "just now";
              if (diffMin < 60)  return `${diffMin}m ago`;
              const diffH = Math.round(diffMin / 60);
              if (diffH  < 24)   return `${diffH}h ago`;
              return `${Math.round(diffH / 24)}d ago`;
            } catch { return null; }
          })()
        : source || null;
      return (
        <span className="inline-flex items-center gap-1">
          {formatted}
          {freshLabel && (
            <span
              title={`Options data: ${freshLabel}${source ? ` · ${source}` : ""}`}
              className="text-[9px] text-white/25 leading-none cursor-help"
            >
              {freshLabel}
            </span>
          )}
        </span>
      );
    }

    if (c.key === "options_oi_change") {
      const pctRaw = getField(row, "options_oi_change_pct", ["optionsOiChangePct"]);
      if (pctRaw !== undefined && pctRaw !== null) {
        const { text, positive, negative } = formatChangePercent(pctRaw);
        if (text === "—") return <span className="text-white/40">—</span>;
        return (
          <span className={classNames(positive && "text-emerald-300", negative && "text-rose-300")}>
            {text}
          </span>
        );
      }
      // No pct available — show — with status-based tooltip explaining why.
      // getField aliases cover both snake_case and camelCase keys.
      const status = getField(row, "options_oi_change_status", ["optionsOiChangeStatus"]);
      const tip =
        status === "prior_zero"        ? "No percent change yet because previous OI was zero." :
        status === "no_prior_snapshot" ? "No prior options snapshot yet." :
        (status && typeof status === "string" && status.trim().length > 0) ? String(status) :
        undefined;
      return <span className="text-white/40" title={tip}>—</span>;
    }

    if (c.key === "options_activity_score") {
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      const high = n >= 70;
      const mid  = n >= 40;
      return (
        <span className={classNames(
          "inline-block px-1.5 py-0.5 rounded text-[11px] font-medium tabular-nums",
          high ? "bg-purple-500/25 text-purple-200" : mid ? "bg-blue-500/20 text-blue-300" : "text-white/60",
        )}>
          {n.toFixed(0)}
        </span>
      );
    }

    if (c.key === "role") {
      if (!v) return <span className="text-white/40">—</span>;
      return (
        <span className="inline-block px-1.5 py-0.5 rounded text-[11px] bg-white/8 text-white/70 border border-white/10">
          {String(v)}
        </span>
      );
    }

    if (c.key === "score") {
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      const high = n >= 70;
      const mid  = n >= 40;
      return (
        <span className={classNames(
          "inline-block px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums",
          high ? "bg-purple-600/30 text-purple-200 border border-purple-400/30"
               : mid  ? "bg-blue-600/20 text-blue-300 border border-blue-400/20"
               : "text-white/60",
        )}>
          {n.toFixed(0)}
        </span>
      );
    }

    if (c.key === "pe_ratio") {
      const n = toNum(v);
      if (n === null || n <= 0) return <span className="text-white/40">—</span>;
      const high = n > 50;
      return <span className={high ? "text-rose-300" : ""}>{n.toFixed(1)}x</span>;
    }

    if (c.key === "eps") {
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      const sign = n < 0 ? "-" : "";
      return <span className={n < 0 ? "text-rose-300" : ""}>{sign}${Math.abs(n).toFixed(2)}</span>;
    }

    if (c.key === "revenue") {
      return <span>{formatCompactCurrency(v)}</span>;
    }

    if (["gross_margin", "net_margin", "roe", "revenue_growth"].includes(c.key)) {
      const { text, positive, negative } = formatChangePercent(v);
      return (
        <span className={classNames(
          positive && "text-emerald-300",
          negative && "text-rose-300",
          !positive && !negative && "text-white/40",
        )}>
          {text}
        </span>
      );
    }

    if (c.key === "debt_to_equity") {
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      const high = n > 2;
      return <span className={high ? "text-rose-300" : ""}>{n.toFixed(2)}</span>;
    }

    // Generic fallbacks
    if (c.numeric) {
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      return <span>{n.toFixed(2)}</span>;
    }
    if (v === null || v === undefined || v === "") return <span className="text-white/40">—</span>;
    return <span>{String(v)}</span>;
  };

  // ── Controls ─────────────────────────────────────────────────────────────────
  // Pending state only — Apply commits to applied state and triggers fetch.

  const renderControls = (k: TabKey) => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">

        {/* Theme dropdown — Thematic only; updates pending only */}
        {k === "thematic" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60">Theme</label>
            <Select value={pendingTheme} onValueChange={setPendingTheme}>
              <SelectTrigger
                className="w-[200px] bg-black/40 border-purple-500/20 text-white"
                data-testid="screener-hub-theme"
              >
                <SelectValue placeholder={themes.length ? "Select theme" : "Loading…"} />
              </SelectTrigger>
              <SelectContent className="bg-[#0c0717] border-purple-500/30 text-white">
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id} data-testid={`screener-hub-theme-option-${t.id}`}>
                    <span className="inline-flex items-center gap-1.5">
                      {t.id === defaultThemeId && (
                        <span className="text-[9px] text-purple-400 shrink-0">★</span>
                      )}
                      <span>{t.label}</span>
                      {t.state && (
                        <span className="text-[10px] text-white/35 shrink-0">{t.state}</span>
                      )}
                      {t.rs_score != null && (
                        <span className="text-[10px] text-white/30 shrink-0">RS {t.rs_score.toFixed(0)}</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Market cap preset — Thematic only */}
        {k === "thematic" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60">Market Cap</label>
            <Select
              value={pendingMcapPreset}
              onValueChange={(v) => setPendingMcapPreset(v as McapPreset)}
            >
              <SelectTrigger className="w-[130px] bg-black/40 border-purple-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0c0717] border-purple-500/30 text-white">
                {MCAP_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Custom mcap range inputs */}
        {k === "thematic" && pendingMcapPreset === "custom" && (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min $"
              value={pendingMcapCustomMin}
              onChange={(e) => setPendingMcapCustomMin(e.target.value)}
              className="w-[88px] bg-black/40 border border-purple-500/20 rounded text-white text-xs px-2 py-1 placeholder-white/25 focus:outline-none focus:border-purple-400/50"
            />
            <span className="text-white/35 text-xs">–</span>
            <input
              type="number"
              placeholder="Max $"
              value={pendingMcapCustomMax}
              onChange={(e) => setPendingMcapCustomMax(e.target.value)}
              className="w-[88px] bg-black/40 border border-purple-500/20 rounded text-white text-xs px-2 py-1 placeholder-white/25 focus:outline-none focus:border-purple-400/50"
            />
          </div>
        )}

        {/* Min volume — Thematic only */}
        {k === "thematic" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60">Min Vol</label>
            <input
              type="number"
              placeholder="e.g. 500000"
              value={pendingMinVolume}
              onChange={(e) => setPendingMinVolume(e.target.value)}
              className="w-[110px] bg-black/40 border border-purple-500/20 rounded text-white text-xs px-2 py-1 placeholder-white/25 focus:outline-none focus:border-purple-400/50"
            />
          </div>
        )}

        {/* Exchange — Thematic only */}
        {k === "thematic" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60">Exchange</label>
            <Select
              value={pendingExchange || "__all__"}
              onValueChange={(v) => setPendingExchange(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-[96px] bg-black/40 border-purple-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0c0717] border-purple-500/30 text-white">
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="NYSE">NYSE</SelectItem>
                <SelectItem value="NASDAQ">NASDAQ</SelectItem>
                <SelectItem value="AMEX">AMEX</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Score Mode — updates pending only */}
        <div className="flex items-center gap-2">
          <Switch
            id={`screener-hub-score-${k}`}
            checked={pendingScoreMode}
            onCheckedChange={setPendingScoreMode}
            data-testid="screener-hub-score-toggle"
          />
          <label htmlFor={`screener-hub-score-${k}`} className="text-xs text-white/70">Score Mode</label>
        </div>

        {/* Apply button — commits pending → applied; exits saved mode if needed */}
        <Button
          type="button"
          onClick={handleApply}
          data-testid="screener-hub-apply"
          size="sm"
          className="bg-purple-600/80 hover:bg-purple-500 border-0 text-white"
        >
          {savedMode ? "Apply & Go Live" : "Apply"}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {/* Copy */}
          <Button
            type="button" onClick={copyTable}
            data-testid="screener-hub-copy" variant="outline" size="sm"
            className="bg-black/40 border-purple-500/30 text-white hover:bg-purple-500/20"
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>

          {/* Manual save intentionally hidden — daily auto-save handles snapshots */}

          {/* Saved Screens dropdown */}
          <div className="relative" ref={savedListRef}>
            <Button
              type="button" variant="outline" size="sm"
              onClick={toggleSavedList}
              className={classNames(
                "bg-black/40 border-purple-500/30 text-white hover:bg-purple-500/20",
                showSavedList && "bg-purple-500/15 border-purple-400/50",
              )}
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Daily Screens
              {savedList.length > 0 && (
                <span className="ml-1 px-1 py-0.5 rounded text-[10px] bg-purple-500/30 text-purple-200 leading-none">
                  {savedList.length}
                </span>
              )}
              <ChevronDown className="w-3 h-3 ml-1 opacity-60" />
            </Button>

            {showSavedList && (
              <div className="absolute right-0 top-full mt-1 z-50 w-[320px] bg-[#0c0717] border border-purple-500/25 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-2 border-b border-white/8 flex items-center justify-between">
                  <span className="text-xs font-medium text-white/60">Daily Screens · Last 60 Days</span>
                  <button
                    onClick={toggleInsights}
                    className="flex items-center gap-1 text-[11px] text-purple-300/60 hover:text-purple-200 transition-colors"
                  >
                    <Lightbulb className="w-3 h-3" />
                    Daily Insights
                  </button>
                </div>
                <div className="max-h-[340px] overflow-y-auto">
                  {savedListLoading ? (
                    <div className="px-3 py-6 text-center text-white/40 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
                    </div>
                  ) : savedList.length === 0 ? (
                    <div className="px-3 py-8 text-center space-y-1">
                      <div className="text-xs text-white/30">No daily screens yet.</div>
                      <div className="text-[11px] text-white/20">Daily screens are auto-saved when the Thematic tab loads.</div>
                    </div>
                  ) : (
                    savedList.map((s) => (
                      <div
                        key={s.id}
                        className={classNames(
                          "flex items-start gap-2 px-3 py-2.5 border-b border-white/5 hover:bg-purple-500/8 transition-colors",
                          currentSavedId === s.id && savedMode && "bg-purple-600/10",
                        )}
                      >
                        <button onClick={() => openSavedScreen(s.id)} className="flex-1 text-left min-w-0">
                          <div className="text-xs font-medium text-white/90 truncate">{s.name}</div>
                          <div className="text-[11px] text-white/35 mt-0.5 flex flex-wrap gap-x-2">
                            {s.created_at && (
                              <span>{new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                            )}
                            {s.tab && <span>{TAB_LABELS[s.tab as TabKey] ?? s.tab}</span>}
                            {s.theme_label && <span>· {s.theme_label}</span>}
                            {s.row_count != null && <span>· {s.row_count} rows</span>}
                          </div>
                          {s.top_symbols && s.top_symbols.length > 0 && (
                            <div className="text-[11px] text-purple-300/40 mt-0.5 truncate">
                              {s.top_symbols.slice(0, 5).join(" · ")}
                            </div>
                          )}
                        </button>
                        {confirmDeleteId === s.id ? (
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            <button
                              onClick={() => doDelete(s.id)}
                              className="text-[11px] text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30 hover:border-rose-400/50 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={cancelDelete}
                              className="text-[11px] text-white/35 hover:text-white/70 px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); confirmDelete(s.id); }}
                            className="shrink-0 mt-0.5 p-1 rounded text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {savedList.length > 0 && (
                  <div className="px-3 py-1.5 border-t border-white/5 text-[10px] text-white/20 text-center">
                    Daily screens are kept for 60 days.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Applied filter summary — shows what the current rows are filtered by */}
      {k === "thematic" && appliedTheme && (
        <div className="text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1.5">
            <span className="text-white/30">Showing:</span>
            <span className="text-white/70 font-medium">{themes.find((t) => t.id === appliedTheme)?.label ?? appliedTheme}</span>
            {isDefaultScreen ? (
              <span className="px-1 py-px rounded text-[10px] bg-purple-500/15 text-purple-300/70 border border-purple-400/20 leading-tight">
                Daily default
              </span>
            ) : (
              <span className="px-1 py-px rounded text-[10px] bg-white/5 text-white/40 border border-white/10 leading-tight">
                Custom screen
              </span>
            )}
            {isDefaultScreen && defaultThemeReason && (
              <span className="text-white/25">· {defaultThemeReason}</span>
            )}
          </span>
          {(() => {
            const parts: string[] = [];
            if (appliedMcapPreset !== "all") {
              if (appliedMcapPreset === "custom") {
                const { min, max } = mcapBounds("custom", appliedMcapCustomMin, appliedMcapCustomMax);
                if (min != null || max != null) {
                  parts.push(`MCap: ${min != null ? formatCompactCurrency(min) : "any"}–${max != null ? formatCompactCurrency(max) : "any"}`);
                }
              } else {
                const preset = MCAP_PRESETS.find((p) => p.id === appliedMcapPreset);
                if (preset) parts.push(`MCap: ${preset.label}`);
              }
            }
            if (appliedMinVolume) parts.push(`Min Vol: ${formatCompactNumber(Number(appliedMinVolume))}`);
            if (appliedExchange)  parts.push(`Exchange: ${appliedExchange}`);
            if (!appliedScoreMode) parts.push("Score: off");
            return parts.map((p, i) => (
              <span key={i} className="text-white/40 bg-white/5 border border-white/8 px-1.5 py-px rounded text-[10px]">
                {p}
              </span>
            ));
          })()}
        </div>
      )}
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Card
      className="bg-gradient-to-b from-[#0c0717] to-[#070310] border-purple-500/20 text-white"
      data-testid="screener-hub-root"
    >
      <div className="p-4 sm:p-5 lg:p-6 space-y-4">

        <Tabs value={tab} onValueChange={(v) => switchTab(v as TabKey)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList
              className="bg-black/40 border border-purple-500/20 h-auto p-1 flex-wrap"
              data-testid="screener-hub-tabs"
            >
              {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
                <TabsTrigger
                  key={k}
                  value={k}
                  data-testid={`screener-hub-tab-${k}`}
                  className="data-[state=active]:bg-purple-600/30 data-[state=active]:text-white text-white/70"
                >
                  {TAB_LABELS[k]}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── Freshness metadata — compact primary display + ⓘ details ─── */}
            <div
              className="flex flex-wrap items-center gap-2 text-[11px] text-white/50"
              data-testid="screener-hub-meta"
            >
              {/* Universe status + built time — one pill */}
              {(meta.universe_built_at || meta.generated_at || meta.universe_age_hours != null) && (() => {
                const isStale = meta.universe_age_hours != null && meta.universe_age_hours > 12;
                const builtAt  = meta.universe_built_at ?? meta.generated_at;
                const builtLabel = builtAt ? (() => {
                  try {
                    return new Date(builtAt).toLocaleString(undefined, {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    });
                  } catch { return null; }
                })() : null;
                return (
                  <span className={classNames(
                    "px-2 py-0.5 rounded border bg-white/5",
                    isStale ? "border-amber-500/30 text-amber-400/70" : "border-white/10",
                  )}>
                    Universe: {isStale ? "cached" : "fresh"}
                    {builtLabel && <> · Built {builtLabel}</>}
                  </span>
                );
              })()}

              {/* Quotes status */}
              {(meta.quote_refresh_started || meta.quote_cache_status) && (
                meta.quote_refresh_started ? (
                  <span className="px-2 py-0.5 rounded border border-blue-400/30 bg-blue-400/8 text-blue-300/70">
                    Quotes: refreshing
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
                    Quotes: {meta.quote_cache_status}
                  </span>
                )
              )}

              {/* Row filter counts — user-facing, keep visible */}
              {meta.rows_after_filters != null &&
               meta.rows_before_filters != null &&
               meta.rows_after_filters !== meta.rows_before_filters && (
                <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
                  {meta.rows_after_filters} / {meta.rows_before_filters} rows
                </span>
              )}

              {/* Partial data warning — amber, subtle */}
              {meta.low_metadata_coverage && (
                <span
                  className="px-2 py-0.5 rounded border border-amber-500/30 bg-amber-400/8 text-amber-400/80"
                  title="Some rows are missing cached fundamentals like Market Cap, Sector, Industry, Beta, or Exchange."
                >
                  Partial data
                </span>
              )}

              {/* ⓘ Details — internal/debug info collapsed into hover tooltip */}
              {(() => {
                const parts: string[] = [];
                if (meta.served_at) {
                  try { parts.push(`Served: ${new Date(meta.served_at).toLocaleTimeString()}`); } catch {}
                }
                if (meta.universe_db_source) parts.push(`Source: ${meta.universe_db_source}`);
                if (meta.fundamentals_cache_status) parts.push(`Fundamentals cache: ${meta.fundamentals_cache_status}`);
                if (meta.eligible_fund_coverage_pct != null) {
                  parts.push(`Data quality: ${meta.eligible_fund_coverage_pct.toFixed(0)}% of rows have complete cached fundamentals for this screen.`);
                }
                if (meta.next_rebuild_at) {
                  try { parts.push(`Next rebuild: ${new Date(meta.next_rebuild_at).toLocaleTimeString()}`); } catch {}
                }
                if (themeRsUpdatedAt) {
                  try { parts.push(`RS scores: ${new Date(themeRsUpdatedAt).toLocaleDateString()}`); } catch {}
                }
                if (parts.length === 0) return null;
                return (
                  <span
                    className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 cursor-help text-white/30 hover:text-white/60 transition-colors select-none"
                    title={parts.join("\n")}
                  >
                    ⓘ
                  </span>
                );
              })()}
            </div>
          </div>

          {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
            <TabsContent key={k} value={k} className="mt-4 space-y-4">

              {/* Saved mode banner */}
              {savedMode && (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
                    <span className="text-white/70 truncate">
                      Viewing daily screen
                      {savedScreenCreatedAt && (
                        <> from{" "}
                          <span className="text-white/90">{new Date(savedScreenCreatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                        </>
                      )}
                      {savedScreenName && (
                        <> · <span className="text-white/90 font-medium">{savedScreenName}</span></>
                      )}
                      <span className="text-white/30 ml-1.5">({savedRows.length} rows)</span>
                    </span>
                  </div>
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={backToLive}
                    className="shrink-0 h-6 px-2 text-[11px] bg-black/40 border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    Back to Live Screener
                  </Button>
                </div>
              )}

              {/* Saved Insights panel */}
              {showInsights && (
                <div className="rounded-xl border border-purple-500/20 bg-black/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-white/90">Daily Insights</span>
                      <span className="text-[11px] text-white/30">last 60 days · auto-saved daily</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadInsights} disabled={insightsLoading}
                        className="text-white/25 hover:text-white/60 transition-colors disabled:opacity-40"
                        title="Refresh insights"
                      >
                        <RefreshCw className={classNames("w-3.5 h-3.5", insightsLoading && "animate-spin")} />
                      </button>
                      <button
                        onClick={() => setShowInsights(false)}
                        className="text-white/25 hover:text-white/60 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {insightsLoading && !insightsData ? (
                    <div className="py-5 text-center text-white/40 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading insights…
                    </div>
                  ) : !insightsData ? (
                    <p className="py-4 text-center text-white/30 text-xs">
                      Save at least one screen to see insights.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {insightsData.recurring_tickers && insightsData.recurring_tickers.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Recurring</div>
                          {insightsData.recurring_tickers.slice(0, 7).map((t) => (
                            <div key={t.symbol} className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white/90">{t.symbol}</span>
                              {t.count != null && <span className="text-white/30">{t.count}×</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {insightsData.week_over_week_tickers && insightsData.week_over_week_tickers.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Week-over-Week</div>
                          {insightsData.week_over_week_tickers.slice(0, 7).map((t) => (
                            <div key={t.symbol} className="text-xs font-semibold text-white/80">{t.symbol}</div>
                          ))}
                        </div>
                      )}
                      {insightsData.newly_appearing_tickers && insightsData.newly_appearing_tickers.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Newly Appearing</div>
                          {insightsData.newly_appearing_tickers.slice(0, 7).map((t) => (
                            <div key={t.symbol} className="text-xs font-semibold text-white/80">{t.symbol}</div>
                          ))}
                        </div>
                      )}
                      {insightsData.biggest_gainers && insightsData.biggest_gainers.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-400/60" />
                            <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Gainers Since Save</div>
                          </div>
                          {insightsData.biggest_gainers.slice(0, 5).map((t) => {
                            const pct = t.gain_pct ?? t.price_change_pct;
                            return (
                              <div key={t.symbol} className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-white/90">{t.symbol}</span>
                                {pct != null && <span className="text-emerald-300">+{pct.toFixed(1)}%</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {insightsData.biggest_decliners && insightsData.biggest_decliners.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-rose-400/60" />
                            <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Decliners Since Save</div>
                          </div>
                          {insightsData.biggest_decliners.slice(0, 5).map((t) => {
                            const pct = t.decline_pct ?? t.price_change_pct;
                            return (
                              <div key={t.symbol} className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-white/90">{t.symbol}</span>
                                {pct != null && <span className="text-rose-300">{pct.toFixed(1)}%</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {((insightsData.recurring_themes?.length ?? 0) > 0 || (insightsData.emerging_themes?.length ?? 0) > 0) && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Themes</div>
                          {insightsData.recurring_themes?.slice(0, 4).map((t) => (
                            <div key={t.theme} className="flex items-center justify-between text-xs">
                              <span className="text-white/80 truncate">{t.theme}</span>
                              {t.count != null && <span className="text-white/30 ml-1 shrink-0">{t.count}×</span>}
                            </div>
                          ))}
                          {insightsData.emerging_themes?.slice(0, 2).map((t) => (
                            <div key={t.theme} className="flex items-center gap-1.5 text-xs">
                              <span className="text-[9px] px-1 py-0.5 rounded bg-amber-400/15 text-amber-400/80 border border-amber-400/20">new</span>
                              <span className="text-white/60 truncate">{t.theme}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Controls — pending state only; Apply commits */}
              {renderControls(k)}

              {/* Table */}
              <div
                className="rounded-lg border border-purple-500/20 bg-black/40 overflow-hidden"
                data-testid="screener-hub-table-container"
              >
                <div className="max-h-[640px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-purple-950 sticky top-0 z-10">
                      <tr>
                        {visibleColumns.map((c) => {
                          const isSorted = sortKey === c.key;
                          return (
                            <th
                              key={c.key}
                              onClick={() => onSort(c.key)}
                              data-testid={`screener-hub-th-${c.key}`}
                              title={c.tooltip}
                              className={classNames(
                                "text-left px-3 py-2 font-medium text-white/70 whitespace-nowrap cursor-pointer select-none hover:text-white",
                                isSorted && "text-purple-200",
                                c.tooltip && "cursor-help",
                                c.key === "symbol" && "sticky left-0 z-20 bg-purple-950 border-r border-purple-500/20",
                              )}
                            >
                              <span className="inline-flex items-center gap-1">
                                {c.label}
                                {isSorted ? (
                                  sortDir === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-30" />
                                )}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    {loading && rows.length === 0 ? (
                      <tbody data-testid="screener-hub-tbody">
                        <tr>
                          <td colSpan={visibleColumns.length} className="px-3 py-10 text-center text-white/60" data-testid="screener-hub-loading">
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    ) : error ? (
                      <tbody data-testid="screener-hub-tbody">
                        <tr>
                          <td colSpan={visibleColumns.length} className="px-3 py-8 text-center text-rose-300" data-testid="screener-hub-error">
                            {error}
                          </td>
                        </tr>
                      </tbody>
                    ) : sortedRows.length === 0 ? (
                      <tbody data-testid="screener-hub-tbody">
                        <tr>
                          <td colSpan={visibleColumns.length} className="px-3 py-10 text-center" data-testid="screener-hub-empty">
                            <p className="text-white/50">No results.</p>
                            {meta.message && (
                              <p className="mt-1 text-xs text-white/30">{meta.message}</p>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    ) : (
                      <tbody data-testid="screener-hub-tbody">
                        {sortedRows.map((row, i) => {
                          const sym = (getField(row, "symbol", ["ticker", "stock"]) as string) ?? `row-${i}`;
                          return (
                            <tr key={sym} className="group border-t border-white/5 hover:bg-purple-500/5 transition-colors">
                              {visibleColumns.map((c) => (
                                <td
                                  key={c.key}
                                  className={classNames(
                                    "px-3 py-2 whitespace-nowrap text-white/90",
                                    c.key === "symbol" && "sticky left-0 z-[1] bg-[#0c0717] group-hover:bg-[#100b1f] border-r border-purple-500/10",
                                  )}
                                  data-testid={`screener-hub-cell-${c.key}-${i}`}
                                >
                                  {renderCell(row, c, c.key === "symbol" ? () => setExpandedSymbol(sym) : undefined)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    )}
                  </table>
                </div>
              </div>

              {loading && rows.length > 0 && (
                <div className="text-[11px] text-white/40 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Refreshing…
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {expandedSymbol && (
        <TvChartModal
          symbol={expandedSymbol}
          onClose={() => setExpandedSymbol(null)}
        />
      )}

      {/* ── Save Screen Modal ───────────────────────────────────────────────── */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="w-full max-w-[420px] bg-[#0c0717] border border-purple-500/30 rounded-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Save Manual Snapshot</h3>
              </div>
              <button onClick={() => setShowSaveModal(false)} className="text-white/30 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-white/50">Screen name</label>
              <input
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") doSave(); }}
                placeholder="e.g. AI Infrastructure — Jun 11"
                className="w-full bg-black/50 border border-purple-500/25 rounded-lg text-white text-sm px-3 py-2 placeholder-white/20 focus:outline-none focus:border-purple-400/60"
              />
            </div>

            <div className="text-xs text-white/35 space-y-0.5">
              <div>{sortedRows.length} rows saved as a static snapshot.</div>
              <div className="text-white/20">Opening a saved screen does not re-run the screener or call any providers.</div>
            </div>

            {saveError && (
              <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                {saveError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => setShowSaveModal(false)}
                className="bg-black/40 border-white/15 text-white/60 hover:bg-white/10 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button" size="sm"
                onClick={doSave}
                disabled={saving || !saveName.trim()}
                className="bg-purple-600/80 hover:bg-purple-500 border-0 text-white disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
                ) : (
                  <><Save className="w-3.5 h-3.5 mr-1.5" />Save</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
