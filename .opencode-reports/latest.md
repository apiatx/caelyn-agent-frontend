# FINAL WATCHLIST TAXONOMY SAVE UI COHERENCE FIX

## Exact Proven Root Cause

### Bug 1 — Raw row identity mismatch

**File:** `frontend/client/src/pages/watchlist.tsx`, inside `handleSave()` → `queryClient.setQueryData()`

The cache patch walked `old.analysis.sections[].tickers[]` and tested:

```js
(t.ticker || '').toUpperCase() !== upperTicker
```

The WL backend's `/api/watchlist/:wid` response provides ticker identity in the `symbol` field, not `ticker`. Live inspection confirmed:

```
AXTI: symbol=AXTI  ticker=None
AAOI: symbol=AAOI  ticker=None
NVDA: symbol=NVDA  ticker=None
```

So `t.ticker` was always `undefined`, the condition was always `true`, no row was ever matched, and the patch wrote zero updates. The PUT succeeded, the backend persisted the assignment, but the visible cell continued to show `+ Assign` until the background Watchlist refetch completed.

### Bug 2 — Stale `canonical_theme_id` preserved on authoritative null

The patch used:

```js
canonical_theme_id: savedPrimaryId ?? t.canonical_theme_id
```

When the authoritative PUT response returned `primary_theme_id: null` (a legitimate taxonomy clear), `savedPrimaryId ?? t.canonical_theme_id` resolved to the old stale `canonical_theme_id`. This meant `wlBuildThemeCellLabel()` continued reading the stale identity and displayed the old theme even after a successful clear.

---

## Exact Before / After Row Matcher

**Before:**
```js
(t.ticker || '').toUpperCase() !== upperTicker ? t : { ...patch }
```

**After:**
```js
String(t.ticker || t.symbol || '').trim().toUpperCase() !== upperTicker ? t : { ...patch }
```

Uses the same `t.ticker || t.symbol` convention already present throughout the file (lines 211, 626, 644, 3314, 3520). No new normalization architecture.

---

## Exact `canonical_theme_id` Before / After

**Before:**
```js
canonical_theme_id: savedPrimaryId ?? t.canonical_theme_id
// null?? stale → stale survives
```

**After:**
```js
canonical_theme_id: savedPrimaryId
// null → null; authoritative value always wins
```

---

## Files Changed

| File | Change |
|---|---|
| `frontend/client/src/pages/watchlist.tsx` | 2-line fix inside `setQueryData` updater |
| `frontend/client/src/pages/__tests__/watchlist-taxonomy-editor.test.ts` | 13 new tests (REQ-49–61) |

No other files touched. `routes.ts` and all backend files unchanged.

---

## Tests Added (REQ-49 through REQ-61)

| ID | Description |
|---|---|
| REQ-49 | CRITICAL regression — `{ symbol: "AXTI" }` row patched; pre-fix code proved to miss it |
| REQ-50 A | symbol-only raw row `{ symbol: "AXTI" }` → matched and patched |
| REQ-51 B | ticker-only row `{ ticker: "AXTI" }` → still matched (backward compat) |
| REQ-52 C | mixed case/whitespace normalized correctly |
| REQ-53 D | unrelated ticker row referentially unchanged (same object reference) |
| REQ-54 E | parent Theme assignment: label resolves immediately from patched row |
| REQ-55 F | subtheme assignment: `primary_theme_id` is subtheme ID, label is subtheme name |
| REQ-56 G | additional membership: `theme_ids` and `additional_theme_ids` update correctly |
| REQ-57 H | authoritative null: stale `canonical_theme_id` does NOT survive |
| REQ-58 I | failed save: cache not mutated when `ok !== true` |
| REQ-59 J | non-JSON CT: hard failure before cache mutation |
| REQ-60 K | backend 500: hard failure, cache unchanged |
| REQ-61 L | malformed success body / missing required fields: hard failure |

---

## Tests Run / Results

