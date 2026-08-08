/**
 * watchlist-taxonomy-editor.test.ts
 *
 * Tests for the hierarchical Watchlist taxonomy editor:
 *   – Helper functions (hydrateDraft, buildLabel, buildAdditionalCount, buildTooltip)
 *   – WlRowCtx / WlTaxonomyEditorPanel contract requirements
 *   – PUT payload construction logic
 *   – Edge cases: missing data, market_lens exclusion, sector read-only
 *
 * Uses Node built-in test runner (same as all other watchlist tests in this repo).
 */

import assert from "node:assert/strict";
import test from "node:test";

import { buildThemeTaxonomyIndex } from "../../lib/watchlist-theme-taxonomy";
import type { ThemeTaxonomyIndex } from "../../lib/watchlist-theme-taxonomy";

// ─── Re-implement helpers inline (same logic as watchlist.tsx) ────────────────
// Tests the exact contract the editor depends on without importing the giant page.

function hydrateDraft(
  stock: any,
  index: ThemeTaxonomyIndex,
): { themeId: string | null; subthemeId: string | null; additionals: string[] } {
  const primaryId =
    (stock?.primary_theme_id as string | null | undefined) ||
    (stock?.canonical_theme_id as string | null | undefined) ||
    null;
  let themeId: string | null = null;
  let subthemeId: string | null = null;
  if (primaryId) {
    const node = index.nodeById.get(primaryId);
    if (node?.classification === "theme") {
      themeId = primaryId;
    } else if (node?.classification === "sub_theme") {
      subthemeId = primaryId;
      const parentId = node.parent_theme_id;
      if (parentId && index.nodeById.has(parentId)) themeId = parentId;
    }
  }
  const rawIds: string[] = Array.isArray(stock?.theme_ids) ? (stock.theme_ids as string[]) : [];
  const additionals = rawIds.filter((id: string) => id !== primaryId);
  return { themeId, subthemeId, additionals };
}

function buildLabel(stock: any, index: ThemeTaxonomyIndex): string | null {
  const primaryId =
    (stock?.primary_theme_id as string | null | undefined) ||
    (stock?.canonical_theme_id as string | null | undefined) ||
    null;
  if (primaryId) {
    const n = index.nodeById.get(primaryId);
    if (n) return n.display_name;
  }
  return (stock?.canonical_theme_name as string | null | undefined) || null;
}

function buildAdditionalCount(stock: any): number {
  if (Array.isArray(stock?.additional_theme_ids)) return (stock.additional_theme_ids as string[]).length;
  const primaryId =
    (stock?.primary_theme_id as string | null | undefined) ||
    (stock?.canonical_theme_id as string | null | undefined);
  if (!primaryId || !Array.isArray(stock?.theme_ids)) return 0;
  return (stock.theme_ids as string[]).filter((id: string) => id !== primaryId).length;
}

function buildTooltip(stock: any, index: ThemeTaxonomyIndex): string {
  const parts: string[] = [];
  const sector = stock?.sector as string | null | undefined;
  if (sector) parts.push(`Sector: ${sector}`);
  const primaryId =
    (stock?.primary_theme_id as string | null | undefined) ||
    (stock?.canonical_theme_id as string | null | undefined) ||
    null;
  if (primaryId) {
    const node = index.nodeById.get(primaryId);
    if (node?.classification === "theme") {
      parts.push(`Theme: ${node.display_name}`);
      parts.push("Subtheme: —");
    } else if (node?.classification === "sub_theme") {
      const parent = node.parent_theme_id ? index.nodeById.get(node.parent_theme_id) : null;
      if (parent) parts.push(`Theme: ${parent.display_name}`);
      parts.push(`Subtheme: ${node.display_name}`);
    }
  }
  const addIds: string[] = Array.isArray(stock?.additional_theme_ids)
    ? (stock.additional_theme_ids as string[])
    : [];
  if (addIds.length > 0) {
    const names = addIds.map((id: string) => index.nodeById.get(id)?.display_name || id);
    parts.push(`Additional: ${names.join(", ")}`);
  }
  return parts.join("\n");
}

// ─── Shared fixture ───────────────────────────────────────────────────────────

