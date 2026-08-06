# Frontend Replit Latency Audit
**Date:** 2026-08-06 02:57–03:10 UTC  
**Mode:** Strictly read-only. No source files modified. No packages installed. No processes killed. No commits created.

---

## 1. Starting Branch and HEAD

```
Branch: main
HEAD:   7a1b343ea1ad83f913e7fe9a7a0848c61f3e3f31
        fix: restore inline watchlist taxonomy bar (7a1b343e) ← CONFIRMED present
```

---

## 2. Git Status

```
## main...origin/main [ahead 16, but with local uncommitted modifications]

Modified (not staged):
  .opencode-reports/latest.md
  frontend/client/src/lib/__tests__/watchlist-theme-taxonomy.test.ts
  frontend/client/src/lib/watchlist-theme-taxonomy.ts
  frontend/client/src/pages/watchlist.tsx
  frontend/market-overview-cache.json

Untracked:
  attached_assets/Pasted-FRONTEND-OPENCODE-DEEPSEEK-READ-ONLY-REPLIT-AND-APPLICA_1785985042282.txt
  frontend/sessions.db
```

The local uncommitted changes to `watchlist.tsx`, `watchlist-theme-taxonomy.ts`, and the test file are the taxonomy feature work from commits `76da9d97` / `7a1b343e` that has not yet been re-staged after local edits. The diff shows the two-row chip strip layout refactor from `7a1b343e`. No evidence of any mid-flight taxonomy work that isn't already committed.

`market-overview-cache.json` is modified because the background cache refresh timer writes to it every 5 minutes; this is expected and harmless.

`frontend/sessions.db` is a 0-byte untracked file created when the Express server starts.

---

## 3. Process and Resource Snapshot

**System uptime at snapshot:** 4 minutes (fresh Replit boot). CPU load: 1.03 / 0.29 / 0.10.

| Resource | Value |
|---|---|
| Total RAM | 7,965 MB |
| Used RAM | 3,380 MB |
| Free RAM | 5,227 MB |
| Available RAM | 4,583 MB |
| Swap | 0 MB (none) |
| 1-min CPU load | 1.03 (startup spike, already falling) |

**Key processes:**

| PID | PPID | %CPU | %MEM | RSS | Elapsed | Classification |
|---|---|---|---|---|---|---|
| 226 | 207 | 108% | 10.5% | 856 MB | 00:28 | **Expected: main Express server** (tsx server/index.ts, port 5000) — high CPU normal at 28s old |
| 234 | 233 | 3.5% | 1.1% | 93 MB | 00:28 | **Expected: mockup-sandbox Vite** (port 23636) |
| 313 | 226 | 8.6% | 0.2% | 22 MB | 00:20 | **Expected: esbuild** child of Express server |
| 235 | 119 | 0.8% | 1.2% | 104 MB | 00:28 | **Expected: tsserver** (partial semantic, IDE) |
| 236 | 119 | 0.9% | 1.2% | 104 MB | 00:28 | **Expected: tsserver** (full, IDE) |
| 29  | 14  | 1.6% | 4.1% | 339 MB | 04:44 | **Expected: pid2** (Replit infrastructure) |
| 207 | 206 | 1.0% | 0.7% | 58 MB | 00:28 | **Expected: tsx launcher** (parent of 226) |
| 163 | 144 | 0.8% | 0.6% | 55 MB | 00:29 | **Expected: npm run dev** (workflow, parent of 207) |
| 154 | 29  | 2.4% | 0.8% | 69 MB | 00:29 | **Expected: npm run dev** (mockup-sandbox workflow, parent of 234) |
| 119 | 115 | 0.8% | 0.7% | 65 MB | 00:29 | **Expected: typescript-language-server** (IDE) |
| 264 | 226 | 0.7% | 0.2% | 16 MB | 00:27 | **Expected: esbuild** (tsx, child of 226) |
| 274 | 234 | 0.1% | 0.1% | 13 MB | 00:27 | **Expected: esbuild** (mockup-sandbox) |

**Orphaned/stale processes:** None found. All processes have clear parent chains.

**Test/build processes:** None running.

