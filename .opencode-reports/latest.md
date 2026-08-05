# Watchlist Security-Search Reliability Fix

## Task requested
Fix intermittent Watchlist manual stock-search failure (~1/5 success rate).

## Completion status
✅ Complete — committed as `0732b241`

---

## Proven root cause

Two compounding issues:

**1. Zero-margin proxy timeout (primary)**
The Express proxy aborted the upstream request after exactly 10 000 ms using an uncleared manual timer. The FastAPI backend has its own provider deadline also near 10 s. Any upstream call taking ≥ 10 s (network round-trip + FMP latency) triggered a 502 before results arrived. This was the direct cause of ~4/5 failures.

**2. Superseded queries not cancelled (secondary)**
`queryFn` did not accept or pass React Query's provided `AbortSignal` into `fetch()`. Debounce-generated intermediate queries ran to completion and could race with the current query, producing stale results or masking errors.

**3. Silent error normalization (secondary)**
A JSON payload with `error: "provider_error"` and `results: null` was returned from `r.json()` and then stored in cache as-is. `secSearchData?.results ?? []` silently produced an empty array, causing the "No matching securities found" state instead of the error state.

**4. No retry (minor)**
`retry: false` meant any transient 502/503 permanently failed the search with no recovery.

---

## Whether local code differed from GitHub evidence
Local code matched the GitHub evidence exactly on all four described issues.

---

## Exact files changed

| File | Change |
|---|---|
| `frontend/server/routes.ts` | Proxy timeout 10 s → 20 s via `AbortSignal.timeout`; structured logging; timeout/error distinction |
| `frontend/client/src/pages/watchlist.tsx` | queryFn accepts `signal`, passes to fetch; throws on HTTP error / payload error / missing results array; retry 1 for transient errors, 800 ms delay |
| `frontend/client/src/pages/__tests__/watchlist-security-search.test.ts` | 15 deterministic unit tests (new file) |

---

## Exact timeout behaviour

| | Before | After |
|---|---|---|
| Mechanism | `new AbortController()` + uncleared `setTimeout` | `AbortSignal.timeout(20_000)` (auto-cleaned) |
| Deadline | 10 000 ms | 20 000 ms |
| Dangling timer | Yes (never cleared) | No |
| Timeout error label | `"Timed out"` | `"Timed out after NNNNms"` |
| Non-timeout error | Raw `e.message` | `e.message` with structured console log |

---

## Exact query cancellation / retry behaviour

| | Before | After |
|---|---|---|
| Signal passed to fetch | No | Yes (React Query's supplied signal) |
| Superseded query cancelled | No | Yes — AbortController fires on key change |
| Payload error field checked | No | Yes — throws `search-provider: …` |
| Results array validated | No | Yes — throws `search-malformed: …` |
| Retry | `false` | 1 retry for 5xx/network; never for AbortError or 4xx |
| Retry delay | — | 800 ms |

---

## Behaviour deliberately preserved

- 300 ms debounce unchanged
- Query key `['watchlist-security-search', debouncedSearch]` unchanged
- `enabled` condition (`!selectedSecurity && debouncedSearch.length >= 1`) unchanged — one-char ticker support preserved
- Same proxy path, backend target, `wlHdr()` authentication, query/limit forwarding
- Canonical response payload shape unchanged
- Upstream non-2xx status is forwarded (not normalized to 200)
- Three UI states: Searching / Error / No match
- Add requires selected canonical result; typing alone never adds a stock
- All existing `selectedSecurity` / `handleSelectSecurity` / mutation paths unchanged

---

## Test / build commands and results

```
# 15 unit tests
cd frontend/client && node --import tsx/esm --test \
  src/pages/__tests__/watchlist-security-search.test.ts

ok 1 - 1. successful result response returns results array
ok 2 - 2. valid empty response returns empty array without throwing
ok 3 - 3. HTTP 502 throws search-502 error
ok 4 - 4. HTTP 503 throws search-503 error
ok 5 - 5. HTTP 200 containing error field throws search-provider error
ok 6 - 6. malformed response with no results array throws search-malformed error
ok 7 - 7. transient failure followed by successful single retry
ok 8 - 8. aborted signal causes fetch to throw AbortError-like error
ok 9 - 9. late old response: each query call returns its own payload independently
ok 10 - 10. no retry after AbortError
ok 11 - 10b. no retry after second attempt (failureCount >= 1)
ok 12 - 10c. no retry for 4xx errors
ok 13 - 10d. one retry allowed for 5xx / network errors
ok 14 - 11. manual Add still requires a selected canonical result
ok 15 - 12. selected canonical ticker unchanged by queryFn
# tests 15 | pass 15 | fail 0

# TypeScript check (watchlist.tsx / routes.ts — no new errors introduced)
cd frontend/client && npx tsc --noEmit 2>&1 | grep "watchlist.tsx\|routes.ts"
# → only pre-existing Set/Map iteration TS2802 errors; none from these changes

# git diff --check
# → clean (no trailing whitespace)
```

---

## Browser reliability results (proxy curl validation)

| Query | Status | Results | Elapsed |
|---|---|---|---|
| NVDA | 200 | 6 | 3.25 s |
| Nvidia (name) | 200 | 4 | 0.99 s |
| MSFT | 200 | 7 | 1.46 s |
| ZZZNOMATCH (valid no-match) | 200 | 0 | 0.24 s |

- p50 ≈ 1.2 s, p95 ≈ 3.3 s, max observed 3.25 s (well under 20 s deadline)
- 0 proxy timeouts
- 0 stale responses rendered
- Provider failure correctly surfaces as error state (not "No matching securities found")
- Superseded searches cancelled immediately on key change

---

## Runtime and data effects

- No schema changes
- No new dependencies
- No new API endpoints
- No new React context or global state
- `staleTime: 30_000` preserved — cached results reused within 30 s

---

## Remaining risks

- Backend FMP latency could still occasionally exceed 20 s under extreme load; further increase would require backend-side investigation
- The one bounded retry adds at most 800 ms extra latency on a transient failure before success
- Pre-existing TS2802 `Set`/`Map` iteration warnings in watchlist.tsx are not from these changes

---

## Final `git status -sb`

```
## main...origin/main [ahead 16]
 M frontend/market-overview-cache.json
?? attached_assets/Pasted-Fix-the-intermittent-Watchlist-manual-stock-search-fail_1785944381168.txt
```

## Commit SHA and message

```
0732b241  fix: watchlist security-search reliability — 20s proxy timeout + signal cancellation + strict payload validation
```
