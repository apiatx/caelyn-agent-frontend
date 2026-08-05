import assert from "node:assert/strict";
import test from "node:test";

import {
  buildThemeTaxonomyIndex,
  getEffectiveRowThemeIds,
  getTaxonomyChipOrder,
  rowMatchesTaxonomySelection,
} from "../watchlist-theme-taxonomy";
import type {
  ThemeTaxonomyNode,
  WatchlistTaxonomyRow,
} from "../watchlist-theme-taxonomy";

function makeNode(overrides: Partial<ThemeTaxonomyNode> & { theme_id: string }): ThemeTaxonomyNode {
  return {
    display_name: overrides.theme_id,
    classification: null,
    parent_sector: null,
    parent_theme_id: null,
    rollup_sector_ids: [],
    ...overrides,
  };
}

function s(nodes: ThemeTaxonomyNode[]) {
  return buildThemeTaxonomyIndex(nodes);
}

// ─── Taxonomy Index ──────────────────────────────────────────────────────────
test("builds nodeById", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  assert.equal(idx.nodeById.size, 2);
  assert.ok(idx.nodeById.has("semi"));
  assert.ok(idx.nodeById.has("memory"));
});

test("builds direct children from parent_theme_id", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  const children = idx.childrenByParentThemeId.get("semi");
  assert.ok(children);
  assert.deepStrictEqual(children, ["memory"]);
});

test("builds recursive descendant sets", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "equip", classification: "sub_theme", parent_theme_id: "semi" }),
    makeNode({ theme_id: "etch", classification: "sub_theme", parent_theme_id: "equip" }),
  ]);
  const desc = idx.descendantIdsByThemeId.get("semi");
  assert.ok(desc);
  assert.ok(desc.has("equip"));
  assert.ok(desc.has("etch"));
});

test("handles a synthetic cycle without infinite recursion", () => {
  const idx = s([
    makeNode({ theme_id: "a", classification: "sub_theme", parent_theme_id: "b" }),
    makeNode({ theme_id: "b", classification: "sub_theme", parent_theme_id: "a" }),
  ]);
  assert.equal(idx.nodeById.size, 2);
  const descA = idx.descendantIdsByThemeId.get("a");
  const descB = idx.descendantIdsByThemeId.get("b");
  assert.ok(descA);
  assert.ok(descB);
});

test("preserves standalone subthemes without inventing parents", () => {
  const idx = s([
    makeNode({ theme_id: "ai_net", classification: "sub_theme" }),
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  assert.ok(idx.standaloneSubthemeIds.includes("ai_net"));
  assert.ok(idx.standaloneSubthemeIds.includes("semi"));
});

test("produces deterministic ordering", () => {
  const idx = s([
    makeNode({ theme_id: "c", classification: "sub_theme" }),
    makeNode({ theme_id: "a", classification: "sector" }),
    makeNode({ theme_id: "b", classification: "theme" }),
  ]);
  assert.deepStrictEqual(idx.sectorIds, ["a"]);
  assert.deepStrictEqual(idx.themeIds, ["b"]);
  assert.deepStrictEqual(idx.standaloneSubthemeIds, ["c"]);
});

// ─── Parent-theme matching ───────────────────────────────────────────────────
test("parent theme matches a direct member", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["semi"]), idx), true);
});

test("parent theme matches a direct child-subtheme member", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["memory"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["semi"]), idx), true);
});

test("parent theme matches a deeper recursive descendant", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "equip", classification: "sub_theme", parent_theme_id: "semi" }),
    makeNode({ theme_id: "etch", classification: "sub_theme", parent_theme_id: "equip" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["etch"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["semi"]), idx), true);
});

test("parent theme does not match an unrelated theme", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "oil", classification: "sub_theme" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["oil"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["semi"]), idx), false);
});

// ─── Exact subtheme matching ─────────────────────────────────────────────────
test("nested subtheme matches exact membership", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["memory"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["memory"]), idx), true);
});

test("standalone subtheme with parent_theme_id=null matches exact membership", () => {
  const idx = s([
    makeNode({ theme_id: "ai_net", classification: "sub_theme" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["ai_net"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["ai_net"]), idx), true);
});

test("subtheme selection excludes sibling membership", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
    makeNode({ theme_id: "equip", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["equip"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["memory"]), idx), false);
});

test("subtheme selection excludes parent-only direct membership", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["memory"]), idx), false);
});