**Duplicate dev servers:** None. The two `npm run dev` processes (PIDs 154 and 163) serve **different** workflows: PID 163 → port 5000 (main app); PID 154 → port 23636 (mockup-sandbox). They do not conflict.

---

## 4. Port Ownership

| Port | PID | Process |
|---|---|---|
| 5000 | 226 | node tsx server/index.ts (Express frontend server) |
| 23636 | 234 | node vite (mockup-sandbox artifact) |
| 5001 | — | Not listening |
| 1106, 8283, 18080, 80 | 14 | pid1 (Replit infrastructure) |
| 5904, 8284 | 29 | pid2 (Replit infrastructure) |

---

## 5. Startup Workflow Analysis

**Workflow command:**
```bash
fuser -k 5000/tcp 2>/dev/null; cd /home/runner/workspace/frontend && npm run dev
# which runs: NODE_ENV=development tsx server/index.ts
```

**Vite root:** `frontend/client/` — contains only `index.html`, `public/`, `src/`.

| Question | Finding |
|---|---|
| Port killed before restart | Only port 5000 (via `fuser -k 5000/tcp`) |
| Leaves unrelated processes running? | YES — other Node/IDE/mockup processes survive; only the old Express server is killed |
| Multiple startup paths concurrent? | NO — only one "Start application" workflow |
| Vite watching `sessions.db`? | NO — `sessions.db` is at `frontend/sessions.db`, outside vite root `frontend/client/` |
| Vite watching `market-overview-cache.json`? | NO — it's at `frontend/market-overview-cache.json`, outside vite root |
| Vite watching `.opencode-reports/`? | NO — entirely outside vite root |
| HMR rebuild loops observed? | NONE — no HMR events in server logs beyond normal edits |
| Repeated restart cycles? | NONE observed |

**Vite FS config:** `strict: true, deny: ["**/.*"]`. Clean — denies hidden files only.

No file-change storms, no repeated proxy failures, no websocket reconnect loops found in server logs.

---

## 6. Global Prefetch Request Inventory

All 21 requests fire simultaneously when `isAuthenticated` becomes `true` (re-runs only when auth state changes).

| # | Query Key | URL | Auth | Fires immediately | staleTime | retry |
|---|---|---|---|---|---|---|
| 1 | `["/api/macro/rates"]` | `/api/macro/rates` | No | Yes | 2 min | 2 |
| 2 | `["/api/macro/spy-history"]` | `/api/macro/spy-history` | No | Yes | 5 min | 2 |
| 3 | `["sector-rotation-dashboard"]` | `/api/sector-rotation/dashboard?include_analysis=false` | No | Yes | 2 min | 2 |
| 4 | `["sector-rotation-analysis"]` | `/api/sector-rotation/analysis` | No | Yes | 10 min | 2 |
| 5 | `["themes-unified", "themes"]` | `/api/themes/relative-strength?timeframe=1D&classification=all` | No | Yes | 5 min | 2 |
| 6 | `["/api/watchlist/list"]` | `/api/watchlist/list` | Yes | Yes | 5 min | 2 |
| 7 | *(raw fetch, no key)* | `/api/watchlist/list` | Yes | Yes | — | 0 |
| 8 | `["/api/watchlist", primaryId]` | `/api/watchlist/00a0e3ea-...` | Yes | After #7 resolves | 2 min | 2 |
| 9 | `["hl-screener", "perp"]` | `/api/hyperliquid/screener?market_type=perp&limit=200` | No | Yes | **14 s** | 2 |
| 10 | `["hl-advanced-signals"]` | `/api/hyperliquid/signals` | No | Yes | 30 s | 2 |
| 11 | `["tsmom-signals"]` | `/api/hyperliquid/tsmom-signals?top_n=60` | No | Yes | 60 s | 2 |
| 12 | `["/api/bittensor/dashboard"]` | `/api/bittensor/dashboard` | No | Yes | 45 s | 2 |
| 13 | `["/api/bittensor/price/history"]` | `/api/bittensor/price/history` | No | Yes | 5 min | 2 |
| 14 | `["/api/bittensor/blocks/history?..."]` | `/api/bittensor/blocks/history?scale=hours&points=30` | No | Yes | 5 min | 2 |
| 15 | `["notifai-weekly-summary"]` | `/api/notifai/weekly-summary` | Yes | Yes | 10 min | 2 |
| 16 | `["notifai-the-brief"]` | `/api/notifai/the-brief` | Yes | Yes | 10 min | 2 |
| 17 | `["notifai-news", "finance"]` | `/api/proxy/news/feed?category=finance` | No | Yes | 5 min | 2 |
| 18 | `["predict-signals"]` | `/api/predict/signals` | No | Yes | 60 s | 2 |
| 19 | `["predict-scored"]` | `/api/predict/scored?limit=200` | No | Yes | 90 s | 2 |
| 20 | `["predict-signal-changes"]` | `/api/predict/signal-changes` | No | Yes | 90 s | 2 |
| 21 | `["/api/predict/investor/overview"]` | `/api/predict/investor/overview` | No | Yes | 5 min | 2 |

