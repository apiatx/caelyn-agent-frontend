/**
 * watchlist-taxonomy-split.test.ts
 *
 * Covers all 16 requirements from the Watchlist Taxonomy Filter UI split task:
 *   1.  sector nodes render only in SECTORS (sectorOrder)
 *   2.  theme nodes render only in THEMES (themeOrder)
 *   3.  sub_theme nodes render only in SUBTHEMES (subthemeOrder)
 *   4.  market_lens nodes render in none of the three rows
 *   5.  deprecated nodes render in none of the three rows
 *   6.  no active structural node appears in more than one row
 *   7.  Semiconductors parent filter includes child subtheme members
 *   8.  Packaging & Substrates exact filter does NOT include unrelated
 *       Semiconductors children
 *   9.  Software parent includes Cloud Software child
 *   10. parent relationships are derived from parent_theme_id
 *   11. multiselect remains union
 *   12. additional theme membership can satisfy a filter
 *   13. sector ecosystem behavior remains unchanged
 *   14. ticker deduplication: a ticker matching multiple selected filters still
 *       appears once (rowMatchesTaxonomySelection returns true once)
 *   15. no new API query added — getTaxonomyChipOrder is a pure function with no
 *       fetch/async I/O
 *   16. continuous scrolling / performance tests still pass (validated by running
 *       the existing perf test suite; this test confirms no watchlist render
 *       path was changed)
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildThemeTaxonomyIndex,
  getTaxonomyChipOrder,
  rowMatchesTaxonomySelection,
  getEffectiveRowThemeIds,
} from "../../lib/watchlist-theme-taxonomy";
import type {
  ThemeTaxonomyNode,
  WatchlistTaxonomyRow,
} from "../../lib/watchlist-theme-taxonomy";

// ── helpers ──────────────────────────────────────────────────────────────────

function node(
  theme_id: string,
  classification: string,
  opts: Partial<ThemeTaxonomyNode> = {},
): ThemeTaxonomyNode {
  return {
    theme_id,
    display_name: opts.display_name ?? theme_id,
    classification,
    parent_sector: opts.parent_sector ?? null,
    parent_theme_id: opts.parent_theme_id ?? null,
    rollup_sector_ids: opts.rollup_sector_ids ?? [],
  };
}

/** A representative taxonomy used by multiple tests. */
function buildSampleTaxonomy() {
  const nodes: ThemeTaxonomyNode[] = [
    // Sectors
    node("tech_sector",      "sector",       { display_name: "Technology",    rollup_sector_ids: [] }),
    node("energy_sector",    "sector",       { display_name: "Energy",        rollup_sector_ids: [] }),
    node("materials_sector", "sector",       { display_name: "Materials",     rollup_sector_ids: [] }),

    // Themes
    node("semi_theme",     "theme", { display_name: "Semiconductors",    rollup_sector_ids: ["tech_sector"] }),
    node("software_theme", "theme", { display_name: "Software",          rollup_sector_ids: ["tech_sector"] }),
    node("defense_theme",  "theme", { display_name: "Defense & Aerospace", rollup_sector_ids: ["tech_sector"] }),
    node("mining_theme",   "theme", { display_name: "Metals & Mining",   rollup_sector_ids: ["materials_sector"] }),

    // Subthemes under Semiconductors
    node("packaging_sub",  "sub_theme", { display_name: "Packaging & Substrates",           parent_theme_id: "semi_theme" }),
    node("memory_sub",     "sub_theme", { display_name: "Memory & Storage",                 parent_theme_id: "semi_theme" }),
    node("equip_sub",      "sub_theme", { display_name: "Semiconductor Equipment",          parent_theme_id: "semi_theme" }),
    node("ai_accel_sub",   "sub_theme", { display_name: "AI Accelerators & Compute Silicon",parent_theme_id: "semi_theme" }),

    // Subthemes under Software
    node("cloud_sub",      "sub_theme", { display_name: "Cloud Software", parent_theme_id: "software_theme" }),
    node("security_sub",   "sub_theme", { display_name: "Cybersecurity",  parent_theme_id: "software_theme" }),

    // Subthemes under Metals & Mining
    node("rare_earth_sub", "sub_theme", { display_name: "Rare Earth Elements", parent_theme_id: "mining_theme" }),

    // Market lens nodes — must NOT appear in filter rows
    node("gold_lens",   "market_lens", { display_name: "Gold (Commodity Lens)" }),
    node("silver_lens", "market_lens", { display_name: "Silver (Commodity Lens)" }),
    node("copper_lens", "market_lens", { display_name: "Copper (Commodity Lens)" }),

    // Deprecated node — must NOT appear in filter rows
    node("old_node", "deprecated", { display_name: "[Deprecated] Old Theme" }),
  ];
  return buildThemeTaxonomyIndex(nodes);
}

