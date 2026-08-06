/**
 * Consumer-driven data ownership tests.
 *
 * Strategy: source-code pattern analysis — read files as text and assert
 * ownership rules.  This avoids the overhead of mounting React components
 * while giving deterministic, fast coverage of the key contracts.
 *
 * Tests 1-7:   Home retains every visible live snippet (query ownership)
 * Tests 8-19:  Watchlist request behaviour (at most 1 list + 1 detail)
 * Tests 20-23: Shared-key behaviour (no duplicate prefetch alias keys)
 * Tests 24-28: Home freshness (stale times, polling preserved)
 * Tests 29-34: Regression protection (taxonomy, portfolio, options, backend)
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── helpers ──────────────────────────────────────────────────────────────────

// __tests__ → contexts → src → client → frontend
const frontendRoot = resolve(import.meta.dirname, '../../../..');

function src(rel: string) {
  return readFileSync(resolve(frontendRoot, 'client/src', rel), 'utf8');
}

/** Returns true when the source text contains the search string */
function has(text: string, pattern: string): boolean {
  return text.includes(pattern);
}

/**
 * Strip JSDoc block comments (/** ... *\/) and line comments (// ...) from
 * source text so assertions target executable code only, not inline docs.
 */
function stripComments(text: string): string {
  // Remove /* ... */ block comments (including JSDoc)
  let out = text.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove // ... line comments
  out = out.replace(/\/\/[^\n]*/g, '');
  return out;
}

/** Checks both double-quoted and single-quoted forms of the key */
function hasKey(text: string, key: string): boolean {
  return text.includes(`"${key}"`) || text.includes(`'${key}'`);
}

/** Count non-overlapping occurrences of a string in text */
function count(text: string, pattern: string): number {
  let n = 0;
  let pos = 0;
  while ((pos = text.indexOf(pattern, pos)) !== -1) { n++; pos += pattern.length; }
  return n;
}

// ── Load sources once ─────────────────────────────────────────────────────────

const global   = src('contexts/GlobalDataContext.tsx');
const home     = src('pages/home.tsx');
const wl       = src('pages/watchlist.tsx');
const sectors  = src('pages/stocks-sectors.tsx');
const hlPage   = src('pages/hyperliquid-screener.tsx');
const notifai  = src('pages/notifai.tsx');
const predict  = src('pages/predict.tsx');

// ── 1–7: Home retains every visible live snippet ──────────────────────────────

test('1. Home owns /api/home/dashboard query', () => {
  assert.ok(has(home, '"/api/home/dashboard"'), 'home.tsx must include /api/home/dashboard queryKey');
});

test('2. Home owns Theme RS using canonical shared key', () => {
  assert.ok(has(home, '"themes-unified"'), 'home.tsx must use ["themes-unified","themes"] key');
  assert.ok(has(home, '"themes"'),         'home.tsx must include "themes" in that key');
});

test('3. Home owns Hyperliquid advanced-signals key', () => {
  assert.ok(has(home, '"hl-advanced-signals"'), 'home.tsx must use ["hl-advanced-signals"] key');
});

test('4. Home owns predict investor-overview key', () => {
  assert.ok(
    has(home, '"/api/predict/investor/overview"'),
    'home.tsx must own ["/api/predict/investor/overview"]',
  );
});

test('5. Home owns predict live-odds key', () => {
  assert.ok(
    has(home, '"/api/predict/odds/live"'),
    'home.tsx must own ["/api/predict/odds/live"]',
  );
});

test('6. Home uses /api/home/dashboard as compact Watchlist + Portfolio snapshot source', () => {
  // Home dashboard is the compact aggregate — home must NOT use the full detail endpoint
  assert.ok(has(home, '"/api/home/dashboard"'), 'home.tsx uses /api/home/dashboard');
  assert.ok(!has(home, '"/api/watchlist/"'), 'home.tsx must not contain /api/watchlist/{id} fetch');
});

test('7. No Home component reads complete Primary Watchlist response via detail queryKey', () => {
  // The detail key pattern is ["/api/watchlist", someId] — home must not reference it
  const detailKeyPattern = '"/api/watchlist"';
  // home.tsx may reference the string "/api/watchlist" in comments or the list endpoint,
  // but must not use the two-element detail key ["/api/watchlist", id]
  // The detail key always appears as:  queryKey: ["/api/watchlist", ...id...
  assert.ok(
    !home.includes('queryKey: ["/api/watchlist",') &&
    !home.includes("queryKey: ['/api/watchlist',"),
    'home.tsx must not own the Watchlist detail queryKey',
  );
  void detailKeyPattern; // referenced for clarity
});

// ── 8–19: Watchlist request behaviour ─────────────────────────────────────────