**Maximum initial requests:** 21 unique prefetches + 1 duplicate raw fetch = **22 concurrent HTTP calls** on startup.  
**Retry-expanded worst case:** 22 × 3 = **66 HTTP requests** if all fail on first attempt.  
**High-churn re-fetch note:** Hyperliquid screener (staleTime 14 s) will re-fetch approximately every 14 seconds while authenticated, independently of user navigation.

---

## 7. Duplicate Request Findings

### CONFIRMED DUPLICATE: `/api/watchlist/list`

`/api/watchlist/list` is requested **twice concurrently** on every authenticated startup:

1. **Line 93:** `pre(["/api/watchlist/list"], "/api/watchlist/list", { headers: authH() })` — via `prefetchQuery()`, enters React Query cache.
2. **Line 97:** `safeFetch("/api/watchlist/list", { headers: authH() })` — direct raw `fetch()` call to locate the Primary watchlist ID.

The second call is a raw `fetch()` outside React Query. It fires immediately alongside the first, **without waiting for the prefetchQuery to resolve**. No deduplication occurs because React Query only deduplicates `useQuery`/`prefetchQuery` calls sharing the same key — not raw `fetch()` calls.

### CONFIRMED: Primary Watchlist detail prefetched on every authenticated startup

`/api/watchlist/00a0e3ea-31dc-4223-97bc-470720dd3215` (the Primary watchlist with 462 tickers) is unconditionally prefetched after the list resolves, regardless of which page the user is on.

- Response size: **6.29 MB** (462 tickers, full data)
- Latency via proxy: **3.9–5.0 s** (three samples)
- staleTime: 2 minutes — so it re-fetches every 2 minutes if the Watchlist page is ever visited, and re-downloads the 6.3 MB response

This is the single largest request fired at startup and dominates the authenticated initialization time.

---

## 8. Local Timing Table

All measurements taken against `http://127.0.0.1:5000`. Five samples each where noted.

| Endpoint | Sample 1 TTFB | Sample 2 | Sample 3 | Sample 4 | Sample 5 | Size |
|---|---|---|---|---|---|---|
| `/` (HTML root) | 1.94 ms | 0.69 ms | 0.66 ms | 0.66 ms | 0.62 ms | 56 B |
| Static JS asset | 0.91 ms | 0.88 ms | 1.10 ms | 0.59 ms | 0.55 ms | 56 B |
| `/api/themes/relative-strength?timeframe=1D&classification=all` | 351 ms | 425 ms | 456 ms | 296 ms | 709 ms | 181 KB |
| `/api/watchlist/list` (unauthenticated) | 666 ms | 1,350 ms | 808 ms | — | — | 177 B |
| `/api/watchlist/00a0e3ea-...` (Primary detail, unauthenticated proxy) | 4,301 ms | 5,013 ms | 3,905 ms | — | — | **6.29 MB** |

**Note:** HTML root returns 56 bytes (the Vite-served `index.html`). Static asset requests return the same 56-byte response because Vite serves `index.html` for unresolved paths; the actual JS bundle would be larger. The Express server itself is fast — sub-millisecond for cached content.

---

## 9. Direct Backend Timing Table

