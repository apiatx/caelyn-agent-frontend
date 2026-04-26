import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Search, Star, ChevronDown, X, Download, Link, RotateCcw, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type CompareSymbol = {
  symbol: string;
  name?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
};

type CompareMetricKey =
  | "market_cap" | "revenue" | "revenue_growth" | "gross_profit"
  | "gross_margin" | "profit_margin" | "eps_diluted" | "operating_income"
  | "net_income" | "ebitda" | "free_cash_flow" | "total_debt"
  | "ps_ratio" | "pe_ratio" | "recent_news";

type CompareRange = "1Y" | "3Y" | "5Y";

type MetricDef = { key: CompareMetricKey; label: string; unit: string };

type SearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
};

type SeriesPoint = {
  date: string;
  fiscalYear?: number;
  value: number | null;
  formatted?: string;
};

type SeriesEntry = {
  symbol: string;
  name?: string;
  points: SeriesPoint[];
  latest?: { date: string; value: number | null; formatted?: string };
};

type SnapshotRow = {
  symbol: string;
  name?: string;
  market_cap?: number | null;
  revenue?: number | null;
  revenue_growth?: number | null;
  gross_margin?: number | null;
  profit_margin?: number | null;
  eps_diluted?: number | null;
  ebitda?: number | null;
  free_cash_flow?: number | null;
  total_debt?: number | null;
  ps_ratio?: number | null;
  pe_ratio?: number | null;
  [key: string]: any;
};

type NewsItem = { headline?: string; title?: string; source?: string; date?: string; summary?: string; url?: string };