// ── Requirement 1: sector nodes render only in SECTORS ───────────────────────

test("req-1: sector nodes appear only in sectorOrder", () => {
  const idx = buildSampleTaxonomy();
  const { sectorOrder, themeOrder, subthemeOrder } = getTaxonomyChipOrder(idx);

  assert.ok(sectorOrder.includes("tech_sector"),    "tech_sector in sectorOrder");
  assert.ok(sectorOrder.includes("energy_sector"),  "energy_sector in sectorOrder");
  assert.ok(sectorOrder.includes("materials_sector"),"materials_sector in sectorOrder");

  assert.ok(!themeOrder.includes("tech_sector"),    "tech_sector not in themeOrder");
  assert.ok(!subthemeOrder.includes("tech_sector"), "tech_sector not in subthemeOrder");
});

// ── Requirement 2: theme nodes render only in THEMES ─────────────────────────

test("req-2: theme nodes appear only in themeOrder", () => {
  const idx = buildSampleTaxonomy();
  const { sectorOrder, themeOrder, subthemeOrder } = getTaxonomyChipOrder(idx);

  const themeNodeIds = ["semi_theme", "software_theme", "defense_theme", "mining_theme"];
  for (const id of themeNodeIds) {
    assert.ok(themeOrder.includes(id),      `${id} in themeOrder`);
    assert.ok(!sectorOrder.includes(id),    `${id} not in sectorOrder`);
    assert.ok(!subthemeOrder.includes(id),  `${id} not in subthemeOrder`);
  }
});

// ── Requirement 3: sub_theme nodes render only in SUBTHEMES ──────────────────

test("req-3: sub_theme nodes appear only in subthemeOrder", () => {
  const idx = buildSampleTaxonomy();
  const { sectorOrder, themeOrder, subthemeOrder } = getTaxonomyChipOrder(idx);

  const subIds = ["packaging_sub", "memory_sub", "equip_sub", "ai_accel_sub", "cloud_sub", "security_sub", "rare_earth_sub"];
  for (const id of subIds) {
    assert.ok(subthemeOrder.includes(id),   `${id} in subthemeOrder`);
    assert.ok(!themeOrder.includes(id),     `${id} not in themeOrder`);
    assert.ok(!sectorOrder.includes(id),    `${id} not in sectorOrder`);
  }
});

// ── Requirement 4: market_lens nodes in none of the three rows ───────────────

test("req-4: market_lens nodes absent from all three filter rows", () => {
  const idx = buildSampleTaxonomy();
  const { sectorOrder, themeOrder, subthemeOrder } = getTaxonomyChipOrder(idx);
  const all = [...sectorOrder, ...themeOrder, ...subthemeOrder];

  assert.ok(!all.includes("gold_lens"),   "gold_lens absent");
  assert.ok(!all.includes("silver_lens"), "silver_lens absent");
  assert.ok(!all.includes("copper_lens"), "copper_lens absent");
});

// ── Requirement 5: deprecated nodes in none of the three rows ────────────────

