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
import { Copy, Check, Loader2, ArrowUpDown, ArrowUp, ArrowDown, BarChart2, X } from "lucide-react";

type TabKey = "thematic" | "social" | "bottlenecks" | "watchlist_portfolio";

const TAB_LABELS: Record<TabKey, string> = {
  thematic: "Thematic",
  social: "Social",
  bottlenecks: "Bottlenecks",
  watchlist_portfolio: "Watchlist + Portfolio",
};

// ── Column definitions ─────────────────────────────────────────────────────────
// Single unified column set used by ALL four tabs.

type ColDef = { key: string; label: string; numeric?: boolean; aliases?: string[] };

const ALL_COLUMNS: ColDef[] = [
  { key: "symbol",                 label: "Symbol",       aliases: ["ticker", "stock"] },
  { key: "company_name",           label: "Company",      aliases: ["companyName", "name", "company"] },
  { key: "market_cap",             label: "Market Cap",   numeric: true,  aliases: ["marketCap", "mcap"] },
  { key: "sector",                 label: "Sector" },
  { key: "industry",               label: "Industry" },
  { key: "beta",                   label: "Beta",         numeric: true },
  { key: "price",                  label: "Price",        numeric: true,  aliases: ["last", "lastPrice"] },
  { key: "change_1d",              label: "1D %",         numeric: true,  aliases: ["change_percent_1d", "changePercent1d", "oneDayChange", "pct_1d", "change_pct_1d", "day_change_pct"] },
  { key: "last_annual_dividend",   label: "Div/Yr",       numeric: true,  aliases: ["lastAnnualDividend", "annual_dividend", "dividend"] },
  { key: "volume",                 label: "Volume",       numeric: true,  aliases: ["vol"] },
  { key: "dollar_volume",          label: "$ Volume",     numeric: true,  aliases: ["dollarVolume", "dv"] },
  { key: "volume_to_market_cap",   label: "Vol/MCap",     numeric: true,  aliases: ["volumeToMarketCap", "vol_to_mcap"] },
  { key: "exchange",               label: "Exchange" },
  { key: "volume_surge",           label: "Vol Surge",    numeric: true,  aliases: ["vol_surge", "volSurge"] },
  { key: "accumulation",           label: "Accum",                        aliases: ["accum"] },
  { key: "options_oi",             label: "Options OI",   numeric: true,  aliases: ["optionsOi", "options_open_interest", "previous_options_oi", "previousOptionsOi"] },
  { key: "options_oi_change",      label: "OI Chg",       numeric: true,  aliases: ["optionsOiChange", "oi_change", "options_oi_change_pct", "optionsOiChangePct"] },
  { key: "options_activity_score", label: "Opt Activity", numeric: true,  aliases: ["optionsActivityScore", "options_activity", "options_activity"] },
  { key: "role",                   label: "Role",                         aliases: ["supply_chain_role", "supplyChainRole"] },
  { key: "score",                  label: "Score",        numeric: true,  aliases: ["hidden_gem_score", "hiddenGemScore"] },
];

