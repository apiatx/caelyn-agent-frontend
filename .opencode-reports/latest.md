# RESTORE COMPLETE WATCHLIST TAXONOMY EDITOR UI

## Exact Root Cause

**File:** `frontend/client/src/pages/watchlist.tsx`, line 2567 (pre-fix)

The Subtheme row was wrapped in a conditional guard:

```jsx
{draftThemeId && subthemesForDraftTheme.length > 0 && (
  <div style={_sec}>
    <div style={_lbl}>Subtheme</div>
    <select ...>
```

This caused the entire Subtheme section to vanish from the DOM in two cases:
1. `!draftThemeId` — no Primary Theme selected yet
2. `subthemesForDraftTheme.length === 0` — selected theme has no subtheme children

The row disappeared rather than presenting a disabled state, creating an inconsistent hierarchy (Sector → Primary Theme → Additional Themes, skipping Subtheme entirely).

---

## Exact Files Changed

| File | Change |
|---|---|
| `frontend/client/src/pages/watchlist.tsx` | Fixed conditional render → always-present row with disabled/placeholder |
| `frontend/client/src/pages/__tests__/watchlist-taxonomy-editor.test.ts` | Added REQ-37 through REQ-48 (12 new tests) |

No other files touched. `routes.ts` and all backend files are unchanged.

---

## Before / After Rendering Rule

**Before:**
```
{draftThemeId && subthemesForDraftTheme.length > 0 && (
  <div>Subtheme <select ...></div>
)}
```
The `&&` short-circuit made the row disappear from the DOM under two of three possible states.

**After:**
```
// Always rendered; three cases based on computed _subDisabled flag
const _subDisabled = !draftThemeId || subthemesForDraftTheme.length === 0;
<div style={_sec}>
  <div style={_lbl}>Subtheme</div>
  <select disabled={_subDisabled} style={{ ..._sel, opacity: _subDisabled ? 0.45 : 1 }}>
    {!draftThemeId
      ? <option>— Select a Primary Theme first —</option>
      : subthemesForDraftTheme.length === 0
        ? <option>— No subthemes for this theme —</option>
        : <>
            <option>— General {parentName} —</option>
            {subthemesForDraftTheme.map(...)}
          </>}
  </select>
</div>
```

| State | Rendered? | Enabled? | Placeholder |
|---|---|---|---|
| No Primary Theme (Case A) | ✅ always | ❌ disabled | "— Select a Primary Theme first —" |
| Theme with children (Case B) | ✅ always | ✅ enabled | "— General {ThemeName} —" + children |
| Theme without children (Case C) | ✅ always | ❌ disabled | "— No subthemes for this theme —" |

The row changes **state**, never **presence**.

---

## Sector Read-Only Trace Finding

**Data path:**
1. `WlTaxonomyEditorPanel` receives `stockRow` prop
2. `stockRow` is `allStocks.find(s => s.ticker === activeTaxonomyEditTicker)`
3. `allStocks` = `useMemo(() => extractAllStocks(analysis), [analysis])`
4. `extractAllStocks` maps `analysis.sections[].tickers[]` items via `extractAllStocks()` (line 196):
   - `sector: t.sector ?? t.category ?? t.industry`
5. `sectorLabel = (stockRow?.sector as string | null | undefined) || null`

**Finding:** The `analysis` object comes from the WL backend's `/api/watchlist/:wid` response. The backend's ticker items in `analysis.sections[].tickers[]` do **not** currently populate a `sector`, `category`, or `industry` field. All three resolve to `undefined`, so `sectorLabel` is `null` and the editor displays `—`.

**What was NOT done (per spec):** No inference from Theme, no subtheme derivation, no new endpoint, no provider call, no hardcoded sectors. The read-only display already shows `—` gracefully. Fixing this requires the WL backend to include a `sector` field on ticker rows in the analysis response — that is out of scope for this task.

---

## Tests Run / Results

```
watchlist-taxonomy-editor.test.ts    48 tests  48 pass  0 fail   (includes 12 new REQ-37–48)
watchlist-theme-taxonomy.test.ts     48 tests  48 pass  0 fail
watchlist-taxonomy-split.test.ts     20 tests  20 pass  0 fail
watchlist-perf-incremental.test.ts   25 tests  25 pass  0 fail
watchlist-perf-pass2.test.ts         20 tests  20 pass  0 fail
watchlist-perf-pass3.test.ts         21 tests  21 pass  0 fail
watchlist-company-identity.test.ts   41 tests  41 pass  0 fail
──────────────────────────────────────────────────────────────────
TOTAL                               223 tests 223 pass  0 fail
```

New tests added (REQ-37 through REQ-48):
- REQ-37: Case A — no Primary Theme → disabled, correct placeholder
- REQ-38: Case B — theme with children → enabled, child count ≥2
- REQ-39: Case C — theme without children → disabled, "No subthemes" placeholder
- REQ-40: Parent change clears draftSubthemeId
- REQ-41: Switching back to original parent does not auto-restore old subtheme
- REQ-42: Existing subtheme hydration → parent+subtheme correctly resolved
- REQ-43: Hydration does not flatten subtheme to parent theme
- REQ-44: Save semantics — parent-only effectivePrimaryId equals draftThemeId
- REQ-45: Save semantics — subtheme effectivePrimaryId equals draftSubthemeId (not parent)
- REQ-46: Save semantics — additional themes unaffected by subtheme selection
- REQ-47: Fail-closed — missing ok:true is rejected
- REQ-48: Fail-closed — missing required fields are rejected

---

## Browser Validation

App running on Vite dev server. TypeScript errors confirmed to be pre-existing (HistoryPanel.tsx, TradingAgent.tsx, WatchlistAnalysis.tsx — files untouched). The watchlist.tsx change was HMR-applied without error.

The modal renders all four rows in the correct fixed order:
```
Sector
[— or actual sector]                                    (read-only)

Primary Theme
[— None — or selection]

Subtheme
[— Select a Primary Theme first —]  disabled            (Case A)
  → after theme selection with children: enabled         (Case B)
  → after theme selection without children: disabled     (Case C)

Additional Themes
[+ Add additional theme]
```

The row does not appear/disappear — it transitions between enabled and disabled states.

---

## git diff summary

```
frontend/client/src/pages/__tests__/watchlist-taxonomy-editor.test.ts  | 139 +++++++++++++++
frontend/client/src/pages/watchlist.tsx                                 |  48 +++---
2 files changed, 171 insertions(+), 16 deletions(-)
```

## Final git status

```
On branch main
Your branch is ahead of 'origin/main' by 1 commit.
  (use "git push" to publish your local commits)

nothing to commit, working tree clean
```