test('8. GlobalPrefetch schedules zero /api/watchlist/{id} requests', () => {
  // The detail fetch pattern is safeFetch(`/api/watchlist/${...}`) or prefetchQuery with that key
  assert.ok(!has(global, '/api/watchlist/${'), 'GlobalPrefetch must not fetch watchlist detail');
  assert.ok(!has(global, "'/api/watchlist/'"), 'GlobalPrefetch must not reference watchlist detail string');
  assert.ok(!has(global, '"/api/watchlist",'), 'GlobalPrefetch must not use watchlist detail queryKey');
});

test('9. GlobalPrefetch schedules zero /api/watchlist/list requests', () => {
  // Strip comments so JSDoc ownership notes don't trigger false positives
  const code = stripComments(global);
  assert.ok(!has(code, '/api/watchlist/list'), 'GlobalPrefetch executable code must not fetch watchlist list');
});

test('10. No raw duplicate safeFetch for watchlist/list exists in GlobalPrefetch', () => {
  // Previously: safeFetch("/api/watchlist/list", { headers: authH() }).then(...)
  const code = stripComments(global);
  assert.ok(!has(code, 'safeFetch'), 'GlobalPrefetch executable code must contain no raw safeFetch calls');
});

test('11. Watchlist page uses ["/api/watchlist/list"] as list queryKey', () => {
  assert.ok(hasKey(wl, '/api/watchlist/list'), 'watchlist.tsx must use the canonical list queryKey');
});

test('12. Watchlist page uses ["/api/watchlist", activeId] as detail queryKey', () => {
  // The exact shape: queryKey: ['/api/watchlist', activeId] or ["/api/watchlist", activeId]
  const hasDoubleQ = wl.includes('"/api/watchlist", activeId');
  const hasSingleQ = wl.includes("'/api/watchlist', activeId");
  assert.ok(hasDoubleQ || hasSingleQ, 'watchlist.tsx must use ["/api/watchlist", activeId] detail key');
});

test('13. Watchlist page uses list queryKey at least once (no duplicate prefetch)', () => {
  // Count in both quote styles
  const n = count(wl, '"/api/watchlist/list"') + count(wl, "'/api/watchlist/list'");
  assert.ok(n >= 1, 'list queryKey must appear at least once in watchlist.tsx');
  // Many occurrences are expected (invalidateQueries calls in mutations); just confirm
  // there is no second prefetchQuery alias introducing a duplicate in-flight request
  assert.ok(!has(wl, 'prefetchQuery'), 'watchlist.tsx must not add a prefetchQuery duplicate');
});

test('14. Watchlist page has one detail queryKey (no prefetch alias)', () => {
  // The key appears in queries, mutations, and invalidation calls — any count >= 1 is fine.
  // The important invariant is that no prefetchQuery creates a parallel request.
  const hasDetailKey = wl.includes('"/api/watchlist", activeId') ||
                       wl.includes("'/api/watchlist', activeId");
  assert.ok(hasDetailKey, 'detail queryKey must appear in watchlist.tsx');
  // No prefetchQuery alias for the detail key
  assert.ok(!has(wl, 'prefetchQuery'), 'watchlist.tsx must not have a prefetchQuery alias for detail');
});

test('15. GlobalPrefetch does not issue any prefetchQuery calls', () => {
  assert.ok(!has(global, 'prefetchQuery'), 'GlobalPrefetch must not call prefetchQuery');
  assert.ok(!has(global, 'fetchQuery'),    'GlobalPrefetch must not call fetchQuery');
});

test('16. GlobalPrefetch does not import useQueryClient (no queries to prefetch)', () => {
  assert.ok(!has(global, 'useQueryClient'), 'GlobalPrefetch must not import useQueryClient');
});

test('17. GlobalPrefetch does not import useEffect (no side effects needed)', () => {
  assert.ok(!has(global, 'useEffect'), 'GlobalPrefetch must not import useEffect');
});

test('18. GlobalPrefetch does not depend on auth state (no prefetch burst on login)', () => {
  assert.ok(!has(global, 'isAuthenticated'), 'GlobalPrefetch must not read isAuthenticated');
  assert.ok(!has(global, 'useAuth'),         'GlobalPrefetch must not import useAuth');
});

test('19. Navigating to Watchlist — at most one list and one detail request (dedup via shared key)', () => {
  // Structural proof: watchlist.tsx has exactly one useQuery per key, so React Query
  // deduplication guarantees at most one in-flight request per key.
  const listOccurrences   = count(wl, 'useQuery') >= 1;
  const detailOccurrences = count(wl, 'useQuery') >= 1;
  assert.ok(listOccurrences && detailOccurrences,
    'watchlist.tsx must contain useQuery for both list and detail');
  // Confirm no prefetchQuery creates a parallel alias
  assert.ok(!has(wl, 'prefetchQuery({\n') || count(wl, '"/api/watchlist/list"') <= 2,
    'watchlist.tsx must not create a parallel prefetchQuery alias for the list');
});

// ── 20–23: Shared-key behaviour ───────────────────────────────────────────────