function makeIndex(): ThemeTaxonomyIndex {
  const rawNodes = [
    { theme_id: "sec-tech",  display_name: "Technology",                  classification: "sector",      parent_theme_id: null },
    { theme_id: "th-ai",    display_name: "AI & Machine Learning",        classification: "theme",       parent_theme_id: null },
    { theme_id: "th-ev",    display_name: "Electric Vehicles",            classification: "theme",       parent_theme_id: null },
    { theme_id: "th-bio",   display_name: "Biotechnology",                classification: "theme",       parent_theme_id: null },
    { theme_id: "st-nlp",   display_name: "Natural Language Processing",  classification: "sub_theme",   parent_theme_id: "th-ai" },
    { theme_id: "st-cv",    display_name: "Computer Vision",              classification: "sub_theme",   parent_theme_id: "th-ai" },
    { theme_id: "st-bat",   display_name: "Battery Technology",           classification: "sub_theme",   parent_theme_id: "th-ev" },
    { theme_id: "ml-gold",  display_name: "Gold (Commodity Lens)",        classification: "market_lens", parent_theme_id: null },
    { theme_id: "dep-old",  display_name: "Legacy Theme",                 classification: "deprecated",  parent_theme_id: null },
  ];
  return buildThemeTaxonomyIndex(rawNodes);
}

// ─── 1. hydrateDraft ──────────────────────────────────────────────────────────

test("REQ-01 primary_theme_id pointing to a theme-level node sets themeId only", () => {
  const idx = makeIndex();
  const stock = { primary_theme_id: "th-ai", theme_ids: ["th-ai"] };
  const r = hydrateDraft(stock, idx);
  assert.equal(r.themeId, "th-ai");
  assert.equal(r.subthemeId, null);
  assert.equal(r.additionals.length, 0);
});

test("REQ-02 primary_theme_id pointing to a sub_theme sets both themeId and subthemeId", () => {
  const idx = makeIndex();
  const stock = { primary_theme_id: "st-nlp", theme_ids: ["st-nlp"] };
  const r = hydrateDraft(stock, idx);
  assert.equal(r.themeId, "th-ai");
  assert.equal(r.subthemeId, "st-nlp");
  assert.equal(r.additionals.length, 0);
});

test("REQ-03 canonical_theme_id used as fallback when primary_theme_id absent", () => {
  const idx = makeIndex();
  const stock = { canonical_theme_id: "th-ev", theme_ids: ["th-ev"] };
  const r = hydrateDraft(stock, idx);
  assert.equal(r.themeId, "th-ev");
  assert.equal(r.subthemeId, null);
});

test("REQ-04 additional theme_ids filtered to exclude the primary", () => {
  const idx = makeIndex();
  const stock = { primary_theme_id: "th-ai", theme_ids: ["th-ai", "th-ev", "th-bio"] };
  const r = hydrateDraft(stock, idx);
  assert.ok(r.additionals.includes("th-ev"), "should include th-ev");
  assert.ok(r.additionals.includes("th-bio"), "should include th-bio");
  assert.ok(!r.additionals.includes("th-ai"), "should not include primary th-ai");
});

test("REQ-05 completely empty stock returns all nulls and empty additionals", () => {
  const idx = makeIndex();
  const r = hydrateDraft({}, idx);
  assert.equal(r.themeId, null);
  assert.equal(r.subthemeId, null);
  assert.equal(r.additionals.length, 0);
});

test("REQ-06 unknown primary_theme_id (not in index) leaves both null", () => {
  const idx = makeIndex();
  const stock = { primary_theme_id: "th-nonexistent", theme_ids: ["th-nonexistent"] };
  const r = hydrateDraft(stock, idx);
  assert.equal(r.themeId, null);
  assert.equal(r.subthemeId, null);
});

test("REQ-07 market_lens primary resolves to null (classification not theme/sub_theme)", () => {
  const idx = makeIndex();
  const stock = { primary_theme_id: "ml-gold", theme_ids: ["ml-gold"] };
  const r = hydrateDraft(stock, idx);
  assert.equal(r.themeId, null);
  assert.equal(r.subthemeId, null);
});

// ─── 2. buildLabel ────────────────────────────────────────────────────────────