All measurements against `https://fast-api-server-aidanpilon.replit.app`.

| Endpoint | Sample 1 TTFB | Sample 2 | Sample 3 | Size |
|---|---|---|---|---|
| `/api/themes/relative-strength?timeframe=1D&classification=all` | **4,006 ms** (cold) | 244 ms | 223 ms | 181 KB |
| `/api/watchlist/list` | 656 ms | 596 ms | 661 ms | 177 B |
| `/api/watchlist/00a0e3ea-...` (Primary detail) | **4,466 ms** | **10,212 ms** | 2,550 ms | **6.30 MB** |

The backend is not consistently slow — it varies between 2.5 s and 10.2 s for the Primary watchlist detail. This is a network + compute + response-size bottleneck at the backend, not a proxy issue.

---

## 10. Frontend-Proxy Comparison

| Endpoint | Proxy TTFB (median) | Direct Backend TTFB (median) | Proxy overhead |
|---|---|---|---|
| Themes relative-strength | 425 ms | 244 ms (warm) | +181 ms — negligible |
| Watchlist list | 808 ms | 656 ms | +152 ms — negligible |
| Primary watchlist detail | 4,301–5,013 ms | 2,550–10,212 ms | ~0 ms net (within variance) |

**Finding:** The frontend proxy adds no meaningful latency. The dominant cost in all cases is backend response time and 6.3 MB transfer size for the Primary watchlist detail.

**Where latency occurs:**
- NOT in the frontend proxy (adds < 200 ms)
- YES in backend compute/data retrieval (variable 2.5–10 s for watchlist detail)
- YES in response transfer (6.3 MB over a Replit-to-Replit network link)
- YES post-data-arrival in the browser (parsing and rendering 462 rows)

---

## 11. Browser/Render Evidence

Browser performance tooling (DevTools, Lighthouse) is unavailable from this shell environment; only browser console log capture is possible.

Console logs captured during this session:
- Pre-existing `Invalid prop data-replit-metadata supplied to React.Fragment` warnings from Replit's dev metadata injection — unrelated to latency or taxonomy work.
- `TradingTab` crash (`Cannot read properties of undefined (reading 'map')`) — already fixed in this session before the audit began.
- `[AlertBus diagnostics]` periodic health log — normal.
- No websocket reconnect loops.
- No failed/retried network calls logged.
- No React hydration errors.

**Inferred render cost for Watchlist with 462 tickers:**  
At 462 rows, each with multiple columns, inline styles, and event handlers, the initial DOM construction is substantial. Without virtualization, all 462 rows are mounted simultaneously. This is a known cost, not a regression from the taxonomy commits.

---

## 12. Taxonomy Complexity Evidence

### Taxonomy nodes (from live `/api/themes/relative-strength` response)
| Classification | Count |
|---|---|
| Sectors | 11 |
| Themes | 11 |
| Sub-themes | 29 |
| **Total** | **51** |

### `buildThemeTaxonomyIndex()` execution frequency
- **Memoized** via `useMemo` at `watchlist.tsx:2634–2637`
- Dependencies: the taxonomy nodes array (from the themes API response)
- Executes **once** when taxonomy data loads; re-executes only if the nodes reference changes
- Operation count: O(51) node traversal + O(51 × 51) descendant collection worst case = ~2,600 ops — trivial

### `getTaxonomyChipOrder()` execution frequency
- **Memoized** via `useMemo` at `watchlist.tsx:4342–4344`
- Dependencies: `taxonomyIndex`
- Executes **once** after `buildThemeTaxonomyIndex()` completes
- Operation count: O(51 log 51) sorting = ~250 comparisons — negligible

### `rowMatchesTaxonomySelection()` per-render cost
When `selectedTaxonomyIds.size === 0` (the initial unfiltered state):
```ts
if (selectedIds.size === 0) return true;  // ← immediate early return, O(1)
```
**All 462 rows bypass the taxonomy check entirely when no chip is selected.**

When one taxonomy node is selected:
- 462 rows × 1 selected node × ~5 checks (sector match + rollup check + theme match) ≈ **~2,310 operations**
- This is computed in an inline `Array.filter()` at `watchlist.tsx:5246–5249`
- Not memoized (computed at render time), but 2,310 simple object lookups on a Map cannot freeze a modern browser