// ─── Sector ecosystem matching ───────────────────────────────────────────────
test("sector matches actual sector_id", () => {
  const idx = s([
    makeNode({ theme_id: "tech", classification: "sector" }),
    makeNode({ theme_id: "semi", classification: "sub_theme", rollup_sector_ids: ["tech"] }),
  ]);
  const row: WatchlistTaxonomyRow = { sector_id: "tech", theme_ids: [] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["tech"]), idx), true);
});

test("sector matches a theme membership through rollup_sector_ids", () => {
  const idx = s([
    makeNode({ theme_id: "tech", classification: "sector" }),
    makeNode({ theme_id: "semi", classification: "sub_theme", rollup_sector_ids: ["tech"] }),
  ]);
  const row: WatchlistTaxonomyRow = { sector_id: null, theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["tech"]), idx), true);
});

test("cross-sector theme can match more than one sector filter", () => {
  const idx = s([
    makeNode({ theme_id: "tech", classification: "sector" }),
    makeNode({ theme_id: "utils", classification: "sector" }),
    makeNode({ theme_id: "dc", classification: "sub_theme", rollup_sector_ids: ["tech", "utils"] }),
  ]);
  const row: WatchlistTaxonomyRow = { sector_id: null, theme_ids: ["dc"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["tech"]), idx), true);
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["utils"]), idx), true);
});

test("sector excludes an unrelated company/theme combination", () => {
  const idx = s([
    makeNode({ theme_id: "tech", classification: "sector" }),
    makeNode({ theme_id: "oil", classification: "sub_theme", rollup_sector_ids: ["energy"] }),
  ]);
  const row: WatchlistTaxonomyRow = { sector_id: "energy", theme_ids: ["oil"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["tech"]), idx), false);
});

test("actual company sector remains independent from theme rollups", () => {
  const idx = s([
    makeNode({ theme_id: "tech", classification: "sector" }),
    makeNode({ theme_id: "clean", classification: "theme", rollup_sector_ids: ["utils", "industrials"] }),
  ]);
  const row: WatchlistTaxonomyRow = { sector_id: "tech", theme_ids: ["clean"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["tech"]), idx), true);
});

// ─── Multi-select behavior ───────────────────────────────────────────────────
test("two selected filters use union semantics", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "oil", classification: "sub_theme" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["semi", "oil"]), idx), true);
});

test("a row matching both still appears once (single pass)", () => {
  const idx = s([
    makeNode({ theme_id: "tech", classification: "sector" }),
    makeNode({ theme_id: "semi", classification: "sub_theme", rollup_sector_ids: ["tech"] }),
  ]);
  const row: WatchlistTaxonomyRow = { sector_id: "tech", theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["tech"]), idx), true);
});

test("clearing selection restores all rows", () => {
  const idx = s([]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["whatever"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(), idx), true);
});

// ─── Contract hardening ──────────────────────────────────────────────────────
test("unknown IDs do not match", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["unknown_id"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["semi"]), idx), false);
});

test("display-name equality alone does not match", () => {
  const idx = s([
    makeNode({ theme_id: "semi", display_name: "Semiconductors", classification: "sub_theme" }),
  ]);
  const row: WatchlistTaxonomyRow = {
    theme_ids: ["not_semi"],
    canonical_theme_id: "not_semi",
  };
  assert.equal(
    rowMatchesTaxonomySelection(row, new Set(["semi"]), idx),
    false,
  );
});

test("canonical_theme_id compatibility works only for exact known ID", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
  ]);
  const rowNoNew: WatchlistTaxonomyRow = {
    canonical_theme_id: "semi",
  };
  assert.equal(rowMatchesTaxonomySelection(rowNoNew, new Set(["semi"]), idx), true);

  const rowWrong: WatchlistTaxonomyRow = {
    canonical_theme_id: "not_a_theme",
  };
  assert.equal(rowMatchesTaxonomySelection(rowWrong, new Set(["semi"]), idx), false);
});

test("theme_ids takes priority over display labels", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["semi"]), idx), true);
});