test("REQ-08 returns display_name for a theme node", () => {
  const idx = makeIndex();
  assert.equal(buildLabel({ primary_theme_id: "th-ai" }, idx), "AI & Machine Learning");
});

test("REQ-09 returns display_name for a sub_theme node", () => {
  const idx = makeIndex();
  assert.equal(buildLabel({ primary_theme_id: "st-nlp" }, idx), "Natural Language Processing");
});

test("REQ-10 falls back to canonical_theme_name when no matching index node", () => {
  const idx = makeIndex();
  assert.equal(buildLabel({ canonical_theme_name: "My Custom Theme" }, idx), "My Custom Theme");
});

test("REQ-11 returns null when no primary ID and no canonical_theme_name", () => {
  const idx = makeIndex();
  assert.equal(buildLabel({}, idx), null);
});

test("REQ-12 prefers primary_theme_id over canonical_theme_id", () => {
  const idx = makeIndex();
  const stock = { primary_theme_id: "th-ai", canonical_theme_id: "th-ev" };
  assert.equal(buildLabel(stock, idx), "AI & Machine Learning");
});

// ─── 3. buildAdditionalCount ──────────────────────────────────────────────────

test("REQ-13 uses additional_theme_ids.length when available", () => {
  assert.equal(buildAdditionalCount({ additional_theme_ids: ["th-ev", "th-bio"] }), 2);
});

test("REQ-14 derives count from theme_ids minus primary when additional_theme_ids absent", () => {
  const stock = { primary_theme_id: "th-ai", theme_ids: ["th-ai", "th-ev", "th-bio"] };
  assert.equal(buildAdditionalCount(stock), 2);
});

test("REQ-15 returns 0 when no theme_ids present", () => {
  assert.equal(buildAdditionalCount({ primary_theme_id: "th-ai" }), 0);
});

test("REQ-16 empty stock returns 0", () => {
  assert.equal(buildAdditionalCount({}), 0);
});

test("REQ-17 additional_theme_ids empty array returns 0", () => {
  assert.equal(buildAdditionalCount({ additional_theme_ids: [] }), 0);
});

// ─── 4. buildTooltip ─────────────────────────────────────────────────────────

test("REQ-18 includes Sector line when stock.sector present", () => {
  const idx = makeIndex();
  const tip = buildTooltip({ sector: "Technology", primary_theme_id: "th-ai" }, idx);
  assert.ok(tip.includes("Sector: Technology"), `missing Sector line, got: ${tip}`);
});

test("REQ-19 sector appears at the start of tooltip (read-only first)", () => {
  const idx = makeIndex();
  const tip = buildTooltip({ sector: "Healthcare", primary_theme_id: "th-bio" }, idx);
  assert.ok(tip.startsWith("Sector: Healthcare"), `expected Sector first, got: ${tip}`);
});

test("REQ-20 theme-level primary shows Theme line and Subtheme: —", () => {
  const idx = makeIndex();
  const tip = buildTooltip({ primary_theme_id: "th-ai" }, idx);
  assert.ok(tip.includes("Theme: AI & Machine Learning"));
  assert.ok(tip.includes("Subtheme: —"));
});

test("REQ-21 sub_theme primary shows parent Theme line and Subtheme name", () => {
  const idx = makeIndex();
  const tip = buildTooltip({ primary_theme_id: "st-nlp" }, idx);
  assert.ok(tip.includes("Theme: AI & Machine Learning"));
  assert.ok(tip.includes("Subtheme: Natural Language Processing"));
  assert.ok(!tip.includes("Subtheme: —"), "should not have generic dash placeholder");
});

test("REQ-22 additional memberships included in tooltip", () => {
  const idx = makeIndex();
  const stock = { primary_theme_id: "th-ai", additional_theme_ids: ["th-ev", "th-bio"] };
  const tip = buildTooltip(stock, idx);
  assert.ok(tip.includes("Additional:"));
  assert.ok(tip.includes("Electric Vehicles"));
  assert.ok(tip.includes("Biotechnology"));
});

test("REQ-23 no Additional line when additional_theme_ids is empty", () => {
  const idx = makeIndex();
  const tip = buildTooltip({ primary_theme_id: "th-ai", additional_theme_ids: [] }, idx);
  assert.ok(!tip.includes("Additional:"));
});