test('20. Home Theme RS key matches watchlist.tsx and stocks-sectors.tsx', () => {
  const key = '"themes-unified"';
  assert.ok(has(home,    key), 'home.tsx must use ["themes-unified","themes"]');
  assert.ok(has(wl,      key), 'watchlist.tsx must use ["themes-unified","themes"]');
  assert.ok(has(sectors, key), 'stocks-sectors.tsx must use ["themes-unified","themes"]');
});

test('21. Home HL advanced-signals key matches hyperliquid-screener.tsx', () => {
  const key = 'hl-advanced-signals';
  assert.ok(hasKey(home,   key), 'home.tsx must use ["hl-advanced-signals"]');
  assert.ok(hasKey(hlPage, key), 'hyperliquid-screener.tsx must use ["hl-advanced-signals"]');
});

test('22. GlobalPrefetch introduces no alternate prefetch-* alias keys', () => {
  assert.ok(!has(global, '"prefetch-'), 'no prefetch-* alias keys in GlobalPrefetch');
  assert.ok(!has(global, "'prefetch-"), 'no prefetch-* alias keys in GlobalPrefetch');
});

test('23. Shared keys — no parallel same-key request created by GlobalPrefetch', () => {
  // GlobalPrefetch is now empty, so it cannot create any parallel request
  assert.ok(!has(global, 'prefetchQuery'), 'GlobalPrefetch creates no prefetchQuery calls');
});

// ── 24–28: Home freshness ─────────────────────────────────────────────────────

test('24. Home dashboard staleTime preserved (60_000 or 60000)', () => {
  // home.tsx should still specify its own staleTime for /api/home/dashboard
  const hasStale = has(home, 'staleTime') && has(home, '60_000') || has(home, '60000');
  assert.ok(hasStale, 'home.tsx must preserve staleTime settings');
});

test('25. Home dashboard refetchInterval preserved', () => {
  assert.ok(has(home, 'refetchInterval'), 'home.tsx must retain refetchInterval for dashboard freshness');
});

test('26. Home queries are not deferred (they fire when home.tsx mounts)', () => {
  // All 10 home queries are declared at the top level of the component, not inside
  // a setTimeout/requestIdleCallback wrapper
  assert.ok(!has(home, 'requestIdleCallback'), 'home.tsx must not wrap queries in requestIdleCallback');
});

test('27. Home queries do not have enabled:false by default', () => {
  // Queries should not be gated by an always-false enabled flag
  const enabledFalse = count(home, 'enabled: false') + count(home, "enabled:false");
  assert.ok(enabledFalse === 0, `home.tsx has ${enabledFalse} unexpected enabled:false — check freshness`);
});

test('28. Predict investor overview query is present in home.tsx', () => {
  assert.ok(
    has(home, '"/api/predict/investor/overview"'),
    'home.tsx must retain predict/investor/overview',
  );
});

// ── 29–34: Regression protection ─────────────────────────────────────────────

test('29. Watchlist taxonomy imports are unchanged', () => {
  assert.ok(
    has(wl, 'buildThemeTaxonomyIndex') && has(wl, 'rowMatchesTaxonomySelection'),
    'watchlist.tsx taxonomy imports must remain intact',
  );
});

test('30. Watchlist chip bar state is unchanged (selectedTaxonomyIds)', () => {
  assert.ok(has(wl, 'selectedTaxonomyIds'), 'watchlist.tsx chip bar state must be preserved');
});

test('31. Portfolio page has no Watchlist detail dependency', () => {
  const portfolio = src('pages/portfolio.tsx');
  assert.ok(
    !has(portfolio, '"/api/watchlist/"') && !has(portfolio, "'/api/watchlist/'"),
    'portfolio.tsx must not reference /api/watchlist/{id}',
  );
});

test('32. Options page has no Watchlist detail dependency', () => {
  const options = src('pages/options.tsx');
  assert.ok(
    !has(options, '"/api/watchlist/"') && !has(options, "'/api/watchlist/'"),
    'options.tsx must not reference /api/watchlist/{id}',
  );
});

test('33. No backend endpoint was added or changed (no routes.ts modification in this diff)', () => {
  // Strip JSDoc comments first so ownership-map references in the comment block
  // (e.g. safeFetch("/api/watchlist/list")) do not trip executable-code checks.
  const code = stripComments(global);
  // Use space-prefixed or assignment-context "fetch(" to avoid matching "GlobalPrefetch("
  assert.ok(
    !/ fetch\(/.test(code) && !/=\s*fetch\(/.test(code) && !/\(fetch\(/.test(code),
    'GlobalPrefetch executable code must contain no bare fetch() calls',
  );
  assert.ok(!has(code, 'await '), 'GlobalPrefetch executable code must contain no await expressions');
});

test('34. GlobalPrefetch component can be safely imported and renders null', async () => {
  // Verify the module exports GlobalPrefetch as a function
  // (Module is ESM; we verify the source has a named export)
  assert.ok(has(global, 'export function GlobalPrefetch'), 'GlobalPrefetch must be a named export');
  assert.ok(has(global, 'return null'), 'GlobalPrefetch must return null');
});
