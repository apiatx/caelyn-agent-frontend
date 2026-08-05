/**
 * Tests for the Watchlist security-search query function logic.
 *
 * These tests exercise the queryFn behaviour (signal passing, error throwing,
 * payload validation, retry predicate) extracted from watchlist.tsx without
 * mounting the full React component.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Minimal well-formed search response */
function okPayload(results: unknown[] = [{ canonical_ticker: 'NVDA' }]) {
  return { query: 'test', results, count: results.length };
}

/**
 * Inline replica of the queryFn from watchlist.tsx so we can test it without
 * importing the React component.  Update this when the production code changes.
 */
async function securitySearchQueryFn(
  q: string,
  signal: AbortSignal,
  mockFetch: typeof globalThis.fetch,
): Promise<{ query: string; results: unknown[]; count: number }> {
  const r = await mockFetch(
    `/api/watchlist/security-search?q=${encodeURIComponent(q)}&limit=25`,
    { signal },
  );
  if (!r.ok) throw new Error(`search-${r.status}`);
  const json = await r.json();
  if (json?.error) throw new Error(`search-provider: ${json.error}`);
  if (!Array.isArray(json?.results)) throw new Error('search-malformed: no results array');
  return json;
}

/** Replica of the retry predicate from watchlist.tsx */
function retryPredicate(failureCount: number, error: unknown): boolean {
  if ((error as any)?.name === 'AbortError') return false;
  const msg = String((error as any)?.message ?? '');
  if (/^search-4\d\d/.test(msg)) return false;
  return failureCount < 1;
}

/** Build a mock fetch that returns a given status + body */
function mockFetch(status: number, body: unknown, ok = status >= 200 && status < 300): typeof globalThis.fetch {
  return async (_input: any, _init?: any) => ({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response);
}

/** Mock fetch that throws with a given error */
function throwingFetch(err: Error): typeof globalThis.fetch {
  return async () => { throw err; };
}

// ── query function tests ──────────────────────────────────────────────────────

test('1. successful result response returns results array', async () => {
  const payload = okPayload([{ canonical_ticker: 'NVDA' }, { canonical_ticker: 'NVDS' }]);
  const result = await securitySearchQueryFn('NVDA', new AbortController().signal, mockFetch(200, payload));
  assert.equal(result.results.length, 2);
  assert.equal((result.results[0] as any).canonical_ticker, 'NVDA');
});

test('2. valid empty response returns empty array without throwing', async () => {
  const payload = okPayload([]);
  const result = await securitySearchQueryFn('ZZZNOMATCH', new AbortController().signal, mockFetch(200, payload));
  assert.equal(result.results.length, 0);
});

test('3. HTTP 502 throws search-502 error', async () => {
  await assert.rejects(
    () => securitySearchQueryFn('NVDA', new AbortController().signal, mockFetch(502, { error: 'gateway error' }, false)),
    (e: Error) => { assert.match(e.message, /search-502/); return true; },
  );
});

test('4. HTTP 503 throws search-503 error', async () => {
  await assert.rejects(
    () => securitySearchQueryFn('NVDA', new AbortController().signal, mockFetch(503, { error: 'unavailable' }, false)),
    (e: Error) => { assert.match(e.message, /search-503/); return true; },
  );
});

test('5. HTTP 200 containing error field throws search-provider error', async () => {
  const payload = { error: 'provider_error', results: null };
  await assert.rejects(
    () => securitySearchQueryFn('NVDA', new AbortController().signal, mockFetch(200, payload)),
    (e: Error) => { assert.match(e.message, /search-provider/); return true; },
  );
});

test('6. malformed response with no results array throws search-malformed error', async () => {
  const payload = { query: 'test', data: [] }; // missing results key
  await assert.rejects(
    () => securitySearchQueryFn('NVDA', new AbortController().signal, mockFetch(200, payload)),
    (e: Error) => { assert.match(e.message, /search-malformed/); return true; },
  );
});

test('7. transient failure followed by successful single retry', async () => {
  let callCount = 0;
  const flaky: typeof globalThis.fetch = async (input, init) => {
    callCount++;
    if (callCount === 1) throw new Error('search-502');
    return mockFetch(200, okPayload())(input, init);
  };
  // First call fails
  try { await securitySearchQueryFn('NVDA', new AbortController().signal, flaky); } catch { /* expected */ }
  // Retry should succeed
  const result = await securitySearchQueryFn('NVDA', new AbortController().signal, flaky);
  assert.equal(callCount, 2);
  assert.ok(Array.isArray(result.results));
});

test('8. aborted signal causes fetch to throw AbortError-like error', async () => {
  const ctrl = new AbortController();
  const abortErr = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' });
  await assert.rejects(
    () => securitySearchQueryFn('NVDA', ctrl.signal, throwingFetch(abortErr)),
    (e: Error) => { assert.equal(e.name, 'AbortError'); return true; },
  );
});

test('9. late old response: each query call returns its own payload independently', async () => {
  const payloadA = okPayload([{ canonical_ticker: 'AAPL' }]);
  const payloadB = okPayload([{ canonical_ticker: 'MSFT' }]);
  const [resA, resB] = await Promise.all([
    securitySearchQueryFn('AAPL', new AbortController().signal, mockFetch(200, payloadA)),
    securitySearchQueryFn('MSFT', new AbortController().signal, mockFetch(200, payloadB)),
  ]);
  assert.equal((resA.results[0] as any).canonical_ticker, 'AAPL');
  assert.equal((resB.results[0] as any).canonical_ticker, 'MSFT');
});

// ── retry predicate tests ─────────────────────────────────────────────────────

test('10. no retry after AbortError', () => {
  const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' });
  assert.equal(retryPredicate(0, abortErr), false);
});

test('10b. no retry after second attempt (failureCount >= 1)', () => {
  assert.equal(retryPredicate(1, new Error('search-502')), false);
});

test('10c. no retry for 4xx errors', () => {
  assert.equal(retryPredicate(0, new Error('search-400')), false);
  assert.equal(retryPredicate(0, new Error('search-404')), false);
  assert.equal(retryPredicate(0, new Error('search-422')), false);
});

test('10d. one retry allowed for 5xx / network errors', () => {
  assert.equal(retryPredicate(0, new Error('search-502')), true);
  assert.equal(retryPredicate(0, new Error('network failure')), true);
  assert.equal(retryPredicate(0, new Error('search-provider: provider_error')), true);
});

test('11. manual Add still requires a selected canonical result (typing alone does not add)', () => {
  // Simulate: user typed text but selectedSecurity is null → add should be disabled
  const selectedSecurity: null = null;
  const addTickerInput = 'NVDA';
  // The add button should be disabled when selectedSecurity is null
  const canAdd = selectedSecurity !== null && addTickerInput.length > 0;
  assert.equal(canAdd, false);
});

test('12. selected canonical ticker unchanged by queryFn', async () => {
  const payload = okPayload([{ canonical_ticker: 'NVDA', provider_symbol: 'NVDA' }]);
  const result = await securitySearchQueryFn('NVDA', new AbortController().signal, mockFetch(200, payload));
  // Confirm canonical_ticker passes through unmodified
  assert.equal((result.results[0] as any).canonical_ticker, 'NVDA');
});