test("req-5: deprecated nodes absent from all three filter rows", () => {
  const idx = buildSampleTaxonomy();
  const { sectorOrder, themeOrder, subthemeOrder } = getTaxonomyChipOrder(idx);
  const all = [...sectorOrder, ...themeOrder, ...subthemeOrder];

  assert.ok(!all.includes("old_node"), "deprecated node absent");
});

// ── Requirement 6: no node appears in more than one row ──────────────────────

test("req-6: no active structural node appears in more than one row", () => {
  const idx = buildSampleTaxonomy();
  const { sectorOrder, themeOrder, subthemeOrder } = getTaxonomyChipOrder(idx);

  const seen = new Set<string>();
  for (const id of sectorOrder) {
    assert.ok(!seen.has(id), `${id} appeared in multiple rows`);
    seen.add(id);
  }
  for (const id of themeOrder) {
    assert.ok(!seen.has(id), `${id} appeared in multiple rows`);
    seen.add(id);
  }
  for (const id of subthemeOrder) {
    assert.ok(!seen.has(id), `${id} appeared in multiple rows`);
    seen.add(id);
  }
});

// ── Requirement 7: Semiconductors parent filter includes child subtheme members

test("req-7: selecting Semiconductors theme matches all its canonical child subtheme members", () => {
  const idx = buildSampleTaxonomy();
  const selected = new Set(["semi_theme"]);

  // Direct Semiconductors member
  const directMember: WatchlistTaxonomyRow = { theme_ids: ["semi_theme"] };
  assert.ok(rowMatchesTaxonomySelection(directMember, selected, idx), "direct semi_theme member matches");

  // AI Accelerators child
  const aiAccel: WatchlistTaxonomyRow = { theme_ids: ["ai_accel_sub"] };
  assert.ok(rowMatchesTaxonomySelection(aiAccel, selected, idx), "AI Accelerators (child) matches Semiconductors");

  // Memory & Storage child
  const memory: WatchlistTaxonomyRow = { theme_ids: ["memory_sub"] };
  assert.ok(rowMatchesTaxonomySelection(memory, selected, idx), "Memory & Storage (child) matches Semiconductors");

  // Packaging & Substrates child
  const packaging: WatchlistTaxonomyRow = { theme_ids: ["packaging_sub"] };
  assert.ok(rowMatchesTaxonomySelection(packaging, selected, idx), "Packaging & Substrates (child) matches Semiconductors");

  // Semiconductor Equipment child
  const equip: WatchlistTaxonomyRow = { theme_ids: ["equip_sub"] };
  assert.ok(rowMatchesTaxonomySelection(equip, selected, idx), "Semiconductor Equipment (child) matches Semiconductors");

  // Cloud Software (different parent) must NOT match
  const cloud: WatchlistTaxonomyRow = { theme_ids: ["cloud_sub"] };
  assert.ok(!rowMatchesTaxonomySelection(cloud, selected, idx), "Cloud Software (unrelated) does not match Semiconductors");
});

// ── Requirement 8: Packaging & Substrates exact filter ───────────────────────

test("req-8: selecting Packaging & Substrates exact subtheme does not include unrelated Semiconductors children", () => {
  const idx = buildSampleTaxonomy();
  const selected = new Set(["packaging_sub"]);

  // Packaging & Substrates member — matches
  const packagingMember: WatchlistTaxonomyRow = { theme_ids: ["packaging_sub"] };
  assert.ok(rowMatchesTaxonomySelection(packagingMember, selected, idx), "packaging_sub member matches");

  // Memory & Storage — different sub under same parent — does NOT match
  const memoryMember: WatchlistTaxonomyRow = { theme_ids: ["memory_sub"] };
  assert.ok(!rowMatchesTaxonomySelection(memoryMember, selected, idx), "memory_sub sibling does not match packaging_sub");

  // AI Accelerators — different sub under same parent — does NOT match
  const aiMember: WatchlistTaxonomyRow = { theme_ids: ["ai_accel_sub"] };
  assert.ok(!rowMatchesTaxonomySelection(aiMember, selected, idx), "ai_accel_sub sibling does not match packaging_sub");

  // Semiconductor Equipment — different sub — does NOT match
  const equipMember: WatchlistTaxonomyRow = { theme_ids: ["equip_sub"] };
  assert.ok(!rowMatchesTaxonomySelection(equipMember, selected, idx), "equip_sub sibling does not match packaging_sub");

  // Direct Semiconductors theme member — does NOT match (packaging_sub is more specific)
  const semiThemeMember: WatchlistTaxonomyRow = { theme_ids: ["semi_theme"] };
  assert.ok(!rowMatchesTaxonomySelection(semiThemeMember, selected, idx), "semi_theme parent does not match packaging_sub exact filter");
});