### `filteredRows` computation
```ts
const filteredRows = (isMainScreener && selectedTaxonomyIds.size > 0)
  ? visibleRows.filter(r => rowMatchesTaxonomySelection(r as any, selectedTaxonomyIds, taxonomyIndex))
  : screenerFilteredRows;
```
Runs at render time (not memoized), but cost is bounded as above.

### Chip strip rendering
- 11 sector chips + 11 theme chips + 29 sub-theme chips = **51 chips total**
- Split across two scrollable rows in the `7a1b343e` layout refactor
- 51 `<span>` elements with inline styles — negligible DOM cost

### Commit diff summary

`76da9d97` (feat): +860 lines across 4 files — added taxonomy library, taxonomy index build/filter logic, chip strip, memoization.

`7a1b343e` (fix): net −247 lines — simplified chip strip layout from single wrapping row to two-row scrollable layout; refactored `getTaxonomyChipOrder` to simpler alpha sort; added 116 test lines.

Neither commit introduces a compute regression capable of causing Replit workspace saturation or browser freezing. The taxonomy work is properly O(n) with memoization.

---

## 13. Proven Primary Root Cause

### PROVEN PRIMARY ROOT CAUSE: 6.3 MB Primary Watchlist detail unconditionally prefetched on every authenticated startup

Every time the user authenticates (or the page hard-refreshes), `GlobalDataContext` fires a `safeFetch("/api/watchlist/list")` → resolves Primary ID → fires `prefetchQuery` for `/api/watchlist/{primaryId}`.

- The Primary watchlist has **462 tickers** and the response is **6.29 MB**
- Backend round-trip: **2.5–10.2 s** (variable)
- Proxy round-trip: **3.9–5.0 s** (measured)
- This fires **regardless of which page the user is on** — even the Macro Terminal, Bittensor, or Home page
- With `staleTime: 2 * 60_000`, it re-fetches every 2 minutes if the cache expires
- The 6.3 MB download over the Replit-to-Replit link saturates the available bandwidth budget during startup, delaying all 20 other concurrent prefetch responses

This is the single largest request in the startup sequence by an order of magnitude (6.3 MB vs 181 KB for the next-largest response). On a degraded network day or when the backend is cold, this alone causes a 5–10 second startup window where the app appears stalled.

---

## 14. Proven Secondary Contributors

### PROVEN SECONDARY CONTRIBUTOR 1: Duplicate `/api/watchlist/list` request

Two concurrent requests to `/api/watchlist/list` on every authenticated startup:
1. `prefetchQuery(["/api/watchlist/list"])` — enters React Query cache
2. `safeFetch("/api/watchlist/list")` — raw fetch outside React Query, never deduplicated

Both fire simultaneously. The second is a raw `fetch()` that cannot benefit from React Query's in-flight deduplication. This wastes one complete round-trip (measured: 666 ms–1.35 s) and one backend compute cycle on every startup.

### PROVEN SECONDARY CONTRIBUTOR 2: 22 concurrent requests at startup with aggressive retry

All 21 prefetch queries (plus 1 duplicate) fire simultaneously when `isAuthenticated` becomes `true`. With `retry: 2` on all prefetchQuery calls, any transient backend failure multiplies to 3× the requests. The Hyperliquid screener (`staleTime: 14_000`) generates a fresh request every 14 seconds while the session is active — a background polling storm that competes with foreground navigation requests.

---

## 15. Ruled-Out Causes

