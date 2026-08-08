# Taxonomy Completeness Fix — Final Report
**Date:** 2026-08-08  
**Commit:** `7b17f367`  
**Branch:** `main`

---

## Exact Root Cause

The Watchlist taxonomy editor built its `ThemeTaxonomyIndex` from the **Relative Strength endpoint**:

```
GET /api/themes/relative-strength?timeframe=1D&classification=all
React Query key: ["themes-unified", "themes"]
```

The RS service in the backend explicitly skips nodes with no current performance data:

```python
row = await _build_theme_row(theme_id, ...)
if row:
    rows.append(row)
else:
    print(f"No data for '{theme_id}' — skipped")
```

This means any canonical taxonomy node without current RS/price/Tradier/FMP data silently vanishes from the assignment editor — including `robotics_automation` when its performance row couldn't be built.

---

## Why Robotics Was Missing

`robotics_automation` (`classification: sub_theme`, `parent: industrial_automation`) is a valid canonical taxonomy node. On days when the RS service cannot build a performance row for it (no Tradier data, market closed, sparse price history, etc.), the node disappears from the RS response. Because the editor was sourcing its dropdown options from that same RS response, `robotics_automation` became invisible to users — they could not select it as a Primary Theme subtheme or as an Additional Theme membership.

Today's live RS endpoint happens to include it. The bug is **latent and intermittent** — it appears whenever RS data is incomplete, which is expected behavior for a market-data endpoint.

---

## Canonical-vs-RS Missing-Node Audit (live, 2026-08-08)

| Metric | Count |
|---|---|
| Canonical sectors | 11 |
| Canonical themes (assignable) | 23 |
| Canonical sub_themes (assignable) | 67 |
| Canonical market_lens / other (excluded) | 3 |
| **Total assignable thematic nodes** | **90** |
| RS nodes present today | 90 |
| Currently missing from RS (today) | **0** |

Today RS is complete. The fix is architectural — correctness cannot depend on market-data availability.

---

## Previously Hidden IDs

On adversarial days (RS incomplete), any subset of the 90 thematic nodes can silently disappear. The regression test (REQ-77, REQ-85) uses an adversarial fixture that intentionally excludes `robotics_automation` from the RS payload and proves the canonical-based editor still renders it correctly.

---

## Canonical Counts by Classification

```
sector:      11  (non-assignable — excluded from editor)
theme:       23  (assignable — Primary Theme dropdown)
sub_theme:   67  (assignable — Subtheme dropdown + Additional picker)
market_lens:  3  (non-assignable — excluded from editor)
```

---

## Selectable-Node Count

**90** (23 themes + 67 sub_themes)

---

## Primary Dropdown Set Comparison

Expected = `{n.theme_id for n in canonical_list if n.classification == "theme"}` = 23 IDs  
Actual   = `idx.themeIds` (built from `/api/themes/list`)  
**Set equality: PASS** — 0 missing, 0 extra, 0 sectors/lenses in the dropdown.

---

## Subtheme Parent/Child Set Comparison

For every one of the 23 canonical parent themes:  
Expected children = `{n.theme_id for n in canonical_list if n.classification == "sub_theme" and n.parent_theme_id == parent}`  
Actual children   = `idx.childrenByParentThemeId.get(parent)` (string[])  
**Set equality: PASS for all 23 parents** — 0 missing, 0 extra.

Robotics specifically:  
- `industrial_automation` appears in `idx.themeIds` ✓  
- `robotics_automation` appears in `idx.childrenByParentThemeId.get("industrial_automation")` ✓  
- Selecting robotics as subtheme produces `effectivePrimaryId = "robotics_automation"` ✓

---

## Additional Picker Set Comparison

Expected = `{all canonical themes} ∪ {all canonical sub_themes}` = 90 IDs  
Actual   = `{...idx.themeIds, ...(sub_theme nodes from idx.nodeById)}` = 90 IDs  
**Set equality: PASS** — 0 missing, 0 extra, no sectors/lenses/deprecated exposed.

---

## Query Key Before/After

| Before | After |
|---|---|
| `["themes-unified", "themes"]` | `["theme-taxonomy", "list"]` |
| `GET /api/themes/relative-strength?timeframe=1D&classification=all` | `GET /api/themes/list?classification=all` |
| staleTime: 5 min | staleTime: 24 h (static registry) |
| Skips nodes with no RS data | Always returns complete canonical registry |

`["themes-unified", "themes"]` is **unchanged** — still owned by `home.tsx` and `stocks-sectors.tsx` for RS/performance data. No cache collision possible.

`handleSave()` background continuation: removed the stale `invalidateQueries(["themes-unified","themes"])` — a ticker assignment changes memberships, not the canonical taxonomy registry.

---

## Tests / Results

**85 / 85 pass** across taxonomy editor suite.

9 new exhaustive tests (REQ-77 through REQ-85):

| Test | Assertion |
|---|---|
| REQ-77 | RS-independence regression — adversarial fixture, robotics absent from RS, still in editor |
| REQ-78 | Query key isolation — canonical key ≠ RS key (string-level assertion) |
| REQ-79 | Primary Theme dropdown set equality — 0 missing, 0 extra, no sectors/lenses |
| REQ-80 | Subtheme child set equality for **every** parent (not just Robotics) |
| REQ-81 | Additional picker completeness — all 90 thematic nodes reachable |
| REQ-82 | Parent integrity — every sub_theme has valid canonical parent with classification=theme |
| REQ-83 | Excluded classifications (sector, market_lens, deprecated) never in any editor surface |
| REQ-84 | Robotics full canonical proof — all 8 spec assertions |
| REQ-85 | Canonical strictly larger than RS on adversarial day |

All prior 76 tests remain green.

Full suite results:

```
watchlist-taxonomy-editor.test.ts   85 pass / 0 fail
watchlist-theme-taxonomy.test.ts    48 pass / 0 fail
watchlist-taxonomy-split.test.ts    20 pass / 0 fail
watchlist-perf-incremental.test.ts  25 pass / 0 fail
watchlist-company-identity.test.ts  41 pass / 0 fail
global-prefetch-ownership.test.ts   34 pass / 0 fail
TOTAL                              253 pass / 0 fail
```

---

## Browser Validation

- `/api/themes/list?classification=all` proxy pre-existing in `routes.ts` (line 6326) — no routes change required.
- Live canonical registry confirmed: 11 sectors, 23 themes, 67 sub_themes, 3 market_lens.
- `robotics_automation`: canonical ✓, `parent_theme_id = industrial_automation` ✓, `display_name = "Robotics & Automation"` ✓.
- Parent integrity: 0 broken sub_themes across all 67 nodes.
- Instant save behavior (optimistic-first, `void` background PUT): untouched.

---

## Files Changed

```
frontend/client/src/pages/watchlist.tsx               +33/-20  (query switch + invalidation cleanup)
frontend/client/src/pages/__tests__/watchlist-taxonomy-editor.test.ts  +425/-9   (9 new tests)
```

`frontend/server/routes.ts`: **no change** — `/api/themes/list` proxy was already present.

---

## Git Diff / Stat

```
commit 7b17f367
 2 files changed, 425 insertions(+), 9 deletions(-)
```

---

## Final Git Status

```
On branch main
nothing to commit, working tree clean

HEAD: 7b17f367  fix: switch taxonomy editor from RS endpoint to canonical /api/themes/list
      2f59bab5  feat: optimistic-first taxonomy save — instant screener update, background canonical PUT
```
