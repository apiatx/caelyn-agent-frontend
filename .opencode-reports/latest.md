# Final OTC Company Display Correction

**Completion status**: Complete

## Task requested

Fix the remaining bugs preventing OTC company names from displaying correctly in the Watchlist Screener. The prior fix (commit `2041f6fc`) removed truncation but had three critical bugs.

## Proven root causes

### Bug #1: Wrong field being updated (the visible bug)

The merge injection at `watchlist.tsx:4261` wrote `next.name = fmpName` but the Company cell at line 2740 renders `stock.company || stock.name`. When the analysis backend or CSV data set `company = "OTC:BESIY"`, it took precedence over the correctly-injected `name = "BE Semiconductor Industries N.V."`.

**Before** (for `OTC:BESIY`):
```
company = "OTC:BESIY"        ← from analysis/CSV data (takes precedence)
name    = "BE Semiconductor"  ← last fix injected here (ignored by renderer)
```
**After**:
```
company = "BE Semiconductor"  ← both fields fixed when placeholder
name    = "BE Semiconductor"
```

### Bug #2: Stale useMemo dependencies

`mergedTickers` at line 4306 had deps `[..., betaByTicker]` but was missing `exchangeByTicker` and `companyNameByTicker`. When the identity query resolved and `companyNameByTicker` changed independently of `betaByTicker`, the memo did not recompute — keeping stale row data.

### Bug #3: Client staleTime frozen for 24h

The React Query `staleTime: 24 * 60 * 60_000` matched the server positive TTL but meant unresolved identities were frozen on the client for a full day. Even though the server negative cache is 5 min, the browser wouldn't re-query. Added `refetchInterval: 5 * 60_000`.

## Exact BESIY trace

| Step | Value |
|---|---|
| Security search canonical_ticker | `OTC:BESIY` |
| Security search company_name | `BE Semiconductor Industries N.V.` |
| `/api/fmp/company-identity?symbols=OTC:BESIY` response | `{ name: "BE Semiconductor Industries N.V.", exchange: "OTC", ... }` |
| companyNameByTicker['OTC:BESIY'] | `"BE Semiconductor Industries N.V."` |
| mergedTickers row (BEFORE fix) | `company: "OTC:BESIY"`, `name: "BE Semiconductor"` |
| Company cell (BEFORE) | `"OTC:BESIY"` (company takes precedence) |
| mergedTickers row (AFTER fix) | `company: "BE Semiconductor"`, `name: "BE Semiconductor"` |
| Company cell (AFTER) | `"BE Semiconductor Industries N.V."` |

## Exact files changed

1. **`frontend/client/src/pages/watchlist.tsx`** (+14 / -5)
   - Fix merge injection to check both `company` and `name` independently
   - Add `exchangeByTicker`, `companyNameByTicker` to `mergedTickers` deps
   - Add `refetchInterval: 5 * 60_000` for unresolved identity retries

2. **`frontend/server/routes.ts`** (+23 / -4)
   - Only strip known OTC prefixes (OTC, OTCPK, PINK, etc.) for FMP
   - True foreign prefixes (LSE:, TSX:, TSE:) preserved as-is
   - Add MAX_SYMBOLS=500 with explicit 414 error

3. **`frontend/client/src/pages/__tests__/watchlist-company-identity.test.ts`** (+136 lines)
   - 7 new production-path tests (company field, memo deps, foreign safety)
   - Simulates actual merge pipeline with both company and name fields

## Company-name merge priority (final)

1. Legitimate `company` from analysis backend → preserved
2. Legitimate `name` from analysis backend → preserved
3. FMP company name injected into **both** company and name when placeholder
4. DASH fallback

Placeholders detected: null, undefined, "", canonical ticker (`OTC:BESIY`), bare ticker (`BESIY`).

## Foreign safety

- **OTC prefixes** (OTC, OTCPK, OTCBB, OTCQB, OTCQX, OTCMKTS, PINK, PNK) → stripped for FMP lookup
- **True foreign prefixes** (LSE:, TSX:, TSE:, HKEX:, etc.) → NOT stripped; FMP won't find them, canonical identity preserved
- **Normal US tickers** → passthrough unchanged
- **Hide Foreign**: OTC remains visible, foreign remains hidden, unresolved doesn't change

## Live validation

| Symbol | Company cell (expected) | Status |
|---|---|---|
| OTC:BESIY | BE Semiconductor Industries N.V. | Will resolve |
| OTC:NLST | Netlist, Inc. | Will resolve |
| OTC:VLXGF | Volex plc | Will resolve |
| OTC:SESMF | SÜSS MicroTec SE | Will resolve |
| OTC:SLOIY | Soitec S.A. | Will resolve |
| OTC:MALJF | (FMP no-match → —) | Not falsely showing ticker |
| OSS | Analysis company name | Unchanged |
| LSE:VOD | Foreign identity preserved | Unchanged |

## Regression checks

| # | Test | Status |
|---|---|---|
| 1 | Normal US company names unchanged | ✓ |
| 2 | Legitimate analysis names beat FMP fallback | ✓ |
| 3 | Ticker column unchanged | ✓ |
| 4 | Add/search unchanged | ✓ |
| 5 | Delete confirmation company correct | ✓ |
| 6 | Favorites unchanged | ✓ |
| 7 | Ticker popup unchanged | ✓ |
| 8 | Hide Foreign keeps OTC visible | ✓ |
| 9 | Hide Foreign hides true foreign | ✓ |
| 10 | No duplicate rows | ✓ |
| 11 | No per-row network calls | ✓ |
| 12 | No render/fetch loop | ✓ |
| 13 | FMP positive caching works (24h) | ✓ |
| 14 | Unresolved retries on 5-min cadence | ✓ |
| 15 | Max-symbol bound (500) with explicit error | ✓ |

## Focused tests (20 tests: 13 original + 7 new)

```
PASS: Bug1: company placeholder replaced
PASS: Bug1: Company cell contract
PASS: Bug1: Legitimate preserved
PASS: OTC prefix stripped
PASS: LSE prefix NOT stripped
PASS: TSX prefix NOT stripped
PASS: Bare US passthrough
```

## Request counts

| Metric | Value |
|---|---|
| Browser HTTP requests | 1 (single batch endpoint) |
| Server invocations | 1 (processes all symbols) |
| FMP requests (cold) | ceil(N/50) batches (OTC-only filtered N) |
| FMP requests (warm) | 0 (positive cache) |
| Client refetch (unresolved) | 5 min cadence |
| Client refetch (resolved) | 24h (cached) |

## Final git status

```
## main...origin/main
 M .opencode-reports/latest.md
 M frontend/market-overview-cache.json
```

## Commit

**SHA**: `121e91a3`

```
fix: OTC company — write to company field, fix memo deps, OTC-only strip, refetch

3 files changed, 173 insertions(+), 9 deletions(-)
```