// Signal toggles — identical set for every tab; gate the three optional columns.
const SIGNALS = [
  { key: "volume_surge",     label: "Vol Surge",        col: "volume_surge" },
  { key: "accumulation",    label: "Accumulation",     col: "accumulation" },
  { key: "options_activity", label: "Options Activity", col: "options_activity_score" },
] as const;
type SignalKey = (typeof SIGNALS)[number]["key"];

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface ThemeOption { id: string; label: string; }
interface RowData { [k: string]: any; }
interface HubResponse {
  status?: string; tab?: string; theme?: string; generated_at?: string;
  fundamentals_cache_status?: string; quote_cache_status?: string;
  message?: string; error_code?: string; theme_state?: string; theme_state_reason?: string;
  rows?: any; data?: any; items?: any; results?: any;
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

function preferredDefaultTheme(themes: ThemeOption[]): string | undefined {
  if (themes.length === 0) return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const exactIds = ["semiconductors", "semiconductor", "semis", "clean_energy", "cleanenergy", "drones"];
  for (const id of exactIds) {
    const found = themes.find((t) => norm(t.id) === id);
    if (found) return found.id;
  }
  const byLabel = themes.find((t) => norm(t.label) === "semiconductors");
  if (byLabel) return byLabel.id;
  const semiSlug = themes.find((t) => /^semiconductor(s)?$/.test(norm(t.id)));
  if (semiSlug) return semiSlug.id;
  return themes[0].id;
}

async function fetchJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${url} failed: ${res.status} ${txt.slice(0, 120)}`);
  }
  return res.json();
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
  const pct = Math.abs(n) <= 1.5 ? n * 100 : n;
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(2)}%`, positive: pct > 0, negative: pct < 0 };
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

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScreenerHub() {
  const [tab, setTab] = useState<TabKey>("thematic");
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [theme, setTheme] = useState<string>("");
  const [scoreMode, setScoreMode] = useState<boolean>(true);

  // Unified signal toggles — same set for all four tabs
  const [signals, setSignals] = useState<Record<SignalKey, boolean>>({
    volume_surge: true,
    accumulation: true,
    options_activity: true,
  });

  const [rows, setRows] = useState<RowData[]>([]);
  const [meta, setMeta] = useState<{
    generated_at?: string; fundamentals_cache_status?: string; quote_cache_status?: string;
    message?: string; error_code?: string;
  }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const themeBootstrappedRef = useRef<boolean>(false);

  // Load themes list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchJson<any>("/api/screener-hub/themes");
        if (cancelled) return;
        const arr = pickArray(data, ["themes", "items", "rows", "results", "data"]);
        const opts: ThemeOption[] = arr
          .map((t: any) => {
            if (typeof t === "string") return { id: t, label: t };
            const id = t?.id ?? t?.slug ?? t?.value ?? t?.key ?? t?.name ?? t?.label;
            const label = t?.label ?? t?.name ?? t?.title ?? id;
            return id ? { id: String(id), label: String(label ?? id) } : null;
          })
          .filter(Boolean) as ThemeOption[];
        setThemes(opts);
        if (!themeBootstrappedRef.current) {
          const def = preferredDefaultTheme(opts);
          if (def) setTheme(def);
          themeBootstrappedRef.current = true;
        }
      } catch (e) {
        if (!cancelled) console.warn("[ScreenerHub] themes load failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (tab === "thematic" && theme) params.set("theme", theme);
    params.set("scoreMode", scoreMode ? "true" : "false");
    return `/api/screener-hub?${params.toString()}`;
  }, [tab, theme, scoreMode]);

  // Fetch rows whenever URL inputs change
  useEffect(() => {
    if (tab === "thematic" && !theme && themes.length > 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await fetchJson<HubResponse>(buildUrl());
        if (cancelled) return;
        const arr = pickArray(data, ["rows", "data", "items", "results"]);
        setRows(arr);
        setMeta({
          generated_at: data?.generated_at,
          fundamentals_cache_status: data?.fundamentals_cache_status,
          quote_cache_status: data?.quote_cache_status,
          message: data?.message ?? undefined,
          error_code: data?.error_code ?? undefined,
        });
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [buildUrl, tab, theme, themes.length]);

  // Visible columns: same base set for all tabs, filtered by signal toggles
  const visibleColumns = useMemo(() => {
    return ALL_COLUMNS.filter((c) => {
      const sig = SIGNALS.find((s) => s.col === c.key);
      if (sig) return signals[sig.key];
      return true;
    });
  }, [signals]);

  const sortedRows = useMemo(() => {
    if (!rows.length) return rows;
    const col = ALL_COLUMNS.find((c) => c.key === sortKey);
    const aliases = col?.aliases ?? [];
    const numeric = !!col?.numeric;
    const dir = sortDir === "asc" ? 1 : -1;
    const out = [...rows];
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
  }, [rows, sortKey, sortDir]);

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

    if (c.key === "change_1d") {
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

    if (c.key === "last_annual_dividend") {
      const n = toNum(v);
      if (n === null || n === 0) return <span className="text-white/40">—</span>;
      return <span>{formatCurrency(v)}</span>;
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
      // Subtle freshness indicator using options_updated_at / options_source
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
      // Prefer the percent field if the backend provides it
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
      // Fall back to absolute signed change
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      const sign = n > 0 ? "+" : "";
      return (
        <span className={classNames(n > 0 && "text-emerald-300", n < 0 && "text-rose-300", n === 0 && "text-white/50")}>
          {sign}{formatCompactNumber(n)}
        </span>
      );
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

    // Generic fallbacks
    if (c.numeric) {
      const n = toNum(v);
      if (n === null) return <span className="text-white/40">—</span>;
      return <span>{n.toFixed(2)}</span>;
    }
    if (v === null || v === undefined || v === "") return <span className="text-white/40">—</span>;
    return <span>{String(v)}</span>;
  };

  // ── Shared controls renderer ─────────────────────────────────────────────────

  const renderControls = (k: TabKey) => (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Theme dropdown — Thematic tab only */}
        {k === "thematic" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60">Theme</label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger
                className="w-[200px] bg-black/40 border-purple-500/20 text-white"
                data-testid="screener-hub-theme"
              >
                <SelectValue placeholder={themes.length ? "Select theme" : "Loading…"} />
              </SelectTrigger>
              <SelectContent className="bg-[#0c0717] border-purple-500/30 text-white">
                {themes.map((t) => (
                  <SelectItem key={t.id} value={t.id} data-testid={`screener-hub-theme-option-${t.id}`}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Score Mode toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id={`screener-hub-score-${k}`}
            checked={scoreMode}
            onCheckedChange={setScoreMode}
            data-testid="screener-hub-score-toggle"
          />
          <label htmlFor={`screener-hub-score-${k}`} className="text-xs text-white/70">Score Mode</label>
        </div>

        <div className="ml-auto">
          <Button
            type="button" onClick={copyTable}
            data-testid="screener-hub-copy" variant="outline" size="sm"
            className="bg-black/40 border-purple-500/30 text-white hover:bg-purple-500/20"
          >
            {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      {/* Signal toggles */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" data-testid="screener-hub-signals">
        <span className="text-xs uppercase tracking-wider text-white/40">Signals</span>
        {SIGNALS.map((s) => (
          <label key={s.key} className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
            <Checkbox
              checked={signals[s.key]}
              onCheckedChange={(v) => setSignals((prev) => ({ ...prev, [s.key]: !!v }))}
              data-testid={`screener-hub-signal-${s.key}`}
              className="border-purple-400/40 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
            />
            {s.label}
          </label>
        ))}
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Card
      className="bg-gradient-to-b from-[#0c0717] to-[#070310] border-purple-500/20 text-white"
      data-testid="screener-hub-root"
    >
      <div className="p-4 sm:p-5 lg:p-6 space-y-4">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              Caelyn Screener
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Hidden-gem discovery — volume, accumulation, and options signals across all tabs.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/50" data-testid="screener-hub-meta">
            {meta.generated_at && (
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
                Updated {new Date(meta.generated_at).toLocaleTimeString()}
              </span>
            )}
            {meta.fundamentals_cache_status && (
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
                Fund: {meta.fundamentals_cache_status}
              </span>
            )}
            {meta.quote_cache_status && (
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
                Quote: {meta.quote_cache_status}
              </span>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => switchTab(v as TabKey)}>
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

          {(Object.keys(TAB_LABELS) as TabKey[]).map((k) => (
            <TabsContent key={k} value={k} className="mt-4 space-y-4">

              {/* Controls — identical structure for all tabs; theme dropdown gated to Thematic */}
              {renderControls(k)}

              {/* Table */}
              <div
                className="rounded-lg border border-purple-500/20 bg-black/40 overflow-hidden"
                data-testid="screener-hub-table-container"
              >
                <div className="max-h-[640px] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-purple-950/40 sticky top-0 z-10">
                      <tr>
                        {visibleColumns.map((c) => {
                          const isSorted = sortKey === c.key;
                          return (
                            <th
                              key={c.key}
                              onClick={() => onSort(c.key)}
                              data-testid={`screener-hub-th-${c.key}`}
                              className={classNames(
                                "text-left px-3 py-2 font-medium text-white/70 whitespace-nowrap cursor-pointer select-none hover:text-white",
                                isSorted && "text-purple-200",
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
                            <tr key={sym} className="border-t border-white/5 hover:bg-purple-500/5 transition-colors">
                              {visibleColumns.map((c) => (
                                <td
                                  key={c.key}
                                  className="px-3 py-2 whitespace-nowrap text-white/90"
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
    </Card>
  );
}