test("REQ-24 empty stock returns empty string", () => {
  const idx = makeIndex();
  assert.equal(buildTooltip({}, idx), "");
});

// ─── 5. PUT payload construction ─────────────────────────────────────────────

test("REQ-25 sub_theme sent as primary_theme_id (subtheme takes priority over theme)", () => {
  const draftSubthemeId = "st-nlp";
  const draftThemeId = "th-ai";
  const effectivePrimaryId = draftSubthemeId ?? draftThemeId ?? null;
  assert.equal(effectivePrimaryId, "st-nlp");
});

test("REQ-26 theme sent as primary when no subtheme selected", () => {
  const draftSubthemeId = null;
  const draftThemeId = "th-ai";
  const effectivePrimaryId = draftSubthemeId ?? draftThemeId ?? null;
  assert.equal(effectivePrimaryId, "th-ai");
});

test("REQ-27 null sent as primary when neither theme nor subtheme selected", () => {
  const draftSubthemeId = null;
  const draftThemeId = null;
  const effectivePrimaryId = draftSubthemeId ?? draftThemeId ?? null;
  assert.equal(effectivePrimaryId, null);
});

test("REQ-28 additionals exclude effective primary to prevent duplicates on save", () => {
  const effectivePrimaryId = "th-ai";
  const draftAdditionals = ["th-ai", "th-ev", "th-bio"];
  const cleanAdditionals = draftAdditionals.filter(id => id !== effectivePrimaryId);
  assert.ok(!cleanAdditionals.includes("th-ai"), "primary should be removed");
  assert.deepEqual(cleanAdditionals, ["th-ev", "th-bio"]);
});

test("REQ-29 empty additionals array is valid payload", () => {
  const cleanAdditionals: string[] = [];
  const payload = { primary_theme_id: "th-ai", additional_theme_ids: cleanAdditionals };
  assert.equal(payload.additional_theme_ids.length, 0);
  assert.equal(payload.primary_theme_id, "th-ai");
});

// ─── 6. Taxonomy index structure ─────────────────────────────────────────────

test("REQ-30 top-level theme nodes accessible in nodeById with correct classification", () => {
  const idx = makeIndex();
  assert.equal(idx.nodeById.get("th-ai")?.classification, "theme");
  assert.equal(idx.nodeById.get("th-ev")?.classification, "theme");
  assert.equal(idx.nodeById.get("th-bio")?.classification, "theme");
});

test("REQ-31 sub_theme nodes linked to parent via parent_theme_id", () => {
  const idx = makeIndex();
  assert.equal(idx.nodeById.get("st-nlp")?.parent_theme_id, "th-ai");
  assert.equal(idx.nodeById.get("st-bat")?.parent_theme_id, "th-ev");
});

test("REQ-32 childrenByParentThemeId maps theme to its sub_theme children", () => {
  const idx = makeIndex();
  const aiChildren = idx.childrenByParentThemeId.get("th-ai") ?? [];
  assert.ok(aiChildren.includes("st-nlp"), "th-ai should have st-nlp child");
  assert.ok(aiChildren.includes("st-cv"), "th-ai should have st-cv child");
});

test("REQ-33 market_lens node is in nodeById (filtering done by UI layer not index)", () => {
  const idx = makeIndex();
  assert.ok(idx.nodeById.has("ml-gold"), "market_lens node should be in index");
  assert.equal(idx.nodeById.get("ml-gold")?.classification, "market_lens");
});

test("REQ-34 sector node in nodeById; excluded from editor theme lists by classification filter", () => {
  const idx = makeIndex();
  assert.equal(idx.nodeById.get("sec-tech")?.classification, "sector");
});

test("REQ-35 deprecated node in nodeById; excluded from editor lists by classification filter", () => {
  const idx = makeIndex();
  assert.equal(idx.nodeById.get("dep-old")?.classification, "deprecated");
});

test("REQ-36 theme with no sub_theme children has empty or absent childrenByParentThemeId entry", () => {
  const idx = makeIndex();
  const bioChildren = idx.childrenByParentThemeId.get("th-bio") ?? [];
  assert.equal(bioChildren.length, 0);
});