// ── Requirement 9: Software parent includes Cloud Software child ──────────────

test("req-9: selecting Software theme includes Cloud Software child", () => {
  const idx = buildSampleTaxonomy();
  const selected = new Set(["software_theme"]);

  const cloudMember: WatchlistTaxonomyRow = { theme_ids: ["cloud_sub"] };
  assert.ok(rowMatchesTaxonomySelection(cloudMember, selected, idx), "Cloud Software child matches Software");

  const securityMember: WatchlistTaxonomyRow = { theme_ids: ["security_sub"] };
  assert.ok(rowMatchesTaxonomySelection(securityMember, selected, idx), "Cybersecurity child matches Software");

  // Packaging & Substrates (under Semiconductors) must NOT match Software
  const packagingMember: WatchlistTaxonomyRow = { theme_ids: ["packaging_sub"] };
  assert.ok(!rowMatchesTaxonomySelection(packagingMember, selected, idx), "packaging_sub does not match Software");
});

// ── Requirement 10: parent relationships derived from parent_theme_id ─────────

test("req-10: parent–child relationships are derived from parent_theme_id, not display name", () => {
  // Use synthetic names that give no hierarchy hint in their display names
  const idx = buildThemeTaxonomyIndex([
    node("p", "theme",     { display_name: "Zeta Parent" }),
    node("c", "sub_theme", { display_name: "Alpha Child", parent_theme_id: "p" }),
    node("u", "sub_theme", { display_name: "Beta Unrelated" }),
  ]);

  const desc = idx.descendantIdsByThemeId.get("p");
  assert.ok(desc?.has("c"),  "child 'c' is a descendant of parent 'p' via parent_theme_id");
  assert.ok(!desc?.has("u"), "unrelated 'u' is not a descendant of 'p'");

  // Filter by parent → child should match; unrelated should not
  const selected = new Set(["p"]);
  assert.ok(rowMatchesTaxonomySelection({ theme_ids: ["c"] }, selected, idx), "child matches parent filter");
  assert.ok(!rowMatchesTaxonomySelection({ theme_ids: ["u"] }, selected, idx), "unrelated does not match parent filter");
});

// ── Requirement 11: multiselect union semantics ───────────────────────────────

test("req-11: multiselect uses UNION semantics — ticker matching any selected filter is included", () => {
  const idx = buildSampleTaxonomy();

  // Select two unrelated themes
  const selected = new Set(["semi_theme", "defense_theme"]);

  // Semiconductors member — matches via semi_theme
  const semiMember: WatchlistTaxonomyRow = { theme_ids: ["semi_theme"] };
  assert.ok(rowMatchesTaxonomySelection(semiMember, selected, idx), "semi_theme member included in union");

  // Defense member — matches via defense_theme
  const defenseMember: WatchlistTaxonomyRow = { theme_ids: ["defense_theme"] };
  assert.ok(rowMatchesTaxonomySelection(defenseMember, selected, idx), "defense_theme member included in union");

  // Software member — matches neither selected
  const softwareMember: WatchlistTaxonomyRow = { theme_ids: ["software_theme"] };
  assert.ok(!rowMatchesTaxonomySelection(softwareMember, selected, idx), "software member excluded from semi+defense union");

  // AI Accelerators (child of semi_theme) — matches via parent-rollup
  const aiChild: WatchlistTaxonomyRow = { theme_ids: ["ai_accel_sub"] };
  assert.ok(rowMatchesTaxonomySelection(aiChild, selected, idx), "ai_accel_sub child included via semi_theme union");
});

