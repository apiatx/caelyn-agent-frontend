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
  return localStorage.getItem("caelyn_jwt") || sessionStorage.getItem("caelyn_jwt");
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

    // ── Theme Relative Strength — shared by Themes page + Home Theme Perf card ──
    pre(["themes-unified", "themes"], "/api/themes/relative-strength?timeframe=1D&classification=all", undefined, 5 * 60_000);

    // ── Watchlist ───────────────────────────────────────────────────────────
    pre(["/api/watchlist/list"], "/api/watchlist/list", { headers: authH() });
    // After getting the list, prefetch the first (Primary) watchlist so the
    // screener renders immediately on first visit — no 10-second blank wait.
    safeFetch("/api/watchlist/list", { headers: authH() }).then((listData) => {
      if (!Array.isArray(listData) || !listData[0]?.id) return;
      const primaryId = listData[0].id;
      qc.prefetchQuery({
        queryKey: ["/api/watchlist", primaryId],
        queryFn: () => safeFetch(`/api/watchlist/${primaryId}`, { headers: authH() }),
        staleTime: 2 * 60_000,
      });
    });

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
    qc.prefetchQuery({
      queryKey: ["predict-scored"],
      queryFn: async () => {
        const data = await safeFetch("/api/predict/scored?limit=200");
        if (!data) return [];
        const arr = Array.isArray(data) ? data : ((data as any).markets ?? (data as any).results ?? (data as any).scored ?? []);
        return arr.map((m: any) => ({
          ...m,
          composite_score: m.composite_score ?? m.score ?? undefined,
          question: m.question ?? m.title ?? m.market_title ?? undefined,
          yes_pct: m.yes_pct ?? (m.yes_price != null ? Math.round(m.yes_price * 100) : undefined),
          trap_risk_score: m.trap_risk_score ?? m.trap_score ?? undefined,
          execution_quality_score: m.execution_quality_score ?? m.exec_score ?? undefined,
          conviction_score: m.conviction_score ?? undefined,
          flow_score: m.flow_score ?? undefined,
          participation_quality_score: m.participation_quality_score ?? undefined,
        }));
      },
      staleTime: 90_000,
    });
    pre(["predict-signal-changes"],        "/api/predict/signal-changes",         undefined, 90_000);
    // Key aligned with Home page useQuery key so the prefetch deduplicates correctly
    pre(["/api/predict/investor/overview"], "/api/predict/investor/overview",      undefined, 5 * 60_000);

  }, [isAuthenticated, qc]); // re-run only if auth state changes

  return null;
}