test("renaming display_name does not change matching", () => {
  const idx = s([
    makeNode({ theme_id: "semi", display_name: "New Name", classification: "sub_theme" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["semi"]), idx), true);
});

test("removed membership IDs cannot be inferred from parent", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["memory"]), idx), false);
});

// ─── getEffectiveRowThemeIds ─────────────────────────────────────────────────
test("theme_ids are primary source", () => {
  const row: WatchlistTaxonomyRow = {
    theme_ids: ["a", "b"],
    primary_theme_id: "c",
  };
  const ids = getEffectiveRowThemeIds(row);
  assert.equal(ids.has("a"), true);
  assert.equal(ids.has("b"), true);
  assert.equal(ids.has("c"), true);
});

test("primary_theme_id added when absent from theme_ids", () => {
  const row: WatchlistTaxonomyRow = {
    theme_ids: ["a"],
    primary_theme_id: "b",
  };
  assert.equal(getEffectiveRowThemeIds(row).has("b"), true);
});

test("primary_theme_id not duplicated when already in theme_ids", () => {
  const row: WatchlistTaxonomyRow = {
    theme_ids: ["a"],
    primary_theme_id: "a",
  };
  assert.equal(getEffectiveRowThemeIds(row).size, 1);
});

test("canonical_theme_id fallback when both new fields absent", () => {
  const row: WatchlistTaxonomyRow = {
    canonical_theme_id: "semi",
  };
  const ids = getEffectiveRowThemeIds(row);
  assert.equal(ids.size, 1);
  assert.ok(ids.has("semi"));
});

// ─── Duplicate handling ──────────────────────────────────────────────────────
test("ignores duplicate theme_ids after first valid row", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "semi", classification: "sector" }),
  ]);
  assert.equal(idx.nodeById.size, 1);
  assert.equal(idx.nodeById.get("semi")!.classification, "sub_theme");
});

test("normalizes missing rollup_sector_ids to []", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme", rollup_sector_ids: undefined as any }),
  ]);
  const node = idx.nodeById.get("semi");
  assert.ok(node);
  assert.deepStrictEqual(node.rollup_sector_ids, []);
});

test("normalizes missing parent_theme_id to null", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme", parent_theme_id: undefined as any }),
  ]);
  assert.equal(idx.nodeById.get("semi")!.parent_theme_id, null);
});

test("children only included when parent exists", () => {
  const idx = s([
    makeNode({ theme_id: "orphan", classification: "sub_theme", parent_theme_id: "nonexistent" }),
  ]);
  assert.ok(!idx.childrenByParentThemeId.has("nonexistent"));
  assert.equal(idx.standaloneSubthemeIds.includes("orphan"), true);
});

test("no selection returns true (empty set)", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
  ]);
  assert.equal(rowMatchesTaxonomySelection({ theme_ids: ["semi"] }, new Set(), idx), true);
});

test("selected unknown ID skips without breaking other selections", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
  ]);
  const row: WatchlistTaxonomyRow = { theme_ids: ["semi"] };
  assert.equal(rowMatchesTaxonomySelection(row, new Set(["unknown"]), idx), false);
});

test("non_sector node with descendants behaves as parent-theme (live data shape)", () => {
  const idx = s([
    makeNode({ theme_id: "metals", classification: "sub_theme" }),
    makeNode({ theme_id: "gold", classification: "theme", parent_theme_id: "metals" }),
    makeNode({ theme_id: "silver", classification: "theme", parent_theme_id: "metals" }),
  ]);
  const rowGold: WatchlistTaxonomyRow = { theme_ids: ["gold"] };
  assert.equal(rowMatchesTaxonomySelection(rowGold, new Set(["metals"]), idx), true);
  assert.equal(rowMatchesTaxonomySelection(rowGold, new Set(["gold"]), idx), true);
  assert.equal(rowMatchesTaxonomySelection(rowGold, new Set(["silver"]), idx), false);
});