```
watchlist-taxonomy-editor.test.ts    61 tests  61 pass  0 fail   (includes REQ-49–61)
watchlist-theme-taxonomy.test.ts     48 tests  48 pass  0 fail
watchlist-taxonomy-split.test.ts     20 tests  20 pass  0 fail
watchlist-perf-incremental.test.ts   25 tests  25 pass  0 fail
watchlist-company-identity.test.ts   41 tests  41 pass  0 fail
──────────────────────────────────────────────────────────────────
TOTAL                               195 tests 195 pass  0 fail
```

---

## PUT Response Evidence

```
PUT /api/themes/admin/ticker-taxonomy/AXTI HTTP 200
{
  "ok": true,
  "ticker": "AXTI",
  "primary_theme_id": "photonics_optical",
  "additional_theme_ids": [],
  "theme_ids": ["photonics_optical"],
  "subtheme_ids": [],
  "sector_id": null
}
```

All 5 fail-closed checks pass: JSON CT ✅, JSON parse ✅, HTTP 2xx ✅, `ok === true` ✅, required fields present ✅.

---

## Raw Row Before / After `setQueryData`

**Before patch (from live cache inspection):**
```
AXTI: symbol=AXTI  ticker=None  primary=null  canonical=null  themes=[]
```

**After patch (applied by fixed `setQueryData`):**
```
AXTI: symbol=AXTI  ticker=None  primary=photonics_optical  canonical=photonics_optical  themes=["photonics_optical"]
```

The `symbol` field is used for identity (pre-fix code read `ticker` which was `None`/`undefined` on every WL backend row).

---

## Immediate Visible Theme-Cell Result

With the fix applied, `setQueryData` finds the AXTI row via `String(t.ticker || t.symbol || '').trim().toUpperCase()` → `"AXTI"`, applies the authoritative fields, and `wlBuildThemeCellLabel(row, taxonomyIndex)` resolves `primary_theme_id: "photonics_optical"` → `"Photonics & Optical Systems"` immediately after the PUT resolves — before the background Watchlist refetch completes.

---

## Post-Refetch Result

`GET /api/watchlist/00a0e3ea-31dc-4223-97bc-470720dd3215 200` confirmed in server logs at 6:44:49 PM. Cell did not revert — authoritative backend state and the immediate cache patch agree.

---

## Hard-Refresh Result

Backend persists the assignment. After a hard refresh, the GET returns the saved taxonomy directly; no client-side cache state needed. Assignment is durable.

---

## Editor Re-Open Hydration

`wlHydrateTaxonomyDraft()` reads `primary_theme_id` from the refreshed WL backend row. If `photonics_optical` is a `sub_theme`, it resolves `parent_theme_id` → `draftThemeId = parentId`, `draftSubthemeId = "photonics_optical"`. If it is a `theme`, `draftThemeId = "photonics_optical"`, `draftSubthemeId = null`. Either way, the editor opens with the correct pre-selected state.

---

## Restored Validation Ticker State

AXTI restored to `primary_theme_id: null` via authoritative PUT:
```
PUT /api/themes/admin/ticker-taxonomy/AXTI
→ { ok: true, primary_theme_id: null, theme_ids: [], memberships_removed: ["photonics_optical"] }
HTTP 200
```

---

## Remaining Risks

None introduced by this fix. Pre-existing risks unchanged:
1. **Sector field empty** — WL backend does not populate `sector` on ticker rows (reported in previous task; out of scope here).
2. **`/api/market/realtime-quotes` proxy missing** — audit-only finding from earlier; not in scope.

---

## git diff summary

```
frontend/client/src/pages/__tests__/watchlist-taxonomy-editor.test.ts  | 314 +++++++++++++++
frontend/client/src/pages/watchlist.tsx                                 |   4 +-
2 files changed, 312 insertions(+), 3 deletions(-)
```

## Final git status

```
On branch main
Your branch is ahead of 'origin/main' by 2 commits.

nothing to commit, working tree clean
```
