# OTC Company Name Fix — Watchlist Screener

**Date:** 2026-08-08  
**Commit:** c9aa4695  
**Files changed:** `frontend/server/routes.ts` (+65 / −27)

---

## Root Cause

FMP `stable/profile` returns `[]` for **any** batch request containing OTC symbols — including mixed batches with regular US symbols. Only individual single-symbol calls (e.g. `stable/profile?symbol=BESIY`) return data.

The DeepSeek OTC commits correctly stripped the `OTC:` prefix before calling FMP and correctly mapped the response back to canonical symbols. But the batch loop sent all provider symbols together, so every batch containing an OTC symbol silently returned `[]`, causing all OTC symbols to be negative-cached with the ticker itself as the name.

## DeepSeek Audit Summary

| Commit | Assessment |
|---|---|
| `1b2aafcd` — Hide Foreign uses exchange metadata | **Correct** — `isForeignForWatchlistFilter()` uses FMP exchange data, not symbol heuristic |
| `56e32e4d` — strip OTC prefix for FMP lookup, inject names | **Correct** — server stripping and frontend injection logic are right |
| `2041f6fc` — remove .slice(0,50), add chunking, fix neg cache | **Correct** — all three bugs fixed; 13 tests added |
| `121e91a3` — write to company field, fix memo deps, refetchInterval | **Correct** — isPlaceholder check on both `.company` and `.name`; deps array fixed |

None of the DeepSeek code was removed or reverted. The single remaining bug was the FMP batch-OTC limitation — an undocumented FMP API constraint that was not apparent from code review alone.

## Fix

In `/api/fmp/company-identity` handler (`frontend/server/routes.ts`):

1. After `_buildProviderMap(needFetch)`, split provider symbols into two groups:
   - **OTC providers** — any provider symbol whose canonical form has an OTC prefix (`OTC:`, `OTCPK:`, `PINK:`, etc.)
   - **Regular providers** — all other symbols

2. **OTC symbols** → `Promise.all(otcProviders.map(ps => fetch(stable/profile?symbol=ps)))` — individual parallel FMP calls

3. **Regular symbols** → batch loop of 50, unchanged

Shared `_applyProfile` / `_applyNeg` helpers handle cache writes for both paths.

## Validation

**Live API (post-restart, server cache cleared):**

```
OTC:BESIY  → BE Semiconductor Industries N.V.  (exchange=OTC, beta=1.336)
OTC:NLST   → Netlist, Inc.                     (exchange=OTC, beta=1.334)
OTC:VLXGF  → Volex plc                         (exchange=OTC, beta=1.185)
OTC:SESMF  → SÜSS MicroTec SE                  (exchange=OTC, beta=2.105)
OTC:SLOIY  → Soitec S.A.                       (exchange=OTC, beta=1.869)
OTC:ATEYY  → Advantest Corporation             (exchange=OTC)
OTC:IFNNY  → Infineon Technologies AG          (exchange=OTC)
OTC:KRKNF  → Kraken Robotics Inc.              (exchange=OTC)
OTC:FLTCF  → Filtronic plc                     (exchange=OTC)
OTC:IQEPF  → IQE plc                           (exchange=OTC)
... (18/26 OTC symbols resolved; 3 genuinely absent from FMP → blank in UI)
```

**Test suite:** 145/145 pass (taxonomy editor × 36, taxonomy split × 20, taxonomy lib × 48, company identity × 41)

**Authenticated API test:** Login + identity call returns correct company names

## Behavior Preserved

- Ticker column stays `OTC:BESIY` (unchanged)
- Hide Foreign: OTC stays visible, true foreign-exchange listings hidden (FMP exchange metadata used)
- Existing search/add flow unchanged
- No per-row provider fetches; no N+1 pattern
- No new imports or providers introduced
- Options, quotes, beta, taxonomy, favorites, ticker popup all untouched
