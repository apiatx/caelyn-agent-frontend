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
import { Copy, Check, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type TabKey = "thematic" | "social" | "bottlenecks" | "watchlist_portfolio";

const TAB_LABELS: Record<TabKey, string> = {
  thematic: "Thematic",
  social: "Social",
  bottlenecks: "Bottlenecks",
  watchlist_portfolio: "Watchlist + Portfolio",
};

const CATEGORIES = ["Show all", "Leading", "Improving", "Weakening", "Lagging"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_PARAM: Record<Category, string> = {
  "Show all": "",
  Leading: "leading",
  Improving: "improving",
  Weakening: "weakening",
  Lagging: "lagging",
};

const SIGNALS = [
  { key: "rs_2w", label: "RS 0-2w" },
  { key: "rs_4w", label: "RS 0-4w" },
  { key: "rs_10w", label: "RS 0-10w" },
  { key: "rs_accel", label: "RS Accel" },
  { key: "from_52w_high", label: "% from 52W High" },
  { key: "accumulation", label: "Accumulation" },
  { key: "volume_surge", label: "Volume Surge" },
] as const;

type SignalKey = (typeof SIGNALS)[number]["key"];

const COLUMNS: Array<{ key: string; label: string; numeric?: boolean; aliases?: string[] }> = [
  { key: "symbol", label: "Stock", aliases: ["ticker", "stock"] },
  { key: "history", label: "History" },
  { key: "category", label: "Category", aliases: ["rs_category", "trend_category"] },
  { key: "rs_2w", label: "RS 0-2W", numeric: true, aliases: ["rs0_2w", "rs2w"] },
  { key: "rs_4w", label: "RS 0-4W", numeric: true, aliases: ["rs0_4w", "rs4w"] },
  { key: "rs_10w", label: "RS 0-10W", numeric: true, aliases: ["rs0_10w", "rs10w"] },
  { key: "rs_accel", label: "RS Accel", numeric: true, aliases: ["rs_acceleration", "accel"] },
  { key: "from_52w_high", label: "52W High", numeric: true, aliases: ["pct_from_52w_high", "from52wHigh"] },
  { key: "volume_surge", label: "Vol Surge", numeric: true, aliases: ["vol_surge", "volSurge"] },
  { key: "accumulation", label: "Accumulation", numeric: true, aliases: ["accum"] },
  { key: "coc", label: "CoC", aliases: ["coc_signal", "change_of_character"] },
  { key: "score", label: "Score", numeric: true },
  { key: "market_cap", label: "Market Cap", numeric: true, aliases: ["marketCap", "mcap"] },
  { key: "sector", label: "Sector" },
  { key: "industry", label: "Industry" },
  { key: "price", label: "Price", numeric: true, aliases: ["last", "lastPrice"] },
  { key: "change_1d", label: "1D %", numeric: true, aliases: ["pct_1d", "change_pct_1d", "day_change_pct"] },
  { key: "change_7d", label: "7D %", numeric: true, aliases: ["pct_7d", "change_pct_7d"] },
  { key: "change_30d", label: "30D %", numeric: true, aliases: ["pct_30d", "change_pct_30d"] },
  { key: "change_ytd", label: "YTD %", numeric: true, aliases: ["pct_ytd", "ytd"] },
  { key: "change_1y", label: "1Y %", numeric: true, aliases: ["pct_1y", "change_pct_1y", "one_year"] },
];

interface ThemeOption {
  id: string;
  label: string;
}

interface RowData {
  [k: string]: any;
}

interface HubResponse {
  status?: string;
  tab?: string;
  theme?: string;
  generated_at?: string;
  fundamentals_cache_status?: string;
  quote_cache_status?: string;
  rows?: any;
  data?: any;
  items?: any;
  results?: any;
}

function pickArray(payload: any, keys: string[]): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const k of keys) {
    const v = payload?.[k];
    if (Array.isArray(v)) return v;
  }
  // try one level deep
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
  // case-insensitive fallback
  const want = [primary, ...aliases].map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""));
  for (const k of Object.keys(row)) {
    const norm = k.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (want.includes(norm)) return row[k];
  }
  return undefined;
}

