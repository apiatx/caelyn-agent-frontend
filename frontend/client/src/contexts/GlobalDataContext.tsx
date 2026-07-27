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

/**
 * Failed upstream requests must reject. Returning null here makes React Query
 * cache a transient 5xx as successful data, which can leave multiple pages in
 * an unavailable/empty state even after FastAPI has recovered.
 */
async function safeFetch(url: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(url, init);
  if (!r.ok) {
    let detail = "";
    try {
      detail = (await r.text()).slice(0, 240);
    } catch {
      // Preserve the HTTP status even when the error body cannot be read.
    }
    throw new Error(`Prefetch failed: ${r.status} ${r.statusText} ${url}${detail ? ` — ${detail}` : ""}`);
  }
  return r.json();
}

// ---------------------------------------------------------------------------
// GlobalPrefetch component
// ---------------------------------------------------------------------------

export function GlobalPrefetch() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Helper: fire prefetchQuery only if the cache is empty / stale.
    // Remove legacy poisoned null entries before refetching.
    const pre = (
      queryKey: unknown[],
      url: string,
      init?: RequestInit,
      staleTime = 5 * 60_000,
    ) => {
      if (qc.getQueryData(queryKey) === null) {
        qc.removeQueries({ queryKey, exact: true });
      }
      qc.prefetchQuery({
        queryKey,
        queryFn: () => safeFetch(url, init),
        staleTime,
        retry: 2,
        retryDelay: attempt => Math.min(750 * 2 ** attempt, 3_000),
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
    // After getting the list, prefetch the Primary watchlist so the
    // screener renders immediately on first visit — no 10-second blank wait.
    // Find Primary by stable field, not by assuming listData[0] === Primary.
    safeFetch("/api/watchlist/list", { headers: authH() }).then((listData) => {
      if (!Array.isArray(listData) || listData.length === 0) return;
      const primary =
        listData.find((w: any) => w.is_primary) ??
        listData.find((w: any) => w.kind === "primary") ??
        listData.find((w: any) => w.type === "primary") ??
        listData.find((w: any) => String(w.name ?? "").toLowerCase() === "primary") ??
        listData.find((w: any) => String(w.title ?? "").toLowerCase() === "primary") ??
        listData[0];
      if (!primary?.id) return;
      const usingFallback =
        !primary.is_primary &&
        primary.kind !== "primary" &&
        primary.type !== "primary" &&
        String(primary.name ?? "").toLowerCase() !== "primary" &&
        String(primary.title ?? "").toLowerCase() !== "primary";
      if (usingFallback && import.meta.env.DEV) {
        console.warn("[GlobalPrefetch] Could not identify Primary watchlist by field — falling back to listData[0]:", primary.name, primary.id);
      }
      const primaryId = primary.id;
      const primaryKey = ["/api/watchlist", primaryId];
      if (qc.getQueryData(primaryKey) === null) {
        qc.removeQueries({ queryKey: primaryKey, exact: true });
      }
      qc.prefetchQuery({
        queryKey: primaryKey,
        queryFn: () => safeFetch(`/api/watchlist/${primaryId}`, { headers: authH() }),
        staleTime: 2 * 60_000,
        retry: 2,
        retryDelay: attempt => Math.min(750 * 2 ** attempt, 3_000),
      });
    }).catch((error) => {
      if (import.meta.env.DEV) {
        console.warn("[GlobalPrefetch] Watchlist list prefetch failed; page query will retry:", error);
      }
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
    const scoredKey = ["predict-scored"];
    if (qc.getQueryData(scoredKey) === null) {
      qc.removeQueries({ queryKey: scoredKey, exact: true });
    }
    qc.prefetchQuery({
      queryKey: scoredKey,
      queryFn: async () => {
        const data = await safeFetch("/api/predict/scored?limit=200");
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
      retry: 2,
      retryDelay: attempt => Math.min(750 * 2 ** attempt, 3_000),
    });
    pre(["predict-signal-changes"],        "/api/predict/signal-changes",         undefined, 90_000);
    // Key aligned with Home page useQuery key so the prefetch deduplicates correctly
    pre(["/api/predict/investor/overview"], "/api/predict/investor/overview",      undefined, 5 * 60_000);

  }, [isAuthenticated, qc]); // re-run only if auth state changes

  return null;
}
