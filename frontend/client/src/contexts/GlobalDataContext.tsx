/**
 * GlobalDataContext
 *
 * Prefetches data for all major pages the moment the user is authenticated,
 * so every page loads with data already in the React Query cache — no
 * loading states on first visit.
 *
 * Strategy:
 *   - React Query pages (Hyperliquid, Bittensor, Sector Rotation, Watchlist,
 *     Macro, NotifAI, Prophetik): populate via queryClient.prefetchQuery()
 *     using the exact same queryKey each page's useQuery() uses.
 *   - Renders nothing (null) — pure side-effect component.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToken(): string | null {
  return localStorage.getItem("caelyn_token") || sessionStorage.getItem("caelyn_token");
}

function authH(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function safeFetch(url: string, init?: RequestInit): Promise<unknown> {
  try {
    const r = await fetch(url, init);
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GlobalPrefetch component
// ---------------------------------------------------------------------------

export function GlobalPrefetch() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Helper: fire prefetchQuery only if the cache is empty / stale
    const pre = (
      queryKey: unknown[],
      url: string,
      init?: RequestInit,
      staleTime = 5 * 60_000,
    ) => {
      qc.prefetchQuery({
        queryKey,
        queryFn: () => safeFetch(url, init),
        staleTime,
      });
    };

    // ── Macro Dashboard ─────────────────────────────────────────────────────
    pre(["/api/macro/rates"],       "/api/macro/rates",       undefined, 2 * 60_000);
    pre(["/api/macro/spy-history"], "/api/macro/spy-history", undefined, 5 * 60_000);

    // ── Sector Rotation ─────────────────────────────────────────────────────
    pre(["sector-rotation-dashboard"], "/api/sector-rotation/dashboard?include_analysis=false", undefined, 2 * 60_000);
    pre(["sector-rotation-analysis"],  "/api/sector-rotation/analysis",  undefined, 10 * 60_000);

    // ── Watchlist ───────────────────────────────────────────────────────────
    pre(["/api/watchlist/list"], "/api/watchlist/list", { headers: authH() });

    // ── Hyperliquid ─────────────────────────────────────────────────────────
    pre(["hl-screener", "perp"],  "/api/hyperliquid/screener?market_type=perp&limit=200", undefined, 14_000);
    pre(["hl-advanced-signals"],  "/api/hyperliquid/signals",              undefined, 30_000);
    pre(["tsmom-signals"],        "/api/hyperliquid/tsmom-signals?top_n=60", undefined, 60_000);

    // ── Bittensor ───────────────────────────────────────────────────────────
    pre(["/api/bittensor/dashboard"],                         "/api/bittensor/dashboard",                         undefined, 45_000);
    pre(["/api/bittensor/price/history"],                     "/api/bittensor/price/history",                     undefined, 5 * 60_000);
    pre(["/api/bittensor/blocks/history?scale=hours&points=30"], "/api/bittensor/blocks/history?scale=hours&points=30", undefined, 5 * 60_000);

    // ── NotifAI ─────────────────────────────────────────────────────────────
    pre(["notifai-weekly-summary"], "/api/notifai/weekly-summary", { headers: authH() }, 10 * 60_000);
    pre(["notifai-the-brief"],      "/api/notifai/the-brief",      { headers: authH() }, 10 * 60_000);
    pre(["notifai-news", "finance"],"/api/proxy/news/feed?category=finance", undefined, 5 * 60_000);

    // ── Prophetik ───────────────────────────────────────────────────────────
    pre(["predict-signals"],         "/api/predict/signals",         undefined, 60_000);
    pre(["predict-scored"],          "/api/predict/scored?limit=200", undefined, 90_000);
    pre(["predict-signal-changes"],  "/api/predict/signal-changes",  undefined, 90_000);
    pre(["predict-investor-overview"],"/api/predict/investor/overview", undefined, 5 * 60_000);

  }, [isAuthenticated, qc]); // re-run only if auth state changes

  return null;
}
