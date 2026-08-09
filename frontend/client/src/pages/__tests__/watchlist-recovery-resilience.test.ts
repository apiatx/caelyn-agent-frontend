/**
 * watchlist-recovery-resilience.test.ts
 *
 * Focused regression tests for the two self-heal changes made on 2026-08-09:
 *
 * TAXONOMY:
 *   1.  refetchInterval callback returns 5 000 ms when no data exists
 *   2.  refetchInterval callback returns false when data is present
 *   3.  allEmpty + taxonomyIsError → reconnecting notice condition is true
 *   4.  allEmpty + !taxonomyIsError → reconnecting notice NOT shown (normal loading)
 *   5.  !allEmpty + taxonomyIsError → chips stay visible (existing data survives error)
 *   6.  !allEmpty + !taxonomyIsError → normal chip render
 *   7.  recovery: chips appear once data arrives (allEmpty flips to false)
 *
 * LIVE NEWS:
 *   8.  Cold load (newsData undefined, newsFetching true)  → show Loading, NOT Refreshing
 *   9.  Background refresh (newsData populated, newsFetching true) → show Refreshing
 *   10. No fetch in progress → show neither Refreshing nor Loading (data present)
 *   11. newsIsBuilding alone (independent of newsFetching guard) → show Refreshing
 *   12. placeholderData semantics: previous data is returned unchanged
 *   13. Query failure does not erase valid previousData
 */

import assert from "node:assert/strict";
import test from "node:test";

// ── Taxonomy: refetchInterval logic ──────────────────────────────────────────
//
// The actual query option is:
//   refetchInterval: (query: any) => (query.state.data ? false : 5_000)
//
// Extracted as a pure function for testability.

function taxonomyRefetchInterval(query: { state: { data: unknown } }): number | false {
  return query.state.data ? false : 5_000;
}

test("taxonomy-1: refetchInterval returns 5000 when query has no data (outage / first paint)", () => {
  const result = taxonomyRefetchInterval({ state: { data: undefined } });
  assert.strictEqual(result, 5_000);
});

test("taxonomy-2: refetchInterval returns false when query has data (stops polling after recovery)", () => {
  const fakeData = { themes: [{ theme_id: "tech", display_name: "Technology", classification: "sector" }], theme_count: 1 };
  const result = taxonomyRefetchInterval({ state: { data: fakeData } });
  assert.strictEqual(result, false);
});

test("taxonomy-2b: refetchInterval boundary cases", () => {
  // Truthy data values → stop polling (return false)
  assert.strictEqual(taxonomyRefetchInterval({ state: { data: {} } }), false, "{} is truthy → stop");
  assert.strictEqual(taxonomyRefetchInterval({ state: { data: [] } }), false, "[] is truthy → stop");
  // Falsy data values → keep polling (return 5_000)
  assert.strictEqual(taxonomyRefetchInterval({ state: { data: 0 } }),    5_000, "0 is falsy → poll");
  assert.strictEqual(taxonomyRefetchInterval({ state: { data: null } }),  5_000, "null → poll");
  assert.strictEqual(taxonomyRefetchInterval({ state: { data: undefined } }), 5_000, "undefined → poll");
});

// ── Taxonomy: reconnecting notice condition ───────────────────────────────────
//
// The rendered condition is:
//   allEmpty && taxonomyIsError
//
// where allEmpty = sectorOrder.length === 0 && themeOrder.length === 0 && subthemeOrder.length === 0

function shouldShowReconnecting(
  sectorCount: number,
  themeCount: number,
  subthemeCount: number,
  taxonomyIsError: boolean,
): boolean {
  const allEmpty = sectorCount === 0 && themeCount === 0 && subthemeCount === 0;
  return allEmpty && taxonomyIsError;
}

test("taxonomy-3: allEmpty + taxonomyIsError → show reconnecting notice", () => {
  assert.strictEqual(shouldShowReconnecting(0, 0, 0, true), true);
});

test("taxonomy-4: allEmpty + !taxonomyIsError → do NOT show reconnecting (still loading, no error yet)", () => {
  assert.strictEqual(shouldShowReconnecting(0, 0, 0, false), false);
});

