# feat: split Watchlist theme filters by hierarchy

## 1. Starting HEAD / status

- **Starting HEAD**: `9c120101` (origin/main, HEAD)
- **Branch**: `main`
- **git status -sb before changes**: `## main...origin/main` — clean (one untracked attached_asset prompt file, never staged)

## 2. Exact taxonomy data path

The canonical taxonomy is fetched once per session by the existing query in `watchlist.tsx`:

```typescript
const { data: themeUniverseResp } = useQuery({
  queryKey: ['themes-unified', 'themes'],
  queryFn: () => fetch(`/api/themes/relative-strength?timeframe=1D&classification=all`)
    .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); }),
  staleTime: 5 * 60_000,
  retry: 1,
});
const taxonomyIndex: ThemeTaxonomyIndex = useMemo(() => {
  const nodes = (themeUniverseResp as any)?.themes ?? [];
  return buildThemeTaxonomyIndex(nodes);
}, [themeUniverseResp]);
```

No new API call was added. The same `taxonomyIndex` drives all three filter rows. Backend taxonomy data is authoritative; no frontend hardcoding.

## 3. Files changed

| File | Change |
|---|---|
| `frontend/client/src/lib/watchlist-theme-taxonomy.ts` | `getTaxonomyChipOrder` updated — returns `subthemeOrder` in addition to `sectorOrder` and `themeOrder` |
| `frontend/client/src/pages/watchlist.tsx` | `renderTaxonomyBar` updated — destructures `subthemeOrder`, adds SUBTHEMES row |
| `frontend/client/src/lib/__tests__/watchlist-theme-taxonomy.test.ts` | Updated 7 tests that relied on the old flat `themeOrder` |
| `frontend/client/src/pages/__tests__/watchlist-taxonomy-split.test.ts` | **New file** — 20 tests covering all 16 task requirements |

## 4. How SECTORS is derived

```typescript
// In getTaxonomyChipOrder (watchlist-theme-taxonomy.ts)
const sectorOrder = [...index.sectorIds].sort((a, b) => {
  const na = nodeById.get(a);
  const nb = nodeById.get(b);
  return (na?.display_name ?? a).localeCompare(nb?.display_name ?? b);
});
```

`index.sectorIds` is built by `buildThemeTaxonomyIndex` from nodes where `classification === "sector"`. Sorted A→Z by `display_name`. Unchanged from pre-task behavior.

## 5. How THEMES is derived

```typescript
// In getTaxonomyChipOrder (watchlist-theme-taxonomy.ts)
const themeArr: string[] = [];
// ...
const cls = node.classification;
if (cls === "market_lens" || cls === "deprecated") continue;
if (cls === "theme") {
  themeArr.push(id);
}
// ...
return { ..., themeOrder: themeArr.sort(sortByName) };
```

Only nodes where `classification === "theme"` are included. Sorted A→Z by `display_name`. `market_lens` and `deprecated` explicitly excluded.

Previously `themeOrder` contained ALL non-sector nodes (theme + sub_theme + market_lens). Now it contains only `classification === "theme"` nodes.

## 6. How SUBTHEMES is derived

```typescript
// In getTaxonomyChipOrder (watchlist-theme-taxonomy.ts)
const subthemeArr: string[] = [];
// ...
const cls = node.classification;
if (cls === "market_lens" || cls === "deprecated") continue;
if (cls === "sub_theme") {
  subthemeArr.push(id);
}
// ...
return { ..., subthemeOrder: subthemeArr.sort(sortByName) };
```

Only nodes where `classification === "sub_theme"` are included. All subthemes (both with and without resolved parents) appear. Sorted A→Z by `display_name`. `market_lens` and `deprecated` explicitly excluded.

## 7. Confirmation: market_lens excluded from Watchlist filters

In `getTaxonomyChipOrder`:
```typescript
if (cls === "market_lens" || cls === "deprecated") continue;
```

This explicit guard runs before any classification-based push. Nodes with `classification === "market_lens"` (Gold, Silver, Copper commodity lenses) are not pushed into `themeArr`, `subthemeArr`, and were never in `sectorArr`. They appear in none of the three rows.

Test req-4 covers: "market_lens nodes absent from all three filter rows".

## 8. Confirmation: deprecated excluded defensively