// ─── Chip ordering tests ─────────────────────────────────────────────────────
test("every sector renders exactly once", () => {
  const idx = s([
    makeNode({ theme_id: "tech", classification: "sector" }),
    makeNode({ theme_id: "materials", classification: "sector" }),
    makeNode({ theme_id: "semi", classification: "sub_theme", rollup_sector_ids: ["tech"] }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  assert.equal(order.sectorOrder.length, 2);
  assert.ok(order.sectorOrder.includes("materials"));
  assert.ok(order.sectorOrder.includes("tech"));
});

test("every non-sector node renders exactly once", () => {
  const idx = s([
    makeNode({ theme_id: "tech", classification: "sector" }),
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "ai", classification: "sub_theme" }),
    makeNode({ theme_id: "gold", classification: "theme" }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  assert.equal(order.themeOrder.length, 3);
  const themeSet = new Set(order.themeOrder);
  assert.equal(themeSet.size, 3);
});

test("parent with descendants never also added to remaining list", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
    makeNode({ theme_id: "ai", classification: "sub_theme" }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  assert.equal(order.themeOrder.length, 3);
  assert.equal(order.themeOrder.filter(id => id === "semi").length, 1);
});

test("stale classification sub_theme parent renders once as parent", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "equip", classification: "sub_theme", parent_theme_id: "semi" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
    makeNode({ theme_id: "ai", classification: "sub_theme" }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  assert.equal(order.themeOrder.filter(id => id === "semi").length, 1);
  const semiIdx = order.themeOrder.indexOf("semi");
  assert.ok(semiIdx >= 0);
  assert.ok(order.themeOrder.indexOf("equip") > semiIdx || order.themeOrder.indexOf("memory") > semiIdx);
});

test("parent appears before its children", () => {
  const idx = s([
    makeNode({ theme_id: "metals", classification: "sub_theme" }),
    makeNode({ theme_id: "gold", classification: "theme", parent_theme_id: "metals" }),
    makeNode({ theme_id: "silver", classification: "theme", parent_theme_id: "metals" }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  const metalsIdx = order.themeOrder.indexOf("metals");
  const goldIdx = order.themeOrder.indexOf("gold");
  const silverIdx = order.themeOrder.indexOf("silver");
  assert.ok(metalsIdx < goldIdx);
  assert.ok(metalsIdx < silverIdx);
});

test("remaining unparented nodes appear after parents and children", () => {
  const idx = s([
    makeNode({ theme_id: "semi", classification: "sub_theme" }),
    makeNode({ theme_id: "memory", classification: "sub_theme", parent_theme_id: "semi" }),
    makeNode({ theme_id: "ai", classification: "sub_theme" }),
    makeNode({ theme_id: "dc", classification: "sub_theme" }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  const aiIdx = order.themeOrder.indexOf("ai");
  const dcIdx = order.themeOrder.indexOf("dc");
  const memoryIdx = order.themeOrder.indexOf("memory");
  assert.ok(aiIdx > memoryIdx);
  assert.ok(dcIdx > memoryIdx);
});

test("sectors sorted by display_name", () => {
  const idx = s([
    makeNode({ theme_id: "z", classification: "sector", display_name: "Zebra" }),
    makeNode({ theme_id: "a", classification: "sector", display_name: "Apple" }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  assert.equal(order.sectorOrder[0], "a");
  assert.equal(order.sectorOrder[1], "z");
});

test("node with theme classification and children renders as parent", () => {
  const idx = s([
    makeNode({ theme_id: "energy", classification: "theme", display_name: "Energy" }),
    makeNode({ theme_id: "solar", classification: "sub_theme", parent_theme_id: "energy" }),
    makeNode({ theme_id: "nuclear", classification: "sub_theme", parent_theme_id: "energy" }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  assert.equal(order.themeOrder.filter(id => id === "energy").length, 1);
});

test("deep descendant tree renders all nodes once", () => {
  const idx = s([
    makeNode({ theme_id: "a", classification: "sub_theme" }),
    makeNode({ theme_id: "b", classification: "sub_theme", parent_theme_id: "a" }),
    makeNode({ theme_id: "c", classification: "sub_theme", parent_theme_id: "b" }),
    makeNode({ theme_id: "d", classification: "sub_theme", parent_theme_id: "c" }),
  ]);
  const order = getTaxonomyChipOrder(idx);
  assert.equal(order.themeOrder.length, 4);
  assert.equal(new Set(order.themeOrder).size, 4);
  assert.ok(order.themeOrder.indexOf("a") < order.themeOrder.indexOf("b"));
  assert.ok(order.themeOrder.indexOf("b") < order.themeOrder.indexOf("c"));
  assert.ok(order.themeOrder.indexOf("c") < order.themeOrder.indexOf("d"));
});