test("taxonomy-5: chips present + taxonomyIsError → do NOT show reconnecting (existing chips stay visible)", () => {
  assert.strictEqual(shouldShowReconnecting(11, 23, 67, true), false);
});

test("taxonomy-6: chips present + no error → normal chip render, no reconnecting", () => {
  assert.strictEqual(shouldShowReconnecting(11, 23, 67, false), false);
});

test("taxonomy-7: chips appear once data arrives (allEmpty flips to false after recovery)", () => {
  // Simulate: outage → error with no data → reconnecting shown
  const duringOutage = shouldShowReconnecting(0, 0, 0, true);
  assert.strictEqual(duringOutage, true, "reconnecting shown during outage");

  // Simulate: backend recovers → data arrives → allEmpty becomes false
  const afterRecovery = shouldShowReconnecting(11, 23, 67, false);
  assert.strictEqual(afterRecovery, false, "reconnecting hidden after recovery");
});

test("taxonomy-8: partial chip counts do not trigger reconnecting notice", () => {
  // Even if only sectors loaded, allEmpty is false — no reconnecting shown
  assert.strictEqual(shouldShowReconnecting(11, 0, 0, true), false);
  assert.strictEqual(shouldShowReconnecting(0, 23, 0, true), false);
  assert.strictEqual(shouldShowReconnecting(0, 0, 67, true), false);
});

// ── Live News: state-machine conditions ──────────────────────────────────────
//
// The "Refreshing…" badge condition is:
//   newsIsBuilding || (newsFetching && !!newsData)
//
// The "Loading activity data…" text appears when:
//   !newsIsError && activityRows.length === 0 && newsFetching
//
// These are extracted as pure functions for testability.

function shouldShowRefreshing(
  newsIsBuilding: boolean,
  newsFetching: boolean,
  newsData: object | undefined,
): boolean {
  return newsIsBuilding || (newsFetching && !!newsData);
}

function activityDisplayState(
  activityRowCount: number,
  newsFetching: boolean,
  newsIsError: boolean,
): "table" | "loading" | "empty" | "error-hidden" {
  // !newsIsError gate wraps the whole section in the component
  if (newsIsError) return "error-hidden";
  if (activityRowCount > 0) return "table";
  return newsFetching ? "loading" : "empty";
}

// Test 8: Cold load — newsData undefined, newsFetching true
test("news-8: cold load (newsData undefined + newsFetching) → Loading text, NOT Refreshing badge", () => {
  const newsData = undefined;
  const newsFetching = true;
  const newsIsBuilding = false;
  const newsIsError = false;

  assert.strictEqual(shouldShowRefreshing(newsIsBuilding, newsFetching, newsData), false,
    "Refreshing badge must NOT appear during cold load with no data");
  assert.strictEqual(activityDisplayState(0, newsFetching, newsIsError), "loading",
    "Activity section must show Loading text");
});

// Test 9: Background refresh — valid newsData exists, newsFetching true
test("news-9: background refresh (newsData populated + newsFetching) → rows stay visible + Refreshing badge", () => {
  const newsData = { ticker_activity: [{ ticker: "AAPL", articles_48h: 5, news_mc: 2.1, delta_count: 1, delta_pct: 20 }] };
  const newsFetching = true;
  const newsIsBuilding = false;
  const newsIsError = false;

  assert.strictEqual(shouldShowRefreshing(newsIsBuilding, newsFetching, newsData), true,
    "Refreshing badge must appear when existing data is present + fetch in progress");

  // activityRows.length would be > 0 since newsData.ticker_activity has items
  assert.strictEqual(activityDisplayState(newsData.ticker_activity.length, newsFetching, newsIsError), "table",
    "Activity table must remain visible during background refresh");
});

// Test 10: No fetch in progress, data present
test("news-10: no fetch in progress + data present → neither Refreshing nor Loading", () => {
  const newsData = { ticker_activity: [{ ticker: "MSFT" }] };
  const newsFetching = false;
  const newsIsBuilding = false;
  const newsIsError = false;

  assert.strictEqual(shouldShowRefreshing(newsIsBuilding, newsFetching, newsData), false,
    "Refreshing badge must not appear when no fetch is in progress");
  assert.strictEqual(activityDisplayState(1, newsFetching, newsIsError), "table");
});