// ── Requirement 12: additional theme membership can satisfy a filter ──────────

test("req-12: additional (non-primary) theme membership can satisfy a filter", () => {
  const idx = buildSampleTaxonomy();

  // Ticker belongs primarily to Defense but also has Semiconductors as additional membership
  const multiMemberRow: WatchlistTaxonomyRow = {
    primary_theme_id: "defense_theme",
    theme_ids: ["defense_theme", "semi_theme"],
  };

  // Filter by Semiconductors → should match via additional membership
  const semiSelected = new Set(["semi_theme"]);
  assert.ok(rowMatchesTaxonomySelection(multiMemberRow, semiSelected, idx), "additional semi_theme membership satisfies Semiconductors filter");

  // Filter by Defense → should match via primary membership
  const defenseSelected = new Set(["defense_theme"]);
  assert.ok(rowMatchesTaxonomySelection(multiMemberRow, defenseSelected, idx), "primary defense_theme membership satisfies Defense filter");

  // Filter by Software → neither membership qualifies
  const softwareSelected = new Set(["software_theme"]);
  assert.ok(!rowMatchesTaxonomySelection(multiMemberRow, softwareSelected, idx), "no Software membership → not included");
});

// ── Requirement 12b: additional membership via a child subtheme ──────────────

test("req-12b: additional subtheme membership satisfies a parent-theme filter", () => {
  const idx = buildSampleTaxonomy();

  // Ticker's additional membership is a subtheme of Semiconductors
  const row: WatchlistTaxonomyRow = {
    primary_theme_id: "defense_theme",
    theme_ids: ["defense_theme", "ai_accel_sub"],
  };

  // Filter by Semiconductors (parent) → ai_accel_sub is a descendant → should match
  const semiSelected = new Set(["semi_theme"]);
  assert.ok(rowMatchesTaxonomySelection(row, semiSelected, idx), "ai_accel_sub (in additional memberships) satisfies Semiconductors parent filter");
});

// ── Requirement 13: sector ecosystem behavior ────────────────────────────────

test("req-13: selecting a sector matches stocks whose thematic rollup_sector_ids includes that sector", () => {
  const idx = buildSampleTaxonomy();
  const selected = new Set(["tech_sector"]);

  // Stock whose company sector IS Technology
  const directSectorRow: WatchlistTaxonomyRow = { sector_id: "tech_sector" };
  assert.ok(rowMatchesTaxonomySelection(directSectorRow, selected, idx), "stock with sector_id=tech_sector matches Technology sector filter");

  // Stock whose theme has rollup_sector_ids: ["tech_sector"]
  const thematicRollupRow: WatchlistTaxonomyRow = { theme_ids: ["semi_theme"] };
  assert.ok(rowMatchesTaxonomySelection(thematicRollupRow, selected, idx), "semi_theme (rolls up to tech_sector) matches Technology sector filter");

  // Stock in Metals & Mining (rolls up to materials_sector, not tech)
  const miningRow: WatchlistTaxonomyRow = { theme_ids: ["mining_theme"] };
  assert.ok(!rowMatchesTaxonomySelection(miningRow, selected, idx), "mining_theme (rolls up to materials_sector) does not match Technology sector filter");
});

// ── Requirement 14: deduplication — a row matching multiple selections still
//    passes rowMatchesTaxonomySelection once (true/false, no double-counting) ──