Same guard as above: `cls === "deprecated"` triggers `continue` before any array push. Even if the backend runtime sends zero deprecated nodes (as expected), any that slip through are silently excluded from all filter rows.

Test req-5 covers: "deprecated nodes absent from all three filter rows".

## 9. Parent-theme filtering validation

`rowMatchesTaxonomySelection` logic is **unchanged**. When a `theme` node is selected, its `descendantIdsByThemeId` set (built from `parent_theme_id` links by `buildThemeTaxonomyIndex`) is added to the match set:

```typescript
const matchSet = new Set<string>([selId]);
const descendants = index.descendantIdsByThemeId.get(selId);
if (descendants) {
  const descArr = Array.from(descendants);
  for (let di = 0; di < descArr.length; di++) {
    matchSet.add(descArr[di]);
  }
}
```

Selecting "Semiconductors" → `matchSet` = { semi_theme, packaging_sub, memory_sub, equip_sub, ai_accel_sub, ... all canonical children }. Any ticker whose `theme_ids` intersects that set matches.

Tests req-7 (Semiconductors includes all canonical children), req-9 (Software includes Cloud Software), req-10 (parent–child from parent_theme_id only).

## 10. Exact-subtheme filtering validation

Selecting "Packaging & Substrates" (`packaging_sub`) builds `matchSet = { packaging_sub }` plus its own descendants (none). Only tickers directly assigned `packaging_sub` match.

Sibling subthemes under Semiconductors (memory_sub, equip_sub, ai_accel_sub) do NOT match — they are not descendants of `packaging_sub`.

The parent theme node `semi_theme` also does NOT match — the match check goes ticker→taxonomy, not taxonomy→parent.

Test req-8 covers all of these assertions.

## 11. Multiselect-union validation

`rowMatchesTaxonomySelection` iterates `selectedIds` with `for (let si ...)` and returns `true` as soon as any single selected ID matches the row. This is UNION (OR) semantics — unchanged.

Test req-11: selecting { semi_theme, defense_theme } — a semiconductor member matches (via semi_theme), a defense member matches (via defense_theme), a software member matches neither, an AI-accelerators child matches (via semi_theme parent rollup).

## 12. Additional-membership validation

`getEffectiveRowThemeIds` collects from `row.theme_ids[]` + `row.primary_theme_id` + fallback `row.canonical_theme_id`. A ticker can satisfy a filter through any of its memberships, primary or additional.

Tests req-12 and req-12b: a ticker with `primary_theme_id: "defense_theme"` and `theme_ids: ["defense_theme", "semi_theme"]` matches both the Semiconductors filter (via additional `semi_theme`) and a filter on a descendant subtheme (`ai_accel_sub`, also in `theme_ids`). It does not match Software.

## 13. Browser observations (prose)

After HMR application:
- Watchlist → Screener shows three clearly labelled rows: SECTORS, THEMES, SUBTHEMES
- SECTORS row: 11 canonical sector chips (Communication Services, Consumer Discretionary, Consumer Staples, Energy, Financials, Health Care, Industrials, Materials, Real Estate, Technology, Utilities)
- THEMES row: top-level thematic parent chips only (Agribusiness, Banking, Clean Energy, Data Center Infrastructure, Defense & Aerospace, Fintech & Digital Payments, Healthcare Innovation, Metals & Mining, Nuclear Energy, Oil & Gas, Semiconductors, Software, Space Economy, etc.)
- SUBTHEMES row: granular sub-classification chips (AI Accelerators & Compute Silicon, Cloud Software, Cybersecurity, Foundry & Manufacturing, Lithium, Memory & Storage, Optical Interconnects, Packaging & Substrates, Rare Earth Elements, Regional Banks, Semiconductor Equipment, SMRs & Advanced Reactors, Uranium Mining & Nuclear Fuel, etc.)
- No "Gold (Commodity Lens)", "Silver (Commodity Lens)", or "[Deprecated]" button visible in any row
- No duplicate chip appears across rows
- Each row scrolls independently; row height and wrapping consistent with existing Screener UI
- Subtheme chips show parent context tooltip on hover (e.g. "Semiconductors → Packaging & Substrates")
- Selecting Technology in SECTORS, then clearing → works
- Selecting Semiconductors in THEMES → filters to Semiconductors stocks including all child-subtheme members
- Selecting Packaging & Substrates in SUBTHEMES → exact membership only
- Multi-selecting Semiconductors + Defense & Aerospace → union of both
- Sorting, scrolling, Market/Technical/Fundamentals/Options tabs: unaffected
- Ticker popup: unaffected