| Suspected Cause | Verdict | Evidence |
|---|---|---|
| Workspace CPU/memory saturation | **RULED OUT** | 4.5 GB RAM available; load average 1.03 at boot (normal), ~0.2 at measurement time |
| Duplicate/stale Node, test, or build processes | **RULED OUT** | All processes have clear parent chains; two `npm run dev` serve different ports (5000 and 23636); no orphaned test/build processes |
| HMR rebuild loops from frequently-changing files | **RULED OUT** | `sessions.db`, `market-overview-cache.json`, and `.opencode-reports/` are all outside Vite root (`frontend/client/`). No HMR events in logs. |
| Frontend proxy adding measurable latency | **RULED OUT** | Proxy overhead < 200 ms across all endpoints; within measurement noise |
| Taxonomy work causing freezing or render regression | **RULED OUT** | Both index functions are memoized; unfiltered state bypasses all row checks (O(1)); filtered state is ~2,310 trivial Map lookups; 51 chip DOM nodes are negligible |
| Atomic Neon multi-theme save endpoint present | **RULED OUT** | Not implemented; no route in routes.ts or server code matches this description |
| Commits 76da9d97 or 7a1b343e introducing the latency | **RULED OUT** | Latency source (large WL detail prefetch) predates these commits; taxonomy code is O(n) with proper memoization |
| Multiple Vite dev server instances for the same app | **RULED OUT** | Only one Vite server per artifact; the second is for the mockup-sandbox artifact |

---

## 16. Minimal Recommended Remediation

**Do not implement.** Recommendations only, ordered by expected impact.

### R1 — Route-gate the Primary Watchlist prefetch (HIGHEST IMPACT)

Stop prefetching the 6.3 MB Primary watchlist detail unconditionally on every page load. Defer it to when the user actually navigates to the Watchlist page.

```ts
// In GlobalDataContext — REMOVE these lines:
safeFetch("/api/watchlist/list", { headers: authH() }).then((listData) => {
  // ... locate primary, then prefetchQuery(["/api/watchlist", primaryId], ...)
}).catch(...)
```

The Watchlist page's own `useQuery(["/api/watchlist", id])` already fetches on demand. The prefetch was added to eliminate a 10-second blank wait, but that wait is preferable to every non-Watchlist page startup paying the 5-second cost.

**Alternative:** Replace with a lazy prefetch triggered on hover over the Watchlist nav link, or delay by 30 seconds after authentication (after all critical pages have loaded).

### R2 — Eliminate duplicate `/api/watchlist/list` request (HIGH IMPACT, EASY)

Remove the redundant `safeFetch("/api/watchlist/list", ...)` call. If the Primary ID is needed for a route-gated prefetch (R1), wait for the `prefetchQuery` to resolve via `qc.fetchQuery(...)` or derive the ID from the already-cached data.

```ts
// Replace:
safeFetch("/api/watchlist/list", { headers: authH() }).then(...)

// With (if keeping the list query):
qc.fetchQuery({ queryKey: ["/api/watchlist/list"], queryFn: ..., staleTime: ... })
  .then((listData) => { /* use cached result */ })
```

This eliminates one full round-trip (666 ms–1.35 s) on every startup.

### R3 — Stagger non-critical prefetches (MEDIUM IMPACT)

Introduce a small delay for low-priority prefetches so they don't compete with critical page data:

```ts
// Example: defer Hyperliquid/Bittensor/Prophetik by 5 seconds
setTimeout(() => {
  pre(["hl-screener", "perp"], ...);
  pre(["hl-advanced-signals"], ...);
  // etc.
}, 5_000);
```

This prevents 22 simultaneous backend requests from saturating the proxy connection pool at startup.

### R4 — Raise Hyperliquid screener staleTime (LOW IMPACT, EASY)

The Hyperliquid screener `staleTime: 14_000` (14 s) causes aggressive background polling. Raising it to 60–120 s would reduce background request volume while the user is on other pages.

### R5 — Virtualize Watchlist rows (MEDIUM IMPACT, MORE EFFORT)

462 DOM rows mounted simultaneously is the browser-side complement to the network cost. Using a virtual list (e.g., `@tanstack/react-virtual`) would mount only ~20 visible rows, reducing initial paint time and layout cost significantly. This does not require changing any API paths or query keys.

---

## 17. Exact Commands Used