function formatNumber(v: any, digits = 2): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(digits);
}

function formatPercent(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return String(v);
  const abs = Math.abs(n);
  // Heuristic: if magnitude <= 5 it's likely a fraction (e.g., 0.034 = 3.4%)
  const pct = abs <= 1.5 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

function classNames(...xs: Array<string | false | undefined | null>): string {
  return xs.filter(Boolean).join(" ");
}

function preferredDefaultTheme(themes: ThemeOption[]): string | undefined {
  if (themes.length === 0) return undefined;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const semi = themes.find((t) => norm(t.label).includes("semiconductor") || norm(t.id).includes("semiconductor"));
  if (semi) return semi.id;
  const clean = themes.find((t) => norm(t.label).includes("cleanenergy") || norm(t.id).includes("cleanenergy"));
  if (clean) return clean.id;
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

const SIGNAL_TO_COLUMN: Record<SignalKey, string> = {
  rs_2w: "rs_2w",
  rs_4w: "rs_4w",
  rs_10w: "rs_10w",
  rs_accel: "rs_accel",
  from_52w_high: "from_52w_high",
  accumulation: "accumulation",
  volume_surge: "volume_surge",
};

export default function ScreenerHub() {
  const [tab, setTab] = useState<TabKey>("thematic");
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [theme, setTheme] = useState<string>("");
  const [category, setCategory] = useState<Category>("Show all");
  const [scoreMode, setScoreMode] = useState<boolean>(true);
  const [cocFilter, setCocFilter] = useState<boolean>(false);
  const [activeSignals, setActiveSignals] = useState<Record<SignalKey, boolean>>({
    rs_2w: true,
    rs_4w: true,
    rs_10w: true,
    rs_accel: true,
    from_52w_high: true,
    accumulation: true,
    volume_surge: true,
  });
  const [rows, setRows] = useState<RowData[]>([]);
  const [meta, setMeta] = useState<{
    generated_at?: string;
    fundamentals_cache_status?: string;
    quote_cache_status?: string;
  }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [copied, setCopied] = useState<boolean>(false);
  const themeBootstrappedRef = useRef<boolean>(false);

  // Load themes
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
        // non-fatal: themes may be unavailable
        if (!cancelled) console.warn("[ScreenerHub] themes load failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (tab === "thematic" && theme) params.set("theme", theme);
    const cat = CATEGORY_PARAM[category];
    if (cat) params.set("category", cat);
    params.set("scoreMode", scoreMode ? "true" : "false");
    params.set("cocFilter", cocFilter ? "true" : "false");
    return `/api/screener-hub?${params.toString()}`;
  }, [tab, theme, category, scoreMode, cocFilter]);

  // Load rows whenever filters change
  useEffect(() => {
    // Skip thematic until a theme is set (or no themes available)
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
        });
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildUrl, tab, theme, themes.length]);

  const visibleColumns = useMemo(() => {
    return COLUMNS.filter((c) => {
      const sk = SIGNAL_TO_COLUMN[c.key as SignalKey];
      if (sk) return activeSignals[c.key as SignalKey];
      return true;
    });
  }, [activeSignals]);

  const sortedRows = useMemo(() => {
    if (!rows.length) return rows;
    const col = COLUMNS.find((c) => c.key === sortKey);
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
        const aBad = !Number.isFinite(na);
        const bBad = !Number.isFinite(nb);
        if (aBad && bBad) return 0;
        if (aBad) return 1;
        if (bBad) return -1;
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
      const col = COLUMNS.find((c) => c.key === key);
      setSortDir(col?.numeric ? "desc" : "asc");
    }
  };

  const copyTable = async () => {
    const headers = visibleColumns.map((c) => c.label).join("\t");
    const lines = sortedRows.map((row) =>
      visibleColumns
        .map((c) => {
          const v = getField(row, c.key, c.aliases);
          if (v === undefined || v === null) return "";
          return typeof v === "object" ? JSON.stringify(v) : String(v);
        })
        .join("\t"),
    );
    const text = [headers, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn("[ScreenerHub] clipboard write failed", e);
    }
  };

  const renderCell = (row: RowData, c: (typeof COLUMNS)[number]) => {
    const v = getField(row, c.key, c.aliases);
    if (c.key === "symbol") {
      const sym = v ?? "—";
      return <span className="font-semibold text-white">{String(sym)}</span>;
    }
    if (c.key === "history") {
      // Show a tiny placeholder/sparkline marker if backend provides any history hint
      const h = getField(row, "history", ["sparkline", "spark"]);
      if (Array.isArray(h) && h.length) {
        return <span className="text-purple-300/70 text-xs">{h.length} pts</span>;
      }
      return <span className="text-white/30">—</span>;
    }
    if (c.key === "category") {
      const cat = String(v ?? "").trim();
      if (!cat) return <span className="text-white/40">—</span>;
      const lc = cat.toLowerCase();
      const color =
        lc.includes("lead")
          ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
          : lc.includes("improv")
          ? "bg-sky-500/20 text-sky-300 border-sky-400/30"
          : lc.includes("weak")
          ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
          : lc.includes("lag")
          ? "bg-rose-500/20 text-rose-300 border-rose-400/30"
          : "bg-white/10 text-white/70 border-white/20";
      return (
        <span className={classNames("inline-block px-2 py-0.5 rounded text-xs border", color)}>
          {cat}
        </span>
      );
    }
    if (c.key === "coc") {
      const s = String(v ?? "").trim();
      if (!s) return <span className="text-white/40">—</span>;
      const isPos = /up|bull|pos|true|1/i.test(s);
      const isNeg = /down|bear|neg|false|0/i.test(s);
      return (
        <span
          className={classNames(
            "inline-block px-2 py-0.5 rounded text-xs border",
            isPos && "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
            isNeg && "bg-rose-500/20 text-rose-300 border-rose-400/30",
            !isPos && !isNeg && "bg-white/10 text-white/70 border-white/20",
          )}
        >
          {s}
        </span>
      );
    }
    if (c.key === "market_cap") {
      return <span>{formatNumber(v, 0)}</span>;
    }
    if (
      c.key === "change_1d" ||
      c.key === "change_7d" ||
      c.key === "change_30d" ||
      c.key === "change_ytd" ||
      c.key === "change_1y" ||
      c.key === "from_52w_high"
    ) {
      const n = typeof v === "string" ? Number(v) : v;
      const isNum = typeof n === "number" && Number.isFinite(n);
      const positive = isNum && n > 0;
      const negative = isNum && n < 0;
      return (
        <span
          className={classNames(
            positive && "text-emerald-300",
            negative && "text-rose-300",
            !isNum && "text-white/40",
          )}
        >
          {formatPercent(v)}
        </span>
      );
    }
    if (c.numeric) {
      return <span>{formatNumber(v)}</span>;
    }
    if (v === null || v === undefined || v === "") return <span className="text-white/40">—</span>;
    return <span>{String(v)}</span>;
  };

  return (
    <Card
      className="bg-gradient-to-b from-[#0c0717] to-[#070310] border-purple-500/20 text-white"
      data-testid="screener-hub-root"
    >
      <div className="p-4 sm:p-5 lg:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              Caelyn Screener Hub
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Multi-factor stock screening — RS, accumulation, volume, and CoC signals.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-white/50" data-testid="screener-hub-meta">
            {meta.generated_at && (
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
                {`Updated ${new Date(meta.generated_at).toLocaleString()}`}
              </span>
            )}
            {meta.fundamentals_cache_status && (
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
                {`Fund: ${meta.fundamentals_cache_status}`}
              </span>
            )}
            {meta.quote_cache_status && (
              <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5">
                {`Quote: ${meta.quote_cache_status}`}
              </span>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
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
              {/* Filters row (Thematic-style controls apply to all tabs for consistency, theme only for thematic) */}
              <div className="space-y-3">
                {tab === "thematic" && (
                  <div className="flex flex-wrap gap-2" data-testid="screener-hub-categories">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        data-testid={`screener-hub-category-${c.replace(/\s+/g, "-").toLowerCase()}`}
                        className={classNames(
                          "px-3 py-1.5 text-xs rounded-md border transition-colors",
                          category === c
                            ? "bg-purple-600/30 border-purple-400/50 text-white"
                            : "bg-black/40 border-white/10 text-white/70 hover:bg-purple-500/10 hover:text-white",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {tab === "thematic" && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-white/60">Theme</label>
                      <Select value={theme} onValueChange={setTheme}>
                        <SelectTrigger
                          className="w-[200px] bg-black/40 border-purple-500/20 text-white"
                          data-testid="screener-hub-theme"
                        >
                          <SelectValue placeholder={themes.length ? "Select theme" : "No themes available"} />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0c0717] border-purple-500/30 text-white">
                          {themes.map((t) => (
                            <SelectItem
                              key={t.id}
                              value={t.id}
                              data-testid={`screener-hub-theme-option-${t.id}`}
                            >
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Switch
                      id="screener-hub-coc"
                      checked={cocFilter}
                      onCheckedChange={setCocFilter}
                      data-testid="screener-hub-coc-toggle"
                    />
                    <label htmlFor="screener-hub-coc" className="text-xs text-white/70">
                      CoC Filter
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      id="screener-hub-score"
                      checked={scoreMode}
                      onCheckedChange={setScoreMode}
                      data-testid="screener-hub-score-toggle"
                    />
                    <label htmlFor="screener-hub-score" className="text-xs text-white/70">
                      Score Mode
                    </label>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={copyTable}
                      data-testid="screener-hub-copy"
                      variant="outline"
                      size="sm"
                      className="bg-black/40 border-purple-500/30 text-white hover:bg-purple-500/20"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                <div
                  className="flex flex-wrap items-center gap-x-4 gap-y-2"
                  data-testid="screener-hub-signals"
                >
                  <span className="text-xs uppercase tracking-wider text-white/40">Signals</span>
                  {SIGNALS.map((s) => (
                    <label
                      key={s.key}
                      className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer"
                    >
                      <Checkbox
                        checked={activeSignals[s.key]}
                        onCheckedChange={(v) =>
                          setActiveSignals((prev) => ({ ...prev, [s.key]: !!v }))
                        }
                        data-testid={`screener-hub-signal-${s.key}`}
                        className="border-purple-400/40 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                      />
                      {s.label}
                    </label>
                  ))}
                </div>

                <div
                  className="flex flex-wrap items-center gap-3 text-[11px] text-white/50"
                  data-testid="screener-hub-legend"
                >
                  <span className="font-medium text-white/60">Legend:</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> Leading
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-sky-400" /> Improving
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> Weakening
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-400" /> Lagging
                  </span>
                </div>
              </div>

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
                                  sortDir === "asc" ? (
                                    <ArrowUp className="w-3 h-3" />
                                  ) : (
                                    <ArrowDown className="w-3 h-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-30" />
                                )}
                              </span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody data-testid="screener-hub-tbody">
                      {loading && rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={visibleColumns.length}
                            className="px-3 py-10 text-center text-white/60"
                            data-testid="screener-hub-loading"
                          >
                            <span className="inline-flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                            </span>
                          </td>
                        </tr>
                      ) : error ? (
                        <tr>
                          <td
                            colSpan={visibleColumns.length}
                            className="px-3 py-8 text-center text-rose-300"
                            data-testid="screener-hub-error"
                          >
                            {error}
                          </td>
                        </tr>
                      ) : sortedRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={visibleColumns.length}
                            className="px-3 py-10 text-center text-white/50"
                            data-testid="screener-hub-empty"
                          >
                            No results.
                          </td>
                        </tr>
                      ) : (
                        sortedRows.map((row, i) => (
                          <tr
                            key={
                              (getField(row, "symbol", ["ticker", "stock"]) as string) ?? `row-${i}`
                            }
                            className="border-t border-white/5 hover:bg-purple-500/5"
                          >
                            {visibleColumns.map((c) => (
                              <td
                                key={c.key}
                                className="px-3 py-2 whitespace-nowrap text-white/90"
                                data-testid={`screener-hub-cell-${c.key}-${i}`}
                              >
                                {renderCell(row, c)}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
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
    </Card>
  );
}
