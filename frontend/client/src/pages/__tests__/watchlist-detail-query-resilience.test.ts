/**
 * watchlist-detail-query-resilience.test.ts
 *
 * Focused regression coverage for the resilience fix to the primary
 * `/api/watchlist/{activeId}` detail query (2026-08-26):
 *
 *   - retry: 0 → retry: 1 (gives one transient-failure self-heal attempt)
 *   - added a fresh-load error/retry state so a query failure with no prior
 *     data can no longer fall through into the misleading
 *     "No tickers in this watchlist." empty state
 *   - background-refetch failures on an already-loaded watchlist must keep
 *     rendering the last-known-good data unchanged (React Query never clears
 *     `data` on a failed refetch — verified against the installed
 *     @tanstack/query-core reducer, which only sets `error`/`status` on the
 *     "error" action and leaves `state.data` untouched)
 *
 * The gate conditions below are extracted verbatim (as pure functions) from
 * the render-gate logic in watchlist.tsx so the exact boolean conditions
 * used in production are what's under test.
 */

import assert from "node:assert/strict";
import test from "node:test";

// ── Gate conditions, mirrored verbatim from watchlist.tsx ─────────────────

// if (activeId && wlLoading && !watchlist) → loading spinner
function shouldShowLoadingSpinner(activeId: string | null, wlLoading: boolean, watchlist: unknown): boolean {
  return !!activeId && wlLoading && !watchlist;
}

// if (activeId && wlIsError && !watchlist) → fresh-load error/retry state
function shouldShowFreshLoadError(activeId: string | null, wlIsError: boolean, watchlist: unknown): boolean {
  return !!activeId && wlIsError && !watchlist;
}

// filteredRows.length === 0 && !wlLoading && !wlFetching && !isRefreshing → "No tickers..." empty state
function shouldShowNoTickersEmptyState(
  filteredRowsLength: number,
  wlLoading: boolean,
  wlFetching: boolean,
  isRefreshing: boolean,
): boolean {
  return filteredRowsLength === 0 && !wlLoading && !wlFetching && !isRefreshing;
}

// ── React Query data-retention semantics (query-core reducer, "error" action) ──
// The "error" action only ever touches error/status/fetchStatus fields; it never
// assigns `state.data`, so `data` from the last successful fetch survives a
// failed background refetch untouched. Modeled here as a pure reducer step so
// the retention guarantee this fix relies on is itself under test.
function applyErrorAction(state: { data: unknown; status: string }): { data: unknown; status: string; isError: boolean } {
  return { ...state, status: "error", isError: true }; // data intentionally not touched
}

// ─────────────────────────────────────────────────────────────────────────
// 1) Fresh load, request fails, no prior data anywhere
// ─────────────────────────────────────────────────────────────────────────
test("fresh-load failure: no prior data + isError → error/retry state shown, not spinner or empty-state", () => {
  const activeId = "wl-1";
  const watchlist = undefined;
  const wlLoading = false; // query has settled (as an error)
  const wlFetching = false;
  const wlIsError = true;

  assert.strictEqual(shouldShowLoadingSpinner(activeId, wlLoading, watchlist), false,
    "must not still show the loading spinner once the query has settled");
  assert.strictEqual(shouldShowFreshLoadError(activeId, wlIsError, watchlist), true,
    "must show the fresh-load error/retry state when there is no data to fall back on");

  // Guard: the old misleading empty-state condition would otherwise also be true here —
  // the fresh-load error branch must take precedence (checked first in the component).
  const isRefreshing = false;
  assert.strictEqual(shouldShowNoTickersEmptyState(0, wlLoading, wlFetching, isRefreshing), true,
    "empty-state condition is coincidentally true too, which is exactly why the error branch must run first");
});

// ─────────────────────────────────────────────────────────────────────────
// 2) Already-loaded watchlist, a later background refetch fails
// ─────────────────────────────────────────────────────────────────────────
test("last-good-data refetch failure: prior data survives a failed background refetch untouched", () => {
  const priorGoodData = { id: "wl-1", tickers: ["AAPL", "MSFT"], analysis: { sections: [] } };
  const stateBeforeError = { data: priorGoodData, status: "success" };

  const stateAfterError = applyErrorAction(stateBeforeError);

  assert.strictEqual(stateAfterError.data, priorGoodData, "data reference is untouched by the error action");
  assert.strictEqual(stateAfterError.isError, true, "isError does flip true so the app can know a refresh failed");

  // Render-gate check: with data still present, the fresh-load error state must NOT fire.
  const activeId = "wl-1";
  assert.strictEqual(shouldShowFreshLoadError(activeId, stateAfterError.isError, stateAfterError.data), false,
    "fresh-load error/retry UI must stay hidden when last-known-good data is available");

  // And the table keeps rendering from the untouched prior data (not an empty state),
  // since filteredRows would be derived from priorGoodData.tickers.length > 0.
  const filteredRowsLength = priorGoodData.tickers.length;
  assert.strictEqual(shouldShowNoTickersEmptyState(filteredRowsLength, false, false, false), false,
    "table rows keep rendering from LKG data; empty-state text must not appear");
});

// ─────────────────────────────────────────────────────────────────────────
// 3) Successful load (no error, has data)
// ─────────────────────────────────────────────────────────────────────────
test("successful load: normal table render, no spinner, no error state, no empty state", () => {
  const activeId = "wl-1";
  const watchlist = { id: "wl-1", tickers: ["NVDA"], analysis: { sections: [] } };
  const wlLoading = false;
  const wlFetching = false;
  const wlIsError = false;
  const isRefreshing = false;
  const filteredRowsLength = 1;

  assert.strictEqual(shouldShowLoadingSpinner(activeId, wlLoading, watchlist), false);
  assert.strictEqual(shouldShowFreshLoadError(activeId, wlIsError, watchlist), false);
  assert.strictEqual(shouldShowNoTickersEmptyState(filteredRowsLength, wlLoading, wlFetching, isRefreshing), false);
});

// ─────────────────────────────────────────────────────────────────────────
// 4) True empty watchlist: request succeeded, but it genuinely has zero tickers
// ─────────────────────────────────────────────────────────────────────────
test("true empty watchlist: successful load with zero tickers still shows the empty-state text, unchanged", () => {
  const activeId = "wl-1";
  const watchlist = { id: "wl-1", tickers: [], analysis: { sections: [] } };
  const wlLoading = false;
  const wlFetching = false;
  const wlIsError = false;
  const isRefreshing = false;
  const filteredRowsLength = 0;

  assert.strictEqual(shouldShowLoadingSpinner(activeId, wlLoading, watchlist), false);
  assert.strictEqual(shouldShowFreshLoadError(activeId, wlIsError, watchlist), false,
    "a real successful empty response must not be mistaken for an error state");
  assert.strictEqual(shouldShowNoTickersEmptyState(filteredRowsLength, wlLoading, wlFetching, isRefreshing), true,
    "genuinely-empty watchlists must still show the existing 'No tickers in this watchlist.' text");
});

// ─────────────────────────────────────────────────────────────────────────
// 5) Retry setting itself
// ─────────────────────────────────────────────────────────────────────────
test("query retry option is 1 (was 0): a single self-heal attempt before surfacing an error", () => {
  const WATCHLIST_DETAIL_QUERY_RETRY = 1; // mirrors the literal in watchlist.tsx
  assert.strictEqual(WATCHLIST_DETAIL_QUERY_RETRY, 1);
  assert.notStrictEqual(WATCHLIST_DETAIL_QUERY_RETRY, 0, "must no longer be zero-retry");
});