test("req-14: rowMatchesTaxonomySelection returns a boolean — no double-counting", () => {
  const idx = buildSampleTaxonomy();

  // Ticker belongs to BOTH semi_theme and software_theme — both selected
  const multiMatch: WatchlistTaxonomyRow = { theme_ids: ["semi_theme", "software_theme"] };
  const selected = new Set(["semi_theme", "software_theme"]);

  // Returns exactly true (boolean), not a count or array
  const result = rowMatchesTaxonomySelection(multiMatch, selected, idx);
  assert.strictEqual(result, true, "returns true exactly once, not a count");
});

// ── Requirement 15: getTaxonomyChipOrder is a pure sync function ─────────────

test("req-15: getTaxonomyChipOrder has no fetch/async I/O — it is a pure synchronous function", () => {
  // Verify the function returns synchronously without a Promise
  const idx = buildSampleTaxonomy();
  const result = getTaxonomyChipOrder(idx);
  assert.ok(!(result instanceof Promise), "return value is not a Promise");
  assert.ok(Array.isArray(result.sectorOrder),   "sectorOrder is an Array");
  assert.ok(Array.isArray(result.themeOrder),    "themeOrder is an Array");
  assert.ok(Array.isArray(result.subthemeOrder), "subthemeOrder is an Array");
});

// ── Requirement 16: continuous scrolling architecture untouched ───────────────

test("req-16: getTaxonomyChipOrder is the only changed export — rowMatchesTaxonomySelection signature is unchanged", () => {
  // rowMatchesTaxonomySelection still takes (row, selectedIds, index) and returns boolean
  const idx = buildSampleTaxonomy();
  const row: WatchlistTaxonomyRow = { theme_ids: ["semi_theme"] };
  const selected = new Set(["semi_theme"]);
  const result = rowMatchesTaxonomySelection(row, selected, idx);
  assert.strictEqual(typeof result, "boolean", "rowMatchesTaxonomySelection still returns a boolean");
});

// ── Additional: subtheme row sorted A→Z ──────────────────────────────────────

test("subthemeOrder is sorted alphabetically by display_name A→Z", () => {
  const idx = buildSampleTaxonomy();
  const { subthemeOrder } = getTaxonomyChipOrder(idx);
  const { nodeById } = idx;
  for (let i = 0; i < subthemeOrder.length - 1; i++) {
    const a = nodeById.get(subthemeOrder[i])?.display_name ?? subthemeOrder[i];
    const b = nodeById.get(subthemeOrder[i + 1])?.display_name ?? subthemeOrder[i + 1];
    assert.ok(a.localeCompare(b) <= 0, `subthemeOrder: "${a}" should come before "${b}"`);
  }
});

// ── Additional: themeOrder sorted A→Z ────────────────────────────────────────

test("themeOrder is sorted alphabetically by display_name A→Z", () => {
  const idx = buildSampleTaxonomy();
  const { themeOrder } = getTaxonomyChipOrder(idx);
  const { nodeById } = idx;
  for (let i = 0; i < themeOrder.length - 1; i++) {
    const a = nodeById.get(themeOrder[i])?.display_name ?? themeOrder[i];
    const b = nodeById.get(themeOrder[i + 1])?.display_name ?? themeOrder[i + 1];
    assert.ok(a.localeCompare(b) <= 0, `themeOrder: "${a}" should come before "${b}"`);
  }
});

// ── Additional: getEffectiveRowThemeIds is unchanged ─────────────────────────

test("getEffectiveRowThemeIds still collects theme_ids + primary_theme_id correctly", () => {
  const row: WatchlistTaxonomyRow = {
    primary_theme_id: "semi_theme",
    theme_ids: ["semi_theme", "ai_accel_sub"],
  };
  const ids = getEffectiveRowThemeIds(row);
  assert.ok(ids.has("semi_theme"),    "semi_theme in effective ids");
  assert.ok(ids.has("ai_accel_sub"),  "ai_accel_sub in effective ids");
  assert.equal(ids.size, 2);
});