type CompareResponse = {
  metric?: { key: string; label: string; unit: string; period?: string };
  range?: string;
  symbols?: string[];
  series?: SeriesEntry[];
  snapshot?: SnapshotRow[];
  news?: Record<string, NewsItem[]>;
  meta?: { cached?: boolean; generatedAt?: string; warnings?: string[] };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STOCK_COMPARE_METRICS: MetricDef[] = [
  { key: "market_cap",       label: "Market Cap",       unit: "currency" },
  { key: "revenue",          label: "Revenue",          unit: "currency" },
  { key: "revenue_growth",   label: "Revenue Growth",   unit: "percent"  },
  { key: "gross_profit",     label: "Gross Profit",     unit: "currency" },
  { key: "gross_margin",     label: "Gross Margin",     unit: "percent"  },
  { key: "profit_margin",    label: "Profit Margin",    unit: "percent"  },
  { key: "eps_diluted",      label: "EPS (Diluted)",    unit: "number"   },
  { key: "operating_income", label: "Operating Income", unit: "currency" },
  { key: "net_income",       label: "Net Income",       unit: "currency" },
  { key: "ebitda",           label: "EBITDA",           unit: "currency" },
  { key: "free_cash_flow",   label: "Free Cash Flow",   unit: "currency" },
  { key: "total_debt",       label: "Total Debt",       unit: "currency" },
  { key: "ps_ratio",         label: "P/S Ratio",        unit: "ratio"    },
  { key: "pe_ratio",         label: "P/E Ratio",        unit: "ratio"    },
  { key: "recent_news",      label: "Recent News",      unit: "news"     },
];

const DEFAULT_STARRED: CompareMetricKey[] = [
  "revenue", "gross_profit", "profit_margin", "eps_diluted",
  "operating_income", "ebitda", "free_cash_flow", "total_debt", "market_cap",
];

const RANGES: CompareRange[] = ["1Y", "3Y", "5Y"];

const LEGACY_RANGE_COERCE: Record<string, CompareRange> = {
  "1M": "1Y", "3M": "1Y", "6M": "1Y", "YTD": "1Y",
  "10Y": "5Y", "MAX": "5Y", "ALL": "5Y",
};

const CHIP_COLORS = [
  "#3b82f6", // blue
  "#f97316", // orange
  "#a855f7", // purple
  "#22c55e", // green
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#eab308", // yellow
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#9ca3af", // gray
  "#84cc16", // lime
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#8b5cf6", // violet
];

const LS_KEY = "stockCompare_starredMetrics";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatCurrencyCompact(v: number | null | undefined): string {
  if (v == null || isNaN(Number(v))) return "N/A";
  const n = Number(v);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${abs.toFixed(2)}`;
}

function formatPercent(v: number | null | undefined): string {
  if (v == null || isNaN(Number(v))) return "N/A";
  const n = Number(v);
  return `${(n * 100).toFixed(1)}%`;
}

function formatRatio(v: number | null | undefined): string {
  if (v == null || isNaN(Number(v))) return "N/A";
  return `${Number(v).toFixed(2)}x`;
}

function formatNumber(v: number | null | undefined): string {
  if (v == null || isNaN(Number(v))) return "N/A";
  return Number(v).toFixed(2);
}

function formatValue(v: number | null | undefined, unit: string): string {
  if (v == null) return "N/A";
  switch (unit) {
    case "currency": return formatCurrencyCompact(v);
    case "percent":  return formatPercent(v);
    case "ratio":    return formatRatio(v);
    default:         return formatNumber(v);
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TickerChip({ sym, color, onRemove }: { sym: string; color: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white"
      style={{ backgroundColor: color + "33", border: `1px solid ${color}66`, color }}
    >
      {sym}
      <button onClick={onRemove} className="ml-0.5 opacity-70 hover:opacity-100">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function DropdownMenu({
  open,
  onClose,
  children,
  width = 220,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      style={{ width, zIndex: 200 }}
      className="absolute top-full mt-1 left-0 bg-[#111318] border border-white/10 rounded-lg shadow-xl py-1 overflow-hidden"
    >
      {children}
    </div>
  );
}

// ─── Snapshot Table ───────────────────────────────────────────────────────────

const SNAPSHOT_COLS: { key: string; label: string; unit: string }[] = [
  { key: "market_cap",     label: "Market Cap",     unit: "currency" },
  { key: "revenue",        label: "Revenue",        unit: "currency" },
  { key: "revenue_growth", label: "Rev Growth",     unit: "percent"  },
  { key: "gross_margin",   label: "Gross Margin",   unit: "percent"  },
  { key: "profit_margin",  label: "Profit Margin",  unit: "percent"  },
  { key: "eps_diluted",    label: "EPS",            unit: "number"   },
  { key: "ebitda",         label: "EBITDA",         unit: "currency" },
  { key: "free_cash_flow", label: "FCF",            unit: "currency" },
  { key: "total_debt",     label: "Total Debt",     unit: "currency" },
  { key: "ps_ratio",       label: "P/S",            unit: "ratio"    },
  { key: "pe_ratio",       label: "P/E",            unit: "ratio"    },
];

function SnapshotTable({
  snapshot,
  symbols,
  colors,
}: {
  snapshot: SnapshotRow[];
  symbols: CompareSymbol[];
  colors: Record<string, string>;
}) {
  if (!snapshot?.length) return null;

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Snapshot Comparison</div>
      <table className="w-full text-xs border-collapse min-w-[700px]">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-2 px-2 text-white/50 font-medium">Ticker</th>
            <th className="text-left py-2 px-2 text-white/50 font-medium">Company</th>
            {SNAPSHOT_COLS.map((c) => (
              <th key={c.key} className="text-right py-2 px-2 text-white/50 font-medium whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {snapshot.map((row, i) => {
            const color = colors[row.symbol] || CHIP_COLORS[i % CHIP_COLORS.length];
            return (
              <tr key={row.symbol} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="py-2 px-2">
                  <span className="font-bold" style={{ color }}>{row.symbol}</span>
                </td>
                <td className="py-2 px-2 text-white/70 truncate max-w-[120px]">{row.name || "—"}</td>
                {SNAPSHOT_COLS.map((c) => (
                  <td key={c.key} className="py-2 px-2 text-right text-white/80 tabular-nums">
                    {formatValue(row[c.key], c.unit)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Recent News Panel ────────────────────────────────────────────────────────

function NewsPanel({
  news,
  symbols,
  colors,
  limit = 3,
}: {
  news: Record<string, NewsItem[]>;
  symbols: CompareSymbol[];
  colors: Record<string, string>;
  limit?: number;
}) {
  const syms = symbols.map((s) => s.symbol);
  const hasNews = syms.some((sym) => (news[sym]?.length ?? 0) > 0);
  if (!hasNews) return null;

  return (
    <div className="mt-6">
      <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Recent News</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {syms.map((sym) => {
          const items = news[sym] || [];
          const color = colors[sym] || "#3b82f6";
          const symInfo = symbols.find((s) => s.symbol === sym);
          if (!items.length) return null;
          return (
            <div key={sym} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="text-xs font-bold mb-2" style={{ color }}>
                {sym}{symInfo?.name ? ` — ${symInfo.name}` : ""}
              </div>
              <div className="space-y-2">
                {items.slice(0, limit).map((item, i) => (
                  <div key={i} className="text-xs">
                    <div className="text-white/80 font-medium leading-snug">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {item.headline || item.title || "—"}
                        </a>
                      ) : (item.headline || item.title || "—")}
                    </div>
                    <div className="text-white/40 mt-0.5">
                      {[item.source, item.date].filter(Boolean).join(" · ")}
                    </div>
                    {item.summary && (
                      <div className="text-white/50 mt-0.5 leading-snug line-clamp-2">{item.summary}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── News Compare View (when metric = recent_news) ────────────────────────────

function NewsCompareView({
  news,
  symbols,
  colors,
}: {
  news: Record<string, NewsItem[]>;
  symbols: CompareSymbol[];
  colors: Record<string, string>;
}) {
  return (
    <div className="mt-4">
      <div className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">News Comparison</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {symbols.map((s) => {
          const color = colors[s.symbol] || "#3b82f6";
          const items = news[s.symbol] || [];
          return (
            <div key={s.symbol} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="text-sm font-bold mb-2" style={{ color }}>
                {s.symbol}{s.name ? ` — ${s.name}` : ""}
              </div>
              {items.length === 0 ? (
                <div className="text-xs text-white/40">No recent news</div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="text-xs border-b border-white/5 pb-2 last:border-0 last:pb-0">
                      <div className="text-white/80 font-medium leading-snug">
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {item.headline || item.title || "—"}
                          </a>
                        ) : (item.headline || item.title || "—")}
                      </div>
                      <div className="text-white/40 mt-0.5">{[item.source, item.date].filter(Boolean).join(" · ")}</div>
                      {item.summary && <div className="text-white/50 mt-0.5 line-clamp-3">{item.summary}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CompareTooltip({ active, payload, label, unit, seriesMap }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl text-xs min-w-[180px]">
      <div className="text-gray-500 mb-2 font-medium border-b border-gray-100 pb-1.5">
        {String(label)}
      </div>
      {payload.map((p: any) => {
        const name = seriesMap?.[p.dataKey] || p.dataKey;
        return (
          <div key={p.dataKey} className="flex items-start gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 mt-0.5" style={{ backgroundColor: p.color }} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800">{p.dataKey}</div>
              {name && name !== p.dataKey && (
                <div className="text-gray-400 truncate">{name}</div>
              )}
            </div>
            <span className="font-semibold text-gray-900 ml-2 tabular-nums">
              {p.value != null ? formatValue(p.value, unit) : "N/A"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StockCompareSection() {
  const { toast } = useToast();

  // ── State ──────────────────────────────────────────────────────────────────

  const [symbols, setSymbols] = useState<CompareSymbol[]>([]);
  const [metric, setMetric] = useState<MetricDef>(STOCK_COMPARE_METRICS[1]); // Revenue default
  const [range, setRange] = useState<CompareRange>("5Y");
  const [period, setPeriod] = useState<"annual" | "quarterly">("annual");

  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [metricOpen, setMetricOpen] = useState(false);
  const [metricSearch, setMetricSearch] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);

  const [starred, setStarred] = useState<CompareMetricKey[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as CompareMetricKey[];
    } catch { /* ignore */ }
    return DEFAULT_STARRED;
  });

  // Color assignment per symbol (stable)
  const colorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    symbols.forEach((s, i) => { map[s.symbol] = CHIP_COLORS[i % CHIP_COLORS.length]; });
    return map;
  }, [symbols]);

  // ── URL hydration on mount ─────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compareParam = params.get("compare");
    const metricParam  = params.get("metric");
    const rangeParam   = params.get("range");
    const periodParam  = params.get("period");

    if (compareParam) {
      const syms = compareParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      setSymbols(syms.slice(0, 15).map((s) => ({ symbol: s })));
    } else {
      // default tickers from spec
      setSymbols([{ symbol: "INTT" }, { symbol: "TRT" }, { symbol: "NNBR" }]);
    }
    if (metricParam) {
      const m = STOCK_COMPARE_METRICS.find((x) => x.key === metricParam);
      if (m) setMetric(m);
    }
    if (rangeParam) {
      const coerced = LEGACY_RANGE_COERCE[rangeParam] ?? (RANGES.includes(rangeParam as CompareRange) ? rangeParam as CompareRange : null);
      if (coerced) setRange(coerced);
    }
    if (periodParam === "quarterly" || periodParam === "annual") {
      setPeriod(periodParam);
    }
  }, []);

  // ── Save starred to localStorage ───────────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(starred)); } catch { /* ignore */ }
  }, [starred]);

  // ── Autocomplete search (debounced) ────────────────────────────────────────

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await fetch(`/api/fundamentals/compare/search?q=${encodeURIComponent(searchQuery)}&limit=10`);
        const data = await r.json();
        setSearchResults(data.results || []);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  // ── Compare fetch ──────────────────────────────────────────────────────────

  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = useCallback(async (
    syms: CompareSymbol[],
    m: MetricDef,
    r: CompareRange,
    p: "annual" | "quarterly",
  ) => {
    if (!syms.length) { setCompareData(null); return; }
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/fundamentals/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbols: syms.map((s) => s.symbol),
          metric: m.key,
          period: p,
          range: r,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || "Could not load comparison data. Try removing unsupported tickers or switching to 5Y.");
      }
      const data: CompareResponse = await resp.json();
      setCompareData(data);
    } catch (e: any) {
      setError(e.message || "Failed to fetch comparison data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger with debounce on symbols changes, immediate on metric/range/period
  useEffect(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => doFetch(symbols, metric, range, period), 400);
    return () => { if (fetchTimer.current) clearTimeout(fetchTimer.current); };
  }, [symbols, metric, range, period, doFetch]);

  // ── Actions ────────────────────────────────────────────────────────────────

  function addSymbol(result: SearchResult) {
    if (symbols.length >= 15) {
      toast({ title: "You can compare up to 15 tickers at once.", variant: "destructive" });
      return;
    }
    if (symbols.some((s) => s.symbol === result.symbol)) {
      setSearchQuery("");
      setSearchOpen(false);
      return;
    }
    setSymbols((prev) => [
      ...prev,
      { symbol: result.symbol, name: result.name, exchange: result.exchange, sector: result.sector, industry: result.industry },
    ]);
    setSearchQuery("");
    setSearchOpen(false);
  }

  function removeSymbol(sym: string) {
    setSymbols((prev) => prev.filter((s) => s.symbol !== sym));
  }

  function toggleStar(key: CompareMetricKey) {
    setStarred((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function copyLink() {
    const params = new URLSearchParams({
      compare: symbols.map((s) => s.symbol).join(","),
      metric:  metric.key,
      range,
      period,
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(
      () => toast({ title: "Comparison link copied!" }),
      () => toast({ title: "Could not copy link", variant: "destructive" }),
    );
    setOptionsOpen(false);
  }

  function exportCSV() {
    const snap = compareData?.snapshot || [];
    if (!snap.length) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    const cols = ["symbol", "name", ...SNAPSHOT_COLS.map((c) => c.key)];
    const header = cols.join(",");
    const rows = snap.map((row) =>
      cols.map((c) => {
        const v = row[c];
        return v == null ? "" : String(v);
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stock-compare-${metric.key}-${range}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    setOptionsOpen(false);
  }

  // ── Chart data ─────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    const allSeries = compareData?.series || [];
    if (!allSeries.length) return [];

    // Wide-format keyed by fiscal year so all tickers share the same x-axis row.
    // Different tickers often have slightly different fiscal year-end dates; using
    // the year string instead of the full ISO date prevents each ticker from
    // getting its own isolated row (which makes Recharts draw nothing).
    const rowsByYear = new Map<string, Record<string, any>>();

    for (const s of allSeries) {
      const symbol = s.symbol;
      if (!symbol || !Array.isArray(s.points)) continue;
      for (const point of s.points) {
        if (typeof point.value !== "number") continue;
        const year =
          point.fiscalYear?.toString() ||
          (point.date ? String(point.date).slice(0, 4) : undefined);
        if (!year) continue;
        if (!rowsByYear.has(year)) rowsByYear.set(year, { year });
        const row = rowsByYear.get(year)!;
        row[symbol] = point.value;
        row[`${symbol}Fmt`] = point.formatted;
        row[`${symbol}Name`] = s.name;
      }
    }

    return Array.from(rowsByYear.values()).sort(
      (a, b) => Number(a.year) - Number(b.year)
    );
  }, [compareData]);

  const series = compareData?.series || [];
  const snapshot = compareData?.snapshot || [];
  const news = compareData?.news || {};
  const warnings = compareData?.meta?.warnings || [];
  const isNewsMetric = metric.key === "recent_news";

  // Symbols that have ≥2 valid numeric points in the wide-format chart data —
  // Recharts needs at least two points to draw a connected line.
  const validSymbols = useMemo(() =>
    symbols
      .map((s) => s.symbol)
      .filter((sym) => chartData.filter((row) => typeof row[sym] === "number").length >= 2),
    [symbols, chartData]
  );

  // True only when every series has zero chartable points (and we have data back)
  const allSeriesEmpty = series.length > 0 && validSymbols.length === 0;

  // Filtered metric list for dropdown
  const filteredMetrics = STOCK_COMPARE_METRICS.filter((m) =>
    m.label.toLowerCase().includes(metricSearch.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 leading-tight">Stock Compare</h2>
        <div className="mt-1 h-0.5 w-16 bg-blue-500 rounded-full" />
      </div>

      <div className="p-5">
        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Ticker chips + input */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
            {symbols.map((s) => (
              <TickerChip
                key={s.symbol}
                sym={s.symbol}
                color={colorMap[s.symbol] || CHIP_COLORS[0]}
                onRemove={() => removeSymbol(s.symbol)}
              />
            ))}
            <div className="relative flex items-center flex-1 min-w-[120px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length) setSearchOpen(true); }}
                placeholder={symbols.length === 0 ? "Search ticker or company..." : "Add ticker..."}
                className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-full"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-1" />

              {/* Autocomplete dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 min-w-[260px]"
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {searchLoading && (
                    <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
                  )}
                  {searchResults.map((r) => (
                    <button
                      key={r.symbol}
                      onClick={() => addSymbol(r)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors"
                    >
                      <div className="text-xs font-bold text-gray-800">{r.symbol} — {r.name}</div>
                      <div className="text-xs text-gray-400">
                        {[r.exchange, r.sector || r.industry].filter(Boolean).join(" · ")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metric dropdown */}
          <div className="relative">
            <button
              onClick={() => { setMetricOpen((o) => !o); setOptionsOpen(false); setMetricSearch(""); }}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              {metric.label}
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <DropdownMenu open={metricOpen} onClose={() => setMetricOpen(false)} width={240}>
              <div className="px-2 py-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1">
                  <Search className="w-3 h-3 text-white/40" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Quick search..."
                    value={metricSearch}
                    onChange={(e) => setMetricSearch(e.target.value)}
                    className="bg-transparent text-xs text-white/80 placeholder-white/30 outline-none flex-1"
                  />
                </div>
              </div>
              <div className="max-h-56 overflow-y-auto py-1">
                {filteredMetrics.map((m) => (
                  <div
                    key={m.key}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-white/5 transition-colors cursor-pointer ${m.key === metric.key ? "text-blue-400" : "text-white/80"}`}
                  >
                    <span
                      className="flex-1"
                      onClick={() => { setMetric(m); setMetricOpen(false); setMetricSearch(""); }}
                    >
                      {m.label}
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); toggleStar(m.key); }}
                      className={`ml-2 transition-colors cursor-pointer ${starred.includes(m.key) ? "text-yellow-400" : "text-white/20 hover:text-white/50"}`}
                    >
                      <Star className="w-3 h-3" fill={starred.includes(m.key) ? "currentColor" : "none"} />
                    </span>
                  </div>
                ))}
              </div>
            </DropdownMenu>
          </div>

          {/* Options dropdown */}
          <div className="relative">
            <button
              onClick={() => { setOptionsOpen((o) => !o); setMetricOpen(false); }}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
            >
              Options
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            <DropdownMenu open={optionsOpen} onClose={() => setOptionsOpen(false)} width={200}>
              <button
                onClick={() => { setSymbols([]); setOptionsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-white/40" />
                Reset tickers
              </button>
              <button
                onClick={copyLink}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/5 transition-colors"
              >
                <Link className="w-3.5 h-3.5 text-white/40" />
                Copy comparison link
              </button>
              <button
                onClick={exportCSV}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-white/40" />
                Export CSV
              </button>
              <button
                onClick={() => { setPeriod((p) => p === "annual" ? "quarterly" : "annual"); setOptionsOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-white/40" />
                Switch to {period === "annual" ? "quarterly" : "annual"}
              </button>
            </DropdownMenu>
          </div>
        </div>

        {/* Period badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded font-medium uppercase tracking-wide">
            {period}
          </span>
        </div>

        {/* Time range buttons */}
        <div className="flex flex-wrap gap-1 mb-5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                range === r
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Backend warnings */}
        {warnings.length > 0 && (
          <div className="text-xs text-amber-600/80 mb-3 space-y-0.5">
            {warnings.map((w, i) => (
              <div key={i} className="italic">{w}</div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {symbols.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Search className="w-10 h-10 mb-3 opacity-30" />
            <div className="text-sm">Add up to 15 tickers to compare fundamentals.</div>
          </div>
        )}

        {/* Loading state */}
        {symbols.length > 0 && loading && (
          <div className="h-64 flex items-center justify-center">
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading comparison data…
            </div>
          </div>
        )}

        {/* Error state */}
        {symbols.length > 0 && !loading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-4">
            {error}
          </div>
        )}

        {/* Chart + data */}
        {symbols.length > 0 && !loading && !error && compareData && (
          <>
            {isNewsMetric ? (
              <NewsCompareView news={news} symbols={symbols} colors={colorMap} />
            ) : (
              <>
                {/* Legend + chart title */}
                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <div className="flex flex-wrap gap-3">
                    {series.map((s, i) => {
                      const color = colorMap[s.symbol] || CHIP_COLORS[i % CHIP_COLORS.length];
                      const hasData = validSymbols.includes(s.symbol);
                      return (
                        <div key={s.symbol} className={`flex items-center gap-1.5 text-xs ${hasData ? "text-gray-600" : "text-gray-400"}`}>
                          <span className="w-3 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: hasData ? color : "#d1d5db" }} />
                          <span className={`font-semibold ${hasData ? "text-gray-800" : "text-gray-400"}`}>{s.symbol}</span>
                          {s.name && <span className="text-gray-400 hidden sm:inline">{s.name}</span>}
                          {!hasData && <span className="text-gray-400 italic">(no data)</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="ml-auto text-xs font-semibold text-gray-500">{metric.label}</div>
                </div>

                {/* All-empty state */}
                {allSeriesEmpty ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <div className="text-sm">No chartable data returned for these tickers. Try removing unsupported tickers or switching to 5Y.</div>
                  </div>
                ) : (
                  /* Chart */
                  <div className="w-full" style={{ height: 520 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 24, right: 48, left: 24, bottom: 16 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis
                          dataKey="year"
                          type="category"
                          allowDuplicatedCategory={false}
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          tickFormatter={(v: number) => formatValue(v, metric.unit)}
                          width={68}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          content={
                            <CompareTooltip
                              unit={metric.unit}
                              seriesMap={Object.fromEntries(series.map((s) => [s.symbol, s.name || ""]))}
                            />
                          }
                        />
                        {validSymbols.map((sym) => {
                          const color = colorMap[sym] || CHIP_COLORS[symbols.findIndex((s) => s.symbol === sym) % CHIP_COLORS.length];
                          return (
                            <Line
                              key={sym}
                              type="linear"
                              dataKey={sym}
                              name={sym}
                              stroke={color}
                              strokeWidth={3}
                              dot={{ r: 3, strokeWidth: 0, fill: color }}
                              activeDot={{ r: 5, strokeWidth: 0 }}
                              connectNulls={true}
                              isAnimationActive={false}
                            />
                          );
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Snapshot table */}
                {snapshot.length > 0 && (
                  <SnapshotTable snapshot={snapshot} symbols={symbols} colors={colorMap} />
                )}

                {/* Recent news panel */}
                {Object.keys(news).length > 0 && (
                  <NewsPanel news={news} symbols={symbols} colors={colorMap} limit={3} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