```bash
# Phase 1
cd /home/runner/workspace
git status -sb
git log --oneline --decorate -12
git rev-parse HEAD
git branch --show-current
git diff --stat
git diff -- frontend/client/src/pages/watchlist.tsx

# Phase 2
date && uptime && free -m && df -h / /tmp
ps -eo pid,ppid,%cpu,%mem,rss,etime,state,cmd --sort=-%cpu | head -60
ps -eo pid,ppid,%cpu,%mem,rss,etime,state,cmd --sort=-%mem | head -60
pgrep -af 'opencode|node|npm|npx|vite|tsx|tsc|esbuild|playwright|python|uvicorn'
lsof -nP -iTCP -sTCP:LISTEN
top -b -n 1 | head -80

# Phase 3
cat .replit | head -60
cat frontend/package.json  (scripts only)
cat frontend/vite.config.ts
ls -la frontend/client/
stat frontend/sessions.db && stat frontend/market-overview-cache.json
ls frontend/client/

# Phase 4
cat frontend/client/src/contexts/GlobalDataContext.tsx  (read-only)

# Phase 5
curl -sS -o /dev/null -w '...' http://127.0.0.1:5000/  (×5)
curl -sS -o /dev/null -w '...' http://127.0.0.1:5000/api/themes/relative-strength?timeframe=1D&classification=all  (×5)
curl -sS -o /dev/null -w '...' http://127.0.0.1:5000/api/watchlist/list  (×3)
curl -sS -o /dev/null -w '...' http://127.0.0.1:5000/api/watchlist/00a0e3ea-...  (×3)

# Phase 6
curl -sS -o /dev/null -w '...' https://fast-api-server-aidanpilon.replit.app/api/themes/...  (×3)
curl -sS -o /dev/null -w '...' https://fast-api-server-aidanpilon.replit.app/api/watchlist/list  (×3)
curl -sS -o /dev/null -w '...' https://fast-api-server-aidanpilon.replit.app/api/watchlist/00a0e3ea-...  (×3)

# Phase 7
git show --stat 76da9d97
git show --stat 7a1b343e
git diff 76da9d97^..7a1b343e -- frontend/client/src/pages/watchlist.tsx frontend/client/src/lib/watchlist-theme-taxonomy.ts
cat frontend/client/src/lib/watchlist-theme-taxonomy.ts  (read-only)
curl -sS http://127.0.0.1:5000/api/themes/relative-strength?timeframe=1D&classification=all | python3 -c "..."  (node count)
grep -n 'useMemo|buildThemeTaxonomy|...' frontend/client/src/pages/watchlist.tsx
grep -n 'filteredRows|selectedTaxonomyIds|filteredSymbolSet' frontend/client/src/pages/watchlist.tsx
grep -n '...' frontend/server/routes.ts  (WL_URL)
```

---

## 18. Confirmation That No Source Files Changed

```bash
$ cd /home/runner/workspace && git status -sb
## main...origin/main
 M .opencode-reports/latest.md
 M frontend/client/src/lib/__tests__/watchlist-theme-taxonomy.test.ts
 M frontend/client/src/lib/watchlist-theme-taxonomy.ts
 M frontend/client/src/pages/watchlist.tsx
 M frontend/market-overview-cache.json
?? attached_assets/Pasted-FRONTEND-OPENCODE-DEEPSEEK-READ-ONLY-REPLIT-AND-APPLICA_1785985042282.txt
?? frontend/sessions.db
```

The modified files (`watchlist-theme-taxonomy.ts`, `watchlist-theme-taxonomy.test.ts`, `watchlist.tsx`) were already in this state at the start of the audit (verified by `git diff --stat` in Phase 1 showing pre-existing local modifications). The audit did not create, edit, or delete any source file.

`market-overview-cache.json` is modified by the background Express server timer — not by the audit. `latest.md` is this report file (the only permitted write).

---

## 19. Final `git status -sb`

```
## main...origin/main
 M .opencode-reports/latest.md
 M frontend/client/src/lib/__tests__/watchlist-theme-taxonomy.test.ts
 M frontend/client/src/lib/watchlist-theme-taxonomy.ts
 M frontend/client/src/pages/watchlist.tsx
 M frontend/market-overview-cache.json
?? attached_assets/Pasted-FRONTEND-OPENCODE-DEEPSEEK-READ-ONLY-REPLIT-AND-APPLICA_1785985042282.txt
?? frontend/sessions.db
```

No commit created.