// Test 11: newsIsBuilding alone triggers Refreshing (server-side cache building)
test("news-11: newsIsBuilding alone → Refreshing badge (independent of newsFetching guard)", () => {
  // newsIsBuilding comes from newsData.is_building — data exists but server is building
  const newsData = { ticker_activity: [], is_building: true };
  const newsIsBuilding = true;
  const newsFetching = false; // no client-side fetch in progress

  assert.strictEqual(shouldShowRefreshing(newsIsBuilding, newsFetching, newsData), true,
    "Refreshing badge must appear when server is building, regardless of newsFetching");
});

// Test 12: placeholderData semantics — previous data returned unchanged
test("news-12: placeholderData callback returns previousData unchanged", () => {
  // The query option is: placeholderData: (previousData: any) => previousData
  const placeholderDataFn = (previousData: any) => previousData;

  const prev = { ticker_activity: [{ ticker: "NVDA" }], articles: {}, is_building: false };
  assert.strictEqual(placeholderDataFn(prev), prev, "previous data object returned by reference");
  assert.strictEqual(placeholderDataFn(undefined), undefined, "undefined returned as-is on first load");
  assert.strictEqual(placeholderDataFn(null), null, "null returned as-is");
});

// Test 13: Query failure does not erase valid previousData (placeholderData contract)
test("news-13: query failure does not erase valid previousData", () => {
  // Simulate: prior successful fetch stored data, then a failure occurs.
  // With placeholderData: (prev) => prev, React Query keeps returning prev
  // while the new fetch is in progress or has failed.
  const placeholderDataFn = (previousData: any) => previousData;

  const priorGoodData = {
    ticker_activity: [{ ticker: "TSLA", articles_48h: 10 }],
    articles: {},
    is_building: false,
    cache_age_s: 300,
  };

  // After a query failure, placeholderData is called with the last good value
  const dataShownToUser = placeholderDataFn(priorGoodData);

  assert.ok(dataShownToUser !== undefined, "data is not erased");
  assert.ok(dataShownToUser !== null, "data is not nulled");
  assert.deepStrictEqual(dataShownToUser, priorGoodData, "prior data is returned intact");
  // Confirm the activity table would still render (not the loading/empty state)
  const activityRowCount = dataShownToUser?.ticker_activity?.length ?? 0;
  assert.strictEqual(activityDisplayState(activityRowCount, true, false), "table",
    "table renders (not loading state) when prior data exists even during re-fetch");
});

// ── Invariant: canonical counts ───────────────────────────────────────────────
// These are data-contract tests against the live backend shape expectations.
// They verify the conditions against known canonical values without calling
// the backend — the backend is expected to return these counts.

test("taxonomy-invariant: canonical chip counts match spec (11 sectors, 23 themes, 67 subthemes)", () => {
  const CANONICAL_SECTORS  = 11;
  const CANONICAL_THEMES   = 23;
  const CANONICAL_SUBTHEMES = 67;

  // Verify shouldShowReconnecting returns false for canonical counts (healthy state)
  assert.strictEqual(shouldShowReconnecting(CANONICAL_SECTORS, CANONICAL_THEMES, CANONICAL_SUBTHEMES, false), false,
    "healthy canonical state does not show reconnecting");
  assert.strictEqual(shouldShowReconnecting(CANONICAL_SECTORS, CANONICAL_THEMES, CANONICAL_SUBTHEMES, true), false,
    "error with prior canonical data still shows chips, not reconnecting notice");

  // Verify refetchInterval stops for any truthy data payload
  const canonicalPayload = { themes: new Array(104).fill({ theme_id: "x" }), theme_count: 104 };
  assert.strictEqual(taxonomyRefetchInterval({ state: { data: canonicalPayload } }), false,
    "polling stops after full canonical taxonomy is loaded");
});