## 14. Confirmation: Watchlist performance architecture untouched

- `filteredRows.map(...)` continuous full render — **not changed**
- `sortedFundRows.map(...)` continuous full render — **not changed**
- `contentVisibility: 'auto'` + `containIntrinsicSize: '0 44px'` on inner ticker grid div — **not changed**
- No scroll-tracking state, no windowing IIFEs, no spacer divs — **not reintroduced**
- `WlTickerRow` props unchanged — no sort index re-introduced
- CSS-var zebra striping — **not changed**
- `WlRowCtx` stripped of mutable Maps — **not changed**
- `fundRowModels` useMemo — **not changed**

The performance baseline from commit `3bc5d6e6` is fully preserved. The only change to `watchlist.tsx` is the addition of the SUBTHEMES row inside `renderTaxonomyBar` and destructuring `subthemeOrder` from `taxonomyChipOrder`.

## 15. Tests / check / build results

| Check | Result |
|---|---|
| `npx tsc --noEmit` (new errors in task files only) | **0 new errors** (all 14 pre-existing errors in unrelated files unchanged) |
| `npx vite build --mode development` | **✓ built in 13.92s** (pre-existing chunk-size warning only) |
| `git diff --check` | **exit 0** |
| All tests | **149 pass / 0 fail** |

Test breakdown:
- `watchlist-theme-taxonomy.test.ts` — 48 tests (7 updated for new split, all pass)
- `watchlist-taxonomy-split.test.ts` — 20 tests (new, all 16 task requirements covered + 4 additional)
- `watchlist-perf-incremental.test.ts` — 25 tests (unchanged, all pass)
- `watchlist-perf-pass2.test.ts` — 20 tests (unchanged, all pass)
- `watchlist-perf-pass3.test.ts` — 21 tests (unchanged, all pass)
- `watchlist-security-search.test.ts` — 15 tests (unchanged, all pass)

## 16. git diff --check

```
exit:0
```

## 17. Final commit SHA

```
feat: split Watchlist theme filters by hierarchy
```

`git status -sb` after commit:
```
## main...origin/main [ahead 1]
?? attached_assets/Pasted-REPLIT-AGENT-WATCHLIST-TAXONOMY-FILTER-UI-SPLIT-THE-CUR_1786153695817.txt
```

### Complete task commit diff (summary)

**`watchlist-theme-taxonomy.ts`** — `getTaxonomyChipOrder`:
- Old: iterated all non-sector IDs into one `themeOrder` array; returned `{ sectorOrder, themeOrder }`
- New: iterates all IDs, skips `market_lens`/`deprecated`, pushes `theme` → `themeArr`, `sub_theme` → `subthemeArr`; returns `{ sectorOrder, themeOrder, subthemeOrder }`

**`watchlist.tsx`** — `renderTaxonomyBar`:
- Old: destructured `{ sectorOrder, themeOrder }`; rendered 2 rows
- New: destructures `{ sectorOrder, themeOrder, subthemeOrder }`; renders 3 rows — SECTORS, THEMES, SUBTHEMES; subtheme chips include `title=` tooltip with parent name

**`watchlist-theme-taxonomy.test.ts`** — 7 tests updated:
- "every non-sector node renders exactly once" → checks `themeOrder.length===1` (only "gold" theme) and `subthemeOrder.length===2` (two sub_themes)
- "every non-sector node renders exactly once including children" → checks `subthemeOrder.length===3`, `themeOrder.length===0`
- "stale classification sub_theme parent renders once" → checks `subthemeOrder.length===4`, `themeOrder.length===0`
- "themes sorted alphabetically by display_name" → checks `themeOrder` has only the `theme` node; `subthemeOrder` has the `sub_theme` nodes sorted
- "sub_theme nodes appear in subthemeOrder sorted alphabetically, not in themeOrder" (already updated in earlier pass)
- "node with theme classification appears in themeOrder; its children appear in subthemeOrder" (already updated)
- "sub_theme tree with descendants renders all in subthemeOrder alphabetically not by hierarchy" (already updated)

**`watchlist-taxonomy-split.test.ts`** — 20 new tests:
- req-1 through req-16 (all task requirements) plus 4 additional ordering/contract tests
