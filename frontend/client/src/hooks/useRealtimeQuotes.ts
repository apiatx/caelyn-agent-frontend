import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export type RealtimeQuoteSource =
  | "tradier"
  | "public_fallback"
  | "fmp_fallback"
  | "twelvedata_fallback"
  | "lkg"
  | "unknown";

export type MarketSession = "regular" | "pre" | "post" | "closed" | "unknown";

export interface RealtimeQuote {
  symbol: string;
  price?: number | null;
  last?: number | null;
  change?: number | null;
  change_percent?: number | null;
  volume?: number | null;
  bid?: number | null;
  ask?: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  prev_close?: number | null;

  source?: RealtimeQuoteSource | string;
  is_realtime?: boolean;
  is_live_backup?: boolean;
  is_stale?: boolean;
  market_session?: MarketSession | string;

  quote_timestamp?: string | number | null;
  updated_at?: string | number | null;
  staleness_seconds?: number | null;

  [key: string]: unknown;
}

export interface RealtimeQuotesResponse {
  quotes?: RealtimeQuote[];
  data?: RealtimeQuote[];
  market_session?: string;
  [key: string]: unknown;
}

export interface UseRealtimeQuotesOptions {
  enabled?: boolean;
  refreshMs?: number;
  staleWhileLoading?: boolean;
}

export interface UseRealtimeQuotesResult {
  quotesBySymbol: Record<string, RealtimeQuote>;
  isLoading: boolean;
  error: unknown;
  lastUpdated: Date | null;
  hasStaleQuotes: boolean;
  sourcesSummary: Record<string, number>;
}

const REFRESH_REGULAR_MS = 20_000;
const REFRESH_PREPOST_MS = 45_000;
const REFRESH_CLOSED_MS = 3 * 60_000;

function chooseRefreshInterval(quotes: RealtimeQuote[] | undefined, override?: number): number {
  if (typeof override === "number" && override > 0) return override;
  if (!quotes || quotes.length === 0) return REFRESH_REGULAR_MS;

  let hasRegular = false;
  let hasPrePost = false;
  let hasClosed = false;
  for (const q of quotes) {
    const s = (q.market_session || "").toString().toLowerCase();
    if (s === "regular") hasRegular = true;
    else if (s === "pre" || s === "post" || s === "premarket" || s === "afterhours") hasPrePost = true;
    else if (s === "closed") hasClosed = true;
  }
  if (hasRegular) return REFRESH_REGULAR_MS;
  if (hasPrePost) return REFRESH_PREPOST_MS;
  if (hasClosed) return REFRESH_CLOSED_MS;
  return REFRESH_REGULAR_MS;
}

function dedupeAndNormalizeSymbols(symbols: string[]): string[] {
  if (!Array.isArray(symbols)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of symbols) {
    if (typeof raw !== "string") continue;
    const sym = raw.trim().toUpperCase();
    if (!sym) continue;
    if (seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
  }
  return out.sort();
}

async function fetchRealtimeQuotes(symbols: string[]): Promise<RealtimeQuotesResponse> {
  if (symbols.length === 0) return { quotes: [] };

  // Prefer POST when many symbols (avoid query-string limits); GET otherwise.
  const useGet = symbols.length <= 20;
  const url = useGet
    ? `/api/market/realtime-quotes?symbols=${encodeURIComponent(symbols.join(","))}`
    : `/api/market/realtime-quotes`;

  const init: RequestInit = useGet
    ? { method: "GET", credentials: "include" }
    : {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols }),
      };

  const res = await fetch(url, init);
  if (!res.ok) {
    const text = (await res.text().catch(() => "")) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  const json = (await res.json()) as RealtimeQuotesResponse | RealtimeQuote[];
  if (Array.isArray(json)) return { quotes: json };
  return json;
}

export function useRealtimeQuotes(
  symbols: string[],
  options: UseRealtimeQuotesOptions = {}
): UseRealtimeQuotesResult {
  const { enabled = true, refreshMs, staleWhileLoading = true } = options;

  // Memoize the deduped/sorted symbol list so identical sets don't churn the query key.
  const dedupedSymbols = useMemo(() => dedupeAndNormalizeSymbols(symbols), [symbols.join("|")]);
  const symbolsKey = dedupedSymbols.join(",");

  const queryEnabled = enabled && dedupedSymbols.length > 0;

  const query = useQuery<RealtimeQuotesResponse>({
    queryKey: ["/api/market/realtime-quotes", symbolsKey],
    queryFn: () => fetchRealtimeQuotes(dedupedSymbols),
    enabled: queryEnabled,
    // Reasonable defaults; refetchInterval uses live data to slow down off-hours.
    staleTime: REFRESH_REGULAR_MS,
    refetchInterval: (q) => {
      const data = q.state.data as RealtimeQuotesResponse | undefined;
      const list = data?.quotes ?? data?.data ?? [];
      return chooseRefreshInterval(list, refreshMs);
    },
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error instanceof Error) {
        const m = error.message.match(/^(\d{3}):/);
        if (m) {
          const status = parseInt(m[1], 10);
          if (status >= 400 && status < 500 && status !== 429) return false;
        }
      }
      return failureCount < 1;
    },
    placeholderData: staleWhileLoading ? (prev) => prev : undefined,
  });

  return useMemo(() => {
    const list = (query.data?.quotes ?? query.data?.data ?? []) as RealtimeQuote[];
    const quotesBySymbol: Record<string, RealtimeQuote> = {};
    let hasStale = false;
    const sourcesSummary: Record<string, number> = {};

    for (const q of list) {
      if (!q || typeof q.symbol !== "string") continue;
      const key = q.symbol.toUpperCase();
      quotesBySymbol[key] = q;
      if (q.is_stale) hasStale = true;
      const src = (q.source || "unknown") as string;
      sourcesSummary[src] = (sourcesSummary[src] || 0) + 1;
    }

    return {
      quotesBySymbol,
      isLoading: query.isLoading,
      error: query.error,
      lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
      hasStaleQuotes: hasStale,
      sourcesSummary,
    };
  }, [query.data, query.isLoading, query.error, query.dataUpdatedAt]);
}

export default useRealtimeQuotes;
